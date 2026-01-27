/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║               TRIGGER CAPSULE - CÁPSULA DE EVENTO                         ║
 * ║                                                                           ║
 * ║  Componente visual para seleção e configuração do trigger (evento)       ║
 * ║  que dispara a automação.                                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../ui/dialog';
import {
  Play,
  Plus,
  X,
  Search,
  ChevronRight,
  Zap,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  LogIn,
  LogOut,
  CircleDollarSign,
  AlertCircle,
  MessageSquare,
  Clock,
  CheckSquare,
  CheckCircle2,
  UserCheck,
  GitBranch,
  Wrench,
  Package,
  Calendar,
  Timer,
  Webhook,
  Settings2,
} from 'lucide-react';
import { TriggerConfig, generateId } from '../types';
import { 
  TRIGGERS_CATALOG, 
  CATEGORY_LABELS,
  type TriggerDefinition,
  type TriggerCategory,
} from '../../settings/automation-catalog';

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  CalendarPlus, CalendarCheck, CalendarX, LogIn, LogOut,
  CircleDollarSign, AlertCircle, MessageSquare, Clock,
  CheckSquare, CheckCircle2, UserCheck, GitBranch,
  Wrench, Package, Calendar, Timer, Webhook, Play, Zap,
};

function IconRenderer({ name, className }: { name: string; className?: string }) {
  const IconComponent = ICON_MAP[name] || Zap;
  return <IconComponent className={className} />;
}

// ============================================================================
// TRIGGER SELECTOR MODAL
// ============================================================================

interface TriggerSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (trigger: TriggerDefinition) => void;
}

function TriggerSelector({ open, onClose, onSelect }: TriggerSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TriggerCategory | null>(null);

  const categories: TriggerCategory[] = ['reservas', 'financeiro', 'comunicacao', 'crm', 'operacional', 'sistema'];

  const filteredTriggers = TRIGGERS_CATALOG.filter(t => {
    if (selectedCategory && t.category !== selectedCategory) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.aliases.some(a => a.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const handleSelect = (trigger: TriggerDefinition) => {
    onSelect(trigger);
    onClose();
    setSearch('');
    setSelectedCategory(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-blue-500" />
            Selecionar Trigger (Evento)
          </DialogTitle>
          <DialogDescription>
            Escolha o evento que irá disparar esta automação
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar triggers..."
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
            Todos
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

        {/* Triggers List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredTriggers.map(trigger => (
            <button
              key={trigger.id}
              onClick={() => handleSelect(trigger)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40">
                  <IconRenderer name={trigger.icon} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {trigger.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[trigger.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {trigger.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </button>
          ))}

          {filteredTriggers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum trigger encontrado
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TRIGGER CONFIG MODAL
// ============================================================================

interface TriggerConfigModalProps {
  open: boolean;
  onClose: () => void;
  trigger: TriggerDefinition;
  currentConfig?: TriggerConfig;
  onSave: (config: TriggerConfig) => void;
}

function TriggerConfigModal({ 
  open, 
  onClose, 
  trigger, 
  currentConfig,
  onSave 
}: TriggerConfigModalProps) {
  const [config, setConfig] = useState<Record<string, any>>(
    currentConfig?.config || {}
  );

  const handleSave = () => {
    const triggerConfig: TriggerConfig = {
      id: currentConfig?.id || generateId(),
      type: trigger.id,
      name: trigger.name,
      icon: trigger.icon,
      category: trigger.category,
      config,
    };
    onSave(triggerConfig);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <IconRenderer name={trigger.icon} className="h-5 w-5" />
            </div>
            Configurar: {trigger.name}
          </DialogTitle>
          <DialogDescription>
            {trigger.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campos disponíveis */}
          <div>
            <Label className="text-sm font-medium">Campos Disponíveis</Label>
            <p className="text-xs text-gray-500 mb-2">
              Use estas variáveis nas ações e condições
            </p>
            <div className="flex flex-wrap gap-2">
              {trigger.availableFields.slice(0, 6).map(field => (
                <Badge key={field.path} variant="secondary" className="font-mono text-xs">
                  {`{{${field.path}}}`}
                </Badge>
              ))}
              {trigger.availableFields.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{trigger.availableFields.length - 6} mais
                </Badge>
              )}
            </div>
          </div>

          {/* Configurações específicas do trigger */}
          {trigger.id.includes('approaching') && (
            <div className="space-y-2">
              <Label htmlFor="threshold">Dias de antecedência</Label>
              <Input
                id="threshold"
                type="number"
                min={1}
                max={30}
                value={config.threshold || 1}
                onChange={(e) => setConfig({ ...config, threshold: parseInt(e.target.value) })}
                placeholder="Ex: 2 (dias antes)"
              />
              <p className="text-xs text-gray-500">
                Disparar X dias antes do evento
              </p>
            </div>
          )}

          {trigger.id.includes('cron') && (
            <div className="space-y-2">
              <Label htmlFor="schedule">Horário de execução</Label>
              <Input
                id="schedule"
                type="time"
                value={config.schedule || '08:00'}
                onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Trigger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// TRIGGER CAPSULE (COMPONENTE PRINCIPAL)
// ============================================================================

interface TriggerCapsuleProps {
  trigger: TriggerConfig | null;
  onChange: (trigger: TriggerConfig | null) => void;
  readOnly?: boolean;
}

export function TriggerCapsule({ trigger, onChange, readOnly = false }: TriggerCapsuleProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedTriggerDef, setSelectedTriggerDef] = useState<TriggerDefinition | null>(null);

  const triggerDef = trigger 
    ? TRIGGERS_CATALOG.find(t => t.id === trigger.type) 
    : null;

  const handleSelectTrigger = (triggerDef: TriggerDefinition) => {
    setSelectedTriggerDef(triggerDef);
    setConfigOpen(true);
  };

  const handleSaveConfig = (config: TriggerConfig) => {
    onChange(config);
    setSelectedTriggerDef(null);
  };

  const handleRemove = () => {
    onChange(null);
  };

  const handleEdit = () => {
    if (triggerDef) {
      setSelectedTriggerDef(triggerDef);
      setConfigOpen(true);
    }
  };

  return (
    <>
      <Card className={`
        relative overflow-hidden transition-all
        ${trigger 
          ? 'border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-gray-900' 
          : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
        }
      `}>
        {/* Header */}
        <div className="px-4 py-2 bg-blue-100/50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              QUANDO (Trigger)
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          {trigger && triggerDef ? (
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <IconRenderer name={trigger.icon} className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {trigger.name}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {triggerDef.description}
                </p>
                {trigger.config && Object.keys(trigger.config).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(trigger.config).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {!readOnly && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handleEdit}>
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleRemove} className="text-red-500 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSelectorOpen(true)}
              disabled={readOnly}
              className="w-full py-6 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">Selecionar Trigger</span>
              <span className="text-xs text-gray-400">O evento que dispara esta automação</span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <TriggerSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectTrigger}
      />

      {selectedTriggerDef && (
        <TriggerConfigModal
          open={configOpen}
          onClose={() => {
            setConfigOpen(false);
            setSelectedTriggerDef(null);
          }}
          trigger={selectedTriggerDef}
          currentConfig={trigger || undefined}
          onSave={handleSaveConfig}
        />
      )}
    </>
  );
}

export default TriggerCapsule;
