import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar, Percent, TrendingUp, TrendingDown, Home } from 'lucide-react';
import { Property } from '../App';

interface BulkPriceConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  properties: Property[];
  onSave: (data: { startDate: Date; endDate: Date; type: 'increase' | 'decrease'; percentage: number }) => void;
}

export function BulkPriceConditionModal({ isOpen, onClose, startDate, endDate, properties, onSave }: BulkPriceConditionModalProps) {
  const [type, setType] = useState<'increase' | 'decrease'>('decrease');
  const [percentage, setPercentage] = useState('10');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getDaysDiff = () => {
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  const handleSave = () => {
    onSave({
      startDate,
      endDate,
      type,
      percentage: parseFloat(percentage)
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-orange-600" />
            Condição de Preço em Lote
          </DialogTitle>
          <DialogDescription>
            Aplicar desconto ou acréscimo em TODAS as propriedades no período selecionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
              {getDaysDiff()} {getDaysDiff() === 1 ? 'dia' : 'dias'}
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
                    <div className="text-gray-900">Desconto</div>
                    <div className="text-sm text-gray-500">Reduzir preços em todas as propriedades</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="increase" id="increase" />
                <Label htmlFor="increase" className="flex items-center gap-2 cursor-pointer flex-1">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-gray-900">Acréscimo</div>
                    <div className="text-sm text-gray-500">Aumentar preços em todas as propriedades</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Percentual */}
          <div className="space-y-2">
            <Label htmlFor="percentage">Percentual (%)</Label>
            <div className="relative">
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              {type === 'decrease' ? 'Desconto' : 'Acréscimo'} de {percentage}% será aplicado em todas as propriedades
            </p>
          </div>

          {/* Preview */}
          <div className={`p-4 rounded-lg border ${type === 'decrease' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="text-sm mb-2">
              <span className="text-gray-600">Exemplo de aplicação:</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Preço original: R$ 500</span>
                <span className={type === 'decrease' ? 'text-green-700' : 'text-orange-700'}>
                  → R$ {type === 'decrease' 
                    ? (500 - (500 * parseFloat(percentage || '0') / 100)).toFixed(2)
                    : (500 + (500 * parseFloat(percentage || '0') / 100)).toFixed(2)
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Preço original: R$ 800</span>
                <span className={type === 'decrease' ? 'text-green-700' : 'text-orange-700'}>
                  → R$ {type === 'decrease' 
                    ? (800 - (800 * parseFloat(percentage || '0') / 100)).toFixed(2)
                    : (800 + (800 * parseFloat(percentage || '0') / 100)).toFixed(2)
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Propriedades Afetadas */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900">
                Propriedades Selecionadas ({properties.length})
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {properties.map((property) => (
                <div key={property.id} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  <span className="text-blue-900">{property.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Esta alteração será aplicada em <strong>{properties.length} {properties.length === 1 ? 'propriedade selecionada' : 'propriedades selecionadas'}</strong> pelos Filtros Avançados
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
            Aplicar em {properties.length} {properties.length === 1 ? 'Propriedade' : 'Propriedades'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
