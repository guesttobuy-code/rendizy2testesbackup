/**
 * CHAT DRAWER - Painel lateral de chat inline
 * 
 * Permite abrir conversas em qualquer lugar da aplicação
 * sem sair da tela atual. Todas as mensagens ficam salvas
 * no chat master (/chat).
 * 
 * Uso:
 *   const { openChat } = useChatDrawer();
 *   openChat({
 *     targetOrgId: 'uuid',
 *     targetOrgName: 'Construtora XYZ',
 *     context: { type: 'development', id: 'uuid', title: 'Residencial Aurora' }
 *   });
 */

'use client';

import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from 'react';
import { X, Send, Minimize2, Maximize2, MessageCircle, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '../ui/utils';
import { getSupabaseClient } from '@/utils/supabase/client';
import { ChannelBadge } from './ChannelBadge';

// ============================================================
// TYPES
// ============================================================

export interface ChatContext {
  type: 'partnership' | 'demand' | 'development' | 'reservation' | 'inquiry';
  id: string;
  title: string;
}

export interface ChatDrawerConfig {
  targetOrgId: string;
  targetOrgName: string;
  targetOrgLogo?: string;
  context?: ChatContext;
  initialMessage?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderOrgId: string;
  createdAt: Date;
  isOwn: boolean;
}

interface ChatDrawerProps {
  config: ChatDrawerConfig | null;
  onClose: () => void;
  isOpen: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function ChatDrawer({ config, onClose, isOpen }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll para última mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus no input quando abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Carregar/criar conversa quando config mudar
  useEffect(() => {
    if (!config || !isOpen) return;

    const initializeChat = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabaseClient();
        
        // Obter usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');
        setCurrentUserId(user.id);

        // Obter org do usuário (cast para any pois tabela pode não estar nos tipos)
        const { data: userData } = await (supabase
          .from('users') as any)
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (!userData?.organization_id) throw new Error('Org não encontrada');
        setCurrentOrgId(userData.organization_id);

        // Criar ou obter conversa via RPC (cast para any)
        const { data: convId, error: convError } = await (supabase.rpc as any)(
          'get_or_create_marketplace_conversation',
          {
            p_my_org_id: userData.organization_id,
            p_target_org_id: config.targetOrgId,
            p_related_type: config.context?.type || null,
            p_related_id: config.context?.id || null,
            p_title: config.context?.title 
              ? `${config.context.type} - ${config.context.title}`
              : `Chat com ${config.targetOrgName}`
          }
        );

        if (convError) throw convError;
        setConversationId(convId);

        // Carregar mensagens existentes (cast para any)
        const { data: msgs, error: msgError } = await (supabase
          .from('re_marketplace_messages') as any)
          .select(`
            id,
            content,
            sender_profile_id,
            sender_org_id,
            created_at,
            metadata
          `)
          .eq('conversation_id', convId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(50);

        if (msgError) throw msgError;

        // Mapear mensagens
        const mappedMessages: Message[] = (msgs || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.sender_profile_id,
          senderName: msg.metadata?.sender_name || 'Usuário',
          senderOrgId: msg.sender_org_id,
          createdAt: new Date(msg.created_at),
          isOwn: msg.sender_profile_id === user.id
        }));

        setMessages(mappedMessages);

        // Marcar como lidas (cast para any)
        await (supabase.rpc as any)('mark_marketplace_conversation_as_read', {
          p_conversation_id: convId,
          p_profile_id: user.id
        });

        // Enviar mensagem inicial se configurada
        if (config.initialMessage && mappedMessages.length === 0) {
          await sendMessage(config.initialMessage, convId, user.id, userData.organization_id);
        }

      } catch (error) {
        console.error('[ChatDrawer] Erro ao inicializar:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [config, isOpen]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const supabase = getSupabaseClient();
    
    const subscription = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 're_marketplace_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg.sender_profile_id !== currentUserId) {
            setMessages(prev => [...prev, {
              id: newMsg.id,
              content: newMsg.content,
              senderId: newMsg.sender_profile_id,
              senderName: newMsg.metadata?.sender_name || 'Usuário',
              senderOrgId: newMsg.sender_org_id,
              createdAt: new Date(newMsg.created_at),
              isOwn: false
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [conversationId, currentUserId]);

  // Enviar mensagem
  const sendMessage = async (
    text: string, 
    convId?: string, 
    userId?: string, 
    orgId?: string
  ) => {
    const messageText = text.trim();
    if (!messageText) return;

    const cId = convId || conversationId;
    const uId = userId || currentUserId;
    const oId = orgId || currentOrgId;

    if (!cId || !uId || !oId) return;

    setIsSending(true);
    try {
      const supabase = getSupabaseClient();

      // Obter nome do usuário (cast para any)
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('full_name')
        .eq('id', uId)
        .single();

      const senderName = profile?.full_name || 'Usuário';

      // Inserir mensagem (cast para any)
      const { data: msg, error } = await (supabase
        .from('re_marketplace_messages') as any)
        .insert({
          conversation_id: cId,
          sender_profile_id: uId,
          sender_org_id: oId,
          content: messageText,
          metadata: { sender_name: senderName }
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar à lista local
      setMessages(prev => [...prev, {
        id: msg.id,
        content: msg.content,
        senderId: uId,
        senderName,
        senderOrgId: oId,
        createdAt: new Date(msg.created_at),
        isOwn: true
      }]);

      setNewMessage('');
    } catch (error) {
      console.error('[ChatDrawer] Erro ao enviar:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(newMessage);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(newMessage);
    }
  };

  // Não renderizar se não estiver aberto
  if (!isOpen || !config) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity",
          isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => setIsMinimized(true)}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed z-50 bg-background border-l shadow-xl transition-all duration-300 flex flex-col",
          isMinimized 
            ? "bottom-4 right-4 w-72 h-14 rounded-lg border" 
            : "top-0 right-0 w-[400px] h-full"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-3 border-b bg-muted/30",
          isMinimized && "rounded-lg cursor-pointer"
        )}
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={config.targetOrgLogo} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {config.targetOrgName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{config.targetOrgName}</p>
              {!isMinimized && config.context && (
                <p className="text-xs text-muted-foreground truncate">
                  {config.context.title}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ChannelBadge channel="marketplace" variant="icon" size="sm" />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            
            {!isMinimized && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        {!isMinimized && (
          <>
            <ScrollArea className="flex-1 p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Inicie a conversa!
                  </p>
                  {config.context && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {config.context.type}: {config.context.title}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          msg.isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {!msg.isOwn && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          msg.isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          {msg.createdAt.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t bg-muted/10">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  disabled
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 h-9"
                  disabled={isSending || isLoading}
                />
                
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  disabled={!newMessage.trim() || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                💡 Esta conversa também aparece no Chat principal
              </p>
            </form>
          </>
        )}
      </div>
    </>
  );
}

export default ChatDrawer;
