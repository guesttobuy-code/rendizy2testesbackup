/**
 * StaysNet Integration - Import Progress Component
 * Real-time progress bar for import operations
 */

import React from 'react';
import { Card, CardContent } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { CheckCircle2, Loader2, Home, Calendar, Users } from 'lucide-react';

export interface ImportProgressData {
  properties?: {
    total: number;
    current: number;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
  };
  reservations?: {
    total: number;
    current: number;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
  };
  guests?: {
    total: number;
    current: number;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
  };
}

interface ImportProgressProps {
  data: ImportProgressData;
  overallProgress: number; // 0-100
}

export function ImportProgress({ data, overallProgress }: ImportProgressProps) {
  const renderStepProgress = (
    icon: React.ReactNode,
    label: string,
    stepData?: {
      total: number;
      current: number;
      status: 'pending' | 'in-progress' | 'completed' | 'error';
    }
  ) => {
    if (!stepData) return null;

    const percentage = stepData.total > 0 ? (stepData.current / stepData.total) * 100 : 0;
    const isActive = stepData.status === 'in-progress';
    const isCompleted = stepData.status === 'completed';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : isActive ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <div className="w-4 h-4">{icon}</div>
            )}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {stepData.current}/{stepData.total}
            </span>
            <Badge
              variant={isCompleted ? 'default' : isActive ? 'secondary' : 'outline'}
              className={
                isCompleted
                  ? 'bg-green-500'
                  : isActive
                  ? 'bg-blue-500'
                  : 'bg-slate-300'
              }
            >
              {percentage.toFixed(0)}%
            </Badge>
          </div>
        </div>
        <Progress
          value={percentage}
          className={`h-2 ${
            isCompleted
              ? '[&>div]:bg-green-500'
              : isActive
              ? '[&>div]:bg-blue-500'
              : '[&>div]:bg-slate-300'
          }`}
        />
      </div>
    );
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent className="pt-6 space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Progresso da Importação
            </h3>
            <Badge variant="default" className="text-lg px-3 py-1 bg-blue-600">
              {overallProgress.toFixed(0)}%
            </Badge>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
            {overallProgress < 100
              ? 'Importando dados do Stays.net...'
              : '✅ Importação concluída com sucesso!'}
          </p>
        </div>

        {/* Step-by-step progress */}
        <div className="space-y-4 pt-4 border-t">
          {renderStepProgress(
            <Home className="w-4 h-4 text-blue-600" />,
            'Propriedades',
            data.properties
          )}
          {renderStepProgress(
            <Calendar className="w-4 h-4 text-green-600" />,
            'Reservas',
            data.reservations
          )}
          {renderStepProgress(
            <Users className="w-4 h-4 text-purple-600" />,
            'Hóspedes',
            data.guests
          )}
        </div>
      </CardContent>
    </Card>
  );
}
