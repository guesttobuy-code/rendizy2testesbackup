import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ServiceTicket, FunnelStage } from '../../../types/funnels';
import { ServicesTicketCard } from './ServicesTicketCard';
import { cn } from '../../../components/ui/utils';
import { DollarSign } from 'lucide-react';

interface ServicesTicketColumnProps {
  stage: FunnelStage;
  tickets: ServiceTicket[];
  totalCount: number;
  onTicketClick: (ticket: ServiceTicket) => void;
}

export function ServicesTicketColumn({
  stage,
  tickets,
  totalCount,
  onTicketClick,
}: ServicesTicketColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const totalValue = tickets.reduce((sum, ticket) => {
    return sum + (ticket.budget?.estimatedValue || 0);
  }, 0);

  return (
    <div className="flex flex-col h-full min-w-[300px]">
      {/* Header da coluna */}
      <div className="flex-none px-4 py-3 border-b bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.name}</h3>
            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          </div>
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <DollarSign className="w-3 h-3" />
            <span>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalValue)}
            </span>
          </div>
        )}
      </div>

      {/* Lista de tickets */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-3 space-y-2',
          isOver && 'bg-blue-50 dark:bg-blue-900/10'
        )}
      >
        {tickets.map((ticket) => (
          <ServicesTicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => onTicketClick(ticket)}
          />
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            Nenhum ticket
          </div>
        )}
      </div>
    </div>
  );
}
