/**
 * PROPERTY RESTRICTIONS MODAL
 * Modal para editar restrições (sem check-in, sem check-out, fechado) para uma propriedade específica
 * v1.0.1 - Interface atualizada para compatibilidade com App.tsx
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar, Ban, Lock, XCircle, Trash2 } from 'lucide-react';

interface PropertyRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  startDate: Date;
  endDate: Date;
  currentRestriction?: string | null;
  onSave: (data: { propertyId: string; startDate: Date; endDate: Date; restrictionType: 'no-checkin' | 'no-checkout' | 'closed' | null }) => void;
}

export function PropertyRestrictionsModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  startDate,
  endDate,
  currentRestriction,
  onSave
}: PropertyRestrictionsModalProps) {
  const [restrictionType, setRestrictionType] = useState<'no-checkin' | 'no-checkout' | 'closed' | null>(
    (currentRestriction as any) || 'no-checkin'
  );

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
      restrictionType
    });
    onClose();
  };

  const handleRemove = () => {
    if (!propertyId || !startDate || !endDate) return;
    
    onSave({
      propertyId,
      startDate,
      endDate,
      restrictionType: null
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            Restrições de Reserva
          </DialogTitle>
          <DialogDescription>
            Definir restrições de check-in/check-out para as datas selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-600" />
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

          {/* Tipo de restrição */}
          <div className="space-y-3">
            <Label>Tipo de Restrição</Label>
            <RadioGroup value={restrictionType || ''} onValueChange={(value) => setRestrictionType(value as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="no-checkin" id="no-checkin" />
                <Label htmlFor="no-checkin" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Ban className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="font-medium text-gray-900">Sem Check-in</div>
                    <div className="text-sm text-gray-500">Bloquear entrada de hóspedes nessas datas</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="no-checkout" id="no-checkout" />
                <Label htmlFor="no-checkout" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Sem Check-out</div>
                    <div className="text-sm text-gray-500">Bloquear saída de hóspedes nessas datas</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="closed" id="closed" />
                <Label htmlFor="closed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="font-medium text-gray-900">Fechado</div>
                    <div className="text-sm text-gray-500">Bloquear completamente (entrada e saída)</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Explicação */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-900">O que isso significa?</span>
            </div>
            <div className="text-sm text-gray-600">
              {restrictionType === 'no-checkin' && (
                <p>✓ Hóspedes não poderão fazer check-in nessas datas, mas podem fazer check-out</p>
              )}
              {restrictionType === 'no-checkout' && (
                <p>✓ Hóspedes não poderão fazer check-out nessas datas, mas podem fazer check-in</p>
              )}
              {restrictionType === 'closed' && (
                <p>✓ Propriedade fica completamente indisponível para novas reservas</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {currentRestriction && (
            <Button variant="outline" onClick={handleRemove} className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />
              Remover Restrição
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
            Aplicar Restrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
