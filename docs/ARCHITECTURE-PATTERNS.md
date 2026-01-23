# 🏗️ Padrões de Arquitetura Rendizy

> **Última atualização:** 2026-01-22  
> **Status:** ✅ OBRIGATÓRIO PARA NOVAS IMPLEMENTAÇÕES

---

## 📋 Índice Rápido

1. [Regra de Ouro: Anti-Monolítico](#regra-de-ouro)
2. [Padrão de Integrações](#padrão-de-integrações)
3. [Tags de Código](#tags-de-código)
4. [Checklist de Review](#checklist-de-review)

---

## Regra de Ouro

### 🚨 NUNCA CRIAR BLOCOS MONOLÍTICOS

```
❌ PROIBIDO:
   Um arquivo com 1.500+ linhas misturando múltiplos providers

✅ OBRIGATÓRIO:
   Arquivos separados, cada provider isolado
```

**ADR de referência:** [ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md](./ADR/ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md)

---

## Padrão de Integrações

### Estrutura de Arquivos

```
components/
  FeatureIntegration.tsx           ← WRAPPER (roteador ~100 linhas)
  FeatureIntegrationProviderA.tsx  ← Provider A completo
  FeatureIntegrationProviderB.tsx  ← Provider B completo
```

### Exemplo Real: WhatsApp

```
components/
  WhatsAppIntegration.tsx           ← Wrapper
  WhatsAppIntegrationWaha.tsx       ← WAHA provider
  WhatsAppIntegrationEvolution.tsx  ← Evolution provider
```

### Wrapper Pattern

```tsx
// WhatsAppIntegration.tsx - APENAS roteamento
export default function WhatsAppIntegration({ provider = 'evolution' }) {
  if (provider === 'waha') return <WhatsAppIntegrationWaha />;
  return <WhatsAppIntegrationEvolution />;
}
```

---

## Tags de Código

### Tags Obrigatórias em Todo Arquivo de Integração

| Tag | Uso | Exemplo |
|-----|-----|---------|
| `@ARCHITECTURE` | Referência ao ADR | `@ARCHITECTURE ADR-008` |
| `@PATTERN` | Padrão utilizado | `@PATTERN Modular Integration` |
| `@PROVIDER` | Nome do provider | `@PROVIDER WAHA` |
| `@INDEPENDENT` | Confirma isolamento | `@INDEPENDENT` |
| `@NO_MONOLITH` | Confirma regra anti-monolítica | `@NO_MONOLITH` |

### Exemplo de Cabeçalho Completo

```typescript
/**
 * @ARCHITECTURE ADR-008 - Provider Isolado
 * @PROVIDER WAHA
 * @INDEPENDENT Este componente é 100% independente
 * @DOCS https://link-documentacao-provider.com
 * 
 * ═════════════════════════════════════════════════════
 * 🚨 COMPONENTE ISOLADO POR PROVIDER
 * ═════════════════════════════════════════════════════
 * 
 * ✅ Contém APENAS lógica do provider WAHA
 * ✅ Estado gerenciado independentemente
 * ❌ NUNCA importar de outros providers
 */
```

---

## Checklist de Review

### Antes de Aprovar PR com Nova Integração

- [ ] **Arquivo separado?** Cada provider em seu próprio arquivo
- [ ] **Wrapper existente?** Se múltiplos providers, tem arquivo wrapper
- [ ] **Tipos específicos?** Interfaces próprias por provider
- [ ] **Sem import cruzado?** Provider A não importa de Provider B
- [ ] **Tags presentes?** `@ARCHITECTURE`, `@PROVIDER`, `@INDEPENDENT`
- [ ] **ADR referenciado?** Cabeçalho menciona ADR-008
- [ ] **Menos de 1.200 linhas?** Arquivos não monolíticos

### Red Flags (Bloquear PR)

🚩 Arquivo único com múltiplos providers  
🚩 Variáveis como `evolutionX` e `wahaY` no mesmo escopo  
🚩 Estado compartilhado entre providers  
🚩 Arquivo com 1.500+ linhas  
🚩 Falta de tags de arquitetura  

---

## ADRs Relacionados

| ADR | Título | Escopo |
|-----|--------|--------|
| [ADR-007](./ADR/ADR-007-MULTI-CHANNEL-CHAT-ARCHITECTURE.md) | Multi-Channel Chat Architecture | Backend adapters |
| [ADR-008](./ADR/ADR-008-MODULAR-INTEGRATIONS-ARCHITECTURE.md) | Modular Integrations (Anti-Monolítico) | Frontend/Backend integrações |

---

## Histórico

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-01-22 | 1.0 | Criação baseada em refatoração WhatsApp |

---

**⚠️ ESTE DOCUMENTO DEVE SER LIDO POR TODOS OS DESENVOLVEDORES**
