/**
 * RENDIZY - Settings Manager Component
 * 
 * Interface para gerenciar configurações em dois níveis:
 * - Global: Configurações da organização (aplicadas a todos os listings)
 * - Individual: Override por listing (sobrescreve o global)
 * 
 * @version 1.0.84
 * @date 2025-10-29
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Building2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Ban,
  Clock,
  DollarSign,
  Calendar,
  Home,
  MessageSquare,
  MessageCircle,
  FileText,
  Filter,
  Phone,
  QrCode,
  Link2,
  Smartphone,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Copy,
  Bot,
  Play,
  Pause,
  Activity,
  Database,
  FileSearch,
  Sparkles,
  Plus
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { channelsApi, OrganizationChannelConfig } from '../utils/chatApi';
import { aiAgentsApi } from '../utils/api';
import { PropertyTypesManager } from './PropertyTypesManager';
import { LocationsListingsSettings } from './LocationsListingsSettings';
import { LocationAmenitiesSettings } from './LocationAmenitiesSettings';
import { IntegrationsManager } from './IntegrationsManager';
import { DataReconciliationManager } from './DataReconciliationManager';
import { isOfflineMode } from '../utils/offlineConfig';
import { CurrencySettingsCard } from './settings/CurrencySettingsCard';
import { DiscountPackagesSettingsCard } from './settings/DiscountPackagesSettingsCard';

// ============================================================================
// TYPES
// ============================================================================

interface GlobalSettings {
  id: string;
  organization_id: string;
  cancellation_policy: any;
  checkin_checkout: any;
  minimum_nights: any;
  advance_booking: any;
  house_rules: any;
  communication: any;
  created_at: string;
  updated_at: string;
}

interface ListingSettings {
  id: string;
  listing_id: string;
  organization_id: string;
  overrides: {
    cancellation_policy: boolean;
    checkin_checkout: boolean;
    minimum_nights: boolean;
    advance_booking: boolean;
    house_rules: boolean;
    communication: boolean;
  };
  cancellation_policy?: any;
  checkin_checkout?: any;
  minimum_nights?: any;
  advance_booking?: any;
  house_rules?: any;
  communication?: any;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SettingsManager({
  organizationId,
  listingId,
  mode = 'global'
}: {
  organizationId?: string;
  listingId?: string;
  mode?: 'global' | 'individual';
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [hasLoadedGlobalSettings, setHasLoadedGlobalSettings] = useState(false);
  const [listingSettings, setListingSettings] = useState<ListingSettings | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['cancellation_policy']));

  useEffect(() => {
    loadSettings();
  }, [organizationId, listingId, mode]);

  const getFunctionHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('rendizy-token');
    return {
      apikey: publicAnonKey,
      Authorization: `Bearer ${publicAnonKey}`,
      ...(token ? { 'X-Auth-Token': token } : {})
    };
  };

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadSettings = async () => {
    setLoading(true);
    try {
      // ⚠️ Evitar chamadas com organizationId indefinido
      if (mode === 'global' && (!organizationId || organizationId === 'undefined')) {
        console.warn('[SettingsManager] organizationId não definido, pulando carregamento');
        return;
      }

      if (mode === 'global') {
        // Carregar configurações globais
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/global`,
          {
            headers: getFunctionHeaders()
          }
        );
        const data = await response.json();
        if (!response.ok) {
          console.error('[SettingsManager] Falha ao carregar settings global:', response.status, data);
          setHasLoadedGlobalSettings(false);
          return;
        }
        if (data.success) {
          setGlobalSettings(data.data);
          setHasLoadedGlobalSettings(true);
        } else {
          setHasLoadedGlobalSettings(false);
        }
      } else if (mode === 'individual' && listingId) {
        // Carregar configurações do listing (efetivas)
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/settings`,
          {
            headers: getFunctionHeaders()
          }
        );
        const data = await response.json();
        if (data.success) {
          setEffectiveSettings(data.data.effective);
          setListingSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
      setHasLoadedGlobalSettings(false);
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalSettings = async () => {
    if (!globalSettings) return;

    setSaving(true);
    try {
      if (!organizationId || organizationId === 'undefined') {
        toast.error('Organização inválida (organizationId indefinido)');
        return;
      }

      // Evita enviar um objeto parcial (ex.: quando ainda não carregou do backend e estamos em modo "rascunho" local)
      // ⚠️ `id` pode ser nulo no primeiro save (a linha ainda não existe no banco)
      if (!hasLoadedGlobalSettings || !globalSettings.organization_id) {
        toast.error('Configurações globais ainda não carregaram; não é possível salvar agora');
        return;
      }

      const payload = { ...(globalSettings as any) };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/global`,
        {
          method: 'PUT',
          headers: {
            ...getFunctionHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Configurações salvas com sucesso!');
        setGlobalSettings(data.data);
      } else {
        toast.error(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const saveListingSettings = async () => {
    if (!listingSettings || !listingId) return;

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/settings`,
        {
          method: 'PUT',
          headers: {
            ...getFunctionHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(listingSettings)
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Configurações salvas!');
        loadSettings(); // Recarregar
      } else {
        toast.error(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Error saving listing settings:', error);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const resetToGlobal = async () => {
    if (!listingId || !confirm('Deseja realmente resetar para configurações globais?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/settings/reset`,
        {
          method: 'POST',
          headers: getFunctionHeaders()
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Resetado com sucesso!');
        loadSettings();
      }
    } catch (error) {
      console.error('Error resetting:', error);
      toast.error('Erro ao resetar');
    } finally {
      setLoading(false);
    }
  };

  const toggleOverride = async (section: string, enabled: boolean) => {
    if (!listingId) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/settings/toggle-override`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ section, enabled })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Override ${enabled ? 'ativado' : 'desativado'}`);
        loadSettings();
      }
    } catch (error) {
      console.error('Error toggling override:', error);
      toast.error('Erro ao alternar override');
    }
  };


  // ============================================================================
  // HELPERS
  // ============================================================================

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'cancellation_policy':
        return Ban;
      case 'checkin_checkout':
        return Clock;
      case 'minimum_nights':
        return Calendar;
      case 'advance_booking':
        return Calendar;
      case 'house_rules':
        return Home;
      case 'communication':
        return MessageSquare;
      default:
        return Settings;
    }
  };

  const getSectionName = (section: string) => {
    switch (section) {
      case 'cancellation_policy':
        return 'Política de Cancelamento';
      case 'checkin_checkout':
        return 'Check-in / Check-out';
      case 'minimum_nights':
        return 'Estadia mínima';
      case 'advance_booking':
        return 'Antecedência para Reserva';
      case 'house_rules':
        return 'Regras da Casa';
      case 'communication':
        return 'Comunicação';
      default:
        return section;
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderCancellationPolicy = (settings: any, isGlobal: boolean) => {
    const data = settings?.cancellation_policy;
    if (!data) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Ativar Política de Cancelamento</Label>
          <Switch
            checked={data.enabled}
            onCheckedChange={(checked) => {
              if (isGlobal) {
                setGlobalSettings({
                  ...globalSettings!,
                  cancellation_policy: { ...data, enabled: checked }
                });
              }
            }}
          />
        </div>

        {data.enabled && (
          <>
            <div>
              <Label>Tipo de Política</Label>
              <Select
                value={data.type}
                onValueChange={(value) => {
                  if (isGlobal) {
                    setGlobalSettings({
                      ...globalSettings!,
                      cancellation_policy: { ...data, type: value }
                    });
                  }
                }}
              >
                <SelectTrigger className="mt-1 bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="flexible">Flexível</SelectItem>
                  <SelectItem value="moderate">Moderada</SelectItem>
                  <SelectItem value="strict">Rígida</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Reembolso 7+ dias</Label>
                <Input
                  type="number"
                  value={data.refund_percentage_7days}
                  onChange={(e) => {
                    if (isGlobal) {
                      setGlobalSettings({
                        ...globalSettings!,
                        cancellation_policy: {
                          ...data,
                          refund_percentage_7days: parseInt(e.target.value)
                        }
                      });
                    }
                  }}
                  className="mt-1 bg-input border-border"
                  suffix="%"
                />
              </div>
              <div>
                <Label className="text-xs">Reembolso 3-6 dias</Label>
                <Input
                  type="number"
                  value={data.refund_percentage_3days}
                  onChange={(e) => {
                    if (isGlobal) {
                      setGlobalSettings({
                        ...globalSettings!,
                        cancellation_policy: {
                          ...data,
                          refund_percentage_3days: parseInt(e.target.value)
                        }
                      });
                    }
                  }}
                  className="mt-1 bg-input border-border"
                />
              </div>
              <div>
                <Label className="text-xs">Reembolso 1-2 dias</Label>
                <Input
                  type="number"
                  value={data.refund_percentage_1day}
                  onChange={(e) => {
                    if (isGlobal) {
                      setGlobalSettings({
                        ...globalSettings!,
                        cancellation_policy: {
                          ...data,
                          refund_percentage_1day: parseInt(e.target.value)
                        }
                      });
                    }
                  }}
                  className="mt-1 bg-input border-border"
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderCheckinCheckout = (settings: any, isGlobal: boolean) => {
    const data = settings?.checkin_checkout;
    if (!data) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Ativar Horários de Check-in/out</Label>
          <Switch checked={data.enabled} />
        </div>

        {data.enabled && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Check-in de</Label>
              <Input
                type="time"
                value={data.checkin_time_from}
                className="mt-1 bg-input border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Check-in até</Label>
              <Input
                type="time"
                value={data.checkin_time_to}
                className="mt-1 bg-input border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Check-out</Label>
              <Input
                type="time"
                value={data.checkout_time}
                className="mt-1 bg-input border-border"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMinimumNights = (settings: any, isGlobal: boolean) => {
    const data =
      settings?.minimum_nights ??
      ({
        enabled: false,
        default_min_nights: 1,
        weekend_min_nights: undefined,
        holiday_min_nights: undefined,
        high_season_min_nights: undefined
      } as any);

    const update = (patch: any) => {
      if (!isGlobal || !globalSettings) return;
      setGlobalSettings({
        ...globalSettings,
        minimum_nights: {
          ...data,
          ...patch
        }
      });
    };

    const parsePositiveInt = (value: string, fallback: number) => {
      const n = parseInt(value, 10);
      return Number.isFinite(n) && n >= 1 ? n : fallback;
    };

    const parseOptionalPositiveInt = (value: string) => {
      const n = parseInt(value, 10);
      return Number.isFinite(n) && n >= 1 ? n : undefined;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Estadia mínima (mínimo de noites)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Defina o número mínimo de noites para confirmar uma reserva.
            </p>
          </div>
          <Switch
            checked={!!data.enabled}
            onCheckedChange={(checked) => update({ enabled: checked })}
            disabled={!isGlobal}
          />
        </div>

        {data.enabled && (
          <>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-foreground mb-1">Informação</p>
                  <p className="text-muted-foreground">
                    Esta regra afeta reservas (criação/validação) e pode impactar disponibilidade.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Qual a estadia mínima para uma reserva?</Label>
              <div className="mt-1 flex items-stretch max-w-md">
                <div className="px-3 flex items-center rounded-l-md border border-border bg-muted text-xs text-muted-foreground">
                  Min
                </div>
                <Input
                  type="number"
                  value={data.default_min_nights ?? 1}
                  onChange={(e) => update({ default_min_nights: parsePositiveInt(e.target.value, 1) })}
                  className="rounded-none border-l-0 border-r-0 bg-input border-border"
                  disabled={!isGlobal}
                  min={1}
                />
                <div className="px-3 flex items-center rounded-r-md border border-border bg-muted text-xs text-muted-foreground">
                  noites
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Fim de semana (opcional)</Label>
                <Input
                  type="number"
                  value={data.weekend_min_nights ?? ''}
                  onChange={(e) => update({ weekend_min_nights: parseOptionalPositiveInt(e.target.value) })}
                  className="mt-1 bg-input border-border"
                  placeholder="Ex.: 2"
                  disabled={!isGlobal}
                  min={1}
                />
              </div>
              <div>
                <Label className="text-xs">Feriados (opcional)</Label>
                <Input
                  type="number"
                  value={data.holiday_min_nights ?? ''}
                  onChange={(e) => update({ holiday_min_nights: parseOptionalPositiveInt(e.target.value) })}
                  className="mt-1 bg-input border-border"
                  placeholder="Ex.: 3"
                  disabled={!isGlobal}
                  min={1}
                />
              </div>
              <div>
                <Label className="text-xs">Alta temporada (opcional)</Label>
                <Input
                  type="number"
                  value={data.high_season_min_nights ?? ''}
                  onChange={(e) => update({ high_season_min_nights: parseOptionalPositiveInt(e.target.value) })}
                  className="mt-1 bg-input border-border"
                  placeholder="Ex.: 5"
                  disabled={!isGlobal}
                  min={1}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderSection = (section: string, settings: any, isGlobal: boolean) => {
    const SectionIcon = getSectionIcon(section);
    const isExpanded = expandedSections.has(section);
    const hasOverride = mode === 'individual' && listingSettings?.overrides[section];

    return (
      <Card key={section} className="bg-card border-border">
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection(section)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SectionIcon className="h-5 w-5 text-blue-400" />
              <div>
                <CardTitle className="text-card-foreground text-base">{getSectionName(section)}</CardTitle>
                {mode === 'individual' && (
                  <Badge
                    className={
                      hasOverride
                        ? 'bg-orange-500/10 text-orange-400 mt-1'
                        : 'bg-gray-500/10 text-gray-400 mt-1'
                    }
                  >
                    {hasOverride ? '⚡ Override Ativo' : '🌐 Usando Global'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'individual' && (
                <Switch
                  checked={hasOverride}
                  onCheckedChange={(checked) => toggleOverride(section, checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-4 border-t border-border">
            {section === 'cancellation_policy' && renderCancellationPolicy(settings, isGlobal)}
            {section === 'checkin_checkout' && renderCheckinCheckout(settings, isGlobal)}
            {section === 'minimum_nights' && renderMinimumNights(settings, isGlobal)}
            {/* Outros renders aqui */}
            {!['cancellation_policy', 'checkin_checkout', 'minimum_nights'].includes(section) && (
              <p className="text-muted-foreground text-sm">Configurações de {getSectionName(section)}</p>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading && !globalSettings && !effectiveSettings) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  const sections = [
    'cancellation_policy',
    'checkin_checkout',
    'minimum_nights',
    'advance_booking',
    'house_rules',
    'communication'
  ];

  const reservationSections = [
    'cancellation_policy',
    'checkin_checkout',
    'minimum_nights',
    'advance_booking',
    'house_rules',
    'communication'
  ];

  const currentSettings = mode === 'global' ? globalSettings : effectiveSettings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-foreground flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-400" />
            Configurações
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as configurações do sistema
          </p>
        </div>
      </div>

      {/* Tabs - Organizadas por temas */}
      <Tabs defaultValue="gerais" className="w-full">
        <div className="border-b border-border bg-muted">
          <TabsList className="w-full max-w-full overflow-x-hidden flex-col sm:flex-row items-stretch justify-start bg-transparent rounded-none h-auto p-0">
            <TabsTrigger
              value="anuncios-ultimate"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <Home className="h-4 w-4 mr-2" />
              Anúncios Ultimate
            </TabsTrigger>
            <TabsTrigger
              value="reservas"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Reservas
            </TabsTrigger>
            <TabsTrigger
              value="precificacao"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Precificação
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="integracoes"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <Zap className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger
              value="agentes-ia"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <Bot className="h-4 w-4 mr-2" />
              Agentes IA
            </TabsTrigger>
            <TabsTrigger
              value="gerais"
              className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-3 sm:px-6 py-2.5 sm:py-3"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações gerais
            </TabsTrigger>
          </TabsList>
        </div>

        {(() => {
          const renderSettingsEditor = (editorSections: string[]) => (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl text-foreground flex items-center gap-3">
                    {mode === 'global' ? (
                      <>
                        <Globe className="h-5 w-5 text-blue-400" />
                        Configurações Globais
                      </>
                    ) : (
                      <>
                        <Building2 className="h-5 w-5 text-orange-400" />
                        Configurações Individuais
                      </>
                    )}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {mode === 'global'
                      ? 'Aplicadas a todos os listings da organização'
                      : 'Override das configurações globais para este listing'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {mode === 'individual' && (
                    <Button variant="outline" onClick={resetToGlobal} disabled={loading}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resetar para Global
                    </Button>
                  )}
                  <Button
                    onClick={mode === 'global' ? saveGlobalSettings : saveListingSettings}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Save className="h-4 w-4 mr-2" />Salvar</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {editorSections.map((section) => renderSection(section, currentSettings, mode === 'global'))}
              </div>
            </div>
          );

          return (
            <>
              {/* Anúncios Ultimate */}
              <TabsContent value="anuncios-ultimate" className="mt-6">
                <Tabs defaultValue="locations-listings" className="w-full">
                  <div className="border-b border-border bg-muted/50">
                    <TabsList className="w-full max-w-full overflow-x-hidden flex-col sm:flex-row items-stretch justify-start bg-transparent rounded-none h-auto p-0">
                      <TabsTrigger
                        value="locations-listings"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <Home className="h-4 w-4 mr-2" />
                        Locais e Anúncios
                      </TabsTrigger>
                      <TabsTrigger
                        value="property-types"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Tipos de Imóveis
                      </TabsTrigger>
                      <TabsTrigger
                        value="location-amenities"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Amenidades de Locais
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="locations-listings" className="mt-6">
                    <LocationsListingsSettings />
                  </TabsContent>
                  <TabsContent value="property-types" className="mt-6">
                    <PropertyTypesManager />
                  </TabsContent>
                  <TabsContent value="location-amenities" className="mt-6">
                    <LocationAmenitiesSettings />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Reservas */}
              <TabsContent value="reservas" className="mt-6">
                <Tabs defaultValue="reservation-general" className="w-full">
                  <div className="border-b border-border bg-muted/50">
                    <TabsList className="w-full max-w-full overflow-x-hidden flex-col sm:flex-row items-stretch justify-start bg-transparent rounded-none h-auto p-0">
                      <TabsTrigger
                        value="reservation-general"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações Gerais
                      </TabsTrigger>
                      <TabsTrigger
                        value="pending-reservations"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Reservas Temporárias
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="reservation-general" className="mt-6">
                    {renderSettingsEditor(reservationSections)}
                  </TabsContent>
                  <TabsContent value="pending-reservations" className="mt-6">
                    <PendingReservationSettingsCard organizationId={organizationId} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Precificação */}
              <TabsContent value="precificacao" className="mt-6">
                <div className="space-y-6">
                  <DiscountPackagesSettingsCard organizationId={organizationId} />
                  <CurrencySettingsCard organizationId={organizationId} />
                </div>
              </TabsContent>

              {/* Chat */}
              <TabsContent value="chat" className="mt-6">
                <ChatSettingsTab organizationId={organizationId} />
              </TabsContent>

              {/* Integrações (inclui Conciliação de Dados) */}
              <TabsContent value="integracoes" className="mt-6">
                <Tabs defaultValue="integrations" className="w-full">
                  <div className="border-b border-border bg-muted/50">
                    <TabsList className="w-full max-w-full overflow-x-hidden flex-col sm:flex-row items-stretch justify-start bg-transparent rounded-none h-auto p-0">
                      <TabsTrigger
                        value="integrations"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Integrações
                      </TabsTrigger>
                      <TabsTrigger
                        value="data-reconciliation"
                        className="w-full sm:w-auto min-w-0 justify-start whitespace-normal sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 px-3 sm:px-6 py-2 sm:py-2.5 text-sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Conciliação de Dados
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="integrations" className="mt-6">
                    <IntegrationsManager />
                  </TabsContent>
                  <TabsContent value="data-reconciliation" className="mt-6">
                    <DataReconciliationManager />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Agentes de IA */}
              <TabsContent value="agentes-ia" className="mt-6">
                <AIAgentsSettings />
              </TabsContent>

              {/* Configurações gerais ("caixa de entrada" temporária) */}
              <TabsContent value="gerais" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-card-foreground">Configurações gerais</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Use esta seção como destino temporário para configurações que ainda não se encaixam
                      em Anúncios Ultimate, Reservas, Chat ou Integrações.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Sem itens por enquanto.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          );
        })()}
      </Tabs>
    </div>
  );
}

// ============================================================================
// CHAT SETTINGS TAB COMPONENT
// ============================================================================

function ChatSettingsTab({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Configurações gerais
    auto_response: {
      enabled: false,
      message: 'Obrigado pela sua mensagem! Em breve entraremos em contato.',
      delay_minutes: 5
    },
    // Notificações
    notifications: {
      email_enabled: true,
      sound_enabled: true,
      desktop_enabled: true,
      unread_badge: true
    },
    // Comportamento
    behavior: {
      auto_mark_read: false,
      auto_archive_resolved: true,
      show_typing_indicator: true,
      max_conversation_age_days: 90
    },
    // Templates
    templates: {
      suggest_on_type: true,
      show_shortcuts: true,
      auto_fill_guest_data: true
    },
    // Filtros padrão
    default_filters: {
      show_unread_first: true,
      show_active_first: true,
      hide_resolved: false,
      max_results: 50
    }
  });

  const saveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Implementar API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações do Chat salvas com sucesso!');
    } catch (error) {
      console.error('Error saving chat settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl text-foreground flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Configurações do Chat
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Personalize o comportamento e preferências do módulo de Chat
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <><Save className="h-4 w-4 mr-2" />Salvar</>
          )}
        </Button>
      </div>

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* Resposta Automática */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              Resposta Automática
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure mensagens automáticas para novas conversas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Ativar Resposta Automática</Label>
              <Switch
                checked={settings.auto_response.enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    auto_response: { ...settings.auto_response, enabled: checked }
                  })
                }
              />
            </div>
            {settings.auto_response.enabled && (
              <>
                <div>
                  <Label className="text-foreground">Mensagem de Resposta</Label>
                  <Input
                    value={settings.auto_response.message}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        auto_response: { ...settings.auto_response, message: e.target.value }
                      })
                    }
                    className="mt-2 bg-input border-border text-foreground"
                    placeholder="Digite a mensagem automática..."
                  />
                </div>
                <div>
                  <Label className="text-foreground">Atraso (minutos)</Label>
                  <Input
                    type="number"
                    value={settings.auto_response.delay_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        auto_response: {
                          ...settings.auto_response,
                          delay_minutes: parseInt(e.target.value)
                        }
                      })
                    }
                    className="mt-2 bg-input border-border text-foreground"
                    min="0"
                    max="60"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Aguardar antes de enviar a resposta automática
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              Notificações
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure como você deseja receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Notificações por E-mail</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Receber novas mensagens por e-mail</p>
              </div>
              <Switch
                checked={settings.notifications.email_enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email_enabled: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Som de Notificação</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Reproduzir som ao receber mensagens</p>
              </div>
              <Switch
                checked={settings.notifications.sound_enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, sound_enabled: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Notificações Desktop</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Mostrar notificações do navegador</p>
              </div>
              <Switch
                checked={settings.notifications.desktop_enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, desktop_enabled: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Badge de Não Lidas</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Mostrar contador no menu</p>
              </div>
              <Switch
                checked={settings.notifications.unread_badge}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, unread_badge: checked }
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Comportamento */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-400" />
              Comportamento
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ajuste como o Chat funciona
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Marcar como Lida Automaticamente</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Ao abrir uma conversa</p>
              </div>
              <Switch
                checked={settings.behavior.auto_mark_read}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    behavior: { ...settings.behavior, auto_mark_read: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Arquivar Resolvidas Automaticamente</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Mover para arquivo após resolver</p>
              </div>
              <Switch
                checked={settings.behavior.auto_archive_resolved}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    behavior: { ...settings.behavior, auto_archive_resolved: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Indicador de Digitação</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Mostrar quando está digitando</p>
              </div>
              <Switch
                checked={settings.behavior.show_typing_indicator}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    behavior: { ...settings.behavior, show_typing_indicator: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div>
              <Label className="text-foreground">Idade Máxima de Conversas (dias)</Label>
              <Input
                type="number"
                value={settings.behavior.max_conversation_age_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    behavior: {
                      ...settings.behavior,
                      max_conversation_age_days: parseInt(e.target.value)
                    }
                  })
                }
                className="mt-2 bg-input border-border text-foreground"
                min="30"
                max="365"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Conversas mais antigas serão arquivadas automaticamente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Templates e Atalhos */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              Templates e Atalhos
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure o comportamento dos templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Sugerir Templates ao Digitar</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Mostrar sugestões enquanto escreve</p>
              </div>
              <Switch
                checked={settings.templates.suggest_on_type}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    templates: { ...settings.templates, suggest_on_type: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Atalho "/" para Templates</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Digite "/" para buscar templates</p>
              </div>
              <Switch
                checked={settings.templates.show_shortcuts}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    templates: { ...settings.templates, show_shortcuts: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Auto-preencher Dados do Hóspede</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Substituir variáveis automaticamente</p>
              </div>
              <Switch
                checked={settings.templates.auto_fill_guest_data}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    templates: { ...settings.templates, auto_fill_guest_data: checked }
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Filtros Padrão */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-400" />
              Filtros Padrão
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure os filtros iniciais ao abrir o Chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Não Lidas Primeiro</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Priorizar conversas não lidas</p>
              </div>
              <Switch
                checked={settings.default_filters.show_unread_first}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    default_filters: { ...settings.default_filters, show_unread_first: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-[#363945]" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-neutral-300">Ativas Primeiro</Label>
                <p className="text-xs text-neutral-500 mt-0.5">Priorizar conversas ativas</p>
              </div>
              <Switch
                checked={settings.default_filters.show_active_first}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    default_filters: { ...settings.default_filters, show_active_first: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-[#363945]" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-neutral-300">Ocultar Resolvidas</Label>
                <p className="text-xs text-neutral-500 mt-0.5">Não mostrar conversas resolvidas</p>
              </div>
              <Switch
                checked={settings.default_filters.hide_resolved}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    default_filters: { ...settings.default_filters, hide_resolved: checked }
                  })
                }
              />
            </div>
            <Separator className="bg-[#363945]" />
            <div>
              <Label className="text-neutral-300">Máximo de Resultados</Label>
              <Select
                value={settings.default_filters.max_results.toString()}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    default_filters: {
                      ...settings.default_filters,
                      max_results: parseInt(value)
                    }
                  })
                }
              >
                <SelectTrigger className="mt-2 bg-[#1e2029] border-[#363945] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                  <SelectItem value="25">25 conversas</SelectItem>
                  <SelectItem value="50">50 conversas</SelectItem>
                  <SelectItem value="100">100 conversas</SelectItem>
                  <SelectItem value="200">200 conversas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-500 mt-1">
                Número máximo de conversas a exibir
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// 🆕 CHANNELS COMMUNICATION SETTINGS COMPONENT (v1.0.101)
// ============================================================================

/**
 * ARQUITETURA DE PERSISTÊNCIA:
 * 
 * Frontend → channelsApi → Backend → ChannelConfigRepository → organization_channel_config (SQL)
 * 
 * ✅ Persistência REAL no banco de dados SQL (Supabase)
 * ✅ RLS (Row Level Security) por organization_id
 * ✅ UPSERT atômico para evitar race conditions
 * ❌ NÃO usa localStorage (anti-pattern para dados críticos)
 * 
 * @see docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md
 * @see supabase/functions/rendizy-server/repositories/channel-config-repository.ts
 */
function ChannelsCommunicationSettings({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<OrganizationChannelConfig | null>(null);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showSMSConfig, setShowSMSConfig] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({
    api_url: '',
    instance_name: '',
    api_key: '',
    instance_token: ''
  });
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Webhook URL para Evolution API
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook`;

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  /**
   * Carrega configuração do BACKEND (SQL)
   * ✅ Persistência real - não usa localStorage
   */
  const loadConfig = async () => {
    setLoading(true);
    setLastError(null);
    
    // Em modo offline, não tenta carregar
    if (isOfflineMode()) {
      console.log('📴 [WhatsApp] Modo offline - usando estado vazio');
      setLoading(false);
      return;
    }
    
    try {
      console.log('📡 [WhatsApp] Carregando configuração do backend...');
      const result = await channelsApi.getConfig(organizationId);
      
      if (result.success && result.data) {
        console.log('✅ [WhatsApp] Configuração carregada:', {
          has_whatsapp: !!result.data.whatsapp,
          enabled: result.data.whatsapp?.enabled,
          api_url: result.data.whatsapp?.api_url ? '***' : 'vazio',
          connected: result.data.whatsapp?.connected
        });
        
        setConfig(result.data);
        
        // Preencher formulário com dados do banco
        if (result.data.whatsapp) {
          setWhatsappForm({
            api_url: result.data.whatsapp.api_url || '',
            instance_name: result.data.whatsapp.instance_name || '',
            api_key: result.data.whatsapp.api_key || '',
            instance_token: result.data.whatsapp.instance_token || ''
          });
        }
      } else {
        console.log('⚠️ [WhatsApp] Nenhuma configuração encontrada (primeira vez)');
        // Configuração padrão para nova organização
        setConfig(null);
      }
    } catch (error: any) {
      console.error('❌ [WhatsApp] Erro ao carregar configuração:', error);
      setLastError(error.message || 'Erro ao carregar configuração');
      // Não silencia o erro - mostra para o usuário
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva configuração no BACKEND (SQL)
   * ✅ Persistência atômica via UPSERT
   */
  const saveConfig = async (newWhatsappConfig: Partial<OrganizationChannelConfig['whatsapp']>) => {
    setSaving(true);
    setLastError(null);
    
    try {
      console.log('💾 [WhatsApp] Salvando configuração no backend...', {
        api_url: newWhatsappConfig.api_url ? '***' : 'vazio',
        instance_name: newWhatsappConfig.instance_name || 'vazio',
        enabled: newWhatsappConfig.enabled
      });
      
      const result = await channelsApi.updateConfig(organizationId, {
        whatsapp: {
          ...config?.whatsapp,
          ...newWhatsappConfig,
          api_url: newWhatsappConfig.api_url || whatsappForm.api_url,
          instance_name: newWhatsappConfig.instance_name || whatsappForm.instance_name,
          api_key: newWhatsappConfig.api_key || whatsappForm.api_key,
          instance_token: newWhatsappConfig.instance_token || whatsappForm.instance_token,
        } as any
      });
      
      if (result.success && result.data) {
        console.log('✅ [WhatsApp] Configuração salva com sucesso');
        setConfig(result.data);
        return true;
      } else {
        const errorMsg = result.error || 'Erro ao salvar configuração';
        console.error('❌ [WhatsApp] Erro ao salvar:', errorMsg);
        setLastError(errorMsg);
        toast.error(errorMsg);
        return false;
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Erro ao salvar configuração';
      console.error('❌ [WhatsApp] Exceção ao salvar:', error);
      setLastError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('URL do webhook copiada!');
    } catch (err) {
      // Fallback: criar textarea temporário
      const textArea = document.createElement('textarea');
      textArea.value = webhookUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('URL do webhook copiada!');
      } catch (e) {
        toast.error('Não foi possível copiar. Copie manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setConnectingWhatsApp(true);
    setLastError(null);
    
    try {
      // 1. Primeiro salva as credenciais no banco
      console.log('💾 [WhatsApp] Salvando credenciais antes de conectar...');
      const saveSuccess = await saveConfig({
        enabled: true,
        api_url: whatsappForm.api_url,
        instance_name: whatsappForm.instance_name,
        api_key: whatsappForm.api_key,
        instance_token: whatsappForm.instance_token,
        connection_status: 'connecting'
      });
      
      if (!saveSuccess) {
        toast.error('Erro ao salvar credenciais');
        return;
      }
      
      // 2. Agora tenta conectar
      console.log('🔌 [WhatsApp] Conectando...');
      const result = await channelsApi.evolution.connect(organizationId, {
        api_url: whatsappForm.api_url,
        instance_name: whatsappForm.instance_name,
        api_key: whatsappForm.api_key
      });
      
      if (result.success && result.data) {
        setQrCode(result.data.qr_code);
        toast.success('QR Code gerado! Escaneie com o WhatsApp');
        
        // Atualiza status no banco
        await saveConfig({ connection_status: 'connecting' });
        
        // Reload config
        await loadConfig();
      } else {
        const errorMsg = result.error || 'Erro ao conectar';
        console.error('❌ [WhatsApp] Erro ao conectar:', errorMsg);
        setLastError(errorMsg);
        
        // Salva o erro no banco
        await saveConfig({ 
          connection_status: 'error',
          error_message: errorMsg
        });
        
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Error connecting WhatsApp:', error);
      const errorMsg = error.message || 'Erro ao conectar WhatsApp';
      setLastError(errorMsg);
      
      // Salva o erro no banco
      await saveConfig({ 
        connection_status: 'error',
        error_message: errorMsg
      });
      
      toast.error(errorMsg);
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const result = await channelsApi.evolution.disconnect(organizationId);
      if (result.success) {
        toast.success('WhatsApp desconectado');
        setQrCode(null);
        
        // Atualiza status no banco
        await saveConfig({
          connected: false,
          connection_status: 'disconnected',
          phone_number: undefined,
          qr_code: undefined
        });
        
        await loadConfig();
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Erro ao desconectar WhatsApp');
    }
  };

  /**
   * Habilita/Desabilita WhatsApp
   * ✅ Salva no banco SQL via UPSERT atômico
   */
  const handleToggleWhatsApp = async (enabled: boolean) => {
    try {
      console.log(`🔄 [WhatsApp] ${enabled ? 'Habilitando' : 'Desabilitando'}...`);
      
      const success = await saveConfig({
        enabled,
        api_url: whatsappForm.api_url,
        instance_name: whatsappForm.instance_name,
        api_key: whatsappForm.api_key,
        instance_token: whatsappForm.instance_token,
        connected: config?.whatsapp?.connected || false,
        connection_status: config?.whatsapp?.connection_status || 'disconnected'
      });
      
      if (success) {
        toast.success(enabled ? 'WhatsApp ativado' : 'WhatsApp desativado');
        await loadConfig();
      }
    } catch (error) {
      console.error('Error toggling WhatsApp:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  /**
   * Salva formulário manualmente (botão "Salvar")
   * ✅ Salva no banco SQL via UPSERT atômico
   */
  const handleSaveForm = async () => {
    if (!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    const success = await saveConfig({
      enabled: true,
      api_url: whatsappForm.api_url,
      instance_name: whatsappForm.instance_name,
      api_key: whatsappForm.api_key,
      instance_token: whatsappForm.instance_token
    });
    
    if (success) {
      toast.success('Configurações salvas no banco de dados!');
    }
  };

  const handleToggleSMS = async (enabled: boolean) => {
    try {
      const result = await channelsApi.updateConfig(organizationId, {
        sms: {
          ...config?.sms,
          enabled,
          account_sid: config?.sms?.account_sid || '',
          auth_token: config?.sms?.auth_token || '',
          phone_number: config?.sms?.phone_number || ''
        }
      });
      
      if (result.success) {
        setConfig(result.data);
        toast.success(enabled ? 'SMS ativado' : 'SMS desativado');
      }
    } catch (error) {
      console.error('Error toggling SMS:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* WhatsApp Integration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-card-foreground text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp (Evolution API)
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Conecte o WhatsApp para receber e enviar mensagens diretamente do RENDIZY
              </CardDescription>
            </div>
            <Switch
              checked={config?.whatsapp?.enabled || false}
              onCheckedChange={handleToggleWhatsApp}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status da Conexão */}
          {config?.whatsapp?.enabled && (
            <div className="p-4 rounded-lg bg-muted border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {config?.whatsapp?.connected ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-foreground">Conectado</p>
                        {config?.whatsapp?.phone_number && (
                          <p className="text-xs text-muted-foreground">
                            {config.whatsapp.phone_number}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-sm text-foreground">Desconectado</p>
                        <p className="text-xs text-muted-foreground">
                          Configure abaixo para conectar
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {config?.whatsapp?.connected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectWhatsApp}
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    Desconectar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Formulário de Configuração */}
          {config?.whatsapp?.enabled && !config?.whatsapp?.connected && (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground">URL da Evolution API</Label>
                  <Input
                    value={whatsappForm.api_url}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, api_url: e.target.value })}
                    placeholder="https://api.evolutionapi.com"
                    className="mt-2 bg-input border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL base da sua instância Evolution API
                  </p>
                </div>

                <div>
                  <Label className="text-foreground">Nome da Instância</Label>
                  <Input
                    value={whatsappForm.instance_name}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, instance_name: e.target.value })}
                    placeholder="rendizy-org-123"
                    className="mt-2 bg-input border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Identificador único da sua instância
                  </p>
                </div>

                <div>
                  <Label className="text-foreground">API Key</Label>
                  <Input
                    type="password"
                    value={whatsappForm.api_key}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, api_key: e.target.value })}
                    placeholder="sua-api-key-aqui"
                    className="mt-2 bg-input border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Chave de autenticação da Evolution API (Global API Key)
                  </p>
                </div>

                <div>
                  <Label className="text-foreground">Instance Token (opcional)</Label>
                  <Input
                    type="password"
                    value={whatsappForm.instance_token}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, instance_token: e.target.value })}
                    placeholder="token-da-instancia"
                    className="mt-2 bg-input border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Token específico da instância (gerado ao criar a instância no Evolution Manager)
                  </p>
                </div>

                <div>
                  <Label className="text-foreground">URL do Webhook</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={webhookUrl}
                      readOnly
                      className="bg-muted border-border text-foreground font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhook}
                      className="border-border"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure este webhook na Evolution API para receber mensagens
                  </p>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveForm}
                    disabled={saving || !whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key}
                    variant="outline"
                    className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-500/10"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Credenciais
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleConnectWhatsApp}
                    disabled={connectingWhatsApp || !whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {connectingWhatsApp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Gerar QR Code
                      </>
                    )}
                  </Button>
                </div>

                {/* Erro último */}
                {lastError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {lastError}
                    </p>
                  </div>
                )}
              </div>

              {/* QR Code Display */}
              {qrCode && (
                <div className="p-6 rounded-lg bg-muted border border-border text-center">
                  <QrCode className="h-8 w-8 mx-auto mb-3 text-green-500" />
                  <p className="text-sm text-foreground mb-4">
                    ✅ QR Code gerado! Escaneie com o WhatsApp
                  </p>
                  <div className="bg-white p-4 inline-block rounded-lg shadow-lg">
                    {qrCode.startsWith('data:image') ? (
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-64 h-64 object-contain"
                      />
                    ) : (
                      <div className="w-64 h-64 bg-white flex items-center justify-center p-2">
                        <div className="text-xs break-all font-mono bg-gray-100 p-4 rounded max-w-full">
                          {qrCode}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    📱 <strong>Como escanear:</strong><br />
                    Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectWhatsApp}
                    className="mt-4 border-green-500 text-green-500 hover:bg-green-500/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Novo QR Code
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Info quando habilitado mas não configurado */}
          {config?.whatsapp?.enabled && !whatsappForm.api_url && !config?.whatsapp?.connected && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-foreground mb-2">Como configurar:</p>
                  <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Configure uma instância Evolution API</li>
                    <li>Preencha os campos acima com suas credenciais</li>
                    <li>Configure o webhook na Evolution API</li>
                    <li>Clique em "Gerar QR Code" e escaneie com o WhatsApp</li>
                  </ol>
                  <p className="mt-3 text-xs">
                    <strong>Documentação:</strong>{' '}
                    <a
                      href="https://doc.evolution-api.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Evolution API Docs
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Integration (Twilio) */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-card-foreground text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                SMS (Twilio)
                <Badge variant="secondary" className="ml-2">Em breve</Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Envie notificações e mensagens via SMS
              </CardDescription>
            </div>
            <Switch
              checked={config?.sms?.enabled || false}
              onCheckedChange={handleToggleSMS}
              disabled
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted border border-border">
            <div className="flex gap-3">
              <Zap className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-foreground mb-1">Integração SMS (v1.0.103+)</p>
                <p className="text-muted-foreground">
                  A integração com Twilio para envio de SMS será implementada após a conclusão
                  da integração WhatsApp. Fique atento às próximas atualizações!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automações */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Automações
            <Badge variant="secondary" className="ml-2">Em breve</Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure mensagens automáticas baseadas em eventos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between opacity-50">
            <div>
              <Label className="text-foreground">Confirmação de Reserva</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviar mensagem automática ao criar reserva
              </p>
            </div>
            <Switch disabled />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between opacity-50">
            <div>
              <Label className="text-foreground">Lembrete de Check-in (24h)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviar lembrete 24h antes do check-in
              </p>
            </div>
            <Switch disabled />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between opacity-50">
            <div>
              <Label className="text-foreground">Solicitação de Avaliação</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pedir avaliação após check-out
              </p>
            </div>
            <Switch disabled />
          </div>
          
          <div className="mt-4 p-4 rounded-lg bg-muted border border-border">
            <p className="text-sm text-muted-foreground">
              Automações serão implementadas na <strong className="text-foreground">v1.0.104</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// PENDING RESERVATION SETTINGS CARD (Reservas Temporárias)
// Similar to Stays.net "Pré-reservas" feature
// ============================================================================

function PendingReservationSettingsCard({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    timeoutHours: 24,
    autoCancel: true,
    notifyGuest: true,
    notifyAdmin: true,
    reminderHours: 6
  });

  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem('supabaseAuthToken');
      const res = await fetch(
        `https://${projectId}.supabase.co/rest/v1/organizations?id=eq.${organizationId}&select=pending_reservation_enabled,pending_reservation_timeout_hours,pending_reservation_auto_cancel,pending_reservation_notify_guest,pending_reservation_notify_admin,pending_reservation_reminder_hours`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${authToken || publicAnonKey}`,
          }
        }
      );
      const data = await res.json();
      if (data && data[0]) {
        const org = data[0];
        setSettings({
          enabled: org.pending_reservation_enabled ?? true,
          timeoutHours: org.pending_reservation_timeout_hours ?? 24,
          autoCancel: org.pending_reservation_auto_cancel ?? true,
          notifyGuest: org.pending_reservation_notify_guest ?? true,
          notifyAdmin: org.pending_reservation_notify_admin ?? true,
          reminderHours: org.pending_reservation_reminder_hours ?? 6
        });
      }
    } catch (err) {
      console.error('Error loading pending reservation settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const authToken = localStorage.getItem('supabaseAuthToken');
      const res = await fetch(
        `https://${projectId}.supabase.co/rest/v1/organizations?id=eq.${organizationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${authToken || publicAnonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            pending_reservation_enabled: settings.enabled,
            pending_reservation_timeout_hours: settings.timeoutHours,
            pending_reservation_auto_cancel: settings.autoCancel,
            pending_reservation_notify_guest: settings.notifyGuest,
            pending_reservation_notify_admin: settings.notifyAdmin,
            pending_reservation_reminder_hours: settings.reminderHours
          })
        }
      );
      if (res.ok) {
        toast.success('Configurações de reservas temporárias salvas!');
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (err) {
      console.error('Error saving pending reservation settings:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl text-foreground flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-400" />
            Reservas Temporárias
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            Configure como funcionam as pré-reservas aguardando pagamento
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <><Save className="h-4 w-4 mr-2" />Salvar</>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-foreground mb-1 font-medium">Como funciona?</p>
              <p className="text-muted-foreground">
                Quando um cliente solicita uma reserva pelo site, ela fica em status <strong>"Pendente"</strong> bloqueando 
                o calendário. O cliente tem um tempo limite para finalizar o pagamento. Se não pagar dentro do prazo, 
                a reserva é automaticamente cancelada e as datas liberadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-blue-400" />
            Configuração Principal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Ativar Reservas Temporárias</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bloquear calendário enquanto aguarda pagamento
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          <Separator className="bg-border" />

          {/* Timeout */}
          <div className="space-y-2">
            <Label className="text-foreground">Tempo Limite para Pagamento</Label>
            <p className="text-xs text-muted-foreground">
              Após esse período, a reserva pendente será cancelada automaticamente
            </p>
            <Select
              value={String(settings.timeoutHours)}
              onValueChange={(v) => setSettings(prev => ({ ...prev, timeoutHours: Number(v) }))}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 horas</SelectItem>
                <SelectItem value="12">12 horas</SelectItem>
                <SelectItem value="24">24 horas</SelectItem>
                <SelectItem value="48">48 horas (2 dias)</SelectItem>
                <SelectItem value="72">72 horas (3 dias)</SelectItem>
                <SelectItem value="168">168 horas (7 dias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* Auto Cancel */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Cancelamento Automático</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cancelar reservas pendentes que excedem o tempo limite
              </p>
            </div>
            <Switch
              checked={settings.autoCancel}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoCancel: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-400" />
            Notificações
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure os alertas para reservas temporárias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reminder Hours */}
          <div className="space-y-2">
            <Label className="text-foreground">Lembrete Antes de Expirar</Label>
            <p className="text-xs text-muted-foreground">
              Enviar lembrete de pagamento X horas antes de expirar
            </p>
            <Select
              value={String(settings.reminderHours)}
              onValueChange={(v) => setSettings(prev => ({ ...prev, reminderHours: Number(v) }))}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hora antes</SelectItem>
                <SelectItem value="2">2 horas antes</SelectItem>
                <SelectItem value="6">6 horas antes</SelectItem>
                <SelectItem value="12">12 horas antes</SelectItem>
                <SelectItem value="24">24 horas antes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* Notify Guest */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Notificar Hóspede</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviar lembrete ao hóspede antes da reserva expirar
              </p>
            </div>
            <Switch
              checked={settings.notifyGuest}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifyGuest: checked }))}
            />
          </div>

          <Separator className="bg-border" />

          {/* Notify Admin */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Notificar Administrador</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alertar o admin quando uma reserva temporária expirar
              </p>
            </div>
            <Switch
              checked={settings.notifyAdmin}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifyAdmin: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            Fluxo de Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-yellow-500">Pendente</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Reserva criada, aguardando pagamento. Calendário bloqueado.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-500">Confirmada</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pagamento recebido. Reserva confirmada automaticamente.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-500">Cancelada</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo limite expirou. Datas liberadas, reserva no histórico.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// AI AGENTS SETTINGS COMPONENT - ARQUITETURA MODULAR
// ============================================================================

// Definição dos agentes disponíveis
interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'beta' | 'coming_soon' | 'new';
  category: 'coleta' | 'comunicacao' | 'analise' | 'automacao';
  color: string;
}

const AVAILABLE_AGENTS: AgentDefinition[] = [
  {
    id: 'construtora-scraper',
    name: 'Coletor de Construtoras',
    description: 'Coleta dados de empreendimentos via Linktree e sites públicos',
    icon: <FileSearch className="h-6 w-6" />,
    status: 'active',
    category: 'coleta',
    color: 'purple',
  },
  {
    id: 'whatsapp-responder',
    name: 'Resposta WhatsApp',
    description: 'Responde mensagens automaticamente com IA',
    icon: <MessageCircle className="h-6 w-6" />,
    status: 'coming_soon',
    category: 'comunicacao',
    color: 'green',
  },
  {
    id: 'lead-qualifier',
    name: 'Qualificador de Leads',
    description: 'Analisa e classifica leads por potencial de compra',
    icon: <Filter className="h-6 w-6" />,
    status: 'coming_soon',
    category: 'analise',
    color: 'blue',
  },
  {
    id: 'price-monitor',
    name: 'Monitor de Preços',
    description: 'Acompanha variações de preço da concorrência',
    icon: <DollarSign className="h-6 w-6" />,
    status: 'coming_soon',
    category: 'coleta',
    color: 'amber',
  },
  {
    id: 'email-responder',
    name: 'Resposta Email',
    description: 'Responde emails de clientes automaticamente',
    icon: <MessageSquare className="h-6 w-6" />,
    status: 'coming_soon',
    category: 'comunicacao',
    color: 'indigo',
  },
  {
    id: 'document-analyzer',
    name: 'Analisador de Documentos',
    description: 'Extrai dados de contratos, propostas e fichas',
    icon: <FileText className="h-6 w-6" />,
    status: 'coming_soon',
    category: 'analise',
    color: 'rose',
  },
];

// Componente do Card do Agente na lista
function AgentCard({ agent, onClick }: { agent: AgentDefinition; onClick: () => void }) {
  const colorMap: Record<string, string> = {
    purple: 'from-purple-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    indigo: 'from-indigo-500 to-violet-600',
    rose: 'from-rose-500 to-pink-600',
  };

  const statusMap: Record<string, { label: string; className: string }> = {
    active: { label: 'Ativo', className: 'bg-green-500/10 text-green-500 border-green-500/30' },
    beta: { label: 'Beta', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
    new: { label: 'Novo', className: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
    coming_soon: { label: 'Em breve', className: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
  };

  const isDisabled = agent.status === 'coming_soon';

  return (
    <Card 
      className={`bg-card border-border transition-all duration-200 ${
        isDisabled 
          ? 'opacity-60 cursor-not-allowed' 
          : 'hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer'
      }`}
      onClick={isDisabled ? undefined : onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`h-14 w-14 bg-gradient-to-br ${colorMap[agent.color]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
            {agent.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
              <Badge className={statusMap[agent.status].className}>
                {statusMap[agent.status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
          </div>
          {!isDisabled && (
            <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente do Agente Coletor de Construtoras
function ConstrutoraScraper({ onBack }: { onBack: () => void }) {
  const [construtoras, setConstrutoras] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para teste/scraping
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLogs, setTestLogs] = useState<any[]>([]);

  // Carregar construtoras ao montar
  useEffect(() => {
    loadConstrutoras();
  }, []);

  const loadConstrutoras = async () => {
    setIsLoadingList(true);
    try {
      const response = await aiAgentsApi.listConstrutoras();
      if (response.success && response.data) {
        setConstrutoras(response.data.construtoras || []);
      }
    } catch (error) {
      console.error('Erro ao carregar construtoras:', error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleAddConstrutora = async () => {
    if (!newName || !newUrl) {
      toast.error('Nome e URL do Linktree são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const response = await aiAgentsApi.createConstrutora({
        name: newName,
        linktree_url: newUrl,
        notes: newNotes || undefined,
      });

      if (response.success) {
        toast.success('Construtora cadastrada com sucesso!');
        setNewName('');
        setNewUrl('');
        setNewNotes('');
        setShowAddForm(false);
        loadConstrutoras();
      } else {
        toast.error(response.error || 'Erro ao cadastrar');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConstrutora = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" da lista?`)) return;

    try {
      const response = await aiAgentsApi.deleteConstrutora(id);
      if (response.success) {
        toast.success('Construtora removida');
        loadConstrutoras();
      } else {
        toast.error(response.error || 'Erro ao remover');
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleScrape = async (construtora: any) => {
    setScrapingId(construtora.id);
    setTestResult(null);
    setTestLogs([{
      status: 'running',
      message: `Iniciando coleta para ${construtora.name}...`,
      created_at: new Date().toISOString()
    }]);

    try {
      const response = await aiAgentsApi.scrapeConstrutoraCadastrada(construtora.id);

      if (response.success && response.data) {
        setTestResult(response.data);
        setTestLogs(response.data.logs || []);
        
        if (response.data.success) {
          toast.success(`${response.data.empreendimentos?.length || 0} empreendimentos encontrados!`);
          loadConstrutoras(); // Recarregar para atualizar contadores
        } else {
          toast.error(response.data.error || 'Erro na coleta');
        }
      } else {
        toast.error(response.error || 'Erro ao executar agente');
        setTestLogs(prev => [...prev, {
          status: 'failed',
          message: response.error || 'Erro desconhecido',
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
      setTestLogs(prev => [...prev, {
        status: 'failed',
        message: error.message,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setScrapingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ChevronDown className="h-4 w-4 rotate-90" />
          Voltar
        </Button>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Coletor de Construtoras</h2>
            <p className="text-sm text-muted-foreground">Coleta automática via Linktree</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-500">{construtoras.length}</p>
              <p className="text-xs text-muted-foreground">Construtoras</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">
                {construtoras.reduce((acc, c) => acc + (c.empreendimentos_count || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Empreendimentos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{testResult?.tokensUsed || 0}</p>
              <p className="text-xs text-muted-foreground">Tokens Usados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">14.4K</p>
              <p className="text-xs text-muted-foreground">Tokens/dia (grátis)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Construtoras Cadastradas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-400" />
                Construtoras Cadastradas
              </CardTitle>
              <CardDescription>
                Gerencie as construtoras que deseja monitorar
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "outline" : "default"}
              className={showAddForm ? "" : "bg-purple-600 hover:bg-purple-700"}
            >
              {showAddForm ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulário de Adicionar */}
          {showAddForm && (
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-purple-400" />
                Nova Construtora
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nome da Construtora *</Label>
                  <Input
                    id="new-name"
                    placeholder="Ex: Cyrela, MRV, Tegra..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-url">URL do Linktree *</Label>
                  <Input
                    id="new-url"
                    placeholder="https://linktr.ee/construtora"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-notes">Observações (opcional)</Label>
                <Input
                  id="new-notes"
                  placeholder="Anotações sobre esta construtora..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddConstrutora}
                disabled={isSaving || !newName || !newUrl}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Construtora
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Lista */}
          {isLoadingList ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : construtoras.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma construtora cadastrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Adicionar" para começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {construtoras.map((construtora) => (
                <div 
                  key={construtora.id} 
                  className="p-4 rounded-lg bg-muted/30 border border-border hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground">{construtora.name}</h4>
                        {construtora.empreendimentos_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {construtora.empreendimentos_count} empreendimentos
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {construtora.linktree_url}
                      </p>
                      {construtora.last_scraped_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Última coleta: {new Date(construtora.last_scraped_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleScrape(construtora)}
                        disabled={scrapingId === construtora.id}
                        className="gap-1"
                      >
                        {scrapingId === construtora.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Coletar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteConstrutora(construtora.id, construtora.name)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs do Teste */}
      {testLogs.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Logs de Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {testLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    log.status === 'completed' ? 'bg-green-500' :
                    log.status === 'failed' ? 'bg-red-500' :
                    log.status === 'running' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  <span className="text-muted-foreground">{log.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {testResult?.empreendimentos && testResult.empreendimentos.length > 0 && (
        <Card className="bg-card border-border border-green-500/30">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Empreendimentos Encontrados ({testResult.empreendimentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testResult.empreendimentos.map((emp: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{emp.nome}</p>
                      {emp.localizacao && (
                        <p className="text-sm text-muted-foreground">{emp.localizacao}</p>
                      )}
                    </div>
                    {emp.status && (
                      <Badge variant="outline" className="text-xs">{emp.status}</Badge>
                    )}
                  </div>
                  {emp.tipologias && emp.tipologias.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {emp.tipologias.map((tip: string, j: number) => (
                        <Badge key={j} variant="secondary" className="text-xs">{tip}</Badge>
                      ))}
                    </div>
                  )}
                  {emp.links && Object.keys(emp.links).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border">
                      {emp.links.disponibilidade && (
                        <a href={emp.links.disponibilidade} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">📊 Disponibilidade</a>
                      )}
                      {emp.links.tabela_precos && (
                        <a href={emp.links.tabela_precos} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline">💰 Tabela</a>
                      )}
                      {emp.links.decorado_virtual && (
                        <a href={emp.links.decorado_virtual} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">🏠 Decorado</a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente Principal
function AIAgentsSettings() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Se um agente está selecionado, mostrar a view específica
  if (selectedAgent === 'construtora-scraper') {
    return <ConstrutoraScraper onBack={() => setSelectedAgent(null)} />;
  }

  // Tela principal - Lista de agentes
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            Agentes de IA
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Configure agentes inteligentes para automatizar coleta e processamento de dados
          </p>
        </div>
      </div>

      {/* Aviso Groq */}
      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-green-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              💰 Comece GRÁTIS com Groq!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O <span className="text-green-500 font-medium">Groq</span> oferece <span className="text-green-500 font-medium">14.400 tokens/dia grátis</span> - suficiente para ~10-20 coletas diárias sem custo!
              Configure em <span className="text-purple-400 font-medium">Integrações → Provedor de IA</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Categorias de Agentes */}
      <div className="space-y-6">
        {/* Coleta de Dados */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Coleta de Dados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_AGENTS.filter(a => a.category === 'coleta').map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onClick={() => setSelectedAgent(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* Comunicação */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Comunicação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_AGENTS.filter(a => a.category === 'comunicacao').map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onClick={() => setSelectedAgent(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* Análise */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Análise
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_AGENTS.filter(a => a.category === 'analise').map(agent => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                onClick={() => setSelectedAgent(agent.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Rodapé informativo */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>Novos agentes são adicionados regularmente. Tem uma ideia? Entre em contato!</span>
        </div>
      </div>
    </div>
  );
}

