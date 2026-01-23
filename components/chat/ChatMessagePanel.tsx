/**
 * CHAT MESSAGE PANEL
 * 
 * Componente ISOLADO para exibir mensagens de UMA conversa
 * Pode ser usado standalone (ex: dentro de um Card do CRM)
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * 
 * Uso:
 * ```tsx
 * // Dentro de um Card do CRM
 * <ChatMessagePanel 
 *   conversationId="5521999999999@s.whatsapp.net"
 *   contactName="João Silva"
 *   contactPhone="5521999999999"
 *   compact={true}
 * />
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Loader2, 
  Send,
  Check,
  CheckCheck,
  AlertCircle,
  Phone,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { 
  fetchWhatsAppMessages, 
  sendWhatsAppMessage,
  extractMessageText
} from '../../utils/whatsappChatApi';
import { getSupabaseClient } from '../../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export interface ChatMessagePanelProps {
  /** ID da conversa (JID do WhatsApp ou external_conversation_id) */
  conversationId: string;
  
  /** Nome do contato para exibir no header */
  contactName?: string;
  
  /** Telefone do contato */
  contactPhone?: string;
  
  /** URL do avatar */
  contactAvatar?: string;
  
  /** Modo compacto (sem header, menor altura) */
  compact?: boolean;
  
  /** Altura máxima do componente */
  maxHeight?: string;
  
  /** Callback quando enviar mensagem */
  onMessageSent?: (message: ChatMessage) => void;
  
  /** Callback para fechar/minimizar */
  onClose?: () => void;
  
  /** Mostrar header com info do contato */
  showHeader?: boolean;
  
  /** Classe CSS adicional */
  className?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: Date;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
}

// ============================================
// HELPERS
// ============================================

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    if (rest.length === 9) {
      return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return `+55 ${ddd} ${rest}`;
  }
  
  return phone;
}

function getInitials(name: string): string {
  if (!name || name === 'Desconhecido') return '??';
  if (name.startsWith('+')) return name.substring(1, 3);
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ============================================
// COMPONENT
// ============================================

export function ChatMessagePanel({
  conversationId,
  contactName = 'Contato',
  contactPhone,
  contactAvatar,
  compact = false,
  maxHeight = '400px',
  onMessageSent,
  onClose,
  showHeader = true,
  className = ''
}: ChatMessagePanelProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ============================================
  // LOAD MESSAGES
  // ============================================
  
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    
    try {
      // Extrair phone do conversationId se for JID
      let phone = conversationId;
      if (conversationId.includes('@')) {
        phone = conversationId.split('@')[0];
      }
      
      console.log('[ChatMessagePanel] 📥 Carregando mensagens para:', phone);
      
      const rawMessages = await fetchWhatsAppMessages(phone);
      
      const converted: ChatMessage[] = rawMessages.map((msg: any) => ({
        id: msg.key?.id || msg.id || crypto.randomUUID(),
        text: extractMessageText(msg) || '[Mídia]',
        fromMe: msg.key?.fromMe || false,
        timestamp: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000),
        status: msg.key?.fromMe ? 'delivered' : undefined
      }));
      
      // Ordenar por timestamp
      converted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setMessages(converted);
      
      // Scroll para baixo
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('[ChatMessagePanel] ❌ Erro ao carregar mensagens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // ============================================
  // SEND MESSAGE
  // ============================================
  
  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    // Adicionar mensagem otimisticamente
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      text,
      fromMe: true,
      timestamp: new Date(),
      status: 'pending'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll para baixo
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    
    try {
      // Extrair phone
      let phone = contactPhone || conversationId;
      if (phone.includes('@')) {
        phone = phone.split('@')[0];
      }
      
      await sendWhatsAppMessage(phone, text);
      
      // Atualizar status
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' } : m
      ));
      
      onMessageSent?.(optimisticMessage);
      
    } catch (error) {
      console.error('[ChatMessagePanel] ❌ Erro ao enviar:', error);
      
      // Marcar como erro
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'error' } : m
      ));
      
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel(`chat-panel-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && !newMsg.is_from_me) {
            const chatMessage: ChatMessage = {
              id: newMsg.id,
              text: newMsg.content || '[Mídia]',
              fromMe: false,
              timestamp: new Date(newMsg.created_at || Date.now()),
              status: 'delivered'
            };
            
            setMessages(prev => {
              if (prev.some(m => m.id === chatMessage.id)) return prev;
              return [...prev, chatMessage];
            });
            
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // ============================================
  // RENDER - Minimized
  // ============================================
  
  if (isMinimized) {
    return (
      <div 
        className={`flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-pointer ${className}`}
        onClick={() => setIsMinimized(false)}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={contactAvatar} />
          <AvatarFallback className="bg-green-100 text-green-700 text-xs">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate">{contactName}</span>
        <Maximize2 className="h-4 w-4 text-gray-400 ml-auto" />
      </div>
    );
  }

  // ============================================
  // RENDER - Full
  // ============================================
  
  return (
    <div 
      className={`flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden ${className}`}
      style={{ maxHeight, minHeight: '100%' }}
    >
      {/* Header - FIXO NO TOPO */}
      {showHeader && (
        <div className="flex-shrink-0 flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Avatar className="h-8 w-8">
            <AvatarImage src={contactAvatar} />
            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {contactName}
            </h4>
            {contactPhone && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhone(contactPhone)}
              </p>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onClose}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Messages Area - ÁREA FLEXÍVEL QUE OCUPA O ESPAÇO DISPONÍVEL */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-3 bg-gray-50 dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500">
              <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma mensagem</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-lg px-3 py-1.5 shadow-sm text-sm
                    ${msg.fromMe 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }
                  `}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                  
                  <div className={`
                    flex items-center justify-end gap-1 mt-0.5
                    ${msg.fromMe ? 'text-green-100' : 'text-gray-400'}
                  `}>
                    <span className="text-[10px]">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    
                    {msg.fromMe && (
                      <>
                        {msg.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {msg.status === 'sent' && <Check className="h-3 w-3" />}
                        {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                        {msg.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-300" />}
                        {msg.status === 'error' && <AlertCircle className="h-3 w-3 text-red-300" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        </ScrollArea>
      </div>
      
      {/* Input Area - FIXO NA PARTE INFERIOR */}
      <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="min-h-[36px] max-h-[100px] resize-none text-sm"
            rows={1}
          />
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="h-9 w-9 bg-green-500 hover:bg-green-600"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatMessagePanel;
