import React from 'react';
import { Deal, DealStage } from '../../types/crm';
import { SortableDealCard } from './SortableDealCard';
import { Card } from '../ui/card';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface DealColumnProps {
  stage: DealStage;
  label: string;
  deals: Deal[];
  totalValue: number;
  totalCount: number;
  onDealClick: (deal: Deal) => void;
}

export function DealColumn({
  stage,
  label,
  deals,
  totalValue,
  totalCount,
  onDealClick,
}: DealColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 flex-shrink-0 ${isOver ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg' : ''}`}
    >
      {/* Column Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
          {label}
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">{formatCurrency(totalValue)}</span>
          <span>{totalCount} {totalCount === 1 ? 'deal' : 'deals'}</span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {deals.length === 0 ? (
          <Card className="p-8 border-dashed border-2 border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum deal neste estágio
            </p>
          </Card>
        ) : (
          <SortableContext
            items={deals.map(d => d.id)}
            strategy={verticalListSortingStrategy}
          >
            {deals.map(deal => (
              <SortableDealCard
                key={deal.id}
                deal={deal}
                onClick={() => onDealClick(deal)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

