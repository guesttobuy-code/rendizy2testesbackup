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
  operationalTaskTemplatesService,
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
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: crmTasksKeys.dashboard() });
      // Invalida subtasks do pai se for uma subtarefa
      if (newTask.parent_id) {
        queryClient.invalidateQueries({ queryKey: crmTasksKeys.subtasks(newTask.parent_id) });
        // Também invalida o pai do pai (para sub-subtarefas)
        queryClient.invalidateQueries({ queryKey: ['crm-tasks', 'subtasks'] });
      }
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
 * Dados de configuração de check-in do imóvel
 */
interface PropertyCheckinData {
  name: string;
  address?: string;
  checkin_category?: string | null;
  checkin_config?: Record<string, any> | null;
}

/**
 * Converte uma Reservation em OperationalTask para exibição na tela de operações
 * Permite usar os mesmos componentes visuais mantendo compatibilidade
 */
function reservationToOperationalTask(
  reservation: Reservation, 
  type: 'checkin' | 'checkout',
  propertyData?: PropertyCheckinData
): OperationalTask {
  const propertyName = propertyData?.name;
  const propertyAddress = propertyData?.address;
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
      // ============================================
      // DADOS DE CONFIGURAÇÃO DE CHECK-IN DO IMÓVEL
      // ============================================
      checkin_category: propertyData?.checkin_category || null,
      checkin_config: propertyData?.checkin_config || null,
    },
  };
}

/**
 * ============================================================================
 * HOOK: useCheckIns - TAREFAS DE GESTÃO DE CHECK-IN
 * ============================================================================
 * 
 * LÓGICA DE NEGÓCIO:
 * - A tarefa de check-in NÃO aparece no dia do check-in, mas sim baseada na 
 *   ANTECEDÊNCIA configurada no imóvel (checkin_config.notice_type/notice_days)
 * 
 * CONFIGURAÇÕES:
 * - "no_ato" (URGÊNCIA): Tarefa aparece imediatamente quando a reserva é criada
 * - "dias_antes" (X dias): Tarefa aparece X dias antes da data do check-in
 * - "livre": Tarefa sempre visível
 * - Sem config: Default = 3 dias antes do check-in
 * 
 * REGRAS:
 * 1. Só 2 status: Pendente ou Concluído (checked_in)
 * 2. Pendências acumulam: Se não foi resolvido, aparece hoje (não fica no passado)
 * 3. Mostrar urgência: Badge com "Faltam X dias" ou "ATRASADO X dias"
 * 4. Ordenação: Mais próximo do check-in no topo (mais urgente)
 * 5. Concluídos: Ficam fixos no dia em que foram concluídos (como log)
 * 
 * @param date - Não usado mais para filtrar por data de check-in (mantido para compatibilidade)
 */
export function useCheckIns(date?: string) {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.checkIns(date || today),
    queryFn: async (): Promise<OperationalTask[]> => {
      // ========================================================================
      // PASSO 1: Buscar TODAS as reservas pendentes de check-in
      // Incluindo: futuras + atrasadas (check-in passou mas não foi concluído)
      // ========================================================================
      
      // Buscar reservas futuras (até 60 dias à frente para cobrir todos os prazos)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      // Buscar reservas que ainda não fizeram check-in
      const pendingResponse = await reservationsApi.listPaged({
        checkInFrom: '2020-01-01', // Data bem no passado para pegar atrasados
        checkInTo: futureDateStr,
        status: ['confirmed', 'pending'], // Ainda não fez check-in
        limit: 500,
      });

      // Buscar reservas que JÁ fizeram check-in HOJE (para mostrar como concluídas)
      const completedTodayResponse = await reservationsApi.listPaged({
        checkInFrom: today,
        checkInTo: today,
        status: ['checked_in', 'checked_out'],
        limit: 100,
      });

      const pendingReservations = pendingResponse.success && pendingResponse.data?.data 
        ? pendingResponse.data.data 
        : [];
      
      const completedTodayReservations = completedTodayResponse.success && completedTodayResponse.data?.data
        ? completedTodayResponse.data.data
        : [];

      // ========================================================================
      // PASSO 2: Buscar propriedades COM dados de checkin_config
      // ========================================================================
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      let propertiesMap = new Map<string, PropertyCheckinData>();
      
      try {
        const propsResponse = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/lista`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
            'Content-Type': 'application/json'
          }
        });
        
        if (propsResponse.ok) {
          const result = await propsResponse.json();
          const props = result.anuncios || [];
          
          props.forEach((p: any) => {
            const data = p.data || {};
            const internalName = data.internalId || data.internal_id || p.internalId || '';
            const addressData = data.address || data.endereco || {};
            const addressStr = addressData.street 
              ? `${addressData.street || ''}, ${addressData.number || ''} - ${addressData.neighborhood || ''}, ${addressData.city || ''}`.trim().replace(/^, |, $|, - ,/g, '')
              : '';
            
            propertiesMap.set(p.id, { 
              name: internalName || `Imóvel ${p.id.slice(0, 8)}`,
              address: addressStr,
              checkin_category: p.checkin_category || null,
              checkin_config: p.checkin_config || null,
            });
          });
          console.log(`✅ [useCheckIns] ${props.length} propriedades carregadas com dados de checkin`);
        }
      } catch (err) {
        console.error('❌ [useCheckIns] Erro ao buscar propriedades com checkin:', err);
      }

      // ========================================================================
      // PASSO 3: Filtrar reservas baseado na configuração de antecedência
      // ========================================================================
      const todayDate = new Date(today);
      
      const filteredReservations = pendingReservations.filter(reservation => {
        const propData = propertiesMap.get(reservation.propertyId);
        const checkinConfig = propData?.checkin_config;
        const noticeType = checkinConfig?.notice_type || 'dias_antes'; // Default
        const noticeDays = checkinConfig?.notice_days || 3; // Default: 3 dias
        
        // Data do check-in
        const checkInDateStr = typeof reservation.checkIn === 'string' 
          ? reservation.checkIn 
          : reservation.checkIn?.toISOString().split('T')[0];
        
        if (!checkInDateStr) return false;
        
        const checkInDate = new Date(checkInDateStr);
        const daysUntilCheckin = Math.floor((checkInDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Regras de visibilidade baseada na antecedência:
        switch (noticeType) {
          case 'no_ato':
            // URGÊNCIA: Sempre visível desde a criação da reserva
            return true;
            
          case 'dias_antes':
            // Visível X dias antes do check-in OU se já passou (atrasado)
            return daysUntilCheckin <= noticeDays;
            
          case 'livre':
            // Sempre visível
            return true;
            
          default:
            // Default: 3 dias antes ou atrasado
            return daysUntilCheckin <= 3;
        }
      });

      // ========================================================================
      // PASSO 4: Converter para OperationalTask com metadados de urgência
      // ========================================================================
      const tasks: OperationalTask[] = [];
      
      // Adicionar tarefas PENDENTES
      filteredReservations.forEach(reservation => {
        const propData = propertiesMap.get(reservation.propertyId);
        const task = reservationToOperationalTask(reservation, 'checkin', propData);
        
        // Calcular dias até o check-in
        const checkInDateStr = typeof reservation.checkIn === 'string' 
          ? reservation.checkIn 
          : reservation.checkIn?.toISOString().split('T')[0];
        
        if (checkInDateStr) {
          const checkInDate = new Date(checkInDateStr);
          const daysUntilCheckin = Math.floor((checkInDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Adicionar metadados de urgência
          task.metadata = {
            ...task.metadata,
            days_until_checkin: daysUntilCheckin,
            urgency_label: daysUntilCheckin < 0 
              ? `ATRASADO ${Math.abs(daysUntilCheckin)} dia${Math.abs(daysUntilCheckin) > 1 ? 's' : ''}`
              : daysUntilCheckin === 0 
                ? 'CHECK-IN HOJE!'
                : daysUntilCheckin === 1 
                  ? 'Amanhã'
                  : `Faltam ${daysUntilCheckin} dias`,
            is_overdue: daysUntilCheckin < 0,
            is_today: daysUntilCheckin === 0,
            // Flag antiga de urgência: manter compatibilidade
            hasCheckinToday: daysUntilCheckin === 0,
          };
        }
        
        tasks.push(task);
      });
      
      // Adicionar tarefas CONCLUÍDAS HOJE (para histórico)
      completedTodayReservations.forEach(reservation => {
        const propData = propertiesMap.get(reservation.propertyId);
        const task = reservationToOperationalTask(reservation, 'checkin', propData);
        task.metadata = {
          ...task.metadata,
          days_until_checkin: 0,
          urgency_label: 'Concluído',
          is_overdue: false,
          is_today: true,
        };
        tasks.push(task);
      });

      // ========================================================================
      // PASSO 5: Ordenar por urgência (mais próximo do check-in primeiro)
      // Atrasados > Hoje > Amanhã > Próximos dias
      // ========================================================================
      tasks.sort((a, b) => {
        const daysA = a.metadata?.days_until_checkin ?? 999;
        const daysB = b.metadata?.days_until_checkin ?? 999;
        
        // Concluídos vão para o final
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        
        // Entre pendentes: ordenar por dias até check-in
        return daysA - daysB;
      });

      console.log(`✅ [useCheckIns] ${tasks.length} tarefas de gestão de check-in (${filteredReservations.length} pendentes + ${completedTodayReservations.length} concluídas hoje)`);
      return tasks;
    },
    enabled: !!user,
    refetchInterval: 30000,
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
      // Incluir checked_out para mostrar também os que já foram concluídos
      const response = await reservationsApi.listPaged({
        checkOutFrom: targetDate,
        checkOutTo: targetDate,
        status: ['confirmed', 'pending', 'checked_in', 'checked_out'],
        limit: 100,
      });

      if (!response.success || !response.data?.data) {
        console.error('❌ [useCheckOuts] Erro ao buscar check-outs:', response.error);
        return [];
      }

      const reservations = response.data.data;

      // Buscar propriedades COM dados de checkin via API
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      let propertiesMap = new Map<string, PropertyCheckinData>();
      
      try {
        const propsResponse = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/lista`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
            'Content-Type': 'application/json'
          }
        });
        
        if (propsResponse.ok) {
          const result = await propsResponse.json();
          const props = result.anuncios || [];
          
          props.forEach((p: any) => {
            const data = p.data || {};
            const internalName = data.internalId || data.internal_id || p.internalId || '';
            const addressData = data.address || data.endereco || {};
            const addressStr = addressData.street 
              ? `${addressData.street || ''}, ${addressData.number || ''} - ${addressData.neighborhood || ''}, ${addressData.city || ''}`.trim().replace(/^, |, $|, - ,/g, '')
              : '';
            
            propertiesMap.set(p.id, { 
              name: internalName || `Imóvel ${p.id.slice(0, 8)}`,
              address: addressStr,
              checkin_category: p.checkin_category || null,
              checkin_config: p.checkin_config || null,
            });
          });
        }
      } catch (err) {
        console.error('❌ [useCheckOuts] Erro ao buscar propriedades:', err);
        // Fallback: usar API antiga
        const propertiesResponse = await propertiesApi.list();
        if (propertiesResponse.success && propertiesResponse.data) {
          propertiesResponse.data.forEach(p => {
            propertiesMap.set(p.id, { 
              name: p.name,
              address: p.address ? `${p.address.street || ''}, ${p.address.number || ''} - ${p.address.neighborhood || ''}, ${p.address.city || ''}`.trim().replace(/^, |, $|, - ,/g, '') : ''
            });
          });
        }
      }

      // Converter reservas para OperationalTask
      const tasks = reservations.map(reservation => {
        const propData = propertiesMap.get(reservation.propertyId);
        return reservationToOperationalTask(
          reservation, 
          'checkout',
          propData
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

/**
 * Hook para buscar Limpezas do dia
 * Combina:
 * 1. Tarefas já criadas na tabela operational_tasks
 * 2. Tarefas geradas dinamicamente a partir dos templates de limpeza + checkouts do dia
 */
export function useCleanings(filters?: { status?: TaskStatus[]; date?: string }) {
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const targetDate = filters?.date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: crmTasksKeys.cleanings({ ...filters, date: targetDate }),
    queryFn: async (): Promise<OperationalTask[]> => {
      if (!orgId) return [];

      // 1. Buscar tarefas de limpeza já existentes no banco
      const existingTasks = await operationalTasksService.getCleanings(orgId, { ...filters, date: targetDate });
      
      // 2. Buscar checkouts do dia para gerar tarefas a partir dos templates
      const checkoutsResponse = await reservationsApi.listPaged({
        checkOutFrom: targetDate,
        checkOutTo: targetDate,
        status: ['confirmed', 'pending', 'checked_in', 'checked_out'],
        limit: 100,
      });

      // 3. Buscar checkins do dia para gerar tarefas vinculadas a check-in
      const checkinsResponse = await reservationsApi.listPaged({
        checkInFrom: targetDate,
        checkInTo: targetDate,
        status: ['confirmed', 'pending', 'checked_in'],
        limit: 100,
      });

      // Buscar nomes das propriedades
      const propertiesResponse = await propertiesApi.list();
      const propertiesMap = new Map<string, string>();
      if (propertiesResponse.success && propertiesResponse.data) {
        propertiesResponse.data.forEach(p => propertiesMap.set(p.id, p.name));
      }

      // 4. Gerar tarefas de limpeza a partir dos checkouts
      let generatedFromCheckouts: OperationalTask[] = [];
      if (checkoutsResponse.success && checkoutsResponse.data?.data) {
        const checkoutData = checkoutsResponse.data.data.map(r => ({
          id: r.id,
          propertyId: r.propertyId,
          propertyName: propertiesMap.get(r.propertyId) || r.propertyId.substring(0, 8),
          checkOut: r.checkOut,
          guestName: r.guest?.name || '',
        }));
        generatedFromCheckouts = await operationalTaskTemplatesService.generateCleaningTasksFromCheckouts(
          orgId,
          checkoutData
        );
      }

      // 5. Gerar tarefas de limpeza a partir dos checkins
      let generatedFromCheckins: OperationalTask[] = [];
      if (checkinsResponse.success && checkinsResponse.data?.data) {
        const checkinData = checkinsResponse.data.data.map(r => ({
          id: r.id,
          propertyId: r.propertyId,
          propertyName: propertiesMap.get(r.propertyId) || r.propertyId.substring(0, 8),
          checkIn: r.checkIn,
          guestName: r.guest?.name || '',
        }));
        generatedFromCheckins = await operationalTaskTemplatesService.generateCleaningTasksFromCheckins(
          orgId,
          checkinData
        );
      }

      // 6. Filtrar tarefas geradas que já existem no banco (evitar duplicatas)
      const existingReservationIds = new Set(
        existingTasks
          .filter(t => t.reservation_id)
          .map(t => t.reservation_id)
      );
      
      const newGeneratedTasks = [
        ...generatedFromCheckouts.filter(t => !existingReservationIds.has(t.reservation_id)),
        ...generatedFromCheckins.filter(t => !existingReservationIds.has(t.reservation_id)),
      ];

      // 7. Combinar e retornar
      const allTasks = [...existingTasks, ...newGeneratedTasks];
      
      // Filtrar por status se necessário
      if (filters?.status?.length) {
        return allTasks.filter(t => filters.status!.includes(t.status as TaskStatus));
      }

      console.log(`✅ [useCleanings] ${existingTasks.length} existentes + ${newGeneratedTasks.length} geradas = ${allTasks.length} limpezas`);
      return allTasks;
    },
    enabled: !!orgId,
    refetchInterval: 30000,
    staleTime: 30000,
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