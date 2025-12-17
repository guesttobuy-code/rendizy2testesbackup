/**
 * WhatsApp Connection Monitor & Auto-Reconnect Service
 * 
 * Monitora a conexão WhatsApp e reconecta automaticamente se cair
 * Mantém conexão estável com heartbeat e reconexão automática
 * 
 * @version v1.0.103.960
 * @date 2025-11-20
 */

import { getSupabaseClient } from '../kv_store.tsx';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PROJECT_REF } from '../utils-env.ts';

/**
 * Normaliza base URL removendo barras finais
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

interface MonitorConfig {
  organizationId: string;
  api_url: string;
  instance_name: string;
  api_key: string;
  instance_token: string;
  enabled: boolean;
}

interface ConnectionStatus {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  lastChecked: Date;
  lastConnected?: Date;
  reconnectAttempts: number;
}

// Cache de status por organização (evita verificações excessivas)
const connectionStatusCache = new Map<string, ConnectionStatus>();

/**
 * Verificar status da conexão WhatsApp
 */
async function checkConnectionStatus(config: MonitorConfig): Promise<ConnectionStatus> {
  try {
      const response = await fetch(
        `${normalizeBaseUrl(config.api_url)}/instance/connectionState/${config.instance_name}`,
        {
          method: 'GET',
          headers: {
            'apikey': config.api_key,
            'instanceToken': config.instance_token,
            'Content-Type': 'application/json',
          },
        }
      );

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const data = await response.json();
    const state = data.state || 
                 data.instance?.state || 
                 data.connectionState ||
                 'close';

    const status: ConnectionStatus = {
      status: (state === 'open' || state === 'OPEN') ? 'CONNECTED' : 'DISCONNECTED',
      lastChecked: new Date(),
      reconnectAttempts: connectionStatusCache.get(config.organizationId)?.reconnectAttempts || 0,
    };

    if (status.status === 'CONNECTED') {
      status.lastConnected = new Date();
      status.reconnectAttempts = 0; // Reset tentativas ao conectar
    }

    connectionStatusCache.set(config.organizationId, status);
    return status;
  } catch (error) {
    console.error(`[WhatsApp Monitor] Erro ao verificar status para org ${config.organizationId}:`, error);
    return {
      status: 'ERROR',
      lastChecked: new Date(),
      reconnectAttempts: (connectionStatusCache.get(config.organizationId)?.reconnectAttempts || 0) + 1,
    };
  }
}

/**
 * Tentar reconectar instância WhatsApp
 */
async function attemptReconnect(config: MonitorConfig): Promise<boolean> {
  try {
    console.log(`[WhatsApp Monitor] 🔄 Tentando reconectar org ${config.organizationId}...`);

    // Tentativa 1: Restart da instância
    const restartResponse = await fetch(
      `${normalizeBaseUrl(config.api_url)}/instance/restart/${config.instance_name}`,
      {
        method: 'PUT',
        headers: {
          'apikey': config.api_key,
          'instanceToken': config.instance_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (restartResponse.ok) {
      console.log(`[WhatsApp Monitor] ✅ Instância reiniciada com sucesso`);
      
      // Aguardar alguns segundos para instância ficar pronta
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verificar se conectou
      const status = await checkConnectionStatus(config);
      if (status.status === 'CONNECTED') {
        console.log(`[WhatsApp Monitor] ✅ Reconexão bem-sucedida!`);
        await updateConnectionStatusInDB(config.organizationId, true);
        return true;
      }
    }

    // Se restart não funcionou, marcar como desconectado no banco
    await updateConnectionStatusInDB(config.organizationId, false);
    return false;
  } catch (error) {
    console.error(`[WhatsApp Monitor] ❌ Erro ao reconectar:`, error);
    await updateConnectionStatusInDB(config.organizationId, false);
    return false;
  }
}

/**
 * Atualizar status de conexão no banco de dados
 */
async function updateConnectionStatusInDB(organizationId: string, connected: boolean): Promise<void> {
  try {
    const client = getSupabaseClient();
    
    await client
      .from('organization_channel_config')
      .update({
        whatsapp_connected: connected,
        whatsapp_connection_status: connected ? 'connected' : 'disconnected',
        whatsapp_last_connected_at: connected ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    console.log(`[WhatsApp Monitor] 📝 Status atualizado no banco: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`);
  } catch (error) {
    console.error(`[WhatsApp Monitor] ❌ Erro ao atualizar status no banco:`, error);
  }
}

/**
 * Configurar webhooks automaticamente para manter conexão ativa
 * ✅ v1.0.103.960 - Configura automaticamente ao conectar
 * 
 * @export - Exportado para uso em outros módulos (routes-chat.ts)
 */
export async function setupWebhooks(config: MonitorConfig): Promise<boolean> {
  try {
    const projectRef = SUPABASE_PROJECT_REF || 'odcgnzfremrqnvtitpcc';
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/rendizy-server/whatsapp/webhook`;
    
    console.log(`[WhatsApp Monitor] 🔗 Configurando webhooks para: ${webhookUrl}`);

    const response = await fetch(
      `${normalizeBaseUrl(config.api_url)}/webhook/set/${config.instance_name}`,
      {
        method: 'POST',
        headers: {
          'apikey': config.api_key,
          'instanceToken': config.instance_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'MESSAGES_DELETE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
            'CONTACTS_SET',
            'CONTACTS_UPSERT',
            'CONTACTS_UPDATE',
            'GROUPS_UPSERT',
            'GROUPS_UPDATE',
            'GROUP_PARTICIPANTS_UPDATE',
            'PRESENCE_UPDATE',
            'CHATS_SET',
            'CHATS_UPSERT',
            'CHATS_UPDATE',
            'CHATS_DELETE',
          ],
        }),
      }
    );

    if (response.ok) {
      console.log(`[WhatsApp Monitor] ✅ Webhooks configurados com sucesso`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[WhatsApp Monitor] ⚠️ Erro ao configurar webhooks:`, errorText);
      return false;
    }
  } catch (error) {
    console.error(`[WhatsApp Monitor] ❌ Erro ao configurar webhooks:`, error);
    return false;
  }
}

/**
 * Monitor principal: verifica e mantém conexão estável
 * 
 * Esta função deve ser chamada periodicamente (ex: a cada 30 segundos)
 */
export async function monitorWhatsAppConnection(config: MonitorConfig): Promise<void> {
  try {
    console.log(`[WhatsApp Monitor] 🔍 Verificando conexão para org ${config.organizationId}...`);

    // Verificar status atual
    const status = await checkConnectionStatus(config);

    // Se desconectado, tentar reconectar
    if (status.status === 'DISCONNECTED' || status.status === 'ERROR') {
      console.log(`[WhatsApp Monitor] ⚠️ Conexão perdida (status: ${status.status})`);
      
      // Limitar tentativas de reconexão (máximo 3 tentativas por 5 minutos)
      const maxAttempts = 3;
      const reconnectWindow = 5 * 60 * 1000; // 5 minutos
      
      const cachedStatus = connectionStatusCache.get(config.organizationId);
      const lastAttempt = cachedStatus?.lastChecked || new Date(0);
      const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();

      if (status.reconnectAttempts < maxAttempts || timeSinceLastAttempt > reconnectWindow) {
        const reconnected = await attemptReconnect(config);
        
        if (!reconnected && status.reconnectAttempts < maxAttempts) {
          // Aguardar antes da próxima tentativa (backoff exponencial)
          const waitTime = Math.min(60000 * (2 ** status.reconnectAttempts), 300000); // Max 5 minutos
          console.log(`[WhatsApp Monitor] ⏳ Aguardando ${waitTime / 1000}s antes da próxima tentativa...`);
        }
      } else {
        console.log(`[WhatsApp Monitor] ⚠️ Limite de tentativas atingido. Aguardando...`);
      }
    } else if (status.status === 'CONNECTED') {
      // Se conectado, verificar se webhooks estão configurados
      console.log(`[WhatsApp Monitor] ✅ Conexão estável`);
      
      const cachedStatus = connectionStatusCache.get(config.organizationId);
      
      // Configurar webhooks se necessário (a cada 5 minutos)
      const lastWebhookCheck = cachedStatus?.lastWebhookCheck || new Date(0);
      const timeSinceLastWebhookCheck = Date.now() - lastWebhookCheck.getTime();
      
      if (timeSinceLastWebhookCheck > 5 * 60 * 1000) { // 5 minutos
        await setupWebhooks(config);
        status.lastWebhookCheck = new Date();
        connectionStatusCache.set(config.organizationId, status);
      }
      
      // Atualizar status no banco periodicamente (a cada minuto)
      const lastDBUpdate = cachedStatus?.lastDBUpdate || new Date(0);
      const timeSinceLastDBUpdate = Date.now() - lastDBUpdate.getTime();
      
      if (timeSinceLastDBUpdate > 60000) { // 1 minuto
        await updateConnectionStatusInDB(config.organizationId, true);
        status.lastDBUpdate = new Date();
        connectionStatusCache.set(config.organizationId, status);
      }
      
      // Enviar heartbeat para manter conexão ativa
      await heartbeat(config);
    }
  } catch (error) {
    console.error(`[WhatsApp Monitor] ❌ Erro no monitor:`, error);
  }
}

/**
 * Heartbeat: mantém conexão ativa enviando requisições periódicas
 */
export async function heartbeat(config: MonitorConfig): Promise<void> {
  try {
    // Enviar requisição simples para manter conexão ativa
    await fetch(
      `${normalizeBaseUrl(config.api_url)}/instance/connectionState/${config.instance_name}`,
      {
        method: 'GET',
        headers: {
          'apikey': config.api_key,
          'instanceToken': config.instance_token,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`[WhatsApp Monitor] 💓 Heartbeat enviado`);
  } catch (error) {
    console.error(`[WhatsApp Monitor] ❌ Erro no heartbeat:`, error);
  }
}

