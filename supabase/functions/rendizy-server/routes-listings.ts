/**
 * RENDIZY - Listings API Routes
 * 
 * Gestão completa de anúncios (listings):
 * - CRUD de listings
 * - Publicação multi-plataforma
 * - Estatísticas e tracking
 * 
 * @version 1.0.103.400
 * @date 2025-11-17
 * @updated 2025-11-17 - Migrado para SQL + multi-tenant
 */

import { Hono } from 'npm:hono';
import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { getTenant, tenancyMiddleware } from './utils-tenancy.ts';
import { listingToSql, sqlToListing, LISTING_SELECT_FIELDS } from './utils-listing-mapper.ts';
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { successResponse, errorResponse } from './utils-response.ts';
import type { Listing } from './types.ts';

const app = new Hono();

// ✅ MELHORIA v1.0.103.400 - Aplicar tenancyMiddleware em todas as rotas
app.use('*', tenancyMiddleware);

// ========================================
// TYPES
// ========================================

interface Listing {
  id: string;
  locationId: string;
  propertyId: string;
  propertyName: string;
  title: string;
  description: string;
  propertyType: 'apartment' | 'house' | 'studio' | 'loft';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  pricing: {
    basePrice: number;
    currency: string;
    cleaningFee: number;
    extraGuestFee: number;
  };
  capacity: {
    guests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
  };
  amenities: string[];
  photos: {
    url: string;
    order: number;
    isCover: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface Platform {
  name: 'airbnb' | 'booking' | 'vrbo' | 'direct';
  status: 'active' | 'inactive' | 'pending';
  listingUrl?: string;
  externalId?: string;
  publishedAt?: string;
}

interface ListingStats {
  listingId: string;
  date: string; // YYYY-MM-DD
  views: number;
  reservations: number;
  revenue: number;
  avgRating: number;
}

// ========================================
// CRUD ENDPOINTS
// ========================================

/**
 * GET /make-server-67caf26a/listings
 * Lista todos os listings (com filtros multi-tenant)
 * 
 * ✅ MELHORIA v1.0.103.400 - Migrado para SQL + multi-tenant
 */
app.get('/', async (c) => {
  try {
    const tenant = getTenant(c);
    const client = kv.getSupabaseClient();
    
    // ✅ REGRA MESTRE: Obter organization_id garantido
    const organizationId = await getOrganizationIdOrThrow(c);
    console.log(`✅ [Listings] Listando listings para organização: ${organizationId}`);

    // Construir query com filtros
    let query = client
      .from('listings')
      .select(LISTING_SELECT_FIELDS)
      .order('updated_at', { ascending: false });

    // ✅ REGRA MESTRE: Filtrar por organization_id
    query = query.eq('organization_id', organizationId);

    // Filtros opcionais via query params
    const url = new URL(c.req.url);
    const propertyId = url.searchParams.get('property_id');
    const platform = url.searchParams.get('platform');
    const status = url.searchParams.get('status');

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    if (platform) {
      query = query.eq('platform', platform);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[Listings] Erro ao buscar do SQL:', error);
      return c.json(errorResponse('Erro ao buscar listings', { details: error.message }), 500);
    }

    // Converter SQL rows para Listing (TypeScript)
    const listings: Listing[] = (rows || []).map(sqlToListing);

    console.log(`[Listings] ${listings.length} listings encontrados`);

    return c.json(successResponse({
      data: listings,
      count: listings.length,
    }));
  } catch (error) {
    console.error('[Listings] Erro ao listar:', error);
    return c.json(errorResponse(
      error instanceof Error ? error.message : 'Erro desconhecido'
    ), 500);
  }
});

/**
 * GET /make-server-67caf26a/listings/:id
 * Obtém detalhes de um listing específico
 * 
 * ✅ MELHORIA v1.0.103.400 - Migrado para SQL + multi-tenant
 */
app.get('/:id', async (c) => {
  try {
    const tenant = getTenant(c);
    const client = kv.getSupabaseClient();
    const id = c.req.param('id');
    
    console.log(`[Listings] Buscando listing ${id}...`);

    // Buscar listing do SQL
    let query = client
      .from('listings')
      .select(LISTING_SELECT_FIELDS)
      .eq('id', id)
      .maybeSingle();

    // ✅ MELHORIA v1.0.103.400 - Filtrar por organização se não for superadmin
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    }

    const { data: row, error } = await query;

    if (error) {
      console.error('[Listings] Erro ao buscar do SQL:', error);
      return c.json(errorResponse('Erro ao buscar listing', { details: error.message }), 500);
    }

    if (!row) {
      return c.json(errorResponse('Listing não encontrado'), 404);
    }

    // Converter SQL row para Listing (TypeScript)
    const listing = sqlToListing(row);

    return c.json(successResponse(listing));
  } catch (error) {
    console.error('[Listings] Erro ao buscar:', error);
    return c.json(errorResponse(
      error instanceof Error ? error.message : 'Erro desconhecido'
    ), 500);
  }
});

/**
 * POST /make-server-67caf26a/listings
 * Cria novo listing
 * 
 * ✅ MELHORIA v1.0.103.400 - Migrado para SQL + multi-tenant
 */
app.post('/', async (c) => {
  try {
    const tenant = getTenant(c);
    const client = kv.getSupabaseClient();
    const body = await c.req.json<Partial<Listing>>();
    
    console.log('[Listings] Criando novo listing...', body);

    // Validações
    if (!body.accommodationId) {
      return c.json(errorResponse('accommodationId (property_id) é obrigatório'), 400);
    }

    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    // Não aceitar mais organization_id do body (body.ownerId), sempre usar do helper
    let organizationId: string | undefined;
    if (tenant.type !== 'superadmin') {
      organizationId = await getOrganizationIdOrThrow(c);
    } else {
      // SuperAdmin pode passar organizationId no body se necessário
      organizationId = body.ownerId || undefined;
    }
    
    if (!organizationId) {
      return c.json(errorResponse('organization_id is required'), 400);
    }

    // Converter Listing (TypeScript) para SQL
    const sqlData = listingToSql(body as Listing, organizationId);

    // Inserir no SQL
    const { data: row, error } = await client
      .from('listings')
      .insert(sqlData)
      .select(LISTING_SELECT_FIELDS)
      .single();

    if (error) {
      console.error('[Listings] Erro ao criar no SQL:', error);
      
      // Tratar erro de UNIQUE constraint (property_id, platform)
      if (error.code === '23505') {
        return c.json(errorResponse('Já existe um listing para esta propriedade nesta plataforma'), 409);
      }
      
      return c.json(errorResponse('Erro ao criar listing', { details: error.message }), 500);
    }

    // Converter SQL row para Listing (TypeScript)
    const listing = sqlToListing(row);

    console.log(`[Listings] Listing ${row.id} criado com sucesso`);

    return c.json(successResponse(listing), 201);
  } catch (error) {
    console.error('[Listings] Erro ao criar:', error);
    return c.json(errorResponse(
      error instanceof Error ? error.message : 'Erro desconhecido'
    ), 500);
  }
});

/**
 * PUT /make-server-67caf26a/listings/:id
 * Atualiza listing existente
 * 
 * ✅ MELHORIA v1.0.103.400 - Migrado para SQL + multi-tenant
 */
app.put('/:id', async (c) => {
  try {
    const tenant = getTenant(c);
    const client = kv.getSupabaseClient();
    const id = c.req.param('id');
    const body = await c.req.json<Partial<Listing>>();
    
    console.log(`[Listings] Atualizando listing ${id}...`);

    // Verificar se listing existe e pertence à organização
    let checkQuery = client
      .from('listings')
      .select('id, organization_id')
      .eq('id', id)
      .maybeSingle();

    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      checkQuery = checkQuery.eq('organization_id', organizationId);
    }

    const { data: existing, error: checkError } = await checkQuery;

    if (checkError || !existing) {
      return c.json(errorResponse('Listing não encontrado ou sem permissão'), 404);
    }

    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    let organizationId = existing.organization_id; // Usar do listing existente como padrão
    if (tenant.type === 'imobiliaria') {
      organizationId = await getOrganizationIdOrThrow(c);
    }

    // Converter Listing (TypeScript) para SQL
    const sqlData = listingToSql(body as Listing, organizationId);

    // Remover campos que não devem ser atualizados
    delete (sqlData as any).id;
    delete (sqlData as any).organization_id;
    delete (sqlData as any).property_id; // Não permite mudar property_id via PUT
    delete (sqlData as any).created_at;

    // Atualizar no SQL
    let updateQuery = client
      .from('listings')
      .update(sqlData)
      .eq('id', id)
      .select(LISTING_SELECT_FIELDS)
      .single();

    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationIdForFilter = await getOrganizationIdOrThrow(c);
      updateQuery = updateQuery.eq('organization_id', organizationIdForFilter);
    }

    const { data: row, error } = await updateQuery;

    if (error) {
      console.error('[Listings] Erro ao atualizar no SQL:', error);
      return c.json(errorResponse('Erro ao atualizar listing', { details: error.message }), 500);
    }

    // Converter SQL row para Listing (TypeScript)
    const updated = sqlToListing(row);

    console.log(`[Listings] Listing ${id} atualizado com sucesso`);

    return c.json(successResponse(updated));
  } catch (error) {
    console.error('[Listings] Erro ao atualizar:', error);
    return c.json(errorResponse(
      error instanceof Error ? error.message : 'Erro desconhecido'
    ), 500);
  }
});

/**
 * DELETE /make-server-67caf26a/listings/:id
 * Deleta listing
 * 
 * ✅ MELHORIA v1.0.103.400 - Migrado para SQL + multi-tenant
 */
app.delete('/:id', async (c) => {
  try {
    const tenant = getTenant(c);
    const client = kv.getSupabaseClient();
    const id = c.req.param('id');
    
    console.log(`[Listings] Deletando listing ${id}...`);

    // Verificar se listing existe e pertence à organização
    let checkQuery = client
      .from('listings')
      .select('id, organization_id')
      .eq('id', id)
      .maybeSingle();

    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      checkQuery = checkQuery.eq('organization_id', organizationId);
    }

    const { data: existing, error: checkError } = await checkQuery;

    if (checkError || !existing) {
      return c.json(errorResponse('Listing não encontrado ou sem permissão'), 404);
    }

    // Deletar do SQL (ON DELETE CASCADE vai deletar registros relacionados)
    let deleteQuery = client
      .from('listings')
      .delete()
      .eq('id', id);

    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      deleteQuery = deleteQuery.eq('organization_id', organizationId);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error('[Listings] Erro ao deletar do SQL:', error);
      return c.json(errorResponse('Erro ao deletar listing', { details: error.message }), 500);
    }

    console.log(`[Listings] Listing ${id} deletado com sucesso`);

    return c.json(successResponse({ message: 'Listing deletado com sucesso' }));
  } catch (error) {
    console.error('[Listings] Erro ao deletar:', error);
    return c.json(errorResponse(
      error instanceof Error ? error.message : 'Erro desconhecido'
    ), 500);
  }
});

// ========================================
// PLATFORMS ENDPOINTS (DEPRECATED)
// ========================================
// ⚠️ DEPRECATED v1.0.103.400 - Estas rotas não fazem mais sentido na nova arquitetura
// Um listing agora representa UMA plataforma específica (não múltiplas)
// Para criar um listing em uma plataforma, use POST /listings
// Para remover um listing, use DELETE /listings/:id

/**
 * POST /make-server-67caf26a/listings/:id/publish
 * Publica listing em uma plataforma
 * 
 * ⚠️ DEPRECATED v1.0.103.400 - Use POST /listings ao invés disso
 */
app.post('/:id/publish', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    console.log(`[Listings] Publicando listing ${id} em ${body.platform}...`);

    const listing = await kv.get<Listing>(`listing:${id}`);
    
    if (!listing) {
      return c.json({
        success: false,
        error: 'Listing não encontrado',
      }, 404);
    }

    // Validar plataforma
    const validPlatforms = ['airbnb', 'booking', 'vrbo', 'direct'];
    if (!body.platform || !validPlatforms.includes(body.platform)) {
      return c.json({
        success: false,
        error: 'Plataforma inválida. Opções: airbnb, booking, vrbo, direct',
      }, 400);
    }

    // Buscar plataformas existentes
    const platforms = await kv.get<Platform[]>(`listing:${id}:platforms`) || [];

    // Verificar se já está publicado
    const existingIndex = platforms.findIndex(p => p.name === body.platform);
    
    if (existingIndex >= 0) {
      return c.json({
        success: false,
        error: `Listing já está publicado em ${body.platform}`,
      }, 400);
    }

    // Gerar external ID
    const externalId = `${body.platform.substring(0, 3).toUpperCase()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const newPlatform: Platform = {
      name: body.platform,
      status: 'active',
      externalId,
      listingUrl: body.listingUrl || `https://${body.platform}.com/listing/${externalId}`,
      publishedAt: new Date().toISOString(),
    };

    platforms.push(newPlatform);
    await kv.set(`listing:${id}:platforms`, platforms);

    // Atualizar status do listing para ativo
    if (listing.status === 'draft') {
      listing.status = 'active';
      listing.updatedAt = new Date().toISOString();
      await kv.set(`listing:${id}`, listing);
    }

    console.log(`[Listings] Listing ${id} publicado em ${body.platform} com sucesso`);

    return c.json({
      success: true,
      data: newPlatform,
      message: `Publicado em ${body.platform} com sucesso!`,
    });
  } catch (error) {
    console.error('[Listings] Erro ao publicar:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

/**
 * DELETE /make-server-67caf26a/listings/:id/unpublish/:platform
 * Despublica listing de uma plataforma
 * 
 * ⚠️ DEPRECATED v1.0.103.400 - Use DELETE /listings/:id ao invés disso
 */
app.delete('/:id/unpublish/:platform', async (c) => {
  try {
    const id = c.req.param('id');
    const platform = c.req.param('platform');
    console.log(`[Listings] Despublicando listing ${id} de ${platform}...`);

    const listing = await kv.get<Listing>(`listing:${id}`);
    
    if (!listing) {
      return c.json({
        success: false,
        error: 'Listing não encontrado',
      }, 404);
    }

    // Buscar plataformas existentes
    const platforms = await kv.get<Platform[]>(`listing:${id}:platforms`) || [];

    // Filtrar plataforma removida
    const filtered = platforms.filter(p => p.name !== platform);

    if (filtered.length === platforms.length) {
      return c.json({
        success: false,
        error: `Listing não está publicado em ${platform}`,
      }, 404);
    }

    await kv.set(`listing:${id}:platforms`, filtered);

    console.log(`[Listings] Listing ${id} despublicado de ${platform} com sucesso`);

    return c.json({
      success: true,
      message: `Despublicado de ${platform} com sucesso!`,
    });
  } catch (error) {
    console.error('[Listings] Erro ao despublicar:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

/**
 * GET /make-server-67caf26a/listings/:id/platforms
 * Lista plataformas onde o listing está publicado
 * 
 * ⚠️ DEPRECATED v1.0.103.400 - Um listing agora representa apenas UMA plataforma
 * Para obter o listing (que já contém a plataforma), use GET /listings/:id
 */
app.get('/:id/platforms', async (c) => {
  try {
    const id = c.req.param('id');
    console.log(`[Listings] Buscando plataformas do listing ${id}...`);

    const platforms = await kv.get<Platform[]>(`listing:${id}:platforms`) || [];

    return c.json({
      success: true,
      data: platforms,
    });
  } catch (error) {
    console.error('[Listings] Erro ao buscar plataformas:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

// ========================================
// STATS ENDPOINTS
// ========================================

/**
 * POST /make-server-67caf26a/listings/:id/stats
 * Registra estatísticas diárias
 */
app.post('/:id/stats', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const date = body.date || new Date().toISOString().split('T')[0];
    
    console.log(`[Listings] Registrando stats para listing ${id} em ${date}...`);

    const listing = await kv.get<Listing>(`listing:${id}`);
    
    if (!listing) {
      return c.json({
        success: false,
        error: 'Listing não encontrado',
      }, 404);
    }

    const stats: ListingStats = {
      listingId: id,
      date,
      views: body.views || 0,
      reservations: body.reservations || 0,
      revenue: body.revenue || 0,
      avgRating: body.avgRating || 0,
    };

    await kv.set(`listing:${id}:stats:${date}`, stats);

    console.log(`[Listings] Stats registradas com sucesso`);

    return c.json({
      success: true,
      data: stats,
      message: 'Estatísticas registradas com sucesso!',
    });
  } catch (error) {
    console.error('[Listings] Erro ao registrar stats:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

/**
 * GET /make-server-67caf26a/listings/:id/stats
 * Obtém estatísticas agregadas de um listing
 */
app.get('/:id/stats', async (c) => {
  try {
    const id = c.req.param('id');
    console.log(`[Listings] Buscando stats do listing ${id}...`);

    const statsData = await kv.getByPrefix(`listing:${id}:stats:`);
    
    const stats = {
      views: 0,
      reservations: 0,
      revenue: 0,
      avgRating: 0,
      dailyStats: [] as ListingStats[],
    };

    let totalRatings = 0;
    let ratingSum = 0;

    // getByPrefix returns values directly, not {key, value}
    statsData.forEach(stat => {
      const listingStat = stat as ListingStats;
      stats.views += listingStat.views || 0;
      stats.reservations += listingStat.reservations || 0;
      stats.revenue += listingStat.revenue || 0;
      if (listingStat.avgRating > 0) {
        totalRatings++;
        ratingSum += listingStat.avgRating;
      }
      stats.dailyStats.push(listingStat);
    });

    if (totalRatings > 0) {
      stats.avgRating = ratingSum / totalRatings;
    }

    // Ordenar por data (mais recente primeiro)
    stats.dailyStats.sort((a, b) => b.date.localeCompare(a.date));

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Listings] Erro ao buscar stats:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

/**
 * GET /make-server-67caf26a/listings/stats/summary
 * Obtém resumo geral de todos os listings
 */
app.get('/stats/summary', async (c) => {
  try {
    console.log('[Listings] Calculando resumo geral...');

    const listingsData = await kv.getByPrefix('listing:');
    
    // getByPrefix returns values directly, so we can't filter by key
    // We'll just get all values and filter by object structure
    const listings = listingsData
      .filter(item => item && item.id && item.title) // Filter by having listing properties
      .map(item => item as Listing);

    const summary = {
      total: listings.length,
      active: listings.filter(l => l.status === 'active').length,
      inactive: listings.filter(l => l.status === 'inactive').length,
      draft: listings.filter(l => l.status === 'draft').length,
      archived: listings.filter(l => l.status === 'archived').length,
      totalViews: 0,
      totalReservations: 0,
      totalRevenue: 0,
      avgRating: 0,
    };

    // Calcular stats agregadas
    const allStatsData = await kv.getByPrefix('listing:');
    // Since getByPrefix returns values, we filter by object structure
    const statsItems = allStatsData.filter(item => item && item.listingId && item.date);
    
    let totalRatings = 0;
    let ratingSum = 0;

    statsItems.forEach(stat => {
      const listingStat = stat as ListingStats;
      summary.totalViews += listingStat.views || 0;
      summary.totalReservations += listingStat.reservations || 0;
      summary.totalRevenue += listingStat.revenue || 0;
      if (listingStat.avgRating > 0) {
        totalRatings++;
        ratingSum += listingStat.avgRating;
      }
    });

    if (totalRatings > 0) {
      summary.avgRating = ratingSum / totalRatings;
    }

    console.log(`[Listings] Resumo calculado:`, summary);

    return c.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[Listings] Erro ao calcular resumo:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * POST /make-server-67caf26a/listings/bulk/update-status
 * Atualiza status de múltiplos listings
 */
app.post('/bulk/update-status', async (c) => {
  try {
    const body = await c.req.json();
    const { listingIds, status } = body;

    console.log(`[Listings] Atualizando status de ${listingIds.length} listings para ${status}...`);

    if (!listingIds || !Array.isArray(listingIds)) {
      return c.json({
        success: false,
        error: 'listingIds deve ser um array',
      }, 400);
    }

    const validStatuses = ['draft', 'active', 'inactive', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: 'Status inválido',
      }, 400);
    }

    let updated = 0;
    let failed = 0;

    for (const id of listingIds) {
      try {
        const listing = await kv.get<Listing>(`listing:${id}`);
        if (listing) {
          listing.status = status;
          listing.updatedAt = new Date().toISOString();
          await kv.set(`listing:${id}`, listing);
          updated++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Listings] Erro ao atualizar ${id}:`, err);
        failed++;
      }
    }

    return c.json({
      success: true,
      message: `${updated} listings atualizados, ${failed} falharam`,
      data: { updated, failed },
    });
  } catch (error) {
    console.error('[Listings] Erro em bulk update:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
});

export default app;
