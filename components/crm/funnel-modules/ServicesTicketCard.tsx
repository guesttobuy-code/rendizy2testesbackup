import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ServiceTicket } from '../../../types/funnels';
import { cn } from '../../../components/ui/utils';
import { GripVertical, User, Clock, DollarSign, Package } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

interface ServicesTicketCardProps {
  ticket: ServiceTicket;
  onClick: () => void;
}

export function ServicesTicketCard({ ticket, onClick }: ServicesTicketCardProps) {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border p-3 cursor-pointer',
        'hover:shadow-md transition-shadow',
        isDragging && 'opacity-50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1 truncate">{ticket.title}</h4>

          {ticket.description && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {ticket.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            {ticket.assignedToName && (
              <div className="flex items-center gap-1 text-gray-600">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{ticket.assignedToName}</span>
              </div>
            )}

            {ticket.budget?.estimatedValue && (
              <div className="flex items-center gap-1 text-green-600">
                <DollarSign className="w-3 h-3" />
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                  }).format(ticket.budget.estimatedValue)}
                </span>
              </div>
            )}

            {ticket.products && ticket.products.length > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <Package className="w-3 h-3" />
                <span>{ticket.products.length}</span>
              </div>
            )}
          </div>

          {ticket.dueDate && (
            <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
              <Clock className="w-3 h-3" />
              <span>{new Date(ticket.dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
          )}

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ticket.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
