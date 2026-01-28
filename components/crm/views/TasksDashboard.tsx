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
 * 
 * @version 3.0.0
 * @date 2026-01-27
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
}

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard de Tarefas</h1>
          <p className="text-muted-foreground">
            Visão geral do progresso e métricas
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

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(kpi => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts & Distribution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
              <CardDescription>Visão geral das tarefas por estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <StatusDistributionItem 
                  status="todo" 
                  count={allTasks.filter(t => t.status === 'todo').length}
                  total={allTasks.length}
                />
                <StatusDistributionItem 
                  status="in_progress" 
                  count={allTasks.filter(t => t.status === 'in_progress').length}
                  total={allTasks.length}
                />
                <StatusDistributionItem 
                  status="blocked" 
                  count={allTasks.filter(t => t.status === 'blocked').length}
                  total={allTasks.length}
                />
                <StatusDistributionItem 
                  status="completed" 
                  count={allTasks.filter(t => t.status === 'completed').length}
                  total={allTasks.length}
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desempenho por Equipe</CardTitle>
              <CardDescription>Métricas de produtividade das equipes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.map(team => {
                  const teamTasks = allTasks.filter(t => t.team_id === team.id);
                  const completed = teamTasks.filter(t => t.status === 'completed').length;
                  const total = teamTasks.length;
                  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                  
                  return (
                    <div key={team.id} className="flex items-center gap-4">
                      <div 
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: team.color }}
                      >
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{team.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {completed}/{total} tarefas
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {progress}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map(priority => {
                  const count = allTasks.filter(t => t.priority === priority).length;
                  const maxCount = Math.max(...(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map(p => 
                    allTasks.filter(t => t.priority === p).length
                  ));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const colors = getPriorityColor(priority);
                  
                  return (
                    <div key={priority} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className={cn('w-full rounded-t transition-all', colors.bg)}
                        style={{ height: `${height}%`, minHeight: count > 0 ? 8 : 0 }}
                      />
                      <div className="text-center">
                        <p className={cn('text-lg font-bold', colors.text)}>{count}</p>
                        <p className="text-xs text-muted-foreground capitalize">{priority}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Lists & Activity */}
        <div className="space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Tarefas de Hoje
                </CardTitle>
                <Badge variant="secondary">{todayTasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {todayTasks.length > 0 ? todayTasks.map(task => (
                    <TaskMiniCard key={task.id} task={task} />
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma tarefa para hoje 🎉
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    Tarefas Atrasadas
                  </CardTitle>
                  <Badge variant="destructive">{overdueTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-36">
                  <div className="space-y-2">
                    {overdueTasks.map(task => (
                      <TaskMiniCard key={task.id} task={task} showDueDate />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* SLA at Risk */}
          {slaAtRiskTasks.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-900">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                    <Timer className="h-4 w-4" />
                    SLA em Risco
                  </CardTitle>
                  <Badge className="bg-orange-100 text-orange-700">{slaAtRiskTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-36">
                  <div className="space-y-2">
                    {slaAtRiskTasks.map(task => (
                      <TaskMiniCard key={task.id} task={task} showSla />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-56">
                <div className="space-y-3">
                  {MOCK_ACTIVITIES.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function KPICard({ kpi }: { kpi: KPI }) {
  const KPIIcon = kpi.icon;
  const formatValue = (val: number) => {
    if (kpi.format === 'percent') return `${val}%`;
    if (kpi.format === 'hours') return `${val}h`;
    return val.toString();
  };
  
  const change = kpi.previousValue 
    ? ((kpi.value - kpi.previousValue) / kpi.previousValue * 100).toFixed(0)
    : null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', kpi.color)}>
            <KPIIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{formatValue(kpi.value)}</span>
              {kpi.trend && change && (
                <span className={cn(
                  'text-xs flex items-center',
                  kpi.trend === 'up' && kpi.id === 'overdue' ? 'text-red-600' :
                  kpi.trend === 'up' ? 'text-green-600' :
                  kpi.trend === 'down' && kpi.id === 'overdue' ? 'text-green-600' :
                  'text-red-600'
                )}>
                  {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(Number(change))}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDistributionItem({ status, count, total }: { status: TaskStatus; count: number; total: number }) {
  const colors = getStatusColor(status);
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  
  const statusLabels: Record<TaskStatus, string> = {
    todo: 'A Fazer',
    in_progress: 'Em Progresso',
    blocked: 'Bloqueado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  const StatusIcon = {
    todo: Circle,
    in_progress: Clock,
    blocked: AlertTriangle,
    completed: CheckCircle2,
    cancelled: Circle,
  }[status];

  return (
    <div className="text-center">
      <div className={cn('h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-2', colors.bg)}>
        <StatusIcon className={cn('h-6 w-6', colors.text)} />
      </div>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{statusLabels[status]}</p>
      <p className="text-xs text-muted-foreground">{percent}%</p>
    </div>
  );
}

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
    assigned: 'atribuiu',
    commented: 'comentou em',
  };

  const actionIcons: Record<string, React.ElementType> = {
    created: Plus,
    status_changed: RefreshCw,
    completed: CheckCircle2,
    assigned: User,
    commented: Activity,
  };

  const ActionIcon = actionIcons[activity.action] || Activity;

  return (
    <div className="flex items-start gap-3">
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          {user ? (
            <span className="font-medium">{user.name}</span>
          ) : (
            <span className="font-medium">Sistema</span>
          )}{' '}
          {actionLabels[activity.action] || activity.action}{' '}
          <span className="text-muted-foreground truncate">
            {task?.title || 'tarefa'}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

// Missing import for Plus
function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export default TasksDashboard;
