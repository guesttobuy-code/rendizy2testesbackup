/**
 * ChatSidebar
 * 
 * Barra lateral com filtros, busca e lista de conversas
 * Extração do ChatInbox para modularização
 * 
 * Projeto Fluência - Fase 3 - Task #19
 */

import React from 'react';
import { Search, Pin, Zap, MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { ChatFilterSidebar } from '../ChatFilterSidebar';
import type { UnifiedConversation } from './hooks/useChatData';

interface Property {
  id: string;
  title?: string;
  name?: string;
  internalId?: string;
  location?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
  };
}

interface ChatTag {
  id: string;
  name: string;
  color?: string;
}

interface GroupedConversations {
  pinned: UnifiedConversation[];
  urgent: UnifiedConversation[];
  normal: UnifiedConversation[];
  resolved: UnifiedConversation[];
}

interface ChatSidebarProps {
  // Filters
  properties: Property[];
  selectedProperties: string[];
  onToggleProperty: (id: string) => void;
  onSetSelectedProperties?: (ids: string[]) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  chatTags: ChatTag[];
  onManageTags: () => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Conversations
  groupedConversations: GroupedConversations;
  filteredConversations: UnifiedConversation[];
  isLoading: boolean;
  renderConversationCard: (
    conv: UnifiedConversation,
    category: 'pinned' | 'urgent' | 'normal' | 'resolved'
  ) => React.ReactNode;
}

export function ChatSidebar({
  properties,
  selectedProperties,
  onToggleProperty,
  onSetSelectedProperties,
  dateRange,
  onDateRangeChange,
  selectedStatuses,
  onStatusesChange,
  selectedChannels,
  onChannelsChange,
  selectedTags,
  onTagsChange,
  chatTags,
  onManageTags,
  searchQuery,
  onSearchChange,
  groupedConversations,
  filteredConversations,
  isLoading,
  renderConversationCard
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 overflow-hidden h-full" style={{ width: 380, maxWidth: 380, minWidth: 380, height: '100vh' }}>
      {/* Filters */}
      <div className="h-auto flex-shrink-0">
        <ChatFilterSidebar
          properties={properties}
          selectedProperties={selectedProperties}
          onToggleProperty={onToggleProperty}
          onSetSelectedProperties={onSetSelectedProperties}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          selectedStatuses={selectedStatuses}
          onStatusesChange={onStatusesChange}
          selectedChannels={selectedChannels}
          onChannelsChange={onChannelsChange}
          selectedTags={selectedTags}
          onTagsChange={onTagsChange}
          chatTags={chatTags}
          onManageTags={onManageTags}
        />
      </div>

      {/* Search */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List - SCROLLABLE */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}>
        <ScrollArea className="h-full w-full" style={{ height: '100%', width: '100%', maxHeight: '100%' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              {/* Fixadas */}
              {groupedConversations.pinned.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    <Pin className="h-3 w-3" />
                    Fixadas ({groupedConversations.pinned.length}/5)
                  </div>
                  {groupedConversations.pinned.map(conv => renderConversationCard(conv, 'pinned'))}
                </div>
              )}

              {/* Urgentes */}
              {groupedConversations.urgent.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-orange-600 uppercase flex items-center gap-2">
                    <Zap className="h-3 w-3" />
                    Urgentes ({groupedConversations.urgent.length})
                  </div>
                  {groupedConversations.urgent.map(conv => renderConversationCard(conv, 'urgent'))}
                </div>
              )}

              {/* Normais */}
              {groupedConversations.normal.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                    <MessageCircle className="h-3 w-3" />
                    Normais ({groupedConversations.normal.length})
                  </div>
                  {groupedConversations.normal.map(conv => renderConversationCard(conv, 'normal'))}
                </div>
              )}

              {/* Resolvidas */}
              {groupedConversations.resolved.length > 0 && (
                <div className="mb-4">
                  <div className="px-4 py-2 text-xs font-semibold text-green-600 uppercase flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolvidas ({groupedConversations.resolved.length})
                  </div>
                  {groupedConversations.resolved.map(conv => renderConversationCard(conv, 'resolved'))}
                </div>
              )}

              {/* Empty state */}
              {filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">
                    {searchQuery || selectedStatuses.length < 4 || selectedChannels.length > 0 || selectedTags.length > 0
                      ? 'Nenhuma conversa encontrada'
                      : 'Nenhuma conversa ainda'}
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
