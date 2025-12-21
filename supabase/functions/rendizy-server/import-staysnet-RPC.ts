/**
 * IMPORTAÇÃO STAYSNET usando RPC save_anuncio_field
 * 
 * USA O MESMO PADRÃO QUE FORMULARIOANUNCIO.TSX:
 * - Salva em anuncios_ultimate (tabela renomeada em 21/12/2025)
 * - Usa RPC save_anuncio_field (UPSERT automático)
 * - Campo por campo (igual wizard de anúncios)
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';

const STAYSNET_CONFIG = {
  apiKey: 'a5146970',
  apiSecret: 'bfcf4daf',
  baseUrl: 'https://bvm.stays.net/external/v1'
};

export async function importStaysNetRPC(c: Context) {
  console.log('🚀 [RPC] IMPORT STAYSNET → anuncios_ultimate - Usando save_anuncio_field');
  
  const orgId = '00000000-0000-0000-0000-000000000000';
  const userId = '00000000-0000-0000-0000-000000000002';
  
  let fetched = 0;
  let saved = 0;
  let errors = 0;
  
  try {
    // ============================================================================
    // STEP 1: BUSCAR DA API STAYSNET
    // ============================================================================
    console.log('📡 [FETCH] Buscando propriedades...');
    
    const response = await fetch(`${STAYSNET_CONFIG.baseUrl}/content/listings`, {
      headers: {
        'x-api-key': STAYSNET_CONFIG.apiKey,
        'x-api-secret': STAYSNET_CONFIG.apiSecret
      }
    });
    
    if (!response.ok) {
      throw new Error(`API falhou: ${response.status}`);
    }
    
    const properties = await response.json();
    fetched = Array.isArray(properties) ? properties.length : 0;
    console.log(`✅ [FETCH] ${fetched} propriedades recebidas`);
    
    // ============================================================================
    // STEP 2: SALVAR USANDO RPC (IGUAL FormularioAnuncio.tsx)
    // ============================================================================
    const supabase = getSupabaseClient(c);
    
    for (const prop of properties) {
      try {
        console.log(`\n💾 [RPC] Salvando: ${prop.internalName || prop._id}`);
        
        // Campo 1: title (criar novo anúncio em anuncios_drafts)
        const { data: anuncioData, error: createError } = await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: null,  // NULL = criar novo anúncio
          p_field: 'title',
          p_value: prop.internalName || 'Sem nome',
          p_organization_id: orgId,
          p_user_id: userId
        });
        
        if (createError) {
          console.error(`❌ [RPC] Erro ao criar anúncio:`, createError.message);
          errors++;
          continue;
        }
        
        // Extrair ID do anúncio criado
        const anuncioId = anuncioData?.[0]?.id;
        if (!anuncioId) {
          console.error(`❌ [RPC] Anúncio criado mas ID não retornado`);
          errors++;
          continue;
        }
        
        console.log(`✅ [RPC] Anúncio criado: ${anuncioId}`);
        
        // Campo 2: internalId (para busca na lista)
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'internalId',
          p_value: prop.internalName || ''
        });
        
        // Campo 3: staysnetId (para tracking e deduplicação)
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'staysnetId',
          p_value: prop._id
        });
        
        // Campo 4: tipoLocal (pode vir de prop.category)
        if (prop.category) {
          await supabase.rpc('save_anuncio_field', {
            p_anuncio_id: anuncioId,
            p_field: 'tipoLocal',
            p_value: prop.category
          });
        }
        
        // Campo 5: rawData completo (backup)
        await supabase.rpc('save_anuncio_field', {
          p_anuncio_id: anuncioId,
          p_field: 'staysnet_raw',
          p_value: JSON.stringify(prop)
        });
        
        console.log(`✅ [RPC] ${prop.internalName} salvo em anuncios_ultimate`);
        saved++;
        
      } catch (err: any) {
        console.error(`❌ [LOOP] Erro ao salvar ${prop.internalName}:`, err.message);
        errors++;
      }
    }
    
    // ============================================================================
    // RESULTADO FINAL
    // ============================================================================
    console.log(`\n📊 [RESULTADO FINAL]`);
    console.log(`   Fetched: ${fetched}`);
    console.log(`   Saved: ${saved}`);
    console.log(`   Errors: ${errors}`);
    
    return c.json({
      success: true,
      method: 'RPC save_anuncio_field',
      table: 'anuncios_drafts',
      stats: { fetched, saved, errors },
      message: `Importados ${saved}/${fetched} anúncios usando RPC (igual FormularioAnuncio)`
    });
    
  } catch (error: any) {
    console.error('❌ [IMPORT] Erro geral:', error.message);
    return c.json({
      success: false,
      error: error.message,
      stats: { fetched, saved, errors }
    }, 500);
  }
}
