import React, { useState, useEffect, useCallback } from 'react';
import { MultiSelect, MultiSelectOption } from './MultiSelect';
import { Home, Building2, Loader2, AlertCircle } from 'lucide-react';
import { propertiesApi, type Property } from '../../utils/api';
import { toast } from 'sonner';

interface PropertySelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowMultiple?: boolean; // Se false, permite apenas 1 imóvel
}

export function PropertySelector({
  selected,
  onChange,
  placeholder = 'Selecione imóvel(is)...',
  className,
  disabled = false,
  allowMultiple = true,
}: PropertySelectorProps) {
  const [options, setOptions] = useState<MultiSelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = useCallback(async (search?: string) => {
    if (initialLoad) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await propertiesApi.list({
        search,
        status: 'active', // Apenas imóveis ativos
      });
      if (response.success && response.data) {
        const selectOptions: MultiSelectOption[] = response.data.map(property => ({
          id: property.id,
          label: property.name || property.code || `Imóvel ${property.id}`,
          description: property.address
            ? `${property.address.street}, ${property.address.number} - ${property.address.neighborhood}, ${property.address.city}`
            : property.code || '',
          icon: property.type === 'apartment' || property.type === 'studio' || property.type === 'loft' 
            ? <Building2 className="w-4 h-4" /> 
            : <Home className="w-4 h-4" />,
          metadata: { 
            property,
            searchableText: `${property.name} ${property.code} ${property.address?.street} ${property.address?.neighborhood} ${property.address?.city}`.toLowerCase()
          },
        }));
        setOptions(selectOptions);
        setInitialLoad(false);
      } else {
        setError('Erro ao carregar imóveis');
        toast.error('Erro ao carregar imóveis. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao carregar imóveis:', error);
      setError(error.message || 'Erro ao carregar imóveis');
      toast.error('Erro ao carregar imóveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [initialLoad]);

  const handleChange = (newSelected: string[]) => {
    if (!allowMultiple && newSelected.length > 1) {
      // Se não permite múltiplos, manter apenas o último selecionado
      onChange([newSelected[newSelected.length - 1]]);
    } else {
      onChange(newSelected);
    }
  };

  const handleSearch = useCallback((query: string) => {
    if (query.length >= 2 || query.length === 0) {
      loadProperties(query || undefined);
    }
  }, [loadProperties]);

  if (loading && initialLoad && options.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando imóveis...
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
      onChange={handleChange}
      placeholder={placeholder}
      searchPlaceholder="Buscar por nome, código ou endereço..."
      emptyMessage={options.length === 0 ? "Nenhum imóvel encontrado" : "Digite para buscar imóveis..."}
      className={className}
      disabled={disabled}
      maxDisplay={allowMultiple ? 2 : 1}
      onSearch={handleSearch}
      loading={loading && !initialLoad}
      minSearchLength={2}
    />
  );
}

