/**
 * RENDIZY - Clientes e Hóspedes Management
 * Sistema de gestão unificada de clientes com 3 tipos:
 * - Hóspedes (temporada/curta duração)
 * - Compradores (imóveis à venda)
 * - Locadores (residencial/longa duração)
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from 'sonner';
import { useAutoSave } from '../hooks/useAutoSave';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import {
  Users,
  UserPlus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Home,
  Clock,
  Star,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  X
} from 'lucide-react';
import { cn } from './ui/utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Types
type ClientType = 'guest' | 'buyer' | 'renter';
type ClientStatus = 'active' | 'inactive' | 'pending';

type PropertyListItem = {
  id: string;
  internalId?: string;
  name?: string;
  title?: string;
  location?: string;
  tags?: string[];
};

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  type: ClientType;
  status: ClientStatus;
  
  // Dados de Hóspede
  guestData?: {
    preferredCheckIn?: string;
    dietaryRestrictions?: string;
    emergencyContact?: string;
    totalStays?: number;
    totalSpent?: number;
    lastStayDate?: string;
    rating?: number;
    notes?: string;
  };
  
  // Dados de Comprador
  buyerData?: {
    budget?: number;
    preferredLocations?: string[];
    purchaseTimeline?: string;
    financingNeeded?: boolean;
    propertyPreferences?: string;
    workingWithAgent?: boolean;
  };
  
  // Dados de Locador
  renterData?: {
    leaseStartDate?: string;
    leaseEndDate?: string;
    monthlyRent?: number;
    depositAmount?: number;
    previousAddress?: string;
    employmentInfo?: string;
    references?: string;
  };
  
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

const clientTypeLabels: Record<ClientType, string> = {
  guest: 'Hóspede',
  buyer: 'Comprador',
  renter: 'Locador'
};

const clientTypeColors: Record<ClientType, string> = {
  guest: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  buyer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  renter: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
};

export function ClientsAndGuestsManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | ClientType | ClientStatus>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalGuests, setTotalGuests] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [datePreset, setDatePreset] = useState<'current-month' | 'last-30' | 'last-90' | 'all'>('current-month');
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Client>>({
    type: 'guest',
    status: 'active'
  });

  // Auto-save - ✅ CORREÇÃO v1.0.103.336 - Hook com argumentos corretos
  const { saveStatus, triggerSave } = useAutoSave(formData, {
    onSave: async (data) => {
      if (editModalOpen && selectedClient) {
        await handleUpdateClient(selectedClient.id, data);
      }
    },
    debounceMs: 2000
  });

  const NONE_MARKER = '__NONE__';

  const getDateRange = () => {
    const today = new Date();
    if (datePreset === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    if (datePreset === 'current-month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }
    const days = datePreset === 'last-30' ? 30 : 90;
    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  // Load clients
  useEffect(() => {
    loadClients();
    loadProperties();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedProperties, datePreset]);

  useEffect(() => {
    loadClients();
  }, [page, pageSize, searchQuery, selectedProperties, datePreset]);

  const extractList = (payload: any) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.rows)) return payload.rows;
    if (Array.isArray(payload?.guests)) return payload.guests;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
    if (Array.isArray(payload?.data?.guests)) return payload.data.guests;
    return [];
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      if (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) {
        setClients([]);
        setTotalGuests(0);
        setTotalPages(1);
        return;
      }

      const { startDate, endDate } = getDateRange();

      // ✅ CORREÇÃO: Usar endpoint /guests ao invés de /clients (que não existe)
      const userToken = localStorage.getItem('rendizy-token');
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedProperties.length > 0) {
        const ids = selectedProperties.filter((id) => id !== NONE_MARKER);
        if (ids.length > 0) {
          params.set('propertyIds', ids.join(','));
        }
      }
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/guests?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
      }

      const data = await response.json();
      console.log('📥 Resposta da API guests:', data);
      
      // ✅ CORREÇÃO v1.0.103.341: Converter Guest → Client
      const guests = extractList(data?.data ?? data);
      const mappedClients: Client[] = guests.map((guest: any) => ({
        id: guest.id,
        name: guest.fullName || `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone,
        document: guest.cpf,
        type: 'guest' as const,
        status: guest.isBlacklisted ? 'inactive' : 'active',
        guestData: {
          totalStays: guest.stats?.totalReservations || 0,
          totalSpent: guest.stats?.totalSpent || 0,
          lastStayDate: guest.stats?.lastStayDate,
          rating: guest.stats?.averageRating,
          notes: guest.notes
        },
        organizationId: guest.organizationId,
        createdAt: guest.createdAt,
        updatedAt: guest.updatedAt
      }));

      console.log('✅ Clientes mapeados:', mappedClients.length);
      setClients(mappedClients);

      const pagination = data?.pagination || data?.data?.pagination;
      if (pagination) {
        setTotalGuests(pagination.total || mappedClients.length);
        setTotalPages(pagination.totalPages || 1);
      } else {
        setTotalGuests(mappedClients.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
      setClients([]);
      setTotalGuests(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const loadAllGuests = async () => {
    try {
      setIsLoadingAll(true);

      if (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) {
        setClients([]);
        setTotalGuests(0);
        setTotalPages(1);
        setPage(1);
        return;
      }

      const userToken = localStorage.getItem('rendizy-token');
      const { startDate, endDate } = getDateRange();
      const allGuests: Client[] = [];
      const batchSize = 200;
      let currentPage = 1;

      while (true) {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(batchSize));
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (selectedProperties.length > 0) {
          const ids = selectedProperties.filter((id) => id !== NONE_MARKER);
          if (ids.length > 0) {
            params.set('propertyIds', ids.join(','));
          }
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/guests?${params.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'X-Auth-Token': userToken || '',
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Erro ao carregar hóspedes');
        }

        const data = await response.json();
        const guests = extractList(data?.data ?? data);
        const mappedClients: Client[] = guests.map((guest: any) => ({
          id: guest.id,
          name: guest.fullName || `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          phone: guest.phone,
          document: guest.cpf,
          type: 'guest' as const,
          status: guest.isBlacklisted ? 'inactive' : 'active',
          guestData: {
            totalStays: guest.stats?.totalReservations || 0,
            totalSpent: guest.stats?.totalSpent || 0,
            lastStayDate: guest.stats?.lastStayDate,
            rating: guest.stats?.averageRating,
            notes: guest.notes
          },
          organizationId: guest.organizationId,
          createdAt: guest.createdAt,
          updatedAt: guest.updatedAt
        }));

        allGuests.push(...mappedClients);

        if (guests.length < batchSize) {
          break;
        }
        currentPage += 1;
      }

      setClients(allGuests);
      setTotalGuests(allGuests.length);
      setTotalPages(1);
      setPage(1);
    } catch (error) {
      console.error('Erro ao carregar todos os hóspedes:', error);
      toast.error('Erro ao carregar todos os hóspedes');
    } finally {
      setIsLoadingAll(false);
    }
  };

  const loadProperties = async () => {
    try {
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties/lista`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar propriedades');
      }

      const data = await response.json();
      console.log('📥 Resposta da API properties:', data);

      const rows = Array.isArray(data?.anuncios) ? data.anuncios : [];
      const mapped: PropertyListItem[] = rows.map((item: any) => ({
        id: item.id,
        internalId: item.data?.internalId || item.data?.internal_id || item.data?.identificacao_interna,
        name: item.data?.title || item.title,
        title: item.data?.title || item.title,
        location: item.data?.address_city || item.data?.location || item.data?.address?.city,
        tags: item.data?.tags || [],
      })).filter((p: PropertyListItem) => p.id);

      setProperties(mapped);
    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
      setProperties([]);
    }
  };

  const handleCreateClient = async () => {
    try {
      // ✅ VALIDAÇÃO: Campos obrigatórios
      if (!formData.name || !formData.email || !formData.phone) {
        toast.error('Preencha todos os campos obrigatórios (Nome, Email, Telefone)');
        return;
      }

      // ✅ CORREÇÃO v1.0.103.341: Converter formato Client → CreateGuestDTO
      // Separar nome em firstName e lastName
      const nameParts = (formData.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Se só tem 1 nome, repete

      const guestPayload = {
        firstName,
        lastName,
        email: formData.email,
        phone: formData.phone,
        cpf: formData.document,
        source: 'direct' as const // ✅ Valor correto para entrada manual
      };

      console.log('📤 Enviando payload para criar hóspede:', guestPayload);

      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/guests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(guestPayload)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('❌ Erro do backend:', errorData);
        throw new Error(errorData.error || 'Erro ao criar cliente');
      }

      const result = await response.json();
      console.log('✅ Hóspede criado com sucesso:', result);

      toast.success('Cliente criado com sucesso!');
      setCreateModalOpen(false);
      setFormData({ type: 'guest', status: 'active' });
      loadClients();
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar cliente');
    }
  };

  const handleUpdateClient = async (id: string, data: Partial<Client>) => {
    try {
      // ✅ CORREÇÃO: Usar endpoint /guests ao invés de /clients
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/guests/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao atualizar cliente');
      }

      toast.success('Cliente atualizado com sucesso!');
      loadClients();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      // ✅ CORREÇÃO: Usar endpoint /guests ao invés de /clients
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/guests/${selectedClient.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao deletar cliente');
      }

      toast.success('Cliente deletado com sucesso!');
      setDeleteModalOpen(false);
      setSelectedClient(null);
      loadClients();
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      toast.error('Erro ao deletar cliente');
    }
  };

  // Filtros
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery);

    const matchesFilter = 
      selectedFilter === 'all' ||
      client.type === selectedFilter ||
      client.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  // Estatísticas
  const stats = {
    total: clients.length,
    guests: clients.filter(c => c.type === 'guest').length,
    buyers: clients.filter(c => c.type === 'buyer').length,
    renters: clients.filter(c => c.type === 'renter').length,
    active: clients.filter(c => c.status === 'active').length
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedFilter !== 'all' ? 1 : 0) +
    (selectedProperties.length > 0 && !(selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) ? 1 : 0) +
    (datePreset !== 'current-month' ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedProperties([]);
    setPropertySearchQuery('');
    setDatePreset('current-month');
    setPage(1);
  };

  const getPropertyLabel = (property: PropertyListItem) =>
    property.internalId || property.name || property.title || 'Sem nome';

  const filteredProperties = properties.filter((property) => {
    const query = propertySearchQuery.toLowerCase();
    return (
      getPropertyLabel(property).toLowerCase().includes(query) ||
      (property.location?.toLowerCase() || '').includes(query)
    );
  });

  const selectAllProperties = () => {
    const ids = filteredProperties.map((p) => p.id);
    setSelectedProperties(ids);
  };

  const deselectAllProperties = () => {
    setSelectedProperties([NONE_MARKER]);
  };

  const isPropertySelected = (id: string) =>
    selectedProperties.length > 0 &&
    !(selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) &&
    selectedProperties.includes(id);

  const toggleProperty = (id: string) => {
    if (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) {
      setSelectedProperties([id]);
      return;
    }
    setSelectedProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Filtro Lateral Esquerdo */}
      <div
        className={`border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full self-start sticky top-0 transition-all duration-300 relative ${isCollapsed ? 'w-12' : 'w-80'} overflow-hidden`}
      >
        {/* Botão Collapse/Expand */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 right-2 z-20 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          aria-label={isCollapsed ? 'Expandir filtros' : 'Recolher filtros'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-3 gap-2`}>
            {!isCollapsed && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filtros</h3>
                <p className="text-xs text-gray-500">Clientes e hóspedes</p>
              </div>
            )}
            {!isCollapsed && activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2 text-xs text-gray-500 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {!isCollapsed && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

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
                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        {!isCollapsed && showFilters && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'all'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Todos</span>
                <Badge variant="secondary">{stats.total}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('guest')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'guest'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Hóspedes</span>
                <Badge variant="secondary">{stats.guests}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('buyer')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'buyer'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Compradores</span>
                <Badge variant="secondary">{stats.buyers}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('renter')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'renter'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Locadores</span>
                <Badge variant="secondary">{stats.renters}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('active')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'active'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Ativos</span>
                <Badge variant="secondary">{stats.active}</Badge>
              </div>
            </button>

            <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Período (reservas)</Label>
                <Select value={datePreset} onValueChange={(value: any) => setDatePreset(value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-month">Mês vigente</SelectItem>
                    <SelectItem value="last-30">Últimos 30 dias</SelectItem>
                    <SelectItem value="last-90">Últimos 90 dias</SelectItem>
                    <SelectItem value="all">Todo período</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Paginação</Label>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                      <SelectItem value="200">200 por página</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllGuests}
                    disabled={isLoadingAll}
                    className="h-8 text-xs"
                  >
                    {isLoadingAll ? 'Carregando...' : 'Carregar todos'}
                  </Button>
                </div>
                <div className="text-[10px] text-gray-500">
                  Total estimado: {totalGuests}
                </div>
              </div>
            </div>

            {/* Propriedades - Multi seleção */}
            <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
              <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">
                        Propriedades
                      </Label>
                      {!isPropertiesOpen && (
                        <span className="text-[10px] text-gray-500">
                          {selectedProperties.length === 0 || (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER)
                            ? 'Todas'
                            : `${selectedProperties.length} selecionadas`}
                        </span>
                      )}
                    </div>
                    {isPropertiesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                    <div className="relative mt-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por identificação ou cidade..."
                        value={propertySearchQuery}
                        onChange={(e) => setPropertySearchQuery(e.target.value)}
                        className="pl-8 pr-8 h-8 text-xs"
                      />
                      {propertySearchQuery && (
                        <button
                          onClick={() => setPropertySearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>
                        {filteredProperties.length} de {properties.length} selecionadas
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="hover:text-blue-600" onClick={selectAllProperties}>
                          Todas
                        </button>
                        <button className="hover:text-blue-600" onClick={deselectAllProperties}>
                          Nenhuma
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 max-h-56 overflow-y-auto space-y-2">
                      {filteredProperties.length === 0 ? (
                        <div className="text-xs text-gray-500 py-2">Nenhuma propriedade encontrada</div>
                      ) : (
                        filteredProperties.map((property) => (
                          <label
                            key={property.id}
                            className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Checkbox
                              checked={isPropertySelected(property.id)}
                              onCheckedChange={() => toggleProperty(property.id)}
                            />
                            <div className="min-w-0">
                              <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                                {getPropertyLabel(property)}
                              </div>
                              {property.location && (
                                <div className="text-[10px] text-gray-500 truncate">
                                  {property.location}
                                </div>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto">
        {/* Spacer para TopBar */}
        <div className="h-14 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
        
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Clientes e Hóspedes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gerencie clientes (compradores, locadores residenciais e hóspedes de temporada)
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </span>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Hóspedes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.guests}
                  </span>
                  <User className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Compradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.buyers}
                  </span>
                  <Home className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Locadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.renters}
                  </span>
                  <Building2 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.active}
                  </span>
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          <Badge className={clientTypeColors[client.type]}>
                            {clientTypeLabels[client.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {client.email}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {client.phone}
                        </TableCell>
                        <TableCell>
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedClient(client);
                                setViewModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedClient(client);
                                setFormData(client);
                                setEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedClient(client);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages} • {totalGuests} hóspedes
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo cliente
            </DialogDescription>
          </DialogHeader>

          <ClientForm
            data={formData}
            onChange={setFormData}
            onSubmit={handleCreateClient}
            onCancel={() => {
              setCreateModalOpen(false);
              setFormData({ type: 'guest', status: 'active' });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize os dados do cliente
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <AutoSaveIndicator status={saveStatus} />
          </div>

          <ClientForm
            data={formData}
            onChange={(data) => {
              setFormData(data);
              triggerSave();
            }}
            onSubmit={() => {
              setEditModalOpen(false);
              setFormData({ type: 'guest', status: 'active' });
              setSelectedClient(null);
            }}
            onCancel={() => {
              setEditModalOpen(false);
              setFormData({ type: 'guest', status: 'active' });
              setSelectedClient(null);
            }}
            isEdit
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <ClientView client={selectedClient} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{selectedClient?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedClient(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Formulário
function ClientForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  isEdit = false
}: {
  data: Partial<Client>;
  onChange: (data: Partial<Client>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    onChange({
      ...data,
      [parent]: {
        ...((data as any)[parent] || {}),
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Dados Básicos */}
      <div className="space-y-4">
        <h4 className="font-medium">Dados Básicos</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={data.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div>
            <Label>Tipo de Cliente *</Label>
            <Select
              value={data.type || 'guest'}
              onValueChange={(value) => updateField('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guest">Hóspede</SelectItem>
                <SelectItem value="buyer">Comprador</SelectItem>
                <SelectItem value="renter">Locador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={data.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label>Telefone *</Label>
            <Input
              value={data.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>CPF/CNPJ</Label>
            <Input
              value={data.document || ''}
              onChange={(e) => updateField('document', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={data.status || 'active'}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Campos Específicos por Tipo */}
      {data.type === 'guest' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Dados do Hóspede</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in Preferido</Label>
              <Select
                value={data.guestData?.preferredCheckIn || ''}
                onValueChange={(value) => updateNestedField('guestData', 'preferredCheckIn', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Manhã</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                  <SelectItem value="evening">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Avaliação</Label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={data.guestData?.rating || ''}
                onChange={(e) => updateNestedField('guestData', 'rating', parseFloat(e.target.value))}
                placeholder="0.0"
              />
            </div>

            <div className="col-span-2">
              <Label>Restrições Alimentares</Label>
              <Input
                value={data.guestData?.dietaryRestrictions || ''}
                onChange={(e) => updateNestedField('guestData', 'dietaryRestrictions', e.target.value)}
                placeholder="Ex: Vegetariano, Sem glúten"
              />
            </div>

            <div className="col-span-2">
              <Label>Contato de Emergência</Label>
              <Input
                value={data.guestData?.emergencyContact || ''}
                onChange={(e) => updateNestedField('guestData', 'emergencyContact', e.target.value)}
                placeholder="Nome e telefone"
              />
            </div>

            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={data.guestData?.notes || ''}
                onChange={(e) => updateNestedField('guestData', 'notes', e.target.value)}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {data.type === 'buyer' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Dados do Comprador</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Orçamento</Label>
              <Input
                type="number"
                value={data.buyerData?.budget || ''}
                onChange={(e) => updateNestedField('buyerData', 'budget', parseFloat(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <Label>Prazo de Compra</Label>
              <Select
                value={data.buyerData?.purchaseTimeline || ''}
                onValueChange={(value) => updateNestedField('buyerData', 'purchaseTimeline', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediato</SelectItem>
                  <SelectItem value="1-3months">1-3 meses</SelectItem>
                  <SelectItem value="3-6months">3-6 meses</SelectItem>
                  <SelectItem value="6-12months">6-12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Localizações Preferidas</Label>
              <Input
                value={data.buyerData?.preferredLocations?.join(', ') || ''}
                onChange={(e) => updateNestedField('buyerData', 'preferredLocations', e.target.value.split(',').map(s => s.trim()))}
                placeholder="Bairro 1, Bairro 2, Bairro 3"
              />
            </div>

            <div className="col-span-2">
              <Label>Preferências do Imóvel</Label>
              <Textarea
                value={data.buyerData?.propertyPreferences || ''}
                onChange={(e) => updateNestedField('buyerData', 'propertyPreferences', e.target.value)}
                placeholder="Características desejadas no imóvel"
                rows={3}
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={data.buyerData?.financingNeeded || false}
                onCheckedChange={(checked) => updateNestedField('buyerData', 'financingNeeded', checked)}
              />
              <Label>Necessita Financiamento</Label>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={data.buyerData?.workingWithAgent || false}
                onCheckedChange={(checked) => updateNestedField('buyerData', 'workingWithAgent', checked)}
              />
              <Label>Trabalhando com Corretor</Label>
            </div>
          </div>
        </div>
      )}

      {data.type === 'renter' && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Dados do Locador</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Início do Contrato</Label>
              <Input
                type="date"
                value={data.renterData?.leaseStartDate || ''}
                onChange={(e) => updateNestedField('renterData', 'leaseStartDate', e.target.value)}
              />
            </div>

            <div>
              <Label>Fim do Contrato</Label>
              <Input
                type="date"
                value={data.renterData?.leaseEndDate || ''}
                onChange={(e) => updateNestedField('renterData', 'leaseEndDate', e.target.value)}
              />
            </div>

            <div>
              <Label>Aluguel Mensal</Label>
              <Input
                type="number"
                value={data.renterData?.monthlyRent || ''}
                onChange={(e) => updateNestedField('renterData', 'monthlyRent', parseFloat(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <Label>Depósito Caução</Label>
              <Input
                type="number"
                value={data.renterData?.depositAmount || ''}
                onChange={(e) => updateNestedField('renterData', 'depositAmount', parseFloat(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="col-span-2">
              <Label>Endereço Anterior</Label>
              <Input
                value={data.renterData?.previousAddress || ''}
                onChange={(e) => updateNestedField('renterData', 'previousAddress', e.target.value)}
                placeholder="Endereço completo"
              />
            </div>

            <div className="col-span-2">
              <Label>Informações de Emprego</Label>
              <Textarea
                value={data.renterData?.employmentInfo || ''}
                onChange={(e) => updateNestedField('renterData', 'employmentInfo', e.target.value)}
                placeholder="Empresa, cargo, tempo de serviço"
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label>Referências</Label>
              <Textarea
                value={data.renterData?.references || ''}
                onChange={(e) => updateNestedField('renterData', 'references', e.target.value)}
                placeholder="Nome, telefone e relação"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
        </Button>
      </div>
    </div>
  );
}

// Componente de Visualização
function ClientView({ client }: { client: Client }) {
  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <div>
        <h4 className="font-medium mb-3">Dados Básicos</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Nome:</span>
            <p className="font-medium">{client.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Tipo:</span>
            <p>
              <Badge className={clientTypeColors[client.type]}>
                {clientTypeLabels[client.type]}
              </Badge>
            </p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium">{client.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Telefone:</span>
            <p className="font-medium">{client.phone}</p>
          </div>
          {client.document && (
            <div>
              <span className="text-gray-500">CPF/CNPJ:</span>
              <p className="font-medium">{client.document}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Status:</span>
            <p>
              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                {client.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </p>
          </div>
        </div>
      </div>

      {/* Dados Específicos */}
      {client.type === 'guest' && client.guestData && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Dados do Hóspede</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.guestData.preferredCheckIn && (
              <div>
                <span className="text-gray-500">Check-in Preferido:</span>
                <p className="font-medium capitalize">{client.guestData.preferredCheckIn}</p>
              </div>
            )}
            {client.guestData.rating && (
              <div>
                <span className="text-gray-500">Avaliação:</span>
                <p className="font-medium flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {client.guestData.rating.toFixed(1)}
                </p>
              </div>
            )}
            {client.guestData.totalStays && (
              <div>
                <span className="text-gray-500">Total de Estadias:</span>
                <p className="font-medium">{client.guestData.totalStays}</p>
              </div>
            )}
            {client.guestData.totalSpent && (
              <div>
                <span className="text-gray-500">Total Gasto:</span>
                <p className="font-medium">
                  R$ {client.guestData.totalSpent.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {client.guestData.dietaryRestrictions && (
              <div className="col-span-2">
                <span className="text-gray-500">Restrições Alimentares:</span>
                <p className="font-medium">{client.guestData.dietaryRestrictions}</p>
              </div>
            )}
            {client.guestData.emergencyContact && (
              <div className="col-span-2">
                <span className="text-gray-500">Contato de Emergência:</span>
                <p className="font-medium">{client.guestData.emergencyContact}</p>
              </div>
            )}
            {client.guestData.notes && (
              <div className="col-span-2">
                <span className="text-gray-500">Observações:</span>
                <p className="font-medium">{client.guestData.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {client.type === 'buyer' && client.buyerData && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Dados do Comprador</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.buyerData.budget && (
              <div>
                <span className="text-gray-500">Orçamento:</span>
                <p className="font-medium">
                  R$ {client.buyerData.budget.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {client.buyerData.purchaseTimeline && (
              <div>
                <span className="text-gray-500">Prazo de Compra:</span>
                <p className="font-medium">{client.buyerData.purchaseTimeline}</p>
              </div>
            )}
            {client.buyerData.preferredLocations && client.buyerData.preferredLocations.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Localizações Preferidas:</span>
                <p className="font-medium">{client.buyerData.preferredLocations.join(', ')}</p>
              </div>
            )}
            {client.buyerData.propertyPreferences && (
              <div className="col-span-2">
                <span className="text-gray-500">Preferências:</span>
                <p className="font-medium">{client.buyerData.propertyPreferences}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-gray-500">Necessita Financiamento:</span>
              <p className="font-medium">{client.buyerData.financingNeeded ? 'Sim' : 'Não'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Trabalhando com Corretor:</span>
              <p className="font-medium">{client.buyerData.workingWithAgent ? 'Sim' : 'Não'}</p>
            </div>
          </div>
        </div>
      )}

      {client.type === 'renter' && client.renterData && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Dados do Locador</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {client.renterData.leaseStartDate && (
              <div>
                <span className="text-gray-500">Início do Contrato:</span>
                <p className="font-medium">
                  {new Date(client.renterData.leaseStartDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {client.renterData.leaseEndDate && (
              <div>
                <span className="text-gray-500">Fim do Contrato:</span>
                <p className="font-medium">
                  {new Date(client.renterData.leaseEndDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {client.renterData.monthlyRent && (
              <div>
                <span className="text-gray-500">Aluguel Mensal:</span>
                <p className="font-medium">
                  R$ {client.renterData.monthlyRent.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {client.renterData.depositAmount && (
              <div>
                <span className="text-gray-500">Depósito Caução:</span>
                <p className="font-medium">
                  R$ {client.renterData.depositAmount.toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {client.renterData.previousAddress && (
              <div className="col-span-2">
                <span className="text-gray-500">Endereço Anterior:</span>
                <p className="font-medium">{client.renterData.previousAddress}</p>
              </div>
            )}
            {client.renterData.employmentInfo && (
              <div className="col-span-2">
                <span className="text-gray-500">Informações de Emprego:</span>
                <p className="font-medium">{client.renterData.employmentInfo}</p>
              </div>
            )}
            {client.renterData.references && (
              <div className="col-span-2">
                <span className="text-gray-500">Referências:</span>
                <p className="font-medium">{client.renterData.references}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadados */}
      <div className="pt-4 border-t text-xs text-gray-500">
        <p>Criado em: {new Date(client.createdAt).toLocaleString('pt-BR')}</p>
        <p>Atualizado em: {new Date(client.updatedAt).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
