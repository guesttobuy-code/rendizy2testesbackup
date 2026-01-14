import { useState, useEffect } from 'react';
import { useGuestAuth } from '../contexts/GuestAuthContext';

interface Reservation {
  id: string;
  property_id: string;
  property_name: string;
  property_image?: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  created_at: string;
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

function getDaysUntilCheckIn(checkIn: string | undefined | null): string {
  if (!checkIn) return '';
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    const diffTime = checkInDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Já passou';
    if (diffDays === 0) return 'Hoje!';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays <= 7) return `Em ${diffDays} dias`;
    if (diffDays <= 30) return `Em ${Math.ceil(diffDays / 7)} semanas`;
    return `Em ${Math.ceil(diffDays / 30)} meses`;
  } catch {
    return '';
  }
}

export function MyReservationsPage() {
  const { token } = useGuestAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    async function fetchReservations() {
      try {
        const config = window.GUEST_AREA_CONFIG;
        if (!config) throw new Error('Configuração não encontrada');

        // Usar endpoint correto: /client-sites/api/:subdomain/reservations/mine
        const apiBase = `${config.supabaseUrl}/functions/v1/rendizy-public/client-sites/api`;
        const res = await fetch(`${apiBase}/${config.siteSlug}/reservations/mine`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Erro ao buscar reservas');

        const data = await res.json();
        setReservations(data.data || data.reservations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchReservations();
    }
  }, [token]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Minhas Reservas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {reservations.length} reserva{reservations.length !== 1 ? 's' : ''} encontrada{reservations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtros */}
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
        <div className="grid gap-4">
          {sortedReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white rounded-xl border hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Imagem */}
                <div className="sm:w-48 h-40 sm:h-auto bg-gray-100 flex-shrink-0">
                  {reservation.property_image ? (
                    <img
                      src={reservation.property_image}
                      alt={reservation.property_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      🏠
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {reservation.property_name || 'Propriedade'}
                      </h3>
                      <p className="text-sm text-primary font-medium">
                        {getDaysUntilCheckIn(reservation.check_in)}
                      </p>
                    </div>
                    {getStatusBadge(reservation.status)}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
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
                      <span className="font-medium">{reservation.guests || 1} pessoa{(reservation.guests || 1) !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Total</span>
                      <span className="font-medium text-primary">
                        R$ {(reservation.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
  );
}
