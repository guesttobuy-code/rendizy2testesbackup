/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         DEAL DETAIL RIGHT                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Painel direito do Deal com Chat integrado via ChatWithActions (SSOT)
 * 
 * @version 3.0.0
 * @date 2026-01-25
 * 
 * FUNCIONALIDADES:
 * - Chat real via ChatWithActions (WAHA/Evolution/etc)
 * - Vincular contato se Deal não tem telefone
 * - Ações rápidas centralizadas no ChatWithActions
 * 
 * ARQUITETURA:
 * - Usa ChatWithActions variant="embedded" para consistência
 * - Única fonte de verdade para chat + ações
 */

import React, { useState } from 'react';
import { Deal, phoneToWhatsAppJid } from '../../types/crm';
import { ChatWithActions, ChatContact } from '../chat/ChatWithActions';
import { LinkContactToDealModal, ContactInfo } from '../modals/LinkContactToDealModal';
import { Button } from '../ui/button';
import { Link2, Phone } from 'lucide-react';

interface DealDetailRightProps {
  deal: Deal;
  onUpdate: (deal: Deal) => void;
}

export function DealDetailRight({ deal, onUpdate }: DealDetailRightProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Verificar se deal tem telefone/WhatsApp
  const hasContact = !!(deal.contactPhone || deal.contactWhatsAppJid);

  const handleContactLinked = (updatedDeal: Deal, _contact: ContactInfo) => {
    onUpdate(updatedDeal);
  };

  const handleDealCreated = (newDeal: Deal) => {
    console.log('[DealDetailRight] Deal criado via ChatWithActions:', newDeal);
    // O deal já existe, este callback é só para log
  };

  // Converter Deal para ChatContact
  const getContactFromDeal = (): ChatContact | null => {
    if (!hasContact) return null;
    
    return {
      id: deal.contactId || deal.id,
      name: deal.contactName,
      phone: deal.contactPhone,
      whatsAppJid: deal.contactWhatsAppJid || phoneToWhatsAppJid(deal.contactPhone),
      email: deal.contactEmail,
      type: 'lead',
      channel: deal.source?.toLowerCase(),
    };
  };

  // Se não tem contato, mostrar tela de vincular
  if (!hasContact) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sem contato vinculado
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Este deal não tem um telefone de contato vinculado. 
              Vincule um contato para habilitar o chat.
            </p>
            <Button
              onClick={() => setShowLinkModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Vincular Contato
            </Button>
          </div>
        </div>

        <LinkContactToDealModal
          open={showLinkModal}
          onOpenChange={setShowLinkModal}
          deal={deal}
          onContactLinked={handleContactLinked}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: Chat com ações via ChatWithActions (SSOT)
  // ═══════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* ✅ ChatWithActions é a ÚNICA fonte de verdade */}
      <ChatWithActions
        contact={getContactFromDeal()}
        variant="embedded"
        showSidebar={false}
        showHeader={true}
        onDealCreated={handleDealCreated}
        onLinkContact={() => setShowLinkModal(true)}
        className="h-full"
      />

      {/* Modal de vincular/trocar contato */}
      <LinkContactToDealModal
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        deal={deal}
        onContactLinked={handleContactLinked}
      />
    </div>
  );
}

