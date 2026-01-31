/**
 * ProjectTasksPage - Visualização de tarefas de um projeto específico
 * 
 * Estrutura inspirada no Asana:
 * - Projeto contém N seções (To do, Doing, Done)
 * - Cada seção contém N tarefas
 * - Tarefas podem ter subtarefas, comentários, etc.
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  GripVertical,
  Pencil,
  Trash2,
  Flag,
  CalendarDays,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Hooks
import { 
  useProject, 
  useTasks, 
  useCreateTask,
  useUpdateTask, 
  useDeleteTask 
} from '@/hooks/useCRMTasks';

// Modal de detalhes da tarefa (completo com tabs)
import { TaskDetailModal } from '../modals/TaskDetailModal';

// ============================================================================
// TYPES
// ============================================================================

interface Section {
  id: string;
  name: string;
  color: string;
  order: number;
}

// Seções padrão (como Asana)
const DEFAULT_SECTIONS: Section[] = [
  { id: 'todo', name: 'A fazer', color: '#6b7280', order: 0 },
  { id: 'doing', name: 'Em andamento', color: '#3b82f6', order: 1 },
  { id: 'done', name: 'Concluído', color: '#10b981', order: 2 },
];

// Mapeamento de status para seção
const STATUS_TO_SECTION: Record<string, string> = {
  'pending': 'todo',
  'in_progress': 'doing',
  'completed': 'done',
  'cancelled': 'done',
};

// Mapeamento de seção para status (inverso)
const SECTION_TO_STATUS: Record<string, string> = {
  'todo': 'pending',
  'doing': 'in_progress',
  'done': 'completed',
};

// ============================================================================
// PRIORITY CONFIG - Cores mais destacadas
// ============================================================================

const PRIORITY_CONFIG = {
  low: { 
    label: 'Baixa', 
    color: 'bg-slate-100 text-slate-600 border-slate-300', 
    bgFull: 'bg-slate-500',
    icon: '🔵' 
  },
  medium: { 
    label: 'Média', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-400', 
    bgFull: 'bg-yellow-500',
    icon: '🟡' 
  },
  high: { 
    label: 'Alta', 
    color: 'bg-orange-100 text-orange-700 border-orange-400', 
    bgFull: 'bg-orange-500',
    icon: '🟠' 
  },
  urgent: { 
    label: 'Urgente', 
    color: 'bg-red-100 text-red-700 border-red-400', 
    bgFull: 'bg-red-500',
    icon: '🔴' 
  },
};

// Lista de prioridades para dropdown
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-slate-500' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
];

// ============================================================================
// STATUS CONFIG - Mesmas opções do modal
// ============================================================================

const STATUS_CONFIG = {
  pending: { 
    label: 'Pendente', 
    color: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: '⏳',
    iconColor: 'text-slate-500'
  },
  in_progress: { 
    label: 'Em Andamento', 
    color: 'bg-blue-100 text-blue-700 border-blue-400',
    icon: '🔄',
    iconColor: 'text-blue-500'
  },
  completed: { 
    label: 'Concluído', 
    color: 'bg-green-100 text-green-700 border-green-400',
    icon: '✅',
    iconColor: 'text-green-500'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-600 border-red-300',
    icon: '❌',
    iconColor: 'text-red-500'
  },
  skipped: { 
    label: 'Pulado', 
    color: 'bg-purple-100 text-purple-600 border-purple-300',
    icon: '⏭️',
    iconColor: 'text-purple-500'
  },
};

// Lista de status para dropdown
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', icon: '⏳', color: 'bg-slate-500' },
  { value: 'in_progress', label: 'Em Andamento', icon: '🔄', color: 'bg-blue-500' },
  { value: 'completed', label: 'Concluído', icon: '✅', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelado', icon: '❌', color: 'bg-red-500' },
  { value: 'skipped', label: 'Pulado', icon: '⏭️', color: 'bg-purple-500' },
];

// ============================================================================
// COLUMN HEADER COMPONENT
// ============================================================================

const ColumnHeader: React.FC = () => (
  <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground sticky top-0 z-20">
    <div className="w-5" /> {/* Drag handle space */}
    <div className="w-5" /> {/* Checkbox space */}
    <div className="flex-1 min-w-0">Nome</div>
    <div className="w-8 flex-shrink-0" /> {/* Arrow button space */}
    <div className="w-28 flex-shrink-0 text-center hidden sm:block">Status</div>
    <div className="w-28 flex-shrink-0 text-center hidden md:block">Responsável</div>
    <div className="w-28 flex-shrink-0 text-center hidden lg:block">Prazo</div>
    <div className="w-32 flex-shrink-0 text-center">Prioridade</div>
    <div className="w-8" /> {/* Actions space */}
  </div>
);

// ============================================================================
// TASK ROW COMPONENT (com edição inline e colunas clicáveis)
// ============================================================================

interface TaskRowProps {
  task: any;
  taskIndex: number;
  totalTasks: number;
  isEditing: boolean;
  onClick: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onTitleChange: (newTitle: string) => void;
  onFieldChange: (field: string, value: any) => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onTabToNext: () => void;
  onTabToCreate: () => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ 
  task, 
  taskIndex,
  totalTasks,
  isEditing,
  onClick, 
  onToggleComplete, 
  onDelete,
  onTitleChange,
  onFieldChange,
  onStartEditing,
  onStopEditing,
  onTabToNext,
  onTabToCreate,
}) => {
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const [localTitle, setLocalTitle] = React.useState(task.title);
  const [dateOpen, setDateOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Sync local title com task
  React.useEffect(() => {
    setLocalTitle(task.title);
  }, [task.title]);
  
  // Focus no input quando entra em modo de edição
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // Salvar título
  const handleSave = () => {
    if (localTitle.trim() && localTitle.trim() !== task.title) {
      onTitleChange(localTitle.trim());
    } else {
      setLocalTitle(task.title);
    }
    onStopEditing();
  };
  
  // Handler de teclas no input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (localTitle.trim() && localTitle.trim() !== task.title) {
        onTitleChange(localTitle.trim());
      }
      if (taskIndex >= totalTasks - 1) {
        onTabToCreate();
      } else {
        onTabToNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalTitle(task.title);
      onStopEditing();
    }
  };

  // Handler de mudança de prioridade
  const handlePriorityChange = (newPriority: string) => {
    onFieldChange('priority', newPriority);
  };

  // Handler de mudança de data
  const handleDateChange = (date: Date | undefined) => {
    onFieldChange('due_date', date ? date.toISOString() : null);
    setDateOpen(false);
  };
  
  // Configuração de status da tarefa
  const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  
  return (
    <div 
      className={cn(
        "group flex items-center gap-2 px-4 py-2.5 hover:bg-accent/50 border-b border-transparent hover:border-border transition-colors",
        isEditing && "bg-accent/30"
      )}
    >
      {/* Drag Handle */}
      <div className="opacity-0 group-hover:opacity-100 cursor-grab w-5 flex-shrink-0">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className="flex-shrink-0 w-5"
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>
      
      {/* Task Title - Editável */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full bg-transparent border-none outline-none text-sm focus:ring-0"
            placeholder="Nome da tarefa..."
          />
        ) : (
          <span 
            className={cn(
              'text-sm cursor-text block',
              isCompleted && 'line-through text-muted-foreground'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onStartEditing();
            }}
          >
            {task.title}
          </span>
        )}
      </div>
      
      {/* Botão de abrir detalhes - Seta diagonal */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-all shadow-sm"
        title="Abrir detalhes"
      >
        <ArrowUpRight className="h-4 w-4 text-slate-700" />
      </button>
      
      {/* Status - Dropdown */}
      <div className="w-28 flex-shrink-0 hidden sm:flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-all hover:shadow-sm",
              statusConfig.color
            )}>
              <span>{statusConfig.icon}</span>
              <span>{statusConfig.label}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-44">
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem 
                key={option.value}
                onClick={() => onFieldChange('status', option.value)}
                className={cn(
                  "flex items-center gap-2",
                  task.status === option.value && "bg-accent"
                )}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
                {task.status === option.value && (
                  <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Responsável - Dropdown */}
      <div className="w-28 flex-shrink-0 hidden md:flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 hover:bg-accent rounded px-2 py-1 transition-colors">
              {task.assignee_id ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                      {task.users?.name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                    {task.users?.name?.split(' ')[0] || 'User'}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground opacity-60 group-hover:opacity-100">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-xs">Atribuir</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={() => onFieldChange('assignee_id', null)}>
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              Sem responsável
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Membros da equipe (em breve)
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Prazo - Date Picker */}
      <div className="w-28 flex-shrink-0 hidden lg:flex justify-center">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 hover:bg-accent rounded px-2 py-1 transition-colors">
              {task.due_date ? (
                <span className={cn(
                  'text-xs font-medium',
                  new Date(task.due_date) < new Date() && !isCompleted
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                )}>
                  {format(new Date(task.due_date), "d 'de' MMM", { locale: ptBR })}
                </span>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground opacity-60 group-hover:opacity-100">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-xs">Prazo</span>
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <CalendarComponent
              mode="single"
              selected={task.due_date ? new Date(task.due_date) : undefined}
              onSelect={handleDateChange}
              locale={ptBR}
              initialFocus
            />
            {task.due_date && (
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-red-500 hover:text-red-600"
                  onClick={() => handleDateChange(undefined)}
                >
                  Remover prazo
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Prioridade - Dropdown com destaque */}
      <div className="w-32 flex-shrink-0 flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all",
              "hover:shadow-sm active:scale-95",
              priorityConfig.color
            )}>
              <Flag className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{priorityConfig.label}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-36">
            {PRIORITY_OPTIONS.map((option) => (
              <DropdownMenuItem 
                key={option.value}
                onClick={() => handlePriorityChange(option.value)}
                className={cn(
                  "flex items-center gap-2",
                  task.priority === option.value && "bg-accent"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full", option.color)} />
                <span>{option.label}</span>
                {task.priority === option.value && (
                  <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Abrir detalhes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface SectionGroupProps {
  section: Section;
  tasks: any[];
  projectId: string;
  onTaskClick: (task: any) => void;
  onToggleTaskComplete: (task: any) => void;
  onDeleteTask: (task: any) => void;
  onUpdateTaskTitle: (task: any, newTitle: string) => void;
  onUpdateTaskField: (task: any, field: string, value: any) => void;
  onTaskCreated: () => void;
}

const SectionGroup: React.FC<SectionGroupProps> = ({
  section,
  tasks,
  projectId,
  onTaskClick,
  onToggleTaskComplete,
  onDeleteTask,
  onUpdateTaskTitle,
  onUpdateTaskField,
  onTaskCreated,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const taskRefs = React.useRef<Map<string, HTMLInputElement>>(new Map());
  
  // Hook para criar tarefa
  const createTaskMutation = useCreateTask();
  
  // Focus no input quando abrir
  React.useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);
  
  // Criar tarefa
  const handleCreateTask = async (continueAdding: boolean = false) => {
    if (!newTaskTitle.trim()) {
      if (!continueAdding) {
        setIsAddingTask(false);
      }
      return;
    }
    
    try {
      await createTaskMutation.mutateAsync({
        title: newTaskTitle.trim(),
        project_id: projectId,
        status: SECTION_TO_STATUS[section.id] || 'pending',
        priority: 'medium',
      });
      
      setNewTaskTitle('');
      onTaskCreated();
      
      if (continueAdding) {
        // Tab pressionado - mantém input aberto para próxima tarefa
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        // Enter pressionado - fecha input
        setIsAddingTask(false);
      }
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    }
  };
  
  // Navegar para a próxima tarefa (Tab)
  const handleTabToNext = (currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < tasks.length) {
      // Ir para próxima tarefa existente
      const nextTask = tasks[nextIndex];
      setEditingTaskId(nextTask.id);
    } else {
      // Não há mais tarefas, abrir input de criar
      setEditingTaskId(null);
      setIsAddingTask(true);
      setNewTaskTitle('');
    }
  };
  
  // Handler de teclas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTask(false); // Enter = criar e fechar
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCreateTask(true); // Tab = criar e continuar
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };
  
  const startAddingTask = () => {
    setIsAddingTask(true);
    setNewTaskTitle('');
  };
  
  return (
    <div className="mb-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 sticky top-0 z-10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm">{section.name}</span>
          <Badge variant="outline" className="text-xs">
            {tasks.length}
          </Badge>
        </button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={startAddingTask}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar tarefa
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Renomear seção
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar seção acima
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar seção abaixo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir seção
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Section Tasks */}
      {isExpanded && (
        <div className="border-l-2 ml-6" style={{ borderColor: section.color }}>
          {tasks.length === 0 && !isAddingTask ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              <p>Nenhuma tarefa nesta seção</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={startAddingTask}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar tarefa
              </Button>
            </div>
          ) : (
            <>
              {/* Column Header */}
              <ColumnHeader />
              
              {tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  taskIndex={index}
                  totalTasks={tasks.length}
                  isEditing={editingTaskId === task.id}
                  onClick={() => onTaskClick(task)}
                  onToggleComplete={() => onToggleTaskComplete(task)}
                  onDelete={() => onDeleteTask(task)}
                  onTitleChange={(newTitle) => onUpdateTaskTitle(task, newTitle)}
                  onFieldChange={(field, value) => onUpdateTaskField(task, field, value)}
                  onStartEditing={() => {
                    setEditingTaskId(task.id);
                    setIsAddingTask(false);
                  }}
                  onStopEditing={() => setEditingTaskId(null)}
                  onTabToNext={() => handleTabToNext(index)}
                  onTabToCreate={() => {
                    setEditingTaskId(null);
                    setIsAddingTask(true);
                    setNewTaskTitle('');
                  }}
                />
              ))}
              
              {/* Inline Add Task Input */}
              {isAddingTask ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-accent/20">
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                      if (!newTaskTitle.trim()) {
                        setIsAddingTask(false);
                      }
                    }}
                    placeholder="Nome da tarefa... (Enter para salvar, Tab para continuar, Esc para cancelar)"
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    autoFocus
                  />
                  {createTaskMutation.isPending && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  )}
                </div>
              ) : (
                <button
                  onClick={startAddingTask}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar tarefa...
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectTasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  
  // Data hooks
  const { data: project, isLoading: isLoadingProject } = useProject(projectId || '');
  const { data: allTasks = [], isLoading: isLoadingTasks } = useTasks({ projectId: projectId });
  
  // Mutation hooks
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  
  // Filter tasks by search
  const filteredTasks = useMemo(() => {
    if (!searchQuery) return allTasks;
    const query = searchQuery.toLowerCase();
    return allTasks.filter((task: any) => 
      task.title?.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query)
    );
  }, [allTasks, searchQuery]);
  
  // Group tasks by section
  const tasksBySection = useMemo(() => {
    const groups: Record<string, any[]> = {
      'todo': [],
      'doing': [],
      'done': [],
    };
    
    filteredTasks.forEach((task: any) => {
      const sectionId = STATUS_TO_SECTION[task.status] || 'todo';
      if (!groups[sectionId]) groups[sectionId] = [];
      groups[sectionId].push(task);
    });
    
    return groups;
  }, [filteredTasks]);
  
  // Handlers
  const handleTaskClick = useCallback((task: any) => {
    setSelectedTaskId(task.id);
    setIsTaskDetailOpen(true);
  }, []);
  
  const handleAddTask = useCallback((sectionId: string) => {
    // Para adicionar tarefa, usamos o input inline da seção
    // ou podemos abrir um modal simples de criação
  }, []);
  
  const handleToggleTaskComplete = useCallback(async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { status: newStatus }
      });
      toast.success(newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  }, [updateTaskMutation]);
  
  const handleDeleteTask = useCallback(async (task: any) => {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success('Tarefa excluída');
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
    }
  }, [deleteTaskMutation]);
  
  const handleUpdateTaskTitle = useCallback(async (task: any, newTitle: string) => {
    if (!newTitle.trim() || newTitle === task.title) return;
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { title: newTitle.trim() }
      });
      // Não mostra toast para não ser intrusivo durante edição rápida
    } catch (error) {
      toast.error('Erro ao atualizar título');
    }
  }, [updateTaskMutation]);
  
  // Handler genérico para atualizar qualquer campo da tarefa
  const handleUpdateTaskField = useCallback(async (task: any, field: string, value: any) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { [field]: value }
      });
    } catch (error) {
      toast.error(`Erro ao atualizar ${field}`);
    }
  }, [updateTaskMutation]);
  
  // Loading state
  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  // Project not found
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/crm/projetos')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar para Projetos
        </Button>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center gap-4 mb-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/crm/projetos')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Projetos
          </Button>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: project.color || '#6366f1' }}
            />
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          
          <Badge variant="outline" className="text-xs">
            {allTasks.length} tarefas
          </Badge>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          
          <Button onClick={() => handleAddTask('todo')}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar tarefa
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoadingTasks ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="py-2">
            {DEFAULT_SECTIONS.map((section) => (
              <SectionGroup
                key={section.id}
                section={section}
                tasks={tasksBySection[section.id] || []}
                projectId={projectId || ''}
                onTaskClick={handleTaskClick}
                onToggleTaskComplete={handleToggleTaskComplete}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskTitle={handleUpdateTaskTitle}
                onUpdateTaskField={handleUpdateTaskField}
                onTaskCreated={() => {
                  // Query será revalidada automaticamente pelo React Query
                }}
              />
            ))}
            
            {/* Add Section */}
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">
              <Plus className="h-4 w-4" />
              Adicionar uma seção
            </button>
          </div>
        )}
      </ScrollArea>
      
      {/* Task Detail Modal - Modal completo com tabs */}
      <TaskDetailModal
        taskId={selectedTaskId}
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        onTaskUpdated={() => {
          // Query será revalidada automaticamente
        }}
      />
    </div>
  );
}

export default ProjectTasksPage;
