/**
 * RENDIZY - Dashboard Inicial SIMPLIFICADO
 * 
 * Versão segura sem dependências complexas
 * Garante que sempre renderiza algo, mesmo com erros
 * 
 * @version 1.0.103.267
 * @date 2025-11-03
 */

import { Calendar, Home, Plus, DollarSign, Users, MessageSquare, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface DashboardInicialSimpleProps {
  conflicts?: any[];
  onReservationClick?: (reservation: any) => void;
  onDismissConflictAlert?: () => void;
  reservations?: any[];
  properties?: any[];
}

export function DashboardInicialSimple({
  conflicts = [],
  onReservationClick,
  onDismissConflictAlert,
  reservations = [],
  properties = [],
}: DashboardInicialSimpleProps) {
  
  console.log('✅ DashboardInicialSimple renderizado');

  return (
    <div className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2">
          🏠 Bem-vindo ao RENDIZY
        </h1>
        <p className="text-muted-foreground">
          Sistema de Gestão de Imóveis de Temporada
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Propriedades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propriedades</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{properties.length}</div>
            <p className="text-xs text-muted-foreground">
              Total de imóveis cadastrados
            </p>
          </CardContent>
        </Card>

        {/* Reservas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{reservations.length}</div>
            <p className="text-xs text-muted-foreground">
              Reservas ativas/futuras
            </p>
          </CardContent>
        </Card>

        {/* Conflitos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflitos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{conflicts.length}</div>
            <p className="text-xs text-muted-foreground">
              Alertas pendentes
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Ocupação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">0%</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Calendário */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Calendário</CardTitle>
                <CardDescription>Visualize todas as reservas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/calendario">
              <Button className="w-full" variant="outline">
                Acessar Calendário
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Imóveis */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <Home className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Imóveis</CardTitle>
                <CardDescription>Gerencie suas propriedades</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/properties">
              <Button className="w-full" variant="outline">
                Ver Imóveis
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Nova Propriedade */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Plus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Nova Propriedade</CardTitle>
                <CardDescription>Cadastre um novo imóvel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/properties/new">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Imóvel
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Reservas */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle>Reservas</CardTitle>
                <CardDescription>Gerenciar reservas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/reservas">
              <Button className="w-full" variant="outline">
                Ver Reservas
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-pink-100 dark:bg-pink-900">
                <MessageSquare className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>Inbox de mensagens</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/chat">
              <Button className="w-full" variant="outline">
                Abrir Chat
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Financeiro */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <CardTitle>Financeiro</CardTitle>
                <CardDescription>Gestão financeira</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/financeiro">
              <Button className="w-full" variant="outline">
                Ver Financeiro
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Conflitos */}
      {conflicts.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-100">
              <BarChart3 className="h-5 w-5" />
              ⚠️ Conflitos Detectados ({conflicts.length})
            </CardTitle>
            <CardDescription>
              Existem conflitos de reserva que precisam de atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.slice(0, 3).map((conflict, index) => (
                <div
                  key={index}
                  className="p-3 bg-white dark:bg-gray-800 rounded border"
                >
                  <p className="text-sm font-medium">{conflict.type || 'Conflito'}</p>
                  <p className="text-xs text-muted-foreground">
                    {conflict.message || 'Detalhes não disponíveis'}
                  </p>
                </div>
              ))}
            </div>
            {conflicts.length > 3 && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                + {conflicts.length - 3} outros conflitos
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Próximas Reservas */}
      {reservations.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Reservas
            </CardTitle>
            <CardDescription>
              Check-ins e check-outs próximos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reservations.slice(0, 5).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => onReservationClick?.(reservation)}
                >
                  <div>
                    <p className="text-sm font-medium">{reservation.guestName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(reservation.checkIn).toLocaleDateString('pt-BR')} -{' '}
                      {new Date(reservation.checkOut).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      R$ {reservation.price?.toLocaleString('pt-BR') || '0,00'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {reservations.length > 5 && (
              <a href="/calendario">
                <Button variant="link" className="w-full mt-4">
                  Ver todas as reservas ({reservations.length})
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {properties.length === 0 && reservations.length === 0 && (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma propriedade cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Comece cadastrando sua primeira propriedade para começar a gerenciar suas reservas
            </p>
            <a href="/properties/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeira Propriedade
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DashboardInicialSimple;
