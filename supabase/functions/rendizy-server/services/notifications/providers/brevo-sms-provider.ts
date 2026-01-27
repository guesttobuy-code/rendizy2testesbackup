// ============================================================================
// BREVO SMS PROVIDER - Cápsula de SMS via Brevo
// ============================================================================
// Provider: Brevo (ex-Sendinblue) (https://brevo.com)
// Canal: sms
// Preço: ~R$0,05-0,15 por SMS no Brasil (pré-pago)
// ============================================================================

import { BaseProvider } from '../base-provider.ts';
import type { AnyNotificationPayload, SendResult, SmsPayload } from '../types.ts';
import { logInfo, logError } from '../../../utils.ts';

const BREVO_SMS_API_URL = 'https://api.brevo.com/v3/transactionalSMS/sms';

/**
 * Provider de SMS usando Brevo
 */
export class BrevoSmsProvider extends BaseProvider {
  name = 'brevo_sms';
  channel = 'sms' as const;

  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    if (payload.channel !== 'sms') {
      return this.errorResult('INVALID_CHANNEL', 'BrevoSmsProvider só aceita canal sms');
    }

    const smsPayload = payload as SmsPayload;
    const recipient = smsPayload.to;
    
    this.logStart(recipient, payload);

    try {
      // Busca configuração
      const config = await this.getConfig(payload.organizationId);
      
      if (!config?.apiKey) {
        return this.errorResult('NOT_CONFIGURED', 'Brevo SMS não configurado para esta organização');
      }

      // Formata número (Brevo espera formato internacional sem +)
      const formattedPhone = recipient.replace(/^\+/, '');

      // Monta payload do Brevo
      const brevoPayload = {
        type: 'transactional',
        sender: smsPayload.sender || config.customConfig?.smsSender || 'Rendizy',
        recipient: formattedPhone,
        content: smsPayload.message,
        // Opcional: tag para analytics
        tag: payload.metadata?.tag || 'rendizy',
      };

      // Envia via API
      const response = await fetch(BREVO_SMS_API_URL, {
        method: 'POST',
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(brevoPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logFailure(recipient, data);
        return this.errorResult(
          data.code || 'API_ERROR',
          data.message || 'Erro ao enviar SMS via Brevo',
          data
        );
      }

      // Sucesso - Brevo retorna reference
      const messageId = data.reference || `brevo_sms_${Date.now()}`;
      this.logSuccess(recipient, messageId);
      
      // Log no banco
      await this.logDelivery(
        payload.organizationId,
        recipient,
        this.successResult(messageId, data),
        payload.id
      );

      return this.successResult(messageId, {
        ...data,
        creditsUsed: data.creditsRemaining ? 1 : undefined,
      });

    } catch (error: any) {
      this.logFailure(recipient, error);
      return this.errorResult('SEND_ERROR', error.message || 'Erro ao enviar SMS');
    }
  }

  /**
   * Verifica créditos SMS disponíveis
   */
  async checkCredits(organizationId: string): Promise<{ remaining: number; used: number } | null> {
    try {
      const config = await this.getConfig(organizationId);
      if (!config?.apiKey) return null;

      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': config.apiKey,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      return {
        remaining: data.plan?.[0]?.creditsRemaining || 0,
        used: data.plan?.[0]?.creditsUsed || 0,
      };
    } catch {
      return null;
    }
  }
}

// Singleton export
export const brevoSmsProvider = new BrevoSmsProvider();
