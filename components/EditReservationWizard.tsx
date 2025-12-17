import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit, AlertCircle } from 'lucide-react';
import { Reservation } from '../App';
import { toast } from 'sonner';

interface EditReservationWizardProps {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | undefined;
  onComplete: (data: any) => void;
}

export function EditReservationWizard({
  open,
  onClose,
  reservation,
  onComplete
}: EditReservationWizardProps) {
  const [step, setStep] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [totalPrice, setTotalPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    if (reservation) {
      setGuestName(reservation.guestName);
      setCheckIn(new Date(reservation.checkIn));
      setCheckOut(new Date(reservation.checkOut));
      setTotalPrice(reservation.price);
    }
  }, [reservation]);

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const pricePerNight = nights > 0 ? totalPrice / nights : 0;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    onComplete({
      reservationId: reservation.id,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      totalPrice,
      notes,
      sendEmail
    });
    
    toast.success('Reserva atualizada!', {
      description: `Alterações salvas para ${guestName}`
    });
    
    onClose();
  };

  const adjustCheckIn = (days: number) => {
    const newDate = new Date(checkIn);
    newDate.setDate(newDate.getDate() + days);
    if (newDate < checkOut) {
      setCheckIn(newDate);
    }
  };

  const adjustCheckOut = (days: number) => {
    const newDate = new Date(checkOut);
    newDate.setDate(newDate.getDate() + days);
    if (newDate > checkIn) {
      setCheckOut(newDate);
    }
  };

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-500" />
            Editar Reserva #{reservation.id.toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Altere os dados da reserva existente
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors
                ${step >= s ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}
              `}>
                {s}
              </div>
              {s < 3 && (
                <div className={`
                  flex-1 h-1 mx-2 transition-colors
                  ${step > s ? 'bg-blue-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Hóspede */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2 text-blue-900">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Editando dados do hóspede</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Alterações serão refletidas em toda a reserva
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="guestName">Nome do Hóspede *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label htmlFor="guestEmail">E-mail</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                />
              </div>

              <div>
                <Label htmlFor="guestPhone">Telefone</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+55 (00) 00000-0000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Período */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">⚠️ Atenção ao alterar datas</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Verifique se as novas datas não conflitam com outras reservas
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Check-in</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{formatDate(checkIn)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustCheckIn(-1)}
                      className="flex-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> -1 dia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustCheckIn(1)}
                      className="flex-1"
                    >
                      +1 dia <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Check-out</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">{formatDate(checkOut)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustCheckOut(-1)}
                      className="flex-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> -1 dia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => adjustCheckOut(1)}
                      className="flex-1"
                    >
                      +1 dia <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total de noites:</span>
                <span className="font-medium">{nights} {nights === 1 ? 'noite' : 'noites'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Valor */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="totalPrice">Valor Total</Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <Input
                  id="totalPrice"
                  type="number"
                  step="0.01"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(parseFloat(e.target.value) || 0)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Valor por noite: R$ {pricePerNight.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Observações sobre a alteração</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva o motivo da alteração..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <label htmlFor="sendEmail" className="text-sm cursor-pointer">
                Enviar e-mail de confirmação para o hóspede
              </label>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Resumo das Alterações</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-800">Hóspede:</span>
                  <span className="text-blue-900 font-medium">{guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Período:</span>
                  <span className="text-blue-900 font-medium">
                    {formatDate(checkIn)} → {formatDate(checkOut)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-800">Noites:</span>
                  <span className="text-blue-900 font-medium">{nights}</span>
                </div>
                <div className="border-t border-blue-200 my-2" />
                <div className="flex justify-between">
                  <span className="text-blue-800">Valor Total:</span>
                  <span className="text-lg text-blue-900 font-medium">
                    R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 1 ? onClose : handleBack}>
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500 self-center">
              Passo {step} de 3
            </span>
            {step < 3 ? (
              <Button onClick={handleNext} disabled={step === 1 && !guestName.trim()}>
                Próximo
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={!guestName.trim()}>
                Salvar Alterações
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
