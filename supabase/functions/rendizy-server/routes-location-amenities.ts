/**
 * RENDIZY - Location Amenities Routes
 * 
 * Rotas para gerenciar configurações de amenidades de Locations
 * - Somente Admin Master pode editar
 * - Configurações globais que definem quais amenidades estão disponíveis
 * 
 * @version 1.0.103.11
 * @date 2025-10-29
 */

import { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

const LOCATION_AMENITIES_KEY = 'settings:location-amenities';

// ============================================================================
// TYPES
// ============================================================================

interface LocationAmenitiesConfig {
  enabledCategories: string[];
  enabledAmenities: string[];
  allowCustomAmenities: boolean;
  customAmenities: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: LocationAmenitiesConfig = {
  enabledCategories: [
    'accessibility',
    'outdoor',
    'bathroom',
    'climate',
    'kitchen',
    'entertainment',
    'parking',
    'family',
    'internet',
    'cleaning',
    'bedroom',
    'security',
    'services'
  ],
  enabledAmenities: [], // Todas habilitadas por padrão (vazio = todas)
  allowCustomAmenities: true,
  customAmenities: []
};

// ============================================================================
// GET CONFIG
// ============================================================================

export async function getLocationAmenitiesConfig(c: Context) {
  try {
    const config = await kv.get(LOCATION_AMENITIES_KEY);

    return c.json({
      config: config || DEFAULT_CONFIG
    });
  } catch (error) {
    console.error('Erro ao buscar configuração de amenidades:', error);
    return c.json({ error: 'Erro ao buscar configuração' }, 500);
  }
}

// ============================================================================
// UPDATE CONFIG
// ============================================================================

export async function updateLocationAmenitiesConfig(c: Context) {
  try {
    const body = await c.req.json();
    const { config } = body;

    if (!config) {
      return c.json({ error: 'Configuração não fornecida' }, 400);
    }

    // Validar estrutura básica
    if (!Array.isArray(config.enabledCategories)) {
      return c.json({ error: 'enabledCategories deve ser um array' }, 400);
    }

    if (!Array.isArray(config.enabledAmenities)) {
      return c.json({ error: 'enabledAmenities deve ser um array' }, 400);
    }

    // Salvar configuração
    await kv.set(LOCATION_AMENITIES_KEY, config);

    console.log('✅ Configuração de amenidades salva:', {
      enabledCategories: config.enabledCategories.length,
      enabledAmenities: config.enabledAmenities.length,
      customAmenities: config.customAmenities?.length || 0
    });

    return c.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração de amenidades:', error);
    return c.json({ error: 'Erro ao atualizar configuração' }, 500);
  }
}

// ============================================================================
// RESET TO DEFAULT
// ============================================================================

export async function resetLocationAmenitiesConfig(c: Context) {
  try {
    await kv.set(LOCATION_AMENITIES_KEY, DEFAULT_CONFIG);

    console.log('✅ Configuração de amenidades resetada para padrão');

    return c.json({
      success: true,
      config: DEFAULT_CONFIG
    });
  } catch (error) {
    console.error('Erro ao resetar configuração de amenidades:', error);
    return c.json({ error: 'Erro ao resetar configuração' }, 500);
  }
}

// ============================================================================
// GET ENABLED AMENITIES FOR LOCATION
// ============================================================================

/**
 * Retorna lista de amenidades habilitadas para uso em Locations
 * Usado ao criar/editar um Location
 */
export async function getEnabledAmenitiesForLocation(c: Context) {
  try {
    const config = await kv.get(LOCATION_AMENITIES_KEY);
    const finalConfig = config || DEFAULT_CONFIG;

    return c.json({
      categories: finalConfig.enabledCategories,
      amenities: finalConfig.enabledAmenities,
      allowCustom: finalConfig.allowCustomAmenities,
      customAmenities: finalConfig.customAmenities || []
    });
  } catch (error) {
    console.error('Erro ao buscar amenidades habilitadas:', error);
    return c.json({ error: 'Erro ao buscar amenidades' }, 500);
  }
}
