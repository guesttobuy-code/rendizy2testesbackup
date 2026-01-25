/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    RENDIZY - WhatsApp Conversation                         ║
 * ║                                                                            ║
 * ║  Componente para exibir e enviar mensagens do WhatsApp                    ║
 * ║  Usa arquitetura multi-provider (Evolution/WAHA)                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version v2.0.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 * 
 * MUDANÇAS v2.0.0:
 * - Usa unifiedChatService em vez de whatsappChatApi direto
 * - Auto-detecta provider (Evolution vs WAHA)
 * - JID normalizado automaticamente pelo adapter
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Loader2, 
  Check, 
  CheckCheck, 
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Info
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from 'sonner';
// ✅ v2.0.0: Usar serviço unificado que detecta provider automaticamente
import { 
  fetchChatMessages, 
  sendChatMessage,
  extractPhoneFromJid,
  type NormalizedWhatsAppMessage,
} from '../utils/chat';
// Legacy imports (ainda usados para upload e formatação)
import { 
  extractMessageText,
  formatPhoneDisplay,
  formatWhatsAppNumber
} from '../utils/whatsappChatApi';
import { uploadChatAttachment } from '../utils/whatsappChatApi';
import { QuickActionsModal } from './QuickActionsModal';
import { QuotationModal } from './QuotationModal';
import { CreateReservationWizard } from './CreateReservationWizard';
import { TemplateManagerModal, MessageTemplate } from './TemplateManagerModal';
import { LocalContact } from '../utils/services/evolutionContactsService';

interface WhatsAppConversationProps {
  contact: LocalContact;
}

interface MessageDisplay {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: Date;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
}

interface AttachmentItem {
  file: File;
  progress?: number; // 0-100
  status?: 'pending' | 'uploading' | 'done' | 'error';
  url?: string;
}

/**
 * ✅ CORRIGIDO v1.0.104.012: Extrair e formatar telefone de múltiplas fontes
 * IMPORTANTE: @lid NÃO é número de telefone - é Link ID interno do WhatsApp!
 * Só extrair de @s.whatsapp.net ou @c.us
 */
function getPhoneForDisplay(contact: LocalContact | null | undefined): string {
  if (!contact) return 'Número desconhecido';
  
  // Se é grupo ou broadcast, não mostrar número
  if (contact.isGroup) return 'Grupo WhatsApp';
  if (contact.isBroadcast) return 'Lista de transmissão';
  
  // Se o ID é @lid, NÃO tem número real - é Link ID interno
  if (contact.id?.includes('@lid')) {
    return 'Número desconhecido';
  }
  
  let phoneRaw = '';
  
  // 1. Tentar phoneRaw primeiro (número limpo) - MAS validar que parece BR
  if (contact.phoneRaw && /^55\d{10,11}$/.test(contact.phoneRaw)) {
    phoneRaw = contact.phoneRaw;
  }
  
  // 2. Se não tem phoneRaw válido, tentar phone
  if (!phoneRaw && contact.phone) {
    const cleaned = contact.phone.replace(/\D/g, '');
    if (/^55\d{10,11}$/.test(cleaned)) {
      phoneRaw = cleaned;
    }
  }
  
  // 3. Se ainda não tem, extrair do ID (MAS só de @s.whatsapp.net ou @c.us)
  if (!phoneRaw && contact.id) {
    // Só extrair de formatos que contêm número real
    if (contact.id.includes('@s.whatsapp.net') || contact.id.includes('@c.us')) {
      const extracted = contact.id
        .replace('whatsapp-', '')
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '');
      
      // Validar formato brasileiro
      if (/^55\d{10,11}$/.test(extracted)) {
        phoneRaw = extracted;
      }
    }
    // @g.us = grupo, @lid = link ID - NÃO extrair
  }
  
  // 4. Validar
  if (!phoneRaw || phoneRaw.length < 10 || phoneRaw.length > 15) {
    return 'Número desconhecido';
  }
  
  // 5. Formatar: +55 22 98888-7777
  if (phoneRaw.startsWith('55') && phoneRaw.length >= 12) {
    const ddd = phoneRaw.substring(2, 4);
    const rest = phoneRaw.substring(4);
    
    if (rest.length === 9) {
      return `+55 ${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`;
    } else if (rest.length === 8) {
      return `+55 ${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return `+55 ${ddd} ${rest}`;
  }
  
  // Formato genérico
  return `+${phoneRaw}`;
}

export function WhatsAppConversation({ contact }: WhatsAppConversationProps) {
  // ✅ DEBUG v1.0.104.014: Log para verificar o que está chegando
  console.log('[WhatsAppConversation] 📥 Contact recebido:', {
    id: contact?.id,
    name: contact?.name,
    phone: contact?.phone,
    phoneRaw: contact?.phoneRaw,
    isGroup: contact?.isGroup,
    isBroadcast: contact?.isBroadcast,
    conversationType: contact?.conversationType
  });
  
  // ✅ CORREÇÃO: Verificar se contact existe
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Contato não encontrado</p>
      </div>
    );
  }

  const [messages, setMessages] = useState<MessageDisplay[]>([]);
  const [inputText, setInputText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showQuotation, setShowQuotation] = useState(false);
  const [showCreateReservation, setShowCreateReservation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * ✅ v2.0.0: Buscar mensagens usando serviço unificado
   * O adapter detecta automaticamente se deve usar Evolution ou WAHA
   * e normaliza o JID para o formato correto
   */
  const loadMessages = async () => {
    const idStr = contact?.id || '';
    const isGroup = idStr.includes('@g.us');
    
    // ✅ v2.0.0: Simplificado - o adapter normaliza o JID automaticamente
    let chatIdToUse = '';
    
    if (isGroup) {
      // Para grupos, usar o ID do grupo diretamente
      chatIdToUse = idStr.replace('whatsapp-', '');
      console.log('[WhatsAppConversation] 👥 Conversa de GRUPO detectada:', chatIdToUse);
    } else {
      // Para contatos individuais, extrair phone ou usar ID diretamente
      // O adapter vai normalizar para o formato correto do provider
      chatIdToUse = idStr.replace('whatsapp-', '');
      
      // Se não parece ser um JID válido, tentar extrair número
      if (!chatIdToUse.includes('@')) {
        const phoneToUse = contact?.phone || extractPhoneFromJid(idStr);
        if (!phoneToUse || phoneToUse.length < 10) {
          console.warn('[WhatsAppConversation] ⚠️ Contato sem telefone válido:', { phone: contact?.phone, id: contact?.id });
          setIsLoadingMessages(false);
          return;
        }
        chatIdToUse = phoneToUse;
      }
    }
    
    setIsLoadingMessages(true);
    try {
      console.log('[WhatsAppConversation] 📥 Buscando mensagens (unified service):', chatIdToUse);
      
      // ✅ v2.0.0: Usa fetchChatMessages que auto-detecta provider
      const normalizedMessages = await fetchChatMessages(chatIdToUse, 100);
      
      // Converter para formato de exibição
      const formattedMessages: MessageDisplay[] = normalizedMessages.map((msg: NormalizedWhatsAppMessage) => ({
        id: msg.id,
        text: msg.text,
        fromMe: msg.fromMe,
        timestamp: new Date(msg.timestamp * 1000),
        status: msg.status,
        type: msg.mediaType || 'text',
        // ✅ v2.0.0: Suporte a mídia Base64 (WAHA) e URL (Evolution)
        mediaUrl: msg.mediaBase64 || msg.mediaUrl,
      }));

      // Ordenar por timestamp (mais antigas primeiro)
      formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Filtrar mensagens de mock/boas-vindas
      const filtered = formattedMessages.filter(m => {
        const t = (m.text || '').toLowerCase();
        if (!t) return true;
        if (t.includes('bem-vindo') || t.includes('mensagem fixa') || t.includes('boas-vindas')) return false;
        return true;
      });

      setMessages(filtered);
      console.log('[WhatsAppConversation] ✅', filtered.length, 'mensagens carregadas via unified service');
    } catch (error) {
      console.error('[WhatsAppConversation] ❌ Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  /**
   * Verificar se contato é @lid (não é possível responder diretamente)
   */
  const isLidContact = contact.id?.includes('@lid') || false;

  /**
   * Enviar mensagem
   */
  const handleSendMessage = async () => {
    if ((!inputText.trim() && attachments.length === 0) || isSending) return;
    
    // ✅ AVISO: @lid não pode ser respondido diretamente via Evolution API
    if (isLidContact) {
      toast.error('⚠️ Este contato usa ID criptografado (@lid). Não é possível enviar mensagens diretamente pela Evolution API. Solicite o número de telefone do contato.', {
        duration: 8000,
      });
      return;
    }

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);
      // Adicionar mensagem otimista (aparece imediatamente)
      const optimisticMessage: MessageDisplay = {
        id: `temp-${Date.now()}`,
        text: messageText,
        fromMe: true,
        timestamp: new Date(),
        status: 'pending'
      };
      setMessages((prev: MessageDisplay[]) => [...prev, optimisticMessage]);

    try {
      // ✅ v2.0.0: Simplificado - o adapter normaliza o JID automaticamente
      const idStr = contact.id || '';
      let chatIdToSend = idStr.replace('whatsapp-', '');
      
      // Se não parece ser um JID válido, usar phone
      if (!chatIdToSend.includes('@') && contact.phone) {
        chatIdToSend = contact.phone;
      }
      
      console.log('[WhatsAppConversation] 📤 Enviando mensagem (unified service) para:', chatIdToSend);
      
      // If there are attachments, upload them first and collect URLs
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setIsUploading(true);
        const propertyIdFallback = contact.id || 'external';

        // take a snapshot to avoid issues if state updates during uploads
        const snapshot = attachments.slice();

        for (let i = 0; i < snapshot.length; i++) {
          const item = snapshot[i];

          // If item already uploaded, reuse URL
          if (item.status === 'done' && item.url) {
            attachmentUrls.push(item.url);
            continue;
          }

          // mark uploading by id position
          setAttachments((prev) => {
            const copy = [...prev];
            if (copy[i]) copy[i] = { ...copy[i], status: 'uploading', progress: 0 };
            return copy;
          });

          const res = await uploadChatAttachment(item.file, propertyIdFallback, 'chat', (pct) => {
            setAttachments((prev) => {
              const copy = [...prev];
              if (copy[i]) copy[i] = { ...copy[i], progress: pct, status: 'uploading' };
              return copy;
            });
          });

          if (!res.success) {
            console.error('[WhatsAppConversation] Upload falhou para', item.file.name, res.error);
            setAttachments((prev) => {
              const copy = [...prev];
              if (copy[i]) copy[i] = { ...copy[i], status: 'error' };
              return copy;
            });
            toast.error('Erro ao enviar anexos. Tente novamente.');
            setIsSending(false);
            setIsUploading(false);
            return;
          }

          // mark done and store url
          setAttachments((prev) => {
            const copy = [...prev];
            if (copy[i]) copy[i] = { ...copy[i], status: 'done', progress: 100, url: res.url };
            return copy;
          });

          if (res.url) attachmentUrls.push(res.url);
        }

        setIsUploading(false);
      }

      // ✅ v2.0.0: Usar sendChatMessage unificado (auto-detecta provider)
      const result = await sendChatMessage(chatIdToSend, messageText);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar mensagem');
      }
      
      // Atualizar mensagem otimista com dados reais
      setMessages((prev: MessageDisplay[]) => prev.map((msg: MessageDisplay) => 
        msg.id === optimisticMessage.id 
          ? { ...msg, id: result.messageId || msg.id, status: 'sent' as const }
          : msg
      ));
      
      toast.success('Mensagem enviada');
      
      // Recarregar mensagens após 1 segundo para pegar a versão do servidor
      setTimeout(() => {
        loadMessages();
      }, 1000);
    } catch (error) {
      console.error('[WhatsAppConversation] ❌ Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
      
      // Remover mensagem otimista em caso de erro
      setMessages((prev: MessageDisplay[]) => prev.filter((msg: MessageDisplay) => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
      // reset attachments and internal note after send
      setAttachments([]);
      setIsInternalNote(false);
    }
  };

  /**
   * Scroll automático para última mensagem
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load saved templates from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rendizy_chat_templates');
      if (saved) {
        const parsed = JSON.parse(saved) as MessageTemplate[];
        // normalize dates
        const normalized = parsed.map((t) => ({
          ...t,
          created_at: t.created_at ? new Date(t.created_at) : new Date(),
          updated_at: t.updated_at ? new Date(t.updated_at) : new Date(),
        }));
        setTemplates(normalized);
      }
    } catch (e) {
      console.warn('Erro ao carregar templates do localStorage', e);
      setTemplates([]);
    }
  }, []);

  /**
   * Carregar mensagens ao montar e quando contato mudar
   */
  useEffect(() => {
    if (contact) {
      loadMessages();
      
      // Atualizar mensagens a cada 10 segundos
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [contact.id]);

  /**
   * Formatar timestamp
   */
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  /**
   * Obter ícone de status
   */
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'error':
        return <span className="text-red-500 text-xs">!</span>;
      default:
        return null;
    }
  };

  /**
   * Obter iniciais do contato
   */
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  /**
   * Handle paste events on the textarea to accept images from clipboard
   */
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    try {
      const items = e.clipboardData && Array.from(e.clipboardData.items || []);
      if (!items || items.length === 0) return;

      const imageItems = items.filter(it => it.kind === 'file' && it.type && it.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      const propertyIdFallback = contact.id || 'external';

      for (const it of imageItems) {
        const file = it.getAsFile();
        if (!file) continue;

        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          toast.error('Imagem maior que 5MB rejeitada');
          continue;
        }

        const newItem: AttachmentItem = { file, progress: 0, status: 'uploading', url: undefined } as AttachmentItem;

        // append to attachments list
        setAttachments((prev) => [...prev, newItem]);

        // start upload immediately
        setIsUploading(true);

        const res = await uploadChatAttachment(file, propertyIdFallback, 'chat', (pct) => {
          setAttachments((prev) => {
            const copy = [...prev];
            const index = copy.findIndex(a => a.file === file);
            const pos = index >= 0 ? index : copy.length - 1;
            if (copy[pos]) copy[pos] = { ...copy[pos], progress: pct, status: 'uploading' };
            return copy;
          });
        });

        if (!res.success) {
          setAttachments((prev) => {
            const copy = [...prev];
            const index = copy.findIndex(a => a.file === file);
            if (index >= 0) copy[index] = { ...copy[index], status: 'error' };
            return copy;
          });
          toast.error('Erro ao fazer upload da imagem colada');
          setIsUploading(false);
          continue;
        }

        // mark done and set url
        setAttachments((prev) => {
          const copy = [...prev];
          const index = copy.findIndex(a => a.file === file);
          if (index >= 0) copy[index] = { ...copy[index], status: 'done', progress: 100, url: res.url };
          return copy;
        });

        setIsUploading(false);
      }
    } catch (err) {
      console.error('[WhatsAppConversation] Erro no paste handler', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={contact?.profilePicUrl} alt={contact?.name || 'Contato'} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                  {getInitials(contact?.name || contact?.id || '??')}
                </AvatarFallback>
              </Avatar>
              {contact?.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {contact?.name || contact?.id || 'Sem nome'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {/* ✅ CORREÇÃO v1.0.104.010: Extrair telefone de múltiplas fontes */}
                <span>{getPhoneForDisplay(contact)}</span>
                {contact.isOnline && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400">Online</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowQuickActions(true)}>
              Ações
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions Modal */}
      <QuickActionsModal
        open={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        onSelectAction={(action) => {
          setShowQuickActions(false);
          if (action === 'quote') {
            // Need property/date context to open full QuotationModal
            if (!contact) {
              toast.error('Selecione uma conversa com propriedade antes de fazer uma cotação');
              return;
            }
            setShowQuotation(true);
          }
          if (action === 'reservation') {
            if (!contact) {
              toast.error('Selecione uma conversa com propriedade antes de criar reserva');
              return;
            }
            setShowCreateReservation(true);
          }
          // other actions handled elsewhere
        }}
      />

      {showQuotation && (
        <QuotationModal
          isOpen={showQuotation}
          onClose={() => setShowQuotation(false)}
          property={{
            id: 'temp',
            name: 'Selecione uma propriedade',
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
          startDate={new Date()}
          endDate={new Date(new Date().getTime() + 1000 * 60 * 60 * 24)}
        />
      )}

      <CreateReservationWizard
        open={showCreateReservation}
        onClose={() => setShowCreateReservation(false)}
        onComplete={() => {
          setShowCreateReservation(false);
          toast.success('Reserva criada');
        }}
      />

      {/* Mensagens - SCROLLABLE */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Send className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium mb-2">Nenhuma mensagem ainda</p>
              <p className="text-sm text-center max-w-xs">
                Inicie uma conversa com {contact?.name || contact?.id || 'este contato'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
            {messages.map((message: MessageDisplay, index: number) => {
              const showDate = index === 0 || 
                messages[index - 1].timestamp.toDateString() !== message.timestamp.toDateString();
              
              return (
                <div key={message.id}>
                  {/* Data separadora */}
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        {message.timestamp.toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </span>
                    </div>
                  )}
                  
                  {/* Mensagem */}
                  <div className={`flex gap-2 ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                    {!message.fromMe && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={contact.profilePicUrl} alt={contact.name} />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col max-w-[70%] ${message.fromMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.fromMe
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                      </div>
                      
                      <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400 ${message.fromMe ? 'flex-row-reverse' : ''}`}>
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.fromMe && getStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input de mensagem - FIXO NO BOTTOM */}
      <div className="border-t bg-white dark:bg-gray-800 p-4 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => { /* emoji picker placeholder */ }}>
              <Smile className="w-5 h-5" />
            </Button>

            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}>
                Templates
              </Button>
              {showTemplatesDropdown && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 border rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                  {templates.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">Nenhum template</div>
                  ) : (
                    templates.map((t) => (
                      <button
                        key={t.id}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          // insert template at cursor (append for simplicity)
                          const newText = `${inputText}${inputText ? '\n\n' : ''}${t.content}`;
                          setInputText(newText);
                          setShowTemplatesDropdown(false);
                        }}
                      >
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{t.content}</div>
                      </button>
                    ))
                  )}
                  <div className="p-2 border-t flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowTemplateManager(true)}>Gerenciar</Button>
                    <Button variant="link" size="sm" onClick={() => { setShowTemplatesDropdown(false); }}>Fechar</Button>
                  </div>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                const validArr = Array.from(files);
                const MAX_SIZE = 5 * 1024 * 1024; // 5MB - same as backend
                const accepted: AttachmentItem[] = [];
                const rejected: File[] = [];
                for (const f of validArr) {
                  if (f.size > MAX_SIZE) rejected.push(f);
                  else accepted.push({ file: f, progress: 0, status: 'pending' });
                }
                if (rejected.length > 0) {
                  toast.error(`Arquivos maiores que 5MB foram removidos (${rejected.length})`);
                }
                if (accepted.length > 0) setAttachments((prev) => [...prev, ...accepted]);
                // reset input so same file can be selected again
                e.currentTarget.value = '';
              }}
            />

            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-5 h-5" />
            </Button>
            {isUploading && (
              <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">Enviando anexos...</div>
            )}

            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="internal-note" checked={isInternalNote} onCheckedChange={(v: any) => setIsInternalNote(!!v)} />
                <Label htmlFor="internal-note" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">Nota interna</Label>
              </div>
            </div>
          </div>

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {attachments.map((item, idx) => (
                <div key={`${item.file.name}-${idx}`} className="p-2 bg-gray-100 dark:bg-gray-800 rounded flex flex-col items-start gap-2 w-48">
                  <div className="flex items-center w-full justify-between gap-2">
                    <div className="text-xs max-w-xs truncate">{item.file.name}</div>
                    <Button variant="ghost" size="icon" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                      <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </Button>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 overflow-hidden">
                    <div className="h-2 bg-blue-600" style={{ width: `${item.progress ?? 0}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 w-full text-right">{item.status === 'uploading' ? `Enviando ${item.progress ?? 0}%` : item.status === 'done' ? 'Enviado' : item.status === 'error' ? 'Erro' : ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* ⚠️ Aviso para contatos @lid (não é possível responder) */}
          {isLidContact && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 mb-2">
              <strong>⚠️ Contato @lid:</strong> Este contato usa ID criptografado do WhatsApp. 
              Não é possível enviar mensagens diretamente. Solicite o número de telefone para responder.
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isLidContact ? "Não é possível responder (contato @lid)..." : "Digite uma mensagem..."}
                className={`pr-12 ${isLidContact ? 'bg-yellow-50 cursor-not-allowed' : ''}`}
                disabled={isSending || isLidContact}
                rows={2}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={((!inputText.trim() && attachments.length === 0) || isSending || isLidContact) || isUploading}
              size="icon"
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <TemplateManagerModal
        open={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        templates={templates}
        onSaveTemplate={(t) => {
          // upsert
          setTemplates((prev) => {
            const found = prev.find((p) => p.id === t.id);
            const updated = found ? prev.map((p) => (p.id === t.id ? t : p)) : [t, ...prev];
            localStorage.setItem('rendizy_chat_templates', JSON.stringify(updated));
            return updated;
          });
        }}
        onDeleteTemplate={(id) => {
          setTemplates((prev) => {
            const updated = prev.filter((p) => p.id !== id);
            localStorage.setItem('rendizy_chat_templates', JSON.stringify(updated));
            return updated;
          });
        }}
      />
    </div>
  );
}

