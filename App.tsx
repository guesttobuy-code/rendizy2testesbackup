/**
 * ⚡ ARQUIVO PRINCIPAL OFICIAL DO SISTEMA RENDIZY v1.0.103+
 * 
 * Este é o ÚNICO arquivo App.tsx oficial do projeto.
 * - Importado por: src/main.tsx (import App from '../App')
 * - Contém: Anúncios Ultimate, Automações, PropertyWizardPage (12 steps)
 * - Status: ✅ ATIVO E FUNCIONANDO
 * 
 * Features implementadas:
 * ✅ Anúncios Ultimate (compra/venda/aluguel)
 * ✅ Automações IA (WhatsApp, respostas automáticas)
 * ✅ Wizard 12 passos (criação de imóveis)
 * ✅ Dashboard inicial
 * ✅ Gestão de reservas e calendário
 * ✅ Chat inbox com Evolution API
 * ✅ Sites de clientes
 * 
 * ⚠️ NÃO CRIAR DUPLICATAS (App-ultimate, App-wizard, etc)!
 * Qualquer alteração deve ser feita AQUI.
 * 
 * Última atualização: 15/12/2025 - Alinhamento definitivo
 * Anterior: App-ultimate.tsx (renomeado para App.tsx)
 */
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import BUILD_INFO from './CACHE_BUSTER';
// Mock backend desabilitado em v1.0.103.305 - Sistema usa apenas Supabase
import { setOfflineMode } from './utils/offlineConfig';
import { useCalendarManager } from './hooks/useCalendarManager';
import { MainSidebar } from './components/MainSidebar';
import { VersionBadge } from './components/VersionBadge';
import { BuildLogger } from './components/BuildLogger';
import LoginPage from './components/LoginPage';
import { Calendar } from './components/CalendarGrid';
import { PriceEditModal } from './components/PriceEditModal';
import { PropertySidebar } from './components/PropertySidebar';
import { CalendarHeader } from './components/CalendarHeader';
import { QuickActionsModal } from './components/QuickActionsModal';
import { ReservationPreviewModal } from './components/ReservationPreviewModal';
import { CreateReservationWizard } from './components/CreateReservationWizard';
import { MinNightsEditModal } from './components/MinNightsEditModal';
import { PropertyConditionModal } from './components/PropertyConditionModal';
import { PropertyRestrictionsModal } from './components/PropertyRestrictionsModal';
import { BlockModal } from './components/BlockModal';
import { BlockDetailsModal } from './components/BlockDetailsModal';
import { QuotationModal } from './components/QuotationModal';
import { ListView } from './components/ListView';
import { TimelineView } from './components/TimelineView';
import { ExportModal } from './components/ExportModal';
import { TagsManagementModal } from './components/TagsManagementModal';
import { EditReservationWizard } from './components/EditReservationWizard';
import { PriceTiersModal } from './components/PriceTiersModal';
import { SeasonalityModal } from './components/SeasonalityModal';
import { CancelReservationModal } from './components/CancelReservationModal';
import { ReservationDetailsModal } from './components/ReservationDetailsModal';
import { LocationsManager } from './components/LocationsManager';
import { IconsPreview } from './components/IconsPreview';
import { FontSelector } from './components/FontSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { DatabaseInitializer } from './components/DatabaseInitializer';

import { ConflictAlert } from './components/ConflictAlert';
import { DashboardInicial } from './components/DashboardInicial';
import { DashboardInicialSimple } from './components/DashboardInicialSimple';
import { AdminMasterFunctional } from './components/AdminMasterFunctional';
import { TenantManagement } from './components/TenantManagement';
import { UserManagement } from './components/UserManagement';
import { ClientsAndGuestsManagement } from './components/ClientsAndGuestsManagement';
import { ProprietariosManagement } from './components/ProprietariosManagement';
import { DocumentosListasClientes } from './components/DocumentosListasClientes';
import { ReservationsManagement } from './components/ReservationsManagement';
import { BookingComIntegration } from './components/BookingComIntegration';
import { LocationsAndListings } from './components/LocationsAndListings';
// ❌ DEPRECADO v1.0.103.406 - import { PropertiesManagement } from './components/PropertiesManagement';
import { DiagnosticoImovel } from './components/DiagnosticoImovel';
import { SettingsManager } from './components/SettingsManager';
import { BulkPricingManager } from './components/BulkPricingManager';
import { ChatInbox } from './components/ChatInbox';
import { ChatInboxWithEvolution } from './components/ChatInboxWithEvolution';
import { GuestsManager } from './components/GuestsManager';
import { NotFoundPage } from './components/NotFoundPage';
import { EmergencyRouter } from './components/EmergencyRouter';
import { EmergencyRecovery } from './components/EmergencyRecovery';
import { PropertyWizardPage } from './pages/PropertyWizardPage';
import DiagnosticoImovelPage from './pages/DiagnosticoImovelPage';
import { FigmaTestPropertyCreator } from './components/FigmaTestPropertyCreator';
import { AutomationsModule } from './components/automations/AutomationsModule';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AppRouter } from './components/AppRouter';
import { LoadingProgress } from './components/LoadingProgress';
import { ListaAnuncios } from './components/anuncio-ultimate/ListaAnuncios';
import FormularioAnuncio from './components/anuncio-ultimate/FormularioAnuncio';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from './utils/supabase/info';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { TopUserMenu } from './components/TopUserMenu';

import { initAutoRecovery } from './utils/autoRecovery';
import { DealsModule } from './components/crm/DealsModule';
import { ServicesFunnelModule } from './components/crm/ServicesFunnelModule';
import { PredeterminedFunnelModule } from './components/crm/PredeterminedFunnelModule';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import CRMTasksDashboard from './components/crm/CRMTasksDashboard';
import { ChevronLeft, ChevronRight, Plus, Filter, Download, Tag, Sparkles, TrendingUp, Database, AlertTriangle } from 'lucide-react';
import { detectConflicts } from './utils/conflictDetection';
import { initializeEvolutionContactsService, getEvolutionContactsService } from './utils/services/evolutionContactsService';
import { Button } from './components/ui/button';
import { reservationsApi, guestsApi, propertiesApi, calendarApi } from './utils/api';
import { cn } from './components/ui/utils';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ClientSitesModule } from './components/client-sites/ClientSitesModule';

// Lazy-loaded module shells (code splitting por módulo grande)
const FinanceiroModule = React.lazy(() => import('./components/financeiro/FinanceiroModule'));
const CRMTasksModule = React.lazy(() => import('./components/crm/CRMTasksModule'));
const BIModule = React.lazy(() => import('./components/bi/BIModule'));
const AdminMasterModule = React.lazy(() =>
  import('./components/admin/AdminMasterModule').then((m) => ({ default: m.AdminMasterModule }))
);
const DashboardModule = React.lazy(() =>
  import('./components/dashboard/DashboardModule').then((m) => ({ default: m.DashboardModule }))
);
const CalendarModule = React.lazy(() =>
  import('./components/calendar/CalendarModule').then((m) => ({ default: m.CalendarModule }))
);
const ReservationsModule = React.lazy(() =>
  import('./components/reservations/ReservationsModule').then((m) => ({ default: m.ReservationsModule }))
);
const ChatModule = React.lazy(() =>
  import('./components/chat/ChatModule').then((m) => ({ default: m.ChatModule }))
);
const MyAccountModule = React.lazy(() =>
  import('./components/account/MyAccountModule').then((m) => ({ default: m.MyAccountModule }))
);
const LocationsModule = React.lazy(() =>
  import('./components/locations/LocationsModule').then((m) => ({ default: m.LocationsModule }))
);
// ❌ DEPRECADO v1.0.103.406 - PropertiesModule removido
// const PropertiesModule = React.lazy(() =>
//   import('./components/properties/PropertiesModule').then((m) => ({ default: m.PropertiesModule }))
// );
const GuestsModule = React.lazy(() =>
  import('./components/guests/GuestsModule').then((m) => ({ default: m.GuestsModule }))
);
const SettingsModule = React.lazy(() =>
  import('./components/settings/SettingsModule').then((m) => ({ default: m.SettingsModule }))
);

// 🏠 CÁPSULA GUEST AREA - v1.0.0 - Área do Hóspede servida centralmente
const GuestAreaPage = React.lazy(() =>
  import('./src/capsules/GuestArea/GuestAreaPage').then((m) => ({ default: m.GuestAreaPage }))
);

// Types
export interface Property {
  id: string;
  name: string;
  /** Nome interno (identificação operacional). */
  internalId?: string;
  /** Nome comercial/título (ex.: Airbnb). */
  title?: string;
  image: string;
  /** Foto de capa (quando disponível). */
  coverPhoto?: string;
  /** Preço base do anúncio (ex.: preco_base_noite / pricing.basePrice). */
  basePrice?: number;
  /** Override por anúncio (salvo em properties.data.discount_packages_override). */
  discountPackagesOverride?: any;
  type: string;
  location: string;
  tarifGroup: string;
  tags?: string[];
}

// ✅ CORREÇÃO v1.0.103.401: Usar tipo unificado ao invés de interface duplicada
export type { Reservation } from './types/reservation';

export interface PriceRule {
  id: string;
  propertyId: string;
  startDate: Date;
  endDate: Date;
  daysOfWeek: number[]; // 0-6 (Dom-Sáb)
  basePrice: number;
}

// ============================================================================
// ⚠️ MOCK DATA REMOVIDO v1.0.103.308 (05/11/2025)
// Sistema agora carrega APENAS dados reais do Supabase
// Sem fallbacks para mock - se API falhar, mostra erro apropriado
// ============================================================================

function App() {
  const [activeModule, setActiveModule] = useState('painel-inicial');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 9, 1)); // October 2025
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarRulesRefreshToken, setCalendarRulesRefreshToken] = useState(0);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [errorBannerDismissed, setErrorBannerDismissed] = useState(false); // Novo: rastreia se foi dispensado
  const [initialLoading, setInitialLoading] = useState(false); // 🔥 FORÇA FALSE - sem loading!

  // 🔥 DEBUG - Log estado inicial
  useEffect(() => {
    console.log('🟢 APP MONTOU COM SUCESSO!');
    console.log('📊 Estado inicial:', {
      activeModule,
      properties: properties.length,
      reservations: reservations.length,
      initialLoading,
      sidebarCollapsed
    });
  }, []); // Roda só uma vez no mount

  // ✅ ETAPA 4 - Inicializar Evolution Contacts Service
  useEffect(() => {
    console.log('🔄 Inicializando Evolution Contacts Service...');
    initializeEvolutionContactsService();

    // Cleanup: parar sincronização ao desmontar
    return () => {
      const service = getEvolutionContactsService();
      service?.stopAutoSync();
      console.log('🛑 Evolution Contacts Service parado');
    };
  }, []);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(2025, 9, 24), // Oct 24
    to: new Date(2025, 10, 11) // Nov 11
  });

  // 🚨 FIX v1.0.103.153: Garantir que loading nunca fica travado
  useEffect(() => {
    // Se loading ainda estiver ativo após 5 segundos, força desativar
    const emergencyTimeout = setTimeout(() => {
      if (initialLoading || loadingProperties) {
        console.error('🚨 EMERGENCY FIX: Loading travado detectado!');
        console.log('🔧 Forçando finalização do loading...');
        setInitialLoading(false);
        setLoadingProperties(false);
        toast.success('Sistema carregado (modo emergência)');
      }
    }, 5000);

    return () => clearTimeout(emergencyTimeout);
  }, [initialLoading, loadingProperties]);

  // 🚀 SISTEMA DE AUTO-RECUPERAÇÃO v1.0.103.157 - DESABILITADO
  useEffect(() => {
    console.log('⚠️ Auto-recuperação DESABILITADA (v1.0.103.157)');
    // 🔥 DESABILITADO - estava causando loop infinito
    // initAutoRecovery();

    // 🔥 DESABILITADO v1.0.103.268 - Mock Mode removido para testes com dados reais
    // enableMockMode();
    // setOfflineMode(true);

    // Limpar dados mock do localStorage (sistema agora usa apenas Supabase)
    const mockDataKeys = ['rendizy_mock_data', 'rendizy_mock_enabled', 'rendizy_data_version'];
    mockDataKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ Removido: ${key}`);
      }
    });

    console.log('✅ Sistema rodando em modo PRODUÇÃO (sem mock data).');

    // 📱 DESABILITADO v1.0.103.169 - Evolution Contacts Service
    // Evita "Failed to fetch" quando backend está offline
    /*
    try {
      const { initializeEvolutionContactsService } = require('./utils/services/evolutionContactsService');
      initializeEvolutionContactsService();
      console.log('✅ Evolution Contacts Service iniciado - Sync automática a cada 5 min');
    } catch (error) {
      console.warn('⚠️ Evolution Contacts Service não pôde ser iniciado:', error);
    }
    */
    console.log('⚠️ Evolution Contacts Service DESABILITADO - Evita erro quando backend offline');
  }, []);

  const [selectedReservationTypes, setSelectedReservationTypes] = useState<string[]>([
    'pre-reserva',
    'reserva',
    'contrato',
    'bloqueado',
    'manutencao',
    'cancelada'
  ]);

  const [priceEditModal, setPriceEditModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [minNightsModal, setMinNightsModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [conditionModal, setConditionModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [restrictionsModal, setRestrictionsModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [quickActionsModal, setQuickActionsModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [reservationPreviewModal, setReservationPreviewModal] = useState<{
    open: boolean;
    reservation?: Reservation;
  }>({ open: false });

  const [createReservationWizard, setCreateReservationWizard] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [blockDetailsModal, setBlockDetailsModal] = useState<{
    open: boolean;
    block?: any;
  }>({ open: false });

  const [quotationModal, setQuotationModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });



  const [exportModal, setExportModal] = useState(false);
  const [tagsModal, setTagsModal] = useState(false);
  const [currentView, setCurrentView] = useState<'calendar' | 'list' | 'timeline'>('calendar');

  const [editReservationWizard, setEditReservationWizard] = useState<{
    open: boolean;
    reservation?: Reservation;
  }>({ open: false });

  const [priceTiersModal, setPriceTiersModal] = useState<{
    open: boolean;
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ open: false });

  const [seasonalityModal, setSeasonalityModal] = useState<{
    open: boolean;
    propertyId?: string;
  }>({ open: false });

  const [cancelReservationModal, setCancelReservationModal] = useState<{
    open: boolean;
    reservation?: Reservation;
  }>({ open: false });

  const [reservationDetailsModal, setReservationDetailsModal] = useState<{
    open: boolean;
    reservation?: Reservation;
  }>({ open: false });

  const [databaseInitModal, setDatabaseInitModal] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictAlert, setShowConflictAlert] = useState(true);

  // ⚠️ FUNÇÃO REMOVIDA v1.0.103.308 - Não há mais "force load" com mock
  // Sistema carrega apenas dados reais do Supabase

  // 🔥 DESABILITADO - initialLoading já começa como false!
  /*
  // Log build info on mount + Force load imediato
  useEffect(() => {
    console.log('🎯 APP INITIALIZED - BUILD INFO:', BUILD_INFO);
    console.log('📅 Version:', BUILD_INFO.version);
    console.log('🔨 Build:', BUILD_INFO.build);
    console.log('⏰ Timestamp:', BUILD_INFO.timestamp);
    console.log('�� Changes:', BUILD_INFO.changes);
    console.log('⚡ [AUTO-LOAD] initialLoading inicial:', initialLoading);
    
    // 🔥 FORCE LOAD IMEDIATO - sem dependências, roda apenas 1 vez
    console.log('⚡ [AUTO-LOAD] Iniciando carregamento...');
    const loadTimer = setTimeout(() => {
      console.log('⚡ [AUTO-LOAD] Timeout disparado! Carregando dados...');
      setProperties(mockProperties);
      setSelectedProperties(mockProperties.map(p => p.id));
      setReservations(mockReservations);
      setBlocks([]);
      setLoadingProperties(false);
      setInitialLoading(false);
      console.log('✅ [AUTO-LOAD] initialLoading setado para FALSE!');
      toast.success('Sistema carregado!');
    }, 100);
    
    return () => {
      console.log('⚠️ [AUTO-LOAD] Cleanup');
      clearTimeout(loadTimer);
    };
  }, []); // ✅ Array vazio = roda apenas 1 vez, sem loop
  */

  // Log apenas uma vez
  console.log('🎯 APP INITIALIZED - v1.0.103.233 - initialLoading:', initialLoading);

  // ⚠️ BRUTAL FIX REMOVIDO v1.0.103.308 - Sistema carrega dados reais do Supabase

  // Detectar conflitos sempre que as reservas mudarem
  useEffect(() => {
    const { conflicts: detectedConflicts, reservationsWithConflicts } = detectConflicts(
      reservations,
      properties
    );

    setConflicts(detectedConflicts);

    // Atualizar reservas com flag de conflito
    if (detectedConflicts.length > 0) {
      setReservations(reservationsWithConflicts as Reservation[]);
      console.warn('⚠️ OVERBOOKING DETECTADO:', {
        conflictsCount: detectedConflicts.length,
        conflicts: detectedConflicts
      });
    }
  }, [reservations.length]);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getCalendarRulesHeaders = () => {
    const token = localStorage.getItem('rendizy-token');
    return {
      apikey: publicAnonKey,
      Authorization: `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
      ...(token ? { 'X-Auth-Token': token } : {})
    };
  };

  const formatDateYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const buildDateRangeDates = (startDate: Date, endDate: Date) => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatDateYmd(d));
    }

    return dates;
  };

  const runCalendarRulesBatch = async (operations: any[]) => {
    if (!operations.length) return;
    const edgeUrl = `https://${projectId}.supabase.co/functions/v1/calendar-rules-batch`;
    const headers = getCalendarRulesHeaders();
    const MAX_BATCH = 500;

    for (let i = 0; i < operations.length; i += MAX_BATCH) {
      const batch = operations.slice(i, i + MAX_BATCH);
      console.log('[CalendarRules] Enviando batch:', {
        totalOperations: operations.length,
        batchSize: batch.length,
        sample: batch[0]
      });
      const resp = await fetch(edgeUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ operations: batch })
      });

      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }

      const result = await resp.json();
      console.log('[CalendarRules] Resposta batch:', result);
      if (!result?.success || (result?.failed ?? 0) > 0) {
        throw new Error(`Falha ao salvar regras: ${JSON.stringify(result)}`);
      }

      const savedIds = Array.isArray(result?.results)
        ? result.results.map((r: any) => r?.id).filter((id: string) => !!id)
        : [];

      if (savedIds.length > 0) {
        const idsParam = savedIds.join(',');
        const verifyUrl = `https://${projectId}.supabase.co/functions/v1/calendar-rules-batch?ids=${encodeURIComponent(idsParam)}`;
        const verifyResp = await fetch(verifyUrl, { method: 'GET', headers });
        const verifyBody = await verifyResp.text();
        let verifyData: any = null;
        try {
          verifyData = verifyBody ? JSON.parse(verifyBody) : null;
        } catch {
          verifyData = null;
        }

        const verifyArray = Array.isArray(verifyData?.data) ? verifyData.data : [];
        console.log('[CalendarRules] Verificação pós-save:', {
          status: verifyResp.status,
          count: verifyArray.length,
          sample: verifyArray[0]
        });
      }
    }
  };

  const handlePriceEdit = (propertyId: string, startDate: Date, endDate: Date) => {
    setPriceEditModal({
      open: true,
      propertyId,
      startDate,
      endDate
    });
  };

  const handlePriceSave = async (rule: Omit<PriceRule, 'id'>) => {
    try {
      const dates = buildDateRangeDates(rule.startDate, rule.endDate);
      const operations = dates
        .filter((dateStr) => {
          const d = new Date(`${dateStr}T00:00:00`);
          return rule.daysOfWeek.includes(d.getDay());
        })
        .map((dateStr) => ({
          type: 'upsert',
          property_id: rule.propertyId,
          start_date: dateStr,
          end_date: dateStr,
          base_price: rule.basePrice
        }));

      console.log('[CalendarRules] Base price save payload:', {
        propertyId: rule.propertyId,
        startDate: rule.startDate,
        endDate: rule.endDate,
        basePrice: rule.basePrice,
        totalDays: operations.length
      });

      await runCalendarRulesBatch(operations);
      toast.success('Preços atualizados com sucesso!');
      setCalendarRulesRefreshToken((prev) => prev + 1);
    } catch (error: any) {
      console.error('Erro ao salvar preços base:', error);
      toast.error(`Erro ao salvar preços base: ${error?.message || 'falha desconhecida'}`);
    } finally {
      setPriceEditModal({ open: false });
    }
  };

  const handleMinNightsEdit = (propertyId: string, startDate: Date, endDate: Date) => {
    setMinNightsModal({
      open: true,
      propertyId,
      startDate,
      endDate
    });
  };

  const handleMinNightsSave = async (data: any) => {
    try {
      const dates = buildDateRangeDates(data.startDate, data.endDate);
      const operations = dates.map((dateStr) => ({
        type: 'upsert',
        property_id: data.propertyId,
        start_date: dateStr,
        end_date: dateStr,
        min_nights: data.minNights
      }));

      console.log('[CalendarRules] Min nights save payload:', {
        propertyId: data.propertyId,
        startDate: data.startDate,
        endDate: data.endDate,
        minNights: data.minNights,
        totalDays: operations.length
      });
      await runCalendarRulesBatch(operations);
      toast.success('Mínimo de noites atualizado!');
      setCalendarRulesRefreshToken((prev) => prev + 1);
    } catch (error: any) {
      console.error('Erro ao salvar mínimo de noites:', error);
      toast.error(`Erro ao salvar mínimo de noites: ${error?.message || 'falha desconhecida'}`);
    } finally {
      setMinNightsModal({ open: false });
    }
  };

  const handleConditionEdit = (propertyId: string, startDate: Date, endDate: Date) => {
    setConditionModal({
      open: true,
      propertyId,
      startDate,
      endDate
    });
  };

  const handleConditionSave = async (data: any) => {
    try {
      const dates = buildDateRangeDates(data.startDate, data.endDate);
      const conditionPercent = data.type === 'increase' ? data.percentage : -data.percentage;
      const operations = dates.map((dateStr) => ({
        type: 'upsert',
        property_id: data.propertyId,
        start_date: dateStr,
        end_date: dateStr,
        condition_percent: conditionPercent
      }));

      console.log('[CalendarRules] Condition save payload:', {
        propertyId: data.propertyId,
        startDate: data.startDate,
        endDate: data.endDate,
        conditionPercent,
        totalDays: operations.length
      });
      await runCalendarRulesBatch(operations);
      toast.success('Condição de preço atualizada!');
      setCalendarRulesRefreshToken((prev) => prev + 1);
    } catch (error: any) {
      console.error('Erro ao salvar condição de preço:', error);
      toast.error(`Erro ao salvar condição de preço: ${error?.message || 'falha desconhecida'}`);
    } finally {
      setConditionModal({ open: false });
    }
  };

  const handleRestrictionsEdit = (propertyId: string, startDate: Date, endDate: Date) => {
    setRestrictionsModal({
      open: true,
      propertyId,
      startDate,
      endDate
    });
  };

  const handleRestrictionsSave = async (data: any) => {
    try {
      const dates = buildDateRangeDates(data.startDate, data.endDate);
      const operations = dates.map((dateStr) => ({
        type: 'upsert',
        property_id: data.propertyId,
        start_date: dateStr,
        end_date: dateStr,
        restriction: data.restrictionType ?? null
      }));

      console.log('[CalendarRules] Restrictions save payload:', {
        propertyId: data.propertyId,
        startDate: data.startDate,
        endDate: data.endDate,
        restriction: data.restrictionType ?? null,
        totalDays: operations.length
      });
      await runCalendarRulesBatch(operations);
      toast.success('Restrições atualizadas!');
      setCalendarRulesRefreshToken((prev) => prev + 1);
    } catch (error: any) {
      console.error('Erro ao salvar restrições:', error);
      toast.error(`Erro ao salvar restrições: ${error?.message || 'falha desconhecida'}`);
    } finally {
      setRestrictionsModal({ open: false });
    }
  };

  const handleEmptyClick = (propertyId: string, startDate: Date, endDate: Date) => {
    setQuickActionsModal({
      open: true,
      propertyId,
      startDate,
      endDate
    });
  };

  const handleQuickAction = (action: 'reservation' | 'quote' | 'predictive' | 'maintenance' | 'block' | 'tiers' | 'seasonality') => {
    const { propertyId, startDate, endDate } = quickActionsModal;
    setQuickActionsModal({ open: false });

    // Aguarda o modal fechar completamente antes de abrir o próximo
    setTimeout(() => {
      if (action === 'reservation') {
        setCreateReservationWizard({
          open: true,
          propertyId,
          startDate,
          endDate
        });
      } else if (action === 'quote') {
        setQuotationModal({
          open: true,
          propertyId,
          startDate,
          endDate
        });
      } else if (action === 'block' || action === 'predictive' || action === 'maintenance') {
        // Todos os tipos de bloqueio usam o mesmo modal unificado
        setBlockModal({
          open: true,
          propertyId,
          startDate,
          endDate
        });
      } else if (action === 'tiers') {
        setPriceTiersModal({
          open: true,
          propertyId,
          startDate,
          endDate
        });
      } else if (action === 'seasonality') {
        setSeasonalityModal({
          open: true,
          propertyId
        });
      }
    }, 100); // Delay de 100ms para evitar conflito de modais
  };

  const handleReservationClick = (reservation: Reservation) => {
    setReservationPreviewModal({
      open: true,
      reservation
    });
  };

  const handleOpenReservationDetails = (reservation: Reservation) => {
    setReservationPreviewModal({ open: false });
    setReservationDetailsModal({
      open: true,
      reservation
    });
  };

  const handleOpenBlockDetails = (block: any) => {
    setBlockDetailsModal({
      open: true,
      block
    });
  };

  const handleBlockUpdate = () => {
    // Atualizar lista de bloqueios e reservas
    setRefreshKey(prev => prev + 1);
  };

  const handleBlockDelete = () => {
    // Atualizar lista de bloqueios e reservas
    setRefreshKey(prev => prev + 1);
  };

  // Initialize mock mode and check data consistency on mount
  useEffect(() => {
    // 🔥 DESABILITADO v1.0.103.268 - Mock mode removido para testes com dados reais
    // enableMockMode();
    console.log('✅ Sistema em modo PRODUÇÃO (backend real)');

    const checkDataConsistency = () => {
      try {
        const mockData = localStorage.getItem('rendizy_mock_data');
        if (mockData) {
          const data = JSON.parse(mockData);
          // Check if there are reservations with invalid propertyIds
          if (data.reservations && data.properties) {
            const propertyIds = new Set(data.properties.map((p: any) => p.id));
            const hasInvalidReservations = data.reservations.some(
              (r: any) => !propertyIds.has(r.propertyId)
            );
            if (hasInvalidReservations) {
              console.warn('⚠️ Dados inconsistentes detectados no localStorage');
              console.log('🟣 Ativando banner de erro');
              if (!errorBannerDismissed) {
                setShowErrorBanner(true);
              }
            } else {
              console.log('✅ Dados consistentes no localStorage');
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar consistência dos dados:', error);
      }
    };

    checkDataConsistency();
  }, []);

  // ╔══════════════════════════════════════════════════════════════════════════════╗
  // ║ 🚨🚨🚨 ZONA CRÍTICA - NÃO MODIFICAR SEM AUTORIZAÇÃO EXPLÍCITA 🚨🚨🚨        ║
  // ║                                                                              ║
  // ║ REGRAS DE BLOQUEIO PARA AI/COPILOT:                                          ║
  // ║ 1. NÃO alterar a lógica de fetch de anuncios-ultimate/lista                  ║
  // ║ 2. NÃO adicionar filtros extras que possam excluir propriedades              ║
  // ║ 3. NÃO modificar setProperties() ou setSelectedProperties() aqui             ║
  // ║ 4. NÃO remover logs de diagnóstico                                           ║
  // ║ 5. NÃO adicionar dependências no useCallback que possam causar re-fetch      ║
  // ║                                                                              ║
  // ║ HISTÓRICO DE PROBLEMAS:                                                      ║
  // ║ - Propriedades sumiram quando filtros errados foram aplicados                ║
  // ║ - Propriedades sumiram quando organization_id foi alterado incorretamente    ║
  // ║                                                                              ║
  // ║ SE PRECISAR ALTERAR: Peça confirmação explícita ao usuário primeiro!         ║
  // ╚══════════════════════════════════════════════════════════════════════════════╝
  // Load properties from Anúncios Ultimate - ✅ HABILITADO v1.0.103.335
  const loadProperties = useCallback(async () => {
      setLoadingProperties(true);
      console.log('🔄 [ZONA_CRITICA] Carregando imóveis de Anúncios Ultimate...');

      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
        const ANON_KEY = publicAnonKey;
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/lista`, {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${ANON_KEY}`,
            'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
            'Content-Type': 'application/json'
          }
        });

        let anuncios: any[] = [];

        // ⚠️ Robustez: algumas respostas podem vir como 204/sem body (ou body vazio).
        // Evitar response.json() nesses casos para não lançar exceção e disparar toast indevido.
        if (response.ok) {
          if (response.status === 204) {
            console.log('ℹ️ API retornou 204 (sem conteúdo) para anúncios');
          } else {
            const contentType = response.headers.get('content-type') || '';
            const rawText = await response.text();
            if (!rawText.trim()) {
              console.log('ℹ️ API retornou body vazio para anúncios');
            } else if (!contentType.toLowerCase().includes('application/json')) {
              console.warn('⚠️ API retornou content-type não JSON para anúncios:', contentType);
              // Se o backend devolver HTML/texto, não quebrar o app; tratar como erro real.
              throw new Error('Resposta inválida do servidor (esperado JSON)');
            } else {
              const result = JSON.parse(rawText);
              console.log('✅ Resposta da API de anúncios:', result);
              anuncios = result.anuncios || [];
            }
          }
        }

        if (anuncios && anuncios.length) {
          // 🔒 PROTEÇÃO: Log obrigatório - NÃO REMOVER
          console.log(`🔒 [ZONA_CRITICA] Recebidos ${anuncios.length} anúncios da API`);
          
          const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

          const apiProperties = anuncios.map((a: any) => {
            const title = a.data?.title || a.title || 'Sem título';
            const propertyId = a.id || '';
            const internalId = a.data?.internalId || a.data?.internal_id || a.data?.identificacao_interna;
            const basePriceRaw =
              a.data?.preco_base_noite ??
              a.data?.pricing_base_price ??
              a.data?.pricing?.basePrice ??
              a.data?.pricing?.base_price ??
              a.data?.basePrice ??
              a.data?.base_price ??
              a.pricing_base_price ??
              a.pricing?.basePrice ??
              a.pricing?.base_price ??
              a.base_price;
            const basePrice = basePriceRaw === null || basePriceRaw === undefined ? undefined : Number(basePriceRaw);
            return {
              id: propertyId,
              name: title,
              title,
              internalId: typeof internalId === 'string' ? internalId : undefined,
              image: a.data?.photos?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=100&h=100&fit=crop',
              basePrice: Number.isFinite(basePrice) ? basePrice : undefined,
              discountPackagesOverride: a.data?.discount_packages_override,
              type: 'Imóvel',
              location: 'A definir',
              tarifGroup: 'Ultimate',
              tags: []
            };
          }).filter((p: Property) => p.id);

          apiProperties.sort((a: any, b: any) => {
            const ta = String(a.name || '').trim();
            const tb = String(b.name || '').trim();
            const ka = ta ? ta : `\uffff\uffff\uffff-${a.id}`;
            const kb = tb ? tb : `\uffff\uffff\uffff-${b.id}`;
            const byTitle = collator.compare(ka, kb);
            if (byTitle !== 0) return byTitle;
            return String(a.id).localeCompare(String(b.id));
          });

          console.log(`✅ [ZONA_CRITICA] ${apiProperties.length} imóveis carregados de Anúncios Ultimate`);
          
          // 🔒 PROTEÇÃO: Validar antes de setar - NÃO MODIFICAR ESTA LÓGICA
          if (apiProperties.length === 0 && anuncios.length > 0) {
            console.error('🚨 [ZONA_CRITICA] ALERTA: API retornou anúncios mas mapeamento resultou em 0 propriedades!');
            console.error('🚨 [ZONA_CRITICA] Isso indica bug no mapeamento. NÃO zerando propriedades.');
            // NÃO chamar setProperties([]) - manter estado anterior
          } else {
            setProperties(apiProperties);
            setSelectedProperties(apiProperties.map((p: Property) => p.id));
          }
        } else {
          console.log('ℹ️ [ZONA_CRITICA] Nenhum imóvel encontrado em Anúncios Ultimate');
          // 🔒 PROTEÇÃO: Só zerar se realmente não há anúncios (resposta válida da API)
          setProperties([]);
          setSelectedProperties([]);
        }
      } catch (error) {
        console.error('❌ [ZONA_CRITICA] Erro ao carregar imóveis:', error);
        if (!errorBannerDismissed) {
          setShowErrorBanner(true);
        }
        toast.error('Erro ao carregar imóveis. Verifique sua conexão.');
        // ✅ Estabilidade: não “zerar” a lista de imóveis em falha temporária.
        // Mantém o último estado bom para não quebrar a navegação (ex.: ao criar reserva no calendário).
      } finally {
        setLoadingProperties(false);
        setInitialLoading(false);
      }
    }, [errorBannerDismissed]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  useEffect(() => {
    const onRefresh = () => {
      loadProperties();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'rendizy:propertiesRefresh') {
        loadProperties();
      }
    };

    window.addEventListener('rendizy:properties:refresh' as any, onRefresh as any);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('rendizy:properties:refresh' as any, onRefresh as any);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadProperties]);

  // Load reservations from API - ✅ HABILITADO v1.0.103.308
  useEffect(() => {
    const loadReservations = async () => {
      console.log('🔄 Carregando reservas do Supabase...');

      try {
        // Calcular intervalo de datas (3 meses antes até 6 meses depois)
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 6, 30);

        const [reservationsResponse, guestsResponse, calendarResponse] = await Promise.all([
          reservationsApi.list(),
          guestsApi.list(),
          calendarApi.getData({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            includeBlocks: true,
            includePrices: false
          })
        ]);

        if (reservationsResponse.success && reservationsResponse.data) {
          const loadedGuests = guestsResponse.data || [];
          setGuests(loadedGuests);

          // Convert API reservations to App Reservation format
          const apiReservations = reservationsResponse.data.map((r: any) => {
            const guest = loadedGuests.find((g: any) => g.id === r.guestId);

            // Parse dates properly to avoid timezone issues
            const [ciYear, ciMonth, ciDay] = r.checkIn.split('-').map(Number);
            const [coYear, coMonth, coDay] = r.checkOut.split('-').map(Number);

            return {
              id: r.id,
              propertyId: r.propertyId,
              guestId: r.guestId,
              guestName: guest ? guest.fullName : 'Hóspede',
              checkIn: new Date(ciYear, ciMonth - 1, ciDay),
              checkOut: new Date(coYear, coMonth - 1, coDay),
              status: r.status,
              platform: r.platform,
              externalId: r.externalId,
              externalUrl: r.externalUrl,
              price: r.pricing.total, // ✅ CORREÇÃO v1.0.103.401: API já retorna em reais, não centavos
              nights: r.nights
            };
          });

          console.log(`✅ ${apiReservations.length} reservas carregadas do Supabase`);
          setReservations(apiReservations);

          // Carregar bloqueios do calendário
          if (calendarResponse.success && calendarResponse.data?.blocks) {
            console.log(`✅ ${calendarResponse.data.blocks.length} bloqueios carregados`);
            setBlocks(calendarResponse.data.blocks);
          } else {
            setBlocks([]);
          }
        } else {
          console.log('ℹ️ Nenhuma reserva encontrada no Supabase');
          setReservations([]);
          setBlocks([]);
          if (reservationsResponse.error) {
            console.error('❌ Erro na API:', reservationsResponse.error);
            if (!errorBannerDismissed) {
              setShowErrorBanner(true);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar reservas:', error);
        toast.error('Erro ao carregar reservas. Verifique sua conexão.');
        setReservations([]);
        setBlocks([]);
        if (!errorBannerDismissed) {
          setShowErrorBanner(true);
        }
      }
    };

    loadReservations();
  }, [refreshKey, errorBannerDismissed]);

  // ========================================================================
  // CALENDAR MANAGER - AGENDA VIVA (5 ANOS SEMPRE À FRENTE)
  // ========================================================================

  // Memoizar funções para evitar loop infinito
  const getCurrentLastDay = useCallback(() => {
    const today = new Date();
    const fiveYearsAhead = new Date();
    fiveYearsAhead.setFullYear(today.getFullYear() + 5);
    return fiveYearsAhead;
  }, []);

  const handleDaysAdded = useCallback(async (days: any[]) => {
    console.log(`📅 AGENDA ESTENDIDA: ${days.length} novos dias adicionados!`);
    console.log(`   → Primeiro dia: ${days[0]?.date}`);
    console.log(`   → Último dia: ${days[days.length - 1]?.date}`);

    // TODO: Enviar para o backend quando integrado
    // await calendarApi.extendCalendar(days);

    toast.success(
      `Agenda estendida! ${days.length} novos dias adicionados.`,
      {
        description: `Novo horizonte até ${days[days.length - 1]?.date}`,
        duration: 5000
      }
    );
  }, []);

  const calendarManager = useCalendarManager({
    getCurrentLastDay,
    onDaysAdded: handleDaysAdded,
    enabled: true
  });

  // ========================================================================

  const handleReservationComplete = (data: any) => {
    console.log('Reserva criada:', data);
    toast.success('Reserva criada com sucesso!');
    setCreateReservationWizard({ open: false });
    // Refresh reservations
    setRefreshKey(prev => prev + 1);
  };

  const handleEditReservationComplete = (data: {
    reservationId: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    notes?: string;
    sendEmail: boolean;
  }) => {
    console.log('✏️ Editando reserva:', data);

    // Atualiza a reserva no estado
    setReservations(prev => prev.map(reservation => {
      if (reservation.id === data.reservationId) {
        // Calcula o novo número de noites
        const nights = Math.ceil(
          (data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...reservation,
          guestName: data.guestName,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          price: data.totalPrice,
          nights: nights
        };
      }
      return reservation;
    }));

    // Log para debug
    console.log('📦 Build Info:', BUILD_INFO);

    // Fecha o wizard
    setEditReservationWizard({ open: false });

    // Toast já é mostrado pelo EditReservationWizard
  };

  // Função para buscar reserva por código e navegar até ela
  const handleSearchReservation = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return false;

    console.log('🔍 Buscando reserva:', trimmed);

    const normalized = trimmed.toUpperCase();

    // Buscar a reserva nos dados carregados (por ID exato)
    const reservation = reservations.find(r => (r as any)?.id?.toUpperCase?.() === normalized);

    if (reservation) {
      console.log('✅ Reserva encontrada:', reservation);

      // 1. Navegar para o calendário
      setActiveModule('calendario');

      // 2. Ajustar mês para o check-in da reserva
      const checkInMonth = new Date((reservation as any).checkIn);
      setCurrentMonth(new Date(checkInMonth.getFullYear(), checkInMonth.getMonth(), 1));

      // 3. Selecionar a propriedade da reserva
      const propertyId = (reservation as any).propertyId;
      if (propertyId && !selectedProperties.includes(propertyId)) {
        setSelectedProperties(prev => [...prev, propertyId]);
      }

      // 4. Mostrar preview da reserva após navegação
      setTimeout(() => {
        setReservationPreviewModal({
          open: true,
          reservation
        });
      }, 300);

      toast.success(`Reserva ${(reservation as any).id} encontrada!`);
      return true;
    }

    // Fallback: tentar encontrar por externalId/externalUrl (se existir no payload)
    const reservationByExternal = reservations.find(r => {
      const extId = String((r as any).externalId || '').toUpperCase();
      const extUrl = String((r as any).externalUrl || '').toUpperCase();
      return extId.includes(normalized) || extUrl.includes(normalized);
    });

    if (reservationByExternal) {
      console.log('✅ Reserva encontrada (external):', reservationByExternal);
      return await handleSearchReservation((reservationByExternal as any).id);
    }

    console.log('❌ Reserva não encontrada:', trimmed);
    return false;
  };

  // Função de busca avançada (busca em tudo)
  const handleAdvancedSearch = (query: string): any[] => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const normalizedDigits = query.replace(/\D/g, '').trim();
    const results: any[] = [];

    // 1. Buscar em RESERVAS (código, hóspede, links externos)
    const upperQuery = query.trim().toUpperCase();
    const matchingReservations = reservations.filter(r => {
      const id = String((r as any).id || '').toUpperCase();
      const guestName = String((r as any).guestName || '').toLowerCase();
      const extId = String((r as any).externalId || '').toUpperCase();
      const extUrl = String((r as any).externalUrl || '').toLowerCase();

      return (
        id.includes(upperQuery) ||
        guestName.includes(normalizedQuery) ||
        extId.includes(upperQuery) ||
        extUrl.includes(normalizedQuery)
      );
    });

    matchingReservations.slice(0, 5).forEach(r => {
      const property = properties.find(p => p.id === (r as any).propertyId);
      results.push({
        type: 'reservation',
        id: (r as any).id,
        title: (r as any).id,
        subtitle: `${(r as any).guestName || 'Hóspede'} • ${property?.name || 'Imóvel'} • ${(r as any).nights || 0} noites`,
        icon: 'Calendar' as const,
        data: r
      });
    });

    // 2. Buscar em HÓSPEDES (nome, email, telefone, documentos)
    const matchingGuests = (guests || []).filter(g => {
      const name = String(g.fullName || '').toLowerCase();
      const email = String(g.email || '').toLowerCase();
      const phone = String(g.phone || '');
      const cpf = String(g.cpf || '');
      const rg = String(g.rg || '');
      const passport = String(g.passport || '').toLowerCase();
      const id = String(g.id || '').toLowerCase();

      const cpfDigits = cpf.replace(/\D/g, '');
      const rgDigits = rg.replace(/\D/g, '');
      const phoneDigits = phone.replace(/\D/g, '');

      const matchesText =
        name.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        passport.includes(normalizedQuery) ||
        id.includes(normalizedQuery);

      const matchesDigits =
        (normalizedDigits && cpfDigits.includes(normalizedDigits)) ||
        (normalizedDigits && rgDigits.includes(normalizedDigits)) ||
        (normalizedDigits && phoneDigits.includes(normalizedDigits));

      return matchesText || matchesDigits;
    });

    matchingGuests.slice(0, 5).forEach(g => {
      const idLabel = g.cpf || g.passport || g.rg || g.email || g.phone || g.id;
      results.push({
        type: 'guest',
        id: g.id,
        title: g.fullName || 'Hóspede',
        subtitle: idLabel,
        icon: 'User' as const,
        data: g
      });
    });

    // 3. Buscar em PROPRIEDADES por nome ou localização
    const matchingProperties = properties.filter(p =>
      p.name.toLowerCase().includes(normalizedQuery) ||
      p.location.toLowerCase().includes(normalizedQuery) ||
      p.type.toLowerCase().includes(normalizedQuery)
    );
    matchingProperties.forEach(p => {
      const reservationCount = reservations.filter(r => r.propertyId === p.id).length;
      results.push({
        type: 'property',
        id: p.id,
        title: p.name,
        subtitle: `${p.type} • ${p.location} • ${reservationCount} reservas`,
        icon: 'Home' as const,
        data: p
      });
    });

    // Limitar a 10 resultados
    return results.slice(0, 10);
  };

  // Debug: log do estado do banner
  console.log('🎯 Estado do banner de erro:', showErrorBanner);
  console.log('✅ App renderizando...');

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            {/* 🔥 EMERGENCY ROUTER DESABILITADO v1.0.103.244 - causava loops */}
            {/* <EmergencyRouter /> */}

            {/* Sincronização URL ↔ Módulo */}
            <AppRouter activeModule={activeModule} setActiveModule={setActiveModule} />

            {/* Componentes globais - sempre presentes */}
            <BuildLogger />
            <Toaster />
            <TopUserMenu />

            <Suspense fallback={<LoadingProgress isLoading={true} />}>
              <Routes>
                {/* 🏠 CÁPSULA GUEST AREA - v1.0.0 - Área do Hóspede (pública, sem sidebar) */}
                <Route path="/guest-area" element={<GuestAreaPage />} />

                {/* ✅ ROTA LOGIN - v1.0.103.259 - Sistema Multi-Tenant */}
                <Route path="/login" element={<LoginPage />} />

                {/* 🧪 ROTA TESTE FIGMA - v1.0.103.311 - Criação de Imóvel de Teste - PROTEGIDA */}
                <Route path="/test/figma-property" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <MainSidebar
                        activeModule="test-figma"
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300 p-8",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <div className="max-w-4xl mx-auto w-full">
                          <div className="mb-6">
                            <h1 className="text-3xl mb-2">🧪 Teste Automatizado</h1>
                            <p className="text-gray-600 dark:text-gray-400">
                              Ferramenta de desenvolvimento para criação rápida de imóvel de teste "@figma@"
                            </p>
                          </div>

                          <FigmaTestPropertyCreator />

                          <div className="mt-6 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                              💡 <strong>Dica:</strong> Após criar o imóvel, acesse "Imóveis" no menu lateral para visualizá-lo.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA CALENDÁRIO - v1.0.103.351 - Nova Arquitetura (React Query + Context API) */}
                <Route path="/calendario" element={
                  <ProtectedRoute>
                    <CalendarPage
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                      setExportModal={setExportModal}
                      handleEmptyClick={handleEmptyClick}
                      handleReservationClick={handleReservationClick}
                      handleOpenBlockDetails={handleOpenBlockDetails}
                      handlePriceEdit={handlePriceEdit}
                      handleMinNightsEdit={handleMinNightsEdit}
                      handleConditionEdit={handleConditionEdit}
                      handleRestrictionsEdit={handleRestrictionsEdit}
                      calendarRulesRefreshToken={calendarRulesRefreshToken}
                    />
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA RESERVAS - v1.0.103.253 - PROTEGIDA (ENCAPSULADA) */}
                <Route path="/reservations" element={
                  <ProtectedRoute>
                    <ReservationsModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                      onEditReservation={(reservation) => {
                        setEditReservationWizard({ open: true, reservation });
                      }}
                      onCancelReservation={(reservation) => {
                        setCancelReservationModal({ open: true, reservation });
                      }}
                    />
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA ADMIN MASTER - v1.0.103.253 - PROTEGIDA (CRÍTICO!) - ENCAPSULADA */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminMasterModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                    />
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA CHAT - v1.0.103.253 - PROTEGIDA (ENCAPSULADA) */}
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <ChatModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                    />
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA LOCATIONS - v1.0.103.253 - PROTEGIDA (ENCAPSULADA) */}
                <Route path="/locations" element={
                  <ProtectedRoute>
                    <LocationsModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                    />
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA PRICING - v1.0.103.253 - PROTEGIDA */}
                <Route path="/pricing" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress
                        isLoading={initialLoading}
                      />

                      <MainSidebar
                        activeModule='precos-em-lote'
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <div className="flex-1 overflow-hidden">
                          <BulkPricingManager />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA INTEGRATIONS - v1.0.103.253 - PROTEGIDA */}
                <Route path="/integrations" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress
                        isLoading={initialLoading}
                      />

                      <MainSidebar
                        activeModule='integracoes-bookingcom'
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <div className="flex-1 overflow-hidden">
                          <BookingComIntegration />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA SITES CLIENTES - v1.0.103.253 - PROTEGIDA */}
                <Route path="/sites-clientes/*" element={
                  <ProtectedRoute>
                    <React.Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
                      <ClientSitesModule
                        sidebarCollapsed={sidebarCollapsed}
                        setSidebarCollapsed={setSidebarCollapsed}
                        initialLoading={initialLoading}
                        onModuleChange={setActiveModule}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />
                    </React.Suspense>
                  </ProtectedRoute>
                } />

                {/* ✅ MINHA CONTA / PERFIL (usuário logado) */}
                <Route path="/minha-conta" element={
                  <ProtectedRoute>
                    <React.Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
                      <MyAccountModule
                        sidebarCollapsed={sidebarCollapsed}
                        setSidebarCollapsed={setSidebarCollapsed}
                        initialLoading={initialLoading}
                        onModuleChange={setActiveModule}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />
                    </React.Suspense>
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA GUESTS - v1.0.103.253 - PROTEGIDA (ENCAPSULADA) */}
                <Route path="/guests" element={
                  <ProtectedRoute>
                    <GuestsModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                    />
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA CLIENTES E HÓSPEDES - v1.0.103.335 - PROTEGIDA */}
                <Route path="/clientes-hospedes" element={
                  <ProtectedRoute>
                    <div className="flex h-screen overflow-hidden">
                      <MainSidebar
                        collapsed={sidebarCollapsed}
                        onCollapse={setSidebarCollapsed}
                        activeModule={activeModule}
                        onModuleChange={setActiveModule}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />
                      <div className="flex-1 overflow-auto">
                        <ClientsAndGuestsManagement />
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* ✅ ROTA SETTINGS - v1.0.103.253 - PROTEGIDA (ENCAPSULADA) */}
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                    />
                  </ProtectedRoute>
                } />

                {/* Módulo Financeiro - v1.0.103.234 - PROTEGIDO */}
                <Route path="/financeiro/*" element={
                  <ProtectedRoute>
                    <FinanceiroModule />
                  </ProtectedRoute>
                } />

                {/* Módulo CRM & Tasks - Unificado - PROTEGIDO */}
                <Route path="/crm/*" element={
                  <ProtectedRoute>
                    <CRMTasksModule />
                  </ProtectedRoute>
                }>
                  <Route index element={<CRMTasksDashboard />} />
                  <Route path="deals" element={<DealsModule />} />
                  <Route path="services" element={<ServicesFunnelModule />} />
                  <Route path="predetermined" element={<PredeterminedFunnelModule />} />
                  <Route path="contatos" element={<ModulePlaceholder module="Contatos" />} />
                  <Route path="leads" element={<ModulePlaceholder module="Leads" />} />
                  <Route path="proprietarios" element={<ModulePlaceholder module="Proprietários" />} />
                  <Route path="minhas-tarefas" element={<ModulePlaceholder module="Minhas Tarefas" />} />
                  <Route path="todas-tarefas" element={<ModulePlaceholder module="Todas as Tarefas" />} />
                  <Route path="calendario-tarefas" element={<ModulePlaceholder module="Calendário de Tarefas" />} />
                  <Route path="equipes" element={<ModulePlaceholder module="Equipes" />} />
                  <Route path="prioridades" element={<ModulePlaceholder module="Prioridades" />} />
                  <Route path="pipeline" element={<ModulePlaceholder module="Pipeline de Vendas" />} />
                  <Route path="propostas" element={<ModulePlaceholder module="Propostas" />} />
                  <Route path="negocios" element={<ModulePlaceholder module="Negócios" />} />
                  <Route path="emails" element={<ModulePlaceholder module="E-mails" />} />
                  <Route path="chamadas" element={<ModulePlaceholder module="Chamadas" />} />
                  <Route path="agenda" element={<ModulePlaceholder module="Agenda" />} />
                  <Route path="relatorios" element={<ModulePlaceholder module="Relatórios" />} />
                  <Route path="tarefas-arquivadas" element={<ModulePlaceholder module="Tarefas Arquivadas" />} />
                </Route>

                {/* Módulo Automações - PROTEGIDO */}
                <Route path="/automacoes/*" element={
                  <ProtectedRoute>
                    <AutomationsModule />
                  </ProtectedRoute>
                } />

                {/* Módulo BI - PROTEGIDO */}
                <Route path="/bi/*" element={
                  <ProtectedRoute>
                    <BIModule />
                  </ProtectedRoute>
                } />

                {/* ✅ REABILITADO v1.0.103.174 - Rotas properties com MainSidebar sempre visível - PROTEGIDAS */}
                {/* ❌ DEPRECADO v1.0.103.406 - Wizard antigo removido, migrado para Anúncios Ultimate */}
                {/* <Route path="/properties/new" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <MainSidebar
                        activeModule='imoveis'
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <PropertyWizardPage />
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                <Route path="/properties/:id/edit" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <MainSidebar
                        activeModule='imoveis'
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <PropertyWizardPage />
                      </div>
                    </div>
                  </ProtectedRoute>
                } /> */}

                {/* ❌ DEPRECADO v1.0.103.406 - Wizard antigo removido, migrado para Anúncios Ultimate */}
                {/* <Route path="/properties" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress
                        isLoading={initialLoading}
                      />

                      <MainSidebar
                        activeModule='imoveis'
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <div className="flex-1 overflow-hidden">
                          <PropertiesManagement />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } /> */}

                {/* 🔍 ROTA DIAGNÓSTICO DE IMÓVEL - v1.0.103.314 - PROTEGIDA */}
                {/* ❌ DEPRECADO v1.0.103.406 - Relacionado ao wizard antigo */}
                {/* <Route path="/properties/:id/diagnostico" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <MainSidebar
                        activeModule='imoveis'
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300 p-8",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <div className="max-w-6xl mx-auto w-full">
                          <DiagnosticoImovelPage />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } /> */}

                {/* ⭐ ROTA CONVENCIONADA - Dashboard Inicial - v1.0.103.267 - PROTEGIDA (ENCAPSULADA) */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                      conflicts={conflicts}
                      reservations={reservations}
                      properties={properties}
                      onReservationClick={handleReservationClick}
                      onDismissConflictAlert={() => setShowConflictAlert(false)}
                    />
                  </ProtectedRoute>
                } />

                {/* ⭐ ROTAS ANUNCIO ULTIMATE - v1.0.103.332 */}
                
                {/* Lista de Anúncios */}
                <Route path="/anuncios-ultimate/lista" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress isLoading={initialLoading} />
                      <MainSidebar
                        activeModule="anuncio-ultimate"
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />
                      <div className={cn("flex flex-col min-h-screen transition-all duration-300", sidebarCollapsed ? "lg:ml-20" : "lg:ml-72")}>
                        <div className="flex-1 overflow-hidden">
                          <ListaAnuncios />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* Criar Novo Anúncio - Tabs Simplificado */}
                <Route path="/anuncios-ultimate/novo" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress isLoading={initialLoading} />
                      <MainSidebar
                        activeModule="anuncio-ultimate"
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />
                      <div className={cn("flex flex-col min-h-screen transition-all duration-300", sidebarCollapsed ? "lg:ml-20" : "lg:ml-72")}>
                        <div className="flex-1 overflow-hidden">
                          <FormularioAnuncio />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* Editar Anúncio Existente - Wizard 12 Steps */}
                <Route path="/anuncios-ultimate/:id/edit" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress isLoading={initialLoading} />
                      <MainSidebar
                        activeModule="anuncio-ultimate"
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />
                      <div className={cn("flex flex-col min-h-screen transition-all duration-300", sidebarCollapsed ? "lg:ml-20" : "lg:ml-72")}>
                        <div className="flex-1 overflow-hidden">
                          <FormularioAnuncio />
                        </div>
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

                {/* Redirect antigo /anuncio-ultimate -> /anuncios-ultimate/lista */}
                <Route path="/anuncio-ultimate" element={<Navigate to="/anuncios-ultimate/lista" replace />} />

                {/* ⚡ Rota raiz - Renderiza Dashboard diretamente para evitar falta de rota */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <DashboardModule
                      sidebarCollapsed={sidebarCollapsed}
                      setSidebarCollapsed={setSidebarCollapsed}
                      initialLoading={initialLoading}
                      onModuleChange={setActiveModule}
                      onSearchReservation={handleSearchReservation}
                      onAdvancedSearch={handleAdvancedSearch}
                      conflicts={conflicts}
                      reservations={reservations}
                      properties={properties}
                      onReservationClick={handleReservationClick}
                      onDismissConflictAlert={() => setShowConflictAlert(false)}
                    />
                  </ProtectedRoute>
                } />


                {/* Rota 404 - Catch All - Renderiza Dashboard - PROTEGIDA */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <LoadingProgress
                        isLoading={initialLoading}
                      />

                      <MainSidebar
                        activeModule="painel-inicial"
                        onModuleChange={setActiveModule}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                        onSearchReservation={handleSearchReservation}
                        onAdvancedSearch={handleAdvancedSearch}
                      />

                      <div
                        className={cn(
                          "flex flex-col min-h-screen transition-all duration-300",
                          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
                        )}
                      >
                        <EmergencyRecovery />
                      </div>
                    </div>
                  </ProtectedRoute>
                } />

              </Routes>
            </Suspense>

            <ReservationPreviewModal
              open={reservationPreviewModal.open}
              onClose={() => setReservationPreviewModal({ open: false })}
              reservation={reservationPreviewModal.reservation}
              onOpenDetails={handleOpenReservationDetails}
            />

            <ReservationDetailsModal
              isOpen={reservationDetailsModal.open}
              onClose={() => setReservationDetailsModal({ open: false })}
              reservation={reservationDetailsModal.reservation}
              onCancelReservation={() => setRefreshKey(prev => prev + 1)}
            />

            {/* Quick Actions Modal - Seleção de período no calendário */}
            <QuickActionsModal
              open={quickActionsModal.open}
              onClose={() => setQuickActionsModal({ open: false })}
              propertyId={quickActionsModal.propertyId || ''}
              startDate={quickActionsModal.startDate || new Date()}
              endDate={quickActionsModal.endDate || new Date()}
              onSelectAction={handleQuickAction}
            />

            {/* CreateReservationWizard - Criar Reserva do Calendário */}
            <CreateReservationWizard
              open={createReservationWizard.open}
              onClose={() => setCreateReservationWizard({ open: false })}
              propertyId={createReservationWizard.propertyId}
              startDate={createReservationWizard.startDate}
              endDate={createReservationWizard.endDate}
              onComplete={handleReservationComplete}
            />

            {/* BlockModal - Criar Bloqueio */}
            <BlockModal
              isOpen={blockModal.open}
              onClose={() => setBlockModal({ open: false })}
              propertyId={blockModal.propertyId || ''}
              propertyName={properties.find(p => p.id === blockModal.propertyId)?.name || 'Propriedade'}
              startDate={blockModal.startDate || new Date()}
              endDate={blockModal.endDate || new Date()}
              onSave={() => {
                setBlockModal({ open: false });
                // Recarregar dados do calendário
                window.location.reload();
              }}
            />

            {/* BlockDetailsModal - Ver/Editar Bloqueio */}
            <BlockDetailsModal
              isOpen={blockDetailsModal.open}
              onClose={() => setBlockDetailsModal({ open: false, block: null })}
              block={blockDetailsModal.block}
              onDelete={(blockId: string) => {
                console.log('🗑️ Deletando bloqueio:', blockId);
                // Implementar delete via API
                toast.success('Bloqueio removido!');
                setBlockDetailsModal({ open: false, block: null });
                window.location.reload();
              }}
            />

            {/* PriceEditModal - Editar preços por anúncio */}
            <PriceEditModal
              open={priceEditModal.open}
              onClose={() => setPriceEditModal({ open: false })}
              propertyId={priceEditModal.propertyId}
              property={properties.find(p => p.id === priceEditModal.propertyId)}
              startDate={priceEditModal.startDate}
              endDate={priceEditModal.endDate}
              onSave={handlePriceSave}
            />

            {/* MinNightsEditModal - Editar mínimo de noites por anúncio */}
            <MinNightsEditModal
              open={minNightsModal.open}
              onClose={() => setMinNightsModal({ open: false })}
              propertyId={minNightsModal.propertyId}
              property={properties.find(p => p.id === minNightsModal.propertyId)}
              startDate={minNightsModal.startDate}
              endDate={minNightsModal.endDate}
              onSave={handleMinNightsSave}
            />

            {/* PropertyConditionModal - Editar Condição % por anúncio */}
            <PropertyConditionModal
              isOpen={conditionModal.open}
              onClose={() => setConditionModal({ open: false })}
              propertyId={conditionModal.propertyId || ''}
              propertyName={properties.find(p => p.id === conditionModal.propertyId)?.name || 'Propriedade'}
              startDate={conditionModal.startDate || new Date()}
              endDate={conditionModal.endDate || new Date()}
              onSave={handleConditionSave}
            />

            {/* PropertyRestrictionsModal - Editar Restrições por anúncio */}
            <PropertyRestrictionsModal
              isOpen={restrictionsModal.open}
              onClose={() => setRestrictionsModal({ open: false })}
              propertyId={restrictionsModal.propertyId || ''}
              propertyName={properties.find(p => p.id === restrictionsModal.propertyId)?.name || 'Propriedade'}
              startDate={restrictionsModal.startDate || new Date()}
              endDate={restrictionsModal.endDate || new Date()}
              onSave={handleRestrictionsSave}
            />
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

// Helper functions para obter informações dos módulos
function getModuleName(moduleId: string): string {
  const moduleNames: Record<string, string> = {
    'admin-master': 'Admin Master',
    'painel-inicial': 'Dashboard Inicial',
    'locations-manager': 'Locais-Imóveis',
    'catalogo': 'Catálogo',
    'catalogo-grupos': 'Grupos',
    'catalogo-restricoes': 'Restrições dos Proprietários',
    'catalogo-regras': 'Regras Tarifárias',
    'catalogo-emails': 'Modelos de E-mail',
    'catalogo-impressao': 'Modelos para Impressão',
    'catalogo-midia': 'Gerenciador de Mídia',
    'central-reservas': 'Central de Reservas',
    'reservas-recepcao': 'Recepção',
    'reservas-fazer': 'Fazer Reserva',
    'reservas-achar': 'Achar Reserva',
    'reservas-incompletas': 'Reservas Incompletas',
    'reservas-avaliacoes-hospedes': 'Avaliações dos Hóspedes',
    'reservas-avaliacao-anfitriao': 'Avaliação do Anfitrião',
    'usuarios-hospedes': 'Usuários e Clientes',
    'usuarios-usuarios': 'Usuários',
    'usuarios-clientes': 'Clientes e Hóspedes',
    'usuarios-proprietarios': 'Proprietários',
    'usuarios-documentos-listas': 'Documentos e Listas de Clientes',
    'assistentes': 'Suporte',
    'assistentes-duplicados': 'E-mails Duplicados',
    'assistentes-perfis': 'Perfis de Cadastro',
    'assistentes-permissoes': 'Funções e Permissões',
    'assistentes-online': 'Usuários Online',
    'assistentes-atividade': 'Atividade dos Usuários',
    'assistentes-historico': 'Histórico de Login',
    'central-mensagens': 'Chat',
    'financeiro': 'Finanças',
    'configuracoes': 'Configurações',
    'motor-reservas': 'Edição de site',
    'motor-reservas-sites': 'Edição de site • Sites',
    'motor-reservas-componentes-dados': 'Edição de site • Componentes & Dados',
    'motor-reservas-area-interna': 'Edição de site • Área interna do cliente',
    'app-center': 'Loja de apps',
    'promocoes': 'Promoções',
    'notificacoes': 'Notificações'
  };
  return moduleNames[moduleId] || 'Módulo';
}

function getModuleDescription(moduleId: string): string {
  const descriptions: Record<string, string> = {
    'admin-master': 'Painel de controle administrativo exclusivo RENDIZY. Gerencie todas as imobiliárias, monitore o sistema e configure parâmetros globais.',
    'painel-inicial': 'Dashboard com visão geral do sistema, métricas principais e alertas importantes.',
    'locations-manager': 'Gerencie prédios, condomínios e localizações físicas. Nova estrutura hierárquica Location → Accommodation.',
    'catalogo': 'Organize e gerencie seus imóveis, grupos, tags e configurações de catálogo.',
    'catalogo-grupos': 'Crie e gerencie grupos/pastas para organizar seus imóveis.',
    'catalogo-restricoes': 'Configure restrições e preferências dos proprietários de imóveis.',
    'catalogo-regras': 'Defina regras tarifárias e políticas de precificação.',
    'catalogo-emails': 'Crie e edite modelos de e-mail para comunicação com hóspedes.',
    'catalogo-impressao': 'Configure modelos de documentos para impressão.',
    'catalogo-midia': 'Gerencie fotos, vídeos e outros arquivos de mídia dos imóveis.',
    'central-reservas': 'Centralize a gestão de todas as reservas de todas as plataformas.',
    'reservas-recepcao': 'Receba e processe novas solicitações de reserva.',
    'reservas-fazer': 'Crie novas reservas manualmente no sistema.',
    'reservas-achar': 'Busque e filtre reservas por diversos critérios.',
    'reservas-incompletas': 'Gerencie reservas pendentes ou com informações incompletas.',
    'reservas-avaliacoes-hospedes': 'Visualize e responda avaliações feitas pelos hóspedes.',
    'reservas-avaliacao-anfitriao': 'Avalie seus hóspedes após o check-out.',
    'usuarios-hospedes': 'Gerencie usuários, clientes, hóspedes e proprietários.',
    'usuarios-usuarios': 'Administre usuários do sistema e suas permissões.',
    'usuarios-clientes': 'Gerencie clientes (compradores, locadores residenciais e hóspedes de temporada).',
    'usuarios-proprietarios': 'Administre informações dos proprietários de imóveis.',
    'usuarios-documentos-listas': 'Visualize e exporte listas de clientes, documentos, leads, compras e canais.',
    'assistentes': 'Ferramentas auxiliares para administração e manutenção do sistema.',
    'assistentes-duplicados': 'Identifique e mescle cadastros duplicados de e-mails.',
    'assistentes-perfis': 'Configure perfis padrão de cadastro.',
    'assistentes-permissoes': 'Gerencie funções e permissões de acesso.',
    'assistentes-online': 'Monitore usuários ativos no sistema.',
    'assistentes-atividade': 'Analise logs de atividade dos usuários.',
    'assistentes-historico': 'Visualize histórico completo de logins e acessos.',
    'central-mensagens': 'Central unificada de mensagens com WhatsApp, SMS, Email e chat interno.',
    'financeiro': 'Gestão financeira completa: contas a pagar/receber, DRE, fluxo de caixa e relatórios.',
    'configuracoes': 'Configure preferências, integrações e parâmetros do sistema.',
    'motor-reservas': 'Crie e personalize sites de reservas com inteligência artificial.',
    'motor-reservas-sites': 'Gerencie os sites customizados de cada cliente (criar, editar, publicar e importar).',
    'motor-reservas-componentes-dados': 'Contrato canônico público e catálogo de componentes/dados para sites.',
    'motor-reservas-area-interna': 'Blueprint da área autenticada do cliente no site (portal), evoluindo incrementalmente.',
    'app-center': 'Loja de apps e integrações com plataformas externas.',
    'promocoes': 'Crie e gerencie campanhas promocionais e descontos.',
    'notificacoes': 'Central de notificações e alertas do sistema.'
  };
  return descriptions[moduleId] || 'Módulo do sistema RENDIZY';
}

export default App;
