/**
 * CHAT PROVIDER REGISTRY
 * 
 * Gerencia todos os providers de chat (WhatsApp, Airbnb, Booking, etc)
 * Permite buscar conversas de múltiplos canais de forma unificada
 * 
 * @version 1.0.0
 * @date 2026-01-22
 * @see ADR-007
 * 
 * @example
 * ```typescript
 * import { getChatRegistry } from './utils/chat';
 * 
 * const registry = getChatRegistry();
 * 
 * // Buscar conversas de TODOS os canais
 * const conversations = await registry.getAllConversations(orgId);
 * 
 * // Buscar só de um canal específico
 * const whatsapp = registry.get('whatsapp');
 * const waConversations = await whatsapp?.getConversations(orgId);
 * ```
 */

import type {
  IChatProvider,
  IChatProviderRegistry,
  ChatChannel,
  ChatConversation,
  GetConversationsOptions,
} from './types';

import { getWhatsAppChatProvider } from './providers/whatsapp';
import { getAirbnbChatProvider } from './providers/airbnb';
import { getBookingChatProvider } from './providers/booking';
import { getMarketplaceChatProvider } from './providers/marketplace';
import { getTeamChatProvider } from './providers/team';

// ============================================================
// REGISTRY IMPLEMENTATION
// ============================================================

class ChatProviderRegistry implements IChatProviderRegistry {
  private providers = new Map<ChatChannel, IChatProvider>();

  constructor() {
    // Registrar providers padrão
    this.registerDefaults();
  }

  /**
   * Registrar um provider
   */
  register(provider: IChatProvider): void {
    if (this.providers.has(provider.channel)) {
      console.warn(`[ChatRegistry] Provider '${provider.channel}' já registrado, substituindo...`);
    }
    this.providers.set(provider.channel, provider);
    console.log(`[ChatRegistry] ✅ Provider '${provider.channel}' registrado`);
  }

  /**
   * Obter provider por canal
   */
  get(channel: ChatChannel): IChatProvider | undefined {
    return this.providers.get(channel);
  }

  /**
   * Obter todos providers disponíveis
   */
  getAll(): IChatProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Obter todos providers habilitados
   */
  async getEnabled(): Promise<IChatProvider[]> {
    const all = this.getAll();
    const enabledChecks = await Promise.all(
      all.map(async provider => ({
        provider,
        enabled: await provider.isEnabled(),
      }))
    );
    
    return enabledChecks
      .filter(({ enabled }) => enabled)
      .map(({ provider }) => provider);
  }

  /**
   * Buscar conversas de TODOS os providers habilitados
   * Retorna lista unificada ordenada por última mensagem
   */
  async getAllConversations(
    organizationId: string,
    options?: GetConversationsOptions
  ): Promise<ChatConversation[]> {
    const enabledProviders = await this.getEnabled();
    
    console.log(`[ChatRegistry] 📥 Buscando conversas de ${enabledProviders.length} providers...`);
    
    // Buscar de todos em paralelo
    const results = await Promise.allSettled(
      enabledProviders.map(provider => 
        provider.getConversations(organizationId, options)
      )
    );

    // Consolidar resultados
    const allConversations: ChatConversation[] = [];
    
    results.forEach((result, index) => {
      const provider = enabledProviders[index];
      
      if (result.status === 'fulfilled') {
        console.log(`[ChatRegistry] ✅ ${provider.displayName}: ${result.value.length} conversas`);
        allConversations.push(...result.value);
      } else {
        console.error(`[ChatRegistry] ❌ ${provider.displayName}: ${result.reason}`);
      }
    });

    // Ordenar por última mensagem (mais recente primeiro)
    allConversations.sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime;
    });

    // Aplicar limit global se especificado
    if (options?.limit) {
      return allConversations.slice(0, options.limit);
    }

    return allConversations;
  }

  /**
   * Registrar providers padrão
   */
  private registerDefaults(): void {
    this.register(getWhatsAppChatProvider());
    this.register(getAirbnbChatProvider());
    this.register(getBookingChatProvider());
    this.register(getMarketplaceChatProvider());
    this.register(getTeamChatProvider());
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let registryInstance: ChatProviderRegistry | null = null;

/**
 * Obter instância global do registry
 */
export function getChatRegistry(): ChatProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ChatProviderRegistry();
  }
  return registryInstance;
}

/**
 * Atalho para buscar conversas de todos os canais
 */
export async function getAllChatConversations(
  organizationId: string,
  options?: GetConversationsOptions
): Promise<ChatConversation[]> {
  return getChatRegistry().getAllConversations(organizationId, options);
}

/**
 * Atalho para obter provider específico
 */
export function getChatProvider(channel: ChatChannel): IChatProvider | undefined {
  return getChatRegistry().get(channel);
}
