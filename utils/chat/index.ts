/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CHAT MULTI-CHANNEL - Entry Point                        ║
 * ║                                                                            ║
 * ║  Sistema unificado de chat multi-canal com arquitetura 1:N                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 2.0.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 * 
 * CANAIS SUPORTADOS:
 * - ✅ WhatsApp Evolution API
 * - ✅ WhatsApp WAHA
 * - 🔲 Airbnb (stub)
 * - 🔲 Booking.com (stub)
 * - 🔲 SMS (futuro)
 * 
 * ARQUITETURA:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    FRONTEND COMPONENTS                       │
 * │                 (ChatInbox, WhatsAppConversation)           │
 * └────────────────────────────┬────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              UNIFIED CHAT SERVICE (NEW!)                     │
 * │           (utils/chat/unifiedChatService.ts)                │
 * │                                                              │
 * │  fetchChatMessages() • sendChatMessage() • markAsRead()     │
 * └────────────────────────────┬────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   ADAPTER FACTORY                            │
 * │              (utils/chat/adapters/index.ts)                  │
 * │                                                              │
 * │  getWhatsAppAdapter() → detecta Evolution vs WAHA           │
 * └────────────────────────────┬────────────────────────────────┘
 *                              │
 *          ┌───────────────────┼───────────────────┐
 *          ▼                                       ▼
 * ┌─────────────────┐                   ┌─────────────────┐
 * │ Evolution       │                   │ WAHA            │
 * │ Adapter         │                   │ Adapter         │
 * │                 │                   │                 │
 * │ @s.whatsapp.net │                   │ @c.us           │
 * └─────────────────┘                   └─────────────────┘
 * 
 * @example
 * ```typescript
 * // ✅ NOVO - Usar serviço unificado (recomendado)
 * import { fetchChatMessages, sendChatMessage } from './utils/chat';
 * 
 * const messages = await fetchChatMessages('5521999887766');
 * await sendChatMessage('5521999887766', 'Olá!');
 * 
 * // ✅ Ainda funciona - Registry para multi-canal
 * import { getChatRegistry, getAllChatConversations } from './utils/chat';
 * 
 * const conversations = await getAllChatConversations(orgId);
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
// UNIFIED CHAT SERVICE (v2.0.0 - RECOMMENDED)
// ============================================================

export {
  // Single-instance functions
  fetchChatMessages,
  fetchChatList,
  sendChatMessage,
  sendChatMedia,
  markChatAsRead,
  isWhatsAppConnected,
  getActiveProvider,
  normalizeJidForCurrentProvider,
  extractPhoneFromJid,
  // Multi-instance functions (v2.1.0)
  fetchAllChatsFromAllInstances,
  getActiveInstances,
  getAllConnectionStatus,
} from './unifiedChatService';

// Re-export types from unified service
export type {
  NormalizedWhatsAppMessage,
  NormalizedWhatsAppChat,
  SendMessageResult,
  ChatWithInstance,
} from './unifiedChatService';

// ============================================================
// ADAPTERS (v2.0.0 - For direct access when needed)
// ============================================================

export {
  getWhatsAppAdapter,
  detectWhatsAppProvider,
  invalidateAdapterCache,
  getCachedAdapter,
  EvolutionAdapter,
  WahaAdapter,
  // Multi-instance exports (v2.1.0)
  getAllWhatsAppAdapters,
  getAdapterByInstanceId,
  getAdapterByProvider,
} from './adapters';

export type {
  IWhatsAppAdapter,
  WhatsAppAdapterConfig,
  DetectedProvider,
  ActiveInstance,
} from './adapters';

// ============================================================
// REGISTRY & HELPERS (Legacy - Still works)
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
