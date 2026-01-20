import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Calendar, Ban, Lock, XCircle, Home, Edit2, Loader2 } from 'lucide-react';
import { Property } from '../App';
import { DateRangePicker } from './DateRangePicker';
import { toast } from 'sonner';

interface BulkRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  properties: Property[];
  onSave: (data: { startDate: Date; endDate: Date; restrictionType: 'no-checkin' | 'no-checkout' | 'closed' }) => void | Promise<void>;
}

export function BulkRestrictionsModal({ isOpen, onClose, startDate, endDate, properties, onSave }: BulkRestrictionsModalProps) {
  const [restrictionType, setRestrictionType] = useState<'no-checkin' | 'no-checkout' | 'closed'>('no-checkin');
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startDate,
    to: endDate
  });

  // Atualizar range quando props mudam
  useEffect(() => {
    setDateRange({ from: startDate, to: endDate });
  }, [startDate, endDate]);

  // Usar datas editadas ou originais
  const effectiveStartDate = dateRange.from;
  const effectiveEndDate = dateRange.to;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getDaysDiff = () => {
    const diff = Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  const getRestrictionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'no-checkin': 'Sem Check-in',
      'no-checkout': 'Sem Check-out',
      'closed': 'Fechado'
    };
    return labels[type] || type;
  };

  const handleSave = async () => {
    setSaving(true);
    const daysCount = getDaysDiff();
    
    const toastId = toast.loading(
      `Aplicando restrição "${getRestrictionLabel(restrictionType)}" em ${properties.length} propriedades...`,
      { description: `${daysCount} dias serão atualizados. Aguarde...` }
    );
    
    try {
      await onSave({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        restrictionType
      });
      
      toast.success('Restrição aplicada com sucesso!', {
        id: toastId,
        description: `"${getRestrictionLabel(restrictionType)}" aplicado em ${properties.length} propriedades`
      });
      onClose();
    } catch (error) {
      console.error('Erro ao aplicar restrição:', error);
      toast.error('Erro ao aplicar restrição', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            Restrições em Lote
          </DialogTitle>
          <DialogDescription>
            Aplicar restrições de reserva em TODAS as propriedades no período selecionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Período selecionado */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-900">Período Selecionado</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingDates(!isEditingDates)}
                className="h-7 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                {isEditingDates ? 'Fechar' : 'Editar'}
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
                <div className="text-blue-900">
                  <span>{formatDate(effectiveStartDate)}</span>
                  {getDaysDiff() > 1 && (
                    <>
                      <span className="mx-2">→</span>
                      <span>{formatDate(effectiveEndDate)}</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  {getDaysDiff()} {getDaysDiff() === 1 ? 'dia' : 'dias'}
                </div>
              </>
            )}
          </div>

          {/* Tipo de restrição */}
          <div className="space-y-3">
            <Label>Tipo de Restrição</Label>
            <RadioGroup value={restrictionType} onValueChange={(value) => setRestrictionType(value as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="no-checkin" id="no-checkin" />
                <Label htmlFor="no-checkin" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Ban className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-gray-900">Sem Check-in</div>
                    <div className="text-sm text-gray-500">Bloquear entrada de hóspedes nessas datas</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="no-checkout" id="no-checkout" />
                <Label htmlFor="no-checkout" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-gray-900">Sem Check-out</div>
                    <div className="text-sm text-gray-500">Bloquear saída de hóspedes nessas datas</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="closed" id="closed" />
                <Label htmlFor="closed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <div className="text-gray-900">Fechado</div>
                    <div className="text-sm text-gray-500">Bloquear completamente (entrada e saída)</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Explicação */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <span className="text-gray-900">O que isso significa?</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {restrictionType === 'no-checkin' && (
                <p>✓ Hóspedes não poderão fazer check-in nessas datas, mas podem fazer check-out</p>
              )}
              {restrictionType === 'no-checkout' && (
                <p>✓ Hóspedes não poderão fazer check-out nessas datas, mas podem fazer check-in</p>
              )}
              {restrictionType === 'closed' && (
                <p>✓ Propriedades ficam completamente indisponíveis para novas reservas</p>
              )}
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
              ⚠️ Esta restrição será aplicada em <strong>{properties.length} {properties.length === 1 ? 'propriedade selecionada' : 'propriedades selecionadas'}</strong> pelos Filtros Avançados
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              `Aplicar em ${properties.length} ${properties.length === 1 ? 'Propriedade' : 'Propriedades'}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
