import { Reservation } from '../App';

interface ConflictInfo {
  propertyId: string;
  propertyName: string;
  date: string;
  reservations: Reservation[];
}

interface ReservationWithConflict extends Reservation {
  hasConflict?: boolean;
}

/**
 * Detecta conflitos de overbooking (múltiplas reservas na mesma propriedade na mesma data)
 * 
 * Retorna:
 * - Lista de conflitos detectados (para exibir alerta)
 * - Reservas marcadas com flag hasConflict=true
 */
export function detectConflicts(
  reservations: Reservation[],
  properties: Array<{ id: string; name: string }>
): {
  conflicts: ConflictInfo[];
  reservationsWithConflicts: ReservationWithConflict[];
} {
  const conflicts: ConflictInfo[] = [];
  const conflictingReservationIds = new Set<string>();

  // Mapa: propertyId -> data -> array de reservas
  const occupancyMap = new Map<string, Map<string, Reservation[]>>();

  // LÓGICA HOTELEIRA: Check-in ocupa o dia, check-out NÃO ocupa
  // Exemplo: Reserva de 24→26 ocupa dias 24 e 25 apenas
  const getOccupiedDates = (checkIn: Date, checkOut: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(checkIn);
    current.setHours(0, 0, 0, 0);
    
    const end = new Date(checkOut);
    end.setHours(0, 0, 0, 0);
    
    // Itera do check-in até (check-out - 1 dia)
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Construir mapa de ocupação
  for (const reservation of reservations) {
    // Apenas considerar reservas ativas (não canceladas/completadas)
    if (!['pending', 'confirmed', 'checked_in'].includes(reservation.status)) {
      continue;
    }

    const checkIn = new Date(reservation.checkIn);
    const checkOut = new Date(reservation.checkOut);
    const occupiedDates = getOccupiedDates(checkIn, checkOut);

    if (!occupancyMap.has(reservation.propertyId)) {
      occupancyMap.set(reservation.propertyId, new Map());
    }

    const propertyMap = occupancyMap.get(reservation.propertyId)!;

    for (const date of occupiedDates) {
      if (!propertyMap.has(date)) {
        propertyMap.set(date, []);
      }
      propertyMap.get(date)!.push(reservation);
    }
  }

  // Detectar conflitos (2+ reservas na mesma data/propriedade)
  for (const [propertyId, dateMap] of occupancyMap.entries()) {
    for (const [date, reservationsOnDate] of dateMap.entries()) {
      if (reservationsOnDate.length > 1) {
        // CONFLITO DETECTADO!
        const property = properties.find(p => p.id === propertyId);
        const propertyName = property?.name || `Propriedade ${propertyId}`;

        conflicts.push({
          propertyId,
          propertyName,
          date,
          reservations: reservationsOnDate,
        });

        // Marcar todas as reservas como conflitantes
        for (const reservation of reservationsOnDate) {
          conflictingReservationIds.add(reservation.id);
        }
      }
    }
  }

  // Adicionar flag hasConflict às reservas
  const reservationsWithConflicts: ReservationWithConflict[] = reservations.map(reservation => ({
    ...reservation,
    hasConflict: conflictingReservationIds.has(reservation.id),
  }));

  return {
    conflicts,
    reservationsWithConflicts,
  };
}

/**
 * Verifica se uma nova reserva causaria conflito
 */
export function wouldCauseConflict(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  existingReservations: Reservation[],
  excludeReservationId?: string // Para edição de reserva existente
): { hasConflict: boolean; conflictingReservation?: Reservation } {
  const checkInDate = new Date(checkIn);
  checkInDate.setHours(0, 0, 0, 0);
  
  const checkOutDate = new Date(checkOut);
  checkOutDate.setHours(0, 0, 0, 0);

  for (const reservation of existingReservations) {
    // Pular a própria reserva (em caso de edição)
    if (excludeReservationId && reservation.id === excludeReservationId) {
      continue;
    }

    // Apenas considerar reservas ativas na mesma propriedade
    if (
      reservation.propertyId !== propertyId ||
      !['pending', 'confirmed', 'checked_in'].includes(reservation.status)
    ) {
      continue;
    }

    const existingCheckIn = new Date(reservation.checkIn);
    existingCheckIn.setHours(0, 0, 0, 0);
    
    const existingCheckOut = new Date(reservation.checkOut);
    existingCheckOut.setHours(0, 0, 0, 0);

    // LÓGICA HOTELEIRA: Verificar sobreposição
    // Reserva A (24→26) e Reserva B (26→28) NÃO se sobrepõem
    // Reserva A (24→26) e Reserva B (25→27) SE sobrepõem
    const hasOverlap = checkInDate < existingCheckOut && checkOutDate > existingCheckIn;

    if (hasOverlap) {
      return {
        hasConflict: true,
        conflictingReservation: reservation,
      };
    }
  }

  return { hasConflict: false };
}
