/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRM TASKS PAGE - MAIN INTEGRATION                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Página principal que integra todas as visualizações do sistema de tarefas:
 * - List View
 * - Board View (Kanban)
 * - Calendar View
 * - Dashboard
 * - Settings
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useCallback } from 'react';
import {
  List,
  Kanban,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  Search,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Import views
import { TasksListView } from '../views/TasksListView';
import { TasksBoardView } from '../views/TasksBoardView';
import { TasksCalendarView } from '../views/TasksCalendarView';
import { TasksDashboard } from '../views/TasksDashboard';
import { CRMTasksSettings } from '../settings/CRMTasksSettings';

import type { Task, TaskStatus } from '@/types/crm-tasks';

// ============================================================================
// TYPES
// ============================================================================

interface CRMTasksPageProps {
  organizationId: string;
  projectId?: string;
  initialView?: ViewType;
}

type ViewType = 'list' | 'board' | 'calendar' | 'dashboard' | 'settings';

interface ViewOption {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  description?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VIEW_OPTIONS: ViewOption[] = [
  { id: 'list', label: 'Lista', icon: List, description: 'Visualização em tabela com colunas' },
  { id: 'board', label: 'Quadro', icon: Kanban, description: 'Kanban por status' },
  { id: 'calendar', label: 'Calendário', icon: Calendar, description: 'Visão de calendário' },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Métricas e KPIs' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CRMTasksPage({ 
  organizationId, 
  projectId,
  initialView = 'list' 
}: CRMTasksPageProps) {
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskDefaultStatus, setCreateTaskDefaultStatus] = useState<TaskStatus | undefined>();

  // Handlers
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCreateTask = useCallback((status?: TaskStatus) => {
    setSelectedTask(null);
    setCreateTaskDefaultStatus(status);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
    setCreateTaskDefaultStatus(undefined);
  }, []);

  // Render content
  const renderContent = () => {
    if (currentView === 'settings') {
      return (
        <CRMTasksSettings 
          organizationId={organizationId} 
          onBack={() => setCurrentView('list')}
        />
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background shrink-0">
          {/* View Tabs */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {VIEW_OPTIONS.map(option => (
              <TooltipProvider key={option.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCurrentView(option.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        currentView === option.id
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                      <span className="hidden md:inline">{option.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          <div className="flex-1" />

          {/* Settings */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentView('settings')}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configurações</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'list' && (
            <TasksListView
              organizationId={organizationId}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onCreateTask={() => handleCreateTask()}
            />
          )}
          
          {currentView === 'board' && (
            <TasksBoardView
              organizationId={organizationId}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onCreateTask={handleCreateTask}
            />
          )}
          
          {currentView === 'calendar' && (
            <TasksCalendarView
              organizationId={organizationId}
              projectId={projectId}
              onTaskClick={handleTaskClick}
              onCreateTask={(date) => handleCreateTask()}
            />
          )}
          
          {currentView === 'dashboard' && (
            <TasksDashboard
              organizationId={organizationId}
              projectId={projectId}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {renderContent()}

      {/* Task Modal */}
      <TaskFormModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        task={selectedTask}
        defaultStatus={createTaskDefaultStatus}
        onClose={handleCloseTaskModal}
      />
    </div>
  );
}

// ============================================================================
// TASK FORM MODAL
// ============================================================================

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  defaultStatus?: TaskStatus;
  onClose: () => void;
}

function TaskFormModal({ 
  open, 
  onOpenChange, 
  task, 
  defaultStatus,
  onClose 
}: TaskFormModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || defaultStatus || 'todo');

  React.useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus || 'todo');
    }
  }, [task, defaultStatus, open]);

  const handleSave = () => {
    // Save logic would go here
    console.log('Saving task:', { title, description, status });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Edite os detalhes da tarefa' : 'Crie uma nova tarefa'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Adicione mais detalhes..."
              className="w-full min-h-24 px-3 py-2 border rounded-md resize-none"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <div className="flex gap-2">
              {(['todo', 'in_progress', 'blocked', 'completed'] as TaskStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    status === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {s === 'todo' && 'A Fazer'}
                  {s === 'in_progress' && 'Em Progresso'}
                  {s === 'blocked' && 'Bloqueado'}
                  {s === 'completed' && 'Concluído'}
                </button>
              ))}
            </div>
          </div>

          {/* TODO: Add more fields (assignee, due date, priority, team, etc.) */}
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            Campos adicionais (responsável, prazo, prioridade, equipe, subtarefas, etc.) 
            seriam implementados aqui no formulário completo.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {task ? 'Salvar Alterações' : 'Criar Tarefa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CRMTasksPage;
