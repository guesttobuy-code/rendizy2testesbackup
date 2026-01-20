# 📋 ANÁLISE: Passo 1 - Tenancy Middleware (ChatGPT)

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Passo:** 1 de 5

---

## 🎯 CÓDIGO ANALISADO (ChatGPT)

```typescript
// supabase/functions/rendizy-server/utils/tenancy.ts

import { Context, Next } from 'hono';
import { getSessionFromToken } from './utils-session'; // já existe algo similar
import { getSupabaseClient } from './kv_store.tsx';

export interface TenantContext {
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  organizationId?: string;          // para integração futura com organizations
  imobiliariaId?: string;           // já usado hoje
}

export async function tenancyMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : undefined;

  if (!token) {
    return c.json({ success: false, error: 'Token ausente' }, 401);
  }

  // 1. Buscar sessão no KV Store
  const session = await getSessionFromToken(token);

  if (!session) {
    return c.json({ success: false, error: 'Sessão inválida ou expirada' }, 401);
  }

  // 2. Montar contexto multi-tenant
  const tenant: TenantContext = {
    userId: session.userId,
    username: session.username,
    type: session.type,
    imobiliariaId: session.imobiliariaId,
  };

  // 3. (Opcional) Buscar organization_id no Postgres, se quiser unificar
  // const client = getSupabaseClient();
  // const { data } = await client
  //   .from('users')
  //   .select('organization_id')
  //   .eq('id', session.userId)
  //   .maybeSingle();

  // if (data?.organization_id) {
  //   tenant.organizationId = data.organization_id;
  // }

  c.set('tenant', tenant);
  await next();
}

// Helper pra usar dentro das rotas
export function getTenant(c: Context): TenantContext {
  const tenant = c.get('tenant') as TenantContext | undefined;

  if (!tenant) {
    throw new Error('TenantContext não encontrado. tenancyMiddleware não foi aplicado.');
  }

  return tenant;
}
```

---

## 📊 COMPARAÇÃO: ChatGPT vs Projeto Atual

| Aspecto | ChatGPT | Projeto Atual | Status |
|---------|---------|---------------|--------|
| **Middleware** | ✅ `tenancyMiddleware` | ❌ Não existe | ⚠️ Precisa criar |
| **Função Helper** | ✅ `getSessionFromToken()` | ❌ Não existe | ⚠️ Precisa criar |
| **Contexto Hono** | ✅ `c.set('tenant', tenant)` | ❌ Não usa | ⚠️ Precisa implementar |
| **Interface Session** | ✅ `TenantContext` | ✅ `Session` (similar) | ✅ Já existe |
| **Verificação Token** | ✅ No middleware | ⚠️ Manual em cada rota | ⚠️ Precisa centralizar |
| **Pasta utils/** | ✅ `utils/tenancy.ts` | ❌ `utils-*.ts` (raiz) | ⚠️ Precisa adaptar |

---

## 🔍 ANÁLISE DETALHADA

### 1. **Interface TenantContext vs Session Atual**

#### ChatGPT (TenantContext):
```typescript
export interface TenantContext {
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  organizationId?: string;          // NOVO - para integração futura
  imobiliariaId?: string;           // Já existe
}
```

#### Projeto Atual (Session):
```typescript
interface Session {
  id: string;
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  imobiliariaId?: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}
```

**Diferenças:**
- ✅ `TenantContext` é uma versão simplificada de `Session`
- ✅ Adiciona `organizationId?` para integração futura
- ⚠️ Remove campos de controle (`id`, `createdAt`, `expiresAt`, `lastActivity`)
- ✅ Foco apenas no que é necessário para multi-tenancy

---

### 2. **Função getSessionFromToken()**

#### ChatGPT:
```typescript
const session = await getSessionFromToken(token);
```

#### Projeto Atual:
```typescript
// Em routes-auth.ts, linha 327:
const session = await kv.get(`session:${token}`);
```

**Análise:**
- ⚠️ ChatGPT sugere criar função helper `getSessionFromToken()`
- ✅ Projeto atual faz `kv.get()` diretamente
- ✅ Benefício: Centraliza lógica de verificação de sessão
- ✅ Benefício: Facilita validação de expiração

**Recomendação:**
- ✅ Criar função `getSessionFromToken()` em `utils-session.ts`
- ✅ Validar expiração dentro da função
- ✅ Retornar `null` se sessão expirada ou inválida

---

### 3. **Middleware tenancyMiddleware**

#### ChatGPT:
```typescript
export async function tenancyMiddleware(c: Context, next: Next) {
  // 1. Extrair token
  // 2. Buscar sessão
  // 3. Montar contexto
  // 4. Salvar em c.set('tenant', tenant)
  // 5. Continuar para próxima rota
}
```

#### Projeto Atual:
```typescript
// Cada rota verifica token manualmente:
app.get('/route', async (c) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return c.json({ success: false, error: 'Token ausente' }, 401);
  }
  const session = await kv.get(`session:${token}`);
  if (!session) {
    return c.json({ success: false, error: 'Sessão inválida' }, 401);
  }
  // ... resto da rota
});
```

**Análise:**
- ⚠️ Projeto atual repete código em cada rota
- ✅ ChatGPT sugere middleware para centralizar
- ✅ Benefício: Código mais limpo e DRY
- ✅ Benefício: Contexto disponível via `getTenant(c)`

**Recomendação:**
- ✅ Criar middleware `tenancyMiddleware`
- ✅ Aplicar em rotas que precisam de autenticação
- ✅ Usar `c.set('tenant', tenant)` para passar contexto

---

### 4. **Helper getTenant()**

#### ChatGPT:
```typescript
export function getTenant(c: Context): TenantContext {
  const tenant = c.get('tenant') as TenantContext | undefined;
  if (!tenant) {
    throw new Error('TenantContext não encontrado...');
  }
  return tenant;
}
```

#### Projeto Atual:
```typescript
// Cada rota acessa session diretamente:
const session = await kv.get(`session:${token}`);
const userId = session.userId;
const imobiliariaId = session.imobiliariaId;
```

**Análise:**
- ✅ ChatGPT sugere helper `getTenant()` para acessar contexto
- ✅ Projeto atual acessa `session` diretamente
- ✅ Benefício: Código mais limpo nas rotas
- ✅ Benefício: Validação centralizada (erro se middleware não aplicado)

**Recomendação:**
- ✅ Criar função `getTenant()` em `utils-tenancy.ts`
- ✅ Usar em todas as rotas que precisam de contexto do tenant
- ✅ Substituir acesso direto a `session` por `getTenant(c)`

---

### 5. **Busca organizationId do Postgres (Opcional)**

#### ChatGPT:
```typescript
// 3. (Opcional) Buscar organization_id no Postgres
const client = getSupabaseClient();
const { data } = await client
  .from('users')
  .select('organization_id')
  .eq('id', session.userId)
  .maybeSingle();

if (data?.organization_id) {
  tenant.organizationId = data.organization_id;
}
```

**Análise:**
- ✅ ChatGPT sugere buscar `organization_id` do Postgres
- ⚠️ Código está comentado (opcional)
- ✅ Benefício: Integração futura com tabela `organizations`
- ⚠️ Pode adicionar latência (query extra ao banco)

**Recomendação:**
- ✅ Implementar opcionalmente (comentado inicialmente)
- ✅ Usar apenas se necessário para a rota específica
- ✅ Considerar cache se performance for crítica

---

## ✅ ADAPTAÇÕES NECESSÁRIAS

### 1. **Criar Pasta `utils/` (Opcional)**

**Opção A:** Criar pasta `utils/`
- ✅ Organização melhor
- ✅ Separação de concerns

**Opção B:** Manter na raiz (`utils-*.ts`)
- ✅ Mantém padrão atual
- ✅ Mais simples

**Recomendação:** Opção B (manter padrão atual)

---

### 2. **Criar `utils-session.ts`**

**Função necessária:**
```typescript
export async function getSessionFromToken(token: string): Promise<Session | null> {
  if (!token) return null;
  
  const session = await kv.get(`session:${token}`);
  if (!session) return null;
  
  // Validar expiração
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  
  if (now > expiresAt) {
    await kv.del(`session:${token}`);
    return null;
  }
  
  // Atualizar lastActivity
  session.lastActivity = now.toISOString();
  await kv.set(`session:${token}`, session);
  
  return session;
}
```

---

### 3. **Criar `utils-tenancy.ts`**

**Arquivo:** `supabase/functions/rendizy-server/utils-tenancy.ts`

**Conteúdo:**
```typescript
import { Context, Next } from 'npm:hono';
import { getSessionFromToken } from './utils-session';
import { getSupabaseClient } from './kv_store.tsx';

export interface TenantContext {
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  organizationId?: string;          // para integração futura com organizations
  imobiliariaId?: string;           // já usado hoje
}

export async function tenancyMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : undefined;

  if (!token) {
    return c.json({ success: false, error: 'Token ausente' }, 401);
  }

  // 1. Buscar sessão no KV Store
  const session = await getSessionFromToken(token);

  if (!session) {
    return c.json({ success: false, error: 'Sessão inválida ou expirada' }, 401);
  }

  // 2. Montar contexto multi-tenant
  const tenant: TenantContext = {
    userId: session.userId,
    username: session.username,
    type: session.type,
    imobiliariaId: session.imobiliariaId,
  };

  // 3. (Opcional) Buscar organization_id no Postgres, se quiser unificar
  // const client = getSupabaseClient();
  // const { data } = await client
  //   .from('users')
  //   .select('organization_id')
  //   .eq('id', session.userId)
  //   .maybeSingle();

  // if (data?.organization_id) {
  //   tenant.organizationId = data.organization_id;
  // }

  c.set('tenant', tenant);
  await next();
}

// Helper pra usar dentro das rotas
export function getTenant(c: Context): TenantContext {
  const tenant = c.get('tenant') as TenantContext | undefined;

  if (!tenant) {
    throw new Error('TenantContext não encontrado. tenancyMiddleware não foi aplicado.');
  }

  return tenant;
}
```

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### ✅ Fase 1: Criar Funções Helper (CONCLUÍDA)
- [x] Criar `utils-session.ts` com `getSessionFromToken()` ✅
- [x] Criar função `removeSession()` também ✅
- [x] Testar função isoladamente ✅

### ✅ Fase 2: Criar Middleware (CONCLUÍDA)
- [x] Criar `utils-tenancy.ts` com `tenancyMiddleware` e `getTenant()` ✅
- [x] Adicionar helpers auxiliares (`isSuperAdmin`, `isImobiliaria`, `getImobiliariaId`) ✅
- [x] Implementar suporte para `organizationId` (opcional, comentado) ✅

### ✅ Fase 3: Integrar em Rotas Existentes (CONCLUÍDA)
- [x] Atualizar `/auth/me` para usar `getSessionFromToken()` ✅
- [x] Atualizar `/auth/logout` para usar `removeSession()` ✅
- [x] Testar funcionalidade ✅

### ⏳ Fase 4: Migrar Rotas Gradualmente (PRÓXIMO PASSO)
- [ ] Aplicar `tenancyMiddleware` em uma rota real (ex: `/properties`)
- [ ] Substituir código manual por `getTenant(c)`
- [ ] Migrar rotas uma a uma
- [ ] Testar cada migração
- [ ] Remover código antigo após validação

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Compatibilidade:**
   - ⚠️ Algumas rotas podem não precisar de autenticação
   - ✅ Usar middleware apenas em rotas protegidas

2. **Performance:**
   - ⚠️ Buscar `organizationId` do Postgres adiciona latência
   - ✅ Deixar opcional (comentado) inicialmente

3. **Erros:**
   - ✅ Middleware retorna erro 401 se token inválido
   - ✅ `getTenant()` lança erro se middleware não aplicado

4. **Migração:**
   - ⚠️ Migrar gradualmente para não quebrar sistema
   - ✅ Testar cada rota após migração

---

## 📝 PRÓXIMOS PASSOS

1. ✅ **Passo 1:** Criar `utils-session.ts` e `utils-tenancy.ts` (este documento)
2. ⏳ **Passo 2:** (Aguardar código do ChatGPT)
3. ⏳ **Passo 3:** (Aguardar código do ChatGPT)
4. ⏳ **Passo 4:** (Aguardar código do ChatGPT)
5. ⏳ **Passo 5:** (Aguardar código do ChatGPT)

---

## ✅ CONCLUSÃO

O Passo 1 do ChatGPT é **excelente** para:
- ✅ Centralizar lógica de autenticação
- ✅ Reduzir código duplicado
- ✅ Facilitar manutenção
- ✅ Preparar para integração com `organizations`

**Recomendação:** ✅ **Implementar**, mas adaptando para o padrão atual do projeto (manter `utils-*.ts` na raiz).

---

**Status:** ✅ Análise completa, pronto para implementação  
**Última atualização:** 17/11/2025

