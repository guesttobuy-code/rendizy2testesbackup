import { Hono } from 'npm:hono';
import { ChannelConfigRepository } from './repositories/channel-config-repository.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { getSupabaseClient } from './kv_store.tsx';
// ✅ RESTAURADO DO BACKUP - Monitoramento automático de conexão WhatsApp
import { setupWebhooks, monitorWhatsAppConnection } from './services/whatsapp-monitor.ts';

const app = new Hono();

// ============================================================================
// HELPERS - Evolution API
// ============================================================================

interface EvolutionConfig {
  api_url: string;
  instance_name: string;
  api_key: string;
  instance_token: string;
  enabled: boolean;
}

function maskSecret(secret: string | null | undefined): string {
  if (!secret) return '';
  const trimmed = String(secret).trim();
  if (!trimmed) return '';
  if (trimmed.length <= 6) return '******';
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-2)}`;
}

function looksMaskedSecret(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  // Aceitar formatos comuns de máscara: ***** / •••• / abc...yz
  if (/^[*•]{4,}$/.test(v)) return true;
  if (/^[^\s]{1,6}\.{3}[^\s]{1,6}$/.test(v)) return true;
  return false;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

async function getEvolutionConfigForOrganization(organizationId: string): Promise<EvolutionConfig | null> {
  try {
    const client = getSupabaseClient();
    
    // ✅ V2: Primeiro tentar buscar em channel_instances (nova arquitetura)
    const { data: channelInstance } = await client
      .from('channel_instances')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('channel', 'whatsapp')
      .eq('provider', 'evolution')
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .order('is_default', { ascending: false }) // Priorizar instância padrão
      .limit(1)
      .maybeSingle();
    
    if (channelInstance && channelInstance.api_url && channelInstance.instance_name && channelInstance.api_key) {
      console.log(`✅ [Chat.getEvolutionConfig] Usando channel_instances para org ${organizationId}`);
      return {
        api_url: normalizeBaseUrl(channelInstance.api_url),
        instance_name: channelInstance.instance_name,
        api_key: channelInstance.api_key,
        instance_token: channelInstance.instance_token || channelInstance.api_key,
        enabled: true,
      };
    }
    
    // ✅ FALLBACK: Tentar tabela legada organization_channel_config
    console.warn(`⚠️ [Chat.getEvolutionConfig] Nada em channel_instances, tentando tabela legada...`);
    
    const repo = new ChannelConfigRepository();
    const data = await repo.findByOrganizationId(organizationId);

    if (!data || !data.whatsapp_enabled) {
      return null;
    }

    if (!data.whatsapp_api_url || !data.whatsapp_instance_name || !data.whatsapp_api_key || !data.whatsapp_instance_token) {
      console.warn(`⚠️ [Chat] Credenciais incompletas para org ${organizationId}`);
      return null;
    }

    return {
      api_url: normalizeBaseUrl(data.whatsapp_api_url),
      instance_name: data.whatsapp_instance_name,
      api_key: data.whatsapp_api_key,
      instance_token: data.whatsapp_instance_token,
      enabled: true,
    };
  } catch (error) {
    console.error(`❌ [Chat] Erro inesperado ao buscar config:`, error);
    return null;
  }
}

function getEvolutionMessagesHeaders(config: EvolutionConfig) {
  return {
    'apikey': config.api_key,
    'instanceToken': config.instance_token,
    'Content-Type': 'application/json',
  };
}

// ✅ RESTAURADO DO BACKUP - Helper: Create Evolution API client
function createEvolutionClient(config: EvolutionConfig) {
  return {
    apiUrl: config.api_url,
    instanceName: config.instance_name,
    apiKey: config.api_key,
    instanceToken: config.instance_token,
  };
}

// ✅ RESTAURADO DO BACKUP - Helper: Make request to Evolution API
async function evolutionRequest(
  config: { apiUrl: string; instanceName: string; apiKey: string; instanceToken?: string },
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  // ✅ URL-encode instance name if present in endpoint
  const encodedEndpoint = endpoint.replace(
    /\/([\w\s]+)$/,
    (match, instanceName) => {
      void match;
      return `/${encodeURIComponent(instanceName)}`;
    }
  );
  
  const url = `${config.apiUrl}${encodedEndpoint}`;
  
  console.log(`📡 [Chat] Evolution API Request:`);
  console.log(`   Method: ${method}`);
  console.log(`   URL: ${url}`);
  console.log(`   API Key: ${config.apiKey.substring(0, 15)}...`);
  if (body) console.log(`   Body:`, JSON.stringify(body, null, 2));
  
  // Evolution API aceita múltiplos formatos de header de autenticação
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': config.apiKey,
    'api-key': config.apiKey,
    'Authorization': `Bearer ${config.apiKey}`,
  };
  
  // Adicionar instanceToken se fornecido
  if (config.instanceToken) {
    headers['instanceToken'] = config.instanceToken;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    console.log(`   Response Status: ${response.status} ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      // Verificar se é HTML (erro comum)
      if (contentType && contentType.includes('text/html')) {
        const errorText = await response.text();
        console.error(`❌ [Chat] Evolution API retornou HTML ao invés de JSON`);
        throw new Error(`Evolution API retornou HTML: ${errorText.substring(0, 200)}`);
      }
      
      const errorText = await response.text();
      console.error(`❌ [Chat] Evolution API Error: ${errorText}`);
      throw new Error(`Evolution API Error: ${response.status} - ${errorText}`);
    }
    
    // Verificar content-type antes de processar
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      console.warn(`⚠️ [Chat] Response não é JSON, retornando texto: ${text.substring(0, 100)}`);
      return { raw: text };
    }
  } catch (error) {
    console.error(`❌ [Chat] Erro na requisição Evolution API:`, error);
    throw error;
  }
}

// ============================================================================
// CHANNEL CONFIGURATION ROUTES
// ============================================================================

/**
 * GET /channels/config
 * Busca configuração de canais para uma organização
 * 
 * Rota completa: /rendizy-server/chat/channels/config
 */
app.get('/channels/config', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const repo = new ChannelConfigRepository();
    
    const config = await repo.findByOrganizationId(organizationId);
    
    if (!config) {
      return c.json({ 
        success: false, 
        error: 'Configuração não encontrada',
        data: null 
      }, 404);
    }
    
    // Converter formato DB para formato API
    const apiConfig = {
      whatsapp: {
        enabled: config.whatsapp_enabled || false,
        api_url: config.whatsapp_api_url || '',
        instance_name: config.whatsapp_instance_name || '',
        // ⚠️ Segurança: não retornar segredos em texto puro para o frontend.
        // Mantém compatibilidade (string), mas mascarado.
        api_key: maskSecret(config.whatsapp_api_key),
        instance_token: maskSecret(config.whatsapp_instance_token),
        has_api_key: !!(config.whatsapp_api_key && String(config.whatsapp_api_key).trim()),
        has_instance_token: !!(config.whatsapp_instance_token && String(config.whatsapp_instance_token).trim()),
        connected: config.whatsapp_connected || false,
        phone_number: config.whatsapp_phone_number || null,
        qr_code: config.whatsapp_qr_code || null,
        connection_status: config.whatsapp_connection_status || 'disconnected',
        last_connected_at: config.whatsapp_last_connected_at || null,
        error_message: config.whatsapp_error_message || null,
      },
      sms: {
        enabled: config.sms_enabled || false,
        account_sid: config.sms_account_sid || '',
        auth_token: maskSecret(config.sms_auth_token),
        has_auth_token: !!(config.sms_auth_token && String(config.sms_auth_token).trim()),
        phone_number: config.sms_phone_number || '',
        credits_used: config.sms_credits_used || 0,
        last_recharged_at: config.sms_last_recharged_at || null,
      },
    };
    
    return c.json({ success: true, data: apiConfig });
  } catch (error: any) {
    console.error('[Chat] Erro ao buscar configuração:', error);
    console.error('[Chat] Error message:', error.message);
    console.error('[Chat] Error stack:', error.stack);
    // ✅ FIX: Sempre retornar a mensagem de erro real para debug
    const errorMessage = error.message || 'Erro ao buscar configuração';
    const statusCode = error.message?.includes('Unauthorized') || error.message?.includes('organization') ? 401 : 500;
    return c.json({ success: false, error: errorMessage }, statusCode);
  }
});

const processWhatsAppWebhook = async (c: any, payload: any) => {
  try {
    console.log('📥 [Chat] WhatsApp webhook received:', JSON.stringify(payload, null, 2));

    const messageData = payload.data;
    
    // Skip messages sent by us
    if (messageData.key?.fromMe) {
      console.log('⏭️ [Chat] Skipping outgoing message');
      return c.json({ success: true, message: 'Outgoing message ignored' });
    }

    // Extract message info
    const senderJid = messageData.key?.remoteJid;
    const messageId = messageData.key?.id;
    void messageId;
    const senderPhone = senderJid?.split('@')[0] || '';
    const senderName = messageData.pushName || `+${senderPhone}`;
    
    // Extract text from different message types
    let messageText = '';
    if (messageData.message?.conversation) {
      messageText = messageData.message.conversation;
    } else if (messageData.message?.extendedTextMessage?.text) {
      messageText = messageData.message.extendedTextMessage.text;
    } else if (messageData.message?.imageMessage?.caption) {
      messageText = messageData.message.imageMessage.caption || '📷 Image';
    } else if (messageData.message?.videoMessage?.caption) {
      messageText = messageData.message.videoMessage.caption || '🎥 Video';
    } else if (messageData.message?.audioMessage) {
      messageText = '🎵 Audio';
    } else if (messageData.message?.documentMessage) {
      messageText = '📄 Document';
    }

    if (!messageText) {
      console.log('⚠️ [Chat] Could not extract message text');
      return c.json({ success: true, message: 'No text found' });
    }

    // Find organization by instance name (robusto para diferentes formatos)
    const instanceName =
      payload.instance ||
      payload.instanceName ||
      payload.instance_name ||
      payload?.instance?.instanceName ||
      payload?.instance?.name ||
      payload?.instance?.instance_name ||
      payload?.instance?.instanceId ||
      payload?.instance?.id ||
      payload.session ||
      payload.sessionName ||
      payload.session_name ||
      '';
    const client = getSupabaseClient();
    
    // ✅ V2.0: Buscar instância em channel_instances (nova arquitetura multi-canal)
    const { data: channelInstance, error: ciError } = await client
      .from('channel_instances')
      .select('*')
      .eq('channel', 'whatsapp')
      .eq('instance_name', instanceName)
      .eq('is_enabled', true)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (ciError) {
      console.warn('⚠️ [Chat] Erro ao buscar channel_instances:', ciError);
      // Não retorna erro, vai tentar fallback
    }
    
    // Fallback: Tentar buscar na tabela antiga se não encontrou
    let organizationId: string | null = null;
    let channelInstanceId: string | null = null;
    
    if (channelInstance) {
      organizationId = channelInstance.organization_id;
      channelInstanceId = channelInstance.id;
      console.log(`✅ [Chat] Found instance in channel_instances: ${instanceName} -> org ${organizationId}`);
    } else {
      // FALLBACK: Buscar em organization_channel_config (legado)
      console.warn(`⚠️ [Chat] Instance não encontrada em channel_instances, tentando tabela legada...`);
      const { data: legacyConfigs, error: legacyError } = await client
        .from('organization_channel_config')
        .select('*')
        .eq('whatsapp_enabled', true)
        .not('whatsapp_instance_name', 'is', null)
        .is('deleted_at', null);
      
      if (legacyError) {
        console.error('❌ [Chat] Erro ao buscar configurações legadas:', legacyError);
        return c.json({ success: false, error: 'Erro ao buscar configurações' }, 500);
      }
      
      let orgConfig = legacyConfigs?.find(
        data => data.whatsapp_instance_name === instanceName
      );

      if (!orgConfig && legacyConfigs?.length === 1) {
        orgConfig = legacyConfigs[0];
        console.warn('⚠️ [Chat] Instance name ausente ou não encontrado, usando única configuração disponível');
      }
      
      if (orgConfig) {
        organizationId = orgConfig.organization_id;
        console.log(`✅ [Chat] Found organization via legacy config: ${organizationId}`);
      }
    }
    
    if (!organizationId) {
      console.error('❌ [Chat] Organization not found for instance:', instanceName);
      return c.json({ success: false, error: 'Organization not found' }, 404);
    }
    console.log(`✅ [Chat] Found organization: ${organizationId}`);

    // ✅ DEBUG: salvar payload bruto do webhook (não bloqueante)
    try {
      await client
        .from('chat_webhooks')
        .insert({
          organization_id: organizationId,
          channel: 'whatsapp',
          event: payload.event || 'unknown',
          payload: payload,
        } as any);
    } catch (webhookErr) {
      console.warn('⚠️ [Chat] Falha ao salvar webhook em chat_webhooks:', webhookErr);
    }

    // Only process incoming messages
    if (payload.event !== 'messages.upsert' && payload.event !== 'MESSAGES_UPSERT') {
      console.log('⏭️ [Chat] Skipping non-message event:', payload.event);
      return c.json({ success: true, message: 'Event ignored' });
    }

    // =========================================================================
    // FASE 1: SALVAMENTO MULTI-TENANT DE MENSAGENS RECEBIDAS
    // v1.0.104.002 - 2026-01-10
    // =========================================================================

    // 1) Encontrar ou criar a conversation
    let conversationId: string | null = null;
    const remoteJid = senderJid; // ex: 5511999999999@s.whatsapp.net
    
    try {
      // Buscar conversa existente por external_conversation_id (remoteJid)
      const { data: existingConv } = await client
        .from('conversations')
        .select('id, unread_count')
        .eq('organization_id', organizationId)
        .eq('external_conversation_id', remoteJid)
        .maybeSingle();

      if (existingConv?.id) {
        conversationId = existingConv.id;
        
        // Atualizar conversa com última mensagem e incrementar unread
        await client
          .from('conversations')
          .update({
            last_message: messageText.substring(0, 500),
            last_message_at: new Date().toISOString(),
            unread_count: (existingConv.unread_count || 0) + 1,
            guest_name: senderName || undefined, // Atualizar nome se disponível
          })
          .eq('id', conversationId);
          
        console.log(`✅ [Chat] Updated existing conversation: ${conversationId}`);
      } else {
        // Criar nova conversa
        const convInsert: any = {
          organization_id: organizationId,
          external_conversation_id: remoteJid,
          guest_name: senderName,
          guest_phone: senderPhone,
          channel: 'whatsapp',
          status: 'normal',
          conversation_type: 'guest',
          last_message: messageText.substring(0, 500),
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          channel_metadata: {
            instance: instanceName,
            pushName: senderName,
            channel_instance_id: channelInstanceId, // V2: rastrear qual instância recebeu
          },
        };
        
        const { data: newConv, error: convError } = await client
          .from('conversations')
          .insert(convInsert)
          .select('id')
          .single();
          
        if (convError) {
          console.error('❌ [Chat] Erro ao criar conversa:', convError);
        } else {
          conversationId = newConv?.id || null;
          console.log(`✅ [Chat] Created new conversation: ${conversationId}`);
        }
      }
    } catch (convErr) {
      console.error('❌ [Chat] Erro ao processar conversa:', convErr);
    }

    // 2) Salvar mensagem
    let savedMessageId: string | null = null;
    
    if (conversationId) {
      try {
        const msgRow = {
          organization_id: organizationId,
          conversation_id: conversationId,
          sender_type: 'guest',
          sender_name: senderName,
          sender_id: senderPhone,
          content: messageText,
          attachments: [], // TODO: Processar attachments
          channel: 'whatsapp',
          direction: 'incoming',
          external_id: messageId,
          external_status: 'delivered',
          sent_at: new Date().toISOString(),
          metadata: {
            remoteJid,
            pushName: senderName,
            instance: instanceName,
          },
        };

        const { data: savedMsg, error: msgError } = await client
          .from('messages')
          .insert(msgRow)
          .select('id')
          .single();

        if (msgError) {
          // Se for duplicate key, a mensagem já foi processada
          if (msgError.code === '23505') {
            console.log('⏭️ [Chat] Mensagem duplicada, ignorando:', messageId);
          } else {
            console.error('❌ [Chat] Erro ao salvar mensagem:', msgError);
          }
        } else {
          savedMessageId = savedMsg?.id || null;
          console.log(`✅ [Chat] Saved message: ${savedMessageId}`);
        }
      } catch (msgErr) {
        console.error('❌ [Chat] Erro ao inserir mensagem:', msgErr);
      }
    }

    console.log('✅ [Chat] WhatsApp message processed:', {
      organization_id: organizationId,
      conversation_id: conversationId,
      message_id: savedMessageId,
      sender: senderName,
      phone: senderPhone,
      preview: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
    });

    return c.json({ 
      success: true, 
      message: 'Message saved',
      data: {
        organization_id: organizationId,
        conversation_id: conversationId,
        message_id: savedMessageId,
        sender: senderName,
        phone: senderPhone,
      }
    });
  } catch (error) {
    console.error('❌ [Chat] Error processing WhatsApp webhook:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
};

/**
 * PATCH /channels/config
 * Atualiza configuração de canais para uma organização
 * 
 * Rota completa: /rendizy-server/chat/channels/config
 */
app.patch('/channels/config', async (c) => {
  try {
    // 🔍 DEBUG v1.0.103.1200: Log todos os headers recebidos
    const authHeader = c.req.header('Authorization');
    const xAuthToken = c.req.header('X-Auth-Token');
    console.log('🔍 [PATCH /channels/config] Headers recebidos:', {
      authorization: authHeader ? `${authHeader.substring(0, 30)}...` : 'AUSENTE',
      xAuthToken: xAuthToken ? `${xAuthToken.substring(0, 30)}...` : 'AUSENTE',
      allHeaders: Object.fromEntries([...c.req.raw.headers.entries()].map(([k, v]) => [k, k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') ? v.substring(0, 30) + '...' : v]))
    });
    
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();
    
    console.log('📥 [Chat] Recebendo atualização de configuração:', {
      organization_id: organizationId,
      has_whatsapp: !!body.whatsapp,
      has_sms: !!body.sms,
    });
    
    const repo = new ChannelConfigRepository();
    
    // Buscar configuração existente
    const existing = await repo.findByOrganizationId(organizationId);
    
    // Preparar dados para salvar (formato DB)
    const configToSave: any = {
      organization_id: organizationId,
    };
    
    // WhatsApp
    if (body.whatsapp) {
      configToSave.whatsapp_enabled = body.whatsapp.enabled ?? existing?.whatsapp_enabled ?? false;
      configToSave.whatsapp_api_url = body.whatsapp.api_url || existing?.whatsapp_api_url || '';
      configToSave.whatsapp_instance_name = body.whatsapp.instance_name || existing?.whatsapp_instance_name || '';
      // Só sobrescrever segredos quando vier um valor REAL (não vazio, não mascarado)
      const nextApiKey = body.whatsapp.api_key;
      const nextInstanceToken = body.whatsapp.instance_token;
      configToSave.whatsapp_api_key = (!looksMaskedSecret(nextApiKey) && typeof nextApiKey === 'string' && nextApiKey.trim())
        ? nextApiKey.trim()
        : (existing?.whatsapp_api_key || '');
      configToSave.whatsapp_instance_token = (!looksMaskedSecret(nextInstanceToken) && typeof nextInstanceToken === 'string' && nextInstanceToken.trim())
        ? nextInstanceToken.trim()
        : (existing?.whatsapp_instance_token || '');
      
      // Preservar campos de conexão se não foram fornecidos
      configToSave.whatsapp_connected = body.whatsapp.connected ?? existing?.whatsapp_connected ?? false;
      configToSave.whatsapp_phone_number = body.whatsapp.phone_number ?? existing?.whatsapp_phone_number ?? null;
      configToSave.whatsapp_qr_code = body.whatsapp.qr_code ?? existing?.whatsapp_qr_code ?? null;
      configToSave.whatsapp_connection_status = body.whatsapp.connection_status || existing?.whatsapp_connection_status || 'disconnected';
      configToSave.whatsapp_last_connected_at = body.whatsapp.last_connected_at ?? existing?.whatsapp_last_connected_at ?? null;
      configToSave.whatsapp_error_message = body.whatsapp.error_message ?? existing?.whatsapp_error_message ?? null;
    }
    
    // SMS
    if (body.sms) {
      configToSave.sms_enabled = body.sms.enabled ?? existing?.sms_enabled ?? false;
      configToSave.sms_account_sid = body.sms.account_sid || existing?.sms_account_sid || '';
      const nextSmsToken = body.sms.auth_token;
      configToSave.sms_auth_token = (!looksMaskedSecret(nextSmsToken) && typeof nextSmsToken === 'string' && nextSmsToken.trim())
        ? nextSmsToken.trim()
        : (existing?.sms_auth_token || '');
      configToSave.sms_phone_number = body.sms.phone_number || existing?.sms_phone_number || '';
      configToSave.sms_credits_used = body.sms.credits_used ?? existing?.sms_credits_used ?? 0;
      configToSave.sms_last_recharged_at = body.sms.last_recharged_at ?? existing?.sms_last_recharged_at ?? null;
    }
    
    console.log('💾 [Chat] Salvando configuração:', {
      organization_id: organizationId,
      whatsapp_enabled: configToSave.whatsapp_enabled,
      has_api_url: !!configToSave.whatsapp_api_url,
      has_instance_name: !!configToSave.whatsapp_instance_name,
      has_api_key: !!configToSave.whatsapp_api_key,
      has_instance_token: !!configToSave.whatsapp_instance_token,
    });
    
    // Salvar no banco
    const result = await repo.upsert(configToSave);
    
    if (!result.success) {
      console.error('❌ [Chat] Erro ao salvar:', result.error);
      return c.json({ success: false, error: result.error || 'Erro ao salvar configuração' }, 500);
    }
    
    // Buscar configuração salva para retornar
    const saved = await repo.findByOrganizationId(organizationId);
    
    if (!saved) {
      return c.json({ success: false, error: 'Configuração não encontrada após salvar' }, 500);
    }
    
    // Converter para formato API
    const apiConfig = {
      whatsapp: {
        enabled: saved.whatsapp_enabled || false,
        api_url: saved.whatsapp_api_url || '',
        instance_name: saved.whatsapp_instance_name || '',
        api_key: saved.whatsapp_api_key || '',
        instance_token: saved.whatsapp_instance_token || '',
        connected: saved.whatsapp_connected || false,
        phone_number: saved.whatsapp_phone_number || null,
        qr_code: saved.whatsapp_qr_code || null,
        connection_status: saved.whatsapp_connection_status || 'disconnected',
        last_connected_at: saved.whatsapp_last_connected_at || null,
        error_message: saved.whatsapp_error_message || null,
      },
      sms: {
        enabled: saved.sms_enabled || false,
        account_sid: saved.sms_account_sid || '',
        auth_token: saved.sms_auth_token || '',
        phone_number: saved.sms_phone_number || '',
        credits_used: saved.sms_credits_used || 0,
        last_recharged_at: saved.sms_last_recharged_at || null,
      },
    };
    
    console.log('✅ [Chat] Configuração salva com sucesso');
    
    return c.json({ success: true, data: apiConfig });
  } catch (error: any) {
    // ✅ FIX: Log detalhado para debugging
    console.error('[Chat] ❌ Erro ao atualizar configuração:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500),
      code: error.code,
      statusCode: error.statusCode,
    });
    
    // ✅ Retornar erro detalhado para facilitar debugging
    const errorMsg = error.message || 'Erro ao atualizar configuração';
    const statusCode = error.statusCode || (error.message?.includes('organization') ? 401 : 500);
    
    return c.json({ 
      success: false, 
      error: errorMsg,
      debug: {
        name: error.name,
        code: error.code,
      }
    }, statusCode);
  }
});

// ============================================================================
// ⚠️ FUNCIONALIDADE CRÍTICA - WHATSAPP ROUTES
// ============================================================================
// 
// ⚠️ ATENÇÃO: Estas rotas estão em PRODUÇÃO e são usadas pelo WhatsApp Integration
// 
// ANTES DE MODIFICAR QUALQUER ROTA AQUI:
// 1. ✅ Ler: FUNCIONALIDADES_CRITICAS.md
// 2. ✅ Executar testes: npm run test:whatsapp (quando implementado)
// 3. ✅ Verificar dependências frontend em: chatApi.ts e evolutionService.ts
// 4. ✅ Testar em ambiente de desenvolvimento
// 5. ✅ Code review obrigatório
// 6. ✅ Atualizar FUNCIONALIDADES_CRITICAS.md
// 
// ROTAS DEPENDENTES NO FRONTEND:
// - channelsApi.evolution.connect() → POST /chat/channels/whatsapp/connect
// - channelsApi.evolution.status() → POST /chat/channels/whatsapp/status
// - channelsApi.evolution.disconnect() → POST /chat/channels/whatsapp/disconnect
// 
// ÚLTIMA MODIFICAÇÃO: 2025-11-28
// ÚLTIMO TESTE: 2025-11-28
// STATUS: ✅ FUNCIONANDO EM PRODUÇÃO
// 
// ⚠️ NUNCA REMOVER ESTAS ROTAS SEM CRIAR VERSÃO ALTERNATIVA
// ============================================================================

/**
 * POST /channels/whatsapp/connect
 * Conecta instância WhatsApp e gera QR Code
 * 
 * Rota completa: /rendizy-server/chat/channels/whatsapp/connect
 * 
 * ⚠️ CRÍTICA: Usada pelo WhatsApp Integration em produção
 * ⚠️ NÃO MODIFICAR sem seguir checklist em FUNCIONALIDADES_CRITICAS.md
 */
app.post('/channels/whatsapp/connect', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();
    
    console.log('📱 [Chat] Conectando WhatsApp:', {
      organization_id: organizationId,
      instance_name: body.instance_name,
      body_api_url: body.api_url ? `${body.api_url.substring(0, 30)}...` : 'NÃO FORNECIDO',
    });
    
    // ✅ v1.0.103.1201: Permitir usar credenciais do body se fornecidas
    // Isso permite conectar mesmo se o banco ainda não tiver os dados salvos
    let config: EvolutionConfig | null = null;
    
    // Se body tem credenciais completas, usar elas (e salvar no banco)
    if (body.api_url && body.instance_name && body.api_key) {
      console.log('✅ [Chat] Usando credenciais do request body');
      config = {
        api_url: normalizeBaseUrl(body.api_url.trim()),
        instance_name: body.instance_name.trim(),
        api_key: body.api_key.trim(),
        instance_token: body.instance_token?.trim() || body.api_key.trim(),
        enabled: true,
      };
      
      // Salvar credenciais no banco para futuras consultas
      const repo = new ChannelConfigRepository();
      await repo.upsert({
        organization_id: organizationId,
        whatsapp_enabled: true,
        whatsapp_api_url: config.api_url,
        whatsapp_instance_name: config.instance_name,
        whatsapp_api_key: config.api_key,
        whatsapp_instance_token: config.instance_token,
      });
      console.log('✅ [Chat] Credenciais salvas no banco');
    } else {
      // Fallback: Buscar credenciais do banco
      config = await getEvolutionConfigForOrganization(organizationId);
    }
    
    if (!config || !config.enabled) {
      return c.json({ 
        success: false, 
        error: 'WhatsApp não configurado. Forneça api_url, instance_name e api_key.' 
      }, 400);
    }

    // 1. Deletar instância existente (se houver)
    try {
      const deleteResponse = await fetch(
        `${config.api_url}/instance/delete/${config.instance_name}`,
        {
          method: 'DELETE',
          headers: getEvolutionMessagesHeaders(config),
        }
      );
      if (deleteResponse.ok) {
        console.log(`✅ [Chat] Instância ${config.instance_name} deletada`);
      }
    } catch (deleteError) {
      console.warn('⚠️ [Chat] Erro ao deletar instância (pode não existir):', deleteError);
    }

    // 2. Criar nova instância
    try {
      const createResponse = await fetch(
        `${config.api_url}/instance/create`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({
            instanceName: config.instance_name,
            token: config.instance_token,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('❌ [Chat] Erro ao criar instância:', errorText);
        return c.json({ 
          success: false, 
          error: 'Erro ao criar instância WhatsApp',
          details: errorText 
        }, createResponse.status as any);
      }
      
      console.log('✅ [Chat] Instância criada com sucesso');
      
      // ✅ Aguardar instância ficar pronta (Evolution API precisa de tempo para provisionar)
      console.log('⏳ [Chat] Aguardando 5 segundos para instância ser provisionada...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('✅ [Chat] Instância provisionada, obtendo QR Code...');
    } catch (createError) {
      console.error('❌ [Chat] Erro ao criar instância:', createError);
      
      // Se erro 409 (já existe), continuar mesmo assim
      if (createError instanceof Error && createError.message?.includes('409')) {
        console.log('⚠️ [Chat] Instância já existe, continuando...');
      } else {
        return c.json({ 
          success: false, 
          error: 'Erro ao criar instância WhatsApp',
          details: createError instanceof Error ? createError.message : 'Erro desconhecido'
        }, 500);
      }
    }

    // 3. Obter QR Code
    try {
      console.log('📱 [Chat] Solicitando QR Code da Evolution API...');
      const qrResponse = await fetch(
        `${config.api_url}/instance/connect/${config.instance_name}`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!qrResponse.ok) {
        const errorText = await qrResponse.text();
        console.error('❌ [Chat] Erro ao obter QR Code:', errorText);
        return c.json({ 
          success: false, 
          error: 'Erro ao obter QR Code',
          details: errorText 
        }, qrResponse.status as any);
      }

      const qrData = await qrResponse.json();
      console.log('📥 [Chat] Resposta da Evolution API:', {
        has_base64: !!qrData.base64,
        has_code: !!qrData.code,
        has_qrcode: !!qrData.qrcode,
        keys: Object.keys(qrData),
      });
      
      // Tentar diferentes formatos de resposta da Evolution API
      const qrCode = qrData.base64 
        || qrData.code 
        || qrData.qrcode?.base64 
        || qrData.qrcode?.code
        || (qrData.qrcode && typeof qrData.qrcode === 'string' ? qrData.qrcode : '')
        || '';

      if (!qrCode) {
        console.error('❌ [Chat] QR Code vazio na resposta:', JSON.stringify(qrData, null, 2));
        return c.json({ 
          success: false, 
          error: 'QR Code não retornado pela Evolution API',
          details: 'A Evolution API não retornou o QR Code. Verifique se a instância foi criada corretamente.',
          response_data: qrData
        }, 500);
      }
      
      console.log('✅ [Chat] QR Code obtido:', qrCode.substring(0, 50) + '...');

      // Salvar QR Code no banco
      const repo = new ChannelConfigRepository();
      await repo.upsert({
        organization_id: organizationId,
        whatsapp_qr_code: qrCode,
        whatsapp_connection_status: 'waiting_qr',
      });

      console.log('✅ [Chat] QR Code obtido e salvo');

      // ✅ RESTAURADO DO BACKUP - Configurar webhooks e monitoramento (não bloqueante)
      try {
        console.log('✅ [Chat] Configurando webhooks e monitoramento automático...');
        
        setupWebhooks({
          organizationId: organizationId,
          api_url: config.api_url,
          instance_name: config.instance_name,
          api_key: config.api_key,
          instance_token: config.instance_token,
          enabled: true,
        }).catch(error => {
          console.error('❌ [Chat] Erro ao configurar webhooks:', error);
        });
        
        monitorWhatsAppConnection({
          organizationId: organizationId,
          api_url: config.api_url,
          instance_name: config.instance_name,
          api_key: config.api_key,
          instance_token: config.instance_token,
          enabled: true,
        }).catch(error => {
          console.error('❌ [Chat] Erro ao iniciar monitoramento:', error);
        });
      } catch (error) {
        console.warn('⚠️ [Chat] Erro ao configurar webhooks/monitoramento (não crítico):', error);
      }

      return c.json({
        success: true,
        data: {
          qr_code: qrCode,
          instance_name: config.instance_name,
        },
      });
    } catch (qrError) {
      console.error('❌ [Chat] Erro ao obter QR Code:', qrError);
      return c.json({ 
        success: false, 
        error: 'Erro ao obter QR Code' 
      }, 500);
    }
  } catch (error: any) {
    console.error('[Chat] Erro ao conectar WhatsApp:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao conectar WhatsApp' }, 500);
  }
});

/**
 * POST /channels/whatsapp/status
 * Verifica status da conexão WhatsApp
 * 
 * Rota completa: /rendizy-server/chat/channels/whatsapp/status
 * 
 * ⚠️ CRÍTICA: Usada pelo WhatsApp Integration em produção
 * ⚠️ NÃO MODIFICAR sem seguir checklist em FUNCIONALIDADES_CRITICAS.md
 */
app.post('/channels/whatsapp/status', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    
    const config = await getEvolutionConfigForOrganization(organizationId);
    
    if (!config || !config.enabled) {
      return c.json({ 
        success: true,
        data: {
          connected: false,
          error: 'WhatsApp não configurado'
        }
      });
    }

    // Buscar status da Evolution API
    try {
      const statusResponse = await fetch(
        `${config.api_url}/instance/fetchInstances`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!statusResponse.ok) {
        return c.json({
          success: true,
          data: {
            connected: false,
            error: 'Erro ao verificar status'
          }
        });
      }

      const instances = await statusResponse.json();
      const instance = Array.isArray(instances) 
        ? instances.find((inst: any) => inst.instance.instanceName === config.instance_name)
        : instances;

      if (!instance) {
        return c.json({
          success: true,
          data: {
            connected: false,
            error: 'Instância não encontrada'
          }
        });
      }

      const state = instance.instance?.state || instance.state || 'notConnected';
      const isConnected = state === 'open' || state === 'connected';
      const phoneNumber = instance.instance?.owner || instance.owner || null;

      // Atualizar status no banco
      const repo = new ChannelConfigRepository();
      await repo.upsert({
        organization_id: organizationId,
        whatsapp_connected: isConnected,
        whatsapp_phone_number: phoneNumber,
        whatsapp_connection_status: isConnected ? 'connected' : 'disconnected',
        whatsapp_last_connected_at: isConnected ? new Date().toISOString() : null,
      });

      return c.json({
        success: true,
        data: {
          connected: isConnected,
          phone_number: phoneNumber,
          state: state,
        }
      });
    } catch (statusError) {
      console.error('[Chat] Erro ao verificar status:', statusError);
      return c.json({
        success: true,
        data: {
          connected: false,
          error: 'Erro ao verificar status'
        }
      });
    }
  } catch (error: any) {
    console.error('[Chat] Erro ao verificar status WhatsApp:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    // ✅ CORREÇÃO: Retornar sempre success: true com dados, mesmo em caso de erro
    // Isso permite que o frontend processe o status mesmo quando há erro
    return c.json({ 
      success: true,
      data: {
        connected: false,
        error: error.message || 'Erro ao verificar status'
      }
    });
  }
});

/**
 * POST /channels/whatsapp/disconnect
 * Desconecta instância WhatsApp
 * 
 * Rota completa: /rendizy-server/chat/channels/whatsapp/disconnect
 * 
 * ⚠️ CRÍTICA: Usada pelo WhatsApp Integration em produção
 * ⚠️ NÃO MODIFICAR sem seguir checklist em FUNCIONALIDADES_CRITICAS.md
 */
app.post('/channels/whatsapp/disconnect', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    
    const config = await getEvolutionConfigForOrganization(organizationId);
    
    if (!config || !config.enabled) {
      return c.json({ success: false, error: 'WhatsApp não configurado' }, 400);
    }

    // Logout da instância
    try {
      const logoutResponse = await fetch(
        `${config.api_url}/instance/logout/${config.instance_name}`,
        {
          method: 'DELETE',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!logoutResponse.ok) {
        console.warn('⚠️ [Chat] Erro ao fazer logout (pode não estar conectado)');
      }
    } catch (logoutError) {
      console.warn('⚠️ [Chat] Erro ao fazer logout:', logoutError);
    }

    // Atualizar status no banco
    const repo = new ChannelConfigRepository();
    await repo.upsert({
      organization_id: organizationId,
      whatsapp_connected: false,
      whatsapp_connection_status: 'disconnected',
      whatsapp_qr_code: null,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Chat] Erro ao desconectar WhatsApp:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao desconectar WhatsApp' }, 500);
  }
});

/**
 * POST /channels/whatsapp/send
 * Envia mensagem via WhatsApp
 * 
 * Rota completa: /rendizy-server/chat/channels/whatsapp/send
 * 
 * ⚠️ CRÍTICA: Usada pelo WhatsApp Integration em produção
 * ⚠️ NÃO MODIFICAR sem seguir checklist em FUNCIONALIDADES_CRITICAS.md
 * 
 * ✅ RESTAURADO DO BACKUP - Implementação completa
 */
app.post('/channels/whatsapp/send', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();
    const { conversation_id, content, metadata, phone_number } = body;
    
    if (!conversation_id || !content) {
      return c.json({ 
        success: false, 
        error: 'Missing required fields: conversation_id, content' 
      }, 400);
    }

    const config = await getEvolutionConfigForOrganization(organizationId);
    
    if (!config || !config.enabled) {
      return c.json({ success: false, error: 'WhatsApp não configurado' }, 400);
    }

    if (!config.enabled) {
      return c.json({ success: false, error: 'WhatsApp não conectado' }, 400);
    }

    // Normalize phone number
    const normalizePhone = (num: string) => {
      let normalized = num.replace(/\D/g, '');
      if (!normalized.startsWith('55') && normalized.length === 11) {
        normalized = '55' + normalized;
      }
      if (!num.includes('@s.whatsapp.net')) {
        normalized = `${normalized}@s.whatsapp.net`;
      } else {
        normalized = num;
      }
      return normalized;
    };

    const targetPhone = phone_number || body.phone_number;
    if (!targetPhone) {
      return c.json({ success: false, error: 'Phone number is required' }, 400);
    }

    const client = createEvolutionClient(config);
    
    // Send message via Evolution API
    let evolutionResponse;
    if (metadata?.media_url) {
      // Send media
      evolutionResponse = await evolutionRequest(
        client,
        `/message/sendMedia/${config.instance_name}`,
        'POST',
        {
          number: normalizePhone(targetPhone),
          mediatype: metadata.media_type || 'image',
          media: metadata.media_url,
          caption: content || '',
          fileName: metadata.file_name || 'file'
        }
      );
    } else {
      // Send text
      evolutionResponse = await evolutionRequest(
        client,
        `/message/sendText/${config.instance_name}`,
        'POST',
        {
          number: normalizePhone(targetPhone),
          text: content
        }
      );
    }

    console.log('✅ [Chat] WhatsApp message sent successfully');

    return c.json({ 
      success: true, 
      data: {
        message_id: evolutionResponse.key?.id,
        status: 'sent',
        evolution_response: evolutionResponse
      }
    });
  } catch (error: any) {
    console.error('[Chat] Erro ao enviar mensagem WhatsApp:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao enviar mensagem' 
    }, 500);
  }
});

/**
 * POST /channels/whatsapp/webhook
 * Webhook para receber mensagens do Evolution API
 * 
 * Rota completa: /rendizy-server/chat/channels/whatsapp/webhook
 * 
 * ⚠️ CRÍTICA: Usada pelo WhatsApp Integration em produção
 * ⚠️ NÃO MODIFICAR sem seguir checklist em FUNCIONALIDADES_CRITICAS.md
 * 
 * ✅ RESTAURADO DO BACKUP - Implementação completa
 */
app.post('/channels/whatsapp/webhook', async (c) => {
  const payload = await c.req.json();
  return processWhatsAppWebhook(c, payload);
});

// Compat: quando webhook_by_events=true, Evolution pode chamar /webhook/:event
app.post('/channels/whatsapp/webhook/:event', async (c) => {
  const payload = await c.req.json();
  if (!payload.event) {
    payload.event = c.req.param('event');
  }
  return processWhatsAppWebhook(c, payload);
});

// ============================================================================
// CONVERSATIONS ROUTES - CRUD completo para Chat Inbox
// ============================================================================

/**
 * GET /conversations
 * Lista conversas de uma organização
 */
app.get('/conversations', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('❌ [Chat] Erro ao listar conversas:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('[Chat] Erro ao listar conversas:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao listar conversas' }, 500);
  }
});

/**
 * GET /conversations/:id
 * Busca conversa específica
 */
app.get('/conversations/:id', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();
    
    if (error) {
      return c.json({ success: false, error: 'Conversa não encontrada' }, 404);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao buscar conversa:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao buscar conversa' }, 500);
  }
});

/**
 * POST /conversations
 * Cria nova conversa
 */
app.post('/conversations', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('conversations')
      .insert({
        ...body,
        organization_id: organizationId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao criar conversa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao criar conversa:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao criar conversa' }, 500);
  }
});

/**
 * PATCH /conversations/:id
 * Atualiza conversa
 */
app.patch('/conversations/:id', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const body = await c.req.json();
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('conversations')
      .update(body)
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao atualizar conversa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao atualizar conversa:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao atualizar conversa' }, 500);
  }
});

/**
 * DELETE /conversations/:id
 * Remove conversa
 */
app.delete('/conversations/:id', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('❌ [Chat] Erro ao remover conversa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Chat] Erro ao remover conversa:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao remover conversa' }, 500);
  }
});

/**
 * PATCH /conversations/:id/pin
 * Toggle pin conversa
 */
app.patch('/conversations/:id/pin', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const client = getSupabaseClient();
    
    // Buscar estado atual
    const { data: existing } = await client
      .from('conversations')
      .select('is_pinned')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();
    
    const newPinnedState = !(existing?.is_pinned || false);
    
    const { data, error } = await client
      .from('conversations')
      .update({ is_pinned: newPinnedState })
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao fixar conversa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao fixar conversa:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao fixar conversa' }, 500);
  }
});

/**
 * PATCH /conversations/:id/order
 * Atualiza ordem da conversa
 */
app.patch('/conversations/:id/order', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const body = await c.req.json();
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('conversations')
      .update({ order: body.order })
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao reordenar conversa:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao reordenar conversa:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao reordenar conversa' }, 500);
  }
});

/**
 * GET /conversations/:id/messages
 * Lista mensagens de uma conversa
 */
app.get('/conversations/:id/messages', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .order('sent_at', { ascending: true });
    
    if (error) {
      console.error('❌ [Chat] Erro ao listar mensagens:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('[Chat] Erro ao listar mensagens:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao listar mensagens' }, 500);
  }
});

/**
 * POST /conversations/:id/messages
 * Envia mensagem em uma conversa
 */
app.post('/conversations/:id/messages', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const conversationId = c.req.param('id');
    const body = await c.req.json();
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('messages')
      .insert({
        ...body,
        conversation_id: conversationId,
        organization_id: organizationId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao enviar mensagem:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // Atualizar last_message na conversa
    await client
      .from('conversations')
      .update({
        last_message: body.content,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao enviar mensagem:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao enviar mensagem' }, 500);
  }
});

// ============================================================================
// TAGS ROUTES - Gerenciamento de tags para categorização
// ============================================================================

/**
 * GET /tags
 * Lista tags de uma organização
 */
app.get('/tags', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('chat_tags')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });
    
    if (error) {
      // Se tabela não existir, retornar array vazio
      if (error.code === '42P01') {
        console.log('ℹ️ [Chat] Tabela chat_tags não existe, retornando array vazio');
        return c.json({ success: true, data: [] });
      }
      console.error('❌ [Chat] Erro ao listar tags:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('[Chat] Erro ao listar tags:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao listar tags' }, 500);
  }
});

/**
 * POST /tags
 * Cria nova tag
 */
app.post('/tags', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('chat_tags')
      .insert({
        ...body,
        organization_id: organizationId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao criar tag:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao criar tag:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao criar tag' }, 500);
  }
});

/**
 * PATCH /tags/:id
 * Atualiza tag
 */
app.patch('/tags/:id', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const tagId = c.req.param('id');
    const body = await c.req.json();
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('chat_tags')
      .update(body)
      .eq('id', tagId)
      .eq('organization_id', organizationId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [Chat] Erro ao atualizar tag:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat] Erro ao atualizar tag:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao atualizar tag' }, 500);
  }
});

/**
 * DELETE /tags/:id
 * Remove tag
 */
app.delete('/tags/:id', async (c) => {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const tagId = c.req.param('id');
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('chat_tags')
      .delete()
      .eq('id', tagId)
      .eq('organization_id', organizationId);
    
    if (error) {
      console.error('❌ [Chat] Erro ao remover tag:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('[Chat] Erro ao remover tag:', error);
    if (error.message?.includes('organization')) {
      return c.json({ success: false, error: error.message }, 401);
    }
    return c.json({ success: false, error: 'Erro ao remover tag' }, 500);
  }
});

// Garantir export default explícito para Deno/Supabase
export default app;
