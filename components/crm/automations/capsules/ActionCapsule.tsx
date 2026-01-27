/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║               ACTION CAPSULE - CÁPSULA DE AÇÕES                           ║
 * ║                                                                           ║
 * ║  Componente visual para configuração das ações que serão executadas      ║
 * ║  quando a automação for disparada.                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Switch } from '../../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../ui/dialog';
import {
  Zap,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
  Settings2,
  Clock,
  Bell,
  Mail,
  MessageCircle,
  CheckSquare,
  Edit,
  Database,
  FileText,
  Globe,
  Hourglass,
  ArrowDown,
} from 'lucide-react';
import { ActionConfig, generateId } from '../types';
import { 
  ACTIONS_CATALOG, 
  CATEGORY_LABELS,
  type ActionDefinition,
  type ActionCategory,
} from '../../settings/automation-catalog';

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Bell, Mail, MessageCircle, Plus, Edit, Database, FileText, Globe, Hourglass, Zap, CheckSquare,
};

function IconRenderer({ name, className }: { name: string; className?: string }) {
  const IconComponent = ICON_MAP[name] || Zap;
  return <IconComponent className={className} />;
}

// ============================================================================
// ACTION SELECTOR MODAL
// ============================================================================

interface ActionSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (action: ActionDefinition) => void;
}

function ActionSelector({ open, onClose, onSelect }: ActionSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | null>(null);

  const categories: ActionCategory[] = ['notificacoes', 'tarefas', 'dados', 'integracao'];

  const filteredActions = ACTIONS_CATALOG.filter(a => {
    if (selectedCategory && a.category !== selectedCategory) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleSelect = (action: ActionDefinition) => {
    onSelect(action);
    onClose();
    setSearch('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Selecionar Ação
          </DialogTitle>
          <DialogDescription>
            Escolha o que fazer quando a automação for disparada
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar ações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>

        {/* Actions List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleSelect(action)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40">
                  <IconRenderer name={action.icon} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {action.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[action.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {action.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </button>
          ))}

          {filteredActions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhuma ação encontrada
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ACTION CONFIG MODAL
// ============================================================================

interface ActionConfigModalProps {
  open: boolean;
  onClose: () => void;
  action: ActionDefinition;
  currentConfig?: ActionConfig;
  onSave: (config: ActionConfig) => void;
}

function ActionConfigModal({ 
  open, 
  onClose, 
  action, 
  currentConfig,
  onSave 
}: ActionConfigModalProps) {
  const [config, setConfig] = useState<Record<string, any>>(
    currentConfig?.config || {}
  );
  const [delay, setDelay] = useState(currentConfig?.delay || {
    enabled: false,
    duration: 0,
    unit: 'minutes' as const,
  });

  const handleSave = () => {
    const actionConfig: ActionConfig = {
      id: currentConfig?.id || generateId(),
      type: action.id,
      name: action.name,
      icon: action.icon,
      category: action.category,
      config,
      delay: delay.enabled ? delay : undefined,
    };
    onSave(actionConfig);
    onClose();
  };

  const renderField = (field: typeof action.requiredFields[0]) => {
    const value = config[field.name] ?? field.defaultValue ?? '';

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(v) => setConfig({ ...config, [field.name]: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'template':
        return (
          <Textarea
            value={value}
            onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
            placeholder={`Ex: Olá {{nome}}, sua reserva está confirmada!`}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setConfig({ ...config, [field.name]: parseInt(e.target.value) })}
            placeholder={field.description}
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
            placeholder={field.description}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <IconRenderer name={action.icon} className="h-5 w-5" />
            </div>
            Configurar: {action.name}
          </DialogTitle>
          <DialogDescription>
            {action.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dica de variáveis */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 Use <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">{`{{campo}}`}</code> para 
              inserir variáveis do trigger. Ex: {`{{guestName}}, {{checkin}}`}
            </p>
          </div>

          {/* Campos obrigatórios */}
          {action.requiredFields.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-red-600 dark:text-red-400">
                Campos Obrigatórios
              </div>
              {action.requiredFields.map(field => (
                <div key={field.name} className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {field.name}
                    <span className="text-red-500">*</span>
                  </Label>
                  {renderField(field)}
                  <p className="text-xs text-gray-500">{field.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Campos opcionais */}
          {action.optionalFields.length > 0 && (
            <div className="space-y-4 pt-4 border-t dark:border-gray-700">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Campos Opcionais
              </div>
              {action.optionalFields.map(field => (
                <div key={field.name} className="space-y-1.5">
                  <Label>{field.name}</Label>
                  {renderField(field)}
                  <p className="text-xs text-gray-500">{field.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Delay */}
          <div className="pt-4 border-t dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <Label>Aguardar antes de executar</Label>
                <p className="text-xs text-gray-500">Adicionar delay antes desta ação</p>
              </div>
              <Switch
                checked={delay.enabled}
                onCheckedChange={(checked) => setDelay({ ...delay, enabled: checked })}
              />
            </div>

            {delay.enabled && (
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={delay.duration}
                  onChange={(e) => setDelay({ ...delay, duration: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
                <Select
                  value={delay.unit}
                  onValueChange={(v: any) => setDelay({ ...delay, unit: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ACTION ITEM CARD
// ============================================================================

interface ActionItemCardProps {
  action: ActionConfig;
  index: number;
  onChange: (action: ActionConfig) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  readOnly?: boolean;
}

function ActionItemCard({
  action,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  readOnly,
}: ActionItemCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const actionDef = ACTIONS_CATALOG.find(a => a.id === action.type);

  if (!actionDef) return null;

  return (
    <>
      <div className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        {!readOnly && (
          <div className="flex flex-col gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-sm font-bold">
          {index + 1}
        </div>

        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
          <IconRenderer name={action.icon} className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {action.name}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {actionDef.description}
          </p>
          
          {/* Config preview */}
          {action.config && Object.keys(action.config).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(action.config).slice(0, 3).map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {key}: {String(value).substring(0, 20)}{String(value).length > 20 ? '...' : ''}
                </Badge>
              ))}
            </div>
          )}

          {/* Delay badge */}
          {action.delay?.enabled && (
            <Badge className="mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock className="h-3 w-3 mr-1" />
              Aguardar {action.delay.duration} {action.delay.unit}
            </Badge>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {actionDef && (
        <ActionConfigModal
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          action={actionDef}
          currentConfig={action}
          onSave={onChange}
        />
      )}
    </>
  );
}

// ============================================================================
// ACTION CAPSULE (COMPONENTE PRINCIPAL)
// ============================================================================

interface ActionCapsuleProps {
  actions: ActionConfig[];
  onChange: (actions: ActionConfig[]) => void;
  readOnly?: boolean;
}

export function ActionCapsule({ actions, onChange, readOnly = false }: ActionCapsuleProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedActionDef, setSelectedActionDef] = useState<ActionDefinition | null>(null);

  const handleSelectAction = (actionDef: ActionDefinition) => {
    setSelectedActionDef(actionDef);
    setConfigOpen(true);
  };

  const handleSaveAction = (config: ActionConfig) => {
    onChange([...actions, config]);
    setSelectedActionDef(null);
  };

  const handleActionChange = (index: number, action: ActionConfig) => {
    const newActions = [...actions];
    newActions[index] = action;
    onChange(newActions);
  };

  const handleActionRemove = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newActions = [...actions];
    [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
    onChange(newActions);
  };

  const handleMoveDown = (index: number) => {
    if (index === actions.length - 1) return;
    const newActions = [...actions];
    [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
    onChange(newActions);
  };

  return (
    <>
      <Card className={`
        relative overflow-hidden transition-all
        ${actions.length > 0 
          ? 'border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/50 dark:to-gray-900' 
          : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
        }
      `}>
        {/* Header */}
        <div className="px-4 py-2 bg-purple-100/50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                ENTÃO (Ações)
              </span>
              {actions.length > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/50">
                  {actions.length} {actions.length === 1 ? 'ação' : 'ações'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          {actions.length > 0 ? (
            <div className="space-y-3">
              {actions.map((action, index) => (
                <div key={action.id}>
                  {index > 0 && (
                    <div className="flex justify-center my-2">
                      <ArrowDown className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <ActionItemCard
                    action={action}
                    index={index}
                    onChange={(a) => handleActionChange(index, a)}
                    onRemove={() => handleActionRemove(index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    isFirst={index === 0}
                    isLast={index === actions.length - 1}
                    readOnly={readOnly}
                  />
                </div>
              ))}

              {!readOnly && (
                <Button
                  variant="outline"
                  onClick={() => setSelectorOpen(true)}
                  className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ação
                </Button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSelectorOpen(true)}
              disabled={readOnly}
              className="w-full py-6 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50"
            >
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">Adicionar Ação</span>
              <span className="text-xs text-gray-400">O que fazer quando a automação disparar</span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <ActionSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectAction}
      />

      {selectedActionDef && (
        <ActionConfigModal
          open={configOpen}
          onClose={() => {
            setConfigOpen(false);
            setSelectedActionDef(null);
          }}
          action={selectedActionDef}
          onSave={handleSaveAction}
        />
      )}
    </>
  );
}

export default ActionCapsule;
