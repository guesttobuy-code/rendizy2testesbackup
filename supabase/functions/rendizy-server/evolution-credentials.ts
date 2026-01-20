/**
 * Evolution API Credentials Manager
 * 
 * ✅ CORRIGIDO v1.0.103.400 - Alinhado com schema novo (sem user_id)
 * Busca credenciais da Evolution API por nome da instância ou primeira disponível
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Removido user_id conforme schema novo
 */

import * as kv from './kv_store.tsx';

export interface EvolutionCredentials {
  instanceName: string;
  instanceApiKey: string;
  globalApiKey: string;
  baseUrl: string;
  source: 'database' | 'env';
}

/**
 * Busca credenciais da Evolution API
 * 
 * ✅ CORRIGIDO v1.0.103.400 - Alinhado com schema novo (sem user_id)
 * Ordem de prioridade:
 * 1. Credenciais do banco de dados (tabela evolution_instances) - por instance_name ou primeira
 * 2. Credenciais do .env (fallback final)
 * 
 * @param instanceName - Nome da instância (opcional). Se não fornecido, busca primeira disponível.
 */
export async function getEvolutionCredentials(instanceName?: string): Promise<EvolutionCredentials> {
  console.log(`🔑 [Evolution] Buscando credenciais${instanceName ? ` para instância: ${instanceName}` : ' (primeira disponível)'}`);
  
  const client = kv.getSupabaseClient();
  
  // 1️⃣ Tentar buscar credenciais do banco de dados
  // ✅ CORRIGIDO v1.0.103.400 - Schema novo não tem user_id, usar instance_name ou primeira
  let query = client
    .from('evolution_instances')
    .select('id, instance_name, instance_api_key, global_api_key, base_url, instance_token, created_at');
  
  if (instanceName) {
    // Buscar por nome da instância
    query = query.eq('instance_name', instanceName);
  }
  
  // Buscar primeira instância disponível (ordenada por created_at)
  query = query.order('created_at', { ascending: false }).limit(1);
  
  const { data: instance, error } = await query.maybeSingle();
  
  if (instance && !error) {
    console.log(`✅ [Evolution] Credenciais encontradas no banco: ${instance.instance_name}`);
    return {
      instanceName: instance.instance_name,
      instanceApiKey: instance.instance_api_key,
      globalApiKey: instance.global_api_key || '',
      baseUrl: normalizeUrl(instance.base_url),
      source: 'database'
    };
  }
  
  console.log(`⚠️ [Evolution] Nenhuma instância encontrada no banco, usando variáveis de ambiente`);
  
  // 2️⃣ Fallback: variáveis de ambiente
  const envInstanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');
  const envInstanceKey = Deno.env.get('EVOLUTION_INSTANCE_API_KEY');
  const envGlobalKey = Deno.env.get('EVOLUTION_GLOBAL_API_KEY');
  const envBaseUrl = Deno.env.get('EVOLUTION_BASE_URL');
  
  if (!envInstanceName || !envInstanceKey || !envGlobalKey || !envBaseUrl) {
    throw new Error('❌ Nenhuma credencial Evolution encontrada (banco ou .env)');
  }
  
  console.log(`✅ [Evolution] Usando credenciais das variáveis de ambiente`);
  return {
    instanceName: envInstanceName,
    instanceApiKey: envInstanceKey,
    globalApiKey: envGlobalKey,
    baseUrl: normalizeUrl(envBaseUrl),
    source: 'env'
  };
}

/**
 * Normaliza URL removendo barra final
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Obtém headers para requisições à Evolution API
 */
export function getEvolutionHeaders(credentials: EvolutionCredentials): Record<string, string> {
  return {
    'apikey': credentials.globalApiKey,
    'instanceToken': credentials.instanceApiKey,
    'Content-Type': 'application/json'
  };
}

/**
 * Obtém headers para endpoints de mensagens (apenas apikey)
 */
export function getEvolutionMessageHeaders(credentials: EvolutionCredentials): Record<string, string> {
  return {
    'apikey': credentials.globalApiKey,
    'Content-Type': 'application/json'
  };
}



