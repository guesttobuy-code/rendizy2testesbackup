import React, { useMemo, useState } from 'react';
import { Funnel, ServiceTicket, FunnelStage, StageRequirement, PredeterminedFunnelConfig } from '../../types/funnels';
import { PredeterminedStageCard, StageStatus } from './PredeterminedStageCard';
import { StageApproval, StageApprovalRecord } from './StageApproval';
import { validateStageRequirements } from './StageValidation';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { FileText, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
// Formatação de data simples (sem date-fns para evitar dependência)
const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface PredeterminedFunnelViewProps {
  funnel: Funnel;
  ticket?: ServiceTicket;
  onStageClick?: (stage: FunnelStage, stageIndex: number) => void;
  onViewTicketDetails?: () => void;
  onCreateTicket?: () => void;
  onTicketUpdate?: (ticket: ServiceTicket) => void;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export function PredeterminedFunnelView({
  funnel,
  ticket,
  onStageClick,
  onViewTicketDetails,
  onCreateTicket,
  onTicketUpdate,
  currentUser,
}: PredeterminedFunnelViewProps) {
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedStageForApproval, setSelectedStageForApproval] = useState<FunnelStage | null>(null);
  // Ordenar etapas por ordem
  const sortedStages = useMemo(() => {
    return [...funnel.stages].sort((a, b) => a.order - b.order);
  }, [funnel.stages]);

  // Calcular progresso geral do processo
  const overallProgress = useMemo(() => {
    if (!ticket) return 0;
    
    const currentStageIndex = sortedStages.findIndex(s => s.id === ticket.stageId);
    if (currentStageIndex === -1) return 0;
    
    // Progresso baseado na posição da etapa atual
    const stageProgress = ((currentStageIndex + 1) / sortedStages.length) * 100;
    
    // Ajustar com base no progresso das tarefas da etapa atual
    const currentStageTasks = ticket.tasks?.filter(t => t.stageId === ticket.stageId) || [];
    const completedTasks = currentStageTasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = currentStageTasks.length;
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Progresso geral = (etapas completas + progresso da etapa atual) / total
    const completedStages = currentStageIndex;
    const stageWeight = 100 / sortedStages.length;
    const overall = (completedStages * stageWeight) + (stageWeight * (taskProgress / 100));
    
    return Math.min(100, Math.round(overall));
  }, [ticket, sortedStages]);

  // Determinar status de cada etapa
  const getStageStatus = (stage: FunnelStage, index: number): StageStatus => {
    if (!ticket) {
      // Sem ticket, todas as etapas estão bloqueadas
      return 'blocked';
    }

    const currentStageIndex = sortedStages.findIndex(s => s.id === ticket.stageId);
    
    // Verificar se etapa foi rejeitada
    const approval = ticket.metadata?.stageApprovals?.[stage.id] as StageApprovalRecord | undefined;
    if (approval?.rejected) {
      return 'rejected';
    }
    
    // Etapas anteriores à atual = concluídas (se aprovadas)
    if (index < currentStageIndex) {
      // Verificar se foi aprovada
      if (approval?.approved) {
        return 'completed';
      }
      // Se não tem aprovação mas está antes da atual, considerar concluída
      return 'completed';
    }
    
    // Etapa atual = em andamento
    if (index === currentStageIndex) {
      // Verificar se há requisitos não atendidos
      const stageTasks = ticket.tasks?.filter(t => t.stageId === stage.id) || [];
      const hasIncompleteRequiredTasks = stageTasks.some(t => 
        t.status !== 'COMPLETED' && stageTasks.length > 0
      );
      
      // Verificar validação de requisitos
      const requirements = getStageRequirements(stage);
      if (requirements) {
        const validation = validateStageRequirements(stage, ticket, requirements);
        if (!validation.isValid) {
          return 'warning';
        }
      }
      
      if (hasIncompleteRequiredTasks && stageTasks.length > 0) {
        return 'warning';
      }
      
      return 'in_progress';
    }
    
    // Etapas futuras = bloqueadas
    return 'blocked';
  };

  // Calcular progresso de uma etapa específica
  const getStageProgress = (stage: FunnelStage): number => {
    if (!ticket) return 0;
    
    const stageTasks = ticket.tasks?.filter(t => t.stageId === stage.id) || [];
    if (stageTasks.length === 0) return 0;
    
    const completedTasks = stageTasks.filter(t => t.status === 'COMPLETED').length;
    return Math.round((completedTasks / stageTasks.length) * 100);
  };

  // Obter requisitos da etapa (busca da configuração do funil)
  const getStageRequirements = (stage: FunnelStage): StageRequirement | undefined => {
    // Buscar da configuração do funil (metadata.config.stageRequirements)
    const config = (funnel as any).metadata?.config as PredeterminedFunnelConfig | undefined;
    if (config?.stageRequirements) {
      return config.stageRequirements.find(r => r.stageId === stage.id);
    }
    return undefined;
  };

  // Handler para aprovação de etapa
  const handleStageApproval = async (stage: FunnelStage, approved: boolean, comment?: string) => {
    if (!ticket || !onTicketUpdate) return;

    try {
      // Criar registro de aprovação
      const approvalRecord: StageApprovalRecord = {
        stageId: stage.id,
        approved,
        rejected: !approved,
        comment,
        approvedBy: currentUser?.id || 'system',
        approvedByName: currentUser?.name || 'Sistema',
        approvedAt: new Date().toISOString(),
      };

      // Se aprovado, avançar para próxima etapa
      let nextStageId = ticket.stageId;
      if (approved) {
        const currentStageIndex = sortedStages.findIndex(s => s.id === stage.id);
        if (currentStageIndex >= 0 && currentStageIndex < sortedStages.length - 1) {
          // Avançar para próxima etapa
          nextStageId = sortedStages[currentStageIndex + 1].id;
        }
      }

      // Atualizar metadata do ticket e avançar etapa se aprovado
      const updatedTicket: ServiceTicket = {
        ...ticket,
        stageId: nextStageId,
        metadata: {
          ...ticket.metadata,
          stageApprovals: {
            ...(ticket.metadata?.stageApprovals || {}),
            [stage.id]: approvalRecord,
          },
        },
      };

      await onTicketUpdate(updatedTicket);
      toast.success(
        approved 
          ? `Etapa aprovada! ${nextStageId !== stage.id ? 'Avançando para próxima etapa...' : 'Processo concluído!'}`
          : 'Etapa rejeitada.'
      );
      setApprovalModalOpen(false);
      setSelectedStageForApproval(null);
    } catch (error) {
      console.error('Erro ao aprovar/rejeitar etapa:', error);
      toast.error('Erro ao processar aprovação');
    }
  };

  // Obter responsável da etapa (simplificado - pode ser expandido)
  const getStageResponsible = (stage: FunnelStage) => {
    // Por enquanto, usa o responsável do ticket ou padrão
    if (ticket?.assignedToName) {
      return {
        name: ticket.assignedToName,
        type: 'internal' as const,
      };
    }
    
    // Padrão baseado no nome da etapa (pode ser melhorado com configuração)
    if (stage.name.toLowerCase().includes('cliente') || stage.name.toLowerCase().includes('inquilino')) {
      return {
        name: 'Cliente',
        type: 'client' as const,
      };
    }
    
    return {
      name: 'Imobiliária',
      type: 'agency' as const,
    };
  };

  // Obter datas da etapa
  const getStageDates = (stage: FunnelStage, status: StageStatus) => {
    if (!ticket) return {};
    
    const stageTasks = ticket.tasks?.filter(t => t.stageId === stage.id) || [];
    const completedTasks = stageTasks.filter(t => t.status === 'COMPLETED');
    
    if (status === 'completed' && completedTasks.length > 0) {
      const lastCompleted = completedTasks
        .map(t => t.completedAt ? new Date(t.completedAt).getTime() : 0)
        .sort((a, b) => b - a)[0];
      
      return {
        completedAt: lastCompleted > 0 ? new Date(lastCompleted).toISOString() : undefined,
      };
    }
    
    if (status === 'in_progress') {
      const firstTask = stageTasks[0];
      return {
        startedAt: firstTask?.createdAt,
      };
    }
    
    return {};
  };

  return (
    <div className="space-y-6">
      {/* Header do Processo */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">
                {ticket ? ticket.title : funnel.name}
              </h2>
              {ticket && (
                <Badge variant="outline">
                  {ticket.status}
                </Badge>
              )}
            </div>
            
            {funnel.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {funnel.description}
              </p>
            )}

            {/* Informações do Ticket */}
            {ticket && (
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {ticket.createdAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Criado em {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                )}
                {ticket.relatedPeople && ticket.relatedPeople.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{ticket.relatedPeople.length} pessoa(s) relacionada(s)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {ticket && onViewTicketDetails && (
              <Button variant="outline" onClick={onViewTicketDetails}>
                <FileText className="w-4 h-4 mr-2" />
                Ver Detalhes
              </Button>
            )}
            {!ticket && onCreateTicket && (
              <Button onClick={onCreateTicket}>
                Criar Ticket
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Progresso Geral */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Progresso do Processo
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Lista de Etapas (Visualização Vertical) */}
      <div className="space-y-4">
        {sortedStages.map((stage, index) => {
          const status = getStageStatus(stage, index);
          const progress = getStageProgress(stage);
          const responsible = getStageResponsible(stage);
          const dates = getStageDates(stage, status);
          const isCurrentStage = ticket?.stageId === stage.id;
          const canInteract = status === 'in_progress' || status === 'warning';

          const stageRequirements = getStageRequirements(stage);
          const hasApproval = ticket?.metadata?.stageApprovals?.[stage.id] as StageApprovalRecord | undefined;

          return (
            <PredeterminedStageCard
              key={stage.id}
              stage={stage}
              stageIndex={index}
              status={status}
              ticket={ticket}
              isCurrentStage={isCurrentStage}
              canInteract={canInteract}
              responsibleName={responsible.name}
              responsibleType={responsible.type}
              completedAt={dates.completedAt}
              startedAt={dates.startedAt}
              progress={progress}
              requirements={stageRequirements}
              onStageClick={() => onStageClick?.(stage, index)}
              onViewDetails={onViewTicketDetails}
              onApprove={
                status === 'in_progress' && canInteract && onTicketUpdate
                  ? () => {
                      setSelectedStageForApproval(stage);
                      setApprovalModalOpen(true);
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Mensagem quando não há ticket */}
      {!ticket && (
        <Card className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Nenhum ticket criado para este processo ainda.
          </p>
          {onCreateTicket && (
            <Button onClick={onCreateTicket}>
              Criar Primeiro Ticket
            </Button>
          )}
        </Card>
      )}

      {/* Modal de Aprovação/Rejeição */}
      {selectedStageForApproval && ticket && (
        <StageApproval
          stage={selectedStageForApproval}
          ticket={ticket}
          open={approvalModalOpen}
          onClose={() => {
            setApprovalModalOpen(false);
            setSelectedStageForApproval(null);
          }}
          onApprove={(comment) => handleStageApproval(selectedStageForApproval, true, comment)}
          onReject={(comment) => handleStageApproval(selectedStageForApproval, false, comment)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
