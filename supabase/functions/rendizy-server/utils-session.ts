/**

 * UTILS - Session Helpers

 * 

 * Helpers para gerenciamento de sessões de autenticação

 * ✅ ARQUITETURA SQL v1.0.103.951 - Busca e remove sessões da tabela sessions do SQL

 * 

 * @version 1.0.103.951

 * @updated 2025-11-20 - Migrado para tabela sessions do SQL (getSessionFromToken e removeSession)

 */



import { getSupabaseClient } from './kv_store.tsx';



/**

 * Interface Session (compatível com routes-auth.ts)

 */

export interface Session {

  id: string;

  userId: string;

  username: string;

  type: 'superadmin' | 'imobiliaria';

  imobiliariaId?: string;

  createdAt: string;

  expiresAt: string;

  lastActivity: string;

}



/**

 * Interface SessionRow - Estrutura da sessão no banco SQL

 * ✅ ARQUITETURA OAuth2 v1.0.103.1010: Suporte a access/refresh tokens

 */

interface SessionRow {

  id: string;

  token: string; // ✅ COMPATIBILIDADE: token antigo

  access_token: string | null; // ✅ NOVO: access token

  refresh_token: string | null; // ✅ NOVO: refresh token

  access_expires_at: string | null; // ✅ NOVO: expiração do access token

  refresh_expires_at: string | null; // ✅ NOVO: expiração do refresh token

  user_id: string;

  username: string;

  type: string;

  organization_id: string | null;

  created_at: string;

  expires_at: string; // ✅ COMPATIBILIDADE: expires_at antigo

  last_activity: string | null;

  revoked_at: string | null; // ✅ NOVO: data de revogação

  rotated_from: string | null; // ✅ NOVO: sessão anterior (rotação)

  rotated_to: string | null; // ✅ NOVO: sessão seguinte (rotação)

}



/**

 * Busca sessão a partir do token

 * ✅ ARQUITETURA SQL v1.0.103.950 - Busca da tabela sessions do SQL

 * 

 * @param token - Token de autenticação

 * @returns Promise<Session | null> - Sessão válida ou null se inválida/expirada

 */
export async function getSessionFromToken(token: string | undefined): Promise<Session | null> {
  if (!token) {
    return null;
  }

  // MODO LOCAL: bypass completo de sessão para desenvolvimento offline
  if (Deno.env.get('LOCAL_MODE') === 'true') {
    return {
      id: 'local-session',
      userId: 'local-admin',
      username: 'admin',
      type: 'superadmin',
      imobiliariaId: undefined,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastActivity: new Date().toISOString(),
    };
  }
// ✅ CORREÇÃO CRÍTICA: Tokens legados (ex.: "micjk8ts_qffa7w735o_...") tinham ~30 caracteres e não existem mais

  // na tabela SQL. Para evitar consultas inúteis e 401 repetidos, considere-os inválidos.

  // O novo token tem 128 caracteres. Usar 80 como limite de segurança.

  if (token.length < 80) {

    console.warn(`⚠️ [getSessionFromToken] Token muito curto (${token.length} chars). Ignorando e solicitando novo login.`);

    return null;

  }



  try {

    // ✅ ARQUITETURA SQL: Buscar sessão da tabela sessions do SQL

    console.log(`🔍 [getSessionFromToken] Buscando sessão na tabela SQL com token: ${token.substring(0, 20)}...`);

    console.log(`🔍 [getSessionFromToken] Token completo (primeiros 50 chars): ${token.substring(0, 50)}...`);

    console.log(`🔍 [getSessionFromToken] Token length: ${token.length}`);

    

    const client = getSupabaseClient();

    

    // ✅ DEBUG: Verificar se há alguma sessão na tabela (para debug)

    const { data: allSessions, error: debugError } = await client

      .from('sessions')

      .select('token, created_at, expires_at')

      .limit(5)

      .order('created_at', { ascending: false });

    

    if (!debugError && allSessions) {

      console.log(`🔍 [getSessionFromToken] Total de sessões no banco: ${allSessions.length}`);

      console.log(`🔍 [getSessionFromToken] Últimas sessões (tokens):`, allSessions.map(s => ({

        token: s.token?.substring(0, 30) + '...',

        created: s.created_at,

        expires: s.expires_at

      })));

    }

    

    // ✅ IMPORTANTE: SERVICE_ROLE_KEY não valida JWT - query direta na tabela

    // ✅ TENTATIVAS MÚLTIPLAS: Tentar buscar sessão até 3 vezes (pode haver delay de replicação)

    let sessionRow: SessionRow | null = null;

    let sessionError: { code?: string; message?: string } | null = null;

    let attempts = 0;

    

    while (attempts < 3 && !sessionRow) {

      // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Buscar por access_token OU token (compatibilidade)

      const result = await client

        .from('sessions')

        .select('*')

        .or(`token.eq.${token},access_token.eq.${token}`) // ✅ Buscar por token antigo OU access_token

        .is('revoked_at', null) // ✅ Não revogada

        .order('created_at', { ascending: false })

        .limit(1)

        .maybeSingle();

      

      sessionRow = result.data;

      sessionError = result.error;

      

      if (sessionRow) {

        console.log(`✅ [getSessionFromToken] Sessão encontrada na tentativa ${attempts + 1}`);

        break;

      }

      

      if (sessionError) {

        console.error(`❌ [getSessionFromToken] Erro na tentativa ${attempts + 1}:`, sessionError);

        break; // Se há erro, não adianta tentar novamente

      }

      

      if (attempts < 2) {

        console.warn(`⚠️ [getSessionFromToken] Sessão não encontrada, tentando novamente... (${attempts + 1}/3)`);

        await new Promise(resolve => setTimeout(resolve, 300)); // Aguardar 300ms

      }

      

      attempts++;

    }



    console.log(`🔍 [getSessionFromToken] Query result:`, {

      hasSession: !!sessionRow,

      hasError: !!sessionError,

      errorCode: sessionError?.code,

      errorMessage: sessionError?.message,

      attempts: attempts + 1

    });



    if (sessionError || !sessionRow) {

      console.log('⚠️ [getSessionFromToken] Sessão não encontrada na tabela SQL');

      console.log('⚠️ [getSessionFromToken] Token usado na busca:', token.substring(0, 50) + '...');

      

      // ✅ Se erro for "Invalid JWT", pode ser que Supabase esteja validando automaticamente

      if (sessionError?.message?.includes('JWT') || sessionError?.message?.includes('jwt') || sessionError?.code === 'PGRST301') {

        console.error('❌ [getSessionFromToken] ERRO: Supabase retornou erro JWT (não deveria com SERVICE_ROLE_KEY)');

      }

      

      return null;

    }



    // ✅ ARQUITETURA OAuth2 v1.0.103.1010: Verificar expiração do access token

    const now = new Date();

    

    // ✅ Se tem access_expires_at, verificar access token (mais restritivo)

    if (sessionRow.access_expires_at) {

      const accessExpiresAt = new Date(sessionRow.access_expires_at);

      if (now > accessExpiresAt) {

        console.log('⚠️ [getSessionFromToken] Access token expirado (mas refresh token pode estar válido)');

        // ✅ Retornar null para forçar refresh no frontend

        return null;

      }

    } else {

      // ✅ COMPATIBILIDADE: Verificar expires_at antigo

      const expiresAt = new Date(sessionRow.expires_at);

      if (now > expiresAt) {

        console.log('⚠️ [getSessionFromToken] Sessão expirada');

        return null;

      }

    }



    // ✅ SLIDING EXPIRATION: Atualizar last_activity e estender expires_at se usuário está ativo

    const INACTIVITY_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 dias de inatividade

    const lastActivity = new Date(sessionRow.last_activity || sessionRow.created_at);

    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

    

    // Se usuário está ativo (última atividade há menos de 7 dias), estender sessão

    if (timeSinceLastActivity < INACTIVITY_THRESHOLD) {

      const newExpiresAt = new Date(now.getTime() + INACTIVITY_THRESHOLD);

      

      // Atualizar last_activity e expires_at no banco (silenciosamente, não bloquear se falhar)

      client

        .from('sessions')

        .update({

          last_activity: now.toISOString(),

          expires_at: newExpiresAt.toISOString()

        })

        .eq('token', token)

        .then(({ error }) => {

          if (error) {

            console.warn('⚠️ [getSessionFromToken] Erro ao atualizar sessão (não crítico):', error);

          } else {

            console.log('✅ [getSessionFromToken] Sessão estendida automaticamente');

          }

        })

        .catch(err => {

          console.warn('⚠️ [getSessionFromToken] Erro ao atualizar sessão (não crítico):', err);

        });

    }



    // ✅ Buscar dados do usuário para montar Session

    const { data: user, error: userError } = await client

      .from('users')

      .select('id, username, type, organization_id')

      .eq('id', sessionRow.user_id)

      .maybeSingle();



    if (userError || !user) {

      console.error('❌ [getSessionFromToken] Erro ao buscar usuário:', userError);

      return null;

    }



    // ✅ Montar Session compatível com interface (usar valores atualizados se foram atualizados)

    const session: Session = {

      id: sessionRow.id,

      userId: sessionRow.user_id,

      username: user.username,

      type: user.type === 'superadmin' ? 'superadmin' : 'imobiliaria',

      imobiliariaId: user.organization_id || undefined,

      createdAt: sessionRow.created_at,

      expiresAt: timeSinceLastActivity < INACTIVITY_THRESHOLD 

        ? new Date(now.getTime() + INACTIVITY_THRESHOLD).toISOString()

        : sessionRow.expires_at,

      lastActivity: now.toISOString()

    };



    console.log(`✅ [getSessionFromToken] Sessão válida encontrada no SQL: ${session.username}`);

    return session;

  } catch (error) {

    console.error('❌ [getSessionFromToken] Erro ao buscar sessão:', error);

    return null;

  }

}



/**

 * Remove sessão do SQL (logout)

 * ✅ ARQUITETURA SQL v1.0.103.950 - Remove sessão da tabela sessions do SQL

 * 

 * @param token - Token de autenticação

 * @returns Promise<boolean> - true se removida com sucesso

 */

export async function removeSession(token: string | undefined): Promise<boolean> {

  if (!token) {

    return false;

  }



  try {

    // ✅ ARQUITETURA SQL: Remover sessão da tabela sessions do SQL

    console.log(`🔍 [removeSession] Removendo sessão do SQL com token: ${token.substring(0, 20)}...`);

    

    const client = getSupabaseClient();

    const { error } = await client

      .from('sessions')

      .delete()

      .eq('token', token);



    if (error) {

      console.error('❌ [removeSession] Erro ao remover sessão do SQL:', error);

      return false;

    }



    console.log('✅ [removeSession] Sessão removida do SQL com sucesso');

    return true;

  } catch (error) {

    console.error('❌ [removeSession] Erro ao remover sessão:', error);

    return false;

  }

}















