/**
 * RENDIZY - useChatService Hook
 * 
 * Hook React para integração com o ChatService V2
 * Provê interface reativa para o frontend
 * 
 * @version 2.0.0
 * @date 2026-01-22
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  ChatService,
  getChatService,
  ChatConversation,
  ChatMessage,
  ChannelType,
  ConversationStatus,
  SendMessagePayload,
  SendMessageResult,
  ChatStats,
} from '../../services/chat';

interface UseChatServiceOptions {
  autoStartRealtime?: boolean;
  pollingInterval?: number; // ms, 0 para desabilitar
}

interface UseChatServiceReturn {
  // Estado
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Dados
  conversations: ChatConversation[];
  selectedConversation: ChatConversation | null;
  messages: ChatMessage[];
  stats: ChatStats | null;
  
  // Status de conexão por canal
  connectionStatus: Record<ChannelType, {
    connected: boolean;
    status: string;
  }>;
  
  // Ações
  loadConversations: (options?: { channel?: ChannelType; status?: ConversationStatus }) => Promise<void>;
  loadMessages: (conversationId: string, channelType: ChannelType) => Promise<void>;
  selectConversation: (conversation: ChatConversation | null) => void;
  sendMessage: (payload: Omit<SendMessagePayload, 'channelType'>) => Promise<SendMessageResult>;
  markAsRead: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  refreshConnectionStatus: () => Promise<void>;
  refreshStats: () => Promise<void>;
  
  // Canais disponíveis
  availableChannels: ChannelType[];
}

const DEFAULT_OPTIONS: UseChatServiceOptions = {
  autoStartRealtime: true,
  pollingInterval: 30000, // 30 segundos
};

export function useChatService(options: UseChatServiceOptions = {}): UseChatServiceReturn {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Refs
  const serviceRef = useRef<ChatService | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Estado
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<Record<ChannelType, {
    connected: boolean;
    status: string;
  }>>({} as any);
  
  const [availableChannels, setAvailableChannels] = useState<ChannelType[]>([]);
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  useEffect(() => {
    if (!organizationId) {
      setIsReady(false);
      return;
    }
    
    console.log('[useChatService] Inicializando para org:', organizationId);
    
    // Obter ou criar service
    const service = getChatService(organizationId);
    serviceRef.current = service;
    
    // Configurar canais disponíveis
    setAvailableChannels(service.getAvailableChannels());
    
    // Registrar callback de novas mensagens
    unsubscribeRef.current = service.onNewMessage((message, conversation) => {
      console.log('[useChatService] Nova mensagem recebida:', message.id);
      
      // Atualizar lista de conversas
      setConversations(prev => {
        const exists = prev.find(c => c.id === conversation.id);
        if (exists) {
          return prev.map(c => 
            c.id === conversation.id 
              ? { ...c, lastMessageAt: message.sentAt, lastMessagePreview: message.content, unreadCount: c.unreadCount + 1 }
              : c
          ).sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0));
        } else {
          return [conversation, ...prev];
        }
      });
      
      // Se a conversa está selecionada, adicionar mensagem
      setSelectedConversation(prev => {
        if (prev && prev.id === conversation.id) {
          setMessages(msgs => [...msgs, message]);
        }
        return prev;
      });
    });
    
    // Iniciar realtime se configurado
    if (mergedOptions.autoStartRealtime) {
      service.startRealtime();
    }
    
    // Carregar dados iniciais
    loadConversations();
    refreshConnectionStatus();
    
    setIsReady(true);
    
    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [organizationId]);
  
  // ============================================
  // POLLING
  // ============================================
  
  useEffect(() => {
    if (!isReady || !mergedOptions.pollingInterval) return;
    
    pollingRef.current = setInterval(() => {
      console.log('[useChatService] Polling conversas...');
      loadConversations({ silent: true });
    }, mergedOptions.pollingInterval);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isReady, mergedOptions.pollingInterval]);
  
  // ============================================
  // ACTIONS
  // ============================================
  
  const loadConversations = useCallback(async (options?: { 
    channel?: ChannelType; 
    status?: ConversationStatus;
    silent?: boolean;
  }) => {
    if (!serviceRef.current) return;
    
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      let result: ChatConversation[];
      
      if (options?.channel) {
        result = await serviceRef.current.getConversations(options.channel, {
          status: options.status,
        });
      } else {
        result = await serviceRef.current.getAllConversations({
          status: options?.status,
        });
      }
      
      setConversations(result);
    } catch (err) {
      console.error('[useChatService] Erro ao carregar conversas:', err);
      setError('Erro ao carregar conversas');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, []);
  
  const loadMessages = useCallback(async (conversationId: string, channelType: ChannelType) => {
    if (!serviceRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await serviceRef.current.getMessages(conversationId, channelType);
      setMessages(result);
      
      // Marcar como lido
      await serviceRef.current.markAsRead(conversationId, channelType);
      
      // Atualizar unreadCount na lista
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (err) {
      console.error('[useChatService] Erro ao carregar mensagens:', err);
      setError('Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const selectConversation = useCallback((conversation: ChatConversation | null) => {
    setSelectedConversation(conversation);
    setMessages([]);
    
    if (conversation) {
      loadMessages(conversation.id, conversation.channelType);
    }
  }, [loadMessages]);
  
  const sendMessage = useCallback(async (payload: Omit<SendMessagePayload, 'channelType'>): Promise<SendMessageResult> => {
    if (!serviceRef.current || !selectedConversation) {
      return { success: false, error: 'Nenhuma conversa selecionada' };
    }
    
    const fullPayload: SendMessagePayload = {
      ...payload,
      channelType: selectedConversation.channelType,
      conversationId: selectedConversation.id,
    };
    
    const result = await serviceRef.current.sendMessage(fullPayload);
    
    if (result.success && result.message) {
      // Adicionar mensagem à lista localmente
      setMessages(prev => [...prev, result.message!]);
      
      // Atualizar conversa
      setConversations(prev => 
        prev.map(c => 
          c.id === selectedConversation.id 
            ? { 
                ...c, 
                lastMessageAt: result.message!.sentAt, 
                lastMessagePreview: result.message!.content 
              }
            : c
        ).sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0))
      );
    }
    
    return result;
  }, [selectedConversation]);
  
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!serviceRef.current || !selectedConversation) return;
    
    await serviceRef.current.markAsRead(conversationId, selectedConversation.channelType);
    
    setConversations(prev => 
      prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c)
    );
  }, [selectedConversation]);
  
  const archiveConversation = useCallback(async (conversationId: string) => {
    if (!serviceRef.current || !selectedConversation) return;
    
    const success = await serviceRef.current.archiveConversation(
      conversationId, 
      selectedConversation.channelType
    );
    
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    }
  }, [selectedConversation]);
  
  const refreshConnectionStatus = useCallback(async () => {
    if (!serviceRef.current) return;
    
    try {
      const status = await serviceRef.current.getConnectionStatus();
      setConnectionStatus(status);
    } catch (err) {
      console.error('[useChatService] Erro ao verificar status:', err);
    }
  }, []);
  
  const refreshStats = useCallback(async () => {
    if (!serviceRef.current) return;
    
    try {
      const newStats = await serviceRef.current.getStats();
      setStats(newStats);
    } catch (err) {
      console.error('[useChatService] Erro ao buscar stats:', err);
    }
  }, []);
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    // Estado
    isReady,
    isLoading,
    error,
    
    // Dados
    conversations,
    selectedConversation,
    messages,
    stats,
    connectionStatus,
    
    // Ações
    loadConversations,
    loadMessages,
    selectConversation,
    sendMessage,
    markAsRead,
    archiveConversation,
    refreshConnectionStatus,
    refreshStats,
    
    // Canais
    availableChannels,
  };
}
