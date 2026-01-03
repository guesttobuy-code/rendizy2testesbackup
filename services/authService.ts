/**
 * Serviço de Autenticação
 * ARQUITETURA OAuth2 v1.0.103.1010: Access/Refresh Tokens
 *
 * Fluxo simplificado: login, refresh, me, logout.
 * Retorno normalizado: { success, token, user, error? }.
 */


import { publicAnonKey } from '../utils/supabase/info';
import { API_BASE_URL } from '../utils/apiBase';

console.log(`[AuthService] API_BASE: ${API_BASE_URL}`);
console.log(`[AuthService] Anon Key: ${publicAnonKey ? '✅ Configurada' : '❌ FALTANDO'}`);

const API_BASE = API_BASE_URL;
const STORAGE_KEY = 'rendizy-token';

function normalizeSupabaseAnonKey(key: string): string {
  return (key || '').trim().replace(/^Bearer\s+/i, '');
}

function isProbablyJwt(token: string): boolean {
  // Supabase anon/service keys are JWT-like: <header>.<payload>.<signature>
  const parts = token.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function decodeJwtPayload(token: string): any | null {
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;

    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getSupabaseGatewayHeaders(): Record<string, string> {
  const anonKey = normalizeSupabaseAnonKey(publicAnonKey);

  if (!anonKey) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY não configurada. Configure a anon key do projeto odcgnzfremrqnvtitpcc.'
    );
  }

  if (/^<.*>$/.test(anonKey)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY está com placeholder (ex.: <SUPABASE_ANON_KEY>). Substitua pelo valor real do Supabase (Settings → API → anon public key).'
    );
  }

  if (!isProbablyJwt(anonKey)) {
    const dotCount = (anonKey.match(/\./g) || []).length;
    throw new Error(
      `VITE_SUPABASE_ANON_KEY inválida (não parece um JWT). Dica: ela deve ser um token no formato aaa.bbb.ccc (dots=${dotCount}). Cole a anon public key do Supabase (Settings → API) do projeto odcgnzfremrqnvtitpcc.`
    );
  }

  const payload = decodeJwtPayload(anonKey);
  if (payload?.role === 'service_role') {
    throw new Error(
      'Você colou uma SERVICE_ROLE_KEY no frontend. Isso é inseguro. Use a anon public key no VITE_SUPABASE_ANON_KEY e deixe a service role apenas em Supabase secrets (Edge Functions) ou ambiente de backend.'
    );
  }

  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
}

export interface LoginResponse {
  success: boolean;
  accessToken?: string;
  token?: string; // compat: token antigo
  user?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
    type?: string;
    status?: string;
    organizationId?: string;
  };
  expiresAt?: string;
  refreshExpiresAt?: string;
  error?: string;
}

export interface RefreshResponse {
  success: boolean;
  accessToken?: string;
  token?: string; // compat
  expiresAt?: string;
  refreshExpiresAt?: string;
  error?: string;
}

export interface UserResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    name?: string;
    email?: string;
    type?: string;
    status?: string;
    organizationId?: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}

export interface PasswordRecoveryRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  data?: {
    requestId?: string;
    expiresAt?: string;
    recoveryToken?: string;
    recoveryCode?: string;
    organizationId?: string;
    organizationName?: string;
    organizationSlug?: string;
  };
}

export interface PasswordRecoveryConfirmResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * Normaliza objeto retornado pelo backend (aceita data em raiz ou em data.data).
 */
function normalizeLogin(data: any): LoginResponse {
  const token =
    data?.accessToken ||
    data?.token ||
    data?.data?.accessToken ||
    data?.data?.token;

  const user = data?.user || data?.data?.user;

  return {
    success: !!data?.success,
    accessToken: token,
    token,
    user,
    error: data?.error || data?.message,
  };
}

/**
 * Faz login e retorna access token normalizado.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  console.log('🔐 [authService.login] Iniciando login...', { username, API_BASE });
  try {
    const gatewayHeaders = getSupabaseGatewayHeaders();
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...gatewayHeaders,
      },
      body: JSON.stringify({ username, password }),
    });
    console.log('🔍 [authService.login] Response status:', response.status);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return {
        success: false,
        error: `Erro HTTP ${response.status}: ${text.substring(0, 120)}`,
      };
    }

    const raw = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: raw?.error || raw?.message || `Erro HTTP ${response.status}`,
      };
    }

    const parsed = normalizeLogin(raw);
    console.log('🔍 [authService.login] Parsed result:', { success: parsed.success, hasToken: !!parsed.token, hasUser: !!parsed.user });
    if (parsed.success && parsed.token) {
      localStorage.setItem(STORAGE_KEY, parsed.token);
      console.log('✅ [authService.login] Token salvo no localStorage');
    }
    return parsed;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao fazer login',
    };
  }
}

/**
 * Renova access token.
 */
export async function refreshToken(): Promise<RefreshResponse> {
  try {
    const gatewayHeaders = getSupabaseGatewayHeaders();
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...gatewayHeaders,
      },
    });
    const data = await response.json();

    const token = data?.accessToken || data?.token;
    if (data?.success && token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else if (!data?.success) {
      localStorage.removeItem(STORAGE_KEY);
    }

    return {
      success: !!data?.success,
      accessToken: token,
      token,
      expiresAt: data?.expiresAt,
      refreshExpiresAt: data?.refreshExpiresAt,
      error: data?.error,
    };
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao renovar token',
    };
  }
}

/**
 * Busca dados do usuário atual via /auth/me.
 */
export async function getCurrentUser(): Promise<UserResponse> {
  try {
    const gatewayHeaders = getSupabaseGatewayHeaders();
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      return { success: false, error: 'Token não encontrado' };
    }

    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...gatewayHeaders,
        'X-Auth-Token': token,
      },
    });

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed.success && (refreshed.accessToken || refreshed.token)) {
        const newToken = refreshed.accessToken || refreshed.token;
        const retry = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...gatewayHeaders,
            'X-Auth-Token': newToken || '',
          },
        });
        if (retry.ok) {
          return await retry.json();
        }
      }
      localStorage.removeItem(STORAGE_KEY);
      return { success: false, error: 'Sessão expirada' };
    }

    if (!response.ok) {
      return { success: false, error: 'Erro ao buscar usuário' };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar usuário',
    };
  }
}

/**
 * Solicita recuperação de senha por e-mail.
 * Em DEV (localhost), pode passar debug=true para receber token/código na resposta.
 */
export async function requestPasswordRecovery(email: string, debug = false): Promise<PasswordRecoveryRequestResponse> {
  try {
    const gatewayHeaders = getSupabaseGatewayHeaders();
    const response = await fetch(`${API_BASE}/auth/recovery/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...gatewayHeaders,
        ...(debug ? { 'X-Recovery-Debug': '1' } : {}),
      },
      body: JSON.stringify({ email }),
    });

    const contentType = response.headers.get('content-type') || '';
    const raw = contentType.includes('application/json') ? await response.json() : { success: false, error: await response.text() };

    if (!response.ok) {
      return {
        success: false,
        error: raw?.error || raw?.message || `Erro HTTP ${response.status}`,
        code: raw?.code,
        data: raw?.data,
      };
    }

    return {
      success: !!raw?.success,
      message: raw?.message,
      data: raw?.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao solicitar recuperação de senha',
    };
  }
}

/**
 * Confirma recuperação usando token + código e define nova senha.
 */
export async function confirmPasswordRecovery(params: { token: string; code: string; newPassword: string }): Promise<PasswordRecoveryConfirmResponse> {
  try {
    const gatewayHeaders = getSupabaseGatewayHeaders();
    const response = await fetch(`${API_BASE}/auth/recovery/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...gatewayHeaders,
      },
      body: JSON.stringify(params),
    });

    const contentType = response.headers.get('content-type') || '';
    const raw = contentType.includes('application/json') ? await response.json() : { success: false, error: await response.text() };

    if (!response.ok) {
      return {
        success: false,
        error: raw?.error || raw?.message || `Erro HTTP ${response.status}`,
        code: raw?.code,
      };
    }

    return {
      success: !!raw?.success,
      message: raw?.message,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao confirmar recuperação de senha',
    };
  }
}

/**
 * Faz logout limpando token local.
 */
export async function logout(): Promise<void> {
  console.log('🚪 [AuthService] Iniciando logout...');
  
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    console.log(`🔍 [AuthService] Token encontrado: ${token ? 'SIM' : 'NÃO'}`);
    
    if (token) {
      console.log(`📡 [AuthService] Chamando ${API_BASE}/auth/logout...`);
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-Auth-Token': token, // ✅ Token do usuário no header customizado
          'Content-Type': 'application/json',
        },
        credentials: 'omit' // ✅ Não enviar credentials (CORS)
      });
      
      console.log(`📡 [AuthService] Resposta do logout: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.warn(`⚠️ [AuthService] Logout no servidor falhou: ${text}`);
      } else {
        console.log('✅ [AuthService] Logout no servidor bem-sucedido');
      }
    }
  } catch (error) {
    console.error('❌ [AuthService] Erro ao fazer logout no servidor:', error);
    // silencioso - continua limpando token local
  } finally {
    console.log('🗑️ [AuthService] Removendo token do localStorage...');
    localStorage.removeItem(STORAGE_KEY);
    
    // Verificar se realmente foi removido
    const stillThere = localStorage.getItem(STORAGE_KEY);
    if (stillThere) {
      console.error('❌ [AuthService] ERRO: Token ainda está no localStorage!');
    } else {
      console.log('✅ [AuthService] Token removido com sucesso do localStorage');
    }
  }
  
  console.log('✅ [AuthService] Logout concluído');
}
