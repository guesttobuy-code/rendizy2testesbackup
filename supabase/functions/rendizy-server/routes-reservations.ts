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

    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS);
    
    // ✅ REGRA MESTRE: Filtrar por organization_id (superadmin = Rendizy master, outros = sua organização)
    const organizationId = await getOrganizationIdForRequest(c);
    const orgIdFinal = organizationId || RENDIZY_MASTER_ORG_ID;
    query = query.eq('organization_id', orgIdFinal);
    logInfo(`✅ [listReservations] Filtering reservations by organization_id: ${orgIdFinal}`);
    
    // Aplicar filtros de query params
    const propertyIdFilter = c.req.query('propertyId');
    const guestIdFilter = c.req.query('guestId');
    const statusFilter = c.req.query('status');
    const platformFilter = c.req.query('platform');
    const checkInFromFilter = c.req.query('checkInFrom');
    const checkInToFilter = c.req.query('checkInTo');
    
    if (propertyIdFilter) {
      query = query.eq('property_id', propertyIdFilter);
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
    
    // Ordenar por check_in DESC (mais recente primeiro)
    query = query.order('check_in', { ascending: false });
    
    const { data: rows, error } = await query;
    
    if (error) {
      console.error('❌ [listReservations] SQL error:', error);
      return c.json(errorResponse('Erro ao buscar reservas', { details: error.message }), 500);
    }
    
    // ✅ Converter resultados SQL para Reservation (TypeScript)
    const reservations = (rows || []).map(sqlToReservation);

    logInfo(`Found ${reservations.length} reservations`);

    return c.json(successResponse(reservations));
  } catch (error) {
    logError('Error listing reservations', error);
    return c.json(errorResponse('Failed to list reservations'), 500);
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
      .from('anuncios_ultimate')
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
    const body = await c.req.json<AvailabilityCheck>();
    logInfo('Checking availability', body);

    const { propertyId, checkIn, checkOut } = body;

    // Validar datas
    const dateValidation = validateDateRange(checkIn, checkOut);
    if (!dateValidation.valid) {
      return c.json(validationErrorResponse(dateValidation.error!), 400);
    }

    // Verificar se propriedade existe
    const property = await kv.get<Property>(`property:${propertyId}`);
    if (!property) {
      return c.json(notFoundResponse('Property'), 404);
    }

    // Verificar restrições da propriedade
    const nights = calculateNights(checkIn, checkOut);
    if (nights < property.restrictions.minNights) {
      const response: AvailabilityResponse = {
        available: false,
        reason: `Minimum ${property.restrictions.minNights} nights required`,
      };
      return c.json(successResponse(response));
    }

    // Buscar reservas existentes
    const allReservations = await kv.getByPrefix<Reservation>('reservation:');
    const propertyReservations = allReservations.filter(
      r => r.propertyId === propertyId &&
      ['pending', 'confirmed', 'checked_in'].includes(r.status)
    );

    // Verificar conflitos
    const conflict = propertyReservations.find(r => 
      datesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
    );

    if (conflict) {
      const response: AvailabilityResponse = {
        available: false,
        reason: 'Property is already booked for these dates',
        conflictingReservation: {
          id: conflict.id,
          checkIn: conflict.checkIn,
          checkOut: conflict.checkOut,
        },
      };
      return c.json(successResponse(response));
    }

    // Buscar bloqueios
    const allBlocks = await kv.getByPrefix('block:');
    const propertyBlocks = allBlocks.filter(
      (b: any) => b.propertyId === propertyId
    );

    const blockConflict = propertyBlocks.find((b: any) =>
      datesOverlap(checkIn, checkOut, b.startDate, b.endDate)
    );

    if (blockConflict) {
      const response: AvailabilityResponse = {
        available: false,
        reason: `Property is blocked (${blockConflict.reason})`,
      };
      return c.json(successResponse(response));
    }

    // Disponível!
    const response: AvailabilityResponse = {
      available: true,
    };

    return c.json(successResponse(response));
  } catch (error) {
    logError('Error checking availability', error);
    return c.json(errorResponse('Failed to check availability'), 500);
  }
}

// ============================================================================
// CALCULAR PREÇO DA RESERVA
// ============================================================================

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

  // Determinar tier aplicável
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
    
    // ✅ CORREÇÃO CRÍTICA: Buscar em anuncios_drafts (onde estão os imóveis ativos)
    let propertyQuery = client
      .from('anuncios_drafts')
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
      console.warn('⚠️ [createReservation] Propriedade não encontrada em anuncios_drafts, tentando anuncios_ultimate...', body.propertyId);
      let fallbackQuery = client
        .from('anuncios_ultimate')
        .select('id, title, data, organization_id')
        .eq('id', body.propertyId);
      if (tenant.type === 'imobiliaria' || tenant.type === 'superadmin') {
        fallbackQuery = fallbackQuery.eq('organization_id', orgIdFinal);
      }
      const { data: ultimateRow, error: ultimateErr } = await fallbackQuery.maybeSingle();
      if (ultimateErr) {
        console.error('❌ [createReservation] SQL error fetching property (ultimate):', ultimateErr);
        return c.json(errorResponse('Erro ao buscar propriedade', { details: ultimateErr.message }), 500);
      }
      if (!ultimateRow) {
        console.error('❌ [createReservation] Propriedade não encontrada em nenhuma tabela:', body.propertyId);
        return c.json(notFoundResponse('Property'), 404);
      }
      propertyRow = ultimateRow;
    }
    
    console.log('✅ [createReservation] Propriedade encontrada:', propertyRow.id, propertyRow.title);
    
    // ✅ Extrair dados de pricing do campo data (JSONB)
    const propertyData = propertyRow.data || {};
    const basePrice = propertyData.preco_base_noite || propertyData.valor_aluguel || 100; // Fallback
    
    // ✅ Converter para Property (TypeScript) temporariamente para calcular preço
    const property: Property = {
      id: propertyRow.id,
      pricing: {
        basePrice: basePrice,
        currency: propertyData.moeda || 'BRL',
        weeklyDiscount: propertyData.desconto_semanal || 0,
        biweeklyDiscount: 0,
        monthlyDiscount: propertyData.desconto_mensal || 0,
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

    // Calcular preço
    const pricing = calculateReservationPrice(property, nights);

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
        cleaningFee: 0,
        serviceFee: 0,
        taxes: 0,
        discount: pricing.discount,
        total: pricing.total,
        currency: property.pricing.currency,
        appliedTier: pricing.appliedTier,
      },
      
      status: 'pending',
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
      const blockId = `blk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      
      const blockSqlData = blockToSql(block, organizationId);
      
      // Verificar se já existe block para este período
      const { data: existingBlock } = await client
        .from('blocks')
        .select('id')
        .eq('organization_id', organizationId)
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

    logInfo(`Reservation created: ${id} in organization ${organizationId}`);

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
        .from('anuncios_ultimate')
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
        .from('anuncios_ultimate')
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
      const pricing = calculateReservationPrice(property, nights);
      
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
      pricing: updatedPricing,
      updatedAt: getCurrentDateTime(),
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
      console.error('❌ [updateReservation] SQL error updating:', updateError);
      return c.json(errorResponse('Erro ao atualizar reserva', { details: updateError.message }), 500);
    }
    
    // ✅ Converter resultado SQL para Reservation (TypeScript)
    const updatedReservation = sqlToReservation(updatedRow);

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
      .from('anuncios_ultimate')
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
