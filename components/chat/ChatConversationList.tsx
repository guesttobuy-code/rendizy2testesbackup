/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       CHAT CONVERSATION LIST                               ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  📱 WHATSAPP_JID - Extração de JID deve ser robusta                       ║
 * ║  🔄 WAHA_CHATS - Carrega lista de conversas do WAHA                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Lista de conversas WhatsApp com categorização visual.
 * 
 * @version 2.0.6
 * @date 2026-01-24
 * @see /docs/adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ FLUXO DE DADOS:                                                 │
 * │ 1. fetchWhatsAppChats() → WAHA /api/{session}/chats             │
 * │ 2. Extrai JID de cada chat (ATENÇÃO: pode ser objeto!)          │
 * │ 3. Cruza com conversations do Supabase (guest_name, etc)        │
 * │ 4. Renderiza lista com categorias visuais                       │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * ⚠️ ATENÇÃO - EXTRAÇÃO DE JID:
 * O WAHA pode retornar JID como string OU como objeto:
 * - String: "5521999999999@c.us"
 * - Objeto: { id: "5521999999999@c.us", _serialized: "..." }
 * 
 * SEMPRE verificar tipo antes de usar como key React!
 * 
 * CHANGELOG:
 * - v2.0.6 (2026-01-24): Extração robusta de JID (evita [object Object])
 * - v2.0.5 (2026-01-24): Formatação de telefone com DDD
 * - v2.0.0 (2026-01-22): Categorias visuais, filtros, tags
 * 
 * FUNCIONALIDADES:
 * - Categorias visuais: Fixadas, Urgentes, Normais, Resolvidas
 * - Fixar até 5 conversas
 * - Filtros laterais por canal, status, tags
 * - Tags coloridas
 * - GUEST vs LEAD visual
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  MessageCircle, 
  Search, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff,
  Pin,
  Zap,
  CheckCircle,
  Filter,
  X,
  Users,
  Home,
  Tag,
  MessageSquare,
  Mail,
  Phone as PhoneIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../src/contexts/AuthContext';
import { fetchAllChatsFromAllInstances, type ChatWithInstance } from '../../utils/chat/unifiedChatService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSupabaseClient } from '../../utils/supabase/client';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type ConversationCategory = 'pinned' | 'urgent' | 'normal' | 'resolved';
export type ConversationType = 'guest' | 'lead';
export type ChannelType = 'whatsapp' | 'airbnb' | 'booking' | 'email' | 'sms';

export interface WhatsAppInstance {
  id: string;
  instance_name: string;
  description: string | null;
  color: string | null;
  status: string;
  provider?: 'evolution' | 'waha'; // ✅ v2.5.0: Provider para exibir indicador
}

export interface ChatTag {
  id: string;
  name: string;
  color: string;
}

export interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  channel: ChannelType;
  category: ConversationCategory;
  type: ConversationType;
  isPinned: boolean;
  tags: string[];
  reservationCode?: string;
  propertyName?: string;
  instanceId?: string;
  /** ✅ v2.3.0: Provider WhatsApp (evolution ou waha) do ChatWithInstance */
  provider?: 'evolution' | 'waha';
}

interface ConversationRow {
  id: string;
  external_conversation_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  last_message: string | Record<string, unknown> | null;
  last_message_at: string | null;
  unread_count: number | null;
  category?: string;
  conversation_type?: string;
  is_pinned?: boolean;
  tags?: string[];
  instance_id?: string | null;
}

export interface ChatConversationListProps {
  onSelectConversation: (contact: ChatContact) => void;
  selectedId?: string;
  showHeader?: boolean;
  title?: string;
  maxHeight?: string;
  className?: string;
  compact?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TAGS: ChatTag[] = [
  { id: 'vip', name: 'VIP', color: 'bg-purple-500' },
  { id: 'urgent', name: 'Urgente', color: 'bg-red-500' },
  { id: 'followup', name: 'Follow-up', color: 'bg-yellow-500' },
  { id: 'payment', name: 'Pagamento', color: 'bg-blue-500' },
  { id: 'maintenance', name: 'Manutenção', color: 'bg-green-500' },
];

const CHANNEL_CONFIG: Record<ChannelType, { icon: typeof MessageCircle; color: string; label: string }> = {
  whatsapp: { icon: MessageCircle, color: 'text-green-500', label: 'WhatsApp' },
  email: { icon: Mail, color: 'text-purple-500', label: 'Email' },
  sms: { icon: PhoneIcon, color: 'text-blue-500', label: 'SMS' },
  airbnb: { icon: Home, color: 'text-red-500', label: 'Airbnb' },
  booking: { icon: Home, color: 'text-blue-600', label: 'Booking' },
};

// ============================================
// HELPERS
// ============================================

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    if (rest.length === 9) return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    if (rest.length === 8) return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    return `+55 ${ddd} ${rest}`;
  }
  return phone;
}

function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  if (jid.includes('@g.us') || jid.includes('@lid') || jid.includes('status@')) return '';
  const cleaned = jid.replace('whatsapp-', '').replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  if (cleaned.length < 10) return '';
  return cleaned;
}

function getInitials(name: string): string {
  if (!name || name === 'Desconhecido') return '??';
  if (name.startsWith('+')) return name.substring(1, 3);
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  
  // Instâncias WhatsApp
  const [whatsappInstances, setWhatsappInstances] = useState<WhatsAppInstance[]>([]);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filterChannel, setFilterChannel] = useState<ChannelType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ConversationCategory | 'all'>('all');
  const [filterType, setFilterType] = useState<ConversationType | 'all'>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterInstance, setFilterInstance] = useState<string>('all');
  // ✅ v2.5.0: Novo filtro por Provider para testar cada um separadamente
  const [filterProvider, setFilterProvider] = useState<'all' | 'evolution' | 'waha'>('all');

  // ============================================
  // ACTIONS
  // ============================================

  const togglePin = useCallback((contactId: string) => {
    setContacts(prev => {
      const contact = prev.find(c => c.id === contactId);
      if (!contact) return prev;
      
      const pinnedCount = prev.filter(c => c.isPinned).length;
      if (!contact.isPinned && pinnedCount >= 5) {
        toast.error('Máximo de 5 conversas fixadas');
        return prev;
      }
      
      return prev.map(c => 
        c.id === contactId ? { ...c, isPinned: !c.isPinned, category: !c.isPinned ? 'pinned' as const : 'normal' as const } : c
      );
    });
  }, []);

  // ============================================
  // LOAD WHATSAPP INSTANCES
  // ============================================
  
  // Mapa de instance_id -> provider para inferir provider de conversas do DB
  const [instanceProviderMap, setInstanceProviderMap] = useState<Map<string, 'evolution' | 'waha'>>(new Map());
  
  const loadInstances = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('channel_instances')
        .select('id, instance_name, description, color, status, provider')
        .eq('organization_id', organizationId)
        .eq('channel', 'whatsapp')
        .is('deleted_at', null)
        .order('is_default', { ascending: false });
      
      if (data) {
        // Cast para o tipo correto
        const instances = data as Array<{
          id: string;
          instance_name: string;
          description?: string;
          color?: string;
          status: string;
          provider: string;
        }>;
        
        setWhatsappInstances(instances as WhatsAppInstance[]);
        
        // ✅ v2.4.0: Criar mapa de instance_id -> provider
        const providerMap = new Map<string, 'evolution' | 'waha'>();
        for (const inst of instances) {
          if (inst.provider === 'evolution' || inst.provider === 'waha') {
            providerMap.set(inst.id, inst.provider);
          }
        }
        setInstanceProviderMap(providerMap);
        console.log('[ChatConversationList] 🗺️ Instance provider map:', Object.fromEntries(providerMap));
      }
    } catch (error) {
      console.error('[ChatConversationList] Erro ao carregar instâncias:', error);
    }
  }, [organizationId]);

  // ============================================
  // LOAD CONTACTS
  // ============================================
  
  const loadContacts = useCallback(async (showLoader = true) => {
    if (!organizationId) return;
    
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      // ✅ v2.2.0: Usar fetchAllChatsFromAllInstances para agregar conversas de Evolution + WAHA
      const [chats, conversationsResult] = await Promise.all([
        fetchAllChatsFromAllInstances(100),
        (async (): Promise<ConversationRow[]> => {
          const supabase = getSupabaseClient();
          const { data, error } = await supabase
            .from('conversations')
            .select('id, external_conversation_id, guest_name, guest_phone, last_message, last_message_at, unread_count, category, conversation_type, is_pinned, tags, instance_id')
            .eq('organization_id', organizationId)
            .order('last_message_at', { ascending: false });

          if (error) {
            console.warn('[ChatConversationList] ⚠️ Query com is_pinned/tags falhou, usando fallback:', error);
            const fallback = await supabase
              .from('conversations')
              .select('id, external_conversation_id, guest_name, guest_phone, last_message, last_message_at, unread_count, category, conversation_type, instance_id')
              .eq('organization_id', organizationId)
              .order('last_message_at', { ascending: false });
            return (fallback.data || []) as ConversationRow[];
          }

          return (data || []) as ConversationRow[];
        })()
      ]);
      
      const conversationsMap = new Map<string, ConversationRow>();
      conversationsResult.forEach(conv => {
        if (conv.external_conversation_id) conversationsMap.set(conv.external_conversation_id, conv);
      });
      
      // ✅ v2.7.0: Filtrar chats - remover grupos, status e leads Meta (@lid)
      // Leads Meta são contatos antigos do Meta Ads que não são conversas WhatsApp reais
      const individualChats = chats.filter(chat => {
        const jid = chat.id || '';
        if (!jid || jid.length < 5) return false;
        if (jid.includes('@g.us')) return false;      // Grupos
        if (jid.includes('status@')) return false;    // Status
        if (jid.includes('@lid')) return false;       // Leads Meta (não são WhatsApp real)
        return true;
      });
      
      console.log(`[ChatConversationList] 📊 ${chats.length} total chats, ${individualChats.length} individuais (sem leads Meta)`);
      
      // 🔍 DEBUG: Verificar providers dos primeiros chats
      const first5 = chats.slice(0, 5);
      console.log('[ChatConversationList] 🔍 DEBUG - Primeiros 5 chats:', first5.map(c => ({
        id: c.id?.substring(0, 20),
        provider: c.provider,
        instanceId: c.instanceId
      })));
      
      // 🔍 DEBUG: Procurar especificamente os números 4512 e 5999
      const chat4512 = chats.find(c => c.id?.includes('4512'));
      const chat5999 = chats.find(c => c.id?.includes('5999'));
      console.log('[ChatConversationList] 🔍 DEBUG - Chat 4512:', chat4512 ? { id: chat4512.id, provider: chat4512.provider } : 'NÃO ENCONTRADO');
      console.log('[ChatConversationList] 🔍 DEBUG - Chat 5999:', chat5999 ? { id: chat5999.id, provider: chat5999.provider } : 'NÃO ENCONTRADO');
      
      // ✅ v2.2.0: Converter ChatWithInstance para ChatContact
      const converted: ChatContact[] = individualChats.map((chat: ChatWithInstance) => {
        const jid = chat.id || '';
        const phone = extractPhoneFromJid(jid);
        const formattedPhone = formatPhone(phone);
        const dbConv = conversationsMap.get(jid);
        const isLead = jid.includes('@lid');
        
        // Nome: preferência para pushName, depois name do chat, depois banco
        let displayName = chat.name || dbConv?.guest_name;
        if (!displayName || displayName === 'Desconhecido') {
          displayName = isLead ? 'Lead Meta' : (formattedPhone || 'Contato');
        }
        
        // Última mensagem
        let lastMessageText = '';
        if (dbConv?.last_message) {
          if (typeof dbConv.last_message === 'string') lastMessageText = dbConv.last_message;
          else lastMessageText = (dbConv.last_message as Record<string, unknown>)?.message as string || '';
        } else if (chat.lastMessage) {
          lastMessageText = chat.lastMessage.text || '';
        }
        
        // Timestamp da última mensagem
        let lastMessageAt: Date | undefined;
        if (dbConv?.last_message_at) lastMessageAt = new Date(dbConv.last_message_at);
        else if (chat.lastMessage?.timestamp) lastMessageAt = new Date(chat.lastMessage.timestamp * 1000);
        
        const isPinned = dbConv?.is_pinned || false;
        const category = isPinned ? 'pinned' as const : (dbConv?.category as ConversationCategory || 'normal');
        
        return {
          id: jid,
          name: displayName || 'Contato',
          phone: formattedPhone || phone,
          avatar: chat.profilePicUrl || undefined,
          lastMessage: lastMessageText,
          lastMessageAt,
          unreadCount: dbConv?.unread_count || chat.unreadCount || 0,
          channel: 'whatsapp' as ChannelType,
          category,
          type: isLead ? 'lead' as const : 'guest' as const,
          isPinned,
          tags: dbConv?.tags || [],
          // ✅ v2.2.0: Usar instanceId e provider do ChatWithInstance
          instanceId: chat.instanceId || dbConv?.instance_id || undefined,
          // ✅ v2.3.0: Usar provider do ChatWithInstance para identificar origem
          provider: chat.provider,
        };
      });
      
      // Adicionar conversas do banco não na Evolution
      const existingJids = new Set(converted.map(c => c.id));
      conversationsResult.forEach(dbConv => {
        if (dbConv.external_conversation_id && !existingJids.has(dbConv.external_conversation_id)) {
          const extId = dbConv.external_conversation_id;
          const isLead = extId.includes('@lid');
          let phone = '', displayName = dbConv.guest_name || '';
          
          if (extId.includes('@s.whatsapp.net')) {
            phone = extId.replace('@s.whatsapp.net', '');
            if (!displayName) displayName = formatPhone(phone) || phone;
          } else if (isLead) {
            if (!displayName) displayName = 'Lead Meta';
          } else if (extId.includes('@c.us')) {
            // ✅ v2.4.0: Extrair telefone de JID WAHA
            phone = extId.replace('@c.us', '');
            if (!displayName) displayName = formatPhone(phone) || phone;
          } else if (!extId.includes('@g.us')) {
            phone = dbConv.guest_phone || '';
            if (!displayName) displayName = phone ? formatPhone(phone) : 'Contato';
          } else return;
          
          let lastMessageText = '';
          if (dbConv.last_message) {
            if (typeof dbConv.last_message === 'string') lastMessageText = dbConv.last_message;
            else lastMessageText = (dbConv.last_message as Record<string, unknown>)?.message as string || '';
          }
          
          const isPinned = dbConv.is_pinned || false;
          
          // ✅ v2.4.0: Inferir provider do banco ou pelo JID
          let inferredProvider: 'evolution' | 'waha' | undefined;
          if (dbConv.instance_id && instanceProviderMap.has(dbConv.instance_id)) {
            inferredProvider = instanceProviderMap.get(dbConv.instance_id);
          } else {
            // Fallback: inferir pelo formato do JID
            if (extId.includes('@s.whatsapp.net')) {
              inferredProvider = 'evolution';
            } else if (extId.includes('@c.us') || extId.includes('@lid')) {
              inferredProvider = 'waha';
            }
          }
          
          converted.push({
            id: extId,
            name: displayName,
            phone,
            lastMessage: lastMessageText,
            lastMessageAt: dbConv.last_message_at ? new Date(dbConv.last_message_at) : undefined,
            unreadCount: dbConv.unread_count || 0,
            channel: 'whatsapp',
            category: isPinned ? 'pinned' : (dbConv.category as ConversationCategory || 'normal'),
            type: isLead ? 'lead' : 'guest',
            isPinned,
            tags: dbConv.tags || [],
            instanceId: dbConv.instance_id || undefined,
            provider: inferredProvider,
          });
        }
      });
      
      setContacts(converted);
    } catch (error) {
      console.error('[ChatConversationList] Erro:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organizationId, instanceProviderMap]);

  // ✅ v2.4.0: Carregar instâncias primeiro, depois contatos
  useEffect(() => { loadInstances(); }, [loadInstances]);
  useEffect(() => { 
    if (instanceProviderMap.size > 0 || whatsappInstances.length === 0) {
      loadContacts(); 
    }
  }, [loadContacts, instanceProviderMap, whatsappInstances.length]);

  useEffect(() => {
    if (!organizationId) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('conversation-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `organization_id=eq.${organizationId}` }, () => loadContacts(false))
      .subscribe((status: string) => setIsRealtimeConnected(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, loadContacts]);

  // ============================================
  // FILTER & GROUP
  // ============================================
  
  const filteredContacts = contacts.filter(c => {
    if (filterChannel !== 'all' && c.channel !== filterChannel) return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterTags.length > 0 && !filterTags.some(t => c.tags.includes(t))) return false;
    if (filterInstance !== 'all' && c.instanceId !== filterInstance) return false;
    // ✅ v2.5.0: Filtro por Provider (Evolution / WAHA)
    if (filterProvider !== 'all' && c.provider !== filterProvider) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.lastMessage?.toLowerCase().includes(q);
  });

  // Agrupar por categoria
  const pinnedContacts = filteredContacts.filter(c => c.isPinned);
  const urgentContacts = filteredContacts.filter(c => !c.isPinned && c.category === 'urgent');
  const normalContacts = filteredContacts.filter(c => !c.isPinned && c.category === 'normal');
  const resolvedContacts = filteredContacts.filter(c => !c.isPinned && c.category === 'resolved');

  // Ordenar cada grupo
  const sortByDate = (a: ChatContact, b: ChatContact) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0);
  pinnedContacts.sort(sortByDate);
  urgentContacts.sort(sortByDate);
  normalContacts.sort(sortByDate);
  resolvedContacts.sort(sortByDate);

  const hasActiveFilters = filterChannel !== 'all' || filterCategory !== 'all' || filterType !== 'all' || filterTags.length > 0 || filterInstance !== 'all' || filterProvider !== 'all';

  // ============================================
  // RENDER CONTACT ITEM
  // ============================================
  
  const renderContact = (contact: ChatContact) => {
    const ChannelIcon = CHANNEL_CONFIG[contact.channel]?.icon || MessageCircle;
    
    // 🔍 DEBUG: Log provider para os números de teste
    if (contact.phone?.includes('4512') || contact.phone?.includes('5999') || 
        contact.id?.includes('4512') || contact.id?.includes('5999')) {
      console.log(`[renderContact] 🔍 DEBUG ${contact.name}:`, {
        id: contact.id?.substring(0, 25),
        provider: contact.provider,
        phone: contact.phone
      });
    }
    
    // ✅ v2.3.0: Usar provider do ChatWithInstance (fonte confiável)
    // Fallback para detecção por JID apenas se provider não disponível
    const isEvolution = contact.provider === 'evolution' || 
      (!contact.provider && contact.id.includes('@s.whatsapp.net'));
    const isWaha = contact.provider === 'waha' || 
      (!contact.provider && (contact.id.includes('@c.us') || contact.id.includes('@lid')));
    
    // Cores diferenciadas por provider
    let providerColor = CHANNEL_CONFIG[contact.channel]?.color || 'text-gray-500';
    let providerLetter = '';
    
    if (contact.channel === 'whatsapp') {
      if (isEvolution) {
        providerColor = 'text-[#128C7E]'; // Verde escuro Evolution
        providerLetter = 'E';
      } else if (isWaha) {
        providerColor = 'text-[#25D366]'; // Verde claro WAHA
        providerLetter = 'W';
      }
    }
    
    return (
      <div
        key={contact.id}
        onClick={() => onSelectConversation(contact)}
        className={`
          ${compact ? 'p-2' : 'p-3'} cursor-pointer transition-colors relative group
          hover:bg-gray-50 dark:hover:bg-gray-800
          ${selectedId === contact.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''}
        `}
      >
        <div className="flex gap-2">
          <div className="relative">
            <Avatar className={compact ? 'h-8 w-8' : 'h-10 w-10'}>
              <AvatarImage src={contact.avatar} />
              <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            {/* Channel badge with provider indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 flex items-center gap-px ${providerColor}`}>
              <ChannelIcon className="h-3 w-3" />
              {providerLetter && (
                <span className="text-[8px] font-bold leading-none">{providerLetter}</span>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {contact.isPinned && <Pin className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                {contact.type === 'lead' && <Users className="h-3 w-3 text-orange-500 flex-shrink-0" />}
                {contact.type === 'guest' && contact.reservationCode && <Home className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                <span className={`font-medium text-gray-900 dark:text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                  {contact.name}
                </span>
              </div>
              {contact.lastMessageAt && (
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {formatDistanceToNow(contact.lastMessageAt, { addSuffix: false, locale: ptBR })}
                </span>
              )}
            </div>
            
            {/* ✅ v2.0.6: Mostrar telefone formatado com DDD */}
            {contact.phone && contact.name !== contact.phone && (
              <p className="text-[10px] text-gray-400 truncate">
                {contact.phone}
              </p>
            )}
            
            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="flex gap-1 mt-0.5 overflow-hidden">
                {contact.tags.slice(0, 2).map(tagId => {
                  const tag = DEFAULT_TAGS.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span key={tagId} className={`${tag.color} text-white text-[9px] px-1 rounded`}>
                      {tag.name}
                    </span>
                  );
                })}
                {contact.tags.length > 2 && (
                  <span className="text-[9px] text-gray-400">+{contact.tags.length - 2}</span>
                )}
              </div>
            )}
            
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
        
        {/* Quick actions on hover */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); togglePin(contact.id); }}
            className={`p-1 rounded hover:bg-gray-200 ${contact.isPinned ? 'text-blue-500' : 'text-gray-400'}`}
            title={contact.isPinned ? 'Desafixar' : 'Fixar'}
          >
            <Pin className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER CATEGORY SECTION
  // ============================================
  
  const renderCategory = (
    categoryContacts: ChatContact[],
    label: string,
    icon: React.ReactNode,
    bgColor: string,
    borderColor: string
  ) => {
    if (categoryContacts.length === 0) return null;
    
    return (
      <div className="mb-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 ${bgColor} border-b ${borderColor}`}>
          {icon}
          <span className="text-xs font-medium">{label}</span>
          <span className="text-xs text-gray-500">({categoryContacts.length})</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {categoryContacts.map(renderContact)}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`} style={{ maxHeight }}>
      {/* Header */}
      {showHeader && (
        <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
              {isRealtimeConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-gray-400" />}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant={showFilters ? 'default' : 'ghost'} 
                size="icon" 
                className={`h-7 w-7 ${hasActiveFilters ? 'text-blue-500' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadContacts(false)} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
      )}
      
      {/* Filtros Laterais */}
      {showFilters && (
        <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 space-y-3">
          {/* Canal */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Canal</label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'whatsapp', 'email', 'airbnb'] as const).map(ch => (
                <button key={ch} onClick={() => setFilterChannel(ch)} className={`px-2 py-1 text-xs rounded ${filterChannel === ch ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {ch === 'all' ? 'Todos' : CHANNEL_CONFIG[ch]?.label || ch}
                </button>
              ))}
            </div>
          </div>
          
          {/* ✅ v2.5.0: Filtro por PROVIDER (Evolution / WAHA) - Para teste isolado */}
          <div className="p-2 border border-purple-200 rounded-lg bg-purple-50/50">
            <label className="text-xs font-medium text-purple-700 mb-2 block flex items-center gap-1">
              🧪 Testar Provider (isolado)
            </label>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setFilterProvider('all')} 
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${filterProvider === 'all' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterProvider('evolution')} 
                className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-all ${filterProvider === 'evolution' ? 'text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                style={{ backgroundColor: filterProvider === 'evolution' ? '#128C7E' : undefined }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: filterProvider === 'evolution' ? 'rgba(255,255,255,0.3)' : '#128C7E', color: filterProvider === 'evolution' ? 'white' : 'white' }}>E</span>
                Evolution
              </button>
              <button 
                onClick={() => setFilterProvider('waha')} 
                className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-all ${filterProvider === 'waha' ? 'text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                style={{ backgroundColor: filterProvider === 'waha' ? '#25D366' : undefined }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: filterProvider === 'waha' ? 'rgba(255,255,255,0.3)' : '#25D366', color: filterProvider === 'waha' ? 'white' : 'white' }}>W</span>
                WAHA
              </button>
            </div>
            {filterProvider !== 'all' && (
              <p className="text-[10px] text-purple-600 mt-1.5">
                Mostrando apenas conversas do <strong>{filterProvider === 'evolution' ? 'Evolution API' : 'WAHA'}</strong>
              </p>
            )}
          </div>
          
          {/* Número WhatsApp (Instância) */}
          {whatsappInstances.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Número WhatsApp</label>
              <div className="flex flex-wrap gap-1">
                <button 
                  onClick={() => setFilterInstance('all')} 
                  className={`px-2 py-1 text-xs rounded ${filterInstance === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Todos
                </button>
                {whatsappInstances.map(inst => (
                  <button 
                    key={inst.id} 
                    onClick={() => setFilterInstance(inst.id)}
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${filterInstance === inst.id ? 'text-white' : 'bg-gray-200 text-gray-700'}`}
                    style={{ 
                      backgroundColor: filterInstance === inst.id ? (inst.color || '#10B981') : undefined 
                    }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: inst.status === 'connected' ? '#10B981' : '#EF4444' }}
                    />
                    {inst.provider === 'evolution' ? '🟢 E' : '🟢 W'} {inst.description || inst.instance_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Categoria */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'urgent', 'normal', 'resolved'] as const).map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-2 py-1 text-xs rounded ${filterCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {cat === 'all' ? 'Todos' : cat === 'urgent' ? 'Urgentes' : cat === 'normal' ? 'Normais' : 'Resolvidas'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Tipo */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
            <div className="flex flex-wrap gap-1">
              {(['all', 'guest', 'lead'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`px-2 py-1 text-xs rounded ${filterType === t ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {t === 'all' ? 'Todos' : t === 'guest' ? 'Hóspedes' : 'Leads'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1">
              {DEFAULT_TAGS.map(tag => (
                <button 
                  key={tag.id} 
                  onClick={() => setFilterTags(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${filterTags.includes(tag.id) ? `${tag.color} text-white` : 'bg-gray-200 text-gray-700'}`}
                >
                  <Tag className="h-3 w-3" />
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* ✅ v2.5.0: Botão Aplicar Filtro + Limpar */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <button 
              onClick={() => { loadContacts(true); }} 
              className="flex-1 px-3 py-2 text-xs rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Aplicar Filtro / Recarregar
            </button>
            {hasActiveFilters && (
              <button 
                onClick={() => { setFilterChannel('all'); setFilterCategory('all'); setFilterType('all'); setFilterTags([]); setFilterInstance('all'); setFilterProvider('all'); }} 
                className="px-3 py-2 text-xs rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center gap-1 transition-all"
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Lista */}
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
          <>
            {renderCategory(pinnedContacts, 'Fixadas', <Pin className="h-3 w-3 text-blue-500" />, 'bg-blue-50', 'border-blue-200')}
            {renderCategory(urgentContacts, 'Urgentes', <Zap className="h-3 w-3 text-orange-500 fill-orange-500" />, 'bg-orange-50', 'border-orange-200')}
            {renderCategory(normalContacts, 'Conversas', <MessageSquare className="h-3 w-3 text-gray-500" />, 'bg-gray-50', 'border-gray-200')}
            {renderCategory(resolvedContacts, 'Resolvidas', <CheckCircle className="h-3 w-3 text-green-500" />, 'bg-green-50', 'border-green-200')}
          </>
        )}
      </div>
    </div>
  );
}

export default ChatConversationList;
