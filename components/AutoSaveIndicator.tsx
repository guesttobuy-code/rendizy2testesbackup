/**
 * RENDIZY - Auto Save Indicator
 * 
 * Componente visual para mostrar o status de auto-save
 * 
 * @version 1.0.103.122
 * @date 2025-10-30
 */

import React from 'react';
import { CheckCircle2, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from './ui/utils';
import { SaveStatus } from '../hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Salvando...',
          className: 'text-blue-600',
          iconClassName: 'animate-spin',
        };
      case 'saved':
        return {
          icon: CheckCircle2,
          text: 'Salvo',
          className: 'text-green-600',
          iconClassName: '',
        };
      case 'error':
        return {
          icon: CloudOff,
          text: 'Erro ao salvar',
          className: 'text-red-600',
          iconClassName: '',
        };
      case 'idle':
      default:
        return {
          icon: Cloud,
          text: 'Auto-save ativo',
          className: 'text-gray-400',
          iconClassName: '',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm', config.className, className)}>
      <Icon className={cn('w-4 h-4', config.iconClassName)} />
      <span>{config.text}</span>
    </div>
  );
}

export default AutoSaveIndicator;
