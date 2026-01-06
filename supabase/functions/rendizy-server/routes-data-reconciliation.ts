import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { errorResponse, successResponse, validationErrorResponse, logError } from './utils.ts';

type FieldCategory = 'reservation' | 'property' | 'guest' | 'pricing';

interface NormalizedField {
  id: string;
  name: string;
  label: string;
  type: string;
  description: string;
  example?: string;
  category: FieldCategory;
  required?: boolean;
}

function stableHash(str: string): string {
  // Hash simples e determinístico (não-críptico) só para IDs estáveis
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function mergeFieldLists(lists: NormalizedField[][], idPrefix: string): NormalizedField[] {
  const map = new Map<string, NormalizedField>();

  for (const list of lists) {
    for (const f of list) {
      const existing = map.get(f.name);
      if (!existing) {
        map.set(f.name, { ...f });
        continue;
      }

      const existingExample = (existing.example || '').toLowerCase();
      const incomingExample = (f.example || '').toLowerCase();
      const existingType = (existing.type || '').toLowerCase();
      const incomingType = (f.type || '').toLowerCase();

      // Preferir exemplo/type não-null quando possível
      if ((existingExample === '' || existingExample === 'null') && incomingExample && incomingExample !== 'null') {
        existing.example = f.example;
      }
      if ((existingType === '' || existingType === 'null') && incomingType && incomingType !== 'null') {
        existing.type = f.type;
      }
      // Categoria: manter a mais específica (guest/property/pricing) se aparecer
      if (existing.category === 'reservation' && f.category !== 'reservation') {
        existing.category = f.category;
      }

      map.set(f.name, existing);
    }
  }

  const out = Array.from(map.values());
  // IDs estáveis por nome
  for (const f of out) {
    f.id = `${idPrefix}_${stableHash(f.name)}`;
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toTitleCaseFromKey(key: string): string {
  return key
    .split(/[_\-\.]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function inferValueType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    // Heurística simples para ISO date/datetime
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/;
    if (isoDate.test(value)) return 'date';
    if (isoDateTime.test(value)) return 'datetime';
    return 'string';
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
}

function stringifyExample(value: unknown, maxLen = 140): string {
  try {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    const json = JSON.stringify(value);
    return json.length > maxLen ? `${json.slice(0, maxLen)}...` : json;
  } catch {
    return String(value);
  }
}

function categorizeFieldByPath(path: string): FieldCategory {
  const p = path.toLowerCase();
  if (p.startsWith('guest.') || p.startsWith('client.') || p.startsWith('customer.')) return 'guest';
  if (p.startsWith('property.') || p.startsWith('listing.') || p.startsWith('anuncio.') || p.startsWith('anuncios.')) return 'property';
  if (p.includes('price') || p.includes('rate') || p.includes('amount') || p.includes('fee') || p.includes('tax')) return 'pricing';
  return 'reservation';
}

function flattenToFields(
  obj: unknown,
  opts: {
    prefix?: string;
    maxDepth?: number;
    baseCategory?: FieldCategory;
    idPrefix: string;
    descriptionPrefix: string;
  }
): NormalizedField[] {
  const {
    prefix = '',
    maxDepth = 4,
    baseCategory,
    idPrefix,
    descriptionPrefix,
  } = opts;

  const out: NormalizedField[] = [];
  let counter = 1;

  const walk = (value: unknown, currentPath: string, depth: number) => {
    if (!isRecord(value) || depth > maxDepth) return;
    for (const [key, v] of Object.entries(value)) {
      const path = currentPath ? `${currentPath}.${key}` : key;
      const type = inferValueType(v);
      const category = baseCategory ?? categorizeFieldByPath(path);

      out.push({
        id: `${idPrefix}_${counter++}`,
        name: path,
        label: toTitleCaseFromKey(key),
        type,
        description: `${descriptionPrefix} (${type})`,
        example: stringifyExample(v),
        category,
      });

      if (isRecord(v) && depth < maxDepth) {
        walk(v, path, depth + 1);
      }
    }
  };

  if (isRecord(obj)) {
    const root = prefix ? ({ [prefix]: obj } as Record<string, unknown>) : obj;
    walk(root, '', 0);
  }

  // Dedup por name (último vence) para evitar ruído
  const map = new Map<string, NormalizedField>();
  for (const f of out) map.set(f.name, f);
  return Array.from(map.values());
}

class StaysApiClient {
  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
    private readonly baseUrl: string
  ) {}

  private headers(): HeadersInit {
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    const base64 = btoa(credentials);
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${base64}`,
    };
  }

  async getJson(endpoint: string) {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, { method: 'GET', headers: this.headers() });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Stays API non-JSON response (${res.status}): ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Stays API error (${res.status}): ${data?.error || data?.message || res.statusText}`);
    }
    return data;
  }
}

async function selectSampleRow(client: any, table: string, organizationId: string) {
  // 1) tenta filtrar por organization_id
  const withOrg = await client
    .from(table)
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!withOrg.error) return withOrg.data || null;

  // 2) fallback: sem organization_id (tabelas legadas)
  const msg = String(withOrg.error?.message || '');
  if (msg.toLowerCase().includes('organization_id')) {
    const noOrg = await client
      .from(table)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (noOrg.error) throw noOrg.error;
    return noOrg.data || null;
  }

  throw withOrg.error;
}

async function selectSampleRows(client: any, table: string, organizationId: string, limit: number) {
  const safeLimit = Math.max(1, Math.min(50, limit));

  const withOrg = await client
    .from(table)
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(safeLimit);

  if (!withOrg.error) return withOrg.data || [];

  const msg = String(withOrg.error?.message || '');
  if (msg.toLowerCase().includes('organization_id')) {
    const noOrg = await client
      .from(table)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(safeLimit);
    if (noOrg.error) throw noOrg.error;
    return noOrg.data || [];
  }

  throw withOrg.error;
}

// ==========================================================================
// GET /data-reconciliation/stays/properties
// ==========================================================================
export async function getStaysProperties(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const api = new StaysApiClient(staysConfig.apiKey, staysConfig.apiSecret, staysConfig.baseUrl);

    const raw = await api.getJson('/content/properties');
    const properties = Array.isArray(raw) ? raw : raw?.properties || raw?.data || [];

    const pickNonEmptyString = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const v = value.trim();
      return v.length > 0 ? v : undefined;
    };

    const list = (properties || [])
      .map((p: any) => {
        const id = pickNonEmptyString(p?.id) || pickNonEmptyString(p?._id) || pickNonEmptyString(p?.property_id);
        if (!id) return null;

        // Muitos tenants da Stays retornam properties sem `name`. Neste caso,
        // usamos a identificação interna (código/id) para não listar “Sem nome”.
        const nameCandidate =
          pickNonEmptyString(p?.internalName) ||
          pickNonEmptyString(p?.internal_name) ||
          pickNonEmptyString(p?.name) ||
          pickNonEmptyString(p?.title) ||
          pickNonEmptyString(p?.property_name);

        const codeCandidate =
          pickNonEmptyString(p?.code) ||
          pickNonEmptyString(p?.property_code) ||
          pickNonEmptyString(p?.propertyCode) ||
          pickNonEmptyString(p?.internalCode) ||
          id;

        const displayName = nameCandidate || codeCandidate || id;

        return {
          id,
          name: displayName,
          code: codeCandidate,
        };
      })
      .filter((p: any) => !!p);

    return c.json(successResponse({ properties: list }));
  } catch (error: any) {
    logError('[data-reconciliation] getStaysProperties error:', error);
    const status = typeof error?.status === 'number' ? error.status : 500;
    const details = error?.details ? JSON.stringify(error.details) : error?.message;
    return c.json(errorResponse('Erro ao buscar propriedades da Stays.net', details), status);
  }
}

// ==========================================================================
// POST /data-reconciliation/real-samples
// ==========================================================================
export async function getRealSamplesForReconciliation(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json().catch(() => ({} as any));

    const startDate = typeof body?.startDate === 'string' ? body.startDate : undefined;
    const endDate = typeof body?.endDate === 'string' ? body.endDate : undefined;
    const propertyIds = Array.isArray(body?.propertyIds) ? body.propertyIds.filter((x: any) => typeof x === 'string') : [];
    const limit = typeof body?.limit === 'number' ? Math.max(1, Math.min(100, body.limit)) : 10;

    if (!startDate || !endDate) {
      return c.json(validationErrorResponse('startDate e endDate são obrigatórios'), 400);
    }

    // ------------------------------
    // 1) PLATFORM (STAYS)
    // ------------------------------
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const api = new StaysApiClient(staysConfig.apiKey, staysConfig.apiSecret, staysConfig.baseUrl);

    // ✅ A API da Stays usa `from`, `to`, `dateType` (não start_date/end_date).
    // Mantemos o dateType padrão como chegada (arrival) para o período.
    const staysLimit = Math.min(50, Math.max(1, limit));
    const qs = new URLSearchParams({
      from: startDate,
      to: endDate,
      dateType: 'arrival',
      limit: String(staysLimit),
      skip: '0',
    });

    // Compatibilidade: algumas contas retornam subconjunto se não filtrar type.
    for (const t of ['reserved', 'booked', 'contract']) {
      qs.append('type', t);
    }

    const rawReservations = await api.getJson(`/booking/reservations?${qs.toString()}`);
    const reservations = Array.isArray(rawReservations)
      ? rawReservations
      : rawReservations?.reservations || rawReservations?.data || [];

    const extractReservationPropertyId = (r: any): string | undefined => {
      const candidates = [
        r?.propertyId,
        r?.property_id,
        r?.propertyCode,
        r?.property_code,
        r?.property?.id,
        r?.property?.propertyId,
        r?.property?.code,
        r?.property?.property_code,
      ];
      for (const cnd of candidates) {
        if (typeof cnd === 'string' && cnd.trim()) return cnd.trim();
      }
      return undefined;
    };

    const filteredReservations = propertyIds.length > 0
      ? (reservations || []).filter((r: any) => {
          const pid = extractReservationPropertyId(r);
          return pid ? propertyIds.includes(pid) : false;
        })
      : (reservations || []);

    const picked = (() => {
      const needle = 'EO14J';
      const arr = (filteredReservations || []).slice(0, Math.max(limit, 1));
      const found = arr.find((r: any) => String(r?.id || r?.code || r?.reservation_code || '').toUpperCase() === needle);
      return found || arr[0] || null;
    })();

    const reservationsForUnion = (filteredReservations || []).slice(0, Math.max(limit, 1));
    const platformReservationFields = reservationsForUnion.length > 0
      ? mergeFieldLists(
          reservationsForUnion.map((r: any) =>
            flattenToFields(r, {
              idPrefix: 'stays_res_tmp',
              descriptionPrefix: 'Campo real (Stays /booking/reservations)',
            })
          ),
          'stays_res'
        )
      : [];

    // Propriedade/listing real da Stays
    const rawProperties = await api.getJson('/content/properties');
    const properties = Array.isArray(rawProperties) ? rawProperties : rawProperties?.properties || rawProperties?.data || [];
    const pickedProperty = (properties || []).find((p: any) => propertyIds.includes(String(p?.id || p?._id || p?.property_id))) || (properties || [])[0] || null;
    const propertiesForUnion = (properties || []).slice(0, Math.max(1, Math.min(10, propertyIds.length > 0 ? propertyIds.length : 3)));
    const platformPropertyFields = propertiesForUnion.length > 0
      ? mergeFieldLists(
          propertiesForUnion.map((p: any) =>
            flattenToFields(p, {
              idPrefix: 'stays_prop_tmp',
              descriptionPrefix: 'Campo real (Stays /content/properties)',
              baseCategory: 'property',
            })
          ),
          'stays_prop'
        )
      : [];

    const platformFields: NormalizedField[] = [...platformReservationFields, ...platformPropertyFields];

    // ------------------------------
    // 2) RENDIZY (SUPABASE TABLES)
    // ------------------------------
    const db = getSupabaseClient();
    const sampleReservation = await selectSampleRow(db, 'reservations', organizationId).catch(() => null);
    const sampleGuest = await selectSampleRow(db, 'guests', organizationId).catch(() => null);
    const sampleAnuncioUltimate = await selectSampleRow(db, 'properties', organizationId).catch(() => null);

    const sampleReservations = await selectSampleRows(db, 'reservations', organizationId, Math.min(25, limit)).catch(() => []);
    const sampleGuests = await selectSampleRows(db, 'guests', organizationId, Math.min(25, limit)).catch(() => []);
    const sampleAnunciosUltimate = await selectSampleRows(db, 'properties', organizationId, Math.min(25, limit)).catch(() => []);

    const rendizyReservationFields = sampleReservations.length > 0
      ? mergeFieldLists(
          sampleReservations.map((r: any) =>
            flattenToFields(r, {
              idPrefix: 'db_res_tmp',
              descriptionPrefix: 'Campo real (Supabase reservations)',
              baseCategory: 'reservation',
            })
          ),
          'db_res'
        )
      : (sampleReservation
          ? flattenToFields(sampleReservation, {
              idPrefix: 'db_res',
              descriptionPrefix: 'Campo real (Supabase reservations)',
              baseCategory: 'reservation',
            })
          : []);

    const rendizyGuestFields = sampleGuests.length > 0
      ? mergeFieldLists(
          sampleGuests.map((g: any) =>
            flattenToFields(g, {
              idPrefix: 'db_guest_tmp',
              descriptionPrefix: 'Campo real (Supabase guests)',
              baseCategory: 'guest',
            })
          ),
          'db_guest'
        )
      : (sampleGuest
          ? flattenToFields(sampleGuest, {
              idPrefix: 'db_guest',
              descriptionPrefix: 'Campo real (Supabase guests)',
              baseCategory: 'guest',
            })
          : []);

    const rendizyAnuncioFields = sampleAnunciosUltimate.length > 0
      ? mergeFieldLists(
          sampleAnunciosUltimate.map((a: any) =>
            flattenToFields(a, {
              idPrefix: 'db_anuncio_tmp',
              descriptionPrefix: 'Campo real (Supabase properties)',
              baseCategory: 'property',
            })
          ),
          'db_anuncio'
        )
      : (sampleAnuncioUltimate
          ? flattenToFields(sampleAnuncioUltimate, {
              idPrefix: 'db_anuncio',
              descriptionPrefix: 'Campo real (Supabase properties)',
              baseCategory: 'property',
            })
          : []);

    const rendizyFields: NormalizedField[] = [
      ...rendizyReservationFields,
      ...rendizyGuestFields,
      ...rendizyAnuncioFields,
    ].map((f) => ({
      ...f,
      // compat com UI: required default false
      required: false,
    }));

    return c.json(
      successResponse({
        platform: {
          fields: platformFields,
          sample: {
            reservation: picked,
            property: pickedProperty,
          },
        },
        rendizy: {
          fields: rendizyFields,
          sample: {
            reservation: sampleReservation,
            guest: sampleGuest,
            anuncio_ultimate: sampleAnuncioUltimate,
          },
        },
        meta: {
          startDate,
          endDate,
          propertyIds,
          limit,
        },
      })
    );
  } catch (error: any) {
    logError('[data-reconciliation] getRealSamplesForReconciliation error:', error);
    const status = typeof error?.status === 'number' ? error.status : 500;
    const details = error?.details ? JSON.stringify(error.details) : error?.message;
    return c.json(errorResponse('Erro ao buscar dados reais para conciliação', details), status);
  }
}
