import React, { useState, useEffect } from 'react';
import { DealActivity, ActivityType } from '../../types/crm';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { CheckCircle2, Mail, Phone, FileText, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '../ui/utils';
import { dealsApi } from '../../utils/api';

interface DealActivityTimelineProps {
  dealId: string;
  onRefresh?: () => void;
}

// Mock activities - fallback se API não estiver disponível
const mockActivities: DealActivity[] = [
  {
    id: '1',
    dealId: '1',
    type: 'STAGE_CHANGE',
    title: 'Deal created',
    userId: '1',
    userName: 'Rafael Milfont',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    dealId: '1',
    type: 'EMAIL',
    title: 'Email Sent: Proposal',
    description: 'Proposal sent via Gmail integration',
    userId: '1',
    userName: 'Rafael Milfont',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    metadata: { integration: 'Gmail' },
  },
  {
    id: '3',
    dealId: '1',
    type: 'STAGE_CHANGE',
    title: 'Stage Changed',
    description: 'Changed to Contact Made',
    userId: '1',
    userName: 'Rafael Milfont',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    dealId: '1',
    type: 'CALL',
    title: 'Call Logged',
    description: 'Left voicemail regarding new features.',
    userId: '1',
    userName: 'Rafael Milfont',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: FileText,
  TASK: CheckCircle2,
  STAGE_CHANGE: ArrowRight,
};

export function DealActivityTimeline({ dealId, onRefresh }: DealActivityTimelineProps) {
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [dealId]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const response = await dealsApi.getActivities(dealId);
      if (response.success && response.data) {
        setActivities(response.data);
      } else {
        // Fallback para mock
        setActivities(mockActivities.filter(a => a.dealId === dealId));
      }
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      setActivities(mockActivities.filter(a => a.dealId === dealId));
    } finally {
      setIsLoading(false);
    }
  };

  // Expor função de refresh para componente pai
  useEffect(() => {
    if (onRefresh) {
      // Criar função de refresh que pode ser chamada externamente
      (window as any)[`refreshActivities_${dealId}`] = loadActivities;
    }
    return () => {
      delete (window as any)[`refreshActivities_${dealId}`];
    };
  }, [dealId, onRefresh]);

  if (isLoading) {
    return <p className="text-sm text-gray-500">Carregando atividades...</p>;
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_ICONS[activity.type] || FileText;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
                  {getInitials(activity.userName)}
                </AvatarFallback>
              </Avatar>
              {!isLast && (
                <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2 min-h-[40px]" />
              )}
            </div>

            {/* Activity Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.description}
                    </p>
                  )}
                  {activity.metadata?.integration && (
                    <span className="inline-block mt-1 text-xs text-blue-600 dark:text-blue-400">
                      View
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {activity.userName} • {formatTime(activity.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

