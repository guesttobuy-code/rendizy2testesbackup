// ============================================================================
// RESEND EMAIL PROVIDER - Cápsula de email via Resend
// ============================================================================
// Provider: Resend (https://resend.com)
// Canal: email
// Plano Free: 3.000 emails/mês, 100/dia
// ============================================================================

import { BaseProvider } from '../base-provider.ts';
import type { AnyNotificationPayload, SendResult, EmailPayload } from '../types.ts';
import { logInfo, logError } from '../../../utils.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Provider de email usando Resend
 */
export class ResendProvider extends BaseProvider {
  name = 'resend';
  channel = 'email' as const;

  async send(payload: AnyNotificationPayload): Promise<SendResult> {
    if (payload.channel !== 'email') {
      return this.errorResult('INVALID_CHANNEL', 'ResendProvider só aceita canal email');
    }

    const emailPayload = payload as EmailPayload;
    const recipient = Array.isArray(emailPayload.to) ? emailPayload.to[0] : emailPayload.to;
    
    this.logStart(recipient, payload);

    try {
      // Busca configuração
      const config = await this.getConfig(payload.organizationId);
      
      if (!config?.apiKey) {
        return this.errorResult('NOT_CONFIGURED', 'Resend não configurado para esta organização');
      }

      // Monta payload do Resend
      const resendPayload = {
        from: emailPayload.fromEmail 
          ? `${emailPayload.fromName || 'Rendizy'} <${emailPayload.fromEmail}>`
          : config.fromEmail || 'Rendizy <noreply@rendizy.com>',
        to: Array.isArray(emailPayload.to) ? emailPayload.to : [emailPayload.to],
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        cc: emailPayload.cc,
        bcc: emailPayload.bcc,
        reply_to: emailPayload.replyTo,
        attachments: emailPayload.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
        })),
      };

      // Envia via API
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logFailure(recipient, data);
        return this.errorResult(
          data.name || 'API_ERROR',
          data.message || 'Erro ao enviar email via Resend',
          data
        );
      }

      // Sucesso
      this.logSuccess(recipient, data.id);
      
      // Log no banco
      await this.logDelivery(
        payload.organizationId,
        recipient,
        this.successResult(data.id, data),
        payload.id
      );

      return this.successResult(data.id, data);

    } catch (error: any) {
      this.logFailure(recipient, error);
      return this.errorResult('SEND_ERROR', error.message || 'Erro ao enviar email');
    }
  }
}

// Singleton export
export const resendProvider = new ResendProvider();
