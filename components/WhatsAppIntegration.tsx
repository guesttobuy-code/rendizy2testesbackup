/**
 * RENDIZY - WhatsApp Integration (Evolution API)
 * 
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  @PROTECTED v1.0.103.1201                                                ║
 * ║  @ADR docs/ADR/ADR-002-WHATSAPP-EVOLUTION-API-CONNECTION.md              ║
 * ║  @TESTED 2026-01-21                                                      ║
 * ║  @STATUS ✅ CONEXÃO FRONTEND FUNCIONANDO                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * Integração completa com Evolution API para WhatsApp
 * Permite conectar instâncias WhatsApp e gerenciar configurações
 * 
 * 🔒 FUNÇÕES PROTEGIDAS (NÃO MODIFICAR SEM TESTES):
 * - handleTestConnection() → Usa proxy /whatsapp/test-connection
 * 
 * ✅ v1.0.103.1201 (2026-01-21): Adicionado toggle para Ativar/Desativar WhatsApp
 *    - Novo Switch para controlar whatsapp.enabled na configuração
 *    - Import do componente Switch e ícone Power
 *    - Card destacado no topo da aba Configuração
 * 
 * @figma@ - Modificado em 06/11/2025:
 * - Adicionada nova aba "Webhooks" (linha 583-586)
 * - Import do WhatsAppWebhookManager (linha 28)
 * - Grid expandido de 4 para 5 colunas (linha 570)
 * - Ícone Webhook do lucide-react adicionado
 * 
 * @version 1.0.103.1201 (toggle enable) / 1.0.103.1200 (proxy fix) / 1.0.103.322 (webhooks)
 * @date 2026-01-21 / 2025-11-06 / 2025-10-29
 */

import React, { useState, useEffect } from 'react';
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
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { WhatsAppCredentialsTester } from './WhatsAppCredentialsTester';
import WhatsAppWebhookManager from './WhatsAppWebhookManager';
import WhatsAppInstancesManager from './WhatsAppInstancesManager'; // ✅ v2.0: Multi-instance
import {
  MessageCircle,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  QrCode,
  Link2,
  Copy,
  CheckCircle,
  RefreshCw,
  Settings,
  Phone,
  Zap,
  Webhook,
  Power,
  Smartphone, // ✅ v2.0: Ícone para multi-instance
} from 'lucide-react';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { channelsApi, OrganizationChannelConfig } from '../utils/chatApi';
import { isOfflineMode } from '../utils/offlineConfig';
import { evolutionService, SessionStatus } from '../utils/services/evolutionService';
import { useAuth } from '../src/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface WhatsAppIntegrationProps {
  provider?: 'evolution' | 'waha';
}

interface WhatsAppConfig {
  api_url: string;
  instance_name: string;
  api_key: string;
  enabled: boolean;
  connected: boolean;
  connection_status: 'disconnected' | 'connecting' | 'connected' | 'error';
  phone_number?: string;
  lastSync?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatsAppIntegration({ provider = 'evolution' }: WhatsAppIntegrationProps) {
  const { organization } = useAuth();
  
  // Obter organizationId do contexto, com fallback seguro
  const organizationId = organization?.id || '00000000-0000-0000-0000-000000000001';
  
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<OrganizationChannelConfig | null>(null);
  const [whatsappForm, setWhatsappForm] = useState({
    api_url: '',
    instance_name: '',
    api_key: '',
    instance_token: '' // Adicionado Instance Token
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [showInstanceToken, setShowInstanceToken] = useState(false); // Toggle para Instance Token
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [realTimeStatus, setRealTimeStatus] = useState<SessionStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [showInstancesModal, setShowInstancesModal] = useState(false); // ✅ v2.0: Multi-instance modal
  
  // Webhook URL para Evolution API
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook`;

  useEffect(() => {
    loadConfig();
  }, [organizationId]);

  // ✅ REQUISITO 1: Verificar status automaticamente após carregar configurações
  // Isso garante que o sistema mostre o status correto ao entrar, sem precisar reconectar
  useEffect(() => {
    if (config?.whatsapp?.enabled && !loading) {
      console.log('🔍 [WhatsApp] Verificando status automaticamente ao carregar...');
      checkWhatsAppStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.log('🔍 [WhatsApp] Verificando status da conexão...');
      // ✅ Passar organization_id para o serviço
      const status = await evolutionService.getStatus(organizationId);
      console.log('📊 [WhatsApp] Status recebido:', status);
      setRealTimeStatus(status);

      // Atualizar config se status mudou
      if (config) {
        const wasConnected = config.whatsapp?.connected || false;
        const isConnected = status === 'CONNECTED';
        
        if (wasConnected !== isConnected) {
          console.log(`🔄 [WhatsApp] Status mudou: ${wasConnected ? 'Online' : 'Offline'} → ${isConnected ? 'Online' : 'Offline'}`);
          
          // ✅ REQUISITO 1: Salvar status no banco quando mudar
          const updatedConfig = {
            ...config,
            whatsapp: {
              ...config.whatsapp,
              connected: isConnected,
              connection_status: isConnected ? 'connected' : 'disconnected',
              last_connected_at: isConnected ? new Date().toISOString() : config.whatsapp?.last_connected_at
            }
          };
          
          // Atualizar config local
          setConfig(updatedConfig);

          // Salvar no banco para persistência
          try {
            await channelsApi.updateConfig(organizationId, {
              whatsapp: {
                ...updatedConfig.whatsapp,
                enabled: true
              }
            });
            console.log('✅ [WhatsApp] Status salvo no banco de dados');
          } catch (error) {
            console.error('❌ [WhatsApp] Erro ao salvar status no banco:', error);
          }

          // Mostrar notificação se conectou
          if (isConnected && !wasConnected) {
            toast.success('✅ WhatsApp conectado com sucesso!', { duration: 3000 });
          }
        } else if (isConnected && !wasConnected) {
          // Se já estava conectado mas o status local estava desatualizado, atualizar
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
      console.error('❌ [WhatsApp] Erro ao verificar status:', error);
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

    // Verificar status imediatamente ao abrir a aba
    checkWhatsAppStatus();

    // Polling a cada 5 segundos
    const interval = setInterval(() => {
      checkWhatsAppStatus();
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, config?.whatsapp?.enabled]);

  const loadConfig = async () => {
    setLoading(true);
    
    console.log('📡 [WhatsApp] Carregando configurações do Supabase...', { organizationId });
    
    try {
      const result = await channelsApi.getConfig(organizationId);
      
      console.log('📥 [WhatsApp] Resposta da API:', { 
        success: result.success, 
        hasData: !!result.data,
        whatsapp: result.data?.whatsapp ? 'existe' : 'não existe'
      });
      
      if (result.success && result.data) {
        console.log('✅ [WhatsApp] Configurações carregadas do banco');
        console.log('📋 [WhatsApp] Dados recebidos:', {
          organization_id: result.data.organization_id,
          whatsapp_enabled: result.data.whatsapp?.enabled,
          whatsapp_api_url: result.data.whatsapp?.api_url ? `${result.data.whatsapp.api_url.substring(0, 30)}...` : 'VAZIO',
          whatsapp_instance_name: result.data.whatsapp?.instance_name || 'VAZIO',
          whatsapp_api_key: result.data.whatsapp?.api_key ? '***PRESENTE***' : 'VAZIO',
          whatsapp_instance_token: result.data.whatsapp?.instance_token ? '***PRESENTE***' : 'VAZIO',
        });
        setConfig(result.data);
        
        // ✅ MELHORIA: Garantir que formulário seja preenchido SEMPRE que houver dados salvos
        if (result.data.whatsapp) {
          const formData = {
            api_url: result.data.whatsapp.api_url || '',
            instance_name: result.data.whatsapp.instance_name || '',
            api_key: result.data.whatsapp.api_key || '',
            instance_token: result.data.whatsapp.instance_token || ''
          };
          console.log('📝 [WhatsApp] Preenchendo formulário com dados salvos:', {
            api_url: formData.api_url ? `${formData.api_url.substring(0, 30)}...` : 'VAZIO',
            instance_name: formData.instance_name || 'VAZIO',
            api_key: formData.api_key ? '***PRESENTE***' : 'VAZIO',
            instance_token: formData.instance_token ? '***PRESENTE***' : 'VAZIO',
          });
          setWhatsappForm(formData);
          
          // ✅ Notificar usuário que credenciais foram carregadas
          if (formData.api_url && formData.instance_name) {
            console.log('✅ [WhatsApp] Credenciais carregadas com sucesso! Formulário preenchido automaticamente.');
          }
        } else {
          console.warn('⚠️ [WhatsApp] result.data.whatsapp não existe:', result.data);
        }
      } else {
        console.log('ℹ️ [WhatsApp] Nenhuma configuração encontrada (usando padrão)');
        // ✅ Garantir que formulário esteja vazio se não há dados salvos
        setWhatsappForm({
          api_url: '',
          instance_name: '',
          api_key: '',
          instance_token: ''
        });
      }
    } catch (error) {
      console.error('❌ [WhatsApp] Erro ao carregar configurações:', error);
      
      // Se backend não estiver disponível, mostrar erro
      toast.error('Não foi possível carregar configurações. Verifique se o backend está online.', {
        duration: 5000
      });
    }
    
    setLoading(false);
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('URL do webhook copiada!');
    } catch (err) {
      // Fallback: criar textarea temporário
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

  const handleTestConnection = async () => {
    if (!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Limpar e validar URL
    let cleanUrl = whatsappForm.api_url.trim();
    
    // Remover /manager se existir
    if (cleanUrl.endsWith('/manager')) {
      cleanUrl = cleanUrl.replace(/\/manager\/?$/, '');
      setWhatsappForm(prev => ({ ...prev, api_url: cleanUrl }));
      toast.info('✨ URL ajustada: /manager removido', { duration: 3000 });
    }
    
    // Remover barra final
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    // Validar URL
    if (cleanUrl === 'https://api.evolutionapi.com') {
      toast.error('⚠️ URL de exemplo detectada! Use a URL REAL da sua Evolution API', {
        duration: 6000,
      });
      setConnectionStatus('error');
      return;
    }

    if (!cleanUrl.startsWith('http')) {
      toast.error('❌ URL inválida! Deve começar com http:// ou https://');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('idle');
    setConnectingWhatsApp(true);
    
    try {
      // ✅ FIX v1.0.103.1200: Usar PROXY do backend (evita Mixed Content HTTPS → HTTP)
      console.log('🧪 Testando conexão via PROXY backend...');
      console.log('   URL:', cleanUrl);
      console.log('   Instance:', whatsappForm.instance_name.trim());
      console.log('   API Key:', whatsappForm.api_key.substring(0, 10) + '...');
      
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('rendizy-token') : null;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/test-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
            ...(authToken ? { 'X-Auth-Token': authToken } : {}),
          },
          body: JSON.stringify({
            api_url: cleanUrl,
            api_key: whatsappForm.api_key.trim(),
            instance_name: whatsappForm.instance_name.trim(),
          }),
        }
      );

      console.log('   Status proxy:', response.status);
      
      const result = await response.json();
      console.log('   Resposta proxy:', result);

      if (!result.success) {
        setConnectionStatus('error');
        toast.error(`❌ ${result.error}`, {
          duration: 8000,
        });
        return;
      }

      // Conexão OK!
      setConnectionStatus('success');
      toast.success(result.message || '✅ Conexão OK!', {
        duration: 5000,
      });
      
      // Salvar configuração após teste bem-sucedido
      await channelsApi.updateConfig(organizationId, {
        whatsapp: {
          enabled: true,
          api_url: cleanUrl,
          instance_name: whatsappForm.instance_name.trim(),
          api_key: whatsappForm.api_key.trim(),
          instance_token: whatsappForm.instance_token.trim(),
          connected: false,
          connection_status: 'disconnected'
        }
      });
      
    } catch (error: any) {
      console.error('❌ Erro ao testar conexão:', error);
      setConnectionStatus('error');
      
      // Mensagens de erro mais específicas
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        toast.error('❌ Não foi possível conectar ao servidor! Verifique sua conexão', {
          duration: 8000,
        });
      } else {
        toast.error('❌ Erro ao testar conexão: ' + (error.message || 'Erro desconhecido'), {
          duration: 6000,
        });
      }
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Limpar e validar URL
    let cleanUrl = whatsappForm.api_url.trim();
    
    // Remover /manager se existir
    if (cleanUrl.endsWith('/manager')) {
      cleanUrl = cleanUrl.replace(/\/manager\/?$/, '');
      setWhatsappForm(prev => ({ ...prev, api_url: cleanUrl }));
      toast.info('✨ URL ajustada: /manager removido', { duration: 3000 });
    }
    
    // Remover barra final
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    // Validar URL
    if (cleanUrl === 'https://api.evolutionapi.com') {
      toast.error('⚠️ URL de exemplo detectada! Use a URL REAL da sua Evolution API', {
        duration: 6000,
      });
      return;
    }

    if (!cleanUrl.startsWith('http')) {
      toast.error('❌ URL inválida! Deve começar com http:// ou https://');
      return;
    }

    setConnectingWhatsApp(true);
    setQrCode(null); // Limpar QR Code anterior
    
    try {
      console.log('🔵 Iniciando conexão WhatsApp...');
      console.log('⚠️  A instância existente será deletada e recriada para gerar QR Code válido');
      toast.info('🔄 Deletando instância existente para gerar novo QR Code...', {
        duration: 4000,
      });
      
      // Dados limpos
      const cleanConfig = {
        api_url: cleanUrl,
        instance_name: whatsappForm.instance_name.trim(),
        api_key: whatsappForm.api_key.trim(),
        instance_token: whatsappForm.instance_token.trim() // Adicionado Instance Token
      };
      
      console.log('📤 Enviando request para backend...', cleanConfig);
      
      const result = await channelsApi.evolution.connect(organizationId, cleanConfig);
      
      console.log('📥 Resposta do backend:', result);
      
      if (result.success && result.data) {
        let qrCodeData = result.data.qr_code;
        
        console.log('🔍 QR Code recebido:', qrCodeData ? `${qrCodeData.substring(0, 50)}...` : 'null');
        
        // Se o QR Code for base64 puro, adicionar o prefixo correto
        if (qrCodeData && !qrCodeData.startsWith('data:image')) {
          qrCodeData = `data:image/png;base64,${qrCodeData}`;
          console.log('✨ Prefixo data:image adicionado ao QR Code');
        }
        
        setQrCode(qrCodeData);
        console.log('✅ QR Code definido no state');
        
        toast.success('✅ QR Code gerado! Escaneie com o WhatsApp', {
          duration: 8000,
        });
        
        // NÃO chamar loadConfig() aqui para não sobrescrever o QR Code
        // O QR Code será mantido até que a conexão seja estabelecida
        
      } else {
        console.error('❌ Falha na resposta:', result);
        toast.error('❌ ' + (result.error || 'Erro ao conectar WhatsApp'));
      }
    } catch (error: any) {
      console.error('❌ Error connecting WhatsApp:', error);
      
      // Mensagens de erro mais específicas
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('❌ API Key inválida! Verifique suas credenciais', {
          duration: 6000,
        });
      } else if (error.message?.includes('404')) {
        toast.error('❌ Endpoint não encontrado! Verifique se a URL está correta', {
          duration: 6000,
        });
      } else if (error.message?.includes('dns error') || error.message?.includes('failed to lookup')) {
        toast.error('❌ URL inválida ou servidor inacessível!', {
          duration: 8000,
        });
      } else if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
        toast.error('❌ Erro de conexão! Verifique se o servidor está online', {
          duration: 6000,
        });
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

  const handleSaveConfig = async () => {
    console.log('🔵 handleSaveConfig chamado');
    console.log('📋 Dados do formulário:', whatsappForm);
    
    setSavingConfig(true);
    
    try {
      // Validar campos obrigatórios
      if (!whatsappForm.api_url || !whatsappForm.instance_name || !whatsappForm.api_key) {
        toast.error('❌ Preencha todos os campos obrigatórios');
        return;
      }
      
      // Limpar e validar dados
      let cleanUrl = whatsappForm.api_url.trim();
      
      console.log('🔵 URL original:', cleanUrl);
      
      // Remover /manager se existir
      if (cleanUrl.endsWith('/manager')) {
        cleanUrl = cleanUrl.replace(/\/manager\/?$/, '');
        console.log('✨ URL ajustada (removido /manager):', cleanUrl);
        toast.info('✨ URL ajustada: /manager removido', { duration: 3000 });
      }
      
      // Remover barra final
      cleanUrl = cleanUrl.replace(/\/$/, '');
      
      console.log('🔵 URL limpa:', cleanUrl);
      
      // Validar
      if (!cleanUrl || cleanUrl === 'https://api.evolutionapi.com') {
        console.error('❌ URL de exemplo ou vazia');
        toast.error('❌ Use a URL REAL da sua Evolution API');
        return;
      }
      
      if (!cleanUrl.startsWith('http')) {
        console.error('❌ URL não começa com http');
        toast.error('❌ URL inválida! Deve começar com http:// ou https://');
        return;
      }
      
      // ✅ MELHORIA: Merge completo com dados existentes para garantir que nada se perca
      const configToSave = {
        whatsapp: {
          ...config?.whatsapp, // Preservar dados existentes (QR Code, status de conexão, etc)
          enabled: true,
          api_url: cleanUrl,
          instance_name: whatsappForm.instance_name.trim(),
          api_key: whatsappForm.api_key.trim(),
          instance_token: whatsappForm.instance_token.trim(),
          // Preservar status de conexão se já existir
          connected: config?.whatsapp?.connected || false,
          connection_status: config?.whatsapp?.connection_status || 'disconnected',
          // Preservar campos opcionais que não devem ser sobrescritos
          phone_number: config?.whatsapp?.phone_number,
          qr_code: config?.whatsapp?.qr_code,
          last_connected_at: config?.whatsapp?.last_connected_at,
          error_message: config?.whatsapp?.error_message,
        }
      };
      
      console.log('📤 [WhatsApp] Salvando configurações:', {
        organization_id: organizationId,
        api_url: cleanUrl ? `${cleanUrl.substring(0, 30)}...` : 'VAZIO',
        instance_name: configToSave.whatsapp.instance_name || 'VAZIO',
        api_key: configToSave.whatsapp.api_key ? '***PRESENTE***' : 'VAZIO',
        instance_token: configToSave.whatsapp.instance_token ? '***PRESENTE***' : 'VAZIO',
        preserving: {
          connected: configToSave.whatsapp.connected,
          qr_code: configToSave.whatsapp.qr_code ? 'SIM' : 'NÃO',
          phone_number: configToSave.whatsapp.phone_number || 'NÃO'
        }
      });
      
      try {
        // Tentar salvar no backend
        const result = await channelsApi.updateConfig(organizationId, configToSave);
        
        console.log('📥 [WhatsApp] Resultado do salvamento:', { 
          success: result.success, 
          hasData: !!result.data,
          error: result.error 
        });
        
        if (result.success) {
          console.log('✅ [WhatsApp] Configurações salvas no backend!');
          toast.success('✅ Configurações salvas no servidor!', {
            description: 'Suas credenciais foram salvas e estarão disponíveis na próxima vez.',
            duration: 5000
          });
          
          // Recarregar configurações do backend para garantir sincronização
          await loadConfig();
          
          // ✅ MELHORIA: Atualizar formulário com dados salvos confirmados do backend
          if (result.data?.whatsapp) {
            const savedFormData = {
              api_url: result.data.whatsapp.api_url || cleanUrl,
              instance_name: result.data.whatsapp.instance_name || whatsappForm.instance_name,
              api_key: result.data.whatsapp.api_key || whatsappForm.api_key,
              instance_token: result.data.whatsapp.instance_token || whatsappForm.instance_token
            };
            console.log('✅ [WhatsApp] Formulário atualizado com dados confirmados do backend');
            setWhatsappForm(savedFormData);
          }
        } else {
          throw new Error(result.error || 'Backend returned error');
        }
      } catch (fetchError: any) {
        // Backend não disponível - mostrar erro
        console.error('❌ Backend não disponível:', fetchError.message || fetchError);
        
        toast.error('❌ Falha ao salvar configurações!', {
          description: 'Backend não está acessível. Verifique se foi deployado.',
          duration: 8000,
        });
        
        toast.info('💡 Como resolver:', {
          description: '1. Execute o SQL no Supabase\n2. Faça deploy da Edge Function\n3. Veja: DEPLOY_SUPABASE.md',
          duration: 10000,
        });
      }
    } catch (error: any) {
      console.error('❌ Error saving WhatsApp config:', error);
      toast.error('❌ Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 text-green-500 mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Carregando configurações do WhatsApp...</p>
      </div>
    );
  }

  // ============================================================================
  // WAHA PROVIDER - Tela específica para WAHA
  // ============================================================================
  if (provider === 'waha') {
    return (
      <div className="space-y-6">
        {/* HEADER WAHA */}
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
          
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Em Desenvolvimento
          </Badge>
        </div>

        {/* INFORMAÇÕES SOBRE WAHA */}
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

        {/* CARD DE IMPLEMENTAÇÃO PENDENTE */}
        <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Settings className="w-5 h-5" />
              Configuração WAHA
            </CardTitle>
            <CardDescription>
              A integração com WAHA está em desenvolvimento. Em breve você poderá:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center">
                  <span className="text-xs">1</span>
                </div>
                Conectar seu servidor WAHA existente
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center">
                  <span className="text-xs">2</span>
                </div>
                Gerenciar múltiplas sessões WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center">
                  <span className="text-xs">3</span>
                </div>
                Configurar webhooks automaticamente
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center">
                  <span className="text-xs">4</span>
                </div>
                Utilizar Websockets para mensagens em tempo real
              </li>
            </ul>
            
            <Alert className="bg-green-50 border-green-200 mt-4">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                <strong>💡 Enquanto isso:</strong> Use a integração <strong>Evolution API</strong> que já está 100% funcional.
                Ambas as APIs são compatíveis e você pode migrar depois.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* COMPARATIVO RÁPIDO */}
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
      </div>
    );
  }

  // ============================================================================
  // EVOLUTION API PROVIDER (Padrão)
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* MODO OFFLINE WARNING */}
      {config?.message?.includes('modo offline') && (
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertCircle className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-900">
            <div className="space-y-2">
              <p className="font-medium">🔄 Modo Offline Ativo</p>
              <p className="text-sm">
                O backend não está acessível. Suas configurações estão sendo salvas localmente no navegador.
              </p>
              <p className="text-sm">
                <strong>Para ativar o backend:</strong>
              </p>
              <div className="bg-yellow-100 rounded px-3 py-2 mt-2 font-mono text-xs">
                bash DEPLOY_BACKEND_NOW.sh
              </div>
              <p className="text-xs mt-2">
                📚 Veja mais detalhes em: <code className="bg-yellow-100 px-1 rounded">SOLUCAO_RAPIDA_BACKEND.md</code>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
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
          
          {config?.whatsapp?.lastSync && (
            <Badge variant="outline">
              Última sincronização: {new Date(config.whatsapp.lastSync).toLocaleString('pt-BR')}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6" onValueChange={(value) => setActiveTab(value)}>
        <TabsList className="w-full flex flex-wrap gap-3">
          <TabsTrigger value="test" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Testar
          </TabsTrigger>
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

        {/* TAB 0: TESTAR CREDENCIAIS */}
        <TabsContent value="test" className="space-y-6">
          <WhatsAppCredentialsTester />
        </TabsContent>

        {/* TAB 1: CONFIGURAÇÃO */}
        <TabsContent value="config" className="space-y-6">
          {/* ✅ TOGGLE PARA ATIVAR/DESATIVAR WHATSAPP */}
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
                        console.log(`📱 [WhatsApp] ${checked ? 'Ativando' : 'Desativando'} WhatsApp...`);
                        
                        const result = await channelsApi.updateConfig(organizationId, {
                          whatsapp: {
                            ...config?.whatsapp,
                            enabled: checked,
                          }
                        });
                        
                        if (result.success) {
                          setConfig(prev => prev ? {
                            ...prev,
                            whatsapp: {
                              ...prev.whatsapp,
                              enabled: checked
                            }
                          } : prev);
                          
                          toast.success(checked 
                            ? '✅ WhatsApp ativado com sucesso!' 
                            : '⚪ WhatsApp desativado'
                          );
                        } else {
                          toast.error('Erro ao atualizar configuração');
                        }
                      } catch (error) {
                        console.error('Erro ao toggle WhatsApp:', error);
                        toast.error('Erro ao atualizar configuração');
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ✅ v2.0: CARD PARA GERENCIAR MÚLTIPLAS INSTÂNCIAS - LAYOUT VERTICAL */}
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
              <CardTitle>Credenciais da Evolution API</CardTitle>
              <CardDescription>
                Configure suas credenciais de acesso à Evolution API para conectar o WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status da Conexão */}
              {config?.whatsapp?.enabled && (
                <Alert className={config?.whatsapp?.connected ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}>
                  {config?.whatsapp?.connected ? (
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-700" />
                  )}
                  <AlertDescription className={config?.whatsapp?.connected ? 'text-green-900' : 'text-yellow-900'}>
                    {config?.whatsapp?.connected ? (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>✅ WhatsApp Conectado</strong></p>
                        {config?.whatsapp?.phone_number && (
                          <p className="text-xs">
                            Número: <code className="bg-green-100 px-1 rounded">{config.whatsapp.phone_number}</code>
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnectWhatsApp}
                          className="mt-2 border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm"><strong>⚠️ WhatsApp Desconectado</strong></p>
                        <p className="text-xs mt-1">Configure abaixo e gere o QR Code para conectar</p>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* URL da Evolution API */}
              <div className="space-y-2">
                <Label htmlFor="api_url">URL da Evolution API</Label>
                <div className="flex gap-2">
                  <Link2 className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="api_url"
                    value={whatsappForm.api_url}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, api_url: e.target.value })}
                    placeholder="https://evo.boravendermuito.com.br"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 URL base da sua instância Evolution API (Ex: https://evo.boravendermuito.com.br)
                </p>
              </div>

              {/* Nome da Instância */}
              <div className="space-y-2">
                <Label htmlFor="instance_name">Nome da Instância</Label>
                <div className="flex gap-2">
                  <Phone className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="instance_name"
                    value={whatsappForm.instance_name}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, instance_name: e.target.value })}
                    placeholder="rendizy-admin-master"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 Identificador único da sua instância (Ex: rendizy-admin-master)
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <div className="flex gap-2">
                  <Key className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 relative">
                    <Input
                      id="api_key"
                      type={showApiKey ? 'text' : 'password'}
                      value={whatsappForm.api_key}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, api_key: e.target.value })}
                      placeholder="sua-api-key-aqui"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  🔒 Chave de autenticação da Evolution API
                </p>
              </div>

              {/* Instance Token */}
              <div className="space-y-2">
                <Label htmlFor="instance_token">Instance Token</Label>
                <div className="flex gap-2">
                  <Key className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 relative">
                    <Input
                      id="instance_token"
                      type={showInstanceToken ? 'text' : 'password'}
                      value={whatsappForm.instance_token}
                      onChange={(e) => setWhatsappForm({ ...whatsappForm, instance_token: e.target.value })}
                      placeholder="seu-instance-token-aqui"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowInstanceToken(!showInstanceToken)}
                    >
                      {showInstanceToken ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  🔒 Token de instância da Evolution API
                </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWebhook}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  📡 Configure este webhook na Evolution API para receber mensagens automaticamente
                </p>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleTestConnection}
                  disabled={connectingWhatsApp}
                  variant="outline"
                  className="flex-1"
                >
                  {connectingWhatsApp ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Testar Conexão
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>

              {/* Connection Status */}
              {connectionStatus !== 'idle' && (
                <Alert className={connectionStatus === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}>
                  {connectionStatus === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-700" />
                  )}
                  <AlertDescription className={connectionStatus === 'success' ? 'text-green-900' : 'text-red-900'}>
                    {connectionStatus === 'success' 
                      ? '✅ Conexão estabelecida com sucesso!'
                      : '❌ Falha ao conectar. Verifique as credenciais.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: STATUS & CONEXÃO */}
        <TabsContent value="status" className="space-y-6" onValueChange={() => setActiveTab('status')}>
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
                      
                      {/* Refresh QR Code Button */}
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
                    <div className="space-y-2">
                      <p className="text-sm"><strong>✅ WhatsApp Conectado com Sucesso!</strong></p>
                      {config?.whatsapp?.phone_number && (
                        <p className="text-xs">
                          Número conectado: <code className="bg-green-100 px-2 py-1 rounded">{config.whatsapp.phone_number}</code>
                        </p>
                      )}
                      <p className="text-xs mt-2">
                        Seu WhatsApp está conectado e pronto para receber e enviar mensagens.
                      </p>
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
                        // Usar status em tempo real se disponível, senão usar config salva
                        const statusToShow = realTimeStatus !== null 
                          ? realTimeStatus 
                          : (config?.whatsapp?.connected ? 'CONNECTED' : 'DISCONNECTED');
                        
                        if (statusToShow === 'CONNECTED') return 'Online';
                        if (statusToShow === 'CONNECTING') return 'Conectando...';
                        if (statusToShow === 'ERROR') return 'Erro';
                        return 'Offline';
                      })()}
                    </p>
                    {realTimeStatus === 'CONNECTING' && (
                      <p className="text-xs text-muted-foreground mt-1">Aguardando conexão...</p>
                    )}
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
          {/* ✅ v2.0: CARD PARA GERENCIAR MÚLTIPLAS INSTÂNCIAS */}
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                Múltiplos Números WhatsApp
                <Badge variant="outline" className="ml-2 text-blue-600 border-blue-300">NOVO</Badge>
              </CardTitle>
              <CardDescription>
                Conecte vários números WhatsApp para diferentes finalidades (vendas, suporte, reservas, etc).
                Cada número pode ser identificado com uma cor e descrição.
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

      {/* ✅ v2.0: Modal de Multi-Instância */}
      <WhatsAppInstancesManager 
        open={showInstancesModal} 
        onOpenChange={setShowInstancesModal} 
      />
    </div>
  );
}