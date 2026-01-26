/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         SIMPLE CHAT INBOX                                  ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  📐 LAYOUT_3_COLUNAS - Estrutura visual principal do Chat                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Layout de 3 COLUNAS componentizado para o módulo de Chat.
 * 
 * @version v5.0.0
 * @date 2026-01-25
 * @see /docs/adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ ESTRUTURA DO LAYOUT:                                            │
 * │                                                                 │
 * │ ┌──────────────┬────────────────────────────────────────────┐   │
 * │ │ COLUNA 1     │ COLUNAS 2+3 (ChatWithActions)              │   │
 * │ │ (360px)      │ ┌─────────────────────┬──────────────────┐ │   │
 * │ │              │ │ ChatMessagePanel    │ ChatDetailsSidebar│ │   │
 * │ │ Conversation │ │ ⭐ CRÍTICO          │ + Modais          │ │   │
 * │ │ List         │ │                     │                   │ │   │
 * │ │              │ └─────────────────────┴──────────────────┘ │   │
 * │ └──────────────┴────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * CHANGELOG:
 * - v5.0.0 (2026-01-25): Refatorado para usar ChatWithActions (SSOT)
 * - v4.0.1 (2026-01-24): Adicionadas TAGS de proteção e documentação
 * - v4.0.0 (2026-01-22): Layout 3 colunas, componentes isolados
 * 
 * COMPONENTES:
 * - ChatConversationList.tsx → Lista de conversas WhatsApp
 * - ChatWithActions.tsx → ⭐ SSOT para chat + ações
 */

import { useState, useEffect } from 'react';
import { ChatConversationList, ChatContact } from './ChatConversationList';
import { ChatWithActions, ChatContact as ChatWithActionsContact } from './ChatWithActions';
import { cleanupGhostInstances } from '../../utils/chat/instanceCleanupService';
import { invalidateAdapterCache } from '../../utils/chat/adapters';
import { Deal } from '../../types/crm';

// ============================================
// COMPONENT
// ============================================

export function SimpleChatInbox() {
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [cleanupDone, setCleanupDone] = useState(false);

  // ═══════════════════════════════════════════════════════
  // 🧹 LIMPEZA AUTOMÁTICA DE INSTÂNCIAS FANTASMAS
  // Roda uma vez ao montar o componente
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const runCleanup = async () => {
      try {
        // Obter organizationId do localStorage
        const userJson = localStorage.getItem('rendizy-user');
        if (!userJson) return;
        
        const user = JSON.parse(userJson);
        const orgId = user.organizationId;
        
        if (!orgId) return;

        console.log('[SimpleChatInbox] 🧹 Iniciando limpeza automática de instâncias...');
        
        const result = await cleanupGhostInstances(orgId);
        
        if (result.hardDeleted > 0 || result.orphansMarked > 0) {
          console.log('[SimpleChatInbox] ✅ Limpeza executada:', {
            hardDeleted: result.hardDeleted,
            orphansMarked: result.orphansMarked,
          });
          
          // Invalidar cache de adapters para forçar re-fetch
          invalidateAdapterCache(orgId);
        }
        
        setCleanupDone(true);
      } catch (error) {
        console.error('[SimpleChatInbox] ❌ Erro na limpeza automática:', error);
        setCleanupDone(true); // Continua mesmo com erro
      }
    };

    if (!cleanupDone) {
      runCleanup();
    }
  }, [cleanupDone]);

  // ═══════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleSelectConversation = (contact: ChatContact) => {
    console.log('[SimpleChatInbox] 📱 Conversa selecionada:', {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
    });
    setSelectedContact(contact);
  };

  const handleDealCreated = (deal: Deal) => {
    console.log('[SimpleChatInbox] ✅ Deal criado via ChatWithActions:', deal);
    // TODO: Persistir deal no banco de dados
  };

  // ═══════════════════════════════════════════════════════
  // CONVERTER ChatContact para ChatWithActionsContact
  // ═══════════════════════════════════════════════════════
  
  const convertToActionContact = (contact: ChatContact | null): ChatWithActionsContact | null => {
    if (!contact) return null;
    
    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      avatar: contact.avatar,
      type: contact.type === 'lead' ? 'lead' : 'guest',
      channel: contact.channel,
      tags: contact.tags,
      reservationCode: contact.reservationCode,
      propertyName: contact.propertyName,
    };
  };

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-gray-900">
      {/* ═══════════════════════════════════════════════════════
          COLUNA 1: Lista de Conversas (360px fixo)
          ⚠️ flex-shrink-0 impede encolher, overflow-hidden no container
          O scroll interno fica no ChatConversationList
          ═══════════════════════════════════════════════════════ */}
      <div className="w-[360px] flex-shrink-0 h-full flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
        <ChatConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={selectedContact?.id}
          showHeader={true}
          title="Conversas"
          className="h-full rounded-none border-0"
        />
      </div>
      
      {/* ═══════════════════════════════════════════════════════
          COLUNAS 2+3: ChatWithActions (mensagens + sidebar + modais)
          ✅ SINGLE SOURCE OF TRUTH para chat + ações
          ⚠️ min-w-0 permite shrink, flex-1 ocupa espaço restante
          ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <ChatWithActions
          contact={convertToActionContact(selectedContact)}
          variant="full"
          showSidebar={true}
          showHeader={true}
          onDealCreated={handleDealCreated}
          className="h-full"
        />
      </div>
    </div>
  );
}

export default SimpleChatInbox;
