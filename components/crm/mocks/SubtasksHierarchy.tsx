/**
 * Subtasks Hierarchy Component
 * 
 * Componente reutilizável para hierarquia de subtarefas estilo ClickUp
 * - Múltiplos níveis de profundidade
 * - Drag & Drop (visual apenas no mock)
 * - Inline editing
 * - Progress tracking por grupo
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  GripVertical,
  Trash2,
  Copy,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: {
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  };
  dueDate?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  children?: Subtask[];
  expanded?: boolean;
  isEditing?: boolean;
}

export interface SubtasksHierarchyProps {
  tasks: Subtask[];
  title?: string;
  showProgress?: boolean;
  allowNesting?: boolean;
  maxDepth?: number;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onTaskAdd?: (parentId: string | null, title: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Subtask>) => void;
  onExpand?: (taskId: string, expanded: boolean) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const countTasks = (tasks: Subtask[]): { total: number; completed: number } => {
  let total = 0;
  let completed = 0;

  const count = (items: Subtask[]) => {
    items.forEach((task) => {
      if (!task.children || task.children.length === 0) {
        total++;
        if (task.completed) completed++;
      } else {
        count(task.children);
      }
    });
  };

  count(tasks);
  return { total, completed };
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'normal':
      return 'text-blue-500';
    case 'low':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
};

const getPriorityLabel = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return 'Urgente';
    case 'high':
      return 'Alta';
    case 'normal':
      return 'Normal';
    case 'low':
      return 'Baixa';
    default:
      return '';
  }
};

// ============================================================================
// SUBTASK ITEM COMPONENT
// ============================================================================

interface SubtaskItemProps {
  task: Subtask;
  level: number;
  maxDepth: number;
  allowNesting: boolean;
  onToggle?: (taskId: string, completed: boolean) => void;
  onAdd?: (parentId: string | null, title: string) => void;
  onDelete?: (taskId: string) => void;
  onUpdate?: (taskId: string, updates: Partial<Subtask>) => void;
  onExpand?: (taskId: string, expanded: boolean) => void;
}

const SubtaskItemRow: React.FC<SubtaskItemProps> = ({
  task,
  level,
  maxDepth,
  allowNesting,
  onToggle,
  onAdd,
  onDelete,
  onUpdate,
  onExpand,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [isHovered, setIsHovered] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');

  const hasChildren = task.children && task.children.length > 0;
  const canAddChild = allowNesting && level < maxDepth;

  const childStats = hasChildren ? countTasks(task.children!) : { total: 0, completed: 0 };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== task.title) {
      onUpdate?.(task.id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleAddChild = () => {
    if (newChildTitle.trim()) {
      onAdd?.(task.id, newChildTitle.trim());
      setNewChildTitle('');
      setShowAddChild(false);
      onExpand?.(task.id, true);
    }
  };

  const formatDueDate = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return { text: 'Hoje', color: 'text-red-500' };
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return { text: 'Amanhã', color: 'text-orange-500' };
    }
    if (d < today) {
      return { text: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), color: 'text-red-500' };
    }
    return { text: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), color: 'text-muted-foreground' };
  };

  const dueDateInfo = formatDueDate(task.dueDate);

  return (
    <div>
      {/* Task Row */}
      <div
        className={cn(
          'group flex items-center gap-1 py-1.5 rounded-md transition-colors',
          isHovered && 'bg-accent/50',
          task.completed && 'opacity-60'
        )}
        style={{ paddingLeft: `${level * 20 + 4}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag Handle */}
        <div
          className={cn(
            'cursor-grab opacity-0 group-hover:opacity-100 transition-opacity',
            isEditing && 'hidden'
          )}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => onExpand?.(task.id, !task.expanded)}
            className="p-0.5 hover:bg-accent rounded"
          >
            {task.expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => onToggle?.(task.id, checked as boolean)}
          className={cn(
            'flex-shrink-0',
            task.completed && 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
          )}
        />

        {/* Title */}
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="h-7 flex-1"
            autoFocus
          />
        ) : (
          <span
            className={cn(
              'flex-1 text-sm cursor-pointer truncate',
              task.completed && 'line-through text-muted-foreground'
            )}
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </span>
        )}

        {/* Child Count Badge */}
        {hasChildren && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {childStats.completed}/{childStats.total}
          </Badge>
        )}

        {/* Priority Flag */}
        {task.priority && (
          <Tooltip>
            <TooltipTrigger>
              <Flag className={cn('h-3.5 w-3.5', getPriorityColor(task.priority))} />
            </TooltipTrigger>
            <TooltipContent>{getPriorityLabel(task.priority)}</TooltipContent>
          </Tooltip>
        )}

        {/* Due Date */}
        {dueDateInfo && (
          <span className={cn('text-xs flex items-center gap-1', dueDateInfo.color)}>
            <Calendar className="h-3 w-3" />
            {dueDateInfo.text}
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {task.assignee.initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{task.assignee.name}</TooltipContent>
          </Tooltip>
        )}

        {/* Actions */}
        <div className={cn('flex items-center gap-1', !isHovered && 'opacity-0')}>
          {canAddChild && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowAddChild(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adicionar subtarefa</TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Atribuir
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2" />
                Definir data
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Flag className="h-4 w-4 mr-2" />
                Prioridade
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowRight className="h-4 w-4 mr-2" />
                Converter em tarefa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete?.(task.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Add Child Input */}
      {showAddChild && (
        <div
          className="flex items-center gap-2 py-1.5"
          style={{ paddingLeft: `${(level + 1) * 20 + 24}px` }}
        >
          <Input
            value={newChildTitle}
            onChange={(e) => setNewChildTitle(e.target.value)}
            onBlur={() => {
              if (!newChildTitle.trim()) setShowAddChild(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddChild();
              if (e.key === 'Escape') setShowAddChild(false);
            }}
            placeholder="Nome da subtarefa..."
            className="h-7 flex-1"
            autoFocus
          />
          <Button size="sm" className="h-7" onClick={handleAddChild}>
            Adicionar
          </Button>
        </div>
      )}

      {/* Children */}
      {hasChildren && task.expanded && (
        <div className="border-l border-muted" style={{ marginLeft: `${level * 20 + 14}px` }}>
          {task.children!.map((child) => (
            <SubtaskItemRow
              key={child.id}
              task={child}
              level={level + 1}
              maxDepth={maxDepth}
              allowNesting={allowNesting}
              onToggle={onToggle}
              onAdd={onAdd}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SubtasksHierarchy: React.FC<SubtasksHierarchyProps> = ({
  tasks,
  title = 'Checklist',
  showProgress = true,
  allowNesting = true,
  maxDepth = 4,
  onTaskToggle,
  onTaskAdd,
  onTaskDelete,
  onTaskUpdate,
  onExpand,
}) => {
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootTitle, setNewRootTitle] = useState('');

  const stats = countTasks(tasks);
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleAddRoot = () => {
    if (newRootTitle.trim()) {
      onTaskAdd?.(null, newRootTitle.trim());
      setNewRootTitle('');
      setShowAddRoot(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {stats.completed} de {stats.total}
        </span>
      </div>

      {/* Progress Bar */}
      {showProgress && stats.total > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress}% concluído</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {stats.completed} concluídas
            </span>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <SubtaskItemRow
            key={task.id}
            task={task}
            level={0}
            maxDepth={maxDepth}
            allowNesting={allowNesting}
            onToggle={onTaskToggle}
            onAdd={onTaskAdd}
            onDelete={onTaskDelete}
            onUpdate={onTaskUpdate}
            onExpand={onExpand}
          />
        ))}
      </div>

      {/* Add Root Task */}
      {showAddRoot ? (
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newRootTitle}
            onChange={(e) => setNewRootTitle(e.target.value)}
            onBlur={() => {
              if (!newRootTitle.trim()) setShowAddRoot(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRoot();
              if (e.key === 'Escape') setShowAddRoot(false);
            }}
            placeholder="Nome do item..."
            className="h-8 flex-1"
            autoFocus
          />
          <Button size="sm" className="h-8" onClick={handleAddRoot}>
            Adicionar
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddRoot(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 w-full"
        >
          <Plus className="h-4 w-4" />
          Adicionar item
        </button>
      )}
    </div>
  );
};

export default SubtasksHierarchy;
