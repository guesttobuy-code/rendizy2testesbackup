# 🤖 GUIA RÁPIDO PARA IAs: WhatsApp Multi-Provider

> **LEIA ISTO ANTES DE MODIFICAR QUALQUER CÓDIGO WHATSAPP**

## ⚠️ ARQUITETURA OBRIGATÓRIA

O Rendizy usa **DOIS providers** de WhatsApp:

| Provider | Porta | Uso |
|----------|-------|-----|
| **WAHA** | 3001 | Preferencial (via webhooks) |
| **Evolution** | 8080 | Legado |

## 🚫 NUNCA FAZER

```typescript
// ❌ ERRADO - Assumir que só existe Evolution
const chats = await fetch(`${EVOLUTION_URL}/chat/findChats`);

// ❌ ERRADO - Ignorar detecção de provider
const config = await getEvolutionConfigForOrganization(orgId);

// ❌ ERRADO - Criar endpoint separado para WAHA
app.get('/waha/chats', handleWahaChats);
app.get('/evolution/chats', handleEvolutionChats);
```

## ✅ SEMPRE FAZER

```typescript
// ✅ CORRETO - Detectar provider primeiro
const activeInstance = await detectActiveWhatsAppProvider(organizationId);

if (activeInstance?.provider === 'waha') {
  // Usar getConversationsFromDatabase()
  return await getConversationsFromDatabase(organizationId);
} else {
  // Usar Evolution API
  return await fetchFromEvolutionAPI(config);
}
```

## 📁 Arquivos Chave

| Arquivo | Função | Tag |
|---------|--------|-----|
| `routes-whatsapp-evolution.ts` | Backend unificado | `@CAPSULE:UNIFIED-CHATS` |
| `chatUnifiedApi.ts` | Frontend unificado | `@CAPSULE:UNIFIED-FETCH` |
| `routes-chat.ts` | Webhooks WAHA | `@CAPSULE:WAHA-WEBHOOK` |

## 🔍 Como Verificar Provider

```sql
-- Verificar qual provider a org usa
SELECT provider, instance_name, status 
FROM channel_instances 
WHERE organization_id = 'xxx' 
  AND channel_type = 'whatsapp';
```

## 📖 Documentação Completa

- [ADR-009: WhatsApp Multi-Provider](./ADR/ADR-009-WHATSAPP-MULTI-PROVIDER.md)

---
**Versão:** 1.0.0 | **Data:** 2026-01-23
