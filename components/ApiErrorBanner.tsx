import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';

interface ApiErrorBannerProps {
  onDismiss?: () => void;
}

export function ApiErrorBanner({ onDismiss }: ApiErrorBannerProps) {
  console.log('🟣 ApiErrorBanner renderizado');
  
  const handleReset = () => {
    console.log('🔄 Resetando dados COMPLETO...');
    
    // Limpar TODOS os dados do localStorage relacionados ao app
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('rendizy') || key.includes('mock') || key.includes('data'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('🗑️ Removendo:', key);
      localStorage.removeItem(key);
    });
    
    // Limpar também sessionStorage
    sessionStorage.clear();
    
    console.log('✅ Todos os dados limpos. Recarregando...');
    
    // Força reload com bypass de cache
    window.location.href = window.location.href.split('?')[0] + '?reset=' + Date.now();
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl border-b-4 border-purple-900 animate-in slide-in-from-top duration-300">
      <div className="max-w-full mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Erro de sincronização detectado
              </p>
              <p className="text-xs text-purple-100 mt-0.5">
                Os dados podem estar inconsistentes. Clique em "Resetar Dados" para resolver.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleReset}
              size="sm"
              className="bg-white text-purple-700 hover:bg-purple-50 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Resetar Dados
            </Button>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-purple-600 rounded transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
