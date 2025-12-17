/**
 * RENDIZY - Property Types Routes
 * 
 * Gerenciamento de Tipos de Local e Tipos de Anúncio
 * Acesso restrito: SOMENTE ADMIN MASTER
 * 
 * @version 1.0.103.8
 * @date 2025-10-29
 */

import { Hono } from 'npm:hono@4.6.14';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// TIPOS
// ============================================================================

interface PropertyType {
  id: string;
  code: string;
  name: string;
  category: 'location' | 'accommodation';
  icon?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SEED DE TIPOS PADRÃO DO SISTEMA
// ============================================================================

const SYSTEM_LOCATION_TYPES: Omit<PropertyType, 'id' | 'created_at' | 'updated_at' | 'usage_count'>[] = [
  // Tipos de Local (Structure Types)
  { code: 'acomodacao_movel', name: 'Acomodação Móvel', category: 'location', icon: '🚐', description: 'Trailers, motorhomes, etc', isActive: true, isSystem: true },
  { code: 'albergue', name: 'Albergue', category: 'location', icon: '🏕️', description: 'Hospedagem compartilhada', isActive: true, isSystem: true },
  { code: 'apartamento', name: 'Apartamento', category: 'location', icon: '🏢', description: 'Unidade residencial em prédio', isActive: true, isSystem: true },
  { code: 'apartamento_residencial', name: 'Apartamento/Residencial', category: 'location', icon: '🏘️', description: 'Condomínio residencial', isActive: true, isSystem: true },
  { code: 'bangalo', name: 'Bangalô', category: 'location', icon: '🏡', description: 'Casa térrea independente', isActive: true, isSystem: true },
  { code: 'barco', name: 'Barco', category: 'location', icon: '⛵', description: 'Embarcação', isActive: true, isSystem: true },
  { code: 'barco_beira', name: 'Barco/Beira', category: 'location', icon: '🚤', description: 'Barco atracado', isActive: true, isSystem: true },
  { code: 'boutique', name: 'Boutique Hotel', category: 'location', icon: '✨', description: 'Hotel boutique de alto padrão', isActive: true, isSystem: true },
  { code: 'cabana', name: 'Cabana', category: 'location', icon: '🛖', description: 'Construção rústica', isActive: true, isSystem: true },
  { code: 'cama_cafe', name: 'Cama e Café (B&B)', category: 'location', icon: '☕', description: 'Bed & Breakfast', isActive: true, isSystem: true },
  { code: 'camping', name: 'Camping', category: 'location', icon: '⛺', description: 'Área de acampamento', isActive: true, isSystem: true },
  { code: 'casa', name: 'Casa', category: 'location', icon: '🏠', description: 'Casa independente', isActive: true, isSystem: true },
  { code: 'casa_movel', name: 'Casa Móvel', category: 'location', icon: '🚚', description: 'Trailer fixo', isActive: true, isSystem: true },
  { code: 'castelo', name: 'Castelo', category: 'location', icon: '🏰', description: 'Castelo ou fortaleza', isActive: true, isSystem: true },
  { code: 'chale', name: 'Chalé', category: 'location', icon: '🏔️', description: 'Casa de montanha', isActive: true, isSystem: true },
  { code: 'chale_camping', name: 'Chalé (Área de Camping)', category: 'location', icon: '🏕️', description: 'Chalé em camping', isActive: true, isSystem: true },
  { code: 'condominio', name: 'Condomínio', category: 'location', icon: '🏘️', description: 'Conjunto residencial', isActive: true, isSystem: true },
  { code: 'estalagem', name: 'Estalagem', category: 'location', icon: '🏨', description: 'Pousada tradicional', isActive: true, isSystem: true },
  { code: 'fazenda', name: 'Fazenda para Viajantes', category: 'location', icon: '🌾', description: 'Propriedade rural', isActive: true, isSystem: true },
  { code: 'hotel', name: 'Hotel', category: 'location', icon: '🏨', description: 'Hotel tradicional', isActive: true, isSystem: true },
  { code: 'hotel_boutique', name: 'Hotel Boutique', category: 'location', icon: '💎', description: 'Hotel exclusivo e sofisticado', isActive: true, isSystem: true },
  { code: 'hostel', name: 'Hostel', category: 'location', icon: '🛏️', description: 'Albergue moderno', isActive: true, isSystem: true },
  { code: 'iate', name: 'Iate', category: 'location', icon: '🛥️', description: 'Embarcação de luxo', isActive: true, isSystem: true },
  { code: 'industrial', name: 'Industrial', category: 'location', icon: '🏭', description: 'Espaço industrial convertido', isActive: true, isSystem: true },
  { code: 'motel', name: 'Motel/Carro', category: 'location', icon: '🚗', description: 'Motel', isActive: true, isSystem: true },
  { code: 'pousada', name: 'Pousada Exclusiva', category: 'location', icon: '🏡', description: 'Pousada boutique', isActive: true, isSystem: true },
  { code: 'residencia', name: 'Residência', category: 'location', icon: '🏡', description: 'Casa residencial', isActive: true, isSystem: true },
  { code: 'resort', name: 'Resort', category: 'location', icon: '🏖️', description: 'Resort com infraestrutura completa', isActive: true, isSystem: true },
  { code: 'treehouse', name: 'Treehouse (Casa na Árvore)', category: 'location', icon: '🌳', description: 'Casa construída em árvore', isActive: true, isSystem: true },
  { code: 'villa', name: 'Villa/Casa', category: 'location', icon: '🏰', description: 'Casa de alto padrão', isActive: true, isSystem: true },
];

const SYSTEM_ACCOMMODATION_TYPES: Omit<PropertyType, 'id' | 'created_at' | 'updated_at' | 'usage_count'>[] = [
  // Tipos de Anúncio (Accommodation Types)
  { code: 'apartamento', name: 'Apartamento', category: 'accommodation', icon: '🏢', description: 'Apartamento completo', isActive: true, isSystem: true },
  { code: 'bangalo', name: 'Bangalô', category: 'accommodation', icon: '🏡', description: 'Bangalô independente', isActive: true, isSystem: true },
  { code: 'cabana', name: 'Cabana', category: 'accommodation', icon: '🛖', description: 'Cabana rústica', isActive: true, isSystem: true },
  { code: 'camping', name: 'Camping', category: 'accommodation', icon: '⛺', description: 'Local de camping', isActive: true, isSystem: true },
  { code: 'capsula', name: 'Cápsula/Trailer/Casa Móvel', category: 'accommodation', icon: '🚐', description: 'Acomodação móvel', isActive: true, isSystem: true },
  { code: 'casa', name: 'Casa', category: 'accommodation', icon: '🏠', description: 'Casa completa', isActive: true, isSystem: true },
  { code: 'casa_dormitorios', name: 'Casa em Dormitórios', category: 'accommodation', icon: '🏠', description: 'Casa com quartos compartilhados', isActive: true, isSystem: true },
  { code: 'chale', name: 'Chalé', category: 'accommodation', icon: '🏔️', description: 'Chalé de montanha', isActive: true, isSystem: true },
  { code: 'condominio', name: 'Condomínio', category: 'accommodation', icon: '🏘️', description: 'Unidade em condomínio', isActive: true, isSystem: true },
  { code: 'dormitorio', name: 'Dormitório', category: 'accommodation', icon: '🛏️', description: 'Dormitório compartilhado', isActive: true, isSystem: true },
  { code: 'estudio', name: 'Estúdio', category: 'accommodation', icon: '🏠', description: 'Apartamento estúdio', isActive: true, isSystem: true },
  { code: 'holiday_home', name: 'Holiday Home', category: 'accommodation', icon: '🏖️', description: 'Casa de temporada', isActive: true, isSystem: true },
  { code: 'hostel', name: 'Hostel', category: 'accommodation', icon: '🛏️', description: 'Quarto de hostel', isActive: true, isSystem: true },
  { code: 'hotel', name: 'Hotel', category: 'accommodation', icon: '🏨', description: 'Quarto de hotel', isActive: true, isSystem: true },
  { code: 'iate', name: 'Iate', category: 'accommodation', icon: '🛥️', description: 'Cabine de iate', isActive: true, isSystem: true },
  { code: 'industrial', name: 'Industrial', category: 'accommodation', icon: '🏭', description: 'Loft industrial', isActive: true, isSystem: true },
  { code: 'loft', name: 'Loft', category: 'accommodation', icon: '🏢', description: 'Loft moderno', isActive: true, isSystem: true },
  { code: 'quarto_compartilhado', name: 'Quarto Compartilhado', category: 'accommodation', icon: '👥', description: 'Quarto compartilhado', isActive: true, isSystem: true },
  { code: 'quarto_inteiro', name: 'Quarto Inteiro', category: 'accommodation', icon: '🚪', description: 'Quarto privativo com banheiro', isActive: true, isSystem: true },
  { code: 'quarto_privado', name: 'Quarto Privado', category: 'accommodation', icon: '🔐', description: 'Quarto privativo sem banheiro', isActive: true, isSystem: true },
  { code: 'suite', name: 'Suíte', category: 'accommodation', icon: '🛏️', description: 'Suíte com banheiro privativo', isActive: true, isSystem: true },
  { code: 'treehouse', name: 'Treehouse', category: 'accommodation', icon: '🌳', description: 'Casa na árvore', isActive: true, isSystem: true },
  { code: 'villa', name: 'Villa/Casa', category: 'accommodation', icon: '🏰', description: 'Villa completa', isActive: true, isSystem: true },
];

// ============================================================================
// HELPER: SEED TIPOS DO SISTEMA
// ============================================================================

async function seedSystemTypes() {
  const allTypes = [...SYSTEM_LOCATION_TYPES, ...SYSTEM_ACCOMMODATION_TYPES];

  for (const type of allTypes) {
    const key = `property_type:${type.category}:${type.code}`;
    const existing = await kv.get(key);

    if (!existing) {
      const newType: PropertyType = {
        ...type,
        id: `${type.category}_${type.code}_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
      };

      await kv.set(key, newType);
      console.log(`✅ Seeded system type: ${type.name} (${type.category})`);
    }
  }
}

// ============================================================================
// GET ALL TYPES
// ============================================================================

app.get('/', async (c) => {
  try {
    // Seed tipos do sistema na primeira chamada
    const locationTypes = await kv.getByPrefix('property_type:location:');
    const accommodationTypes = await kv.getByPrefix('property_type:accommodation:');

    if (locationTypes.length === 0 && accommodationTypes.length === 0) {
      await seedSystemTypes();
    }

    // Buscar novamente após seed
    const allLocationTypes = await kv.getByPrefix('property_type:location:');
    const allAccommodationTypes = await kv.getByPrefix('property_type:accommodation:');

    // Calcular usage_count (aqui você pode implementar uma busca real nas propriedades)
    const allTypes = [...allLocationTypes, ...allAccommodationTypes].map((type) => ({
      ...type,
      usage_count: type.usage_count || 0,
    }));

    return c.json(allTypes);
  } catch (error: any) {
    console.error('❌ Error fetching property types:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET TYPE BY ID
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Buscar em ambas as categorias
    const locationTypes = await kv.getByPrefix('property_type:location:');
    const accommodationTypes = await kv.getByPrefix('property_type:accommodation:');

    const allTypes = [...locationTypes, ...accommodationTypes];
    const type = allTypes.find((t) => t.id === id);

    if (!type) {
      return c.json({ error: 'Tipo não encontrado' }, 404);
    }

    return c.json(type);
  } catch (error: any) {
    console.error('❌ Error fetching property type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE TYPE
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validação
    if (!body.code || !body.name || !body.category) {
      return c.json(
        { error: 'Campos obrigatórios: code, name, category' },
        400
      );
    }

    if (!['location', 'accommodation'].includes(body.category)) {
      return c.json(
        { error: 'Categoria deve ser "location" ou "accommodation"' },
        400
      );
    }

    // Verificar se já existe
    const key = `property_type:${body.category}:${body.code}`;
    const existing = await kv.get(key);

    if (existing) {
      return c.json({ error: 'Tipo com este código já existe' }, 409);
    }

    // Criar novo tipo
    const newType: PropertyType = {
      id: `${body.category}_${body.code}_${Date.now()}`,
      code: body.code.toLowerCase().replace(/\s+/g, '_'),
      name: body.name,
      category: body.category,
      icon: body.icon || undefined,
      description: body.description || undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
      isSystem: false, // Tipos criados pelo usuário não são do sistema
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(key, newType);

    console.log(`✅ Created property type: ${newType.name}`);

    return c.json(newType, 201);
  } catch (error: any) {
    console.error('❌ Error creating property type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UPDATE TYPE
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Buscar tipo existente
    const locationTypes = await kv.getByPrefix('property_type:location:');
    const accommodationTypes = await kv.getByPrefix('property_type:accommodation:');

    const allTypes = [...locationTypes, ...accommodationTypes];
    const existingType = allTypes.find((t) => t.id === id);

    if (!existingType) {
      return c.json({ error: 'Tipo não encontrado' }, 404);
    }

    // Não permitir alterar código de tipos do sistema
    if (existingType.isSystem && body.code && body.code !== existingType.code) {
      return c.json(
        { error: 'Não é permitido alterar o código de tipos do sistema' },
        403
      );
    }

    // Atualizar tipo
    const updatedType: PropertyType = {
      ...existingType,
      name: body.name || existingType.name,
      icon: body.icon !== undefined ? body.icon : existingType.icon,
      description: body.description !== undefined ? body.description : existingType.description,
      isActive: body.isActive !== undefined ? body.isActive : existingType.isActive,
      updated_at: new Date().toISOString(),
    };

    const key = `property_type:${existingType.category}:${existingType.code}`;
    await kv.set(key, updatedType);

    console.log(`✅ Updated property type: ${updatedType.name}`);

    return c.json(updatedType);
  } catch (error: any) {
    console.error('❌ Error updating property type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DELETE TYPE
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Buscar tipo existente
    const locationTypes = await kv.getByPrefix('property_type:location:');
    const accommodationTypes = await kv.getByPrefix('property_type:accommodation:');

    const allTypes = [...locationTypes, ...accommodationTypes];
    const existingType = allTypes.find((t) => t.id === id);

    if (!existingType) {
      return c.json({ error: 'Tipo não encontrado' }, 404);
    }

    // Se for tipo do sistema, apenas desativar
    if (existingType.isSystem) {
      const updatedType: PropertyType = {
        ...existingType,
        isActive: false,
        updated_at: new Date().toISOString(),
      };

      const key = `property_type:${existingType.category}:${existingType.code}`;
      await kv.set(key, updatedType);

      console.log(`⚠️ Deactivated system property type: ${updatedType.name}`);

      return c.json({
        message: 'Tipo do sistema desativado com sucesso',
        type: updatedType,
      });
    }

    // Deletar tipo customizado
    const key = `property_type:${existingType.category}:${existingType.code}`;
    await kv.del(key);

    console.log(`✅ Deleted property type: ${existingType.name}`);

    return c.json({
      message: 'Tipo excluído com sucesso',
    });
  } catch (error: any) {
    console.error('❌ Error deleting property type:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// FORCE SEED TYPES (v1.0.103.302)
// Força o seed de TODOS os tipos no banco
// ============================================================================

app.post('/seed', async (c) => {
  try {
    console.log('🌱 [FORCE SEED] Iniciando seed forçado de tipos...');
    
    // DELETAR TODOS OS TIPOS EXISTENTES
    const existingLocationTypes = await kv.getByPrefix('property_type:location:');
    const existingAccommodationTypes = await kv.getByPrefix('property_type:accommodation:');
    
    console.log(`🗑️ Deletando ${existingLocationTypes.length} tipos de local existentes...`);
    for (const type of existingLocationTypes) {
      const key = `property_type:location:${type.code}`;
      await kv.del(key);
    }
    
    console.log(`🗑️ Deletando ${existingAccommodationTypes.length} tipos de acomodação existentes...`);
    for (const type of existingAccommodationTypes) {
      const key = `property_type:accommodation:${type.code}`;
      await kv.del(key);
    }
    
    // SEED TODOS OS TIPOS NOVAMENTE
    const allTypes = [...SYSTEM_LOCATION_TYPES, ...SYSTEM_ACCOMMODATION_TYPES];
    console.log(`✅ Seedando ${allTypes.length} tipos do sistema...`);
    
    const seededTypes = [];
    
    for (const type of allTypes) {
      const key = `property_type:${type.category}:${type.code}`;
      const newType: PropertyType = {
        ...type,
        id: `${type.category}_${type.code}_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 0,
      };

      await kv.set(key, newType);
      seededTypes.push(newType);
      console.log(`✅ Seeded: ${type.name} (${type.category})`);
    }
    
    console.log(`✅ [FORCE SEED] Seed completo! ${seededTypes.length} tipos seedados.`);
    
    return c.json({
      success: true,
      message: `${seededTypes.length} tipos seedados com sucesso`,
      types: seededTypes,
      breakdown: {
        location: seededTypes.filter(t => t.category === 'location').length,
        accommodation: seededTypes.filter(t => t.category === 'accommodation').length,
      }
    }, 201);
  } catch (error: any) {
    console.error('❌ Error force seeding property types:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;