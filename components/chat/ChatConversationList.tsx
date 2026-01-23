/**
 * CHAT CONVERSATION LIST
 * 
 * Componente ISOLADO para listar conversas
 * Pode ser usado standalone ou combinado com ChatMessagePanel
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  Search, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../src/contexts/AuthContext';
import { fetchWhatsAppChats } from '../../utils/whatsappChatApi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSupabaseClient } from '../../utils/supabase/client';

// ============================================
// TYPES
// ============================================

export interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  channel?: 'whatsapp' | 'airbnb' | 'booking' | 'email';
}

// Tipo para resultado da query de conversas
interface ConversationRow {
  id: string;
  external_conversation_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  last_message: string | Record<string, any> | null;
  last_message_at: string | null;
  unread_count: number | null;
}

export interface ChatConversationListProps {
  /** Callback quando seleciona uma conversa */
  onSelectConversation: (contact: ChatContact) => void;
  
  /** Conversa atualmente selecionada */
  selectedId?: string;
  
  /** Mostrar header com título e botão refresh */
  showHeader?: boolean;
  
  /** Título customizado */
  title?: string;
  
  /** Altura máxima */
  maxHeight?: string;
  
  /** Filtrar por canal */
  filterChannel?: 'whatsapp' | 'airbnb' | 'booking' | 'email';
  
  /** Classe CSS adicional */
  className?: string;
  
  /** Modo compacto (items menores) */
  compact?: boolean;
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

function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  if (jid.includes('@g.us') || jid.includes('@lid') || jid.includes('status@')) {
    return '';
  }
  const cleaned = jid
    .replace('whatsapp-', '')
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/\D/g, '');
  
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

export function ChatConversationList({
  onSelectConversation,
  selectedId,
  showHeader = true,
  title = 'Conversas',
  maxHeight,
  filterChannel,
  className = '',
  compact = false
}: ChatConversationListProps) {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  // State
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // ============================================
  // LOAD CONTACTS
  // ============================================
  
  const loadContacts = useCallback(async (showLoader = true) => {
    if (!organizationId) return;
    
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const [chats, conversationsResult] = await Promise.all([
        fetchWhatsAppChats(),
        (async (): Promise<ConversationRow[]> => {
          const supabase = getSupabaseClient();
          const { data } = await supabase
            .from('conversations')
            .select('id, external_conversation_id, guest_name, guest_phone, last_message, last_message_at, unread_count')
            .eq('organization_id', organizationId)
            .order('last_message_at', { ascending: false });
          return (data || []) as ConversationRow[];
        })()
      ]);
      
      // Criar mapa de conversas do banco
      const conversationsMap = new Map<string, ConversationRow>();
      conversationsResult.forEach(conv => {
        if (conv.external_conversation_id) {
          conversationsMap.set(conv.external_conversation_id, conv);
        }
      });
      
      // Filtrar apenas conversas individuais
      const individualChats = chats.filter(chat => {
        const jid = (chat as any).remoteJid || chat.id || '';
        if (jid.includes('@g.us')) return false;
        if (jid.includes('@lid')) return false;
        if (jid.includes('status@')) return false;
        return true;
      });
      
      // Converter para formato simplificado
      const converted: ChatContact[] = individualChats.map(chat => {
        const jid = (chat as any).remoteJid || chat.id || '';
        const phone = extractPhoneFromJid(jid);
        const formattedPhone = formatPhone(phone);
        const dbConversation = conversationsMap.get(jid);
        
        let displayName = (chat as any).pushName || chat.name || dbConversation?.guest_name;
        if (!displayName || displayName === 'Desconhecido' || displayName === 'undefined' || displayName === 'null') {
          displayName = formattedPhone || 'Contato sem número';
        }
        
        let lastMessageText = '';
        if (dbConversation?.last_message) {
          if (typeof dbConversation.last_message === 'string') {
            lastMessageText = dbConversation.last_message;
          } else if (typeof dbConversation.last_message === 'object') {
            lastMessageText = (dbConversation.last_message as any)?.message?.conversation 
              || (dbConversation.last_message as any)?.message?.extendedTextMessage?.text
              || chat.lastMessage?.message 
              || '';
          }
        } else {
          lastMessageText = chat.lastMessage?.message || '';
        }
        
        let lastMessageAt: Date | undefined;
        if (dbConversation?.last_message_at) {
          lastMessageAt = new Date(dbConversation.last_message_at);
        } else if ((chat as any).updatedAt) {
          lastMessageAt = new Date((chat as any).updatedAt);
        } else if (chat.lastMessageTimestamp) {
          lastMessageAt = new Date(chat.lastMessageTimestamp * 1000);
        }
        
        const unreadCount = dbConversation?.unread_count || chat.unreadCount || 0;
        
        return {
          id: jid,
          name: displayName,
          phone,
          avatar: chat.profilePictureUrl || (chat as any).profilePicUrl,
          lastMessage: lastMessageText,
          lastMessageAt,
          unreadCount,
          channel: 'whatsapp' as const
        };
      });
      
      // Adicionar conversas do banco que não existem na Evolution API
      const existingJids = new Set(converted.map(c => c.id));
      conversationsResult.forEach(dbConv => {
        if (dbConv.external_conversation_id && !existingJids.has(dbConv.external_conversation_id)) {
          const extId = dbConv.external_conversation_id;
          let phone = '';
          let displayName = dbConv.guest_name || '';
          
          if (extId.includes('@s.whatsapp.net')) {
            phone = extId.replace('@s.whatsapp.net', '');
            if (!displayName) {
              displayName = formatPhone(phone) || phone;
            }
          } else if (extId.includes('@lid')) {
            const maybePhone = dbConv.guest_phone || '';
            const isValidPhone = maybePhone.startsWith('55') && maybePhone.length >= 12 && maybePhone.length <= 13;
            
            if (isValidPhone) {
              phone = maybePhone;
              if (!displayName) {
                displayName = formatPhone(phone) || phone;
              }
            } else if (!displayName) {
              displayName = 'Lead Meta';
            }
          } else if (extId.includes('@g.us')) {
            return;
          } else {
            phone = dbConv.guest_phone || '';
            if (!displayName) {
              displayName = phone ? formatPhone(phone) : 'Contato';
            }
          }
          
          let lastMessageText = '';
          if (dbConv.last_message) {
            if (typeof dbConv.last_message === 'string') {
              lastMessageText = dbConv.last_message;
            } else if (typeof dbConv.last_message === 'object') {
              lastMessageText = (dbConv.last_message as any)?.message?.conversation 
                || (dbConv.last_message as any)?.message?.extendedTextMessage?.text
                || '';
            }
          }
          
          converted.push({
            id: extId,
            name: displayName,
            phone,
            lastMessage: lastMessageText,
            lastMessageAt: dbConv.last_message_at ? new Date(dbConv.last_message_at) : undefined,
            unreadCount: dbConv.unread_count || 0,
            channel: 'whatsapp'
          });
        }
      });
      
      // Ordenar por última mensagem
      converted.sort((a, b) => {
        const dateA = a.lastMessageAt?.getTime() || 0;
        const dateB = b.lastMessageAt?.getTime() || 0;
        return dateB - dateA;
      });
      
      setContacts(converted);
      
    } catch (error) {
      console.error('[ChatConversationList] ❌ Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organizationId]);

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Realtime subscription
  useEffect(() => {
    if (!organizationId) return;
    
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel('conversation-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          loadContacts(false);
        }
      )
      .subscribe((status: string) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, loadContacts]);

  // ============================================
  // FILTER
  // ============================================
  
  const filteredContacts = contacts.filter(contact => {
    // Filtrar por canal se especificado
    if (filterChannel && contact.channel !== filterChannel) {
      return false;
    }
    
    // Filtrar por busca
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
    <div 
      className={`flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
      style={{ maxHeight }}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <div className="flex items-center gap-1" title={isRealtimeConnected ? 'Conectado' : 'Desconectado'}>
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
              className="h-7 w-7"
              onClick={() => loadContacts(false)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      )}
      
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => onSelectConversation(contact)}
                className={`
                  ${compact ? 'p-2' : 'p-3'} cursor-pointer transition-colors
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  ${selectedId === contact.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' 
                    : ''
                  }
                `}
              >
                <div className="flex gap-2">
                  <Avatar className={compact ? 'h-8 w-8' : 'h-10 w-10'}>
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                      {contact.phone ? contact.phone.substring(contact.phone.length - 2) : getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium text-gray-900 dark:text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                        {contact.name}
                      </span>
                      {contact.lastMessageAt && (
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDistanceToNow(contact.lastMessageAt, { addSuffix: false, locale: ptBR })}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <p className={`text-gray-500 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
                        {contact.lastMessage || 'Sem mensagens'}
                      </p>
                      {contact.unreadCount > 0 && (
                        <Badge variant="destructive" className={`${compact ? 'h-4 min-w-4 text-[10px]' : 'h-5 min-w-5 text-xs'} flex-shrink-0`}>
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
  );
}

export default ChatConversationList;
