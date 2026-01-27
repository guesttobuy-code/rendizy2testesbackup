/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║               CONDITION CAPSULE - CÁPSULA DE CONDIÇÕES                    ║
 * ║                                                                           ║
 * ║  Componente visual para configuração de condições/filtros que           ║
 * ║  determinam quando a automação deve executar.                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import {
  Filter,
  Plus,
  X,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { 
  ConditionConfig, 
  ConditionGroup, 
  createEmptyCondition,
  createEmptyConditionGroup,
  generateId,
} from '../types';
import { 
  CONDITIONS_CATALOG,
  TRIGGERS_CATALOG,
  type PayloadField,
} from '../../settings/automation-catalog';

// ============================================================================
// SINGLE CONDITION ROW
// ============================================================================

interface ConditionRowProps {
  condition: ConditionConfig;
  availableFields: PayloadField[];
  onChange: (condition: ConditionConfig) => void;
  onRemove: () => void;
  showLogicalOperator: boolean;
  logicalOperator: 'AND' | 'OR';
  onLogicalOperatorChange: (op: 'AND' | 'OR') => void;
}

function ConditionRow({
  condition,
  availableFields,
  onChange,
  onRemove,
  showLogicalOperator,
  logicalOperator,
  onLogicalOperatorChange,
}: ConditionRowProps) {
  const selectedField = availableFields.find(f => f.path === condition.field);
  const applicableOperators = CONDITIONS_CATALOG.filter(op => {
    if (!selectedField) return true;
    return op.applicableTo.includes(selectedField.type as any);
  });

  return (
    <div className="space-y-2">
      {showLogicalOperator && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border bg-gray-50 dark:bg-gray-800 p-0.5">
            <button
              onClick={() => onLogicalOperatorChange('AND')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                logicalOperator === 'AND'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              E (AND)
            </button>
            <button
              onClick={() => onLogicalOperatorChange('OR')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                logicalOperator === 'OR'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              OU (OR)
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="text-gray-400 cursor-move mt-2">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 grid grid-cols-3 gap-2">
          {/* Campo */}
          <Select
            value={condition.field}
            onValueChange={(v) => onChange({ ...condition, field: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Campo" />
            </SelectTrigger>
            <SelectContent>
              {availableFields.map(field => (
                <SelectItem key={field.path} value={field.path}>
                  <span className="font-mono text-xs">{field.path}</span>
                  <span className="ml-2 text-gray-500">({field.name})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operador */}
          <Select
            value={condition.operator}
            onValueChange={(v) => onChange({ ...condition, operator: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              {applicableOperators.map(op => (
                <SelectItem key={op.id} value={op.operator}>
                  {op.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Valor */}
          {!['exists', 'not_exists', 'is_empty', 'is_not_empty'].includes(condition.operator) && (
            <Input
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              placeholder="Valor"
              className="h-9"
            />
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// CONDITION GROUP
// ============================================================================

interface ConditionGroupCardProps {
  group: ConditionGroup;
  groupIndex: number;
  availableFields: PayloadField[];
  onChange: (group: ConditionGroup) => void;
  onRemove: () => void;
}

function ConditionGroupCard({
  group,
  groupIndex,
  availableFields,
  onChange,
  onRemove,
}: ConditionGroupCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleConditionChange = (index: number, condition: ConditionConfig) => {
    const newConditions = [...group.conditions];
    newConditions[index] = condition;
    onChange({ ...group, conditions: newConditions });
  };

  const handleConditionRemove = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    if (newConditions.length === 0) {
      onRemove();
    } else {
      onChange({ ...group, conditions: newConditions });
    }
  };

  const handleAddCondition = () => {
    onChange({
      ...group,
      conditions: [...group.conditions, createEmptyCondition()],
    });
  };

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 overflow-hidden">
      {/* Group Header */}
      <div className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Grupo {groupIndex + 1}
          </span>
          <Badge variant="outline" className="text-xs">
            {group.conditions.length} {group.conditions.length === 1 ? 'condição' : 'condições'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-500 hover:text-red-600 h-7"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Remover grupo
        </Button>
      </div>

      {/* Conditions */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {group.conditions.map((condition, index) => (
            <ConditionRow
              key={condition.id}
              condition={condition}
              availableFields={availableFields}
              onChange={(c) => handleConditionChange(index, c)}
              onRemove={() => handleConditionRemove(index)}
              showLogicalOperator={index > 0}
              logicalOperator={group.logicalOperator}
              onLogicalOperatorChange={(op) => onChange({ ...group, logicalOperator: op })}
            />
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Condição
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONDITION CAPSULE (COMPONENTE PRINCIPAL)
// ============================================================================

interface ConditionCapsuleProps {
  conditions: ConditionGroup[];
  triggerType?: string;
  onChange: (conditions: ConditionGroup[]) => void;
  readOnly?: boolean;
}

export function ConditionCapsule({ 
  conditions, 
  triggerType,
  onChange, 
  readOnly = false 
}: ConditionCapsuleProps) {
  // Buscar campos disponíveis do trigger selecionado
  const triggerDef = triggerType 
    ? TRIGGERS_CATALOG.find(t => t.id === triggerType)
    : null;
  const availableFields = triggerDef?.availableFields || [];

  const handleGroupChange = (index: number, group: ConditionGroup) => {
    const newGroups = [...conditions];
    newGroups[index] = group;
    onChange(newGroups);
  };

  const handleGroupRemove = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const handleAddGroup = () => {
    const newGroup = createEmptyConditionGroup();
    newGroup.conditions = [createEmptyCondition()];
    onChange([...conditions, newGroup]);
  };

  const hasConditions = conditions.length > 0 && conditions.some(g => g.conditions.length > 0);

  return (
    <Card className={`
      relative overflow-hidden transition-all
      ${hasConditions 
        ? 'border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/50 dark:to-gray-900' 
        : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
      }
    `}>
      {/* Header */}
      <div className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              SE (Condições)
            </span>
            <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/50">
              Opcional
            </Badge>
          </div>
          {!readOnly && hasConditions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="text-red-500 hover:text-red-600 h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {!triggerType ? (
          <div className="py-4 text-center text-gray-500 dark:text-gray-400">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione um trigger primeiro</p>
            <p className="text-xs text-gray-400">Os campos disponíveis dependem do trigger escolhido</p>
          </div>
        ) : hasConditions ? (
          <div className="space-y-4">
            {conditions.map((group, index) => (
              <div key={group.id}>
                {index > 0 && (
                  <div className="flex justify-center my-3">
                    <Badge className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      OU (entre grupos)
                    </Badge>
                  </div>
                )}
                <ConditionGroupCard
                  group={group}
                  groupIndex={index}
                  availableFields={availableFields}
                  onChange={(g) => handleGroupChange(index, g)}
                  onRemove={() => handleGroupRemove(index)}
                />
              </div>
            ))}

            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddGroup}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Grupo de Condições (OU)
              </Button>
            )}
          </div>
        ) : (
          <button
            onClick={handleAddGroup}
            disabled={readOnly}
            className="w-full py-6 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
          >
            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium">Adicionar Condições</span>
            <span className="text-xs text-gray-400">Filtrar quando a automação deve executar</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default ConditionCapsule;
