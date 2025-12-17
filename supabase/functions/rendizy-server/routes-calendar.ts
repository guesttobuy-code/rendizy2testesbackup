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

// ============================================================================
// BUSCAR DADOS DO CALENDÁRIO
// ============================================================================

export async function getCalendarData(c: Context) {
  try {
    // ✅ MELHORIA v1.0.103.400 - Usa tenancyMiddleware para autenticação e multi-tenant
    const tenant = getTenant(c);
    
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const propertyIdsParam = c.req.query('propertyIds');
    const includeBlocks = c.req.query('includeBlocks') !== 'false';
    const includePrices = c.req.query('includePrices') !== 'false';

    if (!startDate || !endDate) {
      return c.json(
        validationErrorResponse('startDate and endDate are required'),
        400
      );
    }

    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    logInfo(`Getting calendar data for tenant: ${tenant.username} (${startDate} to ${endDate})`);

    // Buscar propriedades
    let properties = await kv.getByPrefix<Property>('property:');
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, filtrar por imobiliariaId
    // ⚠️ ATENÇÃO: Property ainda não tem imobiliariaId direto
    // Por enquanto, todas as propriedades são visíveis para todos
    // TODO: Adicionar campo imobiliariaId em Property quando migrar para Postgres
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      // ⚠️ WORKAROUND: Por enquanto, não filtra por imobiliariaId pois Property não tem esse campo
      console.log(`⚠️ [getCalendarData] Filtro por imobiliariaId não implementado ainda - Property não tem imobiliariaId`);
      // Por enquanto, todas as propriedades são visíveis (comportamento antigo)
    }
    
    // Se for superadmin, ver todas (já carregou todas acima)
    if (isSuperAdmin(c)) {
      logInfo(`SuperAdmin viewing all ${properties.length} properties`);
    }
    
    // Filtrar por IDs específicos se fornecido
    if (propertyIdsParam) {
      const propertyIds = propertyIdsParam.split(',');
      properties = properties.filter(p => propertyIds.includes(p.id));
    }

    // Apenas propriedades ativas
    properties = properties.filter(p => p.isActive);

    // Buscar reservas no período
    const allReservations = await kv.getByPrefix<Reservation>('reservation:');
    const reservations = allReservations.filter(r => 
      datesOverlap(startDate, endDate, r.checkIn, r.checkOut) &&
      !['cancelled'].includes(r.status)
    );

    // Buscar bloqueios se solicitado
    let blocks: Block[] = [];
    if (includeBlocks) {
      const allBlocks = await kv.getByPrefix<Block>('block:');
      blocks = allBlocks.filter(b => 
        datesOverlap(startDate, endDate, b.startDate, b.endDate)
      );
    }

    // Buscar preços customizados se solicitado
    let customPrices: CustomPrice[] = [];
    if (includePrices) {
      const allPrices = await kv.getByPrefix<CustomPrice>('customprice:');
      customPrices = allPrices.filter(p => 
        isDateInRange(p.date, startDate, endDate)
      );
    }

    // Buscar mínimos de noites customizados
    const allMinNights = await kv.getByPrefix<CustomMinNights>('customminnight:');
    const customMinNights = allMinNights.filter(m => 
      isDateInRange(m.date, startDate, endDate)
    );

    return c.json(successResponse({
      properties,
      reservations,
      blocks,
      customPrices,
      customMinNights,
      dateRange: {
        startDate,
        endDate,
      },
    }));
  } catch (error) {
    logError('Error getting calendar data', error);
    return c.json(errorResponse('Failed to get calendar data'), 500);
  }
}

// ============================================================================
// ESTATÍSTICAS DO CALENDÁRIO
// ============================================================================

export async function getCalendarStats(c: Context) {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!startDate || !endDate) {
      return c.json(
        validationErrorResponse('startDate and endDate are required'),
        400
      );
    }

    logInfo(`Getting calendar stats: ${startDate} to ${endDate}`);

    const properties = await kv.getByPrefix<Property>('property:');
    const activeProperties = properties.filter(p => p.isActive);

    const allReservations = await kv.getByPrefix<Reservation>('reservation:');
    const reservations = allReservations.filter(r => 
      datesOverlap(startDate, endDate, r.checkIn, r.checkOut) &&
      ['confirmed', 'checked_in', 'checked_out', 'completed'].includes(r.status)
    );

    const allBlocks = await kv.getByPrefix<Block>('block:');
    const blocks = allBlocks.filter(b => 
      datesOverlap(startDate, endDate, b.startDate, b.endDate)
    );

    // Calcular noites ocupadas
    const totalDays = getDatesInRange(startDate, endDate).length;
    const totalPossibleNights = activeProperties.length * totalDays;

    let occupiedNights = 0;
    for (const reservation of reservations) {
      const overlapStart = reservation.checkIn > startDate ? reservation.checkIn : startDate;
      const overlapEnd = reservation.checkOut < endDate ? reservation.checkOut : endDate;
      occupiedNights += getDatesInRange(overlapStart, overlapEnd).length;
    }

    // Receita total
    const totalRevenue = reservations.reduce(
      (sum, r) => sum + r.pricing.total,
      0
    );

    // Taxa de ocupação
    const occupancyRate = totalPossibleNights > 0
      ? (occupiedNights / totalPossibleNights) * 100
      : 0;

    const stats: CalendarStats = {
      totalProperties: activeProperties.length,
      totalReservations: reservations.length,
      totalBlocks: blocks.length,
      occupiedNights,
      availableNights: totalPossibleNights - occupiedNights,
      totalRevenue,
      occupancyRate,
    };

    return c.json(successResponse(stats));
  } catch (error) {
    logError('Error getting calendar stats', error);
    return c.json(errorResponse('Failed to get calendar stats'), 500);
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
