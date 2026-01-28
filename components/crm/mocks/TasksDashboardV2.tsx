/**
 * Tasks Dashboard V2 - Dashboard de KPIs de Tarefas
 * 
 * Visão geral com:
 * - Cards de métricas
 * - Gráficos de progresso
 * - Timeline de atividades recentes
 * - Tarefas atrasadas
 * - Performance por responsável
 */

import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Users,
  ListTodo,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_METRICS = {
  totalTasks: 156,
  totalTasksTrend: 12,
  completedTasks: 89,
  completedTrend: 8,
  overdueTasks: 14,
  overdueTrend: -3,
  inProgressTasks: 34,
  avgCompletionTime: '2.5 dias',
  completionRate: 78,
  weeklyTarget: 50,
  weeklyCompleted: 38,
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

const MOCK_OVERDUE_TASKS = [
  {
    id: '1',
    title: 'WALKER PIERRE - Liberar para vendas',
    dueDate: '2026-01-20',
    daysOverdue: 4,
    assignee: { name: 'Rafael Marques', initials: 'RM' },
    priority: 'urgent',
    project: 'Imóveis - Proprietários',
  },
  {
    id: '2',
    title: 'Fotografar apartamento Guarapari',
    dueDate: '2026-01-22',
    daysOverdue: 2,
    assignee: { name: 'João Fotos', initials: 'JF' },
    priority: 'high',
    project: 'Fotografia',
  },
  {
    id: '3',
    title: 'Revisar precificação Chalé Neve',
    dueDate: '2026-01-23',
    daysOverdue: 1,
    assignee: { name: 'Rafael Marques', initials: 'RM' },
    priority: 'normal',
    project: 'Precificação',
  },
];

const MOCK_RECENT_ACTIVITY = [
  {
    id: '1',
    type: 'completed',
    task: 'Alinhar limpeza com proprietário',
    user: 'Maria Teresa',
    timestamp: '10 min atrás',
  },
  {
    id: '2',
    type: 'started',
    task: 'WALKER - Anúncio',
    user: 'Rocha',
    timestamp: '25 min atrás',
  },
  {
    id: '3',
    type: 'created',
    task: 'Verificar aquecedor Vista Serrana',
    user: 'Arthur Silva',
    timestamp: '1h atrás',
  },
  {
    id: '4',
    type: 'comment',
    task: 'Reunião proprietário ES',
    user: 'Rafael Marques',
    timestamp: '2h atrás',
  },
  {
    id: '5',
    type: 'completed',
    task: 'Upload fotos Drive',
    user: 'João Fotos',
    timestamp: '3h atrás',
  },
];

const MOCK_STATUS_DISTRIBUTION = [
  { status: 'Não Iniciado', count: 19, color: 'bg-gray-400', percentage: 12 },
  { status: 'Em Andamento', count: 34, color: 'bg-blue-500', percentage: 22 },
  { status: 'Aguardando', count: 28, color: 'bg-yellow-500', percentage: 18 },
  { status: 'Concluído', count: 61, color: 'bg-green-500', percentage: 39 },
  { status: 'Atrasado', count: 14, color: 'bg-red-500', percentage: 9 },
];

const MOCK_PRIORITY_DISTRIBUTION = [
  { priority: 'Urgente', count: 8, color: 'bg-red-500' },
  { priority: 'Alta', count: 24, color: 'bg-orange-500' },
  { priority: 'Normal', count: 89, color: 'bg-blue-500' },
  { priority: 'Baixa', count: 35, color: 'bg-gray-400' },
];

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg?: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  trendLabel,
  icon,
  iconBg = 'bg-primary/10',
  description,
}) => {
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {isPositiveTrend ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : isNegativeTrend ? (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                ) : null}
                <span
                  className={cn(
                    'text-sm',
                    isPositiveTrend && 'text-green-500',
                    isNegativeTrend && 'text-red-500'
                  )}
                >
                  {Math.abs(trend)}%
                </span>
                {trendLabel && (
                  <span className="text-sm text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', iconBg)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// TEAM MEMBER ROW COMPONENT
// ============================================================================

const TeamMemberRow: React.FC<{ member: typeof MOCK_TEAM_PERFORMANCE[0] }> = ({
  member,
}) => {
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

// ============================================================================
// OVERDUE TASK ROW COMPONENT
// ============================================================================

const OverdueTaskRow: React.FC<{ task: typeof MOCK_OVERDUE_TASKS[0] }> = ({ task }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 hover:bg-muted/50 px-2 rounded-lg transition-colors group">
      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground">{task.project}</p>
      </div>
      <Badge variant="outline" className={cn('text-xs', getPriorityColor(task.priority))}>
        {task.daysOverdue}d atrasada
      </Badge>
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px]">{task.assignee.initials}</AvatarFallback>
      </Avatar>
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

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

const ActivityItem: React.FC<{ activity: typeof MOCK_RECENT_ACTIVITY[0] }> = ({
  activity,
}) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'started':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'created':
        return <Circle className="h-4 w-4 text-purple-500" />;
      case 'comment':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getAction = () => {
    switch (activity.type) {
      case 'completed':
        return 'concluiu';
      case 'started':
        return 'iniciou';
      case 'created':
        return 'criou';
      case 'comment':
        return 'comentou em';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.user}</span>{' '}
          <span className="text-muted-foreground">{getAction()}</span>{' '}
          <span className="font-medium truncate">{activity.task}</span>
        </p>
        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TasksDashboardV2: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Tarefas</h1>
            <p className="text-muted-foreground">
              Visão geral da produtividade e progresso das tarefas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Total de Tarefas"
              value={MOCK_METRICS.totalTasks}
              trend={MOCK_METRICS.totalTasksTrend}
              trendLabel="vs semana anterior"
              icon={<ListTodo className="h-5 w-5 text-primary" />}
              iconBg="bg-primary/10"
            />
            <MetricCard
              title="Concluídas"
              value={MOCK_METRICS.completedTasks}
              trend={MOCK_METRICS.completedTrend}
              trendLabel="vs semana anterior"
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              iconBg="bg-green-100"
            />
            <MetricCard
              title="Atrasadas"
              value={MOCK_METRICS.overdueTasks}
              trend={MOCK_METRICS.overdueTrend}
              trendLabel="vs semana anterior"
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
              iconBg="bg-red-100"
            />
            <MetricCard
              title="Taxa de Conclusão"
              value={`${MOCK_METRICS.completionRate}%`}
              icon={<Target className="h-5 w-5 text-blue-600" />}
              iconBg="bg-blue-100"
              description={`Tempo médio: ${MOCK_METRICS.avgCompletionTime}`}
            />
          </div>

          {/* Weekly Target Progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Meta Semanal</CardTitle>
                <Badge variant="outline">
                  {MOCK_METRICS.weeklyCompleted}/{MOCK_METRICS.weeklyTarget} tarefas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress
                value={(MOCK_METRICS.weeklyCompleted / MOCK_METRICS.weeklyTarget) * 100}
                className="h-3"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round((MOCK_METRICS.weeklyCompleted / MOCK_METRICS.weeklyTarget) * 100)}%
                da meta atingida • Faltam{' '}
                {MOCK_METRICS.weeklyTarget - MOCK_METRICS.weeklyCompleted} tarefas
              </p>
            </CardContent>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Status Distribution & Priority */}
            <div className="space-y-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MOCK_STATUS_DISTRIBUTION.map((item) => (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.status}</span>
                        <span className="text-muted-foreground">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', item.color)}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Por Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between h-32 gap-2">
                    {MOCK_PRIORITY_DISTRIBUTION.map((item) => {
                      const maxCount = Math.max(
                        ...MOCK_PRIORITY_DISTRIBUTION.map((p) => p.count)
                      );
                      const height = (item.count / maxCount) * 100;
                      return (
                        <div
                          key={item.priority}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-xs font-medium">{item.count}</span>
                          <div
                            className={cn('w-full rounded-t', item.color)}
                            style={{ height: `${height}%` }}
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
                      <Badge variant="destructive">{MOCK_OVERDUE_TASKS.length}</Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver todas
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 px-2">
                  {MOCK_OVERDUE_TASKS.map((task) => (
                    <OverdueTaskRow key={task.id} task={task} />
                  ))}
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
                    {MOCK_RECENT_ACTIVITY.map((activity) => (
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
};

export default TasksDashboardV2;
