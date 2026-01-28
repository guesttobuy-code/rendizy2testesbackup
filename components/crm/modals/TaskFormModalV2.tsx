/**
 * Modal de Criar/Editar Tarefa CRM
 * Integrado com Supabase via React Query hooks
 * 
 * @version 2.0.0
 * @date 2026-01-28
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Users, User } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { toast } from 'sonner';
import { useCreateTask, useUpdateTask, useTeams, useProjects } from '@/hooks/useCRMTasks';
import { CRMTask, TaskPriority, TaskStatus } from '@/utils/services/crmTasksService';

interface TaskFormModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: CRMTask | null;
  onSuccess?: (task: CRMTask) => void;
  // Pre-fill options when creating from context
  projectId?: string;
  propertyId?: string;
  reservationId?: string;
  parentId?: string;
}

export function TaskFormModalV2({
  open,
  onOpenChange,
  task,
  onSuccess,
  projectId,
  propertyId,
  reservationId,
  parentId,
}: TaskFormModalV2Props) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useProjects();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [tags, setTags] = useState<string>('');

  const isEditing = !!task;
  const loading = createTask.isPending || updateTask.isPending;

  // Initialize form when task changes (editing mode)
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setSelectedTeamId(task.team_id || '');
      setSelectedProjectId(task.project_id || '');
      setEstimatedMinutes(task.estimated_minutes?.toString() || '');
      setTags(task.tags?.join(', ') || '');
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('pending');
      setDueDate(undefined);
      setSelectedTeamId('');
      setSelectedProjectId(projectId || '');
      setEstimatedMinutes('');
      setTags('');
    }
  }, [task, projectId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        due_date: dueDate ? dueDate.toISOString() : undefined,
        team_id: selectedTeamId || undefined,
        project_id: selectedProjectId || undefined,
        property_id: propertyId || undefined,
        reservation_id: reservationId || undefined,
        parent_id: parentId || undefined,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };

      let result: CRMTask;
      
      if (isEditing && task) {
        result = await updateTask.mutateAsync({ 
          id: task.id, 
          updates: taskData 
        });
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        result = await createTask.mutateAsync(taskData as any);
        toast.success('Tarefa criada com sucesso!');
      }

      onSuccess?.(result);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error(error?.message || 'Erro ao salvar tarefa');
    }
  };

  const priorityOptions = [
    { value: 'low', label: '🟢 Baixa', color: 'text-green-600' },
    { value: 'medium', label: '🟡 Média', color: 'text-yellow-600' },
    { value: 'high', label: '🟠 Alta', color: 'text-orange-600' },
    { value: 'urgent', label: '🔴 Urgente', color: 'text-red-600' },
  ];

  const statusOptions = [
    { value: 'pending', label: '⏳ Pendente' },
    { value: 'in_progress', label: '🔄 Em Progresso' },
    { value: 'completed', label: '✅ Concluída' },
    { value: 'cancelled', label: '❌ Cancelada' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Preparar imóvel para check-in"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais sobre a tarefa..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Prioridade e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={priority} 
                onValueChange={(v) => setPriority(v as TaskPriority)} 
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(v) => setStatus(v as TaskStatus)} 
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Data de Vencimento e Tempo Estimado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Tempo Estimado (min)</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                min="0"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="Ex: 30"
                disabled={loading}
              />
            </div>
          </div>

          {/* Equipe e Projeto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipe
              </Label>
              <Select 
                value={selectedTeamId || 'none'} 
                onValueChange={(v) => setSelectedTeamId(v === 'none' ? '' : v)} 
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma equipe</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select 
                value={selectedProjectId || 'none'} 
                onValueChange={(v) => setSelectedProjectId(v === 'none' ? '' : v)} 
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum projeto</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: urgente, limpeza, manutenção"
              disabled={loading}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskFormModalV2;
