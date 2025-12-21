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
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`,
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
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      return { success: false, error: 'Token não encontrado' };
    }

    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: publicAnonKey,
        Authorization: `Bearer ${publicAnonKey}`,
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
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
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
 * Faz logout limpando token local.
 */
export async function logout(): Promise<void> {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch {
    // silencioso
  } finally {
    localStorage.removeItem(STORAGE_KEY);
  }
}
