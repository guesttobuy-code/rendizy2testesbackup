import React from 'react';
import { FunnelStage, ServiceTicket, StageRequirement } from '../../types/funnels';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  CheckCircle2, 
  Clock, 
  Lock, 
  AlertTriangle, 
  XCircle,
  ChevronRight,
  User,
  Building2
} from 'lucide-react';
import { StageValidation } from './StageValidation';
// Formatação de data simples (sem date-fns para evitar dependência)
const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export type StageStatus = 'completed' | 'in_progress' | 'blocked' | 'warning' | 'rejected';

interface PredeterminedStageCardProps {
  stage: FunnelStage;
  stageIndex: number;
  status: StageStatus;
  ticket?: ServiceTicket;
  isCurrentStage?: boolean;
  canInteract?: boolean;
  responsibleName?: string;
  responsibleType?: 'internal' | 'client' | 'agency';
  completedAt?: string;
  startedAt?: string;
  progress?: number; // 0-100
  requirements?: StageRequirement;
  onStageClick?: () => void;
  onViewDetails?: () => void;
  onApprove?: () => void;
}

export function PredeterminedStageCard({
  stage,
  stageIndex,
  status,
  ticket,
  isCurrentStage = false,
  canInteract = false,
  responsibleName,
  responsibleType,
  completedAt,
  startedAt,
  progress = 0,
  requirements,
  onStageClick,
  onViewDetails,
  onApprove,
}: PredeterminedStageCardProps) {
  // Configuração de cores e ícones por status
  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-700 dark:text-green-400',
      label: 'Concluída',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-green-600 hover:bg-green-700',
    },
    in_progress: {
      icon: Clock,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      label: 'Em andamento',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    blocked: {
      icon: Lock,
      iconColor: 'text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      textColor: 'text-gray-500 dark:text-gray-400',
      label: 'Bloqueada',
      badgeVariant: 'outline' as const,
      badgeClass: '',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-700 dark:text-orange-400',
      label: 'Requisitos não atendidos',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-orange-600 hover:bg-orange-700',
    },
    rejected: {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-700 dark:text-red-400',
      label: 'Rejeitada',
      badgeVariant: 'default' as const,
      badgeClass: 'bg-red-600 hover:bg-red-700',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Calcular tarefas da etapa
  const stageTasks = ticket?.tasks?.filter(t => t.stageId === stage.id) || [];
  const completedTasks = stageTasks.filter(t => t.status === 'COMPLETED').length;
  const totalTasks = stageTasks.length;

  // Ícone do responsável
  const getResponsibleIcon = () => {
    switch (responsibleType) {
      case 'client':
        return <User className="w-4 h-4" />;
      case 'agency':
        return <Building2 className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`
        relative border-l-4 rounded-lg p-4 transition-all
        ${config.bgColor}
        ${config.borderColor}
        ${status === 'blocked' ? 'opacity-60' : ''}
        ${isCurrentStage ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
        ${canInteract && status !== 'blocked' ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
      `}
      style={{ borderLeftColor: stage.color }}
      onClick={canInteract && status !== 'blocked' ? onStageClick : undefined}
    >
      {/* Header da Etapa */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Ícone de Status */}
          <div className={`${config.iconColor} flex-shrink-0`}>
            <StatusIcon className="w-6 h-6" />
          </div>

          {/* Informações da Etapa */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">{stage.name}</h3>
              <Badge 
                variant={config.badgeVariant}
                className={`text-xs ${config.badgeClass}`}
              >
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Etapa {stageIndex + 1}
              </Badge>
            </div>

            {/* Descrição da Etapa */}
            {stage.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {stage.description}
              </p>
            )}
          </div>
        </div>

        {/* Botão Ver Detalhes (se concluída ou em andamento) */}
        {(status === 'completed' || status === 'in_progress') && onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Responsável */}
      {responsibleName && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <div className={`${config.textColor} flex items-center gap-1`}>
            {getResponsibleIcon()}
            <span className="font-medium">{responsibleName}</span>
          </div>
          {responsibleType && (
            <Badge variant="outline" className="text-xs">
              {responsibleType === 'client' ? 'Cliente' : 
               responsibleType === 'agency' ? 'Imobiliária' : 
               'Time Interno'}
            </Badge>
          )}
        </div>
      )}

      {/* Progresso e Tarefas */}
      {(status === 'in_progress' || status === 'completed') && totalTasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-400">
              Tarefas: {completedTasks} de {totalTasks}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                status === 'completed' 
                  ? 'bg-green-600' 
                  : 'bg-yellow-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Datas */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {completedAt && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>
              Concluída em {formatDate(completedAt)}
            </span>
          </div>
        )}
        {startedAt && !completedAt && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              Aguardando desde {formatDate(startedAt)}
            </span>
          </div>
        )}
        {status === 'blocked' && (
          <div className="flex items-center gap-1">
            <Lock className="w-3 h-3" />
            <span>Aguardando etapa anterior...</span>
          </div>
        )}
      </div>

      {/* Validação de Requisitos */}
      {ticket && requirements && (status === 'in_progress' || status === 'warning') && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <StageValidation
            stage={stage}
            ticket={ticket}
            requirements={requirements}
          />
        </div>
      )}

      {/* Mensagem de Ação Necessária */}
      {(status === 'in_progress' || status === 'warning') && canInteract && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onStageClick?.();
            }}
          >
            {status === 'warning' ? 'Corrigir Requisitos' : 'Ação Necessária'}
          </Button>
          {onApprove && status !== 'warning' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprovar Etapa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
