/**
 * RENDIZY - Chat Inbox Unificado
 * 
 * Chat centralizador de conversas de todas as fontes:
 * - WhatsApp (Evolution API)
 * - Airbnb
 * - Booking.com
 * - SMS
 * - Site (chat interno)
 * - Email
 * 
 * @version v1.0.104.002
 * @date 2025-11-21
 * @updated - Removido tabs, chat único com ícones de origem
 */

import React from 'react';
import { ChatInbox } from './ChatInbox';

export function ChatInboxWithEvolution() {
  // Chat único - todas as conversas aparecem no ChatInbox principal
  // Ícones de canal identificam a origem (WhatsApp, Airbnb, Booking, SMS, Site, Email)
  return <ChatInbox />;
}
