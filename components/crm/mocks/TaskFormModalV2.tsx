/**
 * Task Form Modal V2 - Modal de Criação/Edição de Tarefa
 * 
 * Formulário completo com:
 * - Campos avançados (título, descrição, status, prioridade)
 * - Atribuição de responsável
 * - Data de início/fim
 * - Tags personalizadas
 * - Campos customizados
 * - Subtarefas inline
 * - Relacionamentos
 */

import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Users,
  Flag,
  Tag,
  Link2,
  Paperclip,
  Plus,
  ChevronDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Sparkles,
  MessageSquare,
  Eye,
  Copy,
  Trash2,
  ArrowUpRight,
  GripVertical,
  Repeat,
  Timer,
  Building2,
  Home,
  Folder,
  MoreHorizontal,
  Hash,
  Type,
  ListTodo,
  ToggleLeft,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  FileText,
  Image,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_USERS = [
  { id: '1', name: 'Rafael Marques', initials: 'RM', role: 'Gerente' },
  { id: '2', name: 'Arthur Silva', initials: 'AS', role: 'Atendimento' },
  { id: '3', name: 'Maria Teresa', initials: 'MT', role: 'Implantação' },
  { id: '4', name: 'Rocha', initials: 'RO', role: 'Anúncios' },
  { id: '5', name: 'João Fotos', initials: 'JF', role: 'Fotografia' },
];

const MOCK_TAGS = [
  { id: '1', name: 'Urgente', color: 'bg-red-500' },
  { id: '2', name: 'Cliente VIP', color: 'bg-yellow-500' },
  { id: '3', name: 'Gramado', color: 'bg-blue-500' },
  { id: '4', name: 'Guarapari', color: 'bg-green-500' },
  { id: '5', name: 'Pendência', color: 'bg-orange-500' },
];

const MOCK_LISTS = [
  { id: '1', name: 'Imóveis - Proprietários', icon: <Home className="h-4 w-4" /> },
  { id: '2', name: 'Tarefas Vendas', icon: <ListTodo className="h-4 w-4" /> },
  { id: '3', name: 'Projetos & Serviços', icon: <Folder className="h-4 w-4" /> },
  { id: '4', name: 'Manutenções', icon: <Building2 className="h-4 w-4" /> },
];

const STATUSES = [
  { id: 'nao-iniciado', label: 'Não Iniciado', icon: '⚪', color: 'text-gray-500' },
  { id: 'fotos', label: 'Fotos/Vistoria', icon: '🟣', color: 'text-purple-500' },
  { id: 'em-andamento', label: 'Em Andamento', icon: '🔵', color: 'text-blue-500' },
  { id: 'aguardando', label: 'Aguardando', icon: '🟡', color: 'text-yellow-500' },
  { id: 'concluido', label: 'Concluído', icon: '🟢', color: 'text-green-500' },
  { id: 'cancelado', label: 'Cancelado', icon: '🔴', color: 'text-red-500' },
];

const PRIORITIES = [
  { id: 'urgent', label: 'Urgente', icon: '🚩', color: 'text-red-500' },
  { id: 'high', label: 'Alta', icon: '🔴', color: 'text-orange-500' },
  { id: 'normal', label: 'Normal', icon: '🔵', color: 'text-blue-500' },
  { id: 'low', label: 'Baixa', icon: '⚪', color: 'text-gray-400' },
];

const CUSTOM_FIELD_TYPES = [
  { id: 'text', label: 'Texto', icon: <Type className="h-4 w-4" /> },
  { id: 'number', label: 'Número', icon: <Hash className="h-4 w-4" /> },
  { id: 'currency', label: 'Moeda', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'date', label: 'Data', icon: <Calendar className="h-4 w-4" /> },
  { id: 'dropdown', label: 'Dropdown', icon: <ChevronDown className="h-4 w-4" /> },
  { id: 'checkbox', label: 'Checkbox', icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: 'phone', label: 'Telefone', icon: <Phone className="h-4 w-4" /> },
  { id: 'email', label: 'E-mail', icon: <Mail className="h-4 w-4" /> },
  { id: 'url', label: 'URL', icon: <Link2 className="h-4 w-4" /> },
  { id: 'location', label: 'Localização', icon: <MapPin className="h-4 w-4" /> },
];

// ============================================================================
// SUBTASK INLINE COMPONENT
// ============================================================================

interface InlineSubtask {
  id: string;
  title: string;
  completed: boolean;
}

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

interface TaskFormModalV2Props {
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'create' | 'edit';
  initialData?: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignees?: string[];
    startDate?: Date;
    dueDate?: Date;
    tags?: string[];
    list?: string;
  };
}

export const TaskFormModalV2: React.FC<TaskFormModalV2Props> = ({
  isOpen = true,
  onClose,
  mode = 'create',
  initialData = {},
}) => {
  // Form state
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [status, setStatus] = useState(initialData.status || 'nao-iniciado');
  const [priority, setPriority] = useState(initialData.priority || 'normal');
  const [assignees, setAssignees] = useState<string[]>(initialData.assignees || []);
  const [startDate, setStartDate] = useState<Date | undefined>(initialData.startDate);
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData.dueDate);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData.tags || []);
  const [selectedList, setSelectedList] = useState(initialData.list || '');
  const [subtasks, setSubtasks] = useState<InlineSubtask[]>([]);
  const [showAIHelper, setShowAIHelper] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [hasTimeEstimate, setHasTimeEstimate] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState('');

  // Custom fields state
  const [customFields, setCustomFields] = useState<
    { id: string; type: string; label: string; value: string }[]
  >([]);

  const handleAddSubtask = (taskTitle: string) => {
    setSubtasks([
      ...subtasks,
      { id: `st-${Date.now()}`, title: taskTitle, completed: false },
    ]);
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(
      subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const toggleAssignee = (userId: string) => {
    if (assignees.includes(userId)) {
      setAssignees(assignees.filter((id) => id !== userId));
    } else {
      setAssignees([...assignees, userId]);
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Selecionar';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const selectedStatus = STATUSES.find((s) => s.id === status);
  const selectedPriority = PRIORITIES.find((p) => p.id === priority);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {mode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAIHelper(!showAIHelper)}
                >
                  <Sparkles className={cn('h-4 w-4', showAIHelper && 'text-purple-500')} />
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
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar tarefa
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="h-4 w-4 mr-2" />
                  Salvar como template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* AI Helper Banner */}
        {showAIHelper && (
          <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border-b">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <Input
                placeholder="Descreva a tarefa e deixe a IA preencher os campos..."
                className="flex-1 bg-background"
              />
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                Gerar
              </Button>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-180px)]">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da tarefa"
              className="text-lg font-medium border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* List Selection */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-24">Lista</span>
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecionar lista" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_LISTS.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <div className="flex items-center gap-2">
                      {list.icon}
                      <span>{list.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-24">Status</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{selectedStatus?.icon}</span>
                      <span>{selectedStatus?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-24">Prioridade</span>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{selectedPriority?.icon}</span>
                      <span>{selectedPriority?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignees */}
          <div className="flex items-start gap-4">
            <span className="text-sm text-muted-foreground w-24 pt-2">Responsável</span>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {assignees.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {assignees.slice(0, 3).map((userId) => {
                            const user = MOCK_USERS.find((u) => u.id === userId);
                            return (
                              <Avatar key={userId} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-[10px]">
                                  {user?.initials}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                        </div>
                        {assignees.length > 3 && (
                          <span className="text-sm text-muted-foreground">
                            +{assignees.length - 3}
                          </span>
                        )}
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
                        {MOCK_USERS.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => toggleAssignee(user.id)}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback>{user.initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                              </div>
                              {assignees.includes(user.id) && (
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
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-24">Início</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-24">Prazo</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start',
                      dueDate && dueDate < new Date() && 'border-red-500 text-red-500'
                    )}
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
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time Estimate & Recurring */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-24">Estimativa</span>
              <div className="flex items-center gap-2 flex-1">
                <Switch checked={hasTimeEstimate} onCheckedChange={setHasTimeEstimate} />
                {hasTimeEstimate && (
                  <Input
                    value={timeEstimate}
                    onChange={(e) => setTimeEstimate(e.target.value)}
                    placeholder="ex: 2h, 30min"
                    className="flex-1"
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-24">Recorrente</span>
              <div className="flex items-center gap-2">
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                {isRecurring && (
                  <Select defaultValue="weekly">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-4">
            <span className="text-sm text-muted-foreground w-24 pt-2">Tags</span>
            <div className="flex-1 flex flex-wrap gap-2">
              {MOCK_TAGS.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedTags.includes(tag.id) && tag.color
                  )}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" className="h-6">
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
                className="min-h-[100px]"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 text-purple-500"
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
                    <DropdownMenuItem key={field.id}>
                      {field.icon}
                      <span className="ml-2">{field.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {customFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum campo personalizado adicionado.
              </p>
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
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!title.trim()}>
              {mode === 'create' ? 'Criar Tarefa' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskFormModalV2;
