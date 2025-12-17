import React, { useMemo, useState, useEffect } from 'react';
import { Deal, DealStage } from '../../types/crm';
import { DealColumn } from './DealColumn';
import { ScrollArea } from '../ui/scroll-area';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DealCard } from './DealCard';
import { dealsApi } from '../../utils/api';
import { toast } from 'sonner';

interface KanbanBoardProps {
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onDealUpdate?: (deal: Deal) => void;
  searchQuery?: string;
}

const STAGE_CONFIG: Record<DealStage, { label: string; color: string }> = {
  QUALIFIED: { label: 'QUALIFIED', color: 'bg-blue-500' },
  CONTACT_MADE: { label: 'CONTACT MADE', color: 'bg-green-500' },
  MEETING_ARRANGED: { label: 'MEETING ARRANGED', color: 'bg-yellow-500' },
  PROPOSAL_MADE: { label: 'PROPOSAL MADE', color: 'bg-orange-500' },
  NEGOTIATIONS: { label: 'NEGOTIATIONS', color: 'bg-purple-500' },
  WON: { label: 'WON', color: 'bg-emerald-500' },
  LOST: { label: 'LOST', color: 'bg-red-500' },
};

const STAGE_ORDER: DealStage[] = [
  'QUALIFIED',
  'CONTACT_MADE',
  'MEETING_ARRANGED',
  'PROPOSAL_MADE',
  'NEGOTIATIONS',
];

export function KanbanBoard({ deals, onDealClick, onDealUpdate, searchQuery = '' }: KanbanBoardProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sincronizar com props
  React.useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);
  // Filtrar deals por busca
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return localDeals;
    const query = searchQuery.toLowerCase();
    return localDeals.filter(
      deal =>
        deal.title.toLowerCase().includes(query) ||
        deal.contactName.toLowerCase().includes(query) ||
        deal.ownerName.toLowerCase().includes(query)
    );
  }, [localDeals, searchQuery]);

  // Agrupar deals por estágio
  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      QUALIFIED: [],
      CONTACT_MADE: [],
      MEETING_ARRANGED: [],
      PROPOSAL_MADE: [],
      NEGOTIATIONS: [],
      WON: [],
      LOST: [],
    };

    filteredDeals.forEach(deal => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    return grouped;
  }, [filteredDeals]);

  // Calcular totais por estágio
  const stageTotals = useMemo(() => {
    const totals: Record<DealStage, { count: number; value: number }> = {
      QUALIFIED: { count: 0, value: 0 },
      CONTACT_MADE: { count: 0, value: 0 },
      MEETING_ARRANGED: { count: 0, value: 0 },
      PROPOSAL_MADE: { count: 0, value: 0 },
      NEGOTIATIONS: { count: 0, value: 0 },
      WON: { count: 0, value: 0 },
      LOST: { count: 0, value: 0 },
    };

    Object.entries(dealsByStage).forEach(([stage, stageDeals]) => {
      totals[stage as DealStage] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, deal) => {
          // Converter para BRL se necessário (simplificado)
          const valueInBRL = deal.currency === 'USD' ? deal.value * 5 : deal.value;
          return sum + valueInBRL;
        }, 0),
      };
    });

    return totals;
  }, [dealsByStage]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = deals.find(d => d.id === active.id);
    if (deal) {
      setActiveDeal(deal);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as DealStage;

    const deal = localDeals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Otimistic update
    const updatedDeal = { ...deal, stage: newStage };
    setLocalDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));

    // Persistir no backend
    try {
      const response = await dealsApi.updateStage(dealId, newStage, `Moved from ${deal.stage} to ${newStage}`);
      if (response.success && response.data) {
        setLocalDeals(prev => prev.map(d => d.id === dealId ? response.data! : d));
        if (onDealUpdate) {
          onDealUpdate(response.data);
        }
        toast.success('Deal movido com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao mover deal');
      }
    } catch (error: any) {
      console.error('Erro ao mover deal:', error);
      toast.error(error.message || 'Erro ao mover deal');
      // Reverter otimistic update
      setLocalDeals(prev => prev.map(d => d.id === dealId ? deal : d));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full bg-gray-50 dark:bg-gray-900">
        <ScrollArea className="h-full">
          <div className="flex gap-4 p-6 min-w-max">
            {STAGE_ORDER.map(stage => {
              const config = STAGE_CONFIG[stage];
              const stageDeals = dealsByStage[stage];
              const total = stageTotals[stage];

              return (
                <DealColumn
                  key={stage}
                  stage={stage}
                  label={config.label}
                  deals={stageDeals}
                  totalValue={total.value}
                  totalCount={total.count}
                  onDealClick={onDealClick}
                />
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="opacity-90">
            <DealCard deal={activeDeal} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

