/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           TAB GESTÃO DE ATIVIDADES E TAREFAS - CRM SETTINGS               ║
 * ║                                                                           ║
 * ║  Configurações de tipos de tarefas, prioridades, templates e workflows   ║
 * ║  de gestão de atividades do CRM.                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

import { useState } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  CheckSquare,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Flag,
  Settings2,
  Tag,
  Layers,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface TaskType {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultPriority: string;
  estimatedDuration?: number;
  requiresApproval: boolean;
  autoAssign: boolean;
  assigneeRole?: string;
}

interface PriorityLevel {
  id: string;
  name: string;
  color: string;
  order: number;
  slaHours?: number;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  taskType: string;
  checklist: string[];
  tags: string[];
}

// ============================================================================
// DADOS INICIAIS (MOCK)
// ============================================================================

const DEFAULT_TASK_TYPES: TaskType[] = [
  {
    id: 'limpeza',
    name: 'Limpeza',
    icon: '🧹',
    color: '#22c55e',
    defaultPriority: 'media',
    estimatedDuration: 120,
    requiresApproval: false,
    autoAssign: true,
    assigneeRole: 'housekeeping',
  },
  {
    id: 'manutencao',
    name: 'Manutenção',
    icon: '🔧',
    color: '#f59e0b',
    defaultPriority: 'alta',
    estimatedDuration: 60,
    requiresApproval: true,
    autoAssign: false,
  },
  {
    id: 'checkin',
    name: 'Check-in',
    icon: '🚪',
    color: '#3b82f6',
    defaultPriority: 'alta',
    estimatedDuration: 30,
    requiresApproval: false,
    autoAssign: true,
    assigneeRole: 'reception',
  },
  {
    id: 'checkout',
    name: 'Check-out',
    icon: '👋',
    color: '#8b5cf6',
    defaultPriority: 'media',
    estimatedDuration: 15,
    requiresApproval: false,
    autoAssign: true,
    assigneeRole: 'reception',
  },
  {
    id: 'vistoria',
    name: 'Vistoria',
    icon: '📋',
    color: '#ec4899',
    defaultPriority: 'media',
    estimatedDuration: 45,
    requiresApproval: true,
    autoAssign: false,
  },
  {
    id: 'compras',
    name: 'Compras/Reposição',
    icon: '🛒',
    color: '#14b8a6',
    defaultPriority: 'baixa',
    estimatedDuration: 90,
    requiresApproval: true,
    autoAssign: false,
  },
];

const DEFAULT_PRIORITIES: PriorityLevel[] = [
  { id: 'urgente', name: 'Urgente', color: '#ef4444', order: 1, slaHours: 2 },
  { id: 'alta', name: 'Alta', color: '#f97316', order: 2, slaHours: 8 },
  { id: 'media', name: 'Média', color: '#eab308', order: 3, slaHours: 24 },
  { id: 'baixa', name: 'Baixa', color: '#22c55e', order: 4, slaHours: 72 },
];

const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    id: 'limpeza_checkout',
    name: 'Limpeza Pós Check-out',
    description: 'Checklist completo de limpeza após saída do hóspede',
    taskType: 'limpeza',
    checklist: [
      'Trocar roupas de cama',
      'Trocar toalhas',
      'Limpar banheiros',
      'Aspirar/varrer pisos',
      'Limpar cozinha',
      'Verificar geladeira',
      'Repor amenities',
      'Verificar danos',
      'Tirar fotos finais',
    ],
    tags: ['checkout', 'housekeeping'],
  },
  {
    id: 'checkin_prep',
    name: 'Preparação para Check-in',
    description: 'Verificações antes da chegada do hóspede',
    taskType: 'checkin',
    checklist: [
      'Confirmar limpeza realizada',
      'Testar ar condicionado',
      'Verificar Wi-Fi funcionando',
      'Conferir amenities',
      'Preparar kit boas-vindas',
      'Verificar chaves/código',
    ],
    tags: ['checkin', 'quality'],
  },
];

// ============================================================================
// COMPONENTES
// ============================================================================

function TaskTypeCard({
  taskType,
  onEdit,
  onDelete,
}: {
  taskType: TaskType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="cursor-move text-gray-400">
        <GripVertical className="h-5 w-5" />
      </div>

      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
        style={{ backgroundColor: `${taskType.color}20` }}
      >
        {taskType.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100">{taskType.name}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          {taskType.estimatedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {taskType.estimatedDuration}min
            </span>
          )}
          {taskType.autoAssign && (
            <Badge variant="outline" className="text-xs">
              Auto-atribuir
            </Badge>
          )}
          {taskType.requiresApproval && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              Requer aprovação
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PriorityCard({ priority }: { priority: PriorityLevel }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700">
      <div
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: priority.color }}
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-gray-100">{priority.name}</div>
      </div>
      {priority.slaHours && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          SLA: {priority.slaHours}h
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: TaskTemplate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </div>
          <Badge variant="outline">{template.taskType}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {expanded ? 'Ocultar' : 'Ver'} checklist ({template.checklist.length} itens)
        </button>

        {expanded && (
          <ul className="mt-3 space-y-1">
            {template.checklist.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckSquare className="h-3.5 w-3.5 text-gray-400" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function TasksSettingsTab() {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>(DEFAULT_TASK_TYPES);
  const [priorities] = useState<PriorityLevel[]>(DEFAULT_PRIORITIES);
  const [templates] = useState<TaskTemplate[]>(DEFAULT_TEMPLATES);

  // Configurações gerais
  const [settings, setSettings] = useState({
    enableSLA: true,
    notifyOnOverdue: true,
    autoArchiveDays: 30,
    requireTimeTracking: false,
    enableRecurringTasks: true,
    defaultView: 'kanban',
  });

  return (
    <div className="space-y-8">
      {/* Tipos de Tarefa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Tipos de Tarefa</CardTitle>
                <CardDescription>
                  Defina os tipos de tarefas que sua equipe utiliza. Cada tipo pode ter configurações específicas.
                </CardDescription>
              </div>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {taskTypes.map((type) => (
              <TaskTypeCard
                key={type.id}
                taskType={type}
                onEdit={() => {}}
                onDelete={() => setTaskTypes(taskTypes.filter((t) => t.id !== type.id))}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Níveis de Prioridade */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Níveis de Prioridade</CardTitle>
              <CardDescription>
                Configure os níveis de prioridade e seus SLAs (tempo máximo para conclusão).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {priorities.map((priority) => (
              <PriorityCard key={priority.id} priority={priority} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates de Tarefa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Templates de Tarefa</CardTitle>
                <CardDescription>
                  Templates pré-definidos com checklists para agilizar a criação de tarefas recorrentes.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configurações Gerais de Tarefas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Configurações de Comportamento</CardTitle>
              <CardDescription>
                Ajuste como as tarefas se comportam no sistema.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SLA */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Habilitar SLA</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Controlar tempo limite por prioridade
                </p>
              </div>
              <Switch
                checked={settings.enableSLA}
                onCheckedChange={(checked) => setSettings({ ...settings, enableSLA: checked })}
              />
            </div>

            {/* Notificações */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificar Atrasos</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Alertar quando tarefa ultrapassar SLA
                </p>
              </div>
              <Switch
                checked={settings.notifyOnOverdue}
                onCheckedChange={(checked) => setSettings({ ...settings, notifyOnOverdue: checked })}
              />
            </div>

            {/* Time Tracking */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Registro de Tempo</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Exigir registro de tempo gasto
                </p>
              </div>
              <Switch
                checked={settings.requireTimeTracking}
                onCheckedChange={(checked) => setSettings({ ...settings, requireTimeTracking: checked })}
              />
            </div>

            {/* Tarefas Recorrentes */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tarefas Recorrentes</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permitir agendamento de tarefas repetitivas
                </p>
              </div>
              <Switch
                checked={settings.enableRecurringTasks}
                onCheckedChange={(checked) => setSettings({ ...settings, enableRecurringTasks: checked })}
              />
            </div>
          </div>

          {/* Auto-arquivar */}
          <div className="pt-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Auto-arquivar tarefas concluídas após</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tarefas concluídas serão arquivadas automaticamente
                </p>
              </div>
              <Select
                value={String(settings.autoArchiveDays)}
                onValueChange={(v) => setSettings({ ...settings, autoArchiveDays: parseInt(v) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Visualização padrão */}
          <div className="pt-4 border-t dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Visualização Padrão</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Como as tarefas são exibidas por padrão
                </p>
              </div>
              <Select
                value={settings.defaultView}
                onValueChange={(v) => setSettings({ ...settings, defaultView: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kanban">Kanban</SelectItem>
                  <SelectItem value="list">Lista</SelectItem>
                  <SelectItem value="calendar">Calendário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dica */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Dica: Automações de Tarefas</div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Você pode criar tarefas automaticamente usando a tab "Automações". 
                Por exemplo: criar tarefa de limpeza automaticamente quando uma reserva é confirmada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrões
        </Button>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
