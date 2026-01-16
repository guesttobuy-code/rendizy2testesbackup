import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Property } from '../App';
import { Calendar, Edit2 } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

interface MinNightsEditModalProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
  property?: Property;
  startDate?: Date;
  endDate?: Date;
  onSave: (data: { propertyId: string; startDate: Date; endDate: Date; minNights: number }) => void;
}

export function MinNightsEditModal({
  open,
  onClose,
  propertyId,
  property,
  startDate,
  endDate,
  onSave
}: MinNightsEditModalProps) {
  const [minNights, setMinNights] = useState(1);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startDate || new Date(),
    to: endDate || new Date()
  });

  // Atualizar range quando props mudam
  useEffect(() => {
    if (startDate && endDate) {
      setDateRange({ from: startDate, to: endDate });
    }
  }, [startDate, endDate]);

  // Usar datas editadas ou originais
  const effectiveStartDate = dateRange.from;
  const effectiveEndDate = dateRange.to;

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const calculateDays = () => {
    return Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // 🔒 RENDIZY_STABLE_TAG v1.0.103.600 (2026-01-15): salvar mesmo sem objeto property
  const handleSave = () => {
    const resolvedPropertyId = property?.id || propertyId;
    if (!resolvedPropertyId) return;
    onSave({
      propertyId: resolvedPropertyId,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      minNights
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <div className="text-gray-900">{property?.name || 'Propriedade'}</div>
                <div className="text-sm text-gray-600">{property?.location || '—'}</div>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Período</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDates(!isEditingDates)}
                className="h-7 px-2 text-gray-600 hover:text-gray-900"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                {isEditingDates ? 'Fechar' : 'Editar datas'}
              </Button>
            </div>
            
            {isEditingDates ? (
              <div className="mt-3">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={(newRange) => setDateRange(newRange)}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1.5">Data inicial</div>
                    <div className="px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{formatDate(effectiveStartDate)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1.5">Data final</div>
                    <div className="px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{formatDate(effectiveEndDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  📊 Total: {calculateDays()} dia(s) serão afetados
                </div>
              </>
            )}
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
