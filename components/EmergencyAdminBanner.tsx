/**
 * RENDIZY - Emergency Admin Banner
 * 
 * Faixa fixa de emergência no topo com acesso direto ao Admin Master
 * Funciona SEMPRE, mesmo se React Router travar ou cair em NotFound
 * 
 * @version 1.0.103.203
 * @date 2025-10-31
 */

import React, { useState, useEffect } from 'react';
import { Crown, AlertTriangle, Home, X, FlaskConical, Rocket } from 'lucide-react';
import { Button } from './ui/button';

export function EmergencyAdminBanner() {
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Detectar modo atual
  useEffect(() => {
    const devMode = localStorage.getItem('rendizy_dev_mode') === 'true' ||
                    localStorage.getItem('rendizy_use_mock_data') === 'true';
    setIsDevMode(devMode);
  }, []);

  const forceNavigateTo = (path: string) => {
    console.log(`🚨 EMERGENCY NAVIGATION: Forçando navegação para ${path}`);
    
    // Usar window.location.href para GARANTIR navegação
    // Funciona mesmo se React Router estiver travado
    window.location.href = path;
  };

  const activateTestMode = () => {
    console.log('🧪 Ativando Ambiente de Testes (Dados Mock)');
    localStorage.setItem('rendizy_dev_mode', 'true');
    localStorage.setItem('rendizy_use_mock_data', 'true');
    
    // Navegar para o Dashboard antes de recarregar
    // Isso garante que não fique em página 404
    window.location.href = '/';
  };

  const activateProdMode = () => {
    console.log('🚀 Ativando Ambiente de Produção (Dados Reais)');
    localStorage.removeItem('rendizy_dev_mode');
    localStorage.removeItem('rendizy_use_mock_data');
    
    // Navegar para o Dashboard antes de recarregar
    // Isso garante que não fique em página 404
    window.location.href = '/';
  };

  if (!visible) {
    // Botão pequeno para reabrir - posicionado à ESQUERDA para não sobrepor outros elementos
    return (
      <div className="fixed top-0 left-4 z-[10000]">
        <Button
          onClick={() => setVisible(true)}
          size="sm"
          variant="outline"
          className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600"
        >
          <AlertTriangle className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-yellow-500 to-amber-500 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 gap-4">
          {/* Left Side - Info + Environment Indicator */}
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            <span className="text-white font-semibold">
              Botões de Emergência
            </span>
            {/* Indicador de ambiente atual */}
            <div className={`px-2 py-1 rounded text-xs font-semibold ${
              isDevMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-green-600 text-white'
            }`}>
              {isDevMode ? '🧪 TESTES' : '🚀 PRODUÇÃO'}
            </div>
          </div>

          {/* Center - Environment Switch Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={activateTestMode}
              size="sm"
              className={`${
                isDevMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-white'
                  : 'bg-white hover:bg-gray-100 text-gray-900'
              }`}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              🧪 Ambiente de Testes
            </Button>

            <Button
              onClick={activateProdMode}
              size="sm"
              className={`${
                !isDevMode
                  ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-white'
                  : 'bg-white hover:bg-gray-100 text-gray-900'
              }`}
            >
              <Rocket className="w-4 h-4 mr-2" />
              🚀 Ambiente de Produção
            </Button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => forceNavigateTo('/')}
              size="sm"
              variant="secondary"
              className="bg-white hover:bg-gray-100 text-gray-900"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            <Button
              onClick={() => forceNavigateTo('/admin')}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Admin Master
            </Button>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setExpanded(!expanded)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              {expanded ? 'Minimizar' : 'Expandir'}
            </Button>

            <Button
              onClick={() => setVisible(false)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Info */}
        {expanded && (
          <div className="border-t border-white/20 py-3 space-y-2">
            <div className="grid grid-cols-3 gap-4 text-sm text-white/90">
              <div>
                <strong className="text-white">🧪 Ambiente de Testes:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Usa dados fictícios (mock)</li>
                  <li>Seguro para testar funcionalidades</li>
                  <li>Não afeta dados reais</li>
                  <li>Ideal para desenvolvimento</li>
                </ul>
              </div>
              <div>
                <strong className="text-white">🚀 Ambiente de Produção:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Usa dados reais do sistema</li>
                  <li>Conecta com APIs externas</li>
                  <li>Mudanças são permanentes</li>
                  <li>Use com cuidado!</li>
                </ul>
              </div>
              <div>
                <strong className="text-white">Navegação de Emergência:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Funciona mesmo se sistema travar</li>
                  <li>Acesso direto ao Admin Master</li>
                  <li>Navegação forçada</li>
                  <li>Sempre disponível</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/10 rounded p-2">
              <AlertTriangle className="w-4 h-4 text-white" />
              <span className="text-white text-sm">
                <strong>Importante:</strong> Ao alternar entre ambientes, a página será recarregada automaticamente
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}