/**
 * 🧪 TESTE DIAGNÓSTICO - FinancialIndividualPricingStep
 * 
 * Use este componente para testar se há erro de importação ou renderização
 * 
 * COMO USAR:
 * 1. Substitua temporariamente o FinancialIndividualPricingStep no PropertyEditWizard
 * 2. Se este componente funcionar, o problema está no componente original
 * 3. Se não funcionar, o problema está no PropertyEditWizard
 */

import { DollarSign, Info, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

interface FinancialIndividualPricingData {
  pricingMode: 'global' | 'individual';
  basePricePerNight: number;
  currency: string;
  enableStayDiscounts: boolean;
  weeklyDiscount: number;
  monthlyDiscount: number;
  enableSeasonalPricing: boolean;
  seasonalPeriods: any[];
  enableWeekdayPricing: boolean;
  weekdayPricing: any;
  enableSpecialDates: boolean;
  specialDates: any[];
}

interface FinancialIndividualPricingStepProps {
  data: FinancialIndividualPricingData;
  onChange: (data: FinancialIndividualPricingData) => void;
}

export function FinancialIndividualPricingStep({
  data,
  onChange,
}: FinancialIndividualPricingStepProps) {
  
  console.log('🧪 [TEST] FinancialIndividualPricingStep renderizado');
  console.log('🧪 [TEST] data:', data);
  console.log('🧪 [TEST] pricingMode:', data?.pricingMode);

  // Se data estiver undefined, mostrar erro
  if (!data) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <AlertDescription>
          ❌ ERRO: Prop "data" está undefined!
        </AlertDescription>
      </Alert>
    );
  }

  const handleFieldChange = (field: keyof FinancialIndividualPricingData, value: any) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* TESTE: Header Info */}
      <Alert className="border-green-500 bg-green-50">
        <DollarSign className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-sm">
          ✅ TESTE: Componente carregou com sucesso!
          <br />
          Modo atual: <strong>{data.pricingMode || 'undefined'}</strong>
        </AlertDescription>
      </Alert>

      {/* TESTE: Modo de Precificação */}
      <Card className="border-l-4 border-purple-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">🧪 TESTE: Modo de Precificação</CardTitle>
              <CardDescription className="text-xs mt-1">
                Clique nos botões abaixo para alternar entre Global e Individual
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
              onClick={() => {
                console.log('🧪 [TEST] Clicou em Global');
                handleFieldChange('pricingMode', 'global');
              }}
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
              onClick={() => {
                console.log('🧪 [TEST] Clicou em Individual');
                handleFieldChange('pricingMode', 'individual');
              }}
            >
              Individual
            </Button>
          </div>

          {/* TESTE: Conteúdo Global */}
          {data.pricingMode === 'global' && (
            <div className="mt-4 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  ✅ TESTE: Modo GLOBAL ativo - Conteúdo renderizando corretamente!
                </AlertDescription>
              </Alert>

              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-sm">🧪 TESTE: Preview Configurações Globais</CardTitle>
                  <CardDescription className="text-xs">
                    Este card deveria aparecer no modo Global
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">✅ Item 1: Preço base</span>
                    <Badge variant="secondary" className="text-xs">Global</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">✅ Item 2: Períodos sazonais</span>
                    <Badge variant="secondary" className="text-xs">Global</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-muted-foreground">✅ Item 3: Descontos</span>
                    <Badge variant="secondary" className="text-xs">Global</Badge>
                  </div>
                </CardContent>
              </Card>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  ✅ TESTE: CTA para configurações globais renderizado!
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* TESTE: Conteúdo Individual */}
          {data.pricingMode === 'individual' && (
            <div className="mt-4">
              <Alert className="border-pink-500 bg-pink-50">
                <Info className="h-4 w-4 text-pink-600" />
                <AlertDescription className="text-xs">
                  ✅ TESTE: Modo INDIVIDUAL ativo!
                  <br />
                  Aqui renderizaria todo o formulário de precificação detalhada.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TESTE: Footer */}
      <Alert className="border-green-500 bg-green-50">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-xs">
          ✅ TESTE COMPLETO: Se você está vendo esta mensagem, o componente está funcionando!
          <br />
          <br />
          <strong>Próximo passo:</strong> Se este teste funcionar mas o componente original não,
          significa que há algum erro específico no código original que precisa ser corrigido.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default FinancialIndividualPricingStep;
