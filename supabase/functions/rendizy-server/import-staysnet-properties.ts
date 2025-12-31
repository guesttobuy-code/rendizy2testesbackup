/**
 * ⚡ IMPORT STAYSNET - PROPERTIES (IMÓVEIS) - v1.0.106 ✅ MAPEAMENTO COMPLETO
 * 
 * 🎯 CORREÇÕES APLICADAS:
 * 1. ✅ externalIds salvo como OBJETO (não string JSON)
 * 2. ✅ propertyType → tipoPropriedade (Building, House, etc.)
 * 3. ✅ unitType → tipoAcomodacao (Duplo, Triplo, etc.)
 * 4. ✅ beds → camas (número de camas)
 * 5. ✅ bedrooms → quartos (CORRIGIDO - era string, agora número)
 * 6. ✅ bathrooms → banheiros (CORRIGIDO - era string, agora número)
 * 7. ✅ bedroomCounts → estrutura detalhada de quartos
 * 8. ✅ publicDescription → descrição pública estruturada
 * 9. ✅ listingType → tipo de listing (Entire Place, etc.)
 * 10. ✅ Todos objetos/arrays salvos sem JSON.stringify()
 * 
 * PADRÃO ATÔMICO:
 * - Usa RPC save_anuncio_field (UPSERT + idempotency)
 * - Salva em anuncios_ultimate campo por campo
 * - Deduplica via staysnet_property_id em externalIds
 * 
 * ENDPOINT API: GET /content/listings
 * TABELA DESTINO: anuncios_ultimate
 * 
 * REFERÊNCIA: docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { importPropertyPricing } from './import-staysnet-pricing.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { storeStaysnetRawObject } from './utils-staysnet-raw-store.ts';
import { LISTING_AMENITIES, LOCATION_AMENITIES } from '../../../utils/amenities-categories.ts';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// MAPEAMENTOS (UI Anúncio Ultimate)
// - O frontend em components/anuncio-ultimate/FormularioAnuncio.tsx lê chaves
//   como: title, tipoLocal, tipoAcomodacao, subtype, bedrooms, bathrooms, beds,
//   guests, coverPhoto, description, e campos de endereço (rua/numero/etc).
// - Este import mantém os campos legados já existentes e adiciona os campos
//   esperados pelo formulário.
// ============================================================================

const TIPO_LOCAL_ALLOWED = new Set<string>([
  'acomodacao_movel',
  'albergue',
  'apartamento',
  'apartamento_residencial',
  'bangalo',
  'barco',
  'barco_beira',
  'boutique',
  'cabana',
  'cama_cafe',
  'camping',
  'casa',
  'castelo',
  'chale',
  'chale_camping',
  'condominio',
  'estalagem',
  'fazenda',
  'hotel',
  'hostel',
  'iate',
  'industrial',
  'motel',
  'pousada',
  'residencia',
  'resort',
  'treehouse',
  'villa',
]);

const TIPO_ACOMODACAO_ALLOWED = new Set<string>([
  'apartamento',
  'bangalo',
  'cabana',
  'camping',
  'capsula',
  'casa',
  'casa_dormitorios',
  'chale',
  'condominio',
  'dormitorio',
  'estudio',
  'holiday_home',
  'hostel',
  'hotel',
  'iate',
  'industrial',
  'loft',
  'quarto_compartilhado',
  'quarto_inteiro',
  'quarto_privado',
  'suite',
  'treehouse',
]);

function normalizeTypeCode(input) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
      .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeAmenityKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\([^)]*\)/g, ' ') // remove parenthetical
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' e ')
      .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildCanonicalAmenityNameIndex(categories: Array<{ amenities: Array<{ id: string; name: string }> }>) {
  const nameToId = new Map<string, string>();
  const allIds = new Set<string>();
  for (const cat of categories || []) {
    for (const amenity of cat?.amenities || []) {
      if (!amenity?.id) continue;
      allIds.add(amenity.id);
      // match by canonical id and by display name
      nameToId.set(normalizeAmenityKey(amenity.id), amenity.id);
      if (amenity.name) nameToId.set(normalizeAmenityKey(amenity.name), amenity.id);
    }
  }
  return { nameToId, allIds };
}

function mapAmenityNamesToCanonicalIds(
  names: string[],
  primaryIndex: { nameToId: Map<string, string> },
  fallbackIndex?: { nameToId: Map<string, string> },
): string[] {
  const out: string[] = [];
  for (const rawName of names || []) {
    const key = normalizeAmenityKey(rawName);
    if (!key) continue;
    const id = primaryIndex.nameToId.get(key) || fallbackIndex?.nameToId.get(key);
    if (id) out.push(id);
  }
  return Array.from(new Set(out));
}

function mapStaysAmenityIdsToCanonicalIds(
  staysIds: string[],
  titleById: Map<string, string>,
  primaryIndex: { nameToId: Map<string, string> },
  fallbackIndex?: { nameToId: Map<string, string> },
): string[] {
  const out: string[] = [];
  for (const rawId of staysIds || []) {
    const id = String(rawId || '').trim();
    if (!id) continue;
    const title = titleById.get(id);
    const candidates = [title, id].filter((v) => typeof v === 'string' && v.trim().length > 0) as string[];
    let mapped: string | undefined;
    for (const c of candidates) {
      const key = normalizeAmenityKey(c);
      mapped = primaryIndex.nameToId.get(key) || fallbackIndex?.nameToId.get(key);
      if (mapped) break;
    }
    if (mapped) out.push(mapped);
  }
  return Array.from(new Set(out));
}

function pickMetaTitle(meta) {
  const t = meta?._mstitle;
  if (!t || typeof t !== 'object') return null;
  return (
    t.pt_BR ||
    t.pt_PT ||
    t.en_US ||
    t.es_ES ||
    t.de_DE ||
    t.fr_FR ||
    t.it_IT ||
    t.sv_SE ||
    t.ru_RU ||
    t.el_GR ||
    null
  );
}

function mapTipoLocalFromStays(prop) {
  const title = pickMetaTitle(prop?._t_propertyTypeMeta) || pickMetaTitle(prop?._t_propertyTypeMeta?._mstitle);
  const raw = title || prop?.category || '';
  if (!raw) return null;
  const code = normalizeTypeCode(raw);
  if (TIPO_LOCAL_ALLOWED.has(code)) return code;

  // Fallbacks comuns
  if (code === 'apartamento_residencial' && TIPO_LOCAL_ALLOWED.has('apartamento_residencial')) return 'apartamento_residencial';
  if (code.startsWith('apartamento') && TIPO_LOCAL_ALLOWED.has('apartamento')) return 'apartamento';
  if (code.startsWith('casa') && TIPO_LOCAL_ALLOWED.has('casa')) return 'casa';
  if (code.includes('boutique') && TIPO_LOCAL_ALLOWED.has('boutique')) return 'boutique';
  return null;
}

function mapTipoAcomodacaoFromStays(prop) {
  const title = pickMetaTitle(prop?._t_typeMeta) || pickMetaTitle(prop?._t_typeMeta?._mstitle);
  const raw = title || prop?.unitType || prop?.type || '';
  if (!raw) return null;
  const code = normalizeTypeCode(raw);
  if (TIPO_ACOMODACAO_ALLOWED.has(code)) return code;
  return null;
}

function mapWizardSubtypeFromStays(prop) {
  const raw = String(prop?.subtype || prop?.listingType || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'entire_home' || raw === 'entire_place') return 'entire_place';
  if (raw === 'private_room') return 'private_room';
  if (raw === 'shared_room') return 'shared_room';
  return null;
}

function pickMsName(meta) {
  const t = meta?._msname;
  if (!t || typeof t !== 'object') return null;
  return (
    t.pt_BR ||
    t.pt_PT ||
    t.en_US ||
    t.es_ES ||
    t.de_DE ||
    t.fr_FR ||
    t.it_IT ||
    t.sv_SE ||
    t.ru_RU ||
    t.el_GR ||
    null
  );
}

function normalizeLooseText(input) {
  // Keep this intentionally simple for edge-runtime compatibility.
  return String(input || '').trim().toLowerCase();
}

function mapRoomTypeFromLabel(label) {
  const l = normalizeLooseText(label);

  if (l.includes('suite') || l.includes('suíte')) return { type: 'suite', typeName: 'Suíte' };
  if (l.includes('quarto')) return { type: 'quarto-duplo', typeName: 'Quarto Duplo/Std/Eco' };
  if (l.includes('banheiro')) return { type: 'banheiro', typeName: 'Banheiro' };
  if (l.includes('sala') || l.includes('lounge') || l.includes('tv')) return { type: 'sala-comum', typeName: 'Sala/Estar Comum' };
  if (l.includes('varanda') || l.includes('terraco') || l.includes('terraço') || l.includes('sacada') || l.includes('balcony')) {
    return { type: 'balcao', typeName: 'Balcão' };
  }

  // Fallback: colocar como "outras" e tentar um customName conhecido
  const customCandidates = [
    { match: /churrasqueira/i, value: 'Churrasqueira' },
    { match: /jacuzzi|banheira/i, value: 'Jacuzzi' },
    { match: /hidromassagem/i, value: 'Hidromassagem' },
    { match: /cozinha/i, value: 'Cozinha' },
    { match: /lavanderia/i, value: 'Lavanderia' },
    { match: /piscina/i, value: 'Piscina' },
    { match: /jardim/i, value: 'Jardim' },
    { match: /deck/i, value: 'Deck' },
    { match: /terra[cç]o/i, value: 'Terraço' },
    { match: /varanda/i, value: 'Varanda' },
    { match: /escritorio|escritório|office/i, value: 'Escritório' },
    { match: /academia|fitness/i, value: 'Academia' },
  ];

  const hit = customCandidates.find((c) => c.match.test(label));
  return { type: 'outras', typeName: 'Outras Dependências', customName: hit?.value };
}

function mapPhotoTagsFromLabel(label) {
  // IMPORTANT: tags precisam bater com PHOTO_TAGS do frontend (strings exatas).
  const l = normalizeLooseText(label);

  if (l.includes('banheira') || l.includes('jacuzzi')) return ['Banheira/jacuzzi'];
  if (l.includes('churrasqueira') || l.includes('bbq') || l.includes('parrilla')) return ['Churrasqueira'];
  if (l.includes('cozinha')) return ['Cozinha'];
  if (l.includes('banheiro')) return ['Banheiro'];
  if (l.includes('quarto')) return ['Quarto'];
  if (l.includes('sala') || l.includes('lounge') || l.includes('tv')) return ['Sala de estar'];
  if (l.includes('varanda')) return ['Varanda'];
  if (l.includes('terraco') || l.includes('terraço')) return ['Terraço'];
  if (l.includes('piscina')) return ['Piscina'];
  if (l.includes('jardim')) return ['Jardim'];
  if (l.includes('fachada')) return ['Fachada'];
  if (l.includes('entrada')) return ['Entrada'];
  if (l.includes('estacionamento')) return ['Estacionamento'];

  return [];
}

// ============================================================================
// STEP 03 (UI) - CÔMODOS + FOTOS
// - O FormularioAnuncio (frontend) espera `data.rooms: Room[]` com `photos: Photo[]`.
// - A StaysNet fornece `_t_imagesMeta[]` com `_msname` (label) e `area`.
// - Aqui criamos rooms agrupando por `_msname` (pt_BR/en_US) e anexamos fotos.
// ============================================================================

function normalizeRoomKey(input) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .trim();
}

function simpleHashBase36(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function guessUiRoomType(label) {
  const key = normalizeRoomKey(label);
  if (!key) return 'outras';

  if (key.includes('suite')) return 'suite';
  if (key.includes('quarto') || key.includes('bedroom')) return 'quarto-duplo';
  if (key.includes('estudio') || key.includes('studio') || key.includes('estúdio')) return 'estudio';
  if (key.includes('banheiro') || key.includes('bathroom') || key.includes('wc')) {
    if (key.includes('1/2') || key.includes('meio') || key.includes('lavabo')) return 'meio-banheiro';
    return 'banheiro';
  }
  if (key.includes('sala') || key.includes('lounge') || key.includes('tv room') || key.includes('living')) return 'sala-comum';
  if (key.includes('area comum') || key.includes('área comum') || key.includes('common area')) return 'area-comum';
  if (key.includes('varanda') || key.includes('terraco') || key.includes('terraço') || key.includes('sacada') || key.includes('balcony') || key.includes('terrace')) return 'balcao';

  return 'outras';
}

function buildUiRoomsFromImagesMeta(imagesMeta) {
  if (!Array.isArray(imagesMeta) || imagesMeta.length === 0) return [];

  const roomsByKey = new Map();
  const photoIdsByRoomKey = new Map();

  imagesMeta.forEach((img, idx) => {
    const url = String(img?.url ?? '').trim();
    if (!url) return;

    const photoId = String(img?._id ?? img?.id ?? `img-${idx}`).trim();
    const label = pickMsName(img?._msname) || String(img?.area ?? '').trim() || 'Fotos';
    const roomKey = normalizeRoomKey(label);
    const type = guessUiRoomType(label);
    const roomId = `stays-room-${simpleHashBase36(roomKey || label)}`;

    if (!roomsByKey.has(roomKey)) {
      roomsByKey.set(roomKey, {
        id: roomId,
        type,
        // IMPORTANTE: manter o label do Stays como nome visível do cômodo
        // (UI usa customName || typeName)
        typeName: label,
        customName: '',
        isShared: false,
        beds: {},
        photos: [],
      });
      photoIdsByRoomKey.set(roomKey, new Set<string>());
    }

    const seen = photoIdsByRoomKey.get(roomKey);
    if (seen.has(photoId)) return;
    seen.add(photoId);

    const tags = [];
    if (label) tags.push(label);
    if (typeof img?.area === 'string' && img.area.trim()) {
      tags.push(`area:${img.area.trim()}`);
    }

    roomsByKey.get(roomKey).photos.push({ id: photoId, url, tags });
  });

  return Array.from(roomsByKey.values()).filter((r) => r.photos.length > 0);
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stripHtmlToText(input: unknown): string {
  return String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampText(input: string, maxLen: number): string {
  const s = String(input || '');
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

type WizardMultiLangText = { pt: string; en: string; es: string };

function staysMultiLangToWizard(block: any, maxLen: number, opts?: { stripHtml?: boolean }): WizardMultiLangText | null {
  const strip = opts?.stripHtml !== false;
  const pick = (v: unknown) => {
    const raw = strip ? stripHtmlToText(v) : String(v || '').trim();
    return clampText(raw, maxLen);
  };

  const pt = pick(block?.pt_BR ?? block?.pt_PT ?? block?.pt ?? '');
  const en = pick(block?.en_US ?? block?.en_GB ?? block?.en ?? '');
  const es = pick(block?.es_ES ?? block?.es ?? '');

  if (!pt && !en && !es) return null;
  return { pt, en, es };
}

// ============================================================================
// ESTRUTURA DA API StaysNet /content/listings
// Cada propriedade retorna:
//   _id, name, internalName, status, active, published
//   _mstitle, _t_propertyMeta, _t_propertyTypeMeta
//   subtype, category, listingType
//   _i_rooms, _f_bathrooms, _i_beds, _i_maxGuests, accommodates
//   bedroomCounts, address, coordinates, photos, picture
//   amenities, description, publicDescription, cleaningFee
//   importingBlockedStatus, timezone
// ============================================================================

// ============================================================================
// FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// ============================================================================
export async function importStaysNetProperties(c) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - PROPERTIES (IMÓVEIS)');
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 API Endpoint: /content/listings');
  console.log('📍 Tabela Destino: anuncios_ultimate');
  console.log('📍 Método: RPC save_anuncio_field (atomic)');
  console.log('═══════════════════════════════════════════════════\n');

  let fetched = 0;
  let saved = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails: Array<{property: string, error: string}> = [];

  try {
    // ========================================================================
    // STEP 0: LER REQUEST BODY - selectedPropertyIds
    // ========================================================================
    const body = await c.req.json().catch(() => ({}));
    const selectedPropertyIds = Array.isArray(body.selectedPropertyIds) 
      ? body.selectedPropertyIds 
      : [];

    const rawOrganizationIdFromBody = String((body as any)?.organizationId ?? (body as any)?.organization_id ?? '').trim();
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    
    console.log(`📥 [REQUEST] Recebidos ${selectedPropertyIds.length} property IDs selecionados`);
    
    if (selectedPropertyIds.length > 0) {
      console.log(`📝 [REQUEST] IDs: ${selectedPropertyIds.slice(0, 5).join(', ')}${selectedPropertyIds.length > 5 ? '...' : ''}`);
    }

    // ========================================================================
    // STEP 1: RESOLVER ORG + CARREGAR CONFIG (runtime)
    // ========================================================================

    // NOTE (2025-12-27): fonte de verdade versionada.
    // `anuncios_ultimate.data.staysnet_raw` é útil para debug rápido, mas a exigência é
    // salvar o JSON completo de forma escalável e deduplicada (por hash) em `staysnet_raw_objects`.
    // A persistência do RAW é feita por property, dentro do loop de importação.

    console.log('🔧 [CONFIG] Carregando configuração StaysNet (runtime)...');

    // ✅ RISCO ZERO (multi-tenant): este import NÃO deve rodar sem contexto explícito de organização.
    // Regras:
    // - Se existe token/sessão do usuário, usamos getOrganizationIdOrThrow (e se falhar, erro).
    // - Se NÃO existe sessão, só aceitamos body.organizationId explícito (scripts/rotinas).
    // Observação: DEFAULT_ORG_ID pode ser um tenant real (ex.: admin master). O risco é cair nele
    // implicitamente por falta de sessão; isso é proibido.
    let organizationId: string | null = null;
    try {
      organizationId = await getOrganizationIdOrThrow(c);
    } catch {
      // ignore
    }

    if (!organizationId) {
      if (rawOrganizationIdFromBody && isUuid(rawOrganizationIdFromBody)) {
        organizationId = rawOrganizationIdFromBody;
      } else {
        return c.json({
          success: false,
          error: 'ORG_REQUIRED',
          message: 'organizationId obrigatório: envie sessão do usuário (X-Auth-Token/cookie/Authorization) ou informe body.organizationId explicitamente.'
        }, 401);
      }
    }

    console.log('🔧 [CONFIG] Organization ID:', organizationId);

    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId);

    console.log('✅ [CONFIG] Configuração carregada com sucesso:');
    console.log('  - Base URL:', config.baseUrl);
    console.log('  - API Key:', config.apiKey?.substring(0, 4) + '****');
    console.log('  - API Secret:', config.apiSecret ? 'presente' : 'ausente');

    // ========================================================================
    // STEP 1.5: (RESOLUTION) TENTAR RESOLVER IDs INTERNOS -> IDs STAYS
    // ========================================================================
    // O modal normalmente envia IDs da Stays (listing._id ou listing.id).
    // Porém, em alguns fluxos operacionais, pode ser útil informar:
    // - anuncios_ultimate.id (UUID)
    // - anuncios_ultimate.data.internalId
    // - anuncios_ultimate.data.codigo
    // Quando isso ocorre, resolvemos para externalIds.* (staysnet_listing_id/code) e
    // adicionamos esses candidatos ao conjunto de seleção.

    const normalizeId = (v) => {
      if (v === null || v === undefined) return '';
      return String(v).trim();
    };

    const selectedSet = new Set(
      selectedPropertyIds.map((x) => normalizeId(x)).filter(Boolean),
    );

    const resolvedSelectedFromDb: Record<string, string[]> = {};

    const supabase = getSupabaseClient();

    if (selectedSet.size > 0) {
      for (const rawSelected of Array.from(selectedSet.values())) {
        const selectedId = normalizeId(rawSelected);
        if (!selectedId) continue;

        // Evita loop/duplicação caso já seja um ID válido de Stays
        // (Ainda assim, a resolução é segura; apenas evita queries desnecessárias.)
        const looksLikeStaysMongoId = /^[a-f0-9]{24}$/i.test(selectedId);
        if (looksLikeStaysMongoId) continue;

        // 1) anuncios_ultimate.id
        let row: any | null = null;
        try {
          const q1 = await supabase
            .from('anuncios_ultimate')
            .select('id,data')
            .eq('organization_id', organizationId)
            .eq('id', selectedId)
            .limit(1);
          if (!q1.error && Array.isArray(q1.data) && q1.data.length > 0) row = q1.data[0];
        } catch {
          // ignore
        }

        // 2) anuncios_ultimate.data.internalId
        if (!row) {
          try {
            const q2 = await supabase
              .from('anuncios_ultimate')
              .select('id,data')
              .eq('organization_id', organizationId)
              .eq('data->>internalId', selectedId)
              .limit(1);
            if (!q2.error && Array.isArray(q2.data) && q2.data.length > 0) row = q2.data[0];
          } catch {
            // ignore
          }
        }

        // 3) anuncios_ultimate.data.codigo
        if (!row) {
          try {
            const q3 = await supabase
              .from('anuncios_ultimate')
              .select('id,data')
              .eq('organization_id', organizationId)
              .eq('data->>codigo', selectedId)
              .limit(1);
            if (!q3.error && Array.isArray(q3.data) && q3.data.length > 0) row = q3.data[0];
          } catch {
            // ignore
          }
        }

        if (!row) continue;

        const data: any = row?.data || null;
        const externalIds: any = data?.externalIds || null;

        // Preferir IDs canônicos para evitar importar coisas erradas.
        // Regra:
        // - Se tiver staysnet_listing_id (24-hex), usa só ele.
        // - Senão, tenta staysnet_property_id se for 24-hex.
        // - Só usa staysnet_listing_code como último recurso (é ambíguo para fetch-by-id).
        const listingId = normalizeId(externalIds?.staysnet_listing_id);
        const propertyId = normalizeId(externalIds?.staysnet_property_id);
        const listingCode = normalizeId(externalIds?.staysnet_listing_code);

        const isMongoId = (v) => /^[a-f0-9]{24}$/i.test(v);

        const candidates = (() => {
          if (listingId && isMongoId(listingId)) return [listingId];
          if (propertyId && isMongoId(propertyId)) return [propertyId];
          if (listingCode) return [listingCode];
          return [] as string[];
        })();

        if (candidates.length === 0) continue;

        resolvedSelectedFromDb[selectedId] = candidates;
        for (const cId of candidates) selectedSet.add(cId);

        // Importante: se o ID original era interno (UUID/codigo/internalId) e foi resolvido,
        // removemos ele do conjunto para não forçar varredura completa/piorar matching.
        selectedSet.delete(selectedId);
      }

      if (Object.keys(resolvedSelectedFromDb).length > 0) {
        console.log('🔁 [RESOLVE] IDs resolvidos via anuncios_ultimate → Stays IDs');
        console.log('   ', JSON.stringify(resolvedSelectedFromDb));
      }
    }

    // ========================================================================
    // STEP 2: BUSCAR TODAS AS PROPERTIES DA API STAYSNET (COM PAGINAÇÃO)
    // ========================================================================
    console.log('📡 [FETCH] Buscando TODAS as properties com paginação automática...');
    
    // Paginação (opcional): permite import modular para evitar timeout (502)
    // - Se maxPages > 0, roda em modo batch e retorna `next`.
    // - Caso contrário, mantém o comportamento antigo (buscar tudo).
    const reqLimitRaw = Number(c.req.query('limit') || body?.limit || 100);
    const reqLimit = Math.min(100, Math.max(1, Number.isFinite(reqLimitRaw) ? reqLimitRaw : 100));
    const reqSkipRaw = Number(c.req.query('skip') || body?.skip || 0);
    const reqSkip = Math.max(0, Number.isFinite(reqSkipRaw) ? reqSkipRaw : 0);
    const reqMaxPagesRaw = Number(c.req.query('maxPages') || body?.maxPages || 0);
    const reqMaxPages = Math.max(0, Number.isFinite(reqMaxPagesRaw) ? reqMaxPagesRaw : 0);
    const isBatchMode = reqMaxPages > 0;

    const hasSelected = selectedSet.size > 0;

    const matchesSelected = (p) => {
      const idCandidates = [
        p?._id,
        p?.id,
        p?._t_propertyMeta?._id,
        p?._t_propertyMeta?.id,
        p?.internalName,
        p?.name,
      ]
        .map(normalizeId)
        .filter(Boolean);

      for (const c of idCandidates) {
        if (selectedSet.has(c)) return true;
      }
      return false;
    };

    // Buscar properties com paginação manual
    let allProperties: StaysNetProperty[] = [];
    let skip = reqSkip;
    const limit = reqLimit;
    let hasMore = true;
    let pagesFetched = 0;
    let scanned = 0;
    const foundSelected = new Set<string>();
    let sampleFromApi: StaysNetProperty[] | null = null;
    
    // Criar Basic Auth
    const credentials = btoa(`${config.apiKey}:${config.apiSecret || ''}`);
    const staysHeaders = {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
    };

    // Índices canônicos (UI) para mapear amenities StaysNet -> IDs do checkbox
    const canonicalLocationIndex = buildCanonicalAmenityNameIndex(LOCATION_AMENITIES as any);
    const canonicalListingIndex = buildCanonicalAmenityNameIndex(LISTING_AMENITIES as any);

    const tryParseTranslationArray = (json: unknown): any[] | null => {
      if (Array.isArray(json)) return json;
      if (json && typeof json === 'object') {
        const j: any = json as any;
        if (Array.isArray(j.data)) return j.data;
        if (Array.isArray(j.amenities)) return j.amenities;
        if (Array.isArray(j.propertyAmenities)) return j.propertyAmenities;
        if (Array.isArray(j.listingAmenities)) return j.listingAmenities;
        if (Array.isArray(j.items)) return j.items;
      }
      return null;
    };

    const pickTitleFromTranslationRow = (row: any): string | null => {
      const metaTitle = pickMetaTitle(row);
      if (metaTitle) return String(metaTitle).trim();
      const title =
        String(
          row?.title?.pt_BR ||
            row?.title?.pt_PT ||
            row?.title?.en_US ||
            row?.title?.es_ES ||
            row?.name?.pt_BR ||
            row?.name?.pt_PT ||
            row?.name?.en_US ||
            row?.name ||
            ''
        ).trim();
      return title || null;
    };

    const fetchAmenityTranslationMap = async () => {
      // Observação: StaysNet parece expor ao menos `property-amenities` oficialmente,
      // mas alguns ambientes podem ter endpoints extras para amenities do listing.
      // Fazemos best-effort e mesclamos tudo em um map (id -> title).
      const endpointsToTry = [
        '/translation/property-amenities',
        '/translation/amenities',
        '/translation/listing-amenities',
      ];

      const map = new Map<string, string>();
      const sources: Array<{ endpoint: string; ok: boolean; count: number }> = [];

      for (const endpoint of endpointsToTry) {
        const url = `${config.baseUrl}${endpoint}`;
        try {
          const resp = await fetch(url, { headers: staysHeaders });
          if (!resp.ok) {
            sources.push({ endpoint, ok: false, count: 0 });
            continue;
          }

          const json = await resp.json();
          const arr = tryParseTranslationArray(json);
          if (!arr) {
            sources.push({ endpoint, ok: true, count: 0 });
            continue;
          }

          let added = 0;
          for (const row of arr) {
            if (!row || typeof row !== 'object') continue;
            const id = String((row as any)?._id ?? (row as any)?.id ?? '').trim();
            if (!id) continue;
            const title = pickTitleFromTranslationRow(row);
            if (!title) continue;
            if (!map.has(id)) {
              map.set(id, title);
              added++;
            }
          }
          sources.push({ endpoint, ok: true, count: added });
        } catch {
          sources.push({ endpoint, ok: false, count: 0 });
        }
      }

      return { map, sources };
    };

    const normalizeCustomFieldLabel = (input: unknown): string => {
      return String(input || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const tryPickCustomFieldLabel = (row: any): string | null => {
      if (!row || typeof row !== 'object') return null;
      const metaTitle = pickMetaTitle(row) || pickMetaTitle(row?._mstitle) || pickMsName(row) || pickMsName(row?._msname);
      if (metaTitle) return String(metaTitle).trim() || null;
      const name = String(row?.label || row?.name || row?.title || row?.fieldName || '').trim();
      return name || null;
    };

    const collectCustomFieldDefsDeep = (node: any, out: Array<{ id: string; label: string }>, depth = 0) => {
      if (!node || depth > 6) return;
      if (Array.isArray(node)) {
        for (const item of node) collectCustomFieldDefsDeep(item, out, depth + 1);
        return;
      }
      if (typeof node !== 'object') return;

      const idRaw = (node as any)?.id ?? (node as any)?._id ?? (node as any)?.fieldId;
      const label = tryPickCustomFieldLabel(node);
      if (idRaw !== undefined && idRaw !== null && label) {
        const id = String(idRaw).trim();
        if (id) out.push({ id, label });
      }

      for (const v of Object.values(node)) {
        if (v && (typeof v === 'object' || Array.isArray(v))) {
          collectCustomFieldDefsDeep(v, out, depth + 1);
        }
      }
    };

    const fetchListingCustomFieldDefinitions = async () => {
      const endpointsToTry = [
        '/settings/custom-fields',
        '/settings/customfields',
        '/settings/listing/custom-fields',
        '/settings/listing/customfields',
        '/settings/listing-custom-fields',
        '/settings/listingcustomfields',
        '/content/custom-fields',
        '/content/customfields',
      ];

      const byId = new Map<string, string>();
      const sources: Array<{ endpoint: string; ok: boolean; count: number }> = [];

      for (const endpoint of endpointsToTry) {
        const url = `${config.baseUrl}${endpoint}`;
        try {
          const resp = await fetch(url, { headers: staysHeaders });
          if (!resp.ok) {
            sources.push({ endpoint, ok: false, count: 0 });
            continue;
          }

          const json = await resp.json().catch(() => null);
          const defs: Array<{ id: string; label: string }> = [];
          collectCustomFieldDefsDeep(json, defs);
          let added = 0;
          for (const d of defs) {
            if (!byId.has(d.id)) {
              byId.set(d.id, d.label);
              added++;
            }
          }
          sources.push({ endpoint, ok: true, count: added });

          // Se já encontrou uma quantidade razoável, pode parar cedo.
          if (byId.size >= 10) break;
        } catch {
          sources.push({ endpoint, ok: false, count: 0 });
        }
      }
      return { byId, sources };
    };

    // Fetch 1x (best-effort). Mesmo se falhar, seguimos com import e só não mapeamos checkboxes.
    const translationFetch = await fetchAmenityTranslationMap();
    const globalAmenityTitleById = translationFetch.map;

    // ========================================================================
    // STEP 2.0b: Campos Personalizados (Descrição) - Settings do Rendizy + defs do StaysNet
    // - O usuário configura em "Configurações > Locais e Anúncios > Campos personalizados".
    // - O StaysNet envia `customFields: [{id, val}]` (id numérico) no listing.
    // - Aqui fazemos best-effort para resolver id -> nome (via endpoints settings/content) e
    //   casar por NOME com os campos configurados no Rendizy, salvando em
    //   anuncios_ultimate.data.custom_description_fields_values (por field.id estável).
    // ========================================================================
    const rendizyCustomFieldIdByLabelKey = new Map<string, string>();
    try {
      const settingsRowRes = await supabase
        .from('anuncios_ultimate')
        .select('data')
        .eq('organization_id', organizationId)
        .eq('data->>__kind', 'settings')
        .eq('data->>__settings_key', 'locations_listings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const settingsEnvelope = (settingsRowRes as any)?.data?.data;
      const settings = settingsEnvelope?.settings;
      const customFields = settings?.customDescriptionFields;
      if (Array.isArray(customFields)) {
        for (const f of customFields) {
          if (!f || typeof f !== 'object') continue;
          const id = String((f as any).id || '').trim();
          const label = String((f as any).label || '').trim();
          if (!id || !label) continue;
          rendizyCustomFieldIdByLabelKey.set(normalizeCustomFieldLabel(label), id);
        }
      }
    } catch {
      // ignore
    }

    const staysCustomFieldDefsFetch = await fetchListingCustomFieldDefinitions();
    const staysCustomFieldLabelById = staysCustomFieldDefsFetch.byId;

    const fetchListingDetailsById = async (listingIdRaw) => {
      const listingId = normalizeId(listingIdRaw);
      if (!listingId) return null;

      const urlById = `${config.baseUrl}/content/listings/${encodeURIComponent(listingId)}`;
      try {
        const resp = await fetch(urlById, { headers: staysHeaders });

        if (!resp.ok) return null;

        const json = await resp.json();
        if (json && typeof json === 'object' && !Array.isArray(json)) {
          // Alguns endpoints podem retornar wrapper. Mantemos o objeto completo.
          return json as Record<string, any>;
        }
        return null;
      } catch {
        return null;
      }
    };

    const fetchPropertyAmenitiesById = async (propertyIdRaw) => {
      const propertyId = normalizeId(propertyIdRaw);
      if (!propertyId) return null;

      const urlById = `${config.baseUrl}/content/properties/${encodeURIComponent(propertyId)}/amenities`;
      try {
        const resp = await fetch(urlById, { headers: staysHeaders });

        if (!resp.ok) return null;

        const json = await resp.json();
        // Pode retornar:
        // - array de amenities
        // - objeto wrapper (ex: { amenities: [...] } ou { data: [...] })
        const arr = Array.isArray(json)
          ? json
          : (Array.isArray((json as any)?.amenities) ? (json as any).amenities
            : (Array.isArray((json as any)?.data) ? (json as any).data
              : null));

        if (!arr) return null;

        const ids = arr
          .map((a: any) => (a && typeof a === 'object' ? a._id : a))
          .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
          .filter((v) => Boolean(v));

        const titlesById = new Map<string, string>();
        for (const a of arr) {
          if (!a || typeof a !== 'object') continue;
          const id = String((a as any)?._id ?? (a as any)?.id ?? '').trim();
          if (!id) continue;
          const title = pickMetaTitle(a) || String((a as any)?.title?.pt_BR || (a as any)?.title?.en_US || '').trim();
          if (title) titlesById.set(id, title);
        }

        if (ids.length === 0) return { raw: json, ids: [], titlesById };
        return { raw: json, ids, titlesById };
      } catch {
        return null;
      }
    };

    // ========================================================================
    // STEP 2.1: (TARGET MODE) TENTAR BUSCA DIRETA POR ID
    // ========================================================================
    // Em algumas contas/ambientes, um listing pode não aparecer na listagem paginada
    // por causa de filtros/visibilidade, mas ainda ser acessível via endpoint por ID.
    if (hasSelected) {
      console.log(`🎯 [FETCH] selectedPropertyIds: tentando busca direta por ID antes da paginação...`);

      for (const rawId of Array.from(selectedSet.values())) {
        const id = normalizeId(rawId);
        if (!id) continue;

        // Segurança: fetch-by-id só é confiável para o _id (24-hex).
        // Evita buscar por códigos curtos que podem ser ambíguos.
        if (!/^[a-f0-9]{24}$/i.test(id)) continue;

        // Evita repetir se já foi achado via outra via
        if (foundSelected.has(id)) continue;

        const urlById = `${config.baseUrl}/content/listings/${encodeURIComponent(id)}`;
        try {
          const respById = await fetch(urlById, {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Accept': 'application/json',
            },
          });

          if (!respById.ok) {
            // Silencioso: pode não existir, e seguiremos para paginação.
            continue;
          }

          const json = await respById.json();
          const obj = (json && typeof json === 'object' && !Array.isArray(json)) ? json : null;
          if (!obj) continue;

          const prop: any = obj;
          if (!prop._id) prop._id = id;
          allProperties.push(prop as StaysNetProperty);
          foundSelected.add(id);
        } catch {
          // ignore
        }
      }
    }
    
    while (hasMore) {
      console.log(`📡 [FETCH] Buscando página: skip=${skip}, limit=${limit}`);
      
      const url = `${config.baseUrl}/content/listings?skip=${skip}&limit=${limit}`;
      const response = await fetch(url, { headers: staysHeaders });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [ERROR] API Response: ${errorText.substring(0, 500)}`);
        throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const pageProperties: StaysNetProperty[] = await response.json();
      
      if (!Array.isArray(pageProperties)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageProperties}`);
      }
      
      scanned += pageProperties.length;

      if (!sampleFromApi) {
        sampleFromApi = pageProperties.slice(0, 3);
      }

      if (!hasSelected) {
        allProperties.push(...pageProperties);
      } else {
        for (const p of pageProperties) {
          if (!matchesSelected(p)) continue;
          allProperties.push(p);

          // Marcar quais IDs de seleção já foram encontrados.
          // (1) match por `_id`/`id`
          const ids = [p?._id, p?.id, p?._t_propertyMeta?._id, p?._t_propertyMeta?.id, p?.internalName, p?.name]
            .map(normalizeId)
            .filter(Boolean);
          for (const id of ids) {
            if (selectedSet.has(id)) foundSelected.add(id);
          }
        }
      }

      hasMore = pageProperties.length === limit;
      skip += limit;
      pagesFetched++;

      // ✅ Se houver seleção, o objetivo é achar os IDs; não faz sentido parar cedo
      // só por `maxPages` (isso gera falso ID_MISMATCH). Ainda assim, permitimos early-exit
      // quando já achamos tudo o que foi solicitado.
      if (hasSelected && foundSelected.size >= selectedSet.size) {
        break;
      }

      if (!hasSelected && isBatchMode && pagesFetched >= reqMaxPages) {
        break;
      }
      
      console.log(`📥 [FETCH] ${pageProperties.length} properties nesta página. Total: ${allProperties.length}`);
    }

    if (hasSelected && allProperties.length === 0 && (sampleFromApi?.length || 0) > 0) {
      console.error(`❌ [FILTER ERROR] Nenhuma property selecionada foi encontrada após varrer ${scanned} itens.`);

      return c.json({
        success: false,
        error: 'ID_MISMATCH',
        message: 'Os IDs selecionados não foram encontrados na API StaysNet',
        details: {
          selectedCount: selectedPropertyIds.length,
          resolvedSelectedFromDb,
          scanned,
          pagesFetched,
          limit,
          startSkip: reqSkip,
          sampleSelectedIds: selectedPropertyIds.slice(0, 3),
          sampleApiIds: (sampleFromApi || []).slice(0, 3).map((p) => p._id),
          sampleApiIdVariants: (sampleFromApi || []).slice(0, 3).map((p) => ({
            _id: p?._id,
            id: p?.id,
            _t_propertyMeta__id: p?._t_propertyMeta?._id,
            _t_propertyMeta_id: p?._t_propertyMeta?.id,
            internalName: p?.internalName,
            name: p?.name,
          })),
        },
      }, 400);
    }
    
    // ========================================================================
    // STEP 2.5: FILTRO PADRÃO (ANTI-INATIVOS)
    // ========================================================================
    // Objetivo: NÃO importar imóveis realmente inativos (não nos interessam).
    // Importante: NÃO filtrar rascunhos/ocultos, pois eles ainda são úteis e devem
    // aparecer como "Rascunho" na UI.
    // A API pode representar inativo como:
    // - status: 'inactive'
    // - active: false
    //
    // ✅ EXCEÇÃO: quando selectedPropertyIds é informado, precisamos conseguir
    // importar/matchear mesmo imóveis inativos (para resolver reservas históricas).
    let properties: StaysNetProperty[];
    if (selectedPropertyIds.length > 0) {
      properties = allProperties;
      console.log(`✅ [FETCH] selectedPropertyIds presente: pulando filtro anti-inativos (itens=${properties.length})`);
    } else {
      properties = allProperties.filter((p) => {
        const status = typeof p?.status === 'string' ? p.status.toLowerCase().trim() : null;
        if (status === 'inactive') return false;
        if (typeof p?.active === 'boolean' && p.active === false) return false;
        return true;
      });

      console.log(`✅ [FETCH] ${properties.length} properties elegíveis após filtro (anti-inativos)`);
    }

    // ========================================================================
    // STEP 3: FILTRAR APENAS AS PROPERTIES SELECIONADAS
    // ========================================================================
    if (selectedPropertyIds.length > 0) {
      const before = properties.length;
      const propertiesBeforeFilter = [...properties]; // 🔍 Salvar cópia ANTES do filtro

      // IDs de seleção podem vir da reservation como `_idlisting`/`propertyId`.
      // Além disso, o STEP 1.5 pode ter resolvido IDs internos (UUID/internalId/codigo)
      // para IDs Stays (externalIds.*). Por isso, aqui usamos o `selectedSet` já resolvido.
      
      // 🔍 DEBUG: Logar formato dos IDs ANTES do filtro
      console.error(`🔍 [DEBUG FILTER] Antes do filtro: ${before} properties`);
      console.error(`🔍 [DEBUG FILTER] Sample API IDs:`, propertiesBeforeFilter.slice(0, 3).map(p => p._id));
      console.error(`🔍 [DEBUG FILTER] Sample selected IDs:`, selectedPropertyIds.slice(0, 3));
      console.error(`🔍 [DEBUG FILTER] Tipo ID API: ${typeof propertiesBeforeFilter[0]?._id}`);
      console.error(`🔍 [DEBUG FILTER] Tipo ID selected: ${typeof selectedPropertyIds[0]}`);
      console.error(`🔍 [DEBUG FILTER] Resolved selectedSet size: ${selectedSet.size}`);

      properties = properties.filter((p) => {
        const idCandidates = [
          p?._id,
          p?.id,
          p?._t_propertyMeta?._id,
          p?._t_propertyMeta?.id,
          p?.internalName,
          p?.name,
        ]
          .map(normalizeId)
          .filter(Boolean);

        for (const c of idCandidates) {
          if (selectedSet.has(c)) return true;
        }
        return false;
      });
      console.error(`🔍 [DEBUG FILTER] Depois do filtro: ${properties.length}/${before} properties`);
      
      if (properties.length === 0 && before > 0) {
        console.error(`❌ [FILTER ERROR] TODAS as properties foram filtradas!`);
        console.error(`   Isso significa que os IDs não batem.`);
        
        // Retornar erro claro
        return c.json({
          success: false,
          error: 'ID_MISMATCH',
          message: 'Os IDs selecionados não foram encontrados na API StaysNet',
          details: {
            selectedCount: selectedPropertyIds.length,
            apiCount: before,
            sampleSelectedIds: selectedPropertyIds.slice(0, 3),
            sampleApiIds: propertiesBeforeFilter.slice(0, 3).map((p) => p._id),
            sampleApiIdVariants: propertiesBeforeFilter.slice(0, 3).map((p) => ({
              _id: p?._id,
              id: p?.id,
              _t_propertyMeta__id: p?._t_propertyMeta?._id,
              _t_propertyMeta_id: p?._t_propertyMeta?.id,
              internalName: p?.internalName,
              name: p?.name,
            })),
          },
        }, 400);
      }
    } else {
      console.log(`⚠️ [FILTER] Nenhum ID selecionado - importando TODAS as ${properties.length} properties`);
    }

    fetched = properties.length;
    console.log(`📦 [IMPORT] Iniciando importação de ${fetched} properties\n`);

    if (fetched === 0) {
      return c.json({
        success: true,
        data: {
          stats: { total: 0, created: 0, updated: 0, errors: 0 },
          method: 'import-properties',
          table: 'anuncios_ultimate',
          message: 'Nenhuma property para importar'
        }
      });
    }

    // ========================================================================
    // STEP 4: SALVAR CADA PROPERTY EM anuncios_ultimate
    // ========================================================================
    for (let i = 0; i < properties.length; i++) {
      const propListPayload = properties[i];
      let prop = propListPayload;
      const propertyName = prop.internalName || prop.name || prop._id;

      console.log(`\n[${i + 1}/${fetched}] 🏠 Processando: ${propertyName}`);

      try {
        // ====================================================================
        // 2.0: SALVAR RAW COMPLETO (soft-fail) - staysnet_raw_objects
        // ====================================================================
        try {
          const externalId = String((prop as any)._id || (prop as any).id || '').trim() || null;
          const externalCode = String((prop as any).id || (prop as any).code || '').trim() || null;
          const store = await storeStaysnetRawObject({
            supabase,
            organizationId,
            domain: 'listings',
            externalId,
            externalCode,
            endpoint: '/content/listings',
            payload: propListPayload,
            fetchedAtIso: new Date().toISOString(),
          });
          if (!store.ok) {
            console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (listings): ${store.error}`);
          }
        } catch (e) {
          console.warn(`⚠️ Falha inesperada ao salvar staysnet_raw_objects (listings): ${e instanceof Error ? e.message : String(e)}`);
        }

        // ====================================================================
        // 2.0.5: ENRIQUECER COM DETALHE POR ID (para fotos/amenities)
        // ====================================================================
        // Observação: em alguns ambientes, o endpoint de lista (`/content/listings`)
        // pode não retornar `_t_imagesMeta` e/ou `_t_amenitiesMeta`. Para garantir
        // persistência completa (ex.: fotos), buscamos o detalhe do listing quando
        // os campos esperados não vierem.
        const shouldEnrich =
          (!prop._t_imagesMeta || !Array.isArray(prop._t_imagesMeta) || prop._t_imagesMeta.length === 0)
          || (!prop._t_amenitiesMeta || !Array.isArray(prop._t_amenitiesMeta) || prop._t_amenitiesMeta.length === 0);

        if (shouldEnrich) {
          const listingId = (prop as any)?._id || (prop as any)?.id;
          const detail = await fetchListingDetailsById(listingId);
          if (detail) {
            // Salvar RAW do endpoint de detalhe também (soft-fail)
            try {
              const externalId = String((prop as any)._id || (prop as any).id || '').trim() || null;
              const externalCode = String((prop as any).id || (prop as any).code || '').trim() || null;
              const storeDetail = await storeStaysnetRawObject({
                supabase,
                organizationId,
                domain: 'listings',
                externalId,
                externalCode,
                endpoint: `/content/listings/${String(listingId ?? '').trim()}`,
                payload: detail,
                fetchedAtIso: new Date().toISOString(),
              });
              if (!storeDetail.ok) {
                console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (listings detalhe): ${storeDetail.error}`);
              }
            } catch (e) {
              console.warn(`⚠️ Falha inesperada ao salvar staysnet_raw_objects (listings detalhe): ${e instanceof Error ? e.message : String(e)}`);
            }

            // Merge: mantém `_id`/ids do item original, mas incorpora campos do detalhe
            prop = {
              ...detail,
              ...propListPayload,
              _id: (propListPayload as any)?._id || (detail as any)?._id,
              id: (propListPayload as any)?.id || (detail as any)?.id,
            } as any;
          }
        }

        // ====================================================================
        // 2.0.6: FALLBACK PARA PROPERTY AMENITIES (local) QUANDO AUSENTE
        // ====================================================================
        // Em alguns ambientes, o detalhe do listing não retorna `propertyAmenities`.
        // Tentamos buscar via endpoint oficial: /content/properties/:id/amenities.
        try {
          const hasPropertyAmenities = Array.isArray((prop as any)?.propertyAmenities)
            && (prop as any).propertyAmenities.length > 0;

          if (!hasPropertyAmenities) {
            const candidatesRaw = [
              (prop as any)?._t_propertyMeta?._id,
              (prop as any)?._t_propertyMeta?.id,
              (prop as any)?._id,
              (prop as any)?.id,
            ];

            const candidates = candidatesRaw
              .map(normalizeId)
              .filter((v) => Boolean(v));

            const tried = new Set<string>();
            for (const candidateId of candidates) {
              if (tried.has(candidateId)) continue;
              tried.add(candidateId);

              const fetchedAmenities = await fetchPropertyAmenitiesById(candidateId);
              if (!fetchedAmenities) continue;

              // Salvar RAW do endpoint de amenities também (soft-fail)
              try {
                const externalId = String((prop as any)._id || (prop as any).id || '').trim() || null;
                const externalCode = String((prop as any).id || (prop as any).code || '').trim() || null;
                const storeAmenities = await storeStaysnetRawObject({
                  supabase,
                  organizationId,
                  domain: 'property-amenities',
                  externalId: String(candidateId).trim() || externalId,
                  externalCode,
                  endpoint: `/content/properties/${String(candidateId).trim()}/amenities`,
                  payload: fetchedAmenities.raw,
                  fetchedAtIso: new Date().toISOString(),
                });
                if (!storeAmenities.ok) {
                  console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (property-amenities): ${storeAmenities.error}`);
                }
              } catch (e) {
                console.warn(`⚠️ Falha inesperada ao salvar staysnet_raw_objects (property-amenities): ${e instanceof Error ? e.message : String(e)}`);
              }

              if (Array.isArray(fetchedAmenities.ids) && fetchedAmenities.ids.length > 0) {
                // Normalizar para o formato visto no listing detail (array de { _id })
                (prop as any).propertyAmenities = fetchedAmenities.ids.map((id) => ({ _id: id }));
                // Se o endpoint retornar títulos, guarda para mapear para IDs canônicos do UI
                if ((fetchedAmenities as any).titlesById && (fetchedAmenities as any).titlesById instanceof Map) {
                  (prop as any)._tmp_propertyAmenitiesTitlesById = (fetchedAmenities as any).titlesById;
                }
                break;
              }
            }
          }
        } catch (e) {
          console.warn(`⚠️ Falha inesperada ao buscar property amenities: ${e instanceof Error ? e.message : String(e)}`);
        }

        // ====================================================================
        // 2.1: VERIFICAR SE JÁ EXISTE (deduplicação via externalIds staysnet_*)
        // ====================================================================
        const staysnetListingId = prop._id;
        const staysnetPropertyId = prop._t_propertyMeta?._id || prop._t_propertyMeta?.id || null;
        const staysnetInternalName = typeof prop.internalName === 'string' ? prop.internalName.trim() : '';
        const staysnetListingCode = typeof prop.id === 'string' ? prop.id.trim() : '';

        // Dedupe deve ser robusto: em ambientes onde o anúncio já existe (criado manualmente
        // ou por versões antigas do import), `externalIds` pode estar ausente.
        // Nesses casos, tentamos casar por `internalId` (que é alimentado por internalName)
        // e por `codigo` quando aplicável.
        const dedupeCandidates: Array<{ label: string; needle: Record<string, any> }> = [
          { label: 'data.externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysnetListingId } } },
          ...(staysnetPropertyId && staysnetPropertyId !== staysnetListingId
            ? [{ label: 'data.externalIds.staysnet_property_id (meta)', needle: { externalIds: { staysnet_property_id: staysnetPropertyId } } }]
            : []),
          // legado: em alguns imports antigos, staysnet_property_id foi gravado com o listingId
          { label: 'data.externalIds.staysnet_property_id (legacy)', needle: { externalIds: { staysnet_property_id: staysnetListingId } } },
          // legado: alguns ambientes gravaram internalId como o próprio listingId
          { label: 'data.internalId (listingId)', needle: { internalId: staysnetListingId } },
          ...(staysnetInternalName
            ? [{ label: 'data.internalId (internalName)', needle: { internalId: staysnetInternalName } }]
            : []),
          ...(staysnetListingCode
            ? [
                // Alguns ambientes usam o código curto do listing como `codigo`
                { label: 'data.codigo (listingCode)', needle: { codigo: staysnetListingCode } },
                // E/ou como internalId
                { label: 'data.internalId (listingCode)', needle: { internalId: staysnetListingCode } },
              ]
            : []),
        ];

        let existing: any = null;
        let checkError: any = null;

        for (const candidate of dedupeCandidates) {
          const res = await supabase
            .from('anuncios_ultimate')
            .select('id, data')
            .eq('organization_id', organizationId)
            .contains('data', candidate.needle)
            .maybeSingle();

          if (res.error) {
            checkError = res.error;
            continue;
          }
          if (res.data) {
            existing = res.data;
            console.log(`   🔎 Dedup match: ${candidate.label}`);
            break;
          }
        }

        if (checkError) {
          console.error(`   ❌ Erro ao verificar duplicação:`, checkError.message);
        }

        let anuncioId: string;
        let isNewProperty = false;

        if (existing) {
          anuncioId = existing.id;
          console.log(`   ♻️ Property já existe: ${anuncioId} - Atualizando...`);
          updated++;
        } else {
          // ================================================================
          // 2.2: CRIAR NOVO ANÚNCIO (RPC com p_anuncio_id = null)
          // ================================================================
          console.log(`   ➕ Criando novo anúncio...`);
          
          // ⚠️ CRÍTICO: idempotency_key precisa ser ESTÁVEL.
          // Se usar timestamp, toda execução cria um anúncio novo quando o dedupe falha.
          const idempotencyKey = `staysnet-property-create-${prop._id}`;
          
          const { data: createResult, error: createError } = await supabase
            .rpc('save_anuncio_field', {
              p_anuncio_id: null, // null = cria novo
              p_field: 'title',
              p_value: prop._mstitle?.pt_BR || prop._mstitle?.en_US || prop.internalName || `Property ${prop._id}`,
              p_idempotency_key: idempotencyKey,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });

          if (createError) {
            throw new Error(`Falha ao criar anúncio: ${createError.message}`);
          }

          // ✅ FIX: RPC retorna {id: uuid, data: {...}, created: true}
          console.log(`🔍 [DEBUG] createResult completo:`, JSON.stringify(createResult));
          anuncioId = createResult?.id;
          console.log(`🔍 [DEBUG] anuncioId após assignment: ${anuncioId} (tipo: ${typeof anuncioId})`);
          isNewProperty = true;
          console.log(`   ✅ Anúncio criado: ${anuncioId}`);
        }

        // ====================================================================
        // 2.2.5: STATUS CANÔNICO (coluna) + debug fields no JSON
        // ====================================================================
        try {
          const staysStatus = (prop.status ?? '').toString().trim().toLowerCase();
          const staysActiveFlag = typeof prop.active === 'boolean' ? prop.active : null;
          const staysPublishedFlag = typeof prop.published === 'boolean' ? prop.published : null;

          let anuncioStatus: 'active' | 'draft' | 'inactive' = 'draft';

          if (staysStatus === 'active') {
            anuncioStatus = 'active';
          } else if (staysStatus === 'inactive') {
            anuncioStatus = 'inactive';
          } else if (staysStatus === 'hidden') {
            anuncioStatus = 'draft';
          } else {
            if (staysActiveFlag === false) {
              anuncioStatus = 'inactive';
            } else if (staysPublishedFlag === false) {
              anuncioStatus = 'draft';
            } else if (staysActiveFlag === true) {
              anuncioStatus = 'active';
            } else {
              anuncioStatus = 'draft';
            }
          }

          const isActive = anuncioStatus === 'active';

          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'status',
            p_value: staysStatus || null,
            p_idempotency_key: `status-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          if (staysActiveFlag !== null) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'staysnet_active',
              p_value: staysActiveFlag,
              p_idempotency_key: `staysnet_active-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }
          if (staysPublishedFlag !== null) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'staysnet_published',
              p_value: staysPublishedFlag,
              p_idempotency_key: `staysnet_published-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }

          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'ativo',
            p_value: String(isActive),
            p_idempotency_key: `ativo-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          const { data: statusRow, error: statusColumnError } = await supabase
            .from('anuncios_ultimate')
            .update({ status: anuncioStatus })
            .eq('id', anuncioId)
            .select('id,status,organization_id')
            .maybeSingle();

          if (statusColumnError) {
            console.error(`      ❌ Erro ao atualizar coluna status em anuncios_ultimate:`, statusColumnError.message);
          } else if (!statusRow) {
            console.error(`      ❌ Coluna status não foi atualizada (nenhuma linha retornada) anuncioId=${anuncioId}`);
          } else if (statusRow.status !== anuncioStatus) {
            console.error(`      ❌ Status divergente após update: esperado=${anuncioStatus} atual=${statusRow.status}`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] Status mapping/update crashed:`, e);
        }

        // ====================================================================
        // 2.3: SALVAR CAMPOS INDIVIDUAIS - MAPEAMENTO COMPLETO E CORRETO
        // ====================================================================
        
        console.log(`\n🔧 [SAVE CAMPOS] Iniciando salvamento de campos para anuncioId: ${anuncioId}`);
        
        // === IDENTIFICADORES ===
        // Campo: internalId (para busca rápida)
        console.log(`   🔧 [SAVE CAMPO #1] Salvando internalId...`);
        try {
          const { error: internalIdError } = await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'internalId',
            p_value: prop.internalName || prop.id || prop._id,
            p_idempotency_key: `internal-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          if (internalIdError) {
            console.error(`      ❌ [ERRO] internalId: ${internalIdError.message}`);
          } else {
            console.log(`      ✅ internalId salvo`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] internalId CRASHED:`, e);
          console.error(`      Stack:`, e.stack);
        }

        // Campo: title (UI "Identificação Interna")
        // O FormularioAnuncio usa `data.title` como rótulo/identificação interna.
        console.log(`   🔧 [SAVE CAMPO #1b] Salvando title...`);
        try {
          const titleValue = prop.internalName || prop._mstitle?.pt_BR || prop._mstitle?.en_US || prop.name || prop.id || prop._id;
          if (titleValue) {
            const { error: titleError } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'title',
              p_value: String(titleValue),
              p_idempotency_key: `title-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (titleError) {
              console.error(`      ❌ [ERRO] title: ${titleError.message}`);
            } else {
              console.log(`      ✅ title salvo`);
            }
          } else {
            console.log(`      ⏭️ title PULADO (sem dados)`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] title:`, e);
        }

        // Campo: externalIds (tracking e deduplicação)
        console.log(`   🔧 [SAVE CAMPO #2] Salvando externalIds...`);
        try {
          const externalIdsObj: Record<string, unknown> = {
            staysnet_listing_id: staysnetListingId,
            staysnet_synced_at: new Date().toISOString(),
          };

          // Código curto do listing (ex.: PY02H) quando existir
          if (prop.id && prop.id !== staysnetListingId) {
            externalIdsObj.staysnet_listing_code = prop.id;
          }

          // Se o meta vier, preferir como staysnet_property_id
          if (staysnetPropertyId) {
            externalIdsObj.staysnet_property_id = staysnetPropertyId;
          } else {
            // fallback para manter compatibilidade com dedupe/consumo legado
            externalIdsObj.staysnet_property_id = staysnetListingId;
          }

          console.log(`      📋 Valor: ${JSON.stringify(externalIdsObj)}`);
          
          const { error: externalIdsError } = await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'externalIds',
            p_value: externalIdsObj,
            p_idempotency_key: `externalIds-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          if (externalIdsError) {
            console.error(`      ❌ [ERRO CRÍTICO] externalIds: ${externalIdsError.message}`);
            throw new Error(`Falha ao salvar externalIds: ${externalIdsError.message}`);
          } else {
            console.log(`      ✅ externalIds salvo com sucesso`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] externalIds CRASHED:`, e);
          console.error(`      Stack:`, e.stack);
          throw e; // Re-throw pois é crítico
        }

        // === TIPO DO IMÓVEL (ESTRUTURA CORRETA!) ===
        // Campo: tipoPropriedade (Casa, Apartamento, etc.) - _t_propertyTypeMeta
        console.log(`   🔧 [SAVE CAMPO #3] Salvando tipoPropriedade...`);
        console.log(`      🔍 anuncioId antes de tipoPropriedade: ${anuncioId} (tipo: ${typeof anuncioId})`);
        try {
          if (prop._t_propertyTypeMeta?._mstitle?.pt_BR || prop._t_propertyTypeMeta?._mstitle?.en_US) {
            const {data: tipoResult, error: tipoError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'tipoPropriedade',
              p_value: prop._t_propertyTypeMeta._mstitle.pt_BR || prop._t_propertyTypeMeta._mstitle.en_US,
              p_idempotency_key: `tipoPropriedade-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (tipoError) {
              console.error(`      ❌ [ERRO] tipoPropriedade: ${tipoError.message}`);
            } else {
              console.log(`      ✅ tipoPropriedade salvo:`, tipoResult);
            }
          } else {
            console.log(`      ⚠️ tipoPropriedade não disponível`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] tipoPropriedade CRASHED:`, e);
          console.error(`      Stack:`, e.stack);
        }
        
        console.log(`   🔧 [SAVE CAMPO #4] Continuando para próximos campos...`);

        // Campo: tipoAcomodacao (UI: apartamento/chale/holiday_home/etc)
        // Preferir _t_typeMeta (ex.: "Holiday home") e mapear para o código esperado pelo select.
        const mappedTipoAcomodacao = mapTipoAcomodacaoFromStays(prop);
        console.log(`   🔧 [SAVE CAMPO #4a] tipoAcomodacao: mapped = ${mappedTipoAcomodacao}`);
        if (mappedTipoAcomodacao) {
          try {
            const {error: tipoAcomodacaoError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'tipoAcomodacao',
              p_value: mappedTipoAcomodacao,
              p_idempotency_key: `tipoAcomodacao-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (tipoAcomodacaoError) {
              console.error(`      ❌ [ERRO] tipoAcomodacao: ${tipoAcomodacaoError.message}`);
            } else {
              console.log(`      ✅ tipoAcomodacao salvo: ${mappedTipoAcomodacao}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] tipoAcomodacao:`, e);
          }
        } else {
          console.log(`      ⏭️ tipoAcomodacao PULADO (sem dados)`);
        }

        // Campo: tipoLocal (UI: apartamento_residencial/casa/hotel/etc)
        const mappedTipoLocal = mapTipoLocalFromStays(prop);
        console.log(`   🔧 [SAVE CAMPO #4b] tipoLocal: mapped = ${mappedTipoLocal}`);
        if (mappedTipoLocal) {
          try {
            const {error: tipoLocalError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'tipoLocal',
              p_value: mappedTipoLocal,
              p_idempotency_key: `tipoLocal-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (tipoLocalError) {
              console.error(`      ❌ [ERRO] tipoLocal: ${tipoLocalError.message}`);
            } else {
              console.log(`      ✅ tipoLocal salvo: ${mappedTipoLocal}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] tipoLocal:`, e);
          }
        } else {
          console.log(`      ⏭️ tipoLocal PULADO (sem dados)`);
        }

        // Campo: subtype (UI: entire_place/private_room/shared_room)
        const mappedSubtype = mapWizardSubtypeFromStays(prop);
        console.log(`   🔧 [SAVE CAMPO #4d] subtype (wizard): mapped = ${mappedSubtype}`);
        if (mappedSubtype) {
          try {
            const { error: subtypeError } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'subtype',
              p_value: mappedSubtype,
              p_idempotency_key: `subtype-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (subtypeError) {
              console.error(`      ❌ [ERRO] subtype: ${subtypeError.message}`);
            } else {
              console.log(`      ✅ subtype salvo: ${mappedSubtype}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] subtype:`, e);
          }
        } else {
          console.log(`      ⏭️ subtype PULADO (sem dados)`);
        }

        // Campo: modalidades (UI) - StaysNet normalmente é "temporada"
        console.log(`   🔧 [SAVE CAMPO #4e] modalidades (default)`);
        try {
          const { error: modalidadesError } = await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'modalidades',
            p_value: ['temporada'],
            p_idempotency_key: `modalidades-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          if (modalidadesError) {
            console.error(`      ❌ [ERRO] modalidades: ${modalidadesError.message}`);
          } else {
            console.log(`      ✅ modalidades salvo`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] modalidades:`, e);
        }

        // Campo: estrutura (UI) - default
        console.log(`   🔧 [SAVE CAMPO #4f] estrutura (default)`);
        try {
          const { error: estruturaError } = await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'estrutura',
            p_value: 'individual',
            p_idempotency_key: `estrutura-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          if (estruturaError) {
            console.error(`      ❌ [ERRO] estrutura: ${estruturaError.message}`);
          } else {
            console.log(`      ✅ estrutura salvo`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] estrutura:`, e);
        }

        // Campos numéricos (UI)
        // FormularioAnuncio carrega `bedrooms/bathrooms/beds/guests`.
        if (prop._i_rooms !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'bedrooms',
            p_value: Number(prop._i_rooms) || 0,
            p_idempotency_key: `bedrooms-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }
        if (prop._f_bathrooms !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'bathrooms',
            p_value: Number(prop._f_bathrooms) || 0,
            p_idempotency_key: `bathrooms-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }
        if (prop._i_beds !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'beds',
            p_value: Number(prop._i_beds) || 0,
            p_idempotency_key: `beds-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }
        const maxGuests = prop._i_maxGuests ?? prop.accommodates;
        if (maxGuests !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'guests',
            p_value: Number(maxGuests) || 0,
            p_idempotency_key: `guests-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // Campo: listingType (Entire Place, Private Room, etc.)
        console.log(`   🔧 [SAVE CAMPO #4c] listingType: prop.listingType = ${prop.listingType}`);
        if (prop.listingType) {
          try {
            const {error: listingTypeError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'listingType',
              p_value: prop.listingType,
              p_idempotency_key: `listingType-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (listingTypeError) {
              console.error(`      ❌ [ERRO] listingType: ${listingTypeError.message}`);
            } else {
              console.log(`      ✅ listingType salvo: ${prop.listingType}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] listingType:`, e);
          }
        } else {
          console.log(`      ⏭️ listingType PULADO (sem dados)`);
        }

        // === CAPACIDADE E ESTRUTURA (TODOS OS CAMPOS!) ===
        // Campo: quartos (_i_rooms) - com conversão para string
        console.log(`   🔧 [SAVE CAMPO #5] quartos: prop._i_rooms = ${prop._i_rooms}`);
        if (prop._i_rooms !== undefined) {
          try {
            const {error: quartosError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'quartos',
              p_value: String(prop._i_rooms),
              p_idempotency_key: `quartos-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (quartosError) {
              console.error(`      ❌ [ERRO] quartos: ${quartosError.message}`);
            } else {
              console.log(`      ✅ quartos salvo: ${prop._i_rooms}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] quartos:`, e);
          }
        } else {
          console.log(`      ⏭️ quartos PULADO (undefined)`);
        }

        // Campo: banheiros (_f_bathrooms) - com conversão para string
        console.log(`   🔧 [SAVE CAMPO #6] banheiros: prop._f_bathrooms = ${prop._f_bathrooms}`);
        if (prop._f_bathrooms !== undefined) {
          try {
            const {error: banheirosError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'banheiros',
              p_value: String(prop._f_bathrooms),
              p_idempotency_key: `banheiros-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (banheirosError) {
              console.error(`      ❌ [ERRO] banheiros: ${banheirosError.message}`);
            } else {
              console.log(`      ✅ banheiros salvo: ${prop._f_bathrooms}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] banheiros:`, e);
          }
        } else {
          console.log(`      ⏭️ banheiros PULADO (undefined)`);
        }

        // Campo: camas (_i_beds) - com conversão para string
        console.log(`   🔧 [SAVE CAMPO #7] camas: prop._i_beds = ${prop._i_beds}`);
        if (prop._i_beds !== undefined) {
          try {
            const {error: camasError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'camas',
              p_value: String(prop._i_beds),
              p_idempotency_key: `camas-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (camasError) {
              console.error(`      ❌ [ERRO] camas: ${camasError.message}`);
            } else {
              console.log(`      ✅ camas salvo: ${prop._i_beds}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] camas:`, e);
          }
        } else {
          console.log(`      ⏭️ camas PULADO (undefined)`);
        }

        // Campo: capacidade (_i_maxGuests) - com conversão para string
        const capacity = prop._i_maxGuests || prop.accommodates || 2;
        console.log(`   🔧 [SAVE CAMPO #8] capacidade: ${capacity} (maxGuests=${prop._i_maxGuests}, accommodates=${prop.accommodates})`);
        try {
          const {error: capacidadeError} = await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'capacidade',
            p_value: String(capacity),
            p_idempotency_key: `capacidade-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          if (capacidadeError) {
            console.error(`      ❌ [ERRO] capacidade: ${capacidadeError.message}`);
          } else {
            console.log(`      ✅ capacidade salvo: ${capacity}`);
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] capacidade:`, e);
        }

        // Campo: bedroomCounts (contagem detalhada de quartos) - NOVO!
        if (prop.bedroomCounts) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'bedroomCounts',
            p_value: prop.bedroomCounts,
            p_idempotency_key: `bedroomCounts-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // === ENDEREÇO ===
        if (prop.address) {
          const addressData = {
            street: prop.address.street || '',
            city: prop.address.city || '',
            state: prop.address.state || '',
            zip: prop.address.zip || '',
            country: prop.address.country || 'BR',
            full: prop.address.full || ''
          };
          
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'endereco',
            p_value: addressData,
            p_idempotency_key: `endereco-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          // Campos individuais para busca
          if (prop.address.city) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'cidade',
              p_value: prop.address.city,
              p_idempotency_key: `cidade-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }

          if (prop.address.stateCode || prop.address.state) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'estado',
              p_value: prop.address.stateCode || prop.address.state,
              p_idempotency_key: `estado-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }

          // ==================================================================
          // UI (FormularioAnuncio) - chaves do Step 02
          // ==================================================================
          try {
            const pais = (prop.address.countryCode === 'BR' || prop.address.country === 'BR' || !prop.address.countryCode)
              ? 'Brasil'
              : String(prop.address.countryCode || prop.address.country || '').trim();

            const siglaEstado = String(prop.address.stateCode || '').trim();
            const estadoNome = String(prop.address.state || '').trim();
            const cep = String(prop.address.zip || prop.address.zipCode || '').trim();
            const bairro = String(prop.address.region || prop.address.neighborhood || '').trim();
            const rua = String(prop.address.street || '').trim();
            const numero = String(prop.address.streetNumber || prop.address.number || '').trim();
            const complemento = String(prop.address.additional || prop.address.complement || '').trim();

            if (pais) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'pais',
                p_value: pais,
                p_idempotency_key: `pais-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            if (siglaEstado) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'sigla_estado',
                p_value: siglaEstado,
                p_idempotency_key: `sigla_estado-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            if (cep) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'cep',
                p_value: cep,
                p_idempotency_key: `cep-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            if (bairro) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'bairro',
                p_value: bairro,
                p_idempotency_key: `bairro-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            if (rua) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'rua',
                p_value: rua,
                p_idempotency_key: `rua-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            if (numero) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'numero',
                p_value: numero,
                p_idempotency_key: `numero-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            if (complemento) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'complemento',
                p_value: complemento,
                p_idempotency_key: `complemento-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }

            // address legado (objeto) no formato esperado pelo loader
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'address',
              p_value: {
                street: rua,
                number: numero,
                complement: complemento,
                neighborhood: bairro,
                city: String(prop.address.city || '').trim(),
                state: siglaEstado || estadoNome,
                zipCode: cep,
                country: pais || 'Brasil'
              },
              p_idempotency_key: `address-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] UI address mapping:`, e);
          }
        }

        // === LOCALIZAÇÃO ===
        if (prop.latLng?._f_lat !== undefined && prop.latLng?._f_lng !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'coordinates',
            p_value: {
              lat: prop.latLng._f_lat,
              lng: prop.latLng._f_lng
            },
            p_idempotency_key: `coordinates-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // === FOTOS ===
        // Campo: fotoPrincipal (_t_mainImageMeta.url)
        if (prop._t_mainImageMeta?.url) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'fotoPrincipal',
            p_value: prop._t_mainImageMeta.url,
            p_idempotency_key: `fotoPrincipal-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          // UI (Tour): coverPhoto
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'coverPhoto',
            p_value: prop._t_mainImageMeta.url,
            p_idempotency_key: `coverPhoto-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // UI (Tour): cover_photo_id (o loader do FormularioAnuncio usa isso)
        // Preferir `_idmainImage` quando disponível.
        if (prop._idmainImage) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'cover_photo_id',
            p_value: String(prop._idmainImage),
            p_idempotency_key: `cover_photo_id-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // Campo: fotos (_t_imagesMeta array)
        if (prop._t_imagesMeta && Array.isArray(prop._t_imagesMeta) && prop._t_imagesMeta.length > 0) {
          const photosData = prop._t_imagesMeta.map((photo: any, idx: number) => ({
            url: photo.url,
            caption: photo.caption || `Foto ${idx + 1}`,
            order: idx
          }));

          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'fotos',
            p_value: photosData,
            p_idempotency_key: `fotos-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          // UI Step 03: rooms[] + photos[] (anexar fotos aos cômodos)
          try {
            const uiRooms = buildUiRoomsFromImagesMeta(prop._t_imagesMeta);
            if (uiRooms.length > 0) {
              const roomsHash = (await sha256Hex(JSON.stringify(uiRooms))).slice(0, 12);
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'rooms',
                p_value: uiRooms,
                p_idempotency_key: `rooms-${prop._id}-${roomsHash}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });

              // UI Step 04: preferir cover_photo_id para resolver a capa dentro das rooms
              const coverId = String(
                (prop as any)?._idmainImage ||
                  prop._t_imagesMeta.find((p) => String(p?.area || '').toLowerCase() === 'main')?._id ||
                  prop._t_imagesMeta[0]?._id ||
                  ''
              ).trim();
              if (coverId) {
                await supabase.rpc('save_anuncio_field', {
                  p_anuncio_id: anuncioId,
                  p_field: 'cover_photo_id',
                  p_value: coverId,
                  p_idempotency_key: `cover_photo_id-${prop._id}-${coverId}`,
                  p_organization_id: organizationId,
                  p_user_id: DEFAULT_USER_ID
                });
              }
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] build/save rooms from imagesMeta:`, e);
          }
        }

        // === AMENIDADES E DESCRIÇÃO ===
        // Campo: comodidades (_t_amenitiesMeta array) - extrair _mstitle.pt_BR
        let listingAmenityNamesFromMeta: string[] = [];
        if (prop._t_amenitiesMeta && Array.isArray(prop._t_amenitiesMeta) && prop._t_amenitiesMeta.length > 0) {
          listingAmenityNamesFromMeta = prop._t_amenitiesMeta
            .map((amenity: any) => amenity?._mstitle?.pt_BR || amenity?._mstitle?.pt_PT || amenity?._mstitle?.en_US)
            .map((v: any) => (v === null || v === undefined ? '' : String(v).trim()))
            .filter((name: string) => Boolean(name));

          if (listingAmenityNamesFromMeta.length > 0) {
            const comodidadesHash = (await sha256Hex(JSON.stringify(listingAmenityNamesFromMeta))).slice(0, 12);
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'comodidades',
              p_value: listingAmenityNamesFromMeta,
              p_idempotency_key: `comodidades-${prop._id}-${comodidadesHash}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }
        }

        // Fallback (2025-12): alguns payloads não trazem `_t_amenitiesMeta`, mas trazem `amenities` (lista de ids).
        // Para não perder informação, persistimos os IDs em um campo separado.
        if ((!prop._t_amenitiesMeta || !Array.isArray(prop._t_amenitiesMeta) || prop._t_amenitiesMeta.length === 0) &&
            prop.amenities && Array.isArray(prop.amenities) && prop.amenities.length > 0) {
          const amenityIds = prop.amenities
            .map((a: any) => (a && typeof a === 'object' ? a._id : a))
            .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
            .filter((v) => Boolean(v));

          if (amenityIds.length > 0) {
            const comodidadesIdsHash = (await sha256Hex(JSON.stringify(amenityIds))).slice(0, 12);
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'comodidadesStaysnetIds',
              p_value: amenityIds,
              p_idempotency_key: `comodidadesStaysnetIds-${prop._id}-${comodidadesIdsHash}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }
        }

        // (2025-12) StaysNet traz dois conjuntos diferentes:
        // - amenities: amenidades da unidade/acomodação (listing)
        // - propertyAmenities: amenidades do local/propriedade (location)
        // Persistimos ambos separadamente + espelhamos nos campos do wizard e campos normalizados.
        const listingAmenityIds = (prop.amenities && Array.isArray(prop.amenities) ? prop.amenities : [])
          .map((a: any) => (a && typeof a === 'object' ? a._id : a))
          .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
          .filter((v) => Boolean(v));

        const locationAmenityIds = (prop.propertyAmenities && Array.isArray(prop.propertyAmenities) ? prop.propertyAmenities : [])
          .map((a: any) => (a && typeof a === 'object' ? a._id : a))
          .map((v) => (v === null || v === undefined ? '' : String(v).trim()))
          .filter((v) => Boolean(v));

        // Build best-effort title map for this listing (global + local enrichment)
        const amenityTitleById = new Map<string, string>(globalAmenityTitleById);
        const injectedTitlesById: Map<string, string> | undefined = (prop as any)?._tmp_propertyAmenitiesTitlesById;
        if (injectedTitlesById && injectedTitlesById instanceof Map) {
          for (const [k, v] of injectedTitlesById.entries()) {
            if (k && v) amenityTitleById.set(String(k), String(v));
          }
        }

        // Canonical IDs (checkbox) mapping
        const canonicalListingAmenityIds =
          (listingAmenityNamesFromMeta.length > 0
            ? mapAmenityNamesToCanonicalIds(listingAmenityNamesFromMeta, canonicalListingIndex, canonicalLocationIndex)
            : [])
          .filter(Boolean);
        const canonicalListingFromIds = canonicalListingAmenityIds.length > 0
          ? canonicalListingAmenityIds
          : mapStaysAmenityIdsToCanonicalIds(listingAmenityIds, amenityTitleById, canonicalListingIndex, canonicalLocationIndex);

        const canonicalLocationFromIds = mapStaysAmenityIdsToCanonicalIds(locationAmenityIds, amenityTitleById, canonicalLocationIndex, canonicalListingIndex);

        if (listingAmenityIds.length > 0) {
          const listingStaysHash = (await sha256Hex(JSON.stringify(listingAmenityIds))).slice(0, 12);
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'listingAmenitiesStaysnetIds',
            p_value: listingAmenityIds,
            p_idempotency_key: `listingAmenitiesStaysnetIds-${prop._id}-${listingStaysHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        if (locationAmenityIds.length > 0) {
          const locationStaysHash = (await sha256Hex(JSON.stringify(locationAmenityIds))).slice(0, 12);
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'locationAmenitiesStaysnetIds',
            p_value: locationAmenityIds,
            p_idempotency_key: `locationAmenitiesStaysnetIds-${prop._id}-${locationStaysHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // Persist canonical (UI) amenities + wizard fields the UI actually reads
        if (canonicalListingFromIds.length > 0) {
          const listingCanonicalHash = (await sha256Hex(JSON.stringify(canonicalListingFromIds))).slice(0, 12);
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'contentPropertyAmenities',
            p_value: { listingAmenities: canonicalListingFromIds },
            p_idempotency_key: `contentPropertyAmenities-${prop._id}-${listingCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'listingAmenities',
            p_value: canonicalListingFromIds,
            p_idempotency_key: `listingAmenities-${prop._id}-${listingCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'listing_amenities',
            p_value: { tickableAmenities: canonicalListingFromIds },
            p_idempotency_key: `listing_amenities-${prop._id}-${listingCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        if (canonicalLocationFromIds.length > 0) {
          const locationCanonicalHash = (await sha256Hex(JSON.stringify(canonicalLocationFromIds))).slice(0, 12);
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'contentLocationAmenities',
            p_value: { amenities: canonicalLocationFromIds },
            p_idempotency_key: `contentLocationAmenities-${prop._id}-${locationCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'locationAmenities',
            p_value: canonicalLocationFromIds,
            p_idempotency_key: `locationAmenities-${prop._id}-${locationCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'location_amenities',
            p_value: { tickableAmenities: canonicalLocationFromIds },
            p_idempotency_key: `location_amenities-${prop._id}-${locationCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        const combinedCanonicalAmenityIds = [...new Set([...canonicalLocationFromIds, ...canonicalListingFromIds])];
        if (combinedCanonicalAmenityIds.length > 0) {
          const combinedCanonicalHash = (await sha256Hex(JSON.stringify(combinedCanonicalAmenityIds))).slice(0, 12);
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'amenities',
            p_value: combinedCanonicalAmenityIds,
            p_idempotency_key: `amenities-${prop._id}-${combinedCanonicalHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // ====================================================================
        // STEP 07 (UI): CAMPOS DE DESCRIÇÃO (multilíngue)
        // O FormularioAnuncio.tsx lê: descricao_titulo, notas_gerais, sobre_espaco,
        // sobre_acesso, sobre_anfitriao, descricao_bairro, info_locomocao.
        // No StaysNet, os blocos disponíveis costumam ser: _mstitle, _mssummary,
        // _msdesc, _msnotes.
        // ====================================================================
        try {
          const wizardTitle = staysMultiLangToWizard(prop._mstitle, 50, { stripHtml: false })
            || { pt: clampText(String(prop.internalName || '').trim(), 50), en: '', es: '' };

          // Preferir campos “bem separados” quando existirem.
          const wizardAbout =
            staysMultiLangToWizard(prop._msspace, 5000, { stripHtml: true })
            || staysMultiLangToWizard(prop._msdesc, 5000, { stripHtml: true });
          const wizardAccess = staysMultiLangToWizard(prop._msaccess, 5000, { stripHtml: true });
          const wizardHostInteraction = staysMultiLangToWizard(prop._msinteraction, 5000, { stripHtml: true });
          const wizardNeighborhood = staysMultiLangToWizard(prop._msneighborhood_overview, 5000, { stripHtml: true });
          const wizardTransit = staysMultiLangToWizard(prop._mstransit, 5000, { stripHtml: true });
          const wizardNotes =
            staysMultiLangToWizard(prop._msnotes, 5000, { stripHtml: true })
            || staysMultiLangToWizard(prop._mssummary, 5000, { stripHtml: true });
          const wizardHouseRulesText = staysMultiLangToWizard(prop._mshouserules, 5000, { stripHtml: true });

          if (wizardTitle && (wizardTitle.pt || wizardTitle.en || wizardTitle.es)) {
            const h = (await sha256Hex(JSON.stringify(wizardTitle))).slice(0, 12);
            const { error: wizardTitleErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'descricao_titulo',
              p_value: wizardTitle,
              p_idempotency_key: `descricao_titulo-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardTitleErr) {
              console.error(`      ❌ Erro ao salvar descricao_titulo: ${wizardTitleErr.message}`);
            }
          }

          if (wizardAbout) {
            const h = (await sha256Hex(JSON.stringify(wizardAbout))).slice(0, 12);
            const { error: wizardAboutErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'sobre_espaco',
              p_value: wizardAbout,
              p_idempotency_key: `sobre_espaco-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardAboutErr) {
              console.error(`      ❌ Erro ao salvar sobre_espaco: ${wizardAboutErr.message}`);
            }
          }

          if (wizardNotes) {
            const h = (await sha256Hex(JSON.stringify(wizardNotes))).slice(0, 12);
            const { error: wizardNotesErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'notas_gerais',
              p_value: wizardNotes,
              p_idempotency_key: `notas_gerais-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardNotesErr) {
              console.error(`      ❌ Erro ao salvar notas_gerais: ${wizardNotesErr.message}`);
            }
          }

          if (wizardAccess) {
            const h = (await sha256Hex(JSON.stringify(wizardAccess))).slice(0, 12);
            const { error: wizardAccessErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'sobre_acesso',
              p_value: wizardAccess,
              p_idempotency_key: `sobre_acesso-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardAccessErr) {
              console.error(`      ❌ Erro ao salvar sobre_acesso: ${wizardAccessErr.message}`);
            }
          }

          if (wizardHostInteraction) {
            const h = (await sha256Hex(JSON.stringify(wizardHostInteraction))).slice(0, 12);
            const { error: wizardHostInteractionErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'sobre_anfitriao',
              p_value: wizardHostInteraction,
              p_idempotency_key: `sobre_anfitriao-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardHostInteractionErr) {
              console.error(`      ❌ Erro ao salvar sobre_anfitriao: ${wizardHostInteractionErr.message}`);
            }
          }

          if (wizardNeighborhood) {
            const h = (await sha256Hex(JSON.stringify(wizardNeighborhood))).slice(0, 12);
            const { error: wizardNeighborhoodErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'descricao_bairro',
              p_value: wizardNeighborhood,
              p_idempotency_key: `descricao_bairro-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardNeighborhoodErr) {
              console.error(`      ❌ Erro ao salvar descricao_bairro: ${wizardNeighborhoodErr.message}`);
            }
          }

          if (wizardTransit) {
            const h = (await sha256Hex(JSON.stringify(wizardTransit))).slice(0, 12);
            const { error: wizardTransitErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'info_locomocao',
              p_value: wizardTransit,
              p_idempotency_key: `info_locomocao-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardTransitErr) {
              console.error(`      ❌ Erro ao salvar info_locomocao: ${wizardTransitErr.message}`);
            }
          }

          if (wizardHouseRulesText) {
            const h = (await sha256Hex(JSON.stringify(wizardHouseRulesText))).slice(0, 12);
            const { error: wizardHouseRulesTextErr } = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'houseRulesText',
              p_value: wizardHouseRulesText,
              p_idempotency_key: `houseRulesText-${prop._id}-${h}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (wizardHouseRulesTextErr) {
              console.error(`      ❌ Erro ao salvar houseRulesText: ${wizardHouseRulesTextErr.message}`);
            }
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] Step 07 text fields mapping:`, e);
        }

        // ====================================================================
        // STEP 07 (UI): CAMPOS PERSONALIZADOS (match por NOME)
        // - UI salva por ID estável do campo (settings.customDescriptionFields[].id)
        // - StaysNet envia `customFields: [{ id: number, val: string }]`
        // - Resolvemos id->label via staysCustomFieldLabelById e casamos por label.
        // ====================================================================
        try {
          if (rendizyCustomFieldIdByLabelKey.size > 0) {
            const rawExisting = (existing as any)?.data?.custom_description_fields_values;
            const existingParsed = (() => {
              if (!rawExisting) return null;
              try {
                if (typeof rawExisting === 'string') return JSON.parse(rawExisting);
                if (typeof rawExisting === 'object') return rawExisting;
              } catch {
                return null;
              }
              return null;
            })();

            const mergedValues: Record<string, WizardMultiLangText> = {};
            if (existingParsed && typeof existingParsed === 'object') {
              for (const [k, v] of Object.entries(existingParsed)) {
                const vv = v as any;
                mergedValues[String(k)] = {
                  pt: String(vv?.pt || ''),
                  en: String(vv?.en || ''),
                  es: String(vv?.es || ''),
                };
              }
            }

            let details: any = null;
            let customFieldsArr: any[] | null = Array.isArray((prop as any)?.customFields) ? (prop as any).customFields : null;
            if (!customFieldsArr) {
              details = await fetchListingDetailsById(prop._id);
              customFieldsArr = Array.isArray(details?.customFields) ? details.customFields : null;
            }

            const meta: Record<string, { stays_custom_field_id: string; stays_label: string }> = {};

            if (Array.isArray(customFieldsArr) && customFieldsArr.length > 0) {
              for (const cf of customFieldsArr) {
                if (!cf || typeof cf !== 'object') continue;
                const staysFieldId = String((cf as any).id ?? (cf as any)._id ?? '').trim();
                const valRaw = (cf as any).val ?? (cf as any).value ?? '';
                const val = String(valRaw || '').trim();
                if (!staysFieldId || !val) continue;

                // Tentar resolver label (endpoint de definições)
                let staysLabel = staysCustomFieldLabelById.get(staysFieldId);
                
                // Fallback: se não conseguiu label, usa o próprio ID como label (útil para seed manual)
                if (!staysLabel) {
                  staysLabel = `Stays customField ${staysFieldId}`;
                }

                const rendizyId = rendizyCustomFieldIdByLabelKey.get(normalizeCustomFieldLabel(staysLabel));
                if (!rendizyId) continue;

                mergedValues[rendizyId] = { pt: val, en: val, es: val };
                meta[rendizyId] = { stays_custom_field_id: staysFieldId, stays_label: staysLabel };
              }
            }

            if (Object.keys(meta).length > 0) {
              const h = (await sha256Hex(JSON.stringify({ mergedValues, meta }))).slice(0, 12);

              const { error: customValsErr } = await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'custom_description_fields_values',
                p_value: mergedValues,
                p_idempotency_key: `custom_description_fields_values-${prop._id}-${h}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID,
              });
              if (customValsErr) {
                console.error(`      ❌ Erro ao salvar custom_description_fields_values: ${customValsErr.message}`);
              }

              const { error: customMetaErr } = await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'custom_description_fields_meta',
                p_value: meta,
                p_idempotency_key: `custom_description_fields_meta-${prop._id}-${h}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID,
              });
              if (customMetaErr) {
                console.error(`      ❌ Erro ao salvar custom_description_fields_meta: ${customMetaErr.message}`);
              }
            }
          }
        } catch (e) {
          console.error(`      ❌ [EXCEPTION] Custom description fields mapping:`, e);
        }

        // Campo: descricao (_msdesc.pt_BR) - limpar HTML
        if (prop._msdesc?.pt_BR || prop._msdesc?.en_US) {
          const descricaoHtml = prop._msdesc.pt_BR || prop._msdesc.en_US;
          // Limpar HTML: remover tags e manter só o texto
          const descricaoLimpa = descricaoHtml
            .replace(/<[^>]*>/g, ' ') // Remove tags HTML
            .replace(/\s+/g, ' ')     // Remove espaços múltiplos
            .trim();

          const descHash = (await sha256Hex(descricaoLimpa)).slice(0, 12);

          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'descricao',
            p_value: descricaoLimpa,
            p_idempotency_key: `descricao-${prop._id}-${descHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          // UI usa `description` (campo legado)
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'description',
            p_value: descricaoLimpa,
            p_idempotency_key: `description-${prop._id}-${descHash}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });

          // UI (Step 03): rooms[] com photos[] (formato do FormularioAnuncio.tsx)
          // Estratégia: agrupar fotos por `_msname` (ex.: "Varanda / Terraço", "Quarto", etc)
          // e criar um cômodo por grupo.
          try {
            const groups = new Map();
            for (const photo of prop._t_imagesMeta) {
              const url = String(photo?.url || '').trim();
              if (!url) continue;

              const pid = String(photo?._id || '').trim() || `photo-${Math.random().toString(36).slice(2)}`;
              const label = pickMsName(photo) || String(photo?.caption || '').trim() || 'Fotos';
              const key = String(label || 'Fotos').trim();

              const arr = groups.get(key) || [];
              arr.push({ id: pid, url, label: key });
              groups.set(key, arr);
            }

            const rooms: any[] = [];
            let roomIndex = 0;
            for (const [label, imgs] of groups.entries()) {
              const mapped = mapRoomTypeFromLabel(label);
              const roomId = `stays-room-${prop._id}-${roomIndex}`;
              roomIndex++;

              rooms.push({
                id: roomId,
                type: mapped.type,
                typeName: mapped.typeName,
                customName: mapped.customName,
                isShared: false,
                beds: {},
                photos: imgs.map((img) => ({
                  id: img.id,
                  url: img.url,
                  tags: mapPhotoTagsFromLabel(label),
                })),
              });
            }

            if (rooms.length > 0) {
              await supabase.rpc('save_anuncio_field', {
                p_anuncio_id: anuncioId,
                p_field: 'rooms',
                p_value: rooms,
                p_idempotency_key: `rooms-${prop._id}`,
                p_organization_id: organizationId,
                p_user_id: DEFAULT_USER_ID
              });
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] rooms mapping from _t_imagesMeta:`, e);
          }
        }

        // Campo: publicDescription (resumo curto) - preferir _mssummary quando existir
        const publicDescSource = prop._mssummary || prop._msdesc;
        if (publicDescSource) {
          const publicDesc: any = {};
          if (publicDescSource.pt_BR) {
            publicDesc.pt_BR = publicDescSource.pt_BR.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
          }
          if (publicDescSource.en_US) {
            publicDesc.en_US = publicDescSource.en_US.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
          }

          if (Object.keys(publicDesc).length > 0) {
            const publicDescHash = (await sha256Hex(JSON.stringify(publicDesc))).slice(0, 12);
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'publicDescription',
              p_value: publicDesc,
              p_idempotency_key: `publicDescription-${prop._id}-${publicDescHash}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }
        }

        // === STATUS ===
        // Importante: a UI de "Anúncios Ultimate" lê a COLUNA anuncios_ultimate.status.
        // A RPC save_anuncio_field salva apenas dentro de anuncios_ultimate.data (JSONB).
        // Se a coluna ficar como default (ex: 'created'), a UI cai no default => "Rascunho".
        const staysStatus = (prop.status || '').toString().toLowerCase();

        // Regras (Stays → Rendizy):
        // - status: active|hidden => ativo
        // - status: inactive => inativo
        // - se status vier vazio, usa flags booleanas (active/published) quando existirem
        // - fallback final: considera ativo (pois o item já passou no filtro anti-inativos)
        const hasStatus = staysStatus.length > 0;
        const statusSuggestsActive = staysStatus === 'active' || staysStatus === 'hidden';
        const statusSuggestsInactive = staysStatus === 'inactive';
        const booleanSuggestsInactive = prop.active === false || prop.published === false;
        const booleanSuggestsActive = prop.active === true && prop.published !== false;

        const isActive = statusSuggestsActive
          || (!hasStatus && booleanSuggestsActive)
          || (!hasStatus && !booleanSuggestsInactive);

        const anuncioStatus: 'active' | 'inactive' = (isActive && !statusSuggestsInactive) ? 'active' : 'inactive';

        // Campo: status (dentro do JSON - mantém valor vindo da Stays para debug)
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'status',
          p_value: staysStatus || 'inactive',
          p_idempotency_key: `status-${prop._id}`,
          p_organization_id: organizationId,
          p_user_id: DEFAULT_USER_ID
        });

        // Campo: ativo (boolean como string)
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'ativo',
          p_value: String(isActive),
          p_idempotency_key: `ativo-${prop._id}`,
          p_organization_id: organizationId,
          p_user_id: DEFAULT_USER_ID
        });

        // Status CANÔNICO (coluna) usado pela UI
        // Importante: não filtrar por organization_id aqui; se houver qualquer mismatch entre
        // org inferida no Edge Function e org aplicada pela RPC, o update viraria no-op silencioso.
        const { data: statusUpdatedRow, error: statusColumnError } = await supabase
          .from('anuncios_ultimate')
          .update({ status: anuncioStatus })
          .eq('id', anuncioId)
          .select('id,status,organization_id')
          .maybeSingle();

        if (statusColumnError) {
          console.error(`      ❌ Erro ao atualizar coluna status em anuncios_ultimate:`, statusColumnError.message);
        } else if (!statusUpdatedRow) {
          console.warn(`      ⚠️ Coluna status não atualizada (nenhuma linha retornada) para anuncioId=${anuncioId}`);
        }

        // ========================================================================
        // IMPORTAR DADOS FINANCEIROS (PREÇOS, CONFIGURAÇÕES, REGRAS)
        // ========================================================================
        console.log(`   💰 [FASE 2] Importando dados financeiros...`);
        try {
          // Usar listing ID direto do staysnet_raw (campo "id")
          // Exemplo: prop.id = "SY02H", "QS02H", etc
          const listingId = prop.id;
          
          if (listingId) {
            console.log(`      ✅ Listing ID: ${listingId}`);
            
            // Importar dados financeiros (preços, booking, regras)
            const result = await importPropertyPricing(
              listingId,
              anuncioId,
              staysHeaders,
              STAYS_API_URL,
              supabase,
              organizationId
            );
            
            if (result.success) {
              console.log(`      ✅ ${result.camposImportados} campos financeiros importados`);
            } else {
              console.log(`      ⚠️ Falha parcial na importação financeira`);
            }
          } else {
            console.log(`      ⏭️ Listing ID não disponível (campo prop.id vazio)`);
          }
        } catch (pricingErr: any) {
          console.error(`      ❌ Erro ao importar dados financeiros:`, pricingErr.message);
          // Não interrompe o fluxo - dados financeiros são opcionais
        }

        // === BACKUP COMPLETO (para debug) ===
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'staysnet_raw',
          p_value: prop,
          p_idempotency_key: `staysnet_raw-${prop._id}`,
          p_organization_id: organizationId,
          p_user_id: DEFAULT_USER_ID
        });

        console.log(`   ✅ Property ${isNewProperty ? 'criada' : 'atualizada'}: ${propertyName}`);
        saved++;

      } catch (err: any) {
        console.error(`   ❌ Erro ao salvar ${propertyName}:`, err.message);
        errors++;
        errorDetails.push({
          property: propertyName,
          error: err.message
        });
      }
    }

    // ========================================================================
    // STEP 3: RESULTADO FINAL
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESULTADO FINAL - IMPORT PROPERTIES');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Total fetched:  ${fetched}`);
    console.log(`   Created:        ${saved - updated}`);
    console.log(`   Updated:        ${updated}`);
    console.log(`   Errors:         ${errors}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errors > 0) {
      console.error('❌ ERROS DETALHADOS:');
      errorDetails.forEach((err, idx) => {
        console.error(`   ${idx + 1}. ${err.property}: ${err.error}`);
      });
    }

    const created = saved - updated;
    const message = `Importados ${saved}/${fetched} properties: ${created} criadas, ${updated} atualizadas`;

    // Modo batch: se atingiu o limite de páginas e a última página estava cheia,
    // assumimos que ainda há mais para buscar.
    const hasMoreBatched = isBatchMode && pagesFetched >= reqMaxPages && hasMore;
    const next = isBatchMode
      ? {
          skip: reqSkip + pagesFetched * limit,
          limit,
          hasMore: hasMoreBatched,
        }
      : undefined;

    // ✅ Compatibilidade:
    // - Scripts (ps1) esperam `stats`/`message` no topo
    // - Alguns consumidores antigos usam `{ success, data: { stats } }`
    return c.json({
      success: errors < fetched,
      method: 'import-properties',
      table: 'anuncios_ultimate',
      debug: {
        amenitiesTranslationCount: globalAmenityTitleById.size,
        amenitiesTranslationSources: translationFetch.sources,
        amenitiesTranslationSample: Array.from(globalAmenityTitleById.entries()).slice(0, 3),
      },
      stats: {
        fetched,
        saved,
        created,
        updated,
        errors,
      },
      message,
      errorDetails: errors > 0 ? errorDetails : undefined,
      next,
      data: {
        debug: {
          amenitiesTranslationCount: globalAmenityTitleById.size,
          amenitiesTranslationSources: translationFetch.sources,
        },
        stats: {
          total: fetched,
          created,
          updated,
          errors,
        },
        method: 'import-properties',
        table: 'anuncios_ultimate',
        errorDetails: errors > 0 ? errorDetails : undefined,
        message,
      },
    });

  } catch (error: any) {
    console.error('\n❌❌❌ ERRO GERAL NO IMPORT ❌❌❌');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    const created = saved - (updated || 0);
    return c.json(
      {
        success: false,
        method: 'import-properties',
        table: 'anuncios_ultimate',
        stats: {
          fetched,
          saved,
          created,
          updated: updated || 0,
          errors,
        },
        error: error.message,
        data: {
          stats: {
            total: fetched,
            created,
            updated: updated || 0,
            errors,
          },
          error: error.message,
        },
      },
      500,
    );
  }
}
