/**
 * 📸 AVATAR UPLOAD - Componente de Upload de Foto de Perfil
 * v1.0.0 - 2026-01-25
 * 
 * Permite ao usuário:
 * - Fazer upload de nova foto de perfil
 * - Visualizar preview antes de salvar
 * - Remover foto atual
 */
import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';
import { getSupabaseClient } from '../../utils/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

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
      const supabase = getSupabaseClient();
      
      // Gerar nome único para o arquivo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        // Se o bucket não existir, tentar usar URL base64
        console.warn('Erro no upload para storage:', uploadError);
        
        // Fallback: salvar como base64 diretamente no banco
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Url = reader.result as string;
          
          // Atualizar usuário com avatar base64
          const { error: updateError } = await (supabase
            .from('users') as any)
            .update({ avatar_url: base64Url })
            .eq('id', user.id);

          if (updateError) {
            throw updateError;
          }

          toast.success('Foto de perfil atualizada!');
          setSelectedFile(null);
          setPreviewUrl(null);
          onAvatarChange?.(base64Url);
          refreshUser?.();
        };
        reader.readAsDataURL(selectedFile);
        return;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar usuário com nova URL
      const { error: updateError } = await (supabase
        .from('users') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Foto de perfil atualizada!');
      setSelectedFile(null);
      setPreviewUrl(null);
      onAvatarChange?.(publicUrl);
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
      const supabase = getSupabaseClient();

      // Atualizar usuário removendo avatar
      const { error: updateError } = await (supabase
        .from('users') as any)
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
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
