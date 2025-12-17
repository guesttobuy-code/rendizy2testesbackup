import { AlertTriangle, Code2, Rocket } from 'lucide-react';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

export function EnvironmentBadge() {
  // Detectar ambiente (proteção contra import.meta.env undefined)
  const environment = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENVIRONMENT) || 'development';
  const isDev = environment === 'development';
  const isStaging = environment === 'staging';
  const isProd = environment === 'production';
  
  // Detectar modo mock (proteção contra localStorage e import.meta.env undefined)
  const useMockData = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK_DATA === 'true') || 
                      (typeof localStorage !== 'undefined' && localStorage.getItem('rendizy_use_mock_data') === 'true') ||
                      (typeof localStorage !== 'undefined' && localStorage.getItem('rendizy_dev_mode') === 'true');

  // Se produção e não está usando mock, não mostrar nada
  if (isProd && !useMockData) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Badge do ambiente */}
      {isDev && (
        <Alert className="bg-yellow-50 border-yellow-300">
          <Code2 className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-800">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                🧪 DESENVOLVIMENTO
              </Badge>
              <span className="text-xs">
                Dados são fictícios
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isStaging && (
        <Alert className="bg-orange-50 border-orange-300">
          <AlertTriangle className="h-4 w-4 text-orange-700" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                🚧 STAGING
              </Badge>
              <span className="text-xs">
                Pré-produção - Não use dados reais
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Badge de modo mock (se ativado em produção) */}
      {useMockData && isProd && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                ⚠️ MODO TESTE ATIVADO
              </Badge>
              <span className="text-xs">
                Usando dados mock em produção!
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Informações extras em dev */}
      {isDev && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Ambiente:</span>
            <span className="font-mono">{environment}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Mock Data:</span>
            <span className="font-mono">{useMockData ? 'Sim' : 'Não'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">URL:</span>
            <span className="font-mono text-[10px]">{typeof window !== 'undefined' ? window.location.host : 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook para detectar ambiente
export function useEnvironment() {
  const environment = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENVIRONMENT) || 'development';
  const isDevelopment = environment === 'development';
  const isStaging = environment === 'staging';
  const isProduction = environment === 'production';
  
  const useMockData = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK_DATA === 'true') || 
                      (typeof localStorage !== 'undefined' && localStorage.getItem('rendizy_use_mock_data') === 'true') ||
                      (typeof localStorage !== 'undefined' && localStorage.getItem('rendizy_dev_mode') === 'true');

  const isTestMode = isDevelopment || isStaging || useMockData;

  return {
    environment,
    isDevelopment,
    isStaging,
    isProduction,
    useMockData,
    isTestMode,
    canUseRealData: isProduction && !useMockData,
    shouldPreventRealEmails: isTestMode,
    shouldPreventRealPayments: isTestMode
  };
}
