import React, { useEffect, useRef } from 'react';
import { Search, Calendar, User, Home, Clock } from 'lucide-react';
import { cn } from './ui/utils';

export interface SearchResult {
  type: 'reservation' | 'guest' | 'property' | 'recent';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  data?: any;
}

interface AdvancedSearchDropdownProps {
  isOpen: boolean;
  results: SearchResult[];
  query: string;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
  highlightedIndex: number;
}

export function AdvancedSearchDropdown({
  isOpen,
  results,
  query,
  onSelect,
  onClose,
  highlightedIndex
}: AdvancedSearchDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || results.length === 0) {
    return null;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reservation':
        return 'text-blue-600 bg-blue-50';
      case 'guest':
        return 'text-green-600 bg-green-50';
      case 'property':
        return 'text-purple-600 bg-purple-50';
      case 'recent':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reservation':
        return 'Reserva';
      case 'guest':
        return 'Hóspede';
      case 'property':
        return 'Imóvel';
      case 'recent':
        return 'Recente';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto"
    >
      {/* Header */}
      {query && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Search className="h-3 w-3" />
            <span>Resultados para "<span className="font-semibold text-gray-900">{query}</span>"</span>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="py-1">
        {results.map((result, index) => {
          const Icon = result.icon;
          const isHighlighted = index === highlightedIndex;
          const typeColor = getTypeColor(result.type);
          const typeLabel = getTypeLabel(result.type);

          return (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => onSelect(result)}
              className={cn(
                "w-full px-3 py-2.5 flex items-center gap-3 transition-colors text-left",
                isHighlighted 
                  ? "bg-blue-50" 
                  : "hover:bg-gray-50"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                typeColor
              )}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {result.title}
                  </span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    typeColor
                  )}>
                    {typeLabel}
                  </span>
                </div>
                {result.subtitle && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {result.subtitle}
                  </div>
                )}
              </div>

              {/* Arrow */}
              {isHighlighted && (
                <div className="text-blue-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Enter</kbd>
              selecionar
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">Esc</kbd>
            fechar
          </span>
        </div>
      </div>
    </div>
  );
}
