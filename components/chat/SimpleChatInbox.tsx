/**
 * RENDIZY - Simple Chat Inbox
 * 
 * Versão REFATORADA usando componentes isolados
 * Composição: ChatConversationList + ChatMessagePanel
 * 
 * @version v3.0.0
 * @date 2026-01-22
 * 
 * CHANGELOG v3.0.0:
 * - ✅ REFATORADO: Usa ChatConversationList e ChatMessagePanel
 * - ✅ Arquitetura limpa e componentizada
 * - ✅ Componentes reutilizáveis em outros lugares (ex: CRM cards)
 * - ✅ Código reduzido de ~900 linhas para ~70 linhas
 */

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatConversationList, ChatContact } from './ChatConversationList';
import { ChatMessagePanel } from './ChatMessagePanel';

// ============================================
// COMPONENT
// ============================================

export function SimpleChatInbox() {
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);

  const handleSelectConversation = (contact: ChatContact) => {
    setSelectedContact(contact);
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* SIDEBAR - Lista de Conversas */}
      <div className="w-96 min-w-[360px] h-full overflow-hidden">
        <ChatConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={selectedContact?.id}
          showHeader={true}
          title="Conversas"
          className="h-full rounded-none border-0 border-r"
        />
      </div>
      
      {/* MAIN - Painel de Mensagens */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!selectedContact ? (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
            <p className="text-sm">Escolha um contato para ver as mensagens</p>
          </div>
        ) : (
          <ChatMessagePanel
            conversationId={selectedContact.id}
            contactName={selectedContact.name}
            contactPhone={selectedContact.phone}
            contactAvatar={selectedContact.avatar}
            showHeader={true}
            className="h-full rounded-none border-0"
          />
        )}
      </div>
    </div>
  );
}

export default SimpleChatInbox;
