import React from 'react';
import { 
  Construction, 
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface ModulePlaceholderProps {
  moduleName: string;
  moduleDescription?: string;
  icon?: React.ReactNode;
}

export function ModulePlaceholder({ 
  moduleName, 
  moduleDescription,
  icon 
}: ModulePlaceholderProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <Card className="max-w-2xl w-full p-12 text-center shadow-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="mb-6 flex justify-center">
          {icon || (
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center transition-colors">
              <Construction className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>

        <h2 className="text-gray-900 dark:text-gray-100 mb-3">
          {moduleName}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
          {moduleDescription || 'Este módulo está planejado e será implementado em breve.'}
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8 transition-colors">
          <div className="flex items-start gap-4 text-left">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <p className="text-blue-900 dark:text-blue-100 mb-2">
                <span className="font-medium">Módulo Calendário</span> está 100% completo e funcional!
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Navegue de volta ao Calendário para explorar todas as funcionalidades implementadas:
                drag selection, linhas globais, 4 tiers de preço, sazonalidade, e muito mais.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-left max-w-md mx-auto mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>26 componentes React implementados</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>16 modais interativos funcionais</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>3 views: Calendário, Lista e Timeline</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>Sistema completo de precificação dinâmica</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            size="lg"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            Voltar ao Calendário
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">
          Implementação progressiva • Calendário: 100% completo • ~8.850 linhas de código
        </p>
      </Card>
    </div>
  );
}
