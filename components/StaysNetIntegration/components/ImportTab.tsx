/**
 * StaysNet Integration - Import Tab Component  
 * Tab for importing properties, reservations, and guests
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Progress } from '../../ui/progress';
import { LoadingButton } from './LoadingButton';
import { ImportStats } from './ImportStats';
import { ImportProgress, ImportProgressData } from './ImportProgress';
import { Database, AlertCircle, FileText } from 'lucide-react';
import type { StaysNetConfig, ImportStats as ImportStatsType, ImportType, ImportPreview, ImportLogEntry } from '../types';

interface ImportTabProps {
  config: StaysNetConfig;
  // Properties
  availableProperties: any[];
  selectedPropertyIds: string[];
  preview?: ImportPreview | null;
  loadingProperties: boolean;
  onFetchProperties: () => void;
  onToggleProperty: (id: string) => void;
  onSelectAllProperties: () => void;
  onDeselectAllProperties: () => void;
  onSelectNewProperties: () => void;
  // Import
  isImporting: boolean;
  importType: ImportType | null;
  stats: ImportStatsType | null;
  error: string | null;
  importLogs?: ImportLogEntry[];
  onImportProperties: () => void;
  onImportNewOnly: () => void;
  onImportUpsertAll: () => void;
  onImportReservations: () => void;
  onImportGuests: () => void;
  onImportAll: () => void;
  onImportOneForTest: () => void;  // NEW: Test import with 1 property
  // Date range
  startDate: string;
  endDate: string;
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void;
  dateType: 'creation' | 'checkin' | 'checkout' | 'included';
  onDateTypeChange: (value: 'creation' | 'checkin' | 'checkout' | 'included') => void;
  // Progress tracking
  importProgress?: ImportProgressData;
  overallProgress?: number;
}

export function ImportTab({
  isImporting,
  importType,
  stats,
  error,
  importLogs = [],
  onImportAll,
  startDate,
  endDate,
  onDateChange,
  dateType,
  onDateTypeChange,
  importProgress,
  overallProgress = 0,
}: ImportTabProps) {
  const lastLogs = importLogs.slice(-25);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar - Show during import */}
      {isImporting && importProgress && (
        <ImportProgress data={importProgress} overallProgress={overallProgress} />
      )}

      {/* Logs Step */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Logs da Importação
          </CardTitle>
          <CardDescription>
            Confirmação de execução, contadores e erros (últimos eventos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lastLogs.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Nenhum log ainda. Clique em "Importar tudo" para iniciar.
            </div>
          ) : (
            <div className="space-y-2">
              {lastLogs.map((l) => (
                <div key={l.id} className="rounded-md border p-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(l.timestamp)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">[{l.scope}]</span>
                    <span
                      className={
                        l.level === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : l.level === 'success'
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-slate-700 dark:text-slate-200'
                      }
                    >
                      {l.message}
                    </span>
                  </div>
                  {l.details && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                      {JSON.stringify(l.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import All Section */}
      <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Importação Completa
          </CardTitle>
          <CardDescription>
            Importa imóveis, reservas e hóspedes (em etapas) com persistência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de data (StaysNet)</Label>
            <Select value={dateType} onValueChange={(v) => onDateTypeChange(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creation">Criação da reserva</SelectItem>
                <SelectItem value="checkin">Check-in</SelectItem>
                <SelectItem value="checkout">Check-out</SelectItem>
                <SelectItem value="included">Incluídas no período (overlap)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => onDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => onDateChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <LoadingButton
            onClick={onImportAll}
            isLoading={isImporting && importType === 'all'}
            loadingText="Importando tudo..."
            className="w-full whitespace-normal text-left leading-snug"
            size="lg"
            icon={<Database className="w-4 h-4 mr-2" />}
          >
            Confirmar e Importar Tudo
          </LoadingButton>

          {isImporting && (
            <div className="space-y-2">
              <Progress value={overallProgress} className="h-2" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Importando... {overallProgress.toFixed(0)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      {stats && <ImportStats stats={stats} />}
    </div>
  );
}
