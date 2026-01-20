import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ServiceTicket } from '../../types/funnels';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { AlertCircle, CheckCircle2, Clock, XCircle, GripVertical } from 'lucide-react';
import { cn } from '../ui/utils';

interface SortableTicketCardProps {
  ticket: ServiceTicket;
  onClick: () => void;
}

const PRIORITY_COLORS: Record<ServiceTicket['priority'], string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

const STATUS_ICONS: Record<ServiceTicket['status'], React.ElementType> = {
  RESOLVED: CheckCircle2,
  UNRESOLVED: XCircle,
  IN_ANALYSIS: Clock,
  PENDING: AlertCircle,
  CANCELLED: XCircle,
};

const STATUS_COLORS: Record<ServiceTicket['status'], string> = {
  RESOLVED: 'text-green-600',
  UNRESOLVED: 'text-red-600',
  IN_ANALYSIS: 'text-yellow-600',
  PENDING: 'text-blue-600',
  CANCELLED: 'text-gray-600',
};

export function SortableTicketCard({ ticket, onClick }: SortableTicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const StatusIcon = STATUS_ICONS[ticket.status];
  const priorityColor = PRIORITY_COLORS[ticket.priority];
  const statusColor = STATUS_COLORS[ticket.status];

  const taskCount = ticket.tasks.length;
  const completedTasks = ticket.tasks.filter(t => t.status === 'COMPLETED').length;

  const assignedInitials = ticket.assignedToName
    ? ticket.assignedToName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'NA';

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow',
          priorityColor,
          'border-l-4'
        )}
        onClick={onClick}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div 
              {...listeners}
              className="cursor-grab active:cursor-grabbing flex-shrink-0 mt-1"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">
              {ticket.title}
            </h4>
            <StatusIcon className={cn('w-4 h-4 flex-shrink-0 ml-2', statusColor)} />
          </div>

          {ticket.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {ticket.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {ticket.priority}
            </Badge>
            {taskCount > 0 && (
              <span className="text-xs text-gray-500">
                {completedTasks}/{taskCount} tarefas
              </span>
            )}
          </div>

          {ticket.assignedToName && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
                  {assignedInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {ticket.assignedToName}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

