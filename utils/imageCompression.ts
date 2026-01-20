/**
 * Image Compression Utility
 * Compresses images before upload to reduce file size
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeMB: 2, // 2MB max after compression
};

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🗜️ Starting compression:', {
    fileName: file.name,
    originalSize: file.size,
    originalSizeMB: (file.size / 1024 / 1024).toFixed(2) + 'MB',
    type: file.type
  });

  // If file is already small enough, return it
  const maxBytes = (opts.maxSizeMB || 2) * 1024 * 1024;
  if (file.size <= maxBytes) {
    console.log('✅ File already small enough, skipping compression');
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        console.log('📐 Original dimensions:', {
          width: img.width,
          height: img.height
        });

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > (opts.maxWidth || 1920) || height > (opts.maxHeight || 1920)) {
          const ratio = Math.min(
            (opts.maxWidth || 1920) / width,
            (opts.maxHeight || 1920) / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        console.log('📐 New dimensions:', { width, height });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            console.log('✅ Compression complete:', {
              compressedSize: blob.size,
              compressedSizeMB: (blob.size / 1024 / 1024).toFixed(2) + 'MB',
              reduction: ((1 - blob.size / file.size) * 100).toFixed(1) + '%'
            });

            // Create new file from blob
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: file.type,
                lastModified: Date.now(),
              }
            );

            resolve(compressedFile);
          },
          file.type,
          opts.quality || 0.85
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Apenas JPG, PNG e WebP são permitidos'
    };
  }

  // Check file size (max 20MB before compression)
  const maxSizeBeforeCompression = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSizeBeforeCompression) {
    return {
      valid: false,
      error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB`
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
