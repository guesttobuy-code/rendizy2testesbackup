/**
 * UTILS - KV Store Usage Validator
 * 
 * Valida uso de KV Store para evitar uso indevido
 * 
 * ⚠️ REGRA: KV Store APENAS para cache temporário
 * ✅ SQL para TUDO que precisa persistir permanentemente
 * 
 * @version 1.0.103.970
 * @date 2025-11-20
 */

/**
 * Padrões críticos que NUNCA devem usar KV Store
 */
const CRITICAL_PATTERNS = [
  /^user:/i,              // Usuários
  /^session:/i,           // Sessões (use tabela SQL sessions)
  /^conversation:/i,      // Conversas (use tabela SQL conversations)
  /^message:/i,           // Mensagens (use tabela SQL messages)
  /^reservation:/i,       // Reservas (use tabela SQL reservations)
  /^property:/i,          // Propriedades (use tabela SQL listings)
  /^listing:/i,           // Listings (use tabela SQL listings)
  /^organization:/i,      // Organizações (use tabela SQL organizations)
  /^org:/i,               // Organizações (abreviação)
  /^config:/i,            // Configurações (use tabela SQL organization_channel_config)
  /^channel_config:/i,    // Configurações de canal
  /^acc:/i,               // Accommodations (listings)
  /^res:/i,               // Reservations
  /^guest:/i,             // Hóspedes (use tabela SQL guests)
  /^booking:/i,           // Bookings (reservations)
  /^finance:/i,           // Dados financeiros
  /^transaction:/i,       // Transações
  /^payment:/i,           // Pagamentos
  /chat:conversation:/i,  // Conversas de chat
  /chat:message:/i,       // Mensagens de chat
];

/**
 * Prefixos permitidos para KV Store (apenas cache temporário)
 */
const ALLOWED_PREFIXES = [
  'cache:',      // Cache temporário de APIs externas
  'process:',    // Estado de processos temporários
  'temp:',       // Dados temporários
  'lock:',       // Locks de operações
  'queue:',      // Fila temporária de jobs
  'session-temp:', // Sessão temporária (não autenticação)
];

/**
 * Valida se é seguro usar KV Store para uma chave específica
 * 
 * @param key - Chave do KV Store
 * @param purpose - Propósito do uso (para mensagens de erro)
 * @throws Error se tentar usar KV Store para dados críticos
 */
export function validateKVStoreUsage(key: string, purpose: string = 'dados'): void {
  // Verificar se é um padrão crítico
  const isCritical = CRITICAL_PATTERNS.some(pattern => pattern.test(key));
  
  if (isCritical) {
    const errorMessage = `
❌ PROIBIDO: Não use KV Store para dados críticos!

   Key: ${key}
   Propósito: ${purpose}
   
   💡 SOLUÇÃO:
   - Use tabela SQL apropriada (users, conversations, messages, etc)
   - KV Store APENAS para cache temporário (TTL < 24h)
   
   📚 Veja: REGRA_KV_STORE_VS_SQL.md
   
   ✅ PREFIXOS PERMITIDOS:
   - cache:* (cache de APIs externas)
   - process:* (estado temporário de processos)
   - temp:* (dados temporários)
   - lock:* (locks de operações)
   
   ❌ PREFIXOS PROIBIDOS:
   - user:*, conversation:*, message:*, reservation:*, etc.
`;
    throw new Error(errorMessage.trim());
  }
  
  // Verificar se tem prefixo permitido (aviso, não erro)
  const hasAllowedPrefix = ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix));
  
  if (!hasAllowedPrefix) {
    console.warn(`
⚠️ ATENÇÃO: KV Store usado sem prefixo de cache

   Key: ${key}
   Propósito: ${purpose}
   
   💡 RECOMENDAÇÃO:
   - Se dados precisam persistir → Use SQL
   - Se é cache temporário → Use prefixo "cache:" ou "temp:"
   
   📚 Veja: REGRA_KV_STORE_VS_SQL.md
`);
  }
}

/**
 * Validação opcional (apenas warning, não erro)
 * Útil para migração gradual
 */
export function warnKVStoreUsage(key: string, purpose: string = 'dados'): void {
  const isCritical = CRITICAL_PATTERNS.some(pattern => pattern.test(key));
  
  if (isCritical) {
    console.warn(`
⚠️ DEPRECADO: Uso de KV Store para dados críticos detectado

   Key: ${key}
   Propósito: ${purpose}
   
   💡 RECOMENDAÇÃO: Migrar para tabela SQL
   📚 Veja: REGRA_KV_STORE_VS_SQL.md
`);
  }
}

/**
 * Verifica se uma chave é permitida para KV Store
 */
export function isKVStoreAllowed(key: string): boolean {
  // Se tem prefixo permitido, OK
  const hasAllowedPrefix = ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix));
  if (hasAllowedPrefix) return true;
  
  // Se é padrão crítico, NÃO permitido
  const isCritical = CRITICAL_PATTERNS.some(pattern => pattern.test(key));
  if (isCritical) return false;
  
  // Outros casos: permitir mas avisar
  return true;
}

