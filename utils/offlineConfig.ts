/**
 * RENDIZY - Offline Mode Configuration
 * 
 * Controla o modo offline do sistema e fornece verificações
 * para componentes que dependem do backend
 * 
 * @version v1.0.103.171
 * @date 2025-10-31
 */

const OFFLINE_MODE_KEY = 'rendizy_offline_mode';

/**
 * Verifica se o modo offline está ativado
 */
export function isOfflineMode(): boolean {
  // Primeiro verifica a flag manual no localStorage
  const manualOffline = localStorage.getItem(OFFLINE_MODE_KEY);
  if (manualOffline === 'true') {
    return true;
  }
  
  // Também considera offline se o mock backend está ativado
  const mockEnabled = localStorage.getItem('rendizy_mock_enabled');
  return mockEnabled === 'true';
}

/**
 * Ativa/desativa o modo offline
 */
export function setOfflineMode(enabled: boolean): void {
  localStorage.setItem(OFFLINE_MODE_KEY, enabled.toString());
  console.log(enabled ? '📴 Modo offline ATIVADO' : '🌐 Modo offline DESATIVADO');
}

/**
 * Verifica se uma chamada de API deve ser bloqueada no modo offline
 * Retorna true se deve bloquear, false se deve permitir
 */
export function shouldBlockApiCall(endpoint: string): boolean {
  if (!isOfflineMode()) {
    return false;
  }
  
  // Lista de endpoints que são sempre bloqueados em modo offline
  const blockedEndpoints = [
    '/chat/channels/config',
    '/chat/channels/whatsapp/status',
    '/api/chat/findChats',
    '/api/contact/findContacts',
    '/organizations/',
    '/listings/',
    '/settings/global',
    '/health'
  ];
  
  return blockedEndpoints.some(blocked => endpoint.includes(blocked));
}

/**
 * Wrapper para fetch que respeita o modo offline
 * Retorna null se em modo offline e endpoint bloqueado
 */
export async function offlineAwareFetch(
  url: string,
  options?: RequestInit
): Promise<Response | null> {
  const endpoint = url.replace(/^https?:\/\/[^\/]+/, '');
  
  if (shouldBlockApiCall(endpoint)) {
    console.log(`📴 [OFFLINE] Bloqueando chamada para: ${endpoint}`);
    return null;
  }
  
  try {
    return await fetch(url, options);
  } catch (error) {
    if (isOfflineMode()) {
      // Silencia erros em modo offline
      console.log(`📴 [OFFLINE] Erro silenciado para: ${endpoint}`);
      return null;
    }
    throw error;
  }
}

/**
 * Helper para fazer chamadas de API com fallback offline
 */
export async function apiCallWithOfflineFallback<T>(
  fetchFn: () => Promise<T>,
  fallbackValue: T,
  options?: {
    silent?: boolean; // Não loga erros
    logContext?: string; // Contexto para logs
  }
): Promise<T> {
  const { silent = false, logContext = 'API Call' } = options || {};
  
  if (isOfflineMode()) {
    if (!silent) {
      console.log(`📴 [OFFLINE] ${logContext}: retornando fallback`);
    }
    return fallbackValue;
  }
  
  try {
    return await fetchFn();
  } catch (error) {
    if (!silent) {
      console.log(`⚠️ ${logContext} falhou, retornando fallback:`, error);
    }
    return fallbackValue;
  }
}
