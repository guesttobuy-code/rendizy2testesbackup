// ============================================================================
// ROTAS DE HÓSPEDES
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
// ============================================================================

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import type { Guest, CreateGuestDTO } from './types.ts';
import {
  generateGuestId,
  getCurrentDateTime,
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeCPF,
  isValidEmail,
  isValidPhone,
  generateFullName,
  matchesSearch,
  logInfo,
  logError,
  calculatePagination,
} from './utils.ts';
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
import { getTenant, isSuperAdmin } from './utils-tenancy.ts';
import { getSupabaseClient } from './kv_store.tsx';
// ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
import { guestToSql, sqlToGuest, GUEST_SELECT_FIELDS } from './utils-guest-mapper.ts';
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { sqlToReservation, RESERVATION_SELECT_FIELDS } from './utils-reservation-mapper.ts';

// ============================================================================
// LISTAR TODOS OS HÓSPEDES
// ============================================================================

export async function listGuests(c: Context) {
  try {
    // ✅ CORREÇÃO v1.0.103.338 (14-12-2025): Passar contexto para getSupabaseClient
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    
    logInfo(`Listing guests for tenant: ${tenant.username} (${tenant.type})`);

    // Paginação opcional
    const pageParam = c.req.query('page');
    const limitParam = c.req.query('limit');
    const wantsPagination = pageParam !== undefined || limitParam !== undefined;
    const page = Math.max(1, Number(pageParam || 1));
    const limit = Math.max(1, Math.min(200, Number(limitParam || (c.req.query('search') ? 50 : 200))));
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS, wantsPagination ? { count: 'exact' } : undefined);
    
    // ✅ REGRA MESTRE: Filtrar por organization_id (superadmin = Rendizy master, outros = sua organização)
    const organizationId = await getOrganizationIdForRequest(c);
    query = query.eq('organization_id', organizationId);
    logInfo(`✅ [listGuests] Filtering guests by organization_id: ${organizationId}`);
    
    // Filtro por blacklist
    const isBlacklistedFilter = c.req.query('blacklisted');
    if (isBlacklistedFilter !== undefined) {
      const blacklisted = isBlacklistedFilter === 'true';
      query = query.eq('is_blacklisted', blacklisted);
    }
    
    // Filtro por busca (texto)
    // ✅ IMPORTANTE: aplicar no SQL para escalar (evita carregar tudo e filtrar em memória)
    const search = (c.req.query('search') || '').trim();
    if (search) {
      const q = sanitizeString(search).trim().toLowerCase();
      const qDigits = q.replace(/\D+/g, '');
      // PostgREST OR syntax (supabase-js): "col.op.value,col.op.value"
      const clauses: string[] = [];
      const like = `%${q.replace(/,/g, ' ')}%`;
      clauses.push(`first_name.ilike.${like}`);
      clauses.push(`last_name.ilike.${like}`);
      clauses.push(`email.ilike.${like}`);
      if (qDigits) {
        clauses.push(`phone.ilike.%${qDigits}%`);
        clauses.push(`cpf.ilike.%${qDigits}%`);
      } else {
        clauses.push(`phone.ilike.${like}`);
      }
      query = query.or(clauses.join(','));
    }

    // Filtro por propriedade + período (via reservas)
    const propertyIdsFilter = c.req.query('propertyIds');
    const startDateFilter = c.req.query('startDate');
    const endDateFilter = c.req.query('endDate');

    if (propertyIdsFilter || startDateFilter || endDateFilter) {
      const reservationQuery = client
        .from('reservations')
        .select('guest_id')
        .eq('organization_id', organizationId);

      if (propertyIdsFilter) {
        const ids = propertyIdsFilter
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
        if (ids.length > 0) {
          reservationQuery.in('property_id', ids);
        }
      }

      if (startDateFilter) {
        reservationQuery.gte('check_out', startDateFilter);
      }

      if (endDateFilter) {
        reservationQuery.lte('check_in', endDateFilter);
      }

      const { data: reservationRows, error: reservationError } = await reservationQuery;
      if (reservationError) {
        console.error('❌ [listGuests] Error loading reservations for filter:', reservationError);
        return c.json(errorResponse('Erro ao filtrar hóspedes por reservas', { details: reservationError.message }), 500);
      }

      const guestIds = Array.from(
        new Set((reservationRows || []).map((r: any) => r?.guest_id).filter(Boolean))
      );

      if (guestIds.length === 0) {
        const pagination = wantsPagination
          ? calculatePagination(0, page, limit)
          : undefined;
        return c.json({
          ...successResponse([]),
          ...(pagination ? { pagination } : {})
        });
      }

      query = query.in('id', guestIds);
    }

    // Limite / paginação (protege performance em orgs com muitos hóspedes)
    if (wantsPagination) {
      query = query.range(rangeFrom, rangeTo);
    } else {
      query = query.limit(Number.isFinite(limit) ? limit : (search ? 50 : 200));
    }

    // Ordenar por nome (first_name, last_name)
    query = query.order('first_name', { ascending: true });
    query = query.order('last_name', { ascending: true });
    
    const { data: rows, error, count } = await query;
    
    if (error) {
      console.error('❌ [listGuests] SQL error:', error);
      return c.json(errorResponse('Erro ao buscar hóspedes', { details: error.message }), 500);
    }
    
    // ✅ Converter resultados SQL para Guest (TypeScript)
    const guests = (rows || []).map(sqlToGuest);

    logInfo(`Found ${guests.length} guests`);

    const pagination = wantsPagination
      ? calculatePagination(count ?? guests.length, page, limit)
      : undefined;

    return c.json({
      ...successResponse(guests),
      ...(pagination ? { pagination } : {})
    });
  } catch (error) {
    console.error('❌ [listGuests] ERRO COMPLETO:', error);
    console.error('❌ [listGuests] Stack:', error?.stack);
    logError('Error listing guests', error);
    return c.json(errorResponse('Failed to list guests', { 
      details: error?.message || String(error),
      stack: error?.stack?.split('\n').slice(0, 3).join('\n') 
    }), 500);
  }
}

// ============================================================================
// BUSCA GLOBAL (cross-org) POR IDENTIFICADORES (email/telefone/cpf)
// ============================================================================

type GlobalGuestSuggestion = Guest & {
  isGlobalSuggestion?: boolean;
  cpf?: string;
};

function normalizeDigits(v: string): string {
  return (v || '').replace(/\D+/g, '');
}

function looksLikeEmail(v: string): boolean {
  return v.includes('@') && v.includes('.');
}

/**
 * Busca global por hóspedes em outras organizações.
 * ⚠️ Deliberadamente restrita: só ativa com email OU telefone/CPF (dígitos).
 * Isso evita enumeração por nome.
 */
export async function globalSearchGuests(c: Context) {
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);

    const raw = (c.req.query('search') || '').trim();
    const search = sanitizeString(raw).trim();
    const digits = normalizeDigits(search);
    const isEmail = looksLikeEmail(search);
    const isPhoneLike = digits.length >= 8;
    const isCpfLike = digits.length === 11;

    if (!search) {
      return c.json(successResponse([]));
    }

    // Regras anti-enumeração (mínimo de informação forte)
    if (!isEmail && !isPhoneLike && !isCpfLike) {
      logInfo(`[globalSearchGuests] blocked weak query for tenant ${tenant.username}`);
      return c.json(successResponse([]));
    }

    const limitRaw = c.req.query('limit');
    const limit = Math.max(1, Math.min(20, limitRaw ? Number(limitRaw) : 20));

    let query = client
      .from('guests')
      .select('first_name,last_name,email,phone,cpf')
      .limit(Number.isFinite(limit) ? limit : 20);

    const clauses: string[] = [];
    if (isEmail) {
      const q = search.toLowerCase().replace(/,/g, ' ');
      clauses.push(`email.ilike.%${q}%`);
    }
    if (digits) {
      clauses.push(`phone.ilike.%${digits}%`);
      clauses.push(`cpf.ilike.%${digits}%`);
    }

    if (clauses.length === 0) {
      return c.json(successResponse([]));
    }
    query = query.or(clauses.join(','));

    // Ordena levemente para determinismo
    query = query.order('first_name', { ascending: true });
    query = query.order('last_name', { ascending: true });

    const { data: rows, error } = await query;
    if (error) {
      console.error('❌ [globalSearchGuests] SQL error:', error);
      return c.json(errorResponse('Erro ao buscar hóspedes (global)', { details: error.message }), 500);
    }

    const seen = new Set<string>();
    const suggestions: GlobalGuestSuggestion[] = [];

    for (const r of rows || []) {
      const email = (r.email || '').toString().trim().toLowerCase();
      const phone = (r.phone || '').toString().trim();
      const cpf = (r.cpf || '').toString().trim();
      const key = [
        email ? `e:${email}` : '',
        phone ? `p:${normalizeDigits(phone)}` : '',
        cpf ? `c:${normalizeDigits(cpf)}` : '',
      ].filter(Boolean).join('|');

      if (!key || seen.has(key)) continue;
      seen.add(key);

      const firstName = (r.first_name || '').toString();
      const lastName = (r.last_name || '').toString();
      const fullName = `${firstName} ${lastName}`.trim() || 'Sem nome';

      suggestions.push({
        id: `global:${key}`,
        firstName,
        lastName,
        fullName,
        email: email || '',
        phone: phone || '',
        cpf: cpf || undefined,
        stats: {
          totalReservations: 0,
          totalNights: 0,
          totalSpent: 0,
          averageRating: undefined,
          lastStayDate: undefined,
        },
        preferences: undefined,
        tags: [],
        isBlacklisted: false,
        notes: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'global_suggestion',
        isGlobalSuggestion: true,
      });
    }

    return c.json(successResponse(suggestions));
  } catch (error) {
    console.error('❌ [globalSearchGuests] ERRO COMPLETO:', error);
    return c.json(errorResponse('Failed to global-search guests', { details: error?.message || String(error) }), 500);
  }
}

// ============================================================================
// GARANTIR HÓSPEDE NA ORGANIZAÇÃO ATUAL (a partir de sugestão global)
// ============================================================================

export async function ensureGuestForOrganization(c: Context) {
  try {
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const organizationId = await getOrganizationIdForRequest(c);

    const body = await c.req.json<{
      firstName?: string;
      lastName?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      cpf?: string;
    }>();

    const email = body.email ? sanitizeEmail(body.email) : '';
    const phone = body.phone ? sanitizePhone(body.phone) : '';
    const cpf = body.cpf ? sanitizeCPF(body.cpf) : '';

    // Requer identificador forte (pra não virar criação por digitação de nome)
    if ((!email || !isValidEmail(email)) && (!phone || !isValidPhone(phone)) && (!cpf || cpf.length < 11)) {
      return c.json(validationErrorResponse('Email/telefone/CPF válido é obrigatório para reutilizar hóspede'), 400);
    }

    // 1) Tenta achar hóspede existente nesta organização
    let existingQuery = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS)
      .eq('organization_id', organizationId);

    const ors: string[] = [];
    if (email && isValidEmail(email)) ors.push(`email.ilike.${email.toLowerCase()}`);
    const digits = normalizeDigits(phone);
    if (digits && digits.length >= 8) ors.push(`phone.ilike.%${digits}%`);
    const cpfDigits = normalizeDigits(cpf);
    if (cpfDigits && cpfDigits.length === 11) ors.push(`cpf.ilike.%${cpfDigits}%`);
    if (ors.length > 0) existingQuery = existingQuery.or(ors.join(','));

    const { data: foundRows, error: findError } = await existingQuery.limit(1);
    if (findError) {
      console.error('❌ [ensureGuestForOrganization] SQL error finding guest:', findError);
      return c.json(errorResponse('Erro ao verificar hóspede existente', { details: findError.message }), 500);
    }
    if (foundRows && foundRows.length > 0) {
      return c.json(successResponse(sqlToGuest(foundRows[0])));
    }

    // 2) Cria hóspede novo nesta organização (com dados reaproveitados)
    const firstName = sanitizeString(body.firstName || (body.fullName || '').split(' ')[0] || '');
    const lastName = sanitizeString(body.lastName || (body.fullName || '').split(' ').slice(1).join(' ') || '');
    if (!firstName) {
      return c.json(validationErrorResponse('First name is required'), 400);
    }
    if (!email || !isValidEmail(email)) {
      return c.json(validationErrorResponse('Valid email is required'), 400);
    }
    if (!phone || !isValidPhone(phone)) {
      return c.json(validationErrorResponse('Valid phone is required'), 400);
    }

    const id = generateGuestId();
    const now = getCurrentDateTime();
    const guest: Guest = {
      id,
      firstName,
      lastName,
      fullName: generateFullName(firstName, lastName),
      email,
      phone,
      cpf: cpf || undefined,
      passport: undefined,
      rg: undefined,
      address: undefined,
      birthDate: undefined,
      nationality: undefined,
      language: 'pt-BR',
      stats: { totalReservations: 0, totalNights: 0, totalSpent: 0 },
      preferences: undefined,
      tags: [],
      isBlacklisted: false,
      notes: undefined,
      createdAt: now,
      updatedAt: now,
      // ✅ CHECK constraint: guests.source IN ('airbnb','booking','decolar','direct','other')
      source: 'other',
    };

    const sqlRow = guestToSql(guest, organizationId);
    const { data: inserted, error: insertError } = await client
      .from('guests')
      .insert(sqlRow)
      .select(GUEST_SELECT_FIELDS)
      .single();

    if (insertError) {
      console.error('❌ [ensureGuestForOrganization] SQL error inserting guest:', insertError);
      return c.json(errorResponse('Erro ao criar hóspede', { details: insertError.message }), 500);
    }

    logInfo(`✅ [ensureGuestForOrganization] created guest ${guest.id} for org ${organizationId} (tenant ${tenant.username})`);
    return c.json(successResponse(sqlToGuest(inserted)));
  } catch (error) {
    console.error('❌ [ensureGuestForOrganization] ERRO COMPLETO:', error);
    return c.json(errorResponse('Failed to ensure guest', { details: error?.message || String(error) }), 500);
  }
}

// ============================================================================
// BUSCAR HÓSPEDE POR ID
// ============================================================================

export async function getGuest(c: Context) {
  try {
    // ✅ CORREÇÃO v1.0.103.338: Passar contexto para getSupabaseClient
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const id = c.req.param('id');
    logInfo(`Getting guest: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: row, error } = await query.maybeSingle();
    
    if (error) {
      console.error('❌ [getGuest] SQL error:', error);
      return c.json(errorResponse('Erro ao buscar hóspede', { details: error.message }), 500);
    }
    
    if (!row) {
      return c.json(notFoundResponse('Guest'), 404);
    }
    
    // ✅ Converter resultado SQL para Guest (TypeScript)
    const guest = sqlToGuest(row);

    // ✅ VERIFICAR PERMISSÃO: Se for imobiliária, garantir que guest pertence à organização
    // (já filtrado na query SQL acima, mas validar novamente para segurança)
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      // ✅ Multi-tenant garantido pela query SQL (já filtra por organization_id)
      logInfo(`Guest ${id} belongs to organization ${tenant.imobiliariaId}`);
    }

    return c.json(successResponse(guest));
  } catch (error) {
    logError('Error getting guest', error);
    return c.json(errorResponse('Failed to get guest'), 500);
  }
}

// ============================================================================
// CRIAR NOVO HÓSPEDE
// ============================================================================

export async function createGuest(c: Context) {
  try {
    // ✅ CORREÇÃO CRÍTICA v1.0.103.338 (14-12-2025 22:54): Passar contexto para getSupabaseClient
    // Sem o contexto (c), o RLS não funciona e a query falha!
    // Alinhado com routes-anuncios.ts que usa getSupabaseClient(c)
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const body = await c.req.json<CreateGuestDTO>();
    logInfo(`Creating guest for tenant: ${tenant.username}`, body);

    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    let organizationId: string | undefined;
    if (tenant.type !== 'superadmin') {
      organizationId = await getOrganizationIdOrThrow(c);
    }

    // Validações
    if (!body.firstName || !body.lastName) {
      return c.json(
        validationErrorResponse('First name and last name are required'),
        400
      );
    }

    if (!body.email || !isValidEmail(body.email)) {
      return c.json(
        validationErrorResponse('Valid email is required'),
        400
      );
    }

    if (!body.phone || !isValidPhone(body.phone)) {
      return c.json(
        validationErrorResponse('Valid phone is required'),
        400
      );
    }

    // ✅ MIGRAÇÃO: Verificar se email já existe no SQL (com filtro multi-tenant)
    let emailQuery = client
      .from('guests')
      .select('id')
      .ilike('email', body.email.toLowerCase());
    
    // ✅ FILTRO MULTI-TENANT: Verificar email apenas dentro da organização
    if (organizationId) {
      emailQuery = emailQuery.eq('organization_id', organizationId);
    }
    
    const { data: emailCheck, error: emailError } = await emailQuery.maybeSingle();
    
    if (emailError && emailError.code !== 'PGRST116') {
      console.error('❌ [createGuest] SQL error checking email:', emailError);
      return c.json(errorResponse('Erro ao verificar email', { details: emailError.message }), 500);
    }
    
    if (emailCheck) {
      return c.json(
        validationErrorResponse('A guest with this email already exists'),
        400
      );
    }

    // Criar hóspede
    const id = generateGuestId();
    const now = getCurrentDateTime();

    const guest: Guest = {
      id,
      firstName: sanitizeString(body.firstName),
      lastName: sanitizeString(body.lastName),
      fullName: generateFullName(body.firstName, body.lastName),
      email: sanitizeEmail(body.email),
      phone: sanitizePhone(body.phone),
      
      cpf: body.cpf ? sanitizeCPF(body.cpf) : undefined,
      passport: undefined,
      rg: undefined,
      
      address: undefined,
      birthDate: undefined,
      nationality: undefined,
      language: 'pt-BR',
      
      stats: {
        totalReservations: 0,
        totalNights: 0,
        totalSpent: 0,
      },
      
      preferences: undefined,
      tags: [],
      
      isBlacklisted: false,
      notes: undefined,
      
      createdAt: now,
      updatedAt: now,
      source: body.source || 'direct',
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    // ✅ CORREÇÃO v3 (14-12-2025 22:51): Corrigir referência a variável inexistente
    // Usar tenant.imobiliariaId ao invés de user.organization_id
    // FORCE REBUILD: timestamp 22:51 BRT
    const finalOrgId = organizationId || tenant.imobiliariaId || '00000000-0000-0000-0000-000000000000';
    const sqlData = guestToSql(guest, finalOrgId);
    
    const { data: insertedRow, error: insertError } = await client
      .from('guests')
      .insert(sqlData)
      .select(GUEST_SELECT_FIELDS)
      .single();
    
    if (insertError) {
      console.error('❌ [createGuest] SQL error inserting:', insertError);
      return c.json(errorResponse('Erro ao criar hóspede', { details: insertError.message }), 500);
    }
    
    // ✅ Converter resultado SQL para Guest (TypeScript)
    const createdGuest = sqlToGuest(insertedRow);

    logInfo(`Guest created: ${id} in organization ${organizationId}`);

    return c.json(successResponse(createdGuest, 'Guest created successfully'), 201);
  } catch (error) {
    logError('Error creating guest', error);
    // ✅ CORREÇÃO v1.0.103.337 - Retornar mensagem de erro detalhada
    const errorMessage = error instanceof Error ? error.message : 'Failed to create guest';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('❌ [createGuest] Stack trace:', errorDetails);
    return c.json(errorResponse('Failed to create guest', { details: errorMessage }), 500);
  }
}

// ============================================================================
// ATUALIZAR HÓSPEDE
// ============================================================================

export async function updateGuest(c: Context) {
  try {
    // ✅ CORREÇÃO v1.0.103.338: Passar contexto para getSupabaseClient
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const id = c.req.param('id');
    const body = await c.req.json<Partial<Guest>>();
    logInfo(`Updating guest: ${id} for tenant: ${tenant.username}`, body);

    // ✅ MIGRAÇÃO: Buscar guest existente do SQL (com filtro multi-tenant)
    let query = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: existingRow, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [updateGuest] SQL error fetching:', fetchError);
      return c.json(errorResponse('Erro ao buscar hóspede', { details: fetchError.message }), 500);
    }
    
    if (!existingRow) {
      return c.json(notFoundResponse('Guest'), 404);
    }
    
    // ✅ Converter resultado SQL para Guest (TypeScript)
    const existing = sqlToGuest(existingRow);

    // ✅ MIGRAÇÃO: Se mudando email, verificar se já existe no SQL (com filtro multi-tenant)
    if (body.email && body.email !== existing.email) {
      if (!isValidEmail(body.email)) {
        return c.json(validationErrorResponse('Invalid email'), 400);
      }

      let emailQuery = client
        .from('guests')
        .select('id')
        .ilike('email', body.email.toLowerCase())
        .neq('id', id);
      
      // ✅ FILTRO MULTI-TENANT: Verificar email apenas dentro da organização
      // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
      const organizationIdFromRow = (existingRow as any).organization_id; // Usar do guest existente como padrão
      let organizationId = organizationIdFromRow;
      if (tenant.type === 'imobiliaria') {
        organizationId = await getOrganizationIdOrThrow(c);
      }
      if (organizationId) {
        emailQuery = emailQuery.eq('organization_id', organizationId);
      }
      
      const { data: emailCheck, error: emailError } = await emailQuery.maybeSingle();
      
      if (emailError && emailError.code !== 'PGRST116') {
        console.error('❌ [updateGuest] SQL error checking email:', emailError);
        return c.json(errorResponse('Erro ao verificar email', { details: emailError.message }), 500);
      }
      
      if (emailCheck) {
        return c.json(
          validationErrorResponse('A guest with this email already exists'),
          400
        );
      }
    }

    // Atualizar
    const updated: Guest = {
      ...existing,
      ...(body.firstName && { firstName: sanitizeString(body.firstName) }),
      ...(body.lastName && { lastName: sanitizeString(body.lastName) }),
      ...(body.firstName || body.lastName) && {
        fullName: generateFullName(
          body.firstName || existing.firstName,
          body.lastName || existing.lastName
        ),
      },
      ...(body.email && { email: sanitizeEmail(body.email) }),
      ...(body.phone && { phone: sanitizePhone(body.phone) }),
      ...(body.cpf !== undefined && { cpf: body.cpf ? sanitizeCPF(body.cpf) : undefined }),
      ...(body.passport !== undefined && { passport: body.passport }),
      ...(body.rg !== undefined && { rg: body.rg }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.birthDate !== undefined && { birthDate: body.birthDate }),
      ...(body.nationality !== undefined && { nationality: body.nationality }),
      ...(body.language !== undefined && { language: body.language }),
      ...(body.preferences !== undefined && { preferences: body.preferences }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.isBlacklisted !== undefined && { isBlacklisted: body.isBlacklisted }),
      ...(body.blacklistReason !== undefined && { blacklistReason: body.blacklistReason }),
      ...(body.notes !== undefined && { notes: body.notes }),
      updatedAt: getCurrentDateTime(),
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    // ✅ Obter organization_id do tenant ou do guest existente
    const organizationId = tenant.imobiliariaId || tenant.organizationId || (existingRow as any).organization_id;
    
    // Converter para formato SQL
    const sqlData = guestToSql(updated, organizationId);
    
    // Remover campos que não devem ser atualizados (id, organization_id, created_at)
    delete sqlData.id;
    delete sqlData.organization_id;
    delete sqlData.created_at;
    
    // ✅ Fazer UPDATE no SQL (com filtro multi-tenant)
    let updateQuery = client
      .from('guests')
      .update(sqlData)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      updateQuery = updateQuery.eq('organization_id', organizationId);
    }
    
    const { data: updatedRow, error: updateError } = await updateQuery
      .select(GUEST_SELECT_FIELDS)
      .single();
    
    if (updateError) {
      console.error('❌ [updateGuest] SQL error updating:', updateError);
      return c.json(errorResponse('Erro ao atualizar hóspede', { details: updateError.message }), 500);
    }
    
    // ✅ Converter resultado SQL para Guest (TypeScript)
    const updatedGuest = sqlToGuest(updatedRow);

    logInfo(`Guest updated: ${id} in organization ${organizationId}`);

    return c.json(successResponse(updatedGuest, 'Guest updated successfully'));
  } catch (error) {
    logError('Error updating guest', error);
    return c.json(errorResponse('Failed to update guest'), 500);
  }
}

// ============================================================================
// DELETAR HÓSPEDE
// ============================================================================

export async function deleteGuest(c: Context) {
  try {
    // ✅ CORREÇÃO v1.0.103.338: Passar contexto para getSupabaseClient
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const id = c.req.param('id');
    logInfo(`Deleting guest: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar guest do SQL (com filtro multi-tenant)
    let query = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: existingRow, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [deleteGuest] SQL error fetching:', fetchError);
      return c.json(errorResponse('Erro ao buscar hóspede', { details: fetchError.message }), 500);
    }
    
    if (!existingRow) {
      return c.json(notFoundResponse('Guest'), 404);
    }

    // ✅ MIGRAÇÃO: Verificar se tem reservas no SQL (com filtro multi-tenant)
    let reservationsQuery = client
      .from('reservations')
      .select('id')
      .eq('guest_id', id)
      .limit(1);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      reservationsQuery = reservationsQuery.eq('organization_id', organizationId);
    }
    
    const { data: reservations, error: reservationsError } = await reservationsQuery;
    
    if (reservationsError && reservationsError.code !== 'PGRST116') {
      console.error('❌ [deleteGuest] SQL error checking reservations:', reservationsError);
      return c.json(errorResponse('Erro ao verificar reservas', { details: reservationsError.message }), 500);
    }

    if (reservations && reservations.length > 0) {
      return c.json(
        errorResponse('Cannot delete guest with existing reservations'),
        400
      );
    }

    // ✅ MIGRAÇÃO: Deletar do SQL (com filtro multi-tenant)
    let deleteQuery = client
      .from('guests')
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
      console.error('❌ [deleteGuest] SQL error deleting:', deleteError);
      return c.json(errorResponse('Erro ao deletar hóspede', { details: deleteError.message }), 500);
    }

    logInfo(`Guest deleted: ${id}`);

    return c.json(successResponse(null, 'Guest deleted successfully'));
  } catch (error) {
    logError('Error deleting guest', error);
    return c.json(errorResponse('Failed to delete guest'), 500);
  }
}

// ============================================================================
// BUSCAR HISTÓRICO DO HÓSPEDE
// ============================================================================

export async function getGuestHistory(c: Context) {
  try {
    // ✅ CORREÇÃO v1.0.103.338: Passar contexto para getSupabaseClient
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const id = c.req.param('id');
    logInfo(`Getting guest history: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar guest do SQL (com filtro multi-tenant)
    let guestQuery = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      guestQuery = guestQuery.eq('organization_id', organizationId);
    }
    
    const { data: guestRow, error: guestError } = await guestQuery.maybeSingle();
    
    if (guestError) {
      console.error('❌ [getGuestHistory] SQL error fetching guest:', guestError);
      return c.json(errorResponse('Erro ao buscar hóspede', { details: guestError.message }), 500);
    }
    
    if (!guestRow) {
      return c.json(notFoundResponse('Guest'), 404);
    }

    // ✅ Converter resultado SQL para Guest (TypeScript)
    const guest = sqlToGuest(guestRow);

    // ✅ MIGRAÇÃO: Buscar todas as reservas do hóspede no SQL (com filtro multi-tenant)
    let reservationsQuery = client
      .from('reservations')
      .select(RESERVATION_SELECT_FIELDS)
      .eq('guest_id', id);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      reservationsQuery = reservationsQuery.eq('organization_id', organizationId);
    }
    
    // Ordenar por check_in DESC (mais recente primeiro)
    reservationsQuery = reservationsQuery.order('check_in', { ascending: false });
    
    const { data: reservationRows, error: reservationsError } = await reservationsQuery;
    
    if (reservationsError && reservationsError.code !== 'PGRST116') {
      console.error('❌ [getGuestHistory] SQL error fetching reservations:', reservationsError);
      return c.json(errorResponse('Erro ao buscar reservas', { details: reservationsError.message }), 500);
    }

    // ✅ Converter resultados SQL para Reservation (TypeScript)
    const guestReservations = (reservationRows || []).map(sqlToReservation);

    return c.json(successResponse({
      guest,
      reservations: guestReservations,
    }));
  } catch (error) {
    logError('Error getting guest history', error);
    return c.json(errorResponse('Failed to get guest history'), 500);
  }
}

// ============================================================================
// ADICIONAR/REMOVER BLACKLIST
// ============================================================================

export async function toggleBlacklist(c: Context) {
  try {
    // ✅ CORREÇÃO v1.0.103.338: Passar contexto para getSupabaseClient
    const tenant = getTenant(c);
    const client = getSupabaseClient(c);
    const id = c.req.param('id');
    const { blacklist, reason } = await c.req.json();
    logInfo(`Toggling blacklist for guest: ${id} for tenant: ${tenant.username}`);

    // ✅ MIGRAÇÃO: Buscar guest do SQL (com filtro multi-tenant)
    let query = client
      .from('guests')
      .select(GUEST_SELECT_FIELDS)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: existingRow, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [toggleBlacklist] SQL error fetching:', fetchError);
      return c.json(errorResponse('Erro ao buscar hóspede', { details: fetchError.message }), 500);
    }
    
    if (!existingRow) {
      return c.json(notFoundResponse('Guest'), 404);
    }

    // ✅ Converter resultado SQL para Guest (TypeScript)
    const existing = sqlToGuest(existingRow);

    const updated: Guest = {
      ...existing,
      isBlacklisted: blacklist,
      blacklistReason: blacklist ? reason : undefined,
      blacklistedAt: blacklist ? getCurrentDateTime() : undefined,
      blacklistedBy: blacklist ? (tenant.userId || 'system') : undefined, // ✅ Usar userId do tenant
      updatedAt: getCurrentDateTime(),
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    // ✅ Obter organization_id do tenant ou do guest existente
    const organizationId = tenant.imobiliariaId || tenant.organizationId || (existingRow as any).organization_id;
    
    // Converter para formato SQL
    const sqlData = guestToSql(updated, organizationId);
    
    // Remover campos que não devem ser atualizados (id, organization_id, created_at)
    delete sqlData.id;
    delete sqlData.organization_id;
    delete sqlData.created_at;
    
    // ✅ Fazer UPDATE no SQL (com filtro multi-tenant)
    let updateQuery = client
      .from('guests')
      .update(sqlData)
      .eq('id', id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que guest pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      updateQuery = updateQuery.eq('organization_id', organizationId);
    }
    
    const { data: updatedRow, error: updateError } = await updateQuery
      .select(GUEST_SELECT_FIELDS)
      .single();
    
    if (updateError) {
      console.error('❌ [toggleBlacklist] SQL error updating:', updateError);
      return c.json(errorResponse('Erro ao atualizar blacklist', { details: updateError.message }), 500);
    }
    
    // ✅ Converter resultado SQL para Guest (TypeScript)
    const updatedGuest = sqlToGuest(updatedRow);

    logInfo(`Guest ${blacklist ? 'added to' : 'removed from'} blacklist: ${id} in organization ${organizationId}`);

    return c.json(successResponse(updatedGuest, `Guest ${blacklist ? 'blacklisted' : 'removed from blacklist'} successfully`));
  } catch (error) {
    logError('Error toggling blacklist', error);
    return c.json(errorResponse('Failed to toggle blacklist'), 500);
  }
}
