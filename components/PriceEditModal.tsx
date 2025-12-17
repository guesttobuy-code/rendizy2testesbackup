import React, { useState, useEffect } from 'react';
import { Property, PriceRule } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PriceEditModalProps {
  open: boolean;
  propertyId?: string;
  property?: Property;
  startDate?: Date;
  endDate?: Date;
  onClose: () => void;
  onSave: (rule: Omit<PriceRule, 'id'>) => void;
}

interface Platform {
  id: string;
  name: string;
  commission: number; // Percentage
  color: string;
}

const platforms: Platform[] = [
  { id: 'base', name: 'Base', commission: 0, color: 'bg-gray-100' },
  { id: 'tarifa7', name: 'Tarifa #7', commission: 15, color: 'bg-blue-100' },
  { id: 'tarifa9', name: 'Tarifa #9', commission: 20, color: 'bg-purple-100' },
  { id: 'tarifa2b', name: 'Tarifa 2B', commission: 25, color: 'bg-orange-100' }
];

const WEEKDAYS = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' }
];

export function PriceEditModal({ 
  open, 
  propertyId, 
  property,
  startDate, 
  endDate, 
  onClose, 
  onSave 
}: PriceEditModalProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startDate);
  const [dateTo, setDateTo] = useState<Date | undefined>(endDate);
  const [basePrice, setBasePrice] = useState<number>(300);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4]); // Mon-Thu by default
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    if (startDate) setDateFrom(startDate);
    if (endDate) setDateTo(endDate);
  }, [startDate, endDate]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const toggleAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  const calculatePlatformPrice = (base: number, commission: number): number => {
    return base * (1 + commission / 100);
  };

  const handleSave = () => {
    if (!propertyId || !dateFrom || !dateTo) return;

    onSave({
      propertyId,
      startDate: dateFrom,
      endDate: dateTo,
      daysOfWeek: selectedDays,
      basePrice
    });
  };

  const calculateAffectedDays = () => {
    if (!dateFrom || !dateTo) return 0;
    
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    let count = 0;
    
    const current = new Date(start);
    while (current <= end) {
      if (selectedDays.includes(current.getDay())) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar preços de diárias</DialogTitle>
          <DialogDescription>
            Defina preços base para diferentes dias da semana em um período específico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property info */}
          {property && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <img
                src={property.image}
                alt={property.name}
                className="w-12 h-12 rounded object-cover"
              />
              <div>
                <div className="text-gray-900">{property.name}</div>
                <div className="text-gray-500 text-sm">{property.location}</div>
              </div>
            </div>
          )}

          {/* Date range selection */}
          <div className="space-y-4">
            <Label>Período</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Data inicial</Label>
                <Popover open={showDatePicker === 'from'} onOpenChange={(open) => setShowDatePicker(open ? 'from' : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        setShowDatePicker(null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm text-gray-600">Data final</Label>
                <Popover open={showDatePicker === 'to'} onOpenChange={(open) => setShowDatePicker(open ? 'to' : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        setShowDatePicker(null);
                      }}
                      initialFocus
                      disabled={(date) => dateFrom ? date < dateFrom : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Days of week selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Dias da semana</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllDays}
                className="text-xs"
              >
                {selectedDays.length === 7 ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-center
                    ${selectedDays.includes(day.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-xs">{day.label}</div>
                  <div className={`mt-1 w-4 h-4 mx-auto rounded border ${
                    selectedDays.includes(day.value)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedDays.includes(day.value) && (
                      <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-600 flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Dias selecionados:</strong>{' '}
                {selectedDays.length === 0 ? 'Nenhum' : 
                 selectedDays.length === 7 ? 'Todos os dias' :
                 selectedDays.map(d => WEEKDAYS[d].label).join(', ')}
                {dateFrom && dateTo && selectedDays.length > 0 && (
                  <div className="mt-1">
                    <strong>Total:</strong> {calculateAffectedDays()} dia(s) serão afetados
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Base price */}
          <div className="space-y-2">
            <Label>Preço base (BRL)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                className="pl-10"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Platform prices preview */}
          <div className="space-y-3">
            <Label>Impacto nas plataformas</Label>
            
            <div className="text-xs text-gray-600 flex items-start gap-2 mb-3">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <p>
                Para aplicar esta ação com um dia da semana, selecione um período acima de 14 
                dias nas datas de semana desejadas
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {platforms.map((platform) => {
                const finalPrice = calculatePlatformPrice(basePrice, platform.commission);
                
                return (
                  <div
                    key={platform.id}
                    className={`p-3 rounded-lg border ${platform.color}`}
                  >
                    <div className="text-xs text-gray-600 mb-1">{platform.name}</div>
                    <div className="text-gray-900 mb-1">
                      R$ {finalPrice.toFixed(2)}
                    </div>
                    {platform.commission > 0 && (
                      <div className="text-xs text-gray-500">
                        +{platform.commission}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detailed breakdown */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="text-sm text-gray-700">Cálculo detalhado:</div>
              {platforms.slice(1).map((platform) => {
                const finalPrice = calculatePlatformPrice(basePrice, platform.commission);
                const commission = finalPrice - basePrice;
                
                return (
                  <div key={platform.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{platform.name}:</span>
                    <span className="text-gray-900">
                      R$ {basePrice.toFixed(2)} + R$ {commission.toFixed(2)} ({platform.commission}%) = <strong>R$ {finalPrice.toFixed(2)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!dateFrom || !dateTo || selectedDays.length === 0}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
