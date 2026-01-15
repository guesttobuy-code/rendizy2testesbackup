import { useEffect, useMemo, useState } from 'react';
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

function getGuestCount(guests: number | GuestsInfo | undefined | null): number {
  if (!guests) return 1;
  if (typeof guests === 'number') return guests;
  if (typeof guests === 'object') {
    return guests.total || (guests.adults || 0) + (guests.children || 0) + (guests.infants || 0) || 1;
  }
  return 1;
}

function formatDateLabel(dateStr: string | undefined | null) {
  if (!dateStr) return 'Sem data';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Sem data';
  }
}

function formatDateShort(dateStr: string | undefined | null) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '-';
  }
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  } catch {
    return String(value);
  }
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

export function CalendarPage() {
  const { isAuthenticated } = useGuestAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReservations() {
      try {
        const config = window.GUEST_AREA_CONFIG;
        if (!config) throw new Error('Configuração não encontrada');

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

  const grouped = useMemo(() => {
    const sorted = [...reservations].sort((a, b) => {
      return new Date(a.check_in).getTime() - new Date(b.check_in).getTime();
    });

    const map = new Map<string, Reservation[]>();
    for (const r of sorted) {
      const key = r.check_in?.split('T')[0] || 'sem-data';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: formatDateLabel(items[0]?.check_in),
      items,
    }));
  }, [reservations]);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
        <p className="text-gray-500 text-sm mt-1">Visual simples por data com suas reservas</p>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🗓️</span>
          </div>
          <h3 className="font-medium text-gray-800">Nenhuma reserva encontrada</h3>
          <p className="text-gray-500 text-sm mt-1">Você ainda não possui reservas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="text-base">📅</span>
                <span>{group.label}</span>
              </div>
              <div className="space-y-3">
                {group.items.map((reservation) => (
                  <div key={reservation.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {reservation.property_name || 'Propriedade'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDateShort(reservation.check_in)} → {formatDateShort(reservation.check_out)}
                        </p>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 block">Hóspedes</span>
                        <span className="font-medium">{getGuestCount(reservation.guests)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Total</span>
                        <span className="font-medium">{formatCurrency(reservation.total_price)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Check-in</span>
                        <span className="font-medium">{formatDateShort(reservation.check_in)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Check-out</span>
                        <span className="font-medium">{formatDateShort(reservation.check_out)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
