/**
 * RENDIZY - CRM Tasks Hooks
 * 
 * React Query hooks para o sistema de tarefas CRM v2
 * Gerenciamento de estado reativo com cache automático
 * 
 * @version 2.2.0
 * @date 2026-01-30
 * 
 * CHANGELOG v2.2.0:
 * - Check-ins e Check-outs agora vêm diretamente da tabela `reservations`
 * - Dados em tempo real baseados nas reservas confirmadas/pendentes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { reservationsApi, propertiesApi } from '@/utils/api';
import type { Reservation } from '@/types/reservation';
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

/**
 * Converte uma Reservation em OperationalTask para exibição na tela de operações
 * Permite usar os mesmos componentes visuais mantendo compatibilidade
 */
function reservationToOperationalTask(
  reservation: Reservation, 
  type: 'checkin' | 'checkout',
  propertyName?: string,
  propertyAddress?: string
): OperationalTask {
  const checkDate = type === 'checkin' 
    ? (typeof reservation.checkIn === 'string' ? reservation.checkIn : reservation.checkIn?.toISOString().split('T')[0])
    : (typeof reservation.checkOut === 'string' ? reservation.checkOut : reservation.checkOut?.toISOString().split('T')[0]);
  
  const guestCount = reservation.guests?.total || reservation.guests?.adults || 1;
  
  // Extrair data de criação da reserva (só a parte da data, sem hora)
  const createdAtDate = reservation.createdAt 
    ? (typeof reservation.createdAt === 'string' 
        ? reservation.createdAt.split('T')[0] 
        : reservation.createdAt.toISOString().split('T')[0])
    : null;
  
  // Extrair data do check-in
  const checkInDate = typeof reservation.checkIn === 'string' 
    ? reservation.checkIn 
    : reservation.checkIn?.toISOString().split('T')[0];
  
  // URGENTE: reserva criada no mesmo dia do check-in (reserva de última hora)
  const isLastMinuteBooking = createdAtDate && checkInDate && createdAtDate === checkInDate;
  
  // Converter internalComments (string com linhas) para array de comentários
  const parseComments = (commentsStr?: string) => {
    if (!commentsStr) return [];
    return commentsStr.split('\n').filter(line => line.trim()).map((line, idx) => {
      // Formato esperado: [dd/MM/yyyy HH:mm] texto do comentário
      const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        return {
          id: `comment-${idx}`,
          text: match[2],
          author: 'Equipe',
          createdAt: match[1],
        };
      }
      return {
        id: `comment-${idx}`,
        text: line,
        author: 'Equipe',
        createdAt: '',
      };
    });
  };
  
  const comments = parseComments(reservation.internalComments);
  
  return {
    id: `${reservation.id}-${type}`, // ID composto para diferenciar checkin/checkout da mesma reserva
    organization_id: '', // Não usado na exibição
    title: type === 'checkin' 
      ? `Check-in: ${reservation.guestName || 'Hóspede'}`
      : `Check-out: ${reservation.guestName || 'Hóspede'}`,
    description: propertyName 
      ? `${propertyName} • ${guestCount} hóspede(s) • ${reservation.nights || 1} noite(s)`
      : `${guestCount} hóspede(s) • ${reservation.nights || 1} noite(s)`,
    status: reservation.status === 'checked_in' || reservation.status === 'checked_out' 
      ? 'completed' 
      : 'pending',
    priority: 'medium',
    scheduled_date: checkDate || new Date().toISOString().split('T')[0],
    scheduled_time: type === 'checkin' 
      ? reservation.checkInTime || '14:00'
      : reservation.checkOutTime || '11:00',
    property_id: reservation.propertyId,
    reservation_id: reservation.id,
    triggered_by_event: type === 'checkin' ? 'checkin_day' : 'checkout_day',
    created_at: reservation.createdAt,
    updated_at: reservation.createdAt,
    // Campos enriquecidos
    property_name: propertyName,
    guest_name: reservation.guestName,
    metadata: {
      // Dados da propriedade
      property_name: propertyName,
      property_code: reservation.propertyId?.substring(0, 8) || '',
      property_address: propertyAddress || '',
      // Dados do hóspede
      guest_name: reservation.guestName,
      guest_phone: reservation.guestPhone || reservation.contact?.phone || '',
      guest_email: reservation.guestEmail || reservation.contact?.email || '',
      guest_count: guestCount,
      // Dados da reserva
      reservation_id: reservation.id,
      platform: reservation.platform,
      external_id: reservation.externalId,
      total_price: reservation.pricing?.total || reservation.price,
      guests: reservation.guests,
      nights: reservation.nights,
      created_at: reservation.createdAt,
      // Flag de urgência: reserva criada no mesmo dia do check-in (última hora)
      hasCheckinToday: type === 'checkin' && isLastMinuteBooking,
      // Comentários internos da equipe operacional
      comments: comments,
    },
  };
}

/**
 * Hook para buscar Check-ins do dia diretamente da tabela de reservas
 * @param date - Data no formato YYYY-MM-DD (default: hoje)
 */
export function useCheckIns(date?: string) {
  const { user } = useAuth();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.checkIns(targetDate),
    queryFn: async (): Promise<OperationalTask[]> => {
      // Usar API paginada que suporta checkInFrom/checkInTo
      const response = await reservationsApi.listPaged({
        checkInFrom: targetDate,
        checkInTo: targetDate,
        status: ['confirmed', 'pending', 'checked_in'],
        limit: 100,
      });

      if (!response.success || !response.data?.data) {
        console.error('❌ [useCheckIns] Erro ao buscar check-ins:', response.error);
        return [];
      }

      const reservations = response.data.data;

      // Buscar nomes das propriedades para enriquecer os dados
      const propertiesResponse = await propertiesApi.list();
      const propertiesMap = new Map<string, { name: string; address?: string }>();
      
      if (propertiesResponse.success && propertiesResponse.data) {
        propertiesResponse.data.forEach(p => {
          propertiesMap.set(p.id, { 
            name: p.name,
            address: p.address ? `${p.address.street || ''}, ${p.address.number || ''} - ${p.address.neighborhood || ''}, ${p.address.city || ''}`.trim().replace(/^, |, $|, - ,/g, '') : ''
          });
        });
      }

      // Converter reservas para OperationalTask
      const tasks = reservations.map(reservation => {
        const prop = propertiesMap.get(reservation.propertyId);
        return reservationToOperationalTask(
          reservation, 
          'checkin',
          prop?.name,
          prop?.address
        );
      });

      console.log(`✅ [useCheckIns] ${tasks.length} check-ins encontrados para ${targetDate}`);
      return tasks;
    },
    enabled: !!user,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    staleTime: 30000,
  });
}

/**
 * Hook para buscar Check-outs do dia diretamente da tabela de reservas
 * @param date - Data no formato YYYY-MM-DD (default: hoje)
 */
export function useCheckOuts(date?: string) {
  const { user } = useAuth();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.checkOuts(targetDate),
    queryFn: async (): Promise<OperationalTask[]> => {
      // Usar API paginada que suporta checkOutFrom/checkOutTo
      const response = await reservationsApi.listPaged({
        checkOutFrom: targetDate,
        checkOutTo: targetDate,
        status: ['confirmed', 'pending', 'checked_in'],
        limit: 100,
      });

      if (!response.success || !response.data?.data) {
        console.error('❌ [useCheckOuts] Erro ao buscar check-outs:', response.error);
        return [];
      }

      const reservations = response.data.data;

      // Buscar nomes das propriedades para enriquecer os dados
      const propertiesResponse = await propertiesApi.list();
      const propertiesMap = new Map<string, { name: string; address?: string }>();
      
      if (propertiesResponse.success && propertiesResponse.data) {
        propertiesResponse.data.forEach(p => {
          propertiesMap.set(p.id, { 
            name: p.name,
            address: p.address ? `${p.address.street || ''}, ${p.address.number || ''} - ${p.address.neighborhood || ''}, ${p.address.city || ''}`.trim().replace(/^, |, $|, - ,/g, '') : ''
          });
        });
      }

      // Converter reservas para OperationalTask
      const tasks = reservations.map(reservation => {
        const prop = propertiesMap.get(reservation.propertyId);
        return reservationToOperationalTask(
          reservation, 
          'checkout',
          prop?.name,
          prop?.address
        );
      });

      console.log(`✅ [useCheckOuts] ${tasks.length} check-outs encontrados para ${targetDate}`);
      return tasks;
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 30000,
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