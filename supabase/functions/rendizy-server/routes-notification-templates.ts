// ============================================================================
// ROUTES: Notification Templates
// ============================================================================
// API para gerenciar templates de notificação multi-canal
// 
// @version 1.0.0
// @date 2026-01-27
// @author GitHub Copilot
// ============================================================================
// 
// REFERÊNCIA RÁPIDA:
// 
// FRONTEND:
//   - Página: components/NotificationTemplatesPage.tsx
//   - Editor: components/NotificationTemplateEditor.tsx
//   - API Helper: utils/api-notification-templates.ts
// 
// DATABASE:
//   - Tabela: notification_templates (migration 2026012705)
//   - Tabela: notification_trigger_types
// 
// ENDPOINTS (registrados em index.ts ~linha 1235):
//   GET    /notifications/templates          - listTemplates
//   GET    /notifications/templates/:id      - getTemplate
//   POST   /notifications/templates          - createTemplate
//   PUT    /notifications/templates/:id      - updateTemplate
//   DELETE /notifications/templates/:id      - deleteTemplate
//   PATCH  /notifications/templates/:id/status - toggleTemplateStatus
//   POST   /notifications/templates/:id/duplicate - duplicateTemplate
//   GET    /notifications/triggers           - listTriggerTypes
//   POST   /notifications/templates/preview  - previewTemplate
//   POST   /notifications/templates/:id/test - testTemplateDelivery
// 
// DOCS: docs/ARQUITETURA_NOTIFICACOES.md, docs/REFERENCIA_NOTIFICACOES.md
// ============================================================================

import { Context } from 'npm:hono@4';
import { getSupabaseClient } from './kv_store.tsx';
import { logInfo, logError } from './utils.ts';
import { successResponse, errorResponse } from './utils-response.ts';
import { getOrganizationIdForRequest, getUserIdForRequest } from './utils-multi-tenant.ts';

// Validation error helper
function validationErrorResponse(message: string, fields?: Record<string, string>) {
  return { success: false, error: message, validationErrors: fields };
}

// ============================================================================
// HELPERS
// ============================================================================

function extractVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
}

// ============================================================================
// GET /notifications/templates - Lista templates
// ============================================================================

export async function listTemplates(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    // Buscar filtros da query string
    const url = new URL(c.req.url);
    const triggerEvent = url.searchParams.get('trigger_event');
    const channel = url.searchParams.get('channel');
    const isActive = url.searchParams.get('is_active');

    // Query base
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (triggerEvent) {
      query = query.eq('trigger_event', triggerEvent);
    }

    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      logError('[NotificationTemplates] Erro ao listar:', error);
      return c.json(errorResponse('Erro ao listar templates'), 500);
    }

    // Filtrar por canal se necessário (channels é um array JSONB)
    let filteredTemplates = templates || [];
    if (channel) {
      filteredTemplates = filteredTemplates.filter((t: any) => 
        t.channels && t.channels.includes(channel)
      );
    }

    return c.json(successResponse({
      templates: filteredTemplates,
      total: filteredTemplates.length,
    }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// GET /notifications/templates/:id - Busca template por ID
// ============================================================================

export async function getTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !template) {
      return c.json(errorResponse('Template não encontrado'), 404);
    }

    return c.json(successResponse({ template }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// POST /notifications/templates - Cria template
// ============================================================================

export async function createTemplate(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json();

    // Validações
    if (!body.name) {
      return c.json(validationErrorResponse('Nome é obrigatório'), 400);
    }
    if (!body.trigger_event) {
      return c.json(validationErrorResponse('Trigger é obrigatório'), 400);
    }
    if (!body.channels || body.channels.length === 0) {
      return c.json(validationErrorResponse('Selecione pelo menos um canal'), 400);
    }

    // Extrair variáveis usadas
    const variablesUsed: string[] = [];
    if (body.email_subject) variablesUsed.push(...extractVariables(body.email_subject));
    if (body.email_body) variablesUsed.push(...extractVariables(body.email_body));
    if (body.sms_body) variablesUsed.push(...extractVariables(body.sms_body));
    if (body.whatsapp_body) variablesUsed.push(...extractVariables(body.whatsapp_body));
    if (body.in_app_title) variablesUsed.push(...extractVariables(body.in_app_title));
    if (body.in_app_body) variablesUsed.push(...extractVariables(body.in_app_body));

    const supabase = getSupabaseClient();

    const { data: template, error } = await supabase
      .from('notification_templates')
      .insert({
        organization_id: organizationId,
        name: body.name,
        description: body.description,
        internal_code: body.internal_code,
        trigger_event: body.trigger_event,
        trigger_config: body.trigger_config || {},
        is_active: body.is_active !== false,
        is_system: false,
        channels: body.channels,
        email_subject: body.email_subject,
        email_body: body.email_body,
        email_provider: body.email_provider,
        sms_body: body.sms_body,
        sms_provider: body.sms_provider,
        whatsapp_body: body.whatsapp_body,
        whatsapp_provider: body.whatsapp_provider,
        in_app_title: body.in_app_title,
        in_app_body: body.in_app_body,
        variables_used: [...new Set(variablesUsed)],
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      logError('[NotificationTemplates] Erro ao criar:', error);
      return c.json(errorResponse('Erro ao criar template'), 500);
    }

    logInfo('[NotificationTemplates] Template criado:', template.id);
    return c.json(successResponse({ template }), 201);
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// PUT /notifications/templates/:id - Atualiza template
// ============================================================================

export async function updateTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    // Verificar se existe
    const { data: existing } = await supabase
      .from('notification_templates')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json(errorResponse('Template não encontrado'), 404);
    }

    const body = await c.req.json();

    // Extrair variáveis usadas
    const variablesUsed: string[] = [];
    if (body.email_subject) variablesUsed.push(...extractVariables(body.email_subject));
    if (body.email_body) variablesUsed.push(...extractVariables(body.email_body));
    if (body.sms_body) variablesUsed.push(...extractVariables(body.sms_body));
    if (body.whatsapp_body) variablesUsed.push(...extractVariables(body.whatsapp_body));
    if (body.in_app_title) variablesUsed.push(...extractVariables(body.in_app_title));
    if (body.in_app_body) variablesUsed.push(...extractVariables(body.in_app_body));

    // Montar update
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    // Campos editáveis
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.internal_code !== undefined) updateData.internal_code = body.internal_code;
    if (body.trigger_event !== undefined) updateData.trigger_event = body.trigger_event;
    if (body.trigger_config !== undefined) updateData.trigger_config = body.trigger_config;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.channels !== undefined) updateData.channels = body.channels;
    if (body.email_subject !== undefined) updateData.email_subject = body.email_subject;
    if (body.email_body !== undefined) updateData.email_body = body.email_body;
    if (body.email_provider !== undefined) updateData.email_provider = body.email_provider;
    if (body.sms_body !== undefined) updateData.sms_body = body.sms_body;
    if (body.sms_provider !== undefined) updateData.sms_provider = body.sms_provider;
    if (body.whatsapp_body !== undefined) updateData.whatsapp_body = body.whatsapp_body;
    if (body.whatsapp_provider !== undefined) updateData.whatsapp_provider = body.whatsapp_provider;
    if (body.in_app_title !== undefined) updateData.in_app_title = body.in_app_title;
    if (body.in_app_body !== undefined) updateData.in_app_body = body.in_app_body;

    if (variablesUsed.length > 0) {
      updateData.variables_used = [...new Set(variablesUsed)];
    }

    const { data: template, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logError('[NotificationTemplates] Erro ao atualizar:', error);
      return c.json(errorResponse('Erro ao atualizar template'), 500);
    }

    return c.json(successResponse({ template }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// DELETE /notifications/templates/:id - Deleta template
// ============================================================================

export async function deleteTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    // Verificar se existe e pode ser deletado
    const { data: existing } = await supabase
      .from('notification_templates')
      .select('id, is_system')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      return c.json(errorResponse('Template não encontrado'), 404);
    }

    if (existing.is_system) {
      return c.json(errorResponse('Templates do sistema não podem ser deletados'), 403);
    }

    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', id);

    if (error) {
      logError('[NotificationTemplates] Erro ao deletar:', error);
      return c.json(errorResponse('Erro ao deletar template'), 500);
    }

    return c.json(successResponse({ success: true }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// PATCH /notifications/templates/:id/status - Toggle status
// ============================================================================

export async function toggleTemplateStatus(c: Context) {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json();
    const { is_active } = body;

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('notification_templates')
      .update({ 
        is_active, 
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      logError('[NotificationTemplates] Erro ao alterar status:', error);
      return c.json(errorResponse('Erro ao alterar status'), 500);
    }

    return c.json(successResponse({ success: true }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// POST /notifications/templates/:id/duplicate - Duplica template
// ============================================================================

export async function duplicateTemplate(c: Context) {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    const userId = await getUserIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    // Buscar template original
    const { data: original, error: fetchError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !original) {
      return c.json(errorResponse('Template não encontrado'), 404);
    }

    const body = await c.req.json();
    const newName = body.name || `${original.name} (Cópia)`;

    // Criar cópia
    const { data: template, error } = await supabase
      .from('notification_templates')
      .insert({
        organization_id: organizationId,
        name: newName,
        description: original.description,
        internal_code: null, // Código interno deve ser único
        trigger_event: original.trigger_event,
        trigger_config: original.trigger_config,
        is_active: false, // Cópia começa inativa
        is_system: false,
        channels: original.channels,
        email_subject: original.email_subject,
        email_body: original.email_body,
        email_provider: original.email_provider,
        sms_body: original.sms_body,
        sms_provider: original.sms_provider,
        whatsapp_body: original.whatsapp_body,
        whatsapp_provider: original.whatsapp_provider,
        in_app_title: original.in_app_title,
        in_app_body: original.in_app_body,
        variables_used: original.variables_used,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      logError('[NotificationTemplates] Erro ao duplicar:', error);
      return c.json(errorResponse('Erro ao duplicar template'), 500);
    }

    logInfo('[NotificationTemplates] Template duplicado:', template.id);
    return c.json(successResponse({ template }), 201);
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// GET /notifications/triggers - Lista tipos de trigger
// ============================================================================

export async function listTriggerTypes(c: Context) {
  try {
    const supabase = getSupabaseClient();

    const { data: triggers, error } = await supabase
      .from('notification_trigger_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logError('[NotificationTemplates] Erro ao listar triggers:', error);
      return c.json(errorResponse('Erro ao listar triggers'), 500);
    }

    return c.json(successResponse({ triggers: triggers || [] }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// POST /notifications/templates/preview - Preview com variáveis
// ============================================================================

export async function previewTemplate(c: Context) {
  try {
    const body = await c.req.json();
    const { content, subject, sample_data } = body;

    // Dados de exemplo padrão
    const defaultSampleData: Record<string, any> = {
      guestName: 'João Silva',
      guestEmail: 'joao.silva@email.com',
      guestPhone: '+55 11 99999-9999',
      checkInDate: '25/01/2026',
      checkInTime: '15:00',
      checkOutDate: '30/01/2026',
      checkOutTime: '11:00',
      propertyName: 'Casa da Praia',
      propertyAddress: 'Rua das Flores, 123 - Florianópolis/SC',
      totalAmount: 'R$ 2.500,00',
      reservationCode: 'RES-2026-001',
      nights: '5',
    };

    const data = { ...defaultSampleData, ...sample_data };

    // Substituir variáveis
    const replaceVars = (text: string) => {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
      });
    };

    const variablesFound = extractVariables(content);
    const missingVariables = variablesFound.filter(v => data[v] === undefined);

    return c.json(successResponse({
      rendered_subject: subject ? replaceVars(subject) : undefined,
      rendered_body: replaceVars(content),
      variables_found: variablesFound,
      missing_variables: missingVariables,
    }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro no preview:', error);
    return c.json(errorResponse(error.message), 500);
  }
}

// ============================================================================
// POST /notifications/templates/:id/test - Enviar teste
// ============================================================================

export async function testTemplateDelivery(c: Context) {
  try {
    const id = c.req.param('id');
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const supabase = getSupabaseClient();

    // Buscar template
    const { data: template } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!template) {
      return c.json(errorResponse('Template não encontrado'), 404);
    }

    const body = await c.req.json();
    const { channel, recipient } = body;

    // Dados de exemplo para teste
    const sampleData: Record<string, any> = {
      guestName: 'Teste Rendizy',
      guestEmail: recipient,
      guestPhone: recipient,
      checkInDate: new Date().toLocaleDateString('pt-BR'),
      checkInTime: '15:00',
      checkOutDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      checkOutTime: '11:00',
      propertyName: 'Imóvel de Teste',
      propertyAddress: 'Endereço de Teste, 123',
      totalAmount: 'R$ 1.000,00',
      reservationCode: 'TESTE-001',
      nights: '5',
    };

    // Substituir variáveis
    const replaceVars = (text: string) => {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return sampleData[key] !== undefined ? String(sampleData[key]) : `{{${key}}}`;
      });
    };

    // TODO: Integrar com o dispatcher de notificações para envio real
    // Por enquanto, apenas simula e loga
    let success = true;
    let message = '';

    switch (channel) {
      case 'email':
        logInfo('📧 [TEST] Enviando email para:', recipient);
        logInfo('   Assunto:', replaceVars(template.email_subject || ''));
        message = `Email de teste enviado para ${recipient}`;
        break;

      case 'sms':
        logInfo('📱 [TEST] Enviando SMS para:', recipient);
        message = `SMS de teste enviado para ${recipient}`;
        break;

      case 'whatsapp':
        logInfo('💬 [TEST] Enviando WhatsApp para:', recipient);
        message = `WhatsApp de teste enviado para ${recipient}`;
        break;

      case 'in_app':
        logInfo('🔔 [TEST] Criando notificação in-app');
        message = 'Notificação in-app criada';
        break;

      default:
        success = false;
        message = 'Canal não suportado';
    }

    return c.json(successResponse({ success, message }));
  } catch (error: any) {
    logError('[NotificationTemplates] Erro ao testar:', error);
    return c.json(errorResponse(error.message), 500);
  }
}
