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
  Copy,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Ban,
  Clock,
  Shield,
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
  RefreshCw
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
import { PropertyTypesManager } from './PropertyTypesManager';
import { LocationsListingsSettings } from './LocationsListingsSettings';
import { LocationAmenitiesSettings } from './LocationAmenitiesSettings';
import { IntegrationsManager } from './IntegrationsManager';
import { isOfflineMode } from '../utils/offlineConfig';

// ============================================================================
// TYPES
// ============================================================================

interface GlobalSettings {
  id: string;
  organization_id: string;
  cancellation_policy: any;
  checkin_checkout: any;
  security_deposit: any;
  minimum_nights: any;
  advance_booking: any;
  additional_fees: any;
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
    security_deposit: boolean;
    minimum_nights: boolean;
    advance_booking: boolean;
    additional_fees: boolean;
    house_rules: boolean;
    communication: boolean;
  };
  cancellation_policy?: any;
  checkin_checkout?: any;
  security_deposit?: any;
  minimum_nights?: any;
  advance_booking?: any;
  additional_fees?: any;
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
  organizationId: string;
  listingId?: string;
  mode?: 'global' | 'individual';
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [listingSettings, setListingSettings] = useState<ListingSettings | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['cancellation_policy']));

  useEffect(() => {
    loadSettings();
  }, [organizationId, listingId, mode]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadSettings = async () => {
    // Não carrega em modo offline
    if (isOfflineMode()) {
      console.log('📴 [OFFLINE] SettingsManager: não carregando settings');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      if (mode === 'global') {
        // Carregar configurações globais
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/global`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
          }
        );
        const data = await response.json();
        if (data.success) {
          setGlobalSettings(data.data);
        }
      } else if (mode === 'individual' && listingId) {
        // Carregar configurações do listing (efetivas)
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/settings`,
          {
            headers: { 'Authorization': `Bearer ${publicAnonKey}` }
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
      // Não mostra toast de erro em modo offline
      if (!isOfflineMode()) {
        toast.error('Erro ao carregar configurações');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalSettings = async () => {
    if (!globalSettings) return;
    
    if (isOfflineMode()) {
      toast.error('Salvamento não disponível em modo offline');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/global`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(globalSettings)
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
            'Authorization': `Bearer ${publicAnonKey}`,
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
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
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

  const applyToAll = async () => {
    if (!confirm('Aplicar configurações globais a TODOS os listings? Isso removerá todos os overrides.')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/apply-to-all`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Aplicado a ${data.data.affected_listings} listings!`);
      }
    } catch (error) {
      console.error('Error applying to all:', error);
      toast.error('Erro ao aplicar');
    } finally {
      setLoading(false);
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
      case 'security_deposit':
        return Shield;
      case 'minimum_nights':
        return Calendar;
      case 'advance_booking':
        return Calendar;
      case 'additional_fees':
        return DollarSign;
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
      case 'security_deposit':
        return 'Depósito / Caução';
      case 'minimum_nights':
        return 'Noites Mínimas';
      case 'advance_booking':
        return 'Antecedência para Reserva';
      case 'additional_fees':
        return 'Taxas Adicionais';
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
            {/* Outros renders aqui */}
            {!['cancellation_policy', 'checkin_checkout'].includes(section) && (
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
    'security_deposit',
    'minimum_nights',
    'advance_booking',
    'additional_fees',
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

      {/* Tabs */}
      <Tabs defaultValue="properties" className="w-full">
        <TabsList className="w-full justify-start bg-muted border-b border-border rounded-none h-auto p-0">
          <TabsTrigger
            value="properties"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3"
          >
            <Home className="h-4 w-4 mr-2" />
            Propriedades
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="property-types"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Tipos de Imóveis
          </TabsTrigger>
          <TabsTrigger
            value="locations-listings"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3"
          >
            <Home className="h-4 w-4 mr-2" />
            Locais e Anúncios
          </TabsTrigger>
          <TabsTrigger
            value="location-amenities"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Amenidades de Locais
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3"
          >
            <Zap className="h-4 w-4 mr-2" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* Properties Settings Tab */}
        <TabsContent value="properties" className="mt-6 space-y-6">
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
              {mode === 'global' && (
                <Button variant="outline" onClick={applyToAll} disabled={loading}>
                  <Copy className="h-4 w-4 mr-2" />
                  Aplicar a Todos
                </Button>
              )}
              <Button
                onClick={mode === 'global' ? saveGlobalSettings : saveListingSettings}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section) => renderSection(section, currentSettings, mode === 'global'))}
          </div>
        </TabsContent>

        {/* Chat Settings Tab */}
        <TabsContent value="chat" className="mt-6">
          <ChatSettingsTab organizationId={organizationId} />
        </TabsContent>

        {/* Property Types Settings Tab */}
        <TabsContent value="property-types" className="mt-6">
          <PropertyTypesManager />
        </TabsContent>

        {/* Locations & Listings Settings Tab */}
        <TabsContent value="locations-listings" className="mt-6">
          <LocationsListingsSettings />
        </TabsContent>

        {/* Location Amenities Settings Tab */}
        <TabsContent value="location-amenities" className="mt-6">
          <LocationAmenitiesSettings />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsManager />
        </TabsContent>
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
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </>
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

function ChannelsCommunicationSettings({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OrganizationChannelConfig | null>(null);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showSMSConfig, setShowSMSConfig] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({
    api_url: '',
    instance_name: '',
    api_key: ''
  });
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  // Webhook URL para Evolution API
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook`;

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  const loadConfig = async () => {
    setLoading(true);
    
    // Sempre tenta carregar do localStorage primeiro
    const localConfigStr = localStorage.getItem(`whatsapp_config_${organizationId}`);
    if (localConfigStr) {
      try {
        const localConfig = JSON.parse(localConfigStr);
        
        setConfig(localConfig);
        if (localConfig.whatsapp) {
          setWhatsappForm({
            api_url: localConfig.whatsapp.api_url || '',
            instance_name: localConfig.whatsapp.instance_name || '',
            api_key: localConfig.whatsapp.api_key || ''
          });
        }
        
        setLoading(false);
        return;
      } catch (parseError) {
        console.error('Erro ao fazer parse do localStorage:', parseError);
      }
    }
    
    // Se não houver localStorage e não estiver em modo offline, tenta backend
    if (!isOfflineMode()) {
      try {
        const result = await channelsApi.getConfig(organizationId);
        if (result.success && result.data) {
          setConfig(result.data);
          if (result.data.whatsapp) {
            setWhatsappForm({
              api_url: result.data.whatsapp.api_url || '',
              instance_name: result.data.whatsapp.instance_name || '',
              api_key: result.data.whatsapp.api_key || ''
            });
          }
        }
      } catch (error) {
        // Silencia erros em modo offline
      }
    }
    
    setLoading(false);
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
    try {
      const result = await channelsApi.evolution.connect(organizationId, whatsappForm);
      
      if (result.success && result.data) {
        setQrCode(result.data.qr_code);
        toast.success('QR Code gerado! Escaneie com o WhatsApp');
        
        // Reload config
        await loadConfig();
      } else {
        // v1.0.102 not implemented yet
        toast.info('Integração WhatsApp será implementada na v1.0.102');
      }
    } catch (error: any) {
      console.error('Error connecting WhatsApp:', error);
      if (error.message?.includes('501') || error.message?.includes('v1.0.102')) {
        toast.info('Integração WhatsApp em desenvolvimento (v1.0.102)');
      } else {
        toast.error('Erro ao conectar WhatsApp');
      }
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
        await loadConfig();
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Erro ao desconectar WhatsApp');
    }
  };

  const handleToggleWhatsApp = async (enabled: boolean) => {
    try {
      const result = await channelsApi.updateConfig(organizationId, {
        whatsapp: {
          ...config?.whatsapp,
          enabled,
          api_url: whatsappForm.api_url,
          instance_name: whatsappForm.instance_name,
          api_key: whatsappForm.api_key,
          connected: config?.whatsapp?.connected || false,
          connection_status: config?.whatsapp?.connection_status || 'disconnected'
        }
      });
      
      if (result.success) {
        setConfig(result.data);
        toast.success(enabled ? 'WhatsApp ativado' : 'WhatsApp desativado');
      }
    } catch (error) {
      console.error('Error toggling WhatsApp:', error);
      toast.error('Erro ao atualizar configuração');
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
                    Chave de autenticação da Evolution API
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

                <Button
                  onClick={handleConnectWhatsApp}
                  disabled={connectingWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
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
