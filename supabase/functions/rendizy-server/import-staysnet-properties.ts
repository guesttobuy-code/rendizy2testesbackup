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

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// TIPOS - Estrutura COMPLETA da API StaysNet /content/listings
// ============================================================================
interface StaysNetProperty {
  _id: string;
  id?: string;

  name?: string;
  internalName?: string;

  status?: string;
  active?: boolean;
  published?: boolean;

  _mstitle?: Record<string, string>;
  _t_propertyMeta?: { _id?: string; id?: string };
  _t_propertyTypeMeta?: { _mstitle?: Record<string, string> };

  subtype?: string;
  category?: string;
  listingType?: string;

  _i_rooms?: number;
  _f_bathrooms?: number;
  _i_beds?: number;
  _i_maxGuests?: number;
  accommodates?: number;

  bedroomCounts?: any;
  address?: any;
  coordinates?: any;
  photos?: any[];
  picture?: any;

  amenities?: string[];
  description?: string;
  publicDescription?: any;
  cleaningFee?: number;
  importingBlockedStatus?: string;
  timezone?: string;

  [key: string]: any;
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// ============================================================================
export async function importStaysNetProperties(c: Context) {
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
    const selectedPropertyIds: string[] = Array.isArray(body.selectedPropertyIds) 
      ? body.selectedPropertyIds 
      : [];
    
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

    // ✅ Preferir organization_id real do usuário; fallback mantém compatibilidade
    // com chamadas técnicas/sem sessão.
    let organizationId = DEFAULT_ORG_ID;
    try {
      organizationId = await getOrganizationIdOrThrow(c);
    } catch {
      // sem token/sessão → mantém DEFAULT_ORG_ID
    }

    console.log('🔧 [CONFIG] Organization ID:', organizationId);

    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId);

    console.log('✅ [CONFIG] Configuração carregada com sucesso:');
    console.log('  - Base URL:', config.baseUrl);
    console.log('  - API Key:', config.apiKey?.substring(0, 4) + '****');
    console.log('  - API Secret:', config.apiSecret ? 'presente' : 'ausente');

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

    // Buscar properties com paginação manual
    let allProperties: StaysNetProperty[] = [];
    let skip = reqSkip;
    const limit = reqLimit;
    let hasMore = true;
    let pagesFetched = 0;
    
    // Criar Basic Auth
    const credentials = btoa(`${config.apiKey}:${config.apiSecret || ''}`);
    
    while (hasMore) {
      console.log(`📡 [FETCH] Buscando página: skip=${skip}, limit=${limit}`);
      
      const url = `${config.baseUrl}/content/listings?skip=${skip}&limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [ERROR] API Response: ${errorText.substring(0, 500)}`);
        throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      const pageProperties: StaysNetProperty[] = await response.json();
      
      if (!Array.isArray(pageProperties)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageProperties}`);
      }
      
      allProperties.push(...pageProperties);
      hasMore = pageProperties.length === limit;
      skip += limit;
      pagesFetched++;

      if (isBatchMode && pagesFetched >= reqMaxPages) {
        break;
      }
      
      console.log(`📥 [FETCH] ${pageProperties.length} properties nesta página. Total: ${allProperties.length}`);
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
    let properties: StaysNetProperty[] = allProperties.filter((p: any) => {
      const status = typeof p?.status === 'string' ? p.status.toLowerCase().trim() : null;
      if (status === 'inactive') return false;
      if (typeof p?.active === 'boolean' && p.active === false) return false;
      return true;
    });

    console.log(`✅ [FETCH] ${properties.length} properties elegíveis após filtro (anti-inativos)`);

    // ========================================================================
    // STEP 3: FILTRAR APENAS AS PROPERTIES SELECIONADAS
    // ========================================================================
    if (selectedPropertyIds.length > 0) {
      const before = properties.length;
      const propertiesBeforeFilter = [...properties]; // 🔍 Salvar cópia ANTES do filtro
      
      // 🔍 DEBUG: Logar formato dos IDs ANTES do filtro
      console.error(`🔍 [DEBUG FILTER] Antes do filtro: ${before} properties`);
      console.error(`🔍 [DEBUG FILTER] Sample API IDs:`, propertiesBeforeFilter.slice(0, 3).map(p => p._id));
      console.error(`🔍 [DEBUG FILTER] Sample selected IDs:`, selectedPropertyIds.slice(0, 3));
      console.error(`🔍 [DEBUG FILTER] Tipo ID API: ${typeof propertiesBeforeFilter[0]?._id}`);
      console.error(`🔍 [DEBUG FILTER] Tipo ID selected: ${typeof selectedPropertyIds[0]}`);
      
      properties = properties.filter(p => selectedPropertyIds.includes(p._id));
      console.error(`🔍 [DEBUG FILTER] Depois do filtro: ${properties.length}/${before} properties`);
      
      if (properties.length === 0 && before > 0) {
        console.error(`❌ [FILTER ERROR] TODAS as properties foram filtradas!`);
        console.error(`   Isso significa que os IDs não batem.`);
        
        // Retornar erro claro
        return new Response(JSON.stringify({
          success: false,
          error: 'ID_MISMATCH',
          message: 'Os IDs selecionados não foram encontrados na API StaysNet',
          details: {
            selectedCount: selectedPropertyIds.length,
            apiCount: before,
            sampleSelectedIds: selectedPropertyIds.slice(0, 3),
            sampleApiIds: propertiesBeforeFilter.slice(0, 3).map((p: any) => p._id)
          }
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
    const supabase = getSupabaseClient();

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
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
            payload: prop,
            fetchedAtIso: new Date().toISOString(),
          });
          if (!store.ok) {
            console.warn(`⚠️ Falha ao salvar staysnet_raw_objects (listings): ${store.error}`);
          }
        } catch (e) {
          console.warn(`⚠️ Falha inesperada ao salvar staysnet_raw_objects (listings): ${e instanceof Error ? e.message : String(e)}`);
        }

        // ====================================================================
        // 2.1: VERIFICAR SE JÁ EXISTE (deduplicação via externalIds staysnet_*)
        // ====================================================================
        const staysnetListingId = prop._id;
        const staysnetPropertyId = prop._t_propertyMeta?._id || prop._t_propertyMeta?.id || null;

        const dedupeCandidates: Array<{ label: string; needle: Record<string, any> }> = [
          { label: 'data.externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysnetListingId } } },
          ...(staysnetPropertyId && staysnetPropertyId !== staysnetListingId
            ? [{ label: 'data.externalIds.staysnet_property_id (meta)', needle: { externalIds: { staysnet_property_id: staysnetPropertyId } } }]
            : []),
          // legado: em alguns imports antigos, staysnet_property_id foi gravado com o listingId
          { label: 'data.externalIds.staysnet_property_id (legacy)', needle: { externalIds: { staysnet_property_id: staysnetListingId } } },
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
            p_value: prop.internalName || prop._id,
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

        // Campo: tipoAcomodacao (entire_home, private_room, etc.) - subtype
        console.log(`   🔧 [SAVE CAMPO #4a] tipoAcomodacao: prop.subtype = ${prop.subtype}`);
        if (prop.subtype) {
          try {
            const {error: tipoAcomodacaoError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'tipoAcomodacao',
              p_value: prop.subtype,
              p_idempotency_key: `tipoAcomodacao-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (tipoAcomodacaoError) {
              console.error(`      ❌ [ERRO] tipoAcomodacao: ${tipoAcomodacaoError.message}`);
            } else {
              console.log(`      ✅ tipoAcomodacao salvo: ${prop.subtype}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] tipoAcomodacao:`, e);
          }
        } else {
          console.log(`      ⏭️ tipoAcomodacao PULADO (sem dados)`);
        }

        // Campo: tipoLocal (fallback categoria)
        console.log(`   🔧 [SAVE CAMPO #4b] tipoLocal: prop.category = ${prop.category}`);
        if (prop.category) {
          try {
            const {error: tipoLocalError} = await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'tipoLocal',
              p_value: prop.category,
              p_idempotency_key: `tipoLocal-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
            if (tipoLocalError) {
              console.error(`      ❌ [ERRO] tipoLocal: ${tipoLocalError.message}`);
            } else {
              console.log(`      ✅ tipoLocal salvo: ${prop.category}`);
            }
          } catch (e) {
            console.error(`      ❌ [EXCEPTION] tipoLocal:`, e);
          }
        } else {
          console.log(`      ⏭️ tipoLocal PULADO (sem dados)`);
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
        }

        // === AMENIDADES E DESCRIÇÃO ===
        // Campo: comodidades (_t_amenitiesMeta array) - extrair _mstitle.pt_BR
        if (prop._t_amenitiesMeta && Array.isArray(prop._t_amenitiesMeta) && prop._t_amenitiesMeta.length > 0) {
          const amenitiesNames = prop._t_amenitiesMeta
            .map((amenity: any) => amenity._mstitle?.pt_BR || amenity._mstitle?.en_US)
            .filter((name: string) => name); // Remove nulls
          
          if (amenitiesNames.length > 0) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'comodidades',
              p_value: amenitiesNames,
              p_idempotency_key: `comodidades-${prop._id}`,
              p_organization_id: organizationId,
              p_user_id: DEFAULT_USER_ID
            });
          }
        }

        // Campo: descricao (_msdesc.pt_BR) - limpar HTML
        if (prop._msdesc?.pt_BR || prop._msdesc?.en_US) {
          const descricaoHtml = prop._msdesc.pt_BR || prop._msdesc.en_US;
          // Limpar HTML: remover tags e manter só o texto
          const descricaoLimpa = descricaoHtml
            .replace(/<[^>]*>/g, ' ') // Remove tags HTML
            .replace(/\s+/g, ' ')     // Remove espaços múltiplos
            .trim();
          
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'descricao',
            p_value: descricaoLimpa,
            p_idempotency_key: `descricao-${prop._id}`,
            p_organization_id: organizationId,
            p_user_id: DEFAULT_USER_ID
          });
        }

        // Campo: publicDescription (_msdesc multilíngue) - versões limpas
        if (prop._msdesc) {
          const publicDesc: any = {};
          if (prop._msdesc.pt_BR) {
            publicDesc.pt_BR = prop._msdesc.pt_BR.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
          }
          if (prop._msdesc.en_US) {
            publicDesc.en_US = prop._msdesc.en_US.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
          }
          
          if (Object.keys(publicDesc).length > 0) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'publicDescription',
              p_value: publicDesc,
              p_idempotency_key: `publicDescription-${prop._id}`,
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
              supabase
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
