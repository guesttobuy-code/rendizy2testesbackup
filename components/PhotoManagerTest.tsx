import React, { useState } from 'react';
import { Button } from './ui/button';
import { Image, Upload } from 'lucide-react';
import { PropertyPhotosModal } from './PropertyPhotosModal';
import { Photo } from './PhotoManager';
import { photosApi } from '../utils/api';
import { toast } from 'sonner';

interface PhotoManagerTestProps {
  properties: Array<{ id: string; name: string }>;
}

export function PhotoManagerTest({ properties }: PhotoManagerTestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(properties[0]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handleSavePhotos = async (photos: Photo[]) => {
    console.log('📸 PhotoManagerTest: Salvando fotos:', photos);
    console.log('🏠 Propriedade selecionada:', selectedProperty);
    
    // Filtrar fotos que precisam de upload
    const photosToUpload = photos.filter(p => p.file);
    console.log('📤 Fotos para upload:', photosToUpload.length);
    
    if (photosToUpload.length === 0) {
      console.log('ℹ️ Nenhuma foto nova para fazer upload');
      toast.success('Nenhuma alteração para salvar');
      return;
    }
    
    // Fazer upload de fotos que têm file (novas)
    const uploadPromises = photosToUpload.map(async (photo, index) => {
      console.log(`📤 Iniciando upload ${index + 1}/${photosToUpload.length}:`, {
        room: photo.room,
        fileName: photo.file?.name,
        fileSize: photo.file?.size
      });
      
      try {
        const result = await photosApi.upload(photo.file!, selectedProperty.id, photo.room);
        console.log(`✅ Upload ${index + 1} concluído:`, result);
        return result.data;
      } catch (error) {
        console.error(`❌ Erro no upload ${index + 1}:`, error);
        console.error('Detalhes do erro:', {
          message: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });

    try {
      console.log('⏳ Aguardando todos os uploads...');
      const uploadedPhotos = await Promise.all(uploadPromises);
      console.log('✅ Todos uploads concluídos:', uploadedPhotos);
      
      // Atualizar state com fotos do servidor
      setPhotos(photos.map(p => {
        if (p.file) {
          const uploaded = uploadedPhotos.find(up => up?.room === p.room);
          return uploaded || p;
        }
        return p;
      }));
      
      toast.success(`${uploadedPhotos.length} foto(s) salva(s) com sucesso!`);
    } catch (error) {
      console.error('❌ Erro geral ao salvar fotos:', error);
      toast.error(`Erro ao salvar fotos: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw error;
    }
  };

  return (
    <>
      {/* Botão flutuante de teste */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <select
          value={selectedProperty.id}
          onChange={(e) => {
            const prop = properties.find(p => p.id === e.target.value);
            if (prop) setSelectedProperty(prop);
          }}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-lg text-sm"
        >
          {properties.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="shadow-lg gap-2"
        >
          <Image className="h-5 w-5" />
          Testar Fotos
        </Button>
      </div>

      {/* Modal de Fotos */}
      <PropertyPhotosModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        propertyId={selectedProperty.id}
        propertyName={selectedProperty.name}
        initialPhotos={photos}
        onSave={handleSavePhotos}
      />
    </>
  );
}
