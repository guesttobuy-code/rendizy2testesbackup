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
 * @version v4.0.1
 * @date 2026-01-24
 * @see /docs/adr/ADR-007-CHAT-MODULE-WAHA-INTEGRATION.md
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ ESTRUTURA DO LAYOUT:                                            │
 * │                                                                 │
 * │ ┌──────────────┬────────────────────────────┬─────────────────┐ │
 * │ │ COLUNA 1     │ COLUNA 2                   │ COLUNA 3        │ │
 * │ │ (320px)      │ (flex-1)                   │ (280px)         │ │
 * │ │              │                            │                 │ │
 * │ │ Conversation │ ChatMessagePanel           │ ChatDetails     │ │
 * │ │ List         │ ⭐ CRÍTICO                 │ Sidebar         │ │
 * │ │              │                            │                 │ │
 * │ └──────────────┴────────────────────────────┴─────────────────┘ │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * CHANGELOG:
 * - v4.0.1 (2026-01-24): Adicionadas TAGS de proteção e documentação
 * - v4.0.0 (2026-01-22): Layout 3 colunas, componentes isolados
 * 
 * COMPONENTES FILHOS:
 * - ChatConversationList.tsx → Lista de conversas WhatsApp
 * - ChatMessagePanel.tsx → ⭐ Exibe mensagens (CRÍTICO)
 * - ChatDetailsSidebar.tsx → Detalhes do contato + observações
 */

import { useState, useEffect } from 'react';
import { MessageCircle, PanelRightClose, PanelRight } from 'lucide-react';
import { Button } from '../ui/button';
import { ChatConversationList, ChatContact } from './ChatConversationList';
import { ChatMessagePanel } from './ChatMessagePanel';
import { ChatDetailsSidebar, ChatContactDetails } from './ChatDetailsSidebar';
import { cleanupGhostInstances } from '../../utils/chat/instanceCleanupService';
import { invalidateAdapterCache } from '../../utils/chat/adapters';

// ============================================
// COMPONENT
// ============================================

export function SimpleChatInbox() {
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [showDetails, setShowDetails] = useState(true);
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

  const handleSelectConversation = (contact: ChatContact) => {
    // ✅ v2.0.6: Debug log para verificar dados do contato
    console.log('[SimpleChatInbox] 📱 Conversa selecionada:', {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      idType: typeof contact.id,
    });
    
    setSelectedContact(contact);
    // Abrir painel de detalhes automaticamente ao selecionar
    setShowDetails(true);
  };

  // Converter ChatContact para ChatContactDetails
  const getContactDetails = (): ChatContactDetails | null => {
    if (!selectedContact) return null;
    
    return {
      id: selectedContact.id,
      name: selectedContact.name,
      phone: selectedContact.phone,
      avatar: selectedContact.avatar,
      type: selectedContact.type === 'lead' ? 'lead' : 'guest',
      channel: selectedContact.channel,
      reservationCode: selectedContact.reservationCode,
      propertyName: selectedContact.propertyName,
      tags: selectedContact.tags,
    };
  };

  // Handlers para ações (preparados para ativação futura)
  const handleOpenQuickActions = () => {
    // TODO: Implementar modal de ações rápidas
    console.log('[SimpleChatInbox] Abrir Ações Rápidas - em desenvolvimento');
  };

  const handleOpenBlockModal = () => {
    // TODO: Implementar modal de bloqueio
    console.log('[SimpleChatInbox] Abrir Bloqueio - em desenvolvimento');
  };

  const handleOpenQuotation = () => {
    // TODO: Implementar modal de cotação
    console.log('[SimpleChatInbox] Abrir Cotação - em desenvolvimento');
  };

  const handleOpenCreateReservation = () => {
    // TODO: Implementar wizard de reserva
    console.log('[SimpleChatInbox] Criar Reserva - em desenvolvimento');
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* ═══════════════════════════════════════════════════════
          COLUNA 1: Lista de Conversas (360px fixo)
          ═══════════════════════════════════════════════════════ */}
      <div className="w-[360px] min-w-[360px] max-w-[360px] h-full overflow-hidden border-r border-gray-200 dark:border-gray-700">
        <ChatConversationList
          onSelectConversation={handleSelectConversation}
          selectedId={selectedContact?.id}
          showHeader={true}
          title="Conversas"
          className="h-full rounded-none border-0"
        />
      </div>
      
      {/* ═══════════════════════════════════════════════════════
          COLUNA 2: Área de Mensagens (flex-1)
          ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        {/* Botão para toggle do painel de detalhes */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 h-8 w-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm"
          onClick={() => setShowDetails(!showDetails)}
          title={showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
        >
          {showDetails ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
        </Button>
        
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

      {/* ═══════════════════════════════════════════════════════
          COLUNA 3: Detalhes + Observações (280px, collapsible)
          ═══════════════════════════════════════════════════════ */}
      {showDetails && (
        <div className="w-[280px] min-w-[280px] max-w-[280px] h-full overflow-hidden border-l border-gray-200 dark:border-gray-700 hidden lg:block">
          <ChatDetailsSidebar
            contact={getContactDetails()}
            onOpenQuickActions={handleOpenQuickActions}
            onOpenBlockModal={handleOpenBlockModal}
            onOpenQuotation={handleOpenQuotation}
            onOpenCreateReservation={handleOpenCreateReservation}
            onClose={() => setShowDetails(false)}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}

export default SimpleChatInbox;
