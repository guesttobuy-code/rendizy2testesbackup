/**
 * RENDIZY - Step 1: Disponibilidade
 * Componente para seleção de datas e visualização de preços
 */

import React from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Star, CalendarDays, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Property } from '../../hooks/useReservationForm';

interface StepAvailabilityProps {
  property: Property | null;
  loadingProperty: boolean;
  checkInDate: Date | undefined;
  checkOutDate: Date | undefined;
  adults: number;
  children: number;
  platform: string;
  nights: number;
  basePrice: number;
  cleaningFee: number;
  subtotal: number;
  total: number;
  onCheckInChange: (date: Date | undefined) => void;
  onCheckOutChange: (date: Date | undefined) => void;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onPlatformChange: (value: string) => void;
  onNext: () => void;
}

export function StepAvailability({
  property,
  loadingProperty,
  checkInDate,
  checkOutDate,
  adults,
  children,
  platform,
  nights,
  basePrice,
  cleaningFee,
  subtotal,
  total,
  onCheckInChange,
  onCheckOutChange,
  onAdultsChange,
  onChildrenChange,
  onPlatformChange,
  onNext
}: StepAvailabilityProps) {
  const [displayMonth, setDisplayMonth] = React.useState(new Date());
  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: checkInDate,
    to: checkOutDate
  });

  const handleDateSelect = (range: any) => {
    if (range?.from) {
      setDateRange({ from: range.from, to: range.to });
      onCheckInChange(range.from);
      onCheckOutChange(range.to);
    }
  };

  const isValid = !!property && !!checkInDate && !!checkOutDate && nights > 0;

  return (
    <div className="space-y-6">
      {/* Property Info */}
      {loadingProperty ? (
        <div className="p-4 border border-gray-200 rounded-lg flex items-center gap-3 animate-pulse">
          <div className="w-20 h-20 bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ) : property ? (
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <img
              src={property.image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=80&h=80&fit=crop'}
              alt={property.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <div className="text-gray-900 mb-1">{property.name}</div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-sm text-gray-500">
                  R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / noite
                </div>
                {cleaningFee > 0 && (
                  <div className="text-sm text-gray-500">
                    + R$ {cleaningFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} limpeza
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">{property.location}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Date Picker - Usando inputs nativos para evitar conflito de Portal */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Selecione o período da reserva</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Check-in</Label>
            <Input
              type="date"
              value={checkInDate ? format(checkInDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value + 'T15:00:00') : undefined;
                onCheckInChange(date);
              }}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Check-out</Label>
            <Input
              type="date"
              value={checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value + 'T11:00:00') : undefined;
                onCheckOutChange(date);
              }}
              min={checkInDate ? format(new Date(checkInDate.getTime() + 86400000), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Price Summary */}
      {nights > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} x {nights} {nights === 1 ? 'noite' : 'noites'}</span>
            <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {cleaningFee > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Taxa de limpeza</span>
              <span>R$ {cleaningFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="pt-2 border-t border-blue-200 flex justify-between font-semibold text-blue-900">
            <span>Total</span>
            <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Guests */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Quantidade de Hóspedes
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-gray-600">Adultos</Label>
            <Input
              type="number"
              min="1"
              value={adults}
              onChange={(e) => onAdultsChange(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-600">Crianças</Label>
            <Input
              type="number"
              min="0"
              value={children}
              onChange={(e) => onChildrenChange(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Platform - Usando select nativo para evitar Portal */}
      <div className="space-y-2">
        <Label>Plataforma</Label>
        <select
          value={platform}
          onChange={(e) => onPlatformChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="direct">Reserva Direta</option>
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking.com</option>
          <option value="decolar">Decolar</option>
        </select>
      </div>

      {/* Next Button */}
      <Button
        onClick={onNext}
        disabled={!isValid}
        className="w-full"
      >
        Avançar para Hóspede
      </Button>
    </div>
  );
}
