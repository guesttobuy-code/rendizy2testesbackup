/**
 * useCRMTemplates Hook
 * 
 * Hook React Query para gerenciar templates de tarefas e projetos.
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTaskFromTemplate,
  createProjectFromTemplate,
  createTemplateFromTask,
  createTemplateFromProject,
  type CRMTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateType,
} from '@/services/crm/crmTemplatesService';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const templateKeys = {
  all: ['crm-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: { type?: TemplateType; category?: string; search?: string; onlyMine?: boolean }) =>
    [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

// ============================================================================
// HOOKS DE LEITURA
// ============================================================================

/**
 * Lista templates disponíveis
 */
export function useTemplates(options?: {
  type?: TemplateType;
  category?: string;
  search?: string;
  onlyMine?: boolean;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: templateKeys.list({
      type: options?.type,
      category: options?.category,
      search: options?.search,
      onlyMine: options?.onlyMine,
    }),
    queryFn: () => getTemplates(options?.type, {
      category: options?.category,
      search: options?.search,
      onlyMine: options?.onlyMine,
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Busca um template específico
 */
export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: templateKeys.detail(id || ''),
    queryFn: () => getTemplateById(id!),
    enabled: !!id,
  });
}

// ============================================================================
// HOOKS DE MUTAÇÃO
// ============================================================================

/**
 * Criar template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success(`Modelo "${data.name}" criado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });
}

/**
 * Atualizar template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTemplateInput }) =>
      updateTemplate(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) });
      toast.success('Modelo atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar modelo: ${error.message}`);
    },
  });
}

/**
 * Excluir template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Modelo excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir modelo: ${error.message}`);
    },
  });
}

// ============================================================================
// HOOKS PARA CRIAR A PARTIR DE TEMPLATES
// ============================================================================

/**
 * Criar tarefa a partir de template
 */
export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, projectId, overrides }: {
      templateId: string;
      projectId: string;
      overrides?: Parameters<typeof createTaskFromTemplate>[2];
    }) => createTaskFromTemplate(templateId, projectId, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() }); // Atualizar use_count
      toast.success('Tarefa criada a partir do modelo!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar tarefa: ${error.message}`);
    },
  });
}

/**
 * Criar projeto a partir de template
 */
export function useCreateProjectFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, overrides }: {
      templateId: string;
      overrides?: Parameters<typeof createProjectFromTemplate>[1];
    }) => createProjectFromTemplate(templateId, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-projects'] });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() }); // Atualizar use_count
      toast.success('Projeto criado a partir do modelo!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar projeto: ${error.message}`);
    },
  });
}

// ============================================================================
// HOOKS PARA CRIAR TEMPLATES A PARTIR DE ITENS EXISTENTES
// ============================================================================

/**
 * Criar template a partir de tarefa existente
 */
export function useCreateTemplateFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, name, isPublic, options }: {
      taskId: string;
      name: string;
      isPublic: boolean;
      options?: { description?: string; category?: string };
    }) => createTemplateFromTask(taskId, name, isPublic, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success(`Modelo "${data.name}" criado a partir da tarefa!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });
}

/**
 * Criar template a partir de projeto existente
 */
export function useCreateTemplateFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, name, isPublic, options }: {
      projectId: string;
      name: string;
      isPublic: boolean;
      options?: { description?: string; category?: string; includeTasks?: boolean };
    }) => createTemplateFromProject(projectId, name, isPublic, options),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success(`Modelo "${data.name}" criado a partir do projeto!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });
}

export default {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useCreateTaskFromTemplate,
  useCreateProjectFromTemplate,
  useCreateTemplateFromTask,
  useCreateTemplateFromProject,
};
