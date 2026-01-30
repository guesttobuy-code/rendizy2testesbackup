/**
 * TaskFormSheet - Modal Lateral de Criação/Edição de Tarefas
 * 
 * Design unificado em formato Sheet (lateral) para melhor aproveitamento de espaço.
 * Todas as funcionalidades:
 * - Nome da tarefa
 * - Lista/Projeto
 * - Status e Prioridade
 * - Responsável (com avatar)
 * - Datas de início e prazo
 * - Estimativa de tempo
 * - Tarefa recorrente
 * - Tags como badges clicáveis
 * - Descrição com IA
 * - Subtarefas inline
 * - Anexos (drag-drop)
 * - Campos personalizados
 * 
 * @version 3.0.0
 * @date 2026-01-30
 */

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar,
  Users,
  Paperclip,
  Plus,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Eye,
  Trash2,
  Loader2,
  X,
  FolderOpen,
  Hash,
  Type,
  DollarSign,
  Phone,
  Mail,
  Link2,
  MapPin,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useTeams,
  useProjects,
  useCreateTask,
  useUpdateTask,
  useTeamMembers,
} from '@/hooks/useCRMTasks';
import { CRMTask, TaskStatus, TaskPriority } from '@/utils/services/crmTasksService';

// ============================================================================
// TYPES
// ============================================================================

interface TaskFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  task?: CRMTask | null;
  defaultProjectId?: string;
  defaultTeamId?: string;
  onSuccess?: () => void;
}

interface InlineSubtask {
  id: string;
  title: string;
  completed: boolean;
}

interface CustomFieldValue {
  id: string;
  type: string;
  label: string;
  value: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUSES = [
  { id: 'pending', label: 'Não Iniciado', icon: '⚪', color: 'text-gray-500' },
  { id: 'in_progress', label: 'Em Andamento', icon: '🔵', color: 'text-blue-500' },
  { id: 'completed', label: 'Concluído', icon: '🟢', color: 'text-green-500' },
  { id: 'cancelled', label: 'Cancelado', icon: '🔴', color: 'text-red-500' },
] as const;

const PRIORITIES = [
  { id: 'urgent', label: 'Urgente', icon: '🚩', color: 'text-red-500' },
  { id: 'high', label: 'Alta', icon: '🔴', color: 'text-orange-500' },
  { id: 'medium', label: 'Normal', icon: '🔵', color: 'text-blue-500' },
  { id: 'low', label: 'Baixa', icon: '⚪', color: 'text-gray-400' },
] as const;

const DEFAULT_TAGS = [
  { id: '1', name: 'Urgente', color: 'bg-red-500' },
  { id: '2', name: 'Cliente VIP', color: 'bg-yellow-500' },
  { id: '3', name: 'Gramado', color: 'bg-blue-500' },
  { id: '4', name: 'Guarapari', color: 'bg-green-500' },
  { id: '5', name: 'Pendência', color: 'bg-orange-500' },
];

const CUSTOM_FIELD_TYPES = [
  { id: 'text', label: 'Texto', icon: <Type className="h-4 w-4" /> },
  { id: 'number', label: 'Número', icon: <Hash className="h-4 w-4" /> },
  { id: 'currency', label: 'Moeda', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'date', label: 'Data', icon: <Calendar className="h-4 w-4" /> },
  { id: 'phone', label: 'Telefone', icon: <Phone className="h-4 w-4" /> },
  { id: 'email', label: 'E-mail', icon: <Mail className="h-4 w-4" /> },
  { id: 'url', label: 'URL', icon: <Link2 className="h-4 w-4" /> },
  { id: 'location', label: 'Localização', icon: <MapPin className="h-4 w-4" /> },
];

// ============================================================================
// SUBTASK INLINE COMPONENT
// ============================================================================

const SubtaskInline: React.FC<{
  subtasks: InlineSubtask[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ subtasks, onAdd, onToggle, onDelete }) => {
  const [newSubtask, setNewSubtask] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (newSubtask.trim()) {
      onAdd(newSubtask.trim());
      setNewSubtask('');
    }
  };

  return (
    <div className="space-y-2">
      {subtasks.map((subtask) => (
        <div
          key={subtask.id}
          className="group flex items-center gap-2 py-1 px-2 rounded hover:bg-muted"
        >
          <Checkbox
            checked={subtask.completed}
            onCheckedChange={() => onToggle(subtask.id)}
          />
          <span className={cn(
            'flex-1 text-sm',
            subtask.completed && 'line-through text-muted-foreground'
          )}>
            {subtask.title}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => onDelete(subtask.id)}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ))}

      {showInput ? (
        <div className="flex items-center gap-2">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Nome da subtarefa"
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowInput(false);
            }}
          />
          <Button size="sm" className="h-8" onClick={handleAdd}>
            Adicionar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => setShowInput(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1"
        >
          <Plus className="h-4 w-4" />
          Adicionar subtarefa
        </button>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TaskFormSheet({
  open,
  onOpenChange,
  mode = 'create',
  task,
  defaultProjectId,
  defaultTeamId,
  onSuccess,
}: TaskFormSheetProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [teamId, setTeamId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<InlineSubtask[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldValue[]>([]);
  
  // Toggles
  const [hasTimeEstimate, setHasTimeEstimate] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState('weekly');
  const [showAIHelper, setShowAIHelper] = useState(false);

  // Data Hooks
  const { data: teams = [] } = useTeams();
  const { data: projects = [] } = useProjects();
  const { data: teamMembers = [] } = useTeamMembers(teamId);
  
  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const isLoading = createTask.isPending || updateTask.isPending;

  // Initialize form when editing
  useEffect(() => {
    if (mode === 'edit' && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'pending');
      setPriority(task.priority || 'medium');
      setTeamId(task.team_id || '');
      setProjectId(task.project_id || '');
      setAssigneeId(task.assignee_id || '');
      setStartDate(task.start_date ? new Date(task.start_date) : undefined);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setSelectedTags(task.tags || []);
      if (task.estimated_minutes) {
        setHasTimeEstimate(true);
        setTimeEstimate(`${task.estimated_minutes}min`);
      }
      // Load metadata
      if (task.metadata?.subtasks) {
        setSubtasks(task.metadata.subtasks);
      }
      if (task.metadata?.customFields) {
        setCustomFields(task.metadata.customFields);
      }
      if (task.metadata?.isRecurring) {
        setIsRecurring(true);
        setRecurringInterval(task.metadata.recurringInterval || 'weekly');
      }
    } else {
      // Reset form for create mode
      setTitle('');
      setDescription('');
      setStatus('pending');
      setPriority('medium');
      setTeamId(defaultTeamId || '');
      setProjectId(defaultProjectId || '');
      setAssigneeId('');
      setStartDate(undefined);
      setDueDate(undefined);
      setSelectedTags([]);
      setSubtasks([]);
      setCustomFields([]);
      setHasTimeEstimate(false);
      setTimeEstimate('');
      setIsRecurring(false);
    }
  }, [mode, task, defaultProjectId, defaultTeamId, open]);

  // Handlers
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleAddSubtask = (title: string) => {
    const newSubtask: InlineSubtask = {
      id: `subtask-${Date.now()}`,
      title,
      completed: false,
    };
    setSubtasks([...subtasks, newSubtask]);
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(s =>
      s.id === id ? { ...s, completed: !s.completed } : s
    ));
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleAddCustomField = (type: string) => {
    const fieldType = CUSTOM_FIELD_TYPES.find(f => f.id === type);
    const newField: CustomFieldValue = {
      id: `field-${Date.now()}`,
      type,
      label: fieldType?.label || 'Campo',
      value: '',
    };
    setCustomFields([...customFields, newField]);
  };

  const handleUpdateCustomField = (id: string, value: string) => {
    setCustomFields(customFields.map(f =>
      f.id === id ? { ...f, value } : f
    ));
  };

  const handleDeleteCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const parseTimeEstimate = (str: string): number | undefined => {
    const match = str.match(/(\d+)\s*(h|min|m)?/i);
    if (!match) return undefined;
    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase();
    if (unit === 'h') return value * 60;
    return value;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Selecionar';
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Digite o nome da tarefa');
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      team_id: teamId || undefined,
      project_id: projectId || undefined,
      assignee_id: assigneeId || undefined,
      start_date: startDate?.toISOString().split('T')[0],
      due_date: dueDate?.toISOString().split('T')[0],
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      estimated_minutes: hasTimeEstimate ? parseTimeEstimate(timeEstimate) : undefined,
      metadata: {
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
        isRecurring: isRecurring || undefined,
        recurringInterval: isRecurring ? recurringInterval : undefined,
      },
    };

    try {
      if (mode === 'edit' && task) {
        await updateTask.mutateAsync({ id: task.id, updates: taskData });
        toast.success('Tarefa atualizada com sucesso');
      } else {
        await createTask.mutateAsync(taskData as any);
        toast.success('Tarefa criada com sucesso');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {mode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(showAIHelper && 'bg-purple-100 text-purple-600')}
                    onClick={() => setShowAIHelper(!showAIHelper)}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Assistente IA</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </DropdownMenuItem>
                  {mode === 'edit' && (
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* AI Helper Banner */}
          {showAIHelper && (
            <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">Assistente IA ativo</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use "Escrever com IA" na descrição ou peça sugestões
              </p>
            </div>
          )}
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Task Name */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da tarefa"
              className="text-base font-medium border-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Lista/Projeto */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-24">Lista</span>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar lista" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status & Priority */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-24">Status</span>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className={s.color}>{s.icon} {s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">Prioridade</span>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className={p.color}>{p.icon} {p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-24">Equipe</span>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar equipe" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-24">Responsável</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  {assigneeId ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {teamMembers.find(m => m.user_id === assigneeId)?.user_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {teamMembers.find(m => m.user_id === assigneeId)?.user_name || 'Selecionar'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Selecionar responsável</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar pessoa..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                    <CommandGroup>
                      {teamMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          onSelect={() => setAssigneeId(member.user_id || '')}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback>{member.user_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{member.user_name || member.external_name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                            {assigneeId === member.user_id && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Início</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Prazo</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start',
                      dueDate && dueDate < new Date() && 'border-red-500 text-red-500'
                    )}
                    size="sm"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(dueDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time Estimate & Recurring */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Estimativa</span>
              <Switch checked={hasTimeEstimate} onCheckedChange={setHasTimeEstimate} />
              {hasTimeEstimate && (
                <Input
                  value={timeEstimate}
                  onChange={(e) => setTimeEstimate(e.target.value)}
                  placeholder="ex: 2h"
                  className="w-20 h-8"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Recorrente</span>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              {isRecurring && (
                <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-4">
            <span className="text-sm text-muted-foreground w-24 pt-1">Tags</span>
            <div className="flex-1 flex flex-wrap gap-2">
              {DEFAULT_TAGS.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedTags.includes(tag.name) && tag.color
                  )}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Nova tag
              </Button>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Descrição</Label>
            <div className="relative">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição detalhada..."
                className="min-h-[100px] pr-28"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Escrever com IA
              </Button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Subtarefas</Label>
            <SubtaskInline
              subtasks={subtasks}
              onAdd={handleAddSubtask}
              onToggle={handleToggleSubtask}
              onDelete={handleDeleteSubtask}
            />
          </div>

          {/* Attachments */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Anexos</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer">
              <Paperclip className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste arquivos aqui ou clique para upload
              </p>
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-muted-foreground">Campos Personalizados</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar campo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {CUSTOM_FIELD_TYPES.map((field) => (
                    <DropdownMenuItem
                      key={field.id}
                      onClick={() => handleAddCustomField(field.id)}
                    >
                      {field.icon}
                      <span className="ml-2">{field.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {customFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum campo personalizado adicionado.
              </p>
            ) : (
              <div className="space-y-2">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder={field.label}
                      value={field.value}
                      onChange={(e) => handleUpdateCustomField(field.id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCustomField(field.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualizar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Comentários</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Criar Tarefa' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TaskFormSheet;
