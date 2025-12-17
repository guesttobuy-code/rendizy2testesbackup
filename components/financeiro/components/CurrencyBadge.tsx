/**
 * RENDIZY - Currency Badge Component
 * Badge para exibir moeda
 */

import React from 'react';
import { Badge } from '../../ui/badge';
import { DollarSign, Euro, CircleDollarSign } from 'lucide-react';
import type { Currency } from '../../../types/financeiro';

export interface CurrencyBadgeProps {
  currency: Currency;
  variant?: 'default' | 'outline' | 'secondary';
}

const currencyIcons = {
  BRL: CircleDollarSign,
  USD: DollarSign,
  EUR: Euro
};

const currencyLabels = {
  BRL: 'BRL',
  USD: 'USD',
  EUR: 'EUR'
};

export function CurrencyBadge({ currency, variant = 'outline' }: CurrencyBadgeProps) {
  const Icon = currencyIcons[currency];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {currencyLabels[currency]}
    </Badge>
  );
}

export default CurrencyBadge;
