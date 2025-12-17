/**
 * RENDIZY - Financial Derived Pricing Step
 * 
 * Step 5 do wizard financeiro: Preços Derivados (Hóspedes Adicionais)
 * 
 * FUNCIONALIDADES:
 * - Preços por número de hóspedes
 * - Toggle Porcentagem/Valor Fixo
 * - Taxas para crianças por faixa etária
 * - Sistema dinâmico de faixas etárias
 * - Cálculo: Por noite vs Única
 * - Preview de cálculo de preços
 * - Auto-save automático
 * 
 * @version 1.0.103.130
 * @date 2025-10-30
 */

import { useState } from 'react';
import {
  Users,
  DollarSign,
  Percent,
  Baby,
  Calculator,
  Plus,
  Trash2,
  Info,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface AgeBracket {
  id: string;
  minAge: number;
  maxAge: number;
  fee: number;
}

interface FinancialDerivedPricingData {
  // Preços por Hóspedes
  pricesVaryByGuests: boolean;
  maxGuestsIncluded: number;
  extraGuestFeeType: 'percentage' | 'fixed';
  extraGuestFeeValue: number;
  
  // Taxas para Crianças
  chargeForChildren: boolean;
  childrenChargeType: 'per_night' | 'one_time';
  ageBrackets: AgeBracket[];
}

interface FinancialDerivedPricingStepProps {
  data: FinancialDerivedPricingData;
  onChange: (data: FinancialDerivedPricingData) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FinancialDerivedPricingStep({
  data,
  onChange,
}: FinancialDerivedPricingStepProps) {
  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFieldChange = (field: keyof FinancialDerivedPricingData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const addAgeBracket = () => {
    const newBracket: AgeBracket = {
      id: `bracket_${Date.now()}`,
      minAge: 0,
      maxAge: 12,
      fee: 0,
    };
    
    handleFieldChange('ageBrackets', [...data.ageBrackets, newBracket]);
  };

  const updateAgeBracket = (id: string, field: keyof AgeBracket, value: any) => {
    const updated = data.ageBrackets.map((bracket) =>
      bracket.id === id ? { ...bracket, [field]: value } : bracket
    );
    handleFieldChange('ageBrackets', updated);
  };

  const removeAgeBracket = (id: string) => {
    const filtered = data.ageBrackets.filter((bracket) => bracket.id !== id);
    handleFieldChange('ageBrackets', filtered);
  };

  // ============================================================================
  // PREVIEW CALCULATION
  // ============================================================================

  const calculatePreview = () => {
    const basePrice = 200; // Exemplo
    let total = basePrice;
    
    // Hóspedes extras
    if (data.pricesVaryByGuests && data.extraGuestFeeValue > 0) {
      const extraGuests = Math.max(0, 4 - data.maxGuestsIncluded); // Exemplo: 4 hóspedes
      
      if (data.extraGuestFeeType === 'percentage') {
        total += basePrice * (data.extraGuestFeeValue / 100) * extraGuests;
      } else {
        total += data.extraGuestFeeValue * extraGuests;
      }
    }
    
    // Crianças
    if (data.chargeForChildren && data.ageBrackets.length > 0) {
      const childrenCount = 2; // Exemplo: 2 crianças
      const bracket = data.ageBrackets[0]; // Primeira faixa
      
      if (bracket) {
        if (data.childrenChargeType === 'per_night') {
          total += bracket.fee * childrenCount;
        } else {
          total += bracket.fee * childrenCount;
        }
      }
    }
    
    return {
      basePrice,
      total,
      extras: total - basePrice,
    };
  };

  const preview = calculatePreview();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Configure como o preço varia de acordo com o número de hóspedes e a idade de
          crianças. Defina faixas etárias personalizadas com valores específicos.
        </AlertDescription>
      </Alert>

      {/* 1. PREÇOS POR NÚMERO DE HÓSPEDES */}
      <Card className="border-l-4 border-blue-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">
                Preços por Número de Hóspedes
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Configure taxas para hóspedes adicionais
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Toggle Principal */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Seus preços variam de acordo com o número de hóspedes?
              </Label>
              <p className="text-xs text-muted-foreground">
                Ative para cobrar valores adicionais por hóspede extra
              </p>
            </div>
            <Switch
              checked={data.pricesVaryByGuests}
              onCheckedChange={(checked) => handleFieldChange('pricesVaryByGuests', checked)}
            />
          </div>

          {/* Configurações (somente se ativado) */}
          {data.pricesVaryByGuests && (
            <div className="space-y-4 pt-2">
              <Separator />

              {/* Número máximo incluído */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Número máximo de pessoas incluídas no preço base
                  <span className="ml-2 text-xs text-muted-foreground">
                    A partir de quantas pessoas cobra adicional?
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={data.maxGuestsIncluded}
                  onChange={(e) =>
                    handleFieldChange('maxGuestsIncluded', parseInt(e.target.value) || 1)
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Exemplo: Se colocar 2, a partir do 3º hóspede será cobrado adicional
                </p>
              </div>

              {/* Tipo de Cobrança */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Cobrança</Label>
                
                <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={data.extraGuestFeeType === 'fixed' ? 'default' : 'ghost'}
                    className={`
                      px-4 py-1 text-xs transition-all
                      ${
                        data.extraGuestFeeType === 'fixed'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                      }
                    `}
                    onClick={() => handleFieldChange('extraGuestFeeType', 'fixed')}
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Valor Fixo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={data.extraGuestFeeType === 'percentage' ? 'default' : 'ghost'}
                    className={`
                      px-4 py-1 text-xs transition-all
                      ${
                        data.extraGuestFeeType === 'percentage'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                      }
                    `}
                    onClick={() => handleFieldChange('extraGuestFeeType', 'percentage')}
                  >
                    <Percent className="h-3 w-3 mr-1" />
                    Porcentagem
                  </Button>
                </div>
              </div>

              {/* Valor Adicional */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {data.extraGuestFeeType === 'percentage'
                    ? 'Porcentagem adicional por pessoa extra'
                    : 'Valor adicional por pessoa extra'}
                </Label>
                <div className="flex items-center gap-2">
                  {data.extraGuestFeeType === 'percentage' ? (
                    <div className="flex items-center border rounded-lg overflow-hidden max-w-xs">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={data.extraGuestFeeValue || ''}
                        onChange={(e) =>
                          handleFieldChange('extraGuestFeeValue', parseFloat(e.target.value) || 0)
                        }
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="0"
                      />
                      <div className="px-3 py-2 bg-green-50 border-l border-border">
                        <span className="text-sm font-medium text-green-700">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center border rounded-lg overflow-hidden max-w-xs">
                      <div className="px-3 py-2 bg-blue-50 border-r border-border">
                        <span className="text-sm font-medium text-blue-700">R$</span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.extraGuestFeeValue || ''}
                        onChange={(e) =>
                          handleFieldChange('extraGuestFeeValue', parseFloat(e.target.value) || 0)
                        }
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.extraGuestFeeType === 'percentage'
                    ? 'Percentual sobre o preço base, por noite'
                    : 'Valor cobrado por pessoa extra, por noite'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. TAXAS PARA CRIANÇAS */}
      <Card className="border-l-4 border-purple-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Baby className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Taxas para Crianças</CardTitle>
              <CardDescription className="text-xs mt-1">
                Configure cobranças por faixa etária
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Toggle Principal */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Você cobra por crianças adicionais?</Label>
              <p className="text-xs text-muted-foreground">
                Defina faixas etárias com valores específicos
              </p>
            </div>
            <Switch
              checked={data.chargeForChildren}
              onCheckedChange={(checked) => handleFieldChange('chargeForChildren', checked)}
            />
          </div>

          {/* Configurações (somente se ativado) */}
          {data.chargeForChildren && (
            <div className="space-y-4 pt-2">
              <Separator />

              {/* Tipo de Cobrança */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Cobrança</Label>
                <Tabs
                  value={data.childrenChargeType}
                  onValueChange={(value) =>
                    handleFieldChange('childrenChargeType', value as 'per_night' | 'one_time')
                  }
                >
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="per_night" className="text-xs">
                      Por criança e por noite
                    </TabsTrigger>
                    <TabsTrigger value="one_time" className="text-xs">
                      Por criança (única)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Faixas Etárias */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Faixas Etárias</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addAgeBracket}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Faixa
                  </Button>
                </div>

                {data.ageBrackets.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Nenhuma faixa etária configurada. Clique em "Adicionar Faixa" para criar
                      a primeira faixa.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Lista de Faixas */}
                <div className="space-y-3">
                  {data.ageBrackets.map((bracket, index) => (
                    <div
                      key={bracket.id}
                      className="p-4 border rounded-lg bg-muted/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          Faixa {index + 1}
                        </Badge>
                        {data.ageBrackets.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAgeBracket(bracket.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Idade Mínima */}
                        <div className="space-y-1">
                          <Label className="text-xs">Idade Mín.</Label>
                          <Input
                            type="number"
                            min="0"
                            max="17"
                            value={bracket.minAge}
                            onChange={(e) =>
                              updateAgeBracket(
                                bracket.id,
                                'minAge',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="text-xs"
                          />
                        </div>

                        {/* Idade Máxima */}
                        <div className="space-y-1">
                          <Label className="text-xs">Idade Máx.</Label>
                          <Input
                            type="number"
                            min="0"
                            max="17"
                            value={bracket.maxAge}
                            onChange={(e) =>
                              updateAgeBracket(
                                bracket.id,
                                'maxAge',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="text-xs"
                          />
                        </div>

                        {/* Valor */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Valor (R$)
                            {data.childrenChargeType === 'per_night' && '/noite'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={bracket.fee || ''}
                            onChange={(e) =>
                              updateAgeBracket(
                                bracket.id,
                                'fee',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="text-xs"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Crianças de {bracket.minAge} a {bracket.maxAge} anos: R${' '}
                        {bracket.fee.toFixed(2)}
                        {data.childrenChargeType === 'per_night' ? ' por noite' : ' taxa única'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. PREVIEW DE CÁLCULO */}
      <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Calculator className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Preview de Cálculo</CardTitle>
              <CardDescription className="text-xs mt-1">
                Simulação: 4 adultos + 2 crianças por 1 noite
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2 p-4 bg-white/80 rounded-lg border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preço Base</span>
              <span className="font-medium">R$ {preview.basePrice.toFixed(2)}</span>
            </div>

            {data.pricesVaryByGuests && data.extraGuestFeeValue > 0 && (
              <div className="flex items-center justify-between text-sm text-blue-600">
                <span>Hóspedes Extras</span>
                <span>
                  +R${' '}
                  {(
                    preview.extras - (data.chargeForChildren ? preview.extras / 2 : 0)
                  ).toFixed(2)}
                </span>
              </div>
            )}

            {data.chargeForChildren && data.ageBrackets.length > 0 && (
              <div className="flex items-center justify-between text-sm text-purple-600">
                <span>Crianças</span>
                <span>
                  +R${' '}
                  {(data.chargeForChildren ? preview.extras / 2 : 0).toFixed(2)}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg text-green-600">R$ {preview.total.toFixed(2)}</span>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Atenção:</strong> Este é apenas um exemplo. Os valores reais serão
              calculados com base no preço configurado e número de hóspedes de cada reserva.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Footer Help */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Dica:</strong> Configure faixas etárias realistas. Por exemplo: 0-2 anos
          (bebês grátis), 3-12 anos (50% do valor), 13+ anos (valor integral).
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default FinancialDerivedPricingStep;
