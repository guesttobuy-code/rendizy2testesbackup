/**
 * TESTE: Chat usando @chatscope/chat-ui-kit-react
 * Biblioteca open source MIT - 100% gratuita
 * 
 * @see https://chatscope.io/storybook/react/
 */

import { useState, useEffect } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Sidebar,
  ConversationList,
  Conversation,
  Avatar,
  ConversationHeader,
  MessageSeparator,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';

// WAHA Config
const WAHA_API_URL = import.meta.env.VITE_WAHA_API_URL || 'http://76.13.82.60:3001';
const WAHA_API_KEY = import.meta.env.VITE_WAHA_API_KEY || 'rendizy-waha-secret-2026';
const WAHA_SESSION = 'default';

interface WAHAChat {
  id: string;
  name?: string;
  pushName?: string;
  lastMessage?: { body?: string; timestamp?: number };
  unreadCount?: number;
  profilePictureUrl?: string;
}

interface WAHAMessage {
  id: string;
  body?: string;
  text?: string;
  fromMe: boolean;
  timestamp: number;
  hasMedia?: boolean;
  media?: { url?: string; mimetype?: string };
  _data?: { body?: string; type?: string; mimetype?: string };
}

export function ChatScopeTest() {
  const [conversations, setConversations] = useState<WAHAChat[]>([]);
  const [messages, setMessages] = useState<WAHAMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Carregar conversas do WAHA
  useEffect(() => {
    async function loadChats() {
      try {
        const response = await fetch(`${WAHA_API_URL}/api/${WAHA_SESSION}/chats`, {
          headers: { 'X-Api-Key': WAHA_API_KEY },
        });
        if (!response.ok) throw new Error('Erro ao carregar chats');
        const data = await response.json();
        
        // Filtrar apenas conversas individuais
        const filtered = data.filter((c: any) => {
          const id = c.id || '';
          return !id.includes('@g.us') && !id.includes('status@');
        });
        
        setConversations(filtered.slice(0, 50)); // Limitar a 50
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      }
    }
    loadChats();
  }, []);

  // Carregar mensagens quando selecionar um chat
  useEffect(() => {
    async function loadMessages() {
      if (!selectedChat) return;
      setLoading(true);
      try {
        const response = await fetch(
          `${WAHA_API_URL}/api/${WAHA_SESSION}/chats/${encodeURIComponent(selectedChat)}/messages?limit=50&downloadMedia=true`,
          { headers: { 'X-Api-Key': WAHA_API_KEY } }
        );
        if (!response.ok) throw new Error('Erro ao carregar mensagens');
        const data = await response.json();
        setMessages(data.reverse()); // Ordenar do mais antigo para o mais novo
      } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [selectedChat]);

  // Enviar mensagem
  const handleSend = async (text: string) => {
    if (!selectedChat || !text.trim()) return;
    
    try {
      await fetch(`${WAHA_API_URL}/api/sendText`, {
        method: 'POST',
        headers: {
          'X-Api-Key': WAHA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: selectedChat,
          text: text,
          session: WAHA_SESSION,
        }),
      });
      
      // Adicionar mensagem localmente
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        body: text,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
      }]);
      setInputValue('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  // Extrair URL de mídia (base64 ou URL)
  const getMediaUrl = (msg: WAHAMessage): string | null => {
    if (!msg.hasMedia && !msg.media) return null;
    
    // Tentar base64 primeiro (thumbnail)
    const base64 = msg._data?.body;
    const mimetype = msg.media?.mimetype || msg._data?.mimetype || 'image/jpeg';
    
    if (base64 && base64.length > 50) {
      return `data:${mimetype};base64,${base64}`;
    }
    
    return null;
  };

  // Formatar timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Extrair nome/telefone do chat ID
  const getChatName = (chat: WAHAChat): string => {
    if (chat.pushName || chat.name) return (chat.pushName || chat.name) as string;
    const phone = (chat.id || '').replace('@c.us', '').replace('@s.whatsapp.net', '');
    return phone || 'Desconhecido';
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MainContainer>
        {/* Sidebar com conversas */}
        <Sidebar position="left" scrollable>
          <ConversationList>
            {conversations.map(chat => (
              <Conversation
                key={chat.id}
                name={getChatName(chat)}
                lastSenderName=""
                info={chat.lastMessage?.body?.substring(0, 30) || ''}
                unreadCnt={chat.unreadCount || 0}
                active={selectedChat === chat.id}
                onClick={() => {
                  setSelectedChat(chat.id);
                  setSelectedName(getChatName(chat));
                }}
              >
                <Avatar
                  src={chat.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(getChatName(chat))}&background=25D366&color=fff`}
                  name={getChatName(chat)}
                />
              </Conversation>
            ))}
          </ConversationList>
        </Sidebar>

        {/* Área do chat */}
        <ChatContainer>
          {selectedChat ? (
            <>
              <ConversationHeader>
                <Avatar
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedName)}&background=25D366&color=fff`}
                  name={selectedName}
                />
                <ConversationHeader.Content userName={selectedName} />
              </ConversationHeader>

              <MessageList
                typingIndicator={loading ? <TypingIndicator content="Carregando..." /> : null}
              >
                <MessageSeparator content="Mensagens carregadas do WhatsApp" />
                
                {messages.map(msg => {
                  const mediaUrl = getMediaUrl(msg);
                  const text = msg.body || msg.text || '';
                  const mediaType = msg._data?.type || '';
                  
                  return (
                    <Message
                      key={msg.id}
                      model={{
                        message: text || (msg.hasMedia ? `[${mediaType || 'mídia'}]` : ''),
                        sentTime: formatTime(msg.timestamp),
                        sender: msg.fromMe ? 'Você' : selectedName,
                        direction: msg.fromMe ? 'outgoing' : 'incoming',
                        position: 'single',
                      }}
                    >
                      {/* Renderizar mídia se houver */}
                      {mediaUrl && (mediaType === 'image' || msg.media?.mimetype?.startsWith('image/')) && (
                        <Message.ImageContent
                          src={mediaUrl}
                          alt="Imagem"
                          width={200}
                        />
                      )}
                    </Message>
                  );
                })}
              </MessageList>

              <MessageInput
                placeholder="Digite uma mensagem..."
                value={inputValue}
                onChange={val => setInputValue(val)}
                onSend={handleSend}
                attachButton={false}
              />
            </>
          ) : (
            <MessageList>
              <MessageSeparator content="Selecione uma conversa para começar" />
            </MessageList>
          )}
        </ChatContainer>
      </MainContainer>
    </div>
  );
}

export default ChatScopeTest;
