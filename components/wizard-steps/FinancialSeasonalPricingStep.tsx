/**
 * RENDIZY - Financial Seasonal Pricing Step
 * 
 * Step 3 do wizard financeiro: Configuração de Preço Temporada
 * 
 * FUNCIONALIDADES:
 * - Configuração de moeda e região
 * - Política de descontos por estadia
 * - Depósitos e cauções
 * - Regras de precificação dinâmica
 * - Taxas de serviço (limpeza, pet, etc)
 * - Toggle Global/Individual por seção
 * - Acordeões expansíveis
 * - Auto-save automático
 * 
 * @version 1.0.103.125
 * @date 2025-10-30
 */

import { useState } from 'react';
import {
  DollarSign,
  Globe,
  Percent,
  Shield,
  Sparkles,
  Receipt,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface FinancialSeasonalPricingData {
  // Configuração Base
  configMode: 'individual' | 'global';
  region: 'global' | 'custom';
  currency: string;
  
  // Política de Descontos
  discountPolicy: 'global' | 'individual';
  longStayDiscount: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  
  // Depósitos e Garantias
  depositMode: 'global' | 'individual';
  depositAmount: number;
  depositCurrency: string;
  
  // Precificação Dinâmica
  dynamicPricingMode: 'global' | 'individual';
  enableDynamicPricing: boolean;
  
  // Taxas de Serviço
  feesMode: 'global' | 'individual';
  cleaningFee: number;
  cleaningFeePaidBy: 'guest' | 'owner' | 'shared';
  petFee: number;
  petFeePaidBy: 'guest' | 'owner' | 'shared';
  extraServicesFee: number;
  extraServicesFeePaidBy: 'guest' | 'owner' | 'shared';
}

interface FinancialSeasonalPricingStepProps {
  data: FinancialSeasonalPricingData;
  onChange: (data: FinancialSeasonalPricingData) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRENCIES = [
  { value: 'BRL', label: 'BRL (R$)', symbol: 'R$' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
];

const REGIONS = [
  { value: 'global', label: 'Padrão Global' },
  { value: 'br-south', label: 'Brasil - Sul' },
  { value: 'br-southeast', label: 'Brasil - Sudeste' },
  { value: 'br-northeast', label: 'Brasil - Nordeste' },
  { value: 'br-north', label: 'Brasil - Norte' },
  { value: 'br-midwest', label: 'Brasil - Centro-Oeste' },
];

const PAID_BY_OPTIONS = [
  { value: 'guest', label: 'Hóspede' },
  { value: 'owner', label: 'Proprietário' },
  { value: 'shared', label: 'Compartilhado' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FinancialSeasonalPricingStep({
  data,
  onChange,
}: FinancialSeasonalPricingStepProps) {
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['config', 'fees']) // Abrir Config e Taxas por padrão
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFieldChange = (field: keyof FinancialSeasonalPricingData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const isSectionExpanded = (sectionId: string) => {
    return expandedSections.has(sectionId);
  };

  // ============================================================================
  // TOGGLE COMPONENT
  // ============================================================================

  const GlobalIndividualToggle = ({
    value,
    onChange,
    disabled = false,
  }: {
    value: 'global' | 'individual';
    onChange: (value: 'global' | 'individual') => void;
    disabled?: boolean;
  }) => (
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
      <Button
        type="button"
        size="sm"
        variant={value === 'global' ? 'default' : 'ghost'}
        className={`
          px-4 py-1 text-xs transition-all
          ${
            value === 'global'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
          }
        `}
        onClick={() => onChange('global')}
        disabled={disabled}
      >
        Global
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === 'individual' ? 'default' : 'ghost'}
        className={`
          px-4 py-1 text-xs transition-all
          ${
            value === 'individual'
              ? 'bg-pink-600 text-white hover:bg-pink-700'
              : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
          }
        `}
        onClick={() => onChange('individual')}
        disabled={disabled}
      >
        Individual
      </Button>
    </div>
  );

  // ============================================================================
  // ACCORDION SECTION COMPONENT
  // ============================================================================

  const AccordionSection = ({
    id,
    title,
    description,
    icon: Icon,
    color,
    children,
    badge,
  }: {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    children: React.ReactNode;
    badge?: React.ReactNode;
  }) => {
    const isExpanded = isSectionExpanded(id);
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

    return (
      <Card className={`border-l-4 ${color}`}>
        <CardHeader
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection(id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
                <Icon className={`h-5 w-5 ${color.replace('border-', 'text-')}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                  {badge}
                </div>
                <CardDescription className="text-xs mt-1">
                  {description}
                </CardDescription>
              </div>
            </div>
            <ChevronIcon className="h-5 w-5 text-muted-foreground transition-transform" />
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 pb-6 space-y-4">
            <Separator className="mb-4" />
            {children}
          </CardContent>
        )}
      </Card>
    );
  };

  // ============================================================================
  // CURRENCY INPUT COMPONENT
  // ============================================================================

  const CurrencyInput = ({
    value,
    onChange,
    currency,
    placeholder = '0,00',
  }: {
    value: number;
    onChange: (value: number) => void;
    currency: string;
    placeholder?: string;
  }) => {
    const currencyObj = CURRENCIES.find((c) => c.value === currency);
    const symbol = currencyObj?.symbol || 'R$';

    return (
      <div className="flex items-center border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-green-50 border-r border-border">
          <span className="text-sm font-medium text-green-700">{symbol}</span>
        </div>
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Configure os preços, taxas e políticas de desconto para locação por temporada.
          Use <strong>Global</strong> para herdar configurações globais ou{' '}
          <strong>Individual</strong> para personalizar este anúncio.
        </AlertDescription>
      </Alert>

      {/* Modo de Configuração Principal */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Modo de Configuração</CardTitle>
              <CardDescription className="text-xs">
                Escolha como configurar os preços deste anúncio
              </CardDescription>
            </div>
            <GlobalIndividualToggle
              value={data.configMode}
              onChange={(value) => handleFieldChange('configMode', value)}
            />
          </div>
        </CardHeader>

        {data.configMode === 'global' && (
          <CardContent>
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Este anúncio herdará todas as configurações de preço globais.
                Para personalizar, selecione <strong>Individual</strong>.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Seções Expansíveis - Somente se Individual */}
      {data.configMode === 'individual' && (
        <div className="space-y-4">
          {/* 1. CONFIGURAÇÃO BASE */}
          <AccordionSection
            id="config"
            title="Configuração Base"
            description="Região de mercado e moeda de operação"
            icon={Globe}
            color="border-blue-500"
          >
            <div className="grid gap-4">
              {/* Região */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Região de Mercado
                  <span className="ml-2 text-xs text-muted-foreground">
                    Afeta sazonalidade e precificação sugerida
                  </span>
                </Label>
                <Select
                  value={data.region}
                  onValueChange={(value) => handleFieldChange('region', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Moeda */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Moeda Padrão
                  <span className="ml-2 text-xs text-muted-foreground">
                    Moeda de precificação e pagamento
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={data.currency}
                    onValueChange={(value) => handleFieldChange('currency', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione a moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="text-xs">
                    Recalcular
                  </Button>
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* 2. POLÍTICA DE DESCONTOS */}
          <AccordionSection
            id="discounts"
            title="Política de Descontos"
            description="Descontos por duração de estadia"
            icon={Percent}
            color="border-amber-500"
            badge={
              <GlobalIndividualToggle
                value={data.discountPolicy}
                onChange={(value) => handleFieldChange('discountPolicy', value)}
              />
            }
          >
            {data.discountPolicy === 'individual' ? (
              <div className="grid gap-4">
                {/* Desconto Estadia Longa */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Desconto para Estadia Longa (7+ dias)
                    <span className="ml-2 text-xs text-muted-foreground">%</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.longStayDiscount || ''}
                    onChange={(e) =>
                      handleFieldChange('longStayDiscount', parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ex: 10"
                  />
                </div>

                {/* Desconto Semanal */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Desconto Semanal (7-29 dias)
                    <span className="ml-2 text-xs text-muted-foreground">%</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.weeklyDiscount || ''}
                    onChange={(e) =>
                      handleFieldChange('weeklyDiscount', parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ex: 15"
                  />
                </div>

                {/* Desconto Mensal */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Desconto Mensal (30+ dias)
                    <span className="ml-2 text-xs text-muted-foreground">%</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.monthlyDiscount || ''}
                    onChange={(e) =>
                      handleFieldChange('monthlyDiscount', parseFloat(e.target.value) || 0)
                    }
                    placeholder="Ex: 20"
                  />
                </div>
              </div>
            ) : (
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-900">
                  Usando política de descontos global. Configure descontos gerais em{' '}
                  <strong>Configurações &gt; Precificação</strong>.
                </AlertDescription>
              </Alert>
            )}
          </AccordionSection>

          {/* 3. DEPÓSITOS E GARANTIAS */}
          <AccordionSection
            id="deposit"
            title="Depósitos e Garantias"
            description="Caução e valores de segurança"
            icon={Shield}
            color="border-purple-500"
            badge={
              <GlobalIndividualToggle
                value={data.depositMode}
                onChange={(value) => handleFieldChange('depositMode', value)}
              />
            }
          >
            {data.depositMode === 'individual' ? (
              <div className="space-y-4">
                <Alert className="bg-purple-50 border-purple-200">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-xs text-purple-900">
                    <strong>Atenção:</strong> Algumas plataformas (ex: Airbnb) gerenciam
                    depósitos automaticamente. Verifique as regras da plataforma.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Valor do Depósito Caução
                    <span className="ml-2 text-xs text-muted-foreground">
                      Retido até check-out
                    </span>
                  </Label>
                  <CurrencyInput
                    value={data.depositAmount}
                    onChange={(value) => handleFieldChange('depositAmount', value)}
                    currency={data.currency}
                    placeholder="0,00"
                  />
                </div>
              </div>
            ) : (
              <Alert className="bg-purple-50 border-purple-200">
                <Info className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-sm text-purple-900">
                  Usando configuração de depósito global.
                </AlertDescription>
              </Alert>
            )}
          </AccordionSection>

          {/* 4. PRECIFICAÇÃO DINÂMICA */}
          <AccordionSection
            id="dynamic"
            title="Precificação Dinâmica"
            description="Ajuste automático de preços por demanda"
            icon={Sparkles}
            color="border-green-500"
            badge={
              <GlobalIndividualToggle
                value={data.dynamicPricingMode}
                onChange={(value) => handleFieldChange('dynamicPricingMode', value)}
              />
            }
          >
            {data.dynamicPricingMode === 'individual' ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">
                    A precificação dinâmica ajusta automaticamente suas diárias com base em:
                    demanda, sazonalidade, eventos locais e concorrência.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">
                      Ativar Precificação Dinâmica
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Permite ajustes automáticos de preço
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={data.enableDynamicPricing ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      handleFieldChange('enableDynamicPricing', !data.enableDynamicPricing)
                    }
                  >
                    {data.enableDynamicPricing ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                {data.enableDynamicPricing && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Configure as regras de precificação dinâmica em{' '}
                      <strong>Configurações &gt; Precificação Avançada</strong>.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert className="bg-green-50 border-green-200">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900">
                  Usando regras de precificação dinâmica globais.
                </AlertDescription>
              </Alert>
            )}
          </AccordionSection>

          {/* 5. TAXAS DE SERVIÇO */}
          <AccordionSection
            id="fees"
            title="Taxas de Serviço"
            description="Taxa de limpeza, pet e serviços extras"
            icon={Receipt}
            color="border-red-500"
            badge={
              <Badge variant="destructive" className="text-xs">
                Obrigatório
              </Badge>
            }
          >
            <div className="space-y-6">
              {/* Header Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Modo de Configuração</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure taxas globalmente ou individualmente
                  </p>
                </div>
                <GlobalIndividualToggle
                  value={data.feesMode}
                  onChange={(value) => handleFieldChange('feesMode', value)}
                />
              </div>

              {data.feesMode === 'individual' ? (
                <div className="space-y-6">
                  {/* Taxa de Limpeza */}
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Taxa de Limpeza
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Obrigatório
                        </Badge>
                      </Label>
                    </div>
                    <div className="grid gap-3">
                      <CurrencyInput
                        value={data.cleaningFee}
                        onChange={(value) => handleFieldChange('cleaningFee', value)}
                        currency={data.currency}
                        placeholder="0,00"
                      />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Quem paga esta taxa?
                        </Label>
                        <Select
                          value={data.cleaningFeePaidBy}
                          onValueChange={(value) =>
                            handleFieldChange('cleaningFeePaidBy', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAID_BY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Taxa Extra por Pet */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="text-sm font-medium">Taxa Extra por Pet</Label>
                    <div className="grid gap-3">
                      <CurrencyInput
                        value={data.petFee}
                        onChange={(value) => handleFieldChange('petFee', value)}
                        currency={data.currency}
                        placeholder="0,00"
                      />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Quem paga esta taxa?
                        </Label>
                        <Select
                          value={data.petFeePaidBy}
                          onValueChange={(value) => handleFieldChange('petFeePaidBy', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAID_BY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Taxa de Serviços Adicionais */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="text-sm font-medium">
                      Taxa de Serviços Adicionais
                      <span className="ml-2 text-xs text-muted-foreground">
                        Ex: café da manhã, transfer
                      </span>
                    </Label>
                    <div className="grid gap-3">
                      <CurrencyInput
                        value={data.extraServicesFee}
                        onChange={(value) => handleFieldChange('extraServicesFee', value)}
                        currency={data.currency}
                        placeholder="0,00"
                      />
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Quem paga esta taxa?
                        </Label>
                        <Select
                          value={data.extraServicesFeePaidBy}
                          onValueChange={(value) =>
                            handleFieldChange('extraServicesFeePaidBy', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAID_BY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert className="bg-red-50 border-red-200">
                  <Info className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-900">
                    Usando configuração de taxas global. Configure taxas gerais em{' '}
                    <strong>Catálogo &gt; Taxas e Impostos</strong>.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AccordionSection>
        </div>
      )}

      {/* Footer Help */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Dica:</strong> Configurações globais facilitam a gestão de múltiplos
          anúncios. Use configurações individuais apenas quando necessário personalizar
          preços específicos.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default FinancialSeasonalPricingStep;