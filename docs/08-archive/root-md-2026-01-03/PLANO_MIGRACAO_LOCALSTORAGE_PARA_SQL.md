# 📋 PLANO DE MIGRAÇÃO: localStorage → SQL Database

**Data:** 2024-11-20  
**Status:** 🔄 **EM ANDAMENTO**

---

## 🎯 OBJETIVO

Migrar a autenticação do frontend de **localStorage** para **SQL Database** (tabela `sessions`), alinhando o frontend com a arquitetura SQL já implementada no backend.

---

## 📊 SITUAÇÃO ATUAL

### ✅ **BACKEND (Já migrado para SQL):**
- ✅ Tabela `sessions` criada no SQL
- ✅ Login salva sessão no SQL (`routes-auth.ts` linha 240-250)
- ✅ Logout remove sessão do SQL (`routes-auth.ts` linha 267-270)
- ✅ Rota `/auth/me` verifica sessão no SQL (`routes-auth.ts` linha 310-341)

### ❌ **FRONTEND (Ainda usa localStorage):**
- ❌ Salva token no localStorage (`AuthContext.tsx` linha 186)
- ❌ Salva user no localStorage (`AuthContext.tsx` linha 187)
- ❌ Carrega do localStorage ao inicializar (`AuthContext.tsx` linhas 48-58)
- ❌ **NÃO verifica se sessão ainda é válida no backend**
- ❌ **Confia cegamente no localStorage**

---

## 🔍 PROBLEMAS IDENTIFICADOS

### **1. Sessão não sincronizada:**
- Frontend pode ter token no localStorage mas sessão já expirou no banco
- Frontend acha que está logado mas backend rejeita requisições

### **2. Dados desatualizados:**
- Dados do usuário no localStorage podem estar desatualizados
- Mudanças no backend (ex: status do usuário) não são refletidas

### **3. Segurança:**
- localStorage pode ser manipulado pelo usuário
- Token pode ser roubado via XSS
- Não há verificação de expiração real

### **4. Multi-dispositivo:**
- Sessões não são gerenciadas centralmente
- Logout em um dispositivo não afeta outros

---

## ✅ SOLUÇÃO PROPOSTA

### **Estratégia Híbrida (Transição Suave):**

#### **1. Token no localStorage (Temporário):**
- ✅ Manter token no localStorage **apenas como cache**
- ✅ Sempre verificar validade no backend antes de usar

#### **2. Dados do usuário do backend:**
- ❌ **NÃO salvar** dados do usuário no localStorage
- ✅ **Sempre buscar** dados do usuário do backend via `/auth/me`
- ✅ Cachear em memória (React state) apenas

#### **3. Validação automática:**
- ✅ Ao carregar a aplicação, verificar se token é válido
- ✅ Se válido, carregar dados do usuário do backend
- ✅ Se inválido/expirado, limpar localStorage e redirecionar para login

---

## 🔧 IMPLEMENTAÇÃO

### **Passo 1: Modificar `loadUser` no `AuthContext.tsx`**

**Antes:**
```typescript
const savedUser = localStorage.getItem('rendizy-user');
if (savedUser) {
  setUser(JSON.parse(savedUser));
}
```

**Depois:**
```typescript
const token = localStorage.getItem('rendizy-token');
if (token) {
  // ✅ Validar token no backend
  const response = await fetch('/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    const data = await response.json();
    // ✅ Carregar dados do backend (fonte da verdade)
    setUser(data.user);
  } else {
    // ❌ Token inválido/expirado - limpar localStorage
    localStorage.removeItem('rendizy-token');
  }
}
```

### **Passo 2: Remover salvamento de dados do usuário no localStorage**

**Antes:**
```typescript
localStorage.setItem('rendizy-token', data.token);
localStorage.setItem('rendizy-user', JSON.stringify(loggedUser));
```

**Depois:**
```typescript
localStorage.setItem('rendizy-token', data.token);
// ❌ NÃO salvar user no localStorage
// ✅ User será carregado do backend via /auth/me
setUser(loggedUser); // Apenas cache em memória
```

### **Passo 3: Verificar sessão periodicamente (Opcional)**

```typescript
// Verificar sessão a cada 5 minutos
useEffect(() => {
  if (!token) return;
  
  const interval = setInterval(async () => {
    const response = await fetch('/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      // Sessão expirou - fazer logout
      await logout();
    }
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [token]);
```

---

## 📝 CHECKLIST

- [ ] Modificar `loadUser` para validar token no backend
- [ ] Remover salvamento de `rendizy-user` no localStorage
- [ ] Remover salvamento de `rendizy-organization` no localStorage (buscar do backend)
- [ ] Garantir que logout sempre limpe localStorage E sessão no backend
- [ ] Adicionar tratamento de erro quando sessão expira
- [ ] Testar fluxo completo de login → logout → re-login
- [ ] Verificar se outras partes do código dependem de `rendizy-user` no localStorage

---

## 🎯 BENEFÍCIOS

### **1. Segurança:**
- ✅ Token sempre validado no backend
- ✅ Sessões gerenciadas centralmente
- ✅ Logout garante limpeza completa

### **2. Consistência:**
- ✅ Dados sempre atualizados (fonte única: backend)
- ✅ Sincronização automática entre dispositivos

### **3. Manutenibilidade:**
- ✅ Lógica de autenticação centralizada no backend
- ✅ Frontend apenas consome API
- ✅ Mais fácil de debugar e testar

### **4. Escalabilidade:**
- ✅ Suporta múltiplos dispositivos
- ✅ Permite invalidar sessões remotamente
- ✅ Facilita implementação de refresh tokens

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Implementar validação de token no `loadUser`**
2. ✅ **Remover dependência de localStorage para dados do usuário**
3. ✅ **Testar fluxo completo**
4. ✅ **Documentar mudanças**

---

**Última atualização:** 2024-11-20

