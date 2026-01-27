// ============================================================================
// BREVO EMAIL PROVIDER - Cápsula de email via Brevo
// ============================================================================
// Provider: Brevo (ex-Sendinblue) (https://brevo.com)
// Canal: email
// Plano Free: 9.000 emails/mês, 300/dia
// ============================================================================

import { BaseProvider } from '../base-provider.ts';
import type { AnyNotificationPayload, SendResult, EmailPayload } from '../types.ts';
import { logInfo, logError } from '../../../utils.ts';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Provider de email usando Brevo
 */
export class BrevoEmailProvider extends BaseProvider {
  name = 'brevo';
  channel = 'email' as const;

  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    if (payload.channel !== 'email') {
      return this.errorResult('INVALID_CHANNEL', 'BrevoEmailProvider só aceita canal email');
    }

    const emailPayload = payload as EmailPayload;
    const recipient = Array.isArray(emailPayload.to) ? emailPayload.to[0] : emailPayload.to;
    
    this.logStart(recipient, payload);

    try {
      // Busca configuração
      const config = await this.getConfig(payload.organizationId);
      
      if (!config?.apiKey) {
        return this.errorResult('NOT_CONFIGURED', 'Brevo não configurado para esta organização');
      }

      // Monta destinatários no formato Brevo
      const toRecipients = Array.isArray(emailPayload.to) 
        ? emailPayload.to.map(email => ({ email }))
        : [{ email: emailPayload.to }];

      // Monta payload do Brevo
      const brevoPayload: any = {
        sender: {
          name: emailPayload.fromName || config.fromName || 'Rendizy',
          email: emailPayload.fromEmail || config.fromEmail || 'noreply@rendizy.com',
        },
        to: toRecipients,
        subject: emailPayload.subject,
        htmlContent: emailPayload.html,
        textContent: emailPayload.text,
      };

      // CC/BCC
      if (emailPayload.cc?.length) {
        brevoPayload.cc = emailPayload.cc.map(email => ({ email }));
      }
      if (emailPayload.bcc?.length) {
        brevoPayload.bcc = emailPayload.bcc.map(email => ({ email }));
      }

      // Reply-to
      if (emailPayload.replyTo) {
        brevoPayload.replyTo = { email: emailPayload.replyTo };
      }

      // Anexos
      if (emailPayload.attachments?.length) {
        brevoPayload.attachment = emailPayload.attachments.map(att => ({
          name: att.filename,
          content: att.content,
        }));
      }

      // Envia via API
      const response = await fetch(BREVO_API_URL, {
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
          data.message || 'Erro ao enviar email via Brevo',
          data
        );
      }

      // Sucesso - Brevo retorna messageId
      const messageId = data.messageId || `brevo_${Date.now()}`;
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
      return this.errorResult('SEND_ERROR', error.message || 'Erro ao enviar email');
    }
  }
}

// Singleton export
export const brevoEmailProvider = new BrevoEmailProvider();
