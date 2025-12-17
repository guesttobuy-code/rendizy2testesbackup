import React from 'react';
import { ServiceTicket, FunnelStage } from '../../types/funnels';
import { SortableTicketCard } from './SortableTicketCard';
import { Card } from '../ui/card';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

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

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 flex-shrink-0 ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg' : ''}`}
    >
      {/* Column Header */}
      <div className="mb-4">
        <div
          className="h-1 rounded-t-lg mb-2"
          style={{ backgroundColor: stage.color }}
        />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          {stage.name}
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">{totalCount} {totalCount === 1 ? 'ticket' : 'tickets'}</span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {tickets.length === 0 ? (
          <Card className="p-8 border-dashed border-2 border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum ticket neste estágio
            </p>
          </Card>
        ) : (
          <SortableContext
            items={tickets.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tickets.map(ticket => (
              <SortableTicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick(ticket)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

