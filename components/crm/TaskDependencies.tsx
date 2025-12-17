import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, X, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { ServiceTask } from '../../types/funnels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: 'blocks' | 'blocked_by';
  createdAt: string;
}

interface TaskDependenciesProps {
  task: ServiceTask;
  allTasks: ServiceTask[];
  dependencies: TaskDependency[];
  onDependencyAdd: (dependsOnTaskId: string, type: 'blocks' | 'blocked_by') => void;
  onDependencyRemove: (dependencyId: string) => void;
}

export function TaskDependencies({
  task,
  allTasks,
  dependencies,
  onDependencyAdd,
  onDependencyRemove,
}: TaskDependenciesProps) {
  const [newDependencyTaskId, setNewDependencyTaskId] = useState('');
  const [newDependencyType, setNewDependencyType] = useState<'blocks' | 'blocked_by'>('blocked_by');

  // Filtrar tarefas que podem ser dependências (excluir a própria tarefa)
  const availableTasks = allTasks.filter(t => t.id !== task.id);

  // Dependências desta tarefa
  const taskDependencies = dependencies.filter(d => d.taskId === task.id);
  
  // Tarefas que dependem desta
  const blockingTasks = dependencies.filter(d => d.dependsOnTaskId === task.id);

  const handleAddDependency = () => {
    if (!newDependencyTaskId) return;
    onDependencyAdd(newDependencyTaskId, newDependencyType);
    setNewDependencyTaskId('');
  };

  const getTaskStatus = (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return 'unknown';
    if (task.status === 'COMPLETED') return 'completed';
    if (task.status === 'IN_PROGRESS') return 'in_progress';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Concluída</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Em Progresso</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Dependências</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar Dependência */}
        <div className="flex gap-2">
          <Select value={newDependencyTaskId} onValueChange={setNewDependencyTaskId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione uma tarefa" />
            </SelectTrigger>
            <SelectContent>
              {availableTasks.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newDependencyType} onValueChange={(v) => setNewDependencyType(v as 'blocks' | 'blocked_by')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blocked_by">Bloqueada por</SelectItem>
              <SelectItem value="blocks">Bloqueia</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddDependency} disabled={!newDependencyTaskId}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Dependências desta tarefa */}
        {taskDependencies.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Esta tarefa depende de:
            </p>
            <div className="space-y-2">
              {taskDependencies.map(dep => {
                const dependsOnTask = allTasks.find(t => t.id === dep.dependsOnTaskId);
                if (!dependsOnTask) return null;
                const status = getTaskStatus(dep.dependsOnTaskId);
                const isBlocked = status !== 'completed' && dep.type === 'blocked_by';
                
                return (
                  <div
                    key={dep.id}
                    className={`flex items-center justify-between p-2 border rounded ${
                      isBlocked ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(status)}
                      <span className="text-sm">{dependsOnTask.title}</span>
                      {getStatusBadge(status)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDependencyRemove(dep.id)}
                      className="h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tarefas que dependem desta */}
        {blockingTasks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Tarefas que dependem desta:
            </p>
            <div className="space-y-2">
              {blockingTasks.map(dep => {
                const blockingTask = allTasks.find(t => t.id === dep.taskId);
                if (!blockingTask) return null;
                const status = getTaskStatus(dep.taskId);
                const isBlocking = task.status !== 'COMPLETED';
                
                return (
                  <div
                    key={dep.id}
                    className={`flex items-center justify-between p-2 border rounded ${
                      isBlocking ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{blockingTask.title}</span>
                      {getStatusBadge(status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {taskDependencies.length === 0 && blockingTasks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma dependência configurada
          </p>
        )}
      </CardContent>
    </Card>
  );
}

