/**
 * RENDIZY - 404 Not Found Page
 * 
 * Página de erro 404 com múltiplas opções de retorno
 * SEMPRE renderiza com botões de emergência
 * 
 * @version 1.0.103.152
 * @date 2025-10-31
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <AlertCircle className="h-24 w-24 text-red-500 animate-pulse" />
              <div className="absolute inset-0 h-24 w-24 bg-red-500/20 rounded-full blur-xl animate-pulse" />
            </div>
          </div>
          
          <div>
            <CardTitle className="text-4xl font-bold mb-2">
              404 - Página Não Encontrada
            </CardTitle>
            <CardDescription className="text-lg">
              A página que você está procurando não existe ou foi movida.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informações da rota */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Rota solicitada:
            </p>
            <code className="text-sm font-mono text-red-600 dark:text-red-400 break-all">
              {location.pathname}
            </code>
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleGoHome}
              size="lg"
              className="gap-2 h-14"
            >
              <Home className="h-5 w-5" />
              Ir para Dashboard
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              size="lg"
              className="gap-2 h-14"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </Button>

            <Button
              onClick={() => navigate('/properties')}
              variant="outline"
              size="lg"
              className="gap-2 h-14"
            >
              <Search className="h-5 w-5" />
              Gestão de Imóveis
            </Button>

            <Button
              onClick={handleReload}
              variant="outline"
              size="lg"
              className="gap-2 h-14"
            >
              <RefreshCw className="h-5 w-5" />
              Recarregar Página
            </Button>
          </div>

          {/* Mensagem de ajuda */}
          <div className="border-t pt-6">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Se você continua vendo esta página, tente:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>Limpar o cache do navegador (Ctrl + Shift + R)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>Verificar se a URL está correta</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>Usar o menu de navegação à esquerda</span>
              </li>
            </ul>
          </div>

          {/* Atalho de emergência */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🚨 Atalho de Emergência
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
              Se nada funcionar, abra o console (F12) e digite:
            </p>
            <code className="block bg-gray-900 text-green-400 p-3 rounded text-xs font-mono">
              window.location.href = '/'
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
