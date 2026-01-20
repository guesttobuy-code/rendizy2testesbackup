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
import { LoadingButton } from './LoadingButton';
import { ImportStats } from './ImportStats';
import { ImportProgress, ImportProgressData } from './ImportProgress';
import { AlertCircle, FileText, Home, CalendarDays } from 'lucide-react';
import type { StaysNetConfig, ImportStats as ImportStatsType, ImportType, ImportPreview, ImportLogEntry } from '../types';
import { PropertySelector } from './PropertySelector';

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
  importIssues?: any[];
  issuesLoading?: boolean;
  issuesError?: string | null;
  onRefreshIssues?: () => void;
  onReprocessIssues?: () => void;
  onImportProperties: () => void;
  onImportNewOnly: () => void;
  onImportUpsertAll: () => void;
  onImportReservations: () => void;
  onImportGuests: () => void;
  onImportReservationsAndGuests: () => void;
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
  // Properties
  availableProperties,
  selectedPropertyIds,
  preview,
  loadingProperties,
  onFetchProperties,
  onToggleProperty,
  onSelectAllProperties,
  onDeselectAllProperties,
  // Import
  isImporting,
  importType,
  stats,
  error,
  importLogs = [],
  importIssues = [],
  issuesLoading = false,
  issuesError = null,
  onRefreshIssues,
  onReprocessIssues,
  onImportProperties,
  onImportReservations,
  onImportGuests,
  onImportReservationsAndGuests,
  startDate,
  endDate,
  onDateChange,
  dateType,
  onDateTypeChange,
  importProgress,
  overallProgress = 0,
  onImportNewOnly,
  onImportUpsertAll,
  onSelectNewProperties,
}: ImportTabProps) {
  const lastLogs = importLogs.slice(-25);
  const openIssues = Array.isArray(importIssues) ? importIssues : [];

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

      {/* Properties / Listings Section */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="w-4 h-4" />
            Importação de Imóveis (Anúncios)
          </CardTitle>
          <CardDescription>
            Importa imóveis/listings. Pode ser feito separado de reservas e hóspedes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoadingButton
            onClick={onFetchProperties}
            isLoading={loadingProperties}
            loadingText="Carregando imóveis..."
            className="w-full"
            variant="outline"
            icon={<Home className="w-4 h-4 mr-2" />}
          >
            Carregar imóveis do Stays.net
          </LoadingButton>

          {preview && (
            <div className="text-sm text-slate-700 dark:text-slate-300 rounded-md border p-3">
              <div className="font-medium">Preview (sem escrever no banco)</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Remotos: {preview.totalRemote} • Novos: {preview.newCount} • Já existentes: {preview.existingCount}
              </div>
            </div>
          )}

          {availableProperties?.length > 0 && (
            <PropertySelector
              properties={availableProperties}
              selectedIds={selectedPropertyIds}
              onToggleProperty={onToggleProperty}
              onSelectAll={onSelectAllProperties}
              onDeselectAll={onDeselectAllProperties}
            />
          )}

          {!!preview && (
            <div className="grid grid-cols-1 gap-2">
              <LoadingButton
                onClick={onSelectNewProperties}
                isLoading={false}
                loadingText=""
                className="w-full"
                variant="outline"
              >
                Selecionar somente novos (do preview)
              </LoadingButton>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <LoadingButton
              onClick={onImportProperties}
              isLoading={isImporting && importType === 'properties'}
              loadingText="Importando imóveis..."
              className="w-full"
              size="lg"
              icon={<Home className="w-4 h-4 mr-2" />}
            >
              Importar imóveis selecionados
            </LoadingButton>

            <div className="grid grid-cols-2 gap-2">
              <LoadingButton
                onClick={onImportNewOnly}
                isLoading={false}
                loadingText=""
                className="w-full"
                variant="outline"
              >
                Importar somente novos
              </LoadingButton>

              <LoadingButton
                onClick={onImportUpsertAll}
                isLoading={false}
                loadingText=""
                className="w-full"
                variant="outline"
              >
                Importar todos (upsert)
              </LoadingButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations / Guests Section */}
      <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Importação de Reservas
          </CardTitle>
          <CardDescription>
            Importa reservas (e opcionalmente hóspedes) sem importar imóveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedPropertyIds.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Selecione pelo menos 1 imóvel acima para filtrar a importação de reservas.
              </AlertDescription>
            </Alert>
          )}

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

          <div className="grid grid-cols-1 gap-2">
            <LoadingButton
              onClick={onImportReservations}
              disabled={selectedPropertyIds.length === 0}
              isLoading={isImporting && importType === 'reservations'}
              loadingText="Importando reservas..."
              className="w-full whitespace-normal text-left leading-snug"
              size="lg"
              icon={<CalendarDays className="w-4 h-4 mr-2" />}
            >
              Importar somente Reservas
            </LoadingButton>

            <LoadingButton
              onClick={onImportGuests}
              isLoading={isImporting && importType === 'guests'}
              loadingText="Importando hóspedes..."
              className="w-full whitespace-normal text-left leading-snug"
              variant="outline"
              icon={<CalendarDays className="w-4 h-4 mr-2" />}
            >
              Importar somente Hóspedes
            </LoadingButton>

            {/* Mantido por compatibilidade caso alguém dependa do fluxo antigo */}
            <LoadingButton
              onClick={onImportReservationsAndGuests}
              disabled={selectedPropertyIds.length === 0}
              isLoading={isImporting && (importType === 'reservations' || importType === 'guests')}
              loadingText="Importando reservas e hóspedes..."
              className="w-full whitespace-normal text-left leading-snug"
              variant="secondary"
              icon={<CalendarDays className="w-4 h-4 mr-2" />}
            >
              Importar Reservas + Hóspedes
            </LoadingButton>
          </div>

          {/* ⚠️ Sustentável: nunca perder reservas silenciosamente */}
          {(issuesError || openIssues.length > 0) && (
            <div className="space-y-3">
              {issuesError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Falha ao carregar "reservas sem imóvel": {issuesError}
                  </AlertDescription>
                </Alert>
              )}

              {openIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">
                        Atenção: {openIssues.length} reserva(s) da Stays.net sem vínculo com imóvel
                      </div>
                      <div className="text-sm opacity-90">
                        Isso acontece quando a reserva vem com um <strong>listing_id</strong> que ainda não existe no
                        Anúncio Ultimate. Importe imóveis (upsert) e reimporte reservas para resolver.
                      </div>
                      <div className="rounded-md border bg-background/40 p-2 text-xs">
                        {openIssues.slice(0, 8).map((it: any) => {
                          const code = it?.reservation_code || it?.external_id || 'sem-código';
                          const listing = it?.listing_id || 'sem-listing';
                          const dates = [it?.check_in, it?.check_out].filter(Boolean).join(' → ');
                          return (
                            <div key={it?.id || `${code}-${listing}`} className="py-0.5">
                              {code} • {listing}{dates ? ` • ${dates}` : ''}
                            </div>
                          );
                        })}
                        {openIssues.length > 8 && (
                          <div className="pt-1 opacity-80">… e mais {openIssues.length - 8}</div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <LoadingButton
                          onClick={onRefreshIssues}
                          isLoading={issuesLoading}
                          loadingText="Atualizando issues..."
                          className="w-full"
                          variant="outline"
                        >
                          Atualizar lista
                        </LoadingButton>

                        <LoadingButton
                          onClick={onReprocessIssues}
                          isLoading={isImporting && importType === 'reservations'}
                          loadingText="Reprocessando reservas..."
                          className="w-full"
                          disabled={!onReprocessIssues}
                        >
                          Tentar reprocessar agora (reimportar reservas desses listings)
                        </LoadingButton>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
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
