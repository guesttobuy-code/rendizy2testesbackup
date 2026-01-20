/**
 * UTILS - Multi-Tenancy Helper (REGRA MESTRE)
 * 
 * ✅ REGRA MESTRE v1.0.103.1500 - Multi-tenancy aplicado em TODO o sistema
 * 
 * OBJETIVO:
 * Garantir que cada organização veja APENAS seus próprios dados
 * Superadmin sempre vê apenas a organização Rendizy (master)
 * 
 * APLICAÇÃO:
 * - Todas as rotas de leitura (GET) devem usar este helper
 * - Todas as rotas de escrita (POST/PUT/DELETE) devem validar organization_id
 * - NUNCA retornar dados sem organization_id ou de outras organizações
 * 
 * @version 1.0.103.1500
 * @updated 2024-11-26 - REGRA MESTRE para todo o sistema
 */

import { Context } from 'npm:hono';
import { getTenant } from './utils-tenancy.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';

/**
 * UUID fixo da organização Rendizy (master) para superadmin
 */
export const RENDIZY_MASTER_ORG_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Obtém organization_id garantido para a requisição atual
 * 
 * REGRA MESTRE:
 * - Superadmin: SEMPRE usa organização Rendizy (master)
 * - Outros usuários: usa organization_id da sessão/usuário
 * 
 * @param c - Context do Hono
 * @returns Promise<string> - organization_id garantido
 * 
 * @example
 * ```typescript
 * export async function listSomething(c: Context) {
 *   const organizationId = await getOrganizationIdForRequest(c);
 *   
 *   const query = client
 *     .from('table')
 *     .select('*')
 *     .eq('organization_id', organizationId); // ✅ SEMPRE filtrar
 * }
 * ```
 */
export async function getOrganizationIdForRequest(c: Context): Promise<string> {
  const tenant = getTenant(c);
  
  // ✅ REGRA MESTRE: Superadmin sempre usa organização Rendizy (master)
  if (tenant.type === 'superadmin') {
    console.log(`✅ [getOrganizationIdForRequest] Superadmin - usando organização Rendizy: ${RENDIZY_MASTER_ORG_ID}`);
    return RENDIZY_MASTER_ORG_ID;
  }
  
  // ✅ REGRA MESTRE: Outros usuários usam organization_id da sessão
  const organizationId = await getOrganizationIdOrThrow(c);
  console.log(`✅ [getOrganizationIdForRequest] Usuário normal - usando organização: ${organizationId}`);
  return organizationId;
}

/**
 * Aplica filtro de organization_id em uma query Supabase
 * 
 * REGRA MESTRE:
 * - SEMPRE adiciona .eq('organization_id', organizationId)
 * - Garante que apenas dados da organização correta sejam retornados
 * 
 * @param query - Query do Supabase
 * @param c - Context do Hono
 * @returns Promise com query filtrada por organization_id
 * 
 * @example
 * ```typescript
 * export async function listSomething(c: Context) {
 *   const client = getSupabaseClient();
 *   let query = client.from('table').select('*');
 *   
 *   query = await applyOrganizationFilter(query, c);
 *   // Agora query já está filtrada por organization_id
 * }
 * ```
 */
export async function applyOrganizationFilter<T>(
  query: any,
  c: Context
): Promise<T> {
  const organizationId = await getOrganizationIdForRequest(c);
  return query.eq('organization_id', organizationId);
}

/**
 * Valida se um registro pertence à organização do usuário
 * 
 * REGRA MESTRE:
 * - Superadmin: valida contra organização Rendizy (master)
 * - Outros: valida contra organization_id da sessão
 * 
 * @param recordOrganizationId - organization_id do registro
 * @param c - Context do Hono
 * @returns Promise<boolean> - true se pertence à organização do usuário
 */
export async function validateOrganizationAccess(
  recordOrganizationId: string | null | undefined,
  c: Context
): Promise<boolean> {
  const userOrganizationId = await getOrganizationIdForRequest(c);
  
  if (!recordOrganizationId) {
    console.warn('⚠️ [validateOrganizationAccess] Registro sem organization_id');
    return false;
  }
  
  if (recordOrganizationId !== userOrganizationId) {
    console.warn(`⚠️ [validateOrganizationAccess] Tentativa de acessar registro de outra organização: ${recordOrganizationId} (usuário: ${userOrganizationId})`);
    return false;
  }
  
  return true;
}

/**
 * Middleware Hono para aplicar multi-tenancy automaticamente
 * 
 * REGRA MESTRE:
 * - Adiciona organizationId ao contexto
 * - Pode ser usado para validar automaticamente
 * 
 * @example
 * ```typescript
 * app.use('/api/*', multiTenancyMiddleware);
 * ```
 */
export function multiTenancyMiddleware(c: Context, next: () => Promise<void>) {
  // Adiciona helper ao contexto para uso nas rotas
  c.set('getOrganizationId', async () => {
    return await getOrganizationIdForRequest(c);
  });
  
  return next();
}

