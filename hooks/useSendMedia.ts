/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         USE SEND MEDIA HOOK                                ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.6/3.7/3.8 - Envio de Mídia (Imagem/Arquivo/Áudio)            ║
 * ║  📱 WAHA_INTEGRATION - POST /api/sendImage, /api/sendFile, /api/sendVoice ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para enviar mídia via WAHA API.
 * Suporta imagens, documentos e áudio.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA APIs:
 * ```
 * POST /api/sendImage
 * Body: { session, chatId, file: { mimetype, filename, data: base64 }, caption? }
 * 
 * POST /api/sendFile
 * Body: { session, chatId, file: { mimetype, filename, data: base64 }, caption? }
 * 
 * POST /api/sendVoice  
 * Body: { session, chatId, file: { mimetype: "audio/ogg; codecs=opus", data: base64 } }
 * ```
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type MediaType = 'image' | 'document' | 'audio' | 'video';

export interface SendMediaOptions {
  /** WAHA session name */
  session?: string;
  /** Chat ID (JID) */
  chatId: string;
  /** WAHA API base URL */
  wahaBaseUrl?: string;
  /** WAHA API key */
  wahaApiKey?: string;
  /** Callback on success */
  onSuccess?: (messageId: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface SendMediaResult {
  /** If sending was successful */
  success: boolean;
  /** Message ID returned by WAHA */
  messageId?: string;
  /** Error if any */
  error?: Error;
}

export interface UseSendMediaReturn {
  /** Send an image */
  sendImage: (file: File, caption?: string) => Promise<SendMediaResult>;
  /** Send a document/file */
  sendDocument: (file: File, caption?: string) => Promise<SendMediaResult>;
  /** Send a voice note */
  sendVoice: (audioBlob: Blob) => Promise<SendMediaResult>;
  /** Send any media (auto-detect type) */
  sendMedia: (file: File, caption?: string) => Promise<SendMediaResult>;
  /** Whether media is being sent */
  isSending: boolean;
  /** Upload progress (0-100) */
  progress: number;
  /** Last error */
  error: Error | null;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_WAHA_URL = 'http://76.13.82.60:3001';
const DEFAULT_WAHA_API_KEY = 'rendizy-waha-secret-2026';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (WhatsApp limit)

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AUDIO_TYPES = ['audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/3gpp'];

// ============================================
// HELPERS
// ============================================

/**
 * Detecta o tipo de mídia pelo MIME type
 */
function detectMediaType(mimeType: string): MediaType {
  if (IMAGE_TYPES.some(t => mimeType.startsWith(t.split('/')[0]))) {
    return 'image';
  }
  if (AUDIO_TYPES.some(t => mimeType.startsWith(t.split('/')[0]))) {
    return 'audio';
  }
  if (VIDEO_TYPES.some(t => mimeType.startsWith(t.split('/')[0]))) {
    return 'video';
  }
  return 'document';
}

/**
 * Converte File/Blob para base64
 */
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:type;base64,"
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

// ============================================
// HOOK
// ============================================

export function useSendMedia({
  session = 'default',
  chatId,
  wahaBaseUrl = DEFAULT_WAHA_URL,
  wahaApiKey = DEFAULT_WAHA_API_KEY,
  onSuccess,
  onError
}: SendMediaOptions): UseSendMediaReturn {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Envia imagem
   */
  const sendImage = useCallback(async (
    file: File,
    caption?: string
  ): Promise<SendMediaResult> => {
    if (!chatId) {
      return { success: false, error: new Error('chatId is required') };
    }

    if (file.size > MAX_FILE_SIZE) {
      const err = new Error('Arquivo muito grande (máx 16MB)');
      toast.error(err.message);
      return { success: false, error: err };
    }

    setIsSending(true);
    setProgress(0);
    setError(null);

    try {
      console.log('[useSendMedia] 📤 Enviando imagem:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      setProgress(25);
      const base64Data = await fileToBase64(file);
      setProgress(50);

      const response = await fetch(`${wahaBaseUrl}/api/sendImage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey
        },
        body: JSON.stringify({
          session,
          chatId,
          file: {
            mimetype: file.type || 'image/jpeg',
            filename: file.name,
            data: base64Data
          },
          caption
        })
      });

      setProgress(90);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WAHA error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setProgress(100);

      console.log('[useSendMedia] ✅ Imagem enviada:', data);

      const messageId = data.id || data.key?.id;
      onSuccess?.(messageId);

      return { success: true, messageId };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useSendMedia] ❌ Erro:', error);
      
      setError(error);
      onError?.(error);
      toast.error('Não foi possível enviar a imagem');

      return { success: false, error };
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  }, [chatId, session, wahaBaseUrl, wahaApiKey, onSuccess, onError]);

  /**
   * Envia documento
   */
  const sendDocument = useCallback(async (
    file: File,
    caption?: string
  ): Promise<SendMediaResult> => {
    if (!chatId) {
      return { success: false, error: new Error('chatId is required') };
    }

    if (file.size > MAX_FILE_SIZE) {
      const err = new Error('Arquivo muito grande (máx 16MB)');
      toast.error(err.message);
      return { success: false, error: err };
    }

    setIsSending(true);
    setProgress(0);
    setError(null);

    try {
      console.log('[useSendMedia] 📤 Enviando documento:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      setProgress(25);
      const base64Data = await fileToBase64(file);
      setProgress(50);

      const response = await fetch(`${wahaBaseUrl}/api/sendFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey
        },
        body: JSON.stringify({
          session,
          chatId,
          file: {
            mimetype: file.type || 'application/octet-stream',
            filename: file.name,
            data: base64Data
          },
          caption
        })
      });

      setProgress(90);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WAHA error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setProgress(100);

      console.log('[useSendMedia] ✅ Documento enviado:', data);

      const messageId = data.id || data.key?.id;
      onSuccess?.(messageId);

      return { success: true, messageId };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useSendMedia] ❌ Erro:', error);
      
      setError(error);
      onError?.(error);
      toast.error('Não foi possível enviar o arquivo');

      return { success: false, error };
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  }, [chatId, session, wahaBaseUrl, wahaApiKey, onSuccess, onError]);

  /**
   * Envia áudio/voz
   */
  const sendVoice = useCallback(async (
    audioBlob: Blob
  ): Promise<SendMediaResult> => {
    if (!chatId) {
      return { success: false, error: new Error('chatId is required') };
    }

    setIsSending(true);
    setProgress(0);
    setError(null);

    try {
      console.log('[useSendMedia] 📤 Enviando áudio:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      setProgress(25);
      const base64Data = await fileToBase64(audioBlob as File);
      setProgress(50);

      const response = await fetch(`${wahaBaseUrl}/api/sendVoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': wahaApiKey
        },
        body: JSON.stringify({
          session,
          chatId,
          file: {
            mimetype: audioBlob.type || 'audio/ogg; codecs=opus',
            data: base64Data
          }
        })
      });

      setProgress(90);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WAHA error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setProgress(100);

      console.log('[useSendMedia] ✅ Áudio enviado:', data);

      const messageId = data.id || data.key?.id;
      onSuccess?.(messageId);

      return { success: true, messageId };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useSendMedia] ❌ Erro:', error);
      
      setError(error);
      onError?.(error);
      toast.error('Não foi possível enviar o áudio');

      return { success: false, error };
    } finally {
      setIsSending(false);
      setProgress(0);
    }
  }, [chatId, session, wahaBaseUrl, wahaApiKey, onSuccess, onError]);

  /**
   * Envia qualquer mídia (auto-detect)
   */
  const sendMedia = useCallback(async (
    file: File,
    caption?: string
  ): Promise<SendMediaResult> => {
    const mediaType = detectMediaType(file.type);

    switch (mediaType) {
      case 'image':
        return sendImage(file, caption);
      case 'audio':
        return sendVoice(file);
      default:
        return sendDocument(file, caption);
    }
  }, [sendImage, sendDocument, sendVoice]);

  return {
    sendImage,
    sendDocument,
    sendVoice,
    sendMedia,
    isSending,
    progress,
    error
  };
}

export default useSendMedia;
