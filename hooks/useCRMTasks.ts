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
