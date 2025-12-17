import React, { useState, useMemo, useEffect } from 'react';
import { TaskListItem, TaskGrouping, TaskFilter, TaskSortBy } from '../../types/funnels';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, Circle, Search, Calendar, User, Tag, FolderKanban, List as ListIcon } from 'lucide-react';
import { servicesTicketsApi } from '../../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MyTasksView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [grouping, setGrouping] = useState<TaskGrouping>('none');
  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate');

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Buscar todos os tickets e extrair tarefas atribuídas ao usuário
      const response = await servicesTicketsApi.list();
      if (response.success && response.data) {
        const allTasks: TaskListItem[] = [];
        
        response.data.forEach(ticket => {
          ticket.tasks.forEach(task => {
            // Apenas tarefas atribuídas ao usuário atual
            // Comparar por ID ou nome
            // Apenas tarefas atribuídas ao usuário atual
            // Comparar por ID, nome ou email
            const isAssignedToUser = 
              (user?.id && task.assignedTo === user.id) ||
              (user?.name && task.assignedToName === user.name) ||
              (user?.email && task.assignedToName?.toLowerCase().includes(user.email.toLowerCase()));
            
            if (isAssignedToUser) {
              allTasks.push({
                id: task.id,
                title: task.title,
                status: task.status,
                type: task.type,
                ticketId: ticket.id,
                ticketTitle: ticket.title,
                stageId: task.stageId,
                stageName: ticket.stageId, // TODO: Buscar nome da etapa
                clientName: ticket.productName || 'Cliente',
                dueDate: task.dueDate,
                priority: ticket.priority,
                assignedTo: task.assignedTo,
                assignedToName: task.assignedToName,
                canComplete: true,
                createdAt: task.createdAt,
              });
            }
          });
        });

        setTasks(allTasks);
      } else {
        // Fallback: usar localStorage ou dados mock
        console.warn('API não disponível, usando dados mock');
        setTasks(getMockTasks());
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      setTasks(getMockTasks());
    } finally {
      setLoading(false);
    }
  };

  const getMockTasks = (): TaskListItem[] => [
    {
      id: 't1',
      title: 'Verificar código do cofre',
      status: 'IN_PROGRESS',
      type: 'STANDARD',
      ticketId: '1',
      ticketTitle: 'Problema com Check-in - Apartamento 201',
      stageId: '1',
      stageName: 'Triagem',
      clientName: 'Cliente ABC',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'high',
      assignedTo: user?.id || 'user1',
      assignedToName: user?.name || 'Rafael',
      canComplete: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 't2',
      title: 'Cliente responde formulário',
      status: 'TODO',
      type: 'FORM',
      ticketId: '1',
      ticketTitle: 'Problema com Check-in - Apartamento 201',
      stageId: '1',
      stageName: 'Triagem',
      clientName: 'Cliente ABC',
      priority: 'high',
      assignedTo: user?.id || 'user1',
      assignedToName: user?.name || 'Rafael',
      canComplete: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 't3',
      title: 'Enviar documentos',
      status: 'TODO',
      type: 'ATTACHMENT',
      ticketId: '2',
      ticketTitle: 'Manutenção - Ar condicionado',
      stageId: '2',
      stageName: 'Em Análise',
      clientName: 'Cliente XYZ',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 'medium',
      assignedTo: user?.id || 'user1',
      assignedToName: user?.name || 'Rafael',
      canComplete: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    
    try {
      // Atualizar via API
      await servicesTicketsApi.updateTask(task.ticketId, taskId, { status: newStatus });
      
      // Atualizar localmente
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      toast.success(newStatus === 'COMPLETED' ? 'Tarefa concluída!' : 'Tarefa reaberta');
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      // Atualizar localmente mesmo em caso de erro
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      toast.warning('Tarefa atualizada localmente');
    }
  };

  // Filtrar e ordenar tarefas
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.ticketTitle.toLowerCase().includes(query) ||
        task.clientName?.toLowerCase().includes(query)
      );
    }

    // Filtrar por status
    if (filter === 'pending') {
      result = result.filter(t => t.status !== 'COMPLETED');
    } else if (filter === 'completed') {
      result = result.filter(t => t.status === 'COMPLETED');
    } else if (filter === 'overdue') {
      const now = new Date();
      result = result.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'COMPLETED'
      );
    }

    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority || 'low'] || 0) - (priorityOrder[a.priority || 'low'] || 0);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, filter, sortBy]);

  // Agrupar tarefas
  const groupedTasks = useMemo(() => {
    if (grouping === 'none') {
      return { 'Todas': filteredAndSortedTasks };
    }

    const groups: Record<string, TaskListItem[]> = {};

    filteredAndSortedTasks.forEach(task => {
      let key: string;
      
      switch (grouping) {
        case 'client':
          key = task.clientName || 'Sem Cliente';
          break;
        case 'date':
          if (task.dueDate) {
            const date = new Date(task.dueDate);
            const today = new Date();
            const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) key = 'Atrasadas';
            else if (diffDays === 0) key = 'Hoje';
            else if (diffDays === 1) key = 'Amanhã';
            else if (diffDays <= 7) key = 'Esta Semana';
            else if (diffDays <= 30) key = 'Este Mês';
            else key = 'Mais Tarde';
          } else {
            key = 'Sem Prazo';
          }
          break;
        case 'type':
          key = task.type === 'STANDARD' ? 'Padrão' : task.type === 'FORM' ? 'Formulário' : 'Anexo';
          break;
        case 'stage':
          key = task.stageName || 'Sem Etapa';
          break;
        case 'ticket':
          key = task.ticketTitle;
          break;
        default:
          key = 'Outros';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    return groups;
  }, [filteredAndSortedTasks, grouping]);

  const getTaskTypeIcon = (type: TaskListItem['type']) => {
    switch (type) {
      case 'FORM': return <Tag className="w-3 h-3 text-blue-500" />;
      case 'ATTACHMENT': return <Tag className="w-3 h-3 text-green-500" />;
      default: return <Tag className="w-3 h-3 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Carregando suas tarefas...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Minhas Tarefas
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAndSortedTasks.length} tarefa(s) {filter === 'pending' ? 'pendente(s)' : filter === 'completed' ? 'concluída(s)' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter */}
          <Select value={filter} onValueChange={(v) => setFilter(v as TaskFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
            </SelectContent>
          </Select>

          {/* Grouping */}
          <Select value={grouping} onValueChange={(v) => setGrouping(v as TaskGrouping)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem agrupamento</SelectItem>
              <SelectItem value="client">Por Cliente</SelectItem>
              <SelectItem value="date">Por Data</SelectItem>
              <SelectItem value="type">Por Tipo</SelectItem>
              <SelectItem value="stage">Por Etapa</SelectItem>
              <SelectItem value="ticket">Por Card</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as TaskSortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Prazo</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
              <SelectItem value="createdAt">Data Criação</SelectItem>
              <SelectItem value="title">Título</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
          <div key={groupName} className="mb-6">
            {grouping !== 'none' && (
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                {groupName} ({groupTasks.length})
              </h2>
            )}
            
            <div className="space-y-2">
              {groupTasks.map(task => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                
                return (
                  <Card
                    key={task.id}
                    className={`hover:shadow-md transition-shadow ${
                      task.status === 'COMPLETED' ? 'opacity-60' : ''
                    } ${isOverdue ? 'border-red-300 dark:border-red-700' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-0.5"
                          onClick={() => handleToggleTask(task.id)}
                        >
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {task.ticketTitle}
                                </span>
                                {task.clientName && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      {task.clientName}
                                    </span>
                                  </>
                                )}
                                {task.stageName && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <Badge variant="outline" className="text-xs">
                                      {task.stageName}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getTaskTypeIcon(task.type)}
                              {task.priority && (
                                <Badge className={getPriorityColor(task.priority)} variant="outline">
                                  {task.priority}
                                </Badge>
                              )}
                              {task.dueDate && (
                                <div className={`flex items-center gap-1 text-xs ${
                                  isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(task.dueDate), 'dd/MM', { locale: ptBR })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {filteredAndSortedTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma tarefa encontrada</p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-2">
                Tente ajustar os filtros ou busca
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

