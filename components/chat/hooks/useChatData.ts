/**
 * useChatData Hook
 * 
 * Gerencia carregamento e estado de conversas do chat
 * 
 * Projeto Fluência - Fase 3: Modularização Chat
 * Extraído de ChatInbox.tsx para reduzir complexidade
 */

import { useState } from 'react';
import { chatApi, Conversation } from '../../../utils/chatApi';
import { getEvolutionContactsService, LocalContact } from '../../../utils/services/evolutionContactsService';

export interface UnifiedConversation {
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
  conversationType?: 'guest' | 'lead';
  conversation?: Conversation;
  contact?: LocalContact;
}

export function useChatData(organizationId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Helper para extrair texto de lastMessage
  const extractMessageText = (lastMessage: any): string => {
    if (!lastMessage) return '';
    if (typeof lastMessage === 'string') return lastMessage;
    return (lastMessage as any)?.message?.conversation 
      || (lastMessage as any)?.message?.extendedTextMessage?.text
      || (lastMessage as any)?.conversation
      || 'Mensagem de mídia';
  };

  // Converter conversa do backend para formato unificado
  const convertToUnified = (conv: Conversation): UnifiedConversation => {
    let category: 'pinned' | 'urgent' | 'normal' | 'resolved' = 'normal';
    if (conv.isPinned) category = 'pinned';
    else if (conv.status === 'resolved') category = 'resolved';
    else if (conv.status === 'unread' || conv.category === 'urgent') category = 'urgent';

    return {
      id: conv.id,
      name: conv.guest_name,
      phone: conv.guest_phone,
      email: conv.guest_email,
      channel: conv.channel === 'whatsapp' ? 'whatsapp' : 
               conv.channel === 'sms' ? 'sms' : 
               conv.channel === 'email' ? 'email' : 'system',
      status: conv.status,
      category,
      lastMessage: extractMessageText(conv.last_message),
      lastMessageAt: conv.last_message_at ? new Date(conv.last_message_at) : undefined,
      unreadCount: conv.status === 'unread' ? 1 : 0,
      reservationCode: conv.reservation_code,
      propertyName: conv.property_name,
      propertyId: conv.property_id,
      checkInDate: conv.checkin_date,
      checkOutDate: conv.checkout_date,
      tags: conv.tags,
      isPinned: conv.isPinned,
      conversationType: conv.conversation_type,
      conversation: conv
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carregar conversas do backend
      if (organizationId) {
        const convResult = await chatApi.conversations.list(organizationId);
        if (convResult.success && convResult.data) {
          const unified = convResult.data.map(conv => convertToUnified(conv));
          setConversations(unified);
        }
      }

      // Carregar contatos WhatsApp
      const service = getEvolutionContactsService();
      const storedContacts = await service.getStoredContacts(organizationId || undefined);
      setContacts(storedContacts);

      // Carregar tags
      if (organizationId) {
        const tagsResult = await chatApi.tags.list(organizationId);
        if (tagsResult.success && tagsResult.data) {
          setTags(tagsResult.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    conversations,
    contacts,
    tags,
    loadData,
    setConversations,
    setContacts,
    setTags
  };
}
