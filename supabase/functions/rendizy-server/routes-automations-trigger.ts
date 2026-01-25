/**
 * RENDIZY - Rotas de Execução de Automações
 * 
 * Endpoints para disparar e gerenciar execuções de automações.
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

import type { Context } from 'npm:hono';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { successResponse, errorResponse, validationErrorResponse, logInfo, logError } from './utils.ts';
import { processAutomationTrigger, triggerAutomationEvent } from './automation-engine.ts';

// ============================================================================
// POST /automations/trigger - Disparar automação manualmente
// ============================================================================
export async function triggerAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json();

    if (!body.eventType) {
      return c.json(validationErrorResponse('eventType é obrigatório'), 400);
    }

    logInfo(`[AutomationTrigger] Disparando evento manual: ${body.eventType}`, {
      organizationId,
      payloadKeys: Object.keys(body.payload || {}),
    });

    const results = await triggerAutomationEvent(
      body.eventType,
      organizationId,
      body.payload || {}
    );

    const summary = {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalActionsExecuted: results.reduce((sum, r) => sum + r.actionsExecuted, 0),
    };

    logInfo(`[AutomationTrigger] Resultado:`, summary);

    return c.json(successResponse({
      message: 'Evento processado',
      summary,
      results,
    }));
  } catch (error: any) {
    logError('[AutomationTrigger] Erro ao disparar automação:', error);
    return c.json(errorResponse('Erro ao disparar automação', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /automations/trigger/message - Disparar automação de mensagem
// ============================================================================
export async function triggerMessageAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json();

    // Validar campos obrigatórios
    if (!body.contactId && !body.phone) {
      return c.json(validationErrorResponse('contactId ou phone é obrigatório'), 400);
    }

    const payload = {
      contactId: body.contactId,
      contactName: body.contactName || 'Desconhecido',
      phone: body.phone,
      message: body.message || '',
      messageType: body.messageType || 'text',
      channel: body.channel || 'whatsapp',
      isFromMe: body.isFromMe || false,
      timestamp: body.timestamp || new Date().toISOString(),
      // Metadados extras
      conversationId: body.conversationId,
      instanceName: body.instanceName,
    };

    logInfo(`[AutomationTrigger] Mensagem recebida de ${payload.contactName}`, {
      organizationId,
      phone: payload.phone,
      messagePreview: payload.message?.substring(0, 50),
    });

    const results = await triggerAutomationEvent(
      'message_received',
      organizationId,
      payload
    );

    return c.json(successResponse({
      message: 'Evento de mensagem processado',
      automationsTriggered: results.length,
      results,
    }));
  } catch (error: any) {
    logError('[AutomationTrigger] Erro ao processar mensagem:', error);
    return c.json(errorResponse('Erro ao processar mensagem', { details: error?.message }), 500);
  }
}

// ============================================================================
// POST /automations/trigger/reservation - Disparar automação de reserva
// ============================================================================
export async function triggerReservationAutomation(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const body = await c.req.json();

    // eventType pode ser: reservation_created, reservation_confirmed, reservation_cancelled
    const eventType = body.eventType || 'reservation_created';

    const payload = {
      reservationId: body.reservationId,
      reservationCode: body.reservationCode,
      guestId: body.guestId,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      guestEmail: body.guestEmail,
      propertyId: body.propertyId,
      propertyName: body.propertyName,
      checkInDate: body.checkInDate,
      checkOutDate: body.checkOutDate,
      totalValue: body.totalValue,
      status: body.status,
      source: body.source, // airbnb, booking, direct, etc.
    };

    logInfo(`[AutomationTrigger] Evento de reserva: ${eventType}`, {
      organizationId,
      reservationCode: payload.reservationCode,
    });

    const results = await triggerAutomationEvent(
      eventType,
      organizationId,
      payload
    );

    return c.json(successResponse({
      message: `Evento ${eventType} processado`,
      automationsTriggered: results.length,
      results,
    }));
  } catch (error: any) {
    logError('[AutomationTrigger] Erro ao processar reserva:', error);
    return c.json(errorResponse('Erro ao processar reserva', { details: error?.message }), 500);
  }
}

// ============================================================================
// GET /automations/test-trigger - Testar trigger (desenvolvimento)
// ============================================================================
export async function testTrigger(c: Context) {
  try {
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      return c.json(errorResponse('Organização não identificada'), 401);
    }

    const eventType = c.req.query('eventType') || 'message_received';
    
    // Payload de teste
    const testPayload = {
      contactId: 'test-contact-123',
      contactName: 'Teste Automação',
      phone: '+5521999999999',
      message: 'Esta é uma mensagem de teste para verificar se a automação está funcionando!',
      messageType: 'text',
      channel: 'whatsapp',
      isFromMe: false,
      timestamp: new Date().toISOString(),
    };

    logInfo(`[AutomationTrigger] 🧪 Teste de trigger: ${eventType}`, { organizationId });

    const results = await triggerAutomationEvent(
      eventType,
      organizationId,
      testPayload
    );

    return c.json(successResponse({
      message: '🧪 Teste de automação executado',
      testPayload,
      automationsTriggered: results.length,
      results,
    }));
  } catch (error: any) {
    logError('[AutomationTrigger] Erro no teste:', error);
    return c.json(errorResponse('Erro no teste', { details: error?.message }), 500);
  }
}

export default {
  triggerAutomation,
  triggerMessageAutomation,
  triggerReservationAutomation,
  testTrigger,
};
