import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Moon, Home, Edit2, Loader2 } from 'lucide-react';
import { Property } from '../App';
import { DateRangePicker } from './DateRangePicker';
import { toast } from 'sonner';

interface BulkMinNightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  properties: Property[];
  onSave: (data: { startDate: Date; endDate: Date; minNights: number }) => void | Promise<void>;
}

export function BulkMinNightsModal({ isOpen, onClose, startDate, endDate, properties, onSave }: BulkMinNightsModalProps) {
  const [minNights, setMinNights] = useState('1');
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

  const handleSave = async () => {
    setSaving(true);
    const daysCount = getDaysDiff();
    const minNightsValue = parseInt(minNights);
    
    const toastId = toast.loading(
      `Aplicando mínimo de ${minNightsValue} ${minNightsValue === 1 ? 'noite' : 'noites'} em ${properties.length} propriedades...`,
      { description: `${daysCount} dias serão atualizados. Aguarde...` }
    );
    
    try {
      await onSave({
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        minNights: minNightsValue
      });
      
      toast.success('Mínimo de noites aplicado com sucesso!', {
        id: toastId,
        description: `Mínimo de ${minNightsValue} ${minNightsValue === 1 ? 'noite' : 'noites'} aplicado em ${properties.length} propriedades`
      });
      onClose();
    } catch (error) {
      console.error('Erro ao aplicar mínimo de noites:', error);
      toast.error('Erro ao aplicar mínimo de noites', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setSaving(false);
    }
  };

  const presetValues = [
    { value: 1, label: '1 noite', description: 'Sem mínimo' },
    { value: 2, label: '2 noites', description: 'Final de semana curto' },
    { value: 3, label: '3 noites', description: 'Final de semana longo' },
    { value: 5, label: '5 noites', description: 'Semana útil' },
    { value: 7, label: '7 noites', description: 'Semana completa' },
    { value: 14, label: '14 noites', description: 'Quinzena' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-blue-600" />
            Mínimo de Noites em Lote
          </DialogTitle>
          <DialogDescription>
            Definir mínimo de noites em TODAS as propriedades no período selecionado
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

          {/* Mínimo de noites */}
          <div className="space-y-2">
            <Label htmlFor="minNights">Mínimo de Noites</Label>
            <div className="relative">
              <Input
                id="minNights"
                type="number"
                min="1"
                max="365"
                step="1"
                value={minNights}
                onChange={(e) => setMinNights(e.target.value)}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                {parseInt(minNights || '1') === 1 ? 'noite' : 'noites'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Hóspedes precisarão reservar no mínimo {minNights} {parseInt(minNights || '1') === 1 ? 'noite' : 'noites'}
            </p>
          </div>

          {/* Valores predefinidos */}
          <div className="space-y-2">
            <Label>Valores Rápidos</Label>
            <div className="grid grid-cols-2 gap-2">
              {presetValues.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setMinNights(preset.value.toString())}
                  className={`p-3 border rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition-colors ${
                    parseInt(minNights) === preset.value ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                  }`}
                >
                  <div className="text-gray-900">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Explicação */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-900 mb-2">Como funciona?</div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>✓ Hóspedes só poderão fazer reservas com no mínimo {minNights} {parseInt(minNights || '1') === 1 ? 'noite' : 'noites'}</p>
              <p>✓ Reservas existentes não serão afetadas</p>
              <p>✓ Útil para períodos de alta demanda (feriados, eventos)</p>
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
              ⚠️ Esta configuração será aplicada em <strong>{properties.length} {properties.length === 1 ? 'propriedade selecionada' : 'propriedades selecionadas'}</strong> pelos Filtros Avançados
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
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
