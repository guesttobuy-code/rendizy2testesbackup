/**
 * RENDIZY - Step 3: Confirmação
 * Componente para revisão final e confirmação da reserva
 */

import React from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Property, Guest } from '../../hooks/useReservationForm';

interface StepConfirmationProps {
  property: Property | null;
  selectedGuest: Guest | null;
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
  notes: string;
  sendEmail: boolean;
  blockCalendar: boolean;
  submitting: boolean;
  onNotesChange: (value: string) => void;
  onSendEmailChange: (value: boolean) => void;
  onBlockCalendarChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function StepConfirmation({
  property,
  selectedGuest,
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
  notes,
  sendEmail,
  blockCalendar,
  submitting,
  onNotesChange,
  onSendEmailChange,
  onBlockCalendarChange,
  onSubmit,
  onBack
}: StepConfirmationProps) {
  const platformNames: Record<string, string> = {
    direct: 'Reserva Direta',
    airbnb: 'Airbnb',
    booking: 'Booking.com',
    decolar: 'Decolar'
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 border border-gray-200 rounded-lg space-y-3">
        <h4 className="text-gray-900 font-medium mb-3">Resumo da Reserva</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-[100px]">Imóvel:</span>
            <span className="text-gray-900 font-medium">{property?.name}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-[100px]">Hóspede:</span>
            <span className="text-gray-900 font-medium">
              {selectedGuest?.fullName} ({selectedGuest?.phone})
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-[100px]">Período:</span>
            <span className="text-gray-900 font-medium">
              {checkInDate && format(checkInDate, 'dd/MM/yyyy', { locale: ptBR })} → {' '}
              {checkOutDate && format(checkOutDate, 'dd/MM/yyyy', { locale: ptBR })} {' '}
              ({nights} {nights === 1 ? 'noite' : 'noites'})
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-[100px]">Hóspedes:</span>
            <span className="text-gray-900 font-medium">
              {adults} {adults === 1 ? 'adulto' : 'adultos'}
              {children > 0 && `, ${children} ${children === 1 ? 'criança' : 'crianças'}`}
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 min-w-[100px]">Plataforma:</span>
            <span className="text-gray-900 font-medium">{platformNames[platform]}</span>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="pt-3 border-t border-gray-200 space-y-2 text-sm">
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
          <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          placeholder="Notas sobre a reserva..."
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="email"
            checked={sendEmail}
            onCheckedChange={(checked) => onSendEmailChange(checked as boolean)}
          />
          <Label htmlFor="email" className="cursor-pointer">
            Enviar confirmação por email
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="block"
            checked={blockCalendar}
            onCheckedChange={(checked) => onBlockCalendarChange(checked as boolean)}
          />
          <Label htmlFor="block" className="cursor-pointer">
            Bloquear no calendário
          </Label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Voltar
        </Button>
        <Button onClick={onSubmit} disabled={submitting} className="flex-1">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Criando Reserva...
            </>
          ) : (
            'Criar Reserva'
          )}
        </Button>
      </div>
    </div>
  );
}
