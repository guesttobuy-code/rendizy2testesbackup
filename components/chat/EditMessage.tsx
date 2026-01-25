/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      EDIT MESSAGE COMPONENT                                ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.4 - Editar Mensagem Enviada                                   ║
 * ║  📱 WAHA_INTEGRATION - PUT /api/{session}/chats/{chatId}/messages/{msgId} ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente de dialog para editar mensagens enviadas.
 * Inclui botão de edição e dialog de edição.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState, useEffect, useRef } from 'react';
import { Pencil, X, Loader2, Check } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface EditMessageDialogProps {
  /** Se o dialog está aberto */
  isOpen: boolean;
  /** ID da mensagem */
  messageId: string;
  /** Texto original da mensagem */
  originalText: string;
  /** Callback quando salvar */
  onSave: (messageId: string, newText: string) => Promise<void>;
  /** Callback para fechar */
  onClose: () => void;
  /** Se está salvando */
  isSaving?: boolean;
  /** Classes adicionais */
  className?: string;
}

export interface EditButtonProps {
  /** Callback quando clicado */
  onClick: () => void;
  /** Se a mensagem pode ser editada (fromMe e dentro do limite de tempo) */
  canEdit?: boolean;
  /** Classes adicionais */
  className?: string;
}

// ============================================
// EDIT BUTTON
// ============================================

export function EditButton({ 
  onClick, 
  canEdit = true, 
  className 
}: EditButtonProps) {
  if (!canEdit) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-full',
        'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600',
        'text-gray-500 hover:text-blue-600 dark:hover:text-blue-400',
        'transition-all hover:scale-110',
        className
      )}
      title="Editar mensagem"
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );
}

// ============================================
// EDIT MESSAGE DIALOG
// ============================================

export function EditMessageDialog({
  isOpen,
  messageId,
  originalText,
  onSave,
  onClose,
  isSaving = false,
  className
}: EditMessageDialogProps) {
  const [text, setText] = useState(originalText);
  const [hasChanges, setHasChanges] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset quando abrir
  useEffect(() => {
    if (isOpen) {
      setText(originalText);
      setHasChanges(false);
      // Focus no input
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, originalText]);

  // Detectar mudanças
  useEffect(() => {
    setHasChanges(text.trim() !== originalText.trim() && text.trim().length > 0);
  }, [text, originalText]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && hasChanges && !isSaving) {
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, isSaving, onClose]);

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;
    await onSave(messageId, text.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          'w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Editar mensagem</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Original text preview */}
          <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium block mb-1">Original:</span>
            <span className="line-through">{originalText}</span>
          </div>

          {/* Edit textarea */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite o novo texto..."
            disabled={isSaving}
            className={cn(
              'w-full p-3 rounded-lg border resize-none',
              'border-gray-200 dark:border-gray-600',
              'bg-white dark:bg-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'text-sm'
            )}
            rows={4}
          />

          {/* Character count */}
          <div className="mt-1 text-xs text-gray-400 text-right">
            {text.length} caracteres
          </div>

          {/* Info */}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            💡 Dica: A mensagem editada mostrará "(editada)" para o destinatário.
            Ctrl+Enter para salvar.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2',
              'transition-colors',
              hasChanges && !isSaving
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER: Check if message can be edited
// ============================================

/**
 * Verifica se uma mensagem pode ser editada
 * @param message - Objeto da mensagem
 * @param maxAgeMinutes - Tempo máximo em minutos (default: 15)
 * @returns true se pode editar
 */
export function canEditMessage(
  message: { fromMe?: boolean; timestamp?: number | Date; hasMedia?: boolean },
  maxAgeMinutes: number = 15
): boolean {
  // Só pode editar mensagens próprias
  if (!message.fromMe) return false;
  
  // Não pode editar mensagens de mídia
  if (message.hasMedia) return false;
  
  // Verificar idade da mensagem
  if (message.timestamp) {
    const messageTime = typeof message.timestamp === 'number' 
      ? message.timestamp * 1000 // Unix timestamp em segundos
      : new Date(message.timestamp).getTime();
    
    const now = Date.now();
    const ageMinutes = (now - messageTime) / (1000 * 60);
    
    if (ageMinutes > maxAgeMinutes) return false;
  }
  
  return true;
}

export default EditMessageDialog;
