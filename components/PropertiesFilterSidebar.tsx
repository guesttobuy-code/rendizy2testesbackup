/**
 * RENDIZY - Properties Filter Sidebar
 * 
 * Filtro lateral para gestão de imóveis
 * Segue padrão do PropertySidebar (calendário)
 * 
 * @version 1.0.103
 * @date 2025-10-28
 */

import React, { useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Building2, Home, MapPin } from 'lucide-react';

interface Property {
  id: string;
  internalName: string;
  publicName: string;
  type: 'location' | 'accommodation';
  structureType?: 'hotel' | 'house' | 'apartment' | 'condo';
  address?: {
    city: string;
    state: string;
    country: string;
  };
  status: 'active' | 'inactive' | 'draft';
  tags?: string[];
  accommodationsCount?: number; // Para Locations
  parentLocationId?: string; // Para Accommodations
}

interface PropertiesFilterSidebarProps {
  properties: Property[];
  selectedProperties: string[];
  onToggleProperty: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function PropertiesFilterSidebar({ 
  properties, 
  selectedProperties, 
  onToggleProperty,
  onSelectAll,
  onDeselectAll
}: PropertiesFilterSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Filtros
  const [selectedType, setSelectedType] = useState<'all' | 'location' | 'accommodation'>('all');
  const [selectedStructureTypes, setSelectedStructureTypes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  
  // Collapsible states
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isStructureTypeOpen, setIsStructureTypeOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);

  // Aplicar filtros
  const filteredProperties = properties.filter(property => {
    if (!property) return false;
    
    // Busca por nome ou cidade
    const matchesSearch = 
      (property.internalName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (property.publicName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (property.address?.city?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    // Filtro de tipo (Location vs Accommodation)
    const matchesType = selectedType === 'all' || property.type === selectedType;
    
    // Filtro de estrutura (hotel, casa, etc)
    const matchesStructureType = 
      selectedStructureTypes.length === 0 || 
      (property.structureType && selectedStructureTypes.includes(property.structureType));
    
    // Filtro de status
    const matchesStatus = 
      selectedStatus.length === 0 || 
      selectedStatus.includes(property.status);
    
    // Filtro de tags
    const matchesTags = 
      selectedTags.length === 0 || 
      (property.tags && property.tags.some(tag => selectedTags.includes(tag)));
    
    // Filtro de cidade
    const matchesCity = 
      selectedCity === 'all' || 
      property.address?.city === selectedCity;
    
    return matchesSearch && matchesType && matchesStructureType && matchesStatus && matchesTags && matchesCity;
  });

  // Extrair valores únicos para os filtros
  const allStructureTypes = Array.from(new Set(properties.filter(p => p?.structureType).map(p => p.structureType!)));
  const allTags = Array.from(new Set(properties.flatMap(p => p?.tags || [])));
  const allCities = Array.from(new Set(properties.filter(p => p?.address?.city).map(p => p.address!.city)));

  // Toggle de filtros individuais
  const toggleStructureType = (type: string) => {
    setSelectedStructureTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedStructureTypes([]);
    setSelectedStatus([]);
    setSelectedTags([]);
    setSelectedCity('all');
  };

  // Contagem de filtros ativos
  const activeFiltersCount = 
    (selectedType !== 'all' ? 1 : 0) +
    selectedStructureTypes.length +
    selectedStatus.length +
    selectedTags.length +
    (selectedCity !== 'all' ? 1 : 0);

  // Opções de estrutura
  const structureTypeOptions = [
    { value: 'hotel', label: 'Hotel/Pousada', icon: Building2 },
    { value: 'house', label: 'Casa', icon: Home },
    { value: 'apartment', label: 'Apartamento', icon: Building2 },
    { value: 'condo', label: 'Condomínio', icon: Building2 }
  ];

  // Opções de status
  const statusOptions = [
    { value: 'active', label: 'Ativo', color: 'text-green-600' },
    { value: 'inactive', label: 'Inativo', color: 'text-gray-600' },
    { value: 'draft', label: 'Rascunho', color: 'text-yellow-600' }
  ];

  // Tags pré-definidas
  const tagsOptions = [
    { value: 'Praia', label: 'Praia', colorClass: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'Montanha', label: 'Montanha', colorClass: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'Cidade', label: 'Cidade', colorClass: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: 'Luxo', label: 'Luxo', colorClass: 'bg-pink-100 text-pink-700 border-pink-300' },
    { value: 'Pet Friendly', label: 'Pet Friendly', colorClass: 'bg-orange-100 text-orange-700 border-orange-300' }
  ];

  const selectedPropertiesData = filteredProperties.filter(p => p && selectedProperties.includes(p.id));

  return (
    <div className={`border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full self-start sticky top-0 transition-all duration-300 relative ${isCollapsed ? 'w-12' : 'w-80'} overflow-hidden`}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group"
        title={isCollapsed ? 'Expandir painel' : 'Minimizar painel'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
        )}
      </button>

      {/* Header - Fixo */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <h2 className="text-gray-900 dark:text-gray-100 mb-3">Filtros</h2>
        
        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar imóveis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Limpar filtros */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="w-full mt-2 text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="p-4 space-y-4">
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="space-y-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              
              {/* Tipo (Location vs Accommodation) */}
              <Collapsible open={isTypeOpen} onOpenChange={setIsTypeOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
                  <span>Tipo</span>
                  {isTypeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="all"
                        checked={selectedType === 'all'}
                        onChange={() => setSelectedType('all')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Todos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="location"
                        checked={selectedType === 'location'}
                        onChange={() => setSelectedType('location')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        Locais (Multi-Unidades)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value="accommodation"
                        checked={selectedType === 'accommodation'}
                        onChange={() => setSelectedType('accommodation')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Home className="h-4 w-4 text-emerald-600" />
                        Acomodações Individuais
                      </span>
                    </label>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Estrutura */}
              {allStructureTypes.length > 0 && (
                <Collapsible open={isStructureTypeOpen} onOpenChange={setIsStructureTypeOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
                    <span>Estrutura</span>
                    {isStructureTypeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {structureTypeOptions.map(option => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedStructureTypes.includes(option.value)}
                          onCheckedChange={() => toggleStructureType(option.value)}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <option.icon className="h-4 w-4 text-gray-500" />
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Status */}
              <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
                  <span>Status</span>
                  {isStatusOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {statusOptions.map(status => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedStatus.includes(status.value)}
                        onCheckedChange={() => toggleStatus(status.value)}
                      />
                      <span className={`text-sm ${status.color}`}>
                        {status.label}
                      </span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Cidade */}
              {allCities.length > 0 && (
                <Collapsible open={isCityOpen} onOpenChange={setIsCityOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
                    <span>Cidade</span>
                    {isCityOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as cidades</SelectItem>
                        {allCities.map(city => (
                          <SelectItem key={city} value={city}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              {city}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Tags */}
              {allTags.length > 0 && (
                <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
                    <span>Tags</span>
                    {isTagsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {tagsOptions.map(tag => (
                      <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedTags.includes(tag.value)}
                          onCheckedChange={() => toggleTag(tag.value)}
                        />
                        <Badge className={tag.colorClass}>
                          {tag.label}
                        </Badge>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Properties List */}
          <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300">
              <span>
                Imóveis ({filteredProperties.length})
              </span>
              {isPropertiesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {/* Select/Deselect All */}
              <div className="flex gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAll}
                  className="flex-1 text-xs"
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeselectAll}
                  className="flex-1 text-xs"
                >
                  Limpar
                </Button>
              </div>

              {/* Properties */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProperties.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhum imóvel encontrado
                  </p>
                ) : (
                  filteredProperties.map((property) => (
                    <label
                      key={property.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => onToggleProperty(property.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {property.type === 'location' ? (
                            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Home className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">
                            {property.internalName || property.publicName}
                          </span>
                        </div>
                        {property.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {property.address.city}, {property.address.state}
                          </p>
                        )}
                        {property.type === 'location' && property.accommodationsCount !== undefined && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            {property.accommodationsCount} acomodações
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Summary */}
          {selectedPropertiesData.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedPropertiesData.length}
                </span>{' '}
                {selectedPropertiesData.length === 1 ? 'imóvel selecionado' : 'imóveis selecionados'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
