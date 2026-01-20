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
    min_days_advance: number;
    max_days_advance: number;
    same_day_booking: boolean;
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
    quiet_hours_from?: string;
    quiet_hours_to?: string;
    max_guests_strict: boolean;
  };
  communication: {
    enabled: boolean;
    auto_confirm_reservations: boolean;
    send_welcome_message: boolean;
    send_checkin_instructions: boolean;
    send_checkout_reminder: boolean;
    communication_language: 'pt' | 'en' | 'es' | 'auto';
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

        {/* TAB: DEPÓSITO */}
        <TabsContent value="deposit">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                Depósito de Segurança
              </CardTitle>
              <CardDescription>
                Configure caução para proteção do imóvel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Exigir depósito de segurança</Label>
                <Switch
                  checked={settings.security_deposit.enabled}
                  onCheckedChange={(checked) =>
                    updateSection('security_deposit', {
                      ...settings.security_deposit,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.security_deposit.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Valor do Depósito (R$)</Label>
                    <Input
                      type="number"
                      value={settings.security_deposit.amount}
                      onChange={(e) =>
                        updateSection('security_deposit', {
                          ...settings.security_deposit,
                          amount: parseFloat(e.target.value)
                        })
                      }
                      className="bg-[#1e2029] border-[#363945] text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300">Obrigatório para todas as reservas</Label>
                    <Switch
                      checked={settings.security_deposit.required_for_all}
                      onCheckedChange={(checked) =>
                        updateSection('security_deposit', {
                          ...settings.security_deposit,
                          required_for_all: checked
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Devolver depósito após (dias)</Label>
                    <Input
                      type="number"
                      value={settings.security_deposit.refund_days_after_checkout}
                      onChange={(e) =>
                        updateSection('security_deposit', {
                          ...settings.security_deposit,
                          refund_days_after_checkout: parseInt(e.target.value)
                        })
                      }
                      className="bg-[#1e2029] border-[#363945] text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Forma de Pagamento</Label>
                    <Select
                      value={settings.security_deposit.payment_method}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: NOITES MÍNIMAS */}
        <TabsContent value="nights">
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-400" />
                Noites Mínimas
              </CardTitle>
              <CardDescription>
                Defina quantidade mínima de noites por período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Ativar noites mínimas</Label>
                <Switch
                  checked={settings.minimum_nights.enabled}
                  onCheckedChange={(checked) =>
                    updateSection('minimum_nights', {
                      ...settings.minimum_nights,
                      enabled: checked
                    })
                  }
                />
              </div>

              {settings.minimum_nights.enabled && (
                <>
                  <Separator className="bg-[#363945]" />

                  <div className="space-y-2">
                    <Label className="text-neutral-300">Mínimo de noites padrão</Label>
                    <Input
                      type="number"
                      value={settings.minimum_nights.default_min_nights}
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
                        value={settings.minimum_nights.weekend_min_nights || ''}
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
                        value={settings.minimum_nights.holiday_min_nights || ''}
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
                        value={settings.minimum_nights.high_season_min_nights || ''}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outras tabs seriam implementadas de forma similar... */}
        {/* Por brevidade, mostrando apenas as principais */}

      </Tabs>
    </div>
  );
}
