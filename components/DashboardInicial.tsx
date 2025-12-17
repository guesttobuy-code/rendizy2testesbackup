import React, { useState, useMemo } from 'react';
import { ConflictAlert } from './ConflictAlert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Home,
  Briefcase,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
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
import { Reservation, Property } from '../App';

interface DashboardInicialProps {
  conflicts: any[];
  onReservationClick: (reservation: Reservation) => void;
  onDismissConflictAlert: () => void;
  reservations: Reservation[];
  properties: Property[];
}

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'neutral';
  description?: string;
}

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

export function DashboardInicial({ 
  conflicts, 
  onReservationClick, 
  onDismissConflictAlert,
  reservations,
  properties 
}: DashboardInicialProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  // Calcular estatísticas básicas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeReservations = reservations.filter(r => 
    ['pending', 'confirmed', 'checked_in'].includes(r.status)
  );

  const checkInsToday = reservations.filter(r => {
    const checkIn = new Date(r.checkIn);
    checkIn.setHours(0, 0, 0, 0);
    return checkIn.getTime() === today.getTime();
  });

  const checkOutsToday = reservations.filter(r => {
    const checkOut = new Date(r.checkOut);
    checkOut.setHours(0, 0, 0, 0);
    return checkOut.getTime() === today.getTime();
  });

  const upcomingReservations = reservations.filter(r => {
    const checkIn = new Date(r.checkIn);
    checkIn.setHours(0, 0, 0, 0);
    return checkIn > today && r.status !== 'cancelled';
  });

  // ============================================
  // ANALYTICS CALCULATIONS
  // ============================================

  // Revenue calculation
  const totalRevenue = useMemo(() => {
    return reservations
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + (r.total || 0), 0);
  }, [reservations]);

  const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
  const pendingReservations = reservations.filter(r => r.status === 'pending').length;

  // Occupancy calculation
  const occupancyRate = useMemo(() => {
    const totalDays = properties.length * 30;
    const bookedDays = reservations.reduce((sum, r) => {
      if (r.status !== 'confirmed') return sum;
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);
    return totalDays > 0 ? Math.round((bookedDays / totalDays) * 100) : 0;
  }, [reservations, properties]);

  // Revenue by month
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
    
    reservations.forEach(r => {
      if (r.status === 'confirmed') {
        const current = propertyRevenue.get(r.propertyId) || 0;
        propertyRevenue.set(r.propertyId, current + (r.total || 0));
      }
    });

    return properties
      .map(p => ({
        ...p,
        revenue: propertyRevenue.get(p.id) || 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [reservations, properties]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const pending = reservations.filter(r => r.status === 'pending').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;

    return [
      { name: 'Confirmadas', value: confirmed, color: '#22c55e' },
      { name: 'Pendentes', value: pending, color: '#eab308' },
      { name: 'Canceladas', value: cancelled, color: '#ef4444' },
    ];
  }, [reservations]);

  // Occupancy trend
  const occupancyTrend = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        occupancy: Math.floor(Math.random() * 40) + 60,
      });
    }
    return days;
  }, []);

  return (
    <div className="flex-1 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900 dark:text-gray-100 text-2xl font-bold">Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral e analytics do sistema</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <Home className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Alerta de Conflitos */}
            {conflicts.length > 0 && (
              <ConflictAlert
                conflicts={conflicts}
                onReservationClick={onReservationClick}
                onDismiss={onDismissConflictAlert}
              />
            )}

            {/* Status Geral */}
            {conflicts.length === 0 && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-900 dark:text-green-100">Sistema Operacional</AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Nenhum conflito de reserva detectado. Todas as propriedades estão operando normalmente.
                </AlertDescription>
              </Alert>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Propriedades</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{properties.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total de imóveis cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reservas Ativas</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeReservations.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confirmadas e pendentes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Check-ins Hoje</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{checkInsToday.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hóspedes chegando hoje
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Check-outs Hoje</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{checkOutsToday.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hóspedes saindo hoje
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alertas de Hoje */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {checkInsToday.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                      Check-ins de Hoje
                    </CardTitle>
                    <CardDescription>Hóspedes que chegam hoje</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {checkInsToday.map(reservation => (
                        <button
                          key={reservation.id}
                          onClick={() => onReservationClick(reservation)}
                          className="w-full p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-blue-900 dark:text-blue-100">{reservation.guestName}</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                {properties.find(p => p.id === reservation.propertyId)?.name || 'Propriedade'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {reservation.platform}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {checkOutsToday.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-600" />
                      Check-outs de Hoje
                    </CardTitle>
                    <CardDescription>Hóspedes que saem hoje</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {checkOutsToday.map(reservation => (
                        <button
                          key={reservation.id}
                          onClick={() => onReservationClick(reservation)}
                          className="w-full p-3 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900 rounded-lg border border-orange-200 dark:border-orange-800 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-orange-900 dark:text-orange-100">{reservation.guestName}</p>
                              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                {properties.find(p => p.id === reservation.propertyId)?.name || 'Propriedade'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                                {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                              </p>
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                {reservation.platform}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Próximas Reservas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Próximas Reservas
                </CardTitle>
                <CardDescription>
                  Reservas confirmadas nos próximos dias ({upcomingReservations.length})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {upcomingReservations.slice(0, 10).map(reservation => (
                    <button
                      key={reservation.id}
                      onClick={() => onReservationClick(reservation)}
                      className="w-full p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{reservation.guestName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {properties.find(p => p.id === reservation.propertyId)?.name || 'Propriedade'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {new Date(reservation.checkIn).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-6">
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
                value={reservations.length}
                change={8.1}
                trend="up"
                icon={CalendarDays}
                description={`${confirmedReservations} confirmadas`}
              />
              
              <KPICard
                title="Propriedades"
                value={properties.length}
                change={3.4}
                trend="up"
                icon={Home}
                description="cadastradas"
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
                  <p className="text-xs text-muted-foreground mt-1">
                    por reserva confirmada
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Imóveis Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{properties.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
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
                    {reservations.filter(r => {
                      const today = new Date().toISOString().split('T')[0];
                      return r.checkIn === today && r.status === 'confirmed';
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingReservations} pendentes
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
