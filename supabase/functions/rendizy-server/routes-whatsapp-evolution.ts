/// <reference path="./deno.d.ts" />

// ============================================================================
// 🔒 CADEADO DE CONTRATO - WHATSAPP EVOLUTION API
// ============================================================================
// ⚠️ CONTRATO ESTABELECIDO - NÃO MODIFICAR SEM ATUALIZAR CONTRATO
// 
// ESTA FUNCIONALIDADE ESTÁ FUNCIONANDO EM PRODUÇÃO
// 
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  @PROTECTED v1.0.103.1200                                                ║
// ║  @ADR docs/ADR/ADR-002-WHATSAPP-EVOLUTION-API-CONNECTION.md              ║
// ║  @TESTED 2026-01-21                                                      ║
// ║  @STATUS ✅ CONEXÃO BACKEND FUNCIONANDO                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// CONTRATO DA API (O QUE A CÁPSULA ESPERA):
// 
// INPUT (Request):
// - POST /rendizy-server/make-server-67caf26a/whatsapp/test-connection  ← NOVO v1.0.103.1200
//   Body: { api_url: string, api_key: string, instance_name: string }
//   Response: { success: boolean, instanceExists: boolean, instancesCount: number }
//
// - POST /rendizy-server/make-server-67caf26a/whatsapp/connect
//   Body: { api_url: string, instance_name: string, api_key: string }
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - GET /rendizy-server/make-server-67caf26a/whatsapp/status
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - GET /rendizy-server/make-server-67caf26a/whatsapp/qr-code
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - POST /rendizy-server/make-server-67caf26a/whatsapp/send-message
//   Body: { phone: string, message: string }
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// OUTPUT (Response):
// - Success: { success: true, data: { qr_code?: string, status: string, ... } }
// - Error: { success: false, error: string }
// 
// DEPENDÊNCIAS FRONTEND (QUEM USA ESTE CONTRATO):
// - WhatsAppIntegration.tsx → handleTestConnection() usa /whatsapp/test-connection
// - WhatsAppCredentialsTester.tsx → channelsApi.evolution.status()
// - WhatsAppWebhookManager.tsx → channelsApi.evolution.webhook()
// - ChatInboxWithEvolution.tsx → evolutionService.getStatus()
// 
// ENTRELACEAMENTOS DOCUMENTADOS (OK - Sistemas se comunicam):
// - ✅ CRM Module → Pode enviar notificações via WhatsApp quando cria deal
// - ✅ Reservations Module → Pode enviar confirmação via WhatsApp
// - ✅ Guests Module → Pode enviar boas-vindas via WhatsApp
// 
// ⚠️ SE MODIFICAR CONTRATO:
// 1. ✅ Criar versão v2 da rota (manter v1 funcionando)
// 2. ✅ Atualizar frontend gradualmente
// 3. ✅ Só remover v1 quando TODOS migrarem
// 4. ✅ Executar: npm run test:whatsapp-contract
// 
// VALIDAÇÃO DO CONTRATO:
// - Executar: npm run test:whatsapp
// - Verificar: scripts/check-whatsapp-contract.js
// 
// ⚠️ NUNCA REMOVER ROTAS SEM CRIAR VERSÃO ALTERNATIVA
// ============================================================================

/**
 * RENDIZY - WhatsApp Evolution API Routes (Proxy Seguro + Multi-Tenant)
 * 
 * ✅ REFATORADO v1.0.103.600 - CORREÇÃO COMPLETA
 * ✅ CADEADO DE CONTRATO v1.0.103.700 - PROTEÇÃO IMPLEMENTADA
 * ✅ PROXY TEST-CONNECTION v1.0.103.1200 - EVITA MIXED CONTENT
 * 
 * CORREÇÕES APLICADAS:
 * 1. ✅ Adicionado getOrganizationIdOrThrow(c) em TODAS as rotas
 * 2. ✅ Busca credenciais de organization_channel_config por organization_id
 * 3. ✅ Removido c.req.query() onde não apropriado - usa parâmetros de rota ou defaults no backend
 * 4. ✅ Headers Evolution corrigidos conforme tipo de endpoint
 * 5. ✅ Try/catch adequado em todas as rotas
 * 6. ✅ Integração com Supabase para salvar conversas/mensagens
 * 7. ✅ Validação segura de envs sem crashar Edge Function
 * 8. ✅ [v1.0.103.1200] Rota /whatsapp/test-connection para proxy HTTP→HTTPS
 * 
 * @version 1.0.103.1200
 * @date 2026-01-21
 */

// @ts-ignore - Deno runtime suporta npm: protocol
import { Hono } from 'npm:hono';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { getSupabaseClient } from './kv_store.tsx';
import { monitorWhatsAppConnection } from './services/whatsapp-monitor.ts';

// ============================================================================
// TYPES
// ============================================================================

interface EvolutionConfig {
  api_url: string;
  instance_name: string;
  api_key: string;
  instance_token: string;
  enabled: boolean;
}

// ============================================================================
// HELPERS - CONFIGURAÇÃO POR ORGANIZAÇÃO
// ============================================================================

/**
 * Normaliza base URL removendo barras finais
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Busca credenciais Evolution API da organização no Supabase
 * 
 * ✅ REFATORADO V2: Primeiro tenta channel_instances, depois fallback para organization_channel_config
 * 
 * @param organizationId - ID da organização (UUID)
 * @returns Promise<EvolutionConfig | null> - Configuração ou null se não encontrada
 */
async function getEvolutionConfigForOrganization(organizationId: string): Promise<EvolutionConfig | null> {
  try {
    const client = getSupabaseClient();
    
    // ✅ V2: Primeiro tentar buscar em channel_instances (nova arquitetura)
    const { data: channelInstance, error: ciError } = await client
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
      console.log(`✅ [getEvolutionConfigForOrganization] Usando channel_instances para org ${organizationId}`);
      return {
        api_url: normalizeBaseUrl(channelInstance.api_url),
        instance_name: channelInstance.instance_name,
        api_key: channelInstance.api_key,
        instance_token: channelInstance.instance_token || channelInstance.api_key,
        enabled: true,
      };
    }
    
    // ✅ FALLBACK: Tentar tabela legada organization_channel_config
    console.warn(`⚠️ [getEvolutionConfigForOrganization] Nada em channel_instances, tentando tabela legada...`);
    
    const { data, error } = await client
      .from('organization_channel_config')
      .select('whatsapp_enabled, whatsapp_api_url, whatsapp_instance_name, whatsapp_api_key, whatsapp_instance_token')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(`❌ [getEvolutionConfigForOrganization] Erro ao buscar config para org ${organizationId}:`, error);
      return null;
    }

    if (!data || !data.whatsapp_enabled) {
      console.warn(`⚠️ [getEvolutionConfigForOrganization] WhatsApp não configurado para org ${organizationId}`);
      return null;
    }

    if (!data.whatsapp_api_url || !data.whatsapp_instance_name || !data.whatsapp_api_key || !data.whatsapp_instance_token) {
      console.warn(`⚠️ [getEvolutionConfigForOrganization] Credenciais incompletas para org ${organizationId}`);
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
    console.error(`❌ [getEvolutionConfigForOrganization] Erro inesperado:`, error);
    return null;
  }
}

// ============================================================================
// @ARCHITECTURE: WHATSAPP-MULTI-PROVIDER
// @ADR: docs/ADR/ADR-009-WHATSAPP-MULTI-PROVIDER.md
// @CAPSULE: PROVIDER-DETECT
// ============================================================================
// CÁPSULA: DETECÇÃO AUTOMÁTICA DE PROVIDER (WAHA vs Evolution)
// 
// ⚠️ REGRAS PARA IAs:
// 1. SEMPRE usar esta função antes de chamar qualquer API WhatsApp
// 2. NUNCA chamar Evolution API diretamente sem verificar provider
// 3. Se provider = 'waha', usar getConversationsFromDatabase()
// ============================================================================

interface ActiveChannelInstance {
  id: string;
  provider: 'evolution' | 'waha';
  instanceName: string;
  status: string;
  wahaBaseUrl?: string;
  wahaApiKey?: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
}

/**
 * Detecta qual provider WhatsApp a organização está usando
 * Prioriza instância conectada, depois a mais recente
 * 
 * @param organizationId - UUID da organização
 * @returns Provider ativo ou null se nenhum configurado
 */
async function detectActiveWhatsAppProvider(organizationId: string): Promise<ActiveChannelInstance | null> {
  try {
    const client = getSupabaseClient();
    
    // Buscar todas as instâncias WhatsApp da org
    const { data: instances, error } = await client
      .from('channel_instances')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('channel', 'whatsapp')
      .is('deleted_at', null)
      .order('status', { ascending: true }) // 'connected' vem primeiro alfabeticamente? Não, vamos ordenar diferente
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`❌ [detectActiveWhatsAppProvider] Erro ao buscar instâncias:`, error);
      return null;
    }
    
    if (!instances || instances.length === 0) {
      console.log(`ℹ️ [detectActiveWhatsAppProvider] Nenhuma instância WhatsApp para org ${organizationId}`);
      return null;
    }
    
    // Priorizar instância conectada
    const connectedInstance = instances.find(i => i.status === 'connected');
    const activeInstance = connectedInstance || instances[0];
    
    const provider = (activeInstance.provider as 'evolution' | 'waha') || 'evolution';
    
    console.log(`✅ [detectActiveWhatsAppProvider] Provider detectado: ${provider}, instance: ${activeInstance.instance_name}, status: ${activeInstance.status}`);
    
    return {
      id: activeInstance.id,
      provider,
      instanceName: activeInstance.instance_name,
      status: activeInstance.status,
      wahaBaseUrl: activeInstance.waha_base_url,
      wahaApiKey: activeInstance.waha_api_key,
      evolutionApiUrl: activeInstance.api_url,
      evolutionApiKey: activeInstance.api_key,
    };
  } catch (error) {
    console.error(`❌ [detectActiveWhatsAppProvider] Erro inesperado:`, error);
    return null;
  }
}

// ============================================================================
// @CAPSULE: WAHA-DATA
// Busca conversas do banco de dados (para WAHA - alimentado por webhooks)
// ⚠️ REGRA: Esta função SÓ deve ser usada quando provider = 'waha'
// ============================================================================
async function getConversationsFromDatabase(organizationId: string): Promise<any[]> {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('conversations')
      .select(`
        id,
        external_conversation_id,
        guest_name,
        guest_phone,
        last_message,
        last_message_at,
        unread_count,
        category,
        is_pinned,
        instance_id
      `)
      .eq('organization_id', organizationId)
      .order('is_pinned', { ascending: false })
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error(`❌ [getConversationsFromDatabase] Erro:`, error);
      return [];
    }
    
    // Converter para formato compatível com Evolution API
    return (data || []).map(conv => ({
      id: conv.external_conversation_id || conv.id,
      remoteJid: conv.external_conversation_id,
      name: conv.guest_name,
      pushName: conv.guest_name,
      lastMessageTimestamp: conv.last_message_at ? Math.floor(new Date(conv.last_message_at).getTime() / 1000) : undefined,
      unreadCount: conv.unread_count,
      lastMessage: typeof conv.last_message === 'string' 
        ? { message: conv.last_message, fromMe: false }
        : conv.last_message,
      // Campos extras para o frontend
      _source: 'database',
      _isPinned: conv.is_pinned,
      _category: conv.category,
    }));
  } catch (error) {
    console.error(`❌ [getConversationsFromDatabase] Erro inesperado:`, error);
    return [];
  }
}

/**
 * Fallback: Busca credenciais de variáveis de ambiente (para compatibilidade)
 * 
 * ⚠️ AVISO: Usar apenas como fallback. Preferir organization_channel_config.
 */
function getEvolutionConfigFromEnv(): EvolutionConfig | null {
  const apiUrl = Deno.env.get('EVOLUTION_API_URL') ?? '';
  const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME') ?? '';
  const apiKey = Deno.env.get('EVOLUTION_GLOBAL_API_KEY') ?? '';
  const instanceToken = Deno.env.get('EVOLUTION_INSTANCE_TOKEN') ?? '';

  if (!apiUrl || !instanceName || !apiKey || !instanceToken) {
    return null;
  }

  return {
    api_url: normalizeBaseUrl(apiUrl),
    instance_name: instanceName,
    api_key: apiKey,
    instance_token: instanceToken,
    enabled: true,
  };
}

/**
 * Headers para endpoints /manager/* (exigem apikey + instanceToken separados)
 */
function getEvolutionManagerHeaders(config: EvolutionConfig) {
  return {
    'apikey': config.api_key,
    'instanceToken': config.instance_token,
    'Content-Type': 'application/json',
  };
}

/**
 * Headers para endpoints de mensagens (exigem apenas apikey)
 */
function getEvolutionMessagesHeaders(config: EvolutionConfig) {
  return {
    'apikey': config.api_key,
    'instanceToken': config.instance_token, // Instâncias seguras exigem
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// ROUTES
// ============================================================================

export function whatsappEvolutionRoutes(app: Hono) {

  // ==========================================================================
  // POST /rendizy-server/whatsapp/test-connection - Testar conexão com Evolution API
  // ✅ FIX v1.0.103.1200: PROXY para evitar Mixed Content (HTTPS → HTTP)
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/test-connection', async (c) => {
    try {
      console.log('[WhatsApp] 🧪 Testando conexão com Evolution API via PROXY...');
      
      const payload = await c.req.json();
      const { api_url, api_key, instance_name } = payload;
      
      if (!api_url || !api_key || !instance_name) {
        return c.json({ 
          success: false, 
          error: 'api_url, api_key e instance_name são obrigatórios' 
        }, 400);
      }
      
      const cleanUrl = api_url.replace(/\/+$/, '');
      console.log(`[WhatsApp] 🧪 URL: ${cleanUrl}`);
      console.log(`[WhatsApp] 🧪 Instance: ${instance_name}`);
      console.log(`[WhatsApp] 🧪 API Key: ${api_key.substring(0, 10)}...`);
      
      // Fazer a chamada para a Evolution API do BACKEND (evita Mixed Content)
      const response = await fetch(`${cleanUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': api_key,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[WhatsApp] 🧪 Status Evolution: ${response.status}`);
      
      if (response.status === 401) {
        return c.json({
          success: false,
          error: 'API Key inválida! Crie uma nova no Evolution Manager',
          httpStatus: 401,
        }, 200); // Retorna 200 para o frontend processar
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        console.error(`[WhatsApp] 🧪 Erro: ${errorText}`);
        return c.json({
          success: false,
          error: `Erro ${response.status}: ${errorText}`,
          httpStatus: response.status,
        }, 200);
      }
      
      const data = await response.json();
      console.log(`[WhatsApp] 🧪 Resposta:`, JSON.stringify(data).substring(0, 200));
      
      // Verificar se a instância existe
      const instances = Array.isArray(data) ? data : [];
      const instanceExists = instances.some((inst: any) => 
        inst.instance?.instanceName === instance_name
      );
      
      console.log(`[WhatsApp] 🧪 Instância "${instance_name}" existe: ${instanceExists}`);
      console.log(`[WhatsApp] 🧪 Total de instâncias: ${instances.length}`);
      
      return c.json({
        success: true,
        instanceExists,
        instancesCount: instances.length,
        message: instanceExists 
          ? `✅ Conexão OK! Instância "${instance_name}" encontrada`
          : `✅ Conexão OK! Instância "${instance_name}" será criada ao conectar`,
      });
      
    } catch (error) {
      console.error('[WhatsApp] 🧪 Erro no test-connection:', error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao testar conexão',
      }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/send-message - Enviar mensagem de texto
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/send-message', async (c) => {
    try {
      // ✅ CORREÇÃO 1: Obter organization_id
      const organizationId = await getOrganizationIdOrThrow(c);

      // ✅ CORREÇÃO 2: Buscar credenciais da organização
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          error: 'WhatsApp não configurado para esta organização. Configure em Settings → WhatsApp.' 
        }, 400);
      }

      const payload = await c.req.json();
      const { number, text, attachments: attachmentsFromClient, isInternal } = payload;

      if (!number || !text) {
        return c.json({ error: 'Número e texto são obrigatórios' }, 400);
      }

      console.log(`[WhatsApp] [${organizationId}] Enviando mensagem:`, { number, text });

      const response = await fetch(
        `${config.api_url}/message/sendText/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ number, text }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao enviar mensagem:`, errorText);
        return c.json({ error: 'Erro ao enviar mensagem', details: errorText }, response.status as any);
      }

      const data = await response.json();
      console.log(`[WhatsApp] [${organizationId}] Mensagem enviada com sucesso`);

      // -------------------------
      // Persistir conversa + mensagem no banco SQL
      // -------------------------
      try {
        const client = getSupabaseClient();

        // 1) Encontrar ou criar a conversation (external_conversation_id = number)
        let conversationId: string | null = null;
        try {
          const { data: conv } = await client
            .from('conversations')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('external_conversation_id', number)
            .maybeSingle();

          if (conv && (conv as any).id) {
            conversationId = (conv as any).id;
            
            // ✅ CORREÇÃO v1.0.104.020: Atualizar last_message_at ao enviar mensagem
            await client
              .from('conversations')
              .update({
                last_message: text.substring(0, 500),
                last_message_at: new Date().toISOString(),
              })
              .eq('id', conversationId);
            console.log(`[WhatsApp] [${organizationId}] Conversa atualizada com last_message_at: ${conversationId}`);
          } else {
            // criar conversa mínima
            const convInsert: any = {
              organization_id: organizationId,
              external_conversation_id: number,
              guest_phone: number.replace(/@.*/, ''),
              channel: 'whatsapp',
              last_message: text,
              last_message_at: new Date().toISOString(),
            };
            const { data: newConv } = await client.from('conversations').insert(convInsert).select('id').maybeSingle();
            conversationId = newConv?.id || null;
          }
        } catch (convErr) {
          console.warn('[WhatsApp] Não foi possível criar/encontrar conversation:', convErr);
        }

        // 2) Inserir mensagem (tentar salvar attachments e isInternal quando presentes)
        try {
          const attachmentsToSave = Array.isArray(attachmentsFromClient) ? attachmentsFromClient : [];
          const externalId = data?.id || data?.messageId || data?.result?.id || null;

          const msgRow: any = {
            organization_id: organizationId,
            conversation_id: conversationId,
            sender_type: 'staff',
            sender_name: 'system',
            sender_id: null,
            content: text,
            attachments: attachmentsToSave,
            channel: 'whatsapp',
            direction: 'outgoing',
            external_id: externalId,
            external_status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: { isInternal: !!isInternal },
          };

          // Insert message. If table or columns don't exist, catch error and continue.
          const { error: insertErr } = await client.from('messages').insert(msgRow);
          if (insertErr) {
            console.warn('[WhatsApp] Erro ao inserir mensagem no DB:', insertErr.message || insertErr);
          }
        } catch (msgErr) {
          console.warn('[WhatsApp] Falha ao persistir mensagem:', msgErr);
        }
      } catch (err) {
        console.warn('[WhatsApp] Erro ao persistir dados no Supabase:', err);
      }

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em send-message:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao enviar mensagem' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/send-media - Enviar mensagem com mídia
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/send-media', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          error: 'WhatsApp não configurado para esta organização' 
        }, 400);
      }

      const { number, mediaUrl, mediaType, caption } = await c.req.json();

      if (!number || !mediaUrl || !mediaType) {
        return c.json({ error: 'Número, URL da mídia e tipo são obrigatórios' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/message/sendMedia/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ number, mediaUrl, mediaType, caption }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao enviar mídia:`, errorText);
        return c.json({ error: 'Erro ao enviar mídia', details: errorText }, response.status as any);
      }

      const data = await response.json();
      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em send-media:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao enviar mídia' }, 500);
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/messages - Buscar mensagens (inbox)
  // ✅ CORREÇÃO 3: Removido c.req.query('chatId') e c.req.query('limit')
  // Usa parâmetros padrão ou rota específica para chatId
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/messages', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      // ✅ CORREÇÃO 3: Limite padrão no backend, sem query param
      const DEFAULT_LIMIT = 50;

      const response = await fetch(
        `${config.api_url}/message/inbox/${config.instance_name}`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar mensagens`);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Erro ao conectar com Evolution API' 
        });
      }

      let data = await response.json();

      // Limitar quantidade no backend
      if (Array.isArray(data)) {
        data = data.slice(0, DEFAULT_LIMIT);
      }

      // ✅ CORREÇÃO 6: Cache por organization_id (implementar quando necessário)

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em messages:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar mensagens' 
      });
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/messages/:chatId - Buscar mensagens de uma conversa
  // ✅ CORREÇÃO 3: chatId vem da rota, limit tem padrão no backend
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/messages/:chatId', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      // ✅ CORREÇÃO 3: chatId vem do parâmetro de rota, não de query
      const chatId = c.req.param('chatId');
      // ✅ CORREÇÃO 3: limit tem padrão no backend, query param opcional apenas
      const limitParam = c.req.query('limit');
      const limit = limitParam ? parseInt(limitParam) || 50 : 50;

      if (!chatId) {
        return c.json({ error: 'chatId é obrigatório' }, 400);
      }

      console.log(`[WhatsApp] [${organizationId}] 📥 Buscando mensagens do chat:`, chatId);

      const response = await fetch(
        `${config.api_url}/chat/findMessages/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({
            where: { key: { remoteJid: chatId } },
            limit,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar mensagens:`, errorText);
        return c.json({ error: 'Erro ao buscar mensagens', details: errorText }, response.status as any);
      }

      const responseData = await response.json();
      console.log(`[WhatsApp] [${organizationId}] 📦 Resposta bruta:`, typeof responseData, Array.isArray(responseData) ? 'é array' : 'não é array');
      console.log(`[WhatsApp] [${organizationId}] 📦 Estrutura da resposta:`, JSON.stringify(responseData).substring(0, 500));
      
      // ✅ CORREÇÃO: Evolution API pode retornar em múltiplos formatos
      // Formato comum: {data: [{messages: {records: [...]}}]}
      let messages: any[] = [];
      
      // Formato 1: Array direto de mensagens
      if (Array.isArray(responseData)) {
        messages = responseData.flatMap((item: any) => {
          // Se item tem messages.records, extrair
          if (item?.messages?.records && Array.isArray(item.messages.records)) {
            return item.messages.records;
          }
          // Se item tem records, extrair
          if (item?.records && Array.isArray(item.records)) {
            return item.records;
          }
          // Senão, retornar item como mensagem
          return [item];
        });
      }
      // Formato 2: Objeto com data array [{messages: {records: [...]}}]
      else if (responseData && Array.isArray(responseData.data)) {
        messages = responseData.data.flatMap((item: any) => {
          // Se item tem messages.records, extrair
          if (item?.messages?.records && Array.isArray(item.messages.records)) {
            return item.messages.records;
          }
          // Se item tem records, extrair
          if (item?.records && Array.isArray(item.records)) {
            return item.records;
          }
          // Senão, retornar item como mensagem
          return [item];
        });
      }
      // Formato 3: Objeto com messages.records direto
      else if (responseData?.messages?.records && Array.isArray(responseData.messages.records)) {
        messages = responseData.messages.records;
      }
      // Formato 4: Objeto com messages array
      else if (responseData?.messages && Array.isArray(responseData.messages)) {
        messages = responseData.messages;
      }
      // Formato 5: Objeto com records
      else if (responseData?.records && Array.isArray(responseData.records)) {
        messages = responseData.records;
      }
      // Formato 6: Objeto único (tratar como mensagem única)
      else if (responseData && typeof responseData === 'object') {
        messages = [responseData];
      }
      
      console.log(`[WhatsApp] [${organizationId}] ✉️ Mensagens encontradas:`, messages.length);
      if (messages.length > 0) {
        console.log(`[WhatsApp] [${organizationId}] 📝 Primeira mensagem:`, JSON.stringify(messages[0]).substring(0, 300));
      }

      return c.json({ success: true, data: messages });
    } catch (error) {
      console.error('[WhatsApp] Erro em messages/:chatId:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao buscar mensagens' }, 500);
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/status - Status da instância
  // ✅ REFATORADO v1.0.103.950 - Usa fallback de organização como GET /channels/config
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/status', async (c) => {
    try {
      const client = getSupabaseClient();
      
      // ✅ Obter organization_id: Tentar helper híbrido primeiro, fallback para query param ou config existente
      let organizationId: string | undefined;
      
      // Primeiro: Tentar usar organization_id do query param (para compatibilidade com frontend)
      const queryOrgId = c.req.query('organization_id');
      if (queryOrgId) {
        const isUUID = queryOrgId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        
        if (isUUID) {
          organizationId = queryOrgId;
        } else {
          // Buscar organização que já tem config salva (mais importante!)
          try {
            const { data: configData } = await client
              .from('organization_channel_config')
              .select('organization_id')
              .limit(1)
              .maybeSingle();
            
            if (configData?.organization_id) {
              organizationId = configData.organization_id;
            }
          } catch (err) {
            // Ignorar erro silenciosamente
          }
        }
      }
      
      // Segundo: Se não conseguiu do query param, buscar organização com config salva
      if (!organizationId) {
        try {
          const { data: configData } = await client
            .from('organization_channel_config')
            .select('organization_id')
            .eq('whatsapp_enabled', true)
            .limit(1)
            .maybeSingle();
          
          if (configData?.organization_id) {
            organizationId = configData.organization_id;
          }
        } catch (err) {
          // Ignorar erro silenciosamente
        }
      }
      
      // Terceiro: Tentar helper híbrido
      if (!organizationId) {
        try {
          organizationId = await getOrganizationIdOrThrow(c);
        } catch (error) {
          console.warn('[WhatsApp Status] Helper falhou, usando fallback...', error);
        }
      }
      
      if (!organizationId) {
        return c.json({ 
          success: false,
          data: { status: 'DISCONNECTED', error: 'Não foi possível determinar a organização' } 
        }, 400);
      }

      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: false,
          data: { status: 'DISCONNECTED', error: 'WhatsApp não configurado para esta organização' } 
        });
      }

      console.log(`[WhatsApp] [${organizationId}] 🔍 Verificando status da instância: ${config.instance_name}`);

      const response = await fetch(
        `${config.api_url}/instance/connectionState/${config.instance_name}`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar status:`, response.status, errorText);
        return c.json({ 
          success: true,
          data: { status: 'DISCONNECTED', message: 'Erro ao conectar com Evolution API' } 
        });
      }

      const data = await response.json();
      console.log(`[WhatsApp] [${organizationId}] 📊 Status recebido:`, data);
      
      // Mapear status Evolution → Status padrão
      // Evolution API retorna: 'open' (conectado), 'close' (desconectado), 'connecting' (conectando)
      console.log(`[WhatsApp] [${organizationId}] 📊 Resposta completa do status:`, JSON.stringify(data).substring(0, 500));
      
      let status = 'DISCONNECTED';
      // ✅ CORREÇÃO: Procurar status em várias propriedades possíveis
      const state = data.state || 
                   data.instance?.state || 
                   data.instance?.connectionState || 
                   data.connectionState ||
                   data.status ||
                   data.instance?.connection?.state ||
                   'close';
      
      console.log(`[WhatsApp] [${organizationId}] 🔍 Estado extraído: '${state}'`);
      
      // Verificar se é objeto 'open' (algumas versões retornam objeto)
      const stateString = typeof state === 'string' ? state.toUpperCase() : JSON.stringify(state);
      
      if (stateString === 'OPEN' || stateString.includes('OPEN') || stateString === '"open"') {
        status = 'CONNECTED';
      } else if (stateString === 'CONNECTING' || stateString.includes('CONNECTING') || stateString === '"connecting"') {
        status = 'CONNECTING';
      } else if (stateString === 'CLOSE' || stateString.includes('CLOSE') || stateString === '"close"' || stateString === 'DISCONNECTED' || stateString.includes('DISCONNECTED')) {
        status = 'DISCONNECTED';
      } else {
        // Tentar verificar se há propriedades que indicam conexão
        if (data.instance && (data.instance.phone || data.instance.profileName)) {
          status = 'CONNECTED';
          console.log(`[WhatsApp] [${organizationId}] ✅ Status inferido como CONNECTED (há telefone/perfil)`);
        }
      }

      console.log(`[WhatsApp] [${organizationId}] ✅ Status mapeado: '${state}' → '${status}'`);

      return c.json({ success: true, data: { status, state: String(state), rawData: data } });
    } catch (error) {
      console.error('[WhatsApp] Erro em status:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ 
          success: false,
          data: { status: 'ERROR', error: error.message } 
        }, 400);
      }
      return c.json({ 
        success: false,
        data: { status: 'ERROR', error: 'Erro interno ao verificar status' } 
      }, 500);
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/instance-info - Informações detalhadas da instância
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/instance-info', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/instance/fetchInstances`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        return c.json({ error: 'Erro ao buscar informações' }, response.status as any);
      }

      const instances = await response.json();
      const instance = Array.isArray(instances)
        ? instances.find((i: any) => i.instance?.instanceName === config.instance_name)
        : null;

      if (!instance) {
        return c.json({ error: 'Instância não encontrada' }, 404);
      }

      return c.json({
        success: true,
        data: {
          status: instance.instance?.state || 'DISCONNECTED',
          phone: instance.instance?.owner || null,
          profileName: instance.instance?.profileName || null,
          profilePictureUrl: instance.instance?.profilePictureUrl || null,
        },
      });
    } catch (error) {
      console.error('[WhatsApp] Erro em instance-info:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno' }, 500);
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/qr-code - Obter QR Code para conexão
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/qr-code', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      console.log(`[WhatsApp] [${organizationId}] Solicitando QR Code...`);

      const response = await fetch(
        `${config.api_url}/instance/connect/${config.instance_name}`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao obter QR Code:`, errorText);
        return c.json({ error: 'Erro ao obter QR Code', details: errorText }, response.status as any);
      }

      const data = await response.json();

      return c.json({
        success: true,
        data: {
          qrCode: data.base64 || data.code || '',
          expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minuto
        },
      });
    } catch (error) {
      console.error('[WhatsApp] Erro em qr-code:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao obter QR Code' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/check-number - Verificar se número existe no WhatsApp
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/check-number', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ data: { exists: false, error: 'WhatsApp não configurado' } });
      }

      const { number } = await c.req.json();

      if (!number) {
        return c.json({ error: 'Número é obrigatório' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/chat/whatsappNumbers/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ numbers: [number] }),
        }
      );

      if (!response.ok) {
        return c.json({ data: { exists: false } });
      }

      const data = await response.json();
      const exists = Array.isArray(data) && data.length > 0 && data[0]?.exists;

      return c.json({ success: true, data: { exists } });
    } catch (error) {
      console.error('[WhatsApp] Erro em check-number:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ data: { exists: false, error: error.message } });
      }
      return c.json({ data: { exists: false } });
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/health - Health check
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/health', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      return c.json({
        success: !!config && config.enabled,
        data: {
          healthy: !!config && config.enabled,
          version: 'Evolution API v2',
          configured: !!config && config.enabled,
          organization_id: organizationId,
          hasConfig: !!config,
        },
      });
    } catch (error) {
      return c.json({
        success: false,
        data: {
          healthy: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/disconnect - Desconectar instância
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/disconnect', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/instance/logout/${config.instance_name}`,
        {
          method: 'DELETE',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        return c.json({ error: 'Erro ao desconectar' }, response.status as any);
      }

      return c.json({ success: true, message: 'Desconectado com sucesso' });
    } catch (error) {
      console.error('[WhatsApp] Erro em disconnect:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao desconectar' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/reconnect - Reconectar instância
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/reconnect', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/instance/restart/${config.instance_name}`,
        {
          method: 'PUT',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        return c.json({ error: 'Erro ao reconectar' }, response.status as any);
      }

      return c.json({ success: true, message: 'Reconectado com sucesso' });
    } catch (error) {
      console.error('[WhatsApp] Erro em reconnect:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao reconectar' }, 500);
    }
  });

  // ==========================================================================
  // GET /rendizy-server/whatsapp/contacts - Buscar todos os contatos
  // ==========================================================================
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/contacts', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      console.log(`[WhatsApp] [${organizationId}] 📇 Buscando contatos...`);

      // ✅ CORREÇÃO: Documentação oficial indica POST /chat/findContacts/{instance}
      // Body opcional: { "where": { "id": "<string>" } } para buscar contato específico
      // Sem body: retorna todos os contatos
      const response = await fetch(
        `${config.api_url}/chat/findContacts/${config.instance_name}`,
        {
          method: 'POST', // ✅ CORREÇÃO: POST conforme documentação oficial
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({}), // Body vazio para buscar todos os contatos
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar contatos:`, errorText);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Erro ao conectar com Evolution API' 
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Evolution API offline' 
        });
      }

      const contacts = await response.json();
      console.log(`[WhatsApp] [${organizationId}] 👥 Contatos encontrados:`, contacts.length || 0);

      return c.json({ success: true, data: contacts });
    } catch (error) {
      console.error('[WhatsApp] Erro em contacts:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar contatos' 
      });
    }
  });

  // ==========================================================================
  // @ARCHITECTURE: WHATSAPP-MULTI-PROVIDER
  // @ADR: docs/ADR/ADR-009-WHATSAPP-MULTI-PROVIDER.md
  // @CAPSULE: UNIFIED-CHATS
  // ==========================================================================
  // GET /rendizy-server/whatsapp/chats - Buscar todas as conversas
  // ✅ REFATORADO v1.0.104 - CÁPSULA SEPARADA WAHA vs Evolution
  // 
  // ⚠️ REGRAS PARA IAs:
  // 1. Este endpoint detecta AUTOMATICAMENTE o provider
  // 2. NUNCA modificar para chamar Evolution API diretamente
  // 3. Se precisar mudar lógica, manter estrutura de cápsulas
  // ==========================================================================
  const handleGetWhatsAppChats = async (c: any) => {
    try {
      console.log(`🔍 [WhatsApp Chats] Iniciando busca de conversas...`);
      
      const organizationId = await getOrganizationIdOrThrow(c);
      console.log(`✅ [WhatsApp Chats] organization_id identificado: ${organizationId}`);
      
      // ✅ CÁPSULA SEPARADA: Detectar provider primeiro
      const activeInstance = await detectActiveWhatsAppProvider(organizationId);
      
      if (activeInstance && activeInstance.provider === 'waha') {
        // =====================================================================
        // @CAPSULE: WAHA-DATA
        // Buscar do banco de dados (alimentado por webhooks)
        // =====================================================================
        console.log(`🟢 [WhatsApp Chats] Provider: WAHA - buscando do banco de dados...`);
        
        const chats = await getConversationsFromDatabase(organizationId);
        console.log(`✅ [WhatsApp Chats] WAHA: ${chats.length} conversas encontradas no banco`);
        
        return c.json({ 
          success: true, 
          data: chats,
          provider: 'waha',
          source: 'database'
        });
      }
      
      // =====================================================================
      // @CAPSULE: EVOLUTION-DATA
      // Buscar da Evolution API
      // =====================================================================
      console.log(`🔵 [WhatsApp Chats] Provider: Evolution - buscando da API...`);
      
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      console.log(`🔍 [WhatsApp Chats] Config encontrada:`, config ? 'SIM' : 'NÃO');
      
      if (!config || !config.enabled) {
        // Se não tem config Evolution, tentar buscar do banco mesmo assim
        console.warn(`⚠️ [WhatsApp Chats] Evolution não configurado, tentando banco de dados...`);
        const fallbackChats = await getConversationsFromDatabase(organizationId);
        
        if (fallbackChats.length > 0) {
          return c.json({ 
            success: true, 
            data: fallbackChats,
            provider: 'database_fallback',
            source: 'database'
          });
        }
        
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      console.log(`[WhatsApp] [${organizationId}] 💬 Buscando conversas da Evolution API...`);
      console.log(`[WhatsApp] [${organizationId}] 🌐 API URL: ${config.api_url}`);
      console.log(`[WhatsApp] [${organizationId}] 📱 Instance: "${config.instance_name}"`);

      // ✅ CORREÇÃO CRÍTICA: Encoding correto e tentar múltiplos endpoints
      const encodedInstanceName = encodeURIComponent(config.instance_name);
      console.log(`[WhatsApp] [${organizationId}] 📱 Instance (encoded): "${encodedInstanceName}"`);
      
      // ✅ Tentar múltiplos endpoints possíveis
      let response: Response | null = null;
      let lastError: string = '';
      let workingEndpoint = '';
      
      // ✅ CORREÇÃO CRÍTICA: Evolution API usa POST, não GET!
      // Verificado no dashboard: POST /chat/findChats/{instance_name}
      
      // Tentativa 1: findChats com POST (método correto usado pelo dashboard)
      try {
        const findChatsUrl = `${config.api_url}/chat/findChats/${encodedInstanceName}`;
        console.log(`[WhatsApp] [${organizationId}] 🔄 Tentando 1: POST /chat/findChats com encoding...`);
        response = await fetch(findChatsUrl, {
          method: 'POST', // ✅ CORREÇÃO: POST ao invés de GET
          headers: getEvolutionMessagesHeaders(config),
        });
        
        if (response.ok) {
          workingEndpoint = 'POST findChats (encoded)';
          console.log(`[WhatsApp] [${organizationId}] ✅ ${workingEndpoint} funcionou!`);
        } else {
          const errorText = await response.text();
          lastError = errorText.substring(0, 200);
          console.warn(`[WhatsApp] [${organizationId}] ⚠️ POST findChats (encoded) falhou (${response.status}):`, lastError);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`[WhatsApp] [${organizationId}] ⚠️ Erro ao tentar POST findChats (encoded):`, lastError);
      }
      
      // Tentativa 2: findChats com POST sem encoding
      if (!response || !response.ok) {
        try {
          const findChatsUrlNoEncode = `${config.api_url}/chat/findChats/${config.instance_name}`;
          console.log(`[WhatsApp] [${organizationId}] 🔄 Tentando 2: POST /chat/findChats sem encoding...`);
          response = await fetch(findChatsUrlNoEncode, {
            method: 'POST', // ✅ CORREÇÃO: POST ao invés de GET
            headers: getEvolutionMessagesHeaders(config),
          });
          
          if (response.ok) {
            workingEndpoint = 'POST findChats (sem encoding)';
            console.log(`[WhatsApp] [${organizationId}] ✅ ${workingEndpoint} funcionou!`);
          } else {
            const errorText = await response.text();
            lastError = errorText.substring(0, 200);
            console.warn(`[WhatsApp] [${organizationId}] ⚠️ POST findChats (sem encoding) falhou (${response.status}):`, lastError);
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          console.warn(`[WhatsApp] [${organizationId}] ⚠️ Erro ao tentar POST findChats (sem encoding):`, lastError);
        }
      }
      
      // Tentativa 3: fetchChats com POST (fallback)
      if (!response || !response.ok) {
        try {
          const fetchChatsUrl = `${config.api_url}/chat/fetchChats/${encodedInstanceName}`;
          console.log(`[WhatsApp] [${organizationId}] 🔄 Tentando 3: POST /chat/fetchChats com encoding...`);
          response = await fetch(fetchChatsUrl, {
            method: 'POST', // ✅ CORREÇÃO: POST ao invés de GET
            headers: getEvolutionMessagesHeaders(config),
          });
          
          if (response.ok) {
            workingEndpoint = 'POST fetchChats (encoded)';
            console.log(`[WhatsApp] [${organizationId}] ✅ ${workingEndpoint} funcionou!`);
          } else {
            const errorText = await response.text();
            lastError = errorText.substring(0, 200);
            console.warn(`[WhatsApp] [${organizationId}] ⚠️ POST fetchChats (encoded) falhou (${response.status}):`, lastError);
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          console.warn(`[WhatsApp] [${organizationId}] ⚠️ Erro ao tentar POST fetchChats (encoded):`, lastError);
        }
      }
      
      // Tentativa 4: findChats com GET (fallback para compatibilidade)
      if (!response || !response.ok) {
        try {
          const findChatsUrl = `${config.api_url}/chat/findChats/${encodedInstanceName}`;
          console.log(`[WhatsApp] [${organizationId}] 🔄 Tentando 4: GET /chat/findChats com encoding (fallback)...`);
          response = await fetch(findChatsUrl, {
            method: 'GET',
            headers: getEvolutionMessagesHeaders(config),
          });
          
          if (response.ok) {
            workingEndpoint = 'GET findChats (encoded)';
            console.log(`[WhatsApp] [${organizationId}] ✅ ${workingEndpoint} funcionou!`);
          } else {
            const errorText = await response.text();
            lastError = errorText.substring(0, 200);
            console.warn(`[WhatsApp] [${organizationId}] ⚠️ GET findChats (encoded) falhou (${response.status}):`, lastError);
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          console.warn(`[WhatsApp] [${organizationId}] ⚠️ Erro ao tentar GET findChats (encoded):`, lastError);
        }
      }

      if (!response || !response.ok) {
        console.error(`[WhatsApp] [${organizationId}] ❌ Todas as tentativas falharam`);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: `Erro ao conectar com Evolution API: Nenhum endpoint funcionou - ${lastError}` 
        });
      }

      console.log(`[WhatsApp] [${organizationId}] 📡 Evolution API Status: ${response.status} ${response.statusText} (endpoint: ${workingEndpoint})`);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Evolution API offline' 
        });
      }

      const responseData = await response.json();
      console.log(`[WhatsApp] [${organizationId}] 📦 Resposta completa da Evolution API (primeiros 1000 chars):`, JSON.stringify(responseData).substring(0, 1000));
      
      // ✅ CORREÇÃO CRÍTICA: Evolution API pode retornar array diretamente ou objeto com propriedade 'data'
      // Muitas vezes retorna objeto com estrutura: { data: [...], count: X } ou apenas [...]
      let chats: any[] = [];
      
      if (Array.isArray(responseData)) {
        // Caso 1: Retorna array diretamente
        chats = responseData;
        console.log(`[WhatsApp] [${organizationId}] ✅ Resposta é array direto`);
      } else if (responseData && typeof responseData === 'object') {
        // Caso 2: Retorna objeto - procurar por array dentro
        if (Array.isArray(responseData.data)) {
          chats = responseData.data;
          console.log(`[WhatsApp] [${organizationId}] ✅ Chats encontrados em 'data'`);
        } else if (Array.isArray(responseData.chats)) {
          chats = responseData.chats;
          console.log(`[WhatsApp] [${organizationId}] ✅ Chats encontrados em 'chats'`);
        } else if (Array.isArray(responseData.result)) {
          chats = responseData.result;
          console.log(`[WhatsApp] [${organizationId}] ✅ Chats encontrados em 'result'`);
        } else {
          // Caso 3: Procurar qualquer propriedade que seja array
          const arrayKeys = Object.keys(responseData).filter(key => Array.isArray(responseData[key]));
          if (arrayKeys.length > 0) {
            chats = responseData[arrayKeys[0]];
            console.log(`[WhatsApp] [${organizationId}] ✅ Chats encontrados na propriedade '${arrayKeys[0]}'`);
          } else {
            console.warn(`[WhatsApp] [${organizationId}] ⚠️ Resposta não contém array. Estrutura:`, Object.keys(responseData));
          }
        }
      }
      
      console.log(`[WhatsApp] [${organizationId}] 💬 Total de conversas encontradas:`, chats.length);
      if (chats.length > 0) {
        console.log(`[WhatsApp] [${organizationId}] 📝 Primeira conversa (primeiros 300 chars):`, JSON.stringify(chats[0]).substring(0, 300));
        console.log(`[WhatsApp] [${organizationId}] 📝 Estrutura da primeira conversa:`, Object.keys(chats[0] || {}));
      } else {
        console.warn(`[WhatsApp] [${organizationId}] ⚠️ Nenhuma conversa encontrada na resposta da Evolution API`);
        console.warn(`[WhatsApp] [${organizationId}] ⚠️ Resposta completa:`, JSON.stringify(responseData).substring(0, 500));
      }

      // ✅ CORREÇÃO 6: Salvar conversas no Supabase (opcional - implementar quando necessário)
      // TODO: Sincronizar chats com tabela chat_conversations no Supabase

      return c.json({ success: true, data: chats });
    } catch (error) {
      console.error('[WhatsApp] Erro em chats:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar conversas' 
      });
    }
  };

  // ✅ ROTA SEM PREFIXO (frontend novo)
  app.get('/rendizy-server/whatsapp/chats', handleGetWhatsAppChats);
  
  // ✅ ROTA COM PREFIXO (compatibilidade com frontend antigo)
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/chats', handleGetWhatsAppChats);

  // ==========================================================================
  // ✅ ROTAS ADICIONAIS SEM PREFIXO (para o SimpleChatInbox novo)
  // ==========================================================================

  // Handler para send-message (extraído para reuso)
  const handleSendMessage = async (c: any) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          error: 'WhatsApp não configurado para esta organização. Configure em Settings → WhatsApp.' 
        }, 400);
      }

      const payload = await c.req.json();
      const { number, text, attachments: attachmentsFromClient, isInternal } = payload;

      if (!number || !text) {
        return c.json({ error: 'Número e texto são obrigatórios' }, 400);
      }

      console.log(`[WhatsApp] [${organizationId}] Enviando mensagem:`, { number, text });

      const response = await fetch(
        `${config.api_url}/message/sendText/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ number, text }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao enviar mensagem:`, errorText);
        return c.json({ error: 'Erro ao enviar mensagem', details: errorText }, response.status as any);
      }

      const data = await response.json();
      console.log(`[WhatsApp] [${organizationId}] Mensagem enviada com sucesso`);

      // Persistir no banco (simplificado)
      try {
        const client = getSupabaseClient();
        
        // Encontrar ou criar conversation
        const { data: conv } = await client
          .from('conversations')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('external_conversation_id', number)
          .maybeSingle();

        const conversationId = conv?.id || null;

        if (conversationId) {
          await client
            .from('conversations')
            .update({
              last_message: text.substring(0, 500),
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId);
        }
      } catch (err) {
        console.warn('[WhatsApp] Erro ao persistir:', err);
      }

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em send-message:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao enviar mensagem' }, 500);
    }
  };

  // Handler para messages/:chatId (extraído para reuso)
  const handleGetMessagesForChat = async (c: any) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const chatId = c.req.param('chatId');
      const limitParam = c.req.query('limit');
      const limit = limitParam ? parseInt(limitParam) || 50 : 50;

      if (!chatId) {
        return c.json({ error: 'chatId é obrigatório' }, 400);
      }

      console.log(`[WhatsApp] [${organizationId}] 📥 Buscando mensagens do chat:`, chatId);

      const response = await fetch(
        `${config.api_url}/chat/findMessages/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({
            where: { key: { remoteJid: chatId } },
            limit,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar mensagens:`, errorText);
        return c.json({ error: 'Erro ao buscar mensagens', details: errorText }, response.status as any);
      }

      const responseData = await response.json();
      
      // Extrair mensagens de múltiplos formatos possíveis
      let messages: any[] = [];
      
      if (Array.isArray(responseData)) {
        messages = responseData.flatMap((item: any) => {
          if (item?.messages?.records && Array.isArray(item.messages.records)) {
            return item.messages.records;
          }
          if (item?.records && Array.isArray(item.records)) {
            return item.records;
          }
          return [item];
        });
      } else if (responseData && Array.isArray(responseData.data)) {
        messages = responseData.data.flatMap((item: any) => {
          if (item?.messages?.records && Array.isArray(item.messages.records)) {
            return item.messages.records;
          }
          if (item?.records && Array.isArray(item.records)) {
            return item.records;
          }
          return [item];
        });
      } else if (responseData?.messages?.records && Array.isArray(responseData.messages.records)) {
        messages = responseData.messages.records;
      } else if (responseData?.messages && Array.isArray(responseData.messages)) {
        messages = responseData.messages;
      } else if (responseData?.records && Array.isArray(responseData.records)) {
        messages = responseData.records;
      } else if (responseData && typeof responseData === 'object') {
        messages = [responseData];
      }
      
      console.log(`[WhatsApp] [${organizationId}] ✉️ Mensagens encontradas:`, messages.length);

      return c.json({ success: true, data: messages });
    } catch (error) {
      console.error('[WhatsApp] Erro em messages/:chatId:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao buscar mensagens' }, 500);
    }
  };

  // Handler para messages inbox
  const handleGetMessagesInbox = async (c: any) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      const DEFAULT_LIMIT = 50;

      const response = await fetch(
        `${config.api_url}/message/inbox/${config.instance_name}`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar mensagens`);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Erro ao conectar com Evolution API' 
        });
      }

      let data = await response.json();

      if (Array.isArray(data)) {
        data = data.slice(0, DEFAULT_LIMIT);
      }

      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em messages:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar mensagens' 
      });
    }
  };

  // ROTAS SEM PREFIXO
  app.post('/rendizy-server/whatsapp/send-message', handleSendMessage);
  app.get('/rendizy-server/whatsapp/messages', handleGetMessagesInbox);
  app.get('/rendizy-server/whatsapp/messages/:chatId', handleGetMessagesForChat);
  
  // ✅ ROTA DE COMPATIBILIDADE PARA CONTATOS (com prefixo antigo para frontend em produção)
  // Reutiliza o mesmo handler da rota principal (sem prefixo)
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/contacts', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      // ✅ CORREÇÃO: Documentação oficial indica POST /chat/findContacts/{instance}
      // Body opcional: { "where": { "id": "<string>" } } para buscar contato específico
      // Sem body: retorna todos os contatos
      const response = await fetch(
        `${config.api_url}/chat/findContacts/${config.instance_name}`,
        {
          method: 'POST', // ✅ CORREÇÃO: POST conforme documentação oficial
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({}), // Body vazio para buscar todos os contatos
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar contatos:`, errorText);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Erro ao conectar com Evolution API' 
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Evolution API offline' 
        });
      }

      const contacts = await response.json();
      console.log(`[WhatsApp] [${organizationId}] 👥 Contatos encontrados:`, contacts.length || 0);

      return c.json({ success: true, data: contacts });
    } catch (error) {
      console.error('[WhatsApp] Erro em contacts (compatibility):', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar contatos' 
      });
    }
  });
  
  // ==========================================================================
  // ROTA DE WEBHOOK DE COMPATIBILIDADE (para registrar na Evolution API)
  // ==========================================================================
  // O webhook correto está em routes-chat.ts: /chat/channels/whatsapp/webhook
  // Mas a Evolution API espera: /rendizy-server/whatsapp/webhook
  // Vamos manter ambas as rotas funcionando
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/webhook', async (c) => {
    try {
      const payload = await c.req.json();
      console.log('📥 [WhatsApp Webhook] Evento recebido:', payload.event || 'unknown');
      
      // Redirecionar para a rota de chat que processa o webhook corretamente
      // Por enquanto, apenas logar e retornar sucesso
      // TODO: Integrar com routes-chat.ts para processar corretamente
      
      return c.json({ success: true, message: 'Webhook recebido' });
    } catch (error) {
      console.error('[WhatsApp Webhook] Erro:', error);
      return c.json({ success: false, error: 'Erro ao processar webhook' }, 500);
    }
  });

  // ==========================================================================
  // ROTA ANTIGA (removida - substituída pela função handleGetWhatsAppChats)
  // ==========================================================================
  /*
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/chats', async (c) => {
    try {
      // ✅ ARQUITETURA SQL v1.0.103.950 - Logs detalhados para debug
      console.log(`🔍 [WhatsApp Chats] Iniciando busca de conversas...`);
      
      const organizationId = await getOrganizationIdOrThrow(c);
      console.log(`✅ [WhatsApp Chats] organization_id identificado: ${organizationId}`);
      
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      console.log(`🔍 [WhatsApp Chats] Config encontrada:`, config ? 'SIM' : 'NÃO');
      
      if (!config || !config.enabled) {
        console.warn(`⚠️ [WhatsApp Chats] WhatsApp não configurado para org ${organizationId}`);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      console.log(`[WhatsApp] [${organizationId}] 💬 Buscando conversas...`);
      console.log(`[WhatsApp] [${organizationId}] 🌐 API URL: ${config.api_url}`);
      console.log(`[WhatsApp] [${organizationId}] 📱 Instance: ${config.instance_name}`);

      const evolutionUrl = `${config.api_url}/chat/findChats/${config.instance_name}`;
      console.log(`[WhatsApp] [${organizationId}] 🌐 Evolution API URL: ${evolutionUrl}`);
      
      const response = await fetch(
        evolutionUrl,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      console.log(`[WhatsApp] [${organizationId}] 📡 Evolution API Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] ❌ Erro ao buscar conversas:`, errorText);
        console.error(`[WhatsApp] [${organizationId}] ❌ Status: ${response.status}`);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: `Erro ao conectar com Evolution API: ${response.status} - ${errorText.substring(0, 100)}` 
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Evolution API offline' 
        });
      }

      const chats = await response.json();
      console.log(`[WhatsApp] [${organizationId}] 💬 Conversas encontradas:`, chats.length || 0);

      // ✅ CORREÇÃO 6: Salvar conversas no Supabase (opcional - implementar quando necessário)
      // TODO: Sincronizar chats com tabela chat_conversations no Supabase

      return c.json({ success: true, data: chats });
    } catch (error) {
      console.error('[WhatsApp] Erro em chats:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar conversas' 
      });
    }
  });
  */

  // ==========================================================================
  // POST /rendizy-server/whatsapp/webhook - Receber eventos da Evolution API
  // ⚠️ DEPRECATED: Use /rendizy-server/chat/channels/whatsapp/webhook
  // Este endpoint agora apenas loga e retorna success para não quebrar integrações
  // O salvamento real é feito em routes-chat.ts
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/webhook', async (c) => {
    try {
      const payload = await c.req.json();
      const { event } = payload;

      // Log para debug - o processamento real está em routes-chat.ts
      console.log('[WhatsApp Webhook Evolution] ⚠️ DEPRECATED - Use /chat/channels/whatsapp/webhook');
      console.log('[WhatsApp Webhook Evolution] 📨 Evento recebido:', event);

      // Apenas retorna success - o salvamento real é feito no routes-chat.ts
      // Configure o webhook da Evolution API para apontar para:
      // /rendizy-server/chat/channels/whatsapp/webhook
      
      return c.json({ 
        success: true, 
        message: 'Webhook received (deprecated endpoint)',
        note: 'Use /rendizy-server/chat/channels/whatsapp/webhook for full processing'
      });
    } catch (error) {
      console.error('[WhatsApp Webhook Evolution] ❌ Erro:', error);
      return c.json({ success: false, error: 'Erro ao processar webhook' }, 500);
    }
  });

  // ==========================================================================
  // ALIASES: Rotas sem /rendizy-server/make-server-67caf26a para compatibilidade com frontend
  // ==========================================================================
  
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/contacts', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      // ✅ CORREÇÃO: Documentação oficial indica POST /chat/findContacts/{instance}
      // Body opcional: { "where": { "id": "<string>" } } para buscar contato específico
      // Sem body: retorna todos os contatos
      const response = await fetch(
        `${config.api_url}/chat/findContacts/${config.instance_name}`,
        {
          method: 'POST', // ✅ CORREÇÃO: POST conforme documentação oficial
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({}), // Body vazio para buscar todos os contatos
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp] [${organizationId}] Erro ao buscar contatos:`, errorText);
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Erro ao conectar com Evolution API' 
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Evolution API offline' 
        });
      }

      const contacts = await response.json();
      return c.json({ success: true, data: contacts });
    } catch (error) {
      console.error('[WhatsApp] Erro em contacts (alias):', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar contatos' 
      });
    }
  });

  app.get('/rendizy-server/make-server-67caf26a/whatsapp/chats', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'WhatsApp não configurado para esta organização' 
        });
      }

      const response = await fetch(
        `${config.api_url}/chat/findChats/${config.instance_name}`,
        {
          method: 'GET',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Erro ao conectar com Evolution API' 
        });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return c.json({ 
          success: true, 
          data: [], 
          offline: true, 
          message: 'Evolution API offline' 
        });
      }

      const chats = await response.json();
      return c.json({ success: true, data: chats });
    } catch (error) {
      console.error('[WhatsApp] Erro em chats (alias):', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ 
        success: true, 
        data: [], 
        offline: true, 
        message: 'Erro interno ao buscar conversas' 
      });
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/send-list - Enviar lista interativa
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/send-list', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const { number, listMessage } = await c.req.json();

      if (!number || !listMessage) {
        return c.json({ error: 'Número e listMessage são obrigatórios' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/message/sendList/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ number, listMessage }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return c.json({ error: 'Erro ao enviar lista', details: errorText }, response.status as any);
      }

      const data = await response.json();
      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em send-list:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao enviar lista' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/send-location - Enviar localização
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/send-location', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const { number, locationMessage } = await c.req.json();

      if (!number || !locationMessage || !locationMessage.latitude || !locationMessage.longitude) {
        return c.json({ error: 'Número, latitude e longitude são obrigatórios' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/message/sendLocation/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ number, locationMessage }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return c.json({ error: 'Erro ao enviar localização', details: errorText }, response.status as any);
      }

      const data = await response.json();
      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em send-location:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao enviar localização' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/send-poll - Enviar enquete
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/send-poll', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const { number, pollMessage } = await c.req.json();

      if (!number || !pollMessage || !pollMessage.name || !pollMessage.values) {
        return c.json({ error: 'Número, pergunta e opções são obrigatórios' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/message/sendPoll/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ number, pollMessage }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return c.json({ error: 'Erro ao enviar enquete', details: errorText }, response.status as any);
      }

      const data = await response.json();
      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em send-poll:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao enviar enquete' }, 500);
    }
  });

  // ==========================================================================
  // PUT /rendizy-server/whatsapp/mark-as-read - Marcar mensagens como lidas
  // ==========================================================================
  app.put('/rendizy-server/make-server-67caf26a/whatsapp/mark-as-read', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const { read_messages } = await c.req.json();

      if (!read_messages || !Array.isArray(read_messages)) {
        return c.json({ error: 'read_messages deve ser um array' }, 400);
      }

      const response = await fetch(
        `${config.api_url}/chat/markMessageAsRead/${config.instance_name}`,
        {
          method: 'PUT',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({ read_messages }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return c.json({ error: 'Erro ao marcar como lido', details: errorText }, response.status as any);
      }

      const data = await response.json();
      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em mark-as-read:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao marcar como lido' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/settings - Configurar instância
  // ✅ CORREÇÃO 4: Usa getEvolutionManagerHeaders() para endpoints manager
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/settings', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      const settings = await c.req.json();

      // ✅ CORREÇÃO 4: Endpoints /settings/* são manager endpoints
      const response = await fetch(
        `${config.api_url}/settings/set/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionManagerHeaders(config), // ✅ Manager headers
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return c.json({ error: 'Erro ao atualizar configurações', details: errorText }, response.status as any);
      }

      const data = await response.json();
      return c.json({ success: true, data });
    } catch (error) {
      console.error('[WhatsApp] Erro em settings:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao atualizar configurações' }, 500);
    }
  });

  // ==========================================================================
  // POST /rendizy-server/whatsapp/monitor/start - Iniciar monitoramento automático
  // ✅ v1.0.103.960 - Monitora e reconecta automaticamente
  // ==========================================================================
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/monitor/start', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ error: 'WhatsApp não configurado para esta organização' }, 400);
      }

      console.log(`[WhatsApp Monitor] 🚀 Iniciando monitoramento para org ${organizationId}...`);

      // Iniciar monitoramento (não bloqueante)
      monitorWhatsAppConnection({
        organizationId,
        ...config,
      }).catch(error => {
        console.error(`[WhatsApp Monitor] ❌ Erro no monitoramento:`, error);
      });

      return c.json({ 
        success: true, 
        message: 'Monitoramento iniciado com sucesso',
        monitoring: true,
      });
    } catch (error) {
      console.error('[WhatsApp] Erro ao iniciar monitoramento:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'Erro interno ao iniciar monitoramento' }, 500);
    }
  });

  // ==========================================================================
  // WEBHOOK MANAGEMENT ROUTES (v1.0.103.322)
  // Gerenciamento de webhooks da Evolution API
  // ==========================================================================

  // POST /rendizy-server/make-server-67caf26a/whatsapp/webhook/setup
  // Configurar webhook automaticamente na Evolution API
  app.post('/rendizy-server/make-server-67caf26a/whatsapp/webhook/setup', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      console.log(`[WhatsApp Webhook Setup] [${organizationId}] Buscando configuração...`);
      
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config) {
        console.error(`[WhatsApp Webhook Setup] [${organizationId}] Config não encontrado`);
        return c.json({ 
          success: false,
          error: 'WhatsApp não configurado para esta organização' 
        }, 400);
      }
      
      if (!config.enabled) {
        console.error(`[WhatsApp Webhook Setup] [${organizationId}] Config desabilitado`);
        return c.json({ 
          success: false,
          error: 'WhatsApp não configurado para esta organização' 
        }, 400);
      }
      
      console.log(`[WhatsApp Webhook Setup] [${organizationId}] Config encontrado:`, {
        api_url: config.api_url,
        instance_name: config.instance_name,
        has_api_key: !!config.api_key,
        has_instance_token: !!config.instance_token
      });

      const body = await c.req.json();
      const { webhookUrl, events, webhookByEvents } = body;

      if (!webhookUrl || !events || !Array.isArray(events)) {
        return c.json({ 
          success: false,
          error: 'webhookUrl e events são obrigatórios' 
        }, 400);
      }

      console.log(`[WhatsApp Webhook Setup] [${organizationId}] Configurando webhook...`);
      console.log(`[WhatsApp Webhook Setup] URL: ${webhookUrl}`);
      console.log(`[WhatsApp Webhook Setup] Eventos: ${events.join(', ')}`);

      // Configurar webhook na Evolution API
      // A Evolution API espera url/events no nível raiz (não dentro de "webhook")
      // Também precisa corrigir GROUPS_UPDATE para GROUP_UPDATE
      const correctedEvents = events.map(event => 
        event === 'GROUPS_UPDATE' ? 'GROUP_UPDATE' : event
      );
      
      const response = await fetch(
        `${config.api_url}/webhook/set/${config.instance_name}`,
        {
          method: 'POST',
          headers: getEvolutionMessagesHeaders(config),
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: correctedEvents,
            webhook_by_events: webhookByEvents || false,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp Webhook Setup] Erro HTTP ${response.status}:`, errorText);
        console.error(`[WhatsApp Webhook Setup] URL: ${config.api_url}/webhook/set/${config.instance_name}`);
        console.error(`[WhatsApp Webhook Setup] Body enviado:`, JSON.stringify({
          enabled: true,
          url: webhookUrl,
          events: correctedEvents,
          webhook_by_events: webhookByEvents || false,
        }));
        return c.json({ 
          success: false,
          error: 'Erro ao configurar webhook na Evolution API',
          details: errorText,
          status: response.status
        }, 500);
      }

      const data = await response.json();
      console.log(`[WhatsApp Webhook Setup] ✅ Webhook configurado com sucesso`);

      // Salvar configuração no banco (opcional)
      // Nota: webhook_url e webhook_events podem não existir na tabela ainda
      // Por enquanto, apenas atualizamos updated_at
      const client = getSupabaseClient();
      try {
        const { error: updateError } = await client
          .from('organization_channel_config')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);
        
        if (updateError) {
          console.warn('[WhatsApp Webhook Setup] Erro ao atualizar updated_at:', updateError);
        }
        
        // Tentar salvar webhook_url e webhook_events se as colunas existirem
        // (usando select para verificar se colunas existem antes de tentar update)
        try {
          const { error: updateError } = await client
            .from('organization_channel_config')
            .update({
              webhook_url: webhookUrl,
              webhook_events: events,
            } as any)
            .eq('organization_id', organizationId);
          
          if (updateError && updateError.code === '42703') {
            // Coluna não existe - ignorar silenciosamente
            console.log('[WhatsApp Webhook Setup] Colunas webhook_url/webhook_events não existem ainda - pulando salvamento');
          } else if (updateError) {
            console.warn('[WhatsApp Webhook Setup] Erro ao salvar webhook config:', updateError);
          }
        } catch (colErr) {
          // Colunas não existem - ignorar
          console.log('[WhatsApp Webhook Setup] Colunas webhook não disponíveis ainda');
        }
      } catch (err) {
        console.warn('[WhatsApp Webhook Setup] Erro geral ao salvar no banco:', err);
      }

      return c.json({
        success: true,
        data: data,
        config: {
          enabled: true,
          url: webhookUrl,
          events: events,
          configuredAt: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('[WhatsApp Webhook Setup] Erro:', error);
      return c.json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao configurar webhook' 
      }, 500);
    }
  });

  // GET /rendizy-server/make-server-67caf26a/whatsapp/webhook/status
  // Verificar status atual do webhook
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/webhook/status', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: true,
          data: {
            enabled: false,
            configured: false,
            url: null,
            events: []
          }
        });
      }

      // Buscar configuração do banco
      const client = getSupabaseClient();
      let webhookUrl: string | null = null;
      let webhookEvents: string[] = [];
      
      try {
        const { data: dbConfig } = await client
          .from('organization_channel_config')
          .select('*')
          .eq('organization_id', organizationId)
          .maybeSingle();
        
        // Tentar acessar webhook_url e webhook_events (podem não existir ainda)
        if (dbConfig) {
          webhookUrl = (dbConfig as any).webhook_url || null;
          webhookEvents = (dbConfig as any).webhook_events || [];
        }
      } catch (err) {
        console.warn('[WhatsApp Webhook Status] Erro ao buscar config do banco:', err);
      }

      if (!webhookUrl) {
        return c.json({ 
          success: true,
          data: {
            enabled: false,
            configured: false,
            url: null,
            events: []
          }
        });
      }

      // Verificar status na Evolution API
      try {
        const response = await fetch(
          `${config.api_url}/webhook/find/${config.instance_name}`,
          {
            method: 'GET',
            headers: getEvolutionMessagesHeaders(config),
          }
        );

        if (response.ok) {
          const evolutionData = await response.json();
          return c.json({
            success: true,
            data: {
              enabled: true,
              configured: true,
              url: webhookUrl,
              events: webhookEvents,
              evolutionData: evolutionData
            }
          });
        }
      } catch (err) {
        console.warn('[WhatsApp Webhook Status] Erro ao verificar na Evolution API:', err);
      }

      // Retornar dados do banco se Evolution API falhar
      return c.json({
        success: true,
        data: {
          enabled: true,
          configured: true,
          url: webhookUrl,
          events: webhookEvents
        }
      });
    } catch (error) {
      console.error('[WhatsApp Webhook Status] Erro:', error);
      return c.json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao verificar status' 
      }, 500);
    }
  });

  // GET /rendizy-server/make-server-67caf26a/whatsapp/webhook/events
  // Listar últimos eventos recebidos
  app.get('/rendizy-server/make-server-67caf26a/whatsapp/webhook/events', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      
      // Buscar eventos do KV Store (temporário - migrar para SQL depois)
      const client = getSupabaseClient();
      let events = [];
      try {
        const { data } = await client
          .from('chat_webhooks')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(50);
        events = data || [];
      } catch (err) {
        console.warn('[WhatsApp Webhook Events] Erro ao buscar eventos:', err);
        events = [];
      }

      return c.json({
        success: true,
        data: events || [],
        count: events?.length || 0
      });
    } catch (error) {
      console.error('[WhatsApp Webhook Events] Erro:', error);
      return c.json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao listar eventos' 
      }, 500);
    }
  });

  // DELETE /rendizy-server/make-server-67caf26a/whatsapp/webhook
  // Remover configuração do webhook
  app.delete('/rendizy-server/make-server-67caf26a/whatsapp/webhook', async (c) => {
    try {
      const organizationId = await getOrganizationIdOrThrow(c);
      const config = await getEvolutionConfigForOrganization(organizationId) || getEvolutionConfigFromEnv();
      
      if (!config || !config.enabled) {
        return c.json({ 
          success: false,
          error: 'WhatsApp não configurado para esta organização' 
        }, 400);
      }

      // Remover webhook na Evolution API
      const response = await fetch(
        `${config.api_url}/webhook/delete/${config.instance_name}`,
        {
          method: 'DELETE',
          headers: getEvolutionMessagesHeaders(config),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp Webhook Delete] Erro:`, errorText);
        // Continuar mesmo se Evolution API falhar
      }

      // Remover configuração do banco
      const client = getSupabaseClient();
      try {
        const { error: updateError } = await client
          .from('organization_channel_config')
          .update({
            webhook_url: null,
            webhook_events: null,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);
        
        if (updateError) {
          console.warn('[WhatsApp Webhook Delete] Erro ao atualizar banco:', updateError);
        }
      } catch (err) {
        console.warn('[WhatsApp Webhook Delete] Erro ao atualizar banco:', err);
      }

      return c.json({
        success: true,
        message: 'Webhook removido com sucesso'
      });
    } catch (error) {
      console.error('[WhatsApp Webhook Delete] Erro:', error);
      return c.json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno ao remover webhook' 
      }, 500);
    }
  });

  return app;
}
