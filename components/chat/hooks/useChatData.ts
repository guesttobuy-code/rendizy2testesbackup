/**
 * useChatData Hook
 * 
 * Gerencia carregamento e estado de conversas do chat
 * 
 * Projeto Fluência - Fase 3: Modularização Chat
 * Extraído de ChatInbox.tsx para reduzir complexidade
 * 
 * @version v1.0.104.020
 * @date 2026-01-22
 * 
 * CHANGELOG v1.0.104.020:
 * - FIX: unreadCount agora usa conv.unread_count real do banco (antes era fixo 0 ou 1)
 * - FIX: Conversas com unread_count > 0 são marcadas como 'urgent' automaticamente
 * - DEBUG: Adicionado logs no polling para troubleshooting
 * 
 * CHANGELOG v1.0.104.019:
 * - ADICIONADO: Polling automático a cada 10 segundos para atualizar conversas
 * - ADICIONADO: useEffect para iniciar polling quando organizationId muda
 * - FIX: Tela de chat agora atualiza em tempo real
 * 
 * CHANGELOG v1.0.104.018:
 * - Adicionado sync inicial dos chats do WhatsApp (UMA VEZ ao carregar)
 * - Usa ref para garantir que sync só acontece uma vez
 * - Não faz polling periódico (evita flicker)
 * - Webhooks continuam responsáveis por mensagens novas em tempo real
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
  
  // ✅ v1.0.104.018: Ref para garantir sync inicial UMA ÚNICA VEZ
  const hasInitialSyncDone = useRef(false);

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
    // ✅ FIX v1.0.104.020: Se tem unread_count > 0, também é urgente
    else if (conv.unread_count && conv.unread_count > 0) category = 'urgent';

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
      // ✅ FIX v1.0.104.020: Usar unread_count real do banco
      unreadCount: conv.unread_count || 0,
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
      const service = getEvolutionContactsService();
      
      // ✅ v1.0.104.018: Sync inicial dos chats do WhatsApp (UMA VEZ)
      // Isso importa TODOS os chats existentes do WhatsApp para o sistema
      if (!hasInitialSyncDone.current && organizationId) {
        hasInitialSyncDone.current = true;
        console.log('🔄 [useChatData] Iniciando sync inicial dos chats do WhatsApp...');
        try {
          const stats = await service.syncContactsAndChats(organizationId);
          console.log('✅ [useChatData] Sync inicial concluído:', stats);
        } catch (syncError) {
          console.warn('⚠️ [useChatData] Erro no sync inicial (não crítico):', syncError);
        }
      }

      // Carregar conversas do backend
      if (organizationId) {
        const convResult = await chatApi.conversations.list(organizationId);
        if (convResult.success && convResult.data) {
          const unified = convResult.data.map(conv => convertToUnified(conv));
          setConversations(unified);
        }
      }

      // Carregar contatos WhatsApp (agora do SQL após sync)
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

  // ✅ v1.0.104.020: Polling silencioso para atualizar conversas (não mostra loading)
  const refreshConversations = useCallback(async () => {
    if (!organizationId) return;
    
    console.log('🔄 [useChatData] Polling refresh iniciado...');
    
    try {
      const convResult = await chatApi.conversations.list(organizationId);
      if (convResult.success && convResult.data) {
        const unified = convResult.data.map(conv => convertToUnified(conv));
        // DEBUG: Mostrar primeira conversa para validar dados
        if (unified.length > 0) {
          console.log('✅ [useChatData] Refresh OK -', unified.length, 'conversas. Top:', {
            name: unified[0].name,
            lastMessage: unified[0].lastMessage?.substring(0, 30),
            unreadCount: unified[0].unreadCount
          });
        }
        setConversations(unified);
      } else {
        console.warn('⚠️ [useChatData] Refresh falhou:', convResult.error);
      }
    } catch (error) {
      console.warn('[useChatData] Erro no refresh silencioso:', error);
    }
  }, [organizationId]);

  // ✅ v1.0.104.019: Auto-refresh a cada 10 segundos
  useEffect(() => {
    if (!organizationId) return;

    // Polling a cada 10 segundos
    const intervalId = setInterval(() => {
      refreshConversations();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [organizationId, refreshConversations]);
  
  return {
    isLoading,
    conversations,
    contacts,
    tags,
    loadData,
    refreshConversations,
    setConversations,
    setContacts,
    setTags
  };
}
