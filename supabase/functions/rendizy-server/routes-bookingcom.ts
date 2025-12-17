/**
 * RENDIZY - Booking.com Backend Routes
 * 
 * Rotas para gerenciar integração com Booking.com
 * Importa reservas, exporta preços e disponibilidade
 * 
 * @version 1.0.76
 * @date 2025-10-28
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

interface BookingComReservation {
  reservationId: string;
  hotelId: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface RoomRate {
  roomId: string;
  date: string;
  price: number;
  currency: string;
  minStay?: number;
  maxStay?: number;
}

interface RoomAvailability {
  roomId: string;
  date: string;
  available: number;
  status: 'open' | 'closed';
}

export const bookingcomRoutes = new Hono();

/**
 * POST /bookingcom/import-reservation
 * Importa uma reserva do Booking.com para RENDIZY
 */
bookingcomRoutes.post('/import-reservation', async (c) => {
  try {
    const reservation: BookingComReservation = await c.req.json();

    console.log('[Booking.com Import] Importing reservation:', reservation.reservationId);

    // Verificar se já existe
    const existingKey = `bookingcom_reservation_${reservation.reservationId}`;
    const existing = await kv.get(existingKey);

    if (existing) {
      console.log('[Booking.com Import] Reservation already exists, updating...');
    }

    // Criar/atualizar hóspede
    const guestKey = `guest_${reservation.guestEmail.replace(/[@.]/g, '_')}`;
    await kv.set(guestKey, {
      name: reservation.guestName,
      email: reservation.guestEmail,
      phone: reservation.guestPhone,
      source: 'bookingcom',
      createdAt: new Date().toISOString(),
    });

    console.log('[Booking.com Import] Guest saved:', guestKey);

    // Buscar mapeamento de propriedade
    const mappingKey = `bookingcom_mapping_${reservation.hotelId}`;
    const mapping = await kv.get(mappingKey);

    if (!mapping) {
      throw new Error(`No property mapping found for Booking.com Hotel ID: ${reservation.hotelId}`);
    }

    const rendizzyPropertyId = mapping.rendizzyPropertyId;

    // Criar reserva no RENDIZY
    const reservationKey = `reservation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rendizzyReservation = {
      id: reservationKey,
      propertyId: rendizzyPropertyId,
      accommodationId: reservation.roomId, // Precisa mapear
      guestKey,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail,
      guestPhone: reservation.guestPhone,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      adults: reservation.adults,
      children: reservation.children,
      totalPrice: reservation.totalPrice,
      currency: reservation.currency,
      status: 'confirmed',
      source: 'bookingcom',
      externalId: reservation.reservationId,
      createdAt: reservation.createdAt,
      importedAt: new Date().toISOString(),
    };

    await kv.set(reservationKey, rendizzyReservation);
    await kv.set(existingKey, rendizzyReservation); // Índice por ID Booking.com

    console.log('[Booking.com Import] ✅ Reservation imported:', reservationKey);

    // Bloquear datas no calendário
    const checkInDate = new Date(reservation.checkIn);
    const checkOutDate = new Date(reservation.checkOut);
    const daysDiff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      const calendarKey = `calendar_${rendizzyPropertyId}_${dateKey}`;
      await kv.set(calendarKey, {
        date: dateKey,
        propertyId: rendizzyPropertyId,
        status: 'booked',
        reservationId: reservationKey,
        source: 'bookingcom',
        updatedAt: new Date().toISOString(),
      });
    }

    console.log('[Booking.com Import] ✅ Calendar blocked for', daysDiff, 'days');

    return c.json({
      success: true,
      message: 'Reservation imported successfully',
      reservationId: reservationKey,
      externalId: reservation.reservationId,
    });

  } catch (error: any) {
    console.error('[Booking.com Import] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /bookingcom/get-prices
 * Retorna preços do RENDIZY para enviar ao Booking.com
 */
bookingcomRoutes.get('/get-prices', async (c) => {
  try {
    console.log('[Booking.com Export] Fetching prices to push...');

    // Buscar todas as propriedades com mapeamento ativo
    const mappingsPrefix = 'bookingcom_mapping_';
    const mappings = await kv.getByPrefix(mappingsPrefix);

    const allRates: RoomRate[] = [];

    for (const mapping of mappings) {
      if (!mapping.enabled) continue;

      const propertyId = mapping.rendizzyPropertyId;
      const hotelId = mapping.bookingComHotelId;

      // Buscar preços dos próximos 365 dias
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];

        const priceKey = `price_${propertyId}_${dateKey}`;
        const priceData = await kv.get(priceKey);

        if (priceData) {
          allRates.push({
            roomId: hotelId, // Simplificado - precisa mapear acomodações
            date: dateKey,
            price: priceData.price || 100,
            currency: priceData.currency || 'BRL',
            minStay: priceData.minNights || 1,
          });
        } else {
          // Preço padrão se não definido
          allRates.push({
            roomId: hotelId,
            date: dateKey,
            price: 100,
            currency: 'BRL',
            minStay: 1,
          });
        }
      }
    }

    console.log(`[Booking.com Export] ✅ Returning ${allRates.length} prices`);

    return c.json(allRates);

  } catch (error: any) {
    console.error('[Booking.com Export] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /bookingcom/get-availability
 * Retorna disponibilidade do RENDIZY para enviar ao Booking.com
 */
bookingcomRoutes.get('/get-availability', async (c) => {
  try {
    console.log('[Booking.com Export] Fetching availability to push...');

    // Buscar todas as propriedades com mapeamento ativo
    const mappingsPrefix = 'bookingcom_mapping_';
    const mappings = await kv.getByPrefix(mappingsPrefix);

    const allAvailability: RoomAvailability[] = [];

    for (const mapping of mappings) {
      if (!mapping.enabled) continue;

      const propertyId = mapping.rendizzyPropertyId;
      const hotelId = mapping.bookingComHotelId;

      // Buscar disponibilidade dos próximos 365 dias
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];

        const calendarKey = `calendar_${propertyId}_${dateKey}`;
        const calendarData = await kv.get(calendarKey);

        const isAvailable = !calendarData || calendarData.status === 'available';

        allAvailability.push({
          roomId: hotelId, // Simplificado - precisa mapear acomodações
          date: dateKey,
          available: isAvailable ? 1 : 0,
          status: isAvailable ? 'open' : 'closed',
        });
      }
    }

    console.log(`[Booking.com Export] ✅ Returning ${allAvailability.length} availability records`);

    return c.json(allAvailability);

  } catch (error: any) {
    console.error('[Booking.com Export] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /bookingcom/create-mapping
 * Cria mapeamento entre propriedade RENDIZY e Hotel Booking.com
 */
bookingcomRoutes.post('/create-mapping', async (c) => {
  try {
    const { rendizzyPropertyId, rendizzyPropertyName, bookingComHotelId, bookingComHotelName } = await c.req.json();

    const mappingKey = `bookingcom_mapping_${bookingComHotelId}`;
    
    await kv.set(mappingKey, {
      rendizzyPropertyId,
      rendizzyPropertyName,
      bookingComHotelId,
      bookingComHotelName,
      enabled: true,
      createdAt: new Date().toISOString(),
    });

    console.log('[Booking.com Mapping] ✅ Created mapping:', mappingKey);

    return c.json({
      success: true,
      message: 'Mapping created successfully',
    });

  } catch (error: any) {
    console.error('[Booking.com Mapping] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /bookingcom/mappings
 * Lista todos os mapeamentos
 */
bookingcomRoutes.get('/mappings', async (c) => {
  try {
    const mappingsPrefix = 'bookingcom_mapping_';
    const mappings = await kv.getByPrefix(mappingsPrefix);

    return c.json({
      success: true,
      mappings,
    });

  } catch (error: any) {
    console.error('[Booking.com Mappings] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * DELETE /bookingcom/mapping/:hotelId
 * Remove mapeamento
 */
bookingcomRoutes.delete('/mapping/:hotelId', async (c) => {
  try {
    const hotelId = c.req.param('hotelId');
    const mappingKey = `bookingcom_mapping_${hotelId}`;
    
    await kv.del(mappingKey);

    console.log('[Booking.com Mapping] ✅ Deleted mapping:', mappingKey);

    return c.json({
      success: true,
      message: 'Mapping deleted successfully',
    });

  } catch (error: any) {
    console.error('[Booking.com Mapping] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /bookingcom/stats
 * Estatísticas de sincronização
 */
bookingcomRoutes.get('/stats', async (c) => {
  try {
    const reservationsPrefix = 'bookingcom_reservation_';
    const reservations = await kv.getByPrefix(reservationsPrefix);

    const today = new Date().toISOString().split('T')[0];
    const reservationsToday = reservations.filter((r: any) => 
      r.importedAt?.startsWith(today)
    ).length;

    return c.json({
      success: true,
      stats: {
        totalReservations: reservations.length,
        reservationsToday,
        lastSync: reservations.length > 0 
          ? reservations[reservations.length - 1].importedAt 
          : null,
      },
    });

  } catch (error: any) {
    console.error('[Booking.com Stats] ❌ Error:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});
