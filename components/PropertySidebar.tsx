import React, { useState } from 'react';
import { Property } from '../App';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, Link2, Check, Filter } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { useCalendar } from '../contexts/CalendarContext';
import { toast } from 'sonner';

/**
 * 🔗 URL SYNC - Componente de header com botões de compartilhar/resetar
 * Usa o CalendarContext para acessar funções de URL sync
 */
function UrlSyncHeader() {
  // Tenta usar o contexto, mas não falha se não estiver disponível
  // (para compatibilidade com uso fora do CalendarProvider)
  let contextAvailable = false;
  let hasActiveFilters = false;
  let hasPendingChanges = false;
  let urlCopied = false;
  let copyFilterUrl = () => { toast.info('Copie a URL manualmente'); };
  let resetAllFilters = () => {};
  let applyFilters = () => {};
  
  try {
    const calendar = useCalendar();
    contextAvailable = true;
    hasActiveFilters = calendar.hasActiveFilters;
    hasPendingChanges = calendar.hasPendingChanges;
    urlCopied = calendar.urlCopied;
    copyFilterUrl = () => {
      calendar.copyFilterUrl();
      toast.success('Link copiado! Compartilhe para manter os filtros.');
    };
    resetAllFilters = () => {
      calendar.resetAllFilters();
      toast.success('Filtros resetados');
    };
    applyFilters = () => {
      calendar.applyFilters();
      toast.success('Filtros aplicados!');
    };
  } catch {
    // Context não disponível - usa fallback silencioso
  }
  
  return (
    <div className="flex flex-col gap-2 mb-3 pr-8">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-900 dark:text-gray-100 font-medium">Propriedades</h2>
        {contextAvailable && (
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-7 px-2 text-xs text-gray-500 hover:text-red-600"
                title="Limpar todos os filtros"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={copyFilterUrl}
              className="h-7 px-2 text-xs text-gray-500 hover:text-purple-600"
              title="Copiar link com filtros"
            >
              {urlCopied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* 🔍 Botão BUSCAR - Aparece quando há alterações pendentes */}
      {contextAvailable && (
        <Button
          variant={hasPendingChanges ? 'default' : 'outline'}
          size="sm"
          onClick={applyFilters}
          className={`w-full ${hasPendingChanges ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse' : ''}`}
        >
          <Filter className="h-4 w-4 mr-2" />
          {hasPendingChanges ? 'Buscar (filtros alterados)' : 'Buscar'}
        </Button>
      )}
    </div>
  );
}

interface PropertySidebarProps {
  properties: Property[];
  selectedProperties: string[];
  onToggleProperty: (id: string) => void;
  onSetSelectedProperties?: (ids: string[]) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  selectedReservationTypes: string[];
  onReservationTypesChange: (types: string[]) => void;
  currentView: 'calendar' | 'list' | 'timeline';
  onViewChange: (view: 'calendar' | 'list' | 'timeline') => void;
}

export function PropertySidebar({ 
  properties, 
  selectedProperties: propSelectedProperties, 
  onToggleProperty,
  onSetSelectedProperties,
  dateRange: propDateRange,
  onDateRangeChange,
  selectedReservationTypes: propSelectedReservationTypes,
  onReservationTypesChange,
  currentView: propCurrentView,
  onViewChange
}: PropertySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTarifGroup, setSelectedTarifGroup] = useState<string>('all');
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Collapsible states
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isReservationTypesOpen, setIsReservationTypesOpen] = useState(false);
  const [isPropertyTypesOpen, setIsPropertyTypesOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);

  // ════════════════════════════════════════════════════════════════════════════
  // 🔗 USA DRAFT DO CONTEXTO (quando disponível) para mostrar alterações em tempo real
  // ════════════════════════════════════════════════════════════════════════════
  let selectedProperties = propSelectedProperties;
  let dateRange = propDateRange;
  let selectedReservationTypes = propSelectedReservationTypes;
  let currentView = propCurrentView;
  
  try {
    const calendar = useCalendar();
    // Usa draft para mostrar alterações em tempo real (antes de clicar "Buscar")
    selectedProperties = calendar.draftSelectedProperties.length > 0 
      ? calendar.draftSelectedProperties 
      : propSelectedProperties;
    dateRange = calendar.draftDateRange || propDateRange;
    selectedReservationTypes = calendar.draftReservationTypes || propSelectedReservationTypes;
    currentView = calendar.draftView || propCurrentView;
  } catch {
    // Context não disponível - usa props normalmente
  }

  const getPropertyLabel = (property: Property) =>
    property.internalId || property.name || 'Sem nome';

  const filteredProperties = properties.filter(property => {
    if (!property) return false;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      getPropertyLabel(property).toLowerCase().includes(query) ||
      (property.title?.toLowerCase() || '').includes(query) ||
      (property.location?.toLowerCase() || '').includes(query);
    const matchesTarifGroup = selectedTarifGroup === 'all' || property.tarifGroup === selectedTarifGroup;
    const matchesType = propertyTypes.length === 0 || propertyTypes.includes(property.type);
    const matchesTags = selectedTags.length === 0 || (property.tags && property.tags.some(tag => selectedTags.includes(tag)));
    return matchesSearch && matchesTarifGroup && matchesType && matchesTags;
  });

  const allTypes = Array.from(new Set(properties.filter(p => p?.type).map(p => p.type)));
  const allTarifGroups = Array.from(new Set(properties.filter(p => p?.tarifGroup).map(p => p.tarifGroup)));
  const allTags = Array.from(new Set(properties.flatMap(p => p?.tags || [])));

  // 🔑 Marcador especial para indicar "nenhum selecionado explicitamente"
  const NONE_MARKER = '__NONE__';

  const selectAll = () => {
    const idsToAdd = filteredProperties.map((p) => p.id);
    if (onSetSelectedProperties) {
      // Selecionar todas as propriedades filtradas
      const next = Array.from(new Set([...selectedProperties, ...idsToAdd]));
      onSetSelectedProperties(next);
    }
  };

  const deselectAll = () => {
    if (onSetSelectedProperties) {
      // 🔑 Usar NONE_MARKER para indicar explicitamente "nenhum selecionado"
      onSetSelectedProperties([NONE_MARKER]);
    }
  };

  // 🧠 SMART TOGGLE: Se TODAS estão selecionadas e clica em UMA, seleciona APENAS essa
  const handlePropertyToggle = (propertyId: string) => {
    // 🔑 Se está no estado "nenhum", qualquer toggle adiciona o item
    if (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) {
      if (onSetSelectedProperties) {
        onSetSelectedProperties([propertyId]);
      } else {
        onToggleProperty(propertyId);
      }
      return;
    }

    const allSelected = selectedProperties.length === properties.length;
    const isCurrentlySelected = selectedProperties.includes(propertyId);
    
    if (allSelected && !isCurrentlySelected) {
      // Caso impossível: todas selecionadas mas essa não está? Adiciona
      if (onSetSelectedProperties) {
        onSetSelectedProperties([...selectedProperties, propertyId]);
      } else {
        onToggleProperty(propertyId);
      }
    } else if (allSelected && isCurrentlySelected) {
      // SMART: Todas selecionadas e clicou em uma → quer APENAS essa
      if (onSetSelectedProperties) {
        onSetSelectedProperties([propertyId]);
      } else {
        // Fallback: toggle normal
        onToggleProperty(propertyId);
      }
    } else {
      // Comportamento normal: toggle individual
      if (onSetSelectedProperties) {
        if (isCurrentlySelected) {
          // Desmarcar - mas não permitir ficar com 0
          const next = selectedProperties.filter(id => id !== propertyId);
          if (next.length > 0) {
            onSetSelectedProperties(next);
          }
        } else {
          // Marcar
          onSetSelectedProperties([...selectedProperties, propertyId]);
        }
      } else {
        onToggleProperty(propertyId);
      }
    }
  };

  const reservationTypesOptions = [
    { value: 'pre-reserva', label: 'pré-reserva' },
    { value: 'reserva', label: 'reserva' },
    { value: 'contrato', label: 'contrato' },
    { value: 'bloqueado', label: 'bloqueado' },
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'cancelada', label: 'cancelada' }
  ];

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmada', color: 'text-green-600' },
    { value: 'pending', label: 'Pendente', color: 'text-yellow-600' },
    { value: 'blocked', label: 'Bloqueada', color: 'text-gray-600' },
    { value: 'maintenance', label: 'Manutenção', color: 'text-orange-600' }
  ];

  const platformOptions = [
    { value: 'airbnb', label: 'Airbnb', color: 'text-red-600' },
    { value: 'booking', label: 'Booking.com', color: 'text-blue-600' },
    { value: 'direct', label: 'Reserva Direta', color: 'text-green-600' },
    { value: 'decolar', label: 'Decolar', color: 'text-orange-600' }
  ];

  // Tags pré-definidas com cores (do TagsManagementModal)
  const tagsOptions = [
    { value: 'Praia', label: 'Praia', colorClass: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'Montanha', label: 'Montanha', colorClass: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'Cidade', label: 'Cidade', colorClass: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: 'Luxo', label: 'Luxo', colorClass: 'bg-pink-100 text-pink-700 border-pink-300' }
  ];

  const selectedPropertiesData = properties.filter(p => p && selectedProperties.includes(p.id));

  return (
    <div className={`border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full sticky top-0 transition-all duration-300 relative flex-shrink-0 ${isCollapsed ? 'w-12' : 'w-80'} overflow-hidden`}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 rounded-md transition-colors group"
        title={isCollapsed ? 'Expandir painel' : 'Minimizar painel'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
        )}
      </button>

      {/* Header - Fixo */}
      <div className={`p-4 border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* 🔗 URL SYNC - Header com botões */}
        <UrlSyncHeader />
        
        {/* Date Range Picker */}
        <div className="mb-3">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
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
            {(statusFilters.length > 0 || platformFilters.length > 0 || propertyTypes.length > 0 || selectedTags.length > 0 || selectedTarifGroup !== 'all' || searchQuery !== '' || selectedReservationTypes.length < 6 || (selectedProperties.length > 0 && selectedProperties.length < properties.length)) && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {
                  (statusFilters.length > 0 ? 1 : 0) + 
                  (platformFilters.length > 0 ? 1 : 0) + 
                  (propertyTypes.length > 0 ? 1 : 0) + 
                  (selectedTags.length > 0 ? 1 : 0) +
                  (selectedTarifGroup !== 'all' ? 1 : 0) +
                  (searchQuery !== '' || (selectedProperties.length > 0 && selectedProperties.length < properties.length) ? 1 : 0) +
                  (selectedReservationTypes.length < 6 ? 1 : 0)
                }
              </span>
            )}
          </span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Filters - Área Scrollável */}
        {showFilters && (
          <div className="mt-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            
            {/* Propriedades - Collapsible */}
            <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
              <div className="border border-gray-200 rounded-md bg-white">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Propriedades</Label>
                      {!isPropertiesOpen && (selectedProperties.length > 0 && selectedProperties.length < properties.length) && (
                        <div className="flex flex-wrap gap-1">
                          {selectedPropertiesData.slice(0, 3).map(prop => (
                            <Badge 
                              key={prop.id} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0"
                            >
                              {getPropertyLabel(prop).length > 15
                                ? getPropertyLabel(prop).substring(0, 15) + '...'
                                : getPropertyLabel(prop)}
                            </Badge>
                          ))}
                          {selectedPropertiesData.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{selectedPropertiesData.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {!isPropertiesOpen && selectedProperties.length === properties.length && !selectedProperties.includes(NONE_MARKER) && (
                        <span className="text-[10px] text-gray-500">Todas selecionadas</span>
                      )}
                      {/* 🔑 Mostrar "Nenhuma selecionada" quando NONE_MARKER */}
                      {!isPropertiesOpen && selectedProperties.includes(NONE_MARKER) && (
                        <span className="text-[10px] text-gray-500">Nenhuma selecionada</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPropertiesOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    {/* Busca */}
                    <div className="relative mb-3 mt-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Buscar por identificação interna..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

                    {/* Controles de Seleção */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                      <span className="text-[10px] text-gray-600">
                        {/* 🔑 Mostrar 0 se contém NONE_MARKER */}
                        {selectedProperties.includes(NONE_MARKER) ? 0 : selectedProperties.length} de {filteredProperties.length} selecionadas
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAll}
                          disabled={filteredProperties.every(p => selectedProperties.includes(p.id))}
                          className="h-6 px-2 text-[10px]"
                        >
                          Todas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={deselectAll}
                          // 🔑 Desabilitar se já está no estado NONE_MARKER
                          disabled={selectedProperties.includes(NONE_MARKER) || filteredProperties.every(p => !selectedProperties.includes(p.id))}
                          className="h-6 px-2 text-[10px]"
                        >
                          Nenhuma
                        </Button>
                      </div>
                    </div>

                    {/* Lista de Propriedades */}
                    <div className="max-h-[250px] overflow-y-auto space-y-1.5">
                      {filteredProperties.length === 0 ? (
                        <div className="py-6 text-center text-gray-400 text-[10px]">
                          Nenhuma propriedade encontrada
                        </div>
                      ) : (
                        filteredProperties.map(property => (
                          <label
                            key={property.id}
                            className={`
                              flex items-center gap-2 p-2 rounded cursor-pointer
                              transition-colors hover:bg-gray-50
                              ${selectedProperties.includes(property.id) && !selectedProperties.includes(NONE_MARKER) ? 'bg-blue-50' : ''}
                            `}
                          >
                            <Checkbox
                              checked={selectedProperties.includes(property.id) && !selectedProperties.includes(NONE_MARKER)}
                              onCheckedChange={() => handlePropertyToggle(property.id)}
                            />
                            <span className="text-[11px] text-gray-900 line-clamp-1 flex-1">
                              {getPropertyLabel(property)}
                            </span>
                            {selectedProperties.includes(property.id) && !selectedProperties.includes(NONE_MARKER) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Tags - Collapsible */}
            <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
              <div className="border border-gray-200 rounded-md bg-white">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Tags</Label>
                      {!isTagsOpen && selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tagsOptions
                            .filter(tag => selectedTags.includes(tag.value))
                            .map(tag => (
                              <Badge 
                                key={tag.value} 
                                className={`text-[10px] px-1.5 py-0 border ${tag.colorClass} flex items-center gap-1`}
                              >
                                {tag.label}
                                <X 
                                  className="h-2.5 w-2.5 cursor-pointer hover:opacity-70" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTags(selectedTags.filter(t => t !== tag.value));
                                  }}
                                />
                              </Badge>
                            ))}
                        </div>
                      )}
                      {!isTagsOpen && selectedTags.length === 0 && (
                        <span className="text-[10px] text-gray-500">Todas</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isTagsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {tagsOptions.map(tag => (
                        <label 
                          key={tag.value} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={selectedTags.includes(tag.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTags([...selectedTags, tag.value]);
                              } else {
                                setSelectedTags(selectedTags.filter(t => t !== tag.value));
                              }
                            }}
                          />
                          <Badge className={`text-xs border ${tag.colorClass}`}>
                            {tag.label}
                          </Badge>
                          {selectedTags.includes(tag.value) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Região Tarifária - mantém Select simples */}
            <div className="border border-gray-200 rounded-md bg-white p-3">
              <Label className="text-xs text-gray-600 mb-2 block">Região Tarifária</Label>
              <Select value={selectedTarifGroup} onValueChange={setSelectedTarifGroup}>
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Todas as Regiões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Regiões</SelectItem>
                  {allTarifGroups.map(group => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipos de Reservas/Bloqueios - Collapsible */}
            <Collapsible open={isReservationTypesOpen} onOpenChange={setIsReservationTypesOpen}>
              <div className="border border-gray-200 rounded-md bg-white">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Tipos de Reservas/Bloqueios</Label>
                      {!isReservationTypesOpen && selectedReservationTypes.length < 6 && (
                        <div className="flex flex-wrap gap-1">
                          {reservationTypesOptions
                            .filter(opt => selectedReservationTypes.includes(opt.value))
                            .map(opt => (
                              <Badge 
                                key={opt.value} 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0"
                              >
                                {opt.label}
                              </Badge>
                            ))}
                        </div>
                      )}
                      {!isReservationTypesOpen && selectedReservationTypes.length === 6 && (
                        <span className="text-[10px] text-gray-500">Todos</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isReservationTypesOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {reservationTypesOptions.map(type => (
                        <label 
                          key={type.value} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={selectedReservationTypes.includes(type.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onReservationTypesChange([...selectedReservationTypes, type.value]);
                              } else {
                                onReservationTypesChange(
                                  selectedReservationTypes.filter(t => t !== type.value)
                                );
                              }
                            }}
                          />
                          <span className="text-xs text-gray-700">
                            {type.label}
                          </span>
                          {selectedReservationTypes.includes(type.value) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Tipo de Imóvel - Collapsible */}
            <Collapsible open={isPropertyTypesOpen} onOpenChange={setIsPropertyTypesOpen}>
              <div className="border border-gray-200 rounded-md bg-white">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Tipo de Imóvel</Label>
                      {!isPropertyTypesOpen && propertyTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {propertyTypes.map(type => (
                            <Badge 
                              key={type} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 flex items-center gap-1"
                            >
                              {type}
                              <X 
                                className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPropertyTypes(propertyTypes.filter(t => t !== type));
                                }}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                      {!isPropertyTypesOpen && propertyTypes.length === 0 && (
                        <span className="text-[10px] text-gray-500">Todos</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPropertyTypesOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {allTypes.map(type => (
                        <label 
                          key={type} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={propertyTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPropertyTypes([...propertyTypes, type]);
                              } else {
                                setPropertyTypes(propertyTypes.filter(t => t !== type));
                              }
                            }}
                          />
                          <span className="text-xs text-gray-700">
                            {type}
                          </span>
                          {propertyTypes.includes(type) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Status - Collapsible */}
            <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
              <div className="border border-gray-200 rounded-md bg-white">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Status</Label>
                      {!isStatusOpen && statusFilters.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {statusOptions
                            .filter(opt => statusFilters.includes(opt.value))
                            .map(opt => (
                              <Badge 
                                key={opt.value} 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 flex items-center gap-1"
                              >
                                {opt.label}
                                <X 
                                  className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusFilters(statusFilters.filter(s => s !== opt.value));
                                  }}
                                />
                              </Badge>
                            ))}
                        </div>
                      )}
                      {!isStatusOpen && statusFilters.length === 0 && (
                        <span className="text-[10px] text-gray-500">Todos</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {statusOptions.map(status => (
                        <label 
                          key={status.value} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={statusFilters.includes(status.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setStatusFilters([...statusFilters, status.value]);
                              } else {
                                setStatusFilters(statusFilters.filter(s => s !== status.value));
                              }
                            }}
                          />
                          <span className={`text-xs ${status.color}`}>
                            {status.label}
                          </span>
                          {statusFilters.includes(status.value) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Plataforma origem da reserva - Collapsible */}
            <Collapsible open={isPlatformOpen} onOpenChange={setIsPlatformOpen}>
              <div className="border border-gray-200 rounded-md bg-white">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Plataforma origem da reserva</Label>
                      {!isPlatformOpen && platformFilters.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {platformOptions
                            .filter(opt => platformFilters.includes(opt.value))
                            .map(opt => (
                              <Badge 
                                key={opt.value} 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 flex items-center gap-1"
                              >
                                {opt.label}
                                <X 
                                  className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlatformFilters(platformFilters.filter(p => p !== opt.value));
                                  }}
                                />
                              </Badge>
                            ))}
                        </div>
                      )}
                      {!isPlatformOpen && platformFilters.length === 0 && (
                        <span className="text-[10px] text-gray-500">Todos</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPlatformOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    <div className="space-y-2 mt-3">
                      {platformOptions.map(platform => (
                        <label 
                          key={platform.value} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={platformFilters.includes(platform.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPlatformFilters([...platformFilters, platform.value]);
                              } else {
                                setPlatformFilters(platformFilters.filter(p => p !== platform.value));
                              }
                            }}
                          />
                          <span className={`text-xs ${platform.color}`}>
                            {platform.label}
                          </span>
                          {platformFilters.includes(platform.value) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Botão Limpar Filtros */}
            {(propertyTypes.length > 0 || statusFilters.length > 0 || platformFilters.length > 0 || selectedTags.length > 0 || selectedTarifGroup !== 'all' || searchQuery !== '' || selectedReservationTypes.length < 6 || (selectedProperties.length > 0 && selectedProperties.length < properties.length)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPropertyTypes([]);
                  setStatusFilters([]);
                  setPlatformFilters([]);
                  setSelectedTags([]);
                  setSelectedTarifGroup('all');
                  setSearchQuery('');
                  onReservationTypesChange([
                    'pre-reserva',
                    'reserva',
                    'contrato',
                    'bloqueado',
                    'manutencao',
                    'cancelada'
                  ]);
                  // Selecionar todas as propriedades ao limpar
                  properties.forEach(p => {
                    if (!selectedProperties.includes(p.id)) {
                      onToggleProperty(p.id);
                    }
                  });
                }}
                className="w-full mt-1"
              >
                Limpar todos os filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer - Fixo */}
      <div className={`p-4 border-t border-gray-200 bg-gray-50 mt-auto flex-shrink-0 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="text-xs text-gray-500 text-center">
          💡 Dica: Clique na linha de preço e arraste para editar
        </div>
      </div>
    </div>
  );
}
