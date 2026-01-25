/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         TYPING INDICATOR                                   ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Indicador "digitando..." com animação             ║
 * ║  💬 CHAT_UX - Melhora percepção de tempo real                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente visual para indicar que alguém está digitando.
 * Usado quando recebemos evento "typing" do WAHA/Evolution.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface TypingIndicatorProps {
  /** Se está digitando */
  isTyping: boolean;
  /** Nome de quem está digitando (opcional) */
  contactName?: string;
  /** Variante visual */
  variant?: 'bubble' | 'inline' | 'minimal';
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// ANIMATED DOTS
// ============================================

function AnimatedDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

// ============================================
// VARIANTS
// ============================================

function BubbleVariant({ contactName, className }: { contactName?: string; className?: string }) {
  return (
    <div className={cn('flex justify-start', className)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <AnimatedDots />
          <span className="text-xs">
            {contactName ? `${contactName} está digitando` : 'digitando'}
          </span>
        </div>
      </div>
    </div>
  );
}

function InlineVariant({ contactName, className }: { contactName?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm', className)}>
      <AnimatedDots />
      <span>
        {contactName ? `${contactName} está digitando...` : 'digitando...'}
      </span>
    </div>
  );
}

function MinimalVariant({ className }: { className?: string }) {
  return (
    <span className={cn('text-gray-400', className)}>
      <AnimatedDots />
    </span>
  );
}

// ============================================
// COMPONENT
// ============================================

export function TypingIndicator({
  isTyping,
  contactName,
  variant = 'bubble',
  className,
}: TypingIndicatorProps) {
  // Não renderizar se não está digitando
  if (!isTyping) return null;
  
  switch (variant) {
    case 'bubble':
      return <BubbleVariant contactName={contactName} className={className} />;
    case 'inline':
      return <InlineVariant contactName={contactName} className={className} />;
    case 'minimal':
      return <MinimalVariant className={className} />;
    default:
      return <BubbleVariant contactName={contactName} className={className} />;
  }
}

// ============================================
// TYPING STATUS BAR
// ============================================

export interface TypingStatusBarProps {
  /** Lista de contatos digitando */
  typingContacts: string[];
  /** Classe CSS adicional */
  className?: string;
}

export function TypingStatusBar({ typingContacts, className }: TypingStatusBarProps) {
  if (typingContacts.length === 0) return null;
  
  const text = (() => {
    if (typingContacts.length === 1) {
      return `${typingContacts[0]} está digitando...`;
    }
    if (typingContacts.length === 2) {
      return `${typingContacts[0]} e ${typingContacts[1]} estão digitando...`;
    }
    return `${typingContacts[0]} e mais ${typingContacts.length - 1} estão digitando...`;
  })();
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400',
      className
    )}>
      <AnimatedDots />
      <span>{text}</span>
    </div>
  );
}

export default TypingIndicator;
