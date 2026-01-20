import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type DiscountPackagePreset = 'weekly' | 'monthly' | 'custom';

type DiscountPackageRule = {
  id: string;
  preset: DiscountPackagePreset;
  min_nights: number;
  discount_percent: number;
};

type DiscountPackagesSettings = {
  rules: DiscountPackageRule[];
};

const DEFAULT_SETTINGS: DiscountPackagesSettings = {
  rules: [
    { id: 'weekly', preset: 'weekly', min_nights: 7, discount_percent: 2 },
    { id: 'custom_15', preset: 'custom', min_nights: 15, discount_percent: 4 },
    { id: 'monthly', preset: 'monthly', min_nights: 28, discount_percent: 12 }
  ]
};

function getFunctionHeaders(): Record<string, string> {
  const token = localStorage.getItem('rendizy-token');
  return {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    ...(token ? { 'X-Auth-Token': token } : {})
  };
}

function coercePreset(preset: string): DiscountPackagePreset {
  if (preset === 'weekly' || preset === 'monthly' || preset === 'custom') return preset;
  return 'custom';
}

function defaultMinNights(preset: DiscountPackagePreset) {
  if (preset === 'weekly') return 7;
  if (preset === 'monthly') return 28;
  return 1;
}

function parseNonNegativeNumber(input: string): number {
  const cleaned = String(input ?? '').replace(',', '.').replace(/[^0-9.]/g, '');
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function normalizeForSave(settings: DiscountPackagesSettings): DiscountPackagesSettings {
  const rules = (settings.rules || []).map((r) => {
    const preset = coercePreset(String(r.preset));
    const minNights = preset === 'weekly' ? 7 : preset === 'monthly' ? 28 : Math.max(1, Math.round(Number(r.min_nights || 0)));
    const pctRaw = Number(r.discount_percent);
    const discountPercent = Number.isFinite(pctRaw) ? Math.min(100, Math.max(0, pctRaw)) : 0;
    return {
      id: String(r.id || crypto.randomUUID()),
      preset,
      min_nights: minNights,
      discount_percent: discountPercent
    };
  });

  rules.sort((a, b) => a.min_nights - b.min_nights);

  return { rules };
}

export function DiscountPackagesSettingsCard({ organizationId }: { organizationId?: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DiscountPackagesSettings>(DEFAULT_SETTINGS);

  const endpoint = useMemo(() => {
    if (!organizationId || organizationId === 'undefined') return undefined;
    return `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/discount-packages`;
  }, [organizationId]);

  const load = async () => {
    if (!endpoint) return;

    setLoading(true);
    try {
      const response = await fetch(endpoint, { headers: getFunctionHeaders() });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        const message = (data?.error || data?.message || data?.details) as string | undefined;
        throw new Error(message || `HTTP ${response.status}`);
      }

      const next = (data.settings ?? DEFAULT_SETTINGS) as DiscountPackagesSettings;
      setSettings(normalizeForSave(next));
    } catch (e: any) {
      console.error('[DiscountPackagesSettingsCard] load failed:', e);
      toast.error('Erro ao carregar descontos');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!endpoint) {
      toast.error('Organização inválida');
      return;
    }

    setSaving(true);
    try {
      const payload = normalizeForSave(settings);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          ...getFunctionHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: payload })
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = (data?.error || data?.message || data?.details) as string | undefined;
        throw new Error(message || `HTTP ${response.status}`);
      }

      const saved = (data.settings ?? payload) as DiscountPackagesSettings;
      setSettings(normalizeForSave(saved));
      toast.success('Descontos salvos com sucesso');
    } catch (e: any) {
      console.error('[DiscountPackagesSettingsCard] save failed:', e);
      toast.error('Erro ao salvar descontos');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationId]);

  const updateRule = (id: string, patch: Partial<DiscountPackageRule>) => {
    setSettings((prev) => {
      const rules = (prev.rules || []).map((r) => {
        if (r.id !== id) return r;
        const next: DiscountPackageRule = { ...r, ...patch } as any;

        if (next.preset === 'weekly') next.min_nights = 7;
        if (next.preset === 'monthly') next.min_nights = 28;
        if (next.preset === 'custom') next.min_nights = Math.max(1, Math.round(Number(next.min_nights || 1)));

        next.discount_percent = Math.min(100, Math.max(0, Number(next.discount_percent || 0)));

        return next;
      });
      return { ...prev, rules };
    });
  };

  const removeRule = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      rules: (prev.rules || []).filter((r) => r.id !== id)
    }));
  };

  const addRule = () => {
    setSettings((prev) => ({
      ...prev,
      rules: [
        ...(prev.rules || []),
        {
          id: crypto.randomUUID(),
          preset: 'custom',
          min_nights: 1,
          discount_percent: 0
        }
      ]
    }));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-card-foreground">Descontos por pacote de dias</CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure descontos por quantidade de noites (Semanal 07, Mensal 28 e personalizados).
            </CardDescription>
          </div>
          <Button onClick={save} disabled={loading || saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div>Tipo</div>
          <div>Noites</div>
          <div>Desconto (%)</div>
        </div>

        <Separator />

        <div className="space-y-3">
          {(settings.rules || []).map((rule) => {
            const preset = rule.preset;
            const nightsDisabled = preset === 'weekly' || preset === 'monthly';

            return (
              <div key={rule.id} className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={rule.preset}
                    onValueChange={(v) => updateRule(rule.id, { preset: coercePreset(v), min_nights: defaultMinNights(coercePreset(v)) })}
                    disabled={loading}
                  >
                    <SelectTrigger className="mt-1 bg-input border-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Noites</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder={String(defaultMinNights(preset))}
                    value={String(rule.min_nights ?? '')}
                    disabled={loading || nightsDisabled}
                    onChange={(e) => {
                      const value = parseNonNegativeNumber(e.target.value);
                      updateRule(rule.id, { min_nights: Math.max(1, Math.round(value)) });
                    }}
                    className="mt-1 bg-input border-border"
                  />
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Desconto (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={String(rule.discount_percent ?? '')}
                      disabled={loading}
                      onChange={(e) => {
                        const value = parseNonNegativeNumber(e.target.value);
                        updateRule(rule.id, { discount_percent: Math.min(100, value) });
                      }}
                      className="mt-1 bg-input border-border"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => removeRule(rule.id)}
                    className="h-9"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Button type="button" variant="outline" onClick={addRule} disabled={loading}>
            Definir desconto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
