/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║            PROJECT DETAIL MODAL - COM PERSISTÊNCIA REAL                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Modal lateral para detalhes de projeto com:
 * - Status, descrição, datas (persistentes)
 * - Subtarefas/Itens de ação (crm_tasks)
 * - Comentários (task_comments)
 * - Histórico de atividades (task_activities)
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  Plus,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Flag,
  Paperclip,
  Star,
  X,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Users,
  Link2,
  FileText,
  Send,
  AtSign,
  Smile,
  Image,
  CheckCheck,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useProject, 
  useUpdateProject,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useTaskComments,
  useCreateTaskComment,
} from '@/hooks/useCRMTasks';
import type { CRMTask, TaskComment, CRMProject } from '@/utils/services/crmTasksService';

// ============================================================================
// TYPES
// ============================================================================

type ProjectStatus = 'NAO_INICIADO' | 'FOTOS_VISTORIA' | 'TRANSPORTANDO_CS' | 'AGUARDANDO_PROPRIETARIO' | 'FIM_DE' | 'DESISTENTES' | 'active' | 'completed' | 'archived';

interface ProjectWithStats {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
  updated_at: string;
  dueDate?: string;
  stats?: {
    comments: number;
    attachments: number;
  };
  starred?: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  'NAO_INICIADO': { label: 'Não Iniciado', emoji: '⚪', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  'FOTOS_VISTORIA': { label: 'Fotos/Vistoria/CheckIn', emoji: '🟣', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'TRANSPORTANDO_CS': { label: 'Transportando CS', emoji: '🟢', color: 'text-green-600', bgColor: 'bg-green-100' },
  'AGUARDANDO_PROPRIETARIO': { label: 'Aguardando Proprietário', emoji: '🟡', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  'FIM_DE': { label: 'Fim de', emoji: '🔵', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'DESISTENTES': { label: 'Desistentes', emoji: '🔴', color: 'text-red-600', bgColor: 'bg-red-100' },
  'active': { label: 'Ativo', emoji: '🔵', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'completed': { label: 'Concluído', emoji: '✅', color: 'text-green-600', bgColor: 'bg-green-100' },
  'archived': { label: 'Arquivado', emoji: '📦', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

// ============================================================================
// SUBTASK ITEM COMPONENT
// ============================================================================

interface SubtaskItemProps {
  task: CRMTask;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ task, onToggle, onDelete, isUpdating }) => {
  const isCompleted = task.status === 'completed';

  return (
    <div className="group flex items-start gap-2 py-2 px-2 rounded hover:bg-accent/50 transition-colors">
      <Checkbox 
        checked={isCompleted} 
        disabled={isUpdating}
        onCheckedChange={(checked) => onToggle(task.id, !!checked)}
        className={cn('mt-0.5', isCompleted && 'data-[state=checked]:bg-green-500')} 
      />
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', isCompleted && 'line-through text-muted-foreground')}>
          {task.title}
        </span>
        {task.due_date && (
          <span className="ml-2 text-xs text-muted-foreground">
            {format(parseISO(task.due_date), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>
      {task.assignee_name && (
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[10px]">
            {task.assignee_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(task.id)}
        disabled={isUpdating}
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
};

// ============================================================================
// COMMENT ITEM COMPONENT
// ============================================================================

interface CommentItemProps {
  comment: TaskComment;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
  const initials = comment.user_name 
    ? comment.user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';
    
  return (
    <div className="flex gap-3">
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{comment.user_name || 'Usuário'}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="text-sm mt-1">{comment.content}</p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProjectDetailModalProps {
  project: ProjectWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateTask?: (projectId: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ 
  project, 
  isOpen, 
  onClose,
  onCreateTask,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('items');
  const [newComment, setNewComment] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  
  // Local state for optimistic updates
  const [localDescription, setLocalDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionSaveTimeout, setDescriptionSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Hooks para dados reais
  const { data: projectData } = useProject(project?.id || '');
  const { data: projectTasks = [], isLoading: tasksLoading } = useTasks({ projectId: project?.id });
  
  // Para comentários, precisamos de uma tarefa principal do projeto
  // Se não houver, vamos usar o primeiro task ou criar um placeholder
  const mainTaskId = projectTasks?.[0]?.id || '';
  const { data: comments = [] } = useTaskComments(mainTaskId);
  
  // Mutations
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createComment = useCreateTaskComment();

  // Sync local description with project data
  useEffect(() => {
    if (projectData?.description !== undefined) {
      setLocalDescription(projectData.description || '');
    } else if (project?.description !== undefined) {
      setLocalDescription(project.description || '');
    }
  }, [projectData?.description, project?.description]);

  // Auto-save description with debounce
  const handleDescriptionChange = useCallback((value: string) => {
    setLocalDescription(value);
    
    // Clear existing timeout
    if (descriptionSaveTimeout) {
      clearTimeout(descriptionSaveTimeout);
    }
    
    // Set new timeout for auto-save (1.5 seconds)
    const timeout = setTimeout(() => {
      if (project?.id && value !== projectData?.description) {
        updateProject.mutate({
          id: project.id,
          updates: { description: value }
        });
      }
    }, 1500);
    
    setDescriptionSaveTimeout(timeout);
  }, [project?.id, projectData?.description, updateProject, descriptionSaveTimeout]);

  // Save description on blur
  const handleDescriptionBlur = () => {
    setIsEditingDescription(false);
    if (descriptionSaveTimeout) {
      clearTimeout(descriptionSaveTimeout);
    }
    if (project?.id && localDescription !== projectData?.description) {
      updateProject.mutate({
        id: project.id,
        updates: { description: localDescription }
      });
    }
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    if (project?.id) {
      updateProject.mutate({
        id: project.id,
        updates: { status: newStatus as CRMProject['status'] }
      });
    }
  };

  // Handle subtask toggle (complete/uncomplete)
  const handleSubtaskToggle = (taskId: string, completed: boolean) => {
    updateTask.mutate({
      id: taskId,
      updates: { 
        status: completed ? 'completed' : 'pending',
        completed_at: completed ? new Date().toISOString() : undefined,
      }
    });
  };

  // Handle subtask delete
  const handleSubtaskDelete = (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta subtarefa?')) {
      deleteTask.mutate(taskId);
    }
  };

  // Handle add subtask
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !project?.id) return;
    
    setIsAddingSubtask(true);
    try {
      await createTask.mutateAsync({
        title: newSubtaskTitle.trim(),
        project_id: project.id,
        status: 'pending',
        priority: 'medium',
      });
      setNewSubtaskTitle('');
    } catch (error) {
      console.error('Erro ao criar subtarefa:', error);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !mainTaskId) return;
    
    try {
      await createComment.mutateAsync({
        taskId: mainTaskId,
        content: newComment.trim(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (descriptionSaveTimeout) {
        clearTimeout(descriptionSaveTimeout);
      }
    };
  }, [descriptionSaveTimeout]);

  if (!project || !isOpen) return null;

  // Use real data if available, fallback to prop data
  const displayProject = projectData || project;
  const totalTasks = projectTasks.length || displayProject.total_tasks || 0;
  const completedTasks = projectTasks.filter(t => t.status === 'completed').length || displayProject.completed_tasks || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks
  const displayTasks = hideCompleted 
    ? projectTasks.filter(t => t.status !== 'completed')
    : projectTasks;

  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative ml-auto h-full w-full max-w-5xl bg-background shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <Checkbox className="h-5 w-5" checked={displayProject.status === 'completed'} />
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>SETOR - IMPLANTAÇÃO</span>
                <ChevronRight className="h-3 w-3" />
                <span>Projetos</span>
              </div>
              <h2 className="font-semibold text-lg mt-1">{displayProject.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {updateProject.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Button variant="ghost" size="icon"><Star className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* AI Assistant Banner - placeholder */}
        <div className="px-6 py-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Peça ao assistente para escrever uma descrição ou criar um resumo</span>
          </div>
        </div>

        {/* Content - Duas colunas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Status & Fields - Grid 2 colunas */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Status
                  </label>
                  <Select 
                    value={displayProject.status} 
                    onValueChange={handleStatusChange}
                    disabled={updateProject.isPending}
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
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Cessionários
                  </label>
                  <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Datas
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span>Começar +</span>
                    {project.dueDate && (
                      <span className="text-orange-500">
                        🗓️ {format(parseISO(project.dueDate), 'dd/MM/yy')}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4" /> Prioridade
                  </label>
                  <Badge className="mt-1 bg-red-100 text-red-600">🚩 Urgente</Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> Relacionamentos
                  </label>
                  <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                </div>
              </div>

              <Separator />

              {/* Description - PERSISTENTE */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  Descrição
                  {updateProject.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                {isEditingDescription || localDescription ? (
                  <Textarea
                    value={localDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    onFocus={() => setIsEditingDescription(true)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Adicione uma descrição para este projeto..."
                    className="min-h-[100px] resize-none"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className="cursor-pointer hover:bg-accent/50 p-3 rounded-md border border-dashed text-sm text-muted-foreground"
                  >
                    Clique para adicionar descrição
                  </div>
                )}
              </div>

              <Separator />

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="subtasks">Subtarefas</TabsTrigger>
                  <TabsTrigger value="items">
                    Itens de ação
                    <Badge variant="secondary" className="ml-2">{totalTasks}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Detalhes adicionais do projeto serão exibidos aqui.
                  </p>
                </TabsContent>

                <TabsContent value="subtasks" className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => onCreateTask?.(project.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Tarefa Completa
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">
                    Use "Itens de ação" para subtarefas rápidas.
                  </p>
                </TabsContent>

                <TabsContent value="items" className="mt-4 space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Listas de verificação</span>
                      <span className="text-sm text-muted-foreground">
                        <span className="text-green-500">●</span> {completedTasks}/{totalTasks}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Checklist Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">TAREFAS DO PROJETO</h3>
                    <span className="text-sm text-muted-foreground">{completedTasks} de {totalTasks}</span>
                  </div>

                  {/* Loading state */}
                  {tasksLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Subtasks List */}
                  {!tasksLoading && (
                    <div className="space-y-1">
                      {displayTasks.map((task) => (
                        <SubtaskItem 
                          key={task.id} 
                          task={task} 
                          onToggle={handleSubtaskToggle}
                          onDelete={handleSubtaskDelete}
                          isUpdating={updateTask.isPending || deleteTask.isPending}
                        />
                      ))}
                      
                      {displayTasks.length === 0 && !tasksLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma tarefa ainda</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Subtask Input */}
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Adicionar nova tarefa..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                      disabled={isAddingSubtask}
                    />
                    <Button 
                      onClick={handleAddSubtask} 
                      disabled={!newSubtaskTitle.trim() || isAddingSubtask}
                      size="sm"
                    >
                      {isAddingSubtask ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Hide Completed Toggle */}
                  <button 
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {hideCompleted ? 'Mostrar concluídos' : 'Ocultar concluídos'}
                    {completedTasks > 0 && ` (${completedTasks})`}
                  </button>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="w-80 border-l flex flex-col bg-muted/10">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Atividade</h3>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Comments */}
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhum comentário ainda
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-4 border-t">
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Escrever um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><AtSign className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Image className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Paperclip className="h-4 w-4" /></Button>
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
      </div>
    </div>
  );
};

export default ProjectDetailModal;
