/**
 * RENDIZY - Short ID Generator
 * 
 * Sistema de geração de IDs curtos únicos (6 caracteres)
 * para imóveis (locais e propriedades)
 * 
 * Formato: LOC123 ou PRP456
 * - 3 caracteres de prefixo (tipo)
 * - 3 caracteres alfanuméricos aleatórios
 * 
 * @version 1.0.103.271
 * @date 2025-11-04
 */

import * as kv from './kv_store.tsx';

// Caracteres permitidos para IDs (excluindo caracteres confusos: 0, O, I, 1, l)
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Prefixos por tipo de propriedade
 */
export const ID_PREFIXES = {
  LOCATION: 'LOC',
  PROPERTY: 'PRP',
  ACCOMMODATION: 'PRP', // Acomodações usam mesmo prefixo de propriedades
} as const;

/**
 * Gera 3 caracteres aleatórios
 */
const generateRandomChars = (): string => {
  let result = '';
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * CHARS.length);
    result += CHARS[randomIndex];
  }
  return result;
};

/**
 * Gera um ID curto único
 * 
 * @param prefix - Prefixo do ID (LOC ou PRP)
 * @param tenantId - ID do tenant (para garantir unicidade por tenant)
 * @returns ID curto único (ex: LOC2A3, PRP7K9)
 */
export const generateShortId = async (
  prefix: keyof typeof ID_PREFIXES,
  tenantId: string
): Promise<string> => {
  const prefixStr = ID_PREFIXES[prefix];
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomChars = generateRandomChars();
    const shortId = `${prefixStr}${randomChars}`;

    // Verificar se ID já existe
    const exists = await checkShortIdExists(shortId, tenantId);
    
    if (!exists) {
      // Registrar ID como usado
      await registerShortId(shortId, tenantId);
      console.log(`✅ Short ID gerado: ${shortId} para tenant: ${tenantId}`);
      return shortId;
    }

    attempts++;
    console.log(`⚠️ ID ${shortId} já existe, tentando novamente... (${attempts}/${maxAttempts})`);
  }

  // Fallback: usar timestamp se não conseguir gerar ID único
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  const fallbackId = `${prefixStr}${timestamp}`;
  console.log(`⚠️ Usando fallback ID: ${fallbackId}`);
  await registerShortId(fallbackId, tenantId);
  return fallbackId;
};

/**
 * Verifica se um Short ID já existe
 * 
 * @param shortId - ID curto a verificar
 * @param tenantId - ID do tenant
 * @returns true se existir, false caso contrário
 */
export const checkShortIdExists = async (
  shortId: string,
  tenantId: string
): Promise<boolean> => {
  try {
    const key = `tenant:${tenantId}:short_id:${shortId}`;
    const result = await kv.get(key);
    return result !== null;
  } catch (error) {
    console.error('❌ Erro ao verificar Short ID:', error);
    return false;
  }
};

/**
 * Registra um Short ID como usado
 * 
 * @param shortId - ID curto a registrar
 * @param tenantId - ID do tenant
 * @param propertyId - ID completo da propriedade (UUID)
 */
export const registerShortId = async (
  shortId: string,
  tenantId: string,
  propertyId?: string
): Promise<void> => {
  try {
    const key = `tenant:${tenantId}:short_id:${shortId}`;
    const data = {
      shortId,
      propertyId: propertyId || null,
      createdAt: new Date().toISOString(),
      tenantId,
    };
    await kv.set(key, data);
    console.log(`✅ Short ID registrado: ${shortId}`);
  } catch (error) {
    console.error('❌ Erro ao registrar Short ID:', error);
    throw error;
  }
};

/**
 * Busca propriedade por Short ID
 * 
 * @param shortId - ID curto
 * @param tenantId - ID do tenant
 * @returns Dados do registro ou null
 */
export const getPropertyByShortId = async (
  shortId: string,
  tenantId: string
): Promise<any> => {
  try {
    const key = `tenant:${tenantId}:short_id:${shortId}`;
    const result = await kv.get(key);
    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar por Short ID:', error);
    return null;
  }
};

/**
 * Atualiza o mapeamento de Short ID para Property ID
 * 
 * @param shortId - ID curto
 * @param tenantId - ID do tenant
 * @param propertyId - ID completo da propriedade
 */
export const updateShortIdMapping = async (
  shortId: string,
  tenantId: string,
  propertyId: string
): Promise<void> => {
  try {
    const key = `tenant:${tenantId}:short_id:${shortId}`;
    const existing = await kv.get(key);
    
    const data = {
      ...(existing || {}),
      shortId,
      propertyId,
      updatedAt: new Date().toISOString(),
      tenantId,
    };
    
    await kv.set(key, data);
    console.log(`✅ Short ID atualizado: ${shortId} -> ${propertyId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar Short ID:', error);
    throw error;
  }
};

/**
 * Valida formato de Short ID
 * 
 * @param shortId - ID a validar
 * @returns true se válido
 */
export const validateShortIdFormat = (shortId: string): boolean => {
  // Formato: LOC123 ou PRP456 (3 letras + 3 alfanuméricos)
  const regex = /^(LOC|PRP)[2-9A-Z]{3}$/;
  return regex.test(shortId);
};

/**
 * Extrai prefixo do Short ID
 * 
 * @param shortId - ID curto
 * @returns Prefixo (LOC ou PRP)
 */
export const extractPrefix = (shortId: string): string => {
  return shortId.substring(0, 3);
};

/**
 * Determina tipo da propriedade pelo prefixo
 * 
 * @param shortId - ID curto
 * @returns Tipo (location ou property)
 */
export const getPropertyTypeFromShortId = (shortId: string): 'location' | 'property' => {
  const prefix = extractPrefix(shortId);
  return prefix === 'LOC' ? 'location' : 'property';
};

/**
 * Lista todos os Short IDs de um tenant
 * 
 * @param tenantId - ID do tenant
 * @returns Array de Short IDs
 */
export const listTenantShortIds = async (tenantId: string): Promise<string[]> => {
  try {
    const prefix = `tenant:${tenantId}:short_id:`;
    const results = await kv.getByPrefix(prefix);
    
    return results.map((result: any) => result.shortId || '');
  } catch (error) {
    console.error('❌ Erro ao listar Short IDs:', error);
    return [];
  }
};

/**
 * Migra ID longo (UUID) para Short ID
 * 
 * @param longId - ID longo atual (UUID)
 * @param type - Tipo (location ou property)
 * @param tenantId - ID do tenant
 * @returns Short ID gerado
 */
export const migrateToShortId = async (
  longId: string,
  type: 'location' | 'property',
  tenantId: string
): Promise<string> => {
  try {
    const prefix = type === 'location' ? 'LOCATION' : 'PROPERTY';
    const shortId = await generateShortId(prefix as keyof typeof ID_PREFIXES, tenantId);
    
    // Atualizar mapeamento
    await updateShortIdMapping(shortId, tenantId, longId);
    
    console.log(`✅ Migração: ${longId} -> ${shortId}`);
    return shortId;
  } catch (error) {
    console.error('❌ Erro ao migrar ID:', error);
    throw error;
  }
};

/**
 * Estatísticas de Short IDs
 * 
 * @param tenantId - ID do tenant
 * @returns Estatísticas
 */
export const getShortIdStats = async (tenantId: string): Promise<{
  total: number;
  locations: number;
  properties: number;
}> => {
  try {
    const allIds = await listTenantShortIds(tenantId);
    
    const locations = allIds.filter(id => id.startsWith('LOC')).length;
    const properties = allIds.filter(id => id.startsWith('PRP')).length;
    
    return {
      total: allIds.length,
      locations,
      properties,
    };
  } catch (error) {
    console.error('❌ Erro ao gerar estatísticas:', error);
    return { total: 0, locations: 0, properties: 0 };
  }
};
