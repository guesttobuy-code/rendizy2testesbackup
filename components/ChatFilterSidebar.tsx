import React, { useState } from 'react';
import { Property } from '../App';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Search, ChevronDown, X, Home, MessageSquare, Tag, Calendar, Circle, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { ChatTag } from './ChatTagsModal';

interface ChatFilterSidebarProps {
  properties: Property[];
  selectedProperties: string[];
  onToggleProperty: (id: string) => void;
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
}

export function ChatFilterSidebar({ 
  properties, 
  selectedProperties, 
  onToggleProperty,
  dateRange,
  onDateRangeChange,
  selectedStatuses,
  onStatusesChange,
  selectedChannels,
  onChannelsChange,
  selectedTags,
  onTagsChange,
  chatTags,
  onManageTags
}: ChatFilterSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Collapsible states
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isChannelOpen, setIsChannelOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  // Garantir que properties seja sempre um array
  const safeProperties = Array.isArray(properties) ? properties : [];

  const filteredProperties = safeProperties.filter(property => {
    if (!property) return false;
    
    const matchesSearch = (property.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (property.location?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const selectAll = () => {
    filteredProperties.forEach(p => {
      if (!selectedProperties.includes(p.id)) {
        onToggleProperty(p.id);
      }
    });
  };

  const deselectAll = () => {
    filteredProperties.forEach(p => {
      if (selectedProperties.includes(p.id)) {
        onToggleProperty(p.id);
      }
    });
  };

  const statusOptions = [
    { value: 'unread', label: 'Não lidas', color: 'text-red-600' },
    { value: 'read', label: 'Lidas', color: 'text-gray-600' },
    { value: 'active', label: 'Ativas', color: 'text-blue-600' },
    { value: 'resolved', label: 'Resolvidas', color: 'text-green-600' }
  ];

  const channelOptions = [
    { value: 'email', label: 'Email', color: 'text-blue-600', icon: Mail },
    { value: 'whatsapp', label: 'WhatsApp', color: 'text-green-600', icon: Phone },
    { value: 'system', label: 'Sistema', color: 'text-gray-600', icon: MessageSquare }
  ];

  const selectedPropertiesData = safeProperties.filter(p => p && selectedProperties.includes(p.id));

  // Conta filtros ativos
  const activeFiltersCount = 
    (selectedStatuses.length < 4 ? 1 : 0) + 
    (selectedChannels.length > 0 && selectedChannels.length < 3 ? 1 : 0) + 
    (selectedProperties.length > 0 && selectedProperties.length < safeProperties.length ? 1 : 0) +
    (selectedTags.length > 0 ? 1 : 0) +
    (searchQuery !== '' ? 1 : 0);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <div
      className={`border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full transition-all duration-300 ${
        isCollapsed ? 'px-2 py-4 items-center' : 'p-4'
      }`}
      style={{ width: isCollapsed ? '56px' : undefined, minWidth: isCollapsed ? '56px' : '280px' }}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-3 gap-2`}>
        {!isCollapsed && <h2 className="text-gray-900 dark:text-white">Filtros</h2>}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expandir filtros' : 'Recolher filtros'}
          className="relative flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isCollapsed && activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] leading-none px-1 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {isCollapsed ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 -rotate-90 whitespace-nowrap">
            Filtros
          </span>
        </div>
      ) : (
        <React.Fragment>
          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              Filtros Avançados
              {activeFiltersCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </span>
            {showFilters ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Filters - Área Scrollável */}
          {showFilters && (
            <div className="mt-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              
              {/* Propriedades - Collapsible */}
              <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1 text-left">
                        <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">
                          <span className="flex items-center gap-2">
                            <Home className="h-3.5 w-3.5" />
                            Propriedades
                          </span>
                        </Label>
                        
                        {/* Preview quando fechado */}
                        {!isPropertiesOpen && (selectedProperties.length > 0 && selectedProperties.length < safeProperties.length) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedPropertiesData.slice(0, 3).map(prop => (
                              <Badge 
                                key={prop.id} 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0 flex items-center gap-1"
                              >
                                {(prop.name || 'Sem nome').length > 12 ? (prop.name || 'Sem nome').substring(0, 12) + '...' : (prop.name || 'Sem nome')}
                                <X 
                                  className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleProperty(prop.id);
                                  }}
                                />
                              </Badge>
                            ))}
                            {selectedPropertiesData.length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                +{selectedPropertiesData.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {!isPropertiesOpen && selectedProperties.length === safeProperties.length && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">Todas selecionadas</span>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPropertiesOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                      {/* Busca */}
                      <div className="relative mb-3 mt-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar propriedades..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs"
                        />
                      </div>

                      {/* Controles de Seleção */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-600 dark:text-gray-400">
                          {selectedProperties.length} de {filteredProperties.length} selecionadas
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
                            disabled={filteredProperties.every(p => !selectedProperties.includes(p.id))}
                            className="h-6 px-2 text-[10px]"
                          >
                            Nenhuma
                          </Button>
                        </div>
                      </div>

                      {/* Lista de Propriedades */}
                      <div className="max-h-[250px] overflow-y-auto space-y-1.5">
                        {filteredProperties.length === 0 ? (
                      <div className="py-6 text-center text-gray-400 dark:text-gray-500 text-[10px]">
                        Nenhuma propriedade encontrada
                      </div>
                    ) : (
                      filteredProperties.map(property => (
                        <label
                          key={property.id}
                          className={`
                            flex items-center gap-2 p-2 rounded cursor-pointer
                            transition-colors hover:bg-gray-50 dark:hover:bg-gray-800
                            ${selectedProperties.includes(property.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                          `}
                        >
                          <Checkbox
                            checked={selectedProperties.includes(property.id)}
                            onCheckedChange={() => onToggleProperty(property.id)}
                          />
                          <span className="text-[11px] text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                            {property.name || 'Sem nome'}
                          </span>
                          {selectedProperties.includes(property.id) && (
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

          {/* Status - Collapsible */}
          <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
              <CollapsibleTrigger asChild>
                <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 text-left">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">Status</Label>
                    
                    {/* Preview quando fechado */}
                    {!isStatusOpen && selectedStatuses.length < 3 && selectedStatuses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {statusOptions
                          .filter(opt => selectedStatuses.includes(opt.value))
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
                                  onStatusesChange(selectedStatuses.filter(s => s !== opt.value));
                                }}
                              />
                            </Badge>
                          ))}
                      </div>
                    )}
                    {!isStatusOpen && (selectedStatuses.length === 0 || selectedStatuses.length === 4) && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Todos</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-2 mt-3">
                    {statusOptions.map(status => (
                      <label 
                        key={status.value} 
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded transition-colors"
                      >
                        <Checkbox
                          checked={selectedStatuses.includes(status.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onStatusesChange([...selectedStatuses, status.value]);
                            } else {
                              onStatusesChange(selectedStatuses.filter(s => s !== status.value));
                            }
                          }}
                        />
                        <Circle className={`h-2 w-2 fill-current ${status.color}`} />
                        <span className={`text-xs ${status.color}`}>
                          {status.label}
                        </span>
                        {selectedStatuses.includes(status.value) && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Canal - Collapsible */}
          <Collapsible open={isChannelOpen} onOpenChange={setIsChannelOpen}>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
              <CollapsibleTrigger asChild>
                <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 text-left">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">Canal</Label>
                    
                    {/* Preview quando fechado */}
                    {!isChannelOpen && selectedChannels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {channelOptions
                          .filter(opt => selectedChannels.includes(opt.value))
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
                                  onChannelsChange(selectedChannels.filter(c => c !== opt.value));
                                }}
                              />
                            </Badge>
                          ))}
                      </div>
                    )}
                    {!isChannelOpen && selectedChannels.length === 0 && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Todos</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isChannelOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-2 mt-3">
                    {channelOptions.map(channel => {
                      const IconComponent = channel.icon;
                      return (
                        <label 
                          key={channel.value} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={selectedChannels.includes(channel.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onChannelsChange([...selectedChannels, channel.value]);
                              } else {
                                onChannelsChange(selectedChannels.filter(c => c !== channel.value));
                              }
                            }}
                          />
                          <IconComponent className={`h-4 w-4 ${channel.color}`} />
                          <span className={`text-xs ${channel.color}`}>
                            {channel.label}
                          </span>
                          {selectedChannels.includes(channel.value) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Tags - Collapsible */}
          <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
              <CollapsibleTrigger asChild>
                <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 text-left">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5" />
                        Tags
                      </span>
                    </Label>
                    
                    {/* Preview quando fechado */}
                    {!isTagsOpen && selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chatTags
                          .filter(tag => selectedTags.includes(tag.id))
                          .slice(0, 3)
                          .map(tag => (
                            <Badge 
                              key={tag.id} 
                              className={`text-[10px] px-1.5 py-0 border ${tag.color} flex items-center gap-1`}
                              variant="outline"
                            >
                              {tag.name.length > 10 ? tag.name.substring(0, 10) + '...' : tag.name}
                              <X 
                                className="h-2.5 w-2.5 cursor-pointer hover:opacity-70" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTagsChange(selectedTags.filter(t => t !== tag.id));
                                }}
                              />
                            </Badge>
                          ))}
                        {selectedTags.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{selectedTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    {!isTagsOpen && selectedTags.length === 0 && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Todas</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isTagsOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-2 mt-3">
                    {chatTags.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        Nenhuma tag criada
                      </div>
                    ) : (
                      chatTags.map(tag => (
                        <label 
                          key={tag.id} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded transition-colors"
                        >
                          <Checkbox
                            checked={selectedTags.includes(tag.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onTagsChange([...selectedTags, tag.id]);
                              } else {
                                onTagsChange(selectedTags.filter(t => t !== tag.id));
                              }
                            }}
                          />
                          <Badge className={`text-xs border ${tag.color}`} variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag.name}
                          </Badge>
                          {selectedTags.includes(tag.id) && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </label>
                      ))
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 h-8 text-xs"
                      onClick={onManageTags}
                    >
                      <Tag className="h-3.5 w-3.5 mr-2" />
                      Gerenciar Tags
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Período - Collapsible */}
          <Collapsible open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
              <CollapsibleTrigger asChild>
                <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 text-left">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Período Específico
                      </span>
                    </Label>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                  <div className="mt-3">
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={onDateRangeChange}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Botão Limpar Filtros */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                onStatusesChange(['unread', 'read', 'active', 'resolved']);
                onChannelsChange([]);
                onTagsChange([]);
                // Selecionar todas as propriedades
                safeProperties.forEach(p => {
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
        </React.Fragment>
      )}
    </div>
  );
}
