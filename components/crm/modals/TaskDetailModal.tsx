/**
 * Modal de Detalhes da Tarefa
 * Exibe detalhes completos, comentários e atividades
 * 
 * @version 2.0.0
 * @date 2026-01-28
 */
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  FolderOpen, 
  Tag,
  MessageSquare,
  Activity,
  CheckCircle2,
  Edit,
  Trash2,
  Loader2,
  Send,
  MoreHorizontal
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  useTask, 
  useTaskComments, 
  useTaskActivities,
  useCreateTaskComment,
  useUpdateTask,
  useDeleteTask
} from '@/hooks/useCRMTasks';
import { CRMTask, TaskStatus, TaskPriority } from '@/utils/services/crmTasksService';
import { TaskFormSheet } from './TaskFormSheet';

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const { data: task, isLoading: loadingTask } = useTask(taskId || '');
  const { data: comments = [], isLoading: loadingComments } = useTaskComments(taskId || '');
  const { data: activities = [], isLoading: loadingActivities } = useTaskActivities(taskId || '');
  
  const createComment = useCreateTaskComment();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  if (!taskId || !open) return null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id, updates: { status: newStatus } });
      toast.success(`Status alterado para ${getStatusLabel(newStatus)}`);
      onTaskUpdated?.();
    } catch (error) {
      toast.error('Erro ao alterar status');
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

  const getPriorityBadge = (priority: TaskPriority) => {
    const config = {
      low: { label: 'Baixa', variant: 'outline' as const, className: 'text-green-600 border-green-200' },
      medium: { label: 'Média', variant: 'outline' as const, className: 'text-yellow-600 border-yellow-200' },
      high: { label: 'Alta', variant: 'outline' as const, className: 'text-orange-600 border-orange-200' },
      urgent: { label: 'Urgente', variant: 'destructive' as const, className: '' },
    };
    const p = config[priority];
    return <Badge variant={p.variant} className={p.className}>{p.label}</Badge>;
  };

  const getStatusLabel = (status: TaskStatus) => {
    const labels: Record<TaskStatus, string> = {
      pending: 'Pendente',
      in_progress: 'Em Progresso',
      completed: 'Concluída',
      cancelled: 'Cancelada',
      skipped: 'Pulada',
    };
    return labels[status] || status;
  };

  const getStatusBadge = (status: TaskStatus) => {
    const config = {
      pending: { label: '⏳ Pendente', className: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: '🔄 Em Progresso', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '✅ Concluída', className: 'bg-green-100 text-green-800' },
      cancelled: { label: '❌ Cancelada', className: 'bg-gray-100 text-gray-800' },
      skipped: { label: '⏭️ Pulada', className: 'bg-gray-100 text-gray-600' },
    };
    const s = config[status];
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
          {loadingTask ? (
            <div className="space-y-4 pt-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : task ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <SheetTitle className="text-xl font-semibold pr-8">
                    {task.title}
                  </SheetTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditModalOpen(true)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                </div>
              </SheetHeader>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 py-4">
                {task.status !== 'completed' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange('completed')}
                    disabled={updateTask.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Marcar Concluída
                  </Button>
                )}
                {task.status === 'pending' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={updateTask.isPending}
                  >
                    Iniciar
                  </Button>
                )}
              </div>

              <Separator />

              {/* Details */}
              <div className="py-4 space-y-3">
                {task.description && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {task.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  
                  {task.estimated_minutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{task.estimated_minutes} min estimados</span>
                    </div>
                  )}
                  
                  {task.team_name && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{task.team_name}</span>
                    </div>
                  )}
                  
                  {task.project_name && (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span>{task.project_name}</span>
                    </div>
                  )}
                </div>

                {task.tags && task.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    {task.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Comments & Activities Tabs */}
              <Tabs defaultValue="comments" className="py-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comments" className="flex gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentários ({comments.length})
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="flex gap-2">
                    <Activity className="w-4 h-4" />
                    Atividades
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="space-y-4">
                  {/* Add Comment */}
                  <div className="flex gap-2 mt-4">
                    <Textarea
                      placeholder="Adicionar comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || createComment.isPending}
                    className="w-full"
                  >
                    {createComment.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Enviar Comentário
                  </Button>

                  {/* Comments List */}
                  {loadingComments ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-12 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {comment.user_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {comment.user_name || 'Usuário'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum comentário ainda
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="activities" className="mt-4">
                  {loadingActivities ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map(activity => (
                        <div key={activity.id} className="flex gap-3 text-sm">
                          <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                          <div className="flex-1">
                            <p>
                              <span className="font-medium">{activity.user_name || 'Sistema'}</span>
                              {' '}
                              {getActivityDescription(activity.activity_type, activity.old_value, activity.new_value)}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma atividade registrada
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Tarefa não encontrada</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Modal - Usando Sheet lateral unificado */}
      {task && (
        <TaskFormSheet
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          mode="edit"
          task={task}
          onSuccess={() => {
            onTaskUpdated?.();
          }}
        />
      )}
    </>
  );
}

function getActivityDescription(type: string, oldValue?: any, newValue?: any): string {
  const descriptions: Record<string, string> = {
    created: 'criou a tarefa',
    updated: 'atualizou a tarefa',
    status_changed: `alterou status de ${oldValue?.status || '?'} para ${newValue?.status || '?'}`,
    assigned: `atribuiu a tarefa para ${newValue?.assignee || '?'}`,
    completed: 'marcou como concluída',
    commented: 'adicionou um comentário',
    priority_changed: `alterou prioridade para ${newValue?.priority || '?'}`,
    due_date_changed: 'alterou a data de vencimento',
  };
  return descriptions[type] || type;
}

export default TaskDetailModal;
