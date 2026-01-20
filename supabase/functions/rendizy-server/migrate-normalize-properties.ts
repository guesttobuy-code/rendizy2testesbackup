/**
 * RENDIZY - Script de Migração de Propriedades
 * 
 * Converte propriedades existentes de estrutura aninhada (wizard)
 * para estrutura plana (normalizada)
 * 
 * @version 1.0.103.315
 * @date 2025-11-05
 * 
 * USO:
 * - Importar no index.tsx: app.post('/migrate-normalize-properties', migrateNormalizeProperties);
 * - Chamar via POST: /make-server-67caf26a/migrate-normalize-properties
 */

import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

interface Property {
  id: string;
  name?: string;
  photos?: any[];
  coverPhoto?: string;
  locationAmenities?: string[];
  listingAmenities?: string[];
  amenities?: string[];
  address?: any;
  description?: string;
  rooms?: any[];
  financialInfo?: any;
  
  // Estrutura wizard (aninhada)
  contentType?: any;
  contentLocation?: any;
  contentRooms?: any;
  contentLocationAmenities?: any;
  contentPropertyAmenities?: any;
  contentPhotos?: any;
  contentDescription?: any;
  settingsRules?: any;
  completedSteps?: string[];
  
  [key: string]: any;
}

/**
 * Normaliza uma propriedade individual
 */
function normalizeProperty(property: Property): Property {
  console.log(`\n📦 Normalizando propriedade: ${property.id}`);
  
  let changed = false;
  const updates: any = {};
  
  // 1. NOME
  if (!property.name && property.contentType?.internalName) {
    updates.name = property.contentType.internalName;
    changed = true;
    console.log(`   ✅ Nome extraído: ${updates.name}`);
  }
  
  // 2. FOTOS
  if (property.contentPhotos?.photos && Array.isArray(property.contentPhotos.photos)) {
    if (!property.photos || property.photos.length === 0) {
      updates.photos = property.contentPhotos.photos.map((p: any) => {
        if (typeof p === 'object' && p.url) {
          return {
            url: p.url,
            isCover: p.isCover || false,
            category: p.category || 'other',
            order: p.order || 0,
          };
        }
        return { url: p, isCover: false, category: 'other', order: 0 };
      });
      changed = true;
      console.log(`   ✅ Fotos extraídas: ${updates.photos.length} fotos`);
      
      // 2.1 FOTO DE CAPA
      const cover = updates.photos.find((p: any) => p.isCover);
      if (cover) {
        updates.coverPhoto = cover.url;
      } else if (updates.photos[0]) {
        updates.coverPhoto = updates.photos[0].url || updates.photos[0];
      }
      if (updates.coverPhoto) {
        console.log(`   ✅ Foto de capa definida`);
      }
    }
  }
  
  // 3. AMENIDADES DO LOCAL
  if (property.contentLocationAmenities?.amenities && Array.isArray(property.contentLocationAmenities.amenities)) {
    if (!property.locationAmenities || property.locationAmenities.length === 0) {
      updates.locationAmenities = property.contentLocationAmenities.amenities;
      changed = true;
      console.log(`   ✅ Amenidades do local extraídas: ${updates.locationAmenities.length} itens`);
    }
  }
  
  // 4. AMENIDADES DO ANÚNCIO
  if (property.contentPropertyAmenities?.listingAmenities && Array.isArray(property.contentPropertyAmenities.listingAmenities)) {
    if (!property.listingAmenities || property.listingAmenities.length === 0) {
      updates.listingAmenities = property.contentPropertyAmenities.listingAmenities;
      changed = true;
      console.log(`   ✅ Amenidades do anúncio extraídas: ${updates.listingAmenities.length} itens`);
    }
  }
  
  // 5. AMENIDADES COMBINADAS (campo legado)
  if (updates.locationAmenities || updates.listingAmenities) {
    const loc = updates.locationAmenities || property.locationAmenities || [];
    const list = updates.listingAmenities || property.listingAmenities || [];
    updates.amenities = [...new Set([...loc, ...list])];
    console.log(`   ✅ Amenidades combinadas: ${updates.amenities.length} itens`);
  }
  
  // 6. ENDEREÇO
  if (property.contentLocation?.address && (!property.address || Object.keys(property.address).length === 0)) {
    updates.address = property.contentLocation.address;
    changed = true;
    console.log(`   ✅ Endereço extraído: ${updates.address.city}, ${updates.address.state}`);
  }
  
  // 7. DESCRIÇÃO
  if (property.contentDescription?.fixedFields?.description && !property.description) {
    updates.description = property.contentDescription.fixedFields.description;
    changed = true;
    console.log(`   ✅ Descrição extraída`);
  }
  
  // 8. CÔMODOS
  if (property.contentRooms?.rooms && (!property.rooms || property.rooms.length === 0)) {
    updates.rooms = property.contentRooms.rooms;
    changed = true;
    console.log(`   ✅ Cômodos extraídos: ${updates.rooms.length} cômodos`);
  }
  
  // 9. DADOS FINANCEIROS
  if (property.contentType?.financialData && (!property.financialInfo || Object.keys(property.financialInfo).length === 0)) {
    updates.financialInfo = property.contentType.financialData;
    changed = true;
    console.log(`   ✅ Dados financeiros extraídos`);
  }
  
  if (changed) {
    console.log(`   🎯 Total de campos normalizados: ${Object.keys(updates).length}`);
    return {
      ...property,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }
  
  console.log(`   ⏭️  Propriedade já normalizada, pulando...`);
  return property;
}

/**
 * Migra todas as propriedades do sistema
 */
export async function migrateNormalizeProperties(c: Context) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 INICIANDO MIGRAÇÃO DE NORMALIZAÇÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Buscar todas as propriedades
    const properties = await kv.getByPrefix<Property>('property:');
    
    console.log(`\n📊 Total de propriedades encontradas: ${properties.length}`);
    
    if (properties.length === 0) {
      return c.json({
        success: true,
        message: 'Nenhuma propriedade encontrada para migrar',
        stats: {
          total: 0,
          migrated: 0,
          skipped: 0,
          errors: 0,
        },
      });
    }
    
    const stats = {
      total: properties.length,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };
    
    // Processar cada propriedade
    for (const property of properties) {
      try {
        const normalized = normalizeProperty(property);
        
        // Verificar se houve mudanças
        if (normalized.updatedAt !== property.updatedAt) {
          // Salvar propriedade normalizada
          await kv.set(`property:${property.id}`, normalized);
          stats.migrated++;
          
          stats.details.push({
            id: property.id,
            name: normalized.name || property.name || 'Sem nome',
            status: 'migrated',
            changes: {
              name: !!normalized.name && normalized.name !== property.name,
              photos: (normalized.photos?.length || 0) > (property.photos?.length || 0),
              locationAmenities: (normalized.locationAmenities?.length || 0) > (property.locationAmenities?.length || 0),
              listingAmenities: (normalized.listingAmenities?.length || 0) > (property.listingAmenities?.length || 0),
            },
          });
        } else {
          stats.skipped++;
          
          stats.details.push({
            id: property.id,
            name: property.name || 'Sem nome',
            status: 'skipped',
            reason: 'Já normalizado',
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao migrar propriedade ${property.id}:`, error);
        stats.errors++;
        
        stats.details.push({
          id: property.id,
          name: property.name || 'Sem nome',
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRAÇÃO CONCLUÍDA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 ESTATÍSTICAS:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Migradas: ${stats.migrated}`);
    console.log(`   Puladas: ${stats.skipped}`);
    console.log(`   Erros: ${stats.errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return c.json({
      success: true,
      message: `Migração concluída: ${stats.migrated} propriedades normalizadas, ${stats.skipped} já estavam corretas, ${stats.errors} erros`,
      stats,
    });
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return c.json({
      success: false,
      error: 'Erro ao executar migração',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
}
