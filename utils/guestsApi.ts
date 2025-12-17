import { publicAnonKey } from './supabase/info';
import { API_BASE_URL } from './apiBase';

const BASE_URL = API_BASE_URL;

// ============================================
// TYPES
// ============================================

export interface GuestAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface GuestStats {
  totalReservations: number;
  totalNights: number;
  totalSpent: number;
  averageRating?: number;
  lastStayDate?: string;
}

export interface GuestPreferences {
  earlyCheckIn: boolean;
  lateCheckOut: boolean;
  quietFloor: boolean;
  highFloor: boolean;
  pets: boolean;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string;
  passport?: string;
  rg?: string;
  address?: GuestAddress;
  birthDate?: string;
  nationality?: string;
  language?: string;
  stats: GuestStats;
  preferences?: GuestPreferences;
  tags: string[];
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: string;
  blacklistedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source: string;
}

export interface CreateGuestDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cpf?: string;
  passport?: string;
  rg?: string;
  address?: GuestAddress;
  birthDate?: string;
  nationality?: string;
  language?: string;
  preferences?: GuestPreferences;
  tags?: string[];
  notes?: string;
  source?: string;
}

export interface UpdateGuestDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  passport?: string;
  rg?: string;
  address?: GuestAddress;
  birthDate?: string;
  nationality?: string;
  language?: string;
  preferences?: GuestPreferences;
  tags?: string[];
  isBlacklisted?: boolean;
  blacklistReason?: string;
  notes?: string;
}

export interface GuestHistory {
  guest: Guest;
  reservations: any[]; // TODO: Type Reservation
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  try {
    // ✅ GARANTIR que credentials não seja passado via options
    const { credentials, ...restOptions } = options;
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
        ...restOptions.headers,
      },
      credentials: 'omit', // ✅ Explícito: não enviar credentials
    });

    const json = await response.json();

    if (!response.ok) {
      console.error(`API Error [${endpoint}]:`, json);
      return { success: false, error: json.error || json.message || 'Unknown error' };
    }

    return json;
  } catch (error) {
    console.error(`Network Error [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================
// GUESTS API
// ============================================

export const guestsApi = {
  /**
   * Listar todos os hóspedes
   * @param search - Termo de busca (nome, email, telefone)
   * @param blacklisted - Filtrar por status de blacklist
   */
  list: (search?: string, blacklisted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (blacklisted !== undefined) params.append('blacklisted', blacklisted.toString());
    
    const queryString = params.toString();
    return fetchAPI<Guest[]>(`/guests${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Obter um hóspede por ID
   * @param guestId - ID do hóspede
   */
  get: (guestId: string) => fetchAPI<Guest>(`/guests/${guestId}`),

  /**
   * Criar novo hóspede
   * @param data - Dados do hóspede
   */
  create: (data: CreateGuestDTO) =>
    fetchAPI<Guest>('/guests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Atualizar hóspede
   * @param guestId - ID do hóspede
   * @param data - Dados a atualizar
   */
  update: (guestId: string, data: UpdateGuestDTO) =>
    fetchAPI<Guest>(`/guests/${guestId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Deletar hóspede
   * @param guestId - ID do hóspede
   */
  delete: (guestId: string) =>
    fetchAPI<void>(`/guests/${guestId}`, {
      method: 'DELETE',
    }),

  /**
   * Obter histórico de reservas do hóspede
   * @param guestId - ID do hóspede
   */
  getHistory: (guestId: string) => fetchAPI<GuestHistory>(`/guests/${guestId}/history`),

  /**
   * Adicionar/remover hóspede da blacklist
   * @param guestId - ID do hóspede
   * @param blacklist - true para adicionar, false para remover
   * @param reason - Motivo (obrigatório se blacklist=true)
   */
  toggleBlacklist: (guestId: string, blacklist: boolean, reason?: string) =>
    fetchAPI<Guest>(`/guests/${guestId}/blacklist`, {
      method: 'POST',
      body: JSON.stringify({ blacklist, reason }),
    }),
};
