import React from 'react';
import { Reservation } from '../App';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ReservationCardProps {
  reservation: Reservation & { hasConflict?: boolean };
  days: number;
  hasAdjacentNext?: boolean;
  hasAdjacentPrev?: boolean;
  stackIndex?: number; // Índice de empilhamento (0, 1, 2, ...) para reservas sobrepostas
  totalStacked?: number; // Total de reservas empilhadas na mesma célula
}

// Ícones das plataformas como SVG inline (novo design)
const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'airbnb') {
    return (
      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
          <path d="M16 1.5C11.7 1.5 8.2 4.4 7.2 8.3c-.3 1.2-.3 2.4.2 3.5.9 2.4 3.3 4.4 5.7 6.4.7.6 1.5 1.1 2.2 1.6.7-.5 1.5-1 2.2-1.6 2.4-2 4.8-4 5.7-6.4.5-1.1.5-2.3.2-3.5-1-3.9-4.5-6.8-8.7-6.8zm0 10.8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="#FF5A5F"/>
        </svg>
      </div>
    );
  }
  
  if (platform === 'booking') {
    return (
      <div className="w-5 h-5 bg-[#003580] rounded flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">B</span>
      </div>
    );
  }
  
  if (platform === 'decolar') {
    return (
      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF6E00">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
        </svg>
      </div>
    );
  }
  
  // Direct booking - R de Rendizy
  return (
    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-[#006A72] text-xs font-bold">R</span>
    </div>
  );
};

const getPlatformInfo = (platform: string) => {
  const info: Record<string, { name: string }> = {
    airbnb: { name: 'Airbnb' },
    booking: { name: 'Booking.com' },
    direct: { name: 'Reserva Direta' },
    decolar: { name: 'Decolar' }
  };
  return info[platform] || info.direct;
};

const getStatusInfo = (status: string) => {
  const info: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmada', color: 'bg-green-500' },
    pending: { label: 'Pendente', color: 'bg-yellow-500' },
    blocked: { label: 'Bloqueado', color: 'bg-gray-500' },
    maintenance: { label: 'Manutenção', color: 'bg-red-500' }
  };
  return info[status] || info.confirmed;
};

export function ReservationCard({ 
  reservation, 
  days, 
  hasAdjacentNext = false, 
  hasAdjacentPrev = false,
  stackIndex = 0,
  totalStacked = 1
}: ReservationCardProps) {
  const platformInfo = getPlatformInfo(reservation.platform);
  const statusInfo = getStatusInfo(reservation.status);
  
  // CONCEITO DE HORAS: Cada célula = 80px = 24 horas
  // Check-in: meio-dia (~14h) = 40px (metade da célula)
  // Check-out: meio-dia (~11h) = 40px (metade da célula)
  // 
  // Exemplo: 3 NOITES = 4 CÉLULAS
  // - Left: 40px (meio da célula de check-in)
  // - Width: 3 × 80 = 240px - 6px (gap para separação visual)
  // - Gap de 6px cria espaço entre reservas adjacentes
  const width = (days * 80) - 6; // 6px gap para separação visual
  
  // Determine border radius based on adjacent reservations
  const getBorderRadius = () => {
    if (hasAdjacentPrev && hasAdjacentNext) return '0px'; // No rounded corners
    if (hasAdjacentPrev) return '0 8px 8px 0'; // Round only right side
    if (hasAdjacentNext) return '8px 0 0 8px'; // Round only left side
    return '8px'; // Round all corners
  };
  
  // Definir cor de fundo baseada no status e conflitos
  const getBackgroundColor = () => {
    // REGRA MESTRA: CONFLITO = VERMELHO (prioridade máxima)
    if (reservation.hasConflict) return '#DC2626'; // Vermelho escuro para overbooking
    if (reservation.status === 'blocked') return '#FF6B6B'; // Vermelho para bloqueado
    if (reservation.status === 'maintenance') return '#FFA500'; // Laranja para manutenção
    return '#006A72'; // Azul padrão para reservas confirmadas/pendentes
  };
  
  // Calcular altura e posição vertical quando há empilhamento
  const getVerticalPosition = () => {
    if (totalStacked === 1) return { top: '4px', height: 'calc(100% - 8px)' };
    
    // Altura disponível: 48px (h-12) - 8px (padding top/bottom) = 40px
    // Gap entre cards: 2px
    const availableHeight = 40;
    const totalGap = (totalStacked - 1) * 2;
    const cardHeight = (availableHeight - totalGap) / totalStacked;
    const topPosition = 4 + stackIndex * (cardHeight + 2);
    
    return {
      top: `${topPosition}px`,
      height: `${cardHeight}px`
    };
  };
  
  const verticalPos = getVerticalPosition();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <div
          className={`absolute px-2 py-1 flex items-center gap-2 transition-all hover:shadow-lg shadow-md text-white z-10 ${
            reservation.hasConflict ? 'ring-4 ring-red-500 ring-opacity-50 animate-pulse' : ''
          }`}
          style={{ 
            left: '40px', // SEMPRE no meio da célula (check-in ~14h)
            width: `${width}px`,
            top: verticalPos.top,
            height: verticalPos.height,
            borderRadius: getBorderRadius(),
            backgroundColor: getBackgroundColor()
          }}
        >
          <TooltipTrigger asChild>
            <div className="absolute inset-0 cursor-pointer z-20" />
          </TooltipTrigger>
          
          <PlatformIcon platform={reservation.platform} />
          
          <div className="flex-1 min-w-0">
            {/* Código curto da reserva */}
            {totalStacked === 1 && (
              <div className="text-[9px] opacity-70 font-mono truncate">
                {reservation.id}
              </div>
            )}
            <div className={`truncate font-medium ${totalStacked > 1 ? 'text-[11px]' : 'text-xs'}`}>
              {reservation.guestName}
            </div>
            {reservation.status !== 'maintenance' && totalStacked === 1 && (
              <div className="text-[10px] opacity-90 truncate">
                {days} {days === 1 ? 'noite' : 'noites'}
              </div>
            )}
          </div>
        </div>
        
        <TooltipContent className="max-w-xs" side="top">
          <div className="space-y-2">
            {/* Código da Reserva - Destaque */}
            <div className="bg-blue-50 px-3 py-2 rounded border-l-4 border-blue-500">
              <div className="text-xs text-blue-600 mb-1 uppercase tracking-wide">
                Código da Reserva
              </div>
              <div className="font-mono text-gray-900 select-all" style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px' }}>
                {reservation.id}
              </div>
            </div>
            
            <div>
              <div className="text-sm">
                <strong>{reservation.guestName}</strong>
              </div>
              <div className="text-xs text-gray-500">
                {platformInfo.name}
              </div>
            </div>
            
            <div className="text-xs space-y-1">
              <div>
                <strong>Check-in:</strong>{' '}
                {new Date(reservation.checkIn).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <strong>Check-out:</strong>{' '}
                {new Date(reservation.checkOut).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <strong>Noites:</strong> {reservation.nights}
              </div>
              {reservation.status !== 'maintenance' && (
                <div>
                  <strong>Valor:</strong> R$ {reservation.price.toFixed(2)}
                </div>
              )}
              <div className="flex items-center gap-1">
                <strong>Status:</strong>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statusInfo.color} text-white`}>
                  {statusInfo.label}
                </span>
              </div>
              {reservation.hasConflict && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-900">
                  <div className="flex items-center gap-1">
                    <strong>⚠️ OVERBOOKING DETECTADO</strong>
                  </div>
                  <div className="text-xs mt-1">
                    Esta reserva está sobreposta a outra(s) reserva(s) na mesma propriedade.
                  </div>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
