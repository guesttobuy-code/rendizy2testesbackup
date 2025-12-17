import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Property } from '../App';
import { Calendar } from 'lucide-react';

interface MinNightsEditModalProps {
  open: boolean;
  onClose: () => void;
  property?: Property;
  startDate?: Date;
  endDate?: Date;
  onSave: (data: { propertyId: string; startDate: Date; endDate: Date; minNights: number }) => void;
}

export function MinNightsEditModal({
  open,
  onClose,
  property,
  startDate,
  endDate,
  onSave
}: MinNightsEditModalProps) {
  const [minNights, setMinNights] = useState(1);

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSave = () => {
    if (!property || !startDate || !endDate) return;
    onSave({
      propertyId: property.id,
      startDate,
      endDate,
      minNights
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar mínimo de noites</DialogTitle>
          <DialogDescription>
            Defina o número mínimo de noites para as datas selecionadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <img
                src={property?.image}
                alt={property?.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <div className="text-gray-900">{property?.name}</div>
                <div className="text-sm text-gray-600">{property?.location}</div>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Período</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1.5">Data inicial</div>
                <div className="px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatDate(startDate)}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1.5">Data final</div>
                <div className="px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatDate(endDate)}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              📊 Total: {calculateDays()} dia(s) serão afetados
            </div>
          </div>

          {/* Min Nights Input */}
          <div className="space-y-2">
            <Label htmlFor="minNights">Mínimo de noites</Label>
            <Input
              id="minNights"
              type="number"
              min="1"
              value={minNights}
              onChange={(e) => setMinNights(parseInt(e.target.value) || 1)}
              className="max-w-xs"
            />
            <p className="text-sm text-gray-600">
              Defina o número mínimo de noites que os hóspedes devem reservar neste período.
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-900">
              <strong>ℹ️ Impacto:</strong> Esta configuração será aplicada para todas as reservas 
              neste período. Reservas já existentes não serão afetadas.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
