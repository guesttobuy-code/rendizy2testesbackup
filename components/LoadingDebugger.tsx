/**
 * RENDIZY - Loading Debugger
 * 
 * Componente de diagnóstico visual para identificar problemas de loading
 * 
 * @version 1.0.103.153
 * @date 2025-10-31
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LoadingDebuggerProps {
  initialLoading: boolean;
  loadingProperties: boolean;
  properties: any[];
  reservations: any[];
  onForceComplete: () => void;
}

export function LoadingDebugger({
  initialLoading,
  loadingProperties,
  properties,
  reservations,
  onForceComplete
}: LoadingDebuggerProps) {
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Mostrar debugger apenas se loading durar mais de 3 segundos
  useEffect(() => {
    const isLoading = initialLoading || loadingProperties;
    
    if (!isLoading) {
      setVisible(false);
      setSeconds(0);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, 3000);

    const counter = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(counter);
    };
  }, [initialLoading, loadingProperties]);

  if (!visible) return null;

  const checks = [
    {
      name: 'Initial Loading',
      status: !initialLoading,
      value: initialLoading ? 'Carregando...' : 'Completo'
    },
    {
      name: 'Loading Properties',
      status: !loadingProperties,
      value: loadingProperties ? 'Carregando...' : 'Completo'
    },
    {
      name: 'Properties Loaded',
      status: properties.length > 0,
      value: `${properties.length} propriedades`
    },
    {
      name: 'Reservations Loaded',
      status: reservations.length > 0,
      value: `${reservations.length} reservas`
    }
  ];

  const allComplete = checks.every(check => check.status);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Card className="p-4 w-80 shadow-2xl border-2 border-yellow-500">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {allComplete ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
          )}
          <h3 className="font-semibold">Loading Debugger</h3>
          <span className="ml-auto text-sm text-gray-500">{seconds}s</span>
        </div>

        {/* Status Checks */}
        <div className="space-y-2 mb-3">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {check.status ? (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <span className="flex-1">{check.name}</span>
              <span className="text-xs text-gray-500">{check.value}</span>
            </div>
          ))}
        </div>

        {/* Warning */}
        {!allComplete && seconds > 5 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <strong>Loading travado?</strong> Clique abaixo para forçar conclusão.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          onClick={() => {
            onForceComplete();
            setVisible(false);
          }}
          size="sm"
          className="w-full"
          variant={allComplete ? "outline" : "destructive"}
        >
          {allComplete ? 'Fechar' : 'Forçar Conclusão'}
        </Button>
      </Card>
    </div>
  );
}
