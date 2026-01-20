# ✅ CHECKLIST OBRIGATÓRIO - ANTES DE QUALQUER MUDANÇA NO CÓDIGO

**⚠️ LEIA ESTE ARQUIVO ANTES DE FAZER QUALQUER ALTERAÇÃO NO CÓDIGO**

---

## 🚨 **REGRA DE OURO ABSOLUTA**

> **"Se está funcionando, NÃO MEXER!"**  
> **"Simplicidade > Complexidade"**  
> **"Funciona > Teoricamente melhor"**

---

## 📋 **CHECKLIST OBRIGATÓRIO (EXECUTAR SEMPRE)**

### **1. ANTES DE ADICIONAR/MODIFICAR CÓDIGO**

- [ ] **Li `Ligando os motores.md`?** ⚠️ **OBRIGATÓRIO**
- [ ] **Li as regras de ouro?** (seção 4 de `Ligando os motores.md`)
- [ ] **A mudança é realmente necessária?** (Se não, NÃO FAZER)
- [ ] **Vai quebrar o que já funciona?** (Se sim, NÃO FAZER)
- [ ] **Existe uma solução mais simples?** (Se sim, usar a simples)

### **2. VERIFICAÇÕES ESPECÍFICAS**

#### **🔴 localStorage / sessionStorage**
- [ ] **Estou usando localStorage/sessionStorage?**
  - [ ] **SIM** → **PARAR!** Verificar se é para dados permanentes
  - [ ] **Dados permanentes?** → ❌ **NÃO USAR localStorage** → Usar SQL
  - [ ] **Cache temporário (< 24h)?** → ✅ Pode usar localStorage
  - [ ] **Token de autenticação?** → ⚠️ Aceito temporariamente (mas viola regra)

#### **🔴 KV Store**
- [ ] **Estou usando KV Store?**
  - [ ] **SIM** → **PARAR!** Verificar se é para dados permanentes
  - [ ] **Dados permanentes?** → ❌ **NÃO USAR KV Store** → Usar SQL
  - [ ] **Cache temporário (< 24h)?** → ✅ Pode usar KV Store

#### **🔴 Polling / setInterval**
- [ ] **Estou criando um novo `setInterval`?**
  - [ ] **SIM** → **PARAR!** Verificar se já existe polling para isso
  - [ ] **Já existe polling?** → ❌ **NÃO CRIAR NOVO** → Usar o existente
  - [ ] **Precisa de novo polling?** → ✅ Consolidar em um único serviço

#### **🔴 Abstrações / Services**
- [ ] **Estou criando um novo service/abstração?**
  - [ ] **SIM** → **PARAR!** Verificar se é realmente necessário
  - [ ] **Pode usar SQL direto nas rotas?** → ✅ **USAR SQL DIRETO**
  - [ ] **Service apenas "wraps" SQL?** → ❌ **NÃO CRIAR** → Usar SQL direto

#### **🔴 CORS / Autenticação**
- [ ] **Estou modificando CORS ou autenticação?**
  - [ ] **SIM** → **PARAR!** Ler `SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md` primeiro
  - [ ] **Vou adicionar `credentials: true`?** → ❌ **NÃO FAZER** (quebra com `origin: "*"`)
  - [ ] **Vou mudar para cookies HttpOnly?** → ❌ **NÃO FAZER** (token no header funciona)
  - [ ] **Vou mudar `origin: "*"`?** → ❌ **NÃO FAZER** (funciona perfeitamente)

#### **🔴 WhatsApp / Evolution API**
- [ ] **Estou modificando código do WhatsApp?**
  - [ ] **SIM** → **PARAR!** Ler `WHATSAPP_VENCIDO_CONSOLIDADO.md` primeiro
  - [ ] **Vou remover `X-Auth-Token`?** → ❌ **NÃO FAZER** (é a solução que funciona)
  - [ ] **Vou voltar para `Authorization: Bearer`?** → ❌ **NÃO FAZER** (causa erro JWT)
  - [ ] **Vou remover polling automático?** → ❌ **NÃO FAZER** (é essencial)

---

## 🚨 **REGRAS CRÍTICAS - NUNCA VIOLAR**

### **1. ❌ NUNCA usar localStorage/KV Store para dados permanentes**
```typescript
// ❌ ERRADO
localStorage.setItem('contacts', JSON.stringify(contacts));

// ✅ CORRETO
await supabase.from('contacts').upsert(contacts);
```

### **2. ❌ NUNCA criar múltiplos polling para a mesma coisa**
```typescript
// ❌ ERRADO
setInterval(() => syncContacts(), 30000);
setInterval(() => syncChats(), 30000);

// ✅ CORRETO
setInterval(() => {
  syncContacts();
  syncChats();
}, 30000);
```

### **3. ❌ NUNCA adicionar `credentials: true` com `origin: "*"`**
```typescript
// ❌ ERRADO
cors({ origin: "*", credentials: true })

// ✅ CORRETO
cors({ origin: "*" }) // SEM credentials
```

### **4. ❌ NUNCA remover `X-Auth-Token` do WhatsApp**
```typescript
// ❌ ERRADO
headers: { 'Authorization': `Bearer ${token}` }

// ✅ CORRETO
headers: { 'X-Auth-Token': token }
```

### **5. ❌ NUNCA criar abstrações que apenas "wraps" SQL**
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
  const { data } = await supabase.from('contacts').select('*');
  return c.json(data);
});
```

---

## 📚 **DOCUMENTOS OBRIGATÓRIOS (LER ANTES DE MUDAR)**

### **Antes de QUALQUER mudança:**
1. ⚠️ **`Ligando os motores.md`** - **OBRIGATÓRIO PRIMEIRO**
2. ⚠️ **`REGRA_KV_STORE_VS_SQL.md`** - Antes de usar localStorage/KV Store
3. ⚠️ **`REGRA_AUTENTICACAO_TOKEN.md`** - Antes de mudar autenticação

### **Antes de mudar CORS/Login:**
1. ⚠️ **`SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md`** - **OBRIGATÓRIO**
2. ⚠️ **`RESUMO_SIMPLIFICACAO_CORS_LOGIN_20251120.md`** - Entender por que simplificamos

### **Antes de mudar WhatsApp:**
1. ⚠️ **`WHATSAPP_VENCIDO_CONSOLIDADO.md`** - **OBRIGATÓRIO**

### **Antes de criar abstrações:**
1. ⚠️ **`ANALISE_HONESTA_ARQUITETURA.md`** - Entender arquitetura atual
2. ⚠️ **`PLANO_REFATORACAO_ARQUITETURAL.md`** - Ver plano de refatoração

---

## 🔍 **VALIDAÇÃO AUTOMÁTICA (ANTES DE COMMITAR)**

### **Checklist de Validação:**
```bash
# 1. Verificar se não está usando localStorage para dados permanentes
grep -r "localStorage.setItem" --include="*.ts" --include="*.tsx" | grep -v "rendizy-token" | grep -v "cache:"

# 2. Verificar se não está criando múltiplos setInterval
grep -r "setInterval" --include="*.ts" --include="*.tsx" | wc -l
# Se > 3, verificar se são necessários

# 3. Verificar se não está usando KV Store para dados permanentes
grep -r "kv.set" --include="*.ts" | grep -v "cache:" | grep -v "temp:" | grep -v "process:" | grep -v "lock:" | grep -v "queue:"

# 4. Verificar se não está removendo X-Auth-Token
grep -r "X-Auth-Token" --include="*.ts" --include="*.tsx"
```

---

## ⚠️ **AVISOS CRÍTICOS**

### **Se você está pensando em:**
- "Melhorar" o CORS → **PARE E LEIA** `SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md`
- "Adicionar segurança" com cookies HttpOnly → **PARE E LEIA** `Ligando os motores.md` seção 4.4
- "Otimizar" a autenticação → **PARE E LEIA** `Ligando os motores.md` seção 4.4
- "Simplificar" o código → **PARE E VERIFIQUE** se não vai quebrar o que funciona
- "Criar um service" → **PARE E VERIFIQUE** se não é apenas um wrapper de SQL

### **Se ainda quiser mudar, pergunte-se:**
1. ✅ Isso está quebrado? (Se não, não mexer)
2. ✅ A mudança é realmente necessária? (Se não, não mexer)
3. ✅ Vai quebrar o que já funciona? (Se sim, não mexer)
4. ✅ Existe uma solução mais simples? (Se sim, usar a simples)

---

## 📝 **PROCESSO RECOMENDADO**

### **1. Antes de começar:**
```bash
# Ler documentação obrigatória
cat "Ligando os motores.md" | head -100
cat "REGRA_KV_STORE_VS_SQL.md"
cat "REGRA_AUTENTICACAO_TOKEN.md"
```

### **2. Durante o desenvolvimento:**
- ✅ Verificar checklist acima a cada mudança
- ✅ Testar se não quebrou o que já funciona
- ✅ Verificar se não violou regras estabelecidas

### **3. Antes de commitar:**
- ✅ Executar validação automática
- ✅ Verificar se não criou regressões
- ✅ Verificar se não violou regras de ouro

---

## 🎯 **RESUMO RÁPIDO**

### **❌ NUNCA FAZER:**
1. ❌ localStorage/KV Store para dados permanentes
2. ❌ Múltiplos polling para a mesma coisa
3. ❌ `credentials: true` com `origin: "*"`
4. ❌ Remover `X-Auth-Token` do WhatsApp
5. ❌ Abstrações que apenas "wraps" SQL
6. ❌ Mudar o que já funciona

### **✅ SEMPRE FAZER:**
1. ✅ Ler `Ligando os motores.md` primeiro
2. ✅ Verificar se mudança é necessária
3. ✅ Usar SQL para dados permanentes
4. ✅ Consolidar polling em um único serviço
5. ✅ Usar SQL direto nas rotas
6. ✅ Manter simplicidade

---

**Última atualização:** 2025-11-22  
**Status:** ⚠️ **CHECKLIST OBRIGATÓRIO - EXECUTAR ANTES DE QUALQUER MUDANÇA**

