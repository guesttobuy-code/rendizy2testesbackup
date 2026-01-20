/**
 * RENDIZY - Money Component
 * Componente para formatação monetária
 */

import React from 'react';
import type { Currency } from '../../../types/financeiro';
import { cn } from '../../ui/utils';

export interface MoneyProps {
  amount: number;
  currency?: Currency;
  precision?: number;
  showSign?: boolean;
  showCurrency?: boolean;
  className?: string;
  colorize?: boolean;
}

const currencyConfig = {
  BRL: {
    symbol: 'R$',
    locale: 'pt-BR'
  },
  USD: {
    symbol: '$',
    locale: 'en-US'
  },
  EUR: {
    symbol: '€',
    locale: 'de-DE'
  }
};

export function Money({
  amount,
  currency = 'BRL',
  precision = 2,
  showSign = false,
  showCurrency = true,
  className,
  colorize = false
}: MoneyProps) {
  const config = currencyConfig[currency];
  
  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'decimal',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : amount > 0 && showSign ? '+' : '';
  const symbol = showCurrency ? `${config.symbol} ` : '';

  const colorClass = colorize
    ? amount < 0
      ? 'text-red-600 dark:text-red-400'
      : amount > 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-gray-600 dark:text-gray-400'
    : '';

  return (
    <span className={cn(colorClass, className)} suppressHydrationWarning>
      {sign}{symbol}{formatted}
    </span>
  );
}

export default Money;
