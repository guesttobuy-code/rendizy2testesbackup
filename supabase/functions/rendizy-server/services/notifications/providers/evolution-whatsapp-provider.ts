// ============================================================================
// EVOLUTION WHATSAPP PROVIDER - Cápsula de WhatsApp via Evolution API
// ============================================================================
// Provider: Evolution API (self-hosted)
// Canal: whatsapp
// Preço: Gratuito (self-hosted) / Custo do servidor
// ============================================================================

import { BaseProvider } from '../base-provider.ts';
import type { AnyNotificationPayload, SendResult, WhatsAppPayload } from '../types.ts';
import { logInfo, logError } from '../../../utils.ts';

/**
 * Provider de WhatsApp usando Evolution API
 */
export class EvolutionWhatsAppProvider extends BaseProvider {
  name = 'evolution';
  channel = 'whatsapp' as const;

  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    if (payload.channel !== 'whatsapp') {
      return this.errorResult('INVALID_CHANNEL', 'EvolutionWhatsAppProvider só aceita canal whatsapp');
    }

    const whatsappPayload = payload as WhatsAppPayload;
    const recipient = whatsappPayload.to;
    
    this.logStart(recipient, payload);

    try {
      // Busca configuração
      const config = await this.getConfig(payload.organizationId);
      
      if (!config?.apiKey || !config?.customConfig?.serverUrl) {
        return this.errorResult('NOT_CONFIGURED', 'Evolution API não configurada para esta organização');
      }

      const serverUrl = config.customConfig.serverUrl;
      const instanceName = whatsappPayload.instanceName || config.customConfig.instanceName;

      if (!instanceName) {
        return this.errorResult('NO_INSTANCE', 'Instance name não especificado');
      }

      // Formata número (Evolution espera formato com @s.whatsapp.net)
      const formattedNumber = this.formatPhoneNumber(recipient);

      // Determina tipo de mensagem
      let endpoint: string;
      let messagePayload: any;

      if (whatsappPayload.mediaUrl) {
        // Mensagem com mídia
        endpoint = `${serverUrl}/message/sendMedia/${instanceName}`;
        messagePayload = {
          number: formattedNumber,
          mediatype: whatsappPayload.mediaType || 'image',
          media: whatsappPayload.mediaUrl,
          caption: whatsappPayload.message,
        };
      } else {
        // Mensagem de texto simples
        endpoint = `${serverUrl}/message/sendText/${instanceName}`;
        messagePayload = {
          number: formattedNumber,
          text: whatsappPayload.message,
        };
      }

      // Envia via API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        this.logFailure(recipient, data);
        return this.errorResult(
          data.error?.code || 'API_ERROR',
          data.error?.message || data.message || 'Erro ao enviar WhatsApp via Evolution',
          data
        );
      }

      // Sucesso
      const messageId = data.key?.id || data.messageId || `evolution_${Date.now()}`;
      this.logSuccess(recipient, messageId);
      
      // Log no banco
      await this.logDelivery(
        payload.organizationId,
        recipient,
        this.successResult(messageId, data),
        payload.id
      );

      return this.successResult(messageId, data);

    } catch (error: any) {
      this.logFailure(recipient, error);
      return this.errorResult('SEND_ERROR', error.message || 'Erro ao enviar WhatsApp');
    }
  }

  /**
   * Formata número de telefone para o formato Evolution
   */
  private formatPhoneNumber(phone: string): string {
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Se não tem código do país, assume Brasil
    if (cleaned.length === 11) {
      cleaned = '55' + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Verifica status da instância
   */
  async checkInstanceStatus(organizationId: string): Promise<{
    connected: boolean;
    state: string;
  } | null> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config?.apiKey || !config?.customConfig?.serverUrl) return null;

      const serverUrl = config.customConfig.serverUrl;
      const instanceName = config.customConfig.instanceName;

      const response = await fetch(`${serverUrl}/instance/connectionState/${instanceName}`, {
        headers: {
          'apikey': config.apiKey,
        },
      });

      const data = await response.json();
      
      return {
        connected: data.state === 'open',
        state: data.state,
      };
    } catch {
      return null;
    }
  }
}

// Singleton export
export const evolutionWhatsAppProvider = new EvolutionWhatsAppProvider();
