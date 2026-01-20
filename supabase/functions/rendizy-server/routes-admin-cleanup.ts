// ============================================================================
// ROUTES - ADMIN CLEANUP
// ============================================================================
// Rotas administrativas para limpeza COMPLETA do banco de dados
// v1.0.103.272 - DELETE ALL PROPERTIES
// ============================================================================

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// DELETE ALL PROPERTIES - LIMPEZA COMPLETA
// ============================================================================

/**
 * DELETE /admin/cleanup/properties
 * 
 * Deleta TODAS as propriedades, locations e dados relacionados do sistema
 * ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
 * 
 * Deleta:
 * - Todas as Properties (prop_, acc_)
 * - Todas as Locations (loc_)
 * - Todos os Short IDs associados
 * - Todas as Photos
 * - Todos os Rooms
 * - Todas as Listings
 * - Todas as Reservations
 * - Todos os Blocks
 * - Todos os Prices
 */
app.delete('/admin/cleanup/properties', async (c) => {
  console.log('🗑️ [ADMIN CLEANUP] Iniciando LIMPEZA COMPLETA de todas as propriedades...');
  
  try {
    const startTime = Date.now();
    let deletedCount = 0;
    
    // ========================================================================
    // STEP 1: DELETAR TODAS AS PROPERTIES
    // ========================================================================
    
    console.log('📦 [STEP 1/8] Deletando PROPERTIES...');
    
    const allProperties = await kv.getByPrefix('property:');
    console.log(`   Encontradas ${allProperties.length} properties para deletar`);
    
    for (const property of allProperties) {
      await kv.del(`property:${property.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allProperties.length} properties deletadas`);
    
    // ========================================================================
    // STEP 2: DELETAR TODAS AS LOCATIONS
    // ========================================================================
    
    console.log('📍 [STEP 2/8] Deletando LOCATIONS...');
    
    const allLocations = await kv.getByPrefix('location:');
    console.log(`   Encontradas ${allLocations.length} locations para deletar`);
    
    for (const location of allLocations) {
      await kv.del(`location:${location.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allLocations.length} locations deletadas`);
    
    // ========================================================================
    // STEP 3: DELETAR TODOS OS SHORT IDS
    // ========================================================================
    
    console.log('🔤 [STEP 3/8] Deletando SHORT IDs...');
    
    // Deletar mapeamento shortId -> longId
    const allShortIdMappings = await kv.getByPrefix('short_id:');
    console.log(`   Encontrados ${allShortIdMappings.length} mapeamentos de Short IDs`);
    
    for (const mapping of allShortIdMappings) {
      // Short ID mapping: short_id:{tenantId}:{shortId}
      const keys = Object.keys(mapping);
      for (const key of keys) {
        if (key.startsWith('short_id:')) {
          await kv.del(key);
          deletedCount++;
        }
      }
    }
    
    // Deletar índice reverso longId -> shortId
    const allReverseMappings = await kv.getByPrefix('short_id_reverse:');
    console.log(`   Encontrados ${allReverseMappings.length} mapeamentos reversos`);
    
    for (const mapping of allReverseMappings) {
      const keys = Object.keys(mapping);
      for (const key of keys) {
        if (key.startsWith('short_id_reverse:')) {
          await kv.del(key);
          deletedCount++;
        }
      }
    }
    
    console.log(`   ✅ Short IDs deletados`);
    
    // ========================================================================
    // STEP 4: DELETAR TODAS AS PHOTOS
    // ========================================================================
    
    console.log('📸 [STEP 4/8] Deletando PHOTOS...');
    
    const allPhotos = await kv.getByPrefix('photo:');
    console.log(`   Encontradas ${allPhotos.length} photos para deletar`);
    
    for (const photo of allPhotos) {
      await kv.del(`photo:${photo.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allPhotos.length} photos deletadas`);
    
    // ========================================================================
    // STEP 5: DELETAR TODOS OS ROOMS
    // ========================================================================
    
    console.log('🛏️ [STEP 5/8] Deletando ROOMS...');
    
    const allRooms = await kv.getByPrefix('room:');
    console.log(`   Encontrados ${allRooms.length} rooms para deletar`);
    
    for (const room of allRooms) {
      await kv.del(`room:${room.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allRooms.length} rooms deletados`);
    
    // ========================================================================
    // STEP 6: DELETAR TODAS AS LISTINGS
    // ========================================================================
    
    console.log('📋 [STEP 6/8] Deletando LISTINGS...');
    
    const allListings = await kv.getByPrefix('listing:');
    console.log(`   Encontrados ${allListings.length} listings para deletar`);
    
    for (const listing of allListings) {
      await kv.del(`listing:${listing.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allListings.length} listings deletados`);
    
    // ========================================================================
    // STEP 7: DELETAR TODAS AS RESERVATIONS
    // ========================================================================
    
    console.log('📅 [STEP 7/8] Deletando RESERVATIONS...');
    
    const allReservations = await kv.getByPrefix('reservation:');
    console.log(`   Encontradas ${allReservations.length} reservations para deletar`);
    
    for (const reservation of allReservations) {
      await kv.del(`reservation:${reservation.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allReservations.length} reservations deletadas`);
    
    // ========================================================================
    // STEP 8: DELETAR TODOS OS BLOCKS
    // ========================================================================
    
    console.log('🚫 [STEP 8/8] Deletando BLOCKS...');
    
    const allBlocks = await kv.getByPrefix('block:');
    console.log(`   Encontrados ${allBlocks.length} blocks para deletar`);
    
    for (const block of allBlocks) {
      await kv.del(`block:${block.id}`);
      deletedCount++;
    }
    
    console.log(`   ✅ ${allBlocks.length} blocks deletados`);
    
    // ========================================================================
    // FINALIZAÇÃO
    // ========================================================================
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    const summary = {
      properties: allProperties.length,
      locations: allLocations.length,
      photos: allPhotos.length,
      rooms: allRooms.length,
      listings: allListings.length,
      reservations: allReservations.length,
      blocks: allBlocks.length,
      totalDeleted: deletedCount,
      durationSeconds: duration,
    };
    
    console.log('✅ [ADMIN CLEANUP] Limpeza completa FINALIZADA!');
    console.log('📊 Resumo:', JSON.stringify(summary, null, 2));
    
    return c.json({
      success: true,
      message: 'Todas as propriedades e dados relacionados foram deletados com sucesso',
      data: summary,
    });
    
  } catch (error) {
    console.error('❌ [ADMIN CLEANUP] Erro ao deletar propriedades:', error);
    
    return c.json({
      success: false,
      message: 'Erro ao deletar propriedades',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================================
// GET STATUS - Verificar quantos registros serão deletados
// ============================================================================

/**
 * GET /admin/cleanup/properties/status
 * 
 * Retorna a quantidade de registros que serão deletados (sem deletar)
 */
app.get('/admin/cleanup/properties/status', async (c) => {
  console.log('📊 [ADMIN CLEANUP] Verificando status...');
  
  try {
    const properties = await kv.getByPrefix('property:');
    const locations = await kv.getByPrefix('location:');
    const photos = await kv.getByPrefix('photo:');
    const rooms = await kv.getByPrefix('room:');
    const listings = await kv.getByPrefix('listing:');
    const reservations = await kv.getByPrefix('reservation:');
    const blocks = await kv.getByPrefix('block:');
    const shortIds = await kv.getByPrefix('short_id:');
    
    const total = 
      properties.length +
      locations.length +
      photos.length +
      rooms.length +
      listings.length +
      reservations.length +
      blocks.length +
      shortIds.length;
    
    const status = {
      properties: properties.length,
      locations: locations.length,
      photos: photos.length,
      rooms: rooms.length,
      listings: listings.length,
      reservations: reservations.length,
      blocks: blocks.length,
      shortIds: shortIds.length,
      totalToDelete: total,
    };
    
    console.log('📊 Status:', JSON.stringify(status, null, 2));
    
    return c.json({
      success: true,
      data: status,
    });
    
  } catch (error) {
    console.error('❌ [ADMIN CLEANUP] Erro ao verificar status:', error);
    
    return c.json({
      success: false,
      message: 'Erro ao verificar status',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================================================
// DELETE SPECIFIC IDs - Deletar IDs específicos
// ============================================================================

/**
 * POST /admin/cleanup/properties/specific
 * 
 * Deleta apenas os IDs específicos fornecidos
 * 
 * Body:
 * {
 *   "ids": ["prop_xxx", "loc_xxx", ...]
 * }
 */
app.post('/admin/cleanup/properties/specific', async (c) => {
  console.log('🗑️ [ADMIN CLEANUP] Deletando IDs específicos...');
  
  try {
    const body = await c.req.json();
    const { ids } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({
        success: false,
        message: 'Lista de IDs é obrigatória',
      }, 400);
    }
    
    console.log(`   Deletando ${ids.length} IDs específicos...`);
    
    let deletedCount = 0;
    const errors = [];
    
    for (const id of ids) {
      try {
        // Determinar o tipo baseado no prefixo
        let key = '';
        
        if (id.startsWith('loc_')) {
          key = `location:${id}`;
        } else if (id.startsWith('prop_') || id.startsWith('acc_')) {
          key = `property:${id}`;
        } else if (id.startsWith('photo_')) {
          key = `photo:${id}`;
        } else if (id.startsWith('room_')) {
          key = `room:${id}`;
        } else if (id.startsWith('listing_')) {
          key = `listing:${id}`;
        } else if (id.startsWith('res_')) {
          key = `reservation:${id}`;
        } else if (id.startsWith('block_')) {
          key = `block:${id}`;
        } else {
          console.warn(`   ⚠️ ID desconhecido: ${id}`);
          errors.push({ id, error: 'Prefixo desconhecido' });
          continue;
        }
        
        await kv.del(key);
        deletedCount++;
        console.log(`   ✅ Deletado: ${id}`);
        
      } catch (error) {
        console.error(`   ❌ Erro ao deletar ${id}:`, error);
        errors.push({ 
          id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    console.log(`✅ ${deletedCount}/${ids.length} IDs deletados com sucesso`);
    
    return c.json({
      success: true,
      message: `${deletedCount}/${ids.length} IDs deletados com sucesso`,
      data: {
        totalRequested: ids.length,
        deleted: deletedCount,
        failed: errors.length,
        errors,
      },
    });
    
  } catch (error) {
    console.error('❌ [ADMIN CLEANUP] Erro ao deletar IDs específicos:', error);
    
    return c.json({
      success: false,
      message: 'Erro ao deletar IDs específicos',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default app;
