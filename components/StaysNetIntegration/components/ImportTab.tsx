/**
 * StaysNet Integration - Import Tab Component  
 * Tab for importing properties, reservations, and guests
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { LoadingButton } from './LoadingButton';
import { PropertySelector } from './PropertySelector';
import { ImportStats } from './ImportStats';
import { ImportProgress, ImportProgressData } from './ImportProgress';
import { Home, Search, Download, Calendar, Users, Database, Info, AlertCircle } from 'lucide-react';
import type { StaysNetConfig, ImportStats as ImportStatsType, ImportType } from '../types';

interface ImportTabProps {
  config: StaysNetConfig;
  // Properties
  availableProperties: any[];
  selectedPropertyIds: string[];
  loadingProperties: boolean;
  onFetchProperties: () => void;
  onToggleProperty: (id: string) => void;
  onSelectAllProperties: () => void;
  onDeselectAllProperties: () => void;
  // Import
  isImporting: boolean;
  importType: ImportType | null;
  stats: ImportStatsType | null;
  error: string | null;
  onImportProperties: () => void;
  onImportReservations: () => void;
  onImportGuests: () => void;
  onImportAll: () => void;
  onImportOneForTest: () => void;  // NEW: Test import with 1 property
  // Date range
  startDate: string;
  endDate: string;
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void;
  // Progress tracking
  importProgress?: ImportProgressData;
  overallProgress?: number;
}

export function ImportTab({
  config,
  availableProperties,
  selectedPropertyIds,
  loadingProperties,
  onFetchProperties,
  onToggleProperty,
  onSelectAllProperties,
  onDeselectAllProperties,
  isImporting,
  importType,
  stats,
  error,
  onImportProperties,
  onImportReservations,
  onImportGuests,
  onImportAll,
  onImportOneForTest,
  startDate,
  endDate,
  onDateChange,
  importProgress,
  overallProgress = 0,
}: ImportTabProps) {
  return (
    <div className="space-y-6">
      {/* Progress Bar - Show during import */}
      {isImporting && importProgress && (
        <ImportProgress data={importProgress} overallProgress={overallProgress} />
      )}

      {/* Properties Section */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="w-4 h-4" />
            Importar Propriedades
          </CardTitle>
          <CardDescription>
            Busque, selecione e importe propriedades do Stays.net
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fetch button */}
          <div className="flex justify-end">
            <LoadingButton
              onClick={onFetchProperties}
              isLoading={loadingProperties}
              loadingText="Buscando..."
              size="lg"
              icon={<Search className="w-4 h-4 mr-2" />}
            >
              Buscar Imóveis
            </LoadingButton>
          </div>

          {/* Property selector */}
          {availableProperties.length > 0 && (
            <>
              <PropertySelector
                properties={availableProperties}
                selectedIds={selectedPropertyIds}
                onToggleProperty={onToggleProperty}
                onSelectAll={onSelectAllProperties}
                onDeselectAll={onDeselectAllProperties}
              />

              {/* Test button - Import 1 property to map the flow */}
              {availableProperties.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100 mb-1">
                          🧪 Modo de Teste: Mapear Fluxo de Dados
                        </h4>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          Importa apenas 1 imóvel com logs detalhados para entender todo o processo de mapeamento e acomodação dos dados no Rendizy.
                        </p>
                      </div>
                      <LoadingButton
                        onClick={onImportOneForTest}
                        isLoading={isImporting && importType === 'test'}
                        loadingText="Importando 1 imóvel com logs..."
                        disabled={availableProperties.length === 0}
                        variant="outline"
                        className="w-full border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900/50"
                        size="default"
                        icon={<Database className="w-4 h-4 mr-2" />}
                      >
                        🧪 Testar Importação com 1 Imóvel (Debug)
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Import button */}
              <LoadingButton
                onClick={onImportProperties}
                isLoading={isImporting && importType === 'properties'}
                loadingText={`Importando ${selectedPropertyIds.length} anúncios...`}
                disabled={selectedPropertyIds.length === 0}
                className="w-full"
                size="lg"
                icon={<Download className="w-4 h-4 mr-2" />}
              >
                Confirmar e Importar {selectedPropertyIds.length} anúncios
              </LoadingButton>
            </>
          )}

          {availableProperties.length === 0 && !loadingProperties && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Clique em "Buscar Imóveis" para carregar as propriedades disponíveis
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Reservations Section */}
      <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Importar Reservas
          </CardTitle>
          <CardDescription>
            Importe reservas dentro de um período específico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date range */}
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

          {/* Import button */}
          <LoadingButton
            onClick={onImportReservations}
            isLoading={isImporting && importType === 'reservations'}
            loadingText="Importando reservas..."
            className="w-full"
            size="lg"
            icon={<Download className="w-4 h-4 mr-2" />}
          >
            Confirmar e Importar Reservas
          </LoadingButton>
        </CardContent>
      </Card>

      {/* Guests Section */}
      <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Importar Hóspedes
          </CardTitle>
          <CardDescription>
            Importe todos os hóspedes cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingButton
            onClick={onImportGuests}
            isLoading={isImporting && importType === 'guests'}
            loadingText="Importando hóspedes..."
            className="w-full"
            size="lg"
            icon={<Download className="w-4 h-4 mr-2" />}
          >
            Confirmar e Importar Hóspedes
          </LoadingButton>
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
            Importe propriedades, reservas e hóspedes de uma vez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingButton
            onClick={onImportAll}
            isLoading={isImporting && importType === 'all'}
            loadingText="Importando tudo..."
            disabled={selectedPropertyIds.length === 0}
            className="w-full"
            size="lg"
            icon={<Database className="w-4 h-4 mr-2" />}
          >
            Confirmar e Importar Tudo
          </LoadingButton>
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
