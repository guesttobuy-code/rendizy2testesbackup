import React from 'react';
import { Deal, DealSource } from '../../types/crm';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';

interface DealCardProps {
  deal: Deal;
  onClick: () => void;
}

const SOURCE_CONFIG: Record<DealSource, { icon: string; color: string; bgColor: string }> = {
  WHATSAPP: { icon: '💬', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  EMAIL: { icon: '📧', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  AIRBNB: { icon: '🏠', color: 'text-pink-600', bgColor: 'bg-pink-50 dark:bg-pink-900/20' },
  PHONE: { icon: '📞', color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  WEBSITE: { icon: '🌐', color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
  OTHER: { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20' },
};

export function DealCard({ deal, onClick }: DealCardProps) {
  const formatCurrency = (value: number, currency: string) => {
    const currencyMap: Record<string, string> = {
      BRL: 'BRL',
      USD: 'USD',
      EUR: 'EUR',
    };
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyMap[currency] || 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'border-l-4 border-l-green-500';
    if (probability >= 30) return 'border-l-4 border-l-yellow-500';
    return 'border-l-4 border-l-red-500';
  };

  const sourceConfig = SOURCE_CONFIG[deal.source] || SOURCE_CONFIG.OTHER;
  const initials = deal.contactName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow p-4',
        getProbabilityColor(deal.probability),
        deal.isStale && 'ring-2 ring-yellow-400'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
            {deal.title}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(deal.value, deal.currency)}
            </span>
            <Badge
              variant="outline"
              className={cn('text-xs', sourceConfig.bgColor, sourceConfig.color)}
            >
              {sourceConfig.icon} {deal.source}
            </Badge>
          </div>
        </div>
        {deal.isStale && (
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        )}
      </div>

      {/* Contact Info */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
          {deal.contactName}
        </span>
        <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </Card>
  );
}

