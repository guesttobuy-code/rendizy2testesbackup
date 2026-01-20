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

export function DashboardPage() {
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

  const metrics = useMemo(() => {
    const total = reservations.length;
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length;
    const pending = reservations.filter((r) => r.status === 'pending').length;
    const revenue = reservations.reduce((acc, r) => acc + (Number(r.total_price) || 0), 0);
    return { total, confirmed, pending, revenue };
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
        <p className="font-medium">Erro ao carregar dados</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Inicial</h1>
          <p className="text-gray-500 text-sm mt-1">Resumo do hóspede</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Total de Reservas</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
          <p className="text-xs text-gray-500 mt-1">Todas as reservas</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Confirmadas</p>
          <p className="text-2xl font-bold text-green-600">{metrics.confirmed}</p>
          <p className="text-xs text-gray-500 mt-1">Reservas ativas</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{metrics.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Aguardando confirmação</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Revenue Total</p>
          <p className="text-2xl font-bold text-indigo-600">
            {metrics.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Receita confirmada</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Reservas</p>
            <p className="text-xs text-gray-500">Gerencie suas reservas</p>
          </div>
          <a
            href="#/reservas"
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            Ver todas
          </a>
        </div>
        <div className="divide-y">
          {reservations.slice(0, 5).map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{r.property_name || 'Propriedade'}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.check_in)} → {formatDate(r.check_out)}</p>
                </div>
                <div className="text-sm text-gray-600">
                  {Number(r.total_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            </div>
          ))}
          {reservations.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">Nenhuma reserva encontrada.</div>
          )}
        </div>
      </div>
    </div>
  );
}
