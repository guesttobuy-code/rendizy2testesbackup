import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { AlertCircle, XCircle } from 'lucide-react';
import { Reservation } from '../App';
import { toast } from 'sonner';

interface CancelReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation;
  onCancel: (data: CancelReservationData) => void;
}

export interface CancelReservationData {
  reservationId: string;
  reason: string;
  customReason?: string;
  notifyGuest: boolean;
  releaseDates: boolean;
  refundAmount?: number;
}

export function CancelReservationModal({
  isOpen,
  onClose,
  reservation,
  onCancel
}: CancelReservationModalProps) {
  const [reason, setReason] = useState('client_requested');
  const [customReason, setCustomReason] = useState('');
  const [notifyGuest, setNotifyGuest] = useState(true);
  const [releaseDates, setReleaseDates] = useState(true);

  if (!reservation) return null;

  const checkIn = new Date(reservation.checkIn);
  const today = new Date();
  const daysUntilCheckIn = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Calcula reembolso baseado na política
  let refundPercentage = 0;
  let policyText = '';

  if (daysUntilCheckIn > 30) {
    refundPercentage = 100;
    policyText = 'Reembolso integral (mais de 30 dias)';
  } else if (daysUntilCheckIn >= 7) {
    refundPercentage = 50;
    policyText = '50% de reembolso (7-30 dias)';
  } else {
    refundPercentage = 0;
    policyText = 'Sem reembolso (menos de 7 dias)';
  }

  const refundAmount = (reservation.price * refundPercentage) / 100;

  const handleConfirmCancel = () => {
    const data: CancelReservationData = {
      reservationId: reservation.id,
      reason,
      customReason: reason === 'other' ? customReason : undefined,
      notifyGuest,
      releaseDates,
      refundAmount
    };

    onCancel(data);
    
    toast.success('Reserva cancelada com sucesso!', {
      description: `Reembolso: R$ ${refundAmount.toFixed(2)} (${refundPercentage}%)`
    });

    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Cancelar Reserva
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação cancelará a reserva permanentemente
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-900 font-medium">
                  ⚠️ Atenção: Esta ação não pode ser desfeita
                </p>
                <p className="text-sm text-red-800 mt-1">
                  Certifique-se antes de confirmar o cancelamento
                </p>
              </div>
            </div>
          </div>

          {/* Reservation Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Reserva:</span>
                <span>{reservation.id}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Hóspede:</span>
                <span>{reservation.guestName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Período:</span>
                <span>
                  {checkIn.toLocaleDateString('pt-BR')} - {new Date(reservation.checkOut).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-gray-500">({reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'})</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <span className="font-medium">Valor:</span>
                <span>R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Cancellation Reason */}
          <div>
            <Label className="text-gray-900 mb-3 block">Motivo do cancelamento *</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="client_requested" id="client_requested" />
                  <label htmlFor="client_requested" className="text-sm cursor-pointer">
                    Cliente solicitou cancelamento
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="property_issue" id="property_issue" />
                  <label htmlFor="property_issue" className="text-sm cursor-pointer">
                    Problema no imóvel (manutenção, danos)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overbooking" id="overbooking" />
                  <label htmlFor="overbooking" className="text-sm cursor-pointer">
                    Conflito de reservas / Overbooking
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="payment_failed" id="payment_failed" />
                  <label htmlFor="payment_failed" className="text-sm cursor-pointer">
                    Falha no pagamento
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <label htmlFor="other" className="text-sm cursor-pointer">
                    Outro motivo
                  </label>
                </div>
              </div>
            </RadioGroup>

            {reason === 'other' && (
              <div className="mt-3">
                <Textarea
                  placeholder="Descreva o motivo do cancelamento..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <div className="border-t pt-6" />

          {/* Refund Policy */}
          <div>
            <h3 className="text-gray-900 mb-3">💰 Política de Reembolso</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-900">Valor pago:</span>
                  <span className="text-sm text-blue-900">
                    R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-900">Política aplicável:</span>
                  <span className="text-sm text-blue-900 font-medium">{policyText}</span>
                </div>
                <div className="border-t border-blue-200 my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900">Valor do reembolso:</span>
                  <span className="text-lg font-medium text-blue-900">
                    R$ {refundAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <p>• Reembolso integral: cancelamento com mais de 30 dias de antecedência</p>
              <p>• 50% de reembolso: cancelamento entre 7-30 dias de antecedência</p>
              <p>• Sem reembolso: cancelamento com menos de 7 dias de antecedência</p>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={notifyGuest}
                onCheckedChange={(checked) => setNotifyGuest(checked as boolean)}
              />
              <label
                htmlFor="notify"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Notificar hóspede por e-mail sobre o cancelamento
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="release"
                checked={releaseDates}
                onCheckedChange={(checked) => setReleaseDates(checked as boolean)}
              />
              <label
                htmlFor="release"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Liberar datas no calendário para novas reservas
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel onClick={onClose}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmCancel}
            disabled={reason === 'other' && !customReason.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            Confirmar Cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
