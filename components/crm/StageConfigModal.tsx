import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { FunnelStage, StageRequirement } from '../../types/funnels';
import { User, Building2, Users, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface StageConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (stage: FunnelStage, requirements?: StageRequirement) => void;
  stage: FunnelStage;
  existingRequirements?: StageRequirement;
}

export function StageConfigModal({
  open,
  onClose,
  onSave,
  stage,
  existingRequirements,
}: StageConfigModalProps) {
  const [stageName, setStageName] = useState(stage.name);
  const [stageDescription, setStageDescription] = useState(stage.description || '');
  const [stageColor, setStageColor] = useState(stage.color);
  const [responsibleType, setResponsibleType] = useState<'internal' | 'client' | 'agency' | 'dynamic' | 'multiple'>('internal');
  
  // Requisitos
  const [requireApproval, setRequireApproval] = useState(existingRequirements?.requiredApproval || false);
  const [requireProducts, setRequireProducts] = useState(existingRequirements?.requiredProducts || false);
  const [minProgress, setMinProgress] = useState(existingRequirements?.minProgress || 0);
  const [requiredFields, setRequiredFields] = useState<string[]>(existingRequirements?.requiredFields || []);

  const handleSave = () => {
    if (!stageName.trim()) {
      return;
    }

    const updatedStage: FunnelStage = {
      ...stage,
      name: stageName,
      description: stageDescription,
      color: stageColor,
    };

    const requirements: StageRequirement = {
      stageId: stage.id,
      requiredApproval: requireApproval,
      requiredProducts: requireProducts,
      minProgress: minProgress > 0 ? minProgress : undefined,
      requiredFields: requiredFields.length > 0 ? requiredFields : undefined,
    };

    onSave(updatedStage, requirements);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Etapa: {stage.name}</DialogTitle>
          <DialogDescription>
            Configure os detalhes, responsável e requisitos desta etapa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="stageName">Nome da Etapa *</Label>
              <Input
                id="stageName"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="stageDescription">Descrição</Label>
              <Textarea
                id="stageDescription"
                value={stageDescription}
                onChange={(e) => setStageDescription(e.target.value)}
                placeholder="Descreva o que acontece nesta etapa..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="stageColor">Cor da Etapa</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="stageColor"
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Responsável */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Responsável pela Etapa</h3>
            <Select value={responsibleType} onValueChange={(value: any) => setResponsibleType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Time Interno</span>
                  </div>
                </SelectItem>
                <SelectItem value="client">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Cliente (Portal)</span>
                  </div>
                </SelectItem>
                <SelectItem value="agency">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>Imobiliária</span>
                  </div>
                </SelectItem>
                <SelectItem value="dynamic">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dinâmico (baseado em relacionamentos)</span>
                  </div>
                </SelectItem>
                <SelectItem value="multiple">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Múltiplos (todos precisam aprovar)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Requisitos para Avançar */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Requisitos para Avançar</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireApproval"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="requireApproval" className="cursor-pointer">
                  Aprovação do responsável necessária
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requireProducts"
                  checked={requireProducts}
                  onChange={(e) => setRequireProducts(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="requireProducts" className="cursor-pointer">
                  Produtos/orçamento adicionados
                </Label>
              </div>

              <div>
                <Label htmlFor="minProgress">Progresso Mínimo (%)</Label>
                <Input
                  id="minProgress"
                  type="number"
                  min="0"
                  max="100"
                  value={minProgress}
                  onChange={(e) => setMinProgress(Number(e.target.value))}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Progresso mínimo necessário para avançar (0 = não exige)
                </p>
              </div>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
