/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS DASHBOARD V3 - UI COMPONENT                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Dashboard avançado com KPIs, gráficos e widgets personalizáveis
 * 
 * Features:
 * - KPIs em tempo real
 * - Gráficos de progresso e distribuição
 * - Widget de tarefas atrasadas
 * - Widget de SLA em risco
 * - Visão de equipe
 * - Timeline de atividades
 * - Meta semanal
 * 
 * @version 3.1.0
 * @date 2026-01-30
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  User,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  Building,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  ListTodo,
  Circle,
  Play,
  Eye,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow, differenceInHours, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Task, TaskStatus, TaskPriority, Team, TaskActivity } from '@/types/crm-tasks';
import { getStatusColor, getPriorityColor } from '@/types/crm-tasks';
import { useTasks, useTeams, useTasksDashboardStats } from '@/hooks/useCRMTasks';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface TasksDashboardProps {
  organizationId?: string;
  projectId?: string;
}

interface KPI {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'percent' | 'hours';
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

// ============================================================================
// MOCK DATA - Meta semanal e métricas
// ============================================================================

const MOCK_WEEKLY_TARGET = {
  target: 50,
  completed: 38,
};

const MOCK_TEAM_PERFORMANCE = [
  {
    id: '1',
    name: 'Rafael Marques',
    initials: 'RM',
    role: 'Gerente',
    totalTasks: 32,
    completed: 28,
    overdue: 1,
    avgTime: '1.8 dias',
  },
  {
    id: '2',
    name: 'Arthur Silva',
    initials: 'AS',
    role: 'Atendimento',
    totalTasks: 45,
    completed: 38,
    overdue: 3,
    avgTime: '2.2 dias',
  },
  {
    id: '3',
    name: 'Maria Teresa',
    initials: 'MT',
    role: 'Implantação',
    totalTasks: 28,
    completed: 22,
    overdue: 4,
    avgTime: '3.1 dias',
  },
  {
    id: '4',
    name: 'Rocha',
    initials: 'RO',
    role: 'Anúncios',
    totalTasks: 35,
    completed: 30,
    overdue: 2,
    avgTime: '2.0 dias',
  },
  {
    id: '5',
    name: 'João Fotos',
    initials: 'JF',
    role: 'Fotografia',
    totalTasks: 16,
    completed: 14,
    overdue: 1,
    avgTime: '1.5 dias',
  },
];

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    organization_id: 'org-1',
    title: 'Preparar imóvel para check-in',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date().toISOString(),
    assignee_id: 'user-1',
    team_id: 'team-1',
    depth: 0, path: '/1',
    subtask_count: 4, completed_subtask_count: 2,
    is_operational: true,
    property_id: 'prop-1',
    sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    created_at: '', updated_at: '',
  },
  {
    id: '2',
    organization_id: 'org-1',
    title: 'Limpeza pós check-out',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-2',
    team_id: 'team-2',
    depth: 0, path: '/2',
    subtask_count: 6, completed_subtask_count: 0,
    is_operational: true,
    property_id: 'prop-2',
    sla_deadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    created_at: '', updated_at: '',
  },
  {
    id: '3',
    organization_id: 'org-1',
    title: 'Manutenção preventiva',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    team_id: 'team-3',
    depth: 0, path: '/3',
    subtask_count: 0, completed_subtask_count: 0,
    is_operational: true,
    created_at: '', updated_at: '',
  },
  {
    id: '4',
    organization_id: 'org-1',
    title: 'Atualizar fotos',
    status: 'blocked',
    priority: 'low',
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-1',
    depth: 0, path: '/4',
    subtask_count: 0, completed_subtask_count: 0,
    property_id: 'prop-3',
    created_at: '', updated_at: '',
  },
  {
    id: '5',
    organization_id: 'org-1',
    title: 'Responder avaliação urgente',
    status: 'todo',
    priority: 'urgent',
    due_date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-1',
    depth: 0, path: '/5',
    subtask_count: 0, completed_subtask_count: 0,
    created_at: '', updated_at: '',
  },
  {
    id: '6',
    organization_id: 'org-1',
    title: 'Inventário de roupas',
    status: 'completed',
    priority: 'medium',
    completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-2',
    team_id: 'team-2',
    depth: 0, path: '/6',
    subtask_count: 0, completed_subtask_count: 0,
    created_at: '', updated_at: '',
  },
  {
    id: '7',
    organization_id: 'org-1',
    title: 'Revisão de contrato',
    status: 'completed',
    priority: 'medium',
    completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-1',
    depth: 0, path: '/7',
    subtask_count: 2, completed_subtask_count: 2,
    property_id: 'prop-4',
    created_at: '', updated_at: '',
  },
];

const MOCK_ACTIVITIES: TaskActivity[] = [
  {
    id: 'act-1',
    task_id: '1',
    user_id: 'user-1',
    action: 'status_changed',
    details: { from: 'todo', to: 'in_progress' },
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-2',
    task_id: '6',
    user_id: 'user-2',
    action: 'completed',
    details: {},
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-3',
    task_id: '2',
    user_id: 'user-2',
    action: 'assigned',
    details: { assignee: 'user-2' },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-4',
    task_id: '7',
    user_id: 'user-1',
    action: 'completed',
    details: {},
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-5',
    task_id: '3',
    action: 'created',
    details: { trigger: 'scheduled' },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_USERS = [
  { id: 'user-1', name: 'João Silva', email: 'joao@example.com', avatar: '' },
  { id: 'user-2', name: 'Maria Santos', email: 'maria@example.com', avatar: '' },
  { id: 'user-3', name: 'Pedro Costa', email: 'pedro@example.com', avatar: '' },
];

const MOCK_TEAMS: Team[] = [
  { id: 'team-1', organization_id: 'org-1', name: 'Recepção', color: '#3b82f6', members: [], created_at: '', updated_at: '' },
  { id: 'team-2', organization_id: 'org-1', name: 'Limpeza', color: '#22c55e', members: [], created_at: '', updated_at: '' },
  { id: 'team-3', organization_id: 'org-1', name: 'Manutenção', color: '#f59e0b', members: [], created_at: '', updated_at: '' },
];

const MOCK_PROPERTIES = [
  { id: 'prop-1', name: 'Apartamento Centro' },
  { id: 'prop-2', name: 'Casa de Praia' },
  { id: 'prop-3', name: 'Studio Executivo' },
  { id: 'prop-4', name: 'Cobertura Luxo' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TasksDashboard({ organizationId, projectId }: TasksDashboardProps) {
  const { user } = useAuth();
  const orgId = organizationId || user?.organizationId;
  
  // Hooks Supabase - dados reais
  const { data: allTasks = [], isLoading } = useTasks({ projectId });
  const { data: teams = [] } = useTeams();
  
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Computed stats
  const stats = useMemo(() => {
    const filteredTasks = selectedTeam === 'all' 
      ? allTasks 
      : allTasks.filter(t => t.team_id === selectedTeam);

    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const blocked = filteredTasks.filter(t => t.status === 'blocked').length;
    const overdue = filteredTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;
    const slaAtRisk = filteredTasks.filter(t => 
      t.sla_deadline && 
      differenceInHours(new Date(t.sla_deadline), new Date()) <= 2 &&
      t.status !== 'completed'
    ).length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const avgCompletionTime = 4.5; // Mock: hours

    return {
      total,
      completed,
      inProgress,
      blocked,
      overdue,
      slaAtRisk,
      completionRate,
      avgCompletionTime,
    };
  }, [selectedTeam]);

  const kpis: KPI[] = [
    {
      id: 'total',
      label: 'Total de Tarefas',
      value: stats.total,
      previousValue: 12,
      icon: ListTodo,
      color: 'text-blue-600 bg-blue-100',
      trend: 'up',
    },
    {
      id: 'completed',
      label: 'Concluídas Hoje',
      value: stats.completed,
      previousValue: 1,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100',
      trend: 'up',
    },
    {
      id: 'overdue',
      label: 'Atrasadas',
      value: stats.overdue,
      previousValue: 3,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
      trend: stats.overdue < 3 ? 'down' : 'up',
    },
    {
      id: 'sla',
      label: 'SLA em Risco',
      value: stats.slaAtRisk,
      icon: Timer,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      id: 'rate',
      label: 'Taxa de Conclusão',
      value: stats.completionRate,
      previousValue: 25,
      format: 'percent',
      icon: Target,
      color: 'text-purple-600 bg-purple-100',
      trend: 'up',
    },
    {
      id: 'avgTime',
      label: 'Tempo Médio',
      value: stats.avgCompletionTime,
      format: 'hours',
      icon: Clock,
      color: 'text-cyan-600 bg-cyan-100',
    },
  ];

  const overdueTasks = useMemo(() => 
    allTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()),
    [allTasks]
  );

  const slaAtRiskTasks = useMemo(() =>
    allTasks.filter(t => 
      t.sla_deadline && 
      differenceInHours(new Date(t.sla_deadline), new Date()) <= 4 &&
      t.status !== 'completed'
    ).sort((a, b) => new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime()),
    [allTasks]
  );

  const todayTasks = useMemo(() =>
    allTasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'completed'),
    [allTasks]
  );

  // Weekly target progress
  const weeklyProgress = Math.round((MOCK_WEEKLY_TARGET.completed / MOCK_WEEKLY_TARGET.target) * 100);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard de Tarefas</h1>
            <p className="text-muted-foreground">
              Visão geral da produtividade e progresso das tarefas
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as equipes</SelectItem>
                {MOCK_TEAMS.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content with ScrollArea */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* KPI Cards - Grid 4 columns */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.slice(0, 4).map(kpi => (
              <MetricCard key={kpi.id} kpi={kpi} />
            ))}
          </div>

          {/* Meta Semanal */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Meta Semanal</CardTitle>
                <Badge variant="outline">
                  {MOCK_WEEKLY_TARGET.completed}/{MOCK_WEEKLY_TARGET.target} tarefas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={weeklyProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {weeklyProgress}% da meta atingida • Faltam {MOCK_WEEKLY_TARGET.target - MOCK_WEEKLY_TARGET.completed} tarefas
              </p>
            </CardContent>
          </Card>

          {/* Main Content Grid - 3 columns like mock */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Status & Priority Distribution */}
            <div className="space-y-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { status: 'Não Iniciado', count: allTasks.filter(t => t.status === 'todo').length, color: 'bg-gray-400' },
                    { status: 'Em Andamento', count: allTasks.filter(t => t.status === 'in_progress').length, color: 'bg-blue-500' },
                    { status: 'Bloqueado', count: allTasks.filter(t => t.status === 'blocked').length, color: 'bg-yellow-500' },
                    { status: 'Concluído', count: allTasks.filter(t => t.status === 'completed').length, color: 'bg-green-500' },
                    { status: 'Atrasado', count: overdueTasks.length, color: 'bg-red-500' },
                  ].map((item) => {
                    const total = allTasks.length || 1;
                    const percentage = Math.round((item.count / total) * 100);
                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.status}</span>
                          <span className="text-muted-foreground">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', item.color)}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between h-32 gap-2">
                    {[
                      { priority: 'Urgente', count: allTasks.filter(t => t.priority === 'urgent').length, color: 'bg-red-500' },
                      { priority: 'Alta', count: allTasks.filter(t => t.priority === 'high').length, color: 'bg-orange-500' },
                      { priority: 'Normal', count: allTasks.filter(t => t.priority === 'medium').length, color: 'bg-blue-500' },
                      { priority: 'Baixa', count: allTasks.filter(t => t.priority === 'low').length, color: 'bg-gray-400' },
                    ].map((item) => {
                      const maxCount = Math.max(
                        allTasks.filter(t => t.priority === 'urgent').length,
                        allTasks.filter(t => t.priority === 'high').length,
                        allTasks.filter(t => t.priority === 'medium').length,
                        allTasks.filter(t => t.priority === 'low').length,
                        1
                      );
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div key={item.priority} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-medium">{item.count}</span>
                          <div
                            className={cn('w-full rounded-t', item.color)}
                            style={{ height: `${height}%`, minHeight: item.count > 0 ? 8 : 0 }}
                          />
                          <span className="text-xs text-muted-foreground text-center">
                            {item.priority}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Team Performance */}
            <Card className="col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Performance da Equipe</CardTitle>
                  <Button variant="ghost" size="sm">
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] px-4">
                  {MOCK_TEAM_PERFORMANCE.map((member) => (
                    <TeamMemberRow key={member.id} member={member} />
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Column - Overdue & Activity */}
            <div className="space-y-6">
              {/* Overdue Tasks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Tarefas Atrasadas</CardTitle>
                      <Badge variant="destructive">{overdueTasks.length}</Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver todas
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 px-2">
                  <ScrollArea className="h-36">
                    {overdueTasks.length > 0 ? overdueTasks.slice(0, 5).map(task => (
                      <OverdueTaskRow key={task.id} task={task} />
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma tarefa atrasada 🎉
                      </p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Atividade Recente</CardTitle>
                    <Button variant="ghost" size="sm">
                      Ver tudo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {MOCK_ACTIVITIES.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface MetricCardProps {
  kpi: KPI;
}

const MetricCard: React.FC<MetricCardProps> = ({ kpi }) => {
  const KPIIcon = kpi.icon;
  const isPositiveTrend = kpi.trend && kpi.trend === 'up';
  const isNegativeTrend = kpi.trend && kpi.trend === 'down';

  const formatValue = (val: number) => {
    if (kpi.format === 'percent') return `${val}%`;
    if (kpi.format === 'hours') return `${val}h`;
    return val.toString();
  };

  const change = kpi.previousValue 
    ? ((kpi.value - kpi.previousValue) / Math.max(kpi.previousValue, 1) * 100).toFixed(0)
    : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="text-3xl font-bold mt-1">{formatValue(kpi.value)}</p>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {isPositiveTrend ? (
                  <ArrowUpRight className={cn(
                    "h-4 w-4",
                    kpi.id === 'overdue' ? 'text-red-500' : 'text-green-500'
                  )} />
                ) : isNegativeTrend ? (
                  <ArrowDownRight className={cn(
                    "h-4 w-4",
                    kpi.id === 'overdue' ? 'text-green-500' : 'text-red-500'
                  )} />
                ) : null}
                <span
                  className={cn(
                    'text-sm',
                    isPositiveTrend && kpi.id !== 'overdue' && 'text-green-500',
                    isPositiveTrend && kpi.id === 'overdue' && 'text-red-500',
                    isNegativeTrend && kpi.id !== 'overdue' && 'text-red-500',
                    isNegativeTrend && kpi.id === 'overdue' && 'text-green-500'
                  )}
                >
                  {Math.abs(Number(change))}%
                </span>
                <span className="text-sm text-muted-foreground">vs semana anterior</span>
              </div>
            )}
            {kpi.description && (
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', kpi.color)}>
            <KPIIcon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TeamMemberRowProps {
  member: typeof MOCK_TEAM_PERFORMANCE[0];
}

const TeamMemberRow: React.FC<TeamMemberRowProps> = ({ member }) => {
  const completionRate = Math.round((member.completed / member.totalTasks) * 100);

  return (
    <div className="flex items-center gap-4 py-3 hover:bg-muted/50 px-2 rounded-lg transition-colors">
      <Avatar className="h-9 w-9">
        <AvatarFallback>{member.initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{member.name}</p>
          <Badge variant="outline" className="text-xs">
            {member.role}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-muted-foreground">
            {member.completed}/{member.totalTasks} tarefas
          </span>
          <Progress value={completionRate} className="flex-1 h-1.5" />
          <span className="text-xs font-medium">{completionRate}%</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {member.overdue > 0 && (
          <Badge variant="destructive" className="text-xs">
            {member.overdue} atrasadas
          </Badge>
        )}
        <span className="text-muted-foreground text-xs">~{member.avgTime}</span>
      </div>
    </div>
  );
};

interface OverdueTaskRowProps {
  task: Task;
}

const OverdueTaskRow: React.FC<OverdueTaskRowProps> = ({ task }) => {
  const daysOverdue = task.due_date 
    ? Math.ceil((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const user = MOCK_USERS.find(u => u.id === task.assignee_id);
  const priorityColors = getPriorityColor(task.priority);

  return (
    <div className="flex items-center gap-3 py-3 hover:bg-muted/50 px-2 rounded-lg transition-colors group">
      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.project_id || 'Sem projeto'}</p>
      </div>
      <Badge variant="outline" className={cn('text-xs', priorityColors.bg, priorityColors.text)}>
        {daysOverdue}d atrasada
      </Badge>
      {user && (
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[10px]">
            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
};

function TaskMiniCard({ task, showDueDate, showSla }: { task: Task; showDueDate?: boolean; showSla?: boolean }) {
  const priorityColors = getPriorityColor(task.priority);
  const user = MOCK_USERS.find(u => u.id === task.assignee_id);
  const team = MOCK_TEAMS.find(t => t.id === task.team_id);
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
      <div className={cn('w-1 h-8 rounded-full', priorityColors.bg)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showDueDate && task.due_date && (
            <span className="text-red-600">
              {formatDistanceToNow(new Date(task.due_date), { addSuffix: true, locale: ptBR })}
            </span>
          )}
          {showSla && task.sla_deadline && (
            <span className="text-orange-600">
              SLA: {differenceInHours(new Date(task.sla_deadline), new Date())}h restantes
            </span>
          )}
          {!showDueDate && !showSla && (
            <>
              {user && <span>{user.name}</span>}
              {team && <span>{team.name}</span>}
            </>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </div>
  );
}

function ActivityItem({ activity }: { activity: TaskActivity }) {
  const task = MOCK_TASKS.find(t => t.id === activity.task_id);
  const user = MOCK_USERS.find(u => u.id === activity.user_id);
  
  const actionLabels: Record<string, string> = {
    created: 'criou',
    status_changed: 'alterou status de',
    completed: 'completou',
    started: 'iniciou',
    assigned: 'atribuiu',
    commented: 'comentou em',
  };

  const actionIcons: Record<string, React.ElementType> = {
    created: Circle,
    status_changed: RefreshCw,
    completed: CheckCircle2,
    started: Play,
    assigned: User,
    commented: Activity,
  };

  const ActionIcon = actionIcons[activity.action] || Activity;

  const getIconColor = () => {
    switch (activity.action) {
      case 'completed': return 'text-green-500';
      case 'started': return 'text-blue-500';
      case 'created': return 'text-purple-500';
      case 'commented': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">
        <ActionIcon className={cn("h-4 w-4", getIconColor())} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{user?.name || 'Sistema'}</span>{' '}
          <span className="text-muted-foreground">{actionLabels[activity.action] || activity.action}</span>{' '}
          <span className="font-medium truncate">{task?.title || 'tarefa'}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

export default TasksDashboard;
