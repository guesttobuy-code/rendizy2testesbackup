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
import { loadStaysNetConfigDB } from './staysnet-db.ts';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

// ============================================================================
// TIPOS - Estrutura COMPLETA da API StaysNet /content/listings
// ============================================================================
interface StaysNetProperty {
  // === IDENTIFICADORES ===
  _id: string;                    // ID único do imóvel (ex: "PY02H")
  internalName: string;           // Nome interno
  name?: string;                  // Nome público
  listingCode?: string;           // Código do listing
  
  // === TIPO DO IMÓVEL ===
  propertyType?: string;          // Tipo de propriedade (Building, House, etc.) → tipoPropriedade
  unitType?: string;              // Tipo de unidade (Duplo, Triplo, etc.) → tipoAcomodacao
  category?: string;              // Categoria geral
  accommodationType?: string;     // Tipo de acomodação
  listingType?: string;           // Tipo de listing (Entire Place, Private Room, etc.)
  
  // === CAPACIDADE E ESTRUTURA ===
  bedrooms?: number;              // Número de quartos → quartos
  bedroomCounts?: {               // Contagem detalhada de quartos
    double?: number;              // Quartos duplos
    single?: number;              // Quartos individuais
    [key: string]: any;
  };
  bathrooms?: number;             // Número de banheiros → banheiros
  accommodates?: number;          // Capacidade de hóspedes → capacidade
  _i_maxGuests?: number;          // Capacidade máxima alternativa
  beds?: number;                  // Número de camas → camas
  
  // === ENDEREÇO ===
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    full?: string;                // Endereço completo
  };
  
  // === LOCALIZAÇÃO ===
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  
  // === FOTOS ===
  photos?: Array<{
    url: string;
    caption?: string;
    order?: number;
  }>;
  picture?: {                     // Foto principal alternativa
    thumbnail?: string;
    large?: string;
  };
  
  // === AMENIDADES E DESCRIÇÃO ===
  amenities?: string[];           // Comodidades
  description?: string;           // Descrição
  publicDescription?: {           // Descrição pública estruturada
    summary?: string;
    space?: string;
    access?: string;
    notes?: string;
  };
  
  // === STATUS ===
  active?: boolean;               // Ativo/Inativo
  published?: boolean;            // Publicado
  
  // === OUTROS CAMPOS ÚTEIS ===
  importingBlockedStatus?: string;
  timezone?: string;
  cleaningFee?: number;
  
  // Outros campos que podem vir...
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
    // STEP 1: BUSCAR CONFIGURAÇÃO DO BANCO DE DADOS
    // ========================================================================
    console.log('🔧 [CONFIG] Carregando configuração da StaysNet do banco...');
    console.log('🔧 [CONFIG] Organization ID:', DEFAULT_ORG_ID);
    
    const configResult = await loadStaysNetConfigDB(DEFAULT_ORG_ID);
    
    console.log('🔧 [CONFIG] Resultado da busca:', JSON.stringify(configResult, null, 2));
    
    if (!configResult.success || !configResult.data) {
      console.error('❌ [CONFIG] Configuração não encontrada ou erro ao carregar');
      console.error('❌ [CONFIG] Result:', configResult);
      throw new Error('Configuração da StaysNet não encontrada no banco de dados. Configure primeiro em /settings');
    }

    const config = configResult.data;
    
    if (!config.enabled) {
      console.error('❌ [CONFIG] Integração desabilitada');
      throw new Error('Integração StaysNet está desabilitada. Habilite em /settings');
    }

    console.log('✅ [CONFIG] Configuração carregada com sucesso:');
    console.log('  - Base URL:', config.baseUrl);
    console.log('  - API Key:', config.apiKey?.substring(0, 4) + '****');
    console.log('  - API Secret:', config.apiSecret ? 'presente' : 'ausente');
    console.log('  - Account Name:', config.accountName || 'N/A');
    console.log('  - Enabled:', config.enabled);

    // ========================================================================
    // STEP 2: BUSCAR PROPERTIES DA API STAYSNET
    // ========================================================================
    console.log('📡 [FETCH] Buscando properties de /content/listings...');
    
    // Criar Basic Auth: base64(apiKey:apiSecret)
    const credentials = btoa(`${config.apiKey}:${config.apiSecret || ''}`);
    console.log('🔐 [AUTH] Using Basic Authentication');
    console.log('  - Credentials format: apiKey:apiSecret (base64 encoded)');
    
    const response = await fetch(`${config.baseUrl}/content/listings`, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      }
    });

    console.log(`📊 [RESPONSE] Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [ERROR] API Response: ${errorText.substring(0, 500)}`);
      throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    let properties: StaysNetProperty[] = await response.json();
    
    if (!Array.isArray(properties)) {
      throw new Error(`Resposta da API não é um array. Tipo: ${typeof properties}`);
    }

    console.log(`✅ [FETCH] ${properties.length} properties disponíveis na API`);

    // ========================================================================
    // STEP 3: FILTRAR APENAS AS PROPERTIES SELECIONADAS
    // ========================================================================
    if (selectedPropertyIds.length > 0) {
      const before = properties.length;
      properties = properties.filter(p => selectedPropertyIds.includes(p._id));
      console.log(`🔍 [FILTER] Filtrado: ${properties.length}/${before} properties selecionadas`);
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
    let updated = 0;

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      const propertyName = prop.internalName || prop.name || prop._id;

      console.log(`\n[${i + 1}/${fetched}] 🏠 Processando: ${propertyName}`);

      try {
        // ====================================================================
        // 2.1: VERIFICAR SE JÁ EXISTE (deduplicação via staysnet_property_id)
        // ====================================================================
        const { data: existing, error: checkError } = await supabase
          .from('anuncios_ultimate')
          .select('id, data')
          .eq('organization_id', DEFAULT_ORG_ID)
          .contains('data', { externalIds: { staysnet_property_id: prop._id } })
          .maybeSingle();

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
          
          const idempotencyKey = `staysnet-property-${prop._id}-${Date.now()}`;
          
          const { data: createResult, error: createError } = await supabase
            .rpc('save_anuncio_field', {
              p_anuncio_id: null, // null = cria novo
              p_field: 'title',
              p_value: prop.name || prop.internalName || `Property ${prop._id}`,
              p_idempotency_key: idempotencyKey,
              p_organization_id: DEFAULT_ORG_ID,
              p_user_id: DEFAULT_USER_ID
            });

          if (createError) {
            throw new Error(`Falha ao criar anúncio: ${createError.message}`);
          }

          anuncioId = createResult;
          isNewProperty = true;
          console.log(`   ✅ Anúncio criado: ${anuncioId}`);
        }

        // ====================================================================
        // 2.3: SALVAR CAMPOS INDIVIDUAIS - MAPEAMENTO COMPLETO E CORRETO
        // ====================================================================
        
        // === IDENTIFICADORES ===
        // Campo: internalId (para busca rápida)
        const { error: internalIdError } = await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'internalId',
          p_value: prop.internalName || prop._id,
          p_idempotency_key: `internal-${prop._id}`,
          p_organization_id: DEFAULT_ORG_ID,
          p_user_id: DEFAULT_USER_ID
        });
        if (internalIdError) {
          console.error(`❌ [ERRO] internalId: ${internalIdError.message}`);
        }

        // Campo: externalIds (tracking e deduplicação) - Objeto direto (Supabase serializa automaticamente)
        const externalIdsValue = JSON.stringify({
          staysnet_property_id: prop._id,
          staysnet_synced_at: new Date().toISOString()
        });
        console.log(`   📋 Salvando externalIds: ${externalIdsValue}`);
        
        const { error: externalIdsError } = await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'externalIds',
          p_value: externalIdsValue,
          p_idempotency_key: `externalIds-${prop._id}`,
          p_organization_id: DEFAULT_ORG_ID,
          p_user_id: DEFAULT_USER_ID
        });
        if (externalIdsError) {
          console.error(`❌ [ERRO CRÍTICO] externalIds: ${externalIdsError.message}`);
          throw new Error(`Falha ao salvar externalIds: ${externalIdsError.message}`);
        } else {
          console.log(`   ✅ externalIds salvo com sucesso`);
        }

        // === TIPO DO IMÓVEL (ESTRUTURA CORRETA!) ===
        // Campo: tipoPropriedade (Building, House, etc.) - propertyType
        if (prop.propertyType) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'tipoPropriedade',
            p_value: prop.propertyType
          });
        }

        // Campo: tipoAcomodacao (Duplo, Triplo, etc.) - unitType
        if (prop.unitType) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'tipoAcomodacao',
            p_value: prop.unitType
          });
        }

        // Campo: tipoLocal (fallback categoria)
        if (prop.category) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'tipoLocal',
            p_value: prop.category
          });
        }

        // Campo: listingType (Entire Place, Private Room, etc.)
        if (prop.listingType) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'listingType',
            p_value: prop.listingType
          });
        }

        // === CAPACIDADE E ESTRUTURA (TODOS OS CAMPOS!) ===
        // Campo: quartos (bedrooms) - CORRIGIDO!
        if (prop.bedrooms !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'quartos',
            p_value: prop.bedrooms
          });
        }

        // Campo: banheiros (bathrooms) - CORRIGIDO!
        if (prop.bathrooms !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'banheiros',
            p_value: prop.bathrooms
          });
        }

        // Campo: camas (beds) - NOVO CAMPO!
        if (prop.beds !== undefined) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'camas',
            p_value: prop.beds
          });
        }

        // Campo: capacidade (accommodates/maxGuests)
        const capacity = prop.accommodates || prop._i_maxGuests || 2;
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'capacidade',
          p_value: capacity
        });

        // Campo: bedroomCounts (contagem detalhada de quartos) - NOVO!
        if (prop.bedroomCounts) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'bedroomCounts',
            p_value: JSON.stringify(prop.bedroomCounts)
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
            p_value: JSON.stringify(addressData)
          });

          // Campos individuais para busca
          if (prop.address.city) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'cidade',
              p_value: prop.address.city
            });
          }

          if (prop.address.state) {
            await supabase.rpc('save_anuncio_field', {
              p_anuncio_id: anuncioId,
              p_field: 'estado',
              p_value: prop.address.state
            });
          }
        }

        // === LOCALIZAÇÃO ===
        if (prop.coordinates) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'coordinates',
            p_value: JSON.stringify({
              latitude: prop.coordinates.latitude,
              longitude: prop.coordinates.longitude
            })
          });
        }

        // === FOTOS ===
        if (prop.photos && Array.isArray(prop.photos) && prop.photos.length > 0) {
          const photosData = prop.photos.map((photo, idx) => ({
            url: photo.url,
            caption: photo.caption || `Foto ${idx + 1}`,
            order: photo.order || idx
          }));

          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'fotos',
            p_value: JSON.stringify(photosData)
          });
        } else if (prop.picture) {
          // Fallback: foto principal
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'fotos',
            p_value: JSON.stringify([{
              url: prop.picture.large || prop.picture.thumbnail,
              caption: 'Foto principal',
              order: 0
            }])
          });
        }

        // === AMENIDADES E DESCRIÇÃO ===
        if (prop.amenities && Array.isArray(prop.amenities) && prop.amenities.length > 0) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'comodidades',
            p_value: JSON.stringify(prop.amenities)
          });
        }

        // Campo: description (descrição completa)
        if (prop.description) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'descricao',
            p_value: prop.description
          });
        }

        // Campo: publicDescription (descrição pública estruturada) - NOVO!
        if (prop.publicDescription) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'publicDescription',
            p_value: typeof prop.publicDescription === 'object' 
              ? JSON.stringify(prop.publicDescription)
              : prop.publicDescription
          });
        }

        // === STATUS ===
        const isActive = prop.active !== false && prop.published !== false;
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'status',
          p_value: isActive ? 'active' : 'inactive'
        });

        // === BACKUP COMPLETO (para debug) ===
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'staysnet_raw',
          p_value: prop
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

    // ✅ CONTRATO PADRONIZADO: Sempre retornar { success, data: { stats, ... } }
    return c.json({
      success: errors < fetched, // success = true se pelo menos 1 salvou
      data: {
        stats: { 
          total: fetched,
          created: saved - updated,
          updated: updated, 
          errors: errors 
        },
        method: 'import-properties',
        table: 'anuncios_ultimate',
        errorDetails: errors > 0 ? errorDetails : undefined,
        message: `Importados ${saved}/${fetched} properties: ${saved - updated} criadas, ${updated} atualizadas`
      }
    });

  } catch (error: any) {
    console.error('\n❌❌❌ ERRO GERAL NO IMPORT ❌❌❌');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    // ✅ CONTRATO PADRONIZADO: Mesmo em erro, manter estrutura { success, data }
    return c.json({
      success: false,
      data: {
        stats: { 
          total: fetched,
          created: saved - (updated || 0),
          updated: updated || 0,
          errors: errors 
        },
        error: error.message
      }
    }, 500);
  }
}
