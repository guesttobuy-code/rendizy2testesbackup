import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Grip, Plus, Eye, Trash2, Home, Bed, Bath, Utensils, Sofa, Tv, Coffee } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import { compressImage, validateImageFile, formatFileSize } from '../utils/imageCompression';

export interface Photo {
  id: string;
  url: string;
  room: string;
  order: number;
  caption?: string;
  file?: File;
}

interface PhotoManagerProps {
  propertyId: string;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

const ROOMS = [
  { id: 'all', name: 'Todas as Fotos', icon: ImageIcon },
  { id: 'external', name: 'Fachada/Externa', icon: Home },
  { id: 'living', name: 'Sala de Estar', icon: Sofa },
  { id: 'kitchen', name: 'Cozinha', icon: Utensils },
  { id: 'bedroom', name: 'Quartos', icon: Bed },
  { id: 'bathroom', name: 'Banheiros', icon: Bath },
  { id: 'amenities', name: 'Comodidades', icon: Tv },
  { id: 'other', name: 'Outros', icon: Coffee },
];

export function PhotoManager({ 
  propertyId, 
  photos, 
  onPhotosChange,
  maxPhotos = 50 
}: PhotoManagerProps) {
  const [activeRoom, setActiveRoom] = useState('all');
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRoomPhotos = (room: string) => {
    if (room === 'all') return photos;
    return photos.filter(p => p.room === room);
  };

  const handleFileSelect = async (files: FileList | null, room: string) => {
    if (!files || files.length === 0) return;

    // Verificar limite
    if (photos.length + files.length > maxPhotos) {
      toast.error(`Limite de ${maxPhotos} fotos atingido`);
      return;
    }

    // Validar e comprimir fotos
    const newPhotos: Photo[] = [];
    let compressionCount = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validar arquivo
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Arquivo inválido');
        continue;
      }

      // Comprimir se necessário
      let processedFile = file;
      const originalSize = file.size;
      
      try {
        processedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          maxSizeMB: 2
        });
        
        if (processedFile.size < originalSize) {
          compressionCount++;
          console.log(`📸 Foto ${i + 1} comprimida:`, {
            original: formatFileSize(originalSize),
            compressed: formatFileSize(processedFile.size),
            reduction: ((1 - processedFile.size / originalSize) * 100).toFixed(1) + '%'
          });
        }
      } catch (error) {
        console.error('Erro ao comprimir imagem:', error);
        toast.error('Erro ao processar imagem');
        continue;
      }
      
      const url = URL.createObjectURL(processedFile);
      
      newPhotos.push({
        id: `temp-${Date.now()}-${i}`,
        url,
        room: room === 'all' ? 'external' : room,
        order: photos.length + i,
        file: processedFile
      });
    }

    if (newPhotos.length === 0) {
      return;
    }

    onPhotosChange([...photos, ...newPhotos]);
    
    if (compressionCount > 0) {
      toast.success(`${newPhotos.length} foto(s) adicionada(s) (${compressionCount} comprimida(s))`);
    } else {
      toast.success(`${newPhotos.length} foto(s) adicionada(s)`);
    }
  };

  const handleDrop = (e: React.DragEvent, targetRoom: string) => {
    e.preventDefault();
    
    if (e.dataTransfer.files.length > 0) {
      // Arquivo sendo dropado
      handleFileSelect(e.dataTransfer.files, targetRoom);
    } else if (draggedPhoto) {
      // Foto sendo reorganizada
      const photo = photos.find(p => p.id === draggedPhoto);
      if (photo && targetRoom !== 'all') {
        const updatedPhotos = photos.map(p =>
          p.id === draggedPhoto ? { ...p, room: targetRoom } : p
        );
        onPhotosChange(updatedPhotos);
        toast.success('Foto movida');
      }
      setDraggedPhoto(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDeletePhoto = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo?.url.startsWith('blob:')) {
      URL.revokeObjectURL(photo.url);
    }
    
    const updatedPhotos = photos
      .filter(p => p.id !== photoId)
      .map((p, idx) => ({ ...p, order: idx }));
    
    onPhotosChange(updatedPhotos);
    toast.success('Foto removida');
  };

  const reorderPhotos = (photoId: string, direction: 'up' | 'down') => {
    const roomPhotos = getRoomPhotos(activeRoom);
    const currentIndex = roomPhotos.findIndex(p => p.id === photoId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= roomPhotos.length) return;

    // Swap order
    const updatedPhotos = [...photos];
    const photo1 = updatedPhotos.find(p => p.id === photoId);
    const photo2 = updatedPhotos.find(p => p.id === roomPhotos[newIndex].id);
    
    if (photo1 && photo2) {
      const tempOrder = photo1.order;
      photo1.order = photo2.order;
      photo2.order = tempOrder;
    }

    onPhotosChange(updatedPhotos.sort((a, b) => a.order - b.order));
  };

  const getRoomIcon = (roomId: string) => {
    const room = ROOMS.find(r => r.id === roomId);
    return room?.icon || ImageIcon;
  };

  const filteredPhotos = getRoomPhotos(activeRoom);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Galeria de Fotos</h3>
          <p className="text-sm text-gray-500">
            {photos.length} de {maxPhotos} fotos • Organize por cômodo
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload de Fotos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={(e) => handleFileSelect(e.target.files, activeRoom)}
          className="hidden"
        />
      </div>

      {/* Tabs por cômodo */}
      <Tabs value={activeRoom} onValueChange={setActiveRoom}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {ROOMS.map(room => {
            const Icon = room.icon;
            const count = getRoomPhotos(room.id).length;
            
            return (
              <TabsTrigger 
                key={room.id} 
                value={room.id}
                className="gap-2 whitespace-nowrap"
              >
                <Icon className="h-4 w-4" />
                {room.name}
                {count > 0 && (
                  <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ROOMS.map(room => (
          <TabsContent key={room.id} value={room.id} className="mt-4">
            {/* Drop Zone */}
            {room.id !== 'all' && (
              <div
                onDrop={(e) => handleDrop(e, room.id)}
                onDragOver={handleDragOver}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 mb-4 transition-colors",
                  draggedPhoto 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                )}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Arraste fotos aqui ou clique para fazer upload
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG ou WebP • Máx {maxPhotos} fotos
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    Selecionar Arquivos
                  </Button>
                </div>
              </div>
            )}

            {/* Grid de Fotos */}
            {filteredPhotos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">
                  Nenhuma foto neste cômodo ainda
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPhotos.map((photo, index) => {
                  const Icon = getRoomIcon(photo.room);
                  
                  return (
                    <Card
                      key={photo.id}
                      draggable
                      onDragStart={() => setDraggedPhoto(photo.id)}
                      onDragEnd={() => setDraggedPhoto(null)}
                      className={cn(
                        "group relative overflow-hidden cursor-move transition-all",
                        draggedPhoto === photo.id && "opacity-50 scale-95"
                      )}
                    >
                      {/* Image */}
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Overlay com ações */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Botões de ação */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                              onClick={() => setPreviewPhoto(photo)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDeletePhoto(photo.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Ordem */}
                          <div className="absolute top-2 left-2">
                            <div className="bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Grip className="h-3 w-3" />
                              #{index + 1}
                            </div>
                          </div>

                          {/* Badge do cômodo */}
                          {activeRoom === 'all' && (
                            <div className="absolute bottom-2 left-2">
                              <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                {ROOMS.find(r => r.id === photo.room)?.name}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh]">
            <img
              src={previewPhoto.url}
              alt={previewPhoto.caption || 'Preview'}
              className="w-full h-full object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4"
              onClick={() => setPreviewPhoto(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
