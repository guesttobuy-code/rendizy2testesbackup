import React, { useState, useEffect, useCallback } from 'react';
import { MultiSelect, MultiSelectOption } from './MultiSelect';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { automationsApi, type Automation } from '../../utils/api';
import { toast } from 'sonner';

interface AutomationSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AutomationSelector({
  selected,
  onChange,
  placeholder = 'Selecione automação(ões)...',
  className,
  disabled = false,
}: AutomationSelectorProps) {
  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = useCallback(async (search?: string) => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await automationsApi.list();
      if (response.success && response.data) {
        // Filtrar por busca se fornecida
        let filteredData = response.data;
        if (search) {
          filteredData = response.data.filter(automation =>
            automation.name.toLowerCase().includes(search.toLowerCase()) ||
            automation.description?.toLowerCase().includes(search.toLowerCase()) ||
            automation.definition?.description?.toLowerCase().includes(search.toLowerCase())
          );
        }

        const selectOptions: MultiSelectOption[] = filteredData
          .filter(a => a.status === 'active') // Apenas automações ativas
          .map(automation => ({
            id: automation.id,
            label: automation.name,
            description: automation.description || automation.definition?.description || '',
            icon: <Zap className="w-4 h-4" />,
            metadata: { 
              automation,
              searchableText: `${automation.name} ${automation.description} ${automation.definition?.description}`.toLowerCase()
            },
          }));
        setOptions(selectOptions);
        setInitialLoad(false);
      } else {
        setError('Erro ao carregar automações');
        toast.error('Erro ao carregar automações. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar automações:', error);
      setError(error.message || 'Erro ao carregar automações');
      toast.error('Erro ao carregar automações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [initialLoad]);

  const handleSearch = useCallback((query: string) => {
    if (query.length >= 2 || query.length === 0) {
      loadAutomations(query || undefined);
    }
  }, [loadAutomations]);

  if (loading && initialLoad && options.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando automações...
        </div>
      </div>
    );
  }

  if (error && options.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <MultiSelect
      options={options}
      selected={selected}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Buscar por nome ou descrição..."
      emptyMessage={options.length === 0 ? "Nenhuma automação encontrada" : "Digite para buscar automações..."}
      className={className}
      disabled={disabled}
      onSearch={handleSearch}
      loading={loading && !initialLoad}
      minSearchLength={2}
    />
  );
}

