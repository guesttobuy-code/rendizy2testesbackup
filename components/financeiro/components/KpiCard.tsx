/**
 * RENDIZY - KPI Card Component
 * Card de KPI reutilizável para dashboard financeiro
 */

import React from 'react';
import { Card } from '../../ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../ui/utils';

export interface KpiCardProps {
  title: string;
  value: number | string | React.ReactNode;
  hint?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    pct?: number;
  };
  icon?: React.ReactNode;
  tone?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  hint,
  trend,
  icon,
  tone = 'neutral',
  loading = false
}: KpiCardProps) {
  const toneStyles = {
    success: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
    danger: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
    warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
    neutral: 'border-gray-200 dark:border-gray-800'
  };

  const toneTextStyles = {
    success: 'text-green-700 dark:text-green-300',
    danger: 'text-red-700 dark:text-red-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300',
    neutral: 'text-gray-900 dark:text-gray-100'
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = cn(
      'h-4 w-4',
      trend.direction === 'up' && 'text-green-600 dark:text-green-400',
      trend.direction === 'down' && 'text-red-600 dark:text-red-400',
      trend.direction === 'flat' && 'text-gray-600 dark:text-gray-400'
    );

    if (trend.direction === 'up') return <TrendingUp className={iconClass} />;
    if (trend.direction === 'down') return <TrendingDown className={iconClass} />;
    return <Minus className={iconClass} />;
  };

  return (
    <Card className={cn(
      'p-6 transition-all hover:shadow-md',
      toneStyles[tone]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className={cn(
              'text-3xl mb-1',
              toneTextStyles[tone]
            )}>
              {value}
            </p>
          )}

          {hint && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {hint}
            </p>
          )}

          {trend && trend.pct !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={cn(
                'text-sm',
                trend.direction === 'up' && 'text-green-600 dark:text-green-400',
                trend.direction === 'down' && 'text-red-600 dark:text-red-400',
                trend.direction === 'flat' && 'text-gray-600 dark:text-gray-400'
              )}>
                {trend.pct > 0 ? '+' : ''}{trend.pct.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">vs período anterior</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={cn(
            'p-3 rounded-xl',
            tone === 'success' && 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            tone === 'danger' && 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
            tone === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
            tone === 'info' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            tone === 'neutral' && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
