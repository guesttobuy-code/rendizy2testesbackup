import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type CurrencyCode = string;

type CurrencySettings = {
  default_currency: CurrencyCode;
  format_locale: string;
  additional_currencies: Array<{
    code: CurrencyCode;
    enabled_for_site: boolean;
  }>;
};

const DEFAULT_SETTINGS: CurrencySettings = {
  default_currency: 'BRL',
  format_locale: 'pt-BR',
  additional_currencies: [{ code: 'USD', enabled_for_site: true }]
};

const CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'BRL', label: 'BRL (R$)' },
  { code: 'USD', label: 'USD (US$)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'MXN', label: 'MXN ($)' },
  { code: 'ARS', label: 'ARS ($)' },
  { code: 'UYU', label: 'UYU ($)' },
  { code: 'PYG', label: 'PYG (₲)' },
  { code: 'CLP', label: 'CLP ($)' },
  { code: 'COP', label: 'COP (COP)' },
  { code: 'ZAR', label: 'ZAR (R)' },
  { code: 'XAF', label: 'XAF (F)' },
  { code: 'BWP', label: 'BWP (P)' },
  { code: 'MZN', label: 'MZN (MT)' },
  { code: 'NAD', label: 'NAD (N$)' },
  { code: 'SZL', label: 'SZL (L)' },
  { code: 'LSL', label: 'LSL (L)' },
  { code: 'AED', label: 'AED (د.إ)' },
  { code: 'PEN', label: 'PEN (S/)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'RUB', label: 'RUB (₽)' }
];

const FORMAT_LOCALES: Array<{ locale: string; label: string }> = [
  { locale: 'pt-BR', label: 'pt-BR' },
  { locale: 'en-US', label: 'en-US' }
];

function formatExample(locale: string, currency: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(123456789);
  } catch {
    return '—';
  }
}

function getFunctionHeaders(): Record<string, string> {
  const token = localStorage.getItem('rendizy-token');
  return {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    ...(token ? { 'X-Auth-Token': token } : {})
  };
}

export function CurrencySettingsCard({ organizationId }: { organizationId?: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CurrencySettings>(DEFAULT_SETTINGS);

  const formatOptions = useMemo(() => {
    return FORMAT_LOCALES.map(({ locale, label }) => {
      const example = formatExample(locale, settings.default_currency || 'BRL');
      return { locale, label: `${example} (${label})` };
    });
  }, [settings.default_currency]);

  const load = async () => {
    if (!organizationId || organizationId === 'undefined') return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/currency-settings`,
        {
          headers: getFunctionHeaders()
        }
      );

      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = (data?.error || data?.message || data?.details) as string | undefined;
        throw new Error(message || `HTTP ${response.status}`);
      }

      const next = (data.data ?? DEFAULT_SETTINGS) as CurrencySettings;
      setSettings({
        default_currency: next.default_currency || 'BRL',
        format_locale: next.format_locale || 'pt-BR',
        additional_currencies: Array.isArray(next.additional_currencies) ? next.additional_currencies : []
      });
    } catch (e: any) {
      console.error('[CurrencySettingsCard] load failed:', e);
      toast.error('Erro ao carregar moedas');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!organizationId || organizationId === 'undefined') {
      toast.error('Organização inválida');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/currency-settings`,
        {
          method: 'PUT',
          headers: {
            ...getFunctionHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        }
      );

      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = (data?.error || data?.message || data?.details) as string | undefined;
        throw new Error(message || `HTTP ${response.status}`);
      }

      toast.success('Moedas salvas com sucesso');
      const saved = (data.data ?? settings) as CurrencySettings;
      setSettings(saved);
    } catch (e: any) {
      console.error('[CurrencySettingsCard] save failed:', e);
      toast.error('Erro ao salvar moedas');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const addAdditionalCurrency = () => {
    setSettings((prev) => {
      const next = {
        ...prev,
        additional_currencies: [...(prev.additional_currencies ?? []), { code: 'USD', enabled_for_site: false }]
      };
      return next;
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-card-foreground">Moedas</CardTitle>
            <CardDescription className="text-muted-foreground">
              Configurações de moeda e formatação.
            </CardDescription>
          </div>
          <Button onClick={save} disabled={loading || saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div>
            <div className="font-medium text-sm text-foreground">Moeda padrão</div>
            <div className="text-xs text-muted-foreground">
              Usada nos relatórios do sistema, cadastro de preços e conexões com canais de venda.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Padrão</Label>
              <Select
                value={settings.default_currency}
                onValueChange={(v) => setSettings((p) => ({ ...p, default_currency: v }))}
                disabled={loading}
              >
                <SelectTrigger className="mt-1 bg-input border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-72">
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Formato</Label>
              <Select
                value={settings.format_locale}
                onValueChange={(v) => setSettings((p) => ({ ...p, format_locale: v }))}
                disabled={loading}
              >
                <SelectTrigger className="mt-1 bg-input border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {formatOptions.map((f) => (
                    <SelectItem key={f.locale} value={f.locale}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <div className="space-y-3">
          <div>
            <div className="font-medium text-sm text-foreground">Moedas adicionais</div>
            <div className="text-xs text-muted-foreground">
              Para anúncios em canais estrangeiros que exigem uma moeda específica.
            </div>
          </div>

          <div className="space-y-3">
            {(settings.additional_currencies ?? []).map((row, idx) => (
              <div key={`${row.code}_${idx}`} className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="w-full md:w-72">
                  <Select
                    value={row.code}
                    onValueChange={(v) =>
                      setSettings((p) => ({
                        ...p,
                        additional_currencies: p.additional_currencies.map((r, i) =>
                          i === idx ? { ...r, code: v } : r
                        )
                      }))
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border max-h-72">
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`enabled_for_site_${idx}`}
                    checked={row.enabled_for_site}
                    onCheckedChange={(checked) =>
                      setSettings((p) => ({
                        ...p,
                        additional_currencies: p.additional_currencies.map((r, i) =>
                          i === idx ? { ...r, enabled_for_site: checked === true } : r
                        )
                      }))
                    }
                    disabled={loading}
                  />
                  <Label htmlFor={`enabled_for_site_${idx}`} className="text-sm">
                    Ativar para o site
                  </Label>
                </div>
              </div>
            ))}

            <div>
              <Button variant="outline" onClick={addAdditionalCurrency} disabled={loading}>
                + Moeda
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
