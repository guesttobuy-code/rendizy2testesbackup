/**
 * RENDIZY - Financial Individual Pricing Step
 * 
 * Step 4 do wizard financeiro: Precificação Individual de Temporada
 * 
 * FUNCIONALIDADES:
 * - Preço base por noite
 * - Períodos sazonais com preços específicos
 * - Descontos por permanência (semanal, mensal)
 * - Preços por dia da semana
 * - Datas especiais (feriados, eventos)
 * - Preview de calendário
 * - Modo Global vs Individual
 * 
 * @version 1.0.103.131
 * @date 2025-10-30
 */

import { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Percent,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Info,
  AlertCircle,
  Sun,
  Snowflake,
  Palmtree,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// ============================================================================
// TYPES
// ============================================================================

interface SeasonalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  minNights: number;
  color: string;
  icon: any;
}

interface WeekdayPricing {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

interface SpecialDate {
  id: string;
  name: string;
  date: string;
  pricePerNight: number;
  minNights: number;
}

interface FinancialIndividualPricingData {
  // Modo
  pricingMode: 'global' | 'individual';
  
  // Preço Base
  basePricePerNight: number;
  currency: string;
  
  // Descontos por Permanência
  enableStayDiscounts: boolean;
  weeklyDiscount: number; // Percentual
  monthlyDiscount: number; // Percentual
  
  // Períodos Sazonais
  enableSeasonalPricing: boolean;
  seasonalPeriods: SeasonalPeriod[];
  
  // Preços por Dia da Semana
  enableWeekdayPricing: boolean;
  weekdayPricing: WeekdayPricing;
  
  // Datas Especiais
  enableSpecialDates: boolean;
  specialDates: SpecialDate[];
}

interface FinancialIndividualPricingStepProps {
  data: FinancialIndividualPricingData;
  onChange: (data: FinancialIndividualPricingData) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CURRENCIES = [
  { value: 'BRL', label: 'Real Brasileiro (R$)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar Americano ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'Libra Esterlina (£)', symbol: '£' },
];

const WEEKDAYS = [
  { key: 'monday', label: 'Seg', fullLabel: 'Segunda-feira' },
  { key: 'tuesday', label: 'Ter', fullLabel: 'Terça-feira' },
  { key: 'wednesday', label: 'Qua', fullLabel: 'Quarta-feira' },
  { key: 'thursday', label: 'Qui', fullLabel: 'Quinta-feira' },
  { key: 'friday', label: 'Sex', fullLabel: 'Sexta-feira' },
  { key: 'saturday', label: 'Sáb', fullLabel: 'Sábado' },
  { key: 'sunday', label: 'Dom', fullLabel: 'Domingo' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FinancialIndividualPricingStep({
  data,
  onChange,
}: FinancialIndividualPricingStepProps) {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFieldChange = (field: keyof FinancialIndividualPricingData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const addSeasonalPeriod = () => {
    const newPeriod: SeasonalPeriod = {
      id: `season_${Date.now()}`,
      name: 'Nova Temporada',
      startDate: '',
      endDate: '',
      pricePerNight: data.basePricePerNight || 0,
      minNights: 1,
      color: 'blue',
      icon: Sun,
    };

    handleFieldChange('seasonalPeriods', [...(data.seasonalPeriods || []), newPeriod]);
  };

  const updateSeasonalPeriod = (id: string, field: keyof SeasonalPeriod, value: any) => {
    const updated = (data.seasonalPeriods || []).map((period) =>
      period.id === id ? { ...period, [field]: value } : period
    );
    handleFieldChange('seasonalPeriods', updated);
  };

  const removeSeasonalPeriod = (id: string) => {
    const filtered = (data.seasonalPeriods || []).filter((period) => period.id !== id);
    handleFieldChange('seasonalPeriods', filtered);
  };

  const addSpecialDate = () => {
    const newDate: SpecialDate = {
      id: `special_${Date.now()}`,
      name: 'Data Especial',
      date: '',
      pricePerNight: (data.basePricePerNight || 0) * 1.5,
      minNights: 1,
    };

    handleFieldChange('specialDates', [...(data.specialDates || []), newDate]);
  };

  const updateSpecialDate = (id: string, field: keyof SpecialDate, value: any) => {
    const updated = (data.specialDates || []).map((date) =>
      date.id === id ? { ...date, [field]: value } : date
    );
    handleFieldChange('specialDates', updated);
  };

  const removeSpecialDate = (id: string) => {
    const filtered = (data.specialDates || []).filter((date) => date.id !== id);
    handleFieldChange('specialDates', filtered);
  };

  const updateWeekdayPrice = (day: keyof WeekdayPricing, value: number) => {
    handleFieldChange('weekdayPricing', {
      ...(data.weekdayPricing || {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      }),
      [day]: value,
    });
  };

  const getCurrencySymbol = () => {
    return CURRENCIES.find((c) => c.value === data.currency)?.symbol || 'R$';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Configure os preços de diárias para este anúncio específico. Você pode definir
          preços sazonais, descontos por permanência e valores especiais para fins de
          semana e feriados.
        </AlertDescription>
      </Alert>

      {/* Modo: Global vs Individual */}
      <Card className="border-l-4 border-purple-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Modo de Precificação</CardTitle>
              <CardDescription className="text-xs mt-1">
                Use configurações globais ou defina preços individuais
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            <Button
              type="button"
              size="sm"
              variant={data.pricingMode === 'global' ? 'default' : 'ghost'}
              className={`
                px-4 py-1 text-xs transition-all
                ${
                  data.pricingMode === 'global'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }
              `}
              onClick={() => handleFieldChange('pricingMode', 'global')}
            >
              Global
            </Button>
            <Button
              type="button"
              size="sm"
              variant={data.pricingMode === 'individual' ? 'default' : 'ghost'}
              className={`
                px-4 py-1 text-xs transition-all
                ${
                  data.pricingMode === 'individual'
                    ? 'bg-pink-600 text-white hover:bg-pink-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }
              `}
              onClick={() => handleFieldChange('pricingMode', 'individual')}
            >
              Individual
            </Button>
          </div>

          {data.pricingMode === 'global' && (
            <div className="mt-4 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Este anúncio herdará as configurações de preço globais. Para personalizar,
                  selecione "Individual".
                </AlertDescription>
              </Alert>

              {/* Preview das configurações globais */}
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-sm">Configurações Globais Aplicadas</CardTitle>
                  <CardDescription className="text-xs">
                    Este anúncio usará as seguintes configurações definidas globalmente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Preço base por noite</span>
                    <Badge variant="secondary" className="text-xs">
                      Configuração Global
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Períodos sazonais</span>
                    <Badge variant="secondary" className="text-xs">
                      Configuração Global
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Descontos por permanência</span>
                    <Badge variant="secondary" className="text-xs">
                      Configuração Global
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-muted-foreground">Datas especiais</span>
                    <Badge variant="secondary" className="text-xs">
                      Configuração Global
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* CTA para configurações globais */}
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <strong>Gerenciar configurações globais:</strong> Acesse Configurações → Precificação
                  para definir os preços padrão que serão aplicados a todos os anúncios configurados
                  como "Global".
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conteúdo Individual */}
      {data.pricingMode === 'individual' && (
        <>
          {/* 1. PREÇO BASE */}
          <Card className="border-l-4 border-green-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Preço Base</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Valor padrão da diária fora de períodos especiais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Moeda */}
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select
                  value={data.currency}
                  onValueChange={(value) => handleFieldChange('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preço */}
              <div className="space-y-2">
                <Label>Preço por Noite</Label>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-green-50 border-r border-border">
                    <span className="text-sm font-medium text-green-700">
                      {getCurrencySymbol()}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.basePricePerNight || ''}
                    onChange={(e) =>
                      handleFieldChange('basePricePerNight', parseFloat(e.target.value) || 0)
                    }
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. DESCONTOS POR PERMANÊNCIA */}
          <Card className="border-l-4 border-orange-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Percent className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Descontos por Permanência</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Incentive estadias mais longas
                  </CardDescription>
                </div>
                <Switch
                  checked={data.enableStayDiscounts}
                  onCheckedChange={(checked) =>
                    handleFieldChange('enableStayDiscounts', checked)
                  }
                />
              </div>
            </CardHeader>

            {data.enableStayDiscounts && (
              <CardContent className="space-y-4">
                {/* Desconto Semanal */}
                <div className="space-y-2">
                  <Label>Desconto Semanal (7+ noites)</Label>
                  <div className="flex items-center border rounded-lg overflow-hidden max-w-xs">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={data.weeklyDiscount || ''}
                      onChange={(e) =>
                        handleFieldChange('weeklyDiscount', parseFloat(e.target.value) || 0)
                      }
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="0"
                    />
                    <div className="px-3 py-2 bg-orange-50 border-l border-border">
                      <span className="text-sm font-medium text-orange-700">%</span>
                    </div>
                  </div>
                </div>

                {/* Desconto Mensal */}
                <div className="space-y-2">
                  <Label>Desconto Mensal (30+ noites)</Label>
                  <div className="flex items-center border rounded-lg overflow-hidden max-w-xs">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={data.monthlyDiscount || ''}
                      onChange={(e) =>
                        handleFieldChange('monthlyDiscount', parseFloat(e.target.value) || 0)
                      }
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="0"
                    />
                    <div className="px-3 py-2 bg-orange-50 border-l border-border">
                      <span className="text-sm font-medium text-orange-700">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 3. PERÍODOS SAZONAIS */}
          <Card className="border-l-4 border-blue-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Períodos Sazonais</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Defina preços para alta e baixa temporada
                  </CardDescription>
                </div>
                <Switch
                  checked={data.enableSeasonalPricing}
                  onCheckedChange={(checked) =>
                    handleFieldChange('enableSeasonalPricing', checked)
                  }
                />
              </div>
            </CardHeader>

            {data.enableSeasonalPricing && (
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSeasonalPeriod}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Período Sazonal
                </Button>

                {(!data.seasonalPeriods || data.seasonalPeriods.length === 0) && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Nenhum período sazonal configurado. Clique em "Adicionar" para criar o
                      primeiro.
                    </AlertDescription>
                  </Alert>
                )}

                {data.seasonalPeriods && data.seasonalPeriods.map((period) => (
                  <div
                    key={period.id}
                    className="p-4 border rounded-lg bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Input
                        value={period.name || ''}
                        onChange={(e) =>
                          updateSeasonalPeriod(period.id, 'name', e.target.value)
                        }
                        placeholder="Nome da temporada"
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSeasonalPeriod(period.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Data Início</Label>
                        <Input
                          type="date"
                          value={period.startDate || ''}
                          onChange={(e) =>
                            updateSeasonalPeriod(period.id, 'startDate', e.target.value)
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data Fim</Label>
                        <Input
                          type="date"
                          value={period.endDate || ''}
                          onChange={(e) =>
                            updateSeasonalPeriod(period.id, 'endDate', e.target.value)
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Preço por Noite</Label>
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <div className="px-2 py-1 bg-blue-50 border-r border-border text-xs">
                            {getCurrencySymbol()}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={period.pricePerNight || ''}
                            onChange={(e) =>
                              updateSeasonalPeriod(
                                period.id,
                                'pricePerNight',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="border-0 text-xs"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Mín. Noites</Label>
                        <Input
                          type="number"
                          min="1"
                          value={period.minNights}
                          onChange={(e) =>
                            updateSeasonalPeriod(
                              period.id,
                              'minNights',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* 4. PREÇOS POR DIA DA SEMANA */}
          <Card className="border-l-4 border-indigo-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Preços por Dia da Semana</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Valores diferenciados para cada dia
                  </CardDescription>
                </div>
                <Switch
                  checked={data.enableWeekdayPricing}
                  onCheckedChange={(checked) =>
                    handleFieldChange('enableWeekdayPricing', checked)
                  }
                />
              </div>
            </CardHeader>

            {data.enableWeekdayPricing && (
              <CardContent className="space-y-3">
                {WEEKDAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-3">
                    <Label className="w-24 text-sm">{day.fullLabel}</Label>
                    <div className="flex items-center border rounded-lg overflow-hidden flex-1 max-w-xs">
                      <div className="px-3 py-2 bg-indigo-50 border-r border-border">
                        <span className="text-sm font-medium text-indigo-700">
                          {getCurrencySymbol()}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.weekdayPricing?.[day.key as keyof WeekdayPricing] || ''}
                        onChange={(e) =>
                          updateWeekdayPrice(
                            day.key as keyof WeekdayPricing,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* 5. DATAS ESPECIAIS */}
          <Card className="border-l-4 border-yellow-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Datas Especiais</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Feriados, eventos e datas comemorativas
                  </CardDescription>
                </div>
                <Switch
                  checked={data.enableSpecialDates}
                  onCheckedChange={(checked) => handleFieldChange('enableSpecialDates', checked)}
                />
              </div>
            </CardHeader>

            {data.enableSpecialDates && (
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSpecialDate}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Data Especial
                </Button>

                {data.specialDates && data.specialDates.map((specialDate) => (
                  <div
                    key={specialDate.id}
                    className="p-4 border rounded-lg bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Input
                        value={specialDate.name || ''}
                        onChange={(e) =>
                          updateSpecialDate(specialDate.id, 'name', e.target.value)
                        }
                        placeholder="Ex: Réveillon, Carnaval..."
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeSpecialDate(specialDate.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Data</Label>
                        <Input
                          type="date"
                          value={specialDate.date || ''}
                          onChange={(e) =>
                            updateSpecialDate(specialDate.id, 'date', e.target.value)
                          }
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Preço por Noite</Label>
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <div className="px-2 py-1 bg-yellow-50 border-r border-border text-xs">
                            {getCurrencySymbol()}
                          </div>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={specialDate.pricePerNight || ''}
                            onChange={(e) =>
                              updateSpecialDate(
                                specialDate.id,
                                'pricePerNight',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="border-0 text-xs"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Mín. Noites</Label>
                        <Input
                          type="number"
                          min="1"
                          value={specialDate.minNights}
                          onChange={(e) =>
                            updateSpecialDate(
                              specialDate.id,
                              'minNights',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Help */}
      {data.pricingMode === 'individual' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Dica:</strong> A ordem de prioridade é: Datas Especiais → Períodos Sazonais
            → Dia da Semana → Preço Base. Configure primeiro o preço base e depois os ajustes
            sazonais.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default FinancialIndividualPricingStep;
