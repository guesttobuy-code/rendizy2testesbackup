import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ServiceTicket } from '../../types/funnels';
import { servicesTicketsApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Calendar,
  FileText,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalTickets: number;
  completedTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  overdueTasks: number;
  tasksDueToday: number;
  tasksDueThisWeek: number;
  averageCompletionTime: number;
  tasksByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  tasksByType: {
    standard: number;
    form: number;
    attachment: number;
  };
}

export function TasksDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await servicesTicketsApi.list();
      if (response.success && response.data) {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    let totalTickets = tickets.length;
    let completedTickets = 0;
    let inProgressTickets = 0;
    let pendingTickets = 0;
    let overdueTasks = 0;
    let tasksDueToday = 0;
    let tasksDueThisWeek = 0;
    let totalCompletionTime = 0;
    let completedCount = 0;
    const tasksByPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    const tasksByType = { standard: 0, form: 0, attachment: 0 };

    tickets.forEach(ticket => {
      // Status do ticket
      if (ticket.status === 'RESOLVED') completedTickets++;
      else if (ticket.status === 'IN_ANALYSIS') inProgressTickets++;
      else pendingTickets++;

      // Tarefas
      ticket.tasks.forEach(task => {
        // Por prioridade
        const priority = ticket.priority || 'medium';
        tasksByPriority[priority as keyof typeof tasksByPriority]++;

        // Por tipo
        tasksByType[task.type.toLowerCase() as keyof typeof tasksByType]++;

        // Prazos
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (task.status !== 'COMPLETED') {
            if (dueDate < today) {
              overdueTasks++;
            } else if (dueDate >= today && dueDate < weekFromNow) {
              if (dueDate.getTime() === today.getTime()) {
                tasksDueToday++;
              }
              tasksDueThisWeek++;
            }
          }
        }

        // Tempo de conclusão
        if (task.status === 'COMPLETED' && task.completedAt && task.createdAt) {
          const created = new Date(task.createdAt);
          const completed = new Date(task.completedAt);
          totalCompletionTime += completed.getTime() - created.getTime();
          completedCount++;
        }
      });
    });

    const averageCompletionTime = completedCount > 0
      ? totalCompletionTime / completedCount / (1000 * 60 * 60) // em horas
      : 0;

    return {
      totalTickets,
      completedTickets,
      inProgressTickets,
      pendingTickets,
      overdueTasks,
      tasksDueToday,
      tasksDueThisWeek,
      averageCompletionTime,
      tasksByPriority,
      tasksByType,
    };
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard de Tarefas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Visão geral do desempenho e estatísticas
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTickets} concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingTickets} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.tasksDueToday} vencem hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageCompletionTime.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de conclusão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tarefas por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Tarefas por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Urgente</span>
                </div>
                <span className="font-semibold">{stats.tasksByPriority.urgent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm">Alta</span>
                </div>
                <span className="font-semibold">{stats.tasksByPriority.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Média</span>
                </div>
                <span className="font-semibold">{stats.tasksByPriority.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-sm">Baixa</span>
                </div>
                <span className="font-semibold">{stats.tasksByPriority.low}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Tarefas por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Padrão</span>
                </div>
                <span className="font-semibold">{stats.tasksByType.standard}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Formulário</span>
                </div>
                <span className="font-semibold">{stats.tasksByType.form}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Anexo</span>
                </div>
                <span className="font-semibold">{stats.tasksByType.attachment}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Prazos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Próximos Prazos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.tasksDueThisWeek > 0 ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.tasksDueToday} tarefa(s) vencem hoje
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.tasksDueThisWeek - stats.tasksDueToday} tarefa(s) vencem esta semana
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Nenhum prazo próximo</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

