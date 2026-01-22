/**
 * RENDIZY - Chat Inbox Unificado Completo
 * 
 * Chat centralizador de conversas de todas as fontes com sistema Kanban completo:
 * - WhatsApp (Evolution API)
 * - Airbnb
 * - Booking.com
 * - SMS
 * - Site (chat interno)
 * - Email
 * 
 * Funcionalidades:
 * - ✅ Sistema Kanban (Fixadas, Urgentes, Normais, Resolvidas)
 * - ✅ Sistema de Pin (máx 5)
 * - ✅ RES-ID e propriedade nos cards
 * - ✅ Tags personalizadas
 * - ✅ Seleção múltipla
 * - ✅ Ícones de canal
 * - ✅ Cores por categoria/status/canal
 * - ✅ Header completo (check-in/check-out, link HÓSPEDE, botão Bloqueio)
 * 
 * @version v1.0.104.018
 * @date 2026-01-22
 * 
 * CHANGELOG v1.0.104.018:
 * - Sync inicial dos chats do WhatsApp ao carregar (via useChatData)
 * - Corrigido ordenação por timestamp da última mensagem
 * - Removido suporte a Status do WhatsApp (status@broadcast = Stories)
 * 
 * ================================================================================
 * 🔴 TODO: REFATORAÇÃO FUTURA - ARQUITETURA DE CÁPSULAS/ADAPTADORES
 * ================================================================================
 * 
 * Criar sistema modular de "Cápsulas" (Adapter Pattern) para cada fonte de webhook:
 * 
 * 📦 Estrutura proposta: /utils/adapters/chat/
 *    ├── index.ts                    # Factory + registro de adaptadores
 *    ├── types.ts                    # Interfaces comuns (UnifiedContact, UnifiedMessage)
 *    ├── evolution-adapter.ts        # Evolution API v2 (WhatsApp)
 *    ├── airbnb-adapter.ts           # Airbnb Messaging API
 *    ├── booking-adapter.ts          # Booking.com Messaging
 *    ├── z-api-adapter.ts            # Z-API (WhatsApp alternativo)
 *    ├── twilio-adapter.ts           # Twilio (SMS/WhatsApp)
 *    └── email-adapter.ts            # Email (IMAP/SMTP)
 * 
 * 🎯 Cada adaptador implementa interface comum:
 *    interface ChatAdapter {
 *      name: string;
 *      parseContact(rawData: unknown): UnifiedContact;
 *      parseMessage(rawData: unknown): UnifiedMessage;
 *      extractPhone(identifier: string): string | null;
 *      isValidContact(data: unknown): boolean;
 *      filterInvalidTypes(contacts: unknown[]): unknown[]; // remove grupos, broadcasts, etc
 *    }
 * 
 * 🔧 Benefícios:
 *    - Código específico de cada API isolado na sua cápsula
 *    - Fácil adicionar novos canais sem alterar ChatInbox
 *    - Testes unitários por adaptador
 *    - Manutenção simplificada
 * 
 * 📋 Prioridade: MÉDIA (após estabilizar Evolution API)
 * ================================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Pin, 
  Zap, 
  MessageCircle, 
  CheckCircle2, 
  Circle,
  Home,
  Building2,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Search,
  Loader2,
  Lock,
  Calendar,
  User,
  Tag as TagIcon,
  Users,      // ✅ NOVO: Ícone para grupos
  Radio       // ✅ NOVO: Ícone para broadcast
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox as UICheckbox } from './ui/checkbox';
import { ChatFilterSidebar } from './ChatFilterSidebar';
import { WhatsAppConversation } from './WhatsAppConversation';
import { QuickActionsModal } from './QuickActionsModal';
import { QuotationModal } from './QuotationModal';
import { CreateReservationWizard } from './CreateReservationWizard';
import { BlockModal } from './BlockModal';
import { TemplateManagerModal } from './TemplateManagerModal';
import { ChatTagsModal, ChatTag } from './ChatTagsModal';
import { useAuth } from '../src/contexts/AuthContext';
import { useChatData, UnifiedConversation as UnifiedConv } from './chat/hooks/useChatData';
import { useChatFilters } from './chat/hooks/useChatFilters';
import { ChatSidebar } from './chat/ChatSidebar';
import { 
  Conversation, 
  chatApi, 
  ChatTag as ChatTagType 
} from '../utils/chatApi';
import { 
  getEvolutionContactsService, 
  LocalContact 
} from '../utils/services/evolutionContactsService';
import { Property } from '../App';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhoneDisplay, extractPhoneNumber } from '../utils/whatsappChatApi';
import { parseDateLocal } from '../utils/dateLocal';

// ============================================
// TYPES
// ============================================

interface UnifiedConversation {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  channel: 'whatsapp' | 'airbnb' | 'booking' | 'sms' | 'email' | 'site' | 'system';
  status: 'unread' | 'read' | 'resolved';
  category: 'pinned' | 'urgent' | 'normal' | 'resolved';
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  isOnline?: boolean;
  reservationCode?: string;
  propertyName?: string;
  propertyId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  tags?: string[];
  isPinned?: boolean;
  conversationType?: 'guest' | 'lead' | 'contact' | 'group' | 'broadcast' | 'unknown';
  // ✅ NOVO v1.0.104.010: Campos para tipo de conversa WhatsApp
  isGroup?: boolean;
  isBroadcast?: boolean;
  // Dados originais
  conversation?: Conversation;
  contact?: LocalContact;
}

// ============================================
// DESIGN SYSTEM - CORES
// ============================================

const channelColors = {
  whatsapp: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50', icon: MessageCircle },
  airbnb: { bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50', icon: Home },
  booking: { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', icon: Building2 },
  sms: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', icon: Phone },
  email: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50', icon: Mail },
  site: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', icon: Globe },
  system: { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50', icon: MessageSquare }
};

const categoryColors = {
  pinned: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: Pin },
  urgent: { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', icon: Zap },
  normal: { bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-900 dark:text-white', icon: MessageCircle },
  resolved: { bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', icon: CheckCircle2 }
};

const statusColors = {
  unread: { text: 'text-red-500', badge: 'bg-red-500', icon: Circle },
  read: { text: 'text-gray-500', badge: 'bg-gray-500', icon: CheckCircle2 },
  resolved: { text: 'text-green-500', badge: 'bg-green-500', icon: CheckCircle2 }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * ✅ CORRIGIDO v1.0.104.012: Extrair número limpo APENAS de formatos válidos
 * IMPORTANTE: @lid NÃO é número de telefone - é Link ID interno do WhatsApp!
 * Só extrair de @s.whatsapp.net ou @c.us
 */
function extractPhoneFromId(idOrPhone: string | undefined): string {
  if (!idOrPhone) return '';
  
  // Se é @lid ou @g.us, NÃO é número de telefone real
  if (idOrPhone.includes('@lid') || idOrPhone.includes('@g.us') || idOrPhone.includes('@broadcast')) {
    return '';
  }
  
  // Se parece ser UUID/CUID (não contém @), não extrair
  if (!idOrPhone.includes('@') && !idOrPhone.includes('-') && idOrPhone.length > 20) {
    if (/[a-zA-Z]/.test(idOrPhone)) {
      return ''; // É CUID, não extrair
    }
  }
  
  // Se é UUID com hífens
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrPhone)) {
    return ''; // É UUID, não extrair
  }
  
  // Só extrair de formatos com número real
  const cleaned = idOrPhone
    .replace('whatsapp-', '')
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace(/\D/g, '');  // Só dígitos
  
  // Validar formato brasileiro: 55 + DDD (2) + número (8 ou 9)
  if (/^55\d{10,11}$/.test(cleaned)) {
    return cleaned;
  }
  
  return '';
}

/**
 * ✅ CORRIGIDO v1.0.104.011: Formatar telefone para exibição
 */
function formatPhoneForDisplay(phone: string | undefined): string {
  if (!phone) return '';
  
  // Se já parece formatado, retornar
  if (phone.startsWith('+')) return phone;
  
  // Extrair número limpo
  const cleaned = extractPhoneFromId(phone);
  
  // Validar tamanho
  if (cleaned.length < 10 || cleaned.length > 15) return '';
  
  // Formato brasileiro: +55 22 98888-7777
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    const country = cleaned.substring(0, 2);
    const ddd = cleaned.substring(2, 4);
    const rest = cleaned.substring(4);
    
    if (rest.length === 9) {
      return `+${country} ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `+${country} ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return `+${country} ${ddd} ${rest}`;
  }
  
  // Formato genérico: adicionar +
  return `+${cleaned}`;
}

/**
 * ✅ CORRIGIDO v1.0.104.012: Obter telefone formatado de múltiplas fontes
 * IMPORTANTE: @lid NÃO é número - não extrair!
 * Prioridade: phoneRaw > phone > id (só de @s.whatsapp.net ou @c.us)
 */
function getPhoneFromContact(contact: LocalContact | undefined): string {
  if (!contact) return '';
  
  // Se é grupo ou broadcast, não tem telefone
  if (contact.isGroup || contact.isBroadcast) return '';
  
  // Se o ID é @lid, NÃO tem número real
  if (contact.id?.includes('@lid')) return '';
  
  // 1. Tentar phoneRaw primeiro - MAS validar formato BR
  if (contact.phoneRaw && /^55\d{10,11}$/.test(contact.phoneRaw)) {
    return contact.phoneRaw;
  }
  
  // 2. Tentar phone
  if (contact.phone) {
    const phoneExtracted = extractPhoneFromId(contact.phone);
    if (phoneExtracted) return phoneExtracted;
  }
  
  // 3. Tentar id (só de @s.whatsapp.net ou @c.us)
  if (contact.id && (contact.id.includes('@s.whatsapp.net') || contact.id.includes('@c.us'))) {
    const idExtracted = extractPhoneFromId(contact.id);
    if (idExtracted) return idExtracted;
  }
  
  return '';
}

/**
 * ✅ MELHORADO v1.0.104.010: Obter nome para exibição inteligente
 * Prioridade: groupName > pushName > name > telefone formatado
 */
function getDisplayName(contact: LocalContact | undefined, fallbackName?: string): string {
  if (!contact) return fallbackName || 'Desconhecido';
  
  // 1. Se é grupo, usar nome do grupo
  if (contact.isGroup && contact.groupName) {
    return contact.groupName;
  }
  
  // 2. Se tem pushName (nome do WhatsApp)
  if (contact.pushName && contact.pushName.trim()) {
    return contact.pushName.trim();
  }
  
  // 3. Se tem name calculado (não é "Desconhecido" ou similar)
  if (contact.name && contact.name.trim() && 
      !['Desconhecido', 'Sem nome', 'Grupo sem nome'].includes(contact.name)) {
    return contact.name.trim();
  }
  
  // 4. Fallback por tipo
  if (contact.isGroup) return 'Grupo sem nome';
  if (contact.isBroadcast) return 'Lista de transmissão';
  
  // 5. Formatar telefone (extrair de múltiplas fontes)
  const phoneRaw = getPhoneFromContact(contact);
  if (phoneRaw) {
    return formatPhoneForDisplay(phoneRaw);
  }
  
  return fallbackName || 'Desconhecido';
}

function getInitials(name: string, contact?: LocalContact): string {
  // Se é grupo, usar ícone de grupo
  if (contact?.isGroup) return '👥';
  if (contact?.isBroadcast) return '📢';
  
  if (!name || name === 'Desconhecido' || name === 'Sem nome') {
    // Se tem telefone, usar primeiros dígitos (extrair de múltiplas fontes)
    const phoneRaw = contact ? getPhoneFromContact(contact) : '';
    if (phoneRaw) {
      // Usar DDD como iniciais (posições 2-3 para Brasil)
      if (phoneRaw.startsWith('55') && phoneRaw.length >= 4) {
        return phoneRaw.substring(2, 4);
      }
      return phoneRaw.substring(0, 2);
    }
    return '??';
  }
  
  // Se começa com +, é um telefone - usar dígitos
  if (name.startsWith('+')) {
    const cleaned = name.replace(/\D/g, '');
    return cleaned.substring(0, 2) || '??';
  }
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

/**
 * Extrai texto da mensagem de diferentes formatos
 */
function extractMessageText(message: any): string {
  if (!message) return '';
  
  // Se já é string
  if (typeof message === 'string') return message;
  
  // Formato Evolution API
  if (message.message) {
    if (typeof message.message === 'string') return message.message;
    if (message.message.conversation) return message.message.conversation;
    if (message.message.extendedTextMessage?.text) return message.message.extendedTextMessage.text;
    if (message.message.imageMessage?.caption) return '📷 ' + (message.message.imageMessage.caption || 'Imagem');
    if (message.message.videoMessage?.caption) return '🎥 ' + (message.message.videoMessage.caption || 'Vídeo');
    if (message.message.audioMessage) return '🎵 Áudio';
    if (message.message.documentMessage) return '📄 ' + (message.message.documentMessage.fileName || 'Documento');
    if (message.message.stickerMessage) return '🎨 Sticker';
    if (message.message.contactMessage) return '👤 Contato';
    if (message.message.locationMessage) return '📍 Localização';
  }
  
  // Formato direto
  if (message.conversation) return message.conversation;
  if (message.text) return message.text;
  if (message.body) return message.body;
  if (message.content) return message.content;
  
  return '';
}

function getChannelIcon(channel: string) {
  const config = channelColors[channel as keyof typeof channelColors] || channelColors.system;
  const Icon = config.icon;
  return <Icon className="h-4 w-4" style={{ color: config.text.replace('text-', '') }} />;
}

// ============================================
// COMPONENT
// ============================================

export function ChatInbox() {
  const { organization, user } = useAuth();
  const organizationId = organization?.id || (user?.type === 'superadmin' ? null : undefined);

  // Hook customizado para gerenciar dados do chat
  const { 
    isLoading, 
    conversations, 
    contacts, 
    tags, 
    loadData,
    setConversations,
    setContacts,
    setTags
  } = useChatData(organizationId);

  // State
  const [selectedConversation, setSelectedConversation] = useState<UnifiedConv | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);

  // Modals
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showQuotation, setShowQuotation] = useState(false);
  const [showCreateReservation, setShowCreateReservation] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);

  // Drag & Drop
  const [draggedConversationId, setDraggedConversationId] = useState<string | null>(null);
  const [conversationOrder, setConversationOrder] = useState<Map<string, number>>(new Map());

  // ============================================
  // LOAD DATA
  // ============================================

  useEffect(() => {
    loadData();
  }, [organizationId]);



  // ✅ CORRIGIDO v1.0.104.017: Converter contatos WhatsApp para conversas unificadas
  // REMOVIDO: grupos (@g.us), broadcasts (@lid), e STATUS (@broadcast) - Stories do WhatsApp
  const convertContactsToConversations = (contacts: LocalContact[]): UnifiedConversation[] => {
    // Filtrar apenas contatos individuais (não grupos, broadcasts nem status)
    const individualContacts = contacts.filter(contact => {
      // Ignorar grupos (@g.us)
      if (contact.isGroup || contact.id?.includes('@g.us')) return false;
      // Ignorar broadcasts (@lid)
      if (contact.isBroadcast || contact.id?.includes('@lid')) return false;
      // Ignorar status@broadcast (Stories do WhatsApp)
      if (contact.id === 'status@broadcast' || contact.id?.includes('status@')) return false;
      return true;
    });
    
    return individualContacts.map(contact => {
      // Verificar se já existe conversa para este contato
      const existing = conversations.find(c => 
        c.phone === contact.phone || 
        c.phone === contact.phoneRaw ||
        (c.contact && c.contact.id === contact.id)
      );

      if (existing) return existing;

      // Criar nova conversa do WhatsApp
      let category: 'pinned' | 'urgent' | 'normal' | 'resolved' = 'normal';
      if (contact.unreadCount > 0) category = 'urgent';

      // ✅ MELHORADO: Usar phoneRaw quando disponível
      let phoneNumber = contact.phoneRaw || contact.phone;
      if (!phoneNumber || phoneNumber.includes('@') || phoneNumber.includes('cmi')) {
        // Se phone é inválido, tentar extrair do ID
        const phoneFromId = contact.id.replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
        if (/^\d+$/.test(phoneFromId)) {
          phoneNumber = phoneFromId;
        } else {
          phoneNumber = '';
        }
      }

      // ✅ MELHORADO: Usar getDisplayName para nome inteligente
      const displayName = getDisplayName(contact);

      return {
        id: `whatsapp-${contact.id}`,
        name: displayName,
        phone: phoneNumber,
        avatar: contact.profilePicUrl,
        channel: 'whatsapp',
        status: contact.unreadCount > 0 ? 'unread' : 'read',
        category,
        lastMessage: extractMessageText(contact.lastMessage),
        lastMessageAt: contact.updatedAt,
        unreadCount: contact.unreadCount,
        isOnline: contact.isOnline,
        // ✅ NOVO: Informações extras
        conversationType: contact.conversationType,
        isGroup: contact.isGroup,
        isBroadcast: contact.isBroadcast,
        contact
      };
    });
  };

  // ============================================
  // FILTERED & GROUPED CONVERSATIONS
  // ============================================

  const allUnifiedConversations = useMemo(() => {
    // ✅ v1.0.104.017: Filtrar grupos, broadcasts (@lid) e STATUS (@broadcast) do backend
    const fromBackend = conversations.filter(c => {
      const extId = c.conversation?.external_conversation_id || c.id || '';
      // Ignorar grupos (@g.us)
      if (extId.includes('@g.us')) {
        console.log('[ChatInbox] 🚫 Ignorando grupo do backend:', extId);
        return false;
      }
      // Ignorar broadcasts (@lid) - Link IDs NÃO são telefones!
      if (extId.includes('@lid')) {
        console.log('[ChatInbox] 🚫 Ignorando broadcast @lid do backend:', extId);
        return false;
      }
      // Ignorar status@broadcast - Stories do WhatsApp (NÃO são mensagens!)
      if (extId === 'status@broadcast' || extId.includes('status@')) {
        console.log('[ChatInbox] 🚫 Ignorando Status/Stories do backend:', extId);
        return false;
      }
      return true;
    });
    
    const fromWhatsApp = convertContactsToConversations(contacts);
    
    // ✅ CORRIGIDO v1.0.104.013: Criar mapa de contatos por external_id para lookup rápido
    const contactsMap = new Map<string, LocalContact>();
    contacts.forEach(c => {
      contactsMap.set(c.id, c);
      // Também mapear por phone_raw se disponível
      if (c.phoneRaw) {
        contactsMap.set(c.phoneRaw, c);
        contactsMap.set(`${c.phoneRaw}@s.whatsapp.net`, c);
      }
      if (c.phone) {
        contactsMap.set(c.phone, c);
      }
    });
    
    // Mesclar, evitando duplicatas
    const merged = new Map<string, UnifiedConversation>();
    
    // ✅ CORRIGIDO: Associar contact às conversas do backend
    fromBackend.forEach(c => {
      // Tentar encontrar o contact correspondente
      let matchedContact: LocalContact | undefined;
      
      // 1. Tentar pelo external_conversation_id
      const extConvId = c.conversation?.external_conversation_id;
      if (extConvId) {
        matchedContact = contactsMap.get(extConvId);
      }
      
      // 2. Tentar pelo phone
      if (!matchedContact && c.phone) {
        const cleanPhone = c.phone.replace(/\D/g, '');
        matchedContact = contactsMap.get(cleanPhone) || contactsMap.get(`${cleanPhone}@s.whatsapp.net`);
      }
      
      // 3. Tentar pelo ID
      if (!matchedContact) {
        matchedContact = contactsMap.get(c.id);
      }
      
      merged.set(c.id, {
        ...c,
        contact: matchedContact
      });
    });
    
    fromWhatsApp.forEach(c => {
      if (!merged.has(c.id)) {
        merged.set(c.id, c);
      }
    });

    return Array.from(merged.values());
  }, [conversations, contacts]);

  // Hook customizado para filtros e busca
  const {
    searchQuery,
    selectedStatuses,
    selectedChannels,
    selectedTags,
    selectedProperties,
    dateRange,
    setSearchQuery,
    setSelectedStatuses,
    setSelectedChannels,
    setSelectedTags,
    setSelectedProperties,
    setDateRange,
    filteredConversations,
    resetFilters
  } = useChatFilters(allUnifiedConversations);

  const groupedConversations = useMemo(() => {
    let pinned = filteredConversations.filter(c => c.category === 'pinned' || c.isPinned);
    let urgent = filteredConversations.filter(c => c.category === 'urgent' && !c.isPinned);
    let normal = filteredConversations.filter(c => c.category === 'normal' && !c.isPinned);
    let resolved = filteredConversations.filter(c => c.category === 'resolved' && !c.isPinned);

    // ✅ v1.0.104.016: Ordenar SEMPRE por data mais recente primeiro
    // Ordem customizada só para conversas fixadas manualmente
    const sortByOrder = (list: UnifiedConversation[]) => {
      return list.sort((a, b) => {
        const orderA = conversationOrder.get(a.id);
        const orderB = conversationOrder.get(b.id);
        
        // Se ambos têm ordem personalizada (drag & drop), usar essa ordem
        if (orderA !== undefined && orderB !== undefined) {
          return orderA - orderB;
        }
        
        // Se apenas um tem ordem customizada, ele vem primeiro
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        
        // ✅ PADRÃO: Ordenar por data da última mensagem (mais recente primeiro)
        // Converter para timestamp para comparação segura
        const getTimestamp = (conv: UnifiedConversation): number => {
          if (conv.lastMessageAt instanceof Date) {
            return conv.lastMessageAt.getTime();
          }
          if (typeof conv.lastMessageAt === 'string') {
            return new Date(conv.lastMessageAt).getTime() || 0;
          }
          // Fallback: usar updatedAt se disponível
          if (conv.updatedAt instanceof Date) {
            return conv.updatedAt.getTime();
          }
          if (typeof conv.updatedAt === 'string') {
            return new Date(conv.updatedAt).getTime() || 0;
          }
          return 0;
        };
        
        const dateA = getTimestamp(a);
        const dateB = getTimestamp(b);
        return dateB - dateA; // Mais recente primeiro (maior timestamp = mais recente)
      });
    };

    pinned = sortByOrder(pinned);
    urgent = sortByOrder(urgent);
    normal = sortByOrder(normal);
    resolved = sortByOrder(resolved);

    return { pinned, urgent, normal, resolved };
  }, [filteredConversations, conversationOrder]);

  // ============================================
  // ACTIONS
  // ============================================

  const handleTogglePin = async (conversationId: string) => {
    if (!organizationId) return;
    
    const conv = allUnifiedConversations.find(c => c.id === conversationId);
    const currentPinnedState = conv?.isPinned ?? false;
    const newPinnedState = !currentPinnedState;
    
    // ✅ CORREÇÃO: Ao desfixar, remover da ordem personalizada para reordenar por data/prioridade
    if (!newPinnedState) {
      const newOrder = new Map(conversationOrder);
      newOrder.delete(conversationId);
      setConversationOrder(newOrder);
    }
    
    try {
      const result = await chatApi.conversations.togglePin(conversationId, organizationId);
      if (result.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao fixar/desafixar:', error);
    }
  };

  const handleSelectConversation = (conv: UnifiedConversation) => {
    setSelectedConversation(conv);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // ============================================
  // DRAG & DROP
  // ============================================

  const handleDragStart = (conversationId: string) => {
    setDraggedConversationId(conversationId);
  };

  const handleDragOver = (e: React.DragEvent, targetConversationId: string, category: 'pinned' | 'urgent' | 'normal' | 'resolved') => {
    e.preventDefault();
    if (!draggedConversationId || draggedConversationId === targetConversationId) return;

    const grouped = groupedConversations;
    let categoryList: UnifiedConversation[] = [];
    
    switch (category) {
      case 'pinned':
        categoryList = grouped.pinned;
        break;
      case 'urgent':
        categoryList = grouped.urgent;
        break;
      case 'normal':
        categoryList = grouped.normal;
        break;
      case 'resolved':
        categoryList = grouped.resolved;
        break;
    }

    const draggedIndex = categoryList.findIndex((c) => c.id === draggedConversationId);
    const targetIndex = categoryList.findIndex((c) => c.id === targetConversationId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reordenar apenas dentro da mesma categoria
    const newList = [...categoryList];
    const [draggedConv] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedConv);

    // Atualizar ordem local
    const newOrder = new Map(conversationOrder);
    newList.forEach((conv, index) => {
      newOrder.set(conv.id, index);
    });
    setConversationOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedConversationId(null);
  };

  // ============================================
  // RENDER CONVERSATION CARD
  // ============================================

  const renderConversationCard = (conv: UnifiedConversation, category: 'pinned' | 'urgent' | 'normal' | 'resolved') => {
    // ✅ CORREÇÃO: Usar cor especial (azul) SOMENTE se estiver realmente fixado
    // Se não estiver fixado, usar a cor da categoria normal (urgent, normal, resolved)
    const actualCategory = conv.isPinned ? 'pinned' : conv.category;
    const categoryConfig = categoryColors[actualCategory];
    const channelConfig = channelColors[conv.channel];
    const statusConfig = statusColors[conv.status];
    const isSelected = selectedConversation?.id === conv.id;
    const isChecked = selectedIds.has(conv.id);
    const isDragging = draggedConversationId === conv.id;

    return (
      <div
        key={conv.id}
        className={`
          relative p-4 cursor-move transition-all border-b
          ${categoryConfig.bg} ${categoryConfig.border}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${isDragging ? 'opacity-50' : ''}
          hover:shadow-md
        `}
        style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
        draggable
        onDragStart={() => handleDragStart(conv.id)}
        onDragOver={(e) => handleDragOver(e, conv.id, category)}
        onDragEnd={handleDragEnd}
        onClick={() => !isSelectionMode && handleSelectConversation(conv)}
      >
        <div className="flex gap-3 w-full min-w-0" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          {/* Checkbox (modo seleção) */}
          {isSelectionMode && (
            <UICheckbox
              checked={isChecked}
              onCheckedChange={() => handleToggleSelect(conv.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={conv.avatar} />
              <AvatarFallback className={`${channelConfig.light} ${conv.isGroup ? 'bg-purple-100' : ''} ${conv.isBroadcast ? 'bg-amber-100' : ''}`}>
                {conv.isGroup ? (
                  <Users className="h-5 w-5 text-purple-600" />
                ) : conv.isBroadcast ? (
                  <Radio className="h-5 w-5 text-amber-600" />
                ) : (
                  getInitials(conv.name, conv.contact)
                )}
              </AvatarFallback>
            </Avatar>
            {conv.isOnline && !conv.isGroup && !conv.isBroadcast && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
            {/* ✅ NOVO: Badge para grupos */}
            {conv.isGroup && (
              <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[9px] px-1 rounded-full">
                Grupo
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0" style={{ width: 0, maxWidth: '100%', overflow: 'hidden' }}>
            {/* Nome e timestamp */}
            <div className="flex items-start justify-between gap-2 mb-1" style={{ width: '100%', minWidth: 0 }}>
              <div className="flex items-center gap-2 min-w-0 flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                <span className={`font-medium truncate ${categoryConfig.text}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.name || getDisplayName(conv.contact, 'Desconhecido')}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getChannelIcon(conv.channel)}
                  {conv.isPinned && (
                    <Pin className="h-3 w-3 text-blue-500 fill-blue-500 flex-shrink-0" />
                  )}
                </div>
              </div>
              {conv.lastMessageAt && (
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {formatTimeAgo(conv.lastMessageAt)}
                </span>
              )}
            </div>

            {/* RES-ID e Propriedade */}
            {(conv.reservationCode || conv.propertyName) && (
              <div className="flex items-center gap-2 mb-1" style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                {conv.reservationCode && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {conv.reservationCode}
                  </Badge>
                )}
                {conv.category === 'urgent' && (
                  <Zap className="h-3 w-3 text-orange-500 flex-shrink-0" />
                )}
                {conv.propertyName && (
                  <span className="text-xs text-gray-600 truncate flex-1 min-w-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.propertyName}
                  </span>
                )}
              </div>
            )}

            {/* Última mensagem */}
            {conv.lastMessage && (
              <p className="text-sm text-gray-600 truncate mb-1 min-w-0" style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.lastMessage.replace(/\n/g, ' ').trim()}
              </p>
            )}

            {/* Tags */}
            {conv.tags && conv.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {conv.tags.slice(0, 3).map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge key={tagId} variant="outline" className="text-xs" style={{ borderColor: tag.color }}>
                      <TagIcon className="h-2.5 w-2.5 mr-1" />
                      {tag.name}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Unread indicator */}
            {conv.unreadCount > 0 && (
              <div className="mt-2">
                <Badge variant="default" className="bg-red-500">
                  {conv.unreadCount} nova{conv.unreadCount > 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>

          {/* Pin button */}
          {!isSelectionMode && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePin(conv.id);
              }}
            >
              <Pin className={`h-4 w-4 ${conv.isPinned ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex h-screen overflow-hidden" style={{ height: '100vh' }}>
      {/* Sidebar com conversas */}
      <ChatSidebar
        properties={properties}
        selectedProperties={selectedProperties}
        onToggleProperty={(id) => {
          setSelectedProperties(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
          );
        }}
        onSetSelectedProperties={setSelectedProperties}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
        selectedChannels={selectedChannels}
        onChannelsChange={setSelectedChannels}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        chatTags={tags.map(t => ({ id: t.id, name: t.name, color: t.color }))}
        onManageTags={() => setShowTagsManager(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        groupedConversations={groupedConversations}
        filteredConversations={filteredConversations}
        isLoading={isLoading}
        renderConversationCard={renderConversationCard}
      />

      {/* Middle column: conversation - FLEX-1 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedConversation ? (
          <WhatsAppConversation 
            contact={(() => {
              // ✅ CORRIGIDO v1.0.104.014: Usar contact do banco se disponível
              if (selectedConversation.contact && selectedConversation.contact.phoneRaw) {
                console.log('[ChatInbox] ✅ Usando contact do banco:', selectedConversation.contact);
                return selectedConversation.contact;
              }
              
              // ✅ Detectar se é @lid (broadcast) - NÃO usar
              const convId = selectedConversation.conversation?.external_conversation_id || selectedConversation.id || '';
              if (convId.includes('@lid')) {
                console.warn('[ChatInbox] ⚠️ Conversa @lid detectada, sem telefone real');
                return {
                  id: convId,
                  name: selectedConversation.name,
                  phone: '',
                  phoneRaw: '',
                  isBroadcast: true,
                  source: 'evolution' as const,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
              }
              
              // ✅ Extrair telefone de forma segura (só de @s.whatsapp.net ou @c.us)
              let phoneExtracted = '';
              
              // 1. Tentar do contact.phoneRaw
              if (selectedConversation.contact?.phoneRaw && /^55\d{10,11}$/.test(selectedConversation.contact.phoneRaw)) {
                phoneExtracted = selectedConversation.contact.phoneRaw;
              }
              
              // 2. Tentar de external_conversation_id (só se for @s.whatsapp.net)
              if (!phoneExtracted && convId.includes('@s.whatsapp.net')) {
                const extracted = convId.replace('@s.whatsapp.net', '').replace('whatsapp-', '');
                if (/^55\d{10,11}$/.test(extracted)) {
                  phoneExtracted = extracted;
                }
              }
              
              // 3. Tentar de channel_metadata.whatsapp_contact_id
              if (!phoneExtracted) {
                const waContactId = selectedConversation.conversation?.channel_metadata?.whatsapp_contact_id || '';
                if (waContactId.includes('@s.whatsapp.net')) {
                  const extracted = waContactId.replace('@s.whatsapp.net', '');
                  if (/^55\d{10,11}$/.test(extracted)) {
                    phoneExtracted = extracted;
                  }
                }
              }
              
              console.log('[ChatInbox] 📱 Contact criado inline, phone:', phoneExtracted || 'NÃO ENCONTRADO');
              
              return {
                id: convId,
                name: selectedConversation.name,
                phone: phoneExtracted,
                phoneRaw: phoneExtracted,
                profilePicUrl: selectedConversation.avatar,
                source: 'evolution' as const,
                unreadCount: selectedConversation.unreadCount,
                isOnline: selectedConversation.isOnline || false,
                createdAt: new Date(),
                updatedAt: new Date()
              };
            })()}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selecione uma conversa à esquerda
          </div>
        )}
      </div>

      {/* Right column: details - LARGURA FIXA */}
      <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hidden lg:flex flex-col flex-shrink-0">
        {selectedConversation ? (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Detalhes</h3>
              {selectedConversation.reservationCode && (
                <div className="mb-2">
                  <Badge variant="outline">{selectedConversation.reservationCode}</Badge>
                </div>
              )}
              {selectedConversation.propertyName && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Propriedade</p>
                  <p className="text-sm font-medium">{selectedConversation.propertyName}</p>
                </div>
              )}
              {selectedConversation.checkInDate && selectedConversation.checkOutDate && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="text-sm font-medium">
                    {(parseDateLocal(selectedConversation.checkInDate) ?? new Date(selectedConversation.checkInDate)).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Check-out</p>
                  <p className="text-sm font-medium">
                    {(parseDateLocal(selectedConversation.checkOutDate) ?? new Date(selectedConversation.checkOutDate)).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
              {(() => {
                // ✅ CORRIGIDO v1.0.104.013: Verificar se é broadcast/grupo antes de mostrar telefone
                // @lid = Link ID interno do WhatsApp, NÃO é telefone!
                const contact = selectedConversation.contact;
                const externalId = contact?.id || selectedConversation.id || '';
                
                // Se é broadcast (@lid) ou grupo (@g.us), não mostrar telefone
                if (externalId.includes('@lid') || externalId.includes('@g.us') || 
                    contact?.isBroadcast || contact?.isGroup) {
                  return null;
                }
                
                const validPhone = contact 
                  ? getPhoneFromContact(contact)
                  : extractPhoneFromId(selectedConversation.phone);
                
                return validPhone ? (
                  <div className="mb-2">
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="text-sm font-medium">{formatPhoneForDisplay(validPhone)}</p>
                  </div>
                ) : null;
              })()}
              {selectedConversation.email && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm font-medium">{selectedConversation.email}</p>
                </div>
              )}
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-2"
                onClick={() => setShowQuickActions(true)}
              >
                Ações Rápidas
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowBlockModal(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Bloqueio
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-gray-600">Detalhes</div>
        )}
      </div>

      {/* Modals */}
      <QuickActionsModal
        open={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onSelectAction={(action) => {
          setShowQuickActions(false);
          if (action === 'quote') {
            setShowQuotation(true);
          } else if (action === 'reservation') {
            setShowCreateReservation(true);
          }
        }}
      />

      {showQuotation && selectedConversation && selectedConversation.propertyId && (
        <QuotationModal
          isOpen={showQuotation}
          onClose={() => setShowQuotation(false)}
          property={{
            id: selectedConversation.propertyId,
            name: selectedConversation.propertyName || 'Propriedade',
            location: '',
            type: 'house',
            bedrooms: 0,
            bathrooms: 0,
            maxGuests: 0,
            pricePerNight: 0,
            images: [],
            amenities: [],
            status: 'active'
          }}
            startDate={selectedConversation.checkInDate ? (parseDateLocal(selectedConversation.checkInDate) ?? new Date(selectedConversation.checkInDate)) : new Date()}
            endDate={selectedConversation.checkOutDate ? (parseDateLocal(selectedConversation.checkOutDate) ?? new Date(selectedConversation.checkOutDate)) : new Date()}
        />
      )}

      <CreateReservationWizard
        open={showCreateReservation}
        onClose={() => setShowCreateReservation(false)}
        onComplete={() => {
          setShowCreateReservation(false);
          loadData();
        }}
      />

      {showBlockModal && selectedConversation && selectedConversation.propertyId && (
        <BlockModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          propertyId={selectedConversation.propertyId}
          propertyName={selectedConversation.propertyName || ''}
          startDate={selectedConversation.checkInDate ? (parseDateLocal(selectedConversation.checkInDate) ?? new Date(selectedConversation.checkInDate)) : new Date()}
          endDate={selectedConversation.checkOutDate ? (parseDateLocal(selectedConversation.checkOutDate) ?? new Date(selectedConversation.checkOutDate)) : new Date()}
          onSave={() => {
            setShowBlockModal(false);
            loadData();
          }}
        />
      )}

      <TemplateManagerModal
        open={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        templates={[]}
        onSaveTemplate={() => {}}
        onDeleteTemplate={() => {}}
      />

      <ChatTagsModal
        open={showTagsManager}
        onClose={() => setShowTagsManager(false)}
        tags={tags.map(t => ({ id: t.id, name: t.name, color: t.color }))}
        onSaveTag={async (tag) => {
          if (!organizationId) return;
          await chatApi.tags.create({ ...tag, organization_id: organizationId });
          await loadData();
        }}
        onDeleteTag={async (tagId) => {
          if (!organizationId) return;
          await chatApi.tags.delete(tagId, organizationId);
          await loadData();
        }}
      />
    </div>
  );
}

export default ChatInbox;
