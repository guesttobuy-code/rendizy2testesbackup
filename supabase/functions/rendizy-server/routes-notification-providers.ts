// ============================================================================
// ROUTES: Notification Providers Configuration
// ============================================================================
// API para configurar providers de notificação (Resend, Brevo, etc.)
// ============================================================================

import { Context } from 'npm:hono@4';
import { getSupabaseClient } from './kv_store.tsx';
import { logInfo, logError } from './utils.ts';
import { successResponse, errorResponse } from './utils-response.ts';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { notificationDispatcher } from './services/notifications/dispatcher.ts';

// Validation error helper
function validationErrorResponse(message: string, fields?: Record<string, string>) {
  return { success: false, error: message, validationErrors: fields };
}

// ============================================================================
// TIPOS
// ============================================================================

interface ProviderConfigInput {
  provider: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  enabled: boolean;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  customConfig?: Record<string, any>;
}

// ============================================================================
// GET /notifications/providers - Lista providers configurados
// ============================================================================

export async function listNotificationProviders(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    // Busca settings da organização
    const { data, error } = await supabase
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      logError('[NotificationProviders] Erro ao buscar settings:', error);
      return c.json(errorResponse('Erro ao buscar configurações'), 500);
    }

    // Extrai configs de notificação
    const settings = data?.settings || {};
    const providers: Record<string, any> = {};

    // Filtra apenas configs de notification_*
    Object.entries(settings).forEach(([key, value]) => {
      if (key.startsWith('notification_')) {
        const shortKey = key.replace('notification_', '');
        providers[shortKey] = {
          ...(value as any),
          // Remove apiKey do retorno por segurança
          apiKey: (value as any)?.apiKey ? '***configured***' : undefined,
        };
      }
    });

    // Adiciona status de providers configurados
    const configuredProviders = await notificationDispatcher.getConfiguredProviders(organizationId);

    return c.json(successResponse({
      providers,
      configuredProviders,
    }));
  } catch (error: any) {
    logError('[NotificationProviders] Erro:', error);
    return c.json(errorResponse('Erro interno'), 500);
  }
}

// ============================================================================
// GET /notifications/providers/:channel - Busca config de um canal específico
// ============================================================================

export async function getProviderConfig(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const channel = c.req.param('channel');
    if (!channel) {
      return c.json(validationErrorResponse('Canal é obrigatório'), 400);
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return c.json(errorResponse('Erro ao buscar configurações'), 500);
    }

    const settings = data?.settings || {};
    
    // Busca todas as configs do canal
    const channelConfigs: Record<string, any> = {};
    Object.entries(settings).forEach(([key, value]) => {
      if (key.startsWith(`notification_${channel}_`)) {
        const provider = key.replace(`notification_${channel}_`, '');
        channelConfigs[provider] = {
          ...(value as any),
          apiKey: (value as any)?.apiKey ? '***configured***' : undefined,
        };
      }
    });

    return c.json(successResponse({
      channel,
      configs: channelConfigs,
    }));
  } catch (error: any) {
    logError('[NotificationProviders] Erro:', error);
    return c.json(errorResponse('Erro interno'), 500);
  }
}

// ============================================================================
// POST /notifications/providers - Salva config de um provider
// ============================================================================

export async function saveProviderConfig(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json() as ProviderConfigInput;

    // Validação
    if (!body.provider || !body.channel) {
      return c.json(validationErrorResponse('provider e channel são obrigatórios'), 400);
    }

    const supabase = getSupabaseClient();

    // Busca settings atuais
    const { data: existing } = await supabase
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .single();

    const currentSettings = existing?.settings || {};
    
    // Monta key do provider
    const providerKey = `notification_${body.channel}_${body.provider}`;

    // Atualiza apenas o provider específico
    const newSettings = {
      ...currentSettings,
      [providerKey]: {
        provider: body.provider,
        channel: body.channel,
        enabled: body.enabled,
        apiKey: body.apiKey,
        fromEmail: body.fromEmail,
        fromName: body.fromName,
        customConfig: body.customConfig,
        updatedAt: new Date().toISOString(),
      },
    };

    // Upsert
    const { error } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: organizationId,
        settings: newSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      });

    if (error) {
      logError('[NotificationProviders] Erro ao salvar:', error);
      return c.json(errorResponse('Erro ao salvar configuração'), 500);
    }

    logInfo('[NotificationProviders] Config salva', {
      organizationId,
      provider: body.provider,
      channel: body.channel,
      enabled: body.enabled,
    });

    return c.json(successResponse({
      message: 'Configuração salva com sucesso',
      provider: body.provider,
      channel: body.channel,
    }));
  } catch (error: any) {
    logError('[NotificationProviders] Erro:', error);
    return c.json(errorResponse('Erro interno'), 500);
  }
}

// ============================================================================
// DELETE /notifications/providers/:channel/:provider - Remove config
// ============================================================================

export async function deleteProviderConfig(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const channel = c.req.param('channel');
    const provider = c.req.param('provider');

    if (!channel || !provider) {
      return c.json(validationErrorResponse('channel e provider são obrigatórios'), 400);
    }

    const supabase = getSupabaseClient();

    // Busca settings atuais
    const { data: existing } = await supabase
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .single();

    if (!existing?.settings) {
      return c.json(errorResponse('Configuração não encontrada'), 404);
    }

    const currentSettings = { ...existing.settings };
    const providerKey = `notification_${channel}_${provider}`;

    // Remove o provider
    delete currentSettings[providerKey];

    // Atualiza
    const { error } = await supabase
      .from('organization_settings')
      .update({
        settings: currentSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    if (error) {
      logError('[NotificationProviders] Erro ao deletar:', error);
      return c.json(errorResponse('Erro ao remover configuração'), 500);
    }

    logInfo('[NotificationProviders] Config removida', {
      organizationId,
      provider,
      channel,
    });

    return c.json(successResponse({
      message: 'Configuração removida com sucesso',
    }));
  } catch (error: any) {
    logError('[NotificationProviders] Erro:', error);
    return c.json(errorResponse('Erro interno'), 500);
  }
}

// ============================================================================
// POST /notifications/providers/test - Testa envio de notificação
// ============================================================================

export async function testProviderSend(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json();
    const { channel, recipient, message } = body;

    if (!channel || !recipient) {
      return c.json(validationErrorResponse('channel e recipient são obrigatórios'), 400);
    }

    let result;
    const testMessage = message || 'Esta é uma mensagem de teste do Rendizy 🎉';

    switch (channel) {
      case 'email':
        const { sendEmail } = await import('./services/notifications/dispatcher.ts');
        result = await sendEmail(
          organizationId,
          recipient,
          'Teste de Email - Rendizy',
          `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🎉 Teste de Email</h2>
            <p>${testMessage}</p>
            <p style="color: #666; font-size: 12px;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>`
        );
        break;

      case 'sms':
        const { sendSms } = await import('./services/notifications/dispatcher.ts');
        result = await sendSms(organizationId, recipient, testMessage);
        break;

      case 'whatsapp':
        const { sendWhatsApp } = await import('./services/notifications/dispatcher.ts');
        result = await sendWhatsApp(organizationId, recipient, testMessage);
        break;

      case 'in_app':
        const { sendInApp } = await import('./services/notifications/dispatcher.ts');
        result = await sendInApp(
          organizationId,
          'Teste de Notificação',
          testMessage,
          { type: 'success' }
        );
        break;

      default:
        return c.json(validationErrorResponse(`Canal inválido: ${channel}`), 400);
    }

    return c.json(successResponse({
      message: result.success ? 'Teste enviado com sucesso!' : 'Falha no envio',
      result,
    }));
  } catch (error: any) {
    logError('[NotificationProviders] Erro no teste:', error);
    return c.json(errorResponse('Erro ao testar envio'), 500);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  listNotificationProviders,
  getProviderConfig,
  saveProviderConfig,
  deleteProviderConfig,
  testProviderSend,
};
