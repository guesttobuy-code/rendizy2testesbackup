/// <reference path="./deno.d.ts" />

/**
 * ============================================================================
 * RENDIZY - Channel Instances API Routes
 * ============================================================================
 * 
 * Rotas para gerenciar instâncias de canais (WhatsApp, SMS, etc)
 * usando a nova tabela channel_instances com arquitetura multi-tenant.
 * 
 * A API Key Global da Evolution fica no backend - o cliente nunca vê.
 * O cliente apenas:
 * - Vê lista de números conectados
 * - Escaneia QR Code
 * - Define descrição e cor para cada número
 * 
 * @version v2.0.0
 * @date 2026-01-22
 * @author Rendizy Team
 * ============================================================================
 */

// @ts-ignore - Deno runtime
import { Hono } from 'npm:hono';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { getSupabaseClient } from './kv_store.tsx';

// ============================================================================
// CONSTANTS - Evolution API Global Config
// ============================================================================

// API Key global da Evolution (NUNCA expor ao cliente!)
const EVOLUTION_GLOBAL_API_KEY = Deno.env.get('EVOLUTION_GLOBAL_API_KEY') || 'Rendizy2026EvolutionAPI';
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || 'http://76.13.82.60:8080';

// Webhook URL padrão para Evolution
const getWebhookUrl = (projectId: string) => 
  `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook`;

// ============================================================================
// TYPES
// ============================================================================

interface CreateInstanceRequest {
  description?: string;
  color?: string;
}

interface UpdateInstanceRequest {
  description?: string;
  color?: string;
}

interface ChannelInstanceRow {
  id: string;
  organization_id: string;
  channel: string;
  provider: string;
  instance_name: string;
  api_url: string;
  api_key: string;
  instance_token: string | null;
  status: string;
  connected_identifier: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  webhook_url: string | null;
  webhook_events: string[] | null;
  qr_code: string | null;
  error_message: string | null;
  description: string | null;
  color: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_connected_at: string | null;
  deleted_at: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gera nome único da instância: org-{shortOrgId}-{timestamp}
 */
function generateInstanceName(organizationId: string): string {
  const shortOrgId = organizationId.substring(0, 8);
  const timestamp = Date.now().toString(36);
  return `org-${shortOrgId}-${timestamp}`;
}

/**
 * Headers para Evolution API (usando API Key global)
 */
function getEvolutionHeaders() {
  return {
    'apikey': EVOLUTION_GLOBAL_API_KEY,
    'Content-Type': 'application/json',
  };
}

/**
 * Cria instância na Evolution API
 */
async function createEvolutionInstance(instanceName: string, webhookUrl: string): Promise<{
  success: boolean;
  instanceToken?: string;
  error?: string;
}> {
  try {
    console.log(`[ChannelInstances] 🔧 Criando instância Evolution: ${instanceName}`);
    
    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: getEvolutionHeaders(),
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        // Webhook config
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: {},
          events: [
            'MESSAGES_SET',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'MESSAGES_DELETE',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
          ],
        },
        // Comportamento padrão
        rejectCall: false,
        msgCall: '',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: true,
        syncFullHistory: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ChannelInstances] ❌ Erro ao criar instância:`, errorText);
      return { success: false, error: `Erro ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log(`[ChannelInstances] ✅ Instância criada:`, JSON.stringify(data).substring(0, 200));

    // Evolution retorna o token da instância em hash.apikey
    const instanceToken = data?.hash?.apikey || data?.hash?.jwt || data?.instance?.token || '';

    return { 
      success: true, 
      instanceToken,
    };
  } catch (error) {
    console.error(`[ChannelInstances] ❌ Erro ao criar instância:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Busca status da instância na Evolution API
 * ✅ CORREÇÃO: Usa fetchInstances para obter ownerJid (connectionState não retorna)
 */
async function getEvolutionInstanceStatus(instanceName: string): Promise<{
  status: string;
  phoneNumber?: string;
  profileName?: string;
  profilePictureUrl?: string;
}> {
  try {
    // ✅ Usar fetchInstances ao invés de connectionState para obter ownerJid
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: getEvolutionHeaders(),
    });

    if (!response.ok) {
      console.error(`[ChannelInstances] ❌ Erro ao buscar instâncias: ${response.status}`);
      return { status: 'disconnected' };
    }

    const instances = await response.json();
    const instance = Array.isArray(instances) 
      ? instances.find((i: any) => i.name === instanceName)
      : null;
    
    if (!instance) {
      console.log(`[ChannelInstances] ⚠️ Instância ${instanceName} não encontrada`);
      return { status: 'disconnected' };
    }
    
    console.log(`[ChannelInstances] 📊 Instância ${instanceName}:`, {
      connectionStatus: instance.connectionStatus,
      ownerJid: instance.ownerJid,
      profileName: instance.profileName
    });
    
    // Mapear status
    const state = instance.connectionStatus || 'close';
    let status = 'disconnected';
    
    if (state === 'open' || state === 'OPEN') {
      status = 'connected';
    } else if (state === 'connecting' || state === 'CONNECTING') {
      status = 'connecting';
    }

    // ✅ Extrair phoneNumber do ownerJid (formato: 5521994414512@s.whatsapp.net)
    let phoneNumber = instance.ownerJid || instance.number;
    if (phoneNumber && phoneNumber.includes('@')) {
      phoneNumber = phoneNumber.split('@')[0];
    }
    
    console.log(`[ChannelInstances] ✅ Status: ${status}, Phone: ${phoneNumber || 'N/A'}`);

    return {
      status,
      phoneNumber,
      profileName: instance.profileName,
      profilePictureUrl: instance.profilePicUrl,
    };
  } catch (error) {
    console.error(`[ChannelInstances] Erro ao buscar status:`, error);
    return { status: 'error' };
  }
}

/**
 * Busca QR Code da instância na Evolution API
 */
async function getEvolutionQrCode(instanceName: string): Promise<{
  qrCode?: string;
  pairingCode?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: getEvolutionHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Erro ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log('[ChannelInstances] 📱 QR Code response:', Object.keys(data), data.count || 0);
    
    let qrCode = data.base64 || data.code || data.qrcode?.base64;
    
    // ✅ CORREÇÃO: Remover prefixo data:image se já vier com ele (o frontend adiciona)
    if (qrCode && qrCode.startsWith('data:image/png;base64,')) {
      qrCode = qrCode.replace('data:image/png;base64,', '');
      console.log('[ChannelInstances] ✅ Prefixo removido do QR Code');
    }
    
    if (!qrCode) {
      console.log('[ChannelInstances] ⚠️ QR Code não encontrado na resposta');
      return { error: 'QR Code não disponível. Tente novamente.' };
    }
    
    console.log('[ChannelInstances] ✅ QR Code obtido, tamanho base64:', qrCode?.length);
    
    return { 
      qrCode,
      pairingCode: data.pairingCode || null, // Código de 8 dígitos (alternativa ao QR)
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * Gera Pairing Code (código de 8 dígitos) para conectar sem QR
 * Alternativa mais confiável ao QR Code
 */
async function getEvolutionPairingCode(instanceName: string, phoneNumber: string): Promise<{
  pairingCode?: string;
  error?: string;
}> {
  try {
    // Formato: 5521995885999 (sem +)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'POST',
      headers: getEvolutionHeaders(),
      body: JSON.stringify({
        number: cleanNumber,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Erro ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { pairingCode: data.pairingCode || data.code };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

/**
 * Deleta instância na Evolution API
 */
async function deleteEvolutionInstance(instanceName: string): Promise<boolean> {
  try {
    // Primeiro, faz logout
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: getEvolutionHeaders(),
    });

    // Depois, deleta
    const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: getEvolutionHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error(`[ChannelInstances] Erro ao deletar instância:`, error);
    return false;
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Helper para obter organizationId do contexto
 * Tenta primeiro via sessão, depois via header x-organization-id
 */
async function getOrganizationId(c: any): Promise<string> {
  // Tentar primeiro via header direto (mais simples para APIs)
  const headerOrgId = c.req.header('x-organization-id');
  if (headerOrgId && headerOrgId.length >= 36) {
    console.log(`[ChannelInstances] ✅ Usando organization_id do header: ${headerOrgId}`);
    return headerOrgId;
  }

  // Tentar via getOrganizationIdOrThrow (requer sessão)
  try {
    const orgId = await getOrganizationIdOrThrow(c);
    return orgId;
  } catch (error) {
    console.error('[ChannelInstances] ❌ Não foi possível obter organization_id:', error);
    throw new Error('organization_id é obrigatório. Envie via header x-organization-id ou faça login.');
  }
}

export function channelInstancesRoutes(app: Hono) {
  const ROUTE_PREFIX = '/rendizy-server/channel-instances';

  // ==========================================================================
  // GET /channel-instances - Listar instâncias da organização
  // ==========================================================================
  app.get(`${ROUTE_PREFIX}`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const channel = c.req.query('channel'); // Filtro opcional por canal
      
      console.log(`[ChannelInstances] 📋 Listando instâncias para org: ${organizationId}`);

      const client = getSupabaseClient();
      
      let query = client
        .from('channel_instances')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[ChannelInstances] ❌ Erro ao buscar instâncias:`, error);
        return c.json({ success: false, error: 'Erro ao buscar instâncias' }, 500);
      }

      // Enriquecer com status em tempo real (para WhatsApp)
      const enrichedInstances = await Promise.all(
        (data || []).map(async (instance: ChannelInstanceRow) => {
          if (instance.channel === 'whatsapp') {
            const liveStatus = await getEvolutionInstanceStatus(instance.instance_name);
            return {
              id: instance.id,
              channel: instance.channel,
              provider: instance.provider,
              instanceName: instance.instance_name,
              description: instance.description || 'WhatsApp',
              color: instance.color || '#25D366',
              status: liveStatus.status,
              phoneNumber: liveStatus.phoneNumber || instance.connected_identifier,
              profileName: liveStatus.profileName || instance.profile_name,
              profilePictureUrl: liveStatus.profilePictureUrl || instance.profile_picture_url,
              createdAt: instance.created_at,
              lastConnectedAt: instance.last_connected_at,
            };
          }
          
          // Outros canais retornam dados do banco
          return {
            id: instance.id,
            channel: instance.channel,
            provider: instance.provider,
            instanceName: instance.instance_name,
            description: instance.description,
            color: instance.color,
            status: instance.status,
            connectedIdentifier: instance.connected_identifier,
            profileName: instance.profile_name,
            createdAt: instance.created_at,
            lastConnectedAt: instance.last_connected_at,
          };
        })
      );

      return c.json({
        success: true,
        data: enrichedInstances,
        count: enrichedInstances.length,
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em GET /:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // POST /channel-instances/whatsapp - Criar nova instância WhatsApp
  // ==========================================================================
  app.post(`${ROUTE_PREFIX}/whatsapp`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const body = await c.req.json() as CreateInstanceRequest;
      
      console.log(`[ChannelInstances] ➕ Criando instância WhatsApp para org: ${organizationId}`);

      const client = getSupabaseClient();
      
      // Verificar limite (por exemplo, máximo 5 instâncias por org)
      const { count } = await client
        .from('channel_instances')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('channel', 'whatsapp')
        .is('deleted_at', null);

      if ((count || 0) >= 5) {
        return c.json({
          success: false,
          error: 'Limite de instâncias WhatsApp atingido (máximo 5)',
        }, 400);
      }

      // Gerar nome único da instância
      const instanceName = generateInstanceName(organizationId);
      
      // Pegar project ID do Supabase para webhook
      const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || 'odcgnzfremrqnvtitpcc';
      const webhookUrl = getWebhookUrl(projectId);

      // Criar instância na Evolution API
      const evolutionResult = await createEvolutionInstance(instanceName, webhookUrl);
      
      if (!evolutionResult.success) {
        return c.json({
          success: false,
          error: evolutionResult.error || 'Erro ao criar instância na Evolution',
        }, 500);
      }

      // Salvar no banco
      const { data: newInstance, error } = await client
        .from('channel_instances')
        .insert({
          organization_id: organizationId,
          channel: 'whatsapp',
          provider: 'evolution',
          instance_name: instanceName,
          api_url: EVOLUTION_API_URL,
          api_key: EVOLUTION_GLOBAL_API_KEY, // Guardado criptografado seria ideal
          instance_token: evolutionResult.instanceToken,
          status: 'qr_pending',
          webhook_url: webhookUrl,
          webhook_events: ['MESSAGES_SET', 'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
          description: body.description || 'Novo WhatsApp',
          color: body.color || '#25D366',
        })
        .select()
        .single();

      if (error) {
        console.error(`[ChannelInstances] ❌ Erro ao salvar instância:`, error);
        // Tentar deletar da Evolution se falhou no banco
        await deleteEvolutionInstance(instanceName);
        return c.json({ success: false, error: 'Erro ao salvar instância' }, 500);
      }

      console.log(`[ChannelInstances] ✅ Instância criada: ${instanceName}`);

      // Buscar QR Code inicial
      const qrResult = await getEvolutionQrCode(instanceName);

      return c.json({
        success: true,
        data: {
          id: newInstance.id,
          instanceName: newInstance.instance_name,
          description: newInstance.description,
          color: newInstance.color,
          status: 'qr_pending',
          qrCode: qrResult.qrCode,
        },
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em POST /whatsapp:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // GET /channel-instances/:id - Detalhes de uma instância
  // ==========================================================================
  app.get(`${ROUTE_PREFIX}/:id`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');

      const client = getSupabaseClient();
      
      const { data: instance, error } = await client
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !instance) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      // Buscar status em tempo real
      const liveStatus = await getEvolutionInstanceStatus(instance.instance_name);

      return c.json({
        success: true,
        data: {
          id: instance.id,
          channel: instance.channel,
          provider: instance.provider,
          instanceName: instance.instance_name,
          description: instance.description,
          color: instance.color,
          status: liveStatus.status,
          phoneNumber: liveStatus.phoneNumber || instance.connected_identifier,
          profileName: liveStatus.profileName || instance.profile_name,
          profilePictureUrl: liveStatus.profilePictureUrl || instance.profile_picture_url,
          createdAt: instance.created_at,
          lastConnectedAt: instance.last_connected_at,
        },
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em GET /:id:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // GET /channel-instances/:id/qr-code - Obter QR Code para conexão
  // ==========================================================================
  app.get(`${ROUTE_PREFIX}/:id/qr-code`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');

      const client = getSupabaseClient();
      
      const { data: instance, error } = await client
        .from('channel_instances')
        .select('instance_name')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !instance) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      // Verificar status primeiro
      const status = await getEvolutionInstanceStatus(instance.instance_name);
      
      if (status.status === 'connected') {
        return c.json({
          success: true,
          data: {
            alreadyConnected: true,
            phoneNumber: status.phoneNumber,
            profileName: status.profileName,
          },
        });
      }

      // Buscar QR Code
      const qrResult = await getEvolutionQrCode(instance.instance_name);

      if (qrResult.error) {
        return c.json({ success: false, error: qrResult.error }, 500);
      }

      return c.json({
        success: true,
        data: {
          qrCode: qrResult.qrCode,
          pairingCode: qrResult.pairingCode, // Código de 8 dígitos (alternativa)
          expiresIn: 45, // QR expira em ~45 segundos
          tip: 'WhatsApp Business é suportado! Se não conectar, tente: 1) Fechar WhatsApp Web em outros dispositivos, 2) Usar o código de 8 dígitos',
        },
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em GET /:id/qr-code:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // POST /channel-instances/:id/pairing-code - Gerar código de 8 dígitos
  // Alternativa ao QR Code - mais confiável para WhatsApp Business
  // ==========================================================================
  app.post(`${ROUTE_PREFIX}/:id/pairing-code`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');
      const body = await c.req.json() as { phoneNumber: string };

      if (!body.phoneNumber) {
        return c.json({ success: false, error: 'Número de telefone é obrigatório' }, 400);
      }

      const client = getSupabaseClient();
      
      const { data: instance, error } = await client
        .from('channel_instances')
        .select('instance_name')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !instance) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      // Verificar status primeiro
      const status = await getEvolutionInstanceStatus(instance.instance_name);
      
      if (status.status === 'connected') {
        return c.json({
          success: true,
          data: {
            alreadyConnected: true,
            phoneNumber: status.phoneNumber,
            profileName: status.profileName,
          },
        });
      }

      // Gerar Pairing Code
      const pairingResult = await getEvolutionPairingCode(instance.instance_name, body.phoneNumber);

      if (pairingResult.error) {
        return c.json({ success: false, error: pairingResult.error }, 500);
      }

      return c.json({
        success: true,
        data: {
          pairingCode: pairingResult.pairingCode,
          expiresIn: 60,
          instructions: 'No WhatsApp, vá em Configurações > Aparelhos Conectados > Conectar Aparelho > Conectar com número de telefone. Digite este código de 8 dígitos.',
        },
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em POST /:id/pairing-code:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // PUT /channel-instances/:id - Atualizar descrição/cor
  // ==========================================================================
  app.put(`${ROUTE_PREFIX}/:id`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');
      const body = await c.req.json() as UpdateInstanceRequest;

      const client = getSupabaseClient();
      
      // Verificar se pertence à organização
      const { data: existing } = await client
        .from('channel_instances')
        .select('id')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (!existing) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      // Montar update
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      
      if (body.description !== undefined) {
        updates.description = body.description;
      }
      if (body.color !== undefined) {
        updates.color = body.color;
      }

      const { data: updated, error } = await client
        .from('channel_instances')
        .update(updates)
        .eq('id', instanceId)
        .select()
        .single();

      if (error) {
        return c.json({ success: false, error: 'Erro ao atualizar' }, 500);
      }

      return c.json({
        success: true,
        data: {
          id: updated.id,
          description: updated.description,
          color: updated.color,
        },
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em PUT /:id:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // DELETE /channel-instances/:id - Remover instância (soft delete)
  // ==========================================================================
  app.delete(`${ROUTE_PREFIX}/:id`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');
      const forceDelete = c.req.query('force') === 'true';

      const client = getSupabaseClient();
      
      // Buscar instância
      const { data: instance, error } = await client
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !instance) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      // Se for WhatsApp, deletar da Evolution também
      if (instance.channel === 'whatsapp') {
        await deleteEvolutionInstance(instance.instance_name);
      }

      if (forceDelete) {
        // Hard delete
        await client.from('channel_instances').delete().eq('id', instanceId);
      } else {
        // Soft delete - apenas deleted_at, pois status tem check constraint
        const { error: updateError } = await client
          .from('channel_instances')
          .update({ 
            deleted_at: new Date().toISOString(),
          })
          .eq('id', instanceId);
        
        if (updateError) {
          console.error('[ChannelInstances] ❌ Erro no soft delete:', updateError);
          throw new Error(`Falha no soft delete: ${updateError.message}`);
        }
      }

      console.log(`[ChannelInstances] 🗑️ Instância removida: ${instance.instance_name}`);

      return c.json({
        success: true,
        message: 'Instância removida com sucesso',
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em DELETE /:id:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // POST /channel-instances/:id/reconnect - Reconectar instância
  // ==========================================================================
  app.post(`${ROUTE_PREFIX}/:id/reconnect`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');

      const client = getSupabaseClient();
      
      const { data: instance, error } = await client
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !instance) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      if (instance.channel !== 'whatsapp') {
        return c.json({ success: false, error: 'Reconexão disponível apenas para WhatsApp' }, 400);
      }

      // Tentar reconectar na Evolution
      const qrResult = await getEvolutionQrCode(instance.instance_name);

      // Atualizar status no banco
      await client
        .from('channel_instances')
        .update({ 
          status: 'qr_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);

      return c.json({
        success: true,
        data: {
          qrCode: qrResult.qrCode,
          status: 'qr_pending',
        },
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em POST /:id/reconnect:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  // ==========================================================================
  // POST /channel-instances/:id/disconnect - Desconectar (logout)
  // ==========================================================================
  app.post(`${ROUTE_PREFIX}/:id/disconnect`, async (c) => {
    try {
      const organizationId = await getOrganizationId(c);
      const instanceId = c.req.param('id');

      const client = getSupabaseClient();
      
      const { data: instance, error } = await client
        .from('channel_instances')
        .select('*')
        .eq('id', instanceId)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !instance) {
        return c.json({ success: false, error: 'Instância não encontrada' }, 404);
      }

      if (instance.channel !== 'whatsapp') {
        return c.json({ success: false, error: 'Desconexão disponível apenas para WhatsApp' }, 400);
      }

      // Fazer logout na Evolution
      await fetch(`${EVOLUTION_API_URL}/instance/logout/${instance.instance_name}`, {
        method: 'DELETE',
        headers: getEvolutionHeaders(),
      });

      // Atualizar status no banco
      await client
        .from('channel_instances')
        .update({ 
          status: 'disconnected',
          connected_identifier: null,
          profile_name: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instanceId);

      return c.json({
        success: true,
        message: 'WhatsApp desconectado com sucesso',
      });
    } catch (error) {
      console.error('[ChannelInstances] ❌ Erro em POST /:id/disconnect:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }, 500);
    }
  });

  console.log('[ChannelInstances] 📌 Rotas registradas em /rendizy-server/channel-instances');
}
