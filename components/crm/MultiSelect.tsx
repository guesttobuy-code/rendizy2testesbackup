import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, Check, Loader2, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

export interface MultiSelectOption {
  id: string;
  label: string;
  description?: string;
  avatar?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  maxDisplay?: number; // Máximo de itens a exibir antes de mostrar "+N"
  onSearch?: (query: string) => void; // Callback para busca avançada
  loading?: boolean; // Estado de carregamento
  minSearchLength?: number; // Tamanho mínimo para buscar (padrão: 0)
  debounceMs?: number; // Debounce para busca (padrão: 300ms)
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum item encontrado',
  className,
  disabled = false,
  maxDisplay = 2,
  onSearch,
  loading = false,
  minSearchLength = 0,
  debounceMs = 300,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setLocalSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce para busca avançada
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (onSearch && localSearchQuery.length >= minSearchLength) {
      debounceTimerRef.current = setTimeout(() => {
        onSearch(localSearchQuery);
      }, debounceMs);
    } else if (onSearch && localSearchQuery.length === 0) {
      // Limpar busca quando campo estiver vazio
      debounceTimerRef.current = setTimeout(() => {
        onSearch('');
      }, debounceMs);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localSearchQuery, onSearch, minSearchLength, debounceMs]);

  // Filtrar opções localmente (se não houver callback de busca)
  const filteredOptions = onSearch 
    ? options // Se houver callback, mostrar todas as opções retornadas pela API
    : options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.metadata && Object.values(option.metadata).some(val => 
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );

  const selectedOptions = options.filter(option => selected.includes(option.id));
  const displayItems = selectedOptions.slice(0, maxDisplay);
  const remainingCount = selectedOptions.length - maxDisplay;

  const handleToggle = (optionId: string) => {
    if (selected.includes(optionId)) {
      onChange(selected.filter(id => id !== optionId));
    } else {
      onChange([...selected, optionId]);
    }
  };

  const handleRemove = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(id => id !== optionId));
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-between text-left font-normal',
          !selected.length && 'text-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {displayItems.map(option => (
                <div
                  key={option.id}
                  className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded text-xs"
                >
                  {option.avatar && (
                    <img src={option.avatar} alt="" className="w-4 h-4 rounded-full" />
                  )}
                  <span className="truncate max-w-[100px]">{option.label}</span>
                  {!disabled && (
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemove(option.id, e)}
                    />
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-muted-foreground">+{remainingCount}</span>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 opacity-50', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Busca Avançada */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={onSearch ? localSearchQuery : searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  if (onSearch) {
                    setLocalSearchQuery(value);
                  } else {
                    setSearchQuery(value);
                  }
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
            {onSearch && localSearchQuery.length > 0 && localSearchQuery.length < minSearchLength && (
              <p className="text-xs text-muted-foreground mt-1 px-1">
                Digite pelo menos {minSearchLength} caracteres para buscar
              </p>
            )}
          </div>

          {/* Lista de opções */}
          <div className="p-1">
            {loading && filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selected.includes(option.id);
                return (
                  <div
                    key={option.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                      isSelected && 'bg-primary/10'
                    )}
                    onClick={() => handleToggle(option.id)}
                  >
                    <div className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center',
                      isSelected && 'bg-primary border-primary'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {option.avatar && (
                      <img src={option.avatar} alt="" className="w-6 h-6 rounded-full" />
                    )}
                    {option.icon && <div className="w-6 h-6">{option.icon}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

