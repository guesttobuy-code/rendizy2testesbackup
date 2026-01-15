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
    confirmed: { label: '✓ Confirmada', color: 'bg-slate-900 text-white' },
    pending: { label: 'Pendente', color: 'bg-yellow-400 text-yellow-900' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
    completed: { label: 'Concluída', color: 'bg-gray-100 text-gray-700' },
  };
  const { label, color } = map[status] || map.pending;
  return <span className={`px-3 py-1 text-xs rounded-full font-medium ${color}`}>{label}</span>;
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

  // Estatísticas (para uso futuro)
  const _totalCount = reservations.length;
  const _confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const _pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const _revenueTotal = reservations.reduce((acc, r) => acc + (Number(r.total_price) || 0), 0);
  void _totalCount; void _confirmedCount; void _pendingCount; void _revenueTotal;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie todas as reservas do sistema</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white font-medium">
            Nova Reserva
          </button>
          <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white">
            Exportar Excel (.xls)
          </button>
          <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 bg-white">
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2">
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
            const nights = getNights(reservation.check_in, reservation.check_out);
            const guestCount = getGuestCount(reservation.guests);
            
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
                        <span className="font-semibold text-gray-900">Hóspede</span>
                        <span className="text-xs text-gray-400">#{reservation.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>📞 Sem telefone</span>
                        <span>•</span>
                        <span>✉️ Sem email</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(reservation.status)}
                    <span className="px-3 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
                      Direto
                    </span>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="6" r="1" />
                        <circle cx="12" cy="18" r="1" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Linha do meio: Propriedade + Datas */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      🏠
                    </div>
                    <span className="font-medium text-gray-900">
                      {reservation.property_name || 'Propriedade'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatDate(reservation.check_in)}</span>
                      <span className="text-gray-400">→</span>
                      <span>{formatDate(reservation.check_out)}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                      {nights} {nights === 1 ? 'noite' : 'noites'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span>👥</span>
                      <span>{guestCount} {guestCount === 1 ? 'adulto' : 'adultos'}</span>
                    </div>
                  </div>
                </div>

                {/* Linha inferior: Valores */}
                <div className="flex items-center justify-between gap-4 px-4 pb-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <div className="text-gray-500">Hospedagem</div>
                      <div className="font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.total_price || 0)}
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
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservation.total_price || 0)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
