// ============================================================================
// 🔒 CADEADO DE CONTRATO - RESERVATIONS ROUTES
// ============================================================================
// ⚠️ CONTRATO ESTABELECIDO - NÃO MODIFICAR SEM ATUALIZAR CONTRATO
// 
// ESTA FUNCIONALIDADE ESTÁ FUNCIONANDO EM PRODUÇÃO
// 
// CONTRATO DA API (O QUE A CÁPSULA ESPERA):
// 
// INPUT (Request):
// - GET /rendizy-server/make-server-67caf26a/reservations
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - POST /rendizy-server/make-server-67caf26a/reservations
//   Body: { property_id, guest_id, check_in, check_out, ... }
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// - GET /rendizy-server/make-server-67caf26a/reservations/:id
//   Headers: { Authorization: "Bearer <token>", apikey: string }
// 
// OUTPUT (Response):
// - Success: { success: true, data: Reservation | Reservation[] }
// - Error: { success: false, error: string }
// 
// DEPENDÊNCIAS FRONTEND (QUEM USA ESTE CONTRATO):
// - ReservationsManagement.tsx → Lista e gerencia reservas
// - Calendar Module → Exibe reservas no calendário
// - ReservationsModule.tsx → Usa rotas de reservations
// 
// ENTRELACEAMENTOS DOCUMENTADOS (OK - Sistemas se comunicam):
// - ✅ Calendar Module → Exibe reservas no calendário
// - ✅ Properties Module → Reservas pertencem a propriedades
// - ✅ Guests Module → Reservas têm hóspedes associados
// - ✅ WhatsApp Module → Pode enviar confirmações de reserva
// 
// ⚠️ SE MODIFICAR CONTRATO:
// 1. ✅ Criar versão v2 da rota (manter v1 funcionando)
// 2. ✅ Atualizar frontend gradualmente
// 3. ✅ Só remover v1 quando TODOS migrarem
// 
// ⚠️ NUNCA REMOVER ROTAS SEM CRIAR VERSÃO ALTERNATIVA
// ============================================================================
// ROTAS DE RESERVAS
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
// ✅ CADEADO DE CONTRATO v1.0.103.700 - PROTEÇÃO IMPLEMENTADA
// ============================================================================

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import type {
  Reservation,
  Property,
  CreateReservationDTO,
  UpdateReservationDTO,
  ReservationFilters,
  AvailabilityCheck,
  AvailabilityResponse,
} from './types.ts';
import {
  generateReservationId,
  getCurrentDateTime,
  calculateNights,
  validateDateRange,
  datesOverlap,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  applyDiscount,
  logInfo,
  logError,
} from './utils.ts';
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
import { getTenant, isSuperAdmin } from './utils-tenancy.ts';
import { getSupabaseClient } from './kv_store.tsx';
// ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
import { reservationToSql, sqlToReservation, RESERVATION_SELECT_FIELDS } from './utils-reservation-mapper.ts';
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { getOrganizationIdForRequest, RENDIZY_MASTER_ORG_ID } from './utils-multi-tenant.ts';

// ============================================================================
// LISTAR TODAS AS RESERVAS
// ============================================================================

export async function listReservations(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    
    logInfo(`Listing reservations for tenant: ${tenant.username} (${tenant.type})`);

    const parsePositiveInt = (raw: string | undefined | null, fallback: number): number => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return fallback;
      const int = Math.floor(n);
      return int > 0 ? int : fallback;
    };

    // Paginação (mantém compatibilidade: só ativa se page/limit forem enviados)
    const pageParam = c.req.query('page');
    const limitParam = c.req.query('limit');
    const wantsPagination = pageParam !== undefined || limitParam !== undefined;
    const page = parsePositiveInt(pageParam, 1);
    const limit = Math.min(200, parsePositiveInt(limitParam, 20));
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    // Compat: se não pedir paginação, devolve o mesmo contrato (array).
    let query = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS, wantsPagination ? { count: 'exact' } : undefined);
    
    // ✅ REGRA MESTRE: Filtrar por organization_id (superadmin = Rendizy master, outros = sua organização)
    const organizationId = await getOrganizationIdForRequest(c);
    const orgIdFinal = organizationId || RENDIZY_MASTER_ORG_ID;
    query = query.eq('organization_id', orgIdFinal);
    logInfo(`✅ [listReservations] Filtering reservations by organization_id: ${orgIdFinal}`);
    
    // Aplicar filtros de query params
    const propertyIdFilter = c.req.query('propertyId');
    const propertyIdsFilter = c.req.query('propertyIds');
    const guestIdFilter = c.req.query('guestId');
    const statusFilter = c.req.query('status');
    const platformFilter = c.req.query('platform');
    const checkInFromFilter = c.req.query('checkInFrom');
    const checkInToFilter = c.req.query('checkInTo');
    const checkOutFromFilter = c.req.query('checkOutFrom');
    const checkOutToFilter = c.req.query('checkOutTo');
    const createdFromFilter = c.req.query('createdFrom');
    const createdToFilter = c.req.query('createdTo');
    const dateFieldFilter = c.req.query('dateField');
    const dateFromFilter = c.req.query('dateFrom');
    const dateToFilter = c.req.query('dateTo');
    
    if (propertyIdFilter) {
      query = query.eq('property_id', propertyIdFilter);
    }

    if (propertyIdsFilter) {
      const ids = propertyIdsFilter
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        query = query.in('property_id', ids);
      }
    }
    
    if (guestIdFilter) {
      query = query.eq('guest_id', guestIdFilter);
    }
    
    if (statusFilter) {
      query = query.in('status', statusFilter.split(','));
    }
    
    if (platformFilter) {
      query = query.in('platform', platformFilter.split(','));
    }
    
    if (checkInFromFilter) {
      query = query.gte('check_in', checkInFromFilter);
    }
    
    if (checkInToFilter) {
      query = query.lte('check_in', checkInToFilter);
    }

    if (checkOutFromFilter) {
      query = query.gte('check_out', checkOutFromFilter);
    }

    if (checkOutToFilter) {
      query = query.lte('check_out', checkOutToFilter);
    }

    // Filtro por criação (plataforma vs fallback created_at)
    if (createdFromFilter || createdToFilter) {
      const createdFromIso = createdFromFilter ? `${createdFromFilter}T00:00:00-03:00` : undefined;
      const createdToIso = createdToFilter ? `${createdToFilter}T23:59:59.999-03:00` : undefined;
      const bySource = [
        createdFromIso ? `source_created_at.gte.${createdFromIso}` : null,
        createdToIso ? `source_created_at.lte.${createdToIso}` : null,
      ].filter(Boolean);
      const byFallback = [
        'source_created_at.is.null',
        createdFromIso ? `created_at.gte.${createdFromIso}` : null,
        createdToIso ? `created_at.lte.${createdToIso}` : null,
      ].filter(Boolean);
      const orParts = [] as string[];
      if (bySource.length > 0) orParts.push(`and(${bySource.join(',')})`);
      orParts.push(`and(${byFallback.join(',')})`);
      query = query.or(orParts.join(','));
    }

    // Novo: dateField/dateFrom/dateTo (para alinhar com UI)
    if (dateFieldFilter && (dateFromFilter || dateToFilter)) {
      const field = String(dateFieldFilter).toLowerCase();
      if (field === 'checkout') {
        if (dateFromFilter) query = query.gte('check_out', dateFromFilter);
        if (dateToFilter) query = query.lte('check_out', dateToFilter);
      } else if (field === 'created') {
        const df = dateFromFilter ? `${dateFromFilter}T00:00:00-03:00` : undefined;
        const dt = dateToFilter ? `${dateToFilter}T23:59:59.999-03:00` : undefined;
        const bySource = [
          df ? `source_created_at.gte.${df}` : null,
          dt ? `source_created_at.lte.${dt}` : null,
        ].filter(Boolean);
        const byFallback = [
          'source_created_at.is.null',
          df ? `created_at.gte.${df}` : null,
          dt ? `created_at.lte.${dt}` : null,
        ].filter(Boolean);
        const orParts = [] as string[];
        if (bySource.length > 0) orParts.push(`and(${bySource.join(',')})`);
        orParts.push(`and(${byFallback.join(',')})`);
        query = query.or(orParts.join(','));
      } else {
        // default: checkin
        if (dateFromFilter) query = query.gte('check_in', dateFromFilter);
        if (dateToFilter) query = query.lte('check_in', dateToFilter);
      }
    }
    
    // Ordenar por check_in DESC (mais recente primeiro)
    query = query.order('check_in', { ascending: false });

    if (wantsPagination) {
      query = query.range(rangeFrom, rangeTo);
    }
    
    const { data: rows, error, count } = await query;
    
    if (error) {
      console.error('❌ [listReservations] SQL error:', error);
      return c.json(errorResponse('Erro ao buscar reservas', { details: error.message }), 500);
    }
    
    // ✅ Converter resultados SQL para Reservation (TypeScript)
    const reservations = (rows || []).map(sqlToReservation);

    logInfo(`Found ${reservations.length} reservations`);

    if (!wantsPagination) {
      return c.json(successResponse(reservations));
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return c.json(
      successResponse({
        data: reservations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      })
    );
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ [listReservations] ERRO COMPLETO:', err);
    console.error('❌ [listReservations] Stack:', err.stack);
    logError('Error listing reservations', err);
    return c.json(
      errorResponse('Failed to list reservations', {
        details: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'),
      }),
      500
    );
  }
}

// ============================================================================
// KPI - RESERVAS (CHECKIN/OUT/INHOUSE/NOVAS HOJE)
// ============================================================================

function formatDateSaoPaulo(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export async function getReservationsKpis(c: Context) {
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient();

    logInfo(`Calculating reservations KPIs for tenant: ${tenant.username} (${tenant.type})`);

    const organizationId = await getOrganizationIdForRequest(c);
    const orgIdFinal = organizationId || RENDIZY_MASTER_ORG_ID;
    logInfo(`✅ [getReservationsKpis] Filtering reservations by organization_id: ${orgIdFinal}`);

    const today = formatDateSaoPaulo(new Date());
    const startOfDay = `${today}T00:00:00-03:00`;
    const endOfDay = `${today}T23:59:59.999-03:00`;
    // Status que NÃO representam hóspedes ocupando um imóvel.
    // (bloqueios/manutenção/cancelados/no-show não entram em KPIs operacionais)
    // NOTA: "pending" (pré-reserva) CONTA nos KPIs para alertar o operacional.
    // Se não se confirmar, é melhor errar por mais do que por menos.
    const statusNotIn = '("cancelled","no_show","blocked","maintenance")';

    const qCheckins = client
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgIdFinal)
      .eq('check_in', today)
      .not('status', 'in', statusNotIn);

    const qCheckouts = client
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgIdFinal)
      .eq('check_out', today)
      .not('status', 'in', statusNotIn);

    // In-house = imóveis ocupados AGORA (sem contar check-ins do próprio dia).
    // Regra: contar DISTINCT property_id de reservas já iniciadas antes de hoje e ainda ativas.
    // Motivo: no dashboard, check-ins de hoje já aparecem no card de check-in; manter métricas consistentes.
    const qInHouse = client
      .from('reservations')
      .select('property_id')
      .eq('organization_id', orgIdFinal)
      .lt('check_in', today)
      .gt('check_out', today)
      .not('status', 'in', statusNotIn);

    const qNewTodayBySource = client
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgIdFinal)
      // source_created_at from Stays.net is often midnight UTC (2026-01-29T00:00:00Z)
      // So we filter by date range without timezone conversion
      .gte('source_created_at', today)
      .lt('source_created_at', new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0])
      .not('status', 'in', statusNotIn);

    const qNewTodayByFallback = client
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgIdFinal)
      .is('source_created_at', null)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .not('status', 'in', statusNotIn);

    const [rCheckins, rCheckouts, rInHouse, rNewSource, rNewFallback] = await Promise.all([
      qCheckins,
      qCheckouts,
      qInHouse,
      qNewTodayBySource,
      qNewTodayByFallback,
    ]);

    const firstError = rCheckins.error || rCheckouts.error || rInHouse.error || rNewSource.error || rNewFallback.error;
    const sourceCreatedAtMissing =
      !!(rNewSource.error || rNewFallback.error) &&
      /source_created_at/i.test((rNewSource.error || rNewFallback.error)?.message || '') &&
      /does not exist/i.test((rNewSource.error || rNewFallback.error)?.message || '');

    if (firstError && !sourceCreatedAtMissing) {
      console.error('❌ [getReservationsKpis] SQL error:', firstError);
      return c.json(errorResponse('Erro ao calcular KPIs de reservas', { details: firstError.message }), 500);
    }

    const checkinsToday = rCheckins.count ?? 0;
    const checkoutsToday = rCheckouts.count ?? 0;

    const inHouseToday = Array.isArray((rInHouse as any).data)
      ? new Set(
          ((rInHouse as any).data as Array<{ property_id?: string | null }>).map((row) => row?.property_id).filter(Boolean) as string[]
        ).size
      : 0;

    let newReservationsToday = (rNewSource.count ?? 0) + (rNewFallback.count ?? 0);
    if (sourceCreatedAtMissing) {
      // Fallback seguro antes da migration: usa apenas created_at
      const qNewTodayByCreatedAtOnly = client
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgIdFinal)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .not('status', 'in', statusNotIn);
      const rCreatedOnly = await qNewTodayByCreatedAtOnly;
      if (rCreatedOnly.error) {
        console.error('❌ [getReservationsKpis] SQL error fallback created_at:', rCreatedOnly.error);
        return c.json(errorResponse('Erro ao calcular KPIs de reservas', { details: rCreatedOnly.error.message }), 500);
      }
      newReservationsToday = rCreatedOnly.count ?? 0;
    }

    return c.json(
      successResponse({
        date: today,
        checkinsToday,
        checkoutsToday,
        inHouseToday,
        newReservationsToday,
      })
    );
  } catch (error: any) {
    console.error('❌ [getReservationsKpis] ERRO COMPLETO:', error);
    return c.json(
      errorResponse('Failed to calculate reservations KPIs', {
        details: error?.message || String(error),
      }),
      500
    );
  }
}

// ============================================================================
// SUMMARY - RESERVAS (TOTAL/CONFIRMADAS/PENDENTES/RECEITA)
// ============================================================================

export async function getReservationsSummary(c: Context) {
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient();

    logInfo(`Calculating reservations summary for tenant: ${tenant.username} (${tenant.type})`);

    const organizationId = await getOrganizationIdForRequest(c);
    const orgIdFinal = organizationId || RENDIZY_MASTER_ORG_ID;

    // Filtros (mesmos parâmetros do listReservations)
    const propertyIdFilter = c.req.query('propertyId');
    const propertyIdsFilter = c.req.query('propertyIds');
    const guestIdFilter = c.req.query('guestId');
    const statusFilter = c.req.query('status');
    const platformFilter = c.req.query('platform');
    const checkInFromFilter = c.req.query('checkInFrom');
    const checkInToFilter = c.req.query('checkInTo');
    const checkOutFromFilter = c.req.query('checkOutFrom');
    const checkOutToFilter = c.req.query('checkOutTo');
    const createdFromFilter = c.req.query('createdFrom');
    const createdToFilter = c.req.query('createdTo');
    const dateFieldFilter = c.req.query('dateField');
    const dateFromFilter = c.req.query('dateFrom');
    const dateToFilter = c.req.query('dateTo');

    const applyFilters = (q: any) => {
      q = q.eq('organization_id', orgIdFinal);

      if (propertyIdFilter) q = q.eq('property_id', propertyIdFilter);
      if (propertyIdsFilter) {
        const ids = propertyIdsFilter
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        if (ids.length > 0) q = q.in('property_id', ids);
      }

      if (guestIdFilter) q = q.eq('guest_id', guestIdFilter);
      if (statusFilter) q = q.in('status', statusFilter.split(','));
      if (platformFilter) q = q.in('platform', platformFilter.split(','));
      if (checkInFromFilter) q = q.gte('check_in', checkInFromFilter);
      if (checkInToFilter) q = q.lte('check_in', checkInToFilter);
      if (checkOutFromFilter) q = q.gte('check_out', checkOutFromFilter);
      if (checkOutToFilter) q = q.lte('check_out', checkOutToFilter);

      if (createdFromFilter || createdToFilter) {
        const createdFromIso = createdFromFilter ? `${createdFromFilter}T00:00:00-03:00` : undefined;
        const createdToIso = createdToFilter ? `${createdToFilter}T23:59:59.999-03:00` : undefined;
        const bySource = [
          createdFromIso ? `source_created_at.gte.${createdFromIso}` : null,
          createdToIso ? `source_created_at.lte.${createdToIso}` : null,
        ].filter(Boolean);
        const byFallback = [
          'source_created_at.is.null',
          createdFromIso ? `created_at.gte.${createdFromIso}` : null,
          createdToIso ? `created_at.lte.${createdToIso}` : null,
        ].filter(Boolean);
        const orParts = [] as string[];
        if (bySource.length > 0) orParts.push(`and(${bySource.join(',')})`);
        orParts.push(`and(${byFallback.join(',')})`);
        q = q.or(orParts.join(','));
      }

      if (dateFieldFilter && (dateFromFilter || dateToFilter)) {
        const field = String(dateFieldFilter).toLowerCase();
        if (field === 'checkout') {
          if (dateFromFilter) q = q.gte('check_out', dateFromFilter);
          if (dateToFilter) q = q.lte('check_out', dateToFilter);
        } else if (field === 'created') {
          const df = dateFromFilter ? `${dateFromFilter}T00:00:00-03:00` : undefined;
          const dt = dateToFilter ? `${dateToFilter}T23:59:59.999-03:00` : undefined;
          const bySource = [
            df ? `source_created_at.gte.${df}` : null,
            dt ? `source_created_at.lte.${dt}` : null,
          ].filter(Boolean);
          const byFallback = [
            'source_created_at.is.null',
            df ? `created_at.gte.${df}` : null,
            dt ? `created_at.lte.${dt}` : null,
          ].filter(Boolean);
          const orParts = [] as string[];
          if (bySource.length > 0) orParts.push(`and(${bySource.join(',')})`);
          orParts.push(`and(${byFallback.join(',')})`);
          q = q.or(orParts.join(','));
        } else {
          if (dateFromFilter) q = q.gte('check_in', dateFromFilter);
          if (dateToFilter) q = q.lte('check_in', dateToFilter);
        }
      }

      return q;
    };

    // Total / Confirmed / Pending counts
    const qTotal = applyFilters(
      client.from('reservations').select('id', { count: 'exact', head: true })
    );

    const qConfirmed = applyFilters(
      client
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'confirmed')
    );

    const qPending = applyFilters(
      client
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    );

    // Revenue: soma de pricing_total para status "ativos/realizados" (mesma regra do frontend)
    const qRevenueRows = applyFilters(
      client
        .from('reservations')
        .select('pricing_total, pricing_platform_commission')
        .in('status', ['confirmed', 'checked_in', 'checked_out', 'completed'])
    );

    const [rTotal, rConfirmed, rPending, rRevenue] = await Promise.all([
      qTotal,
      qConfirmed,
      qPending,
      qRevenueRows,
    ]);

    const firstError = rTotal.error || rConfirmed.error || rPending.error || rRevenue.error;
    if (firstError) {
      console.error('❌ [getReservationsSummary] SQL error:', firstError);
      return c.json(errorResponse('Erro ao calcular resumo de reservas', { details: firstError.message }), 500);
    }

    // Calcular revenue e comissões
    let revenueCents = 0;
    let commissionCents = 0;
    
    for (const row of (rRevenue.data || [])) {
      const total = Number(row?.pricing_total);
      const commission = Number(row?.pricing_platform_commission);
      
      if (Number.isFinite(total)) {
        revenueCents += Number.isInteger(total) ? total : Math.round(total * 100);
      }
      if (Number.isFinite(commission)) {
        commissionCents += Number.isInteger(commission) ? commission : Math.round(commission * 100);
      }
    }

    const revenue = Number((revenueCents / 100).toFixed(2));
    const platformCommission = Number((commissionCents / 100).toFixed(2));
    // Receita líquida = total - comissão das plataformas
    const netRevenue = Number(((revenueCents - commissionCents) / 100).toFixed(2));

    return c.json(
      successResponse({
        total: rTotal.count ?? 0,
        confirmed: rConfirmed.count ?? 0,
        pending: rPending.count ?? 0,
        revenue,
        platformCommission,
        netRevenue,
      })
    );
  } catch (error: any) {
    console.error('❌ [getReservationsSummary] ERRO COMPLETO:', error);
    return c.json(
      errorResponse('Failed to calculate reservations summary', {
        details: error?.message || String(error),
      }),
      500
    );
  }
}

// ============================================================================
// BUSCAR RESERVA POR ID
// ============================================================================

export async function getReservation(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const id = c.req.param('id');
    logInfo(`Getting reservation: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que reservation pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: row, error } = await query.maybeSingle();
    
    if (error) {
      console.error('❌ [getReservation] SQL error:', error);
      return c.json(errorResponse('Erro ao buscar reserva', { details: error.message }), 500);
    }
    
    if (!row) {
      return c.json(notFoundResponse('Reservation'), 404);
    }
    
    // ✅ Converter resultado SQL para Reservation (TypeScript)
    const reservation = sqlToReservation(row);

    // ✅ MIGRAÇÃO: Verificar se a propriedade associada existe (do SQL)
    const { data: propertyRow } = await client
      .from('properties')
      .select('id, organization_id')
      .eq('id', reservation.propertyId)
      .maybeSingle();
    
    if (!propertyRow) {
      logInfo(`Orphaned reservation: ${id} (property ${reservation.propertyId} not found)`);
      return c.json(notFoundResponse('Property not found for this reservation'), 404);
    }

    // ✅ VERIFICAR PERMISSÃO: Se for imobiliária, garantir que reservation pertence à organização
    // (já filtrado na query SQL acima, mas validar novamente para segurança)
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      // ✅ Multi-tenant garantido pela query SQL (já filtra por organization_id)
      logInfo(`Reservation ${id} belongs to organization ${organizationId}`);
    }

    return c.json(successResponse(reservation));
  } catch (error) {
    logError('Error getting reservation', error);
    return c.json(errorResponse('Failed to get reservation'), 500);
  }
}

// ============================================================================
// VERIFICAR DISPONIBILIDADE
// ============================================================================

export async function checkAvailability(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const body = await c.req.json<AvailabilityCheck>();
    logInfo('Checking availability', body);

    const { propertyId, checkIn, checkOut } = body;

    // Validar datas
    const dateValidation = validateDateRange(checkIn, checkOut);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    // ✅ REGRA MESTRE: sempre filtrar por organization_id efetivo
    const organizationId = await getOrganizationIdForRequest(c);
    const orgIdFinal = organizationId || RENDIZY_MASTER_ORG_ID;

    // Verificar se propriedade existe (canônico: properties)
    let propertyQuery = client
      .from('properties')
      .select('id, organization_id, data')
      .eq('id', propertyId);

    if (tenant.type === 'imobiliaria' || tenant.type === 'superadmin') {
      propertyQuery = propertyQuery.eq('organization_id', orgIdFinal);
    }

    const { data: propertyRow, error: propertyError } = await propertyQuery.maybeSingle();
    if (propertyError) {
      console.error('❌ [checkAvailability] SQL error fetching property:', propertyError);
      return c.json(errorResponse('Erro ao buscar propriedade', { details: propertyError.message }), 500);
    }
    if (!propertyRow) {
      return c.json(notFoundResponse('Property'), 404);
    }

    // Verificar restrições (minNights) quando disponível
    const nights = calculateNights(checkIn, checkOut);
    const data = (propertyRow as any)?.data || {};
    const minNightsRaw =
      (data?.restrictions?.minNights ??
        data?.restricoes?.min_noites ??
        data?.min_nights ??
        data?.minNights ??
        1);
    const minNights = Math.max(1, Math.round(Number(minNightsRaw) || 1));

    if (nights < minNights) {
      const response: AvailabilityResponse = {
        available: false,
        reason: `Minimum ${minNights} nights required`,
      };
      return c.json(successResponse(response));
    }

    // ✅ Conflitos com reservas (lógica hoteleira: check-out NÃO ocupa)
    let reservationsQuery = client
      .from('reservations')
      .select('id, check_in, check_out, status')
      .eq('organization_id', orgIdFinal)
      .eq('property_id', propertyId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
      .order('check_in', { ascending: true });

    // (tenant filter already enforced via orgIdFinal)
    const { data: conflicts, error: conflictError } = await reservationsQuery;
    if (conflictError) {
      console.error('❌ [checkAvailability] SQL error checking reservation conflicts:', conflictError);
      return c.json(errorResponse('Erro ao verificar disponibilidade', { details: conflictError.message }), 500);
    }

    if (conflicts && conflicts.length > 0) {
      const first = conflicts[0] as any;
      const response: AvailabilityResponse = {
        available: false,
        reason: 'Property is already booked for these dates',
        conflictingReservation: {
          id: first.id,
          checkIn: first.check_in,
          checkOut: first.check_out,
        },
      };
      return c.json(successResponse(response));
    }

    // ✅ Conflitos com blocks (manual, iCal, etc.)
    const { data: blockConflicts, error: blockError } = await client
      .from('blocks')
      .select('id, start_date, end_date, subtype, reason')
      .eq('organization_id', orgIdFinal)
      .eq('property_id', propertyId)
      .lt('start_date', checkOut)
      .gt('end_date', checkIn)
      .order('start_date', { ascending: true });

    if (blockError) {
      console.error('❌ [checkAvailability] SQL error checking blocks:', blockError);
      return c.json(errorResponse('Erro ao verificar bloqueios', { details: blockError.message }), 500);
    }

    if (blockConflicts && blockConflicts.length > 0) {
      const b = blockConflicts[0] as any;
      const isReservationBlock = String(b?.subtype || '').toLowerCase() === 'reservation';
      const response: AvailabilityResponse = {
        available: false,
        reason: isReservationBlock
          ? 'Property is already booked for these dates'
          : `Property is blocked (${b?.reason || 'blocked'})`,
      };
      return c.json(successResponse(response));
    }

    // Disponível!
    const response: AvailabilityResponse = { available: true };
    return c.json(successResponse(response));
  } catch (error) {
    logError('Error checking availability', error);
    return c.json(errorResponse('Failed to check availability'), 500);
  }
}

// ============================================================================
// CALCULAR PREÇO DA RESERVA
// ============================================================================

/**
 * Buscar preço dinâmico via rate_plans (nova arquitetura)
 * Retorna null se não disponível, fallback para cálculo legado
 */
async function getStayPriceFromRatePlan(
  client: ReturnType<typeof getSupabaseClient>,
  propertyId: string,
  checkIn: string,
  checkOut: string
): Promise<{
  totalPrice: number;
  averagePerNight: number;
  nightsCount: number;
  currency: string;
  ratePlanId: string;
  priceBreakdown: Array<{ date: string; price: number; has_override: boolean; source: string }>;
} | null> {
  try {
    const { data, error } = await client.rpc('calculate_stay_price', {
      p_property_id: propertyId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_rate_plan_id: null // usar STANDARD
    });
    
    if (error || !data) {
      console.log('⚠️ [getStayPriceFromRatePlan] Não disponível, usando fallback legado');
      return null;
    }
    
    // Verificar se retornou preço válido (> 0)
    if (data.total_price <= 0) {
      console.log('⚠️ [getStayPriceFromRatePlan] Preço zero, usando fallback legado');
      return null;
    }
    
    return {
      totalPrice: Number(data.total_price),
      averagePerNight: Number(data.average_per_night),
      nightsCount: Number(data.nights_count),
      currency: data.currency || 'BRL',
      ratePlanId: data.rate_plan_id,
      priceBreakdown: data.price_breakdown || []
    };
  } catch (err) {
    console.warn('⚠️ [getStayPriceFromRatePlan] Erro, fallback legado:', err);
    return null;
  }
}

function calculateReservationPrice(
  property: Property,
  nights: number
): {
  pricePerNight: number;
  baseTotal: number;
  discount: number;
  total: number;
  appliedTier: 'base' | 'weekly' | 'biweekly' | 'monthly';
} {
  const basePrice = property.pricing.basePrice;
  let appliedTier: 'base' | 'weekly' | 'biweekly' | 'monthly' = 'base';
  let discountPercent = 0;

  // ✅ NOVO: regras ilimitadas por pacote de dias
  const rules = Array.isArray((property as any)?.pricing?.discountPackagesRules)
    ? ((property as any).pricing.discountPackagesRules as Array<{ minNights: number; discountPercent: number }>).
        map((r) => ({
          minNights: Math.max(1, Math.round(Number(r?.minNights ?? 1))),
          discountPercent: Math.min(100, Math.max(0, Number(r?.discountPercent ?? 0)))
        }))
        .sort((a, b) => a.minNights - b.minNights)
    : [];

  if (rules.length > 0) {
    const applicable = rules.filter((r) => nights >= r.minNights);
    const best = applicable.length > 0 ? applicable[applicable.length - 1] : null;
    if (best) {
      discountPercent = best.discountPercent;
      if (best.minNights >= 28) appliedTier = 'monthly';
      else if (best.minNights >= 15) appliedTier = 'biweekly';
      else if (best.minNights >= 7) appliedTier = 'weekly';
      else appliedTier = 'base';
    }
  }

  // Fallback: tiers fixos (legado)
  if (rules.length === 0) {
    if (nights >= 28) {
      appliedTier = 'monthly';
      discountPercent = property.pricing.monthlyDiscount;
    } else if (nights >= 15) {
      appliedTier = 'biweekly';
      discountPercent = property.pricing.biweeklyDiscount;
    } else if (nights >= 7) {
      appliedTier = 'weekly';
      discountPercent = property.pricing.weeklyDiscount;
    }
  }

  // Calcular preço por noite com desconto
  const pricePerNight = applyDiscount(basePrice, discountPercent);
  const baseTotal = pricePerNight * nights;
  const discount = (basePrice * nights) - baseTotal;

  return {
    pricePerNight,
    baseTotal,
    discount,
    total: baseTotal,
    appliedTier,
  };
}

// ============================================================================
// CRIAR NOVA RESERVA
// ============================================================================

export async function createReservation(c: Context) {
  console.log('🚀 [createReservation] === INÍCIO ===');
  
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const body = await c.req.json<CreateReservationDTO>();
    
    console.log('📦 [createReservation] Body recebido:', JSON.stringify(body, null, 2));
    console.log('👤 [createReservation] Tenant:', tenant.username, tenant.type);
    
    logInfo(`Creating reservation for tenant: ${tenant.username}`, body);

    // ✅ REGRA MESTRE: Sempre obter organization_id garantido (inclui superadmin → Rendizy master)
    const organizationId = await getOrganizationIdForRequest(c);
    const orgIdFinal = organizationId || RENDIZY_MASTER_ORG_ID;

    // Validações
    if (!body.propertyId || !body.guestId) {
      return c.json(
        validationErrorResponse('Property ID and Guest ID are required'),
        400
      );
    }

    const dateValidation = validateDateRange(body.checkIn, body.checkOut);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    if (!body.adults || body.adults < 1) {
      return c.json(
        validationErrorResponse('At least 1 adult is required'),
        400
      );
    }

    // ✅ MIGRAÇÃO: Verificar se propriedade existe no SQL (com filtro multi-tenant)
    console.log('🔍 [createReservation] Buscando propriedade:', body.propertyId);
    
    // ✅ Tabela canônica: properties (sem fallback para tabelas legadas)
    let propertyQuery = client
      .from('properties')
      .select('id, title, data, organization_id')
      .eq('id', body.propertyId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que property pertence à organização
    if (tenant.type === 'imobiliaria' || tenant.type === 'superadmin') {
      console.log('🏢 [createReservation] Filtrando por organization_id:', orgIdFinal);
      propertyQuery = propertyQuery.eq('organization_id', orgIdFinal);
    }
    
    let { data: propertyRow, error: propertyError } = await propertyQuery.maybeSingle();
    
    if (propertyError) {
      console.error('❌ [createReservation] SQL error fetching property:', propertyError);
      return c.json(errorResponse('Erro ao buscar propriedade', { details: propertyError.message }), 500);
    }
    
    if (!propertyRow) {
      console.error('❌ [createReservation] Propriedade não encontrada em properties:', body.propertyId);
      return c.json(notFoundResponse('Property'), 404);
    }
    
    console.log('✅ [createReservation] Propriedade encontrada:', propertyRow.id, propertyRow.title);
    
    // ✅ Extrair dados de pricing do campo data (JSONB)
    const propertyData = propertyRow.data || {};
    const toMoney = (v: unknown, fallback = 0): number => {
      if (v === null || v === undefined || v === '') return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const basePrice = toMoney(propertyData.preco_base_noite ?? propertyData.valor_aluguel, 100); // Fallback
    const cleaningFee = toMoney(
      propertyData.taxa_limpeza ??
        propertyData.cleaning_fee ??
        propertyData.cleaningFee ??
        propertyData?.pricing?.cleaningFee,
      0
    );

    // ✅ NOVO: Descontos por pacote de dias
    type DiscountPackagePreset = 'weekly' | 'monthly' | 'custom';
    type DiscountPackageRule = { preset: DiscountPackagePreset; min_nights: number; discount_percent: number };

    const normalizeDiscountRules = (input: any): DiscountPackageRule[] => {
      const rules = Array.isArray(input?.rules) ? input.rules : [];
      const coerced = rules
        .map((r: any) => {
          const presetRaw = String(r?.preset ?? 'custom');
          const preset: DiscountPackagePreset = presetRaw === 'weekly' || presetRaw === 'monthly' || presetRaw === 'custom' ? presetRaw : 'custom';
          const minNightsRaw = Number(r?.min_nights ?? 0);
          const minNights = preset === 'weekly' ? 7 : preset === 'monthly' ? 28 : Math.max(1, Math.round(Number.isFinite(minNightsRaw) ? minNightsRaw : 1));

          const pctRaw = Number(r?.discount_percent ?? 0);
          const pct = Number.isFinite(pctRaw) ? Math.min(100, Math.max(0, pctRaw)) : 0;

          return { preset, min_nights: minNights, discount_percent: pct } as DiscountPackageRule;
        })
        .sort((a: DiscountPackageRule, b: DiscountPackageRule) => a.min_nights - b.min_nights);

      return coerced;
    };

    let weeklyDiscount = Number(propertyData.desconto_semanal || 0);
    let monthlyDiscount = Number(propertyData.desconto_mensal || 0);
    let biweeklyDiscount = 0;
    let discountPackagesRules: Array<{ minNights: number; discountPercent: number }> = [];

    try {
      let effectiveSettings: any = null;

      // Prefer override do anúncio
      const override = (propertyData as any)?.discount_packages_override;
      if (override) {
        effectiveSettings = override;
      } else {
        // Fallback: config global da organização
        const { data: orgRow } = await client
          .from('organizations')
          .select('metadata')
          .eq('id', propertyRow.organization_id)
          .maybeSingle();

        const orgSettings = (orgRow as any)?.metadata?.discount_packages;
        if (orgSettings) effectiveSettings = orgSettings;
      }

      const rules = normalizeDiscountRules(effectiveSettings);
      const weekly = rules.find((r) => r.preset === 'weekly');
      const monthly = rules.find((r) => r.preset === 'monthly');
      const custom = rules.filter((r) => r.preset === 'custom');

      // Regras completas (inclui weekly/custom/monthly) para cálculo por noites
      if (rules.length > 0) {
        discountPackagesRules = rules.map((r) => ({ minNights: r.min_nights, discountPercent: r.discount_percent }));
      }

      if (weekly) weeklyDiscount = weekly.discount_percent;
      if (monthly) monthlyDiscount = monthly.discount_percent;

      // Mantém compatibilidade com pricing atual (biweeklyDiscount), usando a regra custom mais próxima de 15 noites
      if (custom.length > 0) {
        const target = 15;
        const best = custom.reduce((acc, cur) => {
          if (!acc) return cur;
          const d1 = Math.abs(acc.min_nights - target);
          const d2 = Math.abs(cur.min_nights - target);
          return d2 < d1 ? cur : acc;
        }, null as DiscountPackageRule | null);
        biweeklyDiscount = best?.discount_percent ?? 0;
      }
    } catch (err) {
      // fallback silencioso para descontos legados
      console.warn('⚠️ [createReservation] Falha ao resolver discount packages, usando descontos legados:', err);
    }
    
    // ✅ Converter para Property (TypeScript) temporariamente para calcular preço
    const property: Property = {
      id: propertyRow.id,
      pricing: {
        basePrice: basePrice,
        currency: propertyData.moeda || 'BRL',
        weeklyDiscount,
        biweeklyDiscount,
        monthlyDiscount,
        ...(discountPackagesRules.length > 0 ? { discountPackagesRules } : {}),
      },
    } as Property;

    // ✅ MIGRAÇÃO: Verificar se hóspede existe no SQL (com filtro multi-tenant)
    console.log('🔍 [createReservation] Buscando hóspede:', body.guestId);
    
    let guestQuery = client
      .from('guests')
      .select('id, full_name, email, phone, document_number, organization_id')
      .eq('id', body.guestId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria' || tenant.type === 'superadmin') {
      console.log('🏢 [createReservation] Filtrando guest por organization_id:', orgIdFinal);
      guestQuery = guestQuery.eq('organization_id', orgIdFinal);
    }
    
    const { data: guestRow, error: guestError } = await guestQuery.maybeSingle();
    
    if (guestError) {
      console.error('❌ [createReservation] SQL error fetching guest:', guestError);
      return c.json(errorResponse('Erro ao buscar hóspede', { details: guestError.message }), 500);
    }
    
    if (!guestRow) {
      console.error('❌ [createReservation] Hóspede não encontrado:', body.guestId);
      return c.json(notFoundResponse('Guest'), 404);
    }
    
    console.log('✅ [createReservation] Hóspede encontrado:', guestRow.id, guestRow.full_name);

    // Verificar disponibilidade
    const nights = calculateNights(body.checkIn, body.checkOut);
    
    // ✅ FIX CRÍTICO: Verificar conflitos com lógica hoteleira correta
    // Check-in ocupa o dia, check-out NÃO ocupa
    // Nova reserva: body.checkIn → body.checkOut
    // Conflito se: check_in < body.checkOut AND check_out > body.checkIn
    let conflictQuery = client
      .from('reservations')
      .select('id, check_in, check_out, status')
      .eq('property_id', body.propertyId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .lt('check_in', body.checkOut)  // Reserva começa antes do nosso checkout
      .gt('check_out', body.checkIn); // Reserva termina depois do nosso checkin
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria' || tenant.type === 'superadmin') {
      conflictQuery = conflictQuery.eq('organization_id', orgIdFinal);
    }
    
    const { data: conflicts, error: conflictError } = await conflictQuery;
    
    if (conflictError && conflictError.code !== 'PGRST116') {
      console.error('❌ [createReservation] SQL error checking conflicts:', conflictError);
      return c.json(errorResponse('Erro ao verificar disponibilidade', { details: conflictError.message }), 500);
    }
    
    // ✅ FIX: Verificar conflitos reais (com lógica hoteleira)
    if (conflicts && conflicts.length > 0) {
      console.log(`⚠️ [createReservation] ${conflicts.length} possíveis conflitos encontrados`);
      console.log('🔍 [createReservation] Nova reserva:', body.checkIn, '→', body.checkOut);
      
      const hasRealConflict = conflicts.some((conflict: any) => {
        console.log('   Conflito:', conflict.check_in, '→', conflict.check_out, '(', conflict.status, ')');
        
        // Lógica hoteleira: check-in ocupa, check-out NÃO
        // Exemplo: Reserva A (24→26) e Reserva B (26→28) = SEM conflito
        const conflictCheckIn = new Date(conflict.check_in);
        const conflictCheckOut = new Date(conflict.check_out);
        const newCheckIn = new Date(body.checkIn);
        const newCheckOut = new Date(body.checkOut);
        
        const overlaps = newCheckIn < conflictCheckOut && newCheckOut > conflictCheckIn;
        
        if (overlaps) {
          console.log('   ❌ CONFLITO REAL detectado!');
        }
        
        return overlaps;
      });
      
      if (hasRealConflict) {
        console.log('❌ [createReservation] Reserva bloqueada por conflito');
        return c.json(
          errorResponse('Property is not available for these dates'),
          400
        );
      }
      
      console.log('✅ [createReservation] Sem conflitos reais - prosseguindo');
    }

    // ✅ Verificar conflitos com blocks (manual/iCal/etc.)
    // Regra hoteleira (end exclusivo): start_date < checkOut && end_date > checkIn
    let blocksConflictQuery = client
      .from('blocks')
      .select('id, start_date, end_date, subtype, reason')
      .eq('property_id', body.propertyId)
      .lt('start_date', body.checkOut)
      .gt('end_date', body.checkIn);

    if (tenant.type === 'imobiliaria' || tenant.type === 'superadmin') {
      blocksConflictQuery = blocksConflictQuery.eq('organization_id', orgIdFinal);
    }

    const { data: blockConflicts, error: blockConflictError } = await blocksConflictQuery;
    if (blockConflictError && blockConflictError.code !== 'PGRST116') {
      console.error('❌ [createReservation] SQL error checking block conflicts:', blockConflictError);
      return c.json(errorResponse('Erro ao verificar bloqueios', { details: blockConflictError.message }), 500);
    }

    if (blockConflicts && blockConflicts.length > 0) {
      console.log(`❌ [createReservation] Reserva bloqueada por block existente (${blockConflicts.length})`);
      const b: any = blockConflicts[0];
      const isReservationBlock = String(b?.subtype || '').toLowerCase() === 'reservation';
      return c.json(
        errorResponse(
          isReservationBlock
            ? 'Property is not available for these dates'
            : `Property is blocked (${b?.reason || 'blocked'})`
        ),
        400
      );
    }

    // ✅ NOVA ARQUITETURA: Tentar calcular preço via rate_plans (SQL)
    let pricing: {
      pricePerNight: number;
      baseTotal: number;
      discount: number;
      total: number;
      appliedTier: 'base' | 'weekly' | 'biweekly' | 'monthly';
      usedRatePlan?: boolean;
      ratePlanId?: string;
      priceBreakdown?: Array<{ date: string; price: number; has_override: boolean; source: string }>;
    };
    
    const ratePlanPrice = await getStayPriceFromRatePlan(client, body.propertyId, body.checkIn, body.checkOut);
    
    if (ratePlanPrice && ratePlanPrice.totalPrice > 0) {
      // ✅ Usar preço do rate_plan (nova arquitetura)
      console.log('✅ [createReservation] Usando preço via rate_plan:', ratePlanPrice.totalPrice);
      pricing = {
        pricePerNight: ratePlanPrice.averagePerNight,
        baseTotal: ratePlanPrice.totalPrice,
        discount: 0, // TODO: Calcular desconto com base em regras do rate_plan
        total: ratePlanPrice.totalPrice,
        appliedTier: 'base',
        usedRatePlan: true,
        ratePlanId: ratePlanPrice.ratePlanId,
        priceBreakdown: ratePlanPrice.priceBreakdown
      };
    } else {
      // Fallback: calcular via função legada (mantém compatibilidade)
      console.log('⚠️ [createReservation] Fallback para cálculo legado de preço');
      pricing = calculateReservationPrice(property, nights);
    }

    // Criar reserva
    const id = generateReservationId();
    const now = getCurrentDateTime();

    const reservation: Reservation = {
      id,
      propertyId: body.propertyId,
      guestId: body.guestId,
      
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      nights,
      
      guests: {
        adults: body.adults,
        children: body.children || 0,
        infants: body.infants || 0,
        pets: body.pets || 0,
        total: body.adults + (body.children || 0) + (body.infants || 0),
      },
      
      pricing: {
        pricePerNight: pricing.pricePerNight,
        baseTotal: pricing.baseTotal,
        cleaningFee: cleaningFee,
        serviceFee: 0,
        taxes: 0,
        discount: pricing.discount,
        total: pricing.total + cleaningFee,
        currency: property.pricing.currency,
        appliedTier: pricing.appliedTier,
      },
      
      // ✅ Status: usa o informado pelo frontend, ou 'confirmed' como default (reserva confirmada)
      status: body.status || 'confirmed',
      platform: body.platform,
      externalId: body.externalId,
      
      payment: {
        status: 'pending',
      },
      
      notes: body.notes,
      specialRequests: body.specialRequests,
      
      createdAt: now,
      updatedAt: now,
      // ✅ Usar userId do tenant
      createdBy: tenant.userId || 'system',
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    const sqlData = reservationToSql(reservation, orgIdFinal);
    
    const { data: insertedRow, error: insertError } = await client
      .from('reservations')
      .insert(sqlData)
      .select(RESERVATION_SELECT_FIELDS)
      .single();
    
    if (insertError) {
      console.error('❌ [createReservation] SQL error inserting:', insertError);
      return c.json(errorResponse('Erro ao criar reserva', { details: insertError.message }), 500);
    }
    
    // ✅ Converter resultado SQL para Reservation (TypeScript)
    const createdReservation = sqlToReservation(insertedRow);

    // ✅ NOVO: Criar block no calendário automaticamente quando reserva é criada
    try {
      const { blockToSql } = await import('./utils-block-mapper.ts');
      const blockId = crypto.randomUUID();
      const now = getCurrentDateTime();
      
      const block = {
        id: blockId,
        propertyId: body.propertyId,
        startDate: body.checkIn,
        endDate: body.checkOut,
        nights: nights,
        type: 'block' as const,
        subtype: 'reservation' as const,
        reason: `Reserva: ${id}`,
        notes: `Reserva criada automaticamente para ${body.adults} hóspede(s)`,
        createdAt: now,
        updatedAt: now,
        createdBy: tenant.userId || 'system',
      };
      
      const blockSqlData = blockToSql(block, orgIdFinal);
      
      // Verificar se já existe block para este período
      const { data: existingBlock } = await client
        .from('blocks')
        .select('id')
        .eq('organization_id', orgIdFinal)
        .eq('property_id', body.propertyId)
        .eq('start_date', body.checkIn)
        .eq('end_date', body.checkOut)
        .maybeSingle();
      
      if (!existingBlock) {
        const { error: blockError } = await client
          .from('blocks')
          .insert(blockSqlData);
        
        if (blockError) {
          console.error('⚠️ [createReservation] Erro ao criar block no calendário:', blockError);
          // Não falhar a criação da reserva se o block falhar
        } else {
          logInfo(`Block created in calendar for reservation: ${id}`);
        }
      }
    } catch (blockError: any) {
      console.error('⚠️ [createReservation] Erro ao criar block no calendário:', blockError);
      // Não falhar a criação da reserva se o block falhar
    }

    logInfo(`Reservation created: ${id} in organization ${orgIdFinal}`);

    // ✅ AUTOMATIONS: Publicar evento de reserva criada
    if (organizationId) {
      try {
        const { publishReservationEvent } = await import('./services/event-bus.ts');
        await publishReservationEvent('created', organizationId, createdReservation);
      } catch (error) {
        logError('[createReservation] Erro ao publicar evento de automação', error);
        // Não falhar a criação da reserva se o evento falhar
      }
    }

    console.log('🎉 [createReservation] === SUCESSO ===');
    console.log('✅ Reserva criada:', createdReservation.id);
    
    return c.json(
      successResponse(createdReservation, 'Reservation created successfully'),
      201
    );
  } catch (error) {
    const err = error as any;
    console.error('💥 [createReservation] === ERRO ===');
    console.error('❌ Tipo:', err?.constructor?.name);
    console.error('❌ Mensagem:', err?.message);
    console.error('❌ Stack:', err?.stack);
    logError('Error creating reservation', err);
    return c.json(errorResponse('Failed to create reservation'), 500);
  }
}

// ============================================================================
// ATUALIZAR RESERVA
// ============================================================================

export async function updateReservation(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const id = c.req.param('id');
    const body = await c.req.json<UpdateReservationDTO>();
    logInfo(`Updating reservation: ${id} for tenant: ${tenant.username}`, body);

    // ✅ MIGRAÇÃO: Buscar reserva existente do SQL (com filtro multi-tenant)
    let query = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que reservation pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: existingRow, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [updateReservation] SQL error fetching:', fetchError);
      return c.json(errorResponse('Erro ao buscar reserva', { details: fetchError.message }), 500);
    }
    
    if (!existingRow) {
      return c.json(notFoundResponse('Reservation'), 404);
    }
    
    // ✅ Converter resultado SQL para Reservation (TypeScript)
    const existing = sqlToReservation(existingRow);

    // 🎯 v1.0.103.273 - Suporte para transferência de imóvel
    if (body.propertyId && body.propertyId !== existing.propertyId) {
      logInfo(`🔄 Transferring reservation ${id} from property ${existing.propertyId} to ${body.propertyId}`);
      
      // ✅ MIGRAÇÃO: Verificar se o novo imóvel existe no SQL (com filtro multi-tenant)
      let newPropertyQuery = client
        .from('properties')
        .select('id, pricing_base_price, pricing_currency, pricing_weekly_discount, pricing_biweekly_discount, pricing_monthly_discount')
        .eq('id', body.propertyId);
      
      if (tenant.type === 'imobiliaria') {
        // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
        const organizationId = await getOrganizationIdOrThrow(c);
        newPropertyQuery = newPropertyQuery.eq('organization_id', organizationId);
      }
      
      const { data: newPropertyRow, error: newPropertyError } = await newPropertyQuery.maybeSingle();
      
      if (newPropertyError || !newPropertyRow) {
        return c.json(
          errorResponse(`Target property ${body.propertyId} not found`),
          404
        );
      }
      
      // ✅ MIGRAÇÃO: Verificar conflitos no novo imóvel (SQL)
      let conflictQuery = client
        .from('reservations')
        .select('id, check_in, check_out')
        .neq('id', id) // Não verificar contra si mesmo
        .eq('property_id', body.propertyId)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`check_in.lt.${existing.checkOut},check_out.gt.${existing.checkIn}`);
      
      if (tenant.type === 'imobiliaria') {
        // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
        const organizationId = await getOrganizationIdOrThrow(c);
        conflictQuery = conflictQuery.eq('organization_id', organizationId);
      }
      
      const { data: conflicts, error: conflictError } = await conflictQuery;
      
      if (conflictError && conflictError.code !== 'PGRST116') {
        console.error('❌ [updateReservation] SQL error checking conflicts:', conflictError);
        return c.json(errorResponse('Erro ao verificar conflitos', { details: conflictError.message }), 500);
      }

      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0];
        return c.json(
          errorResponse(
            `OVERBOOKING BLOQUEADO: Já existe uma reserva (${conflict.id}) no imóvel de destino de ${conflict.check_in} a ${conflict.check_out}.`
          ),
          400
        );
      }
      
      logInfo(`✅ Transfer approved - no conflicts found`);
    }

    // Se mudando datas, recalcular preço E verificar conflitos
    let updatedPricing = existing.pricing;
    
    if (body.checkIn || body.checkOut) {
      const newCheckIn = body.checkIn || existing.checkIn;
      const newCheckOut = body.checkOut || existing.checkOut;
      
      const dateValidation = validateDateRange(newCheckIn, newCheckOut);
      if (!dateValidation.valid) {
        return c.json(validationErrorResponse(dateValidation.error!), 400);
      }

      // ✅ MIGRAÇÃO: Buscar property do SQL
      const { data: propertyRow, error: propertyError } = await client
        .from('properties')
        .select('id, pricing_base_price, pricing_currency, pricing_weekly_discount, pricing_biweekly_discount, pricing_monthly_discount')
        .eq('id', existing.propertyId)
        .maybeSingle();
      
      if (propertyError || !propertyRow) {
        return c.json(notFoundResponse('Property'), 404);
      }
      
      // ✅ Converter para Property (TypeScript) temporariamente
      const property: Property = {
        id: propertyRow.id,
        pricing: {
          basePrice: propertyRow.pricing_base_price,
          currency: propertyRow.pricing_currency,
          weeklyDiscount: propertyRow.pricing_weekly_discount,
          biweeklyDiscount: propertyRow.pricing_biweekly_discount,
          monthlyDiscount: propertyRow.pricing_monthly_discount,
        },
      } as Property;

      // ✅ MIGRAÇÃO: Verificar conflitos no SQL
      let conflictQuery = client
        .from('reservations')
        .select('id, check_in, check_out')
        .neq('id', id) // Não verificar contra si mesmo
        .eq('property_id', existing.propertyId)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`check_in.lt.${newCheckOut},check_out.gt.${newCheckIn}`);
      
      if (tenant.type === 'imobiliaria') {
        // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
        const organizationId = await getOrganizationIdOrThrow(c);
        conflictQuery = conflictQuery.eq('organization_id', organizationId);
      }
      
      const { data: conflicts, error: conflictError } = await conflictQuery;
      
      if (conflictError && conflictError.code !== 'PGRST116') {
        console.error('❌ [updateReservation] SQL error checking conflicts:', conflictError);
        return c.json(errorResponse('Erro ao verificar conflitos', { details: conflictError.message }), 500);
      }

      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0];
        return c.json(
          errorResponse(
            `OVERBOOKING BLOQUEADO: Já existe uma reserva (${conflict.id}) de ${conflict.check_in} a ${conflict.check_out}. Não é permitido sobrepor reservas.`
          ),
          400
        );
      }

      const nights = calculateNights(newCheckIn, newCheckOut);
      
      // ✅ NOVA ARQUITETURA: Tentar calcular preço via rate_plans (SQL)
      let pricing: {
        pricePerNight: number;
        baseTotal: number;
        discount: number;
        total: number;
        appliedTier: 'base' | 'weekly' | 'biweekly' | 'monthly';
      };
      
      const ratePlanPrice = await getStayPriceFromRatePlan(client, existing.propertyId, newCheckIn, newCheckOut);
      
      if (ratePlanPrice && ratePlanPrice.totalPrice > 0) {
        console.log('✅ [updateReservation] Usando preço via rate_plan:', ratePlanPrice.totalPrice);
        pricing = {
          pricePerNight: ratePlanPrice.averagePerNight,
          baseTotal: ratePlanPrice.totalPrice,
          discount: 0,
          total: ratePlanPrice.totalPrice,
          appliedTier: 'base'
        };
      } else {
        console.log('⚠️ [updateReservation] Fallback para cálculo legado de preço');
        pricing = calculateReservationPrice(property, nights);
      }
      
      updatedPricing = {
        ...existing.pricing,
        pricePerNight: pricing.pricePerNight,
        baseTotal: pricing.baseTotal,
        discount: pricing.discount,
        total: pricing.total,
        appliedTier: pricing.appliedTier,
      };
    }

    // Atualizar reserva
    // ✅ CORREÇÃO v1.0.103.900: Popular cancelledAt automaticamente quando status='cancelled'
    const nowIso = getCurrentDateTime();
    const isCancelling = body.status === 'cancelled' && existing.status !== 'cancelled';
    
    const updated: Reservation = {
      ...existing,
      ...(body.propertyId && { propertyId: body.propertyId }), // 🎯 v1.0.103.273 - Transferência
      ...(body.status && { status: body.status }),
      ...(body.checkIn && { checkIn: body.checkIn }),
      ...(body.checkOut && { checkOut: body.checkOut }),
      ...(body.checkIn || body.checkOut) && {
        nights: calculateNights(
          body.checkIn || existing.checkIn,
          body.checkOut || existing.checkOut
        ),
      },
      ...(body.adults !== undefined && {
        guests: {
          ...existing.guests,
          adults: body.adults,
          total: body.adults + existing.guests.children + existing.guests.infants,
        },
      }),
      ...(body.children !== undefined && {
        guests: {
          ...existing.guests,
          children: body.children,
          total: existing.guests.adults + body.children + existing.guests.infants,
        },
      }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.internalComments !== undefined && { 
        internalComments: body.internalComments 
      }),
      ...(body.paymentStatus && {
        payment: {
          ...existing.payment,
          status: body.paymentStatus,
        },
      }),
      // ✅ Cancelamento: popular campos automaticamente
      ...(isCancelling && {
        cancelledAt: nowIso,
        cancellationReason: 'Cancelada pelo usuário',
      }),
      pricing: updatedPricing,
      updatedAt: nowIso,
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    const organizationIdFromRow = (existingRow as any).organization_id; // Usar da reservation existente como padrão
    let organizationId = organizationIdFromRow;
    if (tenant.type === 'imobiliaria') {
      organizationId = await getOrganizationIdOrThrow(c);
    }
    
    // Converter para formato SQL
    const sqlData = reservationToSql(updated, organizationId);
    
    // Remover campos que não devem ser atualizados (id, organization_id, created_at, created_by)
    delete sqlData.id;
    delete sqlData.organization_id;
    delete sqlData.created_at;
    delete sqlData.created_by;
    
    // ✅ DEBUG v1.0.103.901: Log detalhado do payload antes do update
    console.log('🔍 [updateReservation] DEBUG sqlData:', JSON.stringify({
      status: sqlData.status,
      platform: sqlData.platform,
      payment_status: sqlData.payment_status,
      cancelled_at: sqlData.cancelled_at,
      cancelled_by: sqlData.cancelled_by,
      cancellation_reason: sqlData.cancellation_reason,
      platform_commission_type: sqlData.platform_commission_type,
      platform_partner_name: sqlData.platform_partner_name,
      isCancelling,
    }));
    
    // ✅ Fazer UPDATE no SQL (com filtro multi-tenant)
    let updateQuery = client
      .from('reservations')
      .update(sqlData)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que reservation pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      updateQuery = updateQuery.eq('organization_id', organizationId);
    }
    
    const { data: updatedRow, error: updateError } = await updateQuery
      .select(RESERVATION_SELECT_FIELDS)
      .single();
    
    if (updateError) {
      console.error('❌ [updateReservation] SQL error updating:', JSON.stringify({
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        reservationId: id,
        status: body.status,
      }));
      return c.json(errorResponse('Erro ao atualizar reserva', { 
        details: updateError.message,
        code: updateError.code,
        hint: updateError.hint,
      }), 500);
    }
    
    // ✅ Converter resultado SQL para Reservation (TypeScript)
    const updatedReservation = sqlToReservation(updatedRow);

    // ✅ Manter block espelho da reserva sincronizado (quando existir)
    // Observação: blocks com subtype=reservation também podem vir de iCal/StaysNet.
    // Aqui sincronizamos apenas o block criado pelo próprio fluxo de reservas do painel.
    try {
      const reservationBlockReason = `Reserva: ${id}`;
      const nowIso = getCurrentDateTime();
      const startYmd = String(updatedReservation.checkIn).split('T')[0];
      const endYmd = String(updatedReservation.checkOut).split('T')[0];
      const nights = calculateNights(startYmd, endYmd);

      // Tentativa 1: atualizar block existente por reason
      const { data: existingBlock, error: findBlockError } = await client
        .from('blocks')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('subtype', 'reservation')
        .eq('reason', reservationBlockReason)
        .maybeSingle();

      if (!findBlockError && existingBlock?.id) {
        await client
          .from('blocks')
          .update({
            property_id: updatedReservation.propertyId,
            start_date: startYmd,
            end_date: endYmd,
            nights,
            updated_at: nowIso,
            notes: `Reserva sincronizada: ${id}`,
          })
          .eq('id', existingBlock.id)
          .eq('organization_id', organizationId);
      }
    } catch (err) {
      console.warn('⚠️ [updateReservation] Falha ao sincronizar block da reserva:', err);
    }

    logInfo(`Reservation updated: ${id} in organization ${organizationId}`);

    return c.json(successResponse(updatedReservation, 'Reservation updated successfully'));
  } catch (error) {
    logError('Error updating reservation', error);
    return c.json(errorResponse('Failed to update reservation'), 500);
  }
}

// ============================================================================
// CANCELAR RESERVA
// ============================================================================

export async function cancelReservation(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const id = c.req.param('id');
    const { reason } = await c.req.json();
    logInfo(`Cancelling reservation: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar reserva do SQL (com filtro multi-tenant)
    let query = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que reservation pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: row, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [cancelReservation] SQL error fetching:', fetchError);
      return c.json(errorResponse('Erro ao buscar reserva', { details: fetchError.message }), 500);
    }
    
    if (!row) {
      return c.json(notFoundResponse('Reservation'), 404);
    }
    
    const reservation = sqlToReservation(row);

    // Verificar se pode cancelar
    if (['cancelled', 'completed'].includes(reservation.status)) {
      return c.json(
        errorResponse('Cannot cancel a reservation that is already cancelled or completed'),
        400
      );
    }

    // ✅ MIGRAÇÃO: Cancelar no SQL
    let updateQuery = client
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: tenant.userId || 'system',
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      updateQuery = updateQuery.eq('organization_id', organizationId);
    }
    
    const { data: updatedRow, error: updateError } = await updateQuery
      .select(RESERVATION_SELECT_FIELDS)
      .single();
    
    if (updateError) {
      console.error('❌ [cancelReservation] SQL error updating:', updateError);
      return c.json(errorResponse('Erro ao cancelar reserva', { details: updateError.message }), 500);
    }
    
    const cancelled = sqlToReservation(updatedRow);

    // ✅ Remover block espelho desta reserva (evita disponibilidade errada após cancelamento)
    try {
      const reservationBlockReason = `Reserva: ${id}`;
      await client
        .from('blocks')
        .delete()
        .eq('organization_id', (row as any).organization_id)
        .eq('subtype', 'reservation')
        .eq('reason', reservationBlockReason);
    } catch (err) {
      console.warn('⚠️ [cancelReservation] Falha ao remover block espelho da reserva:', err);
    }

    logInfo(`Reservation cancelled: ${id}`);

    return c.json(successResponse(cancelled, 'Reservation cancelled successfully'));
  } catch (error) {
    logError('Error cancelling reservation', error);
    return c.json(errorResponse('Failed to cancel reservation'), 500);
  }
}

// ============================================================================
// DELETAR RESERVA
// ============================================================================

export async function deleteReservation(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const id = c.req.param('id');
    logInfo(`Deleting reservation: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar reserva do SQL (com filtro multi-tenant)
    let query = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que reservation pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: row, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [deleteReservation] SQL error fetching:', fetchError);
      return c.json(errorResponse('Erro ao buscar reserva', { details: fetchError.message }), 500);
    }
    
    if (!row) {
      return c.json(notFoundResponse('Reservation'), 404);
    }
    
    const reservation = sqlToReservation(row);

    // Apenas permitir deletar se estiver cancelada ou pendente
    if (!['cancelled', 'pending'].includes(reservation.status)) {
      return c.json(
        errorResponse('Only cancelled or pending reservations can be deleted'),
        400
      );
    }

    // ✅ MIGRAÇÃO: Deletar do SQL (com filtro multi-tenant)
    let deleteQuery = client
      .from('reservations')
      .delete()
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      deleteQuery = deleteQuery.eq('organization_id', organizationId);
    }
    
    const { error: deleteError } = await deleteQuery;
    
    if (deleteError) {
      console.error('❌ [deleteReservation] SQL error deleting:', deleteError);
      return c.json(errorResponse('Erro ao deletar reserva', { details: deleteError.message }), 500);
    }

    // ✅ Remover block espelho desta reserva (quando existir)
    try {
      const reservationBlockReason = `Reserva: ${id}`;
      await client
        .from('blocks')
        .delete()
        .eq('organization_id', (row as any).organization_id)
        .eq('subtype', 'reservation')
        .eq('reason', reservationBlockReason);
    } catch (err) {
      console.warn('⚠️ [deleteReservation] Falha ao remover block espelho da reserva:', err);
    }

    logInfo(`Reservation deleted: ${id}`);

    return c.json(successResponse(null, 'Reservation deleted successfully'));
  } catch (error) {
    logError('Error deleting reservation', error);
    return c.json(errorResponse('Failed to delete reservation'), 500);
  }
}

// ============================================================================
// DETECTAR CONFLITOS DE OVERBOOKING
// ============================================================================

export async function detectConflicts(c: Context) {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    
    logInfo(`Detecting reservation conflicts for tenant: ${tenant.username} (${tenant.type})`);

    // ✅ MIGRAÇÃO: Buscar todas as reservas ativas do SQL (com filtro multi-tenant)
    let reservationsQuery = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS)
      .in('status', ['pending', 'confirmed', 'checked_in']);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, filtrar por organization_id
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      reservationsQuery = reservationsQuery.eq('organization_id', organizationId);
    }
    
    const { data: reservationRows, error: reservationsError } = await reservationsQuery;
    
    if (reservationsError) {
      console.error('❌ [detectConflicts] SQL error fetching reservations:', reservationsError);
      return c.json(errorResponse('Erro ao buscar reservas', { details: reservationsError.message }), 500);
    }

    // ✅ Converter resultados SQL para Reservation (TypeScript)
    const activeReservations = (reservationRows || []).map(sqlToReservation);

    // ✅ MIGRAÇÃO: Buscar todas as propriedades do SQL (com filtro multi-tenant)
    let propertiesQuery = client
      .from('properties')
      .select('id, title');
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      propertiesQuery = propertiesQuery.eq('organization_id', organizationId);
    }
    
    const { data: propertyRows, error: propertiesError } = await propertiesQuery;
    
    if (propertiesError) {
      console.error('❌ [detectConflicts] SQL error fetching properties:', propertiesError);
      return c.json(errorResponse('Erro ao buscar propriedades', { details: propertiesError.message }), 500);
    }

    // Criar mapa de propriedades (id -> name)
    const propertiesMap = new Map<string, string>();
    for (const prop of propertyRows || []) {
      propertiesMap.set(prop.id, (prop as any).name || prop.title || prop.id);
    }

    // Mapa: propertyId -> data -> array de reservas
    const occupancyMap = new Map<string, Map<string, Reservation[]>>();

    // Função para obter datas ocupadas (lógica hoteleira)
    const getOccupiedDates = (checkIn: string, checkOut: string): string[] => {
      const dates: string[] = [];
      const current = new Date(checkIn);
      current.setHours(0, 0, 0, 0);
      
      const end = new Date(checkOut);
      end.setHours(0, 0, 0, 0);
      
      // Check-in ocupa, check-out NÃO ocupa
      while (current < end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      
      return dates;
    };

    // Construir mapa de ocupação
    for (const reservation of activeReservations) {
      const occupiedDates = getOccupiedDates(reservation.checkIn, reservation.checkOut);

      if (!occupancyMap.has(reservation.propertyId)) {
        occupancyMap.set(reservation.propertyId, new Map());
      }

      const propertyMap = occupancyMap.get(reservation.propertyId)!;

      for (const date of occupiedDates) {
        if (!propertyMap.has(date)) {
          propertyMap.set(date, []);
        }
        propertyMap.get(date)!.push(reservation);
      }
    }

    // Detectar conflitos (2+ reservas na mesma data/propriedade)
    interface ConflictInfo {
      propertyId: string;
      propertyName: string;
      date: string;
      reservations: {
        id: string;
        guestId: string;
        checkIn: string;
        checkOut: string;
        platform: string;
        status: string;
      }[];
    }

    const conflicts: ConflictInfo[] = [];
    const conflictingReservationIds = new Set<string>();

    for (const [propertyId, dateMap] of occupancyMap.entries()) {
      for (const [date, reservationsOnDate] of dateMap.entries()) {
        if (reservationsOnDate.length > 1) {
          // CONFLITO DETECTADO!
          const propertyName = propertiesMap.get(propertyId) || `Propriedade ${propertyId}`;

          conflicts.push({
            propertyId,
            propertyName,
            date,
            reservations: reservationsOnDate.map(r => ({
              id: r.id,
              guestId: r.guestId,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              platform: r.platform,
              status: r.status,
            })),
          });

          // Marcar todas as reservas como conflitantes
          for (const reservation of reservationsOnDate) {
            conflictingReservationIds.add(reservation.id);
          }
        }
      }
    }

    logInfo(`Found ${conflicts.length} conflicts affecting ${conflictingReservationIds.size} reservations`);

    return c.json(successResponse({
      conflictsCount: conflicts.length,
      affectedReservations: conflictingReservationIds.size,
      conflicts,
      conflictingReservationIds: Array.from(conflictingReservationIds),
    }));
  } catch (error) {
    logError('Error detecting conflicts', error);
    return c.json(errorResponse('Failed to detect conflicts'), 500);
  }
}
