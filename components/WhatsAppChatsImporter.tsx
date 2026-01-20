/**
 * Componente para importar conversas do WhatsApp Evolution API
 * Busca e exibe conversas do WhatsApp na aba Chat
 * ✅ v1.0.103.950 - Carregamento automático invisível ao entrar na página de chat
 */

import React, { useEffect } from 'react';
import { formatPhoneDisplay, extractPhoneNumber } from '../utils/whatsappChatApi';
import { fetchWhatsAppChats } from '../utils/whatsappChatApi';

interface WhatsAppChat {
  id?: string | null; // ✅ CORREÇÃO: Evolution API pode retornar null
  remoteJid?: string; // ✅ CORREÇÃO: Evolution API usa remoteJid quando id é null
  name?: string;
  pushName?: string; // ✅ CORREÇÃO: Evolution API usa pushName para nome do contato
  profilePictureUrl?: string;
  profilePicUrl?: string; // ✅ CORREÇÃO: Evolution API pode usar profilePicUrl
  lastMessageTimestamp?: number;
  updatedAt?: string; // ✅ CORREÇÃO: Evolution API pode usar updatedAt
  unreadCount?: number;
  lastMessage?: {
    fromMe?: boolean;
    message?: string;
    conversation?: string; // ✅ CORREÇÃO: Evolution API pode usar conversation
  };
}

interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: any;
  messageTimestamp: number;
  pushName?: string;
  status?: string;
}

interface WhatsAppChatsImporterProps {
  onChatsLoaded?: (chats: any[]) => void;
  onMessagesLoaded?: (chatId: string, messages: any[]) => void;
}

export function WhatsAppChatsImporter({ onChatsLoaded }: WhatsAppChatsImporterProps) {
  /**
   * Buscar conversas do WhatsApp automaticamente
   * Função invisível - carrega conversas ao entrar na página de chat
   */
  const loadChatsAutomatically = async () => {
    try {
      console.log('🔄 Carregando conversas do WhatsApp automaticamente...');
      
      const whatsappChats = await fetchWhatsAppChats();
      
      console.log('✅ Conversas carregadas:', whatsappChats.length);
      
      if (whatsappChats.length === 0) {
        // Silenciosamente - sem toast, apenas log
        console.log('ℹ️ Nenhuma conversa encontrada no WhatsApp');
        return;
      }
      
      // Converter conversas do WhatsApp para o formato do sistema
      const convertedChats = whatsappChats
        .filter((chat) => {
          // ✅ CORREÇÃO: Filtrar conversas inválidas ANTES de processar
          if (!chat) {
            console.warn('⚠️ Conversa inválida (null/undefined):', chat);
            return false;
          }
          // ✅ CORREÇÃO: Evolution API pode retornar id: null e usar remoteJid
          const chatId = chat.id || (chat as any).remoteJid;
          if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
            console.warn('⚠️ Conversa inválida (sem ID válido):', chat);
            return false;
          }
          return true;
        })
        .map((chat, index) => {
          // ✅ CORREÇÃO: Usar remoteJid quando id for null
          const chatId = chat.id || (chat as any).remoteJid || '';
          try {
            const phoneNumber = extractPhoneNumber(chatId);
            const displayPhone = formatPhoneDisplay(chatId);
            
            // ✅ CORREÇÃO: Usar pushName ou name quando disponível
            const displayName = (chat as any).pushName || chat.name || displayPhone || 'Contato sem nome';
            
            return {
              id: `wa-${chatId}`,
              guest_name: displayName,
              guest_email: '',
              guest_phone: displayPhone || 'Número desconhecido',
          reservation_code: '',
          property_name: '',
          property_id: '',
          channel: 'whatsapp' as const,
          status: chat.unreadCount && chat.unreadCount > 0 ? 'unread' as const : 'read' as const,
          // ✅ MELHORIA: Categorizar como 'urgent' se tem mensagens não lidas
          category: (chat.unreadCount && chat.unreadCount > 0) ? 'urgent' as const : 'normal' as const,
          conversation_type: 'lead' as const,
          // ✅ CORREÇÃO: Extrair texto da mensagem corretamente
          // Evolution API pode retornar lastMessage como objeto complexo
          last_message: (() => {
            const lastMsg = chat.lastMessage || (chat as any).lastMessage;
            if (!lastMsg) return '';
            
            // Se for string, retornar diretamente
            if (typeof lastMsg === 'string') return lastMsg;
            
            // Se for objeto, extrair mensagem
            if (typeof lastMsg === 'object') {
              return lastMsg.message || 
                     lastMsg.conversation || 
                     lastMsg.text || 
                     (lastMsg.extendedTextMessage?.text) ||
                     '';
            }
            
            return '';
          })(),
          last_message_at: chat.lastMessageTimestamp 
            ? new Date(chat.lastMessageTimestamp * 1000)
            : ((chat as any).updatedAt ? new Date((chat as any).updatedAt) : new Date()),
          checkin_date: new Date(),
          checkout_date: new Date(),
          messages: [],
          order: index,
          isPinned: false,
          tags: [],
          whatsapp_chat_id: chatId, // ID original do WhatsApp (pode ser id ou remoteJid)
          profile_picture_url: chat.profilePictureUrl || (chat as any).profilePicUrl,
              unread_count: chat.unreadCount || 0,
            };
          } catch (error) {
            console.error('❌ Erro ao processar conversa:', chat, error);
            // Retornar conversa com dados mínimos em caso de erro
            const chatId = chat.id || (chat as any).remoteJid || 'unknown';
            const displayName = (chat as any).pushName || chat.name || 'Contato sem nome';
            return {
              id: `wa-${chatId}`,
              guest_name: displayName,
              guest_email: '',
              guest_phone: 'Número desconhecido',
              reservation_code: '',
              property_name: '',
              property_id: '',
              channel: 'whatsapp' as const,
              status: 'read' as const,
              category: 'normal' as const, // Fallback: normal em caso de erro
              conversation_type: 'lead' as const,
              // ✅ CORREÇÃO: Extrair texto da mensagem corretamente
              last_message: (() => {
                const lastMsg = chat.lastMessage || (chat as any).lastMessage;
                if (!lastMsg) return '';
                
                if (typeof lastMsg === 'string') return lastMsg;
                if (typeof lastMsg === 'object') {
                  return lastMsg.message || 
                         lastMsg.conversation || 
                         lastMsg.text || 
                         (lastMsg.extendedTextMessage?.text) ||
                         '';
                }
                return '';
              })(),
              last_message_at: chat.lastMessageTimestamp 
                ? new Date(chat.lastMessageTimestamp * 1000)
                : new Date(),
              checkin_date: new Date(),
              checkout_date: new Date(),
              messages: [],
              order: index,
              isPinned: false,
              tags: [],
              whatsapp_chat_id: chatId,
              profile_picture_url: chat.profilePictureUrl || (chat as any).profilePicUrl,
              unread_count: chat.unreadCount || 0,
            };
          }
        })
        .filter((chat): chat is NonNullable<typeof chat> => chat !== null);
      
      // Notificar componente pai silenciosamente
      if (onChatsLoaded) {
        onChatsLoaded(convertedChats);
        console.log(`✅ ${convertedChats.length} conversas carregadas e exibidas automaticamente`);
      }
      
    } catch (error: any) {
      // Erro silencioso - apenas log no console
      console.error('❌ Erro ao carregar conversas do WhatsApp:', error);
      console.warn('⚠️ WhatsApp não disponível no momento - continuação silenciosa');
    }
  };

  /**
   * Carregar conversas automaticamente ao montar o componente
   * ✅ Carregamento automático e invisível ao entrar na página de chat
   */
  useEffect(() => {
    // Carregar imediatamente ao entrar na página de chat
    loadChatsAutomatically();
    
    // Opcional: Recarregar periodicamente a cada 5 minutos
    const interval = setInterval(() => {
      loadChatsAutomatically();
    }, 5 * 60 * 1000); // 5 minutos
    
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Componente invisível - não renderiza nada na UI
  // Apenas carrega conversas automaticamente em background
  return null;
}