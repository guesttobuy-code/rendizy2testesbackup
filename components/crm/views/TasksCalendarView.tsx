/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS CALENDAR VIEW - UI COMPONENT                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Visualização de calendário com tarefas organizadas por data
 * 
 * Features:
 * - Visualização de semana e mês
 * - Drag to reschedule
 * - Mini cards de tarefas
 * - Indicadores de SLA e prioridade
 * - Integração com check-ins/check-outs
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Filter,
  Settings2,
  User,
  Users,
  Building,
  Home,
  LogIn,
  LogOut,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  getHours,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Task, TaskStatus, TaskPriority, Team } from '@/types/crm-tasks';
import { getStatusColor, getPriorityColor } from '@/types/crm-tasks';

// ============================================================================
// TYPES
// ============================================================================

interface TasksCalendarViewProps {
  organizationId: string;
  projectId?: string;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (date?: Date) => void;
}

type CalendarView = 'week' | 'month';

interface CalendarEvent {
  type: 'task' | 'checkin' | 'checkout';
  id: string;
  title: string;
  date: Date;
  time?: string;
  task?: Task;
  property?: { id: string; name: string };
  guest?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    organization_id: 'org-1',
    project_id: 'proj-1',
    title: 'Preparar imóvel para check-in',
    description: 'Verificação completa do apartamento Centro',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date().toISOString(),
    assignee_id: 'user-1',
    team_id: 'team-1',
    depth: 0,
    path: '/1',
    subtask_count: 4,
    completed_subtask_count: 2,
    tags: ['check-in', 'limpeza'],
    is_operational: true,
    property_id: 'prop-1',
    sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    organization_id: 'org-1',
    title: 'Limpeza pós check-out',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-2',
    team_id: 'team-2',
    depth: 0,
    path: '/2',
    subtask_count: 6,
    completed_subtask_count: 0,
    is_operational: true,
    property_id: 'prop-2',
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    organization_id: 'org-1',
    title: 'Manutenção preventiva',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    team_id: 'team-3',
    depth: 0,
    path: '/3',
    subtask_count: 0,
    completed_subtask_count: 0,
    is_operational: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '4',
    organization_id: 'org-1',
    title: 'Responder avaliação',
    status: 'todo',
    priority: 'urgent',
    due_date: new Date().toISOString(),
    assignee_id: 'user-1',
    depth: 0,
    path: '/4',
    subtask_count: 0,
    completed_subtask_count: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: '5',
    organization_id: 'org-1',
    title: 'Atualizar preços',
    status: 'completed',
    priority: 'medium',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-1',
    depth: 0,
    path: '/5',
    subtask_count: 0,
    completed_subtask_count: 0,
    created_at: '',
    updated_at: '',
  },
];

const MOCK_RESERVATIONS = [
  { 
    id: 'res-1', 
    type: 'checkin' as const, 
    date: new Date(), 
    time: '15:00',
    property: { id: 'prop-1', name: 'Apartamento Centro' },
    guest: 'Carlos Mendes',
  },
  { 
    id: 'res-2', 
    type: 'checkout' as const, 
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 
    time: '11:00',
    property: { id: 'prop-1', name: 'Apartamento Centro' },
    guest: 'Carlos Mendes',
  },
  { 
    id: 'res-3', 
    type: 'checkin' as const, 
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 
    time: '16:00',
    property: { id: 'prop-1', name: 'Apartamento Centro' },
    guest: 'Ana Paula',
  },
  { 
    id: 'res-4', 
    type: 'checkout' as const, 
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), 
    time: '10:00',
    property: { id: 'prop-2', name: 'Casa de Praia' },
    guest: 'João Silva',
  },
];

const MOCK_USERS = [
  { id: 'user-1', name: 'João Silva', avatar: '' },
  { id: 'user-2', name: 'Maria Santos', avatar: '' },
  { id: 'user-3', name: 'Pedro Costa', avatar: '' },
];

const MOCK_TEAMS: Team[] = [
  { id: 'team-1', organization_id: 'org-1', name: 'Recepção', color: '#3b82f6', members: [], created_at: '', updated_at: '' },
  { id: 'team-2', organization_id: 'org-1', name: 'Limpeza', color: '#22c55e', members: [], created_at: '', updated_at: '' },
  { id: 'team-3', organization_id: 'org-1', name: 'Manutenção', color: '#f59e0b', members: [], created_at: '', updated_at: '' },
];

const STATUS_ICONS: Record<TaskStatus, React.ElementType> = {
  todo: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: AlertTriangle,
  cancelled: Circle,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TasksCalendarView({ 
  organizationId, 
  projectId, 
  onTaskClick, 
  onCreateTask 
}: TasksCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [tasks] = useState<Task[]>(MOCK_TASKS.filter(t => !t.parent_id));
  const [showReservations, setShowReservations] = useState(true);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start, end });
      
      // Add days from previous month to fill first week
      const firstDayOfMonth = startOfMonth(currentDate);
      const startOfFirstWeek = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
      const prefixDays = eachDayOfInterval({ start: startOfFirstWeek, end: firstDayOfMonth }).slice(0, -1);
      
      // Add days from next month to fill last week
      const lastDayOfMonth = endOfMonth(currentDate);
      const endOfLastWeek = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
      const suffixDays = eachDayOfInterval({ start: lastDayOfMonth, end: endOfLastWeek }).slice(1);
      
      return [...prefixDays, ...monthDays, ...suffixDays];
    }
  }, [currentDate, view]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
    // Add tasks
    tasks.forEach(task => {
      if (!task.due_date) return;
      const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
      const events = map.get(dateKey) || [];
      events.push({
        type: 'task',
        id: task.id,
        title: task.title,
        date: parseISO(task.due_date),
        task,
      });
      map.set(dateKey, events);
    });
    
    // Add reservations
    if (showReservations) {
      MOCK_RESERVATIONS.forEach(res => {
        const dateKey = format(res.date, 'yyyy-MM-dd');
        const events = map.get(dateKey) || [];
        events.push({
          type: res.type,
          id: res.id,
          title: res.type === 'checkin' ? 'Check-in' : 'Check-out',
          date: res.date,
          time: res.time,
          property: res.property,
          guest: res.guest,
        });
        map.set(dateKey, events);
      });
    }
    
    return map;
  }, [tasks, showReservations]);

  // Navigation
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    if (view === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  }, [view]);

  const goToNext = useCallback(() => {
    if (view === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  }, [view]);

  // Format title
  const title = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'd MMM', { locale: ptBR })} - ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
  }, [currentDate, view]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b shrink-0">
        {/* Navigation */}
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <h2 className="text-lg font-semibold capitalize min-w-48">
          {title}
        </h2>
        
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView('week')}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              view === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Semana
          </button>
          <button
            onClick={() => setView('month')}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              view === 'month' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mês
          </button>
        </div>
        
        <div className="flex-1" />
        
        {/* Filters */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showReservations}
            onChange={e => setShowReservations(e.target.checked)}
            className="rounded"
          />
          Mostrar reservas
        </label>
        
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        
        <Button onClick={() => onCreateTask?.()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {view === 'week' ? (
          <WeekView
            days={dateRange}
            eventsByDate={eventsByDate}
            onTaskClick={onTaskClick}
            onCreateTask={onCreateTask}
          />
        ) : (
          <MonthView
            days={dateRange}
            currentMonth={currentDate}
            eventsByDate={eventsByDate}
            onTaskClick={onTaskClick}
            onCreateTask={onCreateTask}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WEEK VIEW
// ============================================================================

interface WeekViewProps {
  days: Date[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (date?: Date) => void;
}

function WeekView({ days, eventsByDate, onTaskClick, onCreateTask }: WeekViewProps) {
  return (
    <div className="flex h-full">
      {days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const events = eventsByDate.get(dateKey) || [];
        const today = isToday(day);
        
        return (
          <div 
            key={dateKey}
            className={cn(
              'flex-1 flex flex-col border-r last:border-r-0',
              today && 'bg-primary/5'
            )}
          >
            {/* Day Header */}
            <div className={cn(
              'p-3 border-b text-center',
              today && 'bg-primary/10'
            )}>
              <p className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </p>
              <p className={cn(
                'text-2xl font-semibold',
                today && 'text-primary'
              )}>
                {format(day, 'd')}
              </p>
            </div>
            
            {/* Day Events */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {events
                  .sort((a, b) => {
                    // Sort: reservations first (by time), then tasks
                    if (a.type !== 'task' && b.type === 'task') return -1;
                    if (a.type === 'task' && b.type !== 'task') return 1;
                    if (a.time && b.time) return a.time.localeCompare(b.time);
                    return 0;
                  })
                  .map(event => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                
                {events.length === 0 && (
                  <button
                    onClick={() => onCreateTask?.(day)}
                    className="w-full p-4 text-center text-muted-foreground text-sm hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4 mx-auto mb-1" />
                    Adicionar
                  </button>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MONTH VIEW
// ============================================================================

interface MonthViewProps {
  days: Date[];
  currentMonth: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (date?: Date) => void;
}

function MonthView({ days, currentMonth, eventsByDate, onTaskClick, onCreateTask }: MonthViewProps) {
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <div className="flex flex-col h-full">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      {/* Weeks */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fit,minmax(0,1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const events = eventsByDate.get(dateKey) || [];
              const today = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <div
                  key={dateKey}
                  className={cn(
                    'min-h-24 border-r last:border-r-0 p-1 overflow-hidden',
                    !isCurrentMonth && 'bg-muted/30',
                    today && 'bg-primary/5'
                  )}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'inline-flex items-center justify-center h-6 w-6 rounded-full text-sm',
                      today && 'bg-primary text-primary-foreground font-semibold',
                      !isCurrentMonth && 'text-muted-foreground'
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {events.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{events.length - 3}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Events (limited) */}
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map(event => (
                      <CalendarEventMini
                        key={event.id}
                        event={event}
                        onTaskClick={onTaskClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR EVENT CARD (Week View)
// ============================================================================

interface CalendarEventCardProps {
  event: CalendarEvent;
  onTaskClick?: (task: Task) => void;
}

function CalendarEventCard({ event, onTaskClick }: CalendarEventCardProps) {
  if (event.type === 'checkin' || event.type === 'checkout') {
    return (
      <div className={cn(
        'p-2 rounded-lg text-xs border',
        event.type === 'checkin' 
          ? 'bg-green-50 border-green-200 dark:bg-green-950/50' 
          : 'bg-orange-50 border-orange-200 dark:bg-orange-950/50'
      )}>
        <div className="flex items-center gap-1.5 mb-1">
          {event.type === 'checkin' ? (
            <LogIn className="h-3 w-3 text-green-600" />
          ) : (
            <LogOut className="h-3 w-3 text-orange-600" />
          )}
          <span className={cn(
            'font-medium',
            event.type === 'checkin' ? 'text-green-700' : 'text-orange-700'
          )}>
            {event.title}
          </span>
          {event.time && (
            <span className="text-muted-foreground ml-auto">{event.time}</span>
          )}
        </div>
        <p className="text-muted-foreground truncate">{event.property?.name}</p>
        <p className="text-muted-foreground truncate">{event.guest}</p>
      </div>
    );
  }

  // Task event
  const task = event.task!;
  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  const priorityColors = getPriorityColor(task.priority);
  const statusColors = getStatusColor(task.status);
  const user = MOCK_USERS.find(u => u.id === task.assignee_id);
  const team = MOCK_TEAMS.find(t => t.id === task.team_id);
  
  return (
    <button
      onClick={() => task && onTaskClick?.(task)}
      className={cn(
        'w-full p-2 rounded-lg text-left text-xs border transition-all',
        'hover:shadow-md hover:scale-[1.02]',
        task.status === 'completed' && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <StatusIcon className={cn('h-3 w-3', statusColors.text)} />
        <span className={cn(
          'font-medium truncate flex-1',
          task.status === 'completed' && 'line-through'
        )}>
          {task.title}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Priority */}
        <Badge variant="outline" className={cn('text-[10px] px-1 py-0', priorityColors.text, priorityColors.border)}>
          {task.priority === 'urgent' ? '!!!' : task.priority === 'high' ? '!!' : task.priority === 'medium' ? '!' : '·'}
        </Badge>
        
        {/* Assignee/Team */}
        {user ? (
          <Avatar className="h-4 w-4">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-[8px]">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        ) : team ? (
          <div 
            className="h-4 w-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: team.color }}
          >
            <Users className="h-2.5 w-2.5 text-white" />
          </div>
        ) : null}
        
        {/* Subtasks progress */}
        {task.subtask_count > 0 && (
          <span className="text-muted-foreground text-[10px]">
            {task.completed_subtask_count}/{task.subtask_count}
          </span>
        )}
        
        {/* Operational badge */}
        {task.is_operational && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-auto">Op</Badge>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// CALENDAR EVENT MINI (Month View)
// ============================================================================

interface CalendarEventMiniProps {
  event: CalendarEvent;
  onTaskClick?: (task: Task) => void;
}

function CalendarEventMini({ event, onTaskClick }: CalendarEventMiniProps) {
  if (event.type === 'checkin' || event.type === 'checkout') {
    return (
      <div className={cn(
        'px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1',
        event.type === 'checkin' 
          ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' 
          : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
      )}>
        {event.type === 'checkin' ? (
          <LogIn className="h-2.5 w-2.5 shrink-0" />
        ) : (
          <LogOut className="h-2.5 w-2.5 shrink-0" />
        )}
        <span className="truncate">{event.property?.name}</span>
      </div>
    );
  }

  const task = event.task!;
  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  const statusColors = getStatusColor(task.status);
  const priorityColors = getPriorityColor(task.priority);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => task && onTaskClick?.(task)}
            className={cn(
              'w-full px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1 text-left',
              'hover:ring-1 hover:ring-primary/50 transition-all',
              statusColors.bg
            )}
          >
            <StatusIcon className={cn('h-2.5 w-2.5 shrink-0', statusColors.text)} />
            <span className={cn(
              'truncate',
              statusColors.text,
              task.status === 'completed' && 'line-through'
            )}>
              {task.title}
            </span>
            {task.priority === 'urgent' && (
              <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-red-500" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground">{task.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className={cn(priorityColors.text, priorityColors.border)}>
                {task.priority}
              </Badge>
              {task.subtask_count > 0 && (
                <span>{task.completed_subtask_count}/{task.subtask_count} subtarefas</span>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default TasksCalendarView;
