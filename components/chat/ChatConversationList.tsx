/**
 * CHAT CONVERSATION LIST v2.0
 * 
 * Componente com Kanban visual (sem drag), Filtros laterais e Tags
 * 
 * @version 2.0.0
 * @date 2026-01-22
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
import { fetchWhatsAppChats } from '../../utils/whatsappChatApi';
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
  
  const loadInstances = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('channel_instances')
        .select('id, instance_name, description, color, status')
        .eq('organization_id', organizationId)
        .eq('channel', 'whatsapp')
        .is('deleted_at', null)
        .order('is_default', { ascending: false });
      
      if (data) {
        setWhatsappInstances(data as WhatsAppInstance[]);
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
      const [chats, conversationsResult] = await Promise.all([
        fetchWhatsAppChats(),
        (async (): Promise<ConversationRow[]> => {
          const supabase = getSupabaseClient();
          const { data } = await supabase
            .from('conversations')
            .select('id, external_conversation_id, guest_name, guest_phone, last_message, last_message_at, unread_count, category, conversation_type, is_pinned, tags, instance_id')
            .eq('organization_id', organizationId)
            .order('last_message_at', { ascending: false });
          return (data || []) as ConversationRow[];
        })()
      ]);
      
      const conversationsMap = new Map<string, ConversationRow>();
      conversationsResult.forEach(conv => {
        if (conv.external_conversation_id) conversationsMap.set(conv.external_conversation_id, conv);
      });
      
      const individualChats = chats.filter(chat => {
        const jid = (chat as Record<string, unknown>).remoteJid as string || chat.id || '';
        return !jid.includes('@g.us') && !jid.includes('status@');
      });
      
      const converted: ChatContact[] = individualChats.map(chat => {
        const jid = (chat as Record<string, unknown>).remoteJid as string || chat.id || '';
        const phone = extractPhoneFromJid(jid);
        const formattedPhone = formatPhone(phone);
        const dbConv = conversationsMap.get(jid);
        const isLead = jid.includes('@lid');
        
        let displayName = (chat as Record<string, unknown>).pushName as string || chat.name || dbConv?.guest_name;
        if (!displayName || displayName === 'Desconhecido') {
          displayName = isLead ? 'Lead Meta' : (formattedPhone || 'Contato');
        }
        
        let lastMessageText = '';
        if (dbConv?.last_message) {
          if (typeof dbConv.last_message === 'string') lastMessageText = dbConv.last_message;
          else lastMessageText = (dbConv.last_message as Record<string, unknown>)?.message as string || (chat.lastMessage as Record<string, unknown>)?.message as string || '';
        } else {
          lastMessageText = (chat.lastMessage as Record<string, unknown>)?.message as string || '';
        }
        
        let lastMessageAt: Date | undefined;
        if (dbConv?.last_message_at) lastMessageAt = new Date(dbConv.last_message_at);
        else if (chat.lastMessageTimestamp) lastMessageAt = new Date(chat.lastMessageTimestamp * 1000);
        
        const isPinned = dbConv?.is_pinned || false;
        const category = isPinned ? 'pinned' as const : (dbConv?.category as ConversationCategory || 'normal');
        
        return {
          id: jid,
          name: displayName || 'Contato',
          phone,
          avatar: chat.profilePictureUrl || (chat as Record<string, unknown>).profilePicUrl as string,
          lastMessage: lastMessageText,
          lastMessageAt,
          unreadCount: dbConv?.unread_count || chat.unreadCount || 0,
          channel: 'whatsapp' as ChannelType,
          category,
          type: isLead ? 'lead' as const : 'guest' as const,
          isPinned,
          tags: dbConv?.tags || [],
          instanceId: dbConv?.instance_id || undefined,
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
  }, [organizationId]);

  useEffect(() => { loadContacts(); loadInstances(); }, [loadContacts, loadInstances]);

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

  const hasActiveFilters = filterChannel !== 'all' || filterCategory !== 'all' || filterType !== 'all' || filterTags.length > 0 || filterInstance !== 'all';

  // ============================================
  // RENDER CONTACT ITEM
  // ============================================
  
  const renderContact = (contact: ChatContact) => {
    const ChannelIcon = CHANNEL_CONFIG[contact.channel]?.icon || MessageCircle;
    const channelColor = CHANNEL_CONFIG[contact.channel]?.color || 'text-gray-500';
    
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
            {/* Channel badge */}
            <div className={`absolute -bottom-0.5 -right-0.5 ${channelColor}`}>
              <ChannelIcon className="h-3 w-3" />
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
                    {inst.description || inst.instance_name}
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
          
          {/* Limpar filtros */}
          {hasActiveFilters && (
            <button onClick={() => { setFilterChannel('all'); setFilterCategory('all'); setFilterType('all'); setFilterTags([]); setFilterInstance('all'); }} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          )}
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
