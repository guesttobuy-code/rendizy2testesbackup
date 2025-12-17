import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ServiceTask } from '../../types/funnels';
import { Card, CardContent } from '../ui/card';
import { GripVertical } from 'lucide-react';

interface SortableTaskCardProps {
  task: ServiceTask;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SortableTaskCard({ task, children, disabled }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'ring-2 ring-primary' : ''}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            {!disabled && (
              <button
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1">
              {children}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

