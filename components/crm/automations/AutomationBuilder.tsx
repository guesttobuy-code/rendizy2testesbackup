/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║             AUTOMATION BUILDER - CONSTRUTOR DE AUTOMAÇÕES                 ║
 * ║                                                                           ║
 * ║  Editor visual principal que integra as 3 cápsulas (Trigger, Conditions, ║
 * ║  Actions) em um fluxo visual estilo Zapier/Make/n8n.                     ║
 * ║                                                                           ║
 * ║  📐 Arquitetura em Cápsulas:                                             ║
 * ║     • TriggerCapsule  → QUANDO (evento gatilho)                          ║
 * ║     • ConditionCapsule → SE (condições opcionais)                        ║
 * ║     • ActionCapsule    → ENTÃO (ações a executar)                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Zap,
  Save,
  ArrowLeft,
  Play,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowDownCircle,
} from 'lucide-react';
import { 
  Automation, 
  AutomationDraft, 
  TriggerConfig, 
  ConditionGroup, 
  ActionConfig,
  EMPTY_DRAFT,
  TriggerCategory,
} from './types';
import { TriggerCapsule } from './capsules/TriggerCapsule';
import { ConditionCapsule } from './capsules/ConditionCapsule';
import { ActionCapsule } from './capsules/ActionCapsule';

// ============================================================================
// TIPOS
// ============================================================================

interface AutomationBuilderProps {
  /** Automação existente para editar (null = criação) */
  automation?: Automation | null;
  /** Callback ao salvar */
  onSave: (draft: AutomationDraft) => Promise<void>;
  /** Callback ao cancelar */
  onCancel: () => void;
  /** Callback para testar */
  onTest?: (draft: AutomationDraft) => Promise<void>;
  /** Estado de salvamento */
  isSaving?: boolean;
}

// ============================================================================
// CONNECTOR VISUAL
// ============================================================================

function FlowConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
      <div className="relative">
        <ArrowDownCircle className="h-6 w-6 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900" />
        {label && (
          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
      <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
    </div>
  );
}

// ============================================================================
// VALIDATION
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateAutomation(draft: AutomationDraft): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Nome obrigatório
  if (!draft.name.trim()) {
    errors.push('Nome da automação é obrigatório');
  }

  // Trigger obrigatório
  if (!draft.trigger) {
    errors.push('Selecione um gatilho (QUANDO)');
  }

  // Pelo menos uma ação
  if (draft.actions.length === 0) {
    errors.push('Adicione pelo menos uma ação (ENTÃO)');
  }

  // Warnings
  if (draft.conditions.length === 0) {
    warnings.push('Nenhuma condição definida - a automação será executada sempre que o gatilho disparar');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// AUTOMATION BUILDER
// ============================================================================

export function AutomationBuilder({
  automation,
  onSave,
  onCancel,
  onTest,
  isSaving = false,
}: AutomationBuilderProps) {
  // Draft state
  const [draft, setDraft] = useState<AutomationDraft>(() => {
    if (automation) {
      return {
        name: automation.name,
        description: automation.description || '',
        category: automation.category,
        priority: automation.priority,
        isActive: automation.isActive,
        trigger: automation.trigger,
        conditions: automation.conditions,
        actions: automation.actions,
        module: automation.module,
        tags: automation.tags,
      };
    }
    return { ...EMPTY_DRAFT };
  });

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Validation
  const validation = validateAutomation(draft);

  // Derived state
  const isEditing = !!automation;

  // Handlers
  const handleTriggerChange = (trigger: TriggerConfig | null) => {
    setDraft(prev => ({
      ...prev,
      trigger,
      // Limpar condições se trocar o trigger (campos podem ser diferentes)
      conditions: trigger?.type !== prev.trigger?.type ? [] : prev.conditions,
    }));
  };

  const handleConditionsChange = (conditions: ConditionGroup[]) => {
    setDraft(prev => ({ ...prev, conditions }));
  };

  const handleActionsChange = (actions: ActionConfig[]) => {
    setDraft(prev => ({ ...prev, actions }));
  };

  const handleSave = async () => {
    if (!validation.isValid) return;
    await onSave(draft);
  };

  const handleTest = async () => {
    if (!onTest || !validation.isValid) return;
    setIsTesting(true);
    try {
      await onTest(draft);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* ============ HEADER ============ */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEditing ? 'Editar Automação' : 'Nova Automação'}
              </h1>
              <p className="text-sm text-gray-500">
                Configure o gatilho, condições e ações
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {onTest && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!validation.isValid || isTesting}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Testar
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!validation.isValid || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Salvar Alterações' : 'Criar Automação'}
            </Button>
          </div>
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          
          {/* ============ BASIC INFO ============ */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Informações Básicas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Ativa</span>
                  <Switch
                    checked={draft.isActive}
                    onCheckedChange={(checked) => setDraft(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome da Automação *</Label>
                  <Input
                    id="name"
                    value={draft.name}
                    onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Enviar mensagem de boas-vindas"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v: TriggerCategory) => setDraft(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reservas">📅 Reservas</SelectItem>
                      <SelectItem value="comunicacao">💬 Comunicação</SelectItem>
                      <SelectItem value="financeiro">💰 Financeiro</SelectItem>
                      <SelectItem value="operacional">⚙️ Operacional</SelectItem>
                      <SelectItem value="reviews">⭐ Reviews</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o objetivo desta automação..."
                  rows={2}
                />
              </div>

              {/* Advanced options toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Opções avançadas
              </button>

              {showAdvanced && (
                <div className="pt-2 space-y-4 border-t dark:border-gray-700">
                  <div className="space-y-1.5">
                    <Label htmlFor="priority">Prioridade de Execução</Label>
                    <Select
                      value={draft.priority}
                      onValueChange={(v: 'alta' | 'media' | 'baixa') => setDraft(prev => ({ ...prev, priority: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">🔴 Alta (executa primeiro)</SelectItem>
                        <SelectItem value="media">🟡 Normal</SelectItem>
                        <SelectItem value="baixa">🟢 Baixa (executa por último)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Quando múltiplas automações são disparadas pelo mesmo evento, a prioridade define a ordem
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============ VALIDATION ALERTS ============ */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* ============ FLOW BUILDER ============ */}
          <div className="space-y-0">
            {/* TRIGGER CAPSULE */}
            <TriggerCapsule
              trigger={draft.trigger}
              onChange={handleTriggerChange}
            />

            <FlowConnector label="quando isso acontecer..." />

            {/* CONDITION CAPSULE */}
            <ConditionCapsule
              conditions={draft.conditions}
              onChange={handleConditionsChange}
            />

            <FlowConnector label="se as condições forem atendidas..." />

            {/* ACTION CAPSULE */}
            <ActionCapsule
              actions={draft.actions}
              onChange={handleActionsChange}
            />
          </div>

          {/* ============ SUMMARY ============ */}
          {validation.isValid && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Automação pronta para ser salva!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      <strong>QUANDO</strong> {draft.trigger?.name || '...'} → 
                      {draft.conditions.length > 0 && (
                        <> <strong>SE</strong> {draft.conditions.length} grupo(s) de condição → </>
                      )}
                      <strong>ENTÃO</strong> {draft.actions.length} ação(ões)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

export default AutomationBuilder;
