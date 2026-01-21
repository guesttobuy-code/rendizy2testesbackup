/**
 * UTILS - Get Organization ID (ARQUITETURA SQL)
 * 
 * Helper centralizado para obter organization_id do usuário autenticado
 * ✅ ARQUITETURA SQL v1.0.103.950 - USA APENAS TABELA sessions DO SQL
 * 
 * PRIORIDADE:
 * 1. Tabela sessions do SQL (ARQUITETURA SQL) - via session.organization_id
 * 2. Tabela users do SQL - via user.organization_id
 * 
 * ❌ REMOVIDO: Fallback para KV Store (sistema antigo removido)
 * 
 * @version 1.0.103.950
 * @updated 2024-11-20 - REMOVIDO KV Store - APENAS SQL AGORA
 */

import { Context } from 'npm:hono';
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getSupabaseClient } from './kv_store.tsx';
import { getTenant } from './utils-tenancy.ts';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './utils-env.ts';

class HttpStatusError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Helper para parsear cookies
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
}

/**
 * Extrai o token do cookie ou header Authorization do Hono Context
 * ✅ MIGRAÇÃO COOKIES HTTPONLY v1.0.103.980 - Prioriza cookie, fallback para header
 * 
 * @param c - Context do Hono
 * @returns Token de autenticação ou undefined
 */
function extractTokenFromContext(c: Context): string | undefined {
  // 🔍 DEBUG v1.0.103.1200: Log detalhado de todos os headers
  console.log('🔍 [extractTokenFromContext] Iniciando extração de token...');
  
  // ✅ PRIORIDADE 1: Tentar obter do header customizado X-Auth-Token (evita validação JWT automática)
  const customToken = c.req.header('X-Auth-Token');
  console.log('🔍 [extractTokenFromContext] X-Auth-Token header:', customToken ? `${customToken.substring(0, 30)}... (length=${customToken.length})` : 'AUSENTE');
  
  if (customToken) {
    console.log('✅ [extractTokenFromContext] Usando token de X-Auth-Token');
    return customToken;
  }
  
  // ✅ PRIORIDADE 2: Tentar obter do cookie (nova forma)
  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const tokenFromCookie = cookies['rendizy-token'];
  console.log('🔍 [extractTokenFromContext] Cookie header:', cookieHeader ? 'presente' : 'ausente');
  console.log('🔍 [extractTokenFromContext] Token from cookie:', tokenFromCookie ? `${tokenFromCookie.substring(0, 30)}...` : 'AUSENTE');
  
  if (tokenFromCookie) {
    console.log('✅ [extractTokenFromContext] Usando token de Cookie');
    return tokenFromCookie;
  }
  
  // ✅ PRIORIDADE 3: Fallback para header Authorization (compatibilidade durante migração)
  const authHeader = c.req.header('Authorization');
  console.log('🔍 [extractTokenFromContext] Authorization header:', authHeader ? `${authHeader.substring(0, 40)}...` : 'AUSENTE');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [extractTokenFromContext] Nenhum token encontrado em nenhum header!');
    return undefined;
  }
  const tokenFromAuth = authHeader.split(' ')[1];
  console.log('✅ [extractTokenFromContext] Usando token de Authorization Bearer');
  return tokenFromAuth;
}

function isServiceRoleRequest(c: Context): boolean {
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return false;

  const apiKeyHeader = c.req.header('apikey');
  if (apiKeyHeader && apiKeyHeader === serviceRoleKey) {
    return true;
  }

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  return false;
}

/**
 * Converte imobiliariaId (KV Store) → organizationId (UUID SQL)
 * 
 * Usa função SQL lookup_organization_id_by_imobiliaria_id() para fazer o mapeamento
 * 
 * @param imobiliariaId - ID da imobiliária do KV Store (TEXT)
 * @returns Promise<string | null> - organizationId (UUID) ou null se não encontrado
 */
export async function lookupOrganizationIdFromImobiliariaId(imobiliariaId: string | undefined): Promise<string | null> {
  if (!imobiliariaId) {
    return null;
  }

  try {
    const client = getSupabaseClient();
    
    // Tentar usar função SQL RPC primeiro (se disponível)
    try {
      const { data: rpcData, error: rpcError } = await client.rpc('lookup_organization_id_by_imobiliaria_id', {
        p_imobiliaria_id: imobiliariaId
      });

      if (!rpcError && rpcData) {
        // A função retorna UUID diretamente (não em objeto)
        const orgId = typeof rpcData === 'string' ? rpcData : rpcData?.organization_id || rpcData?.id || null;
        
        if (orgId) {
          console.log(`✅ [lookupOrganizationIdFromImobiliariaId] Mapeado via RPC: imobiliariaId=${imobiliariaId} → organizationId=${orgId}`);
          return orgId;
        }
      }
    } catch (rpcErr) {
      console.warn('⚠️ [lookupOrganizationIdFromImobiliariaId] RPC não disponível, usando query direta:', rpcErr);
    }
    
    // Fallback: Query direta na tabela organizations
    const { data, error } = await client
      .from('organizations')
      .select('id')
      .eq('legacy_imobiliaria_id', imobiliariaId)
      .maybeSingle();

    if (error) {
      console.error('❌ [lookupOrganizationIdFromImobiliariaId] Erro ao fazer lookup:', error);
      return null;
    }

    const orgId = data?.id || null;

    if (orgId) {
      console.log(`✅ [lookupOrganizationIdFromImobiliariaId] Mapeado via query: imobiliariaId=${imobiliariaId} → organizationId=${orgId}`);
    } else {
      console.warn(`⚠️ [lookupOrganizationIdFromImobiliariaId] ImobiliariaId não encontrado: ${imobiliariaId}`);
    }

    return orgId;
  } catch (error) {
    console.error('❌ [lookupOrganizationIdFromImobiliariaId] Erro inesperado:', error);
    return null;
  }
}

/**
 * Cria um Supabase client autenticado com o token do usuário
 * (para uso futuro com Supabase Auth)
 * 
 * @param token - Token de autenticação do usuário (Bearer token)
 * @returns SupabaseClient autenticado com o token do usuário
 */
function getAuthenticatedSupabaseClient(token: string) {
  const supabaseUrl = SUPABASE_URL;
  const supabaseAnonKey = SUPABASE_ANON_KEY || 
                          SUPABASE_ANON_KEY ||
                          SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY (ou SUPABASE_KEY) devem estar configuradas');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

/**
 * Obtém organization_id via Supabase Auth (fallback para futuro)
 * 
 * Busca organization_id nos metadados do usuário:
 * - user.user_metadata.organization_id
 * - user.raw_user_meta_data.organization_id
 * 
 * @param token - Token de autenticação
 * @returns Promise<string | null> - organization_id ou null se não encontrado
 */
export async function getOrganizationIdFromSupabaseAuth(token: string): Promise<string | null> {
  try {
    const supabase = getAuthenticatedSupabaseClient(token);
    
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.warn('⚠️ [getOrganizationIdFromSupabaseAuth] Não foi possível obter usuário via Supabase Auth:', error);
      return null;
    }
    
    // Extrair organization_id dos metadados
    const orgId =
      (user.user_metadata as any)?.organization_id ??
      (user as any)?.raw_user_meta_data?.organization_id;
    
    if (orgId) {
      console.log(`✅ [getOrganizationIdFromSupabaseAuth] organization_id encontrado: ${orgId} para usuário ${user.id}`);
    }
    
    return orgId || null;
  } catch (error) {
    console.warn('⚠️ [getOrganizationIdFromSupabaseAuth] Erro ao buscar via Supabase Auth:', error);
    return null;
  }
}

/**
 * Obtém organization_id do usuário autenticado (ARQUITETURA SQL)
 * 
 * ✅ ARQUITETURA SQL v1.0.103.950 - USA APENAS TABELA sessions DO SQL
 * 
 * PRIORIDADE:
 * 1. Tabela sessions do SQL - via session.organization_id
 * 2. Tabela users do SQL - via user.organization_id
 * 
 * ❌ REMOVIDO: Fallback para KV Store (sistema antigo removido)
 * 
 * @param c - Context do Hono (para extrair token)
 * @returns Promise<string> - organization_id (UUID) do usuário
 * @throws Error se usuário não estiver autenticado ou não tiver organization_id
 * 
 * @example
 * ```typescript
 * app.get('/route', async (c) => {
 *   const orgId = await getOrganizationIdOrThrow(c);
 *   // usar orgId (UUID)...
 * });
 * ```
 */
export async function getOrganizationIdOrThrow(c: Context): Promise<string> {
  try {
    // 0. Capturar override (mas NÃO retornar antes de autenticar)
    let orgIdOverride: string | undefined;
    try {
      const orgIdFromQuery = c.req.query('organization_id');
      if (orgIdFromQuery && typeof orgIdFromQuery === 'string') {
        orgIdOverride = orgIdFromQuery;
      }
    } catch {
      // Query vazia, continuar
    }

    // 1. Extrair token do header Authorization
    console.log('🔍 [getOrganizationIdOrThrow] Headers recebidos:', {
      'X-Auth-Token': c.req.header('X-Auth-Token')?.substring(0, 20) + '...',
      'Authorization': c.req.header('Authorization')?.substring(0, 30) + '...',
      'Cookie': c.req.header('Cookie') ? 'presente' : 'ausente'
    });
    
    const token = extractTokenFromContext(c);

    // 1.1. Se for request service-role, pode usar override sem token
    const serviceRole = isServiceRoleRequest(c);
    if (serviceRole) {
      // 0.1: Permitir override via body apenas em requests internas (service role)
      try {
        const contentType = (c.req.header('Content-Type') || '').toLowerCase();
        if (!orgIdOverride && contentType.includes('application/json')) {
          const body = await c.req.json().catch(() => ({}));
          if (
            body &&
            typeof body === 'object' &&
            (body as any).organization_id &&
            typeof (body as any).organization_id === 'string'
          ) {
            orgIdOverride = (body as any).organization_id;
          }
        }
      } catch {
        // Body vazio, não-JSON ou já foi consumido, continuar
      }

      if (orgIdOverride) {
        console.log(`✅ [getOrganizationIdOrThrow] override interno (service role) organization_id: ${orgIdOverride}`);
        return orgIdOverride;
      }
    }
    
    if (!token) {
      console.error('❌ [getOrganizationIdOrThrow] Token ausente');
      console.error('❌ Headers disponíveis:', Object.keys(c.req.raw.headers));
      throw new HttpStatusError(401, 'Unauthorized: token ausente');
    }

    // 2. PRIORIDADE 1: Tentar buscar da tabela sessions do SQL (ARQUITETURA SQL)
    // ✅ ARQUITETURA SQL v1.0.103.950 - Buscar sessão da tabela sessions do SQL
    console.log(`🔍 [getOrganizationIdOrThrow] Buscando sessão na tabela SQL com token: ${token?.substring(0, 20)}...`);
    console.log(`🔍 [getOrganizationIdOrThrow] Token completo length: ${token?.length}`);
    const client = getSupabaseClient();
    
    // ✅ DEBUG v1.0.103.1200: Verificar quantas sessões existem
    const { data: allSessions, error: countError } = await client
      .from('sessions')
      .select('id, token, access_token, user_id, organization_id, expires_at, revoked_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('🔍 [getOrganizationIdOrThrow] DEBUG - Últimas 5 sessões:', {
      count: allSessions?.length || 0,
      sessions: allSessions?.map(s => ({
        id: s.id,
        tokenPrefix: s.token?.substring(0, 20),
        accessTokenPrefix: s.access_token?.substring(0, 20),
        userId: s.user_id,
        organizationId: s.organization_id,
        expiresAt: s.expires_at,
        revokedAt: s.revoked_at
      })) || []
    });
    
    // 🔍 DEBUG: Comparar token recebido com tokens no banco
    const tokenToFind = token?.substring(0, 20);
    const matchFound = allSessions?.some(s => 
      s.token?.substring(0, 20) === tokenToFind || 
      s.access_token?.substring(0, 20) === tokenToFind
    );
    console.log('🔍 [getOrganizationIdOrThrow] Token recebido vs banco:', {
      tokenRecebido: tokenToFind,
      matchEncontrado: matchFound,
      tokensNoBanco: allSessions?.map(s => s.token?.substring(0, 20)) || []
    });
    
    // ✅ IMPORTANTE: SERVICE_ROLE_KEY não valida JWT - query direta na tabela
    // ✅ CORREÇÃO v1.0.103.600: Buscar PRIMEIRO por access_token (OAuth2), depois por token (legacy)
    let session: any = null;
    let sessionError: any = null;
    
    // Tentar buscar por access_token primeiro (OAuth2)
    const { data: sessionByAccessToken, error: errorAccessToken } = await client
      .from('sessions')
      .select('*')
      .eq('access_token', token)
      .maybeSingle();
    
    if (!errorAccessToken && sessionByAccessToken) {
      session = sessionByAccessToken;
    } else {
      // Fallback: buscar por token antigo
      const { data: sessionByToken, error: errorToken } = await client
        .from('sessions')
        .select('*')
        .eq('token', token)
        .maybeSingle();
      
      if (!errorToken && sessionByToken) {
        session = sessionByToken;
      } else {
        sessionError = errorToken || errorAccessToken;
      }
    }
    
    console.log(`🔍 [getOrganizationIdOrThrow] Query result:`, {
      hasSession: !!session,
      hasError: !!sessionError,
      errorCode: sessionError?.code,
      errorMessage: sessionError?.message,
      errorDetails: sessionError ? JSON.stringify(sessionError, null, 2) : 'No error'
    });
    
    if (sessionError || !session) {
      console.warn(`⚠️ [getOrganizationIdOrThrow] Sessão não encontrada na tabela SQL:`, sessionError?.code || 'NONE');
      
      // ✅ Se erro for "Invalid JWT", pode ser que Supabase esteja validando automaticamente
      if (sessionError?.message?.includes('JWT') || sessionError?.message?.includes('jwt') || sessionError?.code === 'PGRST301') {
        console.error('❌ [getOrganizationIdOrThrow] ERRO: Supabase retornou erro JWT (não deveria com SERVICE_ROLE_KEY)');
        console.error('❌ [getOrganizationIdOrThrow] Possível causa: Supabase interceptando header Authorization');
        console.error('❌ [getOrganizationIdOrThrow] Token é simples, não JWT. Verificar configuração do Supabase Client.');
      }
    } else {
      // ✅ Verificar se sessão expirou
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      if (now > expiresAt) {
        console.warn(`⚠️ [getOrganizationIdOrThrow] Sessão expirada: expires_at=${expiresAt}`);
      } else {
        // ✅ Sessão válida - usar organization_id diretamente da sessão SQL
        if (session.organization_id) {
          console.log(`✅ [getOrganizationIdOrThrow] organization_id encontrado na sessão SQL: ${session.organization_id}`);
          return session.organization_id;
        }
        
        // Se não tiver organization_id na sessão, tentar buscar do usuário
        if (session.user_id) {
          console.log(`🔍 [getOrganizationIdOrThrow] Buscando organization_id do usuário ${session.user_id}...`);
          const { data: user, error: userError } = await client
            .from('users')
            .select('organization_id')
            .eq('id', session.user_id)
            .maybeSingle();
          
          if (!userError && user?.organization_id) {
            console.log(`✅ [getOrganizationIdOrThrow] organization_id encontrado no usuário: ${user.organization_id}`);
            return user.organization_id;
          }
        }
      }
    }
    
    // ❌ REMOVIDO: Fallback para KV Store - sistema antigo removido
    // ✅ ARQUITETURA SQL v1.0.103.950 - APENAS SQL AGORA
    
    // Se não encontrou sessão no SQL, verificar se é superadmin
    // Se for superadmin, usar organização Rendizy (master)
    if (session?.user_id) {
      const { data: user } = await client
        .from('users')
        .select('type, organization_id')
        .eq('id', session.user_id)
        .maybeSingle();
      
      if (user?.type === 'superadmin') {
        // Superadmin pode operar em uma organization_id específica quando explicitamente fornecida
        if (orgIdOverride && typeof orgIdOverride === 'string') {
          console.log(`✅ [getOrganizationIdOrThrow] Superadmin override organization_id: ${orgIdOverride}`);
          return orgIdOverride;
        }

        // Superadmin sempre usa organização Rendizy (master)
        const rendizyOrgId = '00000000-0000-0000-0000-000000000000';
        console.log(`✅ [getOrganizationIdOrThrow] Superadmin detectado - usando organização Rendizy: ${rendizyOrgId}`);
        
        // Se o superadmin ainda não tem organization_id, atualizar
        if (!user.organization_id || user.organization_id !== rendizyOrgId) {
          await client
            .from('users')
            .update({ organization_id: rendizyOrgId })
            .eq('id', session.user_id);
          console.log(`✅ [getOrganizationIdOrThrow] Superadmin atualizado para usar organização Rendizy`);
        }
        
        return rendizyOrgId;
      }
    }
    
    // ✅ FALLBACK CONTROLADO: Se sessão SQL não existe, tentar mapear via tenancy/KV
    try {
      const tenant = getTenant(c);
      if (tenant?.type === 'superadmin') {
        const rendizyOrgId = '00000000-0000-0000-0000-000000000000';
        console.log(`✅ [getOrganizationIdOrThrow] Superadmin (tenant) - usando organização Rendizy: ${rendizyOrgId}`);
        return rendizyOrgId;
      }

      if (tenant?.imobiliariaId) {
        const mappedOrgId = await lookupOrganizationIdFromImobiliariaId(tenant.imobiliariaId);
        if (mappedOrgId) {
          console.log(`✅ [getOrganizationIdOrThrow] Mapeado via tenancy (KV) imobiliariaId=${tenant.imobiliariaId} → organization_id=${mappedOrgId}`);
          return mappedOrgId;
        }
      }
    } catch (fallbackError) {
      console.warn('⚠️ [getOrganizationIdOrThrow] Fallback tenancy falhou:', fallbackError);
    }

    // Se não encontrou sessão no SQL, retornar erro
    console.error(`❌ [getOrganizationIdOrThrow] Sessão não encontrada na tabela SQL - usuário não autenticado`);
    console.error(`❌ [getOrganizationIdOrThrow] Token: ${token ? `${token.substring(0, 20)}...` : 'NONE'}`);
    console.error(`❌ [getOrganizationIdOrThrow] SessionError:`, sessionError?.code || 'NONE');

    throw new HttpStatusError(401, 'Unauthorized: sessão inválida ou expirada', {
      code: sessionError?.code,
      message: sessionError?.message,
    });
  } catch (error) {
    if (error instanceof HttpStatusError) {
      throw error;
    }
    console.error('❌ [getOrganizationIdOrThrow] Erro ao obter organization_id:', error);
    throw new HttpStatusError(500, 'Internal Error: falha ao resolver organization_id');
  }
}

/**
 * Obtém organization_id do usuário autenticado via Supabase Auth (versão que retorna undefined ao invés de throw)
 * 
 * Útil quando você quer tratar o caso de ausência de organization_id sem lançar exceção
 * 
 * @param c - Context do Hono (para extrair token)
 * @returns Promise<string | undefined> - organization_id do usuário ou undefined
 * 
 * @example
 * ```typescript
 * app.get('/route', async (c) => {
 *   const orgId = await getOrganizationId(c);
 *   if (!orgId) {
 *     return c.json({ error: 'Usuário sem organização' }, 403);
 *   }
 *   // usar orgId...
 * });
 * ```
 */
export async function getOrganizationId(c: Context): Promise<string | undefined> {
  try {
    return await getOrganizationIdOrThrow(c);
  } catch (error) {
    console.warn('⚠️ [getOrganizationId] Não foi possível obter organization_id:', error);
    return undefined;
  }
}
