/**
 * RENDIZY - Simple Chat Inbox
 * 
 * Versão simplificada e escalável do Chat
 * Foco: Funcionalidade fluida, sem Kanban, arquitetura limpa
 * 
 * @version v2.0.1
 * @date 2026-01-22
 * 
 * Características:
 * - ✅ Lista de conversas à esquerda
 * - ✅ Painel de mensagens à direita  
 * - ✅ Polling automático (30s)
 * - ✅ Supabase Realtime para mensagens novas
 * - ✅ Envio de mensagens funcional
 * - ✅ Suporte apenas WhatsApp (por agora)
 * - ❌ Sem Kanban (simplificado)
 * - ❌ Sem drag & drop (simplificado)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Search, 
  Loader2, 
  Send,
  RefreshCw,
  Phone,
  Check,
  CheckCheck,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../../src/contexts/AuthContext';
import { 
  fetchWhatsAppChats,
  fetchWhatsAppMessages, 
  sendWhatsAppMessage,
  extractMessageText,
  formatWhatsAppNumber
} from '../../utils/whatsappChatApi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSupabaseClient } from '../../utils/supabase/client';

// ============================================
// TYPES
// ============================================

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  isOnline?: boolean;
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

/**
 * Formata número de telefone para exibição bonita
 * Exemplo: 5522999887766 -> +55 22 99988-7766
 */
function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  // Número muito curto = inválido
  if (cleaned.length < 10) return '';
  
  // Formato brasileiro: 55 + DDD (2) + número (8 ou 9)
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
  
  // Número sem código de país - assumir Brasil
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    const ddd = cleaned.substring(0, 2);
    const rest = cleaned.substring(2);
    if (rest.length === 9) {
      return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
  }
  
  // Número internacional genérico
  if (cleaned.length >= 10) {
    return `+${cleaned}`;
  }
  
  return '';
}

/**
 * Extrai número de telefone limpo do JID do WhatsApp
 * Exemplo: 5522999887766@s.whatsapp.net -> 5522999887766
 */
function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  
  // Ignorar grupos e broadcasts
  if (jid.includes('@g.us') || jid.includes('@lid') || jid.includes('status@')) {
    return '';
  }
  
  // Remover sufixos do WhatsApp e extrair só números
  const cleaned = jid
    .replace('whatsapp-', '')
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/\D/g, '');
  
  // Validar que é um número razoável (mínimo 10 dígitos)
  if (cleaned.length < 10) return '';
  
  return cleaned;
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

export function SimpleChatInbox() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  // State
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  
  // Loading states
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof getSupabaseClient>['channel'] extends (...args: any[]) => infer R ? R : never>(null);

  // ============================================
  // LOAD CONTACTS
  // ============================================
  
  const loadContacts = useCallback(async (showLoader = true) => {
    if (!organizationId) return;
    
    if (showLoader) setIsLoadingContacts(true);
    else setIsRefreshing(true);
    
    try {
      console.log('[SimpleChatInbox] 📥 Carregando conversas...');
      const chats = await fetchWhatsAppChats();
      
      console.log('[SimpleChatInbox] 📦 Chats brutos recebidos:', chats.length);
      if (chats.length > 0) {
        console.log('[SimpleChatInbox] 📦 Exemplo de chat:', JSON.stringify(chats[0]).substring(0, 500));
      }
      
      // Filtrar apenas conversas individuais (não grupos/broadcasts/status)
      const individualChats = chats.filter(chat => {
        // Usar remoteJid se disponível, senão usar id
        const jid = (chat as any).remoteJid || chat.id || '';
        if (jid.includes('@g.us')) return false;  // Grupos
        if (jid.includes('@lid')) return false;   // Broadcasts
        if (jid.includes('status@')) return false; // Status/Stories
        return true;
      });
      
      // Converter para formato simplificado
      const converted: ChatContact[] = individualChats.map(chat => {
        // Usar remoteJid se disponível (formato correto da Evolution API)
        const jid = (chat as any).remoteJid || chat.id || '';
        
        // Extrair número do JID
        const phone = extractPhoneFromJid(jid);
        const formattedPhone = formatPhone(phone);
        
        // Nome: usar pushName > name > telefone formatado
        let displayName = (chat as any).pushName || chat.name;
        if (!displayName || displayName === 'Desconhecido' || displayName === 'undefined' || displayName === 'null') {
          displayName = formattedPhone || 'Contato sem número';
        }
        
        console.log('[SimpleChatInbox] 📱 Contato:', {
          jid,
          rawName: chat.name,
          pushName: (chat as any).pushName,
          phone,
          formattedPhone,
          displayName
        });
        
        // Extrair timestamp - pode vir de updatedAt (ISO) ou lastMessageTimestamp (Unix)
        let lastMessageAt: Date | undefined;
        if ((chat as any).updatedAt) {
          lastMessageAt = new Date((chat as any).updatedAt);
        } else if (chat.lastMessageTimestamp) {
          lastMessageAt = new Date(chat.lastMessageTimestamp * 1000);
        }
        
        return {
          id: jid,  // Usar JID como ID para lookup correto
          name: displayName,
          phone,
          avatar: chat.profilePictureUrl || (chat as any).profilePicUrl,
          lastMessage: chat.lastMessage?.message || '',
          lastMessageAt,
          unreadCount: chat.unreadCount || 0
        };
      });
      
      // Ordenar por última mensagem (mais recente primeiro)
      converted.sort((a, b) => {
        const dateA = a.lastMessageAt?.getTime() || 0;
        const dateB = b.lastMessageAt?.getTime() || 0;
        return dateB - dateA;
      });
      
      setContacts(converted);
      console.log('[SimpleChatInbox] ✅', converted.length, 'conversas carregadas');
      
    } catch (error) {
      console.error('[SimpleChatInbox] ❌ Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoadingContacts(false);
      setIsRefreshing(false);
    }
  }, [organizationId]);

  // ============================================
  // LOAD MESSAGES
  // ============================================
  
  const loadMessages = useCallback(async (contact: ChatContact) => {
    if (!contact.phone && !contact.id) {
      console.warn('[SimpleChatInbox] ⚠️ Contato sem telefone/id');
      return;
    }
    
    setIsLoadingMessages(true);
    
    try {
      // Usar ID do contato (formato WhatsApp) ou formatar número
      const chatId = contact.id.includes('@') 
        ? contact.id 
        : formatWhatsAppNumber(contact.phone);
      
      console.log('[SimpleChatInbox] 📥 Carregando mensagens de:', chatId);
      const rawMessages = await fetchWhatsAppMessages(chatId, 100);
      
      // Converter para formato simplificado
      const converted: ChatMessage[] = rawMessages.map(msg => ({
        id: msg.key?.id || `${msg.messageTimestamp}-${Math.random()}`,
        text: extractMessageText(msg),
        fromMe: msg.key?.fromMe || false,
        timestamp: new Date((msg.messageTimestamp || 0) * 1000),
        status: (msg.status as ChatMessage['status']) || 'sent'
      }));
      
      // Ordenar por timestamp (mais antigas primeiro)
      converted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setMessages(converted);
      console.log('[SimpleChatInbox] ✅', converted.length, 'mensagens carregadas');
      
      // Scroll para baixo
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('[SimpleChatInbox] ❌ Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // ============================================
  // SEND MESSAGE
  // ============================================
  
  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedContact || isSending) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    // Mensagem otimista
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      fromMe: true,
      timestamp: new Date(),
      status: 'pending'
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    // Scroll para baixo
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    try {
      const phone = selectedContact.phone || extractPhoneFromJid(selectedContact.id);
      
      if (!phone) {
        throw new Error('Número de telefone não encontrado');
      }
      
      console.log('[SimpleChatInbox] 📤 Enviando mensagem para:', phone);
      await sendWhatsAppMessage(phone, messageText);
      
      // Atualizar status da mensagem
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMsg.id 
          ? { ...msg, status: 'sent' as const }
          : msg
      ));
      
      toast.success('Mensagem enviada!');
      
    } catch (error) {
      console.error('[SimpleChatInbox] ❌ Erro ao enviar:', error);
      
      // Marcar mensagem como erro
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMsg.id 
          ? { ...msg, status: 'error' as const }
          : msg
      ));
      
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  // ============================================
  // POLLING
  // ============================================
  
  useEffect(() => {
    // Carregar contatos inicialmente
    loadContacts();
    
    // Polling a cada 30 segundos
    pollingRef.current = setInterval(() => {
      loadContacts(false); // Não mostrar loader no polling
    }, 30000);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadContacts]);

  // ============================================
  // SUPABASE REALTIME - Novas mensagens
  // ============================================
  
  useEffect(() => {
    if (!organizationId) return;
    
    console.log('[SimpleChatInbox] 🔌 Conectando ao Supabase Realtime...');
    
    const supabaseClient = getSupabaseClient();
    
    // Subscribe to new messages in whatsapp_messages table
    const channel = supabaseClient
      .channel(`chat-messages-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload: any) => {
          console.log('[SimpleChatInbox] 📨 Nova mensagem via Realtime:', payload);
          
          // Se é uma mensagem do contato selecionado, adicionar à lista
          if (selectedContact && payload.new) {
            const newMsg = payload.new as any;
            const msgPhone = newMsg.remote_jid?.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const selectedPhone = selectedContact.phone || extractPhoneFromJid(selectedContact.id);
            
            if (msgPhone === selectedPhone) {
              const chatMessage: ChatMessage = {
                id: newMsg.id || `rt-${Date.now()}`,
                text: newMsg.message_text || newMsg.content || '',
                fromMe: newMsg.from_me || false,
                timestamp: new Date(newMsg.created_at || Date.now()),
                status: 'delivered'
              };
              
              setMessages(prev => {
                // Evitar duplicatas
                if (prev.some(m => m.id === chatMessage.id)) return prev;
                return [...prev, chatMessage];
              });
              
              // Scroll para baixo
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }
          
          // Recarregar lista de contatos para atualizar lastMessage
          loadContacts(false);
        }
      )
      .subscribe((status: string) => {
        console.log('[SimpleChatInbox] 🔌 Realtime status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });
    
    realtimeChannelRef.current = channel;
    
    return () => {
      console.log('[SimpleChatInbox] 🔌 Desconectando do Supabase Realtime...');
      if (realtimeChannelRef.current) {
        supabaseClient.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [organizationId, selectedContact, loadContacts]);

  // Quando seleciona um contato, carregar mensagens
  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact);
    }
  }, [selectedContact, loadMessages]);

  // ============================================
  // FILTER CONTACTS
  // ============================================
  
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone?.includes(query) ||
      contact.lastMessage?.toLowerCase().includes(query)
    );
  });

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="flex h-full bg-white dark:bg-gray-900" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* SIDEBAR - Lista de Conversas */}
      <div className="w-80 min-w-[320px] border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
        {/* Header fixo */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Conversas
              </h2>
              {/* Indicador de conexão Realtime */}
              <div className="flex items-center gap-1" title={isRealtimeConnected ? 'Conectado em tempo real' : 'Desconectado'}>
                {isRealtimeConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => loadContacts(false)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Search - Campo de busca funcional */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
        
        {/* Contacts List - Área com scroll */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingContacts ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`
                    p-3 cursor-pointer transition-colors
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    ${selectedContact?.id === contact.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' 
                      : ''
                    }
                  `}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback className="bg-green-100 text-green-700 text-sm font-medium">
                        {contact.phone ? contact.phone.substring(contact.phone.length - 2) : getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate text-sm">
                          {contact.name}
                        </span>
                        {contact.lastMessageAt && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatDistanceToNow(contact.lastMessageAt, { 
                              addSuffix: false, 
                              locale: ptBR 
                            })}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-0.5 gap-2">
                        <p className="text-xs text-gray-500 truncate">
                          {contact.lastMessage || 'Sem mensagens'}
                        </p>
                        {contact.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 text-xs flex-shrink-0">
                            {contact.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* MAIN - Painel de Mensagens */}
      <div className="flex-1 flex flex-col">
        {!selectedContact ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
            <p className="text-sm">Escolha um contato para ver as mensagens</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedContact.avatar} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {getInitials(selectedContact.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedContact.name}
                  </h3>
                  {selectedContact.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(selectedContact.phone)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageCircle className="h-12 w-12 mb-2 opacity-30" />
                  <p>Nenhuma mensagem ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[70%] rounded-lg px-4 py-2 shadow-sm
                          ${msg.fromMe 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.text || '[Mídia]'}
                        </p>
                        
                        <div className={`
                          flex items-center justify-end gap-1 mt-1
                          ${msg.fromMe ? 'text-green-100' : 'text-gray-400'}
                        `}>
                          <span className="text-xs">
                            {msg.timestamp.toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          
                          {msg.fromMe && (
                            <>
                              {msg.status === 'pending' && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              {msg.status === 'sent' && (
                                <Check className="h-3 w-3" />
                              )}
                              {msg.status === 'delivered' && (
                                <CheckCheck className="h-3 w-3" />
                              )}
                              {msg.status === 'read' && (
                                <CheckCheck className="h-3 w-3 text-blue-300" />
                              )}
                              {msg.status === 'error' && (
                                <AlertCircle className="h-3 w-3 text-red-300" />
                              )}
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
            
            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite uma mensagem..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="resize-none min-h-[44px] max-h-32"
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SimpleChatInbox;
