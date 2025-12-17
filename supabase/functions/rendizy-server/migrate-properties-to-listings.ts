/**
 * SCRIPT DE MIGRAÇÃO: Property.platforms → Listings
 * 
 * Migra dados de Property.platforms (KV Store) para tabela listings (SQL)
 * 
 * @version 1.0.103.400
 * @date 2025-11-17
 * 
 * USO:
 * - Executar via rota temporária no backend
 * - Ou executar via script Node.js
 */

import * as kv from './kv_store.tsx';
import type { Property } from './types.ts';
import { listingToSql, LISTING_SELECT_FIELDS } from './utils-listing-mapper.ts';
import { getSupabaseClient } from './kv_store.tsx';

// ============================================================================
// TYPES
// ============================================================================

interface MigrationResult {
  totalProperties: number;
  propertiesWithPlatforms: number;
  listingsCreated: number;
  errors: Array<{ propertyId: string; error: string }>;
}

// ============================================================================
// MIGRAÇÃO
// ============================================================================

/**
 * Migra Property.platforms para tabela listings
 * 
 * Para cada Property que tem platforms.enabled === true:
 * - Cria um listing na tabela listings
 * - Uma property pode ter múltiplos listings (um por plataforma)
 */
export async function migratePropertiesToListings(): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalProperties: 0,
    propertiesWithPlatforms: 0,
    listingsCreated: 0,
    errors: [],
  };

  try {
    console.log('🔄 [Migration] Iniciando migração Property.platforms → Listings...');

    const client = getSupabaseClient();

    // ✅ OPÇÃO 1: Buscar properties do SQL (se já migrado)
    // Se properties já estão em SQL, buscar de lá
    const { data: sqlProperties, error: sqlError } = await client
      .from('properties')
      .select('id, organization_id, platforms');

    // ✅ OPÇÃO 2: Buscar properties do KV Store (se ainda não migrado)
    // Se properties ainda estão no KV Store, buscar de lá
    const kvProperties = await kv.getByPrefix<Property>('property:');

    // Usar SQL se disponível, senão usar KV Store
    const properties: Array<{ id: string; organization_id?: string; platforms?: any }> = 
      sqlProperties || kvProperties.map(p => ({
        id: p.id,
        organization_id: (p as any).organization_id || (p as any).organizationId,
        platforms: p.platforms,
      }));

    result.totalProperties = properties.length;
    console.log(`📊 [Migration] Total de properties encontradas: ${result.totalProperties}`);

    // Para cada property, verificar se tem platforms habilitados
    for (const property of properties) {
      if (!property.platforms) {
        continue; // Pula se não tiver platforms
      }

      const platforms = property.platforms;
      let hasEnabledPlatform = false;

      // Verificar cada plataforma
      const platformList: Array<{ platform: string; data: any }> = [];

      if (platforms.airbnb?.enabled) {
        hasEnabledPlatform = true;
        platformList.push({ platform: 'airbnb', data: platforms.airbnb });
      }

      if (platforms.booking?.enabled) {
        hasEnabledPlatform = true;
        platformList.push({ platform: 'booking', data: platforms.booking });
      }

      if (platforms.decolar?.enabled) {
        hasEnabledPlatform = true;
        platformList.push({ platform: 'decolar', data: platforms.decolar });
      }

      if (platforms.direct === true || platforms.direct?.enabled) {
        hasEnabledPlatform = true;
        platformList.push({ platform: 'direct', data: platforms.direct || { enabled: true } });
      }

      if (!hasEnabledPlatform) {
        continue; // Pula se não tiver nenhuma plataforma habilitada
      }

      result.propertiesWithPlatforms++;

      // Determinar organization_id
      const organizationId = property.organization_id || '';
      if (!organizationId) {
        result.errors.push({
          propertyId: property.id,
          error: 'organization_id não encontrado',
        });
        console.warn(`⚠️ [Migration] Property ${property.id} sem organization_id, pulando...`);
        continue;
      }

      // Para cada plataforma habilitada, criar um listing
      for (const { platform, data } of platformList) {
        try {
          // Montar dados do listing baseado no Property
          const listingData: Partial<Property & { accommodationId: string; ownerId: string; platforms: any }> = {
            accommodationId: property.id,
            ownerId: organizationId,
            platforms: {
              [platform]: {
                enabled: true,
                status: data.syncEnabled ? 'published' : 'draft',
                externalId: data.listingId || null,
                listingUrl: null, // Não temos URL no Property.platforms
                lastSync: null,
                syncCalendar: data.syncEnabled || false,
                syncPricing: data.syncEnabled || false,
                syncAvailability: data.syncEnabled || false,
              },
            },
          };

          // Converter para SQL
          const sqlData = listingToSql(listingData as any, organizationId);

          // Inserir no SQL
          const { error: insertError } = await client
            .from('listings')
            .insert(sqlData)
            .select(LISTING_SELECT_FIELDS)
            .maybeSingle();

          if (insertError) {
            // Se erro for UNIQUE constraint (property_id, platform), significa que já existe
            if (insertError.code === '23505') {
              console.log(`ℹ️ [Migration] Listing já existe para property ${property.id} na plataforma ${platform}, pulando...`);
              continue;
            }

            throw insertError;
          }

          result.listingsCreated++;
          console.log(`✅ [Migration] Listing criado: property ${property.id}, platform ${platform}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            propertyId: property.id,
            error: `Erro ao criar listing para plataforma ${platform}: ${errorMessage}`,
          });
          console.error(`❌ [Migration] Erro ao criar listing para property ${property.id}, platform ${platform}:`, error);
        }
      }
    }

    console.log(`✅ [Migration] Migração concluída!`);
    console.log(`📊 [Migration] Resumo:`);
    console.log(`   - Total de properties: ${result.totalProperties}`);
    console.log(`   - Properties com platforms: ${result.propertiesWithPlatforms}`);
    console.log(`   - Listings criados: ${result.listingsCreated}`);
    console.log(`   - Erros: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.warn(`⚠️ [Migration] Erros encontrados:`);
      result.errors.forEach(err => {
        console.warn(`   - Property ${err.propertyId}: ${err.error}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ [Migration] Erro fatal na migração:', error);
    throw error;
  }
}

// ============================================================================
// ROTA TEMPORÁRIA (para executar via API)
// ============================================================================

/**
 * Rota temporária para executar migração via API
 * 
 * GET /migrate/properties-to-listings
 * 
 * ⚠️ REMOVER APÓS MIGRAÇÃO SER EXECUTADA EM PRODUÇÃO
 */
export async function migratePropertiesToListingsRoute(c: any) {
  try {
    console.log('🔄 [Migration] Migração iniciada via rota...');

    const result = await migratePropertiesToListings();

    return c.json({
      success: true,
      message: 'Migração concluída',
      data: result,
    });
  } catch (error) {
    console.error('❌ [Migration] Erro na migração:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, 500);
  }
}

