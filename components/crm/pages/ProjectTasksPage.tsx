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
// PRIORITY CONFIG
// ============================================================================

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-700', icon: '🔵' },
  medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

// ============================================================================
// TASK ROW COMPONENT
// ============================================================================

interface TaskRowProps {
  task: any;
  onClick: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onClick, onToggleComplete, onDelete }) => {
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  
  return (
    <div 
      className="group flex items-center gap-2 px-4 py-2.5 hover:bg-accent/50 cursor-pointer border-b border-transparent hover:border-border transition-colors"
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div className="opacity-0 group-hover:opacity-100 cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className="flex-shrink-0"
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>
      
      {/* Task Title */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-sm',
          isCompleted && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </span>
      </div>
      
      {/* Assignee */}
      <div className="w-24 flex-shrink-0 hidden md:block">
        {task.assignee_id ? (
          <div className="flex items-center gap-1">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                {task.users?.name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {task.users?.name?.split(' ')[0] || 'User'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
      
      {/* Due Date */}
      <div className="w-24 flex-shrink-0 hidden lg:block">
        {task.due_date ? (
          <span className={cn(
            'text-xs',
            new Date(task.due_date) < new Date() && !isCompleted
              ? 'text-red-500 font-medium'
              : 'text-muted-foreground'
          )}>
            {format(new Date(task.due_date), 'd MMM', { locale: ptBR })}
          </span>
        ) : (
          <div className="flex items-center text-muted-foreground opacity-0 group-hover:opacity-100">
            <Calendar className="h-4 w-4" />
          </div>
        )}
      </div>
      
      {/* Priority */}
      <div className="w-20 flex-shrink-0 hidden xl:block">
        <Badge variant="outline" className={cn('text-[10px]', priorityConfig.color)}>
          {priorityConfig.label}
        </Badge>
      </div>
      
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
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
  onTaskCreated: () => void;
}

const SectionGroup: React.FC<SectionGroupProps> = ({
  section,
  tasks,
  projectId,
  onTaskClick,
  onToggleTaskComplete,
  onDeleteTask,
  onTaskCreated,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  
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
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onToggleComplete={() => onToggleTaskComplete(task)}
                  onDelete={() => onDeleteTask(task)}
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
      
      {/* Table Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        <div className="w-5" /> {/* Drag handle space */}
        <div className="w-5" /> {/* Checkbox space */}
        <div className="flex-1">Nome</div>
        <div className="w-24 hidden md:block">Responsável</div>
        <div className="w-24 hidden lg:block">Data</div>
        <div className="w-20 hidden xl:block">Prioridade</div>
        <div className="w-7" /> {/* Actions */}
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
