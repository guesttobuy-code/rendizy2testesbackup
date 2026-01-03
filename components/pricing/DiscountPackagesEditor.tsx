import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export type DiscountPackagePreset = 'weekly' | 'monthly' | 'custom';

export type DiscountPackageRule = {
  id: string;
  preset: DiscountPackagePreset;
  min_nights: number;
  discount_percent: number;
};

export type DiscountPackagesSettings = {
  rules: DiscountPackageRule[];
};

export const DEFAULT_DISCOUNT_PACKAGES_SETTINGS: DiscountPackagesSettings = {
  rules: [
    { id: 'weekly', preset: 'weekly', min_nights: 7, discount_percent: 2 },
    { id: 'custom_15', preset: 'custom', min_nights: 15, discount_percent: 4 },
    { id: 'monthly', preset: 'monthly', min_nights: 28, discount_percent: 12 }
  ]
};

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

export function normalizeDiscountPackagesSettings(settings: DiscountPackagesSettings): DiscountPackagesSettings {
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

export function DiscountPackagesEditor(props: {
  value: DiscountPackagesSettings;
  onChange: (next: DiscountPackagesSettings) => void;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;

  const rules = useMemo(() => normalizeDiscountPackagesSettings(value).rules, [value]);

  const updateRule = (id: string, patch: Partial<DiscountPackageRule>) => {
    onChange({
      rules: rules.map((r) => {
        if (r.id !== id) return r;
        const next: DiscountPackageRule = { ...r, ...patch } as any;

        if (next.preset === 'weekly') next.min_nights = 7;
        if (next.preset === 'monthly') next.min_nights = 28;
        if (next.preset === 'custom') next.min_nights = Math.max(1, Math.round(Number(next.min_nights || 1)));

        next.discount_percent = Math.min(100, Math.max(0, Number(next.discount_percent || 0)));

        return next;
      })
    });
  };

  const removeRule = (id: string) => {
    onChange({ rules: rules.filter((r) => r.id !== id) });
  };

  const addRule = () => {
    onChange({
      rules: [
        ...rules,
        {
          id: crypto.randomUUID(),
          preset: 'custom',
          min_nights: 1,
          discount_percent: 0
        }
      ]
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
        <div>Tipo</div>
        <div>Noites</div>
        <div>Desconto (%)</div>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const preset = rule.preset;
          const nightsDisabled = preset === 'weekly' || preset === 'monthly';
          const isPresetFixed = preset === 'weekly' || preset === 'monthly';

          return (
            <div key={rule.id} className="grid grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={rule.preset}
                  onValueChange={(v) => updateRule(rule.id, { preset: coercePreset(v), min_nights: defaultMinNights(coercePreset(v)) })}
                  disabled={disabled || isPresetFixed}
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
                  disabled={disabled || nightsDisabled}
                  onChange={(e) => {
                    const v = parseNonNegativeNumber(e.target.value);
                    updateRule(rule.id, { min_nights: Math.max(1, Math.round(v)) });
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
                    disabled={disabled}
                    onChange={(e) => {
                      const v = parseNonNegativeNumber(e.target.value);
                      updateRule(rule.id, { discount_percent: Math.min(100, Math.max(0, v)) });
                    }}
                    className="mt-1 bg-input border-border"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3"
                  disabled={disabled || isPresetFixed}
                  onClick={() => removeRule(rule.id)}
                >
                  Remover
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" onClick={addRule} disabled={disabled}>
        + Adicionar regra
      </Button>
    </div>
  );
}
