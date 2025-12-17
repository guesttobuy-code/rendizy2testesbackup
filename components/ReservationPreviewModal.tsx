import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Reservation } from '../App';
import { Calendar, User, DollarSign, Users, Moon, Building2, Mail, X } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

interface ReservationPreviewModalProps {
  open: boolean;
  onClose: () => void;
  reservation?: Reservation;
  onOpenDetails: () => void;
}

export function ReservationPreviewModal({
  open,
  onClose,
  reservation,
  onOpenDetails
}: ReservationPreviewModalProps) {
  const navigate = useNavigate();

  if (!reservation) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      airbnb: 'API Airbnb',
      booking: 'API Booking.com',
      direct: 'Reserva Direta',
      decolar: 'API Decolar'
    };
    return labels[platform] || platform;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      pending: 'Pendente',
      blocked: 'Bloqueada',
      maintenance: 'Manutenção'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'text-green-700 bg-green-100',
      pending: 'text-yellow-700 bg-yellow-100',
      blocked: 'text-gray-700 bg-gray-100',
      maintenance: 'text-orange-700 bg-orange-100'
    };
    return colors[status] || 'text-gray-700 bg-gray-100';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center justify-between">
              <span className="text-gray-900">{reservation.id} | {getPlatformLabel(reservation.platform)}</span>
            </div>
          </DialogTitle>
          <DialogDescription>
            Visualização rápida dos detalhes da reserva
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Grid */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Check-in</div>
                <div className="text-gray-900">{formatDate(reservation.checkIn)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Check-out</div>
                <div className="text-gray-900">{formatDate(reservation.checkOut)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Hóspede</div>
                <div className="text-gray-900">{reservation.guestName}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5">•</div>
              <div className="flex-1">
                <div className="text-sm text-gray-600">Status</div>
                <div className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getStatusColor(reservation.status)}`}>
                  {getStatusLabel(reservation.status)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Hóspedes</div>
                <div className="text-gray-900">2 pessoas</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Moon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Noites</div>
                <div className="text-gray-900">{reservation.nights}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Parceiro</div>
                <div className="text-gray-900">{getPlatformLabel(reservation.platform)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Valor</div>
                <div className="text-gray-900">
                  R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-gray-600">E-mail</div>
                <div className="text-orange-600">(1 não enviado)</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => {
                navigate('/reservations', { state: { action: 'viewDetails', reservation } });
                onOpenDetails();
              }}
              className="w-full"
            >
              Abrir Reserva
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
