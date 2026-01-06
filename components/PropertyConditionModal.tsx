/**
 * PROPERTY CONDITION MODAL
 * Modal para editar condição de preço (desconto/acréscimo) para uma propriedade específica
 * v1.0.1 - Interface atualizada para compatibilidade com App.tsx
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar, Percent, TrendingUp, TrendingDown } from 'lucide-react';

interface PropertyConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  startDate: Date;
  endDate: Date;
  onSave: (data: { propertyId: string; startDate: Date; endDate: Date; type: 'increase' | 'decrease'; percentage: number }) => void;
}

export function PropertyConditionModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  startDate,
  endDate,
  onSave
}: PropertyConditionModalProps) {
  const [type, setType] = useState<'increase' | 'decrease'>('decrease');
  const [percentage, setPercentage] = useState('10');

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysDiff = () => {
    if (!startDate || !endDate) return 0;
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSave = () => {
    if (!propertyId || !startDate || !endDate) return;
    
    onSave({
      propertyId,
      startDate,
      endDate,
      type,
      percentage: parseFloat(percentage) || 0
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-orange-600" />
            Condição de Preço
          </DialogTitle>
          <DialogDescription>
            Aplicar desconto ou acréscimo para as datas selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Percent className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{propertyName}</div>
                <div className="text-sm text-gray-500">ID: {propertyId}</div>
              </div>
            </div>
          </div>

          {/* Período selecionado */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900">Período Selecionado</span>
            </div>
            <div className="text-blue-900">
              <span>{formatDate(startDate)}</span>
              {getDaysDiff() > 1 && (
                <>
                  <span className="mx-2">→</span>
                  <span>{formatDate(endDate)}</span>
                </>
              )}
            </div>
            <div className="text-sm text-blue-700 mt-1">
              📊 Total: {getDaysDiff()} {getDaysDiff() === 1 ? 'dia' : 'dias'} serão afetados
            </div>
          </div>

          {/* Tipo de condição */}
          <div className="space-y-3">
            <Label>Tipo de Condição</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as 'increase' | 'decrease')}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="decrease" id="decrease" />
                <Label htmlFor="decrease" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">Desconto</div>
                    <div className="text-sm text-gray-500">Reduzir preço base</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="increase" id="increase" />
                <Label htmlFor="increase" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="font-medium text-gray-900">Acréscimo</div>
                    <div className="text-sm text-gray-500">Aumentar preço base</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Porcentagem */}
          <div className="space-y-2">
            <Label>Porcentagem</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-24"
              />
              <span className="text-gray-600">%</span>
            </div>
            <p className="text-sm text-gray-500">
              {type === 'decrease' 
                ? `Preço será reduzido em ${percentage}%`
                : `Preço será aumentado em ${percentage}%`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
            Aplicar Condição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
