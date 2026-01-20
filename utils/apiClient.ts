/**
 * API Client com Interceptador 401
 * ✅ ARQUITETURA OAuth2 v1.0.103.1010: Refresh automático em 401
 * 
 * Intercepta requisições 401 e tenta refresh automático do token
 */

import { API_BASE_URL } from './apiBase';
import { refreshToken } from '../services/authService';

const API_BASE = API_BASE_URL;

interface RequestOptions extends RequestInit {
  skipAuth?: boolean; // Pular autenticação para rotas públicas
  retryCount?: number; // Contador de retries (interno)
}

/**
 * Cliente HTTP com interceptador 401
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, retryCount = 0, ...fetchOptions } = options;
  
  // ✅ Obter token do localStorage
  const token = localStorage.getItem('rendizy-token');
  
  // ✅ Preparar headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as HeadersInit)
  };
  
  // ✅ Adicionar token se disponível e não for rota pública
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // ✅ Fazer requisição
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include' // ✅ Importante para cookies HttpOnly
  });
  
  // ✅ Interceptar 401 e tentar refresh
  if (response.status === 401 && !skipAuth && retryCount === 0) {
    console.log('🔄 [apiClient] 401 detectado - tentando refresh...');
    
    // ✅ Tentar refresh
    const refreshResult = await refreshToken();
    
    if (refreshResult.success && refreshResult.accessToken) {
      // ✅ Retry com novo token
      const newToken = refreshResult.accessToken || refreshResult.token;
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        console.log('✅ [apiClient] Token renovado - retentando requisição...');
        
        // ✅ Retry com novo token
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...fetchOptions,
          headers,
          credentials: 'include'
        });
        
        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      }
    }
    
    // ✅ Se refresh falhou, limpar token e lançar erro
    console.error('❌ [apiClient] Refresh falhou - limpando token');
    localStorage.removeItem('rendizy-token');
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
  
  // ✅ Verificar se resposta é OK
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    
    throw new Error(errorData.error || errorData.message || `Erro HTTP ${response.status}`);
  }
  
  // ✅ Retornar dados
  return await response.json();
}

/**
 * Helpers para métodos HTTP
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' })
};
