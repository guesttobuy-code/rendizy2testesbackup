/**
 * IMPORTAÇÃO SIMPLES STAYSNET - SEM ENROLAÇÃO
 * 
 * Busca JSON da API e salva direto no banco.
 * SEM validações complexas, SEM verificação de duplicatas.
 * APENAS O BÁSICO QUE FUNCIONA.
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';

const STAYSNET_CONFIG = {
  apiKey: 'a5146970',
  apiSecret: 'bfcf4daf',
  baseUrl: 'https://bvm.stays.net/external/v1'
};

export async function importStaysNetSimple(c: Context) {
  console.log('🚀 IMPORT SIMPLES - INICIANDO...');
  
  const orgId = '00000000-0000-0000-0000-000000000000';
  const userId = '00000000-0000-0000-0000-000000000002';
  
  try {
    // 1. BUSCAR DA API
    console.log('📡 Buscando da API StaysNet...');
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
    console.log(`✅ Buscadas ${properties.length} propriedades`);
    
    // 2. SALVAR NO BANCO
    console.log('💾 Salvando no banco...');
    const supabase = getSupabaseClient();
    let saved = 0;
    let errors = 0;
    
    for (const prop of properties) {
      try {
        const record = {
          id: crypto.randomUUID(),
          organization_id: orgId,
          user_id: userId,
          data: {
            title: prop.internalName || 'Sem nome',
            internalName: prop.internalName,
            staysnetId: prop._id,
            rawData: prop // JSON completo
          },
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('anuncios_ultimate')
          .insert(record);
        
        if (error) {
          console.error(`❌ Erro ao salvar ${prop.internalName}:`, error.message);
          errors++;
        } else {
          console.log(`✅ Salvo: ${prop.internalName}`);
          saved++;
        }
      } catch (err: any) {
        console.error(`❌ Exception:`, err.message);
        errors++;
      }
    }
    
    console.log(`\n📊 RESULTADO:`);
    console.log(`   Buscadas: ${properties.length}`);
    console.log(`   Salvas: ${saved}`);
    console.log(`   Erros: ${errors}`);
    
    return c.json({
      success: true,
      stats: {
        fetched: properties.length,
        saved: saved,
        errors: errors
      }
    });
    
  } catch (error: any) {
    console.error('❌ ERRO GERAL:', error.message);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
}
