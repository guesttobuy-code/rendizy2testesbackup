import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Upload, X, File, Image, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document';
  file?: File;
  size?: number;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
  className,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: File[] = Array.from(selectedFiles);
    
    // Validar número máximo de arquivos
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    // Validar tamanho e processar arquivos
    const validFiles: UploadedFile[] = [];
    
    for (const file of newFiles) {
      // Validar tamanho
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        toast.error(`Arquivo "${file.name}" excede o tamanho máximo de ${maxSizeMB}MB`);
        continue;
      }

      // Determinar tipo
      const isImage = file.type.startsWith('image/');
      const type: 'image' | 'document' = isImage ? 'image' : 'document';

      // Criar URL temporária (em produção, fazer upload para servidor)
      const url = URL.createObjectURL(file);

      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        url,
        type,
        file,
        size: file.size,
      });
    }

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
      toast.success(`${validFiles.length} arquivo(s) adicionado(s)`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove?.url && fileToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    onFilesChange(files.filter(f => f.id !== fileId));
    toast.success('Arquivo removido');
  };

  const getFileIcon = (type: 'image' | 'document') => {
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Arraste arquivos aqui ou{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary hover:underline"
            disabled={disabled}
          >
            clique para selecionar
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Máximo {maxFiles} arquivos, {maxSizeMB}MB cada
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'} anexado(s)
            </p>
            {files.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  files.forEach(f => {
                    if (f.url && f.url.startsWith('blob:')) {
                      URL.revokeObjectURL(f.url);
                    }
                  });
                  onFilesChange([]);
                }}
                disabled={disabled}
              >
                Remover todos
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {file.type === 'image' ? 'Imagem' : 'Documento'} • {formatFileSize(file.size)}
                  </p>
                </div>
                {file.type === 'image' && (
                  <div className="flex-shrink-0">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={disabled}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

