/**
 * useChatFilters
 * 
 * Hook para gerenciar filtros e busca no chat
 * Extrai lógica de filtragem do ChatInbox
 * 
 * Projeto Fluência - Fase 3 - Task #17
 */

import { useState, useMemo } from 'react';
import { UnifiedConversation } from './useChatData';

interface ChatFiltersState {
  searchQuery: string;
  selectedStatuses: string[];
  selectedChannels: string[];
  selectedTags: string[];
  selectedProperties: string[];
  dateRange: { from: Date; to: Date };
}

interface UseChatFiltersReturn extends ChatFiltersState {
  setSearchQuery: (query: string) => void;
  setSelectedStatuses: (statuses: string[]) => void;
  setSelectedChannels: (channels: string[]) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedProperties: (properties: string[]) => void;
  setDateRange: (range: { from: Date; to: Date }) => void;
  filteredConversations: UnifiedConversation[];
  resetFilters: () => void;
}

/**
 * Normaliza número de telefone removendo caracteres especiais
 */
const normalizePhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';
  // Remove: +, espaços, parênteses, hífens, pontos
  return phone.replace(/[\s\+\-\(\)\.]/g, '');
};

/**
 * Hook para filtros e busca do chat
 */
export function useChatFilters(
  conversations: UnifiedConversation[]
): UseChatFiltersReturn {
  // Estados de filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'unread', 'read', 'active', 'resolved'
  ]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  // Filtragem
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      const normalizedQuery = normalizePhoneNumber(query);
      
      filtered = filtered.filter(c => {
        // Busca por nome
        if (c.name.toLowerCase().includes(query)) return true;
        
        // Busca por email
        if (c.email?.toLowerCase().includes(query)) return true;
        
        // Busca por código de reserva
        if (c.reservationCode?.toLowerCase().includes(query)) return true;
        
        // Busca por propriedade
        if (c.propertyName?.toLowerCase().includes(query)) return true;
        
        // Busca por última mensagem
        if (c.lastMessage?.toLowerCase().includes(query)) return true;
        
        // Busca por telefone (normalizado e original)
        if (c.phone) {
          const phoneLower = c.phone.toLowerCase();
          const phoneNormalized = normalizePhoneNumber(c.phone);
          
          // Busca no número original (com formatação)
          if (phoneLower.includes(query)) return true;
          
          // Busca no número normalizado (sem formatação)
          if (phoneNormalized.includes(normalizedQuery)) return true;
          
          // Busca reversa: se a query é um número, verifica se está contido no telefone normalizado
          if (normalizedQuery && phoneNormalized.includes(normalizedQuery)) return true;
        }
        
        return false;
      });
    }

    // Status
    if (selectedStatuses.length < 4) {
      filtered = filtered.filter(c => selectedStatuses.includes(c.status));
    }

    // Canais
    if (selectedChannels.length > 0) {
      filtered = filtered.filter(c => selectedChannels.includes(c.channel));
    }

    // Tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(c => 
        c.tags && c.tags.some(tag => selectedTags.includes(tag))
      );
    }

    // Propriedades
    if (selectedProperties.length > 0) {
      filtered = filtered.filter(c => 
        c.propertyId && selectedProperties.includes(c.propertyId)
      );
    }

    return filtered;
  }, [conversations, searchQuery, selectedStatuses, selectedChannels, selectedTags, selectedProperties]);

  // Reset todos os filtros
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatuses(['unread', 'read', 'active', 'resolved']);
    setSelectedChannels([]);
    setSelectedTags([]);
    setSelectedProperties([]);
    setDateRange({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    });
  };

  return {
    searchQuery,
    selectedStatuses,
    selectedChannels,
    selectedTags,
    selectedProperties,
    dateRange,
    setSearchQuery,
    setSelectedStatuses,
    setSelectedChannels,
    setSelectedTags,
    setSelectedProperties,
    setDateRange,
    filteredConversations,
    resetFilters
  };
}
