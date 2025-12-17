import React, { useState, useEffect, useRef } from 'react';
import { ServiceTicket } from '../../types/funnels';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Video, Phone, MoreVertical, Smile, Mic } from 'lucide-react';
import { cn } from '../ui/utils';
import { servicesTicketsApi } from '../../utils/api';
import { toast } from 'sonner';

interface ServicesTicketChatInterfaceProps {
  ticket: ServiceTicket;
}

interface ChatMessage {
  id: string;
  ticketId: string;
  contactId?: string;
  content: string;
  sender: 'USER' | 'CONTACT';
  source: 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'OTHER';
  createdAt: string;
  read: boolean;
}

const SOURCE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  WHATSAPP: {
    label: 'WhatsApp Integration',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  EMAIL: {
    label: 'Email Integration',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  PHONE: {
    label: 'Phone Integration',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  OTHER: {
    label: 'Other Integration',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
  },
};

export function ServicesTicketChatInterface({ ticket }: ServicesTicketChatInterfaceProps) {
  // Mock messages - será substituído por API
  const getMockMessages = (): ChatMessage[] => [
    {
      id: '1',
      ticketId: ticket.id,
      contactId: ticket.contactId,
      content: 'Olá, gostaria de acompanhar o status do meu serviço.',
      sender: 'CONTACT',
      source: 'WHATSAPP',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      read: true,
    },
    {
      id: '2',
      ticketId: ticket.id,
      contactId: ticket.contactId,
      content: 'Claro! Estamos trabalhando na sua solicitação. Em breve teremos novidades.',
      sender: 'USER',
      source: 'WHATSAPP',
      createdAt: new Date().toISOString(),
      read: true,
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(getMockMessages());
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sourceConfig = SOURCE_CONFIG['WHATSAPP'] || SOURCE_CONFIG.OTHER;
  const contactName = ticket.contactName || 'Cliente';
  const contactInitials = contactName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Otimistic update
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      content: messageContent,
      sender: 'USER',
      source: 'WHATSAPP',
      createdAt: new Date().toISOString(),
      read: false,
    };

    setMessages(prev => [...prev, tempMessage]);

    // Enviar para API
    try {
      // TODO: Implementar API de mensagens para tickets
      // const response = await servicesTicketsApi.sendMessage({
      //   ticketId: ticket.id,
      //   contactId: ticket.contactId,
      //   content: messageContent,
      //   source: 'WHATSAPP',
      // });

      // Por enquanto, apenas simular sucesso
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id 
            ? { ...tempMessage, read: true }
            : m
        ));
      }, 500);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
      // Remover mensagem temporária em caso de erro
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(messageContent);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-white dark:bg-gray-800">
      {/* Chat Header */}
      <div className={cn('px-6 py-4 border-b', sourceConfig.bgColor, 'border-gray-200 dark:border-gray-700')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={cn('text-white', sourceConfig.bgColor)}>
                {contactInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{contactName}</p>
              <p className={cn('text-xs', sourceConfig.color)}>{sourceConfig.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {messages.map(message => {
            const isUser = message.sender === 'USER';
            return (
              <div
                key={message.id}
                className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2',
                    isUser
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      isUser ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Smile className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Digite uma mensagem"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button variant="ghost" size="icon">
            <Mic className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
