"use client";

/**
 * PRICING SETTINGS FORM - Configurações de Preços (v1.0.81)
 * 
 * Formulário completo de precificação com:
 * - Preço base por noite
 * - Hóspedes incluídos no preço base
 * - Taxa por hóspede adicional
 * - Taxa de limpeza (repasse integral)
 * - Preview automático de cálculo
 */

import { useState, useEffect } from 'react';
import { DollarSign, Users, Sparkles, Info, Calculator } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface PricingSettings {
  id: string;
  listingId: string;
  basePricePerNight: number;
  maxGuestsIncluded: number;
  extraGuestFeePerNight: number;
  chargeForChildren: boolean;
  cleaningFee: number;
  cleaningFeeIsPassThrough: boolean;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface ReservationCalculation {
  baseTotal: number;
  extraGuestsTotal: number;
  cleaningFee: number;
  grandTotal: number;
  commissionBase: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PricingSettingsForm({ listingId }: { listingId: string }) {
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preview calculator
  const [previewNights, setPreviewNights] = useState(5);
  const [previewGuests, setPreviewGuests] = useState(4);
  const [calculation, setCalculation] = useState<ReservationCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  // ============================================================================
  // FETCH SETTINGS
  // ============================================================================

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/pricing-settings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pricing settings');
      }

      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
      toast.error('Erro ao carregar configurações de preço');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchSettings();
    }
  }, [listingId]);

  // ============================================================================
  // CALCULATE PREVIEW
  // ============================================================================

  const calculatePreview = async () => {
    if (!settings) return;

    try {
      setCalculating(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/calculate-reservation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            listingId,
            nights: previewNights,
            guests: previewGuests,
            hasPets: false
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to calculate');
      }

      const data = await response.json();
      
      if (data.success) {
        setCalculation(data.data);
      }
    } catch (error) {
      console.error('Error calculating:', error);
      toast.error('Erro ao calcular preview');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (settings) {
      calculatePreview();
    }
  }, [settings, previewNights, previewGuests]);

  // ============================================================================
  // SAVE SETTINGS
  // ============================================================================

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/pricing-settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            basePricePerNight: settings.basePricePerNight,
            maxGuestsIncluded: settings.maxGuestsIncluded,
            extraGuestFeePerNight: settings.extraGuestFeePerNight,
            chargeForChildren: settings.chargeForChildren,
            cleaningFee: settings.cleaningFee,
            cleaningFeeIsPassThrough: settings.cleaningFeeIsPassThrough,
            currency: settings.currency
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update pricing settings');
      }

      toast.success('Configurações de preço atualizadas com sucesso!');
      await fetchSettings();
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center text-destructive">
        Erro ao carregar configurações
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Configurações de Preços</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* ========================================
          1. PREÇO BASE
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Preço Base</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Preço por noite (R$)</Label>
            <Input
              type="number"
              value={settings.basePricePerNight ? settings.basePricePerNight / 100 : ''}
              onChange={(e) => setSettings({
                ...settings,
                basePricePerNight: Math.round(parseFloat(e.target.value) * 100) || 0
              })}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Preço base da diária sem hóspedes extras
            </p>
          </div>

          <div>
            <Label>Moeda</Label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full p-2 border rounded-md"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ========================================
          2. PREÇOS DERIVADOS (HÓSPEDES EXTRAS)
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Preços Derivados</h3>
        </div>

        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Seus preços variam de acordo com o número de hóspedes? Configure quantas pessoas
            estão incluídas no preço base e quanto cobrar por pessoa adicional.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Número máximo de pessoas sem cobrança adicional</Label>
            <Input
              type="number"
              value={settings.maxGuestsIncluded}
              onChange={(e) => setSettings({
                ...settings,
                maxGuestsIncluded: parseInt(e.target.value)
              })}
              min="1"
              max="20"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Quantas pessoas estão incluídas no preço base
            </p>
          </div>

          <div>
            <Label>Taxa por pessoa adicional (R$/noite)</Label>
            <Input
              type="number"
              value={settings.extraGuestFeePerNight ? settings.extraGuestFeePerNight / 100 : ''}
              onChange={(e) => setSettings({
                ...settings,
                extraGuestFeePerNight: Math.round(parseFloat(e.target.value) * 100) || 0
              })}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valor cobrado por pessoa extra, por noite
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.chargeForChildren}
              onChange={(e) => setSettings({
                ...settings,
                chargeForChildren: e.target.checked
              })}
              className="w-4 h-4"
            />
            <Label>Cobra por crianças adicionais?</Label>
          </div>
        </div>
      </Card>

      {/* ========================================
          3. TAXA DE LIMPEZA
      ======================================== */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Taxa de Limpeza</h3>
        </div>

        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            A taxa de limpeza é cobrada <strong>uma única vez por reserva</strong>, não por dia.
            Configure se ela é repasse integral (não entra no cálculo de comissão).
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Taxa de limpeza (R$)</Label>
            <Input
              type="number"
              value={settings.cleaningFee ? settings.cleaningFee / 100 : ''}
              onChange={(e) => setSettings({
                ...settings,
                cleaningFee: Math.round(parseFloat(e.target.value) * 100) || 0
              })}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cobrada uma única vez por reserva
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cleaningFeeIsPassThrough}
              onChange={(e) => setSettings({
                ...settings,
                cleaningFeeIsPassThrough: e.target.checked
              })}
              className="w-4 h-4"
            />
            <Label>É repasse integral? (não entra na comissão)</Label>
          </div>
          
          {settings.cleaningFeeIsPassThrough && (
            <p className="text-xs text-muted-foreground">
              ✓ A taxa de limpeza será repassada integralmente ao prestador de serviço
              e não entrará no cálculo de comissão.
            </p>
          )}
        </div>
      </Card>

      {/* ========================================
          4. PREVIEW DE CÁLCULO
      ======================================== */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Preview de Cálculo</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label className="text-sm">Noites</Label>
            <Input
              type="number"
              value={previewNights}
              onChange={(e) => setPreviewNights(parseInt(e.target.value))}
              min="1"
              max="365"
              className="bg-white"
            />
          </div>
          <div>
            <Label className="text-sm">Hóspedes</Label>
            <Input
              type="number"
              value={previewGuests}
              onChange={(e) => setPreviewGuests(parseInt(e.target.value))}
              min="1"
              max="20"
              className="bg-white"
            />
          </div>
        </div>

        {calculation && !calculating ? (
          <div className="space-y-3 bg-white p-4 rounded-lg border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Diárias base ({previewNights} noites × {formatCurrency(settings.basePricePerNight)})
              </span>
              <span className="font-medium">{formatCurrency(calculation.baseTotal)}</span>
            </div>

            {calculation.extraGuestsTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Hóspedes extras ({previewGuests - settings.maxGuestsIncluded} × {formatCurrency(settings.extraGuestFeePerNight)} × {previewNights} noites)
                </span>
                <span className="font-medium text-primary">{formatCurrency(calculation.extraGuestsTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa de limpeza (1×)</span>
              <span className="font-medium">{formatCurrency(calculation.cleaningFee)}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="font-semibold">TOTAL</span>
              <span className="font-semibold text-lg text-primary">
                {formatCurrency(calculation.grandTotal)}
              </span>
            </div>

            {settings.cleaningFeeIsPassThrough && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1">Detalhamento para comissão:</p>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{formatCurrency(calculation.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Taxa de limpeza (repasse):</span>
                    <span>{formatCurrency(calculation.cleaningFee)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>= Base para comissão:</span>
                    <span>{formatCurrency(calculation.commissionBase)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            Calculando...
          </div>
        )}
      </Card>

      {/* FOOTER */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
