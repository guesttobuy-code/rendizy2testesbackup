/**
 * StaysNet Integration - Import Stats Component
 * Displays import statistics in a clean, organized way
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { CheckCircle2, XCircle, RefreshCw, TrendingUp } from 'lucide-react';
import type { ImportStats as ImportStatsType } from '../types';

interface ImportStatsProps {
  stats: ImportStatsType;
  title?: string;
}

export function ImportStats({ stats, title = 'Estatísticas da Importação' }: ImportStatsProps) {
  const renderSection = (
    label: string,
    data: {
      fetched: number;
      created: number;
      updated: number;
      failed: number;
    } | undefined
  ) => {
    if (!data) return null;

    const total = data.created + data.updated;
    const successRate = data.fetched > 0 ? ((total / data.fetched) * 100).toFixed(1) : '0';

    return (
      <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">{label}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Buscados:</span>
            <Badge variant="outline">{data.fetched}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Criados:</span>
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {data.created}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Atualizados:</span>
            <Badge variant="default" className="bg-blue-500">
              <RefreshCw className="w-3 h-3 mr-1" />
              {data.updated}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Falharam:</span>
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              {data.failed}
            </Badge>
          </div>
          <div className="col-span-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Taxa de Sucesso:</span>
              <Badge variant="default" className="bg-purple-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                {successRate}%
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          {title}
        </CardTitle>
        <CardDescription>
          Resumo dos dados importados do Stays.net
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderSection('📊 Propriedades', stats.properties)}
        {renderSection('📅 Reservas', stats.reservations)}
        {renderSection('👥 Hóspedes', stats.guests)}
      </CardContent>
    </Card>
  );
}
