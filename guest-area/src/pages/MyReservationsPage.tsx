import { useState, useEffect } from 'react';
import { useGuestAuth } from '../contexts/GuestAuthContext';

// Interface de endereço completo
interface AddressInfo {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

// Interface alinhada com o retorno da API /reservations/mine
interface PropertyInfo {
  id: string;
  name: string;
  title?: string; // Título do anúncio (o que o hóspede reconhece)
  code?: string;
  coverPhoto?: string;
  address?: AddressInfo;
  // Campos legados para compatibilidade
  city?: string;
  state?: string;
}

interface GuestsInfo {
  adults?: number;
  children?: number;
  infants?: number;
  total?: number;
}

interface ApiReservation {
  id: string;
  reservationCode?: string;
  property?: PropertyInfo | null;
  checkIn: string;
  checkOut: string;
  nights?: number;
  guests?: GuestsInfo;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  paymentStatus?: string;
  totalPrice?: number;
  currency?: string;
  notes?: string;
  specialRequests?: string;
  createdAt?: string;
  updatedAt?: string;
  // Fallback para formato antigo
  property_name?: string;
  check_in?: string;
  check_out?: string;
  total_price?: number;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
}

// Helper para formatar endereço completo
function formatFullAddress(property: PropertyInfo | null | undefined): string {
  if (!property?.address) {
    // Fallback para campos legados
    if (property?.city) {
      return property.state ? `${property.city}, ${property.state}` : property.city;
    }
    return '';
  }
  
  const addr = property.address;
  const parts: string[] = [];
  
  // Rua + número
  if (addr.street) {
    parts.push(addr.number ? `${addr.street}, ${addr.number}` : addr.street);
  }
  
  // Bairro
  if (addr.neighborhood) {
    parts.push(addr.neighborhood);
  }
  
  // Cidade + Estado
  if (addr.city) {
    parts.push(addr.state ? `${addr.city}/${addr.state}` : addr.city);
  }
  
  return parts.join(' - ');
}

// Helper para normalizar dados (API nova vs antiga)
function normalizeReservation(r: ApiReservation) {
  // Usa título do anúncio (o que o hóspede vê), com fallback para nome interno
  const propertyDisplayName = r.property?.title || r.property?.name || r.property_name || 'Propriedade';
  const fullAddress = formatFullAddress(r.property);
  
  return {
    id: r.id,
    propertyName: propertyDisplayName, // Título do anúncio
    propertyImage: r.property?.coverPhoto || null,
    propertyAddress: fullAddress, // Endereço completo formatado
    propertyCity: r.property?.address?.city || r.property?.city || '',
    checkIn: r.checkIn || r.check_in || '',
    checkOut: r.checkOut || r.check_out || '',
    nights: r.nights || getNights(r.checkIn || r.check_in || '', r.checkOut || r.check_out || ''),
    guestsTotal: r.guests?.total || r.guests?.adults || 1,
    guestsAdults: r.guests?.adults || 1,
    status: r.status || 'pending',
    paymentStatus: r.paymentStatus || 'pending',
    totalPrice: r.totalPrice ?? r.total_price ?? 0,
    currency: r.currency || 'BRL',
    guestName: r.guest_name || '',
    guestEmail: r.guest_email || '',
    guestPhone: r.guest_phone || '',
    createdAt: r.createdAt || '',
  };
}

function getNights(checkIn: string, checkOut: string): number {
  try {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    confirmed: { label: '✓ Confirmada', color: 'bg-slate-900 text-white' },
    pending: { label: 'Pendente', color: 'bg-yellow-400 text-yellow-900' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
    completed: { label: 'Concluída', color: 'bg-gray-100 text-gray-700' },
  };
  const { label, color } = map[status] || map.pending;
  return <span className={`px-3 py-1 text-xs rounded-full font-medium ${color}`}>{label}</span>;
}

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatCurrency(value: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}


export function MyReservationsPage() {
  const { isAuthenticated, user } = useGuestAuth();
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusId, setFocusId] = useState<string>('');

  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const q = hash.includes('?') ? hash.split('?').slice(1).join('?') : '';
      const params = new URLSearchParams(q);
      const f = params.get('focus') || '';
      setFocusId(f);
    } catch {
      setFocusId('');
    }
  }, []);

  useEffect(() => {
    async function fetchReservations() {
      try {
        const config = window.GUEST_AREA_CONFIG;
        if (!config) throw new Error('Configuração não encontrada');

        const res = await fetch(`/api/guest/reservations/mine?siteSlug=${encodeURIComponent(config.siteSlug)}`);

        if (!res.ok) throw new Error('Erro ao buscar reservas');

        const data = await res.json();
        console.log('[MyReservationsPage] Dados recebidos:', data);
        setReservations(data.data || data.reservations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchReservations();
    }
  }, [isAuthenticated]);

  // Filtrar reservas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredReservations = reservations.filter((r) => {
    const norm = normalizeReservation(r);
    
    // Filtro de período
    const checkOutDate = new Date(norm.checkOut);
    if (filter === 'upcoming' && checkOutDate < today) return false;
    if (filter === 'past' && checkOutDate >= today) return false;
    
    // Filtro de status
    if (statusFilter !== 'all' && norm.status !== statusFilter) return false;
    
    // Filtro de busca
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = norm.propertyName.toLowerCase().includes(q) ||
                    norm.id.toLowerCase().includes(q) ||
                    norm.guestName.toLowerCase().includes(q);
      if (!match) return false;
    }
    
    return true;
  });

  // Ordenar: próximas primeiro
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    const aDate = new Date(a.checkIn || a.check_in || '').getTime();
    const bDate = new Date(b.checkIn || b.check_in || '').getTime();
    return aDate - bDate;
  });

  // Estatísticas
  const totalCount = reservations.length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const revenueTotal = reservations.reduce((acc, r) => acc + (r.totalPrice ?? r.total_price ?? 0), 0);

  useEffect(() => {
    if (!focusId) return;
    const t = window.setTimeout(() => {
      try {
        const el = document.getElementById(`reservation-${focusId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch { /* ignore */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [focusId, sortedReservations.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Erro ao carregar reservas</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Painel de filtros (esquerda) */}
      <aside className="w-72 hidden lg:block shrink-0">
        <div className="bg-white border rounded-xl p-4 space-y-4 sticky top-6">
          <div>
            <p className="text-sm font-semibold text-gray-800">Reservas</p>
            <p className="text-xs text-gray-500">Tipo de data</p>
            <select className="mt-2 w-full text-sm border rounded-lg px-3 py-2 bg-gray-50">
              <option>Check-in</option>
              <option>Check-out</option>
            </select>
          </div>

          <div>
            <p className="text-xs text-gray-500">De - até</p>
            <input className="mt-2 w-full text-sm border rounded-lg px-3 py-2 bg-gray-50" placeholder="01 jan - 31 dez" />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800">Status</p>
            <select 
              className="mt-2 w-full text-sm border rounded-lg px-3 py-2 bg-gray-50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="confirmed">Confirmadas</option>
              <option value="pending">Pendentes</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800">Buscar</p>
            <input 
              className="mt-2 w-full text-sm border rounded-lg px-3 py-2 bg-gray-50" 
              placeholder="ID, hóspede, propriedade"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie suas reservas</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'upcoming' ? 'Próximas' : 'Passadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Total de Reservas</p>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
            <p className="text-xs text-gray-500 mt-1">Todas as reservas</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Confirmadas</p>
            <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Reservas ativas</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-xs text-gray-500 mt-1">Aguardando confirmação</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-xs text-gray-500">Revenue Total</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(revenueTotal)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Receita confirmada</p>
          </div>
        </div>

        {/* Lista de Reservas */}
        {sortedReservations.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="font-medium text-gray-800">Nenhuma reserva encontrada</h3>
            <p className="text-gray-500 text-sm mt-1">
              {filter === 'all'
                ? 'Você ainda não possui reservas.'
                : filter === 'upcoming'
                ? 'Você não possui reservas futuras.'
                : 'Você não possui reservas passadas.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReservations.map((reservation) => {
              const norm = normalizeReservation(reservation);
              
              return (
                <div
                  key={reservation.id}
                  id={`reservation-${reservation.id}`}
                  className={`bg-white rounded-2xl border hover:shadow-sm transition-shadow ${
                    focusId && reservation.id === focusId ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {/* Linha superior: Hóspede + Status + Ações */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {norm.guestName || user?.name || 'Hóspede'}
                          </span>
                          <span className="text-xs text-gray-400">#{reservation.id.slice(0, 8)}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>📞 {norm.guestPhone || 'Sem telefone'}</span>
                          <span>•</span>
                          <span>✉️ {norm.guestEmail || user?.email || 'Sem email'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(norm.status)}
                      <span className="px-3 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
                        Direto
                      </span>
                    </div>
                  </div>

                  {/* Linha do meio: Propriedade + Datas */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      {norm.propertyImage ? (
                        <img src={norm.propertyImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                          🏠
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-900">{norm.propertyName}</span>
                        {norm.propertyAddress && (
                          <span className="text-xs text-gray-500 block flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            {norm.propertyAddress}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{formatDate(norm.checkIn)}</span>
                        <span className="text-gray-400">→</span>
                        <span>{formatDate(norm.checkOut)}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                        {norm.nights} {norm.nights === 1 ? 'noite' : 'noites'}
                      </span>
                      <div className="flex items-center gap-1">
                        <span>👥</span>
                        <span>{norm.guestsAdults} {norm.guestsAdults === 1 ? 'adulto' : 'adultos'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Linha inferior: Valores */}
                  <div className="flex items-center justify-between gap-4 px-4 pb-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <div className="text-gray-500">Hospedagem</div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(norm.totalPrice, norm.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Taxas</div>
                        <div className="font-medium text-gray-900">R$ 0,00</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Descontos</div>
                        <div className="font-medium text-green-600">- R$ 0,00</div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-xl px-4 py-2 text-right">
                      <div className="text-xs text-purple-500">Total</div>
                      <div className="text-lg font-bold text-purple-700">
                        {formatCurrency(norm.totalPrice, norm.currency)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
