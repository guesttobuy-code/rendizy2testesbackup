# 📋 EXEMPLO: Como Usar o Tenancy Middleware

**Versão:** 1.0.103.400  
**Data:** 17/11/2025

---

## 🎯 ANTES (Código Manual)

### ❌ Antes - Verificação manual em cada rota:

```typescript
app.get('/properties', async (c) => {
  try {
    // Verificação manual do token
    const token = c.req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
      return c.json({ success: false, error: 'Token ausente' }, 401);
    }

    // Busca manual da sessão
    const session = await kv.get(`session:${token}`);
    
    if (!session) {
      return c.json({ success: false, error: 'Sessão inválida' }, 401);
    }

    // Validação manual de expiração
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    if (now > expiresAt) {
      await kv.del(`session:${token}`);
      return c.json({ success: false, error: 'Sessão expirada' }, 401);
    }

    // Atualizar lastActivity manualmente
    session.lastActivity = now.toISOString();
    await kv.set(`session:${token}`, session);

    // Acessar userId e imobiliariaId diretamente
    const userId = session.userId;
    const imobiliariaId = session.imobiliariaId;

    // ... resto da lógica da rota
    return c.json({ success: true, data: [] });
  } catch (error) {
    return c.json({ success: false, error: 'Erro ao processar' }, 500);
  }
});
```

**Problemas:**
- ❌ Código repetido em cada rota
- ❌ Difícil de manter
- ❌ Fácil de esquecer validações

---

## ✅ DEPOIS (Com Middleware)

### ✅ Depois - Usando tenancyMiddleware:

```typescript
import { tenancyMiddleware, getTenant, getImobiliariaId } from '../utils-tenancy.ts';

app.get('/properties', tenancyMiddleware, async (c) => {
  try {
    // ✅ Contexto do tenant já disponível via middleware
    const tenant = getTenant(c);
    
    // ✅ Acessar informações do tenant facilmente
    const userId = tenant.userId;
    const imobiliariaId = tenant.imobiliariaId;
    const username = tenant.username;
    const type = tenant.type;

    // ✅ Helpers auxiliares disponíveis
    const isAdmin = tenant.type === 'superadmin';
    // ou usar: import { isSuperAdmin } from '../utils-tenancy.ts';
    
    // ... resto da lógica da rota (código limpo!)
    return c.json({ success: true, data: [] });
  } catch (error) {
    return c.json({ success: false, error: 'Erro ao processar' }, 500);
  }
});
```

**Benefícios:**
- ✅ Código limpo e DRY
- ✅ Validação centralizada
- ✅ Fácil de usar

---

## 📚 EXEMPLOS DE USO

### 1. Rota Simples com Tenant

```typescript
import { tenancyMiddleware, getTenant } from '../utils-tenancy.ts';

app.get('/me/properties', tenancyMiddleware, async (c) => {
  const tenant = getTenant(c);
  
  // Buscar propriedades do tenant
  const properties = await getPropertiesByTenant(tenant.userId);
  
  return c.json({ success: true, data: properties });
});
```

### 2. Rota com Verificação de Tipo

```typescript
import { tenancyMiddleware, getTenant, isSuperAdmin } from '../utils-tenancy.ts';

app.get('/all-properties', tenancyMiddleware, async (c) => {
  const tenant = getTenant(c);
  
  // Superadmin vê todas, imobiliária só as suas
  if (isSuperAdmin(c)) {
    const allProperties = await getAllProperties();
    return c.json({ success: true, data: allProperties });
  }
  
  // Imobiliária vê apenas as suas
  const properties = await getPropertiesByImobiliaria(tenant.imobiliariaId);
  return c.json({ success: true, data: properties });
});
```

### 3. Rota com ImobiliariaId

```typescript
import { tenancyMiddleware, getImobiliariaId } from '../utils-tenancy.ts';

app.post('/reservations', tenancyMiddleware, async (c) => {
  const imobiliariaId = getImobiliariaId(c);
  
  if (!imobiliariaId) {
    return c.json({ 
      success: false, 
      error: 'Apenas imobiliárias podem criar reservas' 
    }, 403);
  }
  
  const body = await c.req.json();
  const reservation = await createReservation({
    ...body,
    imobiliariaId
  });
  
  return c.json({ success: true, data: reservation });
});
```

### 4. Rota com organizationId (Futuro)

```typescript
import { tenancyMiddleware, getTenant } from '../utils-tenancy.ts';

app.get('/organization/settings', tenancyMiddleware, async (c) => {
  const tenant = getTenant(c);
  
  // organizationId será preenchido quando habilitarmos busca do Postgres
  if (!tenant.organizationId) {
    return c.json({ 
      success: false, 
      error: 'organizationId não disponível' 
    }, 400);
  }
  
  const settings = await getOrganizationSettings(tenant.organizationId);
  return c.json({ success: true, data: settings });
});
```

---

## 🔄 MIGRAÇÃO GRADUAL

### Passo 1: Atualizar rota simples (teste)
```typescript
// routes-auth.ts - Rota /me já atualizada
app.get('/me', async (c) => {
  const { getSessionFromToken } = await import('./utils-session.ts');
  // ... usa getSessionFromToken ao invés de código manual
});
```

### Passo 2: Aplicar middleware em nova rota
```typescript
// routes-properties.ts - Exemplo
app.get('/properties', tenancyMiddleware, async (c) => {
  const tenant = getTenant(c);
  // ... código limpo usando tenant
});
```

### Passo 3: Migrar rota por rota
- ✅ Testar cada rota após migração
- ✅ Remover código manual após validação
- ✅ Documentar mudanças

---

## ⚠️ ROTAS PÚBLICAS

### Rotas que NÃO devem usar middleware:

```typescript
// Health check (sem autenticação)
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Login (sem autenticação)
app.post('/auth/login', async (c) => {
  // ... não usa tenancyMiddleware
});

// Rotas públicas
app.get('/public/*', async (c) => {
  // ... não usa tenancyMiddleware
});
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

- [ ] Criar `utils-session.ts` ✅ Feito
- [ ] Criar `utils-tenancy.ts` ✅ Feito
- [ ] Atualizar `/auth/me` para usar `getSessionFromToken()` ✅ Feito
- [ ] Atualizar `/auth/logout` para usar `removeSession()` ✅ Feito
- [ ] Testar `/auth/me` com middleware
- [ ] Aplicar middleware em uma rota de teste
- [ ] Migrar rotas gradualmente
- [ ] Documentar uso do middleware

---

**Status:** ✅ Implementado, pronto para testes  
**Próximo passo:** Aplicar middleware em rotas reais para validar funcionamento

