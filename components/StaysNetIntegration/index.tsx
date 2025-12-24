/**
 * StaysNet Integration - Main Component (Refactored)
 * Professional architecture with separation of concerns
 * 
 * This is the orchestrator component that composes all sub-components and hooks
 * Total lines: ~200 (vs 1,392 before)
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Building2, Upload, FileText, RefreshCw, Settings } from 'lucide-react';

// Hooks
import { useStaysNetConfig } from './hooks/useStaysNetConfig';
import { useStaysNetConnection } from './hooks/useStaysNetConnection';
import { useStaysNetImport } from './hooks/useStaysNetImport';

// Components
import { ConfigTab } from './components/ConfigTab';
import { ImportTab } from './components/ImportTab';

/**
 * StaysNet Integration Main Component
 * 
 * Architecture:
 * - Service Layer: API communication (services/staysnet.service.ts)
 * - Custom Hooks: State management (hooks/)
 * - UI Components: Presentational (components/)
 * - Utils: Validators, Logger (utils/)
 * - Types: TypeScript definitions (types.ts)
 */
export default function StaysNetIntegration() {
  // Configuration state
  const {
    config,
    setConfig,
    isSaving,
    urlValidation,
    configValidation,
    saveConfig,
    autoFix,
  } = useStaysNetConfig();

  // Connection testing
  const {
    isTesting,
    connectionStatus,
    testConnection,
  } = useStaysNetConnection();

  // Import state
  const {
    availableProperties,
    selectedPropertyIds,
    preview,
    loadingProperties,
    isImporting,
    importType,
    stats,
    error,
    importLogs,
    importProgress,
    overallProgress,
    fetchProperties,
    importProperties,
    importNewProperties,
    importReservations,
    importGuests,
    importAll,
    importOneForTest,
    toggleProperty,
    selectAllProperties,
    deselectAllProperties,
    selectProperties,
    selectNewProperties,
  } = useStaysNetImport();

  // Date range for reservations
  const [importDateRange, setImportDateRange] = useState({
    startDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 12);
      return d.toISOString().split('T')[0];
    })(),
    endDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 12);
      return d.toISOString().split('T')[0];
    })(),
    // ✅ Prioridade de negócio: não perder check-in/check-out → usar overlap
    dateType: 'checkin' as 'creation' | 'checkin' | 'checkout' | 'included',
  });

  // Handlers
  const handleSaveConfig = async () => {
    try {
      await saveConfig();
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnection(config);
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleFetchProperties = async () => {
    await fetchProperties(config);
  };

  const handleImportProperties = async () => {
    try {
      await importProperties(config, { selectedPropertyIds });
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleImportNewOnly = async () => {
    try {
      await importNewProperties(config);
    } catch (error) {
      // Error already logged in hook
    }
  };

  const handleImportUpsertAll = async () => {
    try {
      const allIds = availableProperties.map((p) => p.id).filter(Boolean);
      selectProperties(allIds);
      await importProperties(config, { selectedPropertyIds: allIds });
    } catch (error) {
      // Error already logged
    }
  };

  const handleImportReservations = async () => {
    try {
      await importReservations(config, {
        selectedPropertyIds,
        startDate: importDateRange.startDate,
        endDate: importDateRange.endDate,
        dateType: importDateRange.dateType,
      });
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleImportGuests = async () => {
    try {
      await importGuests(config, {
        startDate: importDateRange.startDate,
        endDate: importDateRange.endDate,
        dateType: importDateRange.dateType,
      });
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleImportAll = async () => {
    try {
      let ids = selectedPropertyIds;

      // UX: um botão só. Se não houver seleção/carregamento ainda, busca imóveis e seleciona tudo.
      if (!ids || ids.length === 0) {
        const props = availableProperties.length > 0 ? availableProperties : await fetchProperties(config);
        ids = props
          .map((p: any) => p?._id || p?.id)
          .filter(Boolean);
        if (ids.length > 0) {
          selectProperties(ids);
        }
      }

      await importAll(config, {
        selectedPropertyIds: ids,
        startDate: importDateRange.startDate,
        endDate: importDateRange.endDate,
        dateType: importDateRange.dateType,
      });
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleImportOneForTest = async () => {
    try {
      await importOneForTest(config);
    } catch (error) {
      // Error is already logged by the hook
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setImportDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateTypeChange = (value: 'creation' | 'checkin' | 'checkout' | 'included') => {
    setImportDateRange((prev) => ({ ...prev, dateType: value }));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="w-4 h-4 mr-2" />
            Importação
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <FileText className="w-4 h-4 mr-2" />
            Mapeamento
          </TabsTrigger>
          <TabsTrigger value="test">
            <RefreshCw className="w-4 h-4 mr-2" />
            Teste API
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <ConfigTab
            config={config}
            onConfigChange={setConfig}
            onSave={handleSaveConfig}
            onTestConnection={handleTestConnection}
            isSaving={isSaving}
            isTesting={isTesting}
            urlValidation={urlValidation}
            configValidation={configValidation}
            connectionStatus={connectionStatus}
            onAutoFix={autoFix}
          />
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <ImportTab
            config={config}
            availableProperties={availableProperties}
            selectedPropertyIds={selectedPropertyIds}
            preview={preview}
            loadingProperties={loadingProperties}
            onFetchProperties={handleFetchProperties}
            onToggleProperty={toggleProperty}
            onSelectAllProperties={selectAllProperties}
            onDeselectAllProperties={deselectAllProperties}
            onSelectNewProperties={selectNewProperties}
            isImporting={isImporting}
            importType={importType}
            stats={stats}
            error={error}
            importLogs={importLogs}
            onImportProperties={handleImportProperties}
            onImportNewOnly={handleImportNewOnly}
            onImportUpsertAll={handleImportUpsertAll}
            onImportReservations={handleImportReservations}
            onImportGuests={handleImportGuests}
            onImportAll={handleImportAll}
            onImportOneForTest={handleImportOneForTest}
            startDate={importDateRange.startDate}
            endDate={importDateRange.endDate}
            onDateChange={handleDateChange}
            dateType={importDateRange.dateType}
            onDateTypeChange={handleDateTypeChange}
            importProgress={importProgress}
            overallProgress={overallProgress}
          />
        </TabsContent>

        {/* Mapping Tab (Placeholder) */}
        <TabsContent value="mapping">
          <div className="p-8 text-center text-slate-500">
            Mapeamento de campos - Em desenvolvimento
          </div>
        </TabsContent>

        {/* Test API Tab (Placeholder) */}
        <TabsContent value="test">
          <div className="p-8 text-center text-slate-500">
            Teste de endpoints - Em desenvolvimento
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
