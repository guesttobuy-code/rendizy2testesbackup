import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { PhotoManager, Photo } from './PhotoManager';
import { Button } from './ui/button';
import { Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  initialPhotos?: Photo[];
  onSave: (photos: Photo[]) => Promise<void>;
}

export function PropertyPhotosModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  initialPhotos = [],
  onSave
}: PropertyPhotosModalProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await onSave(photos);
      toast.success('Fotos salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar fotos:', error);
      toast.error('Erro ao salvar fotos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Liberar URLs de blob quando fechar
    photos.forEach(photo => {
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Galeria de Fotos - {propertyName}
          </DialogTitle>
          <DialogDescription>
            Organize as fotos do imóvel por cômodo. Arraste para reordenar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PhotoManager
            propertyId={propertyId}
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={50}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar {photos.length} Fotos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
