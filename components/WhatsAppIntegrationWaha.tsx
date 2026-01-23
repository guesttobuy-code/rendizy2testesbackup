/**
 * RENDIZY - WhatsApp Integration (WAHA - WhatsApp HTTP API)
 * 
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  @PROTECTED v1.0.104.001                                                 ║
 * ║  @ADR docs/ADR/ADR-007-MULTI-CHANNEL-CHAT-ARCHITECTURE.md                ║
 * ║  @ADR docs/ADR/ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md              ║
 * ║  @TESTED 2026-01-22                                                      ║
 * ║  @STATUS 🚧 EM DESENVOLVIMENTO                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * @ARCHITECTURE ADR-008 - Provider Isolado
 * @PROVIDER WAHA
 * @INDEPENDENT Este componente é 100% independente de outros providers
 * @DOCS https://waha.devlike.pro/docs/overview/introduction/
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 REGRA OBRIGATÓRIA: COMPONENTE ISOLADO POR PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este arquivo é um COMPONENTE ISOLADO para o provider WAHA.
 * Ele DEVE:
 * ✅ Conter APENAS lógica do provider WAHA
 * ✅ Gerenciar seu próprio estado independentemente
 * ✅ Usar tipos específicos (WAHAConfig, WAHASession, etc)
 * ✅ Ser testável isoladamente
 * 
 * Ele NUNCA deve:
 * ❌ Importar código do Evolution
 * ❌ Compartilhar estado com outros providers
 * ❌ Ter dependências cruzadas entre providers
 * 
 * API WAHA:
 * - Header: X-Api-Key
 * - Endpoints: /api/sessions, /api/{session}/auth/qr, etc
 * - Status: STOPPED, STARTING, SCAN_QR_CODE, WORKING, FAILED
 * 
 * GitHub: https://github.com/devlikeapro/waha
 * 
 * @version 1.0.104.001
 * @date 2026-01-22
 */

import { useState, useEffect, useCallback } from 'react';
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
import { Switch } from './ui/switch';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
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
  Phone,
  Zap,
  Webhook,
  Power,
  Play,
  Square,
  ExternalLink,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { channelsApi, OrganizationChannelConfig } from '../utils/chatApi';
import { useAuth } from '../src/contexts/AuthContext';
import WhatsAppInstancesManagerWaha from './WhatsAppInstancesManagerWaha';

// ============================================================================
// WAHA INSTANCE TYPE (from channel_instances)
// ============================================================================
interface WahaInstance {
  id: string;
  organization_id: string;
  instance_name: string;
  api_url: string;
  api_key: string;
  status: string;
  is_enabled: boolean;
  description?: string;
  color?: string;
  webhook_url?: string;
}

// ============================================================================
// TYPES
// ============================================================================

type WAHAStatus = 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';

interface WAHASession {
  name: string;
  status: WAHAStatus;
  me?: {
    id: string;
    pushName: string;
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Valores padrão das variáveis de ambiente
const DEFAULT_WAHA_URL = import.meta.env.VITE_WAHA_API_URL || 'http://76.13.82.60:3001';
const DEFAULT_WAHA_KEY = import.meta.env.VITE_WAHA_API_KEY || '';

export default function WhatsAppIntegrationWaha() {
  const { organization } = useAuth();
  const organizationId = organization?.id || '00000000-0000-0000-0000-000000000001';
  
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OrganizationChannelConfig | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  
  // Estado persistente do WAHA (vem do channel_instances)
  const [wahaInstance, setWahaInstance] = useState<WahaInstance | null>(null);
  const [wahaEnabled, setWahaEnabled] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  
  // Formulário WAHA - inicializado com valores do .env
  const [wahaForm, setWahaForm] = useState({
    api_url: DEFAULT_WAHA_URL,
    api_key: DEFAULT_WAHA_KEY,
    session_name: 'default',
    engine: 'WEBJS' as 'WEBJS' | 'NOWEB' | 'GOWS',
  });
  
  // Estados de sessão
  const [sessionStatus, setSessionStatus] = useState<WAHAStatus | null>(null);
  const [sessions, setSessions] = useState<WAHASession[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  
  // Modal de múltiplas sessões
  const [showInstancesManager, setShowInstancesManager] = useState(false);
  
  // Webhook URL para WAHA
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/waha/webhook`;

  // ============================================================================
  // LOAD CONFIG - Carrega configuração + instância WAHA do banco
  // ============================================================================

  const loadWahaInstance = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase
        .from('channel_instances') as any)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('provider', 'waha')
        .is('deleted_at', null)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao carregar instância WAHA:', error);
        return;
      }
      
      if (data) {
        setWahaInstance(data as WahaInstance);
        setWahaEnabled(data.is_enabled ?? false);
        console.log('📦 [WAHA] Instância carregada do banco:', data);
      } else {
        setWahaInstance(null);
        setWahaEnabled(false);
      }
    } catch (err) {
      console.error('Erro ao carregar instância WAHA:', err);
    }
  }, [organizationId]);

  useEffect(() => {
    loadConfig();
    loadWahaInstance();
  }, [organizationId, loadWahaInstance]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const result = await channelsApi.getConfig(organizationId);
      if (result.success && result.data) {
        setConfig(result.data);
        
        // Preencher formulário com dados WAHA salvos
        if (result.data.waha) {
          setWahaForm({
            api_url: result.data.waha.api_url || '',
            api_key: result.data.waha.api_key || '',
            session_name: result.data.waha.session_name || 'default',
            engine: (result.data.waha.engine as 'WEBJS' | 'NOWEB' | 'GOWS') || 'WEBJS',
          });
          
          // Se já está configurado, verificar status
          if (result.data.waha.enabled && result.data.waha.api_url) {
            checkSessionStatus();
          }
        }
      }
    } catch (error) {
      console.error('❌ [WAHA] Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    }
    setLoading(false);
  };

  // ============================================================================
  // WAHA API FUNCTIONS
  // ============================================================================

  /**
   * Listar sessões no servidor WAHA
   */
  const listSessions = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key) return;
    
    try {
      const result = await channelsApi.waha.listSessions({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
      });

      if (result.success && result.data) {
        setSessions(result.data as WAHASession[]);
        console.log('📋 [WAHA] Sessões encontradas:', result.data);
      }
    } catch (error) {
      console.error('❌ [WAHA] Erro ao listar sessões:', error);
    }
  };

  /**
   * Verificar status da sessão configurada
   */
  /**
   * TOGGLE WAHA - Ativar/Desativar WAHA com persistência
   * Fluxo unificado:
   * - ATIVAR: Cria sessão no WAHA + Salva no channel_instances + Mostra QR
   * - DESATIVAR: Para sessão + Soft delete no banco
   */
  const handleToggleWaha = async (enabled: boolean) => {
    if (!organizationId) {
      toast.error('Organização não encontrada');
      return;
    }
    
    setSavingToggle(true);
    const supabase = getSupabaseClient();
    
    try {
      if (enabled) {
        // ============= ATIVAR WAHA =============
        console.log('🟢 [WAHA] Ativando WAHA...');
        
        // 1. Criar sessão no servidor WAHA (sempre "default" no WAHA Core)
        const createResult = await channelsApi.waha.createSession({
          api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
          api_key: wahaForm.api_key.trim(),
          session_name: 'default',
          webhook_url: webhookUrl,
        });
        
        // Se sessão já existe, tudo bem
        if (!createResult.success && !createResult.error?.includes('already exists')) {
          toast.error(createResult.error || 'Erro ao criar sessão no WAHA');
          setSavingToggle(false);
          return;
        }
        
        // 2. Salvar/atualizar no banco channel_instances
        if (wahaInstance) {
          // Atualizar existente
          const { error: updateError } = await (supabase
            .from('channel_instances') as any)
            .update({
              is_enabled: true,
              status: 'connecting',
              deleted_at: null, // reativar se estava soft-deleted
              updated_at: new Date().toISOString(),
            })
            .eq('id', wahaInstance.id);
          
          if (updateError) {
            console.error('Erro ao atualizar instância:', updateError);
          }
        } else {
          // Criar nova instância
          const { data: newInstance, error: insertError } = await (supabase
            .from('channel_instances') as any)
            .insert({
              organization_id: organizationId,
              channel: 'whatsapp',
              provider: 'waha',
              instance_name: 'default',
              api_url: wahaForm.api_url.trim(),
              api_key: wahaForm.api_key.trim(),
              description: 'WhatsApp Principal',
              color: '#25D366',
              webhook_url: webhookUrl,
              status: 'connecting',
              is_enabled: true,
              is_default: true,
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Erro ao criar instância:', insertError);
          } else {
            setWahaInstance(newInstance as WahaInstance);
          }
        }
        
        // 3. Atualizar estado local
        setWahaEnabled(true);
        
        // 4. Verificar status e mostrar QR
        await checkSessionStatus();
        
        // 5. Mudar para aba de Status automaticamente
        setActiveTab('status');
        
        toast.success('✅ WAHA ativado! Escaneie o QR Code para conectar.');
        
      } else {
        // ============= DESATIVAR WAHA =============
        console.log('🔴 [WAHA] Desativando WAHA...');
        
        // 1. Parar sessão no WAHA (não deletar, só parar)
        try {
          await channelsApi.waha.stopSession({
            api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
            api_key: wahaForm.api_key.trim(),
            session_name: 'default',
          });
        } catch (stopErr) {
          console.warn('Erro ao parar sessão (pode já estar parada):', stopErr);
        }
        
        // 2. Soft delete no banco
        if (wahaInstance) {
          const { error: updateError } = await (supabase
            .from('channel_instances') as any)
            .update({
              is_enabled: false,
              status: 'disconnected',
              deleted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', wahaInstance.id);
          
          if (updateError) {
            console.error('Erro ao desativar instância:', updateError);
          }
        }
        
        // 3. Atualizar estado local
        setWahaEnabled(false);
        setSessionStatus(null);
        setQrCode(null);
        
        toast.success('⚪ WAHA desativado');
      }
      
      // Recarregar instância do banco
      await loadWahaInstance();
      
    } catch (error: any) {
      console.error('Erro ao toggle WAHA:', error);
      toast.error(error.message || 'Erro ao atualizar configuração');
    } finally {
      setSavingToggle(false);
    }
  };

  const checkSessionStatus = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key || !wahaForm.session_name) return;
    
    setCheckingStatus(true);
    try {
      const result = await channelsApi.waha.getSessionStatus({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
        session_name: wahaForm.session_name.trim(),
      });

      if (result.success && result.data) {
        setSessionStatus(result.data.status as WAHAStatus);
        
        // Se status é SCAN_QR_CODE, buscar QR Code
        if (result.data.status === 'SCAN_QR_CODE') {
          await fetchQRCode();
        } else if (result.data.status === 'WORKING') {
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error('❌ [WAHA] Erro ao verificar status:', error);
      setSessionStatus('FAILED');
    } finally {
      setCheckingStatus(false);
    }
  };

  /**
   * Buscar QR Code para sessão
   */
  const fetchQRCode = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key || !wahaForm.session_name) return;
    
    try {
      const result = await channelsApi.waha.getQRCode({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
        session_name: wahaForm.session_name.trim(),
      });

      if (result.success && result.data) {
        // WAHA retorna { mimetype, data } onde data é base64
        const qrData = result.data.data || result.data.value || '';
        if (qrData && typeof qrData === 'string') {
          const finalQr = qrData.startsWith('data:image') ? qrData : `data:image/png;base64,${qrData}`;
          setQrCode(finalQr);
        }
      }
    } catch (error) {
      console.error('❌ [WAHA] Erro ao buscar QR Code:', error);
    }
  };

  /**
   * Criar nova sessão no servidor WAHA
   */
  const handleCreateSession = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key || !wahaForm.session_name) {
      toast.error('Preencha todos os campos');
      return;
    }

    setCreatingSession(true);
    try {
      const result = await channelsApi.waha.createSession({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
        session_name: wahaForm.session_name.trim(),
        webhook_url: webhookUrl,
      });

      if (result.success) {
        toast.success('✅ Sessão criada com sucesso!');
        await listSessions();
        await checkSessionStatus();
      } else {
        toast.error(`❌ ${result.error || 'Erro ao criar sessão'}`);
      }
    } catch (error: any) {
      toast.error(`❌ Erro: ${error.message || 'Falha ao criar sessão'}`);
    } finally {
      setCreatingSession(false);
    }
  };

  /**
   * Iniciar sessão (gera QR Code)
   */
  const handleStartSession = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key || !wahaForm.session_name) return;

    setStartingSession(true);
    try {
      const result = await channelsApi.waha.startSession({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
        session_name: wahaForm.session_name.trim(),
      });

      if (result.success) {
        toast.success('✅ Sessão iniciada! Aguarde o QR Code...');
        
        // Polling para pegar QR Code
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          await checkSessionStatus();
          
          if (sessionStatus === 'SCAN_QR_CODE' || sessionStatus === 'WORKING' || attempts > 10) {
            clearInterval(pollInterval);
          }
        }, 2000);
      } else {
        toast.error(`❌ ${result.error || 'Erro ao iniciar sessão'}`);
      }
    } catch (error: any) {
      toast.error(`❌ Erro: ${error.message || 'Falha ao iniciar sessão'}`);
    } finally {
      setStartingSession(false);
    }
  };

  /**
   * Parar sessão
   */
  const handleStopSession = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key || !wahaForm.session_name) return;

    try {
      const result = await channelsApi.waha.stopSession({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
        session_name: wahaForm.session_name.trim(),
      });

      if (result.success) {
        toast.success('Sessão parada');
        setSessionStatus('STOPPED');
        setQrCode(null);
      } else {
        toast.error(`❌ ${result.error || 'Erro ao parar sessão'}`);
      }
    } catch (error: any) {
      toast.error(`❌ Erro: ${error.message || 'Falha ao parar sessão'}`);
    }
  };

  /**
   * Desconectar WhatsApp (logout)
   */
  const handleLogoutSession = async () => {
    if (!wahaForm.api_url || !wahaForm.api_key || !wahaForm.session_name) return;

    try {
      const result = await channelsApi.waha.logoutSession({
        api_url: wahaForm.api_url.trim().replace(/\/$/, ''),
        api_key: wahaForm.api_key.trim(),
        session_name: wahaForm.session_name.trim(),
      });

      if (result.success) {
        toast.success('WhatsApp desconectado');
        setSessionStatus('STOPPED');
        setQrCode(null);
      } else {
        toast.error(`❌ ${result.error || 'Erro ao desconectar'}`);
      }
    } catch (error: any) {
      toast.error(`❌ Erro: ${error.message || 'Falha ao desconectar'}`);
    }
  };

  /**
   * Copiar webhook URL
   */
  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('URL do webhook copiada!');
    } catch (err) {
      toast.error('Erro ao copiar. Copie manualmente.');
    }
  };

  // ============================================================================
  // POLLING DE STATUS
  // ============================================================================

  useEffect(() => {
    if (activeTab !== 'status' || !wahaEnabled) return;
    
    checkSessionStatus();
    
    const interval = setInterval(() => {
      checkSessionStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, config?.waha?.enabled]);

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-emerald-500 mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Carregando configurações WAHA...</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">WhatsApp WAHA</h2>
            <p className="text-sm text-muted-foreground">
              Integração via WAHA (WhatsApp HTTP API) • API moderna e estável
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {sessionStatus === 'WORKING' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Conectado
            </Badge>
          )}
          {sessionStatus === 'SCAN_QR_CODE' && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <QrCode className="w-3 h-3 mr-1" />
              Aguardando QR
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('https://waha.devlike.pro/docs/overview/introduction/', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Docs
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="config" className="space-y-6" onValueChange={setActiveTab}>
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
          <TabsTrigger value="info" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Settings className="w-4 h-4 mr-2" />
            Sobre WAHA
          </TabsTrigger>
        </TabsList>

        {/* TAB: CONFIGURAÇÃO */}
        <TabsContent value="config" className="space-y-6">
          {/* Toggle Ativar/Desativar - USA wahaEnabled (persistente) */}
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${wahaEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    {savingToggle ? (
                      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                    ) : (
                      <Power className={`w-6 h-6 ${wahaEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      {wahaEnabled ? '✅ WAHA Ativado' : '⚪ WAHA Desativado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {savingToggle 
                        ? 'Processando...' 
                        : wahaEnabled 
                          ? 'O módulo WAHA está ativo para sua organização' 
                          : 'Ative para usar o WAHA como provider WhatsApp'}
                    </p>
                    {wahaEnabled && wahaInstance && (
                      <p className="text-xs text-emerald-600">
                        💾 Salvo no banco | Sessão: {wahaInstance.instance_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-sm font-medium text-muted-foreground">
                    {wahaEnabled ? 'Ligado' : 'Desligado'}
                  </span>
                  <Switch
                    checked={wahaEnabled}
                    disabled={savingToggle}
                    onCheckedChange={handleToggleWaha}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Credenciais */}
          <Card>
            <CardHeader>
              <CardTitle>Credenciais do Servidor WAHA</CardTitle>
              <CardDescription>
                Servidor WAHA pré-configurado pelo administrador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Aviso de configuração pronta */}
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertDescription className="text-green-900">
                  <strong>✅ Servidor WAHA já configurado!</strong>
                  <p className="text-sm mt-1">
                    Você não precisa alterar nada aqui. Vá para <strong>"Status & Conexão"</strong> para criar sua sessão e escanear o QR Code.
                  </p>
                </AlertDescription>
              </Alert>

              {/* URL do Servidor - READONLY */}
              <div className="space-y-2">
                <Label htmlFor="waha_api_url">URL do Servidor WAHA</Label>
                <div className="flex gap-2">
                  <Link2 className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="waha_api_url"
                    value={wahaForm.api_url}
                    readOnly
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  🔒 Configurado pelo administrador
                </p>
              </div>

              {/* API Key - READONLY */}
              <div className="space-y-2">
                <Label htmlFor="waha_api_key">API Key (X-Api-Key)</Label>
                <div className="flex gap-2">
                  <Key className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 relative">
                    <Input
                      id="waha_api_key"
                      type="password"
                      value="••••••••••••••••••••"
                      readOnly
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  🔒 Chave protegida - configurada pelo administrador
                </p>
              </div>

              {/* Nome da Sessão */}
              <div className="space-y-2">
                <Label htmlFor="waha_session">Nome da Sessão</Label>
                <div className="flex gap-2">
                  <Phone className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="waha_session"
                    value={wahaForm.session_name}
                    onChange={(e) => setWahaForm({ ...wahaForm, session_name: e.target.value })}
                    placeholder="default"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Identificador da sessão WhatsApp (use "default" se não souber)
                </p>
              </div>

              <Separator />

              {/* Instrução Principal */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Como conectar seu WhatsApp:
                </h4>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Clique em <strong>"Status & Conexão"</strong> acima</li>
                  <li>Clique em <strong>"Criar Sessão"</strong></li>
                  <li>Escaneie o <strong>QR Code</strong> com seu WhatsApp</li>
                  <li>Pronto! Seu WhatsApp está conectado 🎉</li>
                </ol>
              </div>

              {/* Botão para ir direto para Status */}
              <Button
                onClick={() => setActiveTab('status')}
                className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Conectar meu WhatsApp
              </Button>

              {/* Sessões Encontradas */}
              {sessions.length > 0 && (
                <div className="mt-4">
                  <Label className="mb-2 block">Sessões no Servidor:</Label>
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div 
                        key={session.name}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span className="font-medium">{session.name}</span>
                          <Badge variant={session.status === 'WORKING' ? 'default' : 'outline'}>
                            {session.status}
                          </Badge>
                        </div>
                        {session.me?.pushName && (
                          <span className="text-sm text-muted-foreground">
                            {session.me.pushName}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: STATUS & CONEXÃO */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conectar WhatsApp</CardTitle>
              <CardDescription>
                Gerencie a sessão WAHA e conecte seu WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Atual */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    sessionStatus === 'WORKING' ? 'bg-green-500' :
                    sessionStatus === 'SCAN_QR_CODE' ? 'bg-yellow-500 animate-pulse' :
                    sessionStatus === 'STARTING' ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  <span className="font-medium">
                    Status: {sessionStatus || 'Desconhecido'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkSessionStatus}
                  disabled={checkingStatus}
                >
                  <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Ações de Sessão */}
              <div className="grid grid-cols-2 gap-3">
                {/* Criar Sessão */}
                {!sessionStatus || sessionStatus === 'FAILED' ? (
                  <Button
                    onClick={handleCreateSession}
                    disabled={creatingSession || !wahaForm.api_url || !wahaForm.api_key}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creatingSession ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    Criar Sessão
                  </Button>
                ) : null}

                {/* Iniciar Sessão */}
                {sessionStatus === 'STOPPED' && (
                  <Button
                    onClick={handleStartSession}
                    disabled={startingSession}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {startingSession ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Iniciar Sessão
                  </Button>
                )}

                {/* Parar Sessão */}
                {(sessionStatus === 'WORKING' || sessionStatus === 'SCAN_QR_CODE') && (
                  <Button
                    onClick={handleStopSession}
                    variant="outline"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Parar Sessão
                  </Button>
                )}

                {/* Desconectar WhatsApp */}
                {sessionStatus === 'WORKING' && (
                  <Button
                    onClick={handleLogoutSession}
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                )}
              </div>

              {/* QR Code Display */}
              {qrCode && sessionStatus === 'SCAN_QR_CODE' && (
                <div className="p-6 rounded-lg bg-muted border border-border text-center">
                  <QrCode className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm text-foreground mb-4">
                    ✅ Escaneie o QR Code com o WhatsApp
                  </p>
                  <div className="bg-white p-4 inline-block rounded-lg shadow-lg">
                    <img 
                      src={qrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  <div className="mt-4 text-left space-y-2 text-sm text-muted-foreground">
                    <p><strong>📱 Como conectar:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Abra o WhatsApp no celular</li>
                      <li>Menu (⋮) → "Aparelhos conectados"</li>
                      <li>"Conectar um aparelho"</li>
                      <li>Aponte a câmera para o QR Code</li>
                    </ol>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchQRCode}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar QR Code
                  </Button>
                </div>
              )}

              {/* Conectado */}
              {sessionStatus === 'WORKING' && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-900">
                    <strong>✅ WhatsApp conectado via WAHA!</strong>
                    <p className="text-sm mt-1">
                      Sessão: {wahaForm.session_name} está ativa e recebendo mensagens.
                    </p>
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
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-2xl mt-1">
                      {sessionStatus === 'WORKING' ? 'Online' :
                       sessionStatus === 'SCAN_QR_CODE' ? 'QR Code' :
                       sessionStatus === 'STARTING' ? 'Iniciando' :
                       'Offline'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    sessionStatus === 'WORKING' ? 'bg-green-500/10' :
                    sessionStatus === 'SCAN_QR_CODE' ? 'bg-yellow-500/10' :
                    'bg-gray-500/10'
                  }`}>
                    {sessionStatus === 'WORKING' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : sessionStatus === 'SCAN_QR_CODE' ? (
                      <QrCode className="h-6 w-6 text-yellow-500" />
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
                    <p className="text-sm text-muted-foreground">Sessão</p>
                    <p className="text-2xl mt-1">{wahaForm.session_name || '-'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Engine</p>
                    <p className="text-2xl mt-1">{wahaForm.engine || 'WEBJS'}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card: Múltiplas Sessões */}
          <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Users className="h-5 w-5" />
                Múltiplas Sessões (Múltiplos Números)
              </CardTitle>
              <CardDescription>
                Conecte vários números de WhatsApp ao mesmo tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p>Sessões ativas: <strong className="text-blue-600">{sessions.length}</strong></p>
                  <p className="text-xs text-gray-500 mt-1">
                    Cada sessão = um número de WhatsApp diferente
                  </p>
                </div>
                <Button
                  onClick={() => setShowInstancesManager(true)}
                  disabled={!wahaForm.api_url || !wahaForm.api_key}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Sessões
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: WEBHOOKS */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Webhooks</CardTitle>
              <CardDescription>
                Configure o webhook para receber eventos do WAHA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook (Rendizy)</Label>
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
                  📡 Este webhook é configurado automaticamente ao criar a sessão
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>💡 Eventos Configurados:</strong>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• <code>message</code> - Mensagens recebidas</li>
                    <li>• <code>message.any</code> - Todas as mensagens</li>
                    <li>• <code>state.change</code> - Mudança de estado</li>
                    <li>• <code>session.status</code> - Status da sessão</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SOBRE WAHA */}
        <TabsContent value="info" className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-3">
                <p className="font-semibold">🚀 WAHA - WhatsApp HTTP API</p>
                <p className="text-sm">
                  WAHA é uma alternativa moderna à Evolution API, com melhor documentação, 
                  dashboard integrado e maior estabilidade.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/60 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-2">✅ Vantagens</h4>
                    <ul className="text-xs space-y-1 text-blue-700">
                      <li>• Dashboard visual incluído</li>
                      <li>• Websockets nativos (real-time)</li>
                      <li>• Documentação excelente (Swagger)</li>
                      <li>• Múltiplos engines (WEBJS, NOWEB, GOWS)</li>
                      <li>• QR Code via endpoint dedicado</li>
                      <li>• Retry automático em webhooks</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white/60 rounded-lg p-3">
                    <h4 className="font-medium text-blue-900 mb-2">📋 Requisitos</h4>
                    <ul className="text-xs space-y-1 text-blue-700">
                      <li>• Docker instalado no servidor</li>
                      <li>• Mínimo: 2 CPU + 4GB RAM</li>
                      <li>• Porta 3000 disponível</li>
                      <li>• WAHA Plus para mídia (opcional)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-white/60 rounded-lg p-3 mt-3">
                  <h4 className="font-medium text-blue-900 mb-2">🐳 Instalação Rápida</h4>
                  <div className="font-mono text-xs bg-gray-900 text-green-400 p-3 rounded">
                    <p># 1. Baixar imagem</p>
                    <p>docker pull devlikeapro/waha</p>
                    <p className="mt-2"># 2. Inicializar (gera credenciais)</p>
                    <p>docker run --rm -v "$(pwd):/app/env" devlikeapro/waha init-waha /app/env</p>
                    <p className="mt-2"># 3. Executar</p>
                    <p>docker run -it --env-file "$(pwd)/.env" -p 3000:3000 devlikeapro/waha</p>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://waha.devlike.pro/docs/overview/introduction/', '_blank')}
                  >
                    📚 Documentação
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://github.com/devlikeapro/waha', '_blank')}
                  >
                    🐙 GitHub
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Comparativo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📊 Comparativo: Evolution vs WAHA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Aspecto</th>
                      <th className="text-center py-2 px-3">Evolution API</th>
                      <th className="text-center py-2 px-3">WAHA</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2 px-3">Instalação</td>
                      <td className="text-center py-2 px-3">🟡 Média</td>
                      <td className="text-center py-2 px-3">🟢 Fácil</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">Documentação</td>
                      <td className="text-center py-2 px-3">🟡 Média</td>
                      <td className="text-center py-2 px-3">🟢 Excelente</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">Estabilidade</td>
                      <td className="text-center py-2 px-3">🔴 Baixa</td>
                      <td className="text-center py-2 px-3">🟢 Alta</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">Dashboard</td>
                      <td className="text-center py-2 px-3">❌ Não</td>
                      <td className="text-center py-2 px-3">✅ Sim</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">Websockets</td>
                      <td className="text-center py-2 px-3">❌ Não</td>
                      <td className="text-center py-2 px-3">✅ Sim</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Comunidade BR</td>
                      <td className="text-center py-2 px-3">🟢 Alta</td>
                      <td className="text-center py-2 px-3">🟡 Média</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Gerenciador de Múltiplas Sessões WAHA */}
      <WhatsAppInstancesManagerWaha
        open={showInstancesManager}
        onOpenChange={setShowInstancesManager}
        wahaConfig={{
          api_url: wahaForm.api_url,
          api_key: wahaForm.api_key,
        }}
      />
    </div>
  );
}
