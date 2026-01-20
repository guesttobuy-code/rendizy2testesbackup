/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  📊 ROTAS DE RECONCILIAÇÃO DE RESERVAS — v1.0.112                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Endpoints para reconciliação entre fontes externas e Rendizy.               ║
 * ║                                                                              ║
 * ║  📚 DOCUMENTAÇÃO:                                                            ║
 * ║  - docs/ADR_RESERVATION_RECONCILIATION.md                                    ║
 * ║                                                                              ║
 * ║  🚀 ENDPOINTS:                                                               ║
 * ║  POST /reconciliation/reservations/:organizationId    - Reconcilia reservas  ║
 * ║  GET  /reconciliation/missing/:organizationId         - Lista faltantes      ║
 * ║  POST /reconciliation/validate/:organizationId        - Valida uma reserva   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Context } from 'npm:hono';
import { successResponse, errorResponse, logError } from './utils.ts';
import {
  reconcileReservations,
  findMissingReservationsFromSource,
  validateReservationExistsInSource,
} from './utils-reservation-reconciliation.ts';

/**
 * POST /reconciliation/reservations/:organizationId
 * 
 * Executa reconciliação de reservas entre fonte e Rendizy.
 * 
 * Query params:
 * - limit: número máximo de reservas a processar (default: 100, max: 500)
 * - autoCancelOrphans: se true, cancela reservas órfãs automaticamente (default: true)
 * - checkInFrom: data inicial de check-in (YYYY-MM-DD)
 * - checkInTo: data final de check-in (YYYY-MM-DD)
 * 
 * Retorna:
 * - stats: estatísticas da reconciliação
 * - orphanReservations: lista de reservas órfãs detectadas
 * - errors: erros encontrados durante o processo
 */
export async function handleReconcileReservations(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const limit = Math.min(Number(c.req.query('limit') || 100), 500);
    const autoCancelOrphans = c.req.query('autoCancelOrphans') !== 'false';
    const checkInFrom = c.req.query('checkInFrom') || undefined;
    const checkInTo = c.req.query('checkInTo') || undefined;

    console.log(`[Reconciliation] Starting for org=${organizationId}, limit=${limit}, autoCancelOrphans=${autoCancelOrphans}`);

    const result = await reconcileReservations(organizationId, {
      limit,
      autoCancelOrphans,
      checkInFrom,
      checkInTo,
    });

    console.log(`[Reconciliation] Completed: ${JSON.stringify(result.stats)}`);

    if (!result.success) {
      return c.json(errorResponse('Reconciliation failed', { errors: result.errors, stats: result.stats }), 500);
    }

    return c.json(successResponse({
      message: 'Reconciliation completed',
      stats: result.stats,
      orphanReservations: result.orphanReservations,
      errors: result.errors,
    }));
  } catch (error: any) {
    logError('Error in reconciliation', error);
    return c.json(errorResponse('Reconciliation failed', { details: error?.message }), 500);
  }
}

/**
 * GET /reconciliation/missing/:organizationId
 * 
 * Lista reservas que existem na fonte mas NÃO existem no Rendizy.
 * Útil para detectar reservas que falharam no webhook.
 * 
 * Query params:
 * - checkInFrom: data inicial de check-in (YYYY-MM-DD) - OBRIGATÓRIO
 * - checkInTo: data final de check-in (YYYY-MM-DD) - OBRIGATÓRIO
 */
export async function handleFindMissingReservations(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const checkInFrom = c.req.query('checkInFrom');
    const checkInTo = c.req.query('checkInTo');

    if (!checkInFrom || !checkInTo) {
      return c.json(errorResponse('checkInFrom and checkInTo are required'), 400);
    }

    console.log(`[Reconciliation] Finding missing reservations for org=${organizationId}, from=${checkInFrom}, to=${checkInTo}`);

    const result = await findMissingReservationsFromSource(organizationId, checkInFrom, checkInTo);

    if (!result.success) {
      return c.json(errorResponse('Failed to find missing reservations', { details: result.error }), 500);
    }

    return c.json(successResponse({
      message: `Found ${result.missing.length} reservations in source that are missing in Rendizy`,
      count: result.missing.length,
      missing: result.missing,
    }));
  } catch (error: any) {
    logError('Error finding missing reservations', error);
    return c.json(errorResponse('Failed to find missing reservations', { details: error?.message }), 500);
  }
}

/**
 * POST /reconciliation/validate/:organizationId
 * 
 * Valida se uma reserva específica existe na fonte.
 * 
 * Body:
 * - external_id: ID externo da reserva (obrigatório)
 * - platform: plataforma (default: staysnet)
 */
export async function handleValidateReservation(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const externalId = body.external_id || body.externalId;
    const platform = body.platform || 'staysnet';

    if (!externalId) {
      return c.json(errorResponse('external_id is required'), 400);
    }

    console.log(`[Reconciliation] Validating reservation ${externalId} for org=${organizationId}`);

    const result = await validateReservationExistsInSource(organizationId, externalId, platform);

    return c.json(successResponse({
      external_id: externalId,
      platform,
      validation: result,
    }));
  } catch (error: any) {
    logError('Error validating reservation', error);
    return c.json(errorResponse('Validation failed', { details: error?.message }), 500);
  }
}

/**
 * GET /reconciliation/health/:organizationId
 * 
 * Retorna métricas de saúde das reservas (para dashboard).
 * 
 * Verifica:
 * - Total de reservas ativas
 * - Reservas sem property_id (órfãs estruturais)
 * - Reservas com check-in hoje que precisam validação
 * - Import issues pendentes
 */
export async function handleReconciliationHealth(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const { getSupabaseClient } = await import('./kv_store.tsx');
    const supabase = getSupabaseClient();

    const today = new Date().toISOString().split('T')[0];

    // Parallel queries
    const [
      activeRes,
      orphanRes,
      todayRes,
      issuesRes,
    ] = await Promise.all([
      // Total de reservas ativas
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['confirmed', 'pending', 'checked_in']),
      
      // Reservas sem property_id
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('property_id', null),
      
      // Reservas com check-in hoje
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('check_in', today)
        .in('status', ['confirmed', 'pending']),
      
      // Import issues pendentes
      supabase
        .from('staysnet_import_issues')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'open'),
    ]);

    return c.json(successResponse({
      organizationId,
      date: today,
      metrics: {
        activeReservations: activeRes.count || 0,
        orphanReservations: orphanRes.count || 0,
        checkInsToday: todayRes.count || 0,
        pendingImportIssues: issuesRes.count || 0,
      },
      health: {
        status: (orphanRes.count || 0) === 0 && (issuesRes.count || 0) === 0 ? 'healthy' : 'needs_attention',
        issues: [
          ...(orphanRes.count || 0) > 0 ? [`${orphanRes.count} reservations without property_id`] : [],
          ...(issuesRes.count || 0) > 0 ? [`${issuesRes.count} pending import issues`] : [],
        ],
      },
    }));
  } catch (error: any) {
    logError('Error getting reconciliation health', error);
    return c.json(errorResponse('Failed to get health metrics', { details: error?.message }), 500);
  }
}
