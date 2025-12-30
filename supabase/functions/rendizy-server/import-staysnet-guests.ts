/**
 * ⚡ IMPORT STAYSNET - GUESTS (HÓSPEDES) - v1.0.104
 * 
 * PADRÃO ATÔMICO:
 * - Extrai dados de guests das reservations
 * - Inserts diretos na tabela guests
 * - Deduplica via email + organization_id
 * - Atualiza reservation.guest_id para vincular
 * 
 * DEPENDÊNCIA: Deve ser executado APÓS import-staysnet-reservations.ts
 * 
 * ENDPOINT API: GET /booking/reservations (extrai guests daqui)
 * TABELA DESTINO: guests
 * 
 * REFERÊNCIA: docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { storeStaysnetRawObject } from './utils-staysnet-raw-store.ts';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

// ============================================================================
// TIPOS - Guest extraído de StaysNet Reservation
// ============================================================================
interface StaysNetReservation {
  _id: string;
  confirmationCode?: string;

  // Alguns payloads vêm apenas com o id do cliente no Stays.
  _idclient?: string;
  
  // Dados do hóspede (pode vir em diferentes formatos)
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCpf?: string;
  guestPassport?: string;
  
  guest?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    passport?: string;
    birthDate?: string;
    nationality?: string;
    language?: string;
  };
  
  platform?: string;
  source?: string;
  
  [key: string]: any;
}

interface ExtractedGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cpf?: string;
  passport?: string;
  birthDate?: string;
  nationality?: string;
  language?: string;
  source: string;
  staysnetClientId?: string;
  staysnetRaw?: unknown;
}

type StaysNetClientRaw = Record<string, unknown>;

function asNonEmptyString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function pickClientEmail(client: StaysNetClientRaw): string | null {
  const direct = asNonEmptyString((client as any).email);
  if (direct && direct.includes('@')) return direct;

  const emails = (client as any).emails;
  if (Array.isArray(emails)) {
    for (const e of emails) {
      const s = asNonEmptyString(e);
      if (s && s.includes('@')) return s;
    }
  }

  return null;
}

function pickClientPhone(client: StaysNetClientRaw): string | null {
  const direct = asNonEmptyString((client as any).phone);
  if (direct) return direct;

  const phones = (client as any).phones;
  if (Array.isArray(phones)) {
    for (const p of phones) {
      const iso = asNonEmptyString(p?.iso);
      if (iso) return iso;
      const number = asNonEmptyString(p?.number);
      if (number) return number;
      const raw = asNonEmptyString(p);
      if (raw) return raw;
    }
  }

  return null;
}

function pickClientNameParts(client: StaysNetClientRaw): { firstName: string; lastName: string } | null {
  const firstName = asNonEmptyString((client as any).firstName);
  const lastName = asNonEmptyString((client as any).lastName);
  if (firstName || lastName) {
    return { firstName: firstName || '', lastName: lastName || '' };
  }

  const name = asNonEmptyString((client as any).name);
  if (!name) return null;

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  return { firstName: parts[0], lastName: '' };
}

async function fetchStaysClientDetails(params: {
  baseUrl: string;
  credentials: string;
  clientId: string;
}): Promise<StaysNetClientRaw | null> {
  const clientId = String(params.clientId || '').trim();
  if (!clientId) return null;

  const url = `${params.baseUrl}/booking/clients/${encodeURIComponent(clientId)}`;
  const controller = new AbortController();
  // Edge runtime safety: manter baixo para não estourar timeout em batch grande.
  const timeout = setTimeout(() => controller.abort(), 3_000);

  try {
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Basic ${params.credentials}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json || typeof json !== 'object') return null;
    return json as StaysNetClientRaw;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// FUNÇÃO AUXILIAR: Extrair dados do guest de diferentes estruturas
// ============================================================================
function hash32Hex(input: string): string {
  // djb2
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  // unsigned 32-bit
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sanitizeDigits(input: string): string {
  return String(input || '').replace(/\D+/g, '');
}

function safeIsoDateOnly(input: unknown): string | null {
  const s = asNonEmptyString(input);
  if (!s) return null;

  // Formato já ok
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Tentativa de parse tolerante (ex: ISO datetime)
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  try {
    return new Date(t).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function normalizeStaysDateType(input: string): 'arrival' | 'departure' | 'creation' | 'creationorig' | 'included' {
  const v = String(input || '').trim().toLowerCase();
  // Frontend legacy values
  if (v === 'checkin') return 'arrival';
  if (v === 'checkout') return 'departure';
  // API official values
  if (v === 'arrival') return 'arrival';
  if (v === 'departure') return 'departure';
  if (v === 'creation') return 'creation';
  if (v === 'creationorig') return 'creationorig';
  if (v === 'included') return 'included';
  // Fallback seguro para guests: included (pega reservas que cruzam o período)
  return 'included';
}

function normalizeReservationTypes(input: any): string[] {
  if (Array.isArray(input)) {
    return input.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function extractGuestData(res: StaysNetReservation): ExtractedGuest {
  const payloadEmail = (res.guestEmail || res.guest?.email || '').trim();

  const staysnetClientId = String((res as any)._idclient || '').trim() || undefined;

  // Nome pode vir em diferentes formatos
  let firstName = res.guestFirstName || res.guest?.firstName || '';
  let lastName = res.guestLastName || res.guest?.lastName || '';
  
  // Se não tem first/last, tenta separar do guestName
  if (!firstName && !lastName) {
    const fullName = res.guestName || res.guest?.name || '';
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      firstName = parts[0];
      lastName = '';
    }
  }

  // Se ainda não tem nome, usa email como fallback
  if (!firstName) {
    firstName = payloadEmail ? payloadEmail.split('@')[0] : 'Hóspede';
  }

  // Determinar source/platform
  const source = res.platform || res.source || 'staysnet';
  const mappedSource = mapSource(source);

  const cpf = (res.guestCpf || res.guest?.cpf || undefined)?.trim();
  const passport = (res.guestPassport || res.guest?.passport || undefined)?.trim();
  const phoneRaw = (res.guestPhone || res.guest?.phone || undefined)?.trim();

  // Se não tiver email real, gerar um email sintético estável para:
  // - permitir insert sem quebrar frontend (guest.email é string)
  // - permitir dedupe com base em cpf/passport/phone/nome
  const email = (() => {
    if (payloadEmail && payloadEmail.includes('@')) return payloadEmail;

    const dedupeSeed = [
      res._idclient ? `client:${res._idclient}` : null,
      cpf ? `cpf:${sanitizeDigits(cpf)}` : null,
      passport ? `passport:${passport}` : null,
      phoneRaw ? `phone:${sanitizeDigits(phoneRaw)}` : null,
      `name:${firstName} ${lastName}`,
      // Fallback final para evitar seed vazio
      `res:${res._id || res.confirmationCode || ''}`,
    ]
      .filter(Boolean)
      .join('|');

    const h = hash32Hex(dedupeSeed);
    return `noemail-${h}@staysnet.local`;
  })();

  // Banco exige phone NOT NULL. Se não vier, gerar um telefone sintético estável.
  const phone = (() => {
    if (phoneRaw) return phoneRaw;
    const seed = [res._idclient ? `client:${res._idclient}` : null, `email:${email}`].filter(Boolean).join('|');
    const h = hash32Hex(seed);
    const n = parseInt(h.slice(0, 8), 16) % 100000000; // 8 dígitos
    return `119${String(n).padStart(8, '0')}`; // 11 dígitos (BR)
  })();

  return {
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone,
    cpf,
    passport,
    birthDate: res.guest?.birthDate || undefined,
    nationality: res.guest?.nationality || undefined,
    language: res.guest?.language || 'pt-BR',
    source: mappedSource,
    staysnetClientId,
    staysnetRaw: {
      _idclient: staysnetClientId || null,
      guest: res.guest || null,
      guestEmail: (res.guestEmail || res.guest?.email || null) as any,
      guestName: (res.guestName || res.guest?.name || null) as any,
      platform: (res as any).platform || null,
      source: (res as any).source || null,
      partner: (res as any).partner || null,
    },
  };
}

async function selectGuestIdByStaysnetClientId(supabase: any, orgId: string, staysnetClientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('id')
    .eq('organization_id', orgId)
    .eq('staysnet_client_id', staysnetClientId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message || '');
    if (/staysnet_client_id/i.test(msg) && /does not exist/i.test(msg)) {
      // compat: coluna ainda não existe
      return null;
    }
    console.error(`   ❌ Erro ao verificar guest por staysnet_client_id:`, msg);
    return null;
  }

  return data?.id || null;
}

// ============================================================================
// FUNÇÃO AUXILIAR: Mapear source
// ============================================================================
function mapSource(source: string): string {
  if (!source) return 'other';
  
  const sourceStr = source.toLowerCase();
  
  if (sourceStr.includes('airbnb')) return 'airbnb';
  if (sourceStr.includes('booking')) return 'booking';
  if (sourceStr.includes('decolar')) return 'decolar';
  if (sourceStr.includes('direct')) return 'direct';
  
  return 'other';
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// ============================================================================
export async function importStaysNetGuests(c: Context) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - GUESTS (HÓSPEDES)');
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 API Endpoint: /booking/reservations (extrai guests)');
  console.log('📍 Tabela Destino: guests');
  console.log('📍 Método: INSERT direto + UPDATE reservation.guest_id');
  console.log('═══════════════════════════════════════════════════\n');

  let fetched = 0;
  let processed = 0;
  let created = 0;
  let updated = 0;
  let linked = 0;
  let alreadyLinked = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{guest: string, error: string}> = [];

  // ⚠️ Importante: o catch final precisa SEMPRE conseguir retornar JSON.
  // Portanto, qualquer variável usada no catch deve estar no escopo da função.
  let nextSkip = 0;
  let nextHasMore = false;

  try {
    const supabase = getSupabaseClient();

    // ✅ Multi-tenant: pegar organization_id correto
    // ⚠️ Se há token de usuário, não pode cair no DEFAULT_ORG_ID.
    const cookieHeader = c.req.header('Cookie') || '';
    const hasUserToken = Boolean(c.req.header('X-Auth-Token') || cookieHeader.includes('rendizy-token='));

    let orgId = DEFAULT_ORG_ID;
    if (hasUserToken) {
      orgId = await getOrganizationIdOrThrow(c);
    } else {
      try {
        orgId = await getOrganizationIdOrThrow(c);
      } catch {
        orgId = DEFAULT_ORG_ID;
      }
    }

    // ========================================================================
    // STEP 1: BUSCAR RESERVATIONS DA API STAYSNET (para extrair guests)
    // ========================================================================
    console.log('📡 [FETCH] Buscando reservations de /booking/reservations...');
    
    // ✅ CORREÇÃO: API exige from, to, dateType (não startDate/endDate)
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12); // 12 meses atrás
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 12); // +12 meses no futuro
    
    const from = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const to = toDate.toISOString().split('T')[0];     // YYYY-MM-DD
    
    // Permitir override via body/query
    const body = await c.req.json().catch(() => null as any);
    const bodyFrom = body?.from || body?.startDate;
    const bodyTo = body?.to || body?.endDate;
    const fromFinal = String((c.req.query('from') || bodyFrom || from) ?? '').trim();
    const toFinal = String((c.req.query('to') || bodyTo || to) ?? '').trim();
    const rawDateType = String((c.req.query('dateType') || body?.dateType || 'included') ?? '').trim();
    const dateType = normalizeStaysDateType(rawDateType);
    // ✅ Stays.net: limit max 20
    const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || body?.limit || 20)));
    // ✅ Segurança anti-timeout (Edge): limitar páginas por request.
    // O caller pode continuar via `next.skip` em múltiplas chamadas.
    const requestedMaxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 5));
    const maxPages = Math.min(1, requestedMaxPages);
    let skip = Math.max(0, Number(c.req.query('skip') || body?.skip || 0));
    const startSkip = skip;
    let hasMore = false;

    const includeCanceled = String(c.req.query('includeCanceled') || body?.includeCanceled || '').trim() === '1';
    const rawTypes = normalizeReservationTypes(body?.types ?? body?.type ?? c.req.query('types') ?? c.req.query('type'));
    const types = rawTypes.length > 0 ? rawTypes : ['reserved', 'booked', 'contract'];
    if (includeCanceled && !types.includes('canceled')) types.push('canceled');

    // Inicializa saída de paginação (mesmo se der erro mais cedo)
    nextSkip = startSkip;
    nextHasMore = false;

    console.log(`   🧾 organization_id: ${orgId}`);
    console.log(`   📅 Período: ${fromFinal} até ${toFinal}`);
    console.log(`   📌 dateType: ${dateType} (raw=${rawDateType})`);
    console.log(`   🧾 types: ${types.join(',')}`);
    console.log(`   📄 Paginação: limit=${limit}, maxPages=${maxPages}, skip=${skip}`);
    
    // ✅ Basic Auth (não x-api-key)
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(orgId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);

    // NOTE (2025-12-27): Para cumprir a regra "salvar o JSON completo", buscamos
    // o payload real do cliente em `/booking/clients/{clientId}` quando `_idclient` existe.
    // - Isso resolve o gap onde o payload de `/booking/reservations` vem sem phones/emails/documents.
    // - A persistência é dupla: `guests.staysnet_raw` (para debug rápido) + `staysnet_raw_objects` (fonte de verdade versionada).
    const clientRawCache = new Map<string, StaysNetClientRaw | null>();
    const getClientRaw = async (clientId: string): Promise<StaysNetClientRaw | null> => {
      const key = String(clientId || '').trim();
      if (!key) return null;
      if (clientRawCache.has(key)) return clientRawCache.get(key) || null;

      const raw = await fetchStaysClientDetails({
        baseUrl: staysConfig.baseUrl,
        credentials,
        clientId: key,
      });

      clientRawCache.set(key, raw);

      if (raw) {
        const store = await storeStaysnetRawObject({
          supabase,
          organizationId: orgId,
          domain: 'clients',
          externalId: key,
          externalCode: pickClientEmail(raw),
          endpoint: `/booking/clients/${key}`,
          payload: raw,
          fetchedAtIso: new Date().toISOString(),
        });

        if (!store.ok) {
          console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (clients): ${store.error}`);
        }
      }

      return raw;
    };
    
    const allReservations: StaysNetReservation[] = [];
    let pages = 0;

    while (pages < maxPages) {
      const params = new URLSearchParams({
        from: fromFinal,
        to: toFinal,
        dateType,
        limit: String(limit),
        skip: String(skip),
      });

      for (const t of types) {
        // Stays.net usa `type[]` (ex.: type[]=reserved&type[]=booked...)
        params.append('type[]', t);
      }

      const response = await fetch(`${staysConfig.baseUrl}/booking/reservations?${params}`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const pageData: StaysNetReservation[] = await response.json();
      if (!Array.isArray(pageData)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageData}`);
      }

      allReservations.push(...pageData);
      console.log(`   📥 Página ${pages + 1}: ${pageData.length} itens (total=${allReservations.length})`);

      if (pageData.length < limit) {
        hasMore = false;
        break;
      }

      skip += limit;
      pages++;
      hasMore = pages < maxPages;
    }

    if (pages >= maxPages) {
      hasMore = true;
      console.warn(`   ⚠️ Paginação atingiu maxPages=${maxPages}. Retornando parcial (use next.skip para continuar).`);
    }

    const reservations: StaysNetReservation[] = allReservations;

    fetched = reservations.length;
    console.log(`✅ [FETCH] ${fetched} reservations recebidas\n`);

    if (fetched === 0) {
      return c.json({
        success: true,
        method: 'import-guests',
        stats: { fetched: 0, processed: 0, created: 0, linked: 0, skipped: 0, errors: 0 },
        next: { skip: startSkip, hasMore: false },
        errorDetails: [],
        message: 'Nenhuma reservation encontrada na API StaysNet'
      });
    }

    // ========================================================================
    // STEP 2: PROCESSAR CADA RESERVATION E EXTRAIR GUEST
    // ========================================================================
    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const confirmationCode = res.confirmationCode || res._id || `RES-${i + 1}`;

      console.log(`\n[${i + 1}/${fetched}] 👤 Processando guest de: ${confirmationCode}`);
      processed++;

      try {
        // ====================================================================
        // 2.1: EXTRAIR DADOS DO GUEST
        // ====================================================================
        const guestData = extractGuestData(res);

        // Enriquecimento opcional via /booking/clients/{clientId}
        let clientRaw: StaysNetClientRaw | null = null;
        if (guestData.staysnetClientId) {
          clientRaw = await getClientRaw(guestData.staysnetClientId);
          if (clientRaw) {
            // Se vier informação mais confiável do client, preferir.
            const emailFromClient = pickClientEmail(clientRaw);
            if (emailFromClient) guestData.email = emailFromClient;

            const phoneFromClient = pickClientPhone(clientRaw);
            if (phoneFromClient) guestData.phone = phoneFromClient;

            const nameFromClient = pickClientNameParts(clientRaw);
            if (nameFromClient) {
              if (nameFromClient.firstName) guestData.firstName = nameFromClient.firstName;
              if (nameFromClient.lastName || guestData.lastName === '') guestData.lastName = nameFromClient.lastName;
            }

            // Guardar JSON COMPLETO do client no guest (debug rápido).
            guestData.staysnetRaw = clientRaw;
          }
        }
        console.log(`   📧 Email: ${guestData.email}${guestData.email.endsWith('@staysnet.local') ? ' (sintético)' : ''}`);

        // ====================================================================
        // 2.2: BUSCAR RESERVATION NO BANCO (para vincular depois)
        // ====================================================================
        const externalId = res._id || res.confirmationCode;
        
        const { data: reservation, error: resError } = await supabase
          .from('reservations')
          .select('id, guest_id')
          .eq('organization_id', orgId)
          .eq('external_id', externalId)
          .maybeSingle();

        if (resError) {
          console.error(`   ❌ Erro ao buscar reservation:`, resError.message);
          skipped++;
          continue;
        }

        if (!reservation) {
          console.warn(`   ⚠️ Reservation não encontrada no banco - SKIP (rode import-reservations primeiro)`);
          skipped++;
          continue;
        }

        // ====================================================================
        // 2.3: VERIFICAR SE GUEST JÁ EXISTE
        // Preferência: staysnet_client_id (estável) → email
        // ====================================================================
        let existingGuest: { id: string } | null = null;

        if (guestData.staysnetClientId) {
          const idByClient = await selectGuestIdByStaysnetClientId(supabase, orgId, guestData.staysnetClientId);
          if (idByClient) existingGuest = { id: idByClient };
        }

        if (!existingGuest) {
          const { data: byEmail, error: checkError } = await supabase
            .from('guests')
            .select('id')
            .eq('organization_id', orgId)
            .eq('email', guestData.email)
            .maybeSingle();

          if (checkError) {
            console.error(`   ❌ Erro ao verificar guest por email:`, checkError.message);
          }

          existingGuest = (byEmail as any) || null;
        }

        // Fallback de dedupe (RULES: email OU documento)
        // Ajuda a manter idempotência quando o email muda (ex: sintético → real).
        if (!existingGuest && guestData.cpf) {
          try {
            const cpfDigits = sanitizeDigits(guestData.cpf);
            if (cpfDigits) {
              const { data: byCpf, error: cpfErr } = await supabase
                .from('guests')
                .select('id')
                .eq('organization_id', orgId)
                .eq('cpf', cpfDigits)
                .maybeSingle();
              if (cpfErr) {
                const msg = String(cpfErr.message || '');
                if (!(/cpf/i.test(msg) && /does not exist/i.test(msg))) {
                  console.warn(`   ⚠️ Falha ao verificar guest por cpf: ${msg}`);
                }
              }
              existingGuest = (byCpf as any) || null;
            }
          } catch (e) {
            console.warn(`   ⚠️ Falha inesperada ao verificar guest por cpf: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        if (!existingGuest && guestData.passport) {
          try {
            const passport = guestData.passport.trim();
            if (passport) {
              const { data: byPassport, error: passErr } = await supabase
                .from('guests')
                .select('id')
                .eq('organization_id', orgId)
                .eq('passport', passport)
                .maybeSingle();
              if (passErr) {
                const msg = String(passErr.message || '');
                if (!(/passport/i.test(msg) && /does not exist/i.test(msg))) {
                  console.warn(`   ⚠️ Falha ao verificar guest por passport: ${msg}`);
                }
              }
              existingGuest = (byPassport as any) || null;
            }
          } catch (e) {
            console.warn(`   ⚠️ Falha inesperada ao verificar guest por passport: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        let guestId: string;

        if (existingGuest) {
          guestId = existingGuest.id;
          console.log(`   ♻️ Guest já existe: ${guestId}`);

          // NOTE: Mesmo quando o guest já existe, atualizamos o staysnet_raw com o payload completo do client
          // (não altera dedupe; apenas aumenta auditoria/reprocessamento).
          if (clientRaw) {
            try {
              const patch: any = {
                staysnet_raw: clientRaw,
              };
              if (guestData.staysnetClientId) patch.staysnet_client_id = guestData.staysnetClientId;
              const upd = await supabase
                .from('guests')
                .update(patch)
                .eq('organization_id', orgId)
                .eq('id', guestId);

              if (upd.error && /does not exist/i.test(String(upd.error.message || ''))) {
                // compat: coluna ainda não existe em alguns ambientes
              } else if (upd.error) {
                console.warn(`   ⚠️ Falha ao atualizar staysnet_raw do guest existente: ${upd.error.message}`);
              }

              if (!upd.error) updated++;
            } catch (e) {
              console.warn(`   ⚠️ Falha inesperada ao atualizar staysnet_raw do guest existente: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        } else {
          // ================================================================
          // 2.4: CRIAR NOVO GUEST
          // ================================================================
          console.log(`   ➕ Criando novo guest...`);
          
          const birthDateIso = safeIsoDateOnly(guestData.birthDate);
          if (guestData.birthDate && !birthDateIso) {
            console.warn(`   ⚠️ birthDate inválida/inesperada (ignorado): ${String(guestData.birthDate)}`);
          }

          const newGuestData = {
            id: crypto.randomUUID(),
            organization_id: orgId,
            first_name: guestData.firstName,
            last_name: guestData.lastName,
            email: guestData.email,
            phone: guestData.phone || null,
            cpf: guestData.cpf ? sanitizeDigits(guestData.cpf) : null,
            passport: guestData.passport || null,
            birth_date: birthDateIso,
            nationality: guestData.nationality || null,
            language: guestData.language || 'pt-BR',
            source: guestData.source,
            staysnet_client_id: guestData.staysnetClientId || null,
            staysnet_raw: guestData.staysnetRaw || null,
            stats_total_reservations: 0,
            stats_total_nights: 0,
            stats_total_spent: 0,
            tags: ['staysnet'],
            is_blacklisted: false
          };

          let { data: insertedGuest, error: insertError } = await supabase
            .from('guests')
            .insert(newGuestData)
            .select('id')
            .single();

          // Compat: se migrations ainda não foram aplicadas, não quebrar o import inteiro.
          if (insertError && /does not exist/i.test(String(insertError.message || ''))) {
            const msg = String(insertError.message || '');
            const shouldDropClientId = /staysnet_client_id/i.test(msg);
            const shouldDropRaw = /staysnet_raw/i.test(msg);
            if (shouldDropClientId || shouldDropRaw) {
              const compat: any = { ...(newGuestData as any) };
              if (shouldDropClientId) delete compat.staysnet_client_id;
              if (shouldDropRaw) delete compat.staysnet_raw;
              const retry = await supabase
                .from('guests')
                .insert(compat)
                .select('id')
                .single();
              insertedGuest = retry.data as any;
              insertError = retry.error as any;
            }
          }

          if (insertError) {
            throw new Error(`Falha ao criar guest: ${insertError.message}`);
          }

          guestId = insertedGuest.id;
          console.log(`   ✅ Guest criado: ${guestId}`);
          created++;
        }

        // ====================================================================
        // 2.5: VINCULAR GUEST À RESERVATION (se ainda não estiver vinculado)
        // ====================================================================
        if (reservation.guest_id !== guestId) {
          const { error: linkError } = await supabase
            .from('reservations')
            .update({ guest_id: guestId })
            .eq('id', reservation.id)
            .eq('organization_id', orgId);

          if (linkError) {
            console.error(`   ❌ Erro ao vincular guest à reservation:`, linkError.message);
            errors++;
            errorDetails.push({
              guest: confirmationCode,
              error: `Falha ao vincular guest_id=${guestId} na reservation_id=${reservation.id}: ${linkError.message}`,
            });
          } else {
            console.log(`   🔗 Guest vinculado à reservation: ${reservation.id}`);
            linked++;
          }
        } else {
          console.log(`   ✓ Guest já estava vinculado`);
          alreadyLinked++;
        }

      } catch (err: any) {
        console.error(`   ❌ Erro ao processar ${confirmationCode}:`, err.message);
        errors++;
        errorDetails.push({
          guest: confirmationCode,
          error: err.message
        });
      }
    }

    // ========================================================================
    // STEP 3: RESULTADO FINAL
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESULTADO FINAL - IMPORT GUESTS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Fetched:    ${fetched}`);
    console.log(`   Processed:  ${processed}`);
    console.log(`   Created:    ${created}`);
    console.log(`   Updated:    ${updated}`);
    console.log(`   Linked:     ${linked}`);
    console.log(`   AlreadyLinked: ${alreadyLinked}`);
    console.log(`   Skipped:    ${skipped}`);
    console.log(`   Errors:     ${errors}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errors > 0) {
      console.error('❌ ERROS DETALHADOS:');
      errorDetails.forEach((err, idx) => {
        console.error(`   ${idx + 1}. ${err.guest}: ${err.error}`);
      });
    }

    // Expor paginação do ponto onde paramos
    nextSkip = skip;
    nextHasMore = hasMore;

    return c.json({
      success: errors < processed,
      method: 'import-guests',
      table: 'guests',
      stats: { fetched, processed, created, updated, linked, alreadyLinked, skipped, errors },
      next: { skip: nextSkip, hasMore: nextHasMore },
      errorDetails,
      message: `Importados ${created} guests de StaysNet, ${linked} vinculados a reservations (skipped: ${skipped})`
    });

  } catch (error: any) {
    console.error('\n❌❌❌ ERRO GERAL NO IMPORT ❌❌❌');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    return c.json({
      success: false,
      method: 'import-guests',
      error: error.message,
      stats: { fetched, processed, created, updated, linked, alreadyLinked, skipped, errors },
      next: { skip: nextSkip, hasMore: false },
      errorDetails
    }, 500);
  }
}
