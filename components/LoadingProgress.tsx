import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  isLoading: boolean;
}

export function LoadingProgress({ isLoading }: LoadingProgressProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setSeconds(prev => prev + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const progress = Math.min((seconds / 3) * 100, 100); // 3 segundos = 100%

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Carregando RENDIZY</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {seconds < 1 ? 'Conectando ao servidor...' : 
             seconds < 2 ? 'Carregando propriedades...' : 
             seconds < 3 ? 'Carregando reservas...' : 
             'Preparando interface...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{Math.round(progress)}%</span>
            <span>{seconds.toFixed(1)}s / 3.0s</span>
          </div>
        </div>

        {/* Status */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Aguarde... carregando dados do sistema
        </p>
      </div>
    </div>
  );
}
