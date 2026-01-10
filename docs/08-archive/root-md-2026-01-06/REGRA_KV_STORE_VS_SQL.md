# 🚫 REGRA: Quando usar KV Store vs SQL

**Versão:** v1.0.103.970  
**Data:** 20/11/2025  
**Status:** ✅ **REGRA OBRIGATÓRIA**

---

## 🎯 PRINCÍPIO GERAL

**REGRA DE OURO:**
> **Use SQL para TUDO que precisa persistir permanentemente.  
> KV Store APENAS para cache temporário (TTL < 24h).**

---

## ❌ **NUNCA USE KV STORE PARA:**

### 1. **Dados que precisam persistir permanentemente**
- ❌ Conversas e mensagens
- ❌ Usuários e autenticação
- ❌ Configurações de organização
- ❌ Reservas e bookings
- ❌ Propriedades/Imóveis
- ❌ Dados financeiros
- ❌ Histórico de transações
- ❌ Qualquer dado crítico para o negócio

### 2. **Dados que precisam de integridade referencial**
- ❌ Relacionamentos entre entidades (foreign keys)
- ❌ Dados que dependem de outros dados
- ❌ Validações de consistência

### 3. **Dados que precisam de queries complexas**
- ❌ JOINs entre tabelas
- ❌ Agregações (SUM, COUNT, AVG)
- ❌ Filtros por múltiplos campos
- ❌ Ordenação por campos específicos
- ❌ Busca full-text

### 4. **Dados que precisam de índices**
- ❌ Busca rápida por campos específicos
- ❌ Ordenação por timestamp
- ❌ Filtros por status, categoria, etc.

### 5. **Dados multi-tenant**
- ❌ Dados por organização (organization_id)
- ❌ Isolamento de dados entre clientes
- ❌ Row Level Security (RLS)

---

## ✅ **USE KV STORE APENAS PARA:**

### 1. **Cache temporário (TTL curto)**
```typescript
// ✅ BOM: Cache de API externa (5 minutos)
const cachedData = await kv.get(`cache:external-api:${key}`);
if (!cachedData) {
  const data = await fetchExternalAPI();
  await kv.set(`cache:external-api:${key}`, data, { ttl: 300 }); // 5 min
}

// ✅ BOM: Sessão temporária de processo
await kv.set(`process:${processId}`, { status: 'running' });
```

### 2. **Dados voláteis que não importam se perder**
- ✅ Estado temporário de processos
- ✅ Locks de operações
- ✅ Fila de jobs (se usar Redis seria melhor)
- ✅ Resultados de queries pesadas (cache com TTL)

### 3. **Dados que mudam muito e não precisam persistir**
- ✅ Contadores de views em tempo real
- ✅ Status de conexão temporário
- ✅ Dados de sessão de navegação

---

## 📋 **CHECKLIST ANTES DE USAR KV STORE**

Antes de usar KV Store, pergunte:

1. ✅ **Esses dados precisam persistir além de 24h?**
   - SIM → Use SQL
   - NÃO → Continue verificando...

2. ✅ **Esses dados são críticos para o negócio?**
   - SIM → Use SQL
   - NÃO → Continue verificando...

3. ✅ **Esses dados podem ser perdidos sem problema?**
   - NÃO → Use SQL
   - SIM → Pode ser KV Store (cache)

4. ✅ **Esses dados são temporários (cache, sessão, processo)?**
   - SIM → KV Store OK
   - NÃO → Use SQL

---

## 🏗️ **ARQUITETURA RECOMENDADA**

### **Estrutura de Dados:**

```
SQL TABLES (PostgreSQL):
├── organizations          ✅ Usuários e organizações
├── users                  ✅ Autenticação e permissões
├── sessions               ✅ Sessões de login
├── conversations          ✅ Conversas (WhatsApp, Email, SMS)
├── messages               ✅ Mensagens individuais
├── reservations           ✅ Reservas e bookings
├── listings               ✅ Propriedades/Imóveis
├── organization_channel_config ✅ Configurações de canais
└── ... (tabelas SQL)

KV STORE (Apenas cache):
├── cache:external-api:*   ✅ Cache de APIs externas (TTL curto)
├── process:*              ✅ Estado de processos temporários
└── ... (apenas cache temporário)
```

---

## 🔒 **REGRAS DE CÓDIGO**

### **1. Não use KV Store para dados críticos**

```typescript
// ❌ ERRADO:
await kv.set(`user:${userId}`, userData); // ❌ Usuários devem estar em SQL

// ✅ CORRETO:
await supabase.from('users').upsert(userData); // ✅ SQL
```

### **2. Não use KV Store para relacionamentos**

```typescript
// ❌ ERRADO:
await kv.set(`conversation:${id}`, conversation); // ❌ Conversas devem estar em SQL

// ✅ CORRETO:
await supabase.from('conversations').upsert(conversation); // ✅ SQL
```

### **3. Use KV Store apenas para cache**

```typescript
// ✅ CORRETO:
const cacheKey = `cache:external-api:${query}`;
const cached = await kv.get(cacheKey);
if (cached) return cached;

const data = await fetchExternalAPI();
await kv.set(cacheKey, data, { ttl: 300 }); // ✅ Cache com TTL
return data;
```

---

## 📝 **VALIDAÇÃO NO CÓDIGO**

### **Helper para validar uso de KV Store:**

```typescript
/**
 * Valida se é seguro usar KV Store
 * @throws Error se tentar usar KV Store para dados críticos
 */
function validateKVStoreUsage(key: string, purpose: string) {
  const criticalPatterns = [
    /^user:/,
    /^conversation:/,
    /^message:/,
    /^reservation:/,
    /^property:/,
    /^listing:/,
    /^organization:/,
    /^config:/,
    /^channel_config:/,
  ];
  
  const isCritical = criticalPatterns.some(pattern => pattern.test(key));
  
  if (isCritical) {
    throw new Error(
      `❌ PROIBIDO: Não use KV Store para dados críticos!\n` +
      `   Key: ${key}\n` +
      `   Propósito: ${purpose}\n` +
      `   Solução: Use tabela SQL apropriada\n` +
      `   Veja: REGRA_KV_STORE_VS_SQL.md`
    );
  }
  
  // Cache OK se tiver prefixo correto
  if (!key.startsWith('cache:') && !key.startsWith('process:') && !key.startsWith('temp:')) {
    console.warn(
      `⚠️ ATENÇÃO: KV Store usado sem prefixo de cache\n` +
      `   Key: ${key}\n` +
      `   Considere usar SQL se os dados precisam persistir`
    );
  }
}
```

---

## 🚨 **PADRÕES PERIGOSOS**

### **❌ NUNCA FAÇA:**

```typescript
// ❌ Dados de usuário em KV Store
await kv.set(`user:${id}`, user);

// ❌ Conversas em KV Store
await kv.set(`conversation:${id}`, conversation);

// ❌ Mensagens em KV Store
await kv.set(`message:${id}`, message);

// ❌ Configurações em KV Store
await kv.set(`config:${orgId}`, config);
```

### **✅ SEMPRE FAÇA:**

```typescript
// ✅ Dados de usuário em SQL
await supabase.from('users').upsert(user);

// ✅ Conversas em SQL
await supabase.from('conversations').upsert(conversation);

// ✅ Mensagens em SQL
await supabase.from('messages').upsert(message);

// ✅ Configurações em SQL
await supabase.from('organization_channel_config').upsert(config);
```

---

## 📊 **COMPARAÇÃO RÁPIDA**

| Dado | Deve Usar | Motivo |
|------|-----------|--------|
| Usuários | SQL | Persistência permanente |
| Conversas | SQL | Persistência + integridade |
| Mensagens | SQL | Persistência + relacionamento |
| Reservas | SQL | Dados críticos do negócio |
| Propriedades | SQL | Dados críticos do negócio |
| Configurações | SQL | Persistência permanente |
| Cache de API | KV Store | Temporário com TTL |
| Estado de processo | KV Store | Temporário |
| Contadores em tempo real | KV Store | Volátil OK |

---

## ✅ **AÇÃO IMEDIATA**

1. ✅ **Migrar conversas/mensagens para SQL** (fazer agora)
2. ✅ **Criar validação no código** (prevenir uso indevido)
3. ✅ **Documentar padrão** (este arquivo)
4. ✅ **Revisar código existente** (remover KV Store de dados críticos)

---

## 📚 **REFERÊNCIAS**

- `src/🎓_POR_QUE_TABELA_UNICA_KV_STORE.md` - História do KV Store
- `src/⚖️_KV_STORE_VS_SQL_RELACIONAL.md` - Comparação técnica
- `SOLUCAO_CONEXAO_WHATSAPP_ESTAVEL.md` - Recomendação de migração

---

**VERSÃO:** v1.0.103.970  
**DATA:** 20/11/2025  
**STATUS:** ✅ **REGRA OBRIGATÓRIA**

