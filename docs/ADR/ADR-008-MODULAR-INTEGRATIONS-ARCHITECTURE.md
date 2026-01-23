# ADR-008: Arquitetura Modular de Integrações - Anti-Monolítico

**Data:** 2026-01-22  
**Status:** ✅ OBRIGATÓRIO  
**Autor:** Sistema Rendizy  
**Versão:** 1.0.0

---

## 🚨 REGRA ABSOLUTA

> **NUNCA criar blocos monolíticos para integrações.**  
> **SEMPRE individualizar componentes por provider/serviço.**

---

## Contexto

O arquivo `WhatsAppIntegration.tsx` havia crescido para **1.578 linhas** contendo:
- Evolution API (provider 1)
- WAHA (provider 2)
- Lógica mista e entrelaçada

Problemas identificados:
1. ❌ Difícil manutenção (trocar código de um afetava outro)
2. ❌ Difícil testes (impossível testar isoladamente)
3. ❌ Confusão de nomenclatura (variáveis `evolution*` misturadas com `waha*`)
4. ❌ Acoplamento forte (estado compartilhado desnecessariamente)
5. ❌ Impossível reutilizar parcialmente

---

## Decisão

### ✅ PADRÃO OBRIGATÓRIO: Componentes Individualizados por Provider

```
components/
  WhatsAppIntegration.tsx           ← WRAPPER (roteador simples ~100 linhas)
  WhatsAppIntegrationWaha.tsx       ← Provider WAHA completo
  WhatsAppIntegrationEvolution.tsx  ← Provider Evolution completo
```

### Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **1. Um arquivo = Um provider** | Cada integração externa tem seu próprio arquivo |
| **2. Wrapper inteligente** | Arquivo principal apenas roteia para o provider correto |
| **3. Sem estado compartilhado** | Cada provider gerencia seu próprio estado |
| **4. Tipos explícitos** | Interfaces específicas por provider (WAHAConfig, EvolutionConfig) |
| **5. Testes isolados** | Cada provider pode ser testado independentemente |

---

## Implementação de Referência

### Wrapper (WhatsAppIntegration.tsx)

```tsx
/**
 * @ARCHITECTURE ADR-008 - Wrapper roteador
 * @PATTERN Modular Integration
 * @NO_MONOLITH Este arquivo NUNCA deve conter lógica de provider
 */
export default function WhatsAppIntegration({ provider = 'evolution' }) {
  if (provider === 'waha') {
    return <WhatsAppIntegrationWaha />;
  }
  return <WhatsAppIntegrationEvolution />;
}
```

### Provider Individual (WhatsAppIntegrationWaha.tsx)

```tsx
/**
 * @ARCHITECTURE ADR-008 - Provider isolado
 * @PROVIDER WAHA
 * @DOCS https://waha.devlike.pro/docs/
 * @INDEPENDENT Este componente é 100% independente
 */
export default function WhatsAppIntegrationWaha() {
  // Todo estado e lógica APENAS de WAHA
}
```

---

## Checklist para Novas Integrações

Antes de criar qualquer nova integração, verifique:

- [ ] **Arquivo separado?** Cada provider tem seu próprio arquivo
- [ ] **Wrapper existente?** Se há múltiplos providers, existe wrapper roteador
- [ ] **Tipos específicos?** Interfaces próprias (ex: `StripeConfig`, `PayPalConfig`)
- [ ] **Sem dependência cruzada?** Provider A não importa de Provider B
- [ ] **Documentação inline?** Tags `@ARCHITECTURE`, `@PROVIDER`, `@INDEPENDENT`
- [ ] **API client separado?** Funções em `utils/` organizadas por provider

---

## Tags de Código Obrigatórias

### Para Wrappers
```typescript
/**
 * @ARCHITECTURE ADR-008
 * @PATTERN Modular Integration Wrapper
 * @NO_MONOLITH
 */
```

### Para Providers
```typescript
/**
 * @ARCHITECTURE ADR-008
 * @PROVIDER [nome do provider]
 * @INDEPENDENT
 * @DOCS [link documentação]
 */
```

### Para API Clients
```typescript
/**
 * @ARCHITECTURE ADR-008
 * @API_CLIENT [nome do provider]
 * @ENDPOINTS Lista os endpoints usados
 */
```

---

## Estrutura de Integrações Atual

### WhatsApp
```
components/
  WhatsAppIntegration.tsx           ← Wrapper
  WhatsAppIntegrationWaha.tsx       ← WAHA provider
  WhatsAppIntegrationEvolution.tsx  ← Evolution provider

utils/
  chatApi.ts                        ← channelsApi.waha.*, channelsApi.evolution.*
  whatsapp/
    waha/
      api.ts                        ← WAHAProvider class
      config.ts                     ← Configurações WAHA
    types.ts                        ← Tipos compartilhados
```

### Backend (Edge Functions)
```
supabase/functions/rendizy-server/
  adapters/chat/
    index.ts                        ← AdapterRegistry
    types.ts                        ← IChatAdapter interface
    evolution-adapter.ts            ← Evolution específico
    waha-adapter.ts                 ← WAHA específico
    airbnb-adapter.ts               ← Airbnb específico
    booking-adapter.ts              ← Booking específico
```

---

## Anti-Patterns (PROIBIDOS)

### ❌ NUNCA fazer isso:

```typescript
// ERRADO: Múltiplos providers no mesmo arquivo
function WhatsAppIntegration() {
  const [evolutionConfig, setEvolutionConfig] = useState();
  const [wahaConfig, setWahaConfig] = useState();
  const [provider, setProvider] = useState();
  
  // 500+ linhas de Evolution
  // 500+ linhas de WAHA
  // Estado entrelaçado
  // Impossível manter
}
```

### ✅ SEMPRE fazer isso:

```typescript
// CORRETO: Wrapper simples
function WhatsAppIntegration({ provider }) {
  if (provider === 'waha') return <WhatsAppIntegrationWaha />;
  return <WhatsAppIntegrationEvolution />;
}

// Em arquivos SEPARADOS:
// WhatsAppIntegrationWaha.tsx - 100% WAHA
// WhatsAppIntegrationEvolution.tsx - 100% Evolution
```

---

## Benefícios Alcançados

| Antes (Monolítico) | Depois (Modular) |
|--------------------|------------------|
| 1 arquivo 1.578 linhas | 3 arquivos ~400 linhas cada |
| Difícil localizar bugs | Bug isolado ao provider |
| Mudança arriscada | Mudança segura |
| Testes impossíveis | Testes isolados |
| Onboarding lento | Onboarding rápido |

---

## Referências

- [ADR-007: Multi-Channel Chat Architecture](./ADR-007-MULTI-CHANNEL-CHAT-ARCHITECTURE.md)
- [WAHA Docs](https://waha.devlike.pro/docs/)
- [Evolution API Docs](https://doc.evolution-api.com/)

---

## Assinaturas de Aprovação

- [x] **Arquiteto:** Aprovado em 2026-01-22
- [x] **Dev Lead:** Aprovado em 2026-01-22

---

**⚠️ VIOLAÇÕES DESTA REGRA DEVEM SER BLOQUEADAS EM CODE REVIEW**
