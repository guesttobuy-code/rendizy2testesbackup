/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    WHATSAPP ADAPTER FACTORY                                ║
 * ║                                                                            ║
 * ║  Factory para criar o adapter correto baseado na instância configurada    ║
 * ║  Detecta automaticamente Evolution vs WAHA                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-24
 * @see ADR-010-CHAT-MULTI-PROVIDER-ARCHITECTURE.md
 * 
 * FLUXO DE DETECÇÃO:
 * 1. Busca instância ativa em channel_instances
 * 2. Lê campo `provider` (evolution | waha)
 * 3. Cria adapter correspondente com config da instância
 * 4. Cacheia adapter para evitar re-criação
 * 
 * @example
 * ```typescript
 * const adapter = await getWhatsAppAdapter(organizationId);
 * const messages = await adapter.fetchMessages('5521999887766');
 * ```
 */

import { getSupabaseClient } from '../../supabase/client';
import { createEvolutionAdapter } from './evolutionAdapter';
import { createWahaAdapter } from './wahaAdapter';
import type {
  IWhatsAppAdapter,
  WhatsAppAdapterConfig,
  DetectedProvider,
  CreateAdapterOptions,
} from './types';

// Re-exports for external use
export { EvolutionAdapter } from './evolutionAdapter';
export { WahaAdapter } from './wahaAdapter';

// ============================================================
// CACHE
// ============================================================

/**
 * Cache de adapters por organização
 * Evita re-criar adapter a cada chamada
 */
const adapterCache = new Map<string, {
  adapter: IWhatsAppAdapter;
  createdAt: number;
  instanceId: string;
}>();

/** Tempo de vida do cache (5 minutos) */
const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================
// HELPERS
// ============================================================

/**
 * Obtém organizationId do localStorage
 */
function getOrganizationId(): string | null {
  try {
    const userJson = localStorage.getItem('rendizy-user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.organizationId || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Limpa cache expirado
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of adapterCache.entries()) {
    if (now - value.createdAt > CACHE_TTL_MS) {
      adapterCache.delete(key);
    }
  }
}

// ============================================================
// DETECTION
// ============================================================

/**
 * Interface para dados da tabela channel_instances
 */
interface ChannelInstanceRow {
  id: string;
  organization_id: string;
  channel: string;
  provider: string;
  instance_name: string;
  status: string;
  phone_number?: string;
  api_url?: string;
  api_key?: string;
  evolution_base_url?: string;
  evolution_api_key?: string;
  waha_base_url?: string;
  waha_api_key?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Detecta qual provider WhatsApp está configurado para a organização
 */
export async function detectWhatsAppProvider(
  organizationId?: string
): Promise<DetectedProvider> {
  const orgId = organizationId || getOrganizationId();
  
  if (!orgId) {
    console.warn('[AdapterFactory] ⚠️ No organization ID');
    return { provider: 'unknown', config: null, instanceId: null, status: 'no_org' };
  }
  
  try {
    const supabase = getSupabaseClient();
    
    // Buscar instância WhatsApp ativa (excluindo deletadas)
    const { data, error } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('organization_id', orgId)
      .eq('channel', 'whatsapp')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[AdapterFactory] ❌ Error fetching instances:', error);
      return { provider: 'unknown', config: null, instanceId: null, status: 'error' };
    }
    
    const instances = (data || []) as ChannelInstanceRow[];
    
    if (instances.length === 0) {
      console.log('[AdapterFactory] ℹ️ No WhatsApp instance configured');
      return { provider: 'unknown', config: null, instanceId: null, status: 'no_instance' };
    }
    
    // Priorizar instância conectada
    const connected = instances.find((i) => i.status === 'connected');
    const instance = connected || instances[0];
    
    const providerRaw = instance.provider || 'unknown';
    const provider: 'evolution' | 'waha' | 'unknown' = 
      providerRaw === 'evolution' ? 'evolution' :
      providerRaw === 'waha' ? 'waha' : 'unknown';
    
    // Montar config baseado no provider
    const config: WhatsAppAdapterConfig = {
      apiUrl: instance.api_url || instance.evolution_base_url || instance.waha_base_url || '',
      apiKey: instance.api_key || instance.evolution_api_key || instance.waha_api_key || '',
      instanceName: instance.instance_name || '',
      organizationId: orgId,
      metadata: instance.metadata,
    };
    
    // Fallback para URLs default se não configuradas
    if (!config.apiUrl) {
      if (provider === 'evolution') {
        config.apiUrl = import.meta.env.VITE_EVOLUTION_API_URL || 'http://76.13.82.60:8080';
      } else if (provider === 'waha') {
        config.apiUrl = import.meta.env.VITE_WAHA_API_URL || 'http://76.13.82.60:3001';
      }
    }
    
    if (!config.apiKey) {
      if (provider === 'evolution') {
        config.apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || '';
      } else if (provider === 'waha') {
        config.apiKey = import.meta.env.VITE_WAHA_API_KEY || '';
      }
    }
    
    console.log(`[AdapterFactory] ✅ Detected provider: ${provider}, instance: ${config.instanceName}, status: ${instance.status}`);
    
    return {
      provider,
      config,
      instanceId: instance.id,
      status: instance.status || 'unknown',
    };
  } catch (error) {
    console.error('[AdapterFactory] ❌ Exception:', error);
    return { provider: 'unknown', config: null, instanceId: null, status: 'exception' };
  }
}

// ============================================================
// FACTORY
// ============================================================

/**
 * Obtém adapter WhatsApp para a organização atual
 * Usa cache para evitar re-criação desnecessária
 * 
 * @param organizationId - ID da organização (opcional, usa do localStorage)
 * @param options - Opções de criação
 * @returns Adapter configurado ou null se não configurado
 * 
 * @example
 * ```typescript
 * const adapter = await getWhatsAppAdapter();
 * if (adapter) {
 *   const messages = await adapter.fetchMessages('5521999887766');
 * }
 * ```
 */
export async function getWhatsAppAdapter(
  organizationId?: string,
  options?: CreateAdapterOptions
): Promise<IWhatsAppAdapter | null> {
  const orgId = organizationId || getOrganizationId();
  
  if (!orgId) {
    console.warn('[AdapterFactory] ⚠️ No organization ID');
    return null;
  }
  
  // Limpar cache expirado
  cleanExpiredCache();
  
  // Verificar cache (se não forçando provider)
  if (options?.useCache !== false && !options?.forceProvider) {
    const cached = adapterCache.get(orgId);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      console.log(`[AdapterFactory] 📦 Using cached adapter: ${cached.adapter.provider}`);
      return cached.adapter;
    }
  }
  
  // Detectar provider
  const detected = await detectWhatsAppProvider(orgId);
  
  // Se forçando provider específico, usar esse
  const providerToUse = options?.forceProvider || detected.provider;
  
  if (providerToUse === 'unknown' || !detected.config) {
    console.warn('[AdapterFactory] ⚠️ No valid provider detected');
    return null;
  }
  
  // Criar adapter
  let adapter: IWhatsAppAdapter;
  
  if (providerToUse === 'evolution') {
    adapter = createEvolutionAdapter(detected.config);
  } else if (providerToUse === 'waha') {
    adapter = createWahaAdapter(detected.config);
  } else {
    console.error(`[AdapterFactory] ❌ Unknown provider: ${providerToUse}`);
    return null;
  }
  
  // Cachear
  adapterCache.set(orgId, {
    adapter,
    createdAt: Date.now(),
    instanceId: detected.instanceId || '',
  });
  
  console.log(`[AdapterFactory] ✅ Created ${adapter.displayName} adapter`);
  
  return adapter;
}

/**
 * Força recriação do adapter (limpa cache)
 */
export function invalidateAdapterCache(organizationId?: string): void {
  const orgId = organizationId || getOrganizationId();
  if (orgId) {
    adapterCache.delete(orgId);
    multiAdapterCache.delete(orgId);
    console.log('[AdapterFactory] 🗑️ Cache invalidated for:', orgId);
  }
}

/**
 * Obtém adapter do cache sem criar novo
 * Útil para verificar se já existe adapter sem fazer request
 */
export function getCachedAdapter(organizationId?: string): IWhatsAppAdapter | null {
  const orgId = organizationId || getOrganizationId();
  if (!orgId) return null;
  
  const cached = adapterCache.get(orgId);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.adapter;
  }
  
  return null;
}

// ============================================================
// MULTI-INSTANCE SUPPORT (v2.1.0)
// ============================================================

/**
 * Cache para múltiplos adapters por organização
 */
const multiAdapterCache = new Map<string, {
  adapters: Array<{ adapter: IWhatsAppAdapter; instanceId: string; phoneNumber?: string }>;
  createdAt: number;
}>();

/**
 * Informações de uma instância ativa
 */
export interface ActiveInstance {
  adapter: IWhatsAppAdapter;
  instanceId: string;
  instanceName: string;
  provider: 'evolution' | 'waha';
  phoneNumber?: string;
  status: string;
}

/**
 * Obtém TODOS os adapters WhatsApp conectados para a organização
 * Útil quando há múltiplas instâncias (ex: Evolution + WAHA)
 * 
 * @param organizationId - ID da organização
 * @returns Array de adapters com metadados
 * 
 * @example
 * ```typescript
 * const instances = await getAllWhatsAppAdapters();
 * for (const inst of instances) {
 *   console.log(`${inst.provider}: ${inst.phoneNumber}`);
 *   const chats = await inst.adapter.fetchChats();
 * }
 * ```
 */
export async function getAllWhatsAppAdapters(
  organizationId?: string
): Promise<ActiveInstance[]> {
  const orgId = organizationId || getOrganizationId();
  
  if (!orgId) {
    console.warn('[AdapterFactory] ⚠️ No organization ID for multi-adapter');
    return [];
  }
  
  // Verificar cache
  const cached = multiAdapterCache.get(orgId);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    console.log(`[AdapterFactory] 📦 Using cached multi-adapters: ${cached.adapters.length} instances`);
    return cached.adapters.map(c => ({
      adapter: c.adapter,
      instanceId: c.instanceId,
      instanceName: (c.adapter as any).config?.instanceName || '',
      provider: c.adapter.provider as 'evolution' | 'waha',
      phoneNumber: c.phoneNumber,
      status: 'cached',
    }));
  }
  
  try {
    const supabase = getSupabaseClient();
    
    // Buscar TODAS as instâncias WhatsApp (excluindo deletadas)
    const { data, error } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('organization_id', orgId)
      .eq('channel', 'whatsapp')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[AdapterFactory] ❌ Error fetching instances:', error);
      return [];
    }
    
    const instances = (data || []) as ChannelInstanceRow[];
    
    if (instances.length === 0) {
      console.log('[AdapterFactory] ℹ️ No WhatsApp instances configured');
      return [];
    }
    
    // Criar adapter para cada instância conectada
    const activeInstances: ActiveInstance[] = [];
    const cacheEntries: Array<{ adapter: IWhatsAppAdapter; instanceId: string; phoneNumber?: string }> = [];
    
    for (const instance of instances) {
      // Só criar adapter para instâncias conectadas ou a primeira
      if (instance.status !== 'connected' && instances.indexOf(instance) > 0) {
        console.log(`[AdapterFactory] ⏭️ Skipping disconnected instance: ${instance.instance_name}`);
        continue;
      }
      
      const providerRaw = instance.provider || 'unknown';
      const provider: 'evolution' | 'waha' | 'unknown' = 
        providerRaw === 'evolution' ? 'evolution' :
        providerRaw === 'waha' ? 'waha' : 'unknown';
      
      if (provider === 'unknown') {
        console.warn(`[AdapterFactory] ⚠️ Unknown provider for instance: ${instance.instance_name}`);
        continue;
      }
      
      // Montar config
      const config: WhatsAppAdapterConfig = {
        apiUrl: instance.api_url || instance.evolution_base_url || instance.waha_base_url || '',
        apiKey: instance.api_key || instance.evolution_api_key || instance.waha_api_key || '',
        instanceName: instance.instance_name || '',
        organizationId: orgId,
        metadata: instance.metadata,
      };
      
      // Fallback para URLs default
      if (!config.apiUrl) {
        if (provider === 'evolution') {
          config.apiUrl = import.meta.env.VITE_EVOLUTION_API_URL || 'http://76.13.82.60:8080';
        } else if (provider === 'waha') {
          config.apiUrl = import.meta.env.VITE_WAHA_API_URL || 'http://76.13.82.60:3001';
        }
      }
      
      if (!config.apiKey) {
        if (provider === 'evolution') {
          config.apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || 'Rendizy2026EvolutionAPI';
        } else if (provider === 'waha') {
          config.apiKey = import.meta.env.VITE_WAHA_API_KEY || 'rendizy-waha-secret-2026';
        }
      }
      
      // Criar adapter
      let adapter: IWhatsAppAdapter;
      if (provider === 'evolution') {
        adapter = createEvolutionAdapter(config);
      } else {
        adapter = createWahaAdapter(config);
      }
      
      const activeInst: ActiveInstance = {
        adapter,
        instanceId: instance.id,
        instanceName: instance.instance_name,
        provider,
        phoneNumber: instance.phone_number,
        status: instance.status,
      };
      
      activeInstances.push(activeInst);
      cacheEntries.push({
        adapter,
        instanceId: instance.id,
        phoneNumber: instance.phone_number,
      });
      
      console.log(`[AdapterFactory] ✅ Created ${provider} adapter for: ${instance.instance_name} (${instance.phone_number || 'no phone'})`);
    }
    
    // Cachear
    if (cacheEntries.length > 0) {
      multiAdapterCache.set(orgId, {
        adapters: cacheEntries,
        createdAt: Date.now(),
      });
    }
    
    console.log(`[AdapterFactory] 🔌 Total active adapters: ${activeInstances.length}`);
    
    return activeInstances;
  } catch (error) {
    console.error('[AdapterFactory] ❌ Exception in getAllWhatsAppAdapters:', error);
    return [];
  }
}

/**
 * Obtém adapter específico por instanceId
 */
export async function getAdapterByInstanceId(
  instanceId: string,
  organizationId?: string
): Promise<IWhatsAppAdapter | null> {
  const all = await getAllWhatsAppAdapters(organizationId);
  const found = all.find(a => a.instanceId === instanceId);
  return found?.adapter || null;
}

/**
 * Obtém adapter específico por provider
 */
export async function getAdapterByProvider(
  provider: 'evolution' | 'waha',
  organizationId?: string
): Promise<IWhatsAppAdapter | null> {
  const all = await getAllWhatsAppAdapters(organizationId);
  const found = all.find(a => a.provider === provider);
  return found?.adapter || null;
}

// ============================================================
// TYPE EXPORTS
// ============================================================

export type { IWhatsAppAdapter, WhatsAppAdapterConfig, DetectedProvider };
