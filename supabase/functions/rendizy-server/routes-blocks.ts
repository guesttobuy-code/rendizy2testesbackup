import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Prompt 4)
import { tenancyMiddleware, getTenant, isSuperAdmin } from './utils-tenancy.ts';
import { getSupabaseClient } from './kv_store.tsx';
// ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
import { blockToSql, sqlToBlock, BLOCK_SELECT_FIELDS } from './utils-block-mapper.ts';
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import type { Block } from './types.ts';
import { logInfo, logError } from './utils.ts';

const blocks = new Hono();

// ✅ MELHORIA v1.0.103.400 - Aplicar tenancyMiddleware em todas as rotas de blocks
blocks.use('*', tenancyMiddleware);

// ============================================
// TYPES
// ============================================

type BlockSubtype = 'simple' | 'predictive' | 'maintenance';

interface Block {
  id: string;
  organization_id: string;
  property_id: string;
  property_name?: string;
  start_date: string;
  end_date: string;
  type: 'block';
  subtype?: BlockSubtype;
  reason: string;
  notes?: string;
  check_in_time?: string;
  check_out_time?: string;
  limitations?: {
    acoes?: boolean;
    espera?: boolean;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============================================
// BLOCKS CRUD
// ============================================

// GET all blocks
blocks.get('/', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    
    const propertyId = c.req.query('property_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    
    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('blocks')
      .select(BLOCK_SELECT_FIELDS);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, filtrar por organization_id
    // SuperAdmin vê todos os blocks, imobiliária vê apenas os seus
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    } else if (!isSuperAdmin(c)) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }
    
    // Filtrar por propriedade se fornecido
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    // Filtrar por data se fornecido (overlap de datas)
    if (startDate && endDate) {
      query = query.or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
    }
    
    // Ordenar por start_date
    query = query.order('start_date', { ascending: true });
    
    const { data: rows, error } = await query;
    
    if (error) {
      console.error('❌ [blocks.get] SQL error:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 500);
    }
    
    // ✅ Converter resultados SQL para Block (TypeScript)
    const allBlocks = (rows || []).map(sqlToBlock);

    return c.json({ success: true, data: allBlocks });
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET single block
blocks.get('/:id', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const blockId = c.req.param('id');
    
    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('blocks')
      .select(BLOCK_SELECT_FIELDS)
      .eq('id', blockId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que block pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    } else if (!isSuperAdmin(c)) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }
    
    const { data: row, error } = await query.maybeSingle();
    
    if (error) {
      console.error('❌ [blocks.get/:id] SQL error:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 500);
    }
    
    if (!row) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }
    
    // ✅ Converter resultado SQL para Block (TypeScript)
    const block = sqlToBlock(row);

    // ✅ VERIFICAR PERMISSÃO: Se for imobiliária, garantir que block pertence à organização
    // (já filtrado na query SQL acima, mas validar novamente para segurança)
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      // ✅ Multi-tenant garantido pela query SQL (já filtra por organization_id)
      logInfo(`Block ${blockId} belongs to organization ${organizationId}`);
    }

    return c.json({ success: true, data: block });
  } catch (error) {
    console.error('Error fetching block:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// POST create block
blocks.post('/', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const body = await c.req.json();
    const {
      organization_id,
      property_id,
      start_date,
      end_date,
      subtype,
      reason,
      notes,
      created_by,
    } = body;

    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    // Não aceitar mais organization_id do body, sempre usar do helper
    let finalOrgId: string | undefined;
    if (tenant.type !== 'superadmin') {
      finalOrgId = await getOrganizationIdOrThrow(c);
    } else {
      // SuperAdmin pode passar organization_id no body se necessário
      finalOrgId = organization_id;
    }

    if (!property_id || !start_date || !end_date) {
      return c.json({ 
        success: false, 
        error: 'property_id, start_date, and end_date are required' 
      }, 400);
    }

    // ✅ MIGRAÇÃO: Verificar se propriedade existe no SQL (com filtro multi-tenant)
    let propertyQuery = client
      .from('properties')
      .select('id')
      .eq('id', property_id);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que property pertence à organização
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      propertyQuery = propertyQuery.eq('organization_id', tenant.imobiliariaId);
    }
    
    const { data: propertyRow, error: propertyError } = await propertyQuery.maybeSingle();
    
    if (propertyError || !propertyRow) {
      return c.json({ 
        success: false, 
        error: 'Property not found or does not belong to your organization' 
      }, 404);
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (endDate <= startDate) {
      return c.json({ 
        success: false, 
        error: 'end_date must be after start_date' 
      }, 400);
    }

    // ✅ MIGRAÇÃO: Verificar conflitos com blocks existentes no SQL
    let blocksQuery = client
      .from('blocks')
      .select('id, start_date, end_date')
      .eq('property_id', property_id)
      .or(`start_date.lt.${end_date},end_date.gt.${start_date}`);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      blocksQuery = blocksQuery.eq('organization_id', tenant.imobiliariaId);
    }
    
    const { data: conflictingBlocks, error: blocksError } = await blocksQuery;
    
    if (blocksError && blocksError.code !== 'PGRST116') {
      console.error('❌ [blocks.post] SQL error checking blocks:', blocksError);
      return c.json({ 
        success: false, 
        error: 'Erro ao verificar conflitos de blocos',
        details: blocksError.message
      }, 500);
    }

    if (conflictingBlocks && conflictingBlocks.length > 0) {
      return c.json({ 
        success: false, 
        error: 'Conflicting block already exists for this period',
        conflicts: conflictingBlocks 
      }, 409);
    }

    // ✅ MIGRAÇÃO: Verificar conflitos com reservations no SQL
    let reservationsQuery = client
      .from('reservations')
      .select('id, check_in, check_out')
      .eq('property_id', property_id)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .or(`check_in.lt.${end_date},check_out.gt.${start_date}`);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      reservationsQuery = reservationsQuery.eq('organization_id', tenant.imobiliariaId);
    }
    
    const { data: conflictingReservations, error: reservationsError } = await reservationsQuery;
    
    if (reservationsError && reservationsError.code !== 'PGRST116') {
      console.error('❌ [blocks.post] SQL error checking reservations:', reservationsError);
      return c.json({ 
        success: false, 
        error: 'Erro ao verificar conflitos de reservas',
        details: reservationsError.message
      }, 500);
    }

    if (conflictingReservations && conflictingReservations.length > 0) {
      return c.json({ 
        success: false, 
        error: 'Conflicting reservation exists for this period',
        conflicts: conflictingReservations 
      }, 409);
    }

    // ✅ Criar block (usando interface Block do types.ts)
    const blockId = `blk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const block: Block = {
      id: blockId,
      propertyId: property_id,
      startDate: start_date,
      endDate: end_date,
      type: 'block',
      subtype: subtype || undefined,
      reason: reason || 'Bloqueio',
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: created_by || tenant.userId || 'system',
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    const sqlData = blockToSql(block, finalOrgId || 'system');
    
    const { data: insertedRow, error: insertError } = await client
      .from('blocks')
      .insert(sqlData)
      .select(BLOCK_SELECT_FIELDS)
      .single();
    
    if (insertError) {
      console.error('❌ [blocks.post] SQL error inserting:', insertError);
      return c.json({ 
        success: false, 
        error: 'Erro ao criar bloqueio',
        details: insertError.message
      }, 500);
    }
    
    // ✅ Converter resultado SQL para Block (TypeScript)
    const createdBlock = sqlToBlock(insertedRow);

    logInfo(`Block created: ${blockId} in organization ${finalOrgId}`);

    return c.json({ success: true, data: createdBlock });
  } catch (error) {
    console.error('Error creating block:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// PATCH update block
blocks.patch('/:id', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const blockId = c.req.param('id');
    const body = await c.req.json();
    
    // ✅ MIGRAÇÃO: Buscar block existente do SQL (com filtro multi-tenant)
    let query = client
      .from('blocks')
      .select(BLOCK_SELECT_FIELDS)
      .eq('id', blockId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que block pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    } else if (!isSuperAdmin(c)) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }
    
    const { data: existingRow, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [blocks.patch] SQL error fetching:', fetchError);
      return c.json({ 
        success: false, 
        error: 'Erro ao buscar bloqueio',
        details: fetchError.message
      }, 500);
    }
    
    if (!existingRow) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }
    
    // ✅ Converter resultado SQL para Block (TypeScript)
    const block = sqlToBlock(existingRow);
    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    let finalOrgId = existingRow.organization_id; // Usar do block existente como padrão
    if (tenant.type === 'imobiliaria') {
      finalOrgId = await getOrganizationIdOrThrow(c);
    }

    // If dates are being updated, check for conflicts
    if (body.start_date || body.end_date) {
      const newStartDate = new Date(body.start_date || block.startDate);
      const newEndDate = new Date(body.end_date || block.endDate);
      
      if (newEndDate <= newStartDate) {
        return c.json({ 
          success: false, 
          error: 'end_date must be after start_date' 
        }, 400);
      }

      // ✅ MIGRAÇÃO: Verificar conflitos com outros blocks no SQL
      let blocksQuery = client
        .from('blocks')
        .select('id, start_date, end_date')
        .neq('id', blockId) // Ignore self
        .eq('property_id', block.propertyId)
        .or(`start_date.lt.${newEndDate.toISOString().split('T')[0]},end_date.gt.${newStartDate.toISOString().split('T')[0]}`);
      
      // ✅ FILTRO MULTI-TENANT
      if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
        blocksQuery = blocksQuery.eq('organization_id', tenant.imobiliariaId);
      }
      
      const { data: conflictingBlocks, error: blocksError } = await blocksQuery;
      
      if (blocksError && blocksError.code !== 'PGRST116') {
        console.error('❌ [blocks.patch] SQL error checking blocks:', blocksError);
        return c.json({ 
          success: false, 
          error: 'Erro ao verificar conflitos de blocos',
          details: blocksError.message
        }, 500);
      }

      if (conflictingBlocks && conflictingBlocks.length > 0) {
        return c.json({ 
          success: false, 
          error: 'Conflicting block already exists for this period',
          conflicts: conflictingBlocks 
        }, 409);
      }

      // ✅ MIGRAÇÃO: Verificar conflitos com reservations no SQL
      let reservationsQuery = client
        .from('reservations')
        .select('id, check_in, check_out')
        .eq('property_id', block.propertyId)
        .in('status', ['pending', 'confirmed', 'checked_in'])
        .or(`check_in.lt.${newEndDate.toISOString().split('T')[0]},check_out.gt.${newStartDate.toISOString().split('T')[0]}`);
      
      // ✅ FILTRO MULTI-TENANT
      if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
        reservationsQuery = reservationsQuery.eq('organization_id', tenant.imobiliariaId);
      }
      
      const { data: conflictingReservations, error: reservationsError } = await reservationsQuery;
      
      if (reservationsError && reservationsError.code !== 'PGRST116') {
        console.error('❌ [blocks.patch] SQL error checking reservations:', reservationsError);
        return c.json({ 
          success: false, 
          error: 'Erro ao verificar conflitos de reservas',
          details: reservationsError.message
        }, 500);
      }

      if (conflictingReservations && conflictingReservations.length > 0) {
        return c.json({ 
          success: false, 
          error: 'Conflicting reservation exists for this period',
          conflicts: conflictingReservations 
        }, 409);
      }
    }

    // Atualizar block (usando interface Block do types.ts)
    const updated: Block = {
      ...block,
      ...(body.start_date && { startDate: body.start_date }),
      ...(body.end_date && { endDate: body.end_date }),
      ...(body.subtype !== undefined && { subtype: body.subtype }),
      ...(body.reason !== undefined && { reason: body.reason }),
      ...(body.notes !== undefined && { notes: body.notes }),
      updatedAt: new Date().toISOString(),
    };

    // ✅ MIGRAÇÃO: Salvar no SQL ao invés de KV Store
    const sqlData = blockToSql(updated, finalOrgId || 'system');
    
    // Remover campos que não devem ser atualizados (id, organization_id, created_at, created_by)
    delete sqlData.id;
    delete sqlData.organization_id;
    delete sqlData.created_at;
    delete sqlData.created_by;
    
    // ✅ Fazer UPDATE no SQL (com filtro multi-tenant)
    let updateQuery = client
      .from('blocks')
      .update(sqlData)
      .eq('id', blockId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que block pertence à organização
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      updateQuery = updateQuery.eq('organization_id', tenant.imobiliariaId);
    }
    
    const { data: updatedRow, error: updateError } = await updateQuery
      .select(BLOCK_SELECT_FIELDS)
      .single();
    
    if (updateError) {
      console.error('❌ [blocks.patch] SQL error updating:', updateError);
      return c.json({ 
        success: false, 
        error: 'Erro ao atualizar bloqueio',
        details: updateError.message
      }, 500);
    }
    
    // ✅ Converter resultado SQL para Block (TypeScript)
    const updatedBlock = sqlToBlock(updatedRow);

    logInfo(`Block updated: ${blockId} in organization ${finalOrgId}`);

    return c.json({ success: true, data: updatedBlock });
  } catch (error) {
    console.error('Error updating block:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// DELETE block
blocks.delete('/:id', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const blockId = c.req.param('id');
    
    // ✅ MIGRAÇÃO: Buscar block do SQL (com filtro multi-tenant)
    let query = client
      .from('blocks')
      .select(BLOCK_SELECT_FIELDS)
      .eq('id', blockId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, garantir que block pertence à organização
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    } else if (!isSuperAdmin(c)) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }
    
    const { data: existingRow, error: fetchError } = await query.maybeSingle();
    
    if (fetchError) {
      console.error('❌ [blocks.delete] SQL error fetching:', fetchError);
      return c.json({ 
        success: false, 
        error: 'Erro ao buscar bloqueio',
        details: fetchError.message
      }, 500);
    }
    
    if (!existingRow) {
      return c.json({ success: false, error: 'Block not found' }, 404);
    }
    
    // ✅ MIGRAÇÃO: Deletar do SQL (com filtro multi-tenant)
    let deleteQuery = client
      .from('blocks')
      .delete()
      .eq('id', blockId);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      deleteQuery = deleteQuery.eq('organization_id', tenant.imobiliariaId);
    }
    
    const { error: deleteError } = await deleteQuery;
    
    if (deleteError) {
      console.error('❌ [blocks.delete] SQL error deleting:', deleteError);
      return c.json({ 
        success: false, 
        error: 'Erro ao deletar bloqueio',
        details: deleteError.message
      }, 500);
    }

    logInfo(`Block deleted: ${blockId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting block:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET blocks by property
blocks.get('/property/:propertyId', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    const propertyId = c.req.param('propertyId');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    
    // ✅ MIGRAÇÃO: Buscar do SQL ao invés de KV Store
    let query = client
      .from('blocks')
      .select(BLOCK_SELECT_FIELDS)
      .eq('property_id', propertyId);
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, filtrar por organization_id
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      query = query.eq('organization_id', organizationId);
    } else if (!isSuperAdmin(c)) {
      return c.json({ success: false, error: 'organization_id is required' }, 400);
    }
    
    // Filter by date range if provided (overlap de datas)
    if (startDate && endDate) {
      query = query.or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
    }
    
    // Sort by start_date
    query = query.order('start_date', { ascending: true });
    
    const { data: rows, error } = await query;
    
    if (error) {
      console.error('❌ [blocks.get/property/:propertyId] SQL error:', error);
      return c.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 500);
    }
    
    // ✅ Converter resultados SQL para Block (TypeScript)
    const allBlocks = (rows || []).map(sqlToBlock);

    return c.json({ success: true, data: allBlocks });
  } catch (error) {
    console.error('Error fetching property blocks:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// POST bulk delete blocks
blocks.post('/bulk-delete', async (c) => {
  try {
    // ✅ MELHORIA v1.0.103.400 - Usa tenancyMiddleware
    const tenant = getTenant(c);
    const body = await c.req.json();
    const { organization_id, block_ids } = body;
    
    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    // Não aceitar mais organization_id do body, sempre usar do helper
    let finalOrgId: string | undefined;
    if (tenant.type !== 'superadmin') {
      finalOrgId = await getOrganizationIdOrThrow(c);
    } else {
      // SuperAdmin pode passar organization_id no body se necessário
      finalOrgId = organization_id;
    }

    if (!finalOrgId || !block_ids || !Array.isArray(block_ids)) {
      return c.json({ 
        success: false, 
        error: 'organization_id and block_ids array are required' 
      }, 400);
    }
    
    const client = getSupabaseClient();
    
    // ✅ MIGRAÇÃO: Verificar permissão e deletar do SQL (com filtro multi-tenant)
    const deleted: string[] = [];
    const notFound: string[] = [];

    for (const blockId of block_ids) {
      // ✅ MIGRAÇÃO: Buscar block do SQL (com filtro multi-tenant)
      let query = client
        .from('blocks')
        .select('id')
        .eq('id', blockId);
      
      // ✅ FILTRO MULTI-TENANT
      if (tenant.type === 'imobiliaria') {
        // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
        const organizationId = await getOrganizationIdOrThrow(c);
        query = query.eq('organization_id', organizationId);
      } else if (finalOrgId) {
        query = query.eq('organization_id', finalOrgId);
      }
      
      const { data: blockRow, error: fetchError } = await query.maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`❌ [bulk-delete] SQL error fetching block ${blockId}:`, fetchError);
        notFound.push(blockId);
        continue;
      }
      
      if (!blockRow) {
        notFound.push(blockId);
        continue;
      }
      
      // ✅ VERIFICAR PERMISSÃO: Se for imobiliária, garantir que block pertence à organização
      if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
        // ✅ Multi-tenant garantido pela query SQL (já filtra por organization_id)
        logInfo(`Block ${blockId} belongs to organization ${tenant.imobiliariaId}`);
      }
      
      // ✅ MIGRAÇÃO: Deletar do SQL (com filtro multi-tenant)
      let deleteQuery = client
        .from('blocks')
        .delete()
        .eq('id', blockId);
      
      // ✅ FILTRO MULTI-TENANT
      if (tenant.type === 'imobiliaria') {
        // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
        const organizationId = await getOrganizationIdOrThrow(c);
        deleteQuery = deleteQuery.eq('organization_id', organizationId);
      } else if (finalOrgId) {
        deleteQuery = deleteQuery.eq('organization_id', finalOrgId);
      }
      
      const { error: deleteError } = await deleteQuery;
      
      if (deleteError) {
        console.error(`❌ [bulk-delete] SQL error deleting block ${blockId}:`, deleteError);
        notFound.push(blockId);
        continue;
      }
      
      deleted.push(blockId);
    }

    return c.json({ 
      success: true, 
      data: { 
        deleted: deleted.length, 
        not_found: notFound.length,
        deleted_ids: deleted,
        not_found_ids: notFound 
      } 
    });
  } catch (error) {
    console.error('Error bulk deleting blocks:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET check availability (no blocks or reservations)
blocks.get('/check-availability', async (c) => {
  try {
    // ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
    const tenant = getTenant(c);
    const client = getSupabaseClient();
    
    const propertyId = c.req.query('property_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    
    // ✅ REFATORADO v1.0.103.500 - Usar helper híbrido para obter organization_id (UUID)
    // Não aceitar mais organization_id do query param ou do body
    let orgId: string | undefined;
    if (tenant.type !== 'superadmin') {
      orgId = await getOrganizationIdOrThrow(c);
    } else {
      // SuperAdmin pode passar organization_id no query se necessário
      orgId = c.req.query('organization_id');
    }
    
    if (!orgId || !propertyId || !startDate || !endDate) {
      return c.json({ 
        success: false, 
        error: 'organization_id, property_id, start_date, and end_date are required' 
      }, 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // ✅ MIGRAÇÃO: Verificar conflitos com blocks no SQL
    let blocksQuery = client
      .from('blocks')
      .select('id, start_date, end_date')
      .eq('property_id', propertyId)
      .or(`start_date.lt.${endDate},end_date.gt.${startDate}`);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      blocksQuery = blocksQuery.eq('organization_id', tenant.imobiliariaId);
    } else if (orgId) {
      blocksQuery = blocksQuery.eq('organization_id', orgId);
    }
    
    const { data: conflictingBlocks, error: blocksError } = await blocksQuery;
    
    if (blocksError && blocksError.code !== 'PGRST116') {
      console.error('❌ [check-availability] SQL error checking blocks:', blocksError);
      return c.json({ 
        success: false, 
        error: 'Erro ao verificar conflitos de blocos',
        details: blocksError.message
      }, 500);
    }

    // ✅ MIGRAÇÃO: Verificar conflitos com reservations no SQL
    let reservationsQuery = client
      .from('reservations')
      .select('id, check_in, check_out, status')
      .eq('property_id', propertyId)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .or(`check_in.lt.${endDate},check_out.gt.${startDate}`);
    
    // ✅ FILTRO MULTI-TENANT
    if (tenant.type === 'imobiliaria') {
      // ✅ REFATORADO: Usar helper híbrido para obter organization_id (UUID)
      const organizationId = await getOrganizationIdOrThrow(c);
      reservationsQuery = reservationsQuery.eq('organization_id', organizationId);
    } else if (orgId) {
      reservationsQuery = reservationsQuery.eq('organization_id', orgId);
    }
    
    const { data: conflictingReservations, error: reservationsError } = await reservationsQuery;
    
    if (reservationsError && reservationsError.code !== 'PGRST116') {
      console.error('❌ [check-availability] SQL error checking reservations:', reservationsError);
      return c.json({ 
        success: false, 
        error: 'Erro ao verificar conflitos de reservas',
        details: reservationsError.message
      }, 500);
    }

    const isAvailable = (!conflictingBlocks || conflictingBlocks.length === 0) && 
                        (!conflictingReservations || conflictingReservations.length === 0);

    return c.json({ 
      success: true, 
      data: {
        available: isAvailable,
        blocks: conflictingBlocks || [],
        reservations: conflictingReservations || []
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

export default blocks;
