/**
 * RENDIZY - Chat Components Index
 * 
 * Exporta todos os componentes de chat disponíveis
 * 
 * @version 3.0.0
 * @date 2026-01-22
 */

// Componente principal (composição de ChatConversationList + ChatMessagePanel)
export { SimpleChatInbox } from './SimpleChatInbox';
export { default as SimpleChatInboxDefault } from './SimpleChatInbox';

// Componentes ISOLADOS - podem ser usados em qualquer lugar (ex: CRM cards)
export { ChatConversationList } from './ChatConversationList';
export type { ChatConversationListProps, ChatContact } from './ChatConversationList';

export { ChatMessagePanel } from './ChatMessagePanel';
export type { ChatMessagePanelProps } from './ChatMessagePanel';

// V2 - Nova versão com arquitetura de adapters (legado)
export { ChatInboxV2 } from './ChatInboxV2';
