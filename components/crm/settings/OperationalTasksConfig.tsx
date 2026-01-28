/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║             OPERATIONAL TASKS CONFIG - UI COMPONENT                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para gerenciamento de Templates de Tarefas Operacionais
 * 
 * Features:
 * - Templates de tarefas cíclicas (diárias, semanais, mensais)
 * - Templates disparados por eventos (check-in, check-out, reserva)
 * - Configuração de SLA e responsáveis
 * - Escopo por propriedades
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Calendar,
  Zap,
  Home,
  Building,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Copy,
  Play,
  Pause,
  RefreshCw,
  CalendarClock,
  Settings2,
  Repeat,
  Target,
  MapPin,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import type {
  OperationalTaskTemplate,
  TriggerType,
  EventTriggerConfig,
  ScheduleConfig,
  DayOfWeek,
} from '@/types/crm-tasks';
import { OperationalTasksService } from '@/services/crmTasksService';

// ============================================================================
// TYPES
// ============================================================================

interface OperationalTasksConfigProps {
  organizationId: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TEMPLATES: OperationalTaskTemplate[] = [
  {
    id: '1',
    organization_id: 'org-1',
    name: 'Verificação pré Check-in',
    description: 'Verificar se o imóvel está pronto para receber o hóspede',
    trigger_type: 'event',
    event_config: {
      event_type: 'checkin',
      offset_hours: -4,
      condition: 'before',
    },
    default_assignee_type: 'team',
    default_assignee_id: 'team-1',
    sla_hours: 4,
    priority: 'high',
    property_scope_type: 'all',
    property_ids: [],
    subtasks_template: [
      'Verificar limpeza geral',
      'Checar itens de amenities',
      'Testar ar-condicionado',
      'Verificar chuveiro e torneiras',
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    organization_id: 'org-1',
    name: 'Limpeza pós Check-out',
    description: 'Realizar limpeza completa após saída do hóspede',
    trigger_type: 'event',
    event_config: {
      event_type: 'checkout',
      offset_hours: 1,
      condition: 'after',
    },
    default_assignee_type: 'team',
    default_assignee_id: 'team-2',
    sla_hours: 6,
    priority: 'high',
    property_scope_type: 'all',
    property_ids: [],
    subtasks_template: [
      'Trocar roupas de cama',
      'Trocar toalhas',
      'Limpar banheiros',
      'Aspirar/varrer todos os cômodos',
      'Limpar cozinha',
      'Verificar itens perdidos',
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    organization_id: 'org-1',
    name: 'Manutenção Preventiva Semanal',
    description: 'Verificação geral de manutenção do imóvel',
    trigger_type: 'scheduled',
    schedule_config: {
      frequency: 'weekly',
      days_of_week: ['monday'],
      time_of_day: '09:00',
    },
    default_assignee_type: 'team',
    default_assignee_id: 'team-3',
    sla_hours: 24,
    priority: 'medium',
    property_scope_type: 'selected',
    property_ids: ['prop-1', 'prop-2'],
    subtasks_template: [
      'Verificar vazamentos',
      'Testar todas as luzes',
      'Verificar fechaduras',
      'Checar extintores',
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '4',
    organization_id: 'org-1',
    name: 'Inspeção Mensal de Qualidade',
    description: 'Inspeção completa para garantir padrões de qualidade',
    trigger_type: 'scheduled',
    schedule_config: {
      frequency: 'monthly',
      day_of_month: 1,
      time_of_day: '10:00',
    },
    default_assignee_type: 'user',
    default_assignee_id: 'user-1',
    sla_hours: 48,
    priority: 'medium',
    property_scope_type: 'all',
    property_ids: [],
    subtasks_template: [
      'Fotodocumentação do estado atual',
      'Avaliação de desgaste de mobiliário',
      'Verificação de itens decorativos',
      'Relatório de melhorias sugeridas',
    ],
    is_active: false,
    created_at: '',
    updated_at: '',
  },
];

const MOCK_PROPERTIES = [
  { id: 'prop-1', name: 'Apartamento Centro', address: 'Rua das Flores, 123' },
  { id: 'prop-2', name: 'Casa de Praia', address: 'Av. Beira Mar, 500' },
  { id: 'prop-3', name: 'Studio Executivo', address: 'Alameda Santos, 1000' },
  { id: 'prop-4', name: 'Cobertura Luxo', address: 'Rua Augusta, 2000' },
];

const MOCK_TEAMS = [
  { id: 'team-1', name: 'Equipe de Recepção' },
  { id: 'team-2', name: 'Equipe de Limpeza' },
  { id: 'team-3', name: 'Equipe de Manutenção' },
];

const MOCK_USERS = [
  { id: 'user-1', name: 'João Silva', email: 'joao@example.com' },
  { id: 'user-2', name: 'Maria Santos', email: 'maria@example.com' },
  { id: 'user-3', name: 'Pedro Costa', email: 'pedro@example.com' },
];

// ============================================================================
// CONSTANTS
// ============================================================================

const TRIGGER_TYPE_INFO = {
  event: {
    label: 'Disparado por Evento',
    icon: Zap,
    description: 'Criado automaticamente quando um evento ocorre',
    color: 'text-purple-600 bg-purple-100',
  },
  scheduled: {
    label: 'Agendado (Cíclico)',
    icon: CalendarClock,
    description: 'Criado em intervalos regulares',
    color: 'text-blue-600 bg-blue-100',
  },
  manual: {
    label: 'Manual',
    icon: Play,
    description: 'Criado manualmente quando necessário',
    color: 'text-gray-600 bg-gray-100',
  },
};

const EVENT_TYPE_INFO = {
  checkin: { label: 'Check-in', icon: Home },
  checkout: { label: 'Check-out', icon: Home },
  reservation_created: { label: 'Nova Reserva', icon: Calendar },
  reservation_cancelled: { label: 'Reserva Cancelada', icon: X },
};

const FREQUENCY_INFO = {
  daily: { label: 'Diário', description: 'Todos os dias' },
  weekly: { label: 'Semanal', description: 'Uma vez por semana' },
  monthly: { label: 'Mensal', description: 'Uma vez por mês' },
};

const DAYS_OF_WEEK: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'sunday', label: 'Domingo', short: 'Dom' },
  { value: 'monday', label: 'Segunda', short: 'Seg' },
  { value: 'tuesday', label: 'Terça', short: 'Ter' },
  { value: 'wednesday', label: 'Quarta', short: 'Qua' },
  { value: 'thursday', label: 'Quinta', short: 'Qui' },
  { value: 'friday', label: 'Sexta', short: 'Sex' },
  { value: 'saturday', label: 'Sábado', short: 'Sáb' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'text-gray-600 bg-gray-100' },
  { value: 'medium', label: 'Média', color: 'text-blue-600 bg-blue-100' },
  { value: 'high', label: 'Alta', color: 'text-orange-600 bg-orange-100' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600 bg-red-100' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OperationalTasksConfig({ organizationId }: OperationalTasksConfigProps) {
  const [templates, setTemplates] = useState<OperationalTaskTemplate[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'event' | 'scheduled' | 'all'>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OperationalTaskTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [organizationId]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await OperationalTasksService.listTemplates(organizationId);
      if (data.length > 0) {
        setTemplates(data);
      }
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateTemplate() {
    setEditingTemplate(null);
    setIsModalOpen(true);
  }

  function handleEditTemplate(template: OperationalTaskTemplate) {
    setEditingTemplate(template);
    setIsModalOpen(true);
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm('Tem certeza que deseja excluir este template? Tarefas já geradas não serão afetadas.')) return;
    
    try {
      await OperationalTasksService.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  }

  async function handleToggleActive(templateId: string, isActive: boolean) {
    try {
      await OperationalTasksService.updateTemplate(templateId, { is_active: isActive });
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, is_active: isActive } : t
      ));
    } catch (err) {
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, is_active: isActive } : t
      ));
    }
  }

  async function handleDuplicateTemplate(template: OperationalTaskTemplate) {
    const newTemplate: OperationalTaskTemplate = {
      ...template,
      id: `temp-${Date.now()}`,
      name: `${template.name} (Cópia)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTemplates(prev => [...prev, newTemplate]);
  }

  async function handleSaveTemplate(templateData: Partial<OperationalTaskTemplate>) {
    try {
      if (editingTemplate) {
        const updated = await OperationalTasksService.updateTemplate(editingTemplate.id, templateData);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updated : t));
      } else {
        const created = await OperationalTasksService.createTemplate(organizationId, templateData as any);
        setTemplates(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      // Demo mode - update locally
      if (editingTemplate) {
        setTemplates(prev => prev.map(t => 
          t.id === editingTemplate.id ? { ...t, ...templateData } as OperationalTaskTemplate : t
        ));
      } else {
        const newTemplate: OperationalTaskTemplate = {
          id: `temp-${Date.now()}`,
          organization_id: organizationId,
          name: templateData.name || 'Novo Template',
          trigger_type: templateData.trigger_type || 'manual',
          is_active: true,
          priority: 'medium',
          property_scope_type: 'all',
          property_ids: [],
          subtasks_template: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...templateData,
        } as OperationalTaskTemplate;
        setTemplates(prev => [...prev, newTemplate]);
      }
      setIsModalOpen(false);
    }
  }

  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'all') return true;
    return t.trigger_type === activeTab;
  });

  const eventTemplates = templates.filter(t => t.trigger_type === 'event');
  const scheduledTemplates = templates.filter(t => t.trigger_type === 'scheduled');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tarefas Operacionais</h2>
          <p className="text-muted-foreground">
            Configure templates de tarefas automáticas para sua operação
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Evento</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventTemplates.length}</div>
            <p className="text-xs text-muted-foreground">
              {eventTemplates.filter(t => t.is_active).length} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledTemplates.length}</div>
            <p className="text-xs text-muted-foreground">
              {scheduledTemplates.filter(t => t.is_active).length} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Templates</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              {templates.filter(t => t.is_active).length} ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs & List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todos ({templates.length})</TabsTrigger>
          <TabsTrigger value="event">Por Evento ({eventTemplates.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Agendados ({scheduledTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="space-y-3">
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEditTemplate(template)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                  onToggleActive={(active) => handleToggleActive(template.id, active)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Crie templates de tarefas para automatizar sua operação diária.
              </p>
              <Button className="mt-4" onClick={handleCreateTemplate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro template
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <TemplateFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: OperationalTaskTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onDuplicate: () => void;
}

function TemplateCard({ template, onEdit, onDelete, onToggleActive, onDuplicate }: TemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const triggerInfo = TRIGGER_TYPE_INFO[template.trigger_type];
  const TriggerIcon = triggerInfo.icon;
  const priorityOption = PRIORITY_OPTIONS.find(p => p.value === template.priority);

  function getTriggerDescription() {
    if (template.trigger_type === 'event' && template.event_config) {
      const eventInfo = EVENT_TYPE_INFO[template.event_config.event_type as keyof typeof EVENT_TYPE_INFO];
      const hours = Math.abs(template.event_config.offset_hours || 0);
      const condition = template.event_config.condition === 'before' ? 'antes do' : 'após';
      return `${hours}h ${condition} ${eventInfo?.label || template.event_config.event_type}`;
    }
    if (template.trigger_type === 'scheduled' && template.schedule_config) {
      const freq = FREQUENCY_INFO[template.schedule_config.frequency];
      if (template.schedule_config.frequency === 'weekly' && template.schedule_config.days_of_week) {
        const days = template.schedule_config.days_of_week
          .map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.short)
          .join(', ');
        return `${freq.label} (${days}) às ${template.schedule_config.time_of_day}`;
      }
      if (template.schedule_config.frequency === 'monthly' && template.schedule_config.day_of_month) {
        return `${freq.label} - Dia ${template.schedule_config.day_of_month} às ${template.schedule_config.time_of_day}`;
      }
      return `${freq.label} às ${template.schedule_config.time_of_day}`;
    }
    return 'Criação manual';
  }

  function getScopeDescription() {
    if (template.property_scope_type === 'all') return 'Todos os imóveis';
    if (template.property_scope_type === 'none') return 'Nenhum imóvel (desativado)';
    return `${template.property_ids?.length || 0} imóveis selecionados`;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn(!template.is_active && 'opacity-60')}>
        <CardHeader className="py-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              triggerInfo.color
            )}>
              <TriggerIcon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base truncate">{template.name}</CardTitle>
                {!template.is_active && (
                  <Badge variant="secondary" className="text-xs">Inativo</Badge>
                )}
                {priorityOption && (
                  <Badge variant="outline" className={cn('text-xs', priorityOption.color)}>
                    {priorityOption.label}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {getTriggerDescription()}
              </CardDescription>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <Switch
                checked={template.is_active}
                onCheckedChange={onToggleActive}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Trigger */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">DISPARO</p>
                <p className="text-sm">{triggerInfo.label}</p>
              </div>

              {/* SLA */}
              {template.sla_hours && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">SLA</p>
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {template.sla_hours}h para conclusão
                  </p>
                </div>
              )}

              {/* Scope */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">ESCOPO</p>
                <p className="text-sm flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {getScopeDescription()}
                </p>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">RESPONSÁVEL</p>
                <p className="text-sm flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {template.default_assignee_type === 'team' ? 'Equipe' : 'Usuário'}
                </p>
              </div>
            </div>

            {/* Subtasks */}
            {template.subtasks_template && template.subtasks_template.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  SUBTAREFAS ({template.subtasks_template.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.subtasks_template.map((subtask, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs font-normal">
                      {subtask}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {template.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground font-medium mb-1">DESCRIÇÃO</p>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ============================================================================
// TEMPLATE FORM MODAL
// ============================================================================

interface TemplateFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: OperationalTaskTemplate | null;
  onSave: (data: Partial<OperationalTaskTemplate>) => void;
}

function TemplateFormModal({ open, onOpenChange, template, onSave }: TemplateFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('manual');
  const [priority, setPriority] = useState<string>('medium');
  const [slaHours, setSlaHours] = useState<number | undefined>(undefined);
  const [assigneeType, setAssigneeType] = useState<'user' | 'team'>('team');
  const [assigneeId, setAssigneeId] = useState<string>('');
  
  // Event config
  const [eventType, setEventType] = useState<string>('checkin');
  const [eventCondition, setEventCondition] = useState<'before' | 'after'>('before');
  const [eventOffsetHours, setEventOffsetHours] = useState<number>(0);
  
  // Schedule config
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(['monday']);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [timeOfDay, setTimeOfDay] = useState<string>('09:00');
  
  // Scope
  const [scopeType, setScopeType] = useState<'all' | 'selected' | 'none'>('all');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  
  // Subtasks
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setTriggerType(template.trigger_type);
      setPriority(template.priority || 'medium');
      setSlaHours(template.sla_hours);
      setAssigneeType(template.default_assignee_type || 'team');
      setAssigneeId(template.default_assignee_id || '');
      setScopeType(template.property_scope_type || 'all');
      setSelectedProperties(template.property_ids || []);
      setSubtasks(template.subtasks_template || []);
      
      if (template.event_config) {
        setEventType(template.event_config.event_type);
        setEventCondition(template.event_config.condition || 'before');
        setEventOffsetHours(Math.abs(template.event_config.offset_hours || 0));
      }
      
      if (template.schedule_config) {
        setFrequency(template.schedule_config.frequency);
        setDaysOfWeek(template.schedule_config.days_of_week || ['monday']);
        setDayOfMonth(template.schedule_config.day_of_month || 1);
        setTimeOfDay(template.schedule_config.time_of_day || '09:00');
      }
    } else {
      resetForm();
    }
  }, [template, open]);

  function resetForm() {
    setName('');
    setDescription('');
    setTriggerType('manual');
    setPriority('medium');
    setSlaHours(undefined);
    setAssigneeType('team');
    setAssigneeId('');
    setEventType('checkin');
    setEventCondition('before');
    setEventOffsetHours(0);
    setFrequency('daily');
    setDaysOfWeek(['monday']);
    setDayOfMonth(1);
    setTimeOfDay('09:00');
    setScopeType('all');
    setSelectedProperties([]);
    setSubtasks([]);
    setNewSubtask('');
  }

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, newSubtask.trim()]);
    setNewSubtask('');
  }

  function removeSubtask(index: number) {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  }

  function toggleDayOfWeek(day: DayOfWeek) {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }

  function toggleProperty(propertyId: string) {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  }

  function handleSubmit() {
    if (!name.trim()) return;

    const data: Partial<OperationalTaskTemplate> = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_type: triggerType,
      priority: priority as any,
      sla_hours: slaHours,
      default_assignee_type: assigneeType,
      default_assignee_id: assigneeId || undefined,
      property_scope_type: scopeType,
      property_ids: scopeType === 'selected' ? selectedProperties : [],
      subtasks_template: subtasks,
    };

    if (triggerType === 'event') {
      data.event_config = {
        event_type: eventType,
        offset_hours: eventCondition === 'before' ? -eventOffsetHours : eventOffsetHours,
        condition: eventCondition,
      };
    }

    if (triggerType === 'scheduled') {
      data.schedule_config = {
        frequency,
        days_of_week: frequency === 'weekly' ? daysOfWeek : undefined,
        day_of_month: frequency === 'monthly' ? dayOfMonth : undefined,
        time_of_day: timeOfDay,
      };
    }

    onSave(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Template' : 'Novo Template de Tarefa'}</DialogTitle>
          <DialogDescription>
            Configure como e quando as tarefas serão criadas automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Verificação pré check-in"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Descrição</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o objetivo desta tarefa..."
              rows={2}
            />
          </div>

          <Separator />

          {/* Trigger Type */}
          <div className="space-y-3">
            <Label>Tipo de Disparo *</Label>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.entries(TRIGGER_TYPE_INFO) as [TriggerType, typeof TRIGGER_TYPE_INFO[TriggerType]][]).map(([type, info]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTriggerType(type)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors text-center',
                    triggerType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  )}
                >
                  <info.icon className={cn('h-6 w-6', triggerType === type && 'text-primary')} />
                  <span className="font-medium text-sm">{info.label}</span>
                  <span className="text-xs text-muted-foreground">{info.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Event Config */}
          {triggerType === 'event' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Configuração do Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPE_INFO).map(([type, info]) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <info.icon className="h-4 w-4" />
                            {info.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="space-y-2 flex-1">
                    <Label>Horas de offset</Label>
                    <Input
                      type="number"
                      min={0}
                      max={72}
                      value={eventOffsetHours}
                      onChange={e => setEventOffsetHours(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Condição</Label>
                    <Select value={eventCondition} onValueChange={(v) => setEventCondition(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">Antes do evento</SelectItem>
                        <SelectItem value="after">Após o evento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  A tarefa será criada {eventOffsetHours}h {eventCondition === 'before' ? 'antes do' : 'após'} {EVENT_TYPE_INFO[eventType as keyof typeof EVENT_TYPE_INFO]?.label || eventType}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Schedule Config */}
          {triggerType === 'scheduled' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Configuração do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FREQUENCY_INFO).map(([freq, info]) => (
                        <SelectItem key={freq} value={freq}>
                          {info.label} - {info.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                            daysOfWeek.includes(day.value)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          {day.short}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Dia do Mês</Label>
                    <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={String(day)}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={timeOfDay}
                    onChange={e => setTimeOfDay(e.target.value)}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* SLA & Assignee */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sla-hours">SLA (horas para conclusão)</Label>
              <Input
                id="sla-hours"
                type="number"
                min={1}
                max={720}
                value={slaHours || ''}
                onChange={e => setSlaHours(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 4"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável Padrão</Label>
              <div className="flex gap-2">
                <Select value={assigneeType} onValueChange={(v) => setAssigneeType(v as any)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Equipe</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assigneeType === 'team' ? (
                      MOCK_TEAMS.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))
                    ) : (
                      MOCK_USERS.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Property Scope */}
          <div className="space-y-3">
            <Label>Escopo de Imóveis</Label>
            <div className="flex gap-2">
              {(['all', 'selected', 'none'] as const).map(scope => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setScopeType(scope)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    scopeType === scope
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {scope === 'all' && 'Todos os imóveis'}
                  {scope === 'selected' && 'Selecionados'}
                  {scope === 'none' && 'Nenhum'}
                </button>
              ))}
            </div>
            
            {scopeType === 'selected' && (
              <div className="grid gap-2 mt-2">
                {MOCK_PROPERTIES.map(property => (
                  <label
                    key={property.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      selectedProperties.includes(property.id) && 'border-primary bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selectedProperties.includes(property.id)}
                      onCheckedChange={() => toggleProperty(property.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{property.name}</p>
                      <p className="text-xs text-muted-foreground">{property.address}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Subtasks */}
          <div className="space-y-3">
            <Label>Subtarefas Padrão</Label>
            <p className="text-xs text-muted-foreground">
              Estas subtarefas serão criadas automaticamente junto com a tarefa principal
            </p>
            
            {subtasks.length > 0 && (
              <div className="space-y-2">
                {subtasks.map((subtask, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="flex-1 text-sm p-2 bg-muted rounded">{subtask}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubtask(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Adicionar subtarefa..."
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
              />
              <Button type="button" variant="secondary" onClick={addSubtask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Save className="mr-2 h-4 w-4" />
            {template ? 'Salvar Alterações' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OperationalTasksConfig;
