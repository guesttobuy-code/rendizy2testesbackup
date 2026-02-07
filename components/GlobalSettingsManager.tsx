/**
 * RENDIZY - Global Settings Manager
 * 
 * Interface completa para gerenciamento de configurações globais da organização.
 * Permite configurar políticas que se aplicam a todos os listings por padrão.
 * 
 * Funcionalidades:
 * - Editar 8 seções de configurações
 * - Aplicar em lote para todos os listings
 * - Reset para padrão
 * - Preview de valores
 * 
 * @version 1.0.84
 * @date 2025-10-29
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Clock,
  DollarSign,
  Shield,
  Calendar,
  Home,
  MessageSquare,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface GlobalSettings {
  id: string;
  organization_id: string;
  cancellation_policy: {
    enabled: boolean;
    type: 'flexible' | 'moderate' | 'strict' | 'custom';
    refund_percentage_7days: number;
    refund_percentage_3days: number;
    refund_percentage_1day: number;
    no_refund_hours: number;
  };
  checkin_checkout: {
    enabled: boolean;
    checkin_time_from: string;
    checkin_time_to: string;
    checkout_time: string;
    early_checkin_fee?: number;
    late_checkout_fee?: number;
    flexible_hours: boolean;
  };
  security_deposit: {
    enabled: boolean;
    amount: number;
    required_for_all: boolean;
    refund_days_after_checkout: number;
    payment_method: 'pix' | 'card' | 'cash' | 'any';
  };
  minimum_nights: {
    enabled: boolean;
    default_min_nights: number;
    weekend_min_nights?: number;
    holiday_min_nights?: number;
    high_season_min_nights?: number;
  };
  advance_booking: {
    enabled: boolean;
    min_hours_advance: number;
    max_days_advance: number;
    same_day_booking: boolean;
    last_minute_cutoff?: string;
  };
  additional_fees: {
    enabled: boolean;
    cleaning_fee: number;
    cleaning_fee_is_passthrough: boolean;
    service_fee_percentage: number;
    platform_fee_percentage: number;
  };
  house_rules: {
    enabled: boolean;
    no_smoking: boolean;
    no_parties: boolean;
    no_pets: boolean;
    pets_fee?: number;
    pets_max?: number;
    quiet_hours_enabled?: boolean;
    quiet_hours_from?: string;
    quiet_hours_to?: string;
    max_guests_strict: boolean;
    children_allowed?: boolean;
    children_min_age?: number;
    infants_allowed?: boolean;
    events_allowed?: boolean;
  };
  communication: {
    enabled: boolean;
    auto_confirm_reservations: boolean;
    send_welcome_message: boolean;
    send_checkin_instructions: boolean;
    send_checkout_reminder: boolean;
    send_review_request?: boolean;
    communication_language: 'pt-BR' | 'pt' | 'en' | 'es' | 'auto';
  };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GlobalSettingsManager({ organizationId }: { organizationId: string }) {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [organizationId]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadSettings = async () => {
    // ⚠️ Verificar se organizationId existe antes de fazer chamada
    if (!organizationId || organizationId === 'undefined') {
      console.warn('[GlobalSettingsManager] organizationId não definido, pulando carregamento');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/global`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      } else {
        toast.error('Erro ao carregar configurações');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

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
          body: JSON.stringify(settings)
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Configurações salvas com sucesso!');
        setSettings(data.data);
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

  const resetSettings = async () => {
    if (!confirm('Deseja realmente resetar todas as configurações para o padrão?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/global/reset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Configurações resetadas!');
        setSettings(data.data);
      } else {
        toast.error(data.error || 'Erro ao resetar');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Erro ao resetar configurações');
    } finally {
      setLoading(false);
    }
  };

  const applyToAll = async () => {
    if (!confirm('Aplicar estas configurações a TODOS os listings? Isso removerá configurações individuais.')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/settings/apply-to-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Configurações aplicadas!');
      } else {
        toast.error(data.error || 'Erro ao aplicar');
      }
    } catch (error) {
      console.error('Error applying to all:', error);
      toast.error('Erro ao aplicar configurações');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const updateSection = (section: keyof Omit<GlobalSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'>, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: value
    });
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>Erro ao carregar configurações</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-white">Configurações Globais</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Configurações padrão aplicadas a todos os listings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetSettings}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          <Button
            variant="outline"
            onClick={applyToAll}
            disabled={loading}
          >
            Aplicar a Todos
          </Button>
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
      </div>

      <Tabs defaultValue="cancellation" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-[#2a2d3a]">
          <TabsTrigger value="cancellation">Cancelamento</TabsTrigger>
          <TabsTrigger value="checkin">Check-in/out</TabsTrigger>
          <TabsTrigger value="deposit">Depósito</TabsTrigger>
          <TabsTrigger value="nights">Noites Mín.</TabsTrigger>
          <TabsTrigger value="advance">Antecedência</TabsTrigger>
          <TabsTrigger value="fees">Taxas</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
          <TabsTrigger value="communication">Comunicação</TabsTrigger>
        </TabsList>

        {/* TAB: CANCELAMENTO */}
        <TabsContent value="cancellation">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-400" />
                Políticas de Cancelamento
              </CardTitle>
              <CardDescription>
                Defina como funcionam os cancelamentos e reembolsos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar política de cancelamento</Label>
                <Switch
                  checked={settings.cancellation_policy.enabled}
                  onCheckedChange={(checked) =>
                    updateSection('cancellation_policy', {
                      ...settings.cancellation_policy,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.cancellation_policy.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Tipo de Política</Label>
                    <Select
                      value={settings.cancellation_policy.type}
                      onValueChange={(value: any) =>
                        updateSection('cancellation_policy', {
                          ...settings.cancellation_policy,
                          type: value
                        })
                      }
                    >
                      <SelectTrigger className="bg-[#1e2029] border-[#363945] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                        <SelectItem value="flexible">Flexível (reembolso total até 1 dia antes)</SelectItem>
                        <SelectItem value="moderate">Moderada (reembolso total até 5 dias antes)</SelectItem>
                        <SelectItem value="strict">Rígida (reembolso total até 14 dias antes)</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.cancellation_policy.type === 'custom' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-neutral-300">Reembolso 7+ dias antes (%)</Label>
                          <Input
                            type="number"
                            value={settings.cancellation_policy.refund_percentage_7days}
                            onChange={(e) =>
                              updateSection('cancellation_policy', {
                                ...settings.cancellation_policy,
                                refund_percentage_7days: parseInt(e.target.value)
                              })
                            }
                            className="bg-[#1e2029] border-[#363945] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-neutral-300">Reembolso 3-6 dias antes (%)</Label>
                          <Input
                            type="number"
                            value={settings.cancellation_policy.refund_percentage_3days}
                            onChange={(e) =>
                              updateSection('cancellation_policy', {
                                ...settings.cancellation_policy,
                                refund_percentage_3days: parseInt(e.target.value)
                              })
                            }
                            className="bg-[#1e2029] border-[#363945] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-neutral-300">Reembolso 1-2 dias antes (%)</Label>
                          <Input
                            type="number"
                            value={settings.cancellation_policy.refund_percentage_1day}
                            onChange={(e) =>
                              updateSection('cancellation_policy', {
                                ...settings.cancellation_policy,
                                refund_percentage_1day: parseInt(e.target.value)
                              })
                            }
                            className="bg-[#1e2029] border-[#363945] text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-neutral-300">Sem reembolso se cancelar com menos de (horas)</Label>
                        <Input
                          type="number"
                          value={settings.cancellation_policy.no_refund_hours}
                          onChange={(e) =>
                            updateSection('cancellation_policy', {
                              ...settings.cancellation_policy,
                              no_refund_hours: parseInt(e.target.value)
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CHECK-IN/OUT */}
        <TabsContent value="checkin">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Check-in e Check-out
              </CardTitle>
              <CardDescription>
                Defina horários padrão de entrada e saída
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar horários de check-in/out</Label>
                <Switch
                  checked={settings.checkin_checkout.enabled}
                  onCheckedChange={(checked) =>
                    updateSection('checkin_checkout', {
                      ...settings.checkin_checkout,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.checkin_checkout.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Check-in a partir de</Label>
                      <Input
                        type="time"
                        value={settings.checkin_checkout.checkin_time_from}
                        onChange={(e) =>
                          updateSection('checkin_checkout', {
                            ...settings.checkin_checkout,
                            checkin_time_from: e.target.value
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Check-in até</Label>
                      <Input
                        type="time"
                        value={settings.checkin_checkout.checkin_time_to}
                        onChange={(e) =>
                          updateSection('checkin_checkout', {
                            ...settings.checkin_checkout,
                            checkin_time_to: e.target.value
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Check-out até</Label>
                      <Input
                        type="time"
                        value={settings.checkin_checkout.checkout_time}
                        onChange={(e) =>
                          updateSection('checkin_checkout', {
                            ...settings.checkin_checkout,
                            checkout_time: e.target.value
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Taxa por check-in antecipado (R$)</Label>
                      <Input
                        type="number"
                        value={settings.checkin_checkout.early_checkin_fee || 0}
                        onChange={(e) =>
                          updateSection('checkin_checkout', {
                            ...settings.checkin_checkout,
                            early_checkin_fee: parseFloat(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Taxa por check-out tardio (R$)</Label>
                      <Input
                        type="number"
                        value={settings.checkin_checkout.late_checkout_fee || 0}
                        onChange={(e) =>
                          updateSection('checkin_checkout', {
                            ...settings.checkin_checkout,
                            late_checkout_fee: parseFloat(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300">Permitir horários flexíveis</Label>
                    <Switch
                      checked={settings.checkin_checkout.flexible_hours}
                      onCheckedChange={(checked) =>
                        updateSection('checkin_checkout', {
                          ...settings.checkin_checkout,
                          flexible_hours: checked
                        })
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: DEPÓSITO E CAUÇÃO */}
        <TabsContent value="deposit">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                Garantias e Depósitos
              </CardTitle>
              <CardDescription>
                Configure sinal de reserva (entrada) e caução de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SINAL / ENTRADA */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Sinal de Reserva (Entrada)</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Exigir sinal para confirmar reserva</Label>
                  <Switch
                    checked={(settings as any).deposit?.require_deposit ?? true}
                    onCheckedChange={(checked) =>
                      updateSection('deposit' as any, {
                        ...(settings as any).deposit,
                        require_deposit: checked
                      })
                    }
                  />
                </div>

                {(settings as any).deposit?.require_deposit && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Porcentagem do sinal (%)</Label>
                      <Input
                        type="number"
                        value={(settings as any).deposit?.deposit_percentage ?? 30}
                        onChange={(e) =>
                          updateSection('deposit' as any, {
                            ...(settings as any).deposit,
                            deposit_percentage: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Prazo para pagar sinal (dias)</Label>
                      <Input
                        type="number"
                        value={(settings as any).deposit?.deposit_due_days ?? 0}
                        onChange={(e) =>
                          updateSection('deposit' as any, {
                            ...(settings as any).deposit,
                            deposit_due_days: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                        placeholder="0 = imediato"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-[#363945]" />

              {/* CAUÇÃO / DEPÓSITO DE SEGURANÇA */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Caução de Segurança</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Exigir caução para proteção do imóvel</Label>
                  <Switch
                    checked={settings.security_deposit?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      updateSection('security_deposit', {
                        ...settings.security_deposit,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {settings.security_deposit?.enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Valor da Caução (R$)</Label>
                        <Input
                          type="number"
                          value={settings.security_deposit?.amount ?? 500}
                          onChange={(e) =>
                            updateSection('security_deposit', {
                              ...settings.security_deposit,
                              amount: parseFloat(e.target.value)
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Devolver após checkout (dias)</Label>
                        <Input
                          type="number"
                          value={settings.security_deposit?.refund_days_after_checkout ?? 7}
                          onChange={(e) =>
                            updateSection('security_deposit', {
                              ...settings.security_deposit,
                              refund_days_after_checkout: parseInt(e.target.value)
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-neutral-300">Obrigatório para todas as reservas</Label>
                      <Switch
                        checked={settings.security_deposit?.required_for_all ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('security_deposit', {
                            ...settings.security_deposit,
                            required_for_all: checked
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-neutral-300">Forma de Pagamento</Label>
                      <Select
                        value={settings.security_deposit?.payment_method ?? 'pix'}
                        onValueChange={(value: any) =>
                          updateSection('security_deposit', {
                            ...settings.security_deposit,
                            payment_method: value
                          })
                        }
                      >
                        <SelectTrigger className="bg-[#1e2029] border-[#363945] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="card">Cartão</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="any">Qualquer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: NOITES MÍNIMAS E MÁXIMAS */}
        <TabsContent value="nights">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-400" />
                Restrições de Estadia
              </CardTitle>
              <CardDescription>
                Defina quantidade mínima e máxima de noites por período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* NOITES MÍNIMAS */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Noites Mínimas</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Ativar noites mínimas</Label>
                  <Switch
                    checked={settings.minimum_nights?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      updateSection('minimum_nights', {
                        ...settings.minimum_nights,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {settings.minimum_nights?.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Mínimo de noites padrão</Label>
                      <Input
                        type="number"
                        value={settings.minimum_nights?.default_min_nights ?? 1}
                        onChange={(e) =>
                          updateSection('minimum_nights', {
                            ...settings.minimum_nights,
                            default_min_nights: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Fins de semana</Label>
                        <Input
                          type="number"
                          value={settings.minimum_nights?.weekend_min_nights || ''}
                          onChange={(e) =>
                            updateSection('minimum_nights', {
                              ...settings.minimum_nights,
                              weekend_min_nights: parseInt(e.target.value) || undefined
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                          placeholder="Opcional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Feriados</Label>
                        <Input
                          type="number"
                          value={settings.minimum_nights?.holiday_min_nights || ''}
                          onChange={(e) =>
                            updateSection('minimum_nights', {
                              ...settings.minimum_nights,
                              holiday_min_nights: parseInt(e.target.value) || undefined
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                          placeholder="Opcional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Alta temporada</Label>
                        <Input
                          type="number"
                          value={settings.minimum_nights?.high_season_min_nights || ''}
                          onChange={(e) =>
                            updateSection('minimum_nights', {
                              ...settings.minimum_nights,
                              high_season_min_nights: parseInt(e.target.value) || undefined
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Separator className="bg-[#363945]" />

              {/* NOITES MÁXIMAS */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Noites Máximas</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Limitar estadia máxima</Label>
                  <Switch
                    checked={(settings as any).maximum_nights?.enabled ?? false}
                    onCheckedChange={(checked) =>
                      updateSection('maximum_nights' as any, {
                        ...(settings as any).maximum_nights,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {(settings as any).maximum_nights?.enabled && (
                  <div className="space-y-2">
                    <Label className="text-neutral-300">Máximo de noites por reserva</Label>
                    <Input
                      type="number"
                      value={(settings as any).maximum_nights?.default_max_nights ?? 30}
                      onChange={(e) =>
                        updateSection('maximum_nights' as any, {
                          ...(settings as any).maximum_nights,
                          default_max_nights: parseInt(e.target.value)
                        })
                      }
                      className="bg-[#1e2029] border-[#363945] text-white"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outras tabs seriam implementadas de forma similar... */}
        {/* Por brevidade, mostrando apenas as principais */}

        {/* TAB: ANTECEDÊNCIA */}
        <TabsContent value="advance">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-400" />
                Antecedência de Reserva
              </CardTitle>
              <CardDescription>
                Defina com quanto tempo de antecedência as reservas podem ser feitas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar regras de antecedência</Label>
                <Switch
                  checked={settings.advance_booking?.enabled ?? true}
                  onCheckedChange={(checked) =>
                    updateSection('advance_booking', {
                      ...settings.advance_booking,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.advance_booking?.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Mínimo de horas de antecedência</Label>
                      <Input
                        type="number"
                        value={settings.advance_booking?.min_hours_advance ?? 24}
                        onChange={(e) =>
                          updateSection('advance_booking', {
                            ...settings.advance_booking,
                            min_hours_advance: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Máximo de dias de antecedência</Label>
                      <Input
                        type="number"
                        value={settings.advance_booking?.max_days_advance ?? 365}
                        onChange={(e) =>
                          updateSection('advance_booking', {
                            ...settings.advance_booking,
                            max_days_advance: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300">Permitir reserva no mesmo dia</Label>
                    <Switch
                      checked={settings.advance_booking?.same_day_booking ?? false}
                      onCheckedChange={(checked) =>
                        updateSection('advance_booking', {
                          ...settings.advance_booking,
                          same_day_booking: checked
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Horário limite para reserva no mesmo dia</Label>
                    <Input
                      type="time"
                      value={settings.advance_booking?.last_minute_cutoff ?? '14:00'}
                      onChange={(e) =>
                        updateSection('advance_booking', {
                          ...settings.advance_booking,
                          last_minute_cutoff: e.target.value
                        })
                      }
                      className="bg-[#1e2029] border-[#363945] text-white"
                    />
                  </div>
                </>
              )}

              <Separator className="bg-[#363945]" />

              {/* TEMPO DE PREPARAÇÃO (TURNAROUND) */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Tempo de Preparação (Limpeza)</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Bloquear dias para preparação</Label>
                  <Switch
                    checked={(settings as any).preparation_time?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      updateSection('preparation_time' as any, {
                        ...(settings as any).preparation_time,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {(settings as any).preparation_time?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Dias bloqueados antes do check-in</Label>
                      <Input
                        type="number"
                        value={(settings as any).preparation_time?.days_before ?? 0}
                        onChange={(e) =>
                          updateSection('preparation_time' as any, {
                            ...(settings as any).preparation_time,
                            days_before: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Dias bloqueados após checkout (limpeza)</Label>
                      <Input
                        type="number"
                        value={(settings as any).preparation_time?.days_after ?? 1}
                        onChange={(e) =>
                          updateSection('preparation_time' as any, {
                            ...(settings as any).preparation_time,
                            days_after: parseInt(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-[#363945]" />

              {/* RESERVA INSTANTÂNEA */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Reserva Instantânea</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Aceitar reservas automaticamente</Label>
                  <Switch
                    checked={(settings as any).instant_booking?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      updateSection('instant_booking' as any, {
                        ...(settings as any).instant_booking,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {(settings as any).instant_booking?.enabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Exigir verificação do hóspede</Label>
                      <Switch
                        checked={(settings as any).instant_booking?.require_guest_verification ?? false}
                        onCheckedChange={(checked) =>
                          updateSection('instant_booking' as any, {
                            ...(settings as any).instant_booking,
                            require_guest_verification: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Apenas hóspedes com avaliações positivas</Label>
                      <Switch
                        checked={(settings as any).instant_booking?.require_positive_reviews ?? false}
                        onCheckedChange={(checked) =>
                          updateSection('instant_booking' as any, {
                            ...(settings as any).instant_booking,
                            require_positive_reviews: checked
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: TAXAS */}
        <TabsContent value="fees">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                Taxas Adicionais
              </CardTitle>
              <CardDescription>
                Configure taxas de limpeza, serviço e plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar taxas adicionais</Label>
                <Switch
                  checked={settings.additional_fees?.enabled ?? true}
                  onCheckedChange={(checked) =>
                    updateSection('additional_fees', {
                      ...settings.additional_fees,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.additional_fees?.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Taxa de limpeza (R$)</Label>
                      <Input
                        type="number"
                        value={settings.additional_fees?.cleaning_fee ?? 0}
                        onChange={(e) =>
                          updateSection('additional_fees', {
                            ...settings.additional_fees,
                            cleaning_fee: parseFloat(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-neutral-300">Taxa de serviço (%)</Label>
                      <Input
                        type="number"
                        value={settings.additional_fees?.service_fee_percentage ?? 0}
                        onChange={(e) =>
                          updateSection('additional_fees', {
                            ...settings.additional_fees,
                            service_fee_percentage: parseFloat(e.target.value)
                          })
                        }
                        className="bg-[#1e2029] border-[#363945] text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300">Taxa de limpeza é repassada ao hóspede</Label>
                    <Switch
                      checked={settings.additional_fees?.cleaning_fee_is_passthrough ?? false}
                      onCheckedChange={(checked) =>
                        updateSection('additional_fees', {
                          ...settings.additional_fees,
                          cleaning_fee_is_passthrough: checked
                        })
                      }
                    />
                  </div>
                </>
              )}

              <Separator className="bg-[#363945]" />

              {/* TAXAS ESPECIAIS - EARLY CHECK-IN / LATE CHECKOUT */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-200">Taxas por Horário Especial</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300">Oferecer early check-in / late checkout</Label>
                  <Switch
                    checked={(settings as any).special_fees?.enabled ?? false}
                    onCheckedChange={(checked) =>
                      updateSection('special_fees' as any, {
                        ...(settings as any).special_fees,
                        enabled: checked
                      })
                    }
                  />
                </div>

                {(settings as any).special_fees?.enabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#1e2029] rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-neutral-300 font-medium">Early Check-in</Label>
                          <Switch
                            checked={(settings as any).special_fees?.early_checkin_enabled ?? false}
                            onCheckedChange={(checked) =>
                              updateSection('special_fees' as any, {
                                ...(settings as any).special_fees,
                                early_checkin_enabled: checked
                              })
                            }
                          />
                        </div>
                        {(settings as any).special_fees?.early_checkin_enabled && (
                          <div className="space-y-2">
                            <Label className="text-neutral-400 text-xs">Taxa (R$)</Label>
                            <Input
                              type="number"
                              value={(settings as any).special_fees?.early_checkin_value ?? 50}
                              onChange={(e) =>
                                updateSection('special_fees' as any, {
                                  ...(settings as any).special_fees,
                                  early_checkin_value: parseFloat(e.target.value)
                                })
                              }
                              className="bg-[#2a2d3a] border-[#363945] text-white"
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-[#1e2029] rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-neutral-300 font-medium">Late Checkout</Label>
                          <Switch
                            checked={(settings as any).special_fees?.late_checkout_enabled ?? false}
                            onCheckedChange={(checked) =>
                              updateSection('special_fees' as any, {
                                ...(settings as any).special_fees,
                                late_checkout_enabled: checked
                              })
                            }
                          />
                        </div>
                        {(settings as any).special_fees?.late_checkout_enabled && (
                          <div className="space-y-2">
                            <Label className="text-neutral-400 text-xs">Taxa (R$)</Label>
                            <Input
                              type="number"
                              value={(settings as any).special_fees?.late_checkout_value ?? 50}
                              onChange={(e) =>
                                updateSection('special_fees' as any, {
                                  ...(settings as any).special_fees,
                                  late_checkout_value: parseFloat(e.target.value)
                                })
                              }
                              className="bg-[#2a2d3a] border-[#363945] text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: REGRAS */}
        <TabsContent value="rules">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Home className="h-5 w-5 text-amber-400" />
                Regras da Casa
              </CardTitle>
              <CardDescription>
                Configure políticas sobre pets, fumo, festas e horários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar regras da casa</Label>
                <Switch
                  checked={settings.house_rules?.enabled ?? true}
                  onCheckedChange={(checked) =>
                    updateSection('house_rules', {
                      ...settings.house_rules,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.house_rules?.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Proibido fumar</Label>
                      <Switch
                        checked={settings.house_rules?.no_smoking ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('house_rules', {
                            ...settings.house_rules,
                            no_smoking: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Proibido festas</Label>
                      <Switch
                        checked={settings.house_rules?.no_parties ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('house_rules', {
                            ...settings.house_rules,
                            no_parties: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Não aceita pets</Label>
                      <Switch
                        checked={settings.house_rules?.no_pets ?? false}
                        onCheckedChange={(checked) =>
                          updateSection('house_rules', {
                            ...settings.house_rules,
                            no_pets: checked
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Aceita crianças</Label>
                      <Switch
                        checked={settings.house_rules?.children_allowed ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('house_rules', {
                            ...settings.house_rules,
                            children_allowed: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Respeitar max. hóspedes</Label>
                      <Switch
                        checked={settings.house_rules?.max_guests_strict ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('house_rules', {
                            ...settings.house_rules,
                            max_guests_strict: checked
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300">Horário de silêncio ativo</Label>
                    <Switch
                      checked={settings.house_rules?.quiet_hours_enabled ?? false}
                      onCheckedChange={(checked) =>
                        updateSection('house_rules', {
                          ...settings.house_rules,
                          quiet_hours_enabled: checked
                        })
                      }
                    />
                  </div>

                  {settings.house_rules?.quiet_hours_enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Silêncio a partir de</Label>
                        <Input
                          type="time"
                          value={settings.house_rules?.quiet_hours_from ?? '22:00'}
                          onChange={(e) =>
                            updateSection('house_rules', {
                              ...settings.house_rules,
                              quiet_hours_from: e.target.value
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-neutral-300">Silêncio até</Label>
                        <Input
                          type="time"
                          value={settings.house_rules?.quiet_hours_to ?? '08:00'}
                          onChange={(e) =>
                            updateSection('house_rules', {
                              ...settings.house_rules,
                              quiet_hours_to: e.target.value
                            })
                          }
                          className="bg-[#1e2029] border-[#363945] text-white"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: COMUNICAÇÃO */}
        <TabsContent value="communication">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Comunicação
              </CardTitle>
              <CardDescription>
                Configure mensagens automáticas e notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar comunicação automática</Label>
                <Switch
                  checked={settings.communication?.enabled ?? true}
                  onCheckedChange={(checked) =>
                    updateSection('communication', {
                      ...settings.communication,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.communication?.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Confirmar reservas automaticamente</Label>
                      <Switch
                        checked={settings.communication?.auto_confirm_reservations ?? false}
                        onCheckedChange={(checked) =>
                          updateSection('communication', {
                            ...settings.communication,
                            auto_confirm_reservations: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Enviar mensagem de boas-vindas</Label>
                      <Switch
                        checked={settings.communication?.send_welcome_message ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('communication', {
                            ...settings.communication,
                            send_welcome_message: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Enviar instruções de check-in</Label>
                      <Switch
                        checked={settings.communication?.send_checkin_instructions ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('communication', {
                            ...settings.communication,
                            send_checkin_instructions: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Enviar lembrete de checkout</Label>
                      <Switch
                        checked={settings.communication?.send_checkout_reminder ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('communication', {
                            ...settings.communication,
                            send_checkout_reminder: checked
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#1e2029] rounded-lg">
                      <Label className="text-neutral-300">Pedir avaliação após checkout</Label>
                      <Switch
                        checked={settings.communication?.send_review_request ?? true}
                        onCheckedChange={(checked) =>
                          updateSection('communication', {
                            ...settings.communication,
                            send_review_request: checked
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Idioma de comunicação</Label>
                    <Select
                      value={settings.communication?.communication_language ?? 'pt-BR'}
                      onValueChange={(value: any) =>
                        updateSection('communication', {
                          ...settings.communication,
                          communication_language: value
                        })
                      }
                    >
                      <SelectTrigger className="bg-[#1e2029] border-[#363945] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="auto">Automático (idioma do hóspede)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
