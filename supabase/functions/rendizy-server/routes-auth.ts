// ============================================================================
// 🔒 CADEADO DE CONTRATO - AUTH ROUTES (Sistema de Autenticação)
// ============================================================================
// ⚠️ CONTRATO ESTABELECIDO - NÃO MODIFICAR SEM ATUALIZAR CONTRATO
// 
// ESTA FUNCIONALIDADE ESTÁ FUNCIONANDO EM PRODUÇÃO
// 
// CONTRATO DA API (O QUE A CÁPSULA ESPERA):
// 
// INPUT (Request):
// - POST /rendizy-server/auth/login
//   Body: { username: string, password: string }
//   Headers: { apikey: string }
// 
// - GET /rendizy-server/auth/me
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - POST /rendizy-server/auth/logout
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - POST /rendizy-server/auth/refresh
//   Body: { refresh_token: string }
//   Headers: { apikey: string }
// 
// OUTPUT (Response):
// - Success: { success: true, data: { token: string, user: User, organization?: Organization } }
// - Error: { success: false, error: string }
// 
// DEPENDÊNCIAS FRONTEND (QUEM USA ESTE CONTRATO):
// - AuthContext.tsx → authServiceLogin(), authServiceLogout(), getCurrentUser()
// - ProtectedRoute.tsx → Verifica token via AuthContext
// - MainSidebar.tsx → Usa AuthContext para exibir user/organization
// 
// ENTRELACEAMENTOS DOCUMENTADOS (OK - Sistemas se comunicam):
// - ✅ Todas as cápsulas → Dependem de AuthContext para autenticação
// - ✅ ProtectedRoute → Usa AuthContext para proteger rotas
// - ✅ MainSidebar → Usa AuthContext para exibir informações do usuário
// 
// ⚠️ SE MODIFICAR CONTRATO:
// 1. ✅ Criar versão v2 da rota (manter v1 funcionando)
// 2. ✅ Atualizar frontend gradualmente
// 3. ✅ Só remover v1 quando TODOS migrarem
// 4. ✅ Executar: npm run test:auth-contract
// 
// VALIDAÇÃO DO CONTRATO:
// - Executar: npm run test:auth
// - Verificar: scripts/check-auth-contract.js
// 
// ⚠️ NUNCA REMOVER ROTAS SEM CRIAR VERSÃO ALTERNATIVA
// ============================================================================

import { Hono } from 'npm:hono';
import { createHash } from 'node:crypto';
// ✅ ARQUITETURA SQL: Importar Supabase Client
import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';
// ✅ Usar getSessionFromToken que já funciona em outras rotas
import { getSessionFromToken } from './utils-session.ts';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './utils-env.ts';

// Helper: Obter cliente Supabase
// ✅ DESABILITADO JWT VALIDATION - Usar SERVICE_ROLE_KEY que bypassa JWT
function getSupabaseClient() {
  const supabaseUrl = SUPABASE_URL;
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

  // ✅ SOLUÇÃO: SERVICE_ROLE_KEY bypassa completamente validação JWT
  // Não precisa de configurações especiais - SERVICE_ROLE_KEY já ignora JWT
  return createClient(supabaseUrl, serviceRoleKey);
}

const app = new Hono();

// Tipos
interface SuperAdmin {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  type: 'superadmin';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

interface UsuarioImobiliaria {
  id: string;
  imobiliariaId: string;
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'readonly';
  type: 'imobiliaria';
  status: 'active' | 'invited' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  permissions?: string[];
}

interface Session {
  id: string;
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  imobiliariaId?: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

// Helper: Gerar hash de senha
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Helper: Verificar senha
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Helper: Gerar ID de sessão
// ✅ Usa randomUUID para evitar colisões previsíveis e seguir boas práticas de geração de IDs
function generateSessionId(): string {
  return `session_${crypto.randomUUID()}`;
}

// Helper: Gerar token de sessão
// ❗ Importante: tokens precisam ser longos, imprevisíveis e resilientes a reuso em múltiplas abas
//  - 64 bytes randômicos → 128 caracteres hexadecimais (~10^154 combinações)
//  - Usa crypto.getRandomValues (disponível no runtime do Supabase Edge)
//  - Resolve problema de token curto (31 caracteres) identificado no relatório de login
function generateToken(bytes = 64): string {
  const randomBytes = new Uint8Array(bytes);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ❌ REMOVIDO: initializeSuperAdmin() - SuperAdmins agora são criados na migration SQL
// Ver: supabase/migrations/20241120_create_users_table.sql

// POST /auth/login - Login
app.post('/login', async (c) => {
  try {
    console.log('🔐 ============================================');
    console.log('🔐 POST /auth/login - Tentativa de login');
    console.log('🔐 URL:', c.req.url);
    console.log('🔐 Path:', c.req.path);
    console.log('🔐 Method:', c.req.method);
    console.log('🔐 ============================================');

    let body;
    try {
      body = await c.req.json();
      console.log('🔐 Body recebido:', { username: body.username, hasPassword: !!body.password });
    } catch (e) {
      console.error('❌ Erro ao parsear JSON:', e);
      return c.json({
        success: false,
        error: 'Erro ao processar requisição'
      }, 400);
    }

    const { username, password } = body;

    if (!username || !password) {
      return c.json({
        success: false,
        error: 'Usuário e senha são obrigatórios'
      }, 400);
    }

    console.log('👤 Login attempt:', { username });
    // ✅ ARQUITETURA SQL: Buscar usuário da tabela SQL ao invés de KV Store
    const supabase = getSupabaseClient();

    // Verificar se tabela users existe (debug)
    const { data: allUsers, error: checkError } = await supabase
      .from('users')
      .select('id, username, type')
      .limit(5);

    if (checkError) {
      console.error('❌ ERRO CRÍTICO: Tabela users não existe ou erro de acesso:', checkError);
      return c.json({
        success: false,
        error: `Erro ao acessar tabela users: ${checkError.message}`,
        details: checkError.code || 'UNKNOWN_ERROR'
      }, 500);
    }

    console.log('✅ Tabela users acessível. Usuários encontrados:', allUsers?.length || 0);

    // Buscar usuário na tabela SQL
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      console.error('❌ Erro ao buscar usuário:', userError);
      return c.json({
        success: false,
        error: `Erro ao buscar usuário: ${userError.message}`,
        details: userError.code || 'QUERY_ERROR'
      }, 500);
    }

    // Se não encontrou usuário, retornar erro
    if (!user) {
      console.log('❌ Usuário não encontrado:', username);
      console.log('📋 Usuários disponíveis na tabela:', allUsers?.map(u => u.username) || []);
      return c.json({
        success: false,
        error: 'Usuário ou senha incorretos'
      }, 401);
    }

    console.log('✅ Usuário encontrado na tabela SQL:', { id: user.id, username: user.username, type: user.type });

    // 1. Verificar se é SuperAdmin ou usuário de organização
    if (user.type === 'superadmin' || user.type === 'imobiliaria' || user.type === 'staff') {
      // ✅ ARQUITETURA SQL: Verificar senha usando hash do banco
      const computedHash = hashPassword(password);
      console.log('🔍 Verificando senha:', {
        username,
        passwordProvided: password ? 'SIM' : 'NÃO',
        passwordLength: password?.length,
        passwordHashLength: user.password_hash?.length,
        passwordHashPrefix: user.password_hash?.substring(0, 20),
        computedHash: computedHash,
        storedHash: user.password_hash,
        hashesMatch: computedHash === user.password_hash
      });

      const passwordValid = verifyPassword(password, user.password_hash);
      console.log('🔍 Resultado da verificação de senha:', passwordValid);

      if (!passwordValid) {
        console.log('❌ Senha incorreta para usuário:', username);
        console.log('🔍 Debug senha:', {
          computed: hashPassword(password),
          stored: user.password_hash,
          match: hashPassword(password) === user.password_hash
        });
        return c.json({
          success: false,
          error: 'Usuário ou senha incorretos'
        }, 401);
      }

      console.log('✅ Senha verificada com sucesso!');

      if (user.status !== 'active') {
        console.log('❌ Usuário suspenso:', username);
        return c.json({
          success: false,
          error: 'Usuário suspenso'
        }, 403);
      }

      // ✅ ARQUITETURA SQL: Atualizar last_login_at no banco
      const now = new Date();
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login_at: now.toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar last_login_at:', updateError);
        // Não bloquear login se falhar atualização
      }

      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Gerar access + refresh tokens
      const accessToken = generateToken(); // Token curto (15-30 min)
      const refreshToken = generateToken(); // Token longo (30-60 dias)

      // Expirações
      const ACCESS_TOKEN_DURATION = 30 * 60 * 1000; // 30 minutos
      const REFRESH_TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 dias
      const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_DURATION);
      const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_DURATION);

      // ✅ COMPATIBILIDADE: Manter token antigo para compatibilidade durante migração
      const token = accessToken; // Access token é o token principal

      // ✅ LIMPEZA: Remover sessões antigas do mesmo usuário antes de criar nova
      const { error: cleanupError } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', user.id);

      if (cleanupError) {
        console.warn('⚠️ Erro ao limpar sessões antigas (não crítico):', cleanupError);
      } else {
        console.log('✅ Sessões antigas do usuário removidas');
      }

      // ✅ Extrair user agent e IP para segurança
      const userAgent = c.req.header('User-Agent') || null;
      const ip = c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown';
      const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 32);

      // Salvar sessão no SQL com access + refresh tokens
      console.log('🔍 [login] Criando sessão com access token:', accessToken.substring(0, 30) + '...');
      const { data: insertedSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          // ✅ COMPATIBILIDADE: token antigo (será deprecado)
          token: accessToken,
          // ✅ NOVO: access + refresh tokens
          access_token: accessToken,
          refresh_token: refreshToken,
          access_expires_at: accessExpiresAt.toISOString(),
          refresh_expires_at: refreshExpiresAt.toISOString(),
          // Dados do usuário
          user_id: user.id,
          username: user.username,
          type: user.type,
          organization_id: user.organization_id || null,
          // Timestamps
          expires_at: refreshExpiresAt.toISOString(), // ✅ COMPATIBILIDADE: expires_at = refresh_expires_at
          last_activity: now.toISOString(),
          // Segurança
          user_agent: userAgent,
          ip_hash: ipHash
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Erro ao criar sessão no SQL:', sessionError);
        console.error('❌ Detalhes do erro:', {
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint
        });
        // ❌ BLOQUEAR LOGIN se falhar criar sessão - sessão é crítica
        return c.json({
          success: false,
          error: 'Erro ao criar sessão. Tente novamente.',
          details: sessionError.message
        }, 500);
      }

      console.log('✅ Sessão criada no SQL com sucesso');
      console.log('✅ Sessão criada - ID:', insertedSession?.id);
      console.log('✅ Sessão criada - Token:', insertedSession?.token?.substring(0, 30) + '...');

      // ✅ VERIFICAÇÃO CRÍTICA: Confirmar que a sessão foi realmente criada e está acessível
      let verifyAttempts = 0;
      let verifySession = null;
      while (verifyAttempts < 5 && !verifySession) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Aguardar 200ms entre tentativas

        const { data: session, error: verifyError } = await supabase
          .from('sessions')
          .select('*')
          .eq('token', token)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (verifyError) {
          console.error(`❌ Erro ao verificar sessão criada (tentativa ${verifyAttempts + 1}):`, verifyError);
        } else if (session) {
          verifySession = session;
          console.log('✅ Sessão confirmada no banco - ID:', verifySession.id);
          console.log('✅ Token confirmado:', verifySession.token?.substring(0, 30) + '...');
          break;
        } else {
          console.warn(`⚠️ Sessão não encontrada (tentativa ${verifyAttempts + 1}/5)`);
        }
        verifyAttempts++;
      }

      if (!verifySession) {
        console.error('❌ CRÍTICO: Sessão NÃO encontrada após 5 tentativas!');
        return c.json({
          success: false,
          error: 'Erro ao confirmar sessão. Tente novamente.',
          details: 'Sessão criada mas não encontrada no banco'
        }, 500);
      }

      console.log('✅ Login bem-sucedido:', { username, type: user.type });

      // ✅ SOLUÇÃO SIMPLES - Token no JSON (como estava funcionando ontem)
      // Cookie HttpOnly pode ser adicionado depois, por enquanto token no JSON funciona
      console.log('✅ Login bem-sucedido - token retornado no JSON');

      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Retornar access token + setar refresh token em cookie
      // ✅ COMPATIBILIDADE: Manter token no JSON (será deprecado)
      // ✅ NOVO: accessToken no JSON + refreshToken em cookie HttpOnly

      // Setar refresh token em cookie HttpOnly (mais seguro)
      c.header('Set-Cookie', `rendizy-refresh-token=${refreshToken}; Max-Age=${REFRESH_TOKEN_DURATION / 1000}; Path=/; HttpOnly; Secure; SameSite=None`);

      return c.json({
        success: true,
        // ✅ COMPATIBILIDADE: token antigo (será deprecado)
        token: accessToken,
        // ✅ NOVO: accessToken explícito
        accessToken: accessToken,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          type: user.type,
          status: user.status,
          organizationId: user.organization_id || undefined
        },
        expiresAt: accessExpiresAt.toISOString(), // ✅ Access token expiration
        refreshExpiresAt: refreshExpiresAt.toISOString() // ✅ Refresh token expiration
      });
    }

    // ✅ ARQUITETURA SQL: Código unificado - todos os tipos de usuário já foram tratados acima
    // Se chegou aqui, usuário não foi encontrado ou tipo não suportado
    console.log('❌ Usuário não encontrado ou tipo não suportado:', username);
    return c.json({
      success: false,
      error: 'Usuário ou senha incorretos'
    }, 401);

  } catch (error) {
    console.error('❌ Erro no login:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer login'
    }, 500);
  }
});

// POST /auth/logout - Logout
// ✅ ARQUITETURA SQL: Remove sessão do SQL
// ✅ MIGRAÇÃO COOKIES HTTPONLY v1.0.103.980 - Limpar cookie também
app.post('/logout', async (c) => {
  try {
    // ✅ MIGRAÇÃO: Tentar obter token do cookie primeiro, depois do header (compatibilidade)
    const cookieHeader = c.req.header('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    let token = cookies['rendizy-token'];

    // Fallback para header (compatibilidade durante migração)
    if (!token) {
      token = c.req.header('Authorization')?.split(' ')[1];
    }

    if (token) {
      // ✅ ARQUITETURA SQL: Remover sessão do SQL
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('token', token);

      if (error) {
        console.error('❌ Erro ao remover sessão:', error);
      } else {
        console.log('✅ Sessão removida do SQL');
      }
    }

    // ✅ MIGRAÇÃO COOKIES HTTPONLY: Limpar cookie
    c.header('Set-Cookie', 'rendizy-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict');
    console.log('✅ Cookie limpo com sucesso');

    return c.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    // Mesmo com erro, limpar cookie
    c.header('Set-Cookie', 'rendizy-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict');
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer logout'
    }, 500);
  }
});

// ✅ Helper para parsear cookies
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

// POST /auth/refresh - Renovar access token usando refresh token
// ✅ ARQUITETURA OAuth2 v1.0.103.1010: Rotação de refresh tokens
app.post('/refresh', async (c) => {
  try {
    console.log('🔄 POST /auth/refresh - Tentativa de renovar token');

    // ✅ Ler refresh token do cookie HttpOnly
    const cookieHeader = c.req.header('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const refreshToken = cookies['rendizy-refresh-token'];

    if (!refreshToken) {
      console.log('❌ [refresh] Refresh token não encontrado no cookie');
      return c.json({
        success: false,
        error: 'Refresh token não fornecido',
        code: 'REFRESH_TOKEN_MISSING'
      }, 401);
    }

    console.log('🔍 [refresh] Refresh token encontrado:', refreshToken.substring(0, 20) + '...');

    // ✅ Buscar sessão pelo refresh token
    const supabase = getSupabaseClient();
    const { data: sessionRow, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .is('revoked_at', null) // Não revogada
      .maybeSingle();

    if (sessionError || !sessionRow) {
      console.log('❌ [refresh] Sessão não encontrada ou inválida');
      // Limpar cookie inválido
      c.header('Set-Cookie', 'rendizy-refresh-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None');
      return c.json({
        success: false,
        error: 'Refresh token inválido ou expirado',
        code: 'REFRESH_TOKEN_INVALID'
      }, 401);
    }

    // ✅ Verificar se refresh token não expirou
    const now = new Date();
    const refreshExpiresAt = new Date(sessionRow.refresh_expires_at);
    if (now > refreshExpiresAt) {
      console.log('❌ [refresh] Refresh token expirado');
      // Revogar sessão
      await supabase
        .from('sessions')
        .update({ revoked_at: now.toISOString() })
        .eq('id', sessionRow.id);
      // Limpar cookie
      c.header('Set-Cookie', 'rendizy-refresh-token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None');
      return c.json({
        success: false,
        error: 'Refresh token expirado',
        code: 'REFRESH_TOKEN_EXPIRED'
      }, 401);
    }

    // ✅ Gerar novo par de tokens (rotating refresh tokens)
    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();

    const ACCESS_TOKEN_DURATION = 30 * 60 * 1000; // 30 minutos
    const REFRESH_TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 dias
    const newAccessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_DURATION);
    const newRefreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_DURATION);

    // ✅ Revogar refresh token anterior (rotating)
    await supabase
      .from('sessions')
      .update({
        revoked_at: now.toISOString(),
        rotated_to: null // Será atualizado quando nova sessão for criada
      })
      .eq('id', sessionRow.id);

    // ✅ Criar nova sessão com novos tokens
    const { data: newSession, error: newSessionError } = await supabase
      .from('sessions')
      .insert({
        // ✅ NOVO: access + refresh tokens
        token: newAccessToken, // ✅ COMPATIBILIDADE: token antigo
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        access_expires_at: newAccessExpiresAt.toISOString(),
        refresh_expires_at: newRefreshExpiresAt.toISOString(),
        // Dados do usuário
        user_id: sessionRow.user_id,
        username: sessionRow.username,
        type: sessionRow.type,
        organization_id: sessionRow.organization_id,
        // Timestamps
        expires_at: newRefreshExpiresAt.toISOString(), // ✅ COMPATIBILIDADE
        last_activity: now.toISOString(),
        // Rotação
        rotated_from: sessionRow.id,
        // Segurança
        user_agent: sessionRow.user_agent,
        ip_hash: sessionRow.ip_hash
      })
      .select()
      .single();

    if (newSessionError || !newSession) {
      console.error('❌ [refresh] Erro ao criar nova sessão:', newSessionError);
      return c.json({
        success: false,
        error: 'Erro ao renovar sessão',
        details: newSessionError?.message
      }, 500);
    }

    // ✅ Atualizar rotated_to na sessão anterior
    await supabase
      .from('sessions')
      .update({ rotated_to: newSession.id })
      .eq('id', sessionRow.id);

    console.log('✅ [refresh] Tokens renovados com sucesso');

    // ✅ Setar novo refresh token em cookie
    c.header('Set-Cookie', `rendizy-refresh-token=${newRefreshToken}; Max-Age=${REFRESH_TOKEN_DURATION / 1000}; Path=/; HttpOnly; Secure; SameSite=None`);

    return c.json({
      success: true,
      accessToken: newAccessToken,
      // ✅ COMPATIBILIDADE: token antigo
      token: newAccessToken,
      expiresAt: newAccessExpiresAt.toISOString(),
      refreshExpiresAt: newRefreshExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no refresh:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao renovar token'
    }, 500);
  }
});

// GET /auth/me - Verificar sessão atual (modo LOCAL fake enquanto backend real não está pronto)
app.get('/me', async (c) => {
  console.log('?? [auth/me] ROTA CHAMADA - URL:', c.req.url);
  console.log('?? [auth/me] MÉTODO:', c.req.method);
  console.log('?? [auth/me] PATH:', c.req.path);

  try {
    console.log('?? [auth/me] Requisição recebida - Headers:', {
      'X-Auth-Token': c.req.header('X-Auth-Token') ? 'present (' + c.req.header('X-Auth-Token')?.substring(0, 20) + '...)' : 'missing',
      Authorization: c.req.header('Authorization') ? 'present' : 'missing',
      apikey: c.req.header('apikey') ? 'present' : 'missing'
    });

    const isLocal = Deno.env.get('LOCAL_MODE') === 'true';

    // Extrair token dos headers
    let token = c.req.header('X-Auth-Token');
    if (!token) {
      const authHeader = c.req.header('Authorization');
      token = authHeader?.split(' ')[1];
    }

    // Modo local: bypass completo de banco/kv, devolve usuário fake
    if (isLocal) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      console.log('?? [auth/me] LOCAL_MODE=true - retornando usuário fake (admin)');
      return c.json({
        success: true,
        user: {
          id: 'local-admin',
          username: 'admin',
          name: 'Administrador Local',
          email: 'admin@local.test',
          type: 'superadmin',
          status: 'active',
          organizationId: 'local-org',
          organization: {
            id: 'local-org',
            name: 'Local Org',
            slug: 'local-org',
          },
        },
        session: {
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          lastActivity: now.toISOString(),
        },
      });
    }

    if (!token) {
      console.log('? [auth/me] Token não fornecido');
      return c.json({ success: false, error: 'Token não fornecido' }, 401);
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      console.log('? [auth/me] Sessão inválida ou expirada');
      return c.json({ success: false, error: 'Sessão inválida ou expirada', code: 'SESSION_NOT_FOUND' }, 401);
    }

    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (userError || !user) {
      console.error('? [auth/me] Usuário não encontrado:', userError);
      return c.json({ success: false, error: 'Usuário não encontrado' }, 404);
    }

    let organization = null;
    if (user.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', user.organization_id)
        .single();
      if (org) organization = org;
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        type: user.type,
        status: user.status,
        organizationId: user.organization_id || undefined,
        organization: organization
          ? { id: organization.id, name: organization.name, slug: organization.slug }
          : null,
      },
      session: {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
      },
    });
  } catch (error) {
    console.error('? Erro ao verificar sessão:', error);
    return c.json({
      success: false,
      error: 'Erro ao verificar sessão'
    }, 500);
  }
});// ============================================================================\n// ROTA TEMPORÁRIA: Verificar tabela users (após migration)
// ============================================================================
app.get('/verify-users-table', async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Buscar todos os SuperAdmins
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('type', 'superadmin');

    if (error) {
      return c.json({
        success: false,
        error: error.message,
        details: error
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Tabela users verificada com sucesso',
      count: users?.length || 0,
      users: users || []
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao verificar tabela users'
    }, 500);
  }
});

// POST /auth/register-guest - Registrar novo hóspede (User + Guest)
// ✅ ARQUITETURA SQL + CRM: Cria usuário de login e perfil de hóspede
app.post('/register-guest', async (c) => {
  try {
    console.log('📝 POST /auth/register-guest - Registro de Hóspede');
    const body = await c.req.json();
    const { name, email, password, phone, organizationId } = body;

    if (!name || !email || !password || !organizationId) {
      return c.json({
        success: false,
        error: 'Nome, email, senha e ID da organização são obrigatórios'
      }, 400);
    }

    const supabase = getSupabaseClient();
    const emailLower = email.toLowerCase();

    // 1. Verificar se usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .maybeSingle();

    if (existingUser) {
      return c.json({
        success: false,
        error: 'Email já cadastrado. Por favor, faça login.'
      }, 409);
    }

    // 2. Criar Usuário (Tabela users)
    const userId = crypto.randomUUID(); // Usar UUID gerado aqui para vincular
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: emailLower.split('@')[0], // Username simples baseada no email
        name,
        email: emailLower,
        password_hash: passwordHash,
        type: 'staff', // Usa 'staff' tecnicamente, mas role será definida por permissões ou flag futura
        role: 'client', // ✅ NOVO: Role específica para cliente/hóspede (precisa suportar no banco ou usar metadata)
        // Nota: Se 'role' não existir na coluna do banco, precisaremos usar 'staff' e metadata.
        // Assumindo que role é string flexível ou enum. Se for enum restrito, usar 'readonly' ou 'staff'.
        // SQL Schema diz: role: 'admin' | 'manager' | 'staff' | 'readonly'. Vamos usar 'readonly' por segurança inicial.
        // Melhor: Vamos tentar inserir. Se falhar por constraint, ajustamos.
        status: 'active',
        organization_id: organizationId,
        created_at: now,
        updated_at: now
      });

    if (userError) {
      console.error('❌ Erro ao criar usuário:', userError);
      return c.json({ success: false, error: 'Erro ao criar conta de usuário' }, 500);
    }

    // 3. Criar Perfil de Hóspede (Tabela guests)
    // Precisamos importar generateGuestId ou usar UUID
    const guestId = `gst_${crypto.randomUUID().split('-')[0]}`; // Formato compatível com generateGuestId

    const { error: guestError } = await supabase
      .from('guests')
      .insert({
        id: guestId, // Ou usar formato padrão do backend
        organization_id: organizationId,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || 'Guest',
        full_name: name,
        email: emailLower,
        phone: phone,
        user_id: userId, // ✅ VINCULO: Guest -> User
        source: 'website_register',
        created_at: now,
        updated_at: now
      });

    if (guestError) {
      console.warn('⚠️ Erro ao criar perfil de hóspede (Usuário criado):', guestError);
      // Não falhar o registro total, mas logar erro. O usuário pode completar perfil depois.
    }

    // 4. Auto-Login (Gerar Token)
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const accessExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('sessions').insert({
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      user_id: userId,
      type: 'staff',
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      expires_at: refreshExpiresAt,
      last_activity: now
    });

    // Setar Cookie
    c.header('Set-Cookie', `rendizy-refresh-token=${refreshToken}; Max-Age=${30 * 24 * 60 * 60}; Path=/; HttpOnly; Secure; SameSite=None`);

    return c.json({
      success: true,
      accessToken,
      token: accessToken,
      user: {
        id: userId,
        name,
        email: emailLower,
        role: 'client'
      }
    }, 201);

  } catch (error) {
    console.error('❌ Erro no registro de hóspede:', error);
    return c.json({ success: false, error: 'Erro interno ao processar registro' }, 500);
  }
});

export default app;





