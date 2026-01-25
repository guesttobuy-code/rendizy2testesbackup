/**
 * RENDIZY - Chat Components Index
 * 
 * Exporta todos os componentes de chat disponíveis
 * 
 * @version 4.0.0
 * @date 2026-01-25
 * 
 * CHANGELOG:
 * - v4.0.0: Phase 3 components (reactions, reply, forward, audio, search)
 * - v3.1.0: Phase 2 components (typing, quick replies, message queue)
 * - v3.0.0: Initial module index
 */

// ============================================
// MAIN COMPONENTS
// ============================================

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

// ============================================
// PHASE 2 - UI COMPONENTS
// ============================================

// Typing Indicator
export { TypingIndicator } from './TypingIndicator';
export type { TypingIndicatorProps } from './TypingIndicator';

// Message Status (ACK indicators)
export { MessageStatusIndicator, ackToStatus, statusToAck } from './MessageStatusIndicator';
export type { MessageStatus, MessageStatusIndicatorProps } from './MessageStatusIndicator';

// Quick Replies
export { QuickReplies, QuickReplyTrigger, DEFAULT_QUICK_REPLIES, replaceVariables } from './QuickReplies';
export type { QuickReply, QuickReplyCategory, QuickRepliesProps } from './QuickReplies';

// ============================================
// PHASE 3 - ADVANCED FEATURES
// ============================================

// Reactions (👍❤️😂)
export { MessageReactions, ReactionPicker, QuickReactionButton, WHATSAPP_REACTIONS, POPULAR_EMOJIS } from './MessageReactions';
export type { Reaction, MessageReactionsProps, ReactionPickerProps, QuickReactionButtonProps } from './MessageReactions';

// Reply/Quote Messages
export { ReplyPreview, QuotedMessageDisplay, ReplyButton } from './ReplyMessage';
export type { QuotedMessage, ReplyPreviewProps, QuotedMessageDisplayProps, ReplyButtonProps } from './ReplyMessage';

// Forward Messages
export { ForwardDialog, ForwardButton, useForwardMessage } from './ForwardMessage';
export type { ForwardContact, ForwardDialogProps, ForwardButtonProps } from './ForwardMessage';

// Audio Recorder
export { AudioRecorder, useAudioRecorder } from './AudioRecorder';
export type { AudioRecorderProps, UseAudioRecorderReturn } from './AudioRecorder';

// Message Search
export { MessageSearch, useMessageSearch, highlightSearchMatch } from './MessageSearch';
export type { SearchableMessage, MessageSearchProps, UseMessageSearchOptions, UseMessageSearchReturn } from './MessageSearch';
