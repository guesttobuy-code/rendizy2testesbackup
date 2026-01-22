/**
 * ============================================================================
 * RENDIZY - Chat Adapters - Registry & Factory
 * ============================================================================
 * 
 * Registro central de todos os adapters de chat.
 * Gerencia a seleção automática do adapter correto baseado no canal/provider.
 * 
 * @version v2.0.0
 * @date 2026-01-22
 * 
 * Uso:
 * ```typescript
 * import { adapterRegistry } from './adapters/chat/index.ts';
 * 
 * // Por channel + provider
 * const adapter = adapterRegistry.get('whatsapp', 'evolution');
 * 
 * // Detectar adapter pelo payload do webhook
 * const adapter = adapterRegistry.detectFromPayload(payload);
 * 
 * // Listar todos os adapters
 * const all = adapterRegistry.list();
 * ```
 * ============================================================================
 */

import { IChatAdapter, ChannelType, ChannelInstance } from './types.ts';
import { evolutionAdapter } from './evolution-adapter.ts';
import { wahaAdapter } from './waha-adapter.ts';
import { airbnbAdapter } from './airbnb-adapter.ts';
import { bookingAdapter } from './booking-adapter.ts';
import { smsAdapter } from './sms-adapter.ts';

// ============================================================================
// ADAPTER REGISTRY
// ============================================================================

/**
 * Registro e factory de adapters
 */
class AdapterRegistry {
  private adapters: Map<string, IChatAdapter> = new Map();

  constructor() {
    // Registrar adapters padrão
    this.register(evolutionAdapter);
    this.register(wahaAdapter);
    this.register(airbnbAdapter);
    this.register(bookingAdapter);
    this.register(smsAdapter);
  }

  /**
   * Gerar chave única para adapter
   */
  private key(channel: ChannelType, provider: string): string {
    return `${channel}:${provider}`;
  }

  /**
   * Registrar um adapter
   */
  register(adapter: IChatAdapter): void {
    const k = this.key(adapter.channel, adapter.provider);
    this.adapters.set(k, adapter);
    console.log(`[AdapterRegistry] Registrado: ${adapter.name} (${k})`);
  }

  /**
   * Obter adapter por channel e provider
   */
  get(channel: ChannelType, provider: string): IChatAdapter | null {
    const k = this.key(channel, provider);
    return this.adapters.get(k) || null;
  }

  /**
   * Obter adapter para uma instância
   */
  getForInstance(instance: ChannelInstance): IChatAdapter | null {
    return this.get(instance.channel, instance.provider);
  }

  /**
   * Detectar adapter apropriado pelo payload do webhook
   * Tenta cada adapter até encontrar um que aceite o payload
   */
  detectFromPayload(payload: unknown): IChatAdapter | null {
    if (!payload || typeof payload !== 'object') return null;

    const p = payload as Record<string, unknown>;

    // ========== DETECÇÃO RÁPIDA POR CAMPOS ÚNICOS ==========

    // Evolution API - tem "instance" e "event" no root
    if ('instance' in p && 'event' in p) {
      // Verificar se não é WAHA (WAHA usa "session")
      if (!('session' in p)) {
        return evolutionAdapter;
      }
    }

    // WAHA - tem "session" e "event" no root
    if ('session' in p && 'event' in p) {
      return wahaAdapter;
    }

    // Twilio SMS - tem "MessageSid" e "From"
    if ('MessageSid' in p || 'SmsSid' in p) {
      return smsAdapter;
    }

    // Vonage SMS - tem "messageId" e "from"
    if ('messageId' in p && 'from' in p && 'text' in p) {
      return smsAdapter;
    }

    // Stays.net (Airbnb/Booking) - tem "channel" e "type" com MESSAGE
    if ('channel' in p && 'type' in p) {
      const typeStr = String(p.type || '');
      if (typeStr.includes('MESSAGE')) {
        const channel = String(p.channel || '').toLowerCase();
        if (channel === 'airbnb') return airbnbAdapter;
        if (channel === 'booking') return bookingAdapter;
      }
    }

    // ========== FALLBACK: TENTAR PARSE EM CADA ADAPTER ==========

    for (const adapter of this.adapters.values()) {
      const parsed = adapter.parseWebhook(payload);
      if (parsed) {
        return adapter;
      }
    }

    return null;
  }

  /**
   * Detectar adapter pelo nome da instância
   * Útil quando sabemos a instância mas não o provider exato
   */
  detectFromInstanceName(instanceName: string): IChatAdapter | null {
    // Padrões comuns de nomenclatura
    if (instanceName.toLowerCase().includes('evolution')) {
      return evolutionAdapter;
    }
    if (instanceName.toLowerCase().includes('waha')) {
      return wahaAdapter;
    }
    if (instanceName.toLowerCase().includes('airbnb')) {
      return airbnbAdapter;
    }
    if (instanceName.toLowerCase().includes('booking')) {
      return bookingAdapter;
    }
    if (instanceName.toLowerCase().includes('twilio') || instanceName.toLowerCase().includes('sms')) {
      return smsAdapter;
    }

    // Default para WhatsApp é Evolution (mais comum)
    return evolutionAdapter;
  }

  /**
   * Listar todos os adapters registrados
   */
  list(): { channel: ChannelType; provider: string; name: string }[] {
    return Array.from(this.adapters.entries()).map(([key, adapter]) => ({
      channel: adapter.channel,
      provider: adapter.provider,
      name: adapter.name,
    }));
  }

  /**
   * Listar adapters por canal
   */
  listByChannel(channel: ChannelType): IChatAdapter[] {
    return Array.from(this.adapters.values()).filter(a => a.channel === channel);
  }

  /**
   * Verificar se um provider está disponível para um canal
   */
  hasProvider(channel: ChannelType, provider: string): boolean {
    return this.adapters.has(this.key(channel, provider));
  }

  /**
   * Obter todos os providers disponíveis para um canal
   */
  getProviders(channel: ChannelType): string[] {
    return Array.from(this.adapters.values())
      .filter(a => a.channel === channel)
      .map(a => a.provider);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const adapterRegistry = new AdapterRegistry();

// ============================================================================
// RE-EXPORTS
// ============================================================================

export * from './types.ts';
export { evolutionAdapter } from './evolution-adapter.ts';
export { wahaAdapter } from './waha-adapter.ts';
export { airbnbAdapter } from './airbnb-adapter.ts';
export { bookingAdapter } from './booking-adapter.ts';
export { smsAdapter } from './sms-adapter.ts';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Processar webhook de chat usando o adapter apropriado
 * 
 * @param payload - Payload do webhook
 * @param instances - Lista de instâncias para buscar org_id
 * @returns Resultado do processamento
 */
export async function processIncomingWebhook(
  payload: unknown,
  instances: ChannelInstance[]
): Promise<{
  success: boolean;
  adapter?: string;
  instanceId?: string;
  organizationId?: string;
  contact?: Partial<import('./types.ts').UnifiedContact>;
  message?: Partial<import('./types.ts').UnifiedMessage>;
  error?: string;
}> {
  // 1. Detectar adapter
  const adapter = adapterRegistry.detectFromPayload(payload);
  
  if (!adapter) {
    return {
      success: false,
      error: 'Nenhum adapter encontrado para o payload',
    };
  }

  // 2. Parse do webhook
  const webhookData = adapter.parseWebhook(payload);
  
  if (!webhookData) {
    return {
      success: false,
      adapter: adapter.name,
      error: 'Falha ao fazer parse do webhook',
    };
  }

  // 3. Encontrar instância correspondente
  const instance = instances.find(i => 
    i.instanceName === webhookData.instanceName &&
    i.provider === adapter.provider
  );

  if (!instance) {
    return {
      success: false,
      adapter: adapter.name,
      error: `Instância não encontrada: ${webhookData.instanceName}`,
    };
  }

  // 4. Verificar se devemos processar a mensagem
  if (!adapter.shouldProcessMessage(webhookData.data)) {
    return {
      success: true,
      adapter: adapter.name,
      instanceId: instance.id,
      organizationId: instance.organizationId,
      error: 'Mensagem ignorada (grupo, broadcast ou enviada por nós)',
    };
  }

  // 5. Parse do contato
  const contact = adapter.parseContact(webhookData.data);
  
  if (!contact) {
    return {
      success: false,
      adapter: adapter.name,
      instanceId: instance.id,
      organizationId: instance.organizationId,
      error: 'Falha ao extrair contato',
    };
  }

  // 6. Parse da mensagem
  const message = adapter.parseMessage(webhookData.data);
  
  if (!message) {
    return {
      success: false,
      adapter: adapter.name,
      instanceId: instance.id,
      organizationId: instance.organizationId,
      contact,
      error: 'Falha ao extrair mensagem',
    };
  }

  return {
    success: true,
    adapter: adapter.name,
    instanceId: instance.id,
    organizationId: instance.organizationId,
    contact,
    message,
  };
}
