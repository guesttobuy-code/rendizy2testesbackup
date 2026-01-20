import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar, DollarSign, Lock, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface QuickActionsModalProps {
  open: boolean;
  onClose: () => void;
  startDate?: Date;
  endDate?: Date;
  propertyId?: string;
  propertyName?: string;
  onSelectAction: (action: 'reservation' | 'quote' | 'block' | 'tiers' | 'seasonality') => void;
}

export function QuickActionsModal({
  open,
  onClose,
  startDate,
  endDate,
  propertyId,
  propertyName,
  onSelectAction
}: QuickActionsModalProps) {
  const nights = startDate && endDate 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {startDate && endDate && (
              <div className="space-y-1">
                <div className="text-gray-900">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </div>
                <div className="text-sm text-gray-500">
                  {nights} {nights === 1 ? 'noite' : 'noites'} • {propertyName}
                </div>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            Selecione uma ação para o período escolhido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-2 -mr-2 flex-1">
          {/* Criar Reserva */}
          <button
            onClick={() => onSelectAction('reservation')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Criar reserva</div>
                  <div className="text-sm text-gray-600">
                    Você poderá ver as informações do hóspede e escolher uma acomodação para continuar a reserva e visualizar a precificação.
                  </div>
                  <div className="text-xs text-blue-600 mt-2 hover:underline">Saiba mais</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </div>
          </button>

          {/* Fazer Cotação */}
          <button
            onClick={() => onSelectAction('quote')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Fazer cotação</div>
                  <div className="text-sm text-gray-600">
                    Execute uma pré-reserva para o período selecionado.
                  </div>
                  <div className="text-xs text-green-600 mt-2 hover:underline">Saiba mais</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0" />
            </div>
          </button>

          {/* Criar Bloqueio */}
          <button
            onClick={() => onSelectAction('block')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Criar Bloqueio</div>
                  <div className="text-sm text-gray-600">
                    Bloqueie datas no calendário. Opcionalmente escolha o tipo: simples, preditivo ou manutenção.
                  </div>
                  <div className="text-xs text-blue-600 mt-2 hover:underline">Saiba mais</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </div>
          </button>

          {/* Configurar Tiers de Preço */}
          <button
            onClick={() => onSelectAction('tiers')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Configurar Tiers de Preço</div>
                  <div className="text-sm text-gray-600">
                    Defina preços dinâmicos com 4 níveis (Baixa, Média, Alta, Pico) para o período.
                  </div>
                  <div className="text-xs text-indigo-600 mt-2 hover:underline">Saiba mais</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
            </div>
          </button>

          {/* Configurar Sazonalidade */}
          <button
            onClick={() => onSelectAction('seasonality')}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors">
                  <Sparkles className="h-5 w-5 text-pink-600" />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Configurar Sazonalidade</div>
                  <div className="text-sm text-gray-600">
                    Crie períodos especiais (verão, férias, eventos) com regras personalizadas.
                  </div>
                  <div className="text-xs text-pink-600 mt-2 hover:underline">Saiba mais</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-pink-600 transition-colors flex-shrink-0" />
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
