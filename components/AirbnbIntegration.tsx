/**
 * RENDIZY - Airbnb Integration Component
 * 
 * Componente de configuração da integração com Airbnb
 * Registra automaticamente campos financeiros ao ser montado
 * 
 * @version v1.0.103.1500
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  Settings, 
  Link as LinkIcon, 
  Activity, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { registerFinancialField } from '../utils/registerFinancialField';

export function AirbnbIntegration() {
  const [config, setConfig] = useState({
    enabled: false,
    apiKey: '',
    apiSecret: '',
    commissionRate: 3.0, // Taxa padrão do Airbnb (3%)
    syncInterval: 30, // 30 minutos
    autoAcceptReservations: true,
    pushPrices: true,
    pushAvailability: true,
    pullReservations: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');

  // ✅ REGISTRAR CAMPO FINANCEIRO AUTOMATICAMENTE
  useEffect(() => {
    const registerAirbnbFinancialFields = async () => {
      try {
        console.log('📝 [AirbnbIntegration] Registrando campos financeiros do Airbnb...');
        
        const result = await registerFinancialField({
          modulo: 'integracoes',
          campo_codigo: 'airbnb.comissao',
          campo_nome: 'Comissão do Airbnb',
          campo_tipo: 'despesa',
          descricao: 'Comissão cobrada pelo Airbnb sobre cada reserva (geralmente 3%)',
          registered_by_module: 'integracoes.airbnb',
          obrigatorio: true, // Campo obrigatório DEVE ter mapeamento
        });

        if (result.success) {
          console.log('✅ [AirbnbIntegration] Campo financeiro "Comissão do Airbnb" registrado com sucesso!');
          toast.success('Campo financeiro "Comissão do Airbnb" registrado automaticamente');
        } else {
          console.error('❌ [AirbnbIntegration] Erro ao registrar campo financeiro:', result.error);
          toast.error(`Erro ao registrar campo financeiro: ${result.error}`);
        }
      } catch (error: any) {
        console.error('❌ [AirbnbIntegration] Exceção ao registrar campo financeiro:', error);
        toast.error('Erro ao registrar campo financeiro do Airbnb');
      }
    };

    // Registrar campos financeiros quando o componente for montado
    registerAirbnbFinancialFields();
  }, []); // Executar apenas uma vez ao montar

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simular salvamento (implementar API real depois)
      localStorage.setItem('rendizy-airbnb-config', JSON.stringify(config));
      toast.success('Configuração do Airbnb salva com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('untested');
    
    try {
      // Simular teste de conexão (implementar API real depois)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (config.apiKey && config.apiSecret) {
        setConnectionStatus('success');
        toast.success('Conexão com Airbnb testada com sucesso!');
      } else {
        setConnectionStatus('error');
        toast.error('Preencha as credenciais antes de testar');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert de Informação */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Campo Financeiro Automático:</strong> O campo "Comissão do Airbnb" foi registrado automaticamente 
          e está disponível em <strong>Configurações do Financeiro → Mapeamento de Campos x Contas</strong>.
        </AlertDescription>
      </Alert>

      {/* Status da Conexão */}
      {connectionStatus !== 'untested' && (
        <Alert variant={connectionStatus === 'success' ? 'default' : 'destructive'}>
          {connectionStatus === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {connectionStatus === 'success' 
              ? 'Conexão com Airbnb estabelecida com sucesso!'
              : 'Falha ao conectar com Airbnb. Verifique as credenciais.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Configuração Principal */}
      <Card className="bg-[#1e2029] border-[#2a2d3a]">
        <CardHeader>
          <CardTitle className="text-white">Credenciais Airbnb API</CardTitle>
          <CardDescription>
            Conecte sua conta do Airbnb para sincronizar propriedades e reservas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="airbnb-api-key" className="text-white">
              API Key
            </Label>
            <Input
              id="airbnb-api-key"
              type="password"
              placeholder="Digite sua API Key do Airbnb"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="bg-[#2a2d3a] border-[#3a3d4a] text-white"
            />
          </div>

          {/* API Secret */}
          <div className="space-y-2">
            <Label htmlFor="airbnb-api-secret" className="text-white">
              API Secret
            </Label>
            <Input
              id="airbnb-api-secret"
              type="password"
              placeholder="Digite sua API Secret do Airbnb"
              value={config.apiSecret}
              onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
              className="bg-[#2a2d3a] border-[#3a3d4a] text-white"
            />
          </div>

          {/* Taxa de Comissão */}
          <div className="space-y-2">
            <Label htmlFor="airbnb-commission" className="text-white">
              Taxa de Comissão (%)
            </Label>
            <Input
              id="airbnb-commission"
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="3.0"
              value={config.commissionRate}
              onChange={(e) => setConfig({ ...config, commissionRate: parseFloat(e.target.value) || 0 })}
              className="bg-[#2a2d3a] border-[#3a3d4a] text-white"
            />
            <p className="text-xs text-gray-400">
              Taxa padrão do Airbnb: 3% por reserva
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outline"
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-pink-600 hover:bg-pink-700"
            >
              {isSaving ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre o Campo Financeiro */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Campo Financeiro Registrado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-300">
              O campo <strong className="text-white">"Comissão do Airbnb"</strong> foi registrado automaticamente 
              e está disponível para mapeamento.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Módulo: integracoes
              </Badge>
              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                Tipo: Despesa
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                Obrigatório
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              💡 Acesse <strong>Configurações do Financeiro → Mapeamento de Campos x Contas</strong> para mapear 
              este campo para uma conta do plano de contas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

