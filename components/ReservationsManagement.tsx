import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Edit,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Home,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { DateRangePicker } from './DateRangePicker';
import { ReservationDetailsModal } from './ReservationDetailsModal';
import { EditReservationWizard } from './EditReservationWizard';
import { CancelReservationModal } from './CancelReservationModal';
import { ConflictsDetectionDashboard } from './ConflictsDetectionDashboard';
import { CreateReservationWizard } from './CreateReservationWizard';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { reservationsApi, propertiesApi, guestsApi, Property, Reservation, Guest } from '../utils/api';
import { format, startOfMonth, endOfMonth, addMonths, endOfDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReservationsManagementProps {
  organizationId?: string;
  autoOpenCreate?: boolean;
  onViewDetails?: (reservation: Reservation) => void;
  onEditReservation?: (reservation: Reservation) => void;
  onCancelReservation?: (reservation: Reservation) => void;
  onCreateReservation?: () => void;
}

export function ReservationsManagement({
  organizationId,
  autoOpenCreate,
  onViewDetails,
  onEditReservation,
  onCancelReservation,
  onCreateReservation,
}: ReservationsManagementProps) {
  const PAGE_SIZE = 20;
  const [paginationMode, setPaginationMode] = useState<'server' | 'client'>('server');

  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string') {
      // aceita "1234.56", "1.234,56", "R$ 1.234,56"
      const cleaned = value
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const normalizeReservation = (raw: any): any => {
    if (!raw || typeof raw !== 'object') return raw;

    const pricingFromRaw = raw.pricing && typeof raw.pricing === 'object' ? raw.pricing : {};

    const accommodation =
      toNumber(
        pricingFromRaw.accommodation ??
          pricingFromRaw.baseTotal ??
          pricingFromRaw.base_total ??
          raw.pricing_accommodation ??
          raw.pricing_base_total,
        0
      );

    const fees =
      toNumber(
        pricingFromRaw.fees ??
          raw.pricing_fees ??
          pricingFromRaw.cleaningFee ??
          pricingFromRaw.cleaning_fee ??
          0,
        0
      ) +
      toNumber(pricingFromRaw.serviceFee ?? pricingFromRaw.service_fee ?? 0, 0) +
      toNumber(pricingFromRaw.taxes ?? 0, 0);

    const discounts = toNumber(
      pricingFromRaw.discounts ?? pricingFromRaw.discount ?? raw.pricing_discounts ?? raw.pricing_discount ?? 0,
      0
    );

    const total = toNumber(
      pricingFromRaw.total ?? raw.pricing_total ?? raw.total ?? raw.price ?? raw.amount ?? 0,
      0
    );

    const currency =
      String(
        pricingFromRaw.currency ??
          raw.pricing_currency ??
          pricingFromRaw.currencyCode ??
          pricingFromRaw.currency_code ??
          'BRL'
      ) || 'BRL';

    const normalized = {
      ...raw,
      pricing: {
        ...pricingFromRaw,
        accommodation,
        fees,
        discounts,
        total,
        currency,
      },
    };

    if (normalized.price == null) {
      normalized.price = total;
    }

    // Alguns retornos legados vêm com guests fora do objeto guests
    if (!normalized.guests || typeof normalized.guests !== 'object') {
      const adults = toNumber(raw.adults ?? raw.guests_adults ?? 0, 0);
      const children = toNumber(raw.children ?? raw.guests_children ?? 0, 0);
      const infants = toNumber(raw.infants ?? raw.guests_infants ?? 0, 0);
      const pets = toNumber(raw.pets ?? raw.guests_pets ?? 0, 0);
      normalized.guests = {
        adults,
        children,
        infants,
        pets,
        total: adults + children + infants,
      };
    }

    return normalized;
  };

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<{ total: number; confirmed: number; pending: number; revenue: number } | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(addMonths(new Date(), 1))
  });

  // ✅ Filtro por tipo de data (conceito objetivo: criação vs check-in vs check-out)
  const [dateFilterField, setDateFilterField] = useState<'created' | 'checkin' | 'checkout'>('checkin');
  
  // Filtro de APIs de entrada (múltipla seleção) - ✅ v1.0.103.356 - Incluído 'direct'
  const [selectedApis, setSelectedApis] = useState<string[]>(['airbnb', 'booking', 'decolar', 'stays', 'direct']);

  // Sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true); // Aberto por padrão
  
  // Collapsible sections
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPlatformOpen, setIsPlatformOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);
  const [isApiFilterOpen, setIsApiFilterOpen] = useState(false);

  // Modals
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load data
  useEffect(() => {
    loadProperties();
    loadGuests();
  }, [organizationId]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    organizationId,
    statusFilter,
    platformFilter,
    dateRange.from,
    dateRange.to,
    dateFilterField,
    selectedProperties,
  ]);

  const reservationsQueryKey = useMemo(
    () =>
      JSON.stringify({
        organizationId,
        statusFilter,
        platformFilter,
        dateFrom: dateRange.from?.toISOString?.() || String(dateRange.from),
        dateTo: dateRange.to?.toISOString?.() || String(dateRange.to),
        dateFilterField,
        selectedProperties,
      }),
    [organizationId, statusFilter, platformFilter, dateRange.from, dateRange.to, dateFilterField, selectedProperties]
  );

  // Load reservations + summary when filters change
  useEffect(() => {
    setPage(1);
    loadReservations(1);
    loadSummary();
  }, [reservationsQueryKey]);

  // Load reservations when page changes (server pagination only)
  useEffect(() => {
    if (paginationMode === 'server') {
      loadReservations(page);
    }
  }, [page, paginationMode]);

  // Initialize selected properties when properties load
  useEffect(() => {
    if (properties.length > 0 && selectedProperties.length === 0) {
      setSelectedProperties(properties.map(p => p.id));
    }
  }, [properties]);

  // Auto open create modal
  useEffect(() => {
    if (autoOpenCreate && !onCreateReservation) {
      setShowCreateModal(true);
    }
  }, [autoOpenCreate, onCreateReservation]);

  const loadReservations = async (targetPage: number = page) => {
    console.log('🔄 [ReservationsManagement] loadReservations() chamado');
    setLoading(true);
    try {
      const filters: any = {};
      
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }
      
      if (platformFilter !== 'all') {
        filters.platform = [platformFilter];
      }
      
      console.log('📋 [ReservationsManagement] Filtros aplicados:', filters);
      
      // Não filtrar por propriedade no backend, faremos isso no frontend
      // para permitir múltiplas seleções

      // Aplicar filtros no backend para a paginação ser correta
      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');

      // Só mandar propertyIds se estiver filtrando (para não excluir reservas com propertyId desconhecido)
      const shouldFilterProperties = properties.length > 0 && selectedProperties.length > 0 && selectedProperties.length < properties.length;
      const propertyIds = shouldFilterProperties ? selectedProperties : undefined;

      const response = await reservationsApi.listPaged({
        ...filters,
        propertyIds,
        dateField: dateFilterField,
        dateFrom,
        dateTo,
        page: targetPage,
        limit: PAGE_SIZE,
      });
      
      console.log('📦 [ReservationsManagement] Resposta da API:', response);
      
      if (response.success && response.data) {
        const payload: any = response.data as any;

        // ✅ Compat: alguns deploys ainda retornam array direto (sem paginação)
        if (Array.isArray(payload)) {
          setPaginationMode('client');
          setReservations(payload.map(normalizeReservation));
          console.log(`✅ [ReservationsManagement] ${payload.length} reservas carregadas (legacy array)`);
          return;
        }

        const list = Array.isArray(payload?.data) ? payload.data : [];
        const pagination = payload?.pagination;

        if (pagination) {
          setPaginationMode('server');
          setReservations(list.map(normalizeReservation));
          setTotalPages(pagination.totalPages || 1);
          setTotalCount(pagination.total || 0);
          console.log(`✅ [ReservationsManagement] ${list.length} reservas carregadas (page=${targetPage})`);
          return;
        }

        // ✅ Fallback: payload inesperado
        setPaginationMode('client');
        setReservations(list.map(normalizeReservation));
        console.log(`✅ [ReservationsManagement] ${list.length} reservas carregadas (fallback)`);
      } else {
        console.error('❌ [ReservationsManagement] Erro ao carregar reservas:', response.error);
        toast.error('Erro ao carregar reservas');
      }
    } catch (error) {
      console.error('❌ [ReservationsManagement] Exceção ao carregar reservas:', error);
      toast.error('Erro ao carregar reservas');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      // Se o backend não tem /summary (ainda), não bloquear a tela.
      // Em modo client-side, os cards serão derivados do filtro local.
      if (paginationMode === 'client') {
        setSummary(null);
        return;
      }

      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }
      if (platformFilter !== 'all') {
        filters.platform = [platformFilter];
      }

      const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
      const dateTo = format(dateRange.to, 'yyyy-MM-dd');
      const shouldFilterProperties = properties.length > 0 && selectedProperties.length > 0 && selectedProperties.length < properties.length;
      const propertyIds = shouldFilterProperties ? selectedProperties : undefined;

      const response = await reservationsApi.getSummary({
        ...filters,
        propertyIds,
        dateField: dateFilterField,
        dateFrom,
        dateTo,
      });

      if (response.success && response.data) {
        setSummary(response.data);
        // Se a paginação ainda não carregou count, usar o total do summary como fallback
        if (totalCount === 0 && typeof response.data.total === 'number') {
          setTotalCount(response.data.total);
          setTotalPages(Math.max(1, Math.ceil(response.data.total / PAGE_SIZE)));
        }
      }
    } catch (err) {
      console.error('❌ [ReservationsManagement] Erro ao carregar summary:', err);
    }
  };

  const loadProperties = async () => {
    try {
      // ✅ Buscar de anuncios_ultimate (Anúncios Ultimate)
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
      const ANON_KEY = publicAnonKey;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/lista`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
          'Content-Type': 'application/json'
        }
      });

      let anuncios: any[] = [];

      if (response.ok) {
        const result = await response.json();
        anuncios = result.anuncios || [];
      }

      if (!anuncios || anuncios.length === 0) {
        const rest = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_ultimate?select=*`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!rest.ok) {
          throw new Error(`HTTP ${rest.status}`);
        }

        anuncios = await rest.json();
      }

      if (anuncios && anuncios.length) {
        const mappedProperties = anuncios.map((a: any) => ({
          id: a.id,
          name: a.data?.title || a.title || 'Sem título',
          title: a.data?.title || a.title || 'Sem título',
          status: a.status || 'active',
          type: a.data?.tipo || 'apartment',
          ...a.data
        }));
        
        setProperties(mappedProperties);
        console.log(`✅ [ReservationsManagement] ${mappedProperties.length} imóveis carregados de Anúncios Ultimate`);
      }
    } catch (error) {
      console.error('❌ [ReservationsManagement] Erro ao carregar propriedades:', error);
    }
  };

  const loadGuests = async () => {
    try {
      const response = await guestsApi.list();
      if (response.success && response.data) {
        setGuests(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar hóspedes:', error);
    }
  };

  // OTIMIZADO: Maps para lookups O(1) em vez de O(n)
  const guestsMap = useMemo(() => 
    new Map(guests.map(g => [g.id, g])), 
    [guests]
  );

  const propertiesMap = useMemo(() => 
    new Map(properties.map(p => [p.id, p])), 
    [properties]
  );

  const parseDateCandidate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'string') {
      const s = value.trim();
      if (!s) return null;

      // IMPORTANT: `new Date('YYYY-MM-DD')` is parsed as UTC and can shift the day in Brazil.
      // Treat date-only strings as local midnight.
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
      const d = new Date(dateOnly ? `${s}T00:00:00` : s);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  // Filter reservations by search and selected properties - OTIMIZADO: Memoizado
  const filteredReservations = useMemo(() => {
    console.log('🔍 [ReservationsManagement] Filtrando reservas:', {
      total: reservations.length,
      selectedProperties: selectedProperties.length,
      selectedApis: selectedApis,
      searchQuery
    });
    
    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to);

    const getComparableDate = (value: unknown): Date | null => parseDateCandidate(value);

    const filtered = reservations.filter(reservation => {
      // Filter by date range + date field
      const dateCandidate = (() => {
        if (dateFilterField === 'created') {
          // Preferir data de criação da plataforma (quando disponível), senão createdAt do sistema
          return getComparableDate((reservation as any).sourceCreatedAt || reservation.createdAt);
        }
        if (dateFilterField === 'checkout') {
          return getComparableDate(reservation.checkOut);
        }
        return getComparableDate(reservation.checkIn);
      })();

      if (!dateCandidate) return false;
      if (dateCandidate < rangeStart || dateCandidate > rangeEnd) return false;

      // Filter by selected properties
      // NOTE: não excluir reservas cujo propertyId não existe na lista carregada de propriedades
      // (ex: reservas importadas com property_id apontando para tabela/ID diferente).
      if (selectedProperties.length > 0) {
        const propertyIsKnown = propertiesMap.has(reservation.propertyId);
        if (propertyIsKnown && !selectedProperties.includes(reservation.propertyId)) {
          return false;
        }
      }

      // Filter by selected APIs (fonte da reserva)
      if (selectedApis.length > 0) {
        // NOTE: o tipo Reservation não expõe `source` oficialmente.
        // Em dados importados do StaysNet, a coluna `platform` costuma vir como 'other'.
        // Para que o filtro "API Stays.net" funcione, detectamos pelo domínio da externalUrl.
        const externalUrl = (reservation as any).externalUrl as unknown;
        const inferredSource =
          typeof externalUrl === 'string' && externalUrl.toLowerCase().includes('stays.net')
            ? 'stays'
            : (reservation.platform || 'direct');
        const source = String(inferredSource);
        const apiMap: Record<string, string[]> = {
          'airbnb': ['airbnb'],
          'booking': ['booking', 'booking.com'],
          'decolar': ['decolar'],
          'stays': ['stays', 'staysnet', 'stays.net'],
          'direct': ['direct', 'direto', 'manual']
        };
        
        const sourceLower = source.toLowerCase();
        const matchesApi = selectedApis.some(api => apiMap[api]?.some(variant => sourceLower.includes(variant)));
        
        if (!matchesApi) {
          return false;
        }
      }

      // Filter by search query
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      const guest = guestsMap.get(reservation.guestId); // O(1) lookup
      const property = propertiesMap.get(reservation.propertyId); // O(1) lookup
      
      return (
        reservation.id.toLowerCase().includes(query) ||
        guest?.fullName?.toLowerCase().includes(query) ||
        guest?.email?.toLowerCase().includes(query) ||
        property?.name?.toLowerCase().includes(query)
      );
    });
    
    console.log(`✅ [ReservationsManagement] Filtro aplicado: ${filtered.length} de ${reservations.length} reservas`);
    return filtered;
  }, [reservations, selectedProperties, selectedApis, searchQuery, guestsMap, propertiesMap, dateRange.from, dateRange.to, dateFilterField]);

  const effectiveTotalPages = useMemo(() => {
    if (paginationMode === 'server') return totalPages;
    return Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE));
  }, [paginationMode, totalPages, filteredReservations.length]);

  const effectiveTotalCount = useMemo(() => {
    if (paginationMode === 'server') return totalCount;
    return filteredReservations.length;
  }, [paginationMode, totalCount, filteredReservations.length]);

  const pagedReservations = useMemo(() => {
    if (paginationMode === 'server') return filteredReservations;
    const start = (page - 1) * PAGE_SIZE;
    return filteredReservations.slice(start, start + PAGE_SIZE);
  }, [paginationMode, filteredReservations, page]);

  // Stats (preferir backend summary quando disponível; fallback para o conjunto filtrado no frontend)
  const stats = useMemo(() => {
    if (summary && paginationMode === 'server') return summary;
    const base = filteredReservations;
    return {
      total: base.length,
      confirmed: base.filter(r => r.status === 'confirmed').length,
      pending: base.filter(r => r.status === 'pending').length,
      revenue: base
        .filter(r => ['confirmed', 'checked_in', 'checked_out', 'completed'].includes(r.status))
        .reduce((sum, r) => sum + (Number(r.pricing?.total) || 0), 0),
    };
  }, [summary, paginationMode, filteredReservations]);

  // Get property name - OTIMIZADO: Usa Map O(1)
  const getPropertyName = (propertyId: string) => {
    const property = propertiesMap.get(propertyId);
    return property?.name || propertyId;
  };

  // Get guest name - OTIMIZADO: Usa Map O(1)
  const getGuestName = (guestId: string) => {
    const guest = guestsMap.get(guestId);
    return guest?.fullName || guestId;
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'outline', label: 'Pendente', icon: Clock },
      confirmed: { variant: 'default', label: 'Confirmada', icon: CheckCircle },
      checked_in: { variant: 'default', label: 'Check-in', icon: CheckCircle },
      checked_out: { variant: 'secondary', label: 'Check-out', icon: CheckCircle },
      completed: { variant: 'secondary', label: 'Concluída', icon: CheckCircle },
      cancelled: { variant: 'destructive', label: 'Cancelada', icon: XCircle },
      no_show: { variant: 'destructive', label: 'No-show', icon: AlertTriangle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Platform badge
  const getPlatformBadge = (platform: string, partnerName?: string) => {
    const colors: Record<string, string> = {
      airbnb: 'bg-pink-100 text-pink-700',
      booking: 'bg-blue-100 text-blue-700',
      decolar: 'bg-orange-100 text-orange-700',
      direct: 'bg-green-100 text-green-700',
      other: 'bg-gray-100 text-gray-700',
    };

    const labels: Record<string, string> = {
      airbnb: 'Airbnb',
      booking: 'Booking',
      decolar: 'Decolar',
      direct: 'Direto',
      other: 'Outro',
    };

    // Stays.net semantics: `platform=other` can mean "external platform".
    // When available, show partner name instead of the generic label.
    const customLabel = platform === 'other' && partnerName ? partnerName : null;

    return (
      <Badge className={colors[platform] || colors.other}>
        {customLabel || labels[platform] || platform}
      </Badge>
    );
  };

  // Handle actions
  const handleViewDetails = (reservation: Reservation) => {
    if (onViewDetails) {
      onViewDetails(reservation);
      return;
    }
    setSelectedReservation(reservation);
    setShowDetailsModal(true);
  };

  const handleEdit = (reservation: Reservation) => {
    if (onEditReservation) {
      onEditReservation(reservation);
      return;
    }
    setSelectedReservation(reservation);
    setShowEditModal(true);
  };

  const handleCancel = (reservation: Reservation) => {
    if (onCancelReservation) {
      onCancelReservation(reservation);
      return;
    }
    setSelectedReservation(reservation);
    setShowCancelModal(true);
  };

  const handleCreate = () => {
    if (onCreateReservation) {
      onCreateReservation();
      return;
    }
    setSelectedReservation(null);
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadReservations();
    toast.success('Reserva criada com sucesso!');
  };

  // Property filter functions
  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(propertySearchQuery.toLowerCase())
  );

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectAllProperties = () => {
    setSelectedProperties(filteredProperties.map(p => p.id));
  };

  const deselectAllProperties = () => {
    setSelectedProperties([]);
  };

  // Toggle API filter
  const toggleApiFilter = (apiValue: string) => {
    setSelectedApis(prev => 
      prev.includes(apiValue)
        ? prev.filter(a => a !== apiValue)
        : [...prev, apiValue]
    );
  };

  const selectAllApis = () => {
    setSelectedApis(['airbnb', 'booking', 'decolar', 'stays', 'direct']);
  };

  const deselectAllApis = () => {
    setSelectedApis([]);
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar com Filtros */}
      <div 
        className={`
          border-r border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 
          flex flex-col 
          sticky top-4 
          transition-all duration-300 
          relative 
          flex-shrink-0 
          rounded-lg 
          shadow-sm
          min-h-[500px]
          max-h-[calc(100vh-2rem)]
          ${isSidebarCollapsed ? 'w-12' : 'w-80'}
        `}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group"
          title={isSidebarCollapsed ? 'Expandir painel' : 'Minimizar painel'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
          )}
        </button>

        {/* Header - Fixo */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <h2 className="text-gray-900 dark:text-gray-100 mb-3">Reservas</h2>

          {/* Date Field Selector */}
          <div className="mb-3">
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">Tipo de data</Label>
            <Select value={dateFilterField} onValueChange={(v) => setDateFilterField(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Criação</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="checkout">Check-out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Picker */}
          <div className="mb-3">
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">De - até</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros Avançados
              {(statusFilter !== 'all' || platformFilter !== 'all' || (selectedProperties.length > 0 && selectedProperties.length < properties.length) || searchQuery !== '') && (
                <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {
                    (statusFilter !== 'all' ? 1 : 0) + 
                    (platformFilter !== 'all' ? 1 : 0) + 
                    ((selectedProperties.length > 0 && selectedProperties.length < properties.length) ? 1 : 0) +
                    (searchQuery !== '' ? 1 : 0)
                  }
                </span>
              )}
            </span>
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-3 space-y-2 overflow-y-auto max-h-[calc(100vh-400px)]">
              
              {/* Busca */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-3">
                <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ID, hóspede, propriedade..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Limpar busca"
                      aria-label="Limpar busca"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">Status</Label>
                    {isStatusOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-2">
                      {[
                        { value: 'all', label: 'Todos os Status' },
                        { value: 'pending', label: 'Pendente', icon: Clock, color: 'text-yellow-600' },
                        { value: 'confirmed', label: 'Confirmada', icon: CheckCircle, color: 'text-green-600' },
                        { value: 'checked_in', label: 'Check-in', icon: CheckCircle, color: 'text-blue-600' },
                        { value: 'completed', label: 'Concluída', icon: CheckCircle, color: 'text-gray-600' },
                        { value: 'cancelled', label: 'Cancelada', icon: XCircle, color: 'text-red-600' },
                      ].map(status => {
                        const Icon = status.icon;
                        return (
                          <div
                            key={status.value}
                            className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${statusFilter === status.value ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                            onClick={() => setStatusFilter(status.value)}
                          >
                            <Checkbox
                              checked={statusFilter === status.value}
                              onCheckedChange={() => setStatusFilter(status.value)}
                            />
                            <div className="flex items-center gap-2 flex-1">
                              {Icon && <Icon className={`h-3.5 w-3.5 ${status.color}`} />}
                              <Label className="text-sm cursor-pointer">{status.label}</Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Platform Filter */}
              <Collapsible open={isPlatformOpen} onOpenChange={setIsPlatformOpen}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">Plataforma</Label>
                    {isPlatformOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 pt-0 space-y-2">
                      {[
                        { value: 'all', label: 'Todas as Plataformas' },
                        { value: 'airbnb', label: 'Airbnb', color: 'bg-pink-100 text-pink-700' },
                        { value: 'booking', label: 'Booking.com', color: 'bg-blue-100 text-blue-700' },
                        { value: 'decolar', label: 'Decolar', color: 'bg-orange-100 text-orange-700' },
                        { value: 'direct', label: 'Reserva Direta', color: 'bg-green-100 text-green-700' },
                        { value: 'other', label: 'Outro', color: 'bg-gray-100 text-gray-700' },
                      ].map(platform => (
                        <div
                          key={platform.value}
                          className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${platformFilter === platform.value ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                          onClick={() => setPlatformFilter(platform.value)}
                        >
                          <Checkbox
                            checked={platformFilter === platform.value}
                            onCheckedChange={() => setPlatformFilter(platform.value)}
                          />
                          <Label className="text-sm cursor-pointer flex-1">{platform.label}</Label>
                          {platform.value !== 'all' && (
                            <Badge className={`text-xs ${platform.color}`}>{platform.label.split(' ')[0]}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* API Filter - Plataformas de Entrada */}
              <Collapsible open={isApiFilterOpen} onOpenChange={setIsApiFilterOpen}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">APIs de Entrada</Label>
                      {selectedApis.length < 5 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {selectedApis.length}
                        </Badge>
                      )}
                    </div>
                    {isApiFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 pt-0">
                      {/* Controles de Seleção */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] text-gray-600 dark:text-gray-400">
                          {selectedApis.length} de 5 selecionadas
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllApis}
                            disabled={selectedApis.length === 5}
                            className="h-6 px-2 text-[10px]"
                          >
                            Todas
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={deselectAllApis}
                            disabled={selectedApis.length === 0}
                            className="h-6 px-2 text-[10px]"
                          >
                            Nenhuma
                          </Button>
                        </div>
                      </div>

                      {/* Lista de APIs */}
                      <div className="space-y-2">
                        {[
                          { value: 'airbnb', label: 'API Airbnb', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
                          { value: 'booking', label: 'API Booking', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                          { value: 'decolar', label: 'API Decolar', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                          { value: 'stays', label: 'API Stays.net', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
                          { value: 'direct', label: 'Reserva Direta', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                        ].map(api => (
                          <div
                            key={api.value}
                            className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${selectedApis.includes(api.value) ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200 dark:ring-purple-800' : ''}`}
                            onClick={() => toggleApiFilter(api.value)}
                          >
                            <Checkbox
                              checked={selectedApis.includes(api.value)}
                              onCheckedChange={() => toggleApiFilter(api.value)}
                            />
                            <Label className="text-sm cursor-pointer flex-1">{api.label}</Label>
                            <Badge className={`text-xs ${api.color}`}>
                              {api.label.replace('API ', '')}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Info */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Filtre reservas por origem da API de integração
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Property Filter */}
              <Collapsible open={isPropertyOpen} onOpenChange={setIsPropertyOpen}>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">Propriedade</Label>
                    {isPropertyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 pt-0">
                      {/* Campo de Busca */}
                      <div className="relative mb-3 mt-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar..."
                          value={propertySearchQuery}
                          onChange={(e) => setPropertySearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs"
                        />
                      </div>

                      {/* Controles de Seleção */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] text-gray-600 dark:text-gray-400">
                          {selectedProperties.length} de {filteredProperties.length} selecionadas
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllProperties}
                            disabled={filteredProperties.every(p => selectedProperties.includes(p.id))}
                            className="h-6 px-2 text-[10px]"
                          >
                            Todas
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={deselectAllProperties}
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
                                ${selectedProperties.includes(property.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''}
                              `}
                            >
                              <Checkbox
                                checked={selectedProperties.includes(property.id)}
                                onCheckedChange={() => toggleProperty(property.id)}
                              />
                              <Home className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <span className="text-[11px] text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
                                {property.name || 'Sem nome'}
                              </span>
                              {selectedProperties.includes(property.id) && (
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                              )}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Clear Filters */}
              {(statusFilter !== 'all' || platformFilter !== 'all' || (selectedProperties.length > 0 && selectedProperties.length < properties.length) || searchQuery !== '') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setPlatformFilter('all');
                    setSelectedProperties(properties.map(p => p.id));
                    setSearchQuery('');
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total de Reservas</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">
              Todas as reservas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Confirmadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <p className="text-xs text-gray-500 mt-1">
              Reservas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-500 mt-1">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Revenue Total</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Receita confirmada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reservas</CardTitle>
              <CardDescription>
                Gerencie todas as reservas do sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                <Calendar className="h-4 w-4 mr-2" />
                Nova Reserva
              </Button>
              <Button onClick={loadReservations} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Reservations List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : pagedReservations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma reserva encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedReservations.map(reservation => {
                const guest = guestsMap.get(reservation.guestId); // OTIMIZADO: O(1) lookup
                const property = propertiesMap.get(reservation.propertyId); // OTIMIZADO: O(1) lookup
                
                return (
                  <div 
                    key={reservation.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                  >
                    {/* Linha 1: Hóspede + Status + Ações */}
                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {guest?.fullName || reservation.guestName || 'Hóspede'}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              #{reservation.id.slice(0, 8)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{guest?.phone || 'Sem telefone'}</span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {guest?.email && !guest.email.endsWith('@staysnet.local') ? guest.email : 'Sem email'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {getStatusBadge(reservation.status)}
                        {getPlatformBadge(reservation.platform, reservation.staysnetPartnerName)}
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewDetails(reservation)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(reservation)}
                            disabled={reservation.status === 'cancelled'}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(reservation)}
                            disabled={['cancelled', 'completed'].includes(reservation.status)}
                            title="Cancelar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Linha 2: Propriedade + Datas + Hóspedes */}
                    <div className="flex items-center gap-6 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700 text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {property?.name || 'Propriedade não encontrada'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 flex-shrink-0">
                        <CalendarDays className="h-4 w-4" />
                        <span>{format(parseDateCandidate(reservation.checkIn) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{format(parseDateCandidate(reservation.checkOut) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <Badge variant="outline" className="ml-2">
                          {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{reservation.guests.adults} adultos</span>
                        </div>
                        {reservation.guests.children > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{reservation.guests.children} crianças</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Linha 3: Valores Financeiros */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hospedagem</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          R$ {(reservation.pricing?.accommodation || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Taxas</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          R$ {(reservation.pricing?.fees || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Descontos</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          - R$ {(reservation.pricing?.discounts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-md p-2 -m-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                        <p className="font-bold text-purple-600 dark:text-purple-400">
                          R$ {(reservation.pricing?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && effectiveTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Página {page} de {effectiveTotalPages} • {effectiveTotalCount} reservas
              </div>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(effectiveTotalPages, p + 1))}
                disabled={page >= effectiveTotalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflicts Detection Dashboard */}
      <ConflictsDetectionDashboard />
      </div>
      {/* End Main Content */}

      {/* Modals */}
      {selectedReservation && (
        <>
          <ReservationDetailsModal
            open={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedReservation(null);
            }}
            reservation={selectedReservation}
            property={properties.find(p => p.id === selectedReservation.propertyId)}
            guest={guests.find(g => g.id === selectedReservation.guestId)}
            onUpdate={loadReservations}
          />

          <EditReservationWizard
            open={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedReservation(null);
            }}
            reservation={selectedReservation}
            property={properties.find(p => p.id === selectedReservation.propertyId)}
            onComplete={() => {
              setShowEditModal(false);
              setSelectedReservation(null);
              loadReservations();
            }}
          />

          <CancelReservationModal
            open={showCancelModal}
            onClose={() => {
              setShowCancelModal(false);
              setSelectedReservation(null);
            }}
            reservation={selectedReservation}
            onSuccess={() => {
              setShowCancelModal(false);
              setSelectedReservation(null);
              loadReservations();
            }}
          />
        </>
      )}

      {/* Create Reservation Modal */}
      <CreateReservationWizard
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onComplete={handleCreateSuccess}
      />
    </div>
  );
}
