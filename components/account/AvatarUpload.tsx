/**
 * 📸 AVATAR UPLOAD - Componente de Upload de Foto de Perfil
 * v1.2.0 - 2026-01-26
 * 
 * Permite ao usuário:
 * - Fazer upload de nova foto de perfil
 * - Visualizar preview antes de salvar
 * - Remover foto atual
 * 
 * ✅ v1.2.0: Upload direto para Storage + API para salvar URL (evita limite de payload)
 */
import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange?: (newUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
};

const iconSizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

export function AvatarUpload({ 
  currentAvatarUrl, 
  onAvatarChange,
  size = 'lg',
  className 
}: AvatarUploadProps) {
  const { user, refreshUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentAvatarUrl;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Função para redimensionar imagem para avatar (max 200x200)
  const resizeImage = (file: File, maxSize: number = 200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Redimensionar mantendo proporção
          if (width > height) {
            if (width > maxSize) {
              height = height * (maxSize / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = width * (maxSize / height);
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converter para base64 com qualidade 80%
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.id) return;

    setIsUploading(true);
    try {
      console.log('🔄 [AvatarUpload] Redimensionando imagem...');
      
      // Redimensionar para max 200x200 (avatar pequeno)
      const resizedBase64 = await resizeImage(selectedFile, 200);
      console.log('🔄 [AvatarUpload] Base64 após resize:', resizedBase64.length, 'bytes');
      
      // Enviar base64 redimensionado para API (agora cabe no payload)
      console.log('🔄 [AvatarUpload] Salvando no banco via API...');
      const response = await apiRequest<any>('/me/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: resizedBase64 })
      });
      
      console.log('📥 [AvatarUpload] Response:', response);
      
      if (!response.success) {
        console.error('❌ [AvatarUpload] API retornou erro:', response);
        throw new Error(response.error || 'Erro ao atualizar avatar');
      }

      console.log('✅ [AvatarUpload] Avatar atualizado com sucesso!');
      toast.success('Foto de perfil atualizada!');
      setSelectedFile(null);
      setPreviewUrl(null);
      onAvatarChange?.(resizedBase64);
      refreshUser?.();
      
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      toast.error(err.message || 'Erro ao atualizar foto de perfil');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      // ✅ v1.1.0: Usar API /me/avatar ao invés de Supabase direto
      const response = await apiRequest<any>('/me/avatar', {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: null })
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao remover avatar');
      }

      toast.success('Foto de perfil removida');
      setPreviewUrl(null);
      setSelectedFile(null);
      onAvatarChange?.(null);
      refreshUser?.();
      
    } catch (err: any) {
      console.error('Erro ao remover avatar:', err);
      toast.error('Erro ao remover foto de perfil');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelPreview = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Avatar Circle */}
      <div className="relative group">
        <div 
          className={cn(
            'rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600',
            'flex items-center justify-center',
            'ring-4 ring-white dark:ring-gray-800 shadow-xl',
            sizeClasses[size]
          )}
        >
          {displayUrl ? (
            <img 
              src={displayUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={cn(
              'font-bold text-white',
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-2xl' : 'text-3xl'
            )}>
              {getInitials(user?.name || 'U')}
            </span>
          )}
        </div>

        {/* Overlay de câmera ao hover */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100',
            'flex items-center justify-center transition-opacity cursor-pointer',
            isUploading && 'opacity-100'
          )}
        >
          {isUploading ? (
            <Loader2 className={cn('text-white animate-spin', iconSizes[size])} />
          ) : (
            <Camera className={cn('text-white', iconSizes[size])} />
          )}
        </button>

        {/* Badge de upload quando tem arquivo selecionado */}
        {selectedFile && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 shadow-lg">
            <Upload className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-2 justify-center">
        {selectedFile ? (
          <>
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Salvar foto
                </>
              )}
            </Button>
            <Button
              onClick={cancelPreview}
              disabled={isUploading}
              size="sm"
              variant="outline"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              variant="outline"
            >
              <Camera className="h-4 w-4 mr-2" />
              {currentAvatarUrl ? 'Alterar foto' : 'Adicionar foto'}
            </Button>
            {currentAvatarUrl && (
              <Button
                onClick={handleRemove}
                disabled={isUploading}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Formatos: JPG, PNG, GIF • Máximo: 5MB
      </p>
    </div>
  );
}
