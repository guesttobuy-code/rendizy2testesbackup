import React, { useMemo } from 'react';
import { ServiceTicket, FunnelStage, StageRequirement } from '../../types/funnels';
import { Badge } from '../ui/badge';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface StageValidationProps {
  stage: FunnelStage;
  ticket: ServiceTicket;
  requirements?: StageRequirement;
  onValidationChange?: (isValid: boolean, missingRequirements: string[]) => void;
}

export interface ValidationResult {
  isValid: boolean;
  missingRequirements: string[];
  details: {
    tasks: { valid: boolean; message: string };
    fields: { valid: boolean; message: string };
    approval: { valid: boolean; message: string };
    products: { valid: boolean; message: string };
    progress: { valid: boolean; message: string };
  };
}

export function validateStageRequirements(
  stage: FunnelStage,
  ticket: ServiceTicket,
  requirements?: StageRequirement
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missingRequirements: [],
    details: {
      tasks: { valid: true, message: '' },
      fields: { valid: true, message: '' },
      approval: { valid: true, message: '' },
      products: { valid: true, message: '' },
      progress: { valid: true, message: '' },
    },
  };

  if (!requirements) {
    return result;
  }

  // Validar tarefas obrigatórias
  if (requirements.requiredTasks && requirements.requiredTasks.length > 0) {
    const stageTasks = ticket.tasks?.filter(t => t.stageId === stage.id) || [];
    const requiredTaskIds = requirements.requiredTasks;
    const completedRequiredTasks = stageTasks.filter(
      t => requiredTaskIds.includes(t.id) && t.status === 'COMPLETED'
    );

    if (completedRequiredTasks.length < requiredTaskIds.length) {
      result.isValid = false;
      const missing = requiredTaskIds.length - completedRequiredTasks.length;
      result.details.tasks = {
        valid: false,
        message: `${missing} tarefa(s) obrigatória(s) não completada(s)`,
      };
      result.missingRequirements.push(`Tarefas obrigatórias: ${missing} pendente(s)`);
    } else {
      result.details.tasks = {
        valid: true,
        message: 'Todas as tarefas obrigatórias completas',
      };
    }
  }

  // Validar campos obrigatórios
  if (requirements.requiredFields && requirements.requiredFields.length > 0) {
    const missingFields: string[] = [];
    requirements.requiredFields.forEach(field => {
      // Verificar se o campo existe e não está vazio
      const fieldValue = (ticket as any)[field];
      if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      result.isValid = false;
      result.details.fields = {
        valid: false,
        message: `Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`,
      };
      result.missingRequirements.push(`Campos: ${missingFields.join(', ')}`);
    } else {
      result.details.fields = {
        valid: true,
        message: 'Todos os campos obrigatórios preenchidos',
      };
    }
  }

  // Validar aprovação (simplificado - pode ser expandido)
  if (requirements.requiredApproval) {
    // Verificar se há aprovação registrada (pode ser expandido com sistema de aprovações)
    const hasApproval = ticket.metadata?.stageApprovals?.[stage.id]?.approved === true;
    if (!hasApproval) {
      result.isValid = false;
      result.details.approval = {
        valid: false,
        message: 'Aprovação do responsável necessária',
      };
      result.missingRequirements.push('Aprovação pendente');
    } else {
      result.details.approval = {
        valid: true,
        message: 'Aprovação recebida',
      };
    }
  }

  // Validar produtos/orçamento
  if (requirements.requiredProducts) {
    const hasProducts = ticket.products && ticket.products.length > 0;
    if (!hasProducts) {
      result.isValid = false;
      result.details.products = {
        valid: false,
        message: 'Produtos/orçamento não adicionados',
      };
      result.missingRequirements.push('Produtos/orçamento necessário');
    } else {
      result.details.products = {
        valid: true,
        message: 'Produtos/orçamento adicionados',
      };
    }
  }

  // Validar progresso mínimo
  if (requirements.minProgress !== undefined) {
    const stageTasks = ticket.tasks?.filter(t => t.stageId === stage.id) || [];
    const completedTasks = stageTasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = stageTasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    if (progress < requirements.minProgress) {
      result.isValid = false;
      result.details.progress = {
        valid: false,
        message: `Progresso mínimo não atingido: ${progress.toFixed(0)}% (mínimo: ${requirements.minProgress}%)`,
      };
      result.missingRequirements.push(`Progresso: ${progress.toFixed(0)}% < ${requirements.minProgress}%`);
    } else {
      result.details.progress = {
        valid: true,
        message: `Progresso: ${progress.toFixed(0)}% (mínimo: ${requirements.minProgress}%)`,
      };
    }
  }

  return result;
}

export function StageValidation({
  stage,
  ticket,
  requirements,
  onValidationChange,
}: StageValidationProps) {
  const validationResult = useMemo(() => {
    return validateStageRequirements(stage, ticket, requirements);
  }, [stage, ticket, requirements]);

  // Notificar mudanças na validação
  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validationResult.isValid, validationResult.missingRequirements);
    }
  }, [validationResult.isValid, validationResult.missingRequirements, onValidationChange]);

  if (!requirements) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {validationResult.isValid ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-green-700 dark:text-green-400">
              Requisitos atendidos
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-orange-700 dark:text-orange-400">
              Requisitos não atendidos
            </span>
          </>
        )}
      </div>

      {/* Detalhes da Validação */}
      <div className="space-y-1 text-xs">
        {requirements.requiredTasks && (
          <div className="flex items-center gap-2">
            {validationResult.details.tasks.valid ? (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600" />
            )}
            <span className={validationResult.details.tasks.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
              {validationResult.details.tasks.message}
            </span>
          </div>
        )}

        {requirements.requiredFields && (
          <div className="flex items-center gap-2">
            {validationResult.details.fields.valid ? (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600" />
            )}
            <span className={validationResult.details.fields.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
              {validationResult.details.fields.message}
            </span>
          </div>
        )}

        {requirements.requiredApproval && (
          <div className="flex items-center gap-2">
            {validationResult.details.approval.valid ? (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600" />
            )}
            <span className={validationResult.details.approval.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
              {validationResult.details.approval.message}
            </span>
          </div>
        )}

        {requirements.requiredProducts && (
          <div className="flex items-center gap-2">
            {validationResult.details.products.valid ? (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600" />
            )}
            <span className={validationResult.details.products.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
              {validationResult.details.products.message}
            </span>
          </div>
        )}

        {requirements.minProgress !== undefined && (
          <div className="flex items-center gap-2">
            {validationResult.details.progress.valid ? (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600" />
            )}
            <span className={validationResult.details.progress.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
              {validationResult.details.progress.message}
            </span>
          </div>
        )}
      </div>

      {/* Lista de Requisitos Faltantes */}
      {!validationResult.isValid && validationResult.missingRequirements.length > 0 && (
        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
          <p className="text-xs font-medium text-orange-800 dark:text-orange-300 mb-1">
            Requisitos faltantes:
          </p>
          <ul className="text-xs text-orange-700 dark:text-orange-400 list-disc list-inside space-y-0.5">
            {validationResult.missingRequirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
