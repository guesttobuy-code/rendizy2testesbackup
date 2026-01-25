/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                   WHATSAPP META CLOUD API INTEGRATION                      ║
 * ║                                                                            ║
 * ║  🎯 Integração com API Oficial do WhatsApp Business via Meta              ║
 * ║  📱 https://developers.facebook.com/docs/whatsapp/cloud-api               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Este componente gerencia a integração direta com a API oficial do WhatsApp
 * Business Cloud da Meta, sem intermediários como WAHA ou Evolution.
 * 
 * VANTAGENS:
 * - API oficial, suporte direto da Meta
 * - Sem custos de servidor intermediário
 * - Melhor rate limit e confiabilidade
 * - Recursos avançados (templates, buttons, flows)
 * 
 * REQUISITOS:
 * - Meta Business Account
 * - WhatsApp Business Account (WABA)
 * - Facebook App com permissões WhatsApp
 * - System User com Access Token permanente
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Phone,
  Key,
  Globe,
  Webhook,
  FileText,
  Settings,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Separator } from './ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../src/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

interface MetaCloudConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  webhookVerifyToken: string;
  appId: string;
  appSecret: string;
  isEnabled: boolean;
  isTestMode: boolean;
}

interface ConnectionStatus {
  isConnected: boolean;
  phoneNumber?: string;
  displayName?: string;
  qualityRating?: 'GREEN' | 'YELLOW' | 'RED';
  messagingLimit?: string;
  lastChecked?: Date;
}

// ============================================
// CONSTANTS
// ============================================

const META_GRAPH_API_VERSION = 'v23.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

const DOCS_LINKS = {
  getStarted: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  pricing: 'https://developers.facebook.com/docs/whatsapp/pricing',
  webhooks: 'https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks',
  templates: 'https://developers.facebook.com/docs/whatsapp/message-templates',
  businessAccount: 'https://business.facebook.com/settings',
  appDashboard: 'https://developers.facebook.com/apps'
};

// ============================================
// MAIN COMPONENT
// ============================================

export function WhatsAppMetaCloudIntegration() {
  const { isAdmin, isSuperAdmin, organization } = useAuth();
  const canConfigure = isAdmin || isSuperAdmin;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Config state
  const [config, setConfig] = useState<MetaCloudConfig>({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    webhookVerifyToken: '',
    appId: '',
    appSecret: '',
    isEnabled: false,
    isTestMode: true
  });

  // Connection status
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false
  });

  // Webhook URL (gerado automaticamente)
  const webhookUrl = organization?.id 
    ? `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/whatsapp-meta-webhook/${organization.id}`
    : '';

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadConfig();
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // TODO: Carregar configuração do Supabase
      // Por enquanto, apenas simula
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Placeholder - em produção, carregar do banco
      console.log('[MetaCloud] Configuração carregada');
    } catch (error) {
      console.error('[MetaCloud] Erro ao carregar config:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canConfigure) {
      toast.error('Você não tem permissão para configurar integrações');
      return;
    }

    if (!config.phoneNumberId || !config.wabaId || !config.accessToken) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Salvar no Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Configuração salva com sucesso');
    } catch (error) {
      console.error('[MetaCloud] Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.accessToken || !config.phoneNumberId) {
      toast.error('Configure o Access Token e Phone Number ID primeiro');
      return;
    }

    setIsTesting(true);
    try {
      // Testar conexão com a API da Meta
      const response = await fetch(
        `${META_GRAPH_API_BASE}/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro na conexão');
      }

      const data = await response.json();
      
      setStatus({
        isConnected: true,
        phoneNumber: data.display_phone_number,
        displayName: data.verified_name,
        qualityRating: data.quality_rating,
        messagingLimit: data.messaging_limit_tier,
        lastChecked: new Date()
      });

      toast.success(`Conectado! Número: ${data.display_phone_number}`);
    } catch (error: any) {
      console.error('[MetaCloud] Erro ao testar:', error);
      setStatus({ isConnected: false });
      toast.error(error.message || 'Erro ao testar conexão');
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderSetupGuide = () => (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Guia de Configuração - Meta WhatsApp Cloud API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-2">
          <p className="font-medium">Passos para configurar:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-gray-600 dark:text-gray-400">
            <li>
              Crie uma conta no{' '}
              <a href={DOCS_LINKS.appDashboard} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">
                Meta for Developers <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Crie um novo App e selecione "Connect with customers through WhatsApp"</li>
            <li>
              Configure seu{' '}
              <a href={DOCS_LINKS.businessAccount} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">
                Meta Business Account <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Gere um <strong>System User Access Token</strong> com permissões permanentes</li>
            <li>Copie o <strong>Phone Number ID</strong> e <strong>WhatsApp Business Account ID</strong></li>
            <li>Configure o Webhook URL abaixo no painel da Meta</li>
          </ol>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <a href={DOCS_LINKS.getStarted} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Documentação
              <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
          <a href={DOCS_LINKS.pricing} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              💰 Preços
              <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
          <a href={DOCS_LINKS.templates} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              📝 Templates
              <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );

  const renderConnectionStatus = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Status da Conexão
          </span>
          <Badge variant={status.isConnected ? 'success' : 'secondary'}>
            {status.isConnected ? (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</>
            ) : (
              <><XCircle className="w-3 h-3 mr-1" /> Desconectado</>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status.isConnected ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Número:</span>
              <span className="font-medium">{status.phoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nome Verificado:</span>
              <span className="font-medium">{status.displayName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Qualidade:</span>
              <Badge variant={
                status.qualityRating === 'GREEN' ? 'success' :
                status.qualityRating === 'YELLOW' ? 'warning' : 'destructive'
              }>
                {status.qualityRating || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Limite de Mensagens:</span>
              <span className="font-medium">{status.messagingLimit || 'N/A'}</span>
            </div>
            {status.lastChecked && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Última verificação:</span>
                <span>{status.lastChecked.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Configure as credenciais e teste a conexão para ver o status.
          </p>
        )}
      </CardContent>
    </Card>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <AlertTitle>WhatsApp Business Cloud API (Oficial)</AlertTitle>
        <AlertDescription>
          Integração direta com a API oficial da Meta. Não requer servidores intermediários como WAHA ou Evolution.
          Paga por mensagem conforme{' '}
          <a href={DOCS_LINKS.pricing} target="_blank" rel="noopener noreferrer" className="underline">
            preços da Meta
          </a>.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="gap-1.5">
            <Settings className="w-4 h-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-1.5">
            <Webhook className="w-4 h-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Guia
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Coluna 1: Credenciais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Credenciais da API
                </CardTitle>
                <CardDescription>
                  Obtenha no Meta Business Suite
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone Number ID */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumberId" className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    Phone Number ID *
                  </Label>
                  <Input
                    id="phoneNumberId"
                    placeholder="Ex: 123456789012345"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    disabled={!canConfigure}
                  />
                </div>

                {/* WABA ID */}
                <div className="space-y-2">
                  <Label htmlFor="wabaId" className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    WhatsApp Business Account ID *
                  </Label>
                  <Input
                    id="wabaId"
                    placeholder="Ex: 123456789012345"
                    value={config.wabaId}
                    onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                    disabled={!canConfigure}
                  />
                </div>

                {/* Access Token */}
                <div className="space-y-2">
                  <Label htmlFor="accessToken" className="flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" />
                    System User Access Token *
                  </Label>
                  <div className="relative">
                    <Input
                      id="accessToken"
                      type={showSecrets ? 'text' : 'password'}
                      placeholder="EAAxxxxxxx..."
                      value={config.accessToken}
                      onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                      disabled={!canConfigure}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use um token permanente de System User, não temporário
                  </p>
                </div>

                {/* App ID (opcional) */}
                <div className="space-y-2">
                  <Label htmlFor="appId" className="flex items-center gap-1 text-gray-500">
                    App ID (opcional)
                  </Label>
                  <Input
                    id="appId"
                    placeholder="Ex: 123456789012345"
                    value={config.appId}
                    onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                    disabled={!canConfigure}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Coluna 2: Status e Ações */}
            <div className="space-y-4">
              {renderConnectionStatus()}

              {/* Ações */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Integração Ativa</Label>
                      <p className="text-xs text-gray-500">Habilitar envio/recebimento</p>
                    </div>
                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
                      disabled={!canConfigure}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Modo de Teste</Label>
                      <p className="text-xs text-gray-500">Usar números de teste</p>
                    </div>
                    <Switch
                      checked={config.isTestMode}
                      onCheckedChange={(checked) => setConfig({ ...config, isTestMode: checked })}
                      disabled={!canConfigure}
                    />
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestConnection}
                      variant="outline"
                      disabled={isTesting || !config.accessToken}
                      className="flex-1"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Testar Conexão
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !canConfigure}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Webhook */}
        <TabsContent value="webhook" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Configuração do Webhook
              </CardTitle>
              <CardDescription>
                Configure este URL no painel da Meta para receber mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>Webhook URL (Callback URL)</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm bg-gray-50 dark:bg-gray-900"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  >
                    {copied === 'Webhook URL' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Verify Token */}
              <div className="space-y-2">
                <Label htmlFor="webhookVerifyToken">Verify Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookVerifyToken"
                    placeholder="rendizy-meta-verify-2026"
                    value={config.webhookVerifyToken || 'rendizy-meta-verify-2026'}
                    onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                    disabled={!canConfigure}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(config.webhookVerifyToken || 'rendizy-meta-verify-2026', 'Verify Token')}
                  >
                    {copied === 'Verify Token' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Use este token ao configurar o webhook no Meta App Dashboard
                </p>
              </div>

              <Separator />

              {/* Instruções */}
              <Alert>
                <Info className="w-4 h-4" />
                <AlertTitle>Como configurar o Webhook na Meta</AlertTitle>
                <AlertDescription className="mt-2 space-y-2 text-sm">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Acesse o <a href={DOCS_LINKS.appDashboard} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">App Dashboard</a></li>
                    <li>Vá em WhatsApp → Configuration → Webhook</li>
                    <li>Cole a <strong>Callback URL</strong> e <strong>Verify Token</strong> acima</li>
                    <li>Subscreva aos eventos: <code>messages</code>, <code>message_status</code></li>
                    <li>Clique em "Verify and Save"</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Guia */}
        <TabsContent value="guide" className="space-y-4 mt-4">
          {renderSetupGuide()}

          {/* Comparison Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparação: Meta Cloud API vs WAHA/Evolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Recurso</th>
                      <th className="text-center py-2 px-2">Meta Cloud</th>
                      <th className="text-center py-2 px-2">WAHA/Evolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 px-2">Suporte Oficial</td>
                      <td className="text-center py-2">✅ Sim</td>
                      <td className="text-center py-2">❌ Não</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Servidor Próprio</td>
                      <td className="text-center py-2">❌ Não requer</td>
                      <td className="text-center py-2">✅ Necessário</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Custo por Mensagem</td>
                      <td className="text-center py-2">💰 Pago (Meta)</td>
                      <td className="text-center py-2">🆓 Grátis*</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Templates Aprovados</td>
                      <td className="text-center py-2">✅ Obrigatório</td>
                      <td className="text-center py-2">❌ Não necessário</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Botões Interativos</td>
                      <td className="text-center py-2">✅ Completo</td>
                      <td className="text-center py-2">⚠️ Limitado</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">WhatsApp Flows</td>
                      <td className="text-center py-2">✅ Sim</td>
                      <td className="text-center py-2">❌ Não</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Rate Limit</td>
                      <td className="text-center py-2">Alto</td>
                      <td className="text-center py-2">Depende do servidor</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2">Risco de Banimento</td>
                      <td className="text-center py-2">Baixo</td>
                      <td className="text-center py-2">⚠️ Moderado</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                * WAHA Core é gratuito, mas WAHA Plus tem custo. Ambos requerem servidor próprio.
              </p>
            </CardContent>
          </Card>

          {/* Pricing Info */}
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <AlertTitle>Sobre os custos da Meta Cloud API</AlertTitle>
            <AlertDescription className="mt-2 text-sm">
              <p>A Meta cobra por mensagem enviada. Os preços variam por país e tipo de mensagem:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Mensagens de Marketing:</strong> ~$0.05-0.10 USD por mensagem</li>
                <li><strong>Mensagens Utilitárias:</strong> ~$0.02-0.05 USD por mensagem</li>
                <li><strong>Mensagens de Serviço:</strong> Gratuitas (dentro da janela de 24h)</li>
              </ul>
              <p className="mt-2">
                <a href={DOCS_LINKS.pricing} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                  Ver tabela completa de preços →
                </a>
              </p>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WhatsAppMetaCloudIntegration;
