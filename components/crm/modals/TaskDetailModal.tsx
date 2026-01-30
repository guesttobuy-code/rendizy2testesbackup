/**
 * Task Detail Modal - Modal de Detalhes da Tarefa
 * 
 * Estilo ClickUp com:
 * - Hierarquia de subtarefas (múltiplos níveis)
 * - Activity log lateral
 * - Campos editáveis inline
 * - Progress tracking
 * 
 * @version 3.0.0
 * @date 2026-01-30
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  MessageSquare,
  Paperclip,
  Link2,
  Copy,
  Trash2,
  Archive,
  Star,
  StarOff,
  Sparkles,
  Send,
  AtSign,
  Smile,
  Image,
  FileText,
  ExternalLink,
  Edit3,
  Users,
  Tag,
  AlertCircle,
  CheckCheck,
  FolderOpen,
  Loader2,
  ListTodo,
  Check,
  FileCode,
} from 'lucide-react';
import { CreateTemplateModal } from './CreateTemplateModal';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// Hooks
import { 
  useTask, 
  useSubtasks,
  useTaskComments, 
  useTaskActivities,
  useCreateTaskComment,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '@/hooks/useCRMTasks';
import { TaskStatus, TaskPriority } from '@/utils/services/crmTasksService';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

// SubtaskItemProps movida para dentro do componente SubtaskItem

// ============================================================================
// STATUS & PRIORITY CONFIG
// ============================================================================

const STATUS_CONFIG = {
  pending: { label: 'Pendente', emoji: '⏳', color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'Em Andamento', emoji: '🔄', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', emoji: '✅', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', emoji: '❌', color: 'bg-gray-100 text-gray-600' },
  skipped: { label: 'Pulado', emoji: '⏭️', color: 'bg-gray-100 text-gray-600' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', emoji: '🔵', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Média', emoji: '🟡', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'Alta', emoji: '🟠', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', emoji: '🚩', color: 'bg-red-100 text-red-700' },
};

// ============================================================================
// SUBTASK ITEM COMPONENT (Hierarquia com sub e sub-sub tarefas)
// ============================================================================

interface SubtaskItemProps {
  task: any;
  level?: number;
  onComplete?: (id: string, completed: boolean) => void;
  onCreateChild?: (parentId: string, title: string) => Promise<void>;
  onDelete?: (id: string) => void;
  children?: any[];
  allSubtasks: any[];
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({
  task,
  level = 0,
  onComplete,
  onCreateChild,
  onDelete,
  allSubtasks,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const childInputRef = React.useRef<HTMLInputElement>(null);
  
  // Encontrar filhos diretos desta tarefa
  const childTasks = allSubtasks.filter((t: any) => t.parent_id === task.id);
  const hasChildren = childTasks.length > 0;
  const completedChildren = childTasks.filter((c: any) => c.status === 'completed').length;
  const totalChildren = childTasks.length;
  const isCompleted = task.status === 'completed';

  // Limitar níveis (subtarefa = level 0, sub-subtarefa = level 1)
  const canAddChildren = level < 1;

  // Focus input quando abre
  React.useEffect(() => {
    if (isAddingChild && childInputRef.current) {
      childInputRef.current.focus();
    }
  }, [isAddingChild]);

  const handleCreateChild = async () => {
    if (!newChildTitle.trim() || !onCreateChild) return;
    setIsCreating(true);
    try {
      await onCreateChild(task.id, newChildTitle.trim());
      setNewChildTitle('');
      setIsAddingChild(false);
      setIsExpanded(true); // Expandir para mostrar o novo item
    } catch (error) {
      console.error('Erro ao criar sub-subtarefa:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-center gap-2 py-2 px-2 rounded hover:bg-accent/50 transition-colors',
        )}
        style={{ paddingLeft: `${level * 28 + 8}px` }}
      >
        {/* Linha vertical de hierarquia */}
        {level > 0 && (
          <div 
            className="absolute border-l-2 border-muted-foreground/20"
            style={{ 
              left: `${(level - 1) * 28 + 20}px`,
              height: '100%',
              top: 0,
            }}
          />
        )}

        {/* Expand/Collapse */}
        {hasChildren || isAddingChild ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-accent rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => onComplete?.(task.id, checked as boolean)}
          className={cn(
            'flex-shrink-0',
            isCompleted && 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </span>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                {completedChildren}/{totalChildren}
              </span>
            )}
          </div>
        </div>

        {/* Actions (visíveis no hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Adicionar sub-item (apenas para subtarefas, não sub-subtarefas) */}
          {canAddChildren && (
            <button
              onClick={() => {
                setIsAddingChild(true);
                setIsExpanded(true);
              }}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              title="Adicionar sub-item"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          
          {/* Assignee placeholder */}
          <button className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground">
            <User className="h-3.5 w-3.5" />
          </button>
          
          {/* Delete */}
          <button
            onClick={() => onDelete?.(task.id)}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-red-500"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children (sub-subtarefas) e Input para novo child */}
      {(hasChildren || isAddingChild) && isExpanded && (
        <div className="relative">
          {/* Linha vertical conectando os filhos */}
          <div 
            className="absolute border-l-2 border-muted-foreground/20"
            style={{ 
              left: `${level * 28 + 20}px`,
              top: 0,
              bottom: 0,
            }}
          />
          
          {/* Filhos existentes */}
          {childTasks.map((child: any) => (
            <SubtaskItem
              key={child.id}
              task={child}
              level={level + 1}
              onComplete={onComplete}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              allSubtasks={allSubtasks}
            />
          ))}

          {/* Input para adicionar novo child */}
          {isAddingChild && (
            <div 
              className="flex items-center gap-2 py-2 px-2 bg-accent/30 rounded mx-1"
              style={{ paddingLeft: `${(level + 1) * 28 + 8}px` }}
            >
              <div className="w-5 flex-shrink-0" />
              <Checkbox disabled className="flex-shrink-0" />
              <input
                ref={childInputRef}
                type="text"
                value={newChildTitle}
                onChange={(e) => setNewChildTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newChildTitle.trim()) {
                    handleCreateChild();
                  } else if (e.key === 'Escape') {
                    setIsAddingChild(false);
                    setNewChildTitle('');
                  }
                }}
                placeholder="Nome da sub-subtarefa..."
                className="flex-1 bg-transparent border-none outline-none text-sm"
                disabled={isCreating}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCreateChild}
                disabled={!newChildTitle.trim() || isCreating}
                className="h-6 px-2"
              >
                {isCreating ? (
                  <div className="h-3 w-3 border-2 border-t-transparent border-current rounded-full animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingChild(false);
                  setNewChildTitle('');
                }}
                className="h-6 px-2"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  activity: any;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR }) + 
      ' at ' + format(date, 'HH:mm', { locale: ptBR });
  };

  const getIcon = () => {
    switch (activity.activity_type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'completed':
      case 'task_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'status_changed':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'created':
        return <Plus className="h-4 w-4 text-blue-500" />;
      case 'assigned':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getDescription = () => {
    const type = activity.activity_type;
    const oldVal = activity.old_value;
    const newVal = activity.new_value;

    switch (type) {
      case 'created':
        return 'criou a tarefa';
      case 'completed':
      case 'task_completed':
        return `checked ${activity.description || 'tarefa concluída'}`;
      case 'status_changed':
        return `changed status from ${oldVal?.status || '?'} to ${newVal?.status || '?'}`;
      case 'assigned':
        return `assigned to ${newVal?.assignee || '?'}`;
      case 'priority_changed':
        return `changed priority to ${newVal?.priority || '?'}`;
      case 'due_date_changed':
        return 'changed due date';
      default:
        return activity.description || type;
    }
  };

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className="text-[10px]">
          {activity.user_name?.slice(0, 2).toUpperCase() || 'SY'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{activity.user_name || 'Sistema'}</span>
          <span className="text-xs text-muted-foreground">{formatTime(activity.created_at)}</span>
        </div>
        <div className="flex items-start gap-2 mt-1">
          <span className="text-muted-foreground mt-0.5">{getIcon()}</span>
          <p className="text-sm whitespace-pre-wrap">{getDescription()}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMMENT ITEM COMPONENT
// ============================================================================

interface CommentItemProps {
  comment: any;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR }) + 
      ' at ' + format(date, 'HH:mm', { locale: ptBR });
  };

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className="text-[10px]">
          {comment.user_name?.slice(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{comment.user_name || 'Usuário'}</span>
          <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap mt-1">{comment.content}</p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailModal({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const [isStarred, setIsStarred] = useState(false);
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);

  // Estados para adicionar subtarefas
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const newSubtaskInputRef = React.useRef<HTMLInputElement>(null);

  // Auth
  const { user } = useAuth();

  // Data hooks
  const { data: task, isLoading: loadingTask } = useTask(taskId || '');
  const { data: subtasks = [], isLoading: loadingSubtasks } = useSubtasks(taskId || '');
  const { data: comments = [], isLoading: loadingComments } = useTaskComments(taskId || '');
  const { data: activities = [], isLoading: loadingActivities } = useTaskActivities(taskId || '');

  // Mutations
  const createComment = useCreateTaskComment();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();

  // Sync description with task data
  React.useEffect(() => {
    if (task?.description !== undefined) {
      setDescription(task.description || '');
    }
  }, [task?.description]);

  // Auto-resize textarea
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    // Auto-resize
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  };

  // Save description
  const handleSaveDescription = async () => {
    if (!task) return;
    setIsSavingDescription(true);
    try {
      await updateTask.mutateAsync({ 
        id: task.id, 
        updates: { description: description.trim() || undefined } 
      });
      setIsEditingDescription(false);
      toast.success('Descrição salva');
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao salvar descrição');
    } finally {
      setIsSavingDescription(false);
    }
  };

  // Calculate progress from subtasks
  const { total, completed, progress } = useMemo(() => {
    const countTasks = (tasks: any[]): { total: number; completed: number } => {
      let totalCount = 0;
      let completedCount = 0;
      
      tasks.forEach(t => {
        totalCount++;
        if (t.status === 'completed') completedCount++;
      });
      
      return { total: totalCount, completed: completedCount };
    };

    const counts = countTasks(subtasks);
    return {
      ...counts,
      progress: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
    };
  }, [subtasks]);

  // Handlers
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { status: newStatus } });
      toast.success(`Status alterado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { priority: newPriority } });
      toast.success(`Prioridade alterada para ${PRIORITY_CONFIG[newPriority]?.label || newPriority}`);
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao alterar prioridade');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    try {
      await createComment.mutateAsync({ 
        taskId: task.id, 
        content: newComment.trim() 
      });
      setNewComment('');
      toast.success('Comentário adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    }
  };

  const handleSubtaskComplete = async (subtaskId: string, completed: boolean) => {
    try {
      await updateTask.mutateAsync({ 
        id: subtaskId, 
        updates: { status: completed ? 'completed' : 'pending' } 
      });
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao atualizar subtarefa');
    }
  };

  // Handler para criar subtarefa
  const handleCreateSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    setCreatingSubtask(true);
    console.log('[handleCreateSubtask] Criando subtarefa:', { title: newSubtaskTitle, parentId: task.id });
    try {
      const newTask = await createTask.mutateAsync({
        title: newSubtaskTitle.trim(),
        parent_id: task.id, // subtarefa da tarefa principal
        status: 'pending',
        priority: 'medium',
      });
      console.log('[handleCreateSubtask] Subtarefa criada:', newTask);
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      toast.success('Subtarefa criada');
      onTaskUpdated?.();
    } catch (error) {
      console.error('[handleCreateSubtask] Erro ao criar subtarefa:', error);
      toast.error('Erro ao criar subtarefa');
    } finally {
      setCreatingSubtask(false);
    }
  };

  // Handler genérico para criar sub-subtarefa (chamado pelo SubtaskItem)
  const handleCreateChildTask = async (parentId: string, title: string) => {
    if (!title.trim()) {
      console.log('[handleCreateChildTask] Título vazio, ignorando');
      return;
    }
    console.log('[handleCreateChildTask] Criando sub-subtarefa:', { parentId, title });
    try {
      const newTask = await createTask.mutateAsync({
        title: title.trim(),
        parent_id: parentId,
        status: 'pending',
        priority: 'medium',
      });
      console.log('[handleCreateChildTask] Sub-subtarefa criada com sucesso:', newTask);
      toast.success('Sub-subtarefa criada');
      onTaskUpdated?.();
    } catch (error) {
      console.error('[handleCreateChildTask] Erro ao criar sub-subtarefa:', error);
      toast.error('Erro ao criar sub-subtarefa');
      throw error; // Re-throw para o SubtaskItem saber que falhou
    }
  };

  // Handler para deletar subtarefa
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Excluir esta subtarefa?')) return;
    try {
      await deleteTask.mutateAsync(subtaskId);
      toast.success('Subtarefa excluída');
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao excluir subtarefa');
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success('Tarefa excluída');
      onOpenChange(false);
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!taskId || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative ml-auto h-full w-full max-w-4xl bg-background shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        {loadingTask ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : task ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-4">
                <Checkbox 
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => handleStatusChange(checked ? 'completed' : 'pending')}
                  className="h-5 w-5" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    {task.project_name && (
                      <>
                        <span className="text-xs text-muted-foreground">{task.project_name}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {task.section_name || (task.status === 'pending' ? 'A fazer' : task.status === 'in_progress' ? 'Em andamento' : 'Concluído')}
                    </span>
                  </div>
                  <h2 className="font-semibold text-lg mt-1">{task.title}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsStarred(!isStarred)}
                >
                  {isStarred ? (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowCreateTemplateModal(true)}>
                      <FileCode className="h-4 w-4 mr-2" />
                      Criar Modelo
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="px-6 py-3 bg-muted/30 border-b flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>Peça ao cérebro para escreva uma descrição, criar um resumo ou encontrar tarefas semelhantes</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Status & Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Status
                      </label>
                      <Select 
                        value={task.status} 
                        onValueChange={(val) => handleStatusChange(val as TaskStatus)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.emoji} {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Cessionários
                      </label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {task.assignee_name || 'Vazio'}
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Datas
                      </label>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        {task.due_date ? (
                          <span className={cn(
                            new Date(task.due_date) < new Date() && task.status !== 'completed'
                              ? 'text-orange-500'
                              : ''
                          )}>
                            🗓️ {format(new Date(task.due_date), 'dd/MM/yy', { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Começar +</span>
                        )}
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Flag className="h-4 w-4" />
                        Prioridade
                      </label>
                      <Select 
                        value={task.priority} 
                        onValueChange={(val) => handlePriorityChange(val as TaskPriority)}
                      >
                        <SelectTrigger className="mt-1 w-fit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <Badge className={cn('text-xs', config.color)}>
                                {config.emoji} {config.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Project */}
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Projeto
                      </label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {task.project_name || 'Vazio'}
                      </div>
                    </div>

                    {/* Relationships */}
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Relacionamentos
                      </label>
                      <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Description - Campo de texto livre */}
                  <div>
                    <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      Descrição / Notas
                    </label>
                    {isEditingDescription || !description ? (
                      <div className="space-y-2">
                        <Textarea
                          ref={descriptionRef}
                          placeholder="Adicione uma descrição ou notas sobre esta tarefa..."
                          value={description}
                          onChange={handleDescriptionChange}
                          onFocus={() => setIsEditingDescription(true)}
                          className="min-h-[80px] resize-none overflow-hidden text-sm"
                          style={{ height: 'auto' }}
                        />
                        {isEditingDescription && (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              onClick={handleSaveDescription}
                              disabled={isSavingDescription}
                            >
                              {isSavingDescription ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                              )}
                              Salvar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setDescription(task?.description || '');
                                setIsEditingDescription(false);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="text-sm p-3 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors whitespace-pre-wrap min-h-[60px]"
                        onClick={() => setIsEditingDescription(true)}
                      >
                        {description}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Tabs - Apenas Detalhes e Subtarefas */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="details">Detalhes</TabsTrigger>
                      <TabsTrigger value="subtasks">
                        Subtarefas
                        {total > 0 && (
                          <Badge variant="secondary" className="ml-2">{completed}/{total}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Detalhes do projeto serão exibidos aqui.
                      </p>
                      {task.estimated_minutes && (
                        <div className="flex items-center gap-2 mt-4 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{task.estimated_minutes} min estimados</span>
                        </div>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {task.tags.map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="subtasks" className="mt-4 space-y-4">
                      {/* Progress bar (se houver subtasks) */}
                      {total > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progresso</span>
                            <span className="text-sm text-muted-foreground">
                              <span className="text-green-500">●</span> {completed}/{total} concluídas
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      {/* Lista de subtarefas hierárquica */}
                      {loadingSubtasks ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                        </div>
                      ) : subtasks.length > 0 ? (
                        <div className="space-y-0.5 relative">
                          {/* Apenas subtarefas de primeiro nível (parent_id === taskId) */}
                          {subtasks
                            .filter((subtask: any) => subtask.parent_id === taskId)
                            .map((subtask: any) => (
                              <SubtaskItem
                                key={subtask.id}
                                task={subtask}
                                level={0}
                                onComplete={handleSubtaskComplete}
                                onCreateChild={handleCreateChildTask}
                                onDelete={handleDeleteSubtask}
                                allSubtasks={subtasks}
                              />
                            ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma subtarefa ainda.</p>
                          <p className="text-xs mt-1">Clique no botão abaixo para adicionar.</p>
                        </div>
                      )}

                      {/* Adicionar subtarefa - Input inline */}
                      {isAddingSubtask ? (
                        <div className="flex items-center gap-2 py-2 px-2 bg-accent/30 rounded">
                          <Checkbox disabled className="flex-shrink-0" />
                          <input
                            ref={newSubtaskInputRef}
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                handleCreateSubtask();
                              } else if (e.key === 'Escape') {
                                setIsAddingSubtask(false);
                                setNewSubtaskTitle('');
                              }
                            }}
                            placeholder="Nome da subtarefa..."
                            className="flex-1 bg-transparent border-none outline-none text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCreateSubtask}
                            disabled={!newSubtaskTitle.trim() || creatingSubtask}
                            className="h-7 px-2"
                          >
                            {creatingSubtask ? (
                              <div className="h-3 w-3 border-2 border-t-transparent border-current rounded-full animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsAddingSubtask(false);
                              setNewSubtaskTitle('');
                            }}
                            className="h-7 px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsAddingSubtask(true)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 w-full hover:bg-accent/30 rounded px-2 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar subtarefa
                        </button>
                      )}

                      {/* Ocultar concluídas */}
                      {completed > 0 && (
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-2">
                          <CheckCheck className="h-4 w-4" />
                          {completed} {completed === 1 ? 'concluída' : 'concluídas'} - Ocultar
                        </button>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Activity Sidebar */}
              <div className="w-80 border-l flex flex-col flex-shrink-0">
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold">Activity</h3>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {/* Tabs for Comments / Activities */}
                    <Tabs defaultValue="comments" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="comments" className="text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Comentários ({comments.length})
                        </TabsTrigger>
                        <TabsTrigger value="activities" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Atividades
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="comments" className="mt-0">
                        {loadingComments ? (
                          <div className="space-y-3">
                            {[1, 2].map(i => (
                              <div key={i} className="flex gap-3">
                                <Skeleton className="w-6 h-6 rounded-full" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-4 w-1/2" />
                                  <Skeleton className="h-12 w-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : comments.length > 0 ? (
                          <div className="space-y-2">
                            {comments.map((comment: any) => (
                              <CommentItem key={comment.id} comment={comment} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum comentário ainda
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="activities" className="mt-0">
                        {loadingActivities ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                          </div>
                        ) : activities.length > 0 ? (
                          <div className="space-y-2">
                            {activities.map((activity: any) => (
                              <ActivityItem key={activity.id} activity={activity} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma atividade registrada
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </ScrollArea>

                {/* Comment Input */}
                <div className="p-4 border-t flex-shrink-0">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">VO</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Adicionar comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[60px] resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Smile className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <AtSign className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button 
                          size="sm" 
                          disabled={!newComment.trim() || createComment.isPending}
                          onClick={handleAddComment}
                        >
                          {createComment.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Tarefa não encontrada</p>
          </div>
        )}
      </div>

      {/* Modal para criar template */}
      {task && (
        <CreateTemplateModal
          open={showCreateTemplateModal}
          onOpenChange={setShowCreateTemplateModal}
          sourceType="task"
          sourceId={task.id}
          sourceName={task.title}
          onSuccess={() => setShowCreateTemplateModal(false)}
        />
      )}
    </div>
  );
}

export default TaskDetailModal;
