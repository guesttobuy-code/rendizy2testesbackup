import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export function DataResetAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Verifica se os dados estão na versão correta
    const checkDataVersion = () => {
      const currentVersion = localStorage.getItem('rendizy_data_version');
      const REQUIRED_VERSION = '3.0';
      
      if (currentVersion !== REQUIRED_VERSION) {
        setShowAlert(true);
        
        // Countdown automático
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              performReset();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    };

    checkDataVersion();
  }, []);

  const performReset = () => {
    console.log('🔄 Executando reset automático...');
    localStorage.removeItem('rendizy_mock_data');
    localStorage.removeItem('rendizy_data_version');
    window.location.reload();
  };

  if (!showAlert) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold">Dados Desatualizados</h2>
              <p className="text-sm text-white/90">Atualização necessária</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Os dados armazenados no navegador estão em uma versão antiga e precisam ser atualizados.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">O que vai acontecer:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Dados antigos serão removidos
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Dados de demonstração serão recriados
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Página será recarregada automaticamente
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium">
              ⏱️ Reset automático em <span className="text-xl font-bold">{countdown}</span> segundos...
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <Button
            onClick={performReset}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Resetar Agora
          </Button>
        </div>
      </div>
    </div>
  );
}
