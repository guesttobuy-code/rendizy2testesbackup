/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       MESSAGE REACTIONS COMPONENT                          ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.1 - Reações a Mensagens (👍❤️😂)                              ║
 * ║  📱 WAHA_INTEGRATION - PUT /api/reaction                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para exibir e enviar reações a mensagens.
 * Suporta reações nativas do WhatsApp.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA API:
 * ```
 * PUT /api/reaction
 * Body: { 
 *   session: "default",
 *   chatId: "123@c.us",
 *   messageId: "true_123@c.us_ABC123",
 *   reaction: "👍" // ou "" para remover
 * }
 * ```
 */

import { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface Reaction {
  /** Emoji da reação */
  emoji: string;
  /** ID do usuário que reagiu */
  userId?: string;
  /** Timestamp da reação */
  timestamp?: number;
}

export interface MessageReactionsProps {
  /** ID da mensagem (WAHA messageId) */
  messageId: string;
  /** Chat ID (JID) */
  chatId: string;
  /** Reações existentes na mensagem */
  reactions?: Reaction[];
  /** Se a mensagem é minha (enviada por mim) */
  fromMe?: boolean;
  /** Callback quando reação é enviada */
  onReact?: (messageId: string, emoji: string) => Promise<void>;
  /** Mostrar apenas o botão (sem reações existentes) */
  buttonOnly?: boolean;
  /** Tamanho do componente */
  size?: 'sm' | 'md' | 'lg';
  /** Classes adicionais */
  className?: string;
}

export interface ReactionPickerProps {
  /** Callback quando emoji é selecionado */
  onSelect: (emoji: string) => void;
  /** Callback para fechar picker */
  onClose: () => void;
  /** Se picker está aberto */
  isOpen: boolean;
  /** Posição do picker */
  position?: 'top' | 'bottom' | 'auto';
  /** Classes adicionais */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

/** Reações padrão do WhatsApp */
export const WHATSAPP_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/** Emojis populares para picker expandido */
export const POPULAR_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '🙏',
  '🔥', '👏', '🎉', '💪', '✅', '❌',
  '👌', '💯', '😍', '🤔', '😎', '🙌'
];

// ============================================
// REACTION PICKER
// ============================================

export function ReactionPicker({
  onSelect,
  onClose,
  isOpen,
  position = 'auto',
  className
}: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
    auto: 'bottom-full mb-1' // Default to top
  };

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 flex items-center gap-0.5 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95',
        positionClasses[position],
        className
      )}
    >
      {WHATSAPP_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
          }}
          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-transform hover:scale-125"
          title={`Reagir com ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full ml-1"
        title="Fechar"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MessageReactions({
  messageId,
  chatId: _chatId, // Reserved for future use (multi-chat reactions)
  reactions = [],
  fromMe = false,
  onReact,
  buttonOnly = false,
  size = 'sm',
  className
}: MessageReactionsProps) {
  // Note: chatId can be used for analytics or multi-chat features
  void _chatId;
  const [showPicker, setShowPicker] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const buttonSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-8 h-8'
  };

  const handleReact = async (emoji: string) => {
    if (!onReact || isReacting) return;

    try {
      setIsReacting(true);
      await onReact(messageId, emoji);
      setShowPicker(false);
    } catch (error) {
      console.error('[MessageReactions] Erro ao reagir:', error);
    } finally {
      setIsReacting(false);
    }
  };

  // Agrupar reações por emoji e contar
  const groupedReactions = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { emoji: r.emoji, count: 0 };
    }
    acc[r.emoji].count++;
    return acc;
  }, {} as Record<string, { emoji: string; count: number }>);

  const hasReactions = Object.keys(groupedReactions).length > 0;

  return (
    <div 
      className={cn(
        'relative flex items-center gap-1',
        sizeClasses[size],
        className
      )}
    >
      {/* Botão de reagir */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
          disabled={isReacting}
          className={cn(
            'flex items-center justify-center rounded-full transition-all',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'opacity-0 group-hover:opacity-100',
            buttonSizes[size],
            isReacting && 'opacity-50 cursor-wait'
          )}
          title="Reagir"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Reaction Picker */}
        <ReactionPicker
          isOpen={showPicker}
          onSelect={handleReact}
          onClose={() => setShowPicker(false)}
          position={fromMe ? 'top' : 'top'}
        />
      </div>

      {/* Reações existentes (se não for buttonOnly) */}
      {!buttonOnly && hasReactions && (
        <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100 dark:border-gray-700">
          {Object.values(groupedReactions).map(({ emoji, count }) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                handleReact(emoji);
              }}
              className="flex items-center gap-0.5 hover:scale-110 transition-transform"
              title={`${emoji} (${count})`}
            >
              <span>{emoji}</span>
              {count > 1 && (
                <span className="text-[10px] text-gray-500">{count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// QUICK REACTION BUTTON (for message hover)
// ============================================

export interface QuickReactionButtonProps {
  /** Callback quando reação é selecionada */
  onReact: (emoji: string) => void;
  /** Se está carregando */
  isLoading?: boolean;
  /** Classes adicionais */
  className?: string;
}

export function QuickReactionButton({
  onReact,
  isLoading,
  className
}: QuickReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        disabled={isLoading}
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-full',
          'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600',
          'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          'transition-all hover:scale-110',
          isLoading && 'opacity-50 cursor-wait'
        )}
        title="Reagir"
      >
        <Smile className="w-4 h-4" />
      </button>

      <ReactionPicker
        isOpen={showPicker}
        onSelect={(emoji) => {
          onReact(emoji);
          setShowPicker(false);
        }}
        onClose={() => setShowPicker(false)}
        position="top"
        className="right-0"
      />
    </div>
  );
}

export default MessageReactions;
