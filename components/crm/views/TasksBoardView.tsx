/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS BOARD VIEW (KANBAN) - UI COMPONENT                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Visualização Kanban com drag-and-drop entre colunas de status
 * 
 * Features:
 * - Drag and drop entre colunas
 * - Colunas por status ou campo customizado
 * - Cards com informações essenciais
 * - Quick actions no hover
 * - WIP limits por coluna
 * - Collapse/expand de colunas
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  MoreHorizontal,
  Clock,
  Calendar,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Eye,
  Copy,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings2,
  Filter,
  Search,
  Building,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Task, TaskStatus, TaskPriority, Team } from '@/types/crm-tasks';
import { getStatusColor, getPriorityColor } from '@/types/crm-tasks';
import { useTasks, useTeams, useUpdateTask } from '@/hooks/useCRMTasks';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface TasksBoardViewProps {
  organizationId?: string;
  projectId?: string;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status?: TaskStatus) => void;
}

interface BoardColumn {
  id: TaskStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  wipLimit?: number;
}

// ============================================================================
// MOCK DATA (usando any para evitar conflitos de tipo durante desenvolvimento)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOCK_TASKS: any[] = [
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
    project_id: 'proj-1',
    title: 'Limpeza pós check-out - Casa de Praia',
    description: 'Limpeza completa após saída do hóspede',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-2',
    team_id: 'team-2',
    depth: 0,
    path: '/2',
    subtask_count: 6,
    completed_subtask_count: 0,
    tags: ['check-out', 'limpeza'],
    is_operational: true,
    property_id: 'prop-2',
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    organization_id: 'org-1',
    project_id: 'proj-1',
    title: 'Manutenção preventiva semanal',
    description: 'Verificação geral de manutenção',
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    team_id: 'team-3',
    depth: 0,
    path: '/3',
    subtask_count: 4,
    completed_subtask_count: 0,
    tags: ['manutenção'],
    is_operational: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '4',
    organization_id: 'org-1',
    project_id: 'proj-1',
    title: 'Atualizar fotos do anúncio',
    description: 'Tirar novas fotos profissionais do Studio',
    status: 'blocked',
    priority: 'low',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-1',
    depth: 0,
    path: '/4',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: ['marketing'],
    property_id: 'prop-3',
    created_at: '',
    updated_at: '',
  },
  {
    id: '5',
    organization_id: 'org-1',
    project_id: 'proj-1',
    title: 'Revisão de contrato - Cobertura Luxo',
    description: 'Revisar e atualizar contrato de locação',
    status: 'completed',
    priority: 'medium',
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignee_id: 'user-1',
    depth: 0,
    path: '/5',
    subtask_count: 2,
    completed_subtask_count: 2,
    tags: ['jurídico'],
    property_id: 'prop-4',
    created_at: '',
    updated_at: '',
  },
  {
    id: '6',
    organization_id: 'org-1',
    project_id: 'proj-1',
    title: 'Verificar inventário de roupas de cama',
    status: 'in_progress',
    priority: 'medium',
    assignee_id: 'user-2',
    team_id: 'team-2',
    depth: 0,
    path: '/6',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: ['inventário'],
    created_at: '',
    updated_at: '',
  },
  {
    id: '7',
    organization_id: 'org-1',
    project_id: 'proj-1',
    title: 'Responder avaliação negativa',
    status: 'todo',
    priority: 'urgent',
    due_date: new Date().toISOString(),
    assignee_id: 'user-1',
    depth: 0,
    path: '/7',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: ['atendimento'],
    created_at: '',
    updated_at: '',
  },
];

const MOCK_USERS = [
  { id: 'user-1', name: 'João Silva', email: 'joao@example.com', avatar: '' },
  { id: 'user-2', name: 'Maria Santos', email: 'maria@example.com', avatar: '' },
  { id: 'user-3', name: 'Pedro Costa', email: 'pedro@example.com', avatar: '' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOCK_TEAMS: any[] = [
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BOARD_COLUMNS: any[] = [
  { id: 'todo', title: 'A Fazer', icon: Circle, color: '#94a3b8', wipLimit: 10 },
  { id: 'in_progress', title: 'Em Progresso', icon: Clock, color: '#3b82f6', wipLimit: 5 },
  { id: 'blocked', title: 'Bloqueado', icon: AlertTriangle, color: '#ef4444' },
  { id: 'completed', title: 'Concluído', icon: CheckCircle2, color: '#22c55e' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TasksBoardView({ organizationId, projectId, onTaskClick, onCreateTask }: TasksBoardViewProps) {
  const { user } = useAuth();
  const orgId = organizationId || user?.organizationId;
  
  // Hooks Supabase - dados reais
  const { data: allTasks = [], isLoading } = useTasks({ projectId });
  const { data: teams = [] } = useTeams();
  const updateTaskMutation = useUpdateTask();
  
  // Filtrar apenas tarefas raiz (sem parent)
  const tasks = allTasks.filter((t: any) => !t.parent_id);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<TaskStatus>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    BOARD_COLUMNS.forEach(col => map.set(col.id, []));
    
    filteredTasks.forEach(task => {
      const list = map.get(task.status) || [];
      list.push(task);
      map.set(task.status, list);
    });
    
    return map;
  }, [filteredTasks]);

  const activeTask = useMemo(() => 
    activeId ? tasks.find(t => t.id === activeId) : null,
    [activeId, tasks]
  );

  const toggleColumnCollapse = useCallback((columnId: TaskStatus) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const taskId = active.id as string;
    const overId = over.id as string;
    
    // Determine target column
    let targetStatus: TaskStatus;
    if (BOARD_COLUMNS.some(c => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      // Dropped over a task, find its column
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      } else {
        setActiveId(null);
        return;
      }
    }

    // Update task status via Supabase
    if (!useMockData) {
      await updateTaskMutation.mutateAsync({ id: taskId, updates: { status: targetStatus } });
    }
    
    setActiveId(null);
  }, [tasks, useMockData, updateTaskMutation]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b bg-background shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefas..."
            className="pl-9"
          />
        </div>
        
        <div className="flex-1" />
        
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
        
        <Button onClick={() => onCreateTask?.()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ScrollArea className="flex-1">
          <div className="flex gap-4 p-4 min-h-full">
            {BOARD_COLUMNS.map(column => {
              const columnTasks = tasksByColumn.get(column.id) || [];
              const isCollapsed = collapsedColumns.has(column.id);
              const isOverWipLimit = column.wipLimit && columnTasks.length > column.wipLimit;
              
              return (
                <BoardColumnComponent
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  isCollapsed={isCollapsed}
                  isOverWipLimit={isOverWipLimit}
                  onToggleCollapse={() => toggleColumnCollapse(column.id)}
                  onTaskClick={onTaskClick}
                  onAddTask={() => onCreateTask?.(column.id)}
                />
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ============================================================================
// BOARD COLUMN COMPONENT
// ============================================================================

interface BoardColumnComponentProps {
  column: BoardColumn;
  tasks: Task[];
  isCollapsed: boolean;
  isOverWipLimit?: boolean;
  onToggleCollapse: () => void;
  onTaskClick?: (task: Task) => void;
  onAddTask: () => void;
}

function BoardColumnComponent({
  column,
  tasks,
  isCollapsed,
  isOverWipLimit,
  onToggleCollapse,
  onTaskClick,
  onAddTask,
}: BoardColumnComponentProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const ColumnIcon = column.icon;

  if (isCollapsed) {
    return (
      <div 
        className="w-10 shrink-0 bg-muted/50 rounded-lg p-2 cursor-pointer hover:bg-muted transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex flex-col items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          <div 
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: column.color }}
          >
            <ColumnIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-xs font-medium writing-vertical-rl rotate-180">
            {column.title}
          </span>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'w-72 shrink-0 flex flex-col bg-muted/30 rounded-lg transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/20'
      )}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center gap-2 border-b">
        <button 
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        
        <div 
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ backgroundColor: column.color }}
        >
          <ColumnIcon className="h-3.5 w-3.5 text-white" />
        </div>
        
        <span className="font-medium text-sm flex-1">{column.title}</span>
        
        <Badge 
          variant={isOverWipLimit ? 'destructive' : 'secondary'} 
          className="text-xs"
        >
          {tasks.length}
          {column.wipLimit && `/${column.wipLimit}`}
        </Badge>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={onAddTask}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Adicionar tarefa</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Column Content */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))}
          </div>
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ColumnIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
}

function TaskCard({ task, isDragging, onClick }: TaskCardProps) {
  const user = MOCK_USERS.find(u => u.id === task.assignee_id);
  const team = MOCK_TEAMS.find(t => t.id === task.team_id);
  const property = MOCK_PROPERTIES.find(p => p.id === task.property_id);
  const priorityColors = getPriorityColor(task.priority);
  
  const dueDateInfo = task.due_date ? getDueDateInfo(task.due_date, task.status === 'completed') : null;
  const progress = task.subtask_count > 0 
    ? Math.round(((task.completed_subtask_count || 0) / task.subtask_count) * 100)
    : undefined;

  return (
    <div 
      className={cn(
        'group bg-background rounded-lg border p-3 shadow-sm transition-all cursor-pointer',
        'hover:shadow-md hover:border-primary/30',
        isDragging && 'opacity-50 rotate-2 scale-105 shadow-xl'
      )}
      onClick={onClick}
    >
      {/* Priority indicator */}
      <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', priorityColors.bg)} />
      
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium text-sm line-clamp-2',
            task.status === 'completed' && 'text-muted-foreground line-through'
          )}>
            {task.title}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {task.is_operational && (
          <Badge variant="outline" className="text-xs">Operacional</Badge>
        )}
        {property && (
          <Badge variant="secondary" className="text-xs">
            <Building className="mr-1 h-3 w-3" />
            {property.name}
          </Badge>
        )}
      </div>

      {/* Progress */}
      {progress !== undefined && (
        <div className="flex items-center gap-2 mb-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground">
            {task.completed_subtask_count}/{task.subtask_count}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Assignee */}
          {user ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{user.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : team ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className="h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: team.color }}
                  >
                    <Users className="h-3 w-3 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{team.name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <span className="text-muted-foreground">
              {task.tags.length} tag{task.tags.length > 1 && 's'}
            </span>
          )}
        </div>
        
        {/* Due date */}
        {dueDateInfo && (
          <span className={cn('flex items-center gap-1', dueDateInfo.className)}>
            <Calendar className="h-3 w-3" />
            {dueDateInfo.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SORTABLE TASK CARD
// ============================================================================

interface SortableTaskCardProps {
  task: Task;
  onClick?: () => void;
}

function SortableTaskCard({ task, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(isDragging && 'opacity-50')}
    >
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getDueDateInfo(dueDate: string, isCompleted: boolean) {
  const date = new Date(dueDate);
  const now = new Date();
  const diff = differenceInDays(date, now);
  
  if (isCompleted) {
    return {
      label: format(date, 'dd/MM', { locale: ptBR }),
      className: 'text-muted-foreground',
    };
  }
  
  if (isToday(date)) {
    return {
      label: 'Hoje',
      className: 'text-orange-600 font-medium',
    };
  }
  
  if (isTomorrow(date)) {
    return {
      label: 'Amanhã',
      className: 'text-blue-600',
    };
  }
  
  if (isPast(date)) {
    return {
      label: `Atrasado`,
      className: 'text-red-600 font-medium',
    };
  }
  
  if (diff <= 7) {
    return {
      label: format(date, 'EEE', { locale: ptBR }),
      className: 'text-foreground',
    };
  }
  
  return {
    label: format(date, 'dd/MM', { locale: ptBR }),
    className: 'text-muted-foreground',
  };
}

export default TasksBoardView;
