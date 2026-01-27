import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';
import { crmTasksApi, CrmTask, CrmTaskCreate, TaskType, TaskPriority, TaskStatus } from '../../src/utils/api-crm-tasks';
import { crmContactsApi, CrmContact } from '../../src/utils/api-crm-contacts';
import { crmTaskSettings } from '../../src/utils/crm-task-settings';
import { toast } from 'sonner';

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: CrmTask | null;
  onSuccess?: (task: CrmTask) => void;
  // Pre-fill options when creating from context
  contactId?: string;
  propertyId?: string;
  reservationId?: string;
  salesDealId?: string;
  serviceTicketId?: string;
}

export function TaskFormModal({
  open,
  onOpenChange,
  task,
  onSuccess,
  contactId,
  propertyId,
  reservationId,
  salesDealId,
  serviceTicketId,
}: TaskFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string }>>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueTime, setDueTime] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  const isEditing = !!task;

  // Load contacts for the select
  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open]);

  // Initialize form when task changes (editing mode)
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setTaskType(task.task_type);
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setDueTime(task.due_time || '');
      setSelectedContactId(task.contact_id || '');
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setTaskType('task');
      setPriority('medium');
      setStatus('pending');
      setDueDate(undefined);
      setDueTime('');
      setSelectedContactId(contactId || '');
    }
  }, [task, contactId, open]);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await crmContactsApi.list({ limit: 100 });
      if (response.success && response.data) {
        // response.data pode ser array ou objeto com contacts
        const contactsList = Array.isArray(response.data) ? response.data : (response.data as any).contacts || [];
        setContacts(contactsList.map((c: CrmContact) => ({ 
          id: c.id, 
          name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Sem nome'
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const taskData: CrmTaskCreate = {
        title: title.trim(),
        description: description.trim() || undefined,
        task_type: taskType,
        priority,
        status,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        due_time: dueTime || undefined,
        contact_id: selectedContactId || undefined,
        property_id: propertyId || undefined,
        reservation_id: reservationId || undefined,
        sales_deal_id: salesDealId || undefined,
        service_ticket_id: serviceTicketId || undefined,
      };

      let response;
      if (isEditing && task) {
        response = await crmTasksApi.update(task.id, taskData);
      } else {
        response = await crmTasksApi.create(taskData);
      }

      if (response.success && response.data) {
        toast.success(isEditing ? 'Tarefa atualizada!' : 'Tarefa criada!');
        // response.data é { data: CrmTask }, então precisamos acessar o .data
        const taskResult = (response.data as { data: CrmTask }).data || response.data as any;
        onSuccess?.(taskResult);
        onOpenChange(false);
      } else {
        toast.error(response.error || 'Erro ao salvar tarefa');
      }
    } catch (error: any) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error(error?.message || 'Erro ao salvar tarefa');
    } finally {
      setLoading(false);
    }
  };

  // Carregar tipos e prioridades das configurações
  const typeOptions = crmTaskSettings.getTaskTypeOptions();
  const priorityOptions = crmTaskSettings.getPriorityOptions().map(p => ({
    value: p.value,
    label: `${getPriorityEmoji(p.value)} ${p.label}`,
    color: p.color,
  }));

  // Helper para emoji de prioridade
  function getPriorityEmoji(priority: string): string {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Progresso' },
    { value: 'completed', label: 'Concluída' },
    { value: 'cancelled', label: 'Cancelada' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
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
              placeholder="Ex: Ligar para cliente sobre check-in"
              disabled={loading}
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

          {/* Tipo e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskType)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)} disabled={loading}>
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
          </div>

          {/* Status (apenas ao editar) */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)} disabled={loading}>
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

          {/* Data e Hora */}
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
              <Label htmlFor="dueTime">Horário</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Contato vinculado */}
          <div className="space-y-2">
            <Label>Contato Vinculado</Label>
            <Select 
              value={selectedContactId || 'none'} 
              onValueChange={(v) => setSelectedContactId(v === 'none' ? '' : v)} 
              disabled={loading || loadingContacts}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar contato (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum contato</SelectItem>
                {contacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
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
