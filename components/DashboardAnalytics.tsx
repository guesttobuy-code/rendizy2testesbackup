import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================
// TYPES
// ============================================

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'neutral';
  description?: string;
}

interface DashboardAnalyticsProps {
  reservations?: any[];
  properties?: any[];
  guests?: any[];
  organizationId?: string;
}

// ============================================
// KPI CARD COMPONENT
// ============================================

function KPICard({ title, value, change, icon: Icon, trend, description }: KPICardProps) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <div className={`flex items-center text-xs ${
            isPositive ? 'text-green-600 dark:text-green-400' :
            isNegative ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {isPositive && <ArrowUpRight className="h-3 w-3" />}
            {isNegative && <ArrowDownRight className="h-3 w-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
          {description && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DashboardAnalytics({
  reservations = [],
  properties = [],
  guests = [],
  organizationId
}: DashboardAnalyticsProps) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  // ============================================
  // MOCK DATA (substituir com dados reais)
  // ============================================
  
  const mockReservations = useMemo(() => [
    { id: '1', checkIn: '2025-10-20', checkOut: '2025-10-25', total: 250000, status: 'confirmed', propertyId: 'p1', guestId: 'g1' },
    { id: '2', checkIn: '2025-10-22', checkOut: '2025-10-27', total: 180000, status: 'confirmed', propertyId: 'p2', guestId: 'g2' },
    { id: '3', checkIn: '2025-10-25', checkOut: '2025-10-30', total: 320000, status: 'pending', propertyId: 'p1', guestId: 'g3' },
    { id: '4', checkIn: '2025-11-01', checkOut: '2025-11-05', total: 280000, status: 'confirmed', propertyId: 'p3', guestId: 'g1' },
    { id: '5', checkIn: '2025-11-10', checkOut: '2025-11-15', total: 350000, status: 'confirmed', propertyId: 'p2', guestId: 'g4' },
  ], []);

  const mockProperties = useMemo(() => [
    { id: 'p1', name: 'Casa Praia', location: 'Florianópolis', status: 'active' },
    { id: 'p2', name: 'Apto Centro', location: 'São Paulo', status: 'active' },
    { id: 'p3', name: 'Chalé Montanha', location: 'Campos do Jordão', status: 'active' },
  ], []);

  const mockGuests = useMemo(() => [
    { id: 'g1', name: 'João Silva', reservations: 2 },
    { id: 'g2', name: 'Maria Santos', reservations: 1 },
    { id: 'g3', name: 'Pedro Costa', reservations: 1 },
    { id: 'g4', name: 'Ana Oliveira', reservations: 1 },
  ], []);

  // Use real data if provided, otherwise use mock
  const dataReservations = reservations.length > 0 ? reservations : mockReservations;
  const dataProperties = properties.length > 0 ? properties : mockProperties;
  const dataGuests = guests.length > 0 ? guests : mockGuests;

  // ============================================
  // CALCULATIONS
  // ============================================

  // Revenue calculation
  const totalRevenue = useMemo(() => {
    return dataReservations
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + (r.total || 0), 0);
  }, [dataReservations]);

  // Reservations stats
  const totalReservations = dataReservations.length;
  const confirmedReservations = dataReservations.filter(r => r.status === 'confirmed').length;
  const pendingReservations = dataReservations.filter(r => r.status === 'pending').length;

  // Occupancy calculation (simplified)
  const occupancyRate = useMemo(() => {
    const totalDays = dataProperties.length * 30; // 30 dias por propriedade
    const bookedDays = dataReservations.reduce((sum, r) => {
      if (r.status !== 'confirmed') return sum;
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);
    return totalDays > 0 ? Math.round((bookedDays / totalDays) * 100) : 0;
  }, [dataReservations, dataProperties]);

  // Revenue by month (últimos 6 meses)
  const revenueByMonth = useMemo(() => {
    const months = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];
    return months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 50000) + 30000,
      reservations: Math.floor(Math.random() * 20) + 10,
    }));
  }, []);

  // Top properties
  const topProperties = useMemo(() => {
    const propertyRevenue = new Map<string, number>();
    
    dataReservations.forEach(r => {
      if (r.status === 'confirmed') {
        const current = propertyRevenue.get(r.propertyId) || 0;
        propertyRevenue.set(r.propertyId, current + (r.total || 0));
      }
    });

    return dataProperties
      .map(p => ({
        ...p,
        revenue: propertyRevenue.get(p.id) || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [dataReservations, dataProperties]);

  // Reservation status distribution
  const statusDistribution = useMemo(() => {
    const confirmed = dataReservations.filter(r => r.status === 'confirmed').length;
    const pending = dataReservations.filter(r => r.status === 'pending').length;
    const cancelled = dataReservations.filter(r => r.status === 'cancelled').length;

    return [
      { name: 'Confirmadas', value: confirmed, color: '#22c55e' },
      { name: 'Pendentes', value: pending, color: '#eab308' },
      { name: 'Canceladas', value: cancelled, color: '#ef4444' },
    ];
  }, [dataReservations]);

  // Occupancy trend (últimos 30 dias)
  const occupancyTrend = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        occupancy: Math.floor(Math.random() * 40) + 60, // 60-100%
      });
    }
    return days;
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visão geral de performance e métricas
        </p>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList>
          <TabsTrigger value="7d">7 dias</TabsTrigger>
          <TabsTrigger value="30d">30 dias</TabsTrigger>
          <TabsTrigger value="90d">90 dias</TabsTrigger>
          <TabsTrigger value="12m">12 meses</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Total"
          value={`R$ ${(totalRevenue / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`}
          change={12.5}
          trend="up"
          icon={DollarSign}
          description="vs. mês anterior"
        />
        
        <KPICard
          title="Taxa de Ocupação"
          value={`${occupancyRate}%`}
          change={5.2}
          trend="up"
          icon={Percent}
          description="média do período"
        />
        
        <KPICard
          title="Reservas"
          value={totalReservations}
          change={8.1}
          trend="up"
          icon={Calendar}
          description={`${confirmedReservations} confirmadas`}
        />
        
        <KPICard
          title="Hóspedes"
          value={dataGuests.length}
          change={3.4}
          trend="up"
          icon={Users}
          description="cadastrados"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Mês</CardTitle>
            <CardDescription>Evolução da receita nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `R$ ${(value / 100).toLocaleString('pt-BR')}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Occupancy Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Ocupação</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={occupancyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Top Imóveis</CardTitle>
            <CardDescription>Por receita no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProperties}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `R$ ${(value / 100).toLocaleString('pt-BR')}`}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Reservas</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {confirmedReservations > 0 
                ? ((totalRevenue / confirmedReservations) / 100).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : '0,00'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              por reserva confirmada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Imóveis Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataProperties.length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              disponíveis para reserva
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Check-ins Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dataReservations.filter(r => {
                const today = new Date().toISOString().split('T')[0];
                return r.checkIn === today && r.status === 'confirmed';
              }).length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {pendingReservations} pendentes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
