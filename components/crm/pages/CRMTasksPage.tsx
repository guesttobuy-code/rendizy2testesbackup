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

// Import modal lateral unificado
import { TaskFormSheet } from '../modals/TaskFormSheet';

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

      {/* Task Modal Lateral Unificado */}
      <TaskFormSheet
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        mode={selectedTask ? 'edit' : 'create'}
        task={selectedTask as any}
        onSuccess={handleCloseTaskModal}
      />
    </div>
  );
}

export default CRMTasksPage;

export default CRMTasksPage;
