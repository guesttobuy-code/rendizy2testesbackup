# 📖 REGRAS ESTABELECIDAS - REFERÊNCIA RÁPIDA

**⚠️ CONSULTE ESTE ARQUIVO ANTES DE QUALQUER MUDANÇA NO CÓDIGO**

---

## 🚨 **REGRAS FUNDAMENTAIS (NUNCA VIOLAR)**

### **1. NÃO COMPLIQUE O QUE JÁ FUNCIONA**
> **"Se está funcionando, NÃO MEXER!"**  
> **"Simplicidade > Complexidade"**  
> **"Funciona > Teoricamente melhor"**

### **2. SQL PARA DADOS PERMANENTES**
> ❌ **NUNCA** use localStorage/KV Store para dados permanentes  
> ✅ **SEMPRE** use SQL para dados que precisam persistir  
> ✅ **APENAS** use localStorage/KV Store para cache temporário (< 24h)

### **3. SQL DIRETO NAS ROTAS**
> ❌ **NUNCA** crie abstrações que apenas "wraps" SQL  
> ✅ **SEMPRE** use SQL direto nas rotas (`routes-*.ts`)  
> ✅ **MENOS código = MENOS bugs**

---

## 📋 **REGRAS POR CATEGORIA**

### **🔴 localStorage / sessionStorage**

#### **❌ NUNCA USAR PARA:**
- Contatos (`contacts`, `evolution_contacts`)
- Conversas (`conversations`)
- Mensagens (`messages`)
- Usuários (`users`)
- Sessões (`sessions`) - **JÁ MIGRADO PARA SQL**
- Reservas (`reservations`)
- Propriedades (`properties`)
- Configurações (`config`) - **JÁ MIGRADO PARA SQL**

#### **✅ PODE USAR PARA:**
- Cache temporário (< 24h)
- Preferências de UI não críticas
- Token de autenticação (⚠️ aceito temporariamente, mas viola regra)

#### **📝 EXEMPLO:**
```typescript
// ❌ ERRADO
localStorage.setItem('contacts', JSON.stringify(contacts));

// ✅ CORRETO
await supabase.from('contacts').upsert(contacts);
```

---

### **🔴 KV Store**

#### **❌ NUNCA USAR PARA:**
- Dados críticos para o negócio
- Dados que precisam persistir > 24h
- Dados que precisam de integridade referencial

#### **✅ PODE USAR PARA:**
- Cache temporário (`cache:*`)
- Processos temporários (`process:*`)
- Dados temporários (`temp:*`)
- Locks (`lock:*`)
- Filas (`queue:*`)

#### **📝 EXEMPLO:**
```typescript
// ❌ ERRADO
await kv.set(`chat:conversation:${id}`, conversation);

// ✅ CORRETO
await supabase.from('conversations').upsert(conversation);
```

---

### **🔴 Polling / setInterval**

#### **❌ NUNCA FAZER:**
- Criar múltiplos `setInterval` para a mesma coisa
- Polling sem cleanup adequado
- Polling sem coordenação

#### **✅ SEMPRE FAZER:**
- Consolidar polling em um único serviço
- Limpar intervalos no `useEffect` cleanup
- Coordenar atualizações entre componentes

#### **📝 EXEMPLO:**
```typescript
// ❌ ERRADO
useEffect(() => {
  setInterval(() => syncContacts(), 30000);
  setInterval(() => syncChats(), 30000);
}, []);

// ✅ CORRETO
useEffect(() => {
  const interval = setInterval(() => {
    syncContacts();
    syncChats();
  }, 30000);
  
  return () => clearInterval(interval);
}, []);
```

---

### **🔴 CORS / Autenticação**

#### **❌ NUNCA FAZER:**
- Adicionar `credentials: true` com `origin: "*"`
- Mudar para cookies HttpOnly (se token no header funciona)
- Mudar `origin: "*"` para lista de origens
- Adicionar headers CORS manuais

#### **✅ ESTÁ ASSIM E FUNCIONA (NÃO MUDAR):**
```typescript
// ✅ CORS - FUNCIONA PERFEITAMENTE
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "apikey", "X-Auth-Token"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
}));

// ✅ Autenticação - FUNCIONA PERFEITAMENTE
// Backend
const token = c.req.header('Authorization')?.split(' ')[1] || 
              c.req.header('X-Auth-Token');

// Frontend
headers: {
  'Authorization': `Bearer ${publicAnonKey}`,
  'X-Auth-Token': token // Token do usuário
}
```

#### **📝 DOCUMENTAÇÃO OBRIGATÓRIA:**
- ⚠️ **`SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md`** - **LER ANTES DE MUDAR**

---

### **🔴 WhatsApp / Evolution API**

#### **❌ NUNCA FAZER:**
- Remover `X-Auth-Token` (é a solução que funciona)
- Voltar para `Authorization: Bearer` com token do usuário (causa erro JWT)
- Remover verificação automática de status
- Remover polling automático (é essencial)
- Usar KV Store para sessões (já migramos para SQL)

#### **✅ ESTÁ ASSIM E FUNCIONA (NÃO MUDAR):**
```typescript
// ✅ Autenticação WhatsApp - FUNCIONA PERFEITAMENTE
headers: {
  'Authorization': `Bearer ${publicAnonKey}`, // Necessário para Supabase
  'X-Auth-Token': token // Token do usuário (evita validação JWT)
}

// ✅ Polling - FUNCIONA PERFEITAMENTE
useEffect(() => {
  loadConversations();
  
  const interval = setInterval(() => {
    loadConversations();
  }, 30000); // 30 segundos
  
  return () => clearInterval(interval);
}, []);
```

#### **📝 DOCUMENTAÇÃO OBRIGATÓRIA:**
- ⚠️ **`WHATSAPP_VENCIDO_CONSOLIDADO.md`** - **LER ANTES DE MUDAR**

---

### **🔴 Abstrações / Services**

#### **❌ NUNCA FAZER:**
- Criar service que apenas "wraps" SQL
- Criar múltiplas camadas de mappers desnecessários
- Criar repositórios intermediários

#### **✅ SEMPRE FAZER:**
- Usar SQL direto nas rotas
- Menos código = menos bugs
- Validações no banco (constraints)

#### **📝 EXEMPLO:**
```typescript
// ❌ ERRADO
class ContactRepository {
  async getContacts() {
    return await supabase.from('contacts').select('*');
  }
}

// ✅ CORRETO
// SQL direto na rota
app.get('/contacts', async (c) => {
  const orgId = await getOrganizationIdOrThrow(c);
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', orgId);
  return c.json({ success: true, data });
});
```

---

## 📊 **TABELA DE REFERÊNCIA RÁPIDA**

| O Que | ❌ NUNCA | ✅ SEMPRE |
|-------|---------|----------|
| **Dados permanentes** | localStorage/KV Store | SQL |
| **Cache temporário** | SQL | localStorage/KV Store |
| **Polling** | Múltiplos intervalos | Um único intervalo coordenado |
| **CORS** | `credentials: true` com `origin: "*"` | `origin: "*"` SEM `credentials` |
| **Autenticação** | Cookies HttpOnly (se token funciona) | Token no header |
| **WhatsApp Auth** | `Authorization: Bearer` com token usuário | `X-Auth-Token` |
| **Abstrações** | Services que "wraps" SQL | SQL direto nas rotas |
| **Código** | Complexo | Simples |

---

## 🚨 **CHECKLIST RÁPIDO (ANTES DE QUALQUER MUDANÇA)**

### **1. Verificações Básicas:**
- [ ] Li `Ligando os motores.md`?
- [ ] A mudança é necessária?
- [ ] Vai quebrar o que funciona?
- [ ] Existe solução mais simples?

### **2. Verificações Específicas:**
- [ ] Estou usando localStorage? → É para dados permanentes? → ❌ NÃO USAR
- [ ] Estou criando setInterval? → Já existe polling? → ❌ NÃO CRIAR
- [ ] Estou mudando CORS? → Li `SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md`? → ⚠️ LER PRIMEIRO
- [ ] Estou mudando WhatsApp? → Li `WHATSAPP_VENCIDO_CONSOLIDADO.md`? → ⚠️ LER PRIMEIRO
- [ ] Estou criando service? → É apenas wrapper de SQL? → ❌ NÃO CRIAR

---

## 📚 **DOCUMENTOS OBRIGATÓRIOS**

### **Sempre ler primeiro:**
1. ⚠️ **`Ligando os motores.md`** - **OBRIGATÓRIO**
2. ⚠️ **`REGRA_KV_STORE_VS_SQL.md`** - Antes de usar localStorage/KV Store
3. ⚠️ **`REGRA_AUTENTICACAO_TOKEN.md`** - Antes de mudar autenticação

### **Antes de mudar CORS/Login:**
1. ⚠️ **`SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md`** - **OBRIGATÓRIO**
2. ⚠️ **`RESUMO_SIMPLIFICACAO_CORS_LOGIN_20251120.md`**

### **Antes de mudar WhatsApp:**
1. ⚠️ **`WHATSAPP_VENCIDO_CONSOLIDADO.md`** - **OBRIGATÓRIO**

---

## 🎯 **RESUMO ULTRA-RÁPIDO**

### **❌ NUNCA:**
1. localStorage/KV Store para dados permanentes
2. Múltiplos polling
3. `credentials: true` com `origin: "*"`
4. Remover `X-Auth-Token`
5. Abstrações desnecessárias
6. Mudar o que funciona

### **✅ SEMPRE:**
1. Ler `Ligando os motores.md` primeiro
2. SQL para dados permanentes
3. Um único polling coordenado
4. SQL direto nas rotas
5. Manter simplicidade

---

**Última atualização:** 2025-11-22  
**Status:** 📖 **REFERÊNCIA RÁPIDA - CONSULTAR ANTES DE QUALQUER MUDANÇA**

