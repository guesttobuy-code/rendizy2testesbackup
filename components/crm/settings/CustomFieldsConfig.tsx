/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                  CUSTOM FIELDS CONFIG - UI COMPONENT                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para gerenciamento de Campos Customizados
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
  GripVertical,
  Type,
  Hash,
  Calendar,
  User,
  List,
  Tag,
  DollarSign,
  ChevronDown,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { CustomField, CustomFieldOption, CustomFieldType } from '@/types/crm-tasks';
import { CustomFieldsService } from '@/services/crmTasksService';

// ============================================================================
// TYPES
// ============================================================================

interface CustomFieldsConfigProps {
  organizationId: string;
  scope?: 'task' | 'deal' | 'ticket' | 'project';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_FIELDS: CustomField[] = [
  {
    id: '1',
    organization_id: 'org-1',
    name: 'Prioridade',
    description: 'Nível de prioridade da tarefa',
    field_type: 'single_select',
    options: [
      { id: 'o1', label: 'Baixa', color: '#94a3b8' },
      { id: 'o2', label: 'Média', color: '#f59e0b' },
      { id: 'o3', label: 'Alta', color: '#f97316' },
      { id: 'o4', label: 'Urgente', color: '#ef4444' },
    ],
    is_required: false,
    is_visible_in_list: true,
    scope: 'task',
    display_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    organization_id: 'org-1',
    name: 'Status do Projeto',
    description: 'Estado atual do andamento',
    field_type: 'single_select',
    options: [
      { id: 'o5', label: 'No prazo', color: '#22c55e' },
      { id: 'o6', label: 'Em risco', color: '#f59e0b' },
      { id: 'o7', label: 'Atrasado', color: '#ef4444' },
    ],
    is_required: false,
    is_visible_in_list: true,
    scope: 'task',
    display_order: 2,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    organization_id: 'org-1',
    name: 'Orçamento',
    description: 'Valor estimado para a tarefa',
    field_type: 'currency',
    options: [],
    is_required: false,
    is_visible_in_list: true,
    scope: 'task',
    display_order: 3,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '4',
    organization_id: 'org-1',
    name: 'Sprint',
    description: 'Sprint de desenvolvimento',
    field_type: 'single_select',
    options: [
      { id: 'o8', label: 'Sprint 1', color: '#3b82f6' },
      { id: 'o9', label: 'Sprint 2', color: '#8b5cf6' },
      { id: 'o10', label: 'Backlog', color: '#64748b' },
    ],
    is_required: false,
    is_visible_in_list: false,
    scope: 'task',
    display_order: 4,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const FIELD_TYPE_INFO: Record<CustomFieldType, { label: string; icon: React.ElementType; description: string }> = {
  text: { label: 'Texto', icon: Type, description: 'Campo de texto livre' },
  number: { label: 'Número', icon: Hash, description: 'Valores numéricos' },
  single_select: { label: 'Seleção única', icon: List, description: 'Escolha uma opção de uma lista' },
  multi_select: { label: 'Seleção múltipla', icon: Tag, description: 'Escolha várias opções' },
  date: { label: 'Data', icon: Calendar, description: 'Seletor de data' },
  user: { label: 'Usuário', icon: User, description: 'Atribuir a um usuário' },
  currency: { label: 'Moeda', icon: DollarSign, description: 'Valores monetários' },
};

const OPTION_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomFieldsConfig({ organizationId, scope = 'task' }: CustomFieldsConfigProps) {
  const [fields, setFields] = useState<CustomField[]>(MOCK_FIELDS.filter(f => f.scope === scope));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadFields();
  }, [organizationId, scope]);

  async function loadFields() {
    setLoading(true);
    setError(null);
    try {
      const data = await CustomFieldsService.list(organizationId, scope);
      if (data.length > 0) {
        setFields(data);
      }
    } catch (err) {
      console.error('Erro ao carregar campos:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFields(items => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Salva nova ordem
        CustomFieldsService.reorder(newItems.map(f => f.id)).catch(console.error);
        
        return newItems;
      });
    }
  }

  function handleCreateField() {
    setEditingField(null);
    setIsModalOpen(true);
  }

  function handleEditField(field: CustomField) {
    setEditingField(field);
    setIsModalOpen(true);
  }

  async function handleDeleteField(fieldId: string) {
    if (!confirm('Tem certeza que deseja excluir este campo? Os valores existentes serão perdidos.')) return;
    
    try {
      await CustomFieldsService.delete(fieldId);
      setFields(prev => prev.filter(f => f.id !== fieldId));
    } catch (err) {
      setFields(prev => prev.filter(f => f.id !== fieldId));
    }
  }

  async function handleToggleVisibility(fieldId: string, isVisible: boolean) {
    try {
      await CustomFieldsService.update(fieldId, { is_visible_in_list: isVisible });
      setFields(prev => prev.map(f => 
        f.id === fieldId ? { ...f, is_visible_in_list: isVisible } : f
      ));
    } catch (err) {
      setFields(prev => prev.map(f => 
        f.id === fieldId ? { ...f, is_visible_in_list: isVisible } : f
      ));
    }
  }

  async function handleSaveField(fieldData: Partial<CustomField> & { name: string; field_type: CustomFieldType }) {
    try {
      if (editingField) {
        const updated = await CustomFieldsService.update(editingField.id, fieldData);
        setFields(prev => prev.map(f => f.id === editingField.id ? updated : f));
      } else {
        const created = await CustomFieldsService.create(organizationId, {
          ...fieldData,
          scope,
        });
        setFields(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      // Para demo, atualiza localmente
      if (editingField) {
        setFields(prev => prev.map(f => f.id === editingField.id ? { ...f, ...fieldData } as CustomField : f));
      } else {
        const newField: CustomField = {
          id: `temp-${Date.now()}`,
          organization_id: organizationId,
          name: fieldData.name,
          description: fieldData.description,
          field_type: fieldData.field_type,
          options: fieldData.options || [],
          is_required: fieldData.is_required || false,
          is_visible_in_list: fieldData.is_visible_in_list !== false,
          scope,
          display_order: fields.length + 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setFields(prev => [...prev, newField]);
      }
      setIsModalOpen(false);
    }
  }

  const scopeLabels = {
    task: 'Tarefas',
    deal: 'Negócios',
    ticket: 'Tickets',
    project: 'Projetos',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campos Customizados</h2>
          <p className="text-muted-foreground">
            Configure campos personalizados para {scopeLabels[scope].toLowerCase()}
          </p>
        </div>
        <Button onClick={handleCreateField}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Campo
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Fields List */}
      {!loading && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campos Configurados</CardTitle>
            <CardDescription>
              Arraste para reordenar. Campos visíveis aparecem nas listagens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fields.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {fields.map(field => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        onEdit={() => handleEditField(field)}
                        onDelete={() => handleDeleteField(field.id)}
                        onToggleVisibility={(visible) => handleToggleVisibility(field.id, visible)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum campo criado</h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  Crie campos personalizados para capturar informações específicas das suas {scopeLabels[scope].toLowerCase()}.
                </p>
                <Button className="mt-4" onClick={handleCreateField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro campo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Criação/Edição */}
      <CustomFieldFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        field={editingField}
        onSave={handleSaveField}
      />
    </div>
  );
}

// ============================================================================
// SORTABLE FIELD ITEM
// ============================================================================

interface SortableFieldItemProps {
  field: CustomField;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisibility: (visible: boolean) => void;
}

function SortableFieldItem({ field, onEdit, onDelete, onToggleVisibility }: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeInfo = FIELD_TYPE_INFO[field.field_type];
  const TypeIcon = typeInfo.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 border rounded-lg bg-background transition-colors',
        isDragging && 'opacity-50 border-primary'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
        <TypeIcon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.name}</span>
          {field.is_required && (
            <Badge variant="outline" className="text-xs">Obrigatório</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{typeInfo.label}</span>
          {field.options.length > 0 && (
            <>
              <span>•</span>
              <span>{field.options.length} opções</span>
            </>
          )}
        </div>
      </div>

      {/* Options preview */}
      {field.options.length > 0 && (
        <div className="flex gap-1">
          {field.options.slice(0, 3).map(opt => (
            <span
              key={opt.id}
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: opt.color }}
            >
              {opt.label}
            </span>
          ))}
          {field.options.length > 3 && (
            <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
              +{field.options.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Visibility toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(!field.is_visible_in_list)}
          title={field.is_visible_in_list ? 'Visível na lista' : 'Oculto na lista'}
        >
          {field.is_visible_in_list ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM FIELD FORM MODAL
// ============================================================================

interface CustomFieldFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CustomField | null;
  onSave: (data: Partial<CustomField> & { name: string; field_type: CustomFieldType }) => void;
}

function CustomFieldFormModal({ open, onOpenChange, field, onSave }: CustomFieldFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [isVisibleInList, setIsVisibleInList] = useState(true);
  const [options, setOptions] = useState<CustomFieldOption[]>([]);
  
  // New option form
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState(OPTION_COLORS[0]);

  useEffect(() => {
    if (field) {
      setName(field.name);
      setDescription(field.description || '');
      setFieldType(field.field_type);
      setIsRequired(field.is_required);
      setIsVisibleInList(field.is_visible_in_list);
      setOptions(field.options);
    } else {
      resetForm();
    }
  }, [field, open]);

  function resetForm() {
    setName('');
    setDescription('');
    setFieldType('text');
    setIsRequired(false);
    setIsVisibleInList(true);
    setOptions([]);
    setNewOptionLabel('');
    setNewOptionColor(OPTION_COLORS[0]);
  }

  function addOption() {
    if (!newOptionLabel.trim()) return;
    
    const newOption: CustomFieldOption = {
      id: `opt-${Date.now()}`,
      label: newOptionLabel.trim(),
      color: newOptionColor,
    };
    
    setOptions(prev => [...prev, newOption]);
    setNewOptionLabel('');
    // Cycle to next color
    const currentIndex = OPTION_COLORS.indexOf(newOptionColor);
    setNewOptionColor(OPTION_COLORS[(currentIndex + 1) % OPTION_COLORS.length]);
  }

  function removeOption(optionId: string) {
    setOptions(prev => prev.filter(o => o.id !== optionId));
  }

  function updateOptionColor(optionId: string, color: string) {
    setOptions(prev => prev.map(o => o.id === optionId ? { ...o, color } : o));
  }

  function handleSubmit() {
    if (!name.trim()) return;
    
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      field_type: fieldType,
      is_required: isRequired,
      is_visible_in_list: isVisibleInList,
      options: ['single_select', 'multi_select'].includes(fieldType) ? options : [],
    });
  }

  const hasOptions = ['single_select', 'multi_select'].includes(fieldType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{field ? 'Editar Campo' : 'Novo Campo Customizado'}</DialogTitle>
          <DialogDescription>
            Configure as propriedades do campo personalizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="field-name">Nome do Campo *</Label>
            <Input
              id="field-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Prioridade, Status, Orçamento..."
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="field-description">Descrição</Label>
            <Input
              id="field-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição opcional do campo"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo do Campo *</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(FIELD_TYPE_INFO) as [CustomFieldType, typeof FIELD_TYPE_INFO[CustomFieldType]][]).map(([type, info]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <info.icon className="h-4 w-4" />
                      <span>{info.label}</span>
                      <span className="text-xs text-muted-foreground">- {info.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opções (para single_select e multi_select) */}
          {hasOptions && (
            <div className="space-y-3">
              <Label>Opções</Label>
              
              {/* Lista de opções existentes */}
              {options.length > 0 && (
                <div className="space-y-2">
                  {options.map(opt => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: opt.color }}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <div className="grid grid-cols-6 gap-1 p-2">
                            {OPTION_COLORS.map(color => (
                              <button
                                key={color}
                                className={cn(
                                  'h-6 w-6 rounded-full',
                                  opt.color === color && 'ring-2 ring-offset-1 ring-primary'
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => updateOptionColor(opt.id, color)}
                              />
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <span className="flex-1 text-sm">{opt.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(opt.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar nova opção */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
                      style={{ backgroundColor: newOptionColor }}
                    >
                      <span className="sr-only">Escolher cor</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <div className="grid grid-cols-6 gap-1 p-2">
                      {OPTION_COLORS.map(color => (
                        <button
                          key={color}
                          className={cn(
                            'h-6 w-6 rounded-full',
                            newOptionColor === color && 'ring-2 ring-offset-1 ring-primary'
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewOptionColor(color)}
                        />
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  value={newOptionLabel}
                  onChange={e => setNewOptionLabel(e.target.value)}
                  placeholder="Nome da opção"
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && addOption()}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Configurações */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Campo obrigatório</Label>
                <p className="text-xs text-muted-foreground">
                  Exigir preenchimento ao criar/editar
                </p>
              </div>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Visível nas listagens</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar como coluna na visualização de lista
                </p>
              </div>
              <Switch checked={isVisibleInList} onCheckedChange={setIsVisibleInList} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Save className="mr-2 h-4 w-4" />
            {field ? 'Salvar Alterações' : 'Criar Campo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomFieldsConfig;
