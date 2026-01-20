/**
 * VERSION SWITCHER
 * Componente para alternar entre versão atual e versão otimizada
 * Apenas para testes - remover em produção
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Zap } from 'lucide-react';
import { Button } from './ui/button';

export function VersionSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isV2 = location.pathname === '/calendario-v2';
  const isCalendar = location.pathname === '/calendario' || isV2;
  
  if (!isCalendar) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white mb-1">
              {isV2 ? '🧪 Versão Teste' : '📅 Versão Atual'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {isV2 
                ? 'React Query + Context API' 
                : 'useState + Props Drilling'}
            </div>
          </div>
          
          <Button
            size="sm"
            variant={isV2 ? "default" : "outline"}
            onClick={() => navigate(isV2 ? '/calendario' : '/calendario-v2')}
            className="gap-2"
            key={`version-switcher-btn-${isV2 ? 'v2' : 'v1'}`}
          >
            {isV2 ? (
              <>
                <Sparkles key="icon-sparkles" className="h-4 w-4" />
                Ver Atual
              </>
            ) : (
              <>
                <Zap key="icon-zap" className="h-4 w-4" />
                Testar V2
              </>
            )}
          </Button>
        </div>
        
        {isV2 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>✅ Cache inteligente (5min)</div>
              <div>✅ Estado centralizado</div>
              <div>✅ Queries otimizadas</div>
              <div className="text-blue-600 dark:text-blue-400 font-medium mt-2">
                Pressione Shift+Ctrl+Q para DevTools
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
