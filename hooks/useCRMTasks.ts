/**
 * RENDIZY - CRM Tasks Hooks
 * 
 * React Query hooks para o sistema de tarefas CRM v2
 * Gerenciamento de estado reativo com cache automático
 * 
 * @version 2.1.0
 * @date 2026-01-28
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  teamsService,
  tasksService,
  taskCommentsService,
  operationalTasksService,
  projectsService,
  customFieldsService,
  taskActivitiesService,
  tasksDashboardService,
  Team,
  CRMTask,
  OperationalTask,
  CRMProject,
  CustomField,
  TaskStatus,
  TaskPriority,
} from '@/utils/services/crmTasksService';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const crmTasksKeys = {
  all: ['crm-tasks'] as const,
  teams: () => [...crmTasksKeys.all, 'teams'] as const,
  team: (id: string) => [...crmTasksKeys.teams(), id] as const,
  teamMembers: (teamId: string) => [...crmTasksKeys.team(teamId), 'members'] as const,
  
  tasks: () => [...crmTasksKeys.all, 'tasks'] as const,
  tasksList: (filters?: Record<string, any>) => [...crmTasksKeys.tasks(), 'list', filters] as const,
  task: (id: string) => [...crmTasksKeys.tasks(), id] as const,
  subtasks: (parentId: string) => [...crmTasksKeys.task(parentId), 'subtasks'] as const,
  myTasks: (userId: string) => [...crmTasksKeys.tasks(), 'my', userId] as const,
  tasksByDate: (start: string, end: string) => [...crmTasksKeys.tasks(), 'date-range', start, end] as const,
  
  comments: (taskId: string) => [...crmTasksKeys.task(taskId), 'comments'] as const,
  activities: (taskId: string) => [...crmTasksKeys.task(taskId), 'activities'] as const,
  
  operational: () => [...crmTasksKeys.all, 'operational'] as const,
  checkIns: (date: string) => [...crmTasksKeys.operational(), 'checkins', date] as const,
  checkOuts: (date: string) => [...crmTasksKeys.operational(), 'checkouts', date] as const,
  cleanings: (filters?: Record<string, any>) => [...crmTasksKeys.operational(), 'cleanings', filters] as const,
  maintenances: (filters?: Record<string, any>) => [...crmTasksKeys.operational(), 'maintenances', filters] as const,
  
  projects: () => [...crmTasksKeys.all, 'projects'] as const,
  project: (id: string) => [...crmTasksKeys.projects(), id] as const,
  projectsWithStats: () => [...crmTasksKeys.projects(), 'with-stats'] as const,
  
  customFields: (scope: string) => [...crmTasksKeys.all, 'custom-fields', scope] as const,
  
  dashboard: () => [...crmTasksKeys.all, 'dashboard'] as const,
  dashboardStats: () => [...crmTasksKeys.dashboard(), 'stats'] as const,
  operationalStats: (date: string) => [...crmTasksKeys.dashboard(), 'operational-stats', date] as const,
};

// ============================================================================
// TEAMS HOOKS
// ============================================================================

export function useTeams() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.teams(),
    queryFn: () => teamsService.getAll(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: crmTasksKeys.team(id),
    queryFn: () => teamsService.getById(id),
    enabled: !!id,
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: crmTasksKeys.teamMembers(teamId),
    queryFn: () => teamsService.getMembers(teamId),
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (team: Omit<Team, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) =>
      teamsService.create({ ...team, organization_id: orgId!, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.teams() });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Team> }) =>
      teamsService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.teams() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.team(id) });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => teamsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.teams() });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: string; userId: string; role?: 'leader' | 'member' }) =>
      teamsService.addMember(teamId, userId, role),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.teamMembers(teamId) });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, memberId }: { teamId: string; memberId: string }) =>
      teamsService.removeMember(teamId, memberId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.teamMembers(teamId) });
    },
  });
}

// ============================================================================
// TASKS HOOKS
// ============================================================================

export function useTasks(filters?: {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  teamId?: string;
  projectId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.tasksList(filters),
    queryFn: () => tasksService.getAll(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: crmTasksKeys.task(id),
    queryFn: () => tasksService.getById(id),
    enabled: !!id,
  });
}

export function useSubtasks(parentTaskId: string) {
  return useQuery({
    queryKey: crmTasksKeys.subtasks(parentTaskId),
    queryFn: () => tasksService.getSubtasks(parentTaskId),
    enabled: !!parentTaskId,
  });
}

export function useMyTasks() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: crmTasksKeys.myTasks(userId!),
    queryFn: () => tasksService.getMyTasks(userId!),
    enabled: !!userId,
  });
}

export function useTasksByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.tasksByDate(startDate, endDate),
    queryFn: () => tasksService.getByDateRange(orgId!, startDate, endDate),
    enabled: !!orgId && !!startDate && !!endDate,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const userId = user?.id;

  return useMutation({
    mutationFn: (task: Omit<CRMTask, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>) =>
      tasksService.create({ ...task, organization_id: orgId!, created_by: userId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CRMTask> }) =>
      tasksService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.task(id) });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

// ============================================================================
// TASK COMMENTS HOOKS
// ============================================================================

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: crmTasksKeys.comments(taskId),
    queryFn: () => taskCommentsService.getByTask(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: ({ taskId, content, mentions }: { taskId: string; content: string; mentions?: string[] }) =>
      taskCommentsService.create({ task_id: taskId, user_id: userId!, content, mentions }),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.comments(taskId) });
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; taskId: string }) =>
      taskCommentsService.delete(id),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.comments(taskId) });
    },
  });
}

// ============================================================================
// OPERATIONAL TASKS HOOKS (Check-ins, Check-outs, Limpezas, Manutenções)
// ============================================================================

export function useCheckIns(date?: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.checkIns(targetDate),
    queryFn: () => operationalTasksService.getCheckIns(orgId!, targetDate),
    enabled: !!orgId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

export function useCheckOuts(date?: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.checkOuts(targetDate),
    queryFn: () => operationalTasksService.getCheckOuts(orgId!, targetDate),
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useCleanings(filters?: { status?: TaskStatus[]; date?: string }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.cleanings(filters),
    queryFn: () => operationalTasksService.getCleanings(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useMaintenances(filters?: { status?: TaskStatus[]; priority?: TaskPriority }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.maintenances(filters),
    queryFn: () => operationalTasksService.getMaintenances(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateOperationalTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const userId = user?.id;

  return useMutation({
    mutationFn: (task: Omit<OperationalTask, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) =>
      operationalTasksService.create({ ...task, organization_id: orgId!, created_by: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.operational() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

export function useUpdateOperationalTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OperationalTask> }) =>
      operationalTasksService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.operational() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

export function useMarkOperationalTaskStarted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => operationalTasksService.markAsStarted(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.operational() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

export function useMarkOperationalTaskCompleted() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      operationalTasksService.markAsCompleted(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.operational() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    },
  });
}

// ============================================================================
// PROJECTS HOOKS
// ============================================================================

export function useProjects() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.projects(),
    queryFn: () => projectsService.getAll(orgId!),
    enabled: !!orgId,
  });
}

export function useProjectsWithStats() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.projectsWithStats(),
    queryFn: () => projectsService.getWithStats(orgId!),
    enabled: !!orgId,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: crmTasksKeys.project(id),
    queryFn: () => projectsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const userId = user?.id;

  return useMutation({
    mutationFn: (project: Omit<CRMProject, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>) =>
      projectsService.create({ ...project, organization_id: orgId!, created_by: userId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.projects() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CRMProject> }) =>
      projectsService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.projects() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.project(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.projects() });
    },
  });
}

// ============================================================================
// CUSTOM FIELDS HOOKS
// ============================================================================

export function useCustomFields(scope: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.customFields(scope),
    queryFn: () => customFieldsService.getByScope(orgId!, scope),
    enabled: !!orgId && !!scope,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: (field: Omit<CustomField, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) =>
      customFieldsService.create({ ...field, organization_id: orgId! }),
    onSuccess: (field) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.customFields(field.scope || 'task') });
    },
  });
}

// ============================================================================
// TASK ACTIVITIES HOOKS
// ============================================================================

export function useTaskActivities(taskId: string) {
  return useQuery({
    queryKey: crmTasksKeys.activities(taskId),
    queryFn: () => taskActivitiesService.getByTask(taskId),
    enabled: !!taskId,
  });
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

export function useTasksDashboardStats() {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: crmTasksKeys.dashboardStats(),
    queryFn: () => tasksDashboardService.getStats(orgId!),
    enabled: !!orgId,
    refetchInterval: 60000, // Atualiza a cada minuto
  });
}

export function useOperationalDashboardStats(date?: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.operationalStats(targetDate),
    queryFn: () => tasksDashboardService.getOperationalStats(orgId!, targetDate),
    enabled: !!orgId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

import { useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/utils/services/crmTasksService';

/**
 * Hook para subscription Realtime nas tarefas CRM
 * Invalida o cache automaticamente quando há mudanças no banco
 */
export function useCRMTasksRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  const handleTaskChange = useCallback((payload: any) => {
    console.log('[Realtime] Task change:', payload.eventType, payload);
    
    // Invalida todas as queries de tarefas
    queryClient.invalidateQueries({ queryKey: crmTasksKeys.tasks() });
    queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
    
    // Se é update ou delete, invalida a tarefa específica
    if (payload.old?.id) {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.task(payload.old.id) });
    }
    if (payload.new?.id) {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.task(payload.new.id) });
    }
  }, [queryClient]);

  const handleOperationalTaskChange = useCallback((payload: any) => {
    console.log('[Realtime] Operational task change:', payload.eventType, payload);
    
    // Invalida todas as queries operacionais
    queryClient.invalidateQueries({ queryKey: crmTasksKeys.operational() });
    queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
  }, [queryClient]);

  const handleTeamChange = useCallback((payload: any) => {
    console.log('[Realtime] Team change:', payload.eventType, payload);
    queryClient.invalidateQueries({ queryKey: crmTasksKeys.teams() });
  }, [queryClient]);

  const handleCommentChange = useCallback((payload: any) => {
    console.log('[Realtime] Comment change:', payload.eventType, payload);
    const taskId = payload.new?.task_id || payload.old?.task_id;
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.comments(taskId) });
    }
  }, [queryClient]);

  useEffect(() => {
    if (!orgId) return;

    const supabase = getSupabaseClient();
    
    // Subscribe to crm_tasks changes
    const tasksChannel = supabase
      .channel('crm_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks',
          filter: `organization_id=eq.${orgId}`,
        },
        handleTaskChange
      )
      .subscribe();

    // Subscribe to operational_tasks changes
    const operationalChannel = supabase
      .channel('operational_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_tasks',
          filter: `organization_id=eq.${orgId}`,
        },
        handleOperationalTaskChange
      )
      .subscribe();

    // Subscribe to teams changes
    const teamsChannel = supabase
      .channel('teams_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `organization_id=eq.${orgId}`,
        },
        handleTeamChange
      )
      .subscribe();

    // Subscribe to task_comments changes
    const commentsChannel = supabase
      .channel('task_comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
        },
        handleCommentChange
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(operationalChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [orgId, handleTaskChange, handleOperationalTaskChange, handleTeamChange, handleCommentChange]);
}

/**
 * Hook para subscription Realtime nas tarefas operacionais do dia
 * Útil para páginas de check-in, check-out, limpeza, manutenção
 */
export function useOperationalTasksRealtime(date?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const targetDate = date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!orgId) return;

    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel(`operational_tasks_${targetDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_tasks',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
          console.log('[Realtime] Operational task update:', payload);
          
          // Invalida queries específicas por tipo de evento
          queryClient.invalidateQueries({ queryKey: crmTasksKeys.checkIns(targetDate) });
          queryClient.invalidateQueries({ queryKey: crmTasksKeys.checkOuts(targetDate) });
          queryClient.invalidateQueries({ queryKey: crmTasksKeys.cleanings({ date: targetDate }) });
          queryClient.invalidateQueries({ queryKey: crmTasksKeys.maintenances({ date: targetDate }) });
          queryClient.invalidateQueries({ queryKey: crmTasksKeys.operationalStats(targetDate) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, targetDate, queryClient]);
}
// ============================================================================
// TASK GENERATION HOOKS
// ============================================================================

/**
/**
 * Hook para gerar tarefas operacionais para reservas existentes
 * Chama a função RPC do Supabase
 * 
 * NOTA: Esta função RPC deve ser criada no banco via migration 2026012708
 */
export function useGenerateTasksForReservations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ fromDate, toDate }: { fromDate?: string; toDate?: string }) => {
      if (!orgId) throw new Error('Organization ID required');
      
      const supabase = getSupabaseClient();
      // Usando @ts-ignore temporariamente até regenerar os tipos do Supabase
      // @ts-ignore - RPC function criada em migration 2026012708
      const { data, error } = await supabase.rpc('generate_tasks_for_existing_reservations', {
        p_organization_id: orgId,
        p_from_date: fromDate || new Date().toISOString().split('T')[0],
        p_to_date: toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as Array<{ reservation_id: string; tasks_created: number }>;
    },
    onSuccess: () => {
      // Invalida todas as queries operacionais
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.operational() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboardStats() });
    },
  });
}

/**
 * Hook para obter estatísticas de geração de tarefas
 */
export function useTaskGenerationStats(date: string) {
  const { user } = useAuth();
  const orgId = user?.organizationId;

  return useQuery({
    queryKey: [...crmTasksKeys.operational(), 'generation-stats', date],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID required');
      
      const supabase = getSupabaseClient();
      
      // Conta tarefas pendentes vs total para o dia
      const { data: pendingCount, error: pendingError } = await supabase
        .from('operational_tasks')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('scheduled_date', date)
        .eq('status', 'pending');

      const { data: totalCount, error: totalError } = await supabase
        .from('operational_tasks')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('scheduled_date', date);

      if (pendingError || totalError) throw pendingError || totalError;

      return {
        pendingTasks: pendingCount?.length || 0,
        totalTasks: totalCount?.length || 0,
        completedTasks: (totalCount?.length || 0) - (pendingCount?.length || 0),
      };
    },
    enabled: !!orgId && !!date,
    staleTime: 60 * 1000, // 1 minuto
  });
}