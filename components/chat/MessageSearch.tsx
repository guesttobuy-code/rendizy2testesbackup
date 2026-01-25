/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       MESSAGE SEARCH COMPONENT                             ║
 * ║                                                                            ║
 * ║  🎯 PHASE 3.9 - Busca de Mensagens                                        ║
 * ║  📱 Busca local nas mensagens carregadas                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para buscar mensagens em uma conversa.
 * Suporta busca local (cliente) e navegação entre resultados.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface SearchableMessage {
  id: string;
  text: string;
  timestamp: Date;
  fromMe: boolean;
}

export interface MessageSearchProps {
  /** Lista de mensagens para buscar */
  messages: SearchableMessage[];
  /** Callback quando resultado é selecionado (scroll to) */
  onResultSelect?: (messageId: string) => void;
  /** Callback quando busca muda (highlight) */
  onSearchChange?: (query: string, resultIds: string[]) => void;
  /** Classes adicionais */
  className?: string;
}

export interface UseMessageSearchOptions {
  /** Lista de mensagens */
  messages: SearchableMessage[];
  /** Callback quando resultado muda */
  onCurrentResultChange?: (messageId: string | null) => void;
}

export interface UseMessageSearchReturn {
  /** Query de busca atual */
  query: string;
  /** Definir query */
  setQuery: (q: string) => void;
  /** IDs das mensagens que batem com a busca */
  results: string[];
  /** Índice do resultado atual */
  currentIndex: number;
  /** ID do resultado atual */
  currentResultId: string | null;
  /** Ir para próximo resultado */
  nextResult: () => void;
  /** Ir para resultado anterior */
  previousResult: () => void;
  /** Limpar busca */
  clear: () => void;
  /** Se está buscando */
  isSearching: boolean;
}

// ============================================
// HOOK: useMessageSearch
// ============================================

export function useMessageSearch({
  messages,
  onCurrentResultChange
}: UseMessageSearchOptions): UseMessageSearchReturn {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Memoize search results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    setIsSearching(true);
    const normalizedQuery = query.toLowerCase().trim();
    
    const matchedIds = messages
      .filter(msg => msg.text?.toLowerCase().includes(normalizedQuery))
      .map(msg => msg.id);
    
    setIsSearching(false);
    return matchedIds;
  }, [query, messages]);

  // Reset index when results change
  useEffect(() => {
    setCurrentIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  // Current result ID
  const currentResultId = useMemo(() => {
    return results[currentIndex] ?? null;
  }, [results, currentIndex]);

  // Notify parent when current result changes
  useEffect(() => {
    onCurrentResultChange?.(currentResultId);
  }, [currentResultId, onCurrentResultChange]);

  const nextResult = useCallback(() => {
    if (results.length === 0) return;
    setCurrentIndex(i => (i + 1) % results.length);
  }, [results.length]);

  const previousResult = useCallback(() => {
    if (results.length === 0) return;
    setCurrentIndex(i => (i - 1 + results.length) % results.length);
  }, [results.length]);

  const clear = useCallback(() => {
    setQuery('');
    setCurrentIndex(0);
  }, []);

  return {
    query,
    setQuery,
    results,
    currentIndex,
    currentResultId,
    nextResult,
    previousResult,
    clear,
    isSearching
  };
}

// ============================================
// COMPONENT
// ============================================

export function MessageSearch({
  messages,
  onResultSelect,
  onSearchChange,
  className
}: MessageSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    query,
    setQuery,
    results,
    currentIndex,
    // currentResultId is used via onCurrentResultChange callback
    nextResult,
    previousResult,
    clear,
    isSearching
  } = useMessageSearch({
    messages,
    onCurrentResultChange: (id) => {
      if (id) onResultSelect?.(id);
    }
  });

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange?.(query, results);
  }, [query, results, onSearchChange]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExpanded) {
        // Ctrl+F to open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          setIsExpanded(true);
        }
      } else {
        // Escape to close
        if (e.key === 'Escape') {
          handleClose();
        }
        // Enter for next result
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            previousResult();
          } else {
            nextResult();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, nextResult, previousResult]);

  const handleClose = () => {
    clear();
    setIsExpanded(false);
  };

  // Collapsed state - just search icon
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-full',
          'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
          'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
          className
        )}
        title="Buscar mensagens (Ctrl+F)"
      >
        <Search className="w-4 h-4" />
      </button>
    );
  }

  // Expanded state - search bar
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
        className
      )}
    >
      {/* Search Icon */}
      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar na conversa..."
        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
      />

      {/* Loading */}
      {isSearching && (
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      )}

      {/* Results count */}
      {query && !isSearching && (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {results.length > 0 
            ? `${currentIndex + 1}/${results.length}`
            : 'Nenhum'
          }
        </span>
      )}

      {/* Navigation buttons */}
      {results.length > 0 && (
        <>
          <button
            onClick={previousResult}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Resultado anterior (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={nextResult}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Próximo resultado (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Fechar (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// HIGHLIGHT HELPER
// ============================================

/**
 * Destaca a parte do texto que bate com a query
 */
export function highlightSearchMatch(
  text: string,
  query: string,
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-800 rounded px-0.5'
): React.ReactNode {
  if (!query.trim() || !text) return text;

  const normalizedQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = text.toLowerCase().indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    // Texto antes do match
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    // O match destacado
    parts.push(
      <mark key={matchIndex} className={highlightClassName}>
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>
    );

    lastIndex = matchIndex + query.length;
    matchIndex = text.toLowerCase().indexOf(normalizedQuery, lastIndex);
  }

  // Texto restante após último match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

export default MessageSearch;
