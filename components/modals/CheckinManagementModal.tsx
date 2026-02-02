/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                   CHECKIN MANAGEMENT MODAL                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Modal de Gestão de Check-in para uso no Chat.
 * 
 * FLUXO:
 * 1. Seleciona imóvel (lista com busca)
 * 2. Define período (default: ontem → amanhã)
 * 3. Lista reservas do imóvel no período
 * 4. Seleciona reserva → mostra instruções + status
 * 
 * @version 2.0.0
 * @date 2026-02-01
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import {
  LogIn,
  Calendar,
  Users,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  RefreshCw,
  Home,
  ChevronLeft,
  User,
  Phone,
  CalendarDays,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { CheckinInstructionsCard } from '../crm/pages/operacoes/CheckinInstructionsCard';
import { getSupabaseClient } from '@/utils/supabase/client';
import { reservationsApi } from '@/utils/api';
import { useActivityLogs, CheckinStatusData } from '../../src/hooks/useActivityLogs';

// ============================================================================
// TYPES
// ============================================================================

interface Reservation {
  id: string;
  staysnet_reservation_code: string | null;
  guests_total: number;
  check_in: string;
  check_out: string;
  status: string;
  property_id: string;
  guest?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
  } | null;
}

interface Property {
  id: string;
  name: string;
  code: string;
  checkin_category: string | null;
  checkin_config: Record<string, any> | null;
}

export interface CheckinManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: {
    id?: string;
    name: string;
    phone?: string;
  };
}

type CheckinStatus = 'pending' | 'in_progress' | 'completed';
type Step = 'select_property' | 'select_reservation' | 'view_checkin';

// ============================================================================
// COMPONENT
// ============================================================================

export function CheckinManagementModal({
  open,
  onOpenChange,
  contact,
}: CheckinManagementModalProps) {
  // Step control
  const [step, setStep] = useState<Step>('select_property');
  
  // Data states
  const [loading, setLoading] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Search/Filter states
  const [propertySearch, setPropertySearch] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Status state
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus>('pending');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Activity logs hook
  const { addLog } = useActivityLogs();

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (!propertySearch) return properties;
    const search = propertySearch.toLowerCase();
    return properties.filter(p => 
      p.name?.toLowerCase().includes(search) || 
      p.code?.toLowerCase().includes(search)
    );
  }, [properties, propertySearch]);

  // Initialize dates (yesterday to tomorrow)
  useEffect(() => {
    const today = new Date();
    setDateFrom(format(subDays(today, 1), 'yyyy-MM-dd'));
    setDateTo(format(addDays(today, 1), 'yyyy-MM-dd'));
  }, []);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      loadProperties();
    } else {
      // Reset all states
      setStep('select_property');
      setProperties([]);
      setReservations([]);
      setSelectedProperty(null);
      setSelectedReservation(null);
      setPropertySearch('');
      setCheckinStatus('pending');
    }
  }, [open]);

  // Load properties with checkin configured
  const loadProperties = async () => {
    setLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/lista`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Filter only properties with checkin_category
        const props = (result.anuncios || [])
          .filter((p: any) => p.checkin_category)
          .map((p: any) => {
            const data = p.data || {};
            const internalName = data.internalId || data.internal_id || p.internalId || '';
            return {
              id: p.id,
              name: internalName || `Imóvel ${p.id.slice(0, 8)}`,
              code: p.code || '',
              checkin_category: p.checkin_category || null,
              checkin_config: p.checkin_config || {},
            };
          });
        
        setProperties(props);
      } else {
        toast.error('Erro ao carregar imóveis');
      }
    } catch (error) {
      console.error('[CheckinManagementModal] Error loading properties:', error);
      toast.error('Erro ao carregar imóveis');
    } finally {
      setLoading(false);
    }
  };

  // Load reservations for selected property and date range
  const loadReservations = async () => {
    if (!selectedProperty || !dateFrom || !dateTo) return;
    
    setLoadingReservations(true);
    try {
      const supabase = getSupabaseClient();
      
      // Buscar reservas que:
      // - check_in <= dateTo AND check_out >= dateFrom (overlap)
      // - property_id = selectedProperty.id
      // - status em (confirmed, pending, checked_in)
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id, 
          staysnet_reservation_code, 
          guests_total, 
          check_in, 
          check_out, 
          status, 
          property_id,
          guest:guest_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('property_id', selectedProperty.id)
        .lte('check_in', dateTo)
        .gte('check_out', dateFrom)
        .or('status.eq.confirmed,status.eq.pending,status.eq.checked_in')
        .order('check_in', { ascending: true });

      if (error) {
        console.error('[CheckinManagementModal] Error loading reservations:', error);
        toast.error('Erro ao carregar reservas');
        return;
      }

      setReservations(data || []);
    } catch (error) {
      console.error('[CheckinManagementModal] Error:', error);
      toast.error('Erro ao carregar reservas');
    } finally {
      setLoadingReservations(false);
    }
  };

  // Handle property selection
  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setStep('select_reservation');
    // Auto-load reservations after a small delay
    setTimeout(() => {
      loadReservations();
    }, 100);
  };

  // Handle reservation selection
  const handleSelectReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setCheckinStatus(reservation.status === 'checked_in' ? 'completed' : 'pending');
    setStep('view_checkin');
  };

  // Handle status update
  const handleUpdateStatus = async (newStatus: CheckinStatus) => {
    if (!selectedReservation) {
      toast.error('Nenhuma reserva selecionada');
      return;
    }

    const oldStatus = checkinStatus;
    setUpdatingStatus(true);
    try {
      const reservationStatus = newStatus === 'completed' ? 'checked_in' : 'confirmed';
      
      const response = await reservationsApi.update(selectedReservation.id, {
        status: reservationStatus,
      });

      if (!response.success) {
        throw new Error(response.error || 'Erro ao atualizar status');
      }

      setCheckinStatus(newStatus);
      setSelectedReservation(prev => prev ? { ...prev, status: reservationStatus } : null);

      const statusLabels = {
        pending: 'Pendente',
        in_progress: 'Em Andamento',
        completed: 'Concluído',
      };
      
      toast.success(`Check-in marcado como ${statusLabels[newStatus]}`);

      // ✅ Registrar log de atividade
      if (contact?.phone) {
        const guestName = selectedReservation.guest 
          ? `${selectedReservation.guest.first_name} ${selectedReservation.guest.last_name}`.trim()
          : contact.name;
          
        const logData: CheckinStatusData = {
          property_id: selectedProperty?.id || '',
          property_name: selectedProperty?.name || 'Imóvel',
          reservation_code: selectedReservation.staysnet_reservation_code || undefined,
          guest_name: guestName,
          old_status: oldStatus,
          new_status: newStatus,
        };
        
        addLog(contact.phone, 'checkin_status', logData);
      }
    } catch (error) {
      console.error('[CheckinManagementModal] Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Get reservation badge info
  const getReservationBadge = (reservation: Reservation) => {
    const checkIn = parseISO(reservation.check_in);
    const checkOut = parseISO(reservation.check_out);
    
    if (isToday(checkIn)) {
      return { text: 'Check-in HOJE', color: 'bg-green-500 text-white' };
    }
    if (isToday(checkOut)) {
      return { text: 'Check-out HOJE', color: 'bg-orange-500 text-white' };
    }
    if (isTomorrow(checkIn)) {
      return { text: 'Check-in amanhã', color: 'bg-blue-500 text-white' };
    }
    if (isYesterday(checkOut)) {
      return { text: 'Check-out ontem', color: 'bg-gray-500 text-white' };
    }
    return null;
  };

  // Calculate nights
  const calculateNights = (checkIn: string, checkOut: string) => {
    try {
      const start = parseISO(checkIn);
      const end = parseISO(checkOut);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Go back handler
  const handleGoBack = () => {
    if (step === 'view_checkin') {
      setSelectedReservation(null);
      setStep('select_reservation');
    } else if (step === 'select_reservation') {
      setSelectedProperty(null);
      setReservations([]);
      setStep('select_property');
    }
  };

  // Effect to reload reservations when dates change
  useEffect(() => {
    if (selectedProperty && dateFrom && dateTo && step === 'select_reservation') {
      loadReservations();
    }
  }, [dateFrom, dateTo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            {step !== 'select_property' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 mr-1"
                onClick={handleGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <LogIn className="h-5 w-5 text-green-600" />
            Gestão de Check-in
          </DialogTitle>
          <DialogDescription className="text-xs">
            {contact ? (
              <span>Gerenciar check-in para <strong>{contact.name}</strong></span>
            ) : (
              'Selecione um imóvel para gerenciar check-in'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto">
          {/* ========================================= */}
          {/* STEP 1: SELECT PROPERTY */}
          {/* ========================================= */}
          {step === 'select_property' && (
            <div className="space-y-3 py-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Carregando imóveis...</p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-800">
                          Selecione um imóvel
                        </p>
                        <p className="text-xs text-amber-700">
                          Escolha o imóvel para buscar as reservas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar imóvel por nome ou código..."
                      value={propertySearch}
                      onChange={(e) => setPropertySearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>

                  {/* Property list */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {filteredProperties.length === 0 ? (
                        <div className="p-3 text-center text-muted-foreground text-xs">
                          {properties.length === 0 
                            ? 'Nenhum imóvel com check-in configurado'
                            : 'Nenhum imóvel encontrado'}
                        </div>
                      ) : (
                        filteredProperties.map((property) => (
                          <button
                            key={property.id}
                            className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                            onClick={() => handleSelectProperty(property)}
                          >
                            <Home className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{property.name}</p>
                            </div>
                            {property.checkin_category && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {property.checkin_category.replace('grupo_whatsapp', 'grupo').replace('portaria_direta', 'port.').replace('email_portaria', 'email')}
                              </Badge>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* STEP 2: SELECT RESERVATION */}
          {/* ========================================= */}
          {step === 'select_reservation' && selectedProperty && (
            <div className="space-y-3 py-2">
              {/* Selected property */}
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Home className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm text-green-900 flex-1 truncate">
                  {selectedProperty.name}
                </span>
              </div>

              {/* Date range selector */}
              <div className="bg-gray-50 rounded-lg p-3 border">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Período de busca</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">De</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Até</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 mt-4"
                    onClick={loadReservations}
                    disabled={loadingReservations}
                  >
                    {loadingReservations ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Reservations list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Reservas encontradas
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {reservations.length}
                  </Badge>
                </div>

                {loadingReservations ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">Buscando reservas...</p>
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="p-4 text-center border rounded-lg bg-gray-50">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma reserva encontrada no período
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tente ajustar as datas de busca
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {reservations.map((reservation) => {
                      const badge = getReservationBadge(reservation);
                      const nights = calculateNights(reservation.check_in, reservation.check_out);
                      const isCheckinToday = isToday(parseISO(reservation.check_in));
                      
                      return (
                        <button
                          key={reservation.id}
                          className={cn(
                            'w-full p-3 text-left rounded-lg border transition-all hover:shadow-sm',
                            isCheckinToday 
                              ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          )}
                          onClick={() => handleSelectReservation(reservation)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-sm truncate">
                                  {reservation.guest ? `${reservation.guest.first_name} ${reservation.guest.last_name}`.trim() : 'Hóspede'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}
                                </span>
                                <span>({nights} {nights === 1 ? 'noite' : 'noites'})</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {reservation.guests_total || 1}
                                </span>
                              </div>
                            </div>
                            {badge && (
                              <Badge className={cn('text-xs px-1.5 py-0.5 flex-shrink-0', badge.color)}>
                                {badge.text}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* STEP 3: VIEW CHECKIN INSTRUCTIONS */}
          {/* ========================================= */}
          {step === 'view_checkin' && selectedProperty && selectedReservation && (
            <div className="space-y-3 py-2">
              {/* Selected property */}
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Home className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm text-green-900 flex-1 truncate">
                  {selectedProperty.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-green-700"
                  onClick={() => {
                    setSelectedProperty(null);
                    setSelectedReservation(null);
                    setStep('select_property');
                  }}
                >
                  Trocar
                </Button>
              </div>

              {/* Selected reservation */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-sm text-blue-900">
                        {selectedReservation.guest ? `${selectedReservation.guest.first_name} ${selectedReservation.guest.last_name}`.trim() : 'Hóspede'}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-blue-700 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(selectedReservation.check_in)} → {formatDate(selectedReservation.check_out)}
                        <span className="text-blue-600">
                          ({calculateNights(selectedReservation.check_in, selectedReservation.check_out)} noites)
                        </span>
                      </p>
                      {selectedReservation.guest?.phone && (
                        <p className="text-xs text-blue-700 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedReservation.guest.phone}
                        </p>
                      )}
                      <p className="text-xs text-blue-600">
                        Reserva #{selectedReservation.staysnet_reservation_code || selectedReservation.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-700"
                    onClick={() => {
                      setSelectedReservation(null);
                      setStep('select_reservation');
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              </div>

              {/* Checkin instructions card */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <LogIn className="h-3.5 w-3.5" />
                  Instruções de Check-in
                </h4>
                <CheckinInstructionsCard
                  checkin_category={selectedProperty.checkin_category}
                  checkin_config={selectedProperty.checkin_config}
                  guestName={selectedReservation.guest ? `${selectedReservation.guest.first_name} ${selectedReservation.guest.last_name}`.trim() : undefined}
                  guestPhone={selectedReservation.guest?.phone}
                  guestCount={selectedReservation.guests_total}
                  propertyName={selectedProperty.name}
                />
              </div>

              {/* Status buttons */}
              <div className="pt-3 border-t">
                <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Status do Check-in
                </h4>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={checkinStatus === 'pending' ? 'default' : 'outline'}
                    className={cn(
                      'flex-1 h-9 text-xs',
                      checkinStatus === 'pending' && 'bg-gray-600 hover:bg-gray-700'
                    )}
                    onClick={() => handleUpdateStatus('pending')}
                    disabled={updatingStatus}
                  >
                    <Circle className="h-3.5 w-3.5 mr-1.5" />
                    Pendente
                  </Button>
                  <Button
                    size="sm"
                    variant={checkinStatus === 'in_progress' ? 'default' : 'outline'}
                    className={cn(
                      'flex-1 h-9 text-xs',
                      checkinStatus === 'in_progress' && 'bg-yellow-600 hover:bg-yellow-700'
                    )}
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={updatingStatus}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', updatingStatus && 'animate-spin')} />
                    Em Andamento
                  </Button>
                  <Button
                    size="sm"
                    variant={checkinStatus === 'completed' ? 'default' : 'outline'}
                    className={cn(
                      'flex-1 h-9 text-xs',
                      checkinStatus === 'completed' && 'bg-green-600 hover:bg-green-700'
                    )}
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updatingStatus}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Concluído
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t mt-auto">
          <Button variant="outline" size="sm" className="h-8" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CheckinManagementModal;
