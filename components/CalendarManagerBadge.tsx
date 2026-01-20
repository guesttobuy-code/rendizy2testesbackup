/**
 * CALENDAR MANAGER BADGE
 * 
 * Badge visual para monitorar o status da agenda viva.
 * Mostra informações sobre o horizonte de 5 anos do calendário.
 * 
 * @author RENDIZY Team
 * @version 1.0.0
 * @date 2025-10-28
 */

import React, { useState } from 'react';
import { Calendar, TrendingUp, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { cn } from './ui/utils';

interface CalendarManagerStats {
  lastDay: string;
  daysRemaining: number;
  yearsRemaining: number;
  isHealthy: boolean;
  targetDays: number;
}

interface CalendarManagerBadgeProps {
  stats: CalendarManagerStats | null;
  isMonitoring: boolean;
  onManualCheck?: () => void;
  className?: string;
}

export function CalendarManagerBadge({
  stats,
  isMonitoring,
  onManualCheck,
  className
}: CalendarManagerBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!stats) {
    return null;
  }

  const percentageCovered = (stats.daysRemaining / stats.targetDays) * 100;
  const isWarning = percentageCovered < 80;

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 h-8 px-3 rounded-full",
              isWarning && "text-orange-600 dark:text-orange-400",
              className
            )}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">
              {stats.yearsRemaining} anos
            </span>
            {isMonitoring && (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agenda Viva
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Sistema de calendário infinito
                </p>
              </div>
              {stats.isHealthy ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isMonitoring ? "default" : "secondary"}>
                  {isMonitoring ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Último dia</span>
                <span className="text-sm font-mono">{stats.lastDay}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dias restantes</span>
                <span className="text-sm font-semibold">
                  {stats.daysRemaining.toLocaleString()} dias
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Anos à frente</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {stats.yearsRemaining} anos
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Cobertura</span>
                  <span className="text-xs font-medium">
                    {percentageCovered.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      stats.isHealthy
                        ? "bg-green-600"
                        : "bg-orange-600"
                    )}
                    style={{ width: `${Math.min(percentageCovered, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900 dark:text-blue-200">
                O sistema mantém automaticamente 5 anos de agenda sempre disponíveis. 
                À meia-noite, novos dias são adicionados conforme necessário.
              </p>
            </div>

            {/* Manual check button */}
            {onManualCheck && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onManualCheck();
                  setIsOpen(false);
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Verificar Agora
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
