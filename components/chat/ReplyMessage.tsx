/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                        REPLY MESSAGE COMPONENT                             ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.2 - Responder Mensagem Específica (Quote)                     ║
 * ║  📱 WAHA_INTEGRATION - POST /api/sendText + quotedMsgId                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para exibir prévia de mensagem sendo respondida (quoted).
 * Mostra a mensagem citada no input e na bolha de mensagem.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA API (reply):
 * ```
 * POST /api/sendText
 * Body: { 
 *   session: "default",
 *   chatId: "123@c.us",
 *   text: "Minha resposta",
 *   reply_to: "true_123@c.us_ABC123"  // ID da mensagem citada
 * }
 * ```
 */

import { X, Reply, CornerDownRight } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface QuotedMessage {
  /** ID da mensagem citada (WAHA messageId) */
  id: string;
  /** Texto da mensagem citada */
  text: string;
  /** Se a mensagem citada é minha */
  fromMe: boolean;
  /** Nome do remetente */
  senderName?: string;
  /** Se tem mídia */
  hasMedia?: boolean;
  /** Tipo de mídia */
  mediaType?: 'image' | 'video' | 'audio' | 'document';
}

export interface ReplyPreviewProps {
  /** Mensagem sendo respondida */
  quotedMessage: QuotedMessage;
  /** Callback para cancelar reply */
  onCancel: () => void;
  /** Classes adicionais */
  className?: string;
}

export interface QuotedMessageDisplayProps {
  /** Mensagem citada */
  quotedMessage: QuotedMessage;
  /** Se a mensagem que contém a citação é minha */
  parentFromMe?: boolean;
  /** Callback ao clicar (scroll to message) */
  onClick?: () => void;
  /** Classes adicionais */
  className?: string;
}

// ============================================
// REPLY PREVIEW (shown in input area)
// ============================================

/**
 * Mostra preview da mensagem sendo respondida no input area.
 * Aparece acima do campo de texto quando o usuário clica em "Responder".
 */
export function ReplyPreview({
  quotedMessage,
  onCancel,
  className
}: ReplyPreviewProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 bg-gray-100 dark:bg-gray-800 border-l-4 border-green-500 rounded-r',
        className
      )}
    >
      <Reply className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-green-600 dark:text-green-400">
          {quotedMessage.fromMe ? 'Você' : (quotedMessage.senderName || 'Contato')}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
          {quotedMessage.hasMedia ? (
            <span className="italic">
              {quotedMessage.mediaType === 'image' && '📷 Imagem'}
              {quotedMessage.mediaType === 'video' && '🎬 Vídeo'}
              {quotedMessage.mediaType === 'audio' && '🎵 Áudio'}
              {quotedMessage.mediaType === 'document' && '📄 Documento'}
              {quotedMessage.text && ` - ${quotedMessage.text}`}
            </span>
          ) : (
            quotedMessage.text || '...'
          )}
        </p>
      </div>
      
      <button
        onClick={onCancel}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        title="Cancelar resposta"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

// ============================================
// QUOTED MESSAGE DISPLAY (shown in message bubble)
// ============================================

/**
 * Mostra a mensagem citada dentro da bolha de mensagem.
 * Aparece na parte superior da bolha quando a mensagem é uma resposta.
 */
export function QuotedMessageDisplay({
  quotedMessage,
  parentFromMe = false,
  onClick,
  className
}: QuotedMessageDisplayProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-1.5 p-2 rounded cursor-pointer transition-colors',
        parentFromMe 
          ? 'bg-green-600/50 hover:bg-green-600/70' 
          : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700',
        'border-l-2',
        quotedMessage.fromMe 
          ? 'border-green-400' 
          : 'border-blue-400',
        className
      )}
    >
      <CornerDownRight 
        className={cn(
          'w-3 h-3 flex-shrink-0 mt-0.5',
          parentFromMe ? 'text-green-200' : 'text-gray-400'
        )} 
      />
      
      <div className="flex-1 min-w-0">
        <p 
          className={cn(
            'text-[10px] font-medium',
            parentFromMe 
              ? (quotedMessage.fromMe ? 'text-green-200' : 'text-blue-200')
              : (quotedMessage.fromMe ? 'text-green-600' : 'text-blue-600')
          )}
        >
          {quotedMessage.fromMe ? 'Você' : (quotedMessage.senderName || 'Contato')}
        </p>
        <p 
          className={cn(
            'text-xs truncate',
            parentFromMe ? 'text-green-100' : 'text-gray-600 dark:text-gray-300'
          )}
        >
          {quotedMessage.hasMedia ? (
            <span className="italic">
              {quotedMessage.mediaType === 'image' && '📷 Imagem'}
              {quotedMessage.mediaType === 'video' && '🎬 Vídeo'}
              {quotedMessage.mediaType === 'audio' && '🎵 Áudio'}
              {quotedMessage.mediaType === 'document' && '📄 Documento'}
              {quotedMessage.text && ` - ${quotedMessage.text}`}
            </span>
          ) : (
            quotedMessage.text || '...'
          )}
        </p>
      </div>
    </div>
  );
}

// ============================================
// REPLY BUTTON (for message context menu)
// ============================================

export interface ReplyButtonProps {
  /** Callback quando clicado */
  onClick: () => void;
  /** Classes adicionais */
  className?: string;
}

export function ReplyButton({ onClick, className }: ReplyButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-full',
        'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600',
        'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
        'transition-all hover:scale-110',
        className
      )}
      title="Responder"
    >
      <Reply className="w-4 h-4" />
    </button>
  );
}

export default ReplyPreview;
