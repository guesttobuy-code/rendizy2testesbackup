/**
 * Sistema de Modo Offline Completo
 * Permite trabalhar sem backend ativo
 */

import { toast } from 'sonner';

interface OfflineStatus {
  isOffline: boolean;
  lastCheck: Date;
  reason: string;
}

// Estado global do modo offline
let offlineStatus: OfflineStatus = {
  isOffline: false,
  lastCheck: new Date(),
  reason: ''
};

// Listeners para mudanças no status
const statusListeners: ((status: OfflineStatus) => void)[] = [];

/**
 * Define o modo offline
 */
export function setOfflineMode(reason: string) {
  const wasOffline = offlineStatus.isOffline;
  
  offlineStatus = {
    isOffline: true,
    lastCheck: new Date(),
    reason
  };
  
  // Se mudou para offline, notificar
  if (!wasOffline) {
    console.warn('🔌 MODO OFFLINE ATIVADO:', reason);
    
    toast.warning('Modo Offline Ativado', {
      description: 'Trabalhando com dados locais. Alterações serão perdidas.',
      duration: 10000,
      action: {
        label: 'Entendi',
        onClick: () => {}
      }
    });
    
    // Notificar listeners
    notifyListeners();
  }
  
  // Salvar no localStorage
  localStorage.setItem('offlineMode', JSON.stringify(offlineStatus));
}

/**
 * Define o modo online
 */
export function setOnlineMode() {
  const wasOffline = offlineStatus.isOffline;
  
  offlineStatus = {
    isOffline: false,
    lastCheck: new Date(),
    reason: ''
  };
  
  // Se mudou para online, notificar
  if (wasOffline) {
    console.log('🌐 MODO ONLINE RESTAURADO');
    
    toast.success('Conexão Restaurada', {
      description: 'Backend está online. Recarregue para ver dados atuais.',
      duration: 5000,
      action: {
        label: 'Recarregar',
        onClick: () => window.location.reload()
      }
    });
    
    // Notificar listeners
    notifyListeners();
  }
  
  // Limpar localStorage
  localStorage.removeItem('offlineMode');
}

/**
 * Verifica se está em modo offline
 */
export function isOffline(): boolean {
  return offlineStatus.isOffline;
}

/**
 * Retorna o status completo
 */
export function getOfflineStatus(): OfflineStatus {
  return { ...offlineStatus };
}

/**
 * Adiciona um listener para mudanças de status
 */
export function onOfflineStatusChange(callback: (status: OfflineStatus) => void) {
  statusListeners.push(callback);
  
  // Retorna função para remover o listener
  return () => {
    const index = statusListeners.indexOf(callback);
    if (index > -1) {
      statusListeners.splice(index, 1);
    }
  };
}

/**
 * Notifica todos os listeners
 */
function notifyListeners() {
  statusListeners.forEach(listener => {
    try {
      listener(offlineStatus);
    } catch (error) {
      console.error('Erro ao notificar listener:', error);
    }
  });
}

/**
 * Restaura status do localStorage ao carregar
 */
export function restoreOfflineStatus() {
  try {
    const saved = localStorage.getItem('offlineMode');
    if (saved) {
      const parsed = JSON.parse(saved);
      offlineStatus = {
        ...parsed,
        lastCheck: new Date(parsed.lastCheck)
      };
      
      console.log('📱 Status offline restaurado:', offlineStatus);
    }
  } catch (error) {
    console.error('Erro ao restaurar status offline:', error);
  }
}

/**
 * Mostra banner de modo offline
 */
export function showOfflineBanner() {
  if (!offlineStatus.isOffline) return;
  
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.className = 'fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg';
  banner.innerHTML = `
    <div class="flex items-center justify-center gap-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"></path>
      </svg>
      <span>MODO OFFLINE - Trabalhando com dados locais</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 underline">
        Fechar
      </button>
    </div>
  `;
  
  // Remover banner anterior se existir
  const existing = document.getElementById('offline-banner');
  if (existing) {
    existing.remove();
  }
  
  document.body.prepend(banner);
}

/**
 * Tenta reconectar ao backend
 */
export async function tryReconnect(
  testUrl: string,
  token: string
): Promise<boolean> {
  try {
    console.log('🔄 Tentando reconectar ao backend...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      console.log('✅ Reconexão bem-sucedida!');
      setOnlineMode();
      return true;
    } else {
      console.warn('⚠️ Backend respondeu mas com erro:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Reconexão falhou:', error);
    return false;
  }
}

// Restaurar status ao carregar módulo
restoreOfflineStatus();
