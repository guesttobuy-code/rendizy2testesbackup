import React from 'react';
import { FunnelStage, ServiceTicket, StageRequirement } from '../../../types/funnels';
import { cn } from '../../../components/ui/utils';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  CheckCircle,
  Clock,
  Lock,
  AlertCircle,
  User,
  Calendar,
  ChevronRight,
  FileText,
  XCircle,
} from 'lucide-react';

export type StageStatus =
  | 'completed'
  | 'in_progress'
  | 'pending'
  | 'blocked'
  | 'rejected';

interface PredeterminedStageCardProps {
  stage: FunnelStage;
  stageIndex: number;
  status: StageStatus;
  ticket?: ServiceTicket;
  isCurrentStage: boolean;
  canInteract: boolean;
  responsibleName: string;
  responsibleType: 'user' | 'role';
  completedAt?: string;
  startedAt?: string;
  progress: number;
  requirements: StageRequirement[];
  onStageClick: () => void;
  onViewDetails?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onStart?: () => void;
}

export function PredeterminedStageCard({
  stage,
  stageIndex,
  status,
  ticket,
  isCurrentStage,
  canInteract,
  responsibleName,
  responsibleType,
  completedAt,
  startedAt,
  progress,
  requirements,
  onStageClick,
  onViewDetails,
  onApprove,
  onReject,
  onStart,
}: PredeterminedStageCardProps) {
  const statusConfig = {
    completed: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      label: 'Concluída',
    },
    in_progress: {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      label: 'Em Andamento',
    },
    pending: {
      icon: Clock,
      color: 'text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      label: 'Pendente',
    },
    blocked: {
      icon: Lock,
      color: 'text-gray-400',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      label: 'Bloqueada',
    },
    rejected: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      label: 'Rejeitada',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const requiredRequirements = requirements.filter((r) => r.required);
  const completedRequirements = requiredRequirements.filter(
    (r) => r.completed
  ).length;
  const totalRequirements = requiredRequirements.length;

  return (
    <Card
      className={cn(
        'relative transition-all duration-200',
        config.bg,
        config.border,
        isCurrentStage && 'ring-2 ring-blue-500',
        canInteract && 'cursor-pointer hover:shadow-lg',
        !canInteract && 'opacity-60'
      )}
      onClick={canInteract ? onStageClick : undefined}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 border">
              <span className="text-sm font-semibold text-gray-600">
                {stageIndex + 1}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">{stage.name}</h3>
              {stage.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stage.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusIcon className={cn('w-5 h-5', config.color)} />
            <Badge variant="secondary" className="text-xs">
              {config.label}
            </Badge>
          </div>
        </div>

        {/* Progress Bar (apenas para etapa em andamento) */}
        {status === 'in_progress' && totalRequirements > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progresso</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Responsável */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <User className="w-4 h-4" />
          <span>
            {responsibleType === 'role' ? 'Responsável: ' : ''}
            {responsibleName}
          </span>
        </div>

        {/* Requisitos */}
        {totalRequirements > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FileText className="w-4 h-4" />
              <span>
                {completedRequirements}/{totalRequirements} requisitos
              </span>
            </div>
            {status === 'in_progress' && (
              <div className="mt-2 space-y-1">
                {requiredRequirements.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {req.completed ? (
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-orange-600 flex-shrink-0" />
                    )}
                    <span className={cn(req.completed && 'line-through text-gray-400')}>
                      {req.title}
                    </span>
                  </div>
                ))}
                {requiredRequirements.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{requiredRequirements.length - 3} mais
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Datas */}
        {(startedAt || completedAt) && (
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            {startedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  Iniciada: {new Date(startedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {completedAt && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>
                  Concluída: {new Date(completedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {canInteract && (
          <div className="flex gap-2 mt-3">
            {status === 'in_progress' && onViewDetails && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="flex-1"
              >
                Ver Detalhes
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {status === 'in_progress' && onApprove && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
            )}
            {status === 'in_progress' && onReject && (
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
            )}
            {status === 'pending' && onStart && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                className="flex-1"
              >
                Iniciar Etapa
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Connector Line */}
      {stageIndex > 0 && (
        <div
          className={cn(
            'absolute left-8 -top-4 w-0.5 h-4',
            status === 'completed' ? 'bg-green-400' : 'bg-gray-300'
          )}
        />
      )}
    </Card>
  );
}
