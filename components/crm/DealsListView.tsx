import React from 'react';
import { Deal } from '../../types/crm';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { MoreVertical, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '../ui/utils';

interface DealsListViewProps {
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  onDealUpdate?: (deal: Deal) => void;
}

const SOURCE_CONFIG: Record<Deal['source'], { icon: string; color: string; bgColor: string }> = {
  WHATSAPP: { icon: '💬', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  EMAIL: { icon: '📧', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  AIRBNB: { icon: '🏠', color: 'text-pink-600', bgColor: 'bg-pink-50 dark:bg-pink-900/20' },
  PHONE: { icon: '📞', color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  WEBSITE: { icon: '🌐', color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
  OTHER: { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-900/20' },
};

const STAGE_LABELS: Record<Deal['stage'], string> = {
  QUALIFIED: 'Qualified',
  CONTACT_MADE: 'Contact Made',
  MEETING_ARRANGED: 'Meeting Arranged',
  PROPOSAL_MADE: 'Proposal Made',
  NEGOTIATIONS: 'Negotiations',
  WON: 'Won',
  LOST: 'Lost',
};

export function DealsListView({ deals, onDealClick, onDealUpdate }: DealsListViewProps) {
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (probability >= 30) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className="p-6 space-y-2">
      {deals.length === 0 ? (
        <Card className="p-8 border-dashed border-2">
          <p className="text-center text-sm text-gray-400">Nenhum deal encontrado</p>
        </Card>
      ) : (
        deals.map(deal => {
          const sourceConfig = SOURCE_CONFIG[deal.source] || SOURCE_CONFIG.OTHER;
          const initials = deal.contactName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card
              key={deal.id}
              className={cn(
                'cursor-pointer hover:shadow-md transition-shadow p-4',
                deal.isStale && 'ring-2 ring-yellow-400'
              )}
              onClick={() => onDealClick(deal)}
            >
              <div className="flex items-center gap-4">
                {/* Probability Indicator */}
                <div className={cn('w-1 h-16 rounded-full', getProbabilityColor(deal.probability).split(' ')[0].replace('text-', 'bg-'))} />

                {/* Deal Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                        {deal.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(deal.value, deal.currency)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', sourceConfig.bgColor, sourceConfig.color)}
                        >
                          {sourceConfig.icon} {deal.source}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', getProbabilityColor(deal.probability))}>
                          {deal.probability}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABELS[deal.stage]}
                        </Badge>
                      </div>
                    </div>
                    {deal.isStale && (
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {deal.contactName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Owner: {deal.ownerName}
                      </p>
                    </div>
                    {deal.expectedCloseDate && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Expected close</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Abrir menu de ações
                  }}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Abrir menu de ações
                  }}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

