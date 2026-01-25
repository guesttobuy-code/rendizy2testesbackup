/**
 * RENDIZY - WhatsApp Integration (Evolution API)
 * 
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  @PROTECTED v1.0.104.001                                                 ║
 * ║  @ADR docs/ADR/ADR-002-WHATSAPP-EVOLUTION-API-CONNECTION.md              ║
 * ║  @ADR docs/ADR/ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md              ║
 * ║  @TESTED 2026-01-22                                                      ║
 * ║  @STATUS ✅ CONEXÃO FRONTEND FUNCIONANDO                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * @ARCHITECTURE ADR-008 - Provider Isolado
 * @PROVIDER Evolution API
 * @INDEPENDENT Este componente é 100% independente de outros providers
 * @DOCS https://doc.evolution-api.com/
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 REGRA OBRIGATÓRIA: COMPONENTE ISOLADO POR PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este arquivo é um COMPONENTE ISOLADO para o provider Evolution API.
 * Ele DEVE:
 * ✅ Conter APENAS lógica do provider Evolution
 * ✅ Gerenciar seu próprio estado independentemente
 * ✅ Usar tipos específicos (EvolutionAPIConfig, etc)
 * ✅ Ser testável isoladamente
 * 
 * Ele NUNCA deve:
 * ❌ Importar código do WAHA
 * ❌ Compartilhar estado com outros providers
 * ❌ Ter dependências cruzadas entre providers
 * 
 * 🔒 FUNÇÕES PROTEGIDAS (NÃO MODIFICAR SEM TESTES):
 * - handleTestConnection() → Usa proxy /whatsapp/test-connection
 * 
 * Extraído de WhatsAppIntegration.tsx monolítico para melhor organização
 * seguindo padrão ADR-008 (Arquitetura Modular Anti-Monolítica)
 * 
 * @version 1.0.104.001
 * @date 2026-01-22
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { projectId } from '../utils/supabase/info';
import WhatsAppWebhookManager from './WhatsAppWebhookManager';
import WhatsAppInstancesManager from './WhatsAppInstancesManager';
import {
  MessageCircle,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  QrCode,
  Link2,
  Copy,
  RefreshCw,
  Settings,
  Zap,
  Webhook,
  Power,
  Smartphone,
  Lock,
} from 'lucide-react';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { channelsApi, OrganizationChannelConfig } from '../utils/chatApi';
import { evolutionService, SessionStatus } from '../utils/services/evolutionService';
import { useAuth } from '../src/contexts/AuthContext';

// ============================================================================
// CONSTANTES PADRÃO (do .env.local)
// ============================================================================
const DEFAULT_EVO_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'http://76.13.82.60:8080';
const DEFAULT_EVO_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || '';
const DEFAULT_INSTANCE_NAME = 'rendizy-master';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatsAppIntegrationEvolution() {
  const { organization } = useAuth();
  
  // Obter organizationId do contexto, com fallback seguro
  const organizationId = organization?.id || '00000000-0000-0000-0000-000000000001';
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OrganizationChannelConfig | null>(null);
  
  // Formulário inicializado com valores padrão do .env
  const [whatsappForm, setWhatsappForm] = useState({
    api_url: DEFAULT_EVO_URL,
    instance_name: DEFAULT_INSTANCE_NAME,
    api_key: DEFAULT_EVO_KEY,
    instance_token: ''
  });
  
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<SessionStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [showInstancesModal, setShowInstancesModal] = useState(false);
  
  // Webhook URL para Evolution API
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook`;

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  // Verificar status automaticamente após carregar configurações
  useEffect(() => {
    if (config?.whatsapp?.enabled && !loading) {
      console.log('🔍 [Evolution] Verificando status automaticamente ao carregar...');
      checkWhatsAppStatus();
    }
  }, [config?.whatsapp?.enabled, loading]);

  /**
   * Verificar status real da conexão WhatsApp
   */
  const checkWhatsAppStatus = async () => {
    if (!config?.whatsapp?.enabled) {
      return;
    }

    setCheckingStatus(true);
    try {
      console.log('🔍 [Evolution] Verificando status da conexão...');
      const status = await evolutionService.getStatus(organizationId);
      console.log('📊 [Evolution] Status recebido:', status);
      setRealTimeStatus(status);

      // Atualizar config se status mudou
      if (config) {
        const wasConnected = config.whatsapp?.connected || false;
        const isConnected = status === 'CONNECTED';
        
        if (wasConnected !== isConnected) {
          console.log(`🔄 [Evolution] Status mudou: ${wasConnected ? 'Online' : 'Offline'} → ${isConnected ? 'Online' : 'Offline'}`);
          
          // ✅ Se conectou, buscar informações detalhadas da instância (incluindo phone_number)
          let phoneNumber = config.whatsapp?.phone_number;
          if (isConnected) {
            try {
              console.log('📱 [Evolution] Buscando informações da instância...');
              const instanceInfo = await evolutionService.getInstanceInfo();
              if (instanceInfo?.phone) {
                // Limpar o formato @s.whatsapp.net se presente
                phoneNumber = instanceInfo.phone.replace('@s.whatsapp.net', '');
                console.log('📱 [Evolution] Phone number obtido:', phoneNumber);
              }
            } catch (infoError) {
              console.warn('⚠️ [Evolution] Não foi possível obter informações da instância:', infoError);
            }
          }
          
          const updatedConfig = {
            ...config,
            whatsapp: {
              ...config.whatsapp,
              connected: isConnected,
              connection_status: isConnected ? 'connected' as const : 'disconnected' as const,
              last_connected_at: isConnected ? new Date().toISOString() : config.whatsapp?.last_connected_at,
              phone_number: isConnected ? phoneNumber : undefined
            }
          };
          
          setConfig(updatedConfig);

          try {
            await channelsApi.updateConfig(organizationId, {
              whatsapp: {
                ...updatedConfig.whatsapp,
                enabled: true,
                api_url: updatedConfig.whatsapp?.api_url || '',
                instance_name: updatedConfig.whatsapp?.instance_name || '',
                api_key: updatedConfig.whatsapp?.api_key || '',
                phone_number: phoneNumber
              }
            });
            console.log('✅ [Evolution] Status salvo no banco de dados');
          } catch (error) {
            console.error('❌ [Evolution] Erro ao salvar status no banco:', error);
          }

          if (isConnected && !wasConnected) {
            toast.success('✅ WhatsApp conectado com sucesso!', { duration: 3000 });
          }
        } else if (isConnected && !wasConnected) {
          setConfig({
            ...config,
            whatsapp: {
              ...config.whatsapp,
              connected: true,
              connection_status: 'connected'
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ [Evolution] Erro ao verificar status:', error);
      setRealTimeStatus('ERROR');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Polling automático de status quando estiver na aba "Status & Conexão"
  useEffect(() => {
    if (activeTab !== 'status' || !config?.whatsapp?.enabled) {
      return;
    }

    checkWhatsAppStatus();

    const interval = setInterval(() => {
      checkWhatsAppStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, config?.whatsapp?.enabled]);

  const loadConfig = async () => {
    setLoading(true);
    
    console.log('📡 [Evolution] Carregando configurações do Supabase...', { organizationId });
    
    try {
      const result = await channelsApi.getConfig(organizationId);
      
      if (result.success && result.data) {
        console.log('✅ [Evolution] Configurações carregadas do banco');
        setConfig(result.data);
        
        const whatsappData = result.data.whatsapp;
        if (whatsappData) {
          // Usar valores do banco ou manter os padrões do .env
          setWhatsappForm(prev => ({
            api_url: whatsappData.api_url || prev.api_url,
            instance_name: whatsappData.instance_name || prev.instance_name,
            api_key: whatsappData.api_key || prev.api_key,
            instance_token: whatsappData.instance_token || ''
          }));
        }
        // Se não há dados no banco, mantém os valores padrão do .env
      }
    } catch (error) {
      console.error('❌ [Evolution] Erro ao carregar configurações:', error);
      toast.error('Não foi possível carregar configurações.', { duration: 5000 });
    }
    
    setLoading(false);
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('URL do webhook copiada!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = webhookUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('URL do webhook copiada!');
      } catch (e) {
        toast.error('Não foi possível copiar. Copie manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    let cleanUrl = whatsappForm.api_url.trim();
    
    if (cleanUrl.endsWith('/manager')) {
      cleanUrl = cleanUrl.replace(/\/manager\/?$/, '');
      setWhatsappForm(prev => ({ ...prev, api_url: cleanUrl }));
      toast.info('✨ URL ajustada: /manager removido', { duration: 3000 });
    }
    
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    if (cleanUrl === 'https://api.evolutionapi.com') {
      toast.error('⚠️ URL de exemplo detectada!', { duration: 6000 });
      return;
    }

    if (!cleanUrl.startsWith('http')) {
      toast.error('❌ URL inválida!');
      return;
    }

    setConnectingWhatsApp(true);
    setQrCode(null);
    
    try {
      console.log('🔵 Iniciando conexão WhatsApp...');
      toast.info('🔄 Deletando instância existente para gerar novo QR Code...', { duration: 4000 });
      
      const cleanConfig = {
        api_url: cleanUrl,
        instance_name: whatsappForm.instance_name.trim(),
        api_key: whatsappForm.api_key.trim(),
        instance_token: whatsappForm.instance_token.trim()
      };
      
      const result = await channelsApi.evolution.connect(organizationId, cleanConfig);
      
      if (result.success && result.data) {
        let qrCodeData = result.data.qr_code;
        
        if (qrCodeData && !qrCodeData.startsWith('data:image')) {
          qrCodeData = `data:image/png;base64,${qrCodeData}`;
        }
        
        setQrCode(qrCodeData);
        toast.success('✅ QR Code gerado! Escaneie com o WhatsApp', { duration: 8000 });
        
      } else {
        toast.error('❌ ' + (result.error || 'Erro ao conectar WhatsApp'));
      }
    } catch (error: any) {
      console.error('❌ Error connecting WhatsApp:', error);
      
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('❌ API Key inválida!', { duration: 6000 });
      } else if (error.message?.includes('404')) {
        toast.error('❌ Endpoint não encontrado!', { duration: 6000 });
      } else {
        toast.error('❌ Erro: ' + (error.message || 'Erro desconhecido'));
      }
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const result = await channelsApi.evolution.disconnect(organizationId);
      if (result.success) {
        toast.success('WhatsApp desconectado');
        setQrCode(null);
        await loadConfig();
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      toast.error('Erro ao desconectar WhatsApp');
    }
  };

  /**
   * Navegar para a aba Status e iniciar conexão
   */
  const handleGoToConnect = () => {
    setActiveTab('status');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-green-500 mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Carregando configurações Evolution API...</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER - EVOLUTION API
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">WhatsApp Evolution API</h2>
            <p className="text-sm text-muted-foreground">
              Integração com Evolution API v2 • Receba e envie mensagens
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {config?.whatsapp?.connected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6" onValueChange={(value) => setActiveTab(value)}>
        <TabsList className="w-full flex flex-wrap gap-3">
          <TabsTrigger value="config" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Key className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="status" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Zap className="w-4 h-4 mr-2" />
            Status & Conexão
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Settings className="w-4 h-4 mr-2" />
            Avançado
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CONFIGURAÇÃO */}
        <TabsContent value="config" className="space-y-6">
          {/* TOGGLE PARA ATIVAR/DESATIVAR WHATSAPP */}
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${config?.whatsapp?.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Power className={`w-6 h-6 ${config?.whatsapp?.enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      {config?.whatsapp?.enabled ? '✅ WhatsApp Ativado' : '⚪ WhatsApp Desativado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {config?.whatsapp?.enabled 
                        ? 'O módulo de chat WhatsApp está ativo para sua organização' 
                        : 'Ative para usar o chat WhatsApp integrado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-sm font-medium text-muted-foreground">
                    {config?.whatsapp?.enabled ? 'Ligado' : 'Desligado'}
                  </span>
                  <Switch
                    checked={config?.whatsapp?.enabled || false}
                    onCheckedChange={async (checked) => {
                      try {
                        const result = await channelsApi.updateConfig(organizationId, {
                          whatsapp: {
                            enabled: checked,
                            api_url: config?.whatsapp?.api_url || '',
                            instance_name: config?.whatsapp?.instance_name || '',
                            api_key: config?.whatsapp?.api_key || '',
                            connected: config?.whatsapp?.connected || false,
                          }
                        });
                        
                        if (result.success) {
                          setConfig(prev => prev ? {
                            ...prev,
                            whatsapp: {
                              enabled: checked,
                              api_url: prev.whatsapp?.api_url || '',
                              api_key: prev.whatsapp?.api_key || '',
                              instance_name: prev.whatsapp?.instance_name || '',
                              connected: prev.whatsapp?.connected || false,
                            }
                          } : prev);
                          
                          toast.success(checked ? '✅ WhatsApp ativado!' : '⚪ WhatsApp desativado');
                        }
                      } catch (error) {
                        toast.error('Erro ao atualizar configuração');
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD MÚLTIPLAS INSTÂNCIAS */}
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">Múltiplos Números</p>
                    <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">NOVO</Badge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Conecte vários números WhatsApp para diferentes finalidades.
              </p>
              <Button 
                onClick={() => setShowInstancesModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Gerenciar Números
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                Servidor Evolution API
              </CardTitle>
              <CardDescription>
                Configurações do servidor já definidas pelo administrador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alerta de servidor configurado */}
              <Alert className="bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>✅ Servidor Evolution API já configurado!</strong>
                  <br />
                  <span className="text-sm">As configurações abaixo estão pré-definidas. Basta conectar seu WhatsApp.</span>
                </AlertDescription>
              </Alert>

              {/* URL da Evolution API - READONLY */}
              <div className="space-y-2">
                <Label htmlFor="api_url" className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  URL da Evolution API
                </Label>
                <div className="flex gap-2">
                  <Link2 className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="api_url"
                    value={whatsappForm.api_url}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Nome da Instância - READONLY */}
              <div className="space-y-2">
                <Label htmlFor="instance_name" className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  Nome da Instância
                </Label>
                <div className="flex gap-2">
                  <Smartphone className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="instance_name"
                    value={whatsappForm.instance_name}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              {/* API Key - READONLY (mascarada) */}
              <div className="space-y-2">
                <Label htmlFor="api_key" className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  API Key
                </Label>
                <div className="flex gap-2">
                  <Key className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="api_key"
                    type="password"
                    value={whatsappForm.api_key ? '••••••••••••••••' : ''}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <Separator />

              {/* URL do Webhook */}
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="bg-muted font-mono text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyWebhook}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  📡 Webhook configurado automaticamente para receber mensagens
                </p>
              </div>

              <Separator />

              {/* INSTRUÇÕES */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">📱 Como conectar seu WhatsApp:</h4>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Clique no botão verde abaixo para ir para a aba "Status"</li>
                  <li>Clique em "Gerar QR Code"</li>
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Vá em Menu (⋮) → Aparelhos conectados → Conectar</li>
                  <li>Escaneie o QR Code com a câmera</li>
                </ol>
              </div>

              {/* BOTÃO GRANDE PARA CONECTAR */}
              <Button
                onClick={handleGoToConnect}
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              >
                <QrCode className="w-6 h-6 mr-3" />
                Conectar meu WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: STATUS & CONEXÃO */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conectar WhatsApp</CardTitle>
              <CardDescription>
                Gere um QR Code para conectar seu WhatsApp ao RENDIZY
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config?.whatsapp?.connected ? (
                <>
                  <Button
                    onClick={handleConnectWhatsApp}
                    disabled={connectingWhatsApp || !whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {connectingWhatsApp ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Gerar QR Code
                      </>
                    )}
                  </Button>

                  {!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ℹ️ Preencha todos os campos na aba "Configuração" antes de gerar o QR Code
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {/* QR Code Display */}
                  {qrCode && (
                    <div className="p-6 rounded-lg bg-muted border border-border text-center">
                      <QrCode className="h-8 w-8 mx-auto mb-3 text-green-500" />
                      <p className="text-sm text-foreground mb-4">
                        ✅ QR Code gerado! Escaneie com o WhatsApp
                      </p>
                      <div className="bg-white p-4 inline-block rounded-lg shadow-lg">
                        {qrCode.startsWith('data:image') ? (
                          <img 
                            src={qrCode} 
                            alt="WhatsApp QR Code" 
                            className="w-64 h-64 object-contain"
                          />
                        ) : (
                          <div className="w-64 h-64 bg-white flex items-center justify-center p-2">
                            <code className="text-xs break-all">{qrCode}</code>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 text-left space-y-2 text-sm text-muted-foreground">
                        <p><strong>📱 Como conectar:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 ml-4">
                          <li>Abra o WhatsApp no seu celular</li>
                          <li>Toque em Menu (⋮) e depois em "Aparelhos conectados"</li>
                          <li>Toque em "Conectar um aparelho"</li>
                          <li>Aponte a câmera para este QR Code</li>
                        </ol>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleConnectWhatsApp}
                        disabled={connectingWhatsApp}
                        className="mt-4"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${connectingWhatsApp ? 'animate-spin' : ''}`} />
                        {connectingWhatsApp ? 'Gerando...' : 'Gerar Novo QR Code'}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 O QR Code expira após alguns minutos. Se expirar, clique em "Gerar Novo QR Code"
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-900">
                    <div className="space-y-3">
                      <p className="text-sm"><strong>✅ WhatsApp Conectado com Sucesso!</strong></p>
                      {config?.whatsapp?.phone_number && (
                        <p className="text-xs">
                          Número conectado: <code className="bg-green-100 px-2 py-1 rounded">{config.whatsapp.phone_number}</code>
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectWhatsApp}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={checkWhatsAppStatus}
                        disabled={checkingStatus}
                        title="Atualizar status"
                      >
                        <RefreshCw className={`h-3 w-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-2xl mt-1">
                      {(() => {
                        const statusToShow = realTimeStatus !== null 
                          ? realTimeStatus 
                          : (config?.whatsapp?.connected ? 'CONNECTED' : 'DISCONNECTED');
                        
                        if (statusToShow === 'CONNECTED') return 'Online';
                        if (statusToShow === 'CONNECTING') return 'Conectando...';
                        if (statusToShow === 'ERROR') return 'Erro';
                        return 'Offline';
                      })()}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full ${
                    (realTimeStatus === 'CONNECTED' || (!realTimeStatus && config?.whatsapp?.connected))
                      ? 'bg-green-500/10' 
                      : realTimeStatus === 'CONNECTING'
                      ? 'bg-yellow-500/10'
                      : 'bg-gray-500/10'
                  } flex items-center justify-center`}>
                    {realTimeStatus === 'CONNECTED' || (!realTimeStatus && config?.whatsapp?.connected) ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : realTimeStatus === 'CONNECTING' ? (
                      <Loader2 className="h-6 w-6 text-yellow-500 animate-spin" />
                    ) : (
                      <XCircle className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
                    <p className="text-2xl mt-1">0</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                    <p className="text-2xl mt-1">0%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: WEBHOOKS */}
        <TabsContent value="webhooks" className="space-y-6">
          <WhatsAppWebhookManager />
        </TabsContent>

        {/* TAB 4: AVANÇADO */}
        <TabsContent value="advanced" className="space-y-6">
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                Múltiplos Números WhatsApp
                <Badge variant="outline" className="ml-2 text-blue-600 border-blue-300">NOVO</Badge>
              </CardTitle>
              <CardDescription>
                Conecte vários números WhatsApp para diferentes finalidades (vendas, suporte, reservas, etc).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowInstancesModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Gerenciar Números
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
              <CardDescription>
                Opções avançadas para usuários experientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  🚧 Configurações avançadas serão disponibilizadas em breve
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recursos Planejados:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Configuração de respostas automáticas</li>
                  <li>Agendamento de mensagens</li>
                  <li>Templates de mensagens personalizados</li>
                  <li>Integração com chatbots</li>
                  <li>Relatórios e analytics detalhados</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Multi-Instância */}
      <WhatsAppInstancesManager 
        open={showInstancesModal} 
        onOpenChange={setShowInstancesModal} 
      />
    </div>
  );
}
