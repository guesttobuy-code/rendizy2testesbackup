/**
 * RENDIZY - Content Photos Step
 * 
 * Step 6 do wizard de conteúdo: Fotos e Mídia
 * 
 * FUNCIONALIDADES:
 * - Upload de múltiplas fotos
 * - Drag and drop
 * - Reordenação de fotos
 * - Definir foto de capa
 * - Preview de imagens
 * - Descrição por foto (multilíngue)
 * - Categorização de fotos (Quarto, Banheiro, Área Externa, etc)
 * - Compressão automática (REAL - v1.0.103.307)
 * 
 * @version 1.0.103.307
 * @date 2025-11-05
 * 
 * 🆕 v1.0.103.307:
 * - Compressão automática REAL implementada
 * - Integração com /utils/imageCompression.ts
 * - Fotos > 2MB comprimidas para ~1.9MB
 * - Feedback visual durante compressão
 * - Logs detalhados no console
 * - Toast com estatísticas de compressão
 */

import { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Star,
  GripVertical,
  Eye,
  Trash2,
  Plus,
  AlertCircle,
  Info,
  Check,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { compressImage, validateImageFile, formatFileSize } from '../../utils/imageCompression';

// ============================================================================
// TYPES
// ============================================================================

interface Photo {
  id: string;
  url: string;
  file?: File;
  category: string;
  isCover: boolean;
  order: number;
  descriptions: {
    pt?: string;
    en?: string;
    es?: string;
  };
}

interface ContentPhotosData {
  photos: Photo[];
}

interface ContentPhotosStepProps {
  data: ContentPhotosData;
  onChange: (data: ContentPhotosData) => void;
  propertyId?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const PHOTO_CATEGORIES = [
  { value: 'exterior', label: 'Fachada/Exterior' },
  { value: 'living', label: 'Sala de Estar' },
  { value: 'bedroom', label: 'Quarto' },
  { value: 'bathroom', label: 'Banheiro' },
  { value: 'kitchen', label: 'Cozinha' },
  { value: 'dining', label: 'Sala de Jantar' },
  { value: 'outdoor', label: 'Área Externa' },
  { value: 'pool', label: 'Piscina' },
  { value: 'gym', label: 'Academia' },
  { value: 'amenities', label: 'Comodidades' },
  { value: 'view', label: 'Vista' },
  { value: 'other', label: 'Outros' },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (será comprimido automaticamente)
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContentPhotosStep({
  data,
  onChange,
  propertyId,
}: ContentPhotosStepProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    const newPhotos: Photo[] = [];
    let compressedCount = 0;

    try {
      toast.info(`Processando ${files.length} arquivo(s)...`, {
        duration: 2000,
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar arquivo
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        const originalSize = file.size;
        const originalSizeMB = originalSize / 1024 / 1024;

        // Aplicar compressão se necessário (arquivo > 2MB)
        let processedFile = file;
        if (originalSize > 2 * 1024 * 1024) {
          try {
            console.log(`🗜️ Comprimindo ${file.name}...`);
            
            processedFile = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.85,
              maxSizeMB: 2,
            });

            const compressedSizeMB = processedFile.size / 1024 / 1024;
            const reductionPercent = ((1 - processedFile.size / originalSize) * 100).toFixed(0);
            
            compressedCount++;
            console.log(`✅ ${file.name}: ${originalSizeMB.toFixed(1)}MB → ${compressedSizeMB.toFixed(1)}MB (-${reductionPercent}%)`);
            
          } catch (error) {
            console.error('Erro ao comprimir:', error);
            toast.error(`Erro ao comprimir ${file.name}`);
            continue;
          }
        }

        // Criar preview com arquivo processado
        const url = URL.createObjectURL(processedFile);

        const photo: Photo = {
          id: `photo_${Date.now()}_${i}`,
          url,
          file: processedFile,
          category: 'other',
          isCover: data.photos.length === 0 && i === 0, // Primeira foto é capa
          order: data.photos.length + i,
          descriptions: {},
        };

        newPhotos.push(photo);
      }

      if (newPhotos.length > 0) {
        onChange({
          ...data,
          photos: [...data.photos, ...newPhotos],
        });

        // Mensagem de sucesso com informação sobre compressão
        if (compressedCount > 0) {
          toast.success(
            `${newPhotos.length} foto(s) adicionada(s) • ${compressedCount} comprimida(s)`,
            { duration: 4000 }
          );
        } else {
          toast.success(`${newPhotos.length} foto(s) adicionada(s)`);
        }
      }

    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      toast.error('Erro ao processar arquivos');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removePhoto = (id: string) => {
    const updated = data.photos.filter((p) => p.id !== id);
    
    // Se removeu a foto de capa, definir a primeira como capa
    if (data.photos.find((p) => p.id === id)?.isCover && updated.length > 0) {
      updated[0].isCover = true;
    }

    onChange({
      ...data,
      photos: updated,
    });

    toast.success('Foto removida');
  };

  const setCover = (id: string) => {
    const updated = data.photos.map((p) => ({
      ...p,
      isCover: p.id === id,
    }));

    onChange({
      ...data,
      photos: updated,
    });

    toast.success('Foto de capa atualizada');
  };

  const updatePhotoCategory = (id: string, category: string) => {
    const updated = data.photos.map((p) =>
      p.id === id ? { ...p, category } : p
    );

    onChange({
      ...data,
      photos: updated,
    });
  };

  const updatePhotoDescription = (id: string, lang: string, description: string) => {
    const updated = data.photos.map((p) =>
      p.id === id
        ? { ...p, descriptions: { ...p.descriptions, [lang]: description } }
        : p
    );

    onChange({
      ...data,
      photos: updated,
    });
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const updated = [...data.photos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Atualizar ordem
    updated.forEach((p, index) => {
      p.order = index;
    });

    onChange({
      ...data,
      photos: updated,
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null) return;
    if (draggedIndex === index) return;

    movePhoto(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Adicione fotos profissionais da propriedade. A primeira foto será usada como capa
          nos anúncios. Reordene arrastando as fotos.
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <Card className={`border-2 border-dashed ${isCompressing ? 'border-primary bg-primary/5' : 'border-muted'}`}>
        <CardContent
          className="p-8"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              {isCompressing ? (
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">
                {isCompressing 
                  ? 'Comprimindo imagens...' 
                  : 'Arraste fotos para cá ou clique para selecionar'
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                Aceito: JPG, PNG, WebP até 20MB • Compressão automática aplicada
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Comprimindo...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Selecionar Arquivos
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {data.photos.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="outline">
            {data.photos.length} foto(s) adicionada(s)
          </Badge>
          <Badge variant="secondary">
            <Star className="h-3 w-3 mr-1" />
            {data.photos.filter((p) => p.isCover).length} foto de capa
          </Badge>
        </div>
      )}

      {/* Photos Grid */}
      {data.photos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Fotos Carregadas</h3>
            <p className="text-xs text-muted-foreground">
              Arraste para reordenar
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.photos.map((photo, index) => (
              <div
                key={photo.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group rounded-lg overflow-hidden border-2 transition-all
                  ${photo.isCover ? 'border-yellow-500' : 'border-border'}
                  ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
                  hover:border-primary cursor-move
                `}
              >
                {/* Drag Handle */}
                <div className="absolute top-2 left-2 z-10 p-1 bg-black/50 rounded cursor-move">
                  <GripVertical className="h-4 w-4 text-white" />
                </div>

                {/* Cover Badge */}
                {photo.isCover && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-yellow-500 text-black">
                      <Star className="h-3 w-3 mr-1" />
                      Capa
                    </Badge>
                  </div>
                )}

                {/* Image */}
                <div className="aspect-square relative">
                  <img
                    src={photo.url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!photo.isCover && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setCover(photo.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removePhoto(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Category */}
                <div className="p-2 bg-muted">
                  <Select
                    value={photo.category}
                    onValueChange={(value) => updatePhotoCategory(photo.id, value)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-xs">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Details Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Detalhes da Foto</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
              <div className="aspect-video relative rounded-lg overflow-hidden border">
                <img
                  src={selectedPhoto.url}
                  alt="Preview"
                  className="w-full h-full object-contain bg-muted"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={selectedPhoto.category}
                  onValueChange={(value) =>
                    updatePhotoCategory(selectedPhoto.id, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHOTO_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cover */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label>Foto de Capa</Label>
                  <p className="text-xs text-muted-foreground">
                    Esta foto será destacada nos anúncios
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={selectedPhoto.isCover ? 'default' : 'outline'}
                  onClick={() => setCover(selectedPhoto.id)}
                >
                  {selectedPhoto.isCover ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      É Capa
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Definir como Capa
                    </>
                  )}
                </Button>
              </div>

              {/* Descriptions */}
              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <Tabs defaultValue="pt">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pt">🇧🇷 PT</TabsTrigger>
                    <TabsTrigger value="en">🇺🇸 EN</TabsTrigger>
                    <TabsTrigger value="es">🇪🇸 ES</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pt" className="space-y-2">
                    <Textarea
                      placeholder="Descrição em português..."
                      value={selectedPhoto.descriptions.pt || ''}
                      onChange={(e) =>
                        updatePhotoDescription(selectedPhoto.id, 'pt', e.target.value)
                      }
                      rows={3}
                    />
                  </TabsContent>
                  <TabsContent value="en" className="space-y-2">
                    <Textarea
                      placeholder="Description in English..."
                      value={selectedPhoto.descriptions.en || ''}
                      onChange={(e) =>
                        updatePhotoDescription(selectedPhoto.id, 'en', e.target.value)
                      }
                      rows={3}
                    />
                  </TabsContent>
                  <TabsContent value="es" className="space-y-2">
                    <Textarea
                      placeholder="Descripción en español..."
                      value={selectedPhoto.descriptions.es || ''}
                      onChange={(e) =>
                        updatePhotoDescription(selectedPhoto.id, 'es', e.target.value)
                      }
                      rows={3}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    removePhoto(selectedPhoto.id);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Foto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPhoto(null)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {data.photos.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Dica:</strong> Adicione pelo menos 5 fotos de qualidade para melhorar
            a conversão dos seus anúncios. Fotos claras e bem iluminadas atraem mais
            hóspedes.
          </AlertDescription>
        </Alert>
      )}

      {/* Help */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Dicas de fotografia:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use luz natural sempre que possível</li>
            <li>Tire fotos em alta resolução (mínimo 1920x1080)</li>
            <li>Mostre todos os cômodos principais</li>
            <li>Inclua fotos da vista e áreas externas</li>
            <li>Evite fotos com pessoas ou objetos pessoais</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default ContentPhotosStep;
