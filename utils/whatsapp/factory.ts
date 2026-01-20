/**
 * WHATSAPP PROVIDER FACTORY
 * 
 * Factory Pattern para criar instâncias de providers
 * Permite trocar facilmente entre Evolution, WAHA ou outros
 */

import type { IWhatsAppProvider, WhatsAppProvider, WhatsAppProviderConfig } from './types';
import { EvolutionProvider } from './evolution/api';
import { WAHAProvider } from './waha/api';
import { EVOLUTION_CONFIG } from './evolution/config';
import { WAHA_CONFIG } from './waha/config';

// ============================================================
// PROVIDER REGISTRY
// ============================================================

type ProviderConstructor = new (config?: Partial<WhatsAppProviderConfig>) => IWhatsAppProvider;

const PROVIDER_REGISTRY: Record<WhatsAppProvider, ProviderConstructor> = {
  evolution: EvolutionProvider,
  waha: WAHAProvider,
};

// ============================================================
// FACTORY
// ============================================================

export class WhatsAppProviderFactory {
  private static instances: Map<string, IWhatsAppProvider> = new Map();

  /**
   * Criar provider específico
   */
  static create(
    provider: WhatsAppProvider,
    config?: Partial<WhatsAppProviderConfig>
  ): IWhatsAppProvider {
    const ProviderClass = PROVIDER_REGISTRY[provider];
    
    if (!ProviderClass) {
      throw new Error(`Provider '${provider}' não encontrado`);
    }

    return new ProviderClass(config);
  }

  /**
   * Obter provider singleton
   */
  static getInstance(
    provider: WhatsAppProvider,
    config?: Partial<WhatsAppProviderConfig>
  ): IWhatsAppProvider {
    const key = provider;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, this.create(provider, config));
    }

    return this.instances.get(key)!;
  }

  /**
   * Criar provider automaticamente (escolhe o habilitado)
   */
  static createAuto(): IWhatsAppProvider {
    // Preferência: WAHA > Evolution
    if (WAHA_CONFIG.enabled) {
      console.log('[Factory] Usando WAHA (habilitado)');
      return this.getInstance('waha');
    }

    if (EVOLUTION_CONFIG.enabled) {
      console.log('[Factory] Usando Evolution (habilitado)');
      return this.getInstance('evolution');
    }

    // Default: WAHA (mesmo desabilitado, para não quebrar)
    console.warn('[Factory] Nenhum provider habilitado, usando WAHA por padrão');
    return this.getInstance('waha');
  }

  /**
   * Criar com fallback automático
   */
  static async createWithFallback(): Promise<IWhatsAppProvider> {
    const providers: WhatsAppProvider[] = ['waha', 'evolution'];

    for (const providerName of providers) {
      try {
        const provider = this.getInstance(providerName);
        const health = await provider.healthCheck();

        if (health.healthy) {
          console.log(`[Factory] Provider '${providerName}' está saudável`);
          return provider;
        }
      } catch (error) {
        console.error(`[Factory] Provider '${providerName}' falhou:`, error);
      }
    }

    // Se nenhum estiver saudável, retornar WAHA por padrão
    console.warn('[Factory] Nenhum provider saudável, usando WAHA por padrão');
    return this.getInstance('waha');
  }

  /**
   * Listar providers disponíveis
   */
  static listProviders(): Array<{
    name: WhatsAppProvider;
    enabled: boolean;
    baseUrl: string;
  }> {
    return [
      {
        name: 'evolution',
        enabled: EVOLUTION_CONFIG.enabled,
        baseUrl: EVOLUTION_CONFIG.baseUrl,
      },
      {
        name: 'waha',
        enabled: WAHA_CONFIG.enabled,
        baseUrl: WAHA_CONFIG.baseUrl,
      },
    ];
  }

  /**
   * Resetar instâncias (útil para testes)
   */
  static reset(): void {
    this.instances.clear();
  }
}

// ============================================================
// EXPORTS CONVENIENTES
// ============================================================

/**
 * Obter provider padrão (auto)
 */
export function getDefaultProvider(): IWhatsAppProvider {
  return WhatsAppProviderFactory.createAuto();
}

/**
 * Obter provider específico
 */
export function getProvider(provider: WhatsAppProvider): IWhatsAppProvider {
  return WhatsAppProviderFactory.getInstance(provider);
}

/**
 * Obter provider com fallback
 */
export async function getProviderWithFallback(): Promise<IWhatsAppProvider> {
  return WhatsAppProviderFactory.createWithFallback();
}

/**
 * Trocar provider em runtime
 */
export function switchProvider(provider: WhatsAppProvider): IWhatsAppProvider {
  console.log(`[Factory] Trocando para provider: ${provider}`);
  return WhatsAppProviderFactory.getInstance(provider);
}

// ============================================================
// EXPORTS
// ============================================================

export { WhatsAppProvider, IWhatsAppProvider };
export type { WhatsAppProviderConfig };
