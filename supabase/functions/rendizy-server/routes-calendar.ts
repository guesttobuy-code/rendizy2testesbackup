// ============================================================================
// ROTAS DE CALENDÁRIO
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
// ============================================================================

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import type {
  Property,
  Reservation,
  Block,
  CalendarQuery,
  CalendarStats,
  CreateBlockDTO,
  BulkUpdatePricesDTO,
  BulkUpdateMinNightsDTO,
  CustomPrice,
  CustomMinNights,
} from './types.ts';
import {
  generateBlockId,
  generatePriceId,
  getCurrentDateTime,
  validateDateRange,
  getDatesInRange,
  isDateInRange,
  datesOverlap,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  logInfo,
  logError,
} from './utils.ts';
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
import { getTenant, isSuperAdmin } from './utils-tenancy.ts';
import { getSupabaseClient } from './kv_store.tsx';
import { sqlToBlock, blockToSql, BLOCK_SELECT_FIELDS } from './utils-block-mapper.ts';
import { sqlToReservation, RESERVATION_SELECT_FIELDS } from './utils-reservation-mapper.ts';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';

// ============================================================================
// LISTAR BLOQUEIOS (LEGADO KV)
// ============================================================================

export async function getBlocks(c: Context) {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let blocks = await kv.getByPrefix<Block>('block:');

    if (startDate && endDate) {
      blocks = blocks.filter(b =>
        datesOverlap(startDate, endDate, b.startDate, b.endDate)
      );
    }

    return c.json(successResponse(blocks));
  } catch (error) {
    logError('Error getting blocks', error);
    return c.json(errorResponse('Failed to get blocks'), 500);
  }
}

// ============================================================================
// BUSCAR DADOS DO CALENDÁRIO
// ============================================================================

export async function getCalendarData(c: Context) {
  try {
    // ✅ CANÔNICO (SQL): calendário deve refletir tabelas `reservations` e `blocks`
    // (imports StaysNet já persistem em SQL)
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const propertyIdsParam = c.req.query('propertyIds');
    const includeBlocks = c.req.query('includeBlocks') !== 'false';
    const includePrices = c.req.query('includePrices') !== 'false';

    if (!startDate || !endDate) {
      return c.json(validationErrorResponse('startDate and endDate are required'), 400);
    }

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    // ⚠️ tenancyMiddleware deve ter rodado; usa org resolvida por regras de multi-tenant
    const client = getSupabaseClient(c as any);
    const organizationId = await getOrganizationIdForRequest(c as any);

    const propertyIds = propertyIdsParam
      ? propertyIdsParam
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    // Reservas no período (SQL) - retorno mantém shape legado
    let reservations: Reservation[] = [];
    try {
      let rq = client
        .from('reservations')
        .select(RESERVATION_SELECT_FIELDS)
        .eq('organization_id', organizationId)
        .lte('check_in', endDate)
        .gte('check_out', startDate);

      if (propertyIds.length > 0) {
        rq = rq.in('property_id', propertyIds);
      }

      const { data: rows, error } = await rq;
      if (!error && rows) {
        reservations = rows.map(sqlToReservation);
      }
    } catch {
      // Não falhar calendário por reservas; blocks é o crítico para governança
    }

    // Bloqueios no período (SQL)
    let blocks: Block[] = [];
    if (includeBlocks) {
      let bq = client
        .from('blocks')
        .select(BLOCK_SELECT_FIELDS)
        .eq('organization_id', organizationId)
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .order('start_date', { ascending: true });

      if (propertyIds.length > 0) {
        bq = bq.in('property_id', propertyIds);
      }

      const { data: rows, error } = await bq;
      if (error) {
        return c.json(errorResponse('Failed to get calendar blocks', { details: error.message }), 500);
      }
      blocks = (rows || []).map(sqlToBlock);
    }

    // Preços ainda são legado (KV) - por enquanto vazio para estabilidade
    const customPrices: CustomPrice[] = includePrices ? [] : [];
    const customMinNights: CustomMinNights[] = [];
    const properties: Property[] = [];

    return c.json(
      successResponse({
        properties,
        reservations,
        blocks,
        customPrices,
        customMinNights,
        dateRange: { startDate, endDate },
      })
    );
  } catch (error) {
    logError('Error getting calendar data', error);
    return c.json(errorResponse('Failed to get calendar data'), 500);
  }
}

// ============================================================================
// CANÔNICO (SQL) - EXPORTS USADOS PELO ENTRYPOINT
// ============================================================================

export async function getCalendarDataSql(c: Context) {
  return getCalendarData(c);
}

// ============================================================================
// ESTATÍSTICAS DO CALENDÁRIO
// ============================================================================

export async function getCalendarStats(c: Context) {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!startDate || !endDate) {
      return c.json(validationErrorResponse('startDate and endDate are required'), 400);
    }

    const client = getSupabaseClient(c as any);
    const organizationId = await getOrganizationIdForRequest(c as any);

    // Contagem simples (sem cálculo pesado) - suficiente para UI evitar 404
    const [{ count: blocksCount }, { count: reservationsCount }] = await Promise.all([
      client
        .from('blocks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .lte('start_date', endDate)
        .gte('end_date', startDate),
      client
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .lte('check_in', endDate)
        .gte('check_out', startDate),
    ]);

    const stats: CalendarStats = {
      totalProperties: 0,
      totalReservations: Number(reservationsCount || 0),
      totalBlocks: Number(blocksCount || 0),
      occupiedNights: 0,
      availableNights: 0,
      totalRevenue: 0,
      occupancyRate: 0,
    };

    return c.json(successResponse(stats));
  } catch (error) {
    logError('Error getting calendar stats', error);
    return c.json(errorResponse('Failed to get calendar stats'), 500);
  }
}

export async function getCalendarStatsSql(c: Context) {
  return getCalendarStats(c);
}

// ============================================================================
// BLOQUEIOS (SQL) VIA /calendar/blocks
// ============================================================================

export async function getCalendarBlocksSql(c: Context) {
  try {
    const startDate = c.req.query('startDate') || c.req.query('start_date');
    const endDate = c.req.query('endDate') || c.req.query('end_date');
    const propertyIdsParam = c.req.query('propertyIds') || c.req.query('property_ids') || c.req.query('propertyIds');

    const client = getSupabaseClient(c as any);
    const organizationId = await getOrganizationIdForRequest(c as any);

    let q = client
      .from('blocks')
      .select(BLOCK_SELECT_FIELDS)
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: true });

    if (propertyIdsParam) {
      const ids = String(propertyIdsParam)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (ids.length > 0) q = q.in('property_id', ids);
    }

    if (startDate && endDate) {
      q = q.lte('start_date', String(endDate)).gte('end_date', String(startDate));
    }

    const { data: rows, error } = await q;
    if (error) {
      return c.json(errorResponse('Failed to get blocks', { details: error.message }), 500);
    }

    return c.json(successResponse((rows || []).map(sqlToBlock)));
  } catch (error) {
    logError('Error getting blocks (SQL)', error);
    return c.json(errorResponse('Failed to get blocks'), 500);
  }
}

export async function createCalendarBlockSql(c: Context) {
  try {
    const client = getSupabaseClient(c as any);
    const organizationId = await getOrganizationIdForRequest(c as any);
    const body: any = await c.req.json();

    const propertyId = String(body?.propertyId || body?.property_id || '').trim();
    const startDate = String(body?.startDate || body?.start_date || '').trim();
    const endDate = String(body?.endDate || body?.end_date || '').trim();
    const subtype = body?.subtype;
    const reason = String(body?.reason || '').trim();
    const notes = body?.notes;

    if (!propertyId || !startDate || !endDate) {
      return c.json(validationErrorResponse('propertyId, startDate and endDate are required'), 400);
    }

    const now = new Date().toISOString();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const block: Block = {
      id: crypto.randomUUID(),
      propertyId,
      startDate,
      endDate,
      nights,
      type: 'block',
      subtype: subtype || 'simple',
      reason: reason || 'Bloqueio',
      notes,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
    };

    const { error } = await client.from('blocks').insert(blockToSql(block, organizationId));
    if (error) {
      return c.json(errorResponse('Failed to create block', { details: error.message }), 500);
    }

    return c.json(successResponse(block));
  } catch (error) {
    logError('Error creating block (SQL)', error);
    return c.json(errorResponse('Failed to create block'), 500);
  }
}

export async function deleteCalendarBlockSql(c: Context) {
  try {
    const id = c.req.param('id');
    const client = getSupabaseClient(c as any);
    const organizationId = await getOrganizationIdForRequest(c as any);

    const { error } = await client.from('blocks').delete().eq('organization_id', organizationId).eq('id', id);
    if (error) {
      return c.json(errorResponse('Failed to delete block', { details: error.message }), 500);
    }

    return c.json(successResponse({ id }));
  } catch (error) {
    logError('Error deleting block (SQL)', error);
    return c.json(errorResponse('Failed to delete block'), 500);
  }
}

// ============================================================================
// CRIAR BLOQUEIO
// ============================================================================

export async function createBlock(c: Context) {
  try {
    const body = await c.req.json<CreateBlockDTO>();
    logInfo('Creating block', body);

    if (!body.propertyId || !body.startDate || !body.endDate) {
      return c.json(
        validationErrorResponse('propertyId, startDate, and endDate are required'),
        400
      );
    }

    const dateValidation = validateDateRange(body.startDate, body.endDate);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    // Verificar se propriedade existe
    const property = await kv.get<Property>(`property:${body.propertyId}`);
    if (!property) {
      return c.json(notFoundResponse('Property'), 404);
    }

    // Verificar conflitos com reservas existentes
    const allReservations = await kv.getByPrefix<Reservation>('reservation:');
    const conflict = allReservations.find(r => 
      r.propertyId === body.propertyId &&
      ['pending', 'confirmed', 'checked_in'].includes(r.status) &&
      datesOverlap(body.startDate, body.endDate, r.checkIn, r.checkOut)
    );

    if (conflict) {
      return c.json(
        errorResponse('Cannot create block: conflicts with existing reservation'),
        400
      );
    }

    // Criar bloqueio
    const id = generateBlockId();
    const now = getCurrentDateTime();
    const nights = getDatesInRange(body.startDate, body.endDate).length;

    const block: Block = {
      id,
      propertyId: body.propertyId,
      startDate: body.startDate,
      endDate: body.endDate,
      nights,
      type: body.type,
      reason: body.reason,
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system', // TODO: Get from auth
    };

    await kv.set(`block:${id}`, block);

    logInfo(`Block created: ${id}`);

    return c.json(successResponse(block, 'Block created successfully'), 201);
  } catch (error) {
    logError('Error creating block', error);
    return c.json(errorResponse('Failed to create block'), 500);
  }
}

// ============================================================================
// DELETAR BLOQUEIO
// ============================================================================

export async function deleteBlock(c: Context) {
  try {
    const id = c.req.param('id');
    logInfo(`Deleting block: ${id}`);

    const block = await kv.get<Block>(`block:${id}`);
    if (!block) {
      return c.json(notFoundResponse('Block'), 404);
    }

    await kv.del(`block:${id}`);

    logInfo(`Block deleted: ${id}`);

    return c.json(successResponse(null, 'Block deleted successfully'));
  } catch (error) {
    logError('Error deleting block', error);
    return c.json(errorResponse('Failed to delete block'), 500);
  }
}

// ============================================================================
// ATUALIZAR PREÇOS EM LOTE
// ============================================================================

export async function bulkUpdatePrices(c: Context) {
  try {
    const body = await c.req.json<BulkUpdatePricesDTO>();
    logInfo('Bulk updating prices', body);

    if (!body.propertyIds || body.propertyIds.length === 0) {
      return c.json(
        validationErrorResponse('At least one property ID is required'),
        400
      );
    }

    const dateValidation = validateDateRange(body.startDate, body.endDate);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    // Gerar todas as datas no intervalo
    const dates = getDatesInRange(body.startDate, body.endDate);

    const createdPrices: CustomPrice[] = [];

    for (const propertyId of body.propertyIds) {
      // Verificar se propriedade existe
      const property = await kv.get<Property>(`property:${propertyId}`);
      if (!property) continue;

      for (const date of dates) {
        // Calcular novo preço
        let newPrice: number;

        if (body.price !== undefined) {
          // Preço fixo
          newPrice = body.price;
        } else if (body.adjustment) {
          // Ajuste percentual sobre o preço base
          const basePrice = property.pricing.basePrice;
          const adjustmentAmount = Math.round(
            basePrice * (body.adjustment.value / 100)
          );
          newPrice = body.adjustment.type === 'increase'
            ? basePrice + adjustmentAmount
            : basePrice - adjustmentAmount;
        } else {
          continue;
        }

        // Criar ou atualizar preço customizado
        const priceId = `${propertyId}_${date}`;
        const customPrice: CustomPrice = {
          id: priceId,
          propertyId,
          date,
          price: newPrice,
          type: 'special',
          reason: body.reason,
          createdAt: getCurrentDateTime(),
          updatedAt: getCurrentDateTime(),
          createdBy: 'system', // TODO: Get from auth
        };

        await kv.set(`customprice:${priceId}`, customPrice);
        createdPrices.push(customPrice);
      }
    }

    logInfo(`Bulk updated ${createdPrices.length} prices`);

    return c.json(successResponse({
      count: createdPrices.length,
      prices: createdPrices,
    }, `${createdPrices.length} prices updated successfully`));
  } catch (error) {
    logError('Error bulk updating prices', error);
    return c.json(errorResponse('Failed to bulk update prices'), 500);
  }
}

// ============================================================================
// ATUALIZAR MÍNIMO DE NOITES EM LOTE
// ============================================================================

export async function bulkUpdateMinNights(c: Context) {
  try {
    const body = await c.req.json<BulkUpdateMinNightsDTO>();
    logInfo('Bulk updating min nights', body);

    if (!body.propertyIds || body.propertyIds.length === 0) {
      return c.json(
        validationErrorResponse('At least one property ID is required'),
        400
      );
    }

    if (body.minNights < 1) {
      return c.json(
        validationErrorResponse('Minimum nights must be at least 1'),
        400
      );
    }

    const dateValidation = validateDateRange(body.startDate, body.endDate);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    const dates = getDatesInRange(body.startDate, body.endDate);
    const createdMinNights: CustomMinNights[] = [];

    for (const propertyId of body.propertyIds) {
      // Verificar se propriedade existe
      const property = await kv.get<Property>(`property:${propertyId}`);
      if (!property) continue;

      for (const date of dates) {
        const minNightId = `${propertyId}_${date}`;
        const customMinNight: CustomMinNights = {
          id: minNightId,
          propertyId,
          date,
          minNights: body.minNights,
          reason: body.reason,
          createdAt: getCurrentDateTime(),
          updatedAt: getCurrentDateTime(),
          createdBy: 'system', // TODO: Get from auth
        };

        await kv.set(`customminnight:${minNightId}`, customMinNight);
        createdMinNights.push(customMinNight);
      }
    }

    logInfo(`Bulk updated ${createdMinNights.length} min nights`);

    return c.json(successResponse({
      count: createdMinNights.length,
      minNights: createdMinNights,
    }, `${createdMinNights.length} minimum nights updated successfully`));
  } catch (error) {
    logError('Error bulk updating min nights', error);
    return c.json(errorResponse('Failed to bulk update min nights'), 500);
  }
}

// ============================================================================
// DELETAR PREÇOS CUSTOMIZADOS
// ============================================================================

export async function deleteCustomPrices(c: Context) {
  try {
    const { propertyIds, startDate, endDate } = await c.req.json();
    logInfo('Deleting custom prices');

    if (!propertyIds || !startDate || !endDate) {
      return c.json(
        validationErrorResponse('propertyIds, startDate, and endDate are required'),
        400
      );
    }

    const dates = getDatesInRange(startDate, endDate);
    const priceIds: string[] = [];

    for (const propertyId of propertyIds) {
      for (const date of dates) {
        priceIds.push(`customprice:${propertyId}_${date}`);
      }
    }

    await kv.mdel(priceIds);

    logInfo(`Deleted ${priceIds.length} custom prices`);

    return c.json(successResponse(
      { count: priceIds.length },
      `${priceIds.length} custom prices deleted successfully`
    ));
  } catch (error) {
    logError('Error deleting custom prices', error);
    return c.json(errorResponse('Failed to delete custom prices'), 500);
  }
}
