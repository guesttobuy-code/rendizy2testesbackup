"use client";

/**
 * ROOMS MANAGER - Sistema de Cômodos (v1.0.79)
 * 
 * Gerencia múltiplos cômodos por listing com:
 * - Lista de cômodos na sidebar
 * - Formulário de detalhes (tipo, compartilhado, fechadura)
 * - Gerenciador de camas (tipos + quantidades)
 * - Upload de fotos por cômodo com tags
 * - Cálculo automático de capacidade (max_guests)
 * - Resumo visual: 🛏️ quartos, 👥 pessoas, 🛁 banheiros
 */

import { useState, useEffect } from 'react';
import { Plus, Bed, Bath, Users, Trash2, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

type RoomType = 
  | 'banheiro'
  | 'meio-banheiro'
  | 'quadruplo'
  | 'suite'
  | 'triplo'
  | 'twin'
  | 'duplo'
  | 'individual'
  | 'studio'
  | 'sala'
  | 'outras';

type BedType = 
  | 'casal'
  | 'solteiro'
  | 'solteiro-twin'
  | 'beliche-single'
  | 'beliche-double'
  | 'king'
  | 'queen'
  | 'futon-casal'
  | 'futon-individual'
  | 'sofa-cama'
  | 'sofa-cama-casal';

interface Bed {
  id: string;
  type: BedType;
  quantity: number;
  capacity: number;
}

interface RoomPhoto {
  id: string;
  url: string;
  tag: string;
  caption?: string;
  order: number;
  isMain: boolean;
}

interface Room {
  id: string;
  accommodationId: string;
  type: RoomType;
  name?: string;
  isShared: boolean;
  hasLock: boolean;
  beds: Bed[];
  capacity: number;
  photos: RoomPhoto[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface RoomStats {
  totalRooms: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
}

// ============================================================================
// ROOM MANAGER COMPONENT
// ============================================================================

export function RoomsManager({ listingId }: { listingId: string }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats>({
    totalRooms: 0,
    bedrooms: 0,
    bathrooms: 0,
    maxGuests: 0
  });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // FETCH ROOMS
  // ============================================================================

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/rooms`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      
      if (data.success) {
        setRooms(data.data.rooms);
        setStats(data.data.stats);
        
        // Selecionar primeiro room se nenhum estiver selecionado
        if (data.data.rooms.length > 0 && !selectedRoom) {
          setSelectedRoom(data.data.rooms[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Erro ao carregar cômodos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchRooms();
    }
  }, [listingId]);

  // ============================================================================
  // CREATE ROOM
  // ============================================================================

  const handleCreateRoom = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/rooms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'duplo',
            isShared: false,
            hasLock: true,
            beds: []
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success('Cômodo criado com sucesso!');
        await fetchRooms();
        setSelectedRoom(data.data);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Erro ao criar cômodo');
    }
  };

  // ============================================================================
  // DELETE ROOM
  // ============================================================================

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Tem certeza que deseja deletar este cômodo?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/rooms/${roomId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete room');
      }

      toast.success('Cômodo deletado com sucesso!');
      
      // Se o room deletado estava selecionado, limpar seleção
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
      }
      
      await fetchRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast.error('Erro ao deletar cômodo');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando cômodos...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* ========================================
          SIDEBAR - LISTA DE CÔMODOS
      ======================================== */}
      <div className="lg:col-span-1">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cômodos</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreateRoom}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <Separator className="mb-4" />

          {/* LISTA DE CÔMODOS */}
          <div className="space-y-2">
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Home className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum cômodo cadastrado</p>
                <p className="text-xs mt-1">Clique em "Adicionar" para começar</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedRoom?.id === room.id 
                      ? 'bg-primary/5 border-primary' 
                      : 'hover:bg-muted/50 border-transparent'}
                  `}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {room.name || getRoomTypeLabel(room.type)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {room.capacity} {room.capacity === 1 ? 'pessoa' : 'pessoas'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RESUMO */}
          {rooms.length > 0 && (
            <>
              <Separator className="my-4" />
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  <span>{stats.bedrooms} {stats.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-4 w-4" />
                  <span>{stats.bathrooms} {stats.bathrooms === 1 ? 'banheiro' : 'banheiros'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{stats.maxGuests} {stats.maxGuests === 1 ? 'pessoa' : 'pessoas'} no total</span>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ========================================
          PAINEL DE DETALHES
      ======================================== */}
      <div className="lg:col-span-3">
        {selectedRoom ? (
          <RoomDetails
            room={selectedRoom}
            onUpdate={fetchRooms}
          />
        ) : (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <Home className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Selecione um cômodo para editar</p>
              <p className="text-sm mt-2">ou clique em "Adicionar" para criar um novo</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ROOM DETAILS COMPONENT
// ============================================================================

function RoomDetails({ 
  room, 
  onUpdate 
}: { 
  room: Room; 
  onUpdate: () => void;
}) {
  const [formData, setFormData] = useState(room);
  const [saving, setSaving] = useState(false);

  // Atualizar formData quando room mudar
  useEffect(() => {
    setFormData(room);
  }, [room]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/rooms/${room.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: formData.type,
            name: formData.name,
            isShared: formData.isShared,
            hasLock: formData.hasLock,
            beds: formData.beds
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update room');
      }

      toast.success('Cômodo atualizado com sucesso!');
      onUpdate();
    } catch (error) {
      console.error('Error updating room:', error);
      toast.error('Erro ao atualizar cômodo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Detalhes do Cômodo</h3>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        <Separator />

        {/* TIPO DO CÔMODO */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tipo do Cômodo
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as RoomType })}
            className="w-full p-2 border rounded-md"
          >
            <option value="duplo">Quarto Duplo</option>
            <option value="suite">Suíte</option>
            <option value="triplo">Quarto Triplo</option>
            <option value="quadruplo">Quarto Quádruplo</option>
            <option value="individual">Quarto Individual</option>
            <option value="twin">Twin (2 camas de solteiro)</option>
            <option value="studio">Estúdio</option>
            <option value="sala">Sala/Área Comum</option>
            <option value="banheiro">Banheiro</option>
            <option value="meio-banheiro">Lavabo</option>
            <option value="outras">Outras Dependências</option>
          </select>
        </div>

        {/* NOME (OPCIONAL) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Nome do Espaço (opcional)
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Quarto Master, Suíte Principal"
            className="w-full p-2 border rounded-md"
          />
        </div>

        {/* COMPARTILHADO? */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isShared}
              onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Cômodo compartilhado</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.hasLock}
              onChange={(e) => setFormData({ ...formData, hasLock: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Possui fechadura</span>
          </label>
        </div>

        {/* GERENCIADOR DE CAMAS */}
        <BedsManager
          beds={formData.beds}
          onChange={(newBeds) => setFormData({ ...formData, beds: newBeds })}
        />

        {/* CAPACIDADE CALCULADA */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Capacidade:</span>
            <span className="text-muted-foreground">
              {formData.capacity} {formData.capacity === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// BEDS MANAGER COMPONENT
// ============================================================================

function BedsManager({
  beds,
  onChange
}: {
  beds: Bed[];
  onChange: (beds: Bed[]) => void;
}) {
  const addBed = () => {
    const newBed: Bed = {
      id: `bed_${Date.now()}`,
      type: 'casal',
      quantity: 1,
      capacity: 2
    };
    onChange([...beds, newBed]);
  };

  const updateBed = (id: string, updates: Partial<Bed>) => {
    onChange(beds.map(bed => 
      bed.id === id ? { ...bed, ...updates } : bed
    ));
  };

  const removeBed = (id: string) => {
    onChange(beds.filter(bed => bed.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium">Camas</label>
        <Button size="sm" variant="outline" onClick={addBed} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Cama
        </Button>
      </div>

      <div className="space-y-3">
        {beds.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhuma cama cadastrada
          </div>
        ) : (
          beds.map((bed) => (
            <div key={bed.id} className="flex items-center gap-3 p-3 border rounded-md">
              <select
                value={bed.type}
                onChange={(e) => {
                  const newType = e.target.value as BedType;
                  const capacity = getBedCapacity(newType);
                  updateBed(bed.id, { type: newType, capacity });
                }}
                className="flex-1 p-2 border rounded-md text-sm"
              >
                <option value="casal">Cama de Casal (2 pessoas)</option>
                <option value="queen">Queen Size (2 pessoas)</option>
                <option value="king">King Size (2 pessoas)</option>
                <option value="solteiro">Solteiro (1 pessoa)</option>
                <option value="solteiro-twin">Twin (1 pessoa)</option>
                <option value="beliche-single">Beliche Single (1 pessoa/nível)</option>
                <option value="beliche-double">Beliche Double (2 pessoas/nível)</option>
                <option value="futon-casal">Futón Casal (2 pessoas)</option>
                <option value="futon-individual">Futón Individual (1 pessoa)</option>
                <option value="sofa-cama">Sofá-cama (1 pessoa)</option>
                <option value="sofa-cama-casal">Sofá-cama Casal (2 pessoas)</option>
              </select>

              <input
                type="number"
                min="1"
                value={bed.quantity}
                onChange={(e) => updateBed(bed.id, { quantity: parseInt(e.target.value) })}
                className="w-20 p-2 border rounded-md text-sm text-center"
              />

              <Button
                size="sm"
                variant="ghost"
                className="hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeBed(bed.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRoomTypeLabel(type: RoomType): string {
  const labels: Record<RoomType, string> = {
    'duplo': 'Quarto Duplo',
    'suite': 'Suíte',
    'triplo': 'Quarto Triplo',
    'quadruplo': 'Quarto Quádruplo',
    'individual': 'Quarto Individual',
    'twin': 'Twin',
    'studio': 'Estúdio',
    'sala': 'Sala',
    'banheiro': 'Banheiro',
    'meio-banheiro': 'Lavabo',
    'outras': 'Outras'
  };
  return labels[type] || type;
}

function getBedCapacity(bedType: BedType): number {
  const capacities: Record<BedType, number> = {
    'casal': 2,
    'solteiro': 1,
    'solteiro-twin': 1,
    'beliche-single': 1,
    'beliche-double': 2,
    'king': 2,
    'queen': 2,
    'futon-casal': 2,
    'futon-individual': 1,
    'sofa-cama': 1,
    'sofa-cama-casal': 2
  };
  return capacities[bedType] || 1;
}
