import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Plus, Trash2, GripVertical, Settings, Save, X } from 'lucide-react';
import { Funnel, FunnelStage, PredeterminedFunnelConfig, StageRequirement, ProcessTrigger } from '../../types/funnels';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StageConfigModal } from './StageConfigModal';
import { ProcessTriggerConfig } from './ProcessTriggerConfig';

interface PredeterminedFunnelBuilderProps {
  open: boolean;
  onClose: () => void;
  onSave: (funnel: Funnel) => void;
  existingFunnel?: Funnel;
}

interface SortableStageItemProps {
  stage: FunnelStage;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (stage: FunnelStage) => void;
}

function SortableStageItem({ stage, index, onEdit, onDelete, onUpdate }: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-white dark:bg-gray-800"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      <div
        className="w-4 h-4 rounded"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{stage.name}</span>
          <Badge variant="outline" className="text-xs">
            Etapa {index + 1}
          </Badge>
        </div>
        {stage.description && (
          <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Settings className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:text-red-700">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function PredeterminedFunnelBuilder({
  open,
  onClose,
  onSave,
  existingFunnel,
}: PredeterminedFunnelBuilderProps) {
  const [funnelName, setFunnelName] = useState(existingFunnel?.name || '');
  const [funnelDescription, setFunnelDescription] = useState(existingFunnel?.description || '');
  const [stages, setStages] = useState<FunnelStage[]>(
    existingFunnel?.stages || []
  );
  const [config, setConfig] = useState<PredeterminedFunnelConfig>({
    isSequential: true,
    allowSkip: false,
    requireValidation: true,
    visibility: 'shared',
    stageRequirements: [],
  });
  const [triggers, setTriggers] = useState<ProcessTrigger[]>([]);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setStages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newStages = arrayMove(items, oldIndex, newIndex);
        // Atualizar ordem
        return newStages.map((stage, index) => ({
          ...stage,
          order: index + 1,
        }));
      });
    }
  };

  const handleAddStage = () => {
    const newStage: FunnelStage = {
      id: `stage-${Date.now()}`,
      funnelId: existingFunnel?.id || 'new',
      name: `Etapa ${stages.length + 1}`,
      order: stages.length + 1,
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
    };
    setStages([...stages, newStage]);
    setEditingStage(newStage);
    setIsConfigModalOpen(true);
  };

  const handleEditStage = (stage: FunnelStage) => {
    setEditingStage(stage);
    setIsConfigModalOpen(true);
  };

  const handleDeleteStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId).map((s, index) => ({
      ...s,
      order: index + 1,
    })));
  };

  const handleSaveStage = (updatedStage: FunnelStage, requirements?: StageRequirement) => {
    const stageIndex = stages.findIndex(s => s.id === updatedStage.id);
    if (stageIndex >= 0) {
      const newStages = [...stages];
      newStages[stageIndex] = updatedStage;
      setStages(newStages);

      // Atualizar requisitos na configuração
      if (requirements) {
        const newRequirements = config.stageRequirements?.filter(r => r.stageId !== updatedStage.id) || [];
        newRequirements.push(requirements);
        setConfig({
          ...config,
          stageRequirements: newRequirements,
        });
      }
    } else {
      setStages([...stages, updatedStage]);
      if (requirements) {
        setConfig({
          ...config,
          stageRequirements: [...(config.stageRequirements || []), requirements],
        });
      }
    }
    setIsConfigModalOpen(false);
    setEditingStage(null);
  };

  const handleSave = () => {
    if (!funnelName.trim()) {
      toast.error('Nome do processo é obrigatório');
      return;
    }

    if (stages.length === 0) {
      toast.error('Adicione pelo menos uma etapa');
      return;
    }

    const funnel: Funnel = {
      id: existingFunnel?.id || `funnel-${Date.now()}`,
      organizationId: existingFunnel?.organizationId || '',
      name: funnelName,
      type: 'PREDETERMINED',
      description: funnelDescription,
      stages,
      statusConfig: existingFunnel?.statusConfig || {
        resolvedStatus: 'Concluído',
        unresolvedStatus: 'Cancelado',
        inProgressStatus: 'Em Andamento',
      },
      isDefault: existingFunnel?.isDefault || false,
      isGlobalDefault: existingFunnel?.isGlobalDefault || false,
      createdAt: existingFunnel?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Adicionar configuração e gatilhos no metadata
      metadata: {
        ...existingFunnel?.metadata,
        config,
        triggers,
      } as any,
    };

    onSave(funnel);
    toast.success('Processo salvo com sucesso!');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingFunnel ? 'Editar Processo Pré-determinado' : 'Novo Processo Pré-determinado'}
            </DialogTitle>
            <DialogDescription>
              Crie um processo sequencial tipo wizard (ex: vistoria, implantação, check-in)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="funnelName">Nome do Processo *</Label>
                <Input
                  id="funnelName"
                  value={funnelName}
                  onChange={(e) => setFunnelName(e.target.value)}
                  placeholder="Ex: Processo de Implantação"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="funnelDescription">Descrição</Label>
                <Textarea
                  id="funnelDescription"
                  value={funnelDescription}
                  onChange={(e) => setFunnelDescription(e.target.value)}
                  placeholder="Descreva quando usar este processo..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Configuração Geral */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Configuração Geral</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSequential"
                    checked={config.isSequential}
                    onChange={(e) => setConfig({ ...config, isSequential: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isSequential" className="cursor-pointer">
                    Processo sequencial (não pode pular etapas)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowSkip"
                    checked={config.allowSkip}
                    onChange={(e) => setConfig({ ...config, allowSkip: e.target.checked })}
                    disabled={config.isSequential}
                    className="rounded"
                  />
                  <Label htmlFor="allowSkip" className="cursor-pointer">
                    Permitir pular etapas
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requireValidation"
                    checked={config.requireValidation}
                    onChange={(e) => setConfig({ ...config, requireValidation: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requireValidation" className="cursor-pointer">
                    Exigir validação de requisitos antes de avançar
                  </Label>
                </div>
                <div>
                  <Label htmlFor="visibility">Visibilidade</Label>
                  <select
                    id="visibility"
                    value={config.visibility}
                    onChange={(e) => setConfig({ ...config, visibility: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="internal">Apenas Interno</option>
                    <option value="shared">Compartilhado (Imobiliária + Cliente)</option>
                    <option value="public">Público</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Etapas do Processo */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Etapas do Processo</h3>
                <Button size="sm" onClick={handleAddStage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>

              {stages.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-500 mb-4">Nenhuma etapa adicionada ainda</p>
                  <Button onClick={handleAddStage}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Etapa
                  </Button>
                </Card>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <SortableStageItem
                          key={stage.id}
                          stage={stage}
                          index={index}
                          onEdit={() => handleEditStage(stage)}
                          onDelete={() => handleDeleteStage(stage.id)}
                          onUpdate={(updated) => {
                            const newStages = [...stages];
                            newStages[index] = updated;
                            setStages(newStages);
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Gatilhos Automáticos */}
            <ProcessTriggerConfig
              triggers={triggers}
              onChange={setTriggers}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de Etapa */}
      {editingStage && (
        <StageConfigModal
          open={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false);
            setEditingStage(null);
          }}
          onSave={handleSaveStage}
          stage={editingStage}
          existingRequirements={config.stageRequirements?.find(r => r.stageId === editingStage.id)}
        />
      )}
    </>
  );
}
