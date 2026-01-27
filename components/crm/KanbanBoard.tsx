import React, { useMemo, useState } from 'react';
import { Deal, DealStage } from '../../types/crm';
import { DealColumn } from './DealColumn';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { DealCard } from './DealCard';
import { dealsApi } from '../../utils/api';
import { toast } from 'sonner';
import { FunnelStage } from '../../types/funnels';

interface KanbanBoardProps {
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onDealUpdate?: (deal: Deal) => void;
  onCopyDealLink?: (dealId: string) => void; // ✅ Copiar link do deal
  searchQuery?: string;
  stages?: FunnelStage[]; // Stages dinâmicas do funil selecionado
}

// Fallback para stages padrão quando não há funil selecionado
const DEFAULT_STAGE_CONFIG: Record<DealStage, { label: string; color: string }> = {
  QUALIFIED: { label: 'QUALIFICADO', color: '#3b82f6' },
  CONTACT_MADE: { label: 'CONTATO FEITO', color: '#f59e0b' },
  MEETING_ARRANGED: { label: 'REUNIÃO AGENDADA', color: '#ef4444' },
  PROPOSAL_MADE: { label: 'PROPOSTA ENVIADA', color: '#8b5cf6' },
  NEGOTIATIONS: { label: 'NEGOCIAÇÃO', color: '#6366f1' },
  WON: { label: 'GANHO', color: '#10b981' },
  LOST: { label: 'PERDIDO', color: '#ef4444' },
};

const DEFAULT_STAGE_ORDER: DealStage[] = [
  'QUALIFIED',
  'CONTACT_MADE',
  'MEETING_ARRANGED',
  'PROPOSAL_MADE',
  'NEGOTIATIONS',
];

export function KanbanBoard({ deals, onDealClick, onDealUpdate, onCopyDealLink, searchQuery = '', stages }: KanbanBoardProps) {
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

  // Determinar stages a usar (dinâmicas ou fallback)
  const activeStages = useMemo(() => {
    if (stages && stages.length > 0) {
      return stages.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        order: s.order,
      })).sort((a, b) => a.order - b.order);
    }
    // Fallback para stages padrão
    return DEFAULT_STAGE_ORDER.map((stage, index) => ({
      id: stage,
      name: DEFAULT_STAGE_CONFIG[stage].label,
      color: DEFAULT_STAGE_CONFIG[stage].color,
      order: index + 1,
    }));
  }, [stages]);
  // Filtrar deals por busca
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return localDeals;
    const query = searchQuery.toLowerCase();
    return localDeals.filter(
      deal =>
        deal.title.toLowerCase().includes(query) ||
        (deal.contactName && deal.contactName.toLowerCase().includes(query)) ||
        (deal.ownerName && deal.ownerName.toLowerCase().includes(query))
    );
  }, [localDeals, searchQuery]);

  // Agrupar deals por estágio (dinâmico)
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {};
    
    // Inicializar todas as stages ativas
    activeStages.forEach(stage => {
      grouped[stage.id] = [];
    });

    // Mapear stages antigas para novas (baseado em ordem ou nome similar)
    const mapStageToActive = (dealStage: string): string => {
      // Primeiro, verificar se o stage existe diretamente
      if (grouped[dealStage] !== undefined) {
        return dealStage;
      }
      // Mapear stages legadas para o índice correspondente
      const legacyOrder: Record<string, number> = {
        'QUALIFIED': 0,
        'CONTACT_MADE': 1,
        'MEETING_ARRANGED': 2,
        'PROPOSAL_MADE': 3,
        'NEGOTIATIONS': 4,
      };
      const orderIndex = legacyOrder[dealStage];
      if (orderIndex !== undefined && activeStages[orderIndex]) {
        return activeStages[orderIndex].id;
      }
      // Fallback: primeira stage
      return activeStages[0]?.id || dealStage;
    };

    filteredDeals.forEach(deal => {
      const targetStage = mapStageToActive(deal.stage);
      if (grouped[targetStage]) {
        grouped[targetStage].push(deal);
      }
    });

    return grouped;
  }, [filteredDeals, activeStages]);

  // Calcular totais por estágio
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {};
    
    activeStages.forEach(stage => {
      totals[stage.id] = { count: 0, value: 0 };
    });

    Object.entries(dealsByStage).forEach(([stageId, stageDeals]) => {
      totals[stageId] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, deal) => {
          // Converter para BRL se necessário (simplificado)
          const valueInBRL = deal.currency === 'USD' ? deal.value * 5 : deal.value;
          return sum + valueInBRL;
        }, 0),
      };
    });

    return totals;
  }, [dealsByStage, activeStages]);

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
      <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Container com scroll horizontal e vertical */}
        <div className="h-full overflow-x-auto overflow-y-auto">
          <div className="flex gap-4 p-6 min-w-max min-h-full">
            {activeStages.map(stage => {
              const stageDeals = dealsByStage[stage.id] || [];
              const total = stageTotals[stage.id] || { count: 0, value: 0 };

              return (
                <DealColumn
                  key={stage.id}
                  stage={stage.id as DealStage}
                  label={stage.name.toUpperCase()}
                  deals={stageDeals}
                  totalValue={total.value}
                  totalCount={total.count}
                  onDealClick={onDealClick}
                  onCopyDealLink={onCopyDealLink}
                  color={stage.color}
                />
              );
            })}
          </div>
        </div>
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

