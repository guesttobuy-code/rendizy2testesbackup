import React, { useMemo, useState, useEffect } from 'react';
import { ServiceTicket, Funnel, FunnelStage } from '../../types/funnels';
import { ServicesTicketColumn } from './ServicesTicketColumn';
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
import { servicesTicketsApi } from '../../utils/api';
import { toast } from 'sonner';

interface ServicesKanbanBoardProps {
  funnel: Funnel;
  tickets: ServiceTicket[];
  onTicketClick: (ticket: ServiceTicket) => void;
  onTicketUpdate?: (ticket: ServiceTicket) => void;
  searchQuery?: string;
}

export function ServicesKanbanBoard({
  funnel,
  tickets,
  onTicketClick,
  onTicketUpdate,
  searchQuery = '',
}: ServicesKanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<ServiceTicket | null>(null);
  const [localTickets, setLocalTickets] = useState<ServiceTicket[]>(tickets);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sincronizar com props
  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  // Filtrar tickets por busca
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return localTickets;
    const query = searchQuery.toLowerCase();
    return localTickets.filter(
      ticket =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.assignedToName?.toLowerCase().includes(query)
    );
  }, [localTickets, searchQuery]);

  // Agrupar tickets por estágio
  const ticketsByStage = useMemo(() => {
    const grouped: Record<string, ServiceTicket[]> = {};
    funnel.stages.forEach(stage => {
      grouped[stage.id] = [];
    });

    filteredTickets.forEach(ticket => {
      if (grouped[ticket.stageId]) {
        grouped[ticket.stageId].push(ticket);
      }
    });

    return grouped;
  }, [filteredTickets, funnel.stages]);

  // Calcular totais por estágio
  const stageTotals = useMemo(() => {
    const totals: Record<string, { count: number }> = {};
    funnel.stages.forEach(stage => {
      totals[stage.id] = {
        count: ticketsByStage[stage.id]?.length || 0,
      };
    });
    return totals;
  }, [ticketsByStage, funnel.stages]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = localTickets.find(t => t.id === active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStageId = over.id as string;

    const ticket = localTickets.find(t => t.id === ticketId);
    if (!ticket || ticket.stageId === newStageId) return;

    // Otimistic update
    const updatedTicket = { ...ticket, stageId: newStageId };
    setLocalTickets(prev => prev.map(t => t.id === ticketId ? updatedTicket : prev.find(t => t.id === ticketId)!));

    // Persistir no backend
    try {
      const response = await servicesTicketsApi.updateStage(ticketId, newStageId);
      if (response.success && response.data) {
        setLocalTickets(prev => prev.map(t => t.id === ticketId ? response.data! : t));
        if (onTicketUpdate) {
          onTicketUpdate(response.data);
        }
        toast.success('Ticket movido com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao mover ticket');
      }
    } catch (error: any) {
      console.error('Erro ao mover ticket:', error);
      toast.error(error.message || 'Erro ao mover ticket');
      // Reverter otimistic update
      setLocalTickets(prev => prev.map(t => t.id === ticketId ? ticket : t));
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
            {funnel.stages.map(stage => {
              const stageTickets = ticketsByStage[stage.id] || [];
              const total = stageTotals[stage.id];

              return (
                <SortableContext
                  key={stage.id}
                  id={stage.id}
                  items={stageTickets.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ServicesTicketColumn
                    stage={stage}
                    tickets={stageTickets}
                    totalCount={total.count}
                    onTicketClick={onTicketClick}
                  />
                </SortableContext>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="opacity-90">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80">
              <h4 className="font-semibold text-sm">{activeTicket.title}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {activeTicket.assignedToName || 'Não atribuído'}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

