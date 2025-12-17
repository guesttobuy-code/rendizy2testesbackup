/**
 * RENDIZY - Wizard Step: Cômodos e Distribuição
 * 
 * Step 3 do Wizard de Edição de Propriedades
 * - Tipos de camas baseados em Airbnb/Booking
 * - Sistema de fotos por cômodo com tags
 * - Seleção em lote + tags múltiplas
 * - Drag & drop para reordenar fotos
 * 
 * @version 1.0.103.10
 * @date 2025-10-29
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Image as ImageIcon, Tag as TagIcon, Check, Upload, Loader2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { uploadRoomPhoto, deleteRoomPhoto } from '../../utils/roomsApi';

// ============================================================================
// CONSTANTS - TIPOS DE CAMAS (AIRBNB/BOOKING)
// ============================================================================

const BED_TYPES = [
  { id: 'cama-casal-1p', name: 'Cama 1p de Casal', icon: '🛏️', capacity: 2 },
  { id: 'cama-solteiro-2p', name: 'Cama 2p de Solteiro', icon: '🛏️', capacity: 2 },
  { id: 'cama-queen-1p', name: 'Cama 1p de Queen', icon: '🛏️', capacity: 2 },
  { id: 'cama-king-1p', name: 'Cama Dupla (King)', icon: '🛏️', capacity: 2 },
  { id: 'beliche-1p-2pessoas', name: 'Cama 1p de Beliche (2 pessoas)', icon: '🛏️', capacity: 2 },
  { id: 'berco-baby', name: 'Cama Berço (Berço/Baby)', icon: '👶', capacity: 1 },
  { id: 'futon-casal', name: 'Colchão (Futon Casal)', icon: '🛋️', capacity: 2 },
  { id: 'sofa-cama-casal', name: 'Sofá-cama (p/ Casal)', icon: '🛋️', capacity: 2 },
];

// ============================================================================
// CONSTANTS - TIPOS DE CÔMODO
// ============================================================================

const ROOM_TYPES = [
  { id: 'suite', name: 'Suíte', icon: '🛏️', category: 'bedroom', hasBathroom: true },
  { id: 'quarto-duplo', name: 'Quarto Duplo/Std/Eco', icon: '🛏️', category: 'bedroom' },
  { id: 'quarto-individual', name: 'Individual', icon: '🛏️', category: 'bedroom' },
  { id: 'estudio', name: 'Estúdio', icon: '🏠', category: 'bedroom' },
  { id: 'sala-comum', name: 'Sala/Estar Comum', icon: '🏠', category: 'living' },
  { id: 'area-comum', name: 'área/Área Comum', icon: '🏠', category: 'living' },
  { id: 'banheiro', name: 'Banheiro', icon: '🚿', category: 'bathroom' },
  { id: 'meio-banheiro', name: '1/2 Banheiro', icon: '🚽', category: 'bathroom' },
  { id: 'balcao', name: 'Balcão', icon: '🌳', category: 'outdoor' },
  { id: 'sotao', name: 'Sotão', icon: '🏚️', category: 'other' },
  { id: 'subarea', name: 'Subárea', icon: '🏗️', category: 'other' },
  { id: 'outras', name: 'Outras Dependências', icon: '🚪', category: 'other' },
];

// ============================================================================
// CONSTANTS - NOMES PERSONALIZADOS PARA "OUTRAS DEPENDÊNCIAS"
// ============================================================================

const CUSTOM_SPACE_NAMES = [
  'Academia',
  'Adega',
  'Área Comum Externa',
  'Área de Lazer',
  'Área de Serviço',
  'Ateliê',
  'Banheiro Externo',
  'Biblioteca',
  'Brinquedoteca',
  'Chalé',
  'Churrasqueira',
  'Closet',
  'Cobertura',
  'Corredor',
  'Cozinha',
  'Cozinha Gourmet',
  'Deck',
  'Dependência de Empregada',
  'Depósito',
  'Despensa',
  'Elevador',
  'Entrada',
  'Espaço Externo',
  'Espaço Gourmet',
  'Escritório',
  'Estacionamento',
  'Garagem',
  'Gazebo',
  'Hall',
  'Hidromassagem',
  'Home Office',
  'Home Theater',
  'Jacuzzi',
  'Jardim',
  'Jardim de Inverno',
  'Laboratório',
  'Lavabo',
  'Lavanderia',
  'Mirante',
  'Pátio',
  'Pergolado',
  'Piscina',
  'Playground',
  'Quadra Esportiva',
  'Quiosque',
  'Sala de Estar',
  'Sala de Jantar',
  'Sala de Jogos',
  'Sala de TV',
  'Salão de Festas',
  'Sauna',
  'Solário',
  'Spa',
  'Terraço',
  'Varanda',
  'Varanda Gourmet',
  'Vestiário',
  'Outro (especificar)',
].sort();

// ============================================================================
// CONSTANTS - TAGS DE FOTOS (BASEADO NA 3ª IMAGEM)
// ============================================================================

const PHOTO_TAGS = [
  'Academia / Espaço Fitness',
  'ADAM',
  'Alimentos e Bebidas',
  'Almoço',
  'Animais',
  'Animais de Estimação',
  'Área de Compras',
  'Área de estar',
  'Área e instalações',
  'Área para café / chá',
  'Arredores',
  'Atividades',
  'Banheira/jacuzzi',
  'Banheiro',
  'Banheiro compartilhado',
];

// ============================================================================
// TYPES
// ============================================================================

interface BedCount {
  [bedTypeId: string]: number;
}

interface Photo {
  id: string;
  url: string;
  tags: string[]; // Tags de categorização apenas (sem capa)
  order: number;
}

interface Room {
  id: string;
  type: string;
  typeName: string;
  customName?: string; // Nome personalizado para "Outras Dependências"
  isShared: boolean;
  beds: BedCount;
  photos: Photo[];
}

interface FormData {
  rooms: Room[];
}

interface ContentRoomsStepProps {
  data: FormData;
  onChange: (data: FormData) => void;
  propertyId?: string; // ID da propriedade para upload de fotos
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContentRoomsStep({ data, onChange, propertyId }: ContentRoomsStepProps) {
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number>(0);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // ============================================================================
  // ROOM MANAGEMENT
  // ============================================================================

  const addRoom = () => {
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      type: '',
      typeName: '',
      isShared: false,
      beds: {},
      photos: [],
    };

    onChange({
      rooms: [...data.rooms, newRoom],
    });

    setSelectedRoomIndex(data.rooms.length);
  };

  const removeRoom = (index: number) => {
    const newRooms = data.rooms.filter((_, i) => i !== index);
    onChange({ rooms: newRooms });

    if (selectedRoomIndex >= newRooms.length) {
      setSelectedRoomIndex(Math.max(0, newRooms.length - 1));
    }
  };

  const updateRoom = (index: number, updates: Partial<Room>) => {
    const newRooms = [...data.rooms];
    newRooms[index] = { ...newRooms[index], ...updates };
    onChange({ rooms: newRooms });
  };

  // ============================================================================
  // BED MANAGEMENT
  // ============================================================================

  const updateBedCount = (roomIndex: number, bedTypeId: string, delta: number) => {
    const room = data.rooms[roomIndex];
    const currentCount = room.beds[bedTypeId] || 0;
    const newCount = Math.max(0, currentCount + delta);

    const newBeds = { ...room.beds };
    if (newCount === 0) {
      delete newBeds[bedTypeId];
    } else {
      newBeds[bedTypeId] = newCount;
    }

    updateRoom(roomIndex, { beds: newBeds });
  };

  // ============================================================================
  // PHOTO MANAGEMENT
  // ============================================================================

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || selectedRoomIndex === -1) return;

    const room = data.rooms[selectedRoomIndex];

    // Se não temos propertyId, usar preview local
    if (!propertyId) {
      const newPhotos: Photo[] = [];
      Array.from(files).forEach((file, index) => {
        const url = URL.createObjectURL(file);
        newPhotos.push({
          id: `photo-${Date.now()}-${index}`,
          url,
          tags: [],
          order: room.photos.length + index,
        });
      });

      updateRoom(selectedRoomIndex, {
        photos: [...room.photos, ...newPhotos],
      });
      return;
    }

    // Upload real para Supabase
    setUploadingPhotos(true);
    const newPhotos: Photo[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        toast.loading(`Fazendo upload da foto ${i + 1}/${files.length}...`, {
          id: 'photo-upload',
        });

        const uploadedPhoto = await uploadRoomPhoto(file, propertyId, room.type);

        newPhotos.push({
          id: uploadedPhoto.id,
          url: uploadedPhoto.url,
          path: uploadedPhoto.path,
          tags: [],
          order: room.photos.length + i,
        });
      }

      updateRoom(selectedRoomIndex, {
        photos: [...room.photos, ...newPhotos],
      });

      toast.success(`${files.length} foto(s) enviada(s) com sucesso!`, {
        id: 'photo-upload',
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erro ao fazer upload das fotos', {
        id: 'photo-upload',
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    if (selectedRoomIndex === -1) return;
    const room = data.rooms[selectedRoomIndex];
    setSelectedPhotos(room.photos.map((p) => p.id));
  };

  const deselectAllPhotos = () => {
    setSelectedPhotos([]);
  };

  const applyTagsToSelected = (tags: string[]) => {
    if (selectedRoomIndex === -1) return;

    const room = data.rooms[selectedRoomIndex];
    const updatedPhotos = room.photos.map((photo) => {
      if (selectedPhotos.includes(photo.id)) {
        return { ...photo, tags: [...new Set([...photo.tags, ...tags])] };
      }
      return photo;
    });

    updateRoom(selectedRoomIndex, { photos: updatedPhotos });
    setShowTagsModal(false);
    setSelectedPhotos([]);
  };

  const removePhotoTag = (photoId: string, tag: string) => {
    if (selectedRoomIndex === -1) return;

    const room = data.rooms[selectedRoomIndex];
    const updatedPhotos = room.photos.map((photo) => {
      if (photo.id === photoId) {
        return { ...photo, tags: photo.tags.filter((t) => t !== tag) };
      }
      return photo;
    });

    updateRoom(selectedRoomIndex, { photos: updatedPhotos });
  };

  const deletePhoto = async (photoId: string) => {
    if (selectedRoomIndex === -1) return;

    const room = data.rooms[selectedRoomIndex];
    const photo = room.photos.find((p) => p.id === photoId);

    // Se tem path, deletar do storage
    if (photo?.path && propertyId) {
      try {
        await deleteRoomPhoto(photo.path);
        toast.success('Foto deletada com sucesso!');
      } catch (error) {
        console.error('Error deleting photo:', error);
        toast.error('Erro ao deletar foto');
        return;
      }
    }

    const updatedPhotos = room.photos.filter((p) => p.id !== photoId);

    updateRoom(selectedRoomIndex, { photos: updatedPhotos });
  };



  // ============================================================================
  // DRAG & DROP
  // ============================================================================

  const handleDragStart = (photoId: string) => {
    setDraggedPhotoId(photoId);
  };

  const handleDragOver = (e: React.DragEvent, targetPhotoId: string) => {
    e.preventDefault();
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) return;

    const room = data.rooms[selectedRoomIndex];
    const draggedIndex = room.photos.findIndex((p) => p.id === draggedPhotoId);
    const targetIndex = room.photos.findIndex((p) => p.id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPhotos = [...room.photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(targetIndex, 0, draggedPhoto);

    // Atualizar order
    newPhotos.forEach((photo, index) => {
      photo.order = index;
    });

    updateRoom(selectedRoomIndex, { photos: newPhotos });
  };

  const handleDragEnd = () => {
    setDraggedPhotoId(null);
  };

  // ============================================================================
  // SUMMARY CALCULATION
  // ============================================================================

  const getSummary = () => {
    const summary: { [key: string]: number } = {};

    data.rooms.forEach((room) => {
      const roomType = ROOM_TYPES.find((rt) => rt.id === room.type);
      if (roomType) {
        const category = roomType.category;
        summary[category] = (summary[category] || 0) + 1;
      }
    });

    return summary;
  };

  const summary = getSummary();
  const currentRoom = data.rooms[selectedRoomIndex];
  const currentRoomType = ROOM_TYPES.find((rt) => rt.id === currentRoom?.type);
  const allowsBeds = currentRoomType?.category === 'bedroom' || currentRoomType?.category === 'living';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col gap-4">
      {/* RESUMO VISUAL */}
      {data.rooms.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6">
              <span className="text-sm font-medium text-muted-foreground">
                Resumo dos Cômodos:
              </span>
              <div className="flex items-center gap-4">
                {summary.bedroom && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛏️</span>
                    <span className="font-bold text-lg">{summary.bedroom}</span>
                    <span className="text-xs text-muted-foreground hidden lg:inline">Quartos</span>
                  </div>
                )}
                {summary.bathroom && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚿</span>
                    <span className="font-bold text-lg">{summary.bathroom}</span>
                    <span className="text-xs text-muted-foreground hidden lg:inline">Banheiros</span>
                  </div>
                )}
                {summary.living && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏠</span>
                    <span className="font-bold text-lg">{summary.living}</span>
                    <span className="text-xs text-muted-foreground hidden lg:inline">Salas</span>
                  </div>
                )}
                {summary.outdoor && (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌳</span>
                    <span className="font-bold text-lg">{summary.outdoor}</span>
                    <span className="text-xs text-muted-foreground hidden lg:inline">Externos</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LAYOUT: SIDEBAR + FORMULÁRIO */}
      <div className="flex-1 grid grid-cols-[280px_1fr] gap-6 overflow-hidden">
        {/* SIDEBAR ESQUERDA - LISTA DE CÔMODOS */}
        <Card className="flex flex-col">
          <CardContent className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col">
            <Button onClick={addRoom} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar cômodo
            </Button>

            <Separator />

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {data.rooms.map((room, index) => (
                  <div
                    key={room.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRoomIndex === index
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedRoomIndex(index)}
                  >
                    <span className="text-lg">
                      {ROOM_TYPES.find((rt) => rt.id === room.type)?.icon || '📋'}
                    </span>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className="text-sm truncate">
                        {room.type === 'outras' && room.customName 
                          ? room.customName 
                          : (room.typeName || `Cômodo ${index + 1}`)}
                      </span>
                      {room.type === 'outras' && room.customName && (
                        <span className="text-xs opacity-70">Outras Dependências</span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRoom(index);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* FORMULÁRIO DIREITA */}
        <ScrollArea className="h-full">
          {currentRoom ? (
            <div className="space-y-6 pr-4">
              {/* TIPO DE CÔMODO */}
              <div className="space-y-2">
                <Label>Qual é o tipo de cômodo?</Label>
                <Select
                  value={currentRoom.type}
                  onValueChange={(value) => {
                    const roomType = ROOM_TYPES.find((rt) => rt.id === value);
                    updateRoom(selectedRoomIndex, {
                      type: value,
                      typeName: roomType?.name || '',
                      // Limpar customName se não for mais "outras"
                      customName: value === 'outras' ? currentRoom.customName : undefined,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        <span className="flex items-center gap-2">
                          <span>{rt.icon}</span>
                          <span>{rt.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* NOME PERSONALIZADO - Apenas para "Outras Dependências" */}
              {currentRoom.type === 'outras' && (
                <div className="space-y-2">
                  <Label>Como se chama este espaço personalizado?</Label>
                  <p className="text-sm text-gray-500">
                    Selecione o nome do espaço na lista abaixo:
                  </p>
                  <Select
                    value={currentRoom.customName || ''}
                    onValueChange={(value) => {
                      updateRoom(selectedRoomIndex, { customName: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de espaço" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {CUSTOM_SPACE_NAMES.map((spaceName) => (
                        <SelectItem key={spaceName} value={spaceName}>
                          {spaceName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* COMPARTILHADO */}
              {currentRoom.type && (
                <div className="space-y-2">
                  <Label>Este cômodo é compartilhado?</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={currentRoom.isShared ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updateRoom(selectedRoomIndex, { isShared: true })}
                    >
                      Sim
                    </Button>
                    <Button
                      type="button"
                      variant={!currentRoom.isShared ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updateRoom(selectedRoomIndex, { isShared: false })}
                    >
                      Não
                    </Button>
                  </div>
                </div>
              )}

              {/* CAMAS (apenas para quartos e salas) */}
              {allowsBeds && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Camas</h3>
                    <p className="text-sm text-muted-foreground">
                      Adicione os tipos de camas disponíveis neste cômodo
                    </p>
                  </div>

                  <div className="space-y-3">
                    {BED_TYPES.map((bedType) => {
                      const count = currentRoom.beds[bedType.id] || 0;
                      return (
                        <div key={bedType.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{bedType.icon}</span>
                            <span className="text-sm">{bedType.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateBedCount(selectedRoomIndex, bedType.id, -1)}
                              disabled={count === 0}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">{count}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateBedCount(selectedRoomIndex, bedType.id, 1)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FOTOS DO CÔMODO */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Fotos do cômodo</h3>
                  <p className="text-sm text-muted-foreground">
                    A primeira foto será a foto de capa. Arraste para reordenar.
                  </p>
                </div>

                {/* Botões de ação */}
                {currentRoom.photos.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllPhotos}
                      disabled={selectedPhotos.length === currentRoom.photos.length}
                    >
                      Selecionar Todas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllPhotos}
                      disabled={selectedPhotos.length === 0}
                    >
                      Desmarcar Todas
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setShowTagsModal(true)}
                      disabled={selectedPhotos.length === 0}
                    >
                      <TagIcon className="h-4 w-4 mr-2" />
                      Adicionar Tags ({selectedPhotos.length})
                    </Button>
                  </div>
                )}

                {/* Upload Area */}
                <Card className="border-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    {uploadingPhotos ? (
                      <>
                        <Loader2 className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Fazendo upload das fotos...
                        </p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Arraste suas imagens para cá ou clique para carregar.
                        </p>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id={`photo-upload-${currentRoom.id}`}
                          disabled={uploadingPhotos}
                        />
                        <label htmlFor={`photo-upload-${currentRoom.id}`}>
                          <Button type="button" variant="outline" asChild disabled={uploadingPhotos}>
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Selecionar Imagens
                            </span>
                          </Button>
                        </label>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Grid de Fotos */}
                {currentRoom.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {currentRoom.photos.map((photo) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={() => handleDragStart(photo.id)}
                        onDragOver={(e) => handleDragOver(e, photo.id)}
                        onDragEnd={handleDragEnd}
                        className={`relative group rounded-lg overflow-hidden border-2 cursor-move ${
                          selectedPhotos.includes(photo.id)
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-transparent'
                        }`}
                      >
                        {/* Checkbox de seleção */}
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedPhotos.includes(photo.id)}
                            onCheckedChange={() => togglePhotoSelection(photo.id)}
                            className="bg-white"
                          />
                        </div>

                        {/* Ícone de Drag */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>

                        {/* Imagem */}
                        <img
                          src={photo.url}
                          alt="Preview"
                          className="w-full aspect-square object-cover"
                        />

                        {/* Overlay com ações */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <div className="flex gap-1 w-full justify-end">
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-7 w-7"
                              onClick={() => deletePhoto(photo.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Tags */}
                        {photo.tags.length > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <div className="flex flex-wrap gap-1">
                              {photo.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                  onClick={() => removePhotoTag(photo.id, tag)}
                                >
                                  {tag}
                                  <span className="ml-1 cursor-pointer">×</span>
                                </Badge>
                              ))}
                              {photo.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{photo.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Clique em "Adicionar cômodo" para começar
                </p>
              </CardContent>
            </Card>
          )}
        </ScrollArea>
      </div>

      {/* MODAL DE TAGS */}
      {showTagsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardContent className="p-6 flex flex-col gap-4 flex-1 overflow-hidden">
              <div>
                <h3 className="text-lg font-semibold">Adicionar Tags</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione as tags para adicionar às {selectedPhotos.length} foto(s) selecionada(s)
                </p>
              </div>

              <Separator />

              <ScrollArea className="flex-1">
                <TagsSelector
                  onApply={(tags) => applyTagsToSelected(tags)}
                  onCancel={() => setShowTagsModal(false)}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAGS SELECTOR COMPONENT
// ============================================================================

function TagsSelector({
  onApply,
  onCancel,
}: {
  onApply: (tags: string[]) => void;
  onCancel: () => void;
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTags = PHOTO_TAGS.filter((tag) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const newTags = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      console.log('Tags selecionadas (ContentRoomsStep):', newTags);
      return newTags;
    });
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="space-y-2">
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <div
              key={tag}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted ${
                selectedTags.includes(tag) ? 'bg-primary/10 border-primary' : ''
              }`}
              onClick={() => toggleTag(tag)}
            >
              <Checkbox checked={selectedTags.includes(tag)} />
              <span className="text-sm">{tag}</span>
              {selectedTags.includes(tag) && <Check className="h-4 w-4 ml-auto text-primary" />}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma tag encontrada para &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <span className="text-sm text-muted-foreground">
          {selectedTags.length} tag(s) selecionada(s)
        </span>
        <Button onClick={() => onApply(selectedTags)} disabled={selectedTags.length === 0}>
          <Check className="mr-2 h-4 w-4" />
          Confirmar
        </Button>
      </div>
    </div>
  );
}

export default ContentRoomsStep;
