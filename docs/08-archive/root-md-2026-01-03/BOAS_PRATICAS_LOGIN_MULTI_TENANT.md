# 🎯 BOAS PRÁTICAS UNIVERSAIS - LOGIN MULTI-TENANT

**Data:** 2025-11-23  
**Objetivo:** Documentar padrões universais de autenticação multi-tenant e identificar o que falta no sistema atual

---

## 📚 PADRÕES UNIVERSAIS (Indústria)

### **1. SESSÕES NO SERVIDOR (SQL) ✅**
**Padrão:** Todas as sessões devem estar no banco de dados do servidor.

**Por quê:**
- ✅ Fonte única da verdade
- ✅ Pode invalidar sessões remotamente
- ✅ Funciona em múltiplos dispositivos
- ✅ Auditoria e segurança

**Status atual:** ✅ **IMPLEMENTADO** - Sessões na tabela `sessions` do SQL

---

### **2. TOKEN SEGURO ⚠️**
**Padrão:** Token deve ser:
- ✅ Aleatório e não previsível
- ✅ Armazenado de forma segura (HttpOnly cookie > localStorage)
- ✅ Validado sempre no servidor
- ✅ Não exposto em logs

**Status atual:** ⚠️ **PARCIALMENTE**
- ✅ Token aleatório gerado
- ❌ Token no `localStorage` (vulnerável a XSS)
- ✅ Validação no servidor
- ⚠️ Token pode aparecer em logs

**Problema:** `localStorage` pode ser:
- Limpo pelo navegador
- Roubado via XSS
- Manipulado pelo usuário

---

### **3. VALIDAÇÃO PERIÓDICA ⚠️**
**Padrão:** Validar sessão:
- ✅ Ao carregar a aplicação
- ✅ Periodicamente (ex: a cada 5-10 minutos)
- ✅ Antes de operações críticas
- ✅ Quando sessão está próxima de expirar

**Status atual:** ⚠️ **PARCIALMENTE**
- ✅ Validação ao carregar (`useEffect` no mount)
- ❌ **NÃO há validação periódica**
- ❌ **NÃO há refresh automático**

**Problema:** Se usuário ficar inativo, sessão pode expirar sem aviso.

---

### **4. SLIDING EXPIRATION ✅**
**Padrão:** Sessão deve ser estendida automaticamente quando usuário está ativo.

**Status atual:** ✅ **IMPLEMENTADO** - `utils-session.ts` atualiza `last_activity` e `expires_at`

---

### **5. REFRESH AUTOMÁTICO ❌**
**Padrão:** Quando sessão está próxima de expirar (< 1 hora), renovar automaticamente.

**Status atual:** ❌ **NÃO IMPLEMENTADO**

**Problema:** Usuário pode ser deslogado inesperadamente.

---

### **6. TRATAMENTO DE ERROS ✅**
**Padrão:** 
- ✅ Retry em erros transitórios
- ✅ Não deslogar imediatamente em erro de rede
- ✅ Mensagens claras ao usuário

**Status atual:** ✅ **IMPLEMENTADO** - Retry com 3 tentativas, delay de 2s

---

### **7. ISOLAMENTO MULTI-TENANT ✅**
**Padrão:** Cada requisição deve validar:
- ✅ Usuário autenticado
- ✅ Tenant (organization_id) válido
- ✅ Permissões do usuário

**Status atual:** ✅ **IMPLEMENTADO** - `tenancyMiddleware` valida sessão e monta contexto

---

## 🔍 PROBLEMA IDENTIFICADO: LOGIN NÃO PERSISTE

### **Causa Raiz:**

1. **Validação apenas no mount:**
   ```typescript
   useEffect(() => {
     loadUser(); // ✅ Roda apenas UMA vez quando componente monta
   }, []); // ❌ Array vazio = só no mount
   ```

2. **Sem validação periódica:**
   - Se usuário ficar inativo, sessão pode expirar
   - Não há verificação automática antes de expirar

3. **Token no localStorage:**
   - Pode ser limpo pelo navegador
   - Não persiste entre sessões se navegador limpar dados

4. **Sem refresh automático:**
   - Quando sessão está próxima de expirar, não renova automaticamente

---

## ✅ SOLUÇÃO PROPOSTA (Baseada em Boas Práticas)

### **1. Validação Periódica (CRÍTICO)**

```typescript
useEffect(() => {
  const loadUser = async () => { /* ... */ };
  
  // ✅ Validar imediatamente
  loadUser();
  
  // ✅ Validar periodicamente (a cada 5 minutos)
  const interval = setInterval(() => {
    loadUser();
  }, 5 * 60 * 1000); // 5 minutos
  
  return () => clearInterval(interval);
}, []);
```

### **2. Refresh Automático Antes de Expirar**

```typescript
// Verificar se sessão está próxima de expirar (< 1 hora)
const checkAndRefreshSession = async () => {
  const token = localStorage.getItem('rendizy-token');
  if (!token) return;
  
  const response = await fetch('/auth/me', {
    headers: { 'X-Auth-Token': token }
  });
  
  if (response.ok) {
    const data = await response.json();
    const expiresAt = new Date(data.session.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - Date.now();
    
    // Se falta menos de 1 hora, renovar automaticamente
    if (timeUntilExpiry < 60 * 60 * 1000) {
      // A renovação acontece automaticamente no backend ao chamar /auth/me
      console.log('✅ Sessão renovada automaticamente');
    }
  }
};

// Verificar a cada 30 minutos
setInterval(checkAndRefreshSession, 30 * 60 * 1000);
```

### **3. Validação Antes de Operações Críticas**

```typescript
// Interceptor de requisições
const validateSessionBeforeRequest = async () => {
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    // Redirecionar para login
    return false;
  }
  
  // Validar sessão rapidamente
  const response = await fetch('/auth/me', {
    headers: { 'X-Auth-Token': token }
  });
  
  if (!response.ok) {
    // Sessão inválida - limpar e redirecionar
    localStorage.removeItem('rendizy-token');
    window.location.href = '/login';
    return false;
  }
  
  return true;
};
```

### **4. Persistência Melhorada (Futuro)**

**Opção A: HttpOnly Cookies (Recomendado)**
- ✅ Mais seguro (não acessível via JavaScript)
- ✅ Enviado automaticamente pelo navegador
- ⚠️ Requer mudanças no CORS (já tentamos e quebrou)

**Opção B: sessionStorage + Validação Periódica (Atual)**
- ✅ Funciona com CORS atual
- ⚠️ Menos seguro que cookies
- ✅ Pode melhorar com validação periódica

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Correções Imediatas (CRÍTICO)**
- [ ] Adicionar validação periódica (a cada 5 minutos)
- [ ] Adicionar refresh automático antes de expirar
- [ ] Melhorar tratamento de erros de rede

### **Fase 2: Melhorias (Curto Prazo)**
- [ ] Validação antes de operações críticas
- [ ] Notificação ao usuário quando sessão está próxima de expirar
- [ ] Logout automático apenas após múltiplas falhas

### **Fase 3: Segurança (Médio Prazo)**
- [ ] Migrar para HttpOnly cookies (quando CORS permitir)
- [ ] Implementar refresh tokens
- [ ] Adicionar rate limiting

---

## 🎯 RECOMENDAÇÃO IMEDIATA

**Implementar AGORA:**
1. ✅ Validação periódica (a cada 5 minutos)
2. ✅ Refresh automático (quando falta < 1 hora)
3. ✅ Melhor tratamento de erros de rede

**Isso deve resolver o problema de persistência do login.**

---

**Última atualização:** 2025-11-23  
**Status:** 📋 Documentação de boas práticas + Diagnóstico do problema

