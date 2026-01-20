/**
 * UTILS - Tenancy Middleware
 * 
 * Middleware para gerenciamento de contexto multi-tenant
 * Centraliza autenticação e contexto do tenant em todas as rotas
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Implementação do Passo 1 do Tenancy Middleware
 */

import { Context, Next } from 'npm:hono';
import { getSessionFromToken } from './utils-session.ts';
import { getSupabaseClient } from './kv_store.tsx';

/**
 * Contexto do tenant disponível nas rotas após aplicação do middleware
 */
export interface TenantContext {
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  organizationId?: string;          // para integração futura com organizations
  imobiliariaId?: string;           // já usado hoje
}

/**
 * Middleware de tenancy que valida autenticação e monta contexto do tenant
 * 
 * Funcionalidades:
 * - Extrai token do header Authorization
 * - Valida sessão via getSessionFromToken()
 * - Monta TenantContext com informações do usuário
 * - (Opcional) Busca organizationId do Postgres para integração futura
 * - Disponibiliza contexto via c.set('tenant', tenant)
 * 
 * @param c - Context do Hono
 * @param next - Próximo middleware/handler
 * @returns Response com erro 401 se token inválido, ou continua para próxima rota
 */
export async function tenancyMiddleware(c: Context, next: Next) {
  try {
    // 1. Extrair token do header customizado X-Auth-Token (evita validação JWT automática do Supabase)
    // Fallback para Authorization para compatibilidade
    let token = c.req.header('X-Auth-Token');
    
    if (!token) {
      // Fallback: tentar do header Authorization
      const authHeader = c.req.header('Authorization');
      token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : undefined;
    }

    if (!token) {
      console.log('⚠️ [tenancyMiddleware] Token ausente');
      return c.json({ success: false, error: 'Token ausente' }, 401);
    }

    // 2. Buscar sessão no KV Store (valida expiração automaticamente)
    const session = await getSessionFromToken(token);

    if (!session) {
      console.log('⚠️ [tenancyMiddleware] Sessão inválida ou expirada');
      return c.json({ success: false, error: 'Sessão inválida ou expirada' }, 401);
    }

    // 3. Montar contexto multi-tenant
    const tenant: TenantContext = {
      userId: session.userId,
      username: session.username,
      type: session.type,
      imobiliariaId: session.imobiliariaId,
    };

    // 4. (Opcional) Buscar organization_id no Postgres, se quiser unificar
    // Descomentar quando necessário para integração com tabela organizations
    /*
    try {
      const client = getSupabaseClient();
      const { data } = await client
        .from('users')
        .select('organization_id')
        .eq('id', session.userId)
        .maybeSingle();

      if (data?.organization_id) {
        tenant.organizationId = data.organization_id;
        console.log(`✅ [tenancyMiddleware] organization_id encontrado: ${data.organization_id}`);
      }
    } catch (error) {
      console.warn('⚠️ [tenancyMiddleware] Erro ao buscar organization_id do Postgres:', error);
      // Não falha se não conseguir buscar organization_id
    }
    */

    // 5. Salvar contexto no Hono Context para uso nas rotas
    c.set('tenant', tenant);

    console.log(`✅ [tenancyMiddleware] Contexto do tenant montado: ${tenant.username} (${tenant.type})`);

    // 6. Continuar para próxima rota/middleware
    await next();
  } catch (error) {
    console.error('❌ [tenancyMiddleware] Erro inesperado:', error);
    return c.json({ 
      success: false, 
      error: 'Erro ao processar autenticação' 
    }, 500);
  }
}

/**
 * Helper para acessar contexto do tenant dentro das rotas
 * 
 * @param c - Context do Hono
 * @returns TenantContext - Contexto do tenant
 * @throws Error se tenancyMiddleware não foi aplicado
 * 
 * @example
 * ```typescript
 * app.get('/route', tenancyMiddleware, async (c) => {
 *   const tenant = getTenant(c);
 *   console.log(tenant.userId); // userId do usuário autenticado
 *   console.log(tenant.imobiliariaId); // ID da imobiliária (se aplicável)
 * });
 * ```
 */
export function getTenant(c: Context): TenantContext {
  const tenant = c.get('tenant') as TenantContext | undefined;

  if (!tenant) {
    throw new Error('TenantContext não encontrado. tenancyMiddleware não foi aplicado na rota.');
  }

  return tenant;
}

/**
 * Verifica se o tenant é superadmin
 * 
 * @param c - Context do Hono
 * @returns boolean - true se for superadmin
 */
export function isSuperAdmin(c: Context): boolean {
  const tenant = getTenant(c);
  return tenant.type === 'superadmin';
}

/**
 * Verifica se o tenant é de imobiliária
 * 
 * @param c - Context do Hono
 * @returns boolean - true se for imobiliária
 */
export function isImobiliaria(c: Context): boolean {
  const tenant = getTenant(c);
  return tenant.type === 'imobiliaria';
}

/**
 * Obtém imobiliariaId do tenant (apenas para tipo 'imobiliaria')
 * 
 * @param c - Context do Hono
 * @returns string | undefined - ID da imobiliária ou undefined
 */
export function getImobiliariaId(c: Context): string | undefined {
  const tenant = getTenant(c);
  return tenant.imobiliariaId;
}

