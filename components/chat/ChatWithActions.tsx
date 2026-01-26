/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         CHAT WITH ACTIONS                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente unificado de Chat com Ações - SINGLE SOURCE OF TRUTH
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * 
 * ARQUITETURA:
 * Este componente é o ÚNICO responsável por:
 * - Renderizar o ChatMessagePanel
 * - Renderizar o ChatDetailsSidebar (opcional)
 * - Gerenciar todos os modais de ações
 * - Lógica de ações rápidas
 * 
 * VARIANTES:
 * - "full": Chat completo com sidebar (usado em /chat)
 * - "embedded": Chat compacto sem sidebar (usado no CRM Deal)
 * - "minimal": Apenas mensagens, sem ações
 * 
 * MULTI-PROVIDER:
 * O componente é agnóstico ao provider - funciona com WAHA, Evolution, etc.
 * O provider é determinado pelo conversationId (formato do JID)
 */

import { useState, useCallback } from 'react';
import { ChatMessagePanel } from './ChatMessagePanel';
import { ChatDetailsSidebar, ChatContactDetails } from './ChatDetailsSidebar';
import { QuickActionsModal, QuickActionType } from '../modals/QuickActionsModal';
import { CreateDealFromChatModal } from '../modals/CreateDealFromChatModal';
import { Button } from '../ui/button';
import { 
  MoreVertical, 
  PanelRightClose, 
  PanelRightOpen,
  Phone,
  MessageCircle,
  Zap,
  Link2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { Deal, phoneToWhatsAppJid } from '../../types/crm';

// ============================================
// TYPES
// ============================================

export interface ChatContact {
  /** ID único (pode ser JID do WhatsApp, ID interno, etc) */
  id: string;
  /** Nome do contato */
  name: string;
  /** Telefone (formato internacional) */
  phone?: string;
  /** JID do WhatsApp (calculado automaticamente se não fornecido) */
  whatsAppJid?: string;
  /** Email do contato */
  email?: string;
  /** Avatar URL */
  avatar?: string;
  /** Tipo: lead, guest, owner */
  type?: 'lead' | 'guest' | 'owner';
  /** Canal de origem */
  channel?: string;
  /** Tags */
  tags?: string[];
  /** Código da reserva (se aplicável) */
  reservationCode?: string;
  /** Nome do imóvel (se aplicável) */
  propertyName?: string;
}

export type ChatVariant = 'full' | 'embedded' | 'minimal';

export interface ChatWithActionsProps {
  /** Dados do contato */
  contact: ChatContact | null;
  
  /** Variante de exibição */
  variant?: ChatVariant;
  
  /** Mostrar sidebar de detalhes (apenas para variant="full") */
  showSidebar?: boolean;
  
  /** Mostrar header com nome do contato */
  showHeader?: boolean;
  
  /** Classe CSS adicional */
  className?: string;
  
  // ═══════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════
  
  /** Callback quando um Deal é criado */
  onDealCreated?: (deal: Deal) => void;
  
  /** Callback quando uma reserva é criada */
  onReservationCreated?: (reservation: any) => void;
  
  /** Callback quando uma cotação é criada */
  onQuotationCreated?: (quotation: any) => void;
  
  /** Callback quando um bloqueio é criado */
  onBlockCreated?: (block: any) => void;
  
  /** Callback para vincular/trocar contato (apenas embedded) */
  onLinkContact?: () => void;
  
  /** Callback para fechar sidebar */
  onCloseSidebar?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function ChatWithActions({
  contact,
  variant = 'full',
  showSidebar: initialShowSidebar = true,
  showHeader = true,
  className,
  onDealCreated,
  onReservationCreated: _onReservationCreated,
  onQuotationCreated: _onQuotationCreated,
  onBlockCreated: _onBlockCreated,
  onLinkContact,
  onCloseSidebar,
}: ChatWithActionsProps) {
  // ═══════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════
  
  const [showSidebar, setShowSidebar] = useState(initialShowSidebar && variant === 'full');
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showCreateDealModal, setShowCreateDealModal] = useState(false);

  // ═══════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════
  
  // Calcular o conversationId (JID) do WhatsApp
  const conversationId = contact?.whatsAppJid || 
    (contact?.phone ? phoneToWhatsAppJid(contact.phone) : contact?.id) || '';

  // Converter para formato do ChatDetailsSidebar
  // Nota: 'owner' é mapeado para 'lead' pois ChatContactDetails só aceita guest|lead
  const contactType = contact?.type === 'owner' ? 'lead' : (contact?.type || 'lead');
  const contactDetails: ChatContactDetails | null = contact ? {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    avatar: contact.avatar,
    type: contactType as 'guest' | 'lead',
    channel: contact.channel || '',
    tags: contact.tags,
    reservationCode: contact.reservationCode,
    propertyName: contact.propertyName,
  } : null;

  // Converter para formato do modal
  const modalContact = contact ? {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    whatsAppJid: conversationId,
    channel: contact.channel,
  } : undefined;

  // ═══════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════
  
  const handleOpenQuickActions = useCallback(() => {
    if (!contact) {
      toast.error('Selecione uma conversa primeiro');
      return;
    }
    setShowQuickActionsModal(true);
  }, [contact]);

  const handleQuickActionSelect = useCallback((action: QuickActionType) => {
    setShowQuickActionsModal(false);
    
    switch (action) {
      case 'CREATE_DEAL':
        setShowCreateDealModal(true);
        break;
      case 'CREATE_RESERVATION':
        toast.info('Funcionalidade de criar reserva em desenvolvimento');
        // TODO: Abrir modal de criação de reserva
        break;
      case 'CREATE_QUOTATION':
        toast.info('Funcionalidade de cotação em desenvolvimento');
        // TODO: Abrir modal de cotação
        break;
      case 'BLOCK_BROKER_VISIT':
      case 'BLOCK_CLIENT_VISIT':
      case 'BLOCK_GENERIC':
        toast.info('Funcionalidade de bloqueio em desenvolvimento');
        // TODO: Abrir modal de bloqueio
        break;
    }
  }, []);

  const handleDealCreated = useCallback((deal: Deal) => {
    console.log('[ChatWithActions] ✅ Deal criado:', deal);
    toast.success(`Deal "${deal.title}" criado com sucesso!`);
    setShowCreateDealModal(false);
    onDealCreated?.(deal);
  }, [onDealCreated]);

  const handleOpenBlockModal = useCallback(() => {
    toast.info('Funcionalidade de bloqueio em desenvolvimento');
  }, []);

  const handleOpenQuotation = useCallback(() => {
    toast.info('Funcionalidade de cotação em desenvolvimento');
  }, []);

  const handleOpenCreateReservation = useCallback(() => {
    toast.info('Funcionalidade de criar reserva em desenvolvimento');
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setShowSidebar(false);
    onCloseSidebar?.();
  }, [onCloseSidebar]);

  // ═══════════════════════════════════════════════════════
  // RENDER: Empty State
  // ═══════════════════════════════════════════════════════
  
  if (!contact) {
    return (
      <div className={cn('flex flex-col h-full bg-gray-50 dark:bg-gray-900', className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {variant === 'embedded' ? 'Sem contato vinculado' : 'Selecione uma conversa'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {variant === 'embedded' 
                ? 'Este deal não tem um telefone de contato vinculado.'
                : 'Escolha um contato para ver as mensagens'
              }
            </p>
            {variant === 'embedded' && onLinkContact && (
              <Button onClick={onLinkContact} className="bg-green-600 hover:bg-green-700">
                <Link2 className="w-4 h-4 mr-2" />
                Vincular Contato
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: Minimal (apenas mensagens)
  // ═══════════════════════════════════════════════════════
  
  if (variant === 'minimal') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <ChatMessagePanel
          conversationId={conversationId}
          contactName={contact.name}
          contactPhone={contact.phone}
          contactAvatar={contact.avatar}
          showHeader={showHeader}
          className="h-full"
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: Embedded (CRM Deal)
  // ═══════════════════════════════════════════════════════
  
  if (variant === 'embedded') {
    return (
      <div className={cn('flex h-full bg-white dark:bg-gray-800', className)}>
        {/* Chat Panel */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          showSidebar && 'mr-0'
        )}>
          {/* Header customizado */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {contact.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {contact.phone || 'Sem telefone'}
                </p>
              </div>
            </div>
            
            {/* Menu de opções */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenQuickActions}>
                  <Zap className="w-4 h-4 mr-2" />
                  Ações Rápidas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleSidebar}>
                  {showSidebar ? (
                    <>
                      <PanelRightClose className="w-4 h-4 mr-2" />
                      Ocultar Detalhes
                    </>
                  ) : (
                    <>
                      <PanelRightOpen className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </>
                  )}
                </DropdownMenuItem>
                {onLinkContact && (
                  <DropdownMenuItem onClick={onLinkContact}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Trocar Contato
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-hidden">
            <ChatMessagePanel
              conversationId={conversationId}
              contactName={contact.name}
              contactPhone={contact.phone}
              compact={true}
              showHeader={false}
              className="h-full"
            />
          </div>
        </div>

        {/* Sidebar de Detalhes - Colapsável */}
        {showSidebar && contactDetails && (
          <div className="w-72 border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
            <ChatDetailsSidebar
              contact={contactDetails}
              onOpenQuickActions={handleOpenQuickActions}
              onOpenBlockModal={handleOpenBlockModal}
              onOpenQuotation={handleOpenQuotation}
              onOpenCreateReservation={handleOpenCreateReservation}
              onClose={handleCloseSidebar}
            />
          </div>
        )}

        {/* Modais */}
        {renderModals()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: Full (Chat Principal)
  // ═══════════════════════════════════════════════════════
  
  function renderModals() {
    return (
      <>
        {/* Modal de Ações Rápidas */}
        <QuickActionsModal
          open={showQuickActionsModal}
          onOpenChange={setShowQuickActionsModal}
          onActionSelect={handleQuickActionSelect}
          contact={modalContact}
        />

        {/* Modal Criar Deal */}
        <CreateDealFromChatModal
          open={showCreateDealModal}
          onOpenChange={setShowCreateDealModal}
          contact={modalContact || { name: '', phone: '' }}
          onDealCreated={handleDealCreated}
          onBack={() => {
            setShowCreateDealModal(false);
            setShowQuickActionsModal(true);
          }}
        />
      </>
    );
  }

  return (
    <div className={cn('flex h-full w-full overflow-hidden bg-white dark:bg-gray-900', className)}>
      {/* Área de Mensagens - flex-1 ocupa espaço, min-w-0 permite shrink */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Botão para toggle do painel de detalhes */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 h-8 w-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm"
          onClick={handleToggleSidebar}
          title={showSidebar ? 'Ocultar detalhes' : 'Mostrar detalhes'}
        >
          {showSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
        
        <ChatMessagePanel
          conversationId={conversationId}
          contactName={contact.name}
          contactPhone={contact.phone}
          contactAvatar={contact.avatar}
          showHeader={showHeader}
          className="h-full rounded-none border-0 shadow-none"
        />
      </div>

      {/* Sidebar de Detalhes - flex-shrink-0 impede encolher, flex column para scroll */}
      {showSidebar && contactDetails && (
        <div className="w-[280px] flex-shrink-0 h-full flex flex-col overflow-hidden border-l border-gray-200 dark:border-gray-700 hidden lg:block">
          <ChatDetailsSidebar
            contact={contactDetails}
            onOpenQuickActions={handleOpenQuickActions}
            onOpenBlockModal={handleOpenBlockModal}
            onOpenQuotation={handleOpenQuotation}
            onOpenCreateReservation={handleOpenCreateReservation}
            onClose={handleCloseSidebar}
            className="h-full"
          />
        </div>
      )}

      {/* Modais */}
      {renderModals()}
    </div>
  );
}

export default ChatWithActions;
