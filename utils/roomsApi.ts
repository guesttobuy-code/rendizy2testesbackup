/**
 * RENDIZY - Rooms API
 * API helper para gerenciamento de cômodos
 * 
 * @version 1.0.103.10
 * @date 2025-10-29
 */

import { publicAnonKey } from './supabase/info';
import { API_BASE_URL } from './apiBase';

const BASE_URL = API_BASE_URL;

// ============================================================================
// TYPES
// ============================================================================

export interface BedCount {
  [bedTypeId: string]: number;
}

export interface Photo {
  id: string;
  url: string;
  path?: string;
  tags: string[];
  isCover: boolean;
  order: number;
}

export interface Room {
  id: string;
  type: string;
  typeName: string;
  isShared: boolean;
  beds: BedCount;
  photos: Photo[];
  order?: number;
}

export interface RoomStats {
  totalRooms: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
}

// ============================================================================
// ROOM CRUD
// ============================================================================

/**
 * Busca todos os cômodos de uma propriedade
 */
export async function getRooms(propertyId: string): Promise<{ rooms: Room[]; stats: RoomStats }> {
  const response = await fetch(`${BASE_URL}/listings/${propertyId}/rooms`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch rooms');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Busca um cômodo específico
 */
export async function getRoom(roomId: string): Promise<Room> {
  const response = await fetch(`${BASE_URL}/rooms/${roomId}`, {
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch room');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Cria um novo cômodo
 */
export async function createRoom(propertyId: string, room: Omit<Room, 'id' | 'photos'>): Promise<Room> {
  const response = await fetch(`${BASE_URL}/listings/${propertyId}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify({
      type: room.type,
      name: room.typeName,
      isShared: room.isShared,
      beds: Object.entries(room.beds).map(([type, quantity]) => ({
        type,
        quantity,
      })),
      order: room.order,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Atualiza um cômodo
 */
export async function updateRoom(roomId: string, updates: Partial<Room>): Promise<Room> {
  const body: any = {};

  if (updates.type !== undefined) body.type = updates.type;
  if (updates.typeName !== undefined) body.name = updates.typeName;
  if (updates.isShared !== undefined) body.isShared = updates.isShared;
  if (updates.order !== undefined) body.order = updates.order;
  
  if (updates.beds !== undefined) {
    body.beds = Object.entries(updates.beds).map(([type, quantity]) => ({
      type,
      quantity,
    }));
  }

  const response = await fetch(`${BASE_URL}/rooms/${roomId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update room');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Deleta um cômodo
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/rooms/${roomId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete room');
  }
}

// ============================================================================
// PHOTO UPLOAD
// ============================================================================

/**
 * Faz upload de uma foto para um cômodo
 */
export async function uploadRoomPhoto(
  file: File,
  propertyId: string,
  roomType: string
): Promise<{ id: string; url: string; path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('propertyId', propertyId);
  formData.append('room', roomType);

  const response = await fetch(`${BASE_URL}/photos/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload photo');
  }

  const result = await response.json();
  return result.photo;
}

/**
 * Deleta uma foto
 */
export async function deleteRoomPhoto(photoPath: string): Promise<void> {
  const encodedPath = encodeURIComponent(photoPath);
  
  const response = await fetch(`${BASE_URL}/photos/${encodedPath}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete photo');
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Salva múltiplos cômodos de uma vez
 */
export async function saveAllRooms(propertyId: string, rooms: Room[]): Promise<Room[]> {
  const savedRooms: Room[] = [];

  for (const room of rooms) {
    try {
      if (room.id && room.id.includes(':')) {
        // Atualizar existente
        const updated = await updateRoom(room.id, room);
        savedRooms.push(updated);
      } else {
        // Criar novo
        const created = await createRoom(propertyId, room);
        savedRooms.push(created);
      }
    } catch (error) {
      console.error(`Failed to save room:`, error);
      throw error;
    }
  }

  return savedRooms;
}
