/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       AUDIO RECORDER COMPONENT                             ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.8 - Gravação de Áudio                                         ║
 * ║  📱 WAHA_INTEGRATION - POST /api/sendVoice                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para gravar e enviar mensagens de voz.
 * Usa MediaRecorder API para captura de áudio.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface AudioRecorderProps {
  /** Callback quando áudio é gravado e pronto para envio */
  onRecordComplete: (blob: Blob, duration: number) => void;
  /** Se está enviando */
  isSending?: boolean;
  /** Classes adicionais */
  className?: string;
}

export interface UseAudioRecorderReturn {
  /** Iniciar gravação */
  startRecording: () => Promise<boolean>;
  /** Parar gravação */
  stopRecording: () => void;
  /** Cancelar gravação */
  cancelRecording: () => void;
  /** Se está gravando */
  isRecording: boolean;
  /** Duração em segundos */
  duration: number;
  /** Blob do áudio gravado */
  audioBlob: Blob | null;
  /** URL para preview */
  audioUrl: string | null;
  /** Erro se houver */
  error: Error | null;
  /** Se tem permissão de microfone */
  hasPermission: boolean | null;
}

// ============================================
// HOOK: useAudioRecorder
// ============================================

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      // Solicitar permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Criar MediaRecorder com formato OGG/Opus (preferido pelo WhatsApp)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Parar stream
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      // Iniciar gravação
      mediaRecorder.current.start(100); // chunks a cada 100ms
      setIsRecording(true);
      setDuration(0);

      // Timer para duração
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      console.log('[AudioRecorder] 🎙️ Gravação iniciada');
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[AudioRecorder] ❌ Erro ao iniciar:', error);
      
      if (error.name === 'NotAllowedError') {
        setHasPermission(false);
        setError(new Error('Permissão de microfone negada'));
      } else {
        setError(error);
      }
      
      return false;
    }
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      console.log('[AudioRecorder] ⏹️ Gravação parada, duração:', duration, 's');
    }
  }, [isRecording, duration]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
    }
    
    setIsRecording(false);
    setDuration(0);
    setAudioBlob(null);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    audioChunks.current = [];
    console.log('[AudioRecorder] ❌ Gravação cancelada');
  }, [isRecording, audioUrl]);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    hasPermission
  };
}

// ============================================
// HELPERS
// ============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// AUDIO RECORDER COMPONENT
// ============================================

export function AudioRecorder({
  onRecordComplete,
  isSending = false,
  className
}: AudioRecorderProps) {
  const {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    hasPermission
  } = useAudioRecorder();

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play/Pause preview
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle audio end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnd = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnd);
    return () => audio.removeEventListener('ended', handleEnd);
  }, [audioUrl]);

  // Send audio
  const handleSend = () => {
    if (audioBlob) {
      onRecordComplete(audioBlob, duration);
      cancelRecording(); // Reset state
    }
  };

  // Render error state
  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-red-500', className)}>
        <MicOff className="w-5 h-5" />
        <span className="text-sm">{error.message}</span>
      </div>
    );
  }

  // Render recording state
  if (isRecording) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Recording indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full" />
          <span className="text-sm font-medium">{formatDuration(duration)}</span>
        </div>

        {/* Cancel button */}
        <button
          onClick={cancelRecording}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          title="Cancelar"
        >
          <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Stop button */}
        <button
          onClick={stopRecording}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          title="Parar gravação"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Render preview state (audio recorded, not sent yet)
  if (audioBlob && audioUrl) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Hidden audio element for playback */}
        <audio ref={audioRef} src={audioUrl} />

        {/* Play/Pause */}
        <button
          onClick={togglePlayback}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          title={isPlaying ? 'Pausar' : 'Ouvir'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <Play className="w-4 h-4 text-gray-600 dark:text-gray-300 ml-0.5" />
          )}
        </button>

        {/* Duration */}
        <span className="text-sm text-gray-500 w-10">{formatDuration(duration)}</span>

        {/* Waveform placeholder */}
        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
          <div className="flex gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-500 rounded-full"
                style={{ 
                  height: `${Math.random() * 20 + 8}px`,
                  opacity: isPlaying ? 1 : 0.5
                }}
              />
            ))}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={cancelRecording}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Excluir"
        >
          <Trash2 className="w-4 h-4 text-gray-500" />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={isSending}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
          title="Enviar"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5 -ml-0.5" />
          )}
        </button>
      </div>
    );
  }

  // Render idle state (mic button)
  return (
    <button
      onClick={startRecording}
      className={cn(
        'w-10 h-10 flex items-center justify-center rounded-full',
        'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
        'text-gray-600 dark:text-gray-300 transition-colors',
        className
      )}
      title={hasPermission === false ? 'Permissão negada' : 'Gravar áudio'}
      disabled={hasPermission === false}
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}

export default AudioRecorder;
