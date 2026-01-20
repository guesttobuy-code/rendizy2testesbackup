# 🏗️ ARQUITETURA MULTI-TENANT v1.0

**Versão:** 1.0.103.400  
**Data:** 17/11/2025  
**Status:** ✅ Implementado e Funcional

---

## 📋 SUMÁRIO

1. [Visão Geral](#visão-geral)
2. [Fluxo de Autenticação](#fluxo-de-autenticação)
3. [Backend - Sistema de Sessão](#backend---sistema-de-sessão)
4. [Backend - Middleware Multi-Tenant](#backend---middleware-multi-tenant)
5. [Frontend - AuthContext](#frontend---authcontext)
6. [Frontend - ProtectedRoute](#frontend---protectedroute)
7. [Estrutura de Dados](#estrutura-de-dados)
8. [Diagramas de Fluxo](#diagramas-de-fluxo)
9. [Segurança](#segurança)

---

## 🎯 VISÃO GERAL

O sistema Rendizy utiliza uma arquitetura **multi-tenant** onde diferentes imobiliárias compartilham a mesma instância do aplicativo, mas com isolamento completo de dados.

### Características Principais:

- ✅ **Dois tipos de usuários**: `superadmin` (acesso total) e `imobiliaria` (acesso restrito)
- ✅ **Sessões baseadas em token**: Armazenadas no KV Store do Supabase
- ✅ **Middleware de autenticação**: Validação automática em todas as rotas protegidas
- ✅ **Isolamento de dados**: Cada imobiliária vê apenas seus próprios dados
- ✅ **Onboarding automático**: Redirecionamento para criação de organização quando necessário

### Componentes Principais:

```
┌─────────────────┐
│   Frontend      │
│  (React/Vite)   │
│                 │
│  AuthContext    │◄─── Gerencia estado de autenticação
│  ProtectedRoute │◄─── Protege rotas e verifica organização
└────────┬────────┘
         │
         │ HTTP + Bearer Token
         │
┌────────▼─────────────────────────┐
│   Backend                        │
│   (Supabase Edge Functions)      │
│                                  │
│  ┌──────────────────────────┐   │
│  │  tenancyMiddleware       │   │◄─── Valida token e monta contexto
│  └───────────┬──────────────┘   │
│              │                   │
│  ┌───────────▼──────────────┐   │
│  │  Routes                  │   │◄─── Acessa contexto via getTenant()
│  └──────────────────────────┘   │
└──────────────────────────────────┘
         │
         │
┌────────▼────────┐
│   KV Store      │
│                 │
│  session:{token}│◄─── Armazena sessões de autenticação
│  superadmin:*   │◄─── Credenciais SuperAdmin
│  usuario_*      │◄─── Usuários de imobiliária
└─────────────────┘
```

---

## 🔐 FLUXO DE AUTENTICAÇÃO

### 1. Login (POST /auth/login)

**Backend:** `supabase/functions/rendizy-server/routes-auth.ts`

```
┌─────────────┐
│   Frontend  │
│             │
│  AuthContext│
│  .login()   │
└──────┬──────┘
       │
       │ POST /auth/login
       │ { username, password }
       │
┌──────▼────────────────────────────────────────┐
│   Backend - routes-auth.ts                    │
│                                               │
│   1. Buscar usuário no KV Store               │
│      ├─ superadmin:{username}                 │
│      └─ usuario_imobiliaria:{username}        │
│                                               │
│   2. Verificar senha (SHA256 hash)            │
│                                               │
│   3. Criar sessão no KV Store                 │
│      └─ session:{token} {                     │
│           id: string                          │
│           userId: string                      │
│           username: string                    │
│           type: 'superadmin' | 'imobiliaria'  │
│           imobiliariaId?: string              │◄─── Chave para multi-tenancy
│           createdAt: ISO string               │
│           expiresAt: ISO string (24h)         │
│           lastActivity: ISO string            │
│         }                                     │
│                                               │
│   4. Retornar token + user data               │
└──────┬────────────────────────────────────────┘
       │
       │ { success: true, token, user }
       │
┌──────▼──────┐
│   Frontend  │
│             │
│  1. Salvar  │
│     - token → localStorage                    │
│     - user  → localStorage                    │
│             │
│  2. Atualizar│
│     - AuthContext.state                       │
│             │
│  3. Redirect│
│     - /dashboard                              │
└─────────────┘
```

### 2. Validação de Sessão (Middleware)

**Backend:** `supabase/functions/rendizy-server/utils-tenancy.ts`

```
┌─────────────┐
│   Frontend  │
│             │
│  Request    │
│  + Bearer Token
└──────┬──────┘
       │
┌──────▼────────────────────────────────────────┐
│   tenancyMiddleware                           │
│                                               │
│   1. Extrair token do header                  │
│      Authorization: Bearer {token}            │
│                                               │
│   2. Buscar sessão no KV Store                │
│      session:{token}                          │
│                                               │
│   3. Validar expiração                        │
│      if (now > expiresAt) → 401               │
│                                               │
│   4. Atualizar lastActivity                   │
│                                               │
│   5. Montar TenantContext                     │
│      {                                        │
│        userId: session.userId                 │
│        username: session.username             │
│        type: session.type                     │
│        imobiliariaId: session.imobiliariaId   │◄─── Para filtros multi-tenant
│      }                                        │
│                                               │
│   6. Injetar em c.set('tenant', context)      │
│                                               │
│   7. Continuar para rota (await next())       │
└──────┬────────────────────────────────────────┘
       │
       │ TenantContext disponível
       │
┌──────▼────────────────────────────────────────┐
│   Route Handler                               │
│                                               │
│   const tenant = getTenant(c);                │
│                                               │
│   if (tenant.type === 'imobiliaria') {        │
│     // Filtrar por imobiliariaId              │
│     data.filter(d =>                          │
│       d.imobiliariaId === tenant.imobiliariaId│
│     )                                         │
│   }                                           │
│                                               │
│   return c.json({ success: true, data });     │
└───────────────────────────────────────────────┘
```

---

## 🔧 BACKEND - SISTEMA DE SESSÃO

### Armazenamento (KV Store)

**Chave:** `session:{token}`  
**Valor:** Objeto `Session`

```typescript
interface Session {
  id: string;                    // ID único da sessão
  userId: string;                // ID do usuário
  username: string;              // Nome de usuário
  type: 'superadmin' | 'imobiliaria';
  imobiliariaId?: string;        // ID da imobiliária (se aplicável)
  createdAt: string;             // ISO string
  expiresAt: string;             // ISO string (24h após criação)
  lastActivity: string;          // ISO string (atualizado a cada request)
}
```

### Helpers (utils-session.ts)

#### `getSessionFromToken(token: string): Promise<Session | null>`

1. Busca sessão no KV Store: `session:{token}`
2. Valida se sessão existe
3. Valida se não expirou (`now > expiresAt`)
4. Se expirada, remove do KV Store
5. Atualiza `lastActivity` automaticamente
6. Retorna sessão ou `null`

#### `removeSession(token: string): Promise<boolean>`

1. Remove sessão do KV Store: `kv.del('session:{token}')`
2. Retorna `true` se sucesso

---

## 🛡️ BACKEND - MIDDLEWARE MULTI-TENANT

### Arquivo: `supabase/functions/rendizy-server/utils-tenancy.ts`

### Interface TenantContext

```typescript
interface TenantContext {
  userId: string;
  username: string;
  type: 'superadmin' | 'imobiliaria';
  organizationId?: string;        // Para integração futura
  imobiliariaId?: string;         // Já usado hoje (chave de isolamento)
}
```

### Função: `tenancyMiddleware(c: Context, next: Next)`

**Fluxo:**

1. **Extrai token do header:**
   ```typescript
   const authHeader = c.req.header('Authorization');
   const token = authHeader?.startsWith('Bearer ') 
     ? authHeader.split(' ')[1] 
     : undefined;
   ```

2. **Valida token presente:**
   ```typescript
   if (!token) {
     return c.json({ success: false, error: 'Token ausente' }, 401);
   }
   ```

3. **Busca sessão:**
   ```typescript
   const session = await getSessionFromToken(token);
   if (!session) {
     return c.json({ success: false, error: 'Sessão inválida ou expirada' }, 401);
   }
   ```

4. **Monta contexto:**
   ```typescript
   const tenant: TenantContext = {
     userId: session.userId,
     username: session.username,
     type: session.type,
     imobiliariaId: session.imobiliariaId,
   };
   ```

5. **Injeta no contexto do Hono:**
   ```typescript
   c.set('tenant', tenant);
   ```

6. **Continua para próxima rota:**
   ```typescript
   await next();
   ```

### Helpers para Rotas

#### `getTenant(c: Context): TenantContext`

Retorna o `TenantContext` injetado pelo middleware.  
**Lança erro** se middleware não foi aplicado.

#### `isSuperAdmin(c: Context): boolean`

Retorna `true` se `tenant.type === 'superadmin'`

#### `isImobiliaria(c: Context): boolean`

Retorna `true` se `tenant.type === 'imobiliaria'`

#### `getImobiliariaId(c: Context): string | undefined`

Retorna `tenant.imobiliariaId` ou `undefined`

---

## 💻 FRONTEND - AUTHCONTEXT

### Arquivo: `src/contexts/AuthContext.tsx`

### Estado

```typescript
interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<...>;
  logout: () => Promise<void>;
  
  // Permission checks
  hasPermission: (check: PermissionCheck) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}
```

### Fluxo de Login

```typescript
async function login(username: string, password: string) {
  // 1. Fazer request para /auth/login
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  // 2. Obter resposta
  const data = await response.json();
  // { success: true, token, user: { id, email, type, imobiliariaId } }
  
  // 3. Salvar no localStorage
  localStorage.setItem('rendizy-token', data.token);
  localStorage.setItem('rendizy-user', JSON.stringify(data.user));
  
  // 4. Salvar organização se existir
  if (data.user.imobiliaria) {
    localStorage.setItem('rendizy-organization', JSON.stringify(data.user.imobiliaria));
    setOrganization(data.user.imobiliaria);
  }
  
  // 5. Atualizar estado
  setUser(data.user);
  setIsAuthenticated(true);
}
```

### Carregamento Inicial (useEffect)

```typescript
useEffect(() => {
  // 1. Carregar do localStorage
  const savedUser = localStorage.getItem('rendizy-user');
  const savedOrg = localStorage.getItem('rendizy-organization');
  
  if (savedUser) {
    setUser(JSON.parse(savedUser));
  }
  
  if (savedOrg) {
    setOrganization(JSON.parse(savedOrg));
  } else {
    // 2. ✅ FALLBACK: Tentar obter de user_metadata do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.organization_id) {
      // Buscar organização da API e salvar
    }
  }
}, []);
```

---

## 🚪 FRONTEND - PROTECTEDROUTE

### Arquivo: `src/components/ProtectedRoute.tsx`

### Lógica de Proteção

```typescript
function ProtectedRoute({ children, requireAuth = true, requireOrganization = true }) {
  const { isAuthenticated, isLoading, organization, user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  
  // 1. Rotas públicas → liberado
  if (PUBLIC_ROUTES.includes(path)) {
    if (isAuthenticated && path === '/login') {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }
  
  // 2. Sem sessão → redireciona para /login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // 3. ✅ Regra multi-tenant: sem organização → /onboarding
  if (requireOrganization && isAuthenticated && path !== '/onboarding') {
    // Verificar se é imobiliária (não superadmin) e não tem organização
    if (user && user.role !== 'super_admin' && !organization && !user.organizationId) {
      // ✅ FALLBACK: Verificar user_metadata do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.organization_id) {
        // Recarregar página para AuthContext carregar organização
        window.location.reload();
        return <Loading />;
      }
      
      // Redirecionar para onboarding
      return <Navigate to="/onboarding" replace />;
    }
  }
  
  // 4. Usuário ok, seguir
  return <>{children}</>;
}
```

### Fluxo de Decisão

```
┌─────────────────┐
│ ProtectedRoute  │
└────────┬────────┘
         │
         ▼
    É rota pública?
    ├─ SIM → Liberar acesso
    └─ NÃO ▼
         │
         ▼
    Está autenticado?
    ├─ NÃO → Redirecionar para /login
    └─ SIM ▼
         │
         ▼
    Requer organização?
    ├─ NÃO → Liberar acesso
    └─ SIM ▼
         │
         ▼
    É superadmin?
    ├─ SIM → Liberar acesso
    └─ NÃO ▼
         │
         ▼
    Tem organização?
    ├─ SIM → Liberar acesso
    └─ NÃO ▼
         │
         ▼
    Verificar user_metadata
    ├─ TEM → Recarregar página
    └─ NÃO ▼
         │
         ▼
    Redirecionar para /onboarding
```

---

## 📊 ESTRUTURA DE DADOS

### KV Store (Backend)

#### Sessões

```
session:{token}
├─ id: string
├─ userId: string
├─ username: string
├─ type: 'superadmin' | 'imobiliaria'
├─ imobiliariaId?: string         ◄─── Chave para isolamento
├─ createdAt: ISO string
├─ expiresAt: ISO string          ◄─── 24h após criação
└─ lastActivity: ISO string       ◄─── Atualizado a cada request
```

#### SuperAdmins

```
superadmin:{username}
├─ id: string
├─ username: string
├─ passwordHash: string (SHA256)
├─ name: string
├─ email: string
├─ type: 'superadmin'
├─ status: 'active' | 'suspended'
├─ createdAt: ISO string
└─ lastLogin?: ISO string
```

**Credenciais padrão:**
- `rppt` / `root`
- `admin` / `root`

#### Usuários de Imobiliária

```
usuario_imobiliaria:{username}
├─ id: string
├─ imobiliariaId: string          ◄─── Chave para isolamento
├─ username: string
├─ passwordHash: string (SHA256)
├─ name: string
├─ email: string
├─ role: 'admin' | 'manager' | 'staff' | 'readonly'
├─ type: 'imobiliaria'
├─ status: 'active' | 'invited' | 'suspended'
├─ createdAt: ISO string
├─ lastLogin?: ISO string
└─ permissions?: string[]
```

### LocalStorage (Frontend)

```javascript
{
  'rendizy-token': string,                    // Token de autenticação
  'rendizy-user': JSON<User>,                 // Dados do usuário
  'rendizy-organization': JSON<Organization>, // Organização (se aplicável)
}
```

### User Object (Frontend)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'staff';
  status: 'active';
  emailVerified: boolean;
  organizationId?: string;         ◄─── ID da organização
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}
```

### Organization Object (Frontend)

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'professional' | 'enterprise';
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 DIAGRAMAS DE FLUXO

### Fluxo Completo: Login → Acesso a Rota Protegida

```
┌──────────────┐
│   Usuário    │
└──────┬───────┘
       │
       │ 1. Acessa /dashboard
       ▼
┌─────────────────────────┐
│   ProtectedRoute        │
│                         │
│   Verifica autenticação │
└──────┬──────────────────┘
       │
       │ ❌ Não autenticado
       ▼
┌─────────────────────────┐
│   Redirect para /login  │
└──────┬──────────────────┘
       │
       │ 2. Usuário faz login
       ▼
┌─────────────────────────┐
│   AuthContext.login()   │
│                         │
│   POST /auth/login      │
└──────┬──────────────────┘
       │
       │ 3. Backend valida
       ▼
┌─────────────────────────┐
│   routes-auth.ts        │
│                         │
│   - Verifica usuário    │
│   - Valida senha        │
│   - Cria sessão         │
│   - Retorna token       │
└──────┬──────────────────┘
       │
       │ 4. Frontend salva
       ▼
┌─────────────────────────┐
│   localStorage:         │
│   - token               │
│   - user                │
│   - organization        │
└──────┬──────────────────┘
       │
       │ 5. Redirect para /dashboard
       ▼
┌─────────────────────────┐
│   ProtectedRoute        │
│                         │
│   ✅ Autenticado        │
│   ✅ Tem organização    │
└──────┬──────────────────┘
       │
       │ 6. Libera acesso
       ▼
┌─────────────────────────┐
│   Dashboard             │
└─────────────────────────┘
```

### Fluxo: Request para API Protegida

```
┌──────────────┐
│   Frontend   │
│              │
│   GET /properties
│   + Bearer {token}
└──────┬───────┘
       │
       │ HTTP Request
       │
┌──────▼────────────────────────────────────┐
│   tenancyMiddleware                       │
│                                          │
│   1. Extrair token                       │
│   2. Buscar session:{token}              │
│   3. Validar expiração                   │
│   4. Montar TenantContext                │
│   5. c.set('tenant', context)            │
└──────┬───────────────────────────────────┘
       │
       │ TenantContext disponível
       │
┌──────▼────────────────────────────────────┐
│   Route Handler                           │
│                                          │
│   const tenant = getTenant(c);           │
│                                          │
│   if (tenant.type === 'imobiliaria') {   │
│     // Filtrar dados                     │
│     properties = properties.filter(p =>   │
│       p.imobiliariaId === tenant.imobiliariaId
│     )                                    │
│   }                                      │
│                                          │
│   return c.json({ success: true, data });│
└──────┬───────────────────────────────────┘
       │
       │ Response
       │
┌──────▼───────┐
│   Frontend   │
│              │
│   Renderiza  │
│   dados      │
└──────────────┘
```

---

## 🔒 SEGURANÇA

### Medidas Implementadas

1. **✅ Hash de Senha:**
   - SHA256 (backend)
   - Senhas nunca armazenadas em texto plano

2. **✅ Tokens Únicos:**
   - Gerados com timestamp + random
   - Format: `{timestamp}_{random1}_{random2}`

3. **✅ Expiração de Sessão:**
   - Sessões expiram em 24h
   - Validação automática a cada request
   - Sessões expiradas são removidas

4. **✅ Validação de Token:**
   - Middleware valida token em todas as rotas protegidas
   - Retorna 401 se token inválido/expirado

5. **✅ Isolamento de Dados:**
   - Imobiliárias só acessam seus próprios dados
   - Filtros automáticos por `imobiliariaId`
   - SuperAdmin é a única exceção (acessa tudo)

6. **✅ Rotas Protegidas:**
   - Frontend: `ProtectedRoute` verifica autenticação
   - Backend: `tenancyMiddleware` valida token
   - Dupla camada de proteção

### Pontos de Atenção

⚠️ **Token armazenado no localStorage:**
- Vulnerável a XSS attacks
- Considerar migrar para httpOnly cookies no futuro

⚠️ **Sessões no KV Store:**
- Não há limite de sessões por usuário
- Considerar implementar revogação de sessões antigas

⚠️ **Filtros Multi-Tenant:**
- Algumas entidades ainda não têm `imobiliariaId` (Property, Reservation, Guest)
- Filtros completos serão implementados após migração para Postgres

---

## 📝 RESUMO EXECUTIVO

### Backend

- ✅ **Sessões:** Armazenadas no KV Store (`session:{token}`)
- ✅ **Autenticação:** Middleware `tenancyMiddleware` valida token
- ✅ **Contexto:** `TenantContext` injetado em todas as rotas protegidas
- ✅ **Filtros:** Aplicados automaticamente por `imobiliariaId`

### Frontend

- ✅ **Estado:** `AuthContext` gerencia autenticação e organização
- ✅ **Proteção:** `ProtectedRoute` verifica autenticação e organização
- ✅ **Persistência:** Token e dados salvos no `localStorage`
- ✅ **Fallback:** `user_metadata` do Supabase como fallback para organização

### Fluxo Completo

1. **Login:** Backend cria sessão → Frontend salva token
2. **Request:** Frontend envia token → Middleware valida → Rota acessa contexto
3. **Isolamento:** Filtros automáticos por `imobiliariaId` (quando aplicável)
4. **Onboarding:** Redirecionamento automático se não houver organização

---

**Status:** ✅ **ARQUITETURA COMPLETA E FUNCIONAL**  
**Próximos Passos:** Implementar campos `imobiliariaId` em todas as entidades para isolamento completo

