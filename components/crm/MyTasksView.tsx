import { useState, useMemo, useEffect } from 'react';
import { TaskGrouping, TaskFilter, TaskSortBy } from '../../types/funnels';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, Circle, Search, Calendar, Tag, Plus, RefreshCw, Pencil } from 'lucide-react';
import { crmTasksApi, CrmTask } from '../../src/utils/api-crm-tasks';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskFormModal } from './TaskFormModal';

export function MyTasksView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [grouping, setGrouping] = useState<TaskGrouping>('date');
  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate');
  
  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<CrmTask | null>(null);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async (showRefreshing = false) => {
    if (!user) return;

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Buscar tarefas do usuário via nova API
      const response = await crmTasksApi.getMyTasks();
      
      if (response.success) {
        // API retorna { data: [...], categorized: {...} }
        // Usar data diretamente (é o array de tarefas)
        const tasksData = response.data || [];
        setTasks(tasksData);
      } else {
        console.error('Erro ao carregar tarefas:', response.error);
        toast.error('Erro ao carregar tarefas');
        setTasks([]);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      if (newStatus === 'completed') {
        await crmTasksApi.complete(taskId);
      } else {
        await crmTasksApi.update(taskId, { status: 'pending' });
      }
      
      // Atualizar localmente
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } : t
      ));
      
      toast.success(newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta');
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: CrmTask) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskSuccess = (savedTask: CrmTask) => {
    if (editingTask) {
      // Atualizar tarefa existente
      setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
    } else {
      // Adicionar nova tarefa no início
      setTasks(prev => [savedTask, ...prev]);
    }
    setShowTaskModal(false);
    setEditingTask(null);
  };

  // Filtrar e ordenar tarefas
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.contact_name?.toLowerCase().includes(query) ||
        task.property_name?.toLowerCase().includes(query)
      );
    }

    // Filtrar por status
    if (filter === 'pending') {
      result = result.filter(t => t.status !== 'completed');
    } else if (filter === 'completed') {
      result = result.filter(t => t.status === 'completed');
    } else if (filter === 'overdue') {
      result = result.filter(t => 
        t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'
      );
    }

    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case 'createdAt':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

    const groups: Record<string, CrmTask[]> = {};

    filteredAndSortedTasks.forEach(task => {
      let key: string;
      
      switch (grouping) {
        case 'client':
          key = task.contact_name || 'Sem Contato';
          break;
        case 'date':
          if (task.due_date) {
            const date = new Date(task.due_date);
            if (isPast(date) && !isToday(date) && task.status !== 'completed') {
              key = '🔴 Atrasadas';
            } else if (isToday(date)) {
              key = '📅 Hoje';
            } else if (isTomorrow(date)) {
              key = '🌅 Amanhã';
            } else {
              const diffDays = Math.floor((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 7) key = '📆 Esta Semana';
              else if (diffDays <= 30) key = '📅 Este Mês';
              else key = '🗓️ Mais Tarde';
            }
          } else {
            key = '⏳ Sem Prazo';
          }
          break;
        case 'type':
          const typeLabels: Record<string, string> = {
            task: 'Tarefa',
            call: 'Ligação',
            meeting: 'Reunião',
            email: 'E-mail',
            follow_up: 'Follow-up',
            deadline: 'Prazo',
            reminder: 'Lembrete',
            other: 'Outros'
          };
          key = typeLabels[task.type] || task.type;
          break;
        case 'stage':
          key = task.property_name || 'Sem Propriedade';
          break;
        case 'ticket':
          key = task.deal_name || 'Sem Negócio';
          break;
        default:
          key = 'Outros';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    // Ordenar grupos por prioridade de data
    const orderedGroups: Record<string, CrmTask[]> = {};
    const dateOrder = ['🔴 Atrasadas', '📅 Hoje', '🌅 Amanhã', '📆 Esta Semana', '📅 Este Mês', '🗓️ Mais Tarde', '⏳ Sem Prazo'];
    
    if (grouping === 'date') {
      dateOrder.forEach(key => {
        if (groups[key]) {
          orderedGroups[key] = groups[key];
        }
      });
    } else {
      Object.keys(groups).sort().forEach(key => {
        orderedGroups[key] = groups[key];
      });
    }

    return orderedGroups;
  }, [filteredAndSortedTasks, grouping]);

  const getTaskTypeIcon = (taskType: CrmTask['task_type']) => {
    const typeIcons: Record<string, JSX.Element> = {
      task: <Tag className="w-3 h-3 text-blue-500" />,
      call: <Tag className="w-3 h-3 text-green-500" />,
      meeting: <Tag className="w-3 h-3 text-purple-500" />,
      email: <Tag className="w-3 h-3 text-amber-500" />,
      follow_up: <Tag className="w-3 h-3 text-cyan-500" />,
      deadline: <Tag className="w-3 h-3 text-red-500" />,
      reminder: <Tag className="w-3 h-3 text-indigo-500" />,
      other: <Tag className="w-3 h-3 text-gray-500" />,
    };
    return typeIcons[taskType] || typeIcons['other'];
  };

  const getTypeLabel = (taskType: CrmTask['task_type']) => {
    const typeLabels: Record<string, string> = {
      task: 'Tarefa',
      call: 'Ligação',
      meeting: 'Reunião',
      email: 'E-mail',
      follow_up: 'Follow-up',
      deadline: 'Prazo',
      reminder: 'Lembrete',
      other: 'Outros'
    };
    return typeLabels[taskType] || taskType;
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTasks(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
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
                const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && task.status !== 'completed';
                const isCompleted = task.status === 'completed';
                
                return (
                  <Card
                    key={task.id}
                    className={`hover:shadow-md transition-shadow ${
                      isCompleted ? 'opacity-60' : ''
                    } ${isOverdue ? 'border-red-300 dark:border-red-700' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-0.5"
                          onClick={() => handleToggleTask(task.id, task.status)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {getTypeLabel(task.task_type)}
                                </Badge>
                                {task.contact_name && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      👤 {task.contact_name}
                                    </span>
                                  </>
                                )}
                                {task.property_name && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      🏠 {task.property_name}
                                    </span>
                                  </>
                                )}
                                {task.deal_name && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      💼 {task.deal_name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Badges and Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getTaskTypeIcon(task.task_type)}
                              {task.priority && (
                                <Badge className={getPriorityColor(task.priority)} variant="outline">
                                  {task.priority}
                                </Badge>
                              )}
                              {task.due_date && (
                                <div className={`flex items-center gap-1 text-xs ${
                                  isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                                }`}>
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                                  {task.due_time && (
                                    <span className="ml-1">
                                      às {task.due_time.substring(0, 5)}
                                    </span>
                                  )}
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditTask(task)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
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
            <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'completed' ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
            </p>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-2">
                Tente ajustar os filtros ou busca
              </p>
            )}
            {filter === 'pending' && !searchQuery && (
              <p className="text-sm text-gray-400 mt-2">
                🎉 Parabéns! Todas as suas tarefas estão em dia.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        task={editingTask}
        onSuccess={handleTaskSuccess}
      />
    </div>
  );
}