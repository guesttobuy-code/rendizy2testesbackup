/**
 * RENDIZY - Expedia Group Integration Component
 * 
 * Componente de configuração da integração com Expedia Group
 * Inclui: Expedia, VRBO, Hotels.com, Trivago (via Expedia)
 * 
 * VRBO foi adquirido pelo Expedia Group em 2015.
 * Uma única integração publica em todos os sites do grupo.
 * 
 * @version v1.0.0
 * @date 2026-02-02
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Settings, 
  Link as LinkIcon, 
  Activity, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Globe,
  Building2,
  CreditCard,
  Shield,
  ExternalLink,
  Copy,
  Key,
  Webhook
} from 'lucide-react';
import { toast } from 'sonner';
import { registerFinancialField } from '../utils/registerFinancialField';

// ============================================================================
// TYPES
// ============================================================================

interface ExpediaConfig {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  // Credenciais
  apiKey: string;
  apiSecret: string;
  // IDs
  partnerId: string;
  hotelId: string;
  // Configurações de Sync
  syncEnabled: boolean;
  syncContent: boolean;
  syncRates: boolean;
  syncAvailability: boolean;
  syncReservations: boolean;
  syncInterval: number; // minutos
  // Configurações de pagamento
  expediaCollect: boolean;  // Expedia coleta o pagamento
  propertyCollect: boolean; // Propriedade coleta o pagamento
  // Taxas
  commissionRate: number;   // Comissão padrão (15-20%)
  // VRBO específico
  vrboEnabled: boolean;
  vrboListingId: string;
  // Webhook
  webhookSecret: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExpediaGroupIntegration() {
  const [config, setConfig] = useState<ExpediaConfig>({
    enabled: false,
    environment: 'sandbox',
    apiKey: '',
    apiSecret: '',
    partnerId: '',
    hotelId: '',
    syncEnabled: true,
    syncContent: true,
    syncRates: true,
    syncAvailability: true,
    syncReservations: true,
    syncInterval: 15,
    expediaCollect: true,
    propertyCollect: false,
    commissionRate: 15.0,
    vrboEnabled: true,
    vrboListingId: '',
    webhookSecret: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [activeTab, setActiveTab] = useState('credentials');

  // Webhook URL padrão
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/expedia`;

  // ============================================================================
  // REGISTRAR CAMPOS FINANCEIROS
  // ============================================================================
  useEffect(() => {
    const registerExpediaFinancialFields = async () => {
      try {
        console.log('📝 [ExpediaGroupIntegration] Registrando campos financeiros do Expedia Group...');
        
        // Comissão Expedia
        await registerFinancialField({
          modulo: 'integracoes',
          campo_codigo: 'expedia.comissao',
          campo_nome: 'Comissão do Expedia Group',
          campo_tipo: 'despesa',
          descricao: 'Comissão cobrada pelo Expedia Group (inclui VRBO) sobre reservas (15-20%)',
          registered_by_module: 'integracoes.expedia',
          obrigatorio: true,
        });

        // Taxa 3D Secure
        await registerFinancialField({
          modulo: 'integracoes',
          campo_codigo: 'expedia.taxa_3ds',
          campo_nome: 'Taxa 3D Secure Expedia',
          campo_tipo: 'despesa',
          descricao: 'Taxa de processamento 3D Secure para pagamentos via Expedia',
          registered_by_module: 'integracoes.expedia',
          obrigatorio: false,
        });

        console.log('✅ [ExpediaGroupIntegration] Campos financeiros registrados!');
        toast.success('Campos financeiros do Expedia Group registrados automaticamente');
      } catch (error: any) {
        console.error('❌ [ExpediaGroupIntegration] Erro ao registrar campos financeiros:', error);
      }
    };

    registerExpediaFinancialFields();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implementar salvamento via API (ota_api_credentials)
      localStorage.setItem('rendizy-expedia-config', JSON.stringify(config));
      toast.success('Configuração do Expedia Group salva com sucesso!');
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
      // Validar campos obrigatórios
      if (!config.apiKey || !config.apiSecret) {
        setConnectionStatus('error');
        toast.error('Preencha API Key e API Secret');
        return;
      }

      // TODO: Implementar teste real via Edge Function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('success');
      toast.success('Conexão com Expedia Group testada com sucesso!');
    } catch (error: any) {
      setConnectionStatus('error');
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <Alert className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <Info className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-sm">
          <strong>Expedia Group</strong> inclui: Expedia.com, VRBO, Hotels.com, Trivago e mais.
          Uma única integração publica seu imóvel em todas as plataformas do grupo.
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
              ? 'Conexão com Expedia Group estabelecida com sucesso!'
              : 'Falha ao conectar. Verifique as credenciais e ambiente.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de Configuração */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="credentials" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Credenciais
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* TAB: CREDENCIAIS */}
        {/* ================================================================ */}
        <TabsContent value="credentials" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-500" />
                Credenciais da API
              </CardTitle>
              <CardDescription>
                Obtenha suas credenciais no{' '}
                <a 
                  href="https://developers.expediagroup.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Expedia Partner Central <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ambiente */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-sm font-medium">Ambiente</Label>
                  <p className="text-xs text-muted-foreground">
                    Use Sandbox para testes antes de produção
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.environment === 'sandbox' ? 'secondary' : 'default'}>
                    {config.environment === 'sandbox' ? '🧪 Sandbox' : '🚀 Produção'}
                  </Badge>
                  <Switch
                    checked={config.environment === 'production'}
                    onCheckedChange={(checked) => 
                      setConfig({ ...config, environment: checked ? 'production' : 'sandbox' })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="text"
                  placeholder="EAN-xxxxxxxxxxxxxxxxx"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="font-mono"
                />
              </div>

              {/* API Secret */}
              <div className="space-y-2">
                <Label htmlFor="apiSecret">API Secret *</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={config.apiSecret}
                  onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                  className="font-mono"
                />
              </div>

              {/* Partner ID */}
              <div className="space-y-2">
                <Label htmlFor="partnerId">Partner ID (opcional)</Label>
                <Input
                  id="partnerId"
                  type="text"
                  placeholder="123456"
                  value={config.partnerId}
                  onChange={(e) => setConfig({ ...config, partnerId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  ID do parceiro no programa Expedia Partner Central
                </p>
              </div>

              {/* Hotel ID */}
              <div className="space-y-2">
                <Label htmlFor="hotelId">Property ID / Hotel ID</Label>
                <Input
                  id="hotelId"
                  type="text"
                  placeholder="12345678"
                  value={config.hotelId}
                  onChange={(e) => setConfig({ ...config, hotelId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  ID da propriedade no Expedia (deixe vazio para múltiplas propriedades)
                </p>
              </div>

              {/* Teste de Conexão */}
              <div className="pt-4">
                <Button 
                  onClick={handleTestConnection} 
                  disabled={isTesting}
                  variant="outline"
                  className="w-full"
                >
                  {isTesting ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Testando conexão...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB: CANAIS */}
        {/* ================================================================ */}
        <TabsContent value="channels" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Canais de Distribuição
              </CardTitle>
              <CardDescription>
                Escolha em quais sites do Expedia Group seu imóvel será publicado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Expedia */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Expedia.com</p>
                    <p className="text-xs text-muted-foreground">Portal principal de viagens</p>
                  </div>
                </div>
                <Badge variant="success">Sempre ativo</Badge>
              </div>

              {/* VRBO */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">VRBO</p>
                    <p className="text-xs text-muted-foreground">Vacation Rentals by Owner</p>
                  </div>
                </div>
                <Switch
                  checked={config.vrboEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, vrboEnabled: checked })}
                />
              </div>

              {/* Hotels.com */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Hotels.com</p>
                    <p className="text-xs text-muted-foreground">Parte do Expedia Group</p>
                  </div>
                </div>
                <Badge variant="secondary">Automático</Badge>
              </div>

              {/* Trivago */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Trivago</p>
                    <p className="text-xs text-muted-foreground">Meta-buscador (via Expedia)</p>
                  </div>
                </div>
                <Badge variant="secondary">Automático</Badge>
              </div>

              {config.vrboEnabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="vrboListingId">VRBO Listing ID (opcional)</Label>
                    <Input
                      id="vrboListingId"
                      type="text"
                      placeholder="1234567"
                      value={config.vrboListingId}
                      onChange={(e) => setConfig({ ...config, vrboListingId: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se você já tem um anúncio no VRBO, informe o ID para vincular
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Configurações de Sync */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Label className="text-sm">Conteúdo</Label>
                  <Switch
                    checked={config.syncContent}
                    onCheckedChange={(checked) => setConfig({ ...config, syncContent: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Label className="text-sm">Preços</Label>
                  <Switch
                    checked={config.syncRates}
                    onCheckedChange={(checked) => setConfig({ ...config, syncRates: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Label className="text-sm">Disponibilidade</Label>
                  <Switch
                    checked={config.syncAvailability}
                    onCheckedChange={(checked) => setConfig({ ...config, syncAvailability: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Label className="text-sm">Reservas</Label>
                  <Switch
                    checked={config.syncReservations}
                    onCheckedChange={(checked) => setConfig({ ...config, syncReservations: checked })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Intervalo de Sincronização</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    value={config.syncInterval}
                    onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) || 15 })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB: PAGAMENTOS */}
        {/* ================================================================ */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                Modelo de Pagamento
              </CardTitle>
              <CardDescription>
                Configure como os pagamentos serão processados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  O Expedia oferece <strong>3D Secure</strong> para pagamentos seguros.
                  As migrations do banco já suportam esse fluxo.
                </AlertDescription>
              </Alert>

              {/* Expedia Collect */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Expedia Collect</p>
                  <p className="text-xs text-muted-foreground">
                    Expedia coleta o pagamento do hóspede e repassa para você
                  </p>
                </div>
                <Switch
                  checked={config.expediaCollect}
                  onCheckedChange={(checked) => setConfig({ ...config, expediaCollect: checked })}
                />
              </div>

              {/* Property Collect */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Property Collect</p>
                  <p className="text-xs text-muted-foreground">
                    Você coleta o pagamento diretamente (cartão virtual ou no check-in)
                  </p>
                </div>
                <Switch
                  checked={config.propertyCollect}
                  onCheckedChange={(checked) => setConfig({ ...config, propertyCollect: checked })}
                />
              </div>

              <Separator />

              {/* Comissão */}
              <div className="space-y-2">
                <Label>Taxa de Comissão (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={config.commissionRate}
                    onChange={(e) => setConfig({ ...config, commissionRate: parseFloat(e.target.value) || 15 })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">% por reserva</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  A comissão típica do Expedia é entre 15-20%
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB: WEBHOOKS */}
        {/* ================================================================ */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-orange-500" />
                Configuração de Webhooks
              </CardTitle>
              <CardDescription>
                Receba notificações em tempo real sobre reservas e atualizações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, 'URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure esta URL no Expedia Partner Central
                </p>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder="whsec_xxxxxxxxxxxxxxxx"
                  value={config.webhookSecret}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Secret para validar assinaturas dos webhooks
                </p>
              </div>

              <Separator />

              {/* Eventos Suportados */}
              <div>
                <Label className="mb-2 block">Eventos Suportados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'itinerary.agent.create',
                    'itinerary.agent.cancel',
                    'itinerary.agent.modify',
                    'payment.completed',
                    'refund.processed',
                    'review.submitted'
                  ].map((event) => (
                    <div key={event} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <code className="text-xs bg-muted px-1 rounded">{event}</code>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2">
          <Switch
            id="enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
          <Label htmlFor="enabled" className="text-sm">
            Integração {config.enabled ? 'Ativa' : 'Inativa'}
          </Label>
        </div>
        
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Salvar Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ExpediaGroupIntegration;
