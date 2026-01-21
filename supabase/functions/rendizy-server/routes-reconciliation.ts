/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  📊 ROTAS DE RECONCILIAÇÃO DE RESERVAS — v1.0.113                            ║
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
 * ║  GET  /reconciliation/compare/:organizationId         - Compara Stays x DB   ║
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
import { getSupabaseClient } from './kv_store.tsx';

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

// ============================================================================
// 🔍 COMPARE: Comparação direta Stays x Rendizy (DIAGNÓSTICO)
// ============================================================================

/**
 * GET /reconciliation/compare/:organizationId
 * 
 * Compara reservas do Stays.net com o banco Rendizy.
 * Identifica exatamente quais reservas estão faltando ou divergentes.
 * 
 * Query params:
 * - date: data para comparar (YYYY-MM-DD, default: hoje)
 * - dateType: arrival|departure|both (default: both)
 */
export async function handleCompareStaysVsRendizy(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
    const dateType = c.req.query('dateType') || 'both';

    console.log(`[Compare] Stays vs Rendizy for org=${organizationId}, date=${date}, dateType=${dateType}`);

    // 1. Buscar da API do Stays
    const staysLogin = Deno.env.get('STAYS_API_LOGIN') || 'a5146970';
    const staysSecret = Deno.env.get('STAYS_API_SECRET') || 'bfcf4daf';
    const staysAuth = btoa(`${staysLogin}:${staysSecret}`);
    const staysBaseUrl = 'https://bvm.stays.net/external/v1';

    const staysArrivals: any[] = [];
    const staysDepartures: any[] = [];

    if (dateType === 'arrival' || dateType === 'both') {
      const arrResp = await fetch(
        `${staysBaseUrl}/booking/reservations?from=${date}&to=${date}&dateType=arrival`,
        { headers: { Authorization: `Basic ${staysAuth}` } }
      );
      if (arrResp.ok) {
        const arrData = await arrResp.json();
        staysArrivals.push(...(Array.isArray(arrData) ? arrData : arrData.results || []));
      }
    }

    if (dateType === 'departure' || dateType === 'both') {
      const depResp = await fetch(
        `${staysBaseUrl}/booking/reservations?from=${date}&to=${date}&dateType=departure`,
        { headers: { Authorization: `Basic ${staysAuth}` } }
      );
      if (depResp.ok) {
        const depData = await depResp.json();
        staysDepartures.push(...(Array.isArray(depData) ? depData : depData.results || []));
      }
    }

    // 2. Buscar do Rendizy
    const supabase = getSupabaseClient();
    
    const [arrQuery, depQuery, issuesQuery] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, staysnet_reservation_code, status, check_in, check_out, property_id')
        .eq('organization_id', organizationId)
        .eq('check_in', date)
        .not('status', 'in', '("cancelled","no_show","blocked","maintenance")'),
      supabase
        .from('reservations')
        .select('id, staysnet_reservation_code, status, check_in, check_out, property_id')
        .eq('organization_id', organizationId)
        .eq('check_out', date)
        .not('status', 'in', '("cancelled","no_show","blocked","maintenance")'),
      supabase
        .from('staysnet_import_issues')
        .select('id, reservation_code, listing_id, check_in, check_out, status, message')
        .eq('organization_id', organizationId)
        .eq('status', 'open'),
    ]);

    const rendizyArrivals = arrQuery.data || [];
    const rendizyDepartures = depQuery.data || [];
    const openIssues = issuesQuery.data || [];

    // 3. Cruzar dados
    const staysArrCodes = staysArrivals.map((r: any) => r.id);
    const staysDepCodes = staysDepartures.map((r: any) => r.id);
    const rendizyArrCodes = rendizyArrivals.map((r: any) => r.staysnet_reservation_code);
    const rendizyDepCodes = rendizyDepartures.map((r: any) => r.staysnet_reservation_code);
    const issueCodes = openIssues.map((i: any) => i.reservation_code);

    // Faltantes no Rendizy (estão no Stays mas não no Rendizy)
    const missingArrivals = staysArrCodes.filter((c: string) => !rendizyArrCodes.includes(c));
    const missingDepartures = staysDepCodes.filter((c: string) => !rendizyDepCodes.includes(c));

    // Detalhar reservas faltantes
    const missingArrDetails = staysArrivals
      .filter((r: any) => missingArrivals.includes(r.id))
      .map((r: any) => ({
        code: r.id,
        staysId: r._id,
        listingId: r._idlisting,
        type: r.type,
        checkIn: r.checkInDate,
        checkOut: r.checkOutDate,
        partner: r.partner?.name,
        hasOpenIssue: issueCodes.includes(r.id),
      }));

    const missingDepDetails = staysDepartures
      .filter((r: any) => missingDepartures.includes(r.id))
      .map((r: any) => ({
        code: r.id,
        staysId: r._id,
        listingId: r._idlisting,
        type: r.type,
        checkIn: r.checkInDate,
        checkOut: r.checkOutDate,
        partner: r.partner?.name,
        hasOpenIssue: issueCodes.includes(r.id),
      }));

    return c.json(successResponse({
      date,
      summary: {
        stays: {
          arrivals: staysArrivals.length,
          departures: staysDepartures.length,
        },
        rendizy: {
          arrivals: rendizyArrivals.length,
          departures: rendizyDepartures.length,
        },
        missing: {
          arrivals: missingArrivals.length,
          departures: missingDepartures.length,
        },
        openIssues: openIssues.length,
      },
      details: {
        missingArrivals: missingArrDetails,
        missingDepartures: missingDepDetails,
        openIssues: openIssues.map((i: any) => ({
          code: i.reservation_code,
          listingId: i.listing_id,
          checkIn: i.check_in,
          checkOut: i.check_out,
          message: i.message,
        })),
      },
      staysCodes: {
        arrivals: staysArrCodes,
        departures: staysDepCodes,
      },
      rendizyCodes: {
        arrivals: rendizyArrCodes,
        departures: rendizyDepCodes,
      },
    }));
  } catch (error: any) {
    logError('Error comparing Stays vs Rendizy', error);
    return c.json(errorResponse('Failed to compare', { details: error?.message }), 500);
  }
}

// ============================================================================
// 🔄 FORCE SYNC: Importar reservas específicas do Stays forçadamente
// ============================================================================

/**
 * POST /reconciliation/force-sync/:organizationId
 * 
 * Força a importação de reservas específicas do Stays.net
 * Útil quando webhooks falham ou para corrigir divergências.
 * 
 * Body:
 * - reservationCodes: array de códigos de reserva (ex: ["FO29J", "FO28J"])
 * 
 * Retorna resultado da importação para cada reserva.
 */
export async function handleForceSyncReservations(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    let body: any = {};
    try {
      body = await c.req.json();
    } catch { /* empty body */ }

    const reservationCodes: string[] = body.reservationCodes || [];
    if (!reservationCodes.length) {
      return c.json(errorResponse('reservationCodes array is required'), 400);
    }

    console.log(`[ForceSync] Starting for org=${organizationId}, codes=${reservationCodes.join(', ')}`);

    // Carregar config do Stays
    const staysLogin = Deno.env.get('STAYS_API_LOGIN') || 'a5146970';
    const staysSecret = Deno.env.get('STAYS_API_SECRET') || 'bfcf4daf';
    const staysAuth = btoa(`${staysLogin}:${staysSecret}`);
    const staysBaseUrl = 'https://bvm.stays.net/external/v1';

    const supabase = getSupabaseClient();
    const results: any[] = [];

    for (const code of reservationCodes) {
      try {
        // 1. Buscar reserva do Stays
        const staysResp = await fetch(
          `${staysBaseUrl}/booking/reservations/${encodeURIComponent(code)}`,
          { headers: { Authorization: `Basic ${staysAuth}` } }
        );

        if (!staysResp.ok) {
          results.push({
            code,
            success: false,
            error: `Stays API returned ${staysResp.status}`,
          });
          continue;
        }

        const staysData = await staysResp.json();
        if (!staysData || !staysData._id) {
          results.push({
            code,
            success: false,
            error: 'Invalid response from Stays API',
          });
          continue;
        }

        // 2. Extrair listing ID
        const listingId = staysData._idlisting || staysData._id_listing || staysData.propertyId;
        if (!listingId) {
          results.push({
            code,
            success: false,
            error: 'No listing ID in reservation',
          });
          continue;
        }

        // 3. Resolver property_id no Rendizy
        const lookups = [
          { label: 'staysnet_property_id', needle: { externalIds: { staysnet_property_id: listingId } } },
          { label: 'staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: listingId } } },
          { label: 'staysnet_raw._id', needle: { staysnet_raw: { _id: listingId } } },
        ];

        let propertyId: string | null = null;
        for (const l of lookups) {
          const { data: row } = await supabase
            .from('properties')
            .select('id')
            .eq('organization_id', organizationId)
            .contains('data', l.needle)
            .maybeSingle();

          if (row?.id) {
            propertyId = row.id;
            console.log(`[ForceSync] Found property via ${l.label}: ${propertyId}`);
            break;
          }
        }

        if (!propertyId) {
          results.push({
            code,
            success: false,
            error: `Property not found for listing ${listingId}. Imóvel precisa ser mapeado primeiro.`,
            listingId,
            staysListingName: staysData.listing?.internalName || 'N/A',
          });
          continue;
        }

        // 4. Mapear e inserir/atualizar reserva
        const checkIn = staysData.checkInDate;
        const checkOut = staysData.checkOutDate;
        const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

        // Mapear status
        let status = 'confirmed';
        const type = String(staysData.type || '').toLowerCase();
        if (type === 'canceled' || type === 'cancelled') status = 'cancelled';
        else if (type === 'blocked') status = 'blocked';

        // Mapear plataforma
        let platform = 'direct';
        const partnerName = String(staysData.partner?.name || '').toLowerCase();
        if (partnerName.includes('airbnb')) platform = 'airbnb';
        else if (partnerName.includes('booking')) platform = 'booking';
        else if (partnerName.includes('decolar') || partnerName.includes('despegar')) platform = 'decolar';
        else if (partnerName.includes('expedia')) platform = 'expedia';

        // Preços em centavos
        const priceTotal = Math.round((staysData.price?._f_total || 0) * 100);
        const pricePerNight = Math.round((staysData.price?.hostingDetails?._f_nightPrice || 0) * 100);

        // Usar um UUID fixo para robôs/sistemas (criado_pelo_sistema)
        const systemUserId = '00000000-0000-0000-0000-000000000000';

        const reservationData = {
          organization_id: organizationId,
          property_id: propertyId,
          external_id: staysData._id,
          platform,
          staysnet_reservation_code: code,
          staysnet_listing_id: listingId,
          staysnet_type: type,
          staysnet_raw: staysData,
          check_in: checkIn,
          check_out: checkOut,
          nights,
          status,
          pricing_total: priceTotal,
          pricing_price_per_night: pricePerNight,
          pricing_currency: staysData.price?.currency || 'BRL',
          guests_total: staysData.guests || 1,
          guests_adults: staysData.guestsDetails?.adults || staysData.guests || 1,
          guests_children: staysData.guestsDetails?.children || 0,
          guests_infants: staysData.guestsDetails?.infants || 0,
          created_by: systemUserId,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from('reservations')
          .upsert(reservationData, { onConflict: 'organization_id,platform,external_id' });

        if (upsertErr) {
          results.push({
            code,
            success: false,
            error: `Upsert failed: ${upsertErr.message}`,
          });
          continue;
        }

        results.push({
          code,
          success: true,
          propertyId,
          platform,
          checkIn,
          checkOut,
          status,
        });

      } catch (err: any) {
        results.push({
          code,
          success: false,
          error: err?.message || String(err),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return c.json(successResponse({
      message: `Force sync completed: ${successCount} success, ${failCount} failed`,
      results,
    }));
  } catch (error: any) {
    logError('Error in force sync', error);
    return c.json(errorResponse('Force sync failed', { details: error?.message }), 500);
  }
}

// ============================================================================
// 🔄 AUTO-SYNC: Reconciliação automática completa
// ============================================================================

/**
 * POST /reconciliation/auto-sync/:organizationId
 * 
 * Executa reconciliação automática completa:
 * 1. Compara Stays.net com Rendizy
 * 2. Identifica reservas faltantes
 * 3. Sincroniza automaticamente as reservas faltantes
 * 
 * Query params:
 * - date: data para reconciliar (default: hoje, formato YYYY-MM-DD)
 * 
 * Útil para chamar via CRON ou após webhooks atrasados.
 */
export async function handleAutoSync(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const targetDate = c.req.query('date') || new Date().toISOString().split('T')[0];
    console.log(`[AutoSync] 🚀 Starting for org=${organizationId}, date=${targetDate}`);

    // 1. Carregar configurações
    const staysLogin = Deno.env.get('STAYS_API_LOGIN') || 'a5146970';
    const staysSecret = Deno.env.get('STAYS_API_SECRET') || 'bfcf4daf';
    const staysAuth = btoa(`${staysLogin}:${staysSecret}`);
    const staysBaseUrl = 'https://bvm.stays.net/external/v1';

    const supabase = getSupabaseClient();

    // 2. Buscar reservas do Stays.net com check-in ou check-out no período
    // API Stays.net usa: from, to, dateType=arrival/departure
    
    // Buscar arrivals (check-in na data)
    const arrivalsResp = await fetch(
      `${staysBaseUrl}/booking/reservations?from=${targetDate}&to=${targetDate}&dateType=arrival`,
      { headers: { Authorization: `Basic ${staysAuth}` } }
    );
    
    // Buscar departures (check-out na data)
    const departuresResp = await fetch(
      `${staysBaseUrl}/booking/reservations?from=${targetDate}&to=${targetDate}&dateType=departure`,
      { headers: { Authorization: `Basic ${staysAuth}` } }
    );

    if (!arrivalsResp.ok || !departuresResp.ok) {
      const errDetails = {
        arrivals: arrivalsResp.ok ? 'ok' : `${arrivalsResp.status}`,
        departures: departuresResp.ok ? 'ok' : `${departuresResp.status}`,
      };
      console.error('[AutoSync] API error:', errDetails);
      return c.json(errorResponse('Failed to fetch from Stays.net', errDetails), 500);
    }

    const arrivalsData = await arrivalsResp.json();
    const departuresData = await departuresResp.json();

    // API pode retornar array direto ou { results: [...] }
    const staysArrivals: any[] = Array.isArray(arrivalsData) ? arrivalsData : (arrivalsData.results || []);
    const staysDepartures: any[] = Array.isArray(departuresData) ? departuresData : (departuresData.results || []);

    // Filtrar apenas reservas válidas (booked, confirmed, new)
    const validTypes = ['booked', 'confirmed', 'new'];
    const filteredArrivals = staysArrivals.filter(r => validTypes.includes(String(r._type || r.type).toLowerCase()));
    const filteredDepartures = staysDepartures.filter(r => validTypes.includes(String(r._type || r.type).toLowerCase()));

    // Extrair códigos únicos
    const staysArrivalCodes = [...new Set(filteredArrivals.map(r => r._code || r.code))].filter(Boolean);
    const staysDepartureCodes = [...new Set(filteredDepartures.map(r => r._code || r.code))].filter(Boolean);

    console.log(`[AutoSync] Stays: ${staysArrivalCodes.length} arrivals, ${staysDepartureCodes.length} departures`);

    // 3. Buscar reservas do Rendizy
    const { data: rendizyArrivals } = await supabase
      .from('reservations')
      .select('confirmation_code')
      .eq('organization_id', organizationId)
      .eq('check_in', targetDate)
      .not('status', 'eq', 'cancelled');

    const { data: rendizyDepartures } = await supabase
      .from('reservations')
      .select('confirmation_code')
      .eq('organization_id', organizationId)
      .eq('check_out', targetDate)
      .not('status', 'eq', 'cancelled');

    const rendizyArrivalCodes = (rendizyArrivals || []).map(r => r.confirmation_code).filter(Boolean);
    const rendizyDepartureCodes = (rendizyDepartures || []).map(r => r.confirmation_code).filter(Boolean);

    console.log(`[AutoSync] Rendizy: ${rendizyArrivalCodes.length} arrivals, ${rendizyDepartureCodes.length} departures`);

    // 4. Encontrar faltantes
    const missingArrivals = staysArrivalCodes.filter((code: string) => !rendizyArrivalCodes.includes(code));
    const missingDepartures = staysDepartureCodes.filter((code: string) => !rendizyDepartureCodes.includes(code));

    console.log(`[AutoSync] Missing: ${missingArrivals.length} arrivals, ${missingDepartures.length} departures`);

    // 5. Sincronizar reservas faltantes
    const allMissing = [...new Set([...missingArrivals, ...missingDepartures])];
    const syncResults: any[] = [];

    for (const code of allMissing) {
      try {
        // Buscar detalhes da reserva
        const staysResp = await fetch(
          `${staysBaseUrl}/booking/reservations/${encodeURIComponent(code)}`,
          { headers: { Authorization: `Basic ${staysAuth}` } }
        );

        if (!staysResp.ok) {
          syncResults.push({ code, success: false, error: `Stays API ${staysResp.status}` });
          continue;
        }

        const staysData = await staysResp.json();
        if (!staysData || !staysData._id) {
          syncResults.push({ code, success: false, error: 'Invalid Stays response' });
          continue;
        }

        const listingId = staysData._idlisting || staysData._id_listing || staysData.propertyId;
        if (!listingId) {
          syncResults.push({ code, success: false, error: 'No listing ID' });
          continue;
        }

        // Resolver property_id
        let propertyId: string | null = null;
        const lookups = [
          { externalIds: { staysnet_property_id: listingId } },
          { externalIds: { staysnet_listing_id: listingId } },
          { staysnet_raw: { _id: listingId } },
        ];

        for (const needle of lookups) {
          const { data: row } = await supabase
            .from('properties')
            .select('id')
            .eq('organization_id', organizationId)
            .contains('data', needle)
            .maybeSingle();
          if (row?.id) {
            propertyId = row.id;
            break;
          }
        }

        if (!propertyId) {
          // Tentar anuncios_ultimate
          for (const needle of lookups) {
            const { data: row } = await supabase
              .from('anuncios_ultimate')
              .select('id')
              .eq('organization_id', organizationId)
              .contains('data', needle)
              .maybeSingle();
            if (row?.id) {
              propertyId = row.id;
              break;
            }
          }
        }

        if (!propertyId) {
          syncResults.push({ code, success: false, error: 'Property not found', listingId });
          continue;
        }

        // Mapear dados
        const checkIn = (staysData._checkin || staysData.checkIn || '').split('T')[0];
        const checkOut = (staysData._checkout || staysData.checkOut || '').split('T')[0];
        const platform = (staysData._partner || staysData.partner || 'staysnet').toLowerCase();
        const staysStatus = String(staysData._type || staysData.type || staysData.status || '').toLowerCase();
        
        const statusMap: Record<string, string> = {
          booked: 'confirmed', confirmed: 'confirmed', new: 'confirmed',
          pending: 'pending', inquiry: 'pending',
          cancelled: 'cancelled', canceled: 'cancelled',
          checked_in: 'checked_in', checkedin: 'checked_in',
          checked_out: 'checked_out', checkedout: 'checked_out',
        };
        const status = statusMap[staysStatus] || 'pending';

        const reservationData = {
          organization_id: organizationId,
          property_id: propertyId,
          external_id: staysData._id,
          platform: platform.includes('airbnb') ? 'airbnb' : platform.includes('booking') ? 'booking' : 'staysnet',
          confirmation_code: code,
          check_in: checkIn,
          check_out: checkOut,
          status,
          guest_name: staysData._gname || staysData.guestName || 'Unknown',
          guest_email: staysData._gemail || staysData.guestEmail || null,
          guest_phone: staysData._gphone || staysData.guestPhone || null,
          adults: Number(staysData._nadults || staysData.adults || 1),
          children: Number(staysData._nchildren || staysData.children || 0),
          pricing_total: Math.round((Number(staysData._f_total?._f_val || staysData.total || 0)) * 100),
          raw_data: staysData,
          updated_at: new Date().toISOString(),
        };

        const { error: upsertErr } = await supabase
          .from('reservations')
          .upsert(reservationData, { onConflict: 'organization_id,platform,external_id' });

        if (upsertErr) {
          syncResults.push({ code, success: false, error: upsertErr.message });
        } else {
          syncResults.push({ code, success: true, propertyId, platform, checkIn, checkOut, status });
        }

      } catch (err: any) {
        syncResults.push({ code, success: false, error: err?.message || String(err) });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failCount = syncResults.filter(r => !r.success).length;

    return c.json(successResponse({
      message: `AutoSync completed for ${targetDate}`,
      date: targetDate,
      stays: {
        arrivals: staysArrivalCodes.length,
        departures: staysDepartureCodes.length,
      },
      rendizy: {
        arrivals: rendizyArrivalCodes.length,
        departures: rendizyDepartureCodes.length,
      },
      missing: {
        arrivals: missingArrivals.length,
        departures: missingDepartures.length,
        total: allMissing.length,
      },
      synced: {
        success: successCount,
        failed: failCount,
      },
      results: syncResults,
    }));
  } catch (error: any) {
    logError('Error in auto-sync', error);
    return c.json(errorResponse('Auto-sync failed', { details: error?.message }), 500);
  }
}

