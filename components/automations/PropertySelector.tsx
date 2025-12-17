import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, X, Building2, MapPin, Check } from 'lucide-react';
import { propertiesApi, type Property } from '../../utils/api';
import { Loader2 } from 'lucide-react';

interface PropertySelectorProps {
  selectedProperties: string[];
  onChange: (properties: string[]) => void;
}

export function PropertySelector({ selectedProperties, onChange }: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showGlobalOption, setShowGlobalOption] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      const response = await propertiesApi.list();
      if (response.success && response.data) {
        setProperties(response.data);
      }
    } catch (error) {
      console.error('[PropertySelector] Erro ao carregar propriedades', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Extrair cidades únicas
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    properties.forEach((prop) => {
      if (prop.address?.city) {
        citySet.add(prop.address.city);
      }
    });
    return Array.from(citySet).sort();
  }, [properties]);

  // Extrair tipos únicos
  const types = useMemo(() => {
    const typeSet = new Set<string>();
    properties.forEach((prop) => {
      if (prop.type) {
        typeSet.add(prop.type);
      }
    });
    return Array.from(typeSet).sort();
  }, [properties]);

  // Filtrar propriedades
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (prop) =>
          prop.name?.toLowerCase().includes(query) ||
          prop.code?.toLowerCase().includes(query) ||
          prop.address?.city?.toLowerCase().includes(query)
      );
    }

    // Filtro de cidade
    if (cityFilter) {
      filtered = filtered.filter((prop) => prop.address?.city === cityFilter);
    }

    // Filtro de tipo
    if (typeFilter) {
      filtered = filtered.filter((prop) => prop.type === typeFilter);
    }

    // Filtro de status
    if (statusFilter) {
      filtered = filtered.filter((prop) => prop.status === statusFilter);
    }

    return filtered;
  }, [properties, searchQuery, cityFilter, typeFilter, statusFilter]);

  const toggleProperty = (propertyId: string) => {
    if (selectedProperties.includes(propertyId)) {
      onChange(selectedProperties.filter((id) => id !== propertyId));
    } else {
      onChange([...selectedProperties, propertyId]);
    }
    setShowGlobalOption(false);
  };

  const handleGlobalToggle = () => {
    if (showGlobalOption) {
      setShowGlobalOption(false);
      onChange([]);
    } else {
      setShowGlobalOption(true);
      onChange([]);
    }
  };

  const removeProperty = (propertyId: string) => {
    onChange(selectedProperties.filter((id) => id !== propertyId));
  };

  const getProperty = (id: string) => properties.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      {/* Tags dos imóveis selecionados */}
      {selectedProperties.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedProperties.map((propertyId) => {
            const property = getProperty(propertyId);
            return (
              <Badge key={propertyId} variant="secondary" className="gap-1 pr-1">
                <Building2 className="h-3 w-3" />
                {property?.name || property?.code || propertyId}
                <button
                  onClick={() => removeProperty(propertyId)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {showGlobalOption && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Automação Global</span>
            <span className="text-xs text-muted-foreground">
              (Aplicada a todos os imóveis)
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0"
              onClick={() => setShowGlobalOption(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Imóveis ({showGlobalOption ? 'Global' : `${selectedProperties.length} selecionados`})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Opção Global */}
          <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed">
            <input
              type="checkbox"
              checked={showGlobalOption}
              onChange={handleGlobalToggle}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="flex-1 text-sm cursor-pointer" onClick={handleGlobalToggle}>
              Todos os imóveis (automação global)
            </label>
          </div>

          {!showGlobalOption && (
            <>
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar imóveis por nome ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-3 gap-2">
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as cidades</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os tipos</SelectItem>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de imóveis */}
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center p-8 text-sm text-muted-foreground">
                  Nenhum imóvel encontrado
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredProperties.map((property) => {
                    const isSelected = selectedProperties.includes(property.id);
                    return (
                      <div
                        key={property.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'bg-primary/5 border-primary/30' : ''
                        }`}
                        onClick={() => toggleProperty(property.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProperty(property.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {property.name || property.code || 'Sem nome'}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {property.address?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property.address.city}
                              </span>
                            )}
                            {property.type && (
                              <Badge variant="outline" className="text-xs">
                                {property.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

