/**
 * RENDIZY - Booking.com Connectivity API Integration
 * 
 * Cliente para comunicação com APIs de Conectividade do Booking.com
 * Suporta: OTA XML, B.XML e JSON
 * 
 * Documentação: https://developers.booking.com/connectivity/docs
 * 
 * @version 1.0.76
 * @date 2025-10-28
 */

import { projectId, publicAnonKey } from '../supabase/info';

// URLs Base da API Booking.com
const BASE_URL_NON_PCI = 'https://supply-xml.booking.com';
const BASE_URL_PCI = 'https://secure-supply-xml.booking.com';

export interface BookingComCredentials {
  hotelId: string;
  username: string;
  password: string;
}

export interface BookingComConfig {
  enabled: boolean;
  credentials: BookingComCredentials;
  syncInterval: number; // minutos
  autoAcceptReservations: boolean;
  pushPrices: boolean;
  pushAvailability: boolean;
  pullReservations: boolean;
}

export interface BookingComReservation {
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
  status: 'new' | 'confirmed' | 'cancelled' | 'modified';
  createdAt: string;
}

export interface RoomAvailability {
  roomId: string;
  date: string;
  available: number;
  status: 'open' | 'closed';
}

export interface RoomRate {
  roomId: string;
  date: string;
  price: number;
  currency: string;
  minStay?: number;
  maxStay?: number;
}

/**
 * Cliente para API Booking.com
 */
export class BookingComAPIClient {
  private credentials: BookingComCredentials;

  constructor(credentials: BookingComCredentials) {
    this.credentials = credentials;
  }

  /**
   * Gera header de autenticação Basic
   */
  private getAuthHeader(): string {
    const auth = btoa(`${this.credentials.username}:${this.credentials.password}`);
    return `Basic ${auth}`;
  }

  /**
   * Requisição genérica para API Booking.com
   */
  private async request(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: string,
    contentType: 'application/xml' | 'application/x-www-form-urlencoded' | 'application/json' = 'application/xml',
    usePCI: boolean = false
  ): Promise<string> {
    const baseUrl = usePCI ? BASE_URL_PCI : BASE_URL_NON_PCI;
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': contentType,
      'Accept': contentType === 'application/json' ? 'application/json' : 'application/xml',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Detectar erros comuns e sugerir ações
        let errorMessage = `Booking.com API Error (${response.status})`;
        
        if (response.status === 503 || response.status === 502) {
          errorMessage += ' - Serviço temporariamente indisponível. Verifique https://status.booking.com';
        } else if (response.status === 429) {
          errorMessage += ' - Rate limit excedido. Aguarde alguns minutos.';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage += ' - Credenciais inválidas ou sem permissão. Verifique Hotel ID, Username e Password.';
        }
        
        errorMessage += `\n${errorText}`;
        throw new Error(errorMessage);
      }

      return await response.text();
    } catch (error: any) {
      console.error('Booking.com API Request Failed:', error);
      
      // Detectar erros de rede
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Erro de conexão com Booking.com. Verifique sua internet ou status da API: https://status.booking.com');
      }
      
      throw error;
    }
  }

  /**
   * Busca informações de disponibilidade (B.XML)
   */
  async getRoomRates(): Promise<string> {
    const body = `<request>
  <hotel_id>${this.credentials.hotelId}</hotel_id>
</request>`;

    return this.request('/hotels/xml/roomrates', 'POST', body, 'application/x-www-form-urlencoded');
  }

  /**
   * Atualiza disponibilidade de quartos (OTA XML)
   */
  async updateAvailability(availability: RoomAvailability[]): Promise<string> {
    const now = new Date().toISOString();
    
    const statusApplicationControl = availability.map(av => `
    <StatusApplicationControl Start="${av.date}" End="${av.date}" InvTypeCode="${av.roomId}"/>
  `).join('');

    const availStatusMessages = availability.map(av => `
    <AvailStatusMessage BookingLimit="${av.available}">
      <StatusApplicationControl Start="${av.date}" End="${av.date}" InvTypeCode="${av.roomId}"/>
    </AvailStatusMessage>
  `).join('');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" 
                        EchoToken="${Date.now()}" 
                        TimeStamp="${now}" 
                        Version="1.0">
  <AvailStatusMessages HotelCode="${this.credentials.hotelId}">
${availStatusMessages}
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;

    return this.request('/ota/OTA_HotelAvailNotif', 'POST', body);
  }

  /**
   * Atualiza preços de quartos (OTA XML)
   */
  async updateRates(rates: RoomRate[]): Promise<string> {
    const now = new Date().toISOString();

    const rateAmountMessages = rates.map(rate => {
      const minStay = rate.minStay ? `MinLOS="${rate.minStay}"` : '';
      const maxStay = rate.maxStay ? `MaxLOS="${rate.maxStay}"` : '';
      
      return `
    <RateAmountMessage>
      <StatusApplicationControl Start="${rate.date}" End="${rate.date}" InvTypeCode="${rate.roomId}"/>
      <Rates>
        <Rate>
          <BaseByGuestAmts>
            <BaseByGuestAmt AmountAfterTax="${rate.price}" CurrencyCode="${rate.currency}"/>
          </BaseByGuestAmts>
          <AdditionalGuestAmounts>
            <AdditionalGuestAmount MaxAge="17" Amount="0" AgeQualifyingCode="8"/>
          </AdditionalGuestAmounts>
        </Rate>
      </Rates>
      <LengthsOfStay>
        <LengthOfStay Time="1" TimeUnit="Day" ${minStay} ${maxStay}/>
      </LengthsOfStay>
    </RateAmountMessage>`;
    }).join('');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRateAmountNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" 
                             EchoToken="${Date.now()}" 
                             TimeStamp="${now}" 
                             Version="1.0">
  <RateAmountMessages HotelCode="${this.credentials.hotelId}">
${rateAmountMessages}
  </RateAmountMessages>
</OTA_HotelRateAmountNotifRQ>`;

    return this.request('/ota/OTA_HotelRateAmountNotif', 'POST', body);
  }

  /**
   * Busca resumo de reservas (B.XML)
   */
  async getBookingSummary(lastChange?: string): Promise<string> {
    let body = `<request>
  <hotel_id>${this.credentials.hotelId}</hotel_id>`;
    
    if (lastChange) {
      body += `\n  <last_change>${lastChange}</last_change>`;
    }
    
    body += '\n</request>';

    return this.request('/xml/bookings', 'POST', body, 'application/x-www-form-urlencoded', true);
  }

  /**
   * Confirma uma reserva (B.XML)
   */
  async confirmReservation(reservationId: string): Promise<string> {
    const body = `<request>
  <hotel_id>${this.credentials.hotelId}</hotel_id>
  <reservation_id>${reservationId}</reservation_id>
</request>`;

    return this.request('/xml/confirmation', 'POST', body, 'application/x-www-form-urlencoded', true);
  }

  /**
   * Cancela/Rejeita uma reserva (B.XML)
   */
  async rejectReservation(reservationId: string, reason: string): Promise<string> {
    const body = `<request>
  <hotel_id>${this.credentials.hotelId}</hotel_id>
  <reservation_id>${reservationId}</reservation_id>
  <reason>${reason}</reason>
</request>`;

    return this.request('/xml/rejection', 'POST', body, 'application/x-www-form-urlencoded', true);
  }

  /**
   * Testa conectividade com API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getRoomRates();
      return true;
    } catch (error) {
      console.error('Booking.com connection test failed:', error);
      return false;
    }
  }
}

/**
 * Parser para respostas XML da API Booking.com
 */
export class BookingComXMLParser {
  /**
   * Parse de reservas do XML response
   */
  static parseReservations(xml: string): BookingComReservation[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const reservations: BookingComReservation[] = [];

    const reservationNodes = doc.querySelectorAll('reservation');
    
    reservationNodes.forEach(node => {
      const reservation: BookingComReservation = {
        reservationId: node.querySelector('id')?.textContent || '',
        hotelId: node.querySelector('hotel_id')?.textContent || '',
        roomId: node.querySelector('room_id')?.textContent || '',
        guestName: node.querySelector('customer name')?.textContent || '',
        guestEmail: node.querySelector('customer email')?.textContent || '',
        guestPhone: node.querySelector('customer telephone')?.textContent || '',
        checkIn: node.querySelector('checkin')?.textContent || '',
        checkOut: node.querySelector('checkout')?.textContent || '',
        adults: parseInt(node.querySelector('numberofguests')?.textContent || '1'),
        children: 0, // Booking.com envia separado
        totalPrice: parseFloat(node.querySelector('totalprice')?.textContent || '0'),
        currency: node.querySelector('currencycode')?.textContent || 'BRL',
        status: 'new',
        createdAt: node.querySelector('date')?.textContent || new Date().toISOString(),
      };

      reservations.push(reservation);
    });

    return reservations;
  }

  /**
   * Verifica se resposta XML contém erro
   */
  static hasError(xml: string): { hasError: boolean; message?: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    const errorNode = doc.querySelector('fault, error');
    
    if (errorNode) {
      return {
        hasError: true,
        message: errorNode.textContent || 'Unknown error from Booking.com API'
      };
    }

    return { hasError: false };
  }
}

/**
 * Gerenciador de sincronização com Booking.com
 */
export class BookingComSyncManager {
  private config: BookingComConfig;
  private client: BookingComAPIClient;
  private syncTimer?: number;

  constructor(config: BookingComConfig) {
    this.config = config;
    this.client = new BookingComAPIClient(config.credentials);
  }

  /**
   * Inicia sincronização automática
   */
  startAutoSync() {
    if (!this.config.enabled) {
      console.log('Booking.com sync is disabled');
      return;
    }

    // Sincroniza imediatamente
    this.sync();

    // Agenda sincronizações periódicas
    this.syncTimer = window.setInterval(() => {
      this.sync();
    }, this.config.syncInterval * 60 * 1000);

    console.log(`Booking.com auto-sync started (every ${this.config.syncInterval} minutes)`);
  }

  /**
   * Para sincronização automática
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      console.log('Booking.com auto-sync stopped');
    }
  }

  /**
   * Executa sincronização completa
   */
  async sync() {
    console.log('[Booking.com Sync] Starting full synchronization...');

    try {
      // 1. Pull de reservas novas
      if (this.config.pullReservations) {
        await this.syncReservations();
      }

      // 2. Push de preços
      if (this.config.pushPrices) {
        await this.syncPrices();
      }

      // 3. Push de disponibilidade
      if (this.config.pushAvailability) {
        await this.syncAvailability();
      }

      console.log('[Booking.com Sync] ✅ Synchronization completed successfully');
    } catch (error) {
      console.error('[Booking.com Sync] ❌ Synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Sincroniza reservas do Booking.com para RENDIZY
   */
  private async syncReservations() {
    console.log('[Booking.com Sync] Fetching new reservations...');

    try {
      const xml = await this.client.getBookingSummary();
      const error = BookingComXMLParser.hasError(xml);
      
      if (error.hasError) {
        throw new Error(`Booking.com API Error: ${error.message}`);
      }

      const reservations = BookingComXMLParser.parseReservations(xml);
      
      console.log(`[Booking.com Sync] Found ${reservations.length} reservations`);

      // Enviar para backend RENDIZY
      for (const reservation of reservations) {
        await this.importReservation(reservation);
        
        // Auto-confirmar se configurado
        if (this.config.autoAcceptReservations) {
          await this.client.confirmReservation(reservation.reservationId);
          console.log(`[Booking.com Sync] ✅ Auto-confirmed reservation ${reservation.reservationId}`);
        }
      }

    } catch (error) {
      console.error('[Booking.com Sync] Failed to sync reservations:', error);
      throw error;
    }
  }

  /**
   * Importa reserva do Booking.com para RENDIZY
   */
  private async importReservation(reservation: BookingComReservation) {
    try {
      // Chamar API RENDIZY para criar reserva
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/bookingcom/import-reservation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reservation),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to import reservation: ${await response.text()}`);
      }

      console.log(`[Booking.com Sync] ✅ Imported reservation ${reservation.reservationId}`);
    } catch (error) {
      console.error(`[Booking.com Sync] Failed to import reservation ${reservation.reservationId}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza preços do RENDIZY para Booking.com
   */
  private async syncPrices() {
    console.log('[Booking.com Sync] Pushing prices to Booking.com...');
    
    try {
      // Buscar preços do RENDIZY
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/bookingcom/get-prices`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prices from RENDIZY');
      }

      const rates: RoomRate[] = await response.json();
      
      if (rates.length > 0) {
        await this.client.updateRates(rates);
        console.log(`[Booking.com Sync] ✅ Pushed ${rates.length} price updates`);
      }
    } catch (error) {
      console.error('[Booking.com Sync] Failed to sync prices:', error);
      throw error;
    }
  }

  /**
   * Sincroniza disponibilidade do RENDIZY para Booking.com
   */
  private async syncAvailability() {
    console.log('[Booking.com Sync] Pushing availability to Booking.com...');
    
    try {
      // Buscar disponibilidade do RENDIZY
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/bookingcom/get-availability`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability from RENDIZY');
      }

      const availability: RoomAvailability[] = await response.json();
      
      if (availability.length > 0) {
        await this.client.updateAvailability(availability);
        console.log(`[Booking.com Sync] ✅ Pushed ${availability.length} availability updates`);
      }
    } catch (error) {
      console.error('[Booking.com Sync] Failed to sync availability:', error);
      throw error;
    }
  }
}
