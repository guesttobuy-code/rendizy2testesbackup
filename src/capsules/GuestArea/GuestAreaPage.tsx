/**
 * 🏠 CÁPSULA GUEST AREA - v1.0.0
 * 
 * Área do Hóspede servida centralmente pelo Rendizy.
 * Sites de clientes redirecionam para: /guest-area/?slug=SUBDOMAIN
 * 
 * Parâmetros aceitos via query string:
 * - slug: subdomain do cliente (ex: medhome)
 * - primary: cor primária (ex: %235DBEBD)
 * - secondary: cor secundária
 * - accent: cor de destaque
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { Calendar, MapPin, Users, Clock, CheckCircle, XCircle, LogOut, ChevronRight, Home, AlertCircle, Loader2 } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface GuestReservation {
  id: string;
  property_id: string;
  property_name: string;
  property_image: string;
  property_address: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  total_price: number;
  checkin_done: boolean;
  checkout_done: boolean;
  created_at: string;
}

interface GuestUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

type TabType = 'upcoming' | 'past' | 'cancelled';

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function ReservationCard({ 
  reservation, 
  onCheckIn, 
  onCheckOut,
  primaryColor 
}: { 
  reservation: GuestReservation;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  primaryColor: string;
}) {
  const isUpcoming = new Date(reservation.check_in) > new Date();
  const isActive = new Date(reservation.check_in) <= new Date() && new Date(reservation.check_out) >= new Date();
  const isPast = new Date(reservation.check_out) < new Date();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = () => {
    if (reservation.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Cancelada</span>;
    }
    if (reservation.status === 'completed' || isPast) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Concluída</span>;
    }
    if (isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Em andamento</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Confirmada</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Imagem do imóvel */}
      <div className="relative h-48 bg-gray-200">
        {reservation.property_image ? (
          <img 
            src={reservation.property_image} 
            alt={reservation.property_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
          {reservation.property_name}
        </h3>
        
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{reservation.property_address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(reservation.check_in)} → {formatDate(reservation.check_out)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{reservation.guests} hóspede{reservation.guests > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Valor */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-gray-500 text-sm">Total</span>
          <span className="font-semibold text-lg" style={{ color: primaryColor }}>
            R$ {reservation.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Ações de Check-in/Check-out */}
        {isActive && !reservation.checkin_done && onCheckIn && (
          <button
            onClick={onCheckIn}
            className="w-full mt-4 py-2.5 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            <CheckCircle className="w-5 h-5" />
            Fazer Check-in Online
          </button>
        )}

        {isActive && reservation.checkin_done && !reservation.checkout_done && onCheckOut && (
          <button
            onClick={onCheckOut}
            className="w-full mt-4 py-2.5 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors bg-orange-500 hover:bg-orange-600"
          >
            <XCircle className="w-5 h-5" />
            Fazer Check-out Online
          </button>
        )}

        {reservation.checkin_done && reservation.checkout_done && (
          <div className="mt-4 py-2.5 px-4 rounded-lg bg-green-50 text-green-700 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Check-in e Check-out realizados
          </div>
        )}
      </div>
    </div>
  );
}

function ReservationTabs({ 
  activeTab, 
  onTabChange,
  counts,
  primaryColor 
}: { 
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: { upcoming: number; past: number; cancelled: number };
  primaryColor: string;
}) {
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'upcoming', label: 'Próximas', count: counts.upcoming },
    { id: 'past', label: 'Passadas', count: counts.past },
    { id: 'cancelled', label: 'Canceladas', count: counts.cancelled },
  ];

  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id 
              ? 'bg-white shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
          style={activeTab === tab.id ? { color: primaryColor } : {}}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-gray-100' : 'bg-gray-200'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function GuestAreaPage() {
  const [searchParams] = useSearchParams();
  
  // Parâmetros da query string
  const slug = searchParams.get('slug') || '';
  const primaryColor = decodeURIComponent(searchParams.get('primary') || '#5DBEBD');
  const secondaryColor = decodeURIComponent(searchParams.get('secondary') || '#FF8B94');
  const accentColor = decodeURIComponent(searchParams.get('accent') || '#4a9d9c');

  // Estados
  const [user, setUser] = useState<GuestUser | null>(null);
  const [reservations, setReservations] = useState<GuestReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [error, setError] = useState<string | null>(null);

  // Verificar sessão atual
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Hóspede',
            avatar_url: session.user.user_metadata?.avatar_url,
          });
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Hóspede',
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
        setReservations([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar reservas do hóspede
  const fetchReservations = useCallback(async () => {
    if (!user || !slug) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/guest/reservations?slug=${slug}&email=${encodeURIComponent(user.email)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTI3NTgsImV4cCI6MjA1OTg4ODc1OH0.groS5xEMGrPCBHBN0MgMZGSAb1Nd3tPp2DrDRRMzVT8',
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar reservas');
      }

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (err) {
      console.error('Erro ao buscar reservas:', err);
      setError('Não foi possível carregar suas reservas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user, slug]);

  useEffect(() => {
    if (user && slug) {
      fetchReservations();
    }
  }, [user, slug, fetchReservations]);

  // Login com Google
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/guest-area/?slug=${slug}&primary=${encodeURIComponent(primaryColor)}&secondary=${encodeURIComponent(secondaryColor)}&accent=${encodeURIComponent(accentColor)}`,
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setReservations([]);
  };

  // Check-in/Check-out
  const handleCheckIn = async (reservationId: string) => {
    try {
      const response = await fetch(
        `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/guest/checkin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTI3NTgsImV4cCI6MjA1OTg4ODc1OH0.groS5xEMGrPCBHBN0MgMZGSAb1Nd3tPp2DrDRRMzVT8',
          },
          body: JSON.stringify({ reservation_id: reservationId, slug })
        }
      );

      if (response.ok) {
        fetchReservations(); // Recarregar reservas
      }
    } catch (err) {
      console.error('Erro no check-in:', err);
    }
  };

  const handleCheckOut = async (reservationId: string) => {
    try {
      const response = await fetch(
        `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/guest/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTI3NTgsImV4cCI6MjA1OTg4ODc1OH0.groS5xEMGrPCBHBN0MgMZGSAb1Nd3tPp2DrDRRMzVT8',
          },
          body: JSON.stringify({ reservation_id: reservationId, slug })
        }
      );

      if (response.ok) {
        fetchReservations(); // Recarregar reservas
      }
    } catch (err) {
      console.error('Erro no check-out:', err);
    }
  };

  // Filtrar reservas por tab
  const now = new Date();
  const filteredReservations = reservations.filter(r => {
    const checkIn = new Date(r.check_in);
    const checkOut = new Date(r.check_out);
    
    if (activeTab === 'cancelled') return r.status === 'cancelled';
    if (activeTab === 'past') return checkOut < now && r.status !== 'cancelled';
    return checkIn >= now || (checkIn <= now && checkOut >= now && r.status !== 'cancelled');
  });

  const counts = {
    upcoming: reservations.filter(r => {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      return (checkIn >= now || (checkIn <= now && checkOut >= now)) && r.status !== 'cancelled';
    }).length,
    past: reservations.filter(r => new Date(r.check_out) < now && r.status !== 'cancelled').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  };

  // Loading inicial
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: primaryColor }} />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Home className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Área do Hóspede</h1>
            <p className="text-gray-600">
              Acesse suas reservas, faça check-in online e muito mais.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
          >
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Entrar com Google
          </button>

          <p className="mt-6 text-center text-xs text-gray-500">
            Ao continuar, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </div>
      </div>
    );
  }

  // Área logada
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Minhas Reservas</h1>
          <p className="text-gray-600">Gerencie suas estadias e faça check-in online</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <ReservationTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
            primaryColor={primaryColor}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button 
              onClick={fetchReservations}
              className="ml-auto text-sm underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
          </div>
        )}

        {/* Lista de reservas */}
        {!loading && filteredReservations.length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Calendar className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">
              {activeTab === 'upcoming' && 'Nenhuma reserva futura'}
              {activeTab === 'past' && 'Nenhuma reserva passada'}
              {activeTab === 'cancelled' && 'Nenhuma reserva cancelada'}
            </h3>
            <p className="text-gray-500 text-sm">
              {activeTab === 'upcoming' && 'Quando você fizer uma reserva, ela aparecerá aqui.'}
              {activeTab === 'past' && 'Suas estadias anteriores aparecerão aqui.'}
              {activeTab === 'cancelled' && 'Reservas canceladas aparecerão aqui.'}
            </p>
          </div>
        )}

        {!loading && filteredReservations.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReservations.map(reservation => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                primaryColor={primaryColor}
                onCheckIn={() => handleCheckIn(reservation.id)}
                onCheckOut={() => handleCheckOut(reservation.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          Powered by <span style={{ color: primaryColor }}>Rendizy</span>
        </div>
      </footer>
    </div>
  );
}

export default GuestAreaPage;
