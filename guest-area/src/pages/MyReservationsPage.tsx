import { useState, useEffect } from 'react';
import { useGuestAuth } from '../contexts/GuestAuthContext';

interface GuestsInfo {
  adults?: number;
  children?: number;
  infants?: number;
  total?: number;
}

interface Reservation {
  id: string;
  property_id: string;
  property_name: string;
  property_image?: string;
  check_in: string;
  check_out: string;
  guests: number | GuestsInfo;
  total_price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  created_at: string;
}

// Helper to extract guest count from guests field (can be number or object)
function getGuestCount(guests: number | GuestsInfo | undefined | null): number {
  if (!guests) return 1;
  if (typeof guests === 'number') return guests;
  if (typeof guests === 'object') {
    return guests.total || (guests.adults || 0) + (guests.children || 0) + (guests.infants || 0) || 1;
  }
  return 1;
}

function getStatusBadge(status: Reservation['status']) {
  const map = {
    confirmed: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
    completed: { label: 'Concluída', color: 'bg-gray-100 text-gray-700' },
  };
  const { label, color } = map[status] || map.pending;
  return <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>{label}</span>;
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


export function MyReservationsPage() {
  const { isAuthenticated } = useGuestAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [focusId, setFocusId] = useState<string>('');

  useEffect(() => {
    try {
      // HashRouter query support: /#/reservas?focus=<id>
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

        // Dados do hóspede (BFF): apenas reservas do usuário autenticado.
        // Não mistura com dados do painel admin.
        // Sessão profissional: buscar via BFF (cookie httpOnly)
        const res = await fetch(`/api/guest/reservations/mine?siteSlug=${encodeURIComponent(config.siteSlug)}`);

        if (!res.ok) throw new Error('Erro ao buscar reservas');

        const data = await res.json();
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
    if (filter === 'all') return true;
    const checkOutDate = new Date(r.check_out);
    if (filter === 'upcoming') return checkOutDate >= today;
    if (filter === 'past') return checkOutDate < today;
    return true;
  });

  // Ordenar: próximas primeiro
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    return new Date(a.check_in).getTime() - new Date(b.check_in).getTime();
  });

  const totalCount = reservations.length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const revenueTotal = reservations.reduce((acc, r) => acc + (Number(r.total_price) || 0), 0);

  useEffect(() => {
    if (!focusId) return;
    const t = window.setTimeout(() => {
      try {
        const el = document.getElementById(`reservation-${focusId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {}
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
      <aside className="w-72 hidden lg:block">
        <div className="bg-white border rounded-xl p-4 space-y-4">
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
            <select className="mt-2 w-full text-sm border rounded-lg px-3 py-2 bg-gray-50">
              <option>Todos</option>
              <option>Confirmadas</option>
              <option>Pendentes</option>
            </select>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800">Buscar</p>
            <input className="mt-2 w-full text-sm border rounded-lg px-3 py-2 bg-gray-50" placeholder="ID, hóspede, propriedade" />
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie suas reservas</p>
          </div>

          <div className="flex gap-2">
            {(['all', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'Todas' : f === 'upcoming' ? 'Próximas' : 'Passadas'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <p className="text-2xl font-bold text-indigo-600">
              {revenueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-gray-500 mt-1">Receita confirmada</p>
          </div>
        </div>

        {/* Lista de Reservas */}
        {sortedReservations.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
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
          <div className="space-y-3">
            {sortedReservations.map((reservation) => (
              <div
                key={reservation.id}
                id={`reservation-${reservation.id}`}
                className={`bg-white rounded-xl border hover:shadow-sm transition-shadow ${
                  focusId && reservation.id === focusId ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-lg bg-gray-50 flex items-center justify-center text-2xl">
                    🏠
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {reservation.property_name || 'Propriedade'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}
                        </div>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-gray-500 block">Check-in</span>
                        <span className="font-medium">{formatDate(reservation.check_in)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Check-out</span>
                        <span className="font-medium">{formatDate(reservation.check_out)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Hóspedes</span>
                        <span className="font-medium">{getGuestCount(reservation.guests)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Total</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(reservation.total_price || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
