/**
 * RENDIZY - Chat Inbox V2
 * 
 * Nova versão do inbox usando arquitetura de adapters
 * Suporta múltiplos canais de comunicação
 * 
 * @version 2.0.0
 * @date 2026-01-22
 */

import { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Search, 
  Loader2, 
  Send,
  RefreshCw,
  Phone,
  Check,
  CheckCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  MessageSquare,
  Mail,
  Home,
  Filter,
  MoreVertical,
  Archive,
  Star,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner';
import { useChatService } from '../../src/hooks/useChatService';
import { 
  ChatConversation, 
  ChatMessage, 
  ChannelType,
  MessageStatus,
} from '../../src/services/chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// HELPERS
// ============================================

function getChannelIcon(channel: ChannelType) {
  switch (channel) {
    case 'whatsapp':
      return <Phone className="w-4 h-4 text-green-500" />;
    case 'airbnb':
      return <Home className="w-4 h-4 text-red-500" />;
    case 'booking':
      return <Home className="w-4 h-4 text-blue-500" />;
    case 'sms':
      return <MessageSquare className="w-4 h-4 text-purple-500" />;
    case 'email':
      return <Mail className="w-4 h-4 text-gray-500" />;
    default:
      return <MessageCircle className="w-4 h-4" />;
  }
}

function getChannelColor(channel: ChannelType): string {
  switch (channel) {
    case 'whatsapp': return 'bg-green-500';
    case 'airbnb': return 'bg-red-500';
    case 'booking': return 'bg-blue-500';
    case 'sms': return 'bg-purple-500';
    case 'email': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
}

function getStatusIcon(status: MessageStatus) {
  switch (status) {
    case 'pending':
      return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
    case 'sent':
      return <Check className="w-3 h-3 text-gray-400" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return null;
  }
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

function formatTime(date?: Date): string {
  if (!date) return '';
  
  try {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

// ============================================
// CONVERSATION LIST ITEM
// ============================================

interface ConversationItemProps {
  conversation: ChatConversation;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 cursor-pointer transition-colors
        hover:bg-muted/50
        ${isSelected ? 'bg-muted' : ''}
      `}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.contact.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(conversation.contact.name)}
          </AvatarFallback>
        </Avatar>
        
        {/* Channel indicator */}
        <div className={`
          absolute -bottom-1 -right-1 rounded-full p-0.5
          ${getChannelColor(conversation.channelType)}
        `}>
          {getChannelIcon(conversation.channelType)}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <span className="font-medium truncate">
            {conversation.contact.name}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-sm text-muted-foreground truncate">
            {conversation.lastMessagePreview || 'Sem mensagens'}
          </p>
          
          {conversation.unreadCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-[20px] justify-center">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MESSAGE BUBBLE
// ============================================

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';
  
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`
          max-w-[70%] rounded-2xl px-4 py-2
          ${isOutbound 
            ? 'bg-primary text-primary-foreground rounded-br-sm' 
            : 'bg-muted rounded-bl-sm'
          }
        `}
      >
        {/* Sender name for inbound */}
        {!isOutbound && message.senderName && (
          <p className="text-xs font-medium mb-1 opacity-70">
            {message.senderName}
          </p>
        )}
        
        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        
        {/* Media preview */}
        {message.media && message.contentType === 'image' && (
          <img 
            src={message.media.thumbnailUrl || message.media.url} 
            alt="Imagem"
            className="mt-2 rounded-lg max-w-full"
          />
        )}
        
        {/* Footer */}
        <div className={`
          flex items-center gap-1 mt-1
          ${isOutbound ? 'justify-end' : 'justify-start'}
        `}>
          <span className="text-xs opacity-60">
            {message.sentAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          {isOutbound && getStatusIcon(message.status)}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ChatInboxV2() {
  const {
    isReady,
    isLoading,
    error,
    conversations,
    selectedConversation,
    messages,
    connectionStatus,
    availableChannels,
    loadConversations,
    selectConversation,
    sendMessage,
    archiveConversation,
    refreshConnectionStatus,
  } = useChatService();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [channelFilter, setChannelFilter] = useState<ChannelType | 'all'>('all');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    // Channel filter
    if (channelFilter !== 'all' && conv.channelType !== channelFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.contact.name.toLowerCase().includes(query) ||
        conv.contact.identifier.includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // Check if WhatsApp is connected
  const whatsappStatus = connectionStatus['whatsapp'];
  const isWhatsAppConnected = whatsappStatus?.connected ?? false;
  
  // Handle send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedConversation || isSending) return;
    
    setIsSending(true);
    
    try {
      const result = await sendMessage({
        recipientIdentifier: selectedConversation.contact.identifier,
        contentType: 'text',
        content: inputText.trim(),
      });
      
      if (result.success) {
        setInputText('');
        inputRef.current?.focus();
      } else {
        toast.error(result.error || 'Erro ao enviar mensagem');
      }
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // ============================================
  // RENDER
  // ============================================
  
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="flex h-[calc(100vh-120px)] bg-background rounded-lg border overflow-hidden">
      {/* ========== LEFT PANEL - Conversations ========== */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conversas</h2>
            
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <div className="flex items-center gap-1">
                {isWhatsAppConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              {/* Refresh button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadConversations()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Channel filter */}
          {availableChannels.length > 1 && (
            <div className="flex gap-1 mt-3">
              <Button
                variant={channelFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChannelFilter('all')}
              >
                Todos
              </Button>
              {availableChannels.map(channel => (
                <Button
                  key={channel}
                  variant={channelFilter === channel ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChannelFilter(channel)}
                >
                  {getChannelIcon(channel)}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConversation?.id === conv.id}
                  onClick={() => selectConversation(conv)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* ========== RIGHT PANEL - Messages ========== */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.contact.avatar} />
                  <AvatarFallback>
                    {getInitials(selectedConversation.contact.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-medium">{selectedConversation.contact.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getChannelIcon(selectedConversation.channelType)}
                    <span>{selectedConversation.contact.identifier}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => archiveConversation(selectedConversation.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Star className="w-4 h-4 mr-2" />
                    Marcar importante
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhuma mensagem</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </ScrollArea>
            
            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  placeholder="Digite sua mensagem..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[44px] max-h-32 resize-none"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <MessageCircle className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
            <p className="text-muted-foreground">
              Escolha uma conversa na lista para visualizar as mensagens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
