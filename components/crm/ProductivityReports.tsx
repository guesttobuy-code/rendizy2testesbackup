import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ServiceTicket } from '../../types/funnels';
import { servicesTicketsApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2,
  Calendar,
  BarChart3
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface UserProductivity {
  userId: string;
  userName: string;
  tasksCompleted: number;
  tasksCreated: number;
  averageCompletionTime: number;
  tasksOverdue: number;
  totalHours: number;
  estimatedHours: number;
}

interface ProductivityReportsProps {
  tickets: ServiceTicket[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function ProductivityReports({ tickets, dateRange }: ProductivityReportsProps) {
  const { user } = useAuth();
  const [groupBy, setGroupBy] = useState<'user' | 'team' | 'stage'>('user');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return { from: weekStart, to: now };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarter':
        const quarterStart = new Date(now);
        quarterStart.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
        return { from: quarterStart, to: now };
      case 'year':
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      default:
        return dateRange || { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const filteredTickets = useMemo(() => {
    const range = getDateRange();
    return tickets.filter(ticket => {
      const created = new Date(ticket.createdAt);
      return created >= range.from && created <= range.to;
    });
  }, [tickets, period, dateRange]);

  const userProductivity = useMemo(() => {
    const map = new Map<string, UserProductivity>();

    filteredTickets.forEach(ticket => {
      ticket.tasks.forEach(task => {
        const userId = task.assignedTo || 'unassigned';
        const userName = task.assignedToName || 'Não atribuído';

        if (!map.has(userId)) {
          map.set(userId, {
            userId,
            userName,
            tasksCompleted: 0,
            tasksCreated: 0,
            averageCompletionTime: 0,
            tasksOverdue: 0,
            totalHours: 0,
            estimatedHours: 0,
          });
        }

        const stats = map.get(userId)!;
        
        if (task.status === 'COMPLETED') {
          stats.tasksCompleted++;
          if (task.completedAt && task.createdAt) {
            const created = new Date(task.createdAt);
            const completed = new Date(task.completedAt);
            const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
            stats.totalHours += hours;
          }
        }

        if (task.createdAt) {
          const created = new Date(task.createdAt);
          const range = getDateRange();
          if (created >= range.from && created <= range.to) {
            stats.tasksCreated++;
          }
        }

        if (task.dueDate && task.status !== 'COMPLETED') {
          const dueDate = new Date(task.dueDate);
          if (dueDate < new Date()) {
            stats.tasksOverdue++;
          }
        }

        if (task.estimatedHours) {
          stats.estimatedHours += task.estimatedHours;
        }
        if (task.actualHours) {
          stats.totalHours += task.actualHours;
        }
      });
    });

    // Calcular tempo médio
    map.forEach(stats => {
      if (stats.tasksCompleted > 0) {
        stats.averageCompletionTime = stats.totalHours / stats.tasksCompleted;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  }, [filteredTickets, period]);

  const overallStats = useMemo(() => {
    const total = userProductivity.reduce((acc, user) => ({
      tasksCompleted: acc.tasksCompleted + user.tasksCompleted,
      tasksCreated: acc.tasksCreated + user.tasksCreated,
      tasksOverdue: acc.tasksOverdue + user.tasksOverdue,
      totalHours: acc.totalHours + user.totalHours,
      estimatedHours: acc.estimatedHours + user.estimatedHours,
    }), { tasksCompleted: 0, tasksCreated: 0, tasksOverdue: 0, totalHours: 0, estimatedHours: 0 });

    return {
      ...total,
      averageCompletionTime: total.tasksCompleted > 0 
        ? total.totalHours / total.tasksCompleted 
        : 0,
      completionRate: total.tasksCreated > 0
        ? (total.tasksCompleted / total.tasksCreated) * 100
        : 0,
    };
  }, [userProductivity]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Relatórios de Produtividade
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Análise de desempenho e métricas de equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.tasksCompleted}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.completionRate.toFixed(1)}% de conclusão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.tasksOverdue}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.estimatedHours.toFixed(1)}h estimadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.averageCompletionTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Por tarefa concluída
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Productivity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Produtividade por Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium">Usuário</th>
                  <th className="text-center p-2 text-sm font-medium">Concluídas</th>
                  <th className="text-center p-2 text-sm font-medium">Criadas</th>
                  <th className="text-center p-2 text-sm font-medium">Atrasadas</th>
                  <th className="text-center p-2 text-sm font-medium">Horas</th>
                  <th className="text-center p-2 text-sm font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {userProductivity.map(user => {
                  const completionRate = user.tasksCreated > 0
                    ? (user.tasksCompleted / user.tasksCreated) * 100
                    : 0;

                  return (
                    <tr key={user.userId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 text-sm">{user.userName}</td>
                      <td className="p-2 text-sm text-center">{user.tasksCompleted}</td>
                      <td className="p-2 text-sm text-center">{user.tasksCreated}</td>
                      <td className="p-2 text-sm text-center text-red-600">{user.tasksOverdue}</td>
                      <td className="p-2 text-sm text-center">{user.totalHours.toFixed(1)}h</td>
                      <td className="p-2 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${Math.min(completionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs">{completionRate.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

