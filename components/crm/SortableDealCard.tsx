import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DealCard } from './DealCard';
import { Deal } from '../../types/crm';

interface SortableDealCardProps {
  deal: Deal;
  onClick: () => void;
}

export function SortableDealCard({ deal, onClick }: SortableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} onClick={onClick} />
    </div>
  );
}

