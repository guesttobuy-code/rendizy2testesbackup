/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      FORWARD MESSAGE COMPONENT                             ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.3 - Encaminhar Mensagem                                       ║
 * ║  📱 WAHA_INTEGRATION - POST /api/forwardMessage                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente e hook para encaminhar mensagens para outros chats.
 * Permite selecionar múltiplos destinatários.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 * 
 * WAHA API:
 * ```
 * POST /api/forwardMessage
 * Body: { 
 *   session: "default",
 *   chatId: "123@c.us",           // Destino
 *   messageId: "true_xxx_ABC123"  // Mensagem a encaminhar
 * }
 * ```
 */

import { useState, useCallback } from 'react';
import { Forward, Check, Loader2, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface ForwardContact {
  /** ID do chat (JID) */
  chatId: string;
  /** Nome do contato */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Último mensagem (preview) */
  lastMessage?: string;
}

export interface ForwardDialogProps {
  /** Se o dialog está aberto */
  isOpen: boolean;
  /** Mensagem a encaminhar */
  messageId: string;
  /** Preview do texto da mensagem */
  messagePreview?: string;
  /** Lista de contatos disponíveis */
  contacts: ForwardContact[];
  /** Callback quando encaminha */
  onForward: (messageId: string, targets: string[]) => Promise<void>;
  /** Callback para fechar */
  onClose: () => void;
  /** Classes adicionais */
  className?: string;
}

export interface ForwardButtonProps {
  /** Callback quando clicado */
  onClick: () => void;
  /** Classes adicionais */
  className?: string;
}

// ============================================
// HOOK: useForwardMessage
// ============================================

export interface UseForwardMessageOptions {
  session?: string;
  wahaBaseUrl?: string;
  wahaApiKey?: string;
  onSuccess?: (messageId: string, targets: string[]) => void;
  onError?: (error: Error) => void;
}

export function useForwardMessage({
  session = 'default',
  wahaBaseUrl = 'http://76.13.82.60:3001',
  wahaApiKey = 'rendizy-waha-secret-2026',
  onSuccess,
  onError
}: UseForwardMessageOptions = {}) {
  const [isForwarding, setIsForwarding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const forwardMessage = useCallback(async (
    messageId: string,
    targetChatIds: string[]
  ): Promise<boolean> => {
    if (!messageId || targetChatIds.length === 0) {
      console.error('[useForwardMessage] messageId e targets são obrigatórios');
      return false;
    }

    setIsForwarding(true);
    setError(null);

    try {
      console.log('[useForwardMessage] 📤 Encaminhando mensagem:', {
        messageId,
        targets: targetChatIds
      });

      // Encaminhar para cada destino em paralelo
      const results = await Promise.allSettled(
        targetChatIds.map(async (chatId) => {
          const response = await fetch(`${wahaBaseUrl}/api/forwardMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': wahaApiKey
            },
            body: JSON.stringify({
              session,
              chatId,
              messageId
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed for ${chatId}: ${response.status} - ${errorText}`);
          }

          return chatId;
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      console.log('[useForwardMessage] ✅ Encaminhado:', {
        success: successful.length,
        failed: failed.length
      });

      if (failed.length > 0) {
        console.error('[useForwardMessage] Falhas:', failed);
      }

      if (successful.length > 0) {
        onSuccess?.(messageId, targetChatIds);
        toast.success(`Mensagem encaminhada para ${successful.length} contato(s)`);
      }

      if (failed.length > 0) {
        toast.warning(`${failed.length} encaminhamento(s) falharam`);
      }

      return successful.length > 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useForwardMessage] ❌ Erro:', error);
      
      setError(error);
      onError?.(error);
      toast.error('Não foi possível encaminhar a mensagem');

      return false;
    } finally {
      setIsForwarding(false);
    }
  }, [session, wahaBaseUrl, wahaApiKey, onSuccess, onError]);

  return {
    forwardMessage,
    isForwarding,
    error
  };
}

// ============================================
// FORWARD BUTTON
// ============================================

export function ForwardButton({ onClick, className }: ForwardButtonProps) {
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
      title="Encaminhar"
    >
      <Forward className="w-4 h-4" />
    </button>
  );
}

// ============================================
// FORWARD DIALOG
// ============================================

export function ForwardDialog({
  isOpen,
  messageId,
  messagePreview,
  contacts,
  onForward,
  onClose,
  className
}: ForwardDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.chatId.includes(searchQuery)
  );

  const toggleContact = (chatId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelected(newSelected);
  };

  const handleForward = async () => {
    if (selected.size === 0) return;

    setIsSending(true);
    try {
      await onForward(messageId, Array.from(selected));
      onClose();
    } finally {
      setIsSending(false);
    }
  };

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
          <h3 className="text-lg font-semibold">Encaminhar mensagem</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        {messagePreview && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Mensagem:</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              "{messagePreview}"
            </p>
          </div>
        )}

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar contato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhum contato encontrado
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.chatId}
                onClick={() => toggleContact(contact.chatId)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                  selected.has(contact.chatId) && 'bg-green-50 dark:bg-green-900/20'
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    selected.has(contact.chatId)
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {selected.has(contact.chatId) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  {contact.avatar ? (
                    <img 
                      src={contact.avatar} 
                      alt={contact.name} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-500">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{contact.name}</p>
                  {contact.lastMessage && (
                    <p className="text-xs text-gray-500 truncate">
                      {contact.lastMessage}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selected.size} selecionado(s)
          </span>
          <button
            onClick={handleForward}
            disabled={selected.size === 0 || isSending}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selected.size > 0 && !isSending
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Encaminhar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForwardDialog;
