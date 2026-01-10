/**
 * ⚡ UTILS: AUTO-FETCH PROPERTY FROM STAYS — v1.0.111
 * 
 * Módulo para buscar e importar automaticamente uma property da Stays.net
 * quando o webhook recebe uma reserva para um imóvel não mapeado.
 * 
 * OBJETIVO: Eliminar "pontas soltas" — se a reserva vem com listing_id,
 * e esse imóvel não existe no Rendizy, baixamos automaticamente.
 * 
 * GOVERNANÇA:
 * - Usa RPC save_anuncio_field para persistência atômica
 * - Registra import_issue se falhar (nunca SKIP silencioso)
 * - Idempotente: não duplica imóveis já existentes
 */

import { getSupabaseClient } from './kv_store.tsx';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// TIPOS
// ============================================================================

export interface AutoFetchPropertyResult {
  success: boolean;
  propertyId: string | null;
  error?: string;
  mode: 'existing' | 'created' | 'failed';
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Tenta buscar e importar uma property da Stays.net pelo listing_id.
 * 
 * Fluxo:
 * 1. Verificar se já existe no Rendizy (dedup)
 * 2. Se não existe, buscar da API Stays.net
 * 3. Persistir com RPC save_anuncio_field
 * 4. Retornar o property_id
 * 
 * @param organizationId - ID da organização
 * @param listingId - ID do listing na Stays.net (ex: 66b3bb297a68bbdb17315938)
 */
export async function tryAutoFetchAndImportPropertyFromStays(
  organizationId: string,
  listingId: string,
): Promise<AutoFetchPropertyResult> {
  const supabase = getSupabaseClient();
  
  console.log(`   🔄 [AutoFetch] Tentando importar property ${listingId} da Stays.net...`);

  try {
    // ========================================================================
    // STEP 1: VERIFICAR SE JÁ EXISTE (dedup)
    // ========================================================================
    const existingId = await resolveExistingPropertyId(supabase, organizationId, listingId);
    if (existingId) {
      console.log(`   ✅ [AutoFetch] Property já existe: ${existingId}`);
      return { success: true, propertyId: existingId, mode: 'existing' };
    }

    // ========================================================================
    // STEP 2: CARREGAR CONFIG STAYS.NET
    // ========================================================================
    let config;
    try {
      config = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    } catch (e: any) {
      console.warn(`   ⚠️ [AutoFetch] Config não encontrada: ${e?.message}`);
      return { success: false, propertyId: null, error: 'StaysNet config not found', mode: 'failed' };
    }

    // ========================================================================
    // STEP 3: BUSCAR LISTING DA API STAYS.NET
    // ========================================================================
    const credentials = btoa(`${config.apiKey}:${config.apiSecret || ''}`);
    const staysHeaders = {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
    };

    const listingUrl = `${config.baseUrl}/content/listings/${encodeURIComponent(listingId)}`;
    console.log(`   📡 [AutoFetch] Fetching: ${listingUrl}`);

    const response = await fetch(listingUrl, { headers: staysHeaders });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(`   ⚠️ [AutoFetch] API retornou ${response.status}: ${errorText.substring(0, 200)}`);
      return { 
        success: false, 
        propertyId: null, 
        error: `Stays API: ${response.status}`, 
        mode: 'failed' 
      };
    }

    const listing = await response.json();
    if (!listing || typeof listing !== 'object') {
      console.warn(`   ⚠️ [AutoFetch] Resposta inválida da API`);
      return { success: false, propertyId: null, error: 'Invalid API response', mode: 'failed' };
    }

    // ========================================================================
    // STEP 4: PERSISTIR PROPERTY NO RENDIZY
    // ========================================================================
    const newPropertyId = await persistPropertyFromStaysListing(
      supabase,
      organizationId,
      listingId,
      listing,
    );

    if (!newPropertyId) {
      return { success: false, propertyId: null, error: 'Failed to persist property', mode: 'failed' };
    }

    console.log(`   ✅ [AutoFetch] Property criada com sucesso: ${newPropertyId}`);
    return { success: true, propertyId: newPropertyId, mode: 'created' };

  } catch (e: any) {
    console.error(`   ❌ [AutoFetch] Erro inesperado: ${e?.message || String(e)}`);
    return { success: false, propertyId: null, error: e?.message || String(e), mode: 'failed' };
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica se já existe uma property com esse listing_id.
 */
async function resolveExistingPropertyId(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  staysId: string,
): Promise<string | null> {
  const lookups = [
    { label: 'staysnet_property_id', needle: { externalIds: { staysnet_property_id: staysId } } },
    { label: 'staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysId } } },
    { label: 'staysnet_raw._id', needle: { staysnet_raw: { _id: staysId } } },
    { label: 'staysnet_raw.id', needle: { staysnet_raw: { id: staysId } } },
  ];

  for (const l of lookups) {
    const { data: row, error } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organizationId)
      .contains('data', l.needle)
      .maybeSingle();

    if (error) {
      console.warn(`   ⚠️ [AutoFetch] Erro ao buscar via ${l.label}: ${error.message}`);
      continue;
    }

    if (row?.id) return row.id;
  }

  return null;
}

/**
 * Persiste uma property a partir do listing da Stays.net.
 * Usa RPC save_anuncio_field para persistência atômica.
 */
async function persistPropertyFromStaysListing(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  listingId: string,
  listing: any,
): Promise<string | null> {
  try {
    // Extrair dados básicos do listing
    const title = extractTitle(listing) || `Property ${listingId}`;
    const listingCode = String(listing?.id || '').trim();
    
    // Idempotency key estável
    const idempotencyKey = `staysnet-autofetch-${listingId}`;

    // Criar property via RPC
    const { data: createResult, error: createError } = await supabase
      .rpc('save_anuncio_field', {
        p_anuncio_id: null,
        p_field: 'title',
        p_value: title,
        p_idempotency_key: idempotencyKey,
        p_organization_id: organizationId,
        p_user_id: DEFAULT_USER_ID,
      });

    if (createError) {
      console.error(`   ❌ [AutoFetch] Erro ao criar property: ${createError.message}`);
      return null;
    }

    const anuncioId = createResult?.id;
    if (!anuncioId) {
      console.error(`   ❌ [AutoFetch] RPC não retornou ID`);
      return null;
    }

    // Salvar externalIds (campo crítico para dedup)
    const externalIds = {
      staysnet_listing_id: listingId,
      staysnet_property_id: listingId,
      staysnet_listing_code: listingCode || null,
      staysnet_synced_at: new Date().toISOString(),
    };

    await supabase.rpc('save_anuncio_field', {
      p_anuncio_id: anuncioId,
      p_field: 'externalIds',
      p_value: externalIds,
      p_idempotency_key: `externalIds-${listingId}`,
      p_organization_id: organizationId,
      p_user_id: DEFAULT_USER_ID,
    });

    // Salvar staysnet_raw (para debug e reprocessamento futuro)
    await supabase.rpc('save_anuncio_field', {
      p_anuncio_id: anuncioId,
      p_field: 'staysnet_raw',
      p_value: listing,
      p_idempotency_key: `staysnet_raw-${listingId}`,
      p_organization_id: organizationId,
      p_user_id: DEFAULT_USER_ID,
    });

    // Salvar campos básicos adicionais
    const basicFields: Array<{ field: string; value: any }> = [];

    // Endereço
    const address = listing?._t_addressMeta || listing?.address;
    if (address) {
      if (address.street) basicFields.push({ field: 'rua', value: address.street });
      if (address.number) basicFields.push({ field: 'numero', value: address.number });
      if (address.neighborhood) basicFields.push({ field: 'bairro', value: address.neighborhood });
      if (address.city) basicFields.push({ field: 'cidade', value: address.city });
      if (address.state) basicFields.push({ field: 'estado', value: address.state });
      if (address.zipCode || address.postalCode) basicFields.push({ field: 'cep', value: address.zipCode || address.postalCode });
      if (address.country) basicFields.push({ field: 'pais', value: address.country });
    }

    // Capacidade
    if (listing?.maxGuests) basicFields.push({ field: 'guests', value: Number(listing.maxGuests) });
    if (listing?.bedrooms) basicFields.push({ field: 'bedrooms', value: Number(listing.bedrooms) });
    if (listing?.beds) basicFields.push({ field: 'beds', value: Number(listing.beds) });
    if (listing?.bathrooms) basicFields.push({ field: 'bathrooms', value: Number(listing.bathrooms) });

    // Salvar campos básicos em paralelo
    for (const { field, value } of basicFields) {
      try {
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: field,
          p_value: value,
          p_idempotency_key: `${field}-${listingId}`,
          p_organization_id: organizationId,
          p_user_id: DEFAULT_USER_ID,
        });
      } catch {
        // Campos adicionais são best-effort, não quebram o fluxo
      }
    }

    return anuncioId;

  } catch (e: any) {
    console.error(`   ❌ [AutoFetch] Erro ao persistir: ${e?.message || String(e)}`);
    return null;
  }
}

/**
 * Extrai título do listing da Stays.net.
 */
function extractTitle(listing: any): string | null {
  const mstitle = listing?._mstitle;
  if (mstitle) {
    const title = mstitle?.pt_BR || mstitle?.pt_PT || mstitle?.en_US || mstitle?.es_ES;
    if (title) return String(title).trim();
  }

  const internalName = listing?.internalName;
  if (internalName) return String(internalName).trim();

  const title = listing?.title;
  if (typeof title === 'string') return title.trim();
  if (typeof title === 'object') {
    const t = title?.pt_BR || title?.pt_PT || title?.en_US || title?.es_ES;
    if (t) return String(t).trim();
  }

  return null;
}
