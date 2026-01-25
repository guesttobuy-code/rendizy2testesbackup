/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      DELETE MESSAGE COMPONENT                              ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.5 - Deletar Mensagem ("Apagar para todos")                    ║
 * ║  📱 WAHA_INTEGRATION - DELETE /api/{session}/chats/{chatId}/messages/{id} ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente de dialog para deletar mensagens.
 * Suporta "apagar para mim" e "apagar para todos".
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState } from 'react';
import { Trash2, X, Loader2, AlertTriangle, Users, User } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface DeleteMessageDialogProps {
  /** Se o dialog está aberto */
  isOpen: boolean;
  /** ID da mensagem */
  messageId: string;
  /** Preview do texto da mensagem */
  messagePreview?: string;
  /** Se a mensagem é minha (fromMe) - afeta opções disponíveis */
  isOwnMessage?: boolean;
  /** Se pode apagar para todos (dentro do limite de tempo) */
  canDeleteForEveryone?: boolean;
  /** Callback quando deletar */
  onDelete: (messageId: string, forEveryone: boolean) => Promise<void>;
  /** Callback para fechar */
  onClose: () => void;
  /** Se está deletando */
  isDeleting?: boolean;
  /** Classes adicionais */
  className?: string;
}

export interface DeleteButtonProps {
  /** Callback quando clicado */
  onClick: () => void;
  /** Classes adicionais */
  className?: string;
}

// ============================================
// DELETE BUTTON
// ============================================

export function DeleteButton({ onClick, className }: DeleteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-full',
        'bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600',
        'text-gray-500 hover:text-red-600 dark:hover:text-red-400',
        'transition-all hover:scale-110',
        className
      )}
      title="Apagar mensagem"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ============================================
// DELETE MESSAGE DIALOG
// ============================================

export function DeleteMessageDialog({
  isOpen,
  messageId,
  messagePreview,
  isOwnMessage = true,
  canDeleteForEveryone = true,
  onDelete,
  onClose,
  isDeleting = false,
  className
}: DeleteMessageDialogProps) {
  const [deleteOption, setDeleteOption] = useState<'me' | 'everyone'>(
    isOwnMessage && canDeleteForEveryone ? 'everyone' : 'me'
  );

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (isDeleting) return;
    await onDelete(messageId, deleteOption === 'everyone');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={cn(
          'w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-xl',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold">Apagar mensagem?</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Message Preview */}
          {messagePreview && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                "{messagePreview}"
              </p>
            </div>
          )}

          {/* Delete Options */}
          <div className="space-y-2">
            {/* Option: Delete for me */}
            <button
              onClick={() => setDeleteOption('me')}
              disabled={isDeleting}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                deleteOption === 'me'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              )}
            >
              <User className={cn(
                'w-5 h-5',
                deleteOption === 'me' ? 'text-red-500' : 'text-gray-400'
              )} />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Apagar para mim</p>
                <p className="text-xs text-gray-500">
                  A mensagem será removida apenas para você
                </p>
              </div>
              {deleteOption === 'me' && (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>

            {/* Option: Delete for everyone */}
            {isOwnMessage && (
              <button
                onClick={() => canDeleteForEveryone && setDeleteOption('everyone')}
                disabled={isDeleting || !canDeleteForEveryone}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                  deleteOption === 'everyone' && canDeleteForEveryone
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-600',
                  !canDeleteForEveryone && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Users className={cn(
                  'w-5 h-5',
                  deleteOption === 'everyone' && canDeleteForEveryone ? 'text-red-500' : 'text-gray-400'
                )} />
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">Apagar para todos</p>
                  <p className="text-xs text-gray-500">
                    {canDeleteForEveryone 
                      ? 'A mensagem será removida para todos' 
                      : 'Tempo limite excedido (máx. ~1 hora)'
                    }
                  </p>
                </div>
                {deleteOption === 'everyone' && canDeleteForEveryone && (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Warning */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Esta ação não pode ser desfeita.
              {deleteOption === 'everyone' && ' O destinatário verá "Esta mensagem foi apagada".'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2',
              'bg-red-500 text-white hover:bg-red-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Apagando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Apagar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER: Check if message can be deleted for everyone
// ============================================

/**
 * Verifica se uma mensagem pode ser apagada para todos
 * @param message - Objeto da mensagem
 * @param maxAgeMinutes - Tempo máximo em minutos (default: 60 - WhatsApp permite ~1h)
 * @returns true se pode apagar para todos
 */
export function canDeleteForEveryone(
  message: { fromMe?: boolean; timestamp?: number | Date },
  maxAgeMinutes: number = 60
): boolean {
  // Só pode apagar para todos as próprias mensagens
  if (!message.fromMe) return false;
  
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

export default DeleteMessageDialog;
