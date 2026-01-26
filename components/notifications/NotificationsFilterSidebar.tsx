/**
 * 🔔 RENDIZY - Notifications Filter Sidebar
 * v1.0.0 - 2026-01-25
 * 
 * Filtro lateral para notificações
 * Segue padrão do PropertySidebar (calendário)
 * 
 * @architecture ADR-008 - Componente isolado
 */

import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { DateRangePicker } from '../DateRangePicker';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronUp, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Bell,
  CalendarPlus,
  CalendarX,
  LogIn,
  LogOut,
  CircleDollarSign,
  MessageSquare,
  Star,
  Wrench,
  Settings,
  Zap,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  NotificationType, 
  NotificationPriority, 
  notificationTypeConfig,
  priorityConfig 
} from './types';

interface NotificationsFilterSidebarProps {
  // Filtros
  selectedTypes: NotificationType[];
  onTypesChange: (types: NotificationType[]) => void;
  selectedPriorities: NotificationPriority[];
  onPrioritiesChange: (priorities: NotificationPriority[]) => void;
  readStatus: 'all' | 'read' | 'unread';
  onReadStatusChange: (status: 'all' | 'read' | 'unread') => void;
  dateRange?: { from: Date; to: Date };
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Contagens
  totalCount: number;
  unreadCount: number;
  filteredCount: number;
  
  // Ações em lote
  onMarkAllRead?: () => void;
  onArchiveAll?: () => void;
  onClearFilters?: () => void;
}

export function NotificationsFilterSidebar({
  selectedTypes,
  onTypesChange,
  selectedPriorities,
  onPrioritiesChange,
  readStatus,
  onReadStatusChange,
  dateRange,
  onDateRangeChange,
  searchQuery,
  onSearchChange,
  totalCount,
  unreadCount,
  filteredCount,
  onMarkAllRead,
  onArchiveAll,
  onClearFilters
}: NotificationsFilterSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Estados dos collapsibles
  const [isTypesOpen, setIsTypesOpen] = useState(true);
  const [isPrioritiesOpen, setIsPrioritiesOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Tipos de notificação agrupados
  const typeGroups = {
    reservas: ['reservation_new', 'reservation_update', 'reservation_cancel', 'checkin_today', 'checkout_today'] as NotificationType[],
    pagamentos: ['payment_received', 'payment_pending'] as NotificationType[],
    comunicacao: ['message_received', 'review_received'] as NotificationType[],
    sistema: ['maintenance_alert', 'system_update', 'automation_triggered', 'sync_complete', 'sync_error', 'general'] as NotificationType[]
  };

  const toggleType = (type: NotificationType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const togglePriority = (priority: NotificationPriority) => {
    if (selectedPriorities.includes(priority)) {
      onPrioritiesChange(selectedPriorities.filter(p => p !== priority));
    } else {
      onPrioritiesChange([...selectedPriorities, priority]);
    }
  };

  const selectAllTypes = () => {
    const allTypes = Object.values(typeGroups).flat();
    onTypesChange(allTypes);
  };

  const deselectAllTypes = () => {
    onTypesChange([]);
  };

  // Contagem de filtros ativos
  const activeFiltersCount = 
    (selectedTypes.length < Object.values(typeGroups).flat().length ? 1 : 0) +
    (selectedPriorities.length > 0 && selectedPriorities.length < 4 ? 1 : 0) +
    (readStatus !== 'all' ? 1 : 0) +
    (dateRange ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const getIconForType = (type: NotificationType) => {
    const iconMap: Record<string, any> = {
      CalendarPlus, CalendarX, LogIn, LogOut, CircleDollarSign,
      MessageSquare, Star, Wrench, Settings, Zap, RefreshCw, AlertTriangle, Clock, Bell
    };
    const iconName = notificationTypeConfig[type]?.icon || 'Bell';
    return iconMap[iconName] || Bell;
  };

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

      {/* Header */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-3 pr-8">
          <h2 className="text-gray-900 dark:text-gray-100 font-medium">Notificações</h2>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {unreadCount} não lidas
            </Badge>
          )}
        </div>

        {/* Resumo */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>{filteredCount} de {totalCount} notificações</span>
        </div>

        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar notificações..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Toggle Filtros */}
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
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {activeFiltersCount}
              </Badge>
            )}
          </span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Ações em Lote */}
        <div className="flex gap-2 mt-3">
          {onMarkAllRead && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
              className="flex-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Marcar todas como lidas
            </Button>
          )}
          {onClearFilters && activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="flex-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {showFilters && (
          <div className="p-4 space-y-3">
            
            {/* Status de Leitura */}
            <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">Status</Label>
                      {!isStatusOpen && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {readStatus === 'all' ? 'Todas' : readStatus === 'read' ? 'Lidas' : 'Não lidas'}
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    {(['all', 'unread', 'read'] as const).map((status) => (
                      <label
                        key={status}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${readStatus === status ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      >
                        <input
                          type="radio"
                          name="readStatus"
                          value={status}
                          checked={readStatus === status}
                          onChange={() => onReadStatusChange(status)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {status === 'all' ? 'Todas' : status === 'read' ? 'Lidas' : 'Não lidas'}
                        </span>
                        {status === 'unread' && unreadCount > 0 && (
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {unreadCount}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Tipos de Notificação */}
            <Collapsible open={isTypesOpen} onOpenChange={setIsTypesOpen}>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">Tipos</Label>
                      {!isTypesOpen && selectedTypes.length < Object.values(typeGroups).flat().length && (
                        <div className="flex flex-wrap gap-1">
                          {selectedTypes.slice(0, 3).map(type => (
                            <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {notificationTypeConfig[type]?.label || type}
                            </Badge>
                          ))}
                          {selectedTypes.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{selectedTypes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {!isTypesOpen && selectedTypes.length === Object.values(typeGroups).flat().length && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Todos os tipos</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isTypesOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700">
                    {/* Controles de Seleção */}
                    <div className="flex items-center justify-end gap-1 mb-2 pt-2">
                      <Button variant="ghost" size="sm" onClick={selectAllTypes} className="h-6 px-2 text-[10px]">
                        Todos
                      </Button>
                      <Button variant="ghost" size="sm" onClick={deselectAllTypes} className="h-6 px-2 text-[10px]">
                        Nenhum
                      </Button>
                    </div>

                    {/* Grupos de Tipos */}
                    <div className="space-y-3">
                      {/* Reservas */}
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Reservas</p>
                        <div className="space-y-1">
                          {typeGroups.reservas.map(type => {
                            const config = notificationTypeConfig[type];
                            const IconComponent = getIconForType(type);
                            return (
                              <label
                                key={type}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedTypes.includes(type) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              >
                                <Checkbox
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={() => toggleType(type)}
                                />
                                <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{config.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pagamentos */}
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Pagamentos</p>
                        <div className="space-y-1">
                          {typeGroups.pagamentos.map(type => {
                            const config = notificationTypeConfig[type];
                            const IconComponent = getIconForType(type);
                            return (
                              <label
                                key={type}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedTypes.includes(type) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              >
                                <Checkbox
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={() => toggleType(type)}
                                />
                                <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{config.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comunicação */}
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Comunicação</p>
                        <div className="space-y-1">
                          {typeGroups.comunicacao.map(type => {
                            const config = notificationTypeConfig[type];
                            const IconComponent = getIconForType(type);
                            return (
                              <label
                                key={type}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedTypes.includes(type) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              >
                                <Checkbox
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={() => toggleType(type)}
                                />
                                <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{config.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sistema */}
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Sistema</p>
                        <div className="space-y-1">
                          {typeGroups.sistema.map(type => {
                            const config = notificationTypeConfig[type];
                            const IconComponent = getIconForType(type);
                            return (
                              <label
                                key={type}
                                className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedTypes.includes(type) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              >
                                <Checkbox
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={() => toggleType(type)}
                                />
                                <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{config.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Prioridades */}
            <Collapsible open={isPrioritiesOpen} onOpenChange={setIsPrioritiesOpen}>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">Prioridade</Label>
                      {!isPrioritiesOpen && selectedPriorities.length > 0 && selectedPriorities.length < 4 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedPriorities.map(p => (
                            <Badge key={p} className={`text-[10px] px-1.5 py-0 ${priorityConfig[p].bgColor} ${priorityConfig[p].color}`}>
                              {priorityConfig[p].label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {!isPrioritiesOpen && (selectedPriorities.length === 0 || selectedPriorities.length === 4) && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Todas</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPrioritiesOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 space-y-1 mt-2">
                    {(['critical', 'high', 'medium', 'low'] as NotificationPriority[]).map(priority => {
                      const config = priorityConfig[priority];
                      return (
                        <label
                          key={priority}
                          className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedPriorities.includes(priority) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <Checkbox
                            checked={selectedPriorities.includes(priority)}
                            onCheckedChange={() => togglePriority(priority)}
                          />
                          <div className={`w-2 h-2 rounded-full ${config.bgColor}`} />
                          <span className={`text-xs ${config.color}`}>{config.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Período */}
            {onDateRangeChange && (
              <Collapsible open={isDateOpen} onOpenChange={setIsDateOpen}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex-1 text-left">
                        <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">Período</Label>
                        {!isDateOpen && dateRange && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {dateRange.from.toLocaleDateString('pt-BR')} - {dateRange.to.toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {!isDateOpen && !dateRange && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">Todas as datas</span>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 mt-2">
                      <DateRangePicker
                        dateRange={dateRange || { from: new Date(), to: new Date() }}
                        onDateRangeChange={onDateRangeChange}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
