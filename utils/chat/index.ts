/**
 * CHAT MULTI-CHANNEL - Entry Point
 * 
 * Sistema unificado de chat multi-canal
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * @see ADR-007
 * 
 * Canais suportados:
 * - ✅ WhatsApp (via Evolution API)
 * - 🔲 Airbnb (stub - implementar)
 * - 🔲 Booking.com (stub - implementar)
 * 
 * @example
 * ```typescript
 * import { 
 *   getChatRegistry, 
 *   getAllChatConversations,
 *   getChatProvider 
 * } from './utils/chat';
 * 
 * // Buscar conversas de TODOS os canais
 * const conversations = await getAllChatConversations(orgId);
 * 
 * // Buscar só de WhatsApp
 * const whatsapp = getChatProvider('whatsapp');
 * const waConversations = await whatsapp?.getConversations(orgId);
 * 
 * // Enviar mensagem
 * await whatsapp?.sendTextMessage(conversationId, 'Olá!');
 * ```
 */

// ============================================================
// TYPES
// ============================================================

export type {
  // Channels
  ChatChannel,
  WhatsAppSubProvider,
  
  // Conversation & Message
  ChatConversation,
  ChatMessage,
  MessageType,
  MessageStatus,
  MessageDirection,
  
  // Provider Interface
  IChatProvider,
  IChatProviderRegistry,
  
  // Options
  GetConversationsOptions,
  GetMessagesOptions,
  ParsedExternalId,
  
  // Events
  ChatEventType,
  ChatEvent,
} from './types';

// ============================================================
// REGISTRY & HELPERS
// ============================================================

export {
  getChatRegistry,
  getAllChatConversations,
  getChatProvider,
} from './registry';

// ============================================================
// PROVIDERS
// ============================================================

export { 
  WhatsAppChatProvider,
  getWhatsAppChatProvider 
} from './providers/whatsapp';

export {
  AirbnbChatProvider,
  getAirbnbChatProvider,
} from './providers/airbnb';

export {
  BookingChatProvider,
  getBookingChatProvider,
} from './providers/booking';
