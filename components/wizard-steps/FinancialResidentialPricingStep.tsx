/**
 * RENDIZY - Financial Residential & Sales Pricing Step
 * 
 * PASSO 2 FINANCEIRO: Preços Locação Residencial e Venda de Imóveis
 * 
 * @version 1.0.103.121
 * @date 2025-10-30
 */

import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { CalendarIcon, DollarSign, Home, TrendingUp, Info, AlertCircle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '../ui/utils';
import { Card, CardContent } from '../ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface FormData {
  // LOCAÇÃO RESIDENCIAL
  monthlyRent?: number;
  securityDeposit?: number;
  condoFee?: number;
  iptuMonthly?: number;
  rentalStartDate?: Date;
  minContractMonths?: number;
  maxContractMonths?: number;
  rentAdjustmentIndex?: 'IGPM' | 'IPCA' | 'CDI' | 'FIXED';
  rentAdjustmentMonths?: number;
  
  // COMPRA E VENDA
  salePrice?: number;
  condoFeeOwner?: number;
  iptuAnnual?: number;
  propertyAge?: number;
  acceptsFinancing: boolean;
  acceptsTrade: boolean;
  exclusiveSale: boolean;
  commissionPercentage?: number;
  
  // COMPARTILHADO
  priceType: 'rental' | 'sale' | 'both';
}

interface FinancialResidentialPricingStepProps {
  data: FormData;
  onChange: (data: FormData) => void;
  categories?: string[];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Componente de Seção Colapsável */
const CollapsibleSection = ({ 
  title, 
  description,
  icon: Icon,
  children,
  variant = 'default',
  defaultOpen = true,
}: { 
  title: string; 
  description?: string;
  icon?: any;
  children: React.ReactNode;
  variant?: 'default' | 'sale' | 'rental';
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const colors = {
    default: 'border-gray-200 bg-white',
    rental: 'border-blue-200 bg-blue-50/30',
    sale: 'border-green-200 bg-green-50/30',
  };

  const headerColors = {
    default: 'bg-gray-50',
    rental: 'bg-blue-50',
    sale: 'bg-green-50',
  };

  const iconColors = {
    default: { bg: 'bg-gray-100', text: 'text-gray-600' },
    rental: { bg: 'bg-blue-100', text: 'text-blue-600' },
    sale: { bg: 'bg-green-100', text: 'text-green-600' },
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className={cn("border rounded-lg overflow-hidden", colors[variant])}>
        {/* Header Clicável */}
        <CollapsibleTrigger className="w-full">
          <div className={cn("p-4 flex items-center justify-between hover:opacity-80 transition-opacity", headerColors[variant])}>
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={cn("p-2 rounded-lg", iconColors[variant].bg)}>
                  <Icon className={cn("w-5 h-5", iconColors[variant].text)} />
                </div>
              )}
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">{title}</h3>
                {description && (
                  <p className="text-sm text-gray-600 mt-0.5">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="px-3 py-1.5 text-sm rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar salvamento automático
                }}
              >
                Salvar
              </div>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-gray-500 transition-transform duration-200",
                  isOpen && "transform rotate-180"
                )} 
              />
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Conteúdo */}
        <CollapsibleContent>
          <div className="p-6 space-y-6 border-t">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FinancialResidentialPricingStep({
  data,
  onChange,
  categories = []
}: FinancialResidentialPricingStepProps) {
  const handleChange = (field: keyof FormData, value: any) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  // Sempre mostra AMBAS as seções (Locação E Venda)
  const showRental = true;
  const showSale = true;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Alert Informativo */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure os valores para locação residencial e/ou venda de imóveis. 
          Clique nas setinhas para expandir ou recolher cada seção.
        </AlertDescription>
      </Alert>

      {/* ================================================================ */}
      {/* SEÇÃO 1: LOCAÇÃO RESIDENCIAL - Valores */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Valores de Locação Residencial"
        description="Configure o aluguel mensal e encargos relacionados à locação de longo prazo."
        icon={Home}
        variant="rental"
        defaultOpen={true}
      >
        {/* Aluguel Mensal */}
        <div className="space-y-2">
          <Label htmlFor="monthlyRent" className="flex items-center gap-2">
            Valor do Aluguel Mensal
            <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-gray-600">
            Valor base do aluguel cobrado mensalmente, sem incluir condomínio ou IPTU.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="monthlyRent"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.monthlyRent || ''}
              onChange={(e) => handleChange('monthlyRent', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Caução */}
        <div className="space-y-2">
          <Label htmlFor="securityDeposit">Valor da Caução/Depósito de Garantia</Label>
          <p className="text-xs text-gray-600">
            Valor solicitado como garantia no início do contrato (geralmente equivalente a 1-3 aluguéis).
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="securityDeposit"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.securityDeposit || ''}
              onChange={(e) => handleChange('securityDeposit', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Condomínio */}
        <div className="space-y-2">
          <Label htmlFor="condoFee">Valor do Condomínio Mensal</Label>
          <p className="text-xs text-gray-600">
            Taxa de condomínio mensal que o locatário deve pagar (quando aplicável).
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="condoFee"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.condoFee || ''}
              onChange={(e) => handleChange('condoFee', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>

        {/* IPTU Mensal */}
        <div className="space-y-2">
          <Label htmlFor="iptuMonthly">IPTU Mensal</Label>
          <p className="text-xs text-gray-600">
            Valor mensal do IPTU que o locatário deve pagar.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="iptuMonthly"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.iptuMonthly || ''}
              onChange={(e) => handleChange('iptuMonthly', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* SEÇÃO 2: LOCAÇÃO RESIDENCIAL - Condições */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Condições do Contrato de Locação"
        description="Defina regras e prazos para o contrato de locação residencial."
        icon={CalendarIcon}
        variant="rental"
        defaultOpen={false}
      >
        {/* Data Disponível */}
        <div className="space-y-2">
          <Label>Data Disponível para Locação</Label>
          <p className="text-xs text-gray-600">
            A partir de quando o imóvel estará disponível para ser alugado?
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !data.rentalStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.rentalStartDate ? (
                  format(data.rentalStartDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.rentalStartDate}
                onSelect={(date) => handleChange('rentalStartDate', date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Prazo de Contrato */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minContractMonths">Prazo Mínimo de Contrato</Label>
            <p className="text-xs text-gray-600">Mínimo de meses para locação</p>
            <div className="relative">
              <Input
                id="minContractMonths"
                type="number"
                min="1"
                placeholder="12"
                value={data.minContractMonths || ''}
                onChange={(e) => handleChange('minContractMonths', parseInt(e.target.value) || undefined)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">meses</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxContractMonths">Prazo Máximo de Contrato</Label>
            <p className="text-xs text-gray-600">Máximo de meses (opcional)</p>
            <div className="relative">
              <Input
                id="maxContractMonths"
                type="number"
                min="1"
                placeholder="36"
                value={data.maxContractMonths || ''}
                onChange={(e) => handleChange('maxContractMonths', parseInt(e.target.value) || undefined)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">meses</span>
            </div>
          </div>
        </div>

        {/* Reajuste de Aluguel */}
        <div className="space-y-2">
          <Label htmlFor="rentAdjustmentIndex">Índice de Reajuste do Aluguel</Label>
          <p className="text-xs text-gray-600">
            Qual índice será usado para reajustar o valor do aluguel anualmente?
          </p>
          <Select
            value={data.rentAdjustmentIndex}
            onValueChange={(value: any) => handleChange('rentAdjustmentIndex', value)}
          >
            <SelectTrigger id="rentAdjustmentIndex">
              <SelectValue placeholder="Selecione o índice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IGPM">IGP-M (Índice Geral de Preços do Mercado)</SelectItem>
              <SelectItem value="IPCA">IPCA (Índice de Preços ao Consumidor Amplo)</SelectItem>
              <SelectItem value="CDI">CDI (Certificado de Depósito Interbancário)</SelectItem>
              <SelectItem value="FIXED">Percentual Fixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rentAdjustmentMonths">Periodicidade do Reajuste</Label>
          <p className="text-xs text-gray-600">
            A cada quantos meses o aluguel será reajustado pelo índice selecionado?
          </p>
          <div className="relative">
            <Input
              id="rentAdjustmentMonths"
              type="number"
              min="1"
              placeholder="12"
              value={data.rentAdjustmentMonths || ''}
              onChange={(e) => handleChange('rentAdjustmentMonths', parseInt(e.target.value) || undefined)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">meses</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* SEÇÃO 3: COMPRA E VENDA - Valores */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Valores de Venda do Imóvel"
        description="Configure o preço de venda e informações relacionadas à comercialização do imóvel."
        icon={TrendingUp}
        variant="sale"
        defaultOpen={true}
      >
        {/* Preço de Venda */}
        <div className="space-y-2">
          <Label htmlFor="salePrice" className="flex items-center gap-2">
            Preço de Venda
            <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-gray-600">
            Valor total de venda do imóvel. Este será o preço anunciado nos canais de comercialização.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="salePrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.salePrice || ''}
              onChange={(e) => handleChange('salePrice', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Condomínio */}
        <div className="space-y-2">
          <Label htmlFor="condoFeeOwner">Valor do Condomínio Mensal</Label>
          <p className="text-xs text-gray-600">
            Taxa de condomínio mensal que o futuro proprietário deverá pagar.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="condoFeeOwner"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.condoFeeOwner || ''}
              onChange={(e) => handleChange('condoFeeOwner', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>

        {/* IPTU Anual */}
        <div className="space-y-2">
          <Label htmlFor="iptuAnnual">IPTU Anual</Label>
          <p className="text-xs text-gray-600">
            Valor total do IPTU pago anualmente pelo imóvel.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="iptuAnnual"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={data.iptuAnnual || ''}
              onChange={(e) => handleChange('iptuAnnual', parseFloat(e.target.value) || undefined)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Idade do Imóvel */}
        <div className="space-y-2">
          <Label htmlFor="propertyAge">Idade do Imóvel</Label>
          <p className="text-xs text-gray-600">
            Há quantos anos o imóvel foi construído? (deixe em branco se for lançamento)
          </p>
          <div className="relative">
            <Input
              id="propertyAge"
              type="number"
              min="0"
              placeholder="0"
              value={data.propertyAge || ''}
              onChange={(e) => handleChange('propertyAge', parseInt(e.target.value) || undefined)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">anos</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* ================================================================ */}
      {/* SEÇÃO 4: COMPRA E VENDA - Condições */}
      {/* ================================================================ */}
      <CollapsibleSection
        title="Condições de Venda"
        description="Configure as regras e modalidades de comercialização do imóvel."
        icon={Info}
        variant="sale"
        defaultOpen={false}
      >
        {/* Aceita Financiamento */}
        <div className="space-y-2">
          <Label>Aceita Financiamento Bancário?</Label>
          <p className="text-xs text-gray-600">
            Marque [Sim] se o imóvel pode ser adquirido através de financiamento bancário.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={data.acceptsFinancing ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleChange('acceptsFinancing', true)}
            >
              Sim
            </Button>
            <Button
              type="button"
              variant={!data.acceptsFinancing ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleChange('acceptsFinancing', false)}
            >
              Não
            </Button>
          </div>
        </div>

        {/* Aceita Permuta */}
        <div className="space-y-2">
          <Label>Aceita Permuta (Troca)?</Label>
          <p className="text-xs text-gray-600">
            Marque [Sim] se você aceita trocar este imóvel por outro imóvel, carro ou outro bem.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={data.acceptsTrade ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleChange('acceptsTrade', true)}
            >
              Sim
            </Button>
            <Button
              type="button"
              variant={!data.acceptsTrade ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleChange('acceptsTrade', false)}
            >
              Não
            </Button>
          </div>
        </div>

        {/* Exclusividade de Venda */}
        <div className="space-y-2">
          <Label>Venda Exclusiva?</Label>
          <p className="text-xs text-gray-600">
            Marque [Sim] se apenas sua imobiliária tem autorização para vender este imóvel.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={data.exclusiveSale ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleChange('exclusiveSale', true)}
            >
              Sim
            </Button>
            <Button
              type="button"
              variant={!data.exclusiveSale ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleChange('exclusiveSale', false)}
            >
              Não
            </Button>
          </div>
        </div>

        {/* Comissão */}
        <div className="space-y-2">
          <Label htmlFor="commissionPercentage">Percentual de Comissão</Label>
          <p className="text-xs text-gray-600">
            Qual o percentual de comissão sobre a venda? (geralmente entre 5% e 8%)
          </p>
          <div className="relative">
            <Input
              id="commissionPercentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="6.0"
              value={data.commissionPercentage || ''}
              onChange={(e) => handleChange('commissionPercentage', parseFloat(e.target.value) || undefined)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default FinancialResidentialPricingStep;
