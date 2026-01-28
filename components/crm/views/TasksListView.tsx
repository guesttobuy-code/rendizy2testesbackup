/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    TASKS LIST VIEW - UI COMPONENT                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Visualização de lista avançada com colunas configuráveis, filtros e bulk actions
 * 
 * Features:
 * - Colunas customizáveis e reordenáveis
 * - Filtros avançados
 * - Ordenação por múltiplas colunas
 * - Seleção múltipla e bulk actions
 * - Expansão de subtarefas hierárquicas
 * - Inline editing
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Trash2,
  Edit2,
  Copy,
  Eye,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
  Users,
  AlertTriangle,
  Settings2,
  Columns3,
  Download,
  Upload,
  RefreshCw,
  GripVertical,
  ArrowUp,
  ArrowDown,
  X,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronUp,
  CalendarClock,
  Loader2,
  Building,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { format, isToday, isTomorrow, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Task, TaskStatus, TaskPriority, Team, CustomField } from '@/types/crm-tasks';
import { getStatusColor, getPriorityColor } from '@/types/crm-tasks';
import { useTasks, useTeams, useUpdateTask, useDeleteTask } from '@/hooks/useCRMTasks';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface TasksListViewProps {
  organizationId?: string;
  projectId?: string;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: () => void;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  minWidth?: number;
  visible: boolean;
  sortable: boolean;
  align?: 'left' | 'center' | 'right';
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string[];
  team?: string[];
  dueDate?: 'overdue' | 'today' | 'this_week' | 'no_date';
  search?: string;
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
    id: '1-1',
    organization_id: 'org-1',
    project_id: 'proj-1',
    parent_id: '1',
    title: 'Verificar limpeza geral',
    status: 'completed',
    priority: 'high',
    assignee_id: 'user-2',
    depth: 1,
    path: '/1/1-1',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: [],
    created_at: '',
    updated_at: '',
  },
  {
    id: '1-2',
    organization_id: 'org-1',
    project_id: 'proj-1',
    parent_id: '1',
    title: 'Testar ar-condicionado',
    status: 'completed',
    priority: 'medium',
    assignee_id: 'user-2',
    depth: 1,
    path: '/1/1-2',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: [],
    created_at: '',
    updated_at: '',
  },
  {
    id: '1-3',
    organization_id: 'org-1',
    project_id: 'proj-1',
    parent_id: '1',
    title: 'Verificar itens de amenities',
    status: 'todo',
    priority: 'medium',
    assignee_id: 'user-2',
    depth: 1,
    path: '/1/1-3',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: [],
    created_at: '',
    updated_at: '',
  },
  {
    id: '1-4',
    organization_id: 'org-1',
    project_id: 'proj-1',
    parent_id: '1',
    title: 'Verificar chuveiro e torneiras',
    status: 'in_progress',
    priority: 'high',
    assignee_id: 'user-3',
    depth: 1,
    path: '/1/1-4',
    subtask_count: 0,
    completed_subtask_count: 0,
    tags: [],
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

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: '', width: 40, visible: true, sortable: false },
  { id: 'expand', label: '', width: 32, visible: true, sortable: false },
  { id: 'status', label: 'Status', width: 120, visible: true, sortable: true },
  { id: 'title', label: 'Tarefa', width: 300, minWidth: 200, visible: true, sortable: true },
  { id: 'assignee', label: 'Responsável', width: 150, visible: true, sortable: true },
  { id: 'team', label: 'Equipe', width: 120, visible: true, sortable: true },
  { id: 'priority', label: 'Prioridade', width: 100, visible: true, sortable: true },
  { id: 'due_date', label: 'Prazo', width: 130, visible: true, sortable: true },
  { id: 'property', label: 'Imóvel', width: 150, visible: true, sortable: true },
  { id: 'progress', label: 'Progresso', width: 120, visible: true, sortable: true },
  { id: 'tags', label: 'Tags', width: 150, visible: false, sortable: false },
  { id: 'created_at', label: 'Criado em', width: 120, visible: false, sortable: true },
  { id: 'actions', label: '', width: 60, visible: true, sortable: false, align: 'right' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: React.ElementType }[] = [
  { value: 'todo', label: 'A Fazer', icon: Circle },
  { value: 'in_progress', label: 'Em Progresso', icon: Clock },
  { value: 'completed', label: 'Concluído', icon: CheckCircle2 },
  { value: 'blocked', label: 'Bloqueado', icon: AlertTriangle },
  { value: 'cancelled', label: 'Cancelado', icon: X },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TasksListView({ organizationId, projectId, onTaskClick, onCreateTask }: TasksListViewProps) {
  const { user } = useAuth();
  const orgId = organizationId || user?.organizationId;
  
  // Hooks Supabase - dados reais
  const { data: tasks = [], isLoading: loading } = useTasks({ projectId });
  const { data: teams = [] } = useTeams();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  
  // State
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'due_date', direction: 'asc' });
  const [filters, setFilters] = useState<FilterConfig>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // Computed
  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const rootTasks = useMemo(() => tasks.filter(t => !t.parent_id), [tasks]);
  
  const childTasksMap = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.parent_id) {
        const children = map.get(task.parent_id) || [];
        children.push(task);
        map.set(task.parent_id, children);
      }
    });
    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = rootTasks;
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(t => filters.status!.includes(t.status));
    }
    
    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      result = result.filter(t => filters.priority!.includes(t.priority));
    }
    
    // Assignee filter
    if (filters.assignee && filters.assignee.length > 0) {
      result = result.filter(t => t.assignee_id && filters.assignee!.includes(t.assignee_id));
    }
    
    // Team filter
    if (filters.team && filters.team.length > 0) {
      result = result.filter(t => t.team_id && filters.team!.includes(t.team_id));
    }
    
    // Due date filter
    if (filters.dueDate) {
      const now = new Date();
      result = result.filter(t => {
        if (!t.due_date) return filters.dueDate === 'no_date';
        const dueDate = new Date(t.due_date);
        switch (filters.dueDate) {
          case 'overdue': return isPast(dueDate) && t.status !== 'completed';
          case 'today': return isToday(dueDate);
          case 'this_week': return differenceInDays(dueDate, now) <= 7 && differenceInDays(dueDate, now) >= 0;
          default: return true;
        }
      });
    }
    
    return result;
  }, [rootTasks, searchQuery, filters]);

  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.column) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = STATUS_OPTIONS.findIndex(s => s.value === a.status) - 
                      STATUS_OPTIONS.findIndex(s => s.value === b.status);
          break;
        case 'priority':
          comparison = PRIORITY_OPTIONS.findIndex(p => p.value === b.priority) - 
                      PRIORITY_OPTIONS.findIndex(p => p.value === a.priority);
          break;
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'assignee':
          const userA = MOCK_USERS.find(u => u.id === a.assignee_id)?.name || '';
          const userB = MOCK_USERS.find(u => u.id === b.assignee_id)?.name || '';
          comparison = userA.localeCompare(userB);
          break;
        case 'team':
          const teamA = MOCK_TEAMS.find(t => t.id === a.team_id)?.name || '';
          const teamB = MOCK_TEAMS.find(t => t.id === b.team_id)?.name || '';
          comparison = teamA.localeCompare(teamB);
          break;
        case 'progress':
          const progressA = a.subtask_count > 0 ? (a.completed_subtask_count || 0) / a.subtask_count : 0;
          const progressB = b.subtask_count > 0 ? (b.completed_subtask_count || 0) / b.subtask_count : 0;
          comparison = progressA - progressB;
          break;
        default:
          comparison = 0;
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredTasks, sortConfig]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status?.length) count++;
    if (filters.priority?.length) count++;
    if (filters.assignee?.length) count++;
    if (filters.team?.length) count++;
    if (filters.dueDate) count++;
    return count;
  }, [filters]);

  // Handlers
  const toggleTaskExpansion = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const selectAllTasks = useCallback(() => {
    if (selectedTasks.size === sortedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(sortedTasks.map(t => t.id)));
    }
  }, [sortedTasks, selectedTasks]);

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const toggleColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.map(c => 
      c.id === columnId ? { ...c, visible: !c.visible } : c
    ));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const handleBulkAction = useCallback(async (action: string) => {
    const ids = Array.from(selectedTasks);
    console.log(`Bulk action: ${action} on tasks:`, ids);
    
    if (useMockData) {
      // Mock mode - no real changes
      setSelectedTasks(new Set());
      return;
    }
    
    switch (action) {
      case 'complete':
        for (const id of ids) {
          await updateTaskMutation.mutateAsync({ id, updates: { status: 'completed' } });
        }
        break;
      case 'delete':
        if (confirm(`Excluir ${ids.length} tarefas?`)) {
          for (const id of ids) {
            await deleteTaskMutation.mutateAsync(id);
          }
        }
        break;
    }
    
    setSelectedTasks(new Set());
  }, [selectedTasks, useMockData, updateTaskMutation, deleteTaskMutation]);

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    if (useMockData) return;
    await updateTaskMutation.mutateAsync({ id: taskId, updates: { status } });
  }, [useMockData, updateTaskMutation]);

  // Render helpers
  const renderTaskRow = useCallback((task: Task, isSubtask = false) => {
    const user = MOCK_USERS.find(u => u.id === task.assignee_id);
    const team = teams.find(t => t.id === task.team_id) || MOCK_TEAMS.find(t => t.id === task.team_id);
    const property = MOCK_PROPERTIES.find(p => p.id === task.property_id);
    const hasChildren = childTasksMap.has(task.id);
    const isExpanded = expandedTasks.has(task.id);
    const isSelected = selectedTasks.has(task.id);
    const progress = task.subtask_count > 0 
      ? Math.round(((task.completed_subtask_count || 0) / task.subtask_count) * 100)
      : undefined;
    
    const dueDateInfo = task.due_date ? getDueDateInfo(task.due_date, task.status === 'completed') : null;
    
    return (
      <React.Fragment key={task.id}>
        <tr 
          className={cn(
            'group hover:bg-muted/50 transition-colors border-b',
            isSelected && 'bg-primary/5',
            isSubtask && 'bg-muted/20'
          )}
        >
          {visibleColumns.map(column => (
            <td
              key={column.id}
              className={cn(
                'px-3 py-2 text-sm',
                column.align === 'right' && 'text-right',
                column.align === 'center' && 'text-center'
              )}
              style={{ width: column.width, minWidth: column.minWidth }}
            >
              {column.id === 'select' && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleTaskSelection(task.id)}
                />
              )}
              
              {column.id === 'expand' && (
                <button
                  onClick={() => hasChildren && toggleTaskExpansion(task.id)}
                  className={cn(
                    'p-1 rounded hover:bg-muted transition-colors',
                    !hasChildren && 'opacity-0 pointer-events-none'
                  )}
                  style={{ marginLeft: isSubtask ? task.depth * 16 : 0 }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              
              {column.id === 'status' && (
                <Select
                  value={task.status}
                  onValueChange={(v) => updateTaskStatus(task.id, v as TaskStatus)}
                >
                  <SelectTrigger className="h-7 w-full border-0 bg-transparent px-2 hover:bg-muted">
                    <StatusBadge status={task.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <StatusBadge status={opt.value} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {column.id === 'title' && (
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ paddingLeft: isSubtask ? task.depth * 16 : 0 }}
                  onClick={() => onTaskClick?.(task)}
                >
                  <span className={cn(
                    'font-medium truncate',
                    task.status === 'completed' && 'text-muted-foreground line-through'
                  )}>
                    {task.title}
                  </span>
                  {task.subtask_count > 0 && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {task.completed_subtask_count}/{task.subtask_count}
                    </Badge>
                  )}
                  {task.is_operational && (
                    <Badge variant="outline" className="text-xs shrink-0">Operacional</Badge>
                  )}
                </div>
              )}
              
              {column.id === 'assignee' && (
                user ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{user.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )
              )}
              
              {column.id === 'team' && (
                team ? (
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${team.color}20`,
                      color: team.color,
                      borderColor: team.color,
                    }}
                  >
                    {team.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )
              )}
              
              {column.id === 'priority' && (
                <PriorityBadge priority={task.priority} />
              )}
              
              {column.id === 'due_date' && (
                dueDateInfo ? (
                  <span className={cn('text-sm', dueDateInfo.className)}>
                    {dueDateInfo.label}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )
              )}
              
              {column.id === 'property' && (
                property ? (
                  <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate text-sm">{property.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )
              )}
              
              {column.id === 'progress' && (
                progress !== undefined ? (
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-2 w-16" />
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )
              )}
              
              {column.id === 'tags' && task.tags && task.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              {column.id === 'created_at' && task.created_at && (
                <span className="text-muted-foreground text-xs">
                  {format(new Date(task.created_at), 'dd/MM/yy')}
                </span>
              )}
              
              {column.id === 'actions' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onTaskClick?.(task)}>
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
              )}
            </td>
          ))}
        </tr>
        
        {/* Subtasks */}
        {isExpanded && childTasksMap.get(task.id)?.map(child => renderTaskRow(child, true))}
      </React.Fragment>
    );
  }, [visibleColumns, expandedTasks, selectedTasks, childTasksMap, onTaskClick, toggleTaskExpansion, toggleTaskSelection, updateTaskStatus]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefas..."
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar
                  </Button>
                )}
              </div>
              
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          status: prev.status?.includes(opt.value)
                            ? prev.status.filter(s => s !== opt.value)
                            : [...(prev.status || []), opt.value]
                        }));
                      }}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors',
                        filters.status?.includes(opt.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <div className="flex flex-wrap gap-1">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFilters(prev => ({
                          ...prev,
                          priority: prev.priority?.includes(opt.value)
                            ? prev.priority.filter(p => p !== opt.value)
                            : [...(prev.priority || []), opt.value]
                        }));
                      }}
                      className={cn(
                        'px-2 py-1 rounded text-xs transition-colors',
                        filters.priority?.includes(opt.value)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Due Date Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Prazo</Label>
                <Select
                  value={filters.dueDate || ''}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, dueDate: v as any || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="overdue">Atrasadas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="this_week">Esta semana</SelectItem>
                    <SelectItem value="no_date">Sem prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Team Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Equipe</Label>
                <Select
                  value={filters.team?.[0] || ''}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, team: v ? [v] : undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {MOCK_TEAMS.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Column Config */}
        <DropdownMenu open={isColumnConfigOpen} onOpenChange={setIsColumnConfigOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Columns3 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.filter(c => !['select', 'expand', 'actions'].includes(c.id)).map(column => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh */}
        <Button variant="outline" size="icon" onClick={() => setLoading(true)}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>

        <div className="flex-1" />

        {/* Create Task */}
        <Button onClick={onCreateTask}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedTasks.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b">
          <span className="text-sm font-medium">
            {selectedTasks.size} tarefa(s) selecionada(s)
          </span>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={() => handleBulkAction('complete')}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar concluída
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleBulkAction('delete')}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedTasks(new Set())}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="border-b">
              {visibleColumns.map(column => (
                <th
                  key={column.id}
                  className={cn(
                    'px-3 py-2 text-xs font-medium text-muted-foreground text-left',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.sortable && 'cursor-pointer hover:text-foreground select-none'
                  )}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  {column.id === 'select' ? (
                    <Checkbox
                      checked={selectedTasks.size === sortedTasks.length && sortedTasks.length > 0}
                      onCheckedChange={selectAllTasks}
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && sortConfig.column === column.id && (
                        sortConfig.direction === 'asc' 
                          ? <ArrowUp className="h-3 w-3" />
                          : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length > 0 ? (
              sortedTasks.map(task => renderTaskRow(task))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckSquare className="h-12 w-12" />
                    <p className="font-medium">Nenhuma tarefa encontrada</p>
                    <p className="text-sm">Tente ajustar os filtros ou criar uma nova tarefa</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-sm text-muted-foreground">
        <span>
          {filteredTasks.length} de {rootTasks.length} tarefas
          {activeFilterCount > 0 && ' (filtrado)'}
        </span>
        <span>
          {tasks.filter(t => t.status === 'completed').length} concluídas
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: TaskStatus }) {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  const StatusIcon = option?.icon || Circle;
  const colors = getStatusColor(status);
  
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', colors.bg, colors.text)}>
      <StatusIcon className="h-3 w-3" />
      {option?.label || status}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors = getPriorityColor(priority);
  const label = PRIORITY_OPTIONS.find(p => p.value === priority)?.label || priority;
  
  return (
    <Badge variant="outline" className={cn('text-xs', colors.text, colors.border)}>
      {label}
    </Badge>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn('text-sm font-medium', className)}>{children}</label>;
}

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
      label: `Atrasado (${Math.abs(diff)}d)`,
      className: 'text-red-600 font-medium',
    };
  }
  
  if (diff <= 7) {
    return {
      label: format(date, 'EEEE', { locale: ptBR }),
      className: 'text-foreground',
    };
  }
  
  return {
    label: format(date, 'dd/MM', { locale: ptBR }),
    className: 'text-muted-foreground',
  };
}

export default TasksListView;
