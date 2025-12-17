/**
 * RENDIZY - Financial Contract Configuration Step
 * 
 * PASSO 1 FINANCEIRO: Configuração de Relacionamento e Remuneração
 * 
 * Estrutura baseada no Stays.net com nomenclatura própria do Rendizy
 * 
 * @version 1.0.103.117
 * @date 2025-10-30
 */

import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, User, Info, HelpCircle, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '../ui/utils';

// ============================================================================
// TYPES
// ============================================================================

interface Owner {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface FormData {
  // SEÇÃO 1: Responsabilidade Legal
  ownerId?: string;
  managerId?: string;
  
  // SEÇÃO 2: Modalidade Contratual
  registeredDate?: Date;
  isSublet: boolean;
  isExclusive: boolean;
  
  // SEÇÃO 3: Vigência do Contrato
  contractStartDate?: Date;
  contractEndDate?: Date;
  blockCalendarAfterEnd: boolean;
  
  // SEÇÃO 4: Remuneração da Gestão
  commissionModel: 'global' | 'individual';
  commissionType?: 'percentage' | 'fixed_monthly';
  commissionPercentage?: number;
  commissionCalculationBase?: 'accommodation_source' | 'total_daily' | 'gross_daily';
  considerChannelFees: boolean;
  deductChannelFees: boolean;
  allowExclusiveTransfer: boolean;
  
  // SEÇÃO 5: Encargos Adicionais
  electricityChargeMode: 'global' | 'individual';
  
  // SEÇÃO 6: Notificações e Comunicação (8 campos)
  showReservationsInOwnerCalendar: 'global' | 'individual';
  ownerPreReservationEmail: 'global' | 'individual';
  agentPreReservationEmail: 'global' | 'individual';
  ownerConfirmedReservationEmail: 'global' | 'individual';
  agentConfirmedReservationEmail: 'global' | 'individual';
  cancellationEmail: 'global' | 'individual';
  deletedReservationEmail: 'global' | 'individual';
  reserveLinkBeforeCheckout: 'global' | 'individual';
}

interface FinancialContractStepProps {
  data: FormData;
  onChange: (data: FormData) => void;
  owners?: Owner[];
  managers?: Manager[];
  onCreateOwner?: () => void;
  onCreateManager?: () => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Componente de Toggle Sim/Não */
const YesNoToggle = ({ 
  value, 
  onChange 
}: { 
  value: boolean; 
  onChange: (value: boolean) => void;
}) => (
  <div className="flex gap-2">
    <Button
      type="button"
      variant={value ? "default" : "outline"}
      size="sm"
      className="flex-1"
      onClick={() => onChange(true)}
    >
      Sim
    </Button>
    <Button
      type="button"
      variant={!value ? "default" : "outline"}
      size="sm"
      className="flex-1"
      onClick={() => onChange(false)}
    >
      Não
    </Button>
  </div>
);

/** Componente de Toggle Global/Individual */
const GlobalIndividualToggle = ({ 
  value, 
  onChange,
  showPassButton = false 
}: { 
  value: 'global' | 'individual'; 
  onChange: (value: 'global' | 'individual') => void;
  showPassButton?: boolean;
}) => (
  <div className="space-y-2">
    <div className="flex gap-2">
      <Button
        type="button"
        variant={value === 'global' ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex-1",
          value === 'global' && "bg-blue-600 hover:bg-blue-700"
        )}
        onClick={() => onChange('global')}
      >
        Global
      </Button>
      <Button
        type="button"
        variant={value === 'individual' ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex-1",
          value === 'individual' && "bg-pink-600 hover:bg-pink-700"
        )}
        onClick={() => onChange('individual')}
      >
        Individual
      </Button>
    </div>
    {showPassButton && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
      >
        Pular esta etapa
      </Button>
    )}
  </div>
);

/** Componente de Card de Seção */
const SectionCard = ({ 
  title, 
  description,
  helpLinks,
  children 
}: { 
  title: string; 
  description?: string | React.ReactNode;
  helpLinks?: { label: string; href?: string }[];
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <div className="text-sm text-gray-600 mt-1">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}
        {helpLinks && helpLinks.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {helpLinks.map((link, index) => (
              <button
                key={index}
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-fit"
              >
                <Info className="w-3 h-3" />
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button variant="outline" size="sm">
        Salvar
      </Button>
    </div>

    {/* Content */}
    <div className="p-6 border rounded-lg bg-white shadow-sm space-y-6">
      {children}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FinancialContractStep({
  data,
  onChange,
  owners = [],
  managers = [],
  onCreateOwner,
  onCreateManager
}: FinancialContractStepProps) {
  const handleChange = (field: keyof FormData, value: any) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const selectedOwner = owners.find(o => o.id === data.ownerId);
  const selectedManager = managers.find(m => m.id === data.managerId);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ================================================================ */}
      {/* SEÇÃO 1: RESPONSABILIDADE LEGAL */}
      {/* ================================================================ */}
      <SectionCard
        title="Responsabilidade Legal"
        description="Defina o titular do imóvel e o responsável operacional pela gestão das reservas."
        helpLinks={[
          { label: 'Entenda a diferença entre titular e administrador' },
          { label: 'Como gerenciar múltiplos responsáveis' }
        ]}
      >
        {/* Titular do Imóvel */}
        <div className="space-y-2">
          <Label htmlFor="owner" className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Titular do Imóvel
            <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-gray-600">
            Pessoa física ou jurídica que possui a propriedade legal do imóvel e receberá os repasses financeiros.
          </p>
          <div className="flex gap-2">
            <Select
              value={data.ownerId}
              onValueChange={(value) => handleChange('ownerId', value)}
            >
              <SelectTrigger id="owner" className="flex-1">
                <SelectValue placeholder="Selecione o titular" />
              </SelectTrigger>
              <SelectContent>
                {owners.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum titular cadastrado
                  </SelectItem>
                ) : (
                  owners.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedOwner && (
            <p className="text-xs text-gray-500">
              {selectedOwner.email} {selectedOwner.phone && `• ${selectedOwner.phone}`}
            </p>
          )}
        </div>

        {/* Administrador do Imóvel */}
        <div className="space-y-2">
          <Label htmlFor="manager" className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            Administrador do Imóvel
          </Label>
          <p className="text-xs text-gray-600">
            Responsável pela operação diária, atendimento aos hóspedes e manutenção do imóvel.
          </p>
          <div className="flex gap-2">
            <Select
              value={data.managerId || 'none'}
              onValueChange={(value) => handleChange('managerId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger id="manager" className="flex-1">
                <SelectValue placeholder="Não definido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não definido</SelectItem>
                {managers.map(manager => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedManager && (
            <p className="text-xs text-gray-500">{selectedManager.email}</p>
          )}
        </div>
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 2: MODALIDADE CONTRATUAL */}
      {/* ================================================================ */}
      <SectionCard
        title="Modalidade Contratual"
        description="Configure as características do relacionamento comercial com o titular do imóvel."
      >
        {/* Data de Cadastro */}
        <div className="space-y-2">
          <Label>Data de Cadastro no Sistema</Label>
          <p className="text-xs text-gray-600">
            Quando este imóvel foi registrado na plataforma? Esta informação é útil para 
            relatórios e análises de desempenho ao longo do tempo.
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !data.registeredDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.registeredDate ? (
                  format(data.registeredDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione a data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.registeredDate}
                onSelect={(date) => handleChange('registeredDate', date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Repasse de Propriedade */}
        <div className="space-y-2">
          <Label>Repasse de Propriedade (Sublocação)</Label>
          <p className="text-xs text-gray-600">
            Este imóvel é gerenciado através de sublocação ou repasse? Imóveis nesta categoria 
            podem ter prioridade em propostas comerciais.{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Saiba mais sobre repasse de propriedade
            </button>
          </p>
          <YesNoToggle
            value={data.isSublet}
            onChange={(value) => handleChange('isSublet', value)}
          />
        </div>

        {/* Exclusividade de Gestão */}
        <div className="space-y-2">
          <Label>Exclusividade de Gestão</Label>
          <p className="text-xs text-gray-600">
            Marque [Sim] se você possui direitos exclusivos de gestão e comercialização deste imóvel. 
            Isso facilita filtros e relatórios de performance dos seus anúncios exclusivos.{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Entenda os benefícios da exclusividade
            </button>
          </p>
          <YesNoToggle
            value={data.isExclusive}
            onChange={(value) => handleChange('isExclusive', value)}
          />
        </div>
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 3: VIGÊNCIA DO CONTRATO */}
      {/* ================================================================ */}
      <SectionCard
        title="Vigência do Contrato"
        description="Estabeleça o período de validade do acordo comercial com o titular do imóvel."
      >
        {/* Período de Vigência */}
        <div className="space-y-2">
          <Label>Período de Vigência</Label>
          <p className="text-xs text-gray-600">
            Defina as datas de início e término do contrato de gestão do imóvel.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !data.contractStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.contractStartDate ? (
                    format(data.contractStartDate, "dd/MM/yyyy")
                  ) : (
                    <span>Início</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.contractStartDate}
                  onSelect={(date) => handleChange('contractStartDate', date)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !data.contractEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.contractEndDate ? (
                    format(data.contractEndDate, "dd/MM/yyyy")
                  ) : (
                    <span>Término</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.contractEndDate}
                  onSelect={(date) => handleChange('contractEndDate', date)}
                  disabled={(date) => {
                    if (!data.contractStartDate) return false;
                    return date < data.contractStartDate;
                  }}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Bloqueio Automático de Calendário */}
        <div className="space-y-2">
          <Label>Bloqueio Automático de Calendário ao Final do Contrato</Label>
          <p className="text-xs text-gray-600">
            Ao ativar esta opção, o sistema bloqueará automaticamente todas as datas posteriores 
            ao término do contrato, impedindo novas reservas.{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Como funciona o bloqueio automático
            </button>
          </p>
          <YesNoToggle
            value={data.blockCalendarAfterEnd}
            onChange={(value) => handleChange('blockCalendarAfterEnd', value)}
          />
        </div>
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 4: REMUNERAÇÃO DA GESTÃO */}
      {/* ================================================================ */}
      <SectionCard
        title="Remuneração da Gestão"
        description="Configure como será calculada sua remuneração pelas reservas deste imóvel."
      >
        {/* Modelo de Remuneração */}
        <div className="space-y-2">
          <Label>Modelo de Remuneração</Label>
          <p className="text-xs text-gray-600">
            Escolha entre usar as configurações globais da sua empresa ou definir valores 
            específicos para este imóvel.
          </p>
          <GlobalIndividualToggle
            value={data.commissionModel}
            onChange={(value) => handleChange('commissionModel', value)}
          />
        </div>

        {/* Se Individual, mostrar campos adicionais */}
        {data.commissionModel === 'individual' && (
          <>
            {/* Tipo de Remuneração */}
            <div className="space-y-2">
              <Label>Tipo de Remuneração</Label>
              <p className="text-xs text-gray-600">
                Defina se sua remuneração será baseada em porcentagem sobre as reservas ou 
                um valor fixo mensal.
              </p>
              <Select
                value={data.commissionType}
                onValueChange={(value: 'percentage' | 'fixed_monthly') => 
                  handleChange('commissionType', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentagem sobre Reservas</SelectItem>
                  <SelectItem value="fixed_monthly">Valor Fixo Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Se percentual, mostrar campo de % */}
            {data.commissionType === 'percentage' && (
              <>
                <div className="space-y-2">
                  <Label>Percentual de Remuneração</Label>
                  <p className="text-xs text-gray-600">
                    Informe o percentual que será aplicado sobre o valor das reservas.
                  </p>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0.0"
                      value={data.commissionPercentage || ''}
                      onChange={(e) => 
                        handleChange('commissionPercentage', parseFloat(e.target.value) || undefined)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Base de Cálculo */}
                <div className="space-y-3">
                  <Label>Base de Cálculo da Remuneração</Label>
                  <p className="text-xs text-gray-600">
                    Escolha qual valor será usado como base para calcular sua remuneração.
                  </p>
                  <RadioGroup
                    value={data.commissionCalculationBase}
                    onValueChange={(value) => handleChange('commissionCalculationBase', value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="accommodation_source" id="calc-source" />
                      <Label htmlFor="calc-source" className="font-normal cursor-pointer">
                        Valor da diária (sem taxas e serviços)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="total_daily" id="calc-total" />
                      <Label htmlFor="calc-total" className="font-normal cursor-pointer">
                        Valor total das diárias (com taxas)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gross_daily" id="calc-gross" />
                      <Label htmlFor="calc-gross" className="font-normal cursor-pointer">
                        Valor bruto da reserva (todos os valores)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </>
        )}
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 5: TAXAS DAS PLATAFORMAS */}
      {/* ================================================================ */}
      <SectionCard
        title="Considerar Taxas das Plataformas?"
        description="Ao integrar com plataformas externas (Airbnb, Booking.com, etc), você pode optar 
        por considerar as taxas dessas plataformas no cálculo de repasse ao titular."
      >
        <YesNoToggle
          value={data.considerChannelFees}
          onChange={(value) => handleChange('considerChannelFees', value)}
        />
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 6: DESCONTO DE TAXAS */}
      {/* ================================================================ */}
      <SectionCard
        title="Descontar Taxas das Plataformas do Repasse?"
        description={
          <span>
            Se você considera as taxas das plataformas, pode optar por descontá-las antes 
            de calcular o valor de repasse ao titular do imóvel.{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Entenda o impacto no fluxo financeiro
            </button>
          </span>
        }
      >
        <YesNoToggle
          value={data.deductChannelFees}
          onChange={(value) => handleChange('deductChannelFees', value)}
        />
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 7: REPASSE FLEXÍVEL */}
      {/* ================================================================ */}
      <SectionCard
        title="Permitir Repasse Flexível no Balancete?"
        description="Ative esta funcionalidade para poder excluir repasses após a geração do balancete, 
        oferecendo maior flexibilidade na gestão financeira."
      >
        <YesNoToggle
          value={data.allowExclusiveTransfer}
          onChange={(value) => handleChange('allowExclusiveTransfer', value)}
        />
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 8: ENCARGOS ADICIONAIS */}
      {/* ================================================================ */}
      <SectionCard
        title="Cobrança de Energia Elétrica"
        description="Habilite a cobrança de consumo de energia elétrica como custo adicional 
        nas reservas deste imóvel."
      >
        <GlobalIndividualToggle
          value={data.electricityChargeMode}
          onChange={(value) => handleChange('electricityChargeMode', value)}
          showPassButton
        />
      </SectionCard>

      {/* ================================================================ */}
      {/* SEÇÃO 9: NOTIFICAÇÕES E COMUNICAÇÃO */}
      {/* ================================================================ */}
      <SectionCard
        title="Notificações e Comunicação"
        description="Configure as preferências de notificação para o titular e o administrador do imóvel."
      >
        {/* Visualização de Reservas */}
        <div className="space-y-2">
          <Label>Exibir Reservas no Painel do Titular</Label>
          <p className="text-xs text-gray-600">
            O titular deve visualizar todas as reservas no painel dele, mesmo antes do repasse 
            financeiro ser processado?
          </p>
          <GlobalIndividualToggle
            value={data.showReservationsInOwnerCalendar}
            onChange={(value) => handleChange('showReservationsInOwnerCalendar', value)}
          />
        </div>

        {/* E-mail Pré-reserva - Titular */}
        <div className="space-y-2">
          <Label>Notificar Titular sobre Pré-reservas</Label>
          <p className="text-xs text-gray-600">
            O titular deve receber e-mail quando houver uma solicitação de reserva (ainda não confirmada)?
          </p>
          <GlobalIndividualToggle
            value={data.ownerPreReservationEmail}
            onChange={(value) => handleChange('ownerPreReservationEmail', value)}
            showPassButton
          />
        </div>

        {/* E-mail Pré-reserva - Administrador */}
        <div className="space-y-2">
          <Label>Notificar Administrador sobre Pré-reservas</Label>
          <p className="text-xs text-gray-600">
            O administrador deve receber e-mail quando houver uma solicitação de reserva?
          </p>
          <GlobalIndividualToggle
            value={data.agentPreReservationEmail}
            onChange={(value) => handleChange('agentPreReservationEmail', value)}
            showPassButton
          />
        </div>

        {/* E-mail Reserva Confirmada - Titular */}
        <div className="space-y-2">
          <Label>Notificar Titular sobre Reservas Confirmadas</Label>
          <p className="text-xs text-gray-600">
            O titular deve receber e-mail quando uma reserva for confirmada e paga?{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Ver modelo de e-mail
            </button>
          </p>
          <GlobalIndividualToggle
            value={data.ownerConfirmedReservationEmail}
            onChange={(value) => handleChange('ownerConfirmedReservationEmail', value)}
            showPassButton
          />
        </div>

        {/* E-mail Reserva Confirmada - Administrador */}
        <div className="space-y-2">
          <Label>Notificar Administrador sobre Reservas Confirmadas</Label>
          <p className="text-xs text-gray-600">
            O administrador deve receber e-mail quando uma reserva for confirmada?
          </p>
          <GlobalIndividualToggle
            value={data.agentConfirmedReservationEmail}
            onChange={(value) => handleChange('agentConfirmedReservationEmail', value)}
            showPassButton
          />
        </div>

        {/* E-mail Cancelamento */}
        <div className="space-y-2">
          <Label>Notificar sobre Cancelamentos</Label>
          <p className="text-xs text-gray-600">
            Titular e administrador devem receber e-mail quando uma reserva for cancelada?{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Ver política de cancelamento
            </button>
          </p>
          <GlobalIndividualToggle
            value={data.cancellationEmail}
            onChange={(value) => handleChange('cancellationEmail', value)}
            showPassButton
          />
        </div>

        {/* E-mail Exclusão */}
        <div className="space-y-2">
          <Label>Notificar sobre Exclusão de Reservas</Label>
          <p className="text-xs text-gray-600">
            Titular e administrador devem receber e-mail quando uma reserva for excluída 
            do sistema?{' '}
            <button type="button" className="text-blue-600 hover:underline">
              Diferença entre cancelamento e exclusão
            </button>
          </p>
          <GlobalIndividualToggle
            value={data.deletedReservationEmail}
            onChange={(value) => handleChange('deletedReservationEmail', value)}
            showPassButton
          />
        </div>

        {/* Link de Reserva antes do Checkout */}
        <div className="space-y-2">
          <Label>Compartilhar Link de Reserva Antecipado</Label>
          <p className="text-xs text-gray-600">
            Enviar link da reserva antes do checkout final (útil para pagamentos diretos).
          </p>
          <GlobalIndividualToggle
            value={data.reserveLinkBeforeCheckout}
            onChange={(value) => handleChange('reserveLinkBeforeCheckout', value)}
          />
        </div>
      </SectionCard>
    </div>
  );
}

export default FinancialContractStep;
