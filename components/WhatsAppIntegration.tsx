/**
 * RENDIZY - WhatsApp Integration Wrapper
 * 
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  @PROTECTED v1.0.104.001                                                 ║
 * ║  @ADR docs/ADR/ADR-007-MULTI-CHANNEL-CHAT-ARCHITECTURE.md                ║
 * ║  @ADR docs/ADR/ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md              ║
 * ║  @TESTED 2026-01-22                                                      ║
 * ║  @STATUS ✅ WRAPPER PARA PROVIDERS                                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * @ARCHITECTURE ADR-008 - Modular Integration Wrapper
 * @PATTERN Modular Integration
 * @NO_MONOLITH Este arquivo NUNCA deve conter lógica de provider específico
 * @ROLE Roteador - direciona para o componente correto baseado no provider
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 REGRA OBRIGATÓRIA: ARQUITETURA MODULAR ANTI-MONOLÍTICA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este arquivo é um WRAPPER ROTEADOR. Ele NUNCA deve:
 * ❌ Conter lógica específica de WAHA
 * ❌ Conter lógica específica de Evolution
 * ❌ Gerenciar estado de providers
 * ❌ Ter mais de ~100 linhas
 * 
 * Ele DEVE apenas:
 * ✅ Rotear para o componente correto baseado no provider
 * ✅ Manter-se simples e legível
 * ✅ Importar e renderizar componentes específicos
 * 
 * PROVIDERS DISPONÍVEIS:
 * - 'evolution' → WhatsAppIntegrationEvolution.tsx
 * - 'waha' → WhatsAppIntegrationWaha.tsx
 * 
 * PARA ADICIONAR NOVO PROVIDER:
 * 1. Criar arquivo WhatsAppIntegrationNovoProvider.tsx
 * 2. Adicionar import aqui
 * 3. Adicionar case no switch/if
 * 4. NUNCA mesclar lógica neste arquivo
 * 
 * @version 1.0.104.001
 * @date 2026-01-22
 */

import WhatsAppIntegrationEvolution from './WhatsAppIntegrationEvolution';
import WhatsAppIntegrationWaha from './WhatsAppIntegrationWaha';

// ============================================================================
// TYPES
// ============================================================================

export type WhatsAppProvider = 'evolution' | 'waha';

interface WhatsAppIntegrationProps {
  /**
   * Provider de WhatsApp a ser utilizado
   * @default 'evolution'
   * 
   * - 'evolution': Evolution API (padrão, mais popular no Brasil)
   * - 'waha': WAHA - WhatsApp HTTP API (alternativa moderna)
   */
  provider?: WhatsAppProvider;
}

// ============================================================================
// MAIN WRAPPER COMPONENT
// ============================================================================

/**
 * Componente wrapper que renderiza o integration correto baseado no provider
 * 
 * @example
 * // Evolution API (padrão)
 * <WhatsAppIntegration />
 * 
 * @example
 * // WAHA API
 * <WhatsAppIntegration provider="waha" />
 */
export default function WhatsAppIntegration({ 
  provider = 'evolution' 
}: WhatsAppIntegrationProps) {
  // Renderizar componente específico baseado no provider
  if (provider === 'waha') {
    return <WhatsAppIntegrationWaha />;
  }
  
  // Default: Evolution API
  return <WhatsAppIntegrationEvolution />;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-exportar componentes individuais para uso direto quando necessário
export { WhatsAppIntegrationEvolution, WhatsAppIntegrationWaha };
