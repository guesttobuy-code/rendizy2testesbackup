/**
 * RENDIZY - Deploy Backend Banner
 * Banner informativo sobre o deploy do backend
 * 
 * @version 1.0.103.181
 * @date 2025-10-31
 */

import { Info, Server, X } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

export function DeployBackendBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    // Verificar se o banner já foi fechado nesta sessão
    return !sessionStorage.getItem('deploy-backend-banner-dismissed');
  });

  const handleDismiss = () => {
    sessionStorage.setItem('deploy-backend-banner-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Server className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
              <Info className="h-4 w-4" />
              Backend Pronto para Deploy
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                O sistema está usando <strong>dados mockados temporários</strong> (6 tipos de Local + 7 tipos de Anúncio).
              </p>
              <p>
                Para habilitar <strong className="text-blue-600 dark:text-blue-400">50+ tipos reais</strong> e todas as funcionalidades do backend:
              </p>
              <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900 rounded-md font-mono text-sm">
                <code className="text-blue-900 dark:text-blue-100">./DEPLOY_BACKEND_NOW.sh</code>
              </div>
              <p className="text-sm mt-2">
                <strong>Tempo estimado:</strong> 3-5 minutos • <strong>Documentação:</strong> START_HERE_v1.0.103.181.md
              </p>
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
