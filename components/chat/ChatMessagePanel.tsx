/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         CHAT MESSAGE PANEL                                 ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  ⚠️  WAHA_INTEGRATION - Mudanças afetam carregamento de mensagens         ║
 * ║  📱 WHATSAPP_JID - Lógica de identificação de conversas                   ║
 * ║  🚀 REALTIME - WebSocket para mensagens em tempo real                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente ISOLADO para exibir mensagens de UMA conversa.
 * Pode ser usado standalone (ex: dentro de um Card do CRM).
 * 
 * @version 3.1.0
 * @date 2026-01-25
 * @see /docs/adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md
 * @see /docs/REALTIME-CHAT-IMPLEMENTATION-GUIDE.md
 * @see /docs/ROADMAP-CHAT.md
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ FLUXO DE DADOS:                                                 │
 * │ 1. Recebe conversationId (JID ou UUID)                          │
 * │ 2. Detecta tipo: WhatsApp JID (@c.us) ou UUID (banco)           │
 * │ 3. JID → fetchWhatsAppMessages() → WAHA API                     │
 * │ 4. UUID → fetchUnifiedMessages() → Supabase                     │
 * │ 5. Converte para ChatMessage[] → setMessages() → render         │
 * │ 6. 🚀 WebSocket → Recebe mensagens em tempo real                │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * CHANGELOG:
 * - v3.1.0 (2026-01-25): 🎯 PHASE 2 FEATURES!
 *   - TypingIndicator (digitando...)
 *   - QuickReplies (respostas rápidas)
 *   - MessageQueue (offline support)
 *   - Send Seen (marcar como lido)
 *   - Offline status bar
 * - v3.0.0 (2026-01-18): 🚀 REALTIME via WebSocket WAHA!
 * - v2.0.9 (2026-01-24): SEMPRE buscar do WAHA para JIDs WhatsApp
 * - v2.0.8 (2026-01-24): Suporte a Base64 thumbnails do WAHA CORE
 * - v2.0.7 (2026-01-24): Detecção robusta de tipo de mídia
 * - v2.0.6 (2026-01-24): Extração robusta de JID (evita [object Object])
 * - v2.0.0 (2026-01-24): Refatoração completa com suporte a mídia
 * 
 * USO:
 * ```tsx
 * <ChatMessagePanel 
 *   conversationId="5521999999999@c.us"  // JID WhatsApp
 *   contactName="João Silva"
 *   contactPhone="+55 21 99999-9999"
 *   compact={true}
 * />
 * ```
 * 
 * DEPENDÊNCIAS CRÍTICAS:
 * - whatsappChatApi.ts (fetchWhatsAppMessages, sendWhatsAppMessage)
 * - chatUnifiedApi.ts (fetchUnifiedMessages - fallback para UUID)
 * - useWahaWebSocket.ts (WebSocket para tempo real)
 * - TypingIndicator.tsx (indicador "digitando...")
 * - QuickReplies.tsx (respostas rápidas)
 * - useMessageQueue.ts (fila offline)
 * - useSendSeen.ts (marcar como lido)
 * - WAHA API em http://76.13.82.60:3001
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Loader2, 
  Send,
  Check,
  CheckCheck,
  AlertCircle,
  Phone,
  Minimize2,
  Maximize2,
  Paperclip,
  RefreshCw,
  Play,
  FileText,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
// ScrollArea removido - usando overflow-y-auto nativo para rolagem independente
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { 
  fetchWhatsAppMessages, 
  sendWhatsAppMessage,
  extractMessageText
} from '../../utils/whatsappChatApi';
import { 
  fetchMessages as fetchUnifiedMessages, 
  sendMessage as sendUnifiedMessage,
  syncConversationHistory,
  type MediaType 
} from '../../utils/chatUnifiedApi';
import { getSupabaseClient } from '../../utils/supabase/client';
// ✅ v2.5.0: Também importar hook unificado para suporte multi-provider
import { useChatPolling } from '../../hooks/useChatPolling';
// ✅ v3.1.0: Novos componentes Phase 2
import { TypingIndicator } from './TypingIndicator';
import { QuickReplies, QuickReplyTrigger, DEFAULT_QUICK_REPLIES, replaceVariables } from './QuickReplies';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { useAutoMarkAsRead } from '../../hooks/useSendSeen';
import { useMessageQueue } from '../../hooks/useMessageQueue';

// ============================================
// TYPES
// ============================================

export interface ChatMessagePanelProps {
  /** ID da conversa (JID do WhatsApp ou external_conversation_id) */
  conversationId: string;
  
  /** Nome do contato para exibir no header */
  contactName?: string;
  
  /** Telefone do contato */
  contactPhone?: string;
  
  /** URL do avatar */
  contactAvatar?: string;
  
  /** Modo compacto (sem header, menor altura) */
  compact?: boolean;
  
  /** Altura máxima do componente */
  maxHeight?: string;
  
  /** Callback quando enviar mensagem */
  onMessageSent?: (message: ChatMessage) => void;
  
  /** Callback para fechar/minimizar */
  onClose?: () => void;
  
  /** Mostrar header com info do contato */
  showHeader?: boolean;
  
  /** Classe CSS adicional */
  className?: string;
}

interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: Date;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  mediaType?: MediaType;
  mediaUrl?: string;
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

function getInitials(name: string): string {
  if (!name || name === 'Desconhecido') return '??';
  if (name.startsWith('+')) return name.substring(1, 3);
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getOrganizationIdFromCache(): string | null {
  try {
    const userJson = localStorage.getItem('rendizy-user');
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    return user.organizationId || null;
  } catch {
    return null;
  }
}

// ============================================
// COMPONENT
// ============================================

export function ChatMessagePanel({
  conversationId,
  contactName = 'Contato',
  contactPhone,
  contactAvatar,
  maxHeight,
  onMessageSent,
  onClose,
  showHeader = true,
  className = ''
}: ChatMessagePanelProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [resolvedConversationId, setResolvedConversationId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; type: MediaType; preview: string } | null>(null);
  // ✅ v3.1.0: Estado para Quick Replies
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // 🚀 POLLING - REALTIME MESSAGES (MULTI-PROVIDER)
  // ============================================
  
  // ✅ v2.5.0: Detectar provider pelo formato do JID
  const detectedProvider = (() => {
    if (!conversationId) return undefined;
    const safe = typeof conversationId === 'string' 
      ? conversationId 
      : (conversationId as any)?.id || String(conversationId);
    // @s.whatsapp.net = Evolution, @c.us ou @lid = WAHA
    if (safe.includes('@s.whatsapp.net')) return 'evolution' as const;
    if (safe.includes('@c.us') || safe.includes('@lid')) return 'waha' as const;
    return undefined; // Auto-detect
  })();
  
  // Extrair chatId normalizado para polling
  const normalizedChatId = (() => {
    if (!conversationId) return '';
    const safe = typeof conversationId === 'string' 
      ? conversationId 
      : (conversationId as any)?.id || String(conversationId);
    // Se já tem formato JID, manter
    if (safe.includes('@')) return safe;
    // Normalizar para JID baseado no provider detectado ou WAHA como default
    const phone = safe.replace(/\D/g, '');
    if (phone.length >= 10) {
      // Se tiver Evolution ativo, usar @s.whatsapp.net
      if (detectedProvider === 'evolution') return `${phone}@s.whatsapp.net`;
      return `${phone}@c.us`;
    }
    return '';
  })();

  // 🔄 Hook de Polling UNIFICADO (a cada 2 segundos) - suporta Evolution + WAHA
  const { messages: polledMessages, isPolling } = useChatPolling({
    chatId: normalizedChatId,
    provider: detectedProvider,
    enabled: !isLoading && !!normalizedChatId && normalizedChatId.length > 10,
    intervalMs: 2000, // 2 segundos - mais responsivo
  });

  // 📬 v2.6.0: Sincronizar mensagens do polling com estado local
  // Mantém mensagens locais (optimistic updates) e adiciona as do polling
  useEffect(() => {
    if (!polledMessages || polledMessages.length === 0) return;

    console.log(`[ChatPanel-Poll] 📬 Sincronizando ${polledMessages.length} mensagens do polling`);

    setMessages(prev => {
      // IDs das mensagens temp (optimistic updates)
      const tempMessages = prev.filter(m => m.id.startsWith('temp-'));
      
      // Converter mensagens do polling para ChatMessage
      const converted: ChatMessage[] = polledMessages.map(polledMsg => ({
        id: polledMsg.id || `poll-${Date.now()}-${Math.random()}`,
        text: polledMsg.body || '',
        fromMe: polledMsg.fromMe ?? false,
        timestamp: new Date((polledMsg.timestamp || Date.now() / 1000) * 1000),
        status: polledMsg.fromMe ? 'delivered' : undefined,
        mediaType: polledMsg.mediaType as MediaType | undefined,
        mediaUrl: polledMsg.mediaUrl,
      }));

      // Substituir mensagens temp por reais quando encontrar match
      const finalMessages: ChatMessage[] = [];
      const usedTempIds = new Set<string>();

      for (const msg of converted) {
        // Verificar se essa mensagem substitui uma temp
        const matchingTemp = tempMessages.find(t => 
          !usedTempIds.has(t.id) &&
          t.text === msg.text &&
          t.fromMe === msg.fromMe
        );

        if (matchingTemp) {
          console.log('[ChatPanel-Poll] 🔄 Substituindo temp por real:', matchingTemp.id, '->', msg.id);
          usedTempIds.add(matchingTemp.id);
        }

        finalMessages.push(msg);
      }

      // Manter mensagens temp que ainda não foram confirmadas
      const pendingTemps = tempMessages.filter(t => !usedTempIds.has(t.id));
      for (const temp of pendingTemps) {
        // Só manter se não houver duplicata recente
        const hasDupe = finalMessages.some(m => 
          m.text === temp.text && 
          m.fromMe === temp.fromMe &&
          Math.abs(m.timestamp.getTime() - temp.timestamp.getTime()) < 30000
        );
        if (!hasDupe) {
          finalMessages.push(temp);
        }
      }

      // Ordenar por timestamp
      const sorted = finalMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Só atualizar se realmente mudou
      if (JSON.stringify(sorted.map(m => m.id)) === JSON.stringify(prev.map(m => m.id))) {
        return prev;
      }

      console.log('[ChatPanel-Poll] ✅ Lista atualizada:', sorted.length, 'mensagens');
      return sorted;
    });

    // Scroll para baixo quando receber novas
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [polledMessages]);

  // ============================================
  // ✅ v3.1.0: TYPING INDICATOR HOOK
  // ============================================
  
  const { 
    isContactTyping, 
    notifyTyping, 
    notifyStoppedTyping 
  } = useTypingIndicator({
    chatId: normalizedChatId,
    enableSendTyping: true,
  });
  
  // ============================================
  // ✅ v3.1.0: SEND SEEN (AUTO MARK AS READ)
  // ============================================
  
  useAutoMarkAsRead({
    chatId: normalizedChatId,
    isVisible: !isMinimized && !isLoading,
    autoMark: true,
  });
  
  // ============================================
  // ✅ v3.1.0: MESSAGE QUEUE (OFFLINE SUPPORT)
  // ============================================
  
  const sendMessageForQueue = useCallback(async (
    chatId: string,
    text: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await sendWhatsAppMessage(chatId, text);
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);
  
  const { 
    pendingMessages: queuedMessages, 
    isProcessing: isQueueProcessing,
    isOnline,
    process: processQueue 
  } = useMessageQueue({
    sendMessage: sendMessageForQueue,
    chatId: normalizedChatId,
    autoProcess: true,
  });

  // ============================================
  // LOAD MESSAGES
  // ============================================
  
  const loadMessages = useCallback(async () => {
    // ✅ v2.0.9: Log detalhado do início do carregamento
    console.log('[ChatMessagePanel] 🚀 loadMessages CHAMADO com conversationId:', conversationId, 'tipo:', typeof conversationId);
    
    // ✅ v2.0.6: Validação robusta do conversationId
    if (!conversationId) {
      console.warn('[ChatMessagePanel] ⚠️ conversationId está vazio');
      return;
    }
    
    // ✅ v2.0.6: Garantir que conversationId seja string
    const safeConversationId = typeof conversationId === 'string' 
      ? conversationId 
      : (conversationId as any)?.id || (conversationId as any)?._serialized || String(conversationId);
    
    // ✅ v2.0.6: Validar que temos um ID válido (não apenas "@c.us")
    if (!safeConversationId || safeConversationId === '@c.us' || safeConversationId.length < 5) {
      console.error('[ChatMessagePanel] ❌ conversationId inválido:', conversationId);
      return;
    }
    
    console.log('[ChatMessagePanel] 🔍 Iniciando carregamento para:', safeConversationId);
    
    setIsLoading(true);
    
    try {
      const supabase = getSupabaseClient();

      const resolveConversationId = async (): Promise<string | null> => {
        if (isUuid(safeConversationId)) return safeConversationId;

        const candidates: string[] = [];
        const clean = safeConversationId.includes('@') ? safeConversationId : safeConversationId.replace(/\D/g, '');
        if (clean && clean.length >= 8) { // ✅ v2.0.6: Mínimo 8 dígitos para ser número válido
          candidates.push(clean);
          candidates.push(`${clean}@c.us`);
          candidates.push(`${clean}@s.whatsapp.net`);
        }
        if (safeConversationId.includes('@') && safeConversationId.length > 10) candidates.push(safeConversationId);

        const uniqueCandidates = Array.from(new Set(candidates)).filter(Boolean);
        if (uniqueCandidates.length === 0) return null;

        const orFilter = uniqueCandidates
          .map(id => `external_conversation_id.eq.${id}`)
          .join(',');

        const orgId = getOrganizationIdFromCache();
        const query = supabase
          .from('conversations')
          .select('id')
          .or(orFilter)
          .limit(1);

        if (orgId) query.eq('organization_id', orgId);

        const { data } = await query.maybeSingle() as { data: { id: string } | null };

        return data?.id || null;
      };

      const dbConversationId = await resolveConversationId();
      setResolvedConversationId(dbConversationId);

      // ✅ v2.0.9: SEMPRE usar WAHA direto quando for JID do WhatsApp
      // Não depender do banco para mensagens - banco pode estar desatualizado
      const isWhatsAppJid = safeConversationId.includes('@c.us') || 
                           safeConversationId.includes('@s.whatsapp.net') ||
                           safeConversationId.includes('@broadcast') ||
                           /^\d{10,}$/.test(safeConversationId.replace(/\D/g, ''));
      
      if (isWhatsAppJid) {
        // ✅ v2.0.9: JID/phone: usar WAHA/Evolution API direta SEMPRE
        const chatId = safeConversationId.includes('@')
          ? safeConversationId
          : `${safeConversationId.replace(/\D/g, '')}@c.us`;

        console.log('[ChatMessagePanel] 📥 Carregando mensagens WAHA para:', chatId);

        const rawMessages = await fetchWhatsAppMessages(chatId);
        
        // ✅ v2.0.6: Debug detalhado das mensagens raw
        console.log('[ChatMessagePanel] 📦 Raw messages count:', rawMessages?.length || 0);
        if (rawMessages?.length > 0) {
          console.log('[ChatMessagePanel] 📦 Primeira msg raw:', JSON.stringify(rawMessages[0], null, 2).substring(0, 500));
        }

        const converted: ChatMessage[] = rawMessages.map((msg: any) => {
          // ✅ v2.0.8: Extrair tipo de mídia do WAHA - versão robusta
          let mediaType: MediaType | undefined;
          let mediaUrl: string | undefined;
          
          // ✅ v2.0.8: Pegar mediaUrl já processado (Base64 do whatsappChatApi)
          // A API já converte para data:mimetype;base64,... que funciona no browser
          mediaUrl = msg.mediaUrl || 
                     msg.media?.url ||
                     msg.message?.imageMessage?.url || 
                     msg.message?.videoMessage?.url ||
                     msg.message?.audioMessage?.url ||
                     msg.message?.documentMessage?.url ||
                     undefined;
          
          // ✅ v2.0.8: Debug para ver se está chegando com mídia
          if (msg.hasMedia) {
            console.log('[ChatMessagePanel] 📦 Msg com mídia:', {
              id: (msg.key?.id || msg.id || '').substring(0, 30),
              hasMedia: msg.hasMedia,
              type: msg.type,
              mediaUrl: mediaUrl ? `${mediaUrl.substring(0, 50)}...` : 'NULL',
            });
          }
          
          // ✅ v2.0.7: Determinar tipo de mídia - múltiplas fontes
          const msgType = msg.type || '';
          const mimetype = msg.media?.mimetype || msg.message?.imageMessage?.mimetype || 
                           msg.message?.videoMessage?.mimetype || msg.message?.audioMessage?.mimetype || '';
          
          if (msg.hasMedia || msg.media || mediaUrl || msg.message?.imageMessage || msg.message?.videoMessage) {
            if (msgType === 'image' || mimetype.startsWith('image/') || msg.message?.imageMessage || 
                (mediaUrl && (mediaUrl.includes('image/') || mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)))) {
              mediaType = 'image';
            } else if (msgType === 'video' || mimetype.startsWith('video/') || msg.message?.videoMessage ||
                       (mediaUrl && (mediaUrl.includes('video/') || mediaUrl.match(/\.(mp4|webm|mov)/i)))) {
              mediaType = 'video';
            } else if (msgType === 'audio' || msgType === 'ptt' || mimetype.startsWith('audio/') || msg.message?.audioMessage) {
              mediaType = 'audio';
            } else if (msgType === 'document' || mimetype.startsWith('application/') || msg.message?.documentMessage) {
              mediaType = 'document';
            } else if (msg.hasMedia && mediaUrl) {
              // Fallback: tentar detectar pelo data URL
              if (mediaUrl.startsWith('data:image/')) mediaType = 'image';
              else if (mediaUrl.startsWith('data:video/')) mediaType = 'video';
              else if (mediaUrl.startsWith('data:audio/')) mediaType = 'audio';
              else mediaType = 'document';
            }
          }
          
          // Debug log para mídia
          if (msg.hasMedia || mediaUrl) {
            console.log('[ChatMessagePanel] 📎 Mídia detectada:', {
              id: msg.key?.id || msg.id,
              hasMedia: msg.hasMedia,
              type: msg.type,
              mediaType,
              mediaUrl,
              mimetype: msg.media?.mimetype
            });
          }
          
          return {
            id: msg.key?.id || msg.id || crypto.randomUUID(),
            text: extractMessageText(msg) || '',
            fromMe: msg.key?.fromMe || msg.fromMe || false,
            timestamp: new Date((msg.messageTimestamp || msg.timestamp || Date.now() / 1000) * 1000),
            status: (msg.key?.fromMe || msg.fromMe) ? 'delivered' : undefined,
            mediaType,
            mediaUrl,
          };
        });

        // Ordenar por timestamp
        converted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // ✅ v2.0.9: Log antes de setMessages
        console.log('[ChatMessagePanel] ✅ Definindo messages:', converted.length, 'mensagens');
        if (converted.length > 0) {
          console.log('[ChatMessagePanel] 📨 Última mensagem:', converted[converted.length - 1].text?.substring(0, 50));
        }
        
        setMessages(converted);
      } else if (dbConversationId) {
        // ✅ v2.0.9: Fallback para conversas UUID (não-WhatsApp) - usar banco
        console.log('[ChatMessagePanel] 📥 Carregando do banco para UUID:', dbConversationId);
        const unified = await fetchUnifiedMessages(dbConversationId);
        const converted: ChatMessage[] = unified.map(msg => {
          const normalizedStatus = msg.status === 'failed' ? 'error' : msg.status;
          return ({
          id: msg.id || crypto.randomUUID(),
          text: msg.content || '',
          fromMe: !!msg.fromMe,
          timestamp: msg.timestamp || new Date(),
          status: normalizedStatus || (msg.fromMe ? 'delivered' : undefined),
          mediaType: msg.mediaType && msg.mediaType !== 'text' ? msg.mediaType as MediaType : undefined,
          mediaUrl: msg.mediaUrl || undefined,
          });
        });
        console.log('[ChatMessagePanel] ✅ Mensagens do banco:', converted.length);
        setMessages(converted);
      } else {
        console.warn('[ChatMessagePanel] ⚠️ Não foi possível identificar fonte de mensagens para:', safeConversationId);
      }
      
      // Scroll para baixo
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('[ChatMessagePanel] ❌ Erro ao carregar mensagens:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // ============================================
  // SEND MESSAGE
  // ============================================
  
  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    
    // Adicionar mensagem otimisticamente
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      text,
      fromMe: true,
      timestamp: new Date(),
      status: 'pending'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll para baixo
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    
    try {
      // Preferir envio unificado quando temos conversa no banco
      const dbConversationId = resolvedConversationId || (isUuid(conversationId) ? conversationId : null);
      if (dbConversationId) {
        const result = await sendUnifiedMessage(dbConversationId, text);
        if (!result.success) throw new Error(result.error || 'Falha ao enviar');
      } else {
        // Extrair phone
        let phone = contactPhone || conversationId;
        if (phone.includes('@')) {
          phone = phone.split('@')[0];
        }
        await sendWhatsAppMessage(phone, text);
      }
      
      // Atualizar status
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' } : m
      ));
      
      onMessageSent?.(optimisticMessage);
      
    } catch (error) {
      console.error('[ChatMessagePanel] ❌ Erro ao enviar:', error);
      
      // Marcar como erro
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'error' } : m
      ));
      
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      notifyStoppedTyping();
      handleSend();
    }
  };
  
  // ✅ v3.1.0: Handler para input change (com typing notification)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (e.target.value.trim()) {
      notifyTyping();
    }
  };
  
  // ✅ v3.1.0: Handler para Quick Replies
  const handleQuickReplySelect = (reply: { text: string }) => {
    // Substituir variáveis comuns
    const variables = {
      propriedade: contactName || 'nossa propriedade',
      nome: contactName?.split(' ')[0] || 'visitante',
      endereco: '', // TODO: puxar do contexto da reserva
      wifi_nome: '', // TODO: puxar do contexto da propriedade
      wifi_senha: '', // TODO: puxar do contexto da propriedade
    };
    const text = replaceVariables(reply.text, variables);
    setInputText(text);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  // ============================================
  // SYNC HISTORY FROM WAHA
  // ============================================
  
  const handleSyncHistory = async () => {
    if (isSyncing || !conversationId) return;
    
    setIsSyncing(true);
    try {
      // Tentar determinar phone do chat
      let phone = contactPhone || conversationId;
      if (phone.includes('@')) {
        phone = phone.split('@')[0];
      }
      
      const result = await syncConversationHistory(phone, 50);
      
      if (result.success) {
        toast.success(`${result.syncedCount || 0} mensagens sincronizadas`);
        // Recarregar mensagens
        await loadMessages();
      } else {
        toast.error(result.error || 'Falha ao sincronizar');
      }
    } catch (error) {
      console.error('[ChatMessagePanel] ❌ Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar histórico');
    } finally {
      setIsSyncing(false);
    }
  };

  // ============================================
  // MEDIA HANDLING
  // ============================================
  
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Determinar tipo de mídia
    let mediaType: MediaType = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';
    
    // Criar preview para imagens/videos
    const preview = file.type.startsWith('image/') || file.type.startsWith('video/')
      ? URL.createObjectURL(file)
      : '';
    
    setSelectedMedia({ file, type: mediaType, preview });
    
    // Limpar input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleCancelMedia = () => {
    if (selectedMedia?.preview) {
      URL.revokeObjectURL(selectedMedia.preview);
    }
    setSelectedMedia(null);
  };
  
  const handleSendMedia = async () => {
    if (!selectedMedia || isSending) return;
    
    setIsSending(true);
    
    // Mensagem otimista
    const tempId = `temp-media-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      text: `[${selectedMedia.type === 'image' ? 'Imagem' : selectedMedia.type === 'video' ? 'Vídeo' : 'Arquivo'}]`,
      fromMe: true,
      timestamp: new Date(),
      status: 'pending',
      mediaType: selectedMedia.type,
      mediaUrl: selectedMedia.preview
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    
    try {
      // Converter arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remover prefixo data:xxx/xxx;base64,
          const base64Data = result.split(',')[1] || result;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedMedia.file);
      });
      
      // Preparar envio
      let phone = contactPhone || conversationId;
      if (phone.includes('@')) {
        phone = phone.split('@')[0];
      }
      
      // Import sendUnifiedMedia dinamicamente
      const { sendUnifiedMedia } = await import('../../utils/chatUnifiedApi');
      
      const result = await sendUnifiedMedia(phone, {
        type: selectedMedia.type,
        base64,
        filename: selectedMedia.file.name,
        mimetype: selectedMedia.file.type,
        caption: inputText.trim() || undefined
      });
      
      if (!result.success) throw new Error(result.error || 'Falha ao enviar mídia');
      
      // Atualizar status
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'sent' } : m
      ));
      
      setInputText('');
      handleCancelMedia();
      
    } catch (error) {
      console.error('[ChatMessagePanel] ❌ Erro ao enviar mídia:', error);
      
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, status: 'error' } : m
      ));
      
      // Verificar se é limitação do WAHA CORE
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('422') || errorMsg.includes('Plus version') || errorMsg.includes('WAHA')) {
        toast.error('Envio de mídia não disponível no WAHA gratuito. Upgrade para WAHA Plus necessário.', {
          duration: 5000,
        });
      } else {
        toast.error('Erro ao enviar mídia');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const dbConversationId = resolvedConversationId || (isUuid(conversationId) ? conversationId : null);
    if (!dbConversationId) return;
    
    const supabase = getSupabaseClient();
    
    const channel = supabase
      .channel(`chat-panel-${dbConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${dbConversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Aceitar mensagens de entrada (não enviadas por nós)
          // Também aceitar mensagens enviadas se não estiverem na lista (confirmação do servidor)
          if (newMsg) {
            const isFromMe = newMsg.direction === 'outbound' || newMsg.is_from_me;
            
            // Determinar tipo de mídia
            let msgMediaType: MediaType | undefined;
            if (newMsg.media_type && newMsg.media_type !== 'text') {
              msgMediaType = newMsg.media_type as MediaType;
            }
            
            const chatMessage: ChatMessage = {
              id: newMsg.id,
              text: newMsg.content || '',
              fromMe: isFromMe,
              timestamp: new Date(newMsg.sent_at || newMsg.created_at || Date.now()),
              status: isFromMe ? 'delivered' : undefined,
              mediaType: msgMediaType,
              mediaUrl: newMsg.media_url || undefined,
            };
            
            setMessages(prev => {
              // Se já existe, não duplicar
              if (prev.some(m => m.id === chatMessage.id)) return prev;
              // Se é mensagem nossa e já temos uma temp com mesmo texto, substituir
              if (isFromMe) {
                const tempIndex = prev.findIndex(m => 
                  m.id.startsWith('temp-') && 
                  m.text === chatMessage.text &&
                  m.status === 'pending'
                );
                if (tempIndex >= 0) {
                  const newMessages = [...prev];
                  newMessages[tempIndex] = chatMessage;
                  return newMessages;
                }
              }
              return [...prev, chatMessage];
            });
            
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, resolvedConversationId]);

  // ============================================
  // RENDER - Minimized
  // ============================================
  
  if (isMinimized) {
    return (
      <div 
        className={`flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm cursor-pointer ${className}`}
        onClick={() => setIsMinimized(false)}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={contactAvatar} />
          <AvatarFallback className="bg-green-100 text-green-700 text-xs">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate">{contactName}</span>
        <Maximize2 className="h-4 w-4 text-gray-400 ml-auto" />
      </div>
    );
  }

  // ============================================
  // RENDER - Full
  // ============================================
  
  return (
    <div 
      className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden',
        // Aplicar border/shadow apenas se não tiver border-0 na className
        !className.includes('border-0') && 'border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg',
        className
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {/* Header - FIXO NO TOPO */}
      {showHeader && (
        <div className="flex-shrink-0 flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Avatar className="h-8 w-8">
            <AvatarImage src={contactAvatar} />
            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {contactName}
            </h4>
            <div className="flex items-center gap-2">
              {contactPhone && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(contactPhone)}
                </p>
              )}
              {/* 🚀 v3.0.0: Indicador de tempo real (polling) */}
              <span className={`text-xs flex items-center gap-1 ${isPolling ? 'text-green-500' : 'text-gray-400'}`}>
                {isPolling ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span className="hidden sm:inline">auto-sync</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span className="hidden sm:inline">offline</span>
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleSyncHistory}
              disabled={isSyncing}
              title="Sincronizar histórico do WhatsApp"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={onClose}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Messages Area - ÁREA FLEXÍVEL QUE OCUPA O ESPAÇO DISPONÍVEL */}
      {/* ⚠️ Usando overflow-y-auto nativo em vez de ScrollArea para rolagem independente */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500">
              <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma mensagem</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-lg px-3 py-1.5 shadow-sm text-sm overflow-hidden
                    ${msg.fromMe 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }
                  `}
                >
                  {/* Media Content */}
                  {msg.mediaType && msg.mediaUrl && (
                    <div className="mb-1 -mx-3 -mt-1.5">
                      {msg.mediaType === 'image' && (
                        <img 
                          src={msg.mediaUrl} 
                          alt="Imagem" 
                          className="max-w-full max-h-[200px] object-contain cursor-pointer rounded-t-lg"
                          onClick={() => window.open(msg.mediaUrl, '_blank')}
                        />
                      )}
                      {msg.mediaType === 'video' && (
                        <div className="relative">
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className="max-w-full max-h-[200px] rounded-t-lg"
                          />
                        </div>
                      )}
                      {msg.mediaType === 'audio' && (
                        <audio 
                          src={msg.mediaUrl} 
                          controls 
                          className="w-full px-3 pt-2"
                        />
                      )}
                      {msg.mediaType === 'document' && (
                        <a 
                          href={msg.mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 mx-3 mt-2 rounded ${
                            msg.fromMe ? 'bg-green-600' : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <FileText className="h-5 w-5" />
                          <span className="text-xs truncate">Documento</span>
                          <Download className="h-4 w-4 ml-auto" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {/* Text Content */}
                  {msg.text && msg.text !== '[Mídia]' && !msg.text.startsWith('[') && (
                    <p className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}
                  
                  <div className={`
                    flex items-center justify-end gap-1 mt-0.5
                    ${msg.fromMe ? 'text-green-100' : 'text-gray-400'}
                  `}>
                    <span className="text-[10px]">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    
                    {msg.fromMe && (
                      <>
                        {msg.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                        {msg.status === 'sent' && <Check className="h-3 w-3" />}
                        {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                        {msg.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-300" />}
                        {msg.status === 'error' && <AlertCircle className="h-3 w-3 text-red-300" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* ✅ v3.1.0: Typing Indicator */}
            <TypingIndicator 
              isTyping={isContactTyping} 
              contactName={contactName}
              variant="bubble"
              className="mt-2"
            />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {/* Fim da área de mensagens */}

      {/* Media Preview - Se tiver mídia selecionada */}
      {selectedMedia && (
        <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded-lg">
            {selectedMedia.type === 'image' && selectedMedia.preview ? (
              <img src={selectedMedia.preview} alt="Preview" className="h-16 w-16 object-cover rounded" />
            ) : selectedMedia.type === 'video' && selectedMedia.preview ? (
              <div className="relative h-16 w-16 bg-black rounded flex items-center justify-center">
                <Play className="h-6 w-6 text-white" />
              </div>
            ) : (
              <div className="h-16 w-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                <FileText className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedMedia.file.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedMedia.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleCancelMedia}
            >
              ×
            </Button>
          </div>
        </div>
      )}
      
      {/* ✅ v3.1.0: Quick Replies Dropdown */}
      {showQuickReplies && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
          <QuickReplies
            replies={DEFAULT_QUICK_REPLIES}
            onSelect={handleQuickReplySelect}
            variant="dropdown"
            className="rounded-none border-0 shadow-none w-full"
          />
        </div>
      )}
      
      {/* ✅ v3.1.0: Offline/Queue Status Bar */}
      {(!isOnline || queuedMessages.length > 0) && (
        <div className={`flex-shrink-0 px-3 py-1.5 text-xs flex items-center gap-2 ${
          !isOnline ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {!isOnline ? (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline - Mensagens serão enviadas quando reconectar</span>
            </>
          ) : isQueueProcessing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Enviando {queuedMessages.length} mensagem(ns) pendente(s)...</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>{queuedMessages.length} mensagem(ns) na fila</span>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => processQueue()}>
                Reenviar
              </Button>
            </>
          )}
        </div>
      )}
      
      {/* Input Area - FIXO NA PARTE INFERIOR */}
      <div className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleMediaSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
        />
        <div className="flex gap-2 items-end">
          {/* ✅ v3.1.0: Quick Replies Button */}
          <QuickReplyTrigger
            isOpen={showQuickReplies}
            onClick={() => setShowQuickReplies(!showQuickReplies)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={selectedMedia ? "Adicione uma legenda..." : "Digite uma mensagem..."}
            className="min-h-[36px] max-h-[100px] resize-none text-sm flex-1"
            rows={1}
          />
          <Button 
            size="icon"
            onClick={selectedMedia ? handleSendMedia : handleSend}
            disabled={selectedMedia ? isSending : (!inputText.trim() || isSending)}
            className="h-9 w-9 bg-green-500 hover:bg-green-600 flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatMessagePanel;
