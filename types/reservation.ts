/**
 * Reservation Type - Single Source of Truth
 * Unified interface combining API and App requirements
 * 
 * @version 1.0.103.401
 * @date 2025-12-18
 */

export interface Reservation {
  // Identificadores
  id: string;
  propertyId: string;
  guestId: string;
  guestName: string;        // Enriquecido via JOIN ou frontend
  
  // Datas (Date no frontend após parse, string na API)
  checkIn: Date | string;
  checkOut: Date | string;
  nights: number;
  
  // Hóspedes
  guests: {
    adults: number;
    children: number;
    infants: number;
    pets: number;
    total: number;
  };
  
  // Precificação
  pricing: {
    pricePerNight: number;
    baseTotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    discount: number;
    total: number;
    currency: string;
    appliedTier?: string;
  };
  
  // Compatibilidade com versão antiga do App.tsx
  price?: number;  // Alias para pricing.total (deprecated)
  
  // Status e Plataforma
  status: 'confirmed' | 'pending' | 'blocked' | 'maintenance' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  platform: 'airbnb' | 'booking' | 'decolar' | 'direct' | 'other';
  externalId?: string;
  externalUrl?: string;
  
  // Pagamento
  payment: {
    status: string;
    method?: string;
    transactionId?: string;
    paidAt?: string;
    refundedAt?: string;
  };
  
  // Comunicação
  notes?: string;
  internalComments?: string;
  specialRequests?: string;
  
  // Check-in/out
  checkInTime?: string;
  checkOutTime?: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  
  // Cancelamento
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  
  // Metadata
  createdAt: string;
  // Data de criação na plataforma de origem (ex: StaysNet) quando disponível
  sourceCreatedAt?: string;
  updatedAt: string;
  createdBy: string;
  confirmedAt?: string;
  
  // Runtime (frontend only)
  hasConflict?: boolean;
}
