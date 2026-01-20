/**
 * Utilitários para cálculo de progresso de tarefas
 */

import { ServiceTicket, ServiceTask, TaskStatus } from '../types/funnels';

/**
 * Calcula o progresso de um ticket baseado em tarefas completas
 * Considera tarefas E subtarefas
 */
export function calculateTicketProgress(ticket: ServiceTicket): number {
  if (!ticket.tasks || ticket.tasks.length === 0) {
    return 0;
  }

  const completedTasks = ticket.tasks.filter(task => {
    // Tarefa completa se:
    // 1. Status é COMPLETED, OU
    // 2. Tem subtarefas e todas estão completas
    if (task.status === 'COMPLETED') {
      return true;
    }
    
    if (task.subtasks && task.subtasks.length > 0) {
      const allSubtasksCompleted = task.subtasks.every(
        subtask => subtask.status === 'COMPLETED'
      );
      return allSubtasksCompleted;
    }
    
    return false;
  }).length;

  return Math.round((completedTasks / ticket.tasks.length) * 100);
}

/**
 * Verifica se uma tarefa está completa
 */
export function isTaskComplete(task: ServiceTask): boolean {
  if (task.status === 'COMPLETED') {
    return true;
  }
  
  if (task.subtasks && task.subtasks.length > 0) {
    return task.subtasks.every(subtask => subtask.status === 'COMPLETED');
  }
  
  return false;
}

/**
 * Calcula progresso de uma tarefa específica (baseado em subtarefas)
 */
export function calculateTaskProgress(task: ServiceTask): number {
  if (task.status === 'COMPLETED') {
    return 100;
  }
  
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.status === 'COMPLETED' ? 100 : 0;
  }
  
  const completedSubtasks = task.subtasks.filter(
    subtask => subtask.status === 'COMPLETED'
  ).length;
  
  return Math.round((completedSubtasks / task.subtasks.length) * 100);
}

/**
 * Filtra tarefas por etapa do funil
 */
export function filterTasksByStage(tasks: ServiceTask[], stageId: string): ServiceTask[] {
  return tasks.filter(task => task.stageId === stageId);
}

/**
 * Conta tarefas por status
 */
export function countTasksByStatus(tasks: ServiceTask[]): {
  todo: number;
  inProgress: number;
  completed: number;
  blocked: number;
} {
  return {
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => isTaskComplete(t)).length,
    blocked: tasks.filter(t => t.status === 'BLOCKED').length,
  };
}

