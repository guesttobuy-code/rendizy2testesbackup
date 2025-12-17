# 🎯 Helper Híbrido para Organization ID

**Versão:** 1.0.103.500  
**Data:** 2025-11-17  
**Status:** ✅ IMPLEMENTADO

---

## 📋 RESUMO

Helper centralizado para obter `organization_id` (UUID) do usuário autenticado, compatível com sistema atual (KV Store) e preparado para futuro (Supabase Auth).

---

## 🔄 PRIORIDADE DE LOOKUP

1. **KV Store (sistema atual)**
   - Busca sessão via `getSessionFromToken()`
   - Extrai `imobiliariaId` da sessão
   - Converte `imobiliariaId` → `organizationId` (UUID) via SQL lookup

2. **Supabase Auth (futuro)**
   - Busca `organization_id` de `user_metadata.organization_id`
   - Usa token JWT para autenticação

3. **Erro se nenhum funcionar**
   - Retorna `401` ou `403` se não encontrar organização

---

## 📁 ARQUIVOS

### **1. Helper Principal**
```
supabase/functions/rendizy-server/utils-get-organization-id.ts
```

**Funções exportadas:**
- `getOrganizationIdOrThrow(c: Context): Promise<string>` - Retorna UUID ou lança erro
- `getOrganizationId(c: Context): Promise<string | undefined>` - Retorna UUID ou undefined

---

### **2. Migration SQL**
```
supabase/migrations/20241117_add_legacy_imobiliaria_id_to_organizations.sql
```

**Funcionalidades:**
- Cria tabela `organizations` (se não existir)
- Adiciona coluna `legacy_imobiliaria_id` (TEXT)
- Cria função SQL `lookup_organization_id_by_imobiliaria_id(p_imobiliaria_id TEXT)`
- Cria função SQL `validate_tenant_by_imobiliaria_id(p_imobiliaria_id TEXT)`

---

## 🚀 COMO USAR

### **Exemplo 1: Uso básico (com erro)**

```typescript
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';

app.get('/organizations/:id/settings', async (c) => {
  try {
    // ✅ Obtém organization_id (UUID) automaticamente
    const orgId = await getOrganizationIdOrThrow(c);
    
    // Usar orgId nas queries...
    const client = getSupabaseClient();
    const { data } = await client
      .from('settings')
      .select('*')
      .eq('organization_id', orgId) // ✅ Sempre UUID
      .single();
    
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao obter organização' 
    }, 401);
  }
});
```

### **Exemplo 2: Uso com tratamento opcional**

```typescript
import { getOrganizationId } from './utils-get-organization-id.ts';

app.get('/route', async (c) => {
  // ✅ Retorna undefined se não encontrar (não lança erro)
  const orgId = await getOrganizationId(c);
  
  if (!orgId) {
    return c.json({ 
      success: false, 
      error: 'Usuário sem organização vinculada' 
    }, 403);
  }
  
  // Usar orgId...
  console.log('Organization ID:', orgId);
});
```

### **Exemplo 3: Compatível com tenancyMiddleware**

```typescript
import { tenancyMiddleware, getTenant } from './utils-tenancy.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';

// Aplicar middleware primeiro
app.use('/organizations/*', tenancyMiddleware);

app.get('/organizations/:id/settings', async (c) => {
  // ✅ Ambos funcionam juntos
  const tenant = getTenant(c); // TenantContext com imobiliariaId
  const orgId = await getOrganizationIdOrThrow(c); // organizationId (UUID)
  
  console.log('Tenant:', tenant.imobiliariaId); // TEXT do KV Store
  console.log('Organization ID:', orgId); // UUID do SQL
  
  // Usar orgId nas queries...
});
```

---

## 🔧 FUNCIONAMENTO INTERNO

### **Passo 1: Extração do Token**
```typescript
const token = extractTokenFromContext(c);
// Token do header: Authorization: Bearer <token>
```

### **Passo 2: Busca no KV Store**
```typescript
const session = await getSessionFromToken(token);
// Retorna: { imobiliariaId: "abc123", userId: "...", ... }
```

### **Passo 3: Lookup SQL**
```typescript
const orgId = await lookupOrganizationIdFromImobiliariaId(session.imobiliariaId);
// Query: SELECT id FROM organizations WHERE legacy_imobiliaria_id = $1
// Retorna: UUID ou null
```

### **Passo 4: Fallback Supabase Auth**
```typescript
if (!orgId) {
  const orgIdFromAuth = await getOrganizationIdFromSupabaseAuth(token);
  // Busca: user.user_metadata.organization_id
}
```

---

## 📊 MAPEAMENTO DE DADOS

### **Tabela: organizations**

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,                    -- ✅ organizationId (UUID)
  legacy_imobiliaria_id TEXT,             -- ✅ imobiliariaId (KV Store)
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ...
);
```

### **Lookup Function**

```sql
-- Função SQL criada pela migration
lookup_organization_id_by_imobiliaria_id(p_imobiliaria_id TEXT) RETURNS UUID

-- Uso:
SELECT lookup_organization_id_by_imobiliaria_id('abc123');
-- Retorna: '550e8400-e29b-41d4-a716-446655440000'
```

---

## ⚠️ IMPORTANTE

### **1. Não alterar tenancyMiddleware**
O `tenancyMiddleware` continua funcionando normalmente e é **obrigatório** manter.

### **2. Sempre usar organizationId (UUID) no banco**
- ✅ Correto: `.eq('organization_id', orgId)` (orgId é UUID)
- ❌ Errado: `.eq('organization_id', imobiliariaId)` (imobiliariaId é TEXT)

### **3. Popular legacy_imobiliaria_id**
Após criar organizações no SQL, popular `legacy_imobiliaria_id` com os `imobiliariaId` existentes:

```sql
UPDATE organizations 
SET legacy_imobiliaria_id = 'abc123' 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### **4. Migration deve ser executada primeiro**
Executar migration `20241117_add_legacy_imobiliaria_id_to_organizations.sql` antes de usar o helper.

---

## 🔮 FUTURO (Migração para Supabase Auth)

Quando migrar para Supabase Auth:

1. Remover dependência do KV Store
2. Helper passa a usar apenas Supabase Auth
3. Código já está preparado (fallback já implementado)

**Sem mudanças necessárias nas rotas** que usam `getOrganizationIdOrThrow()`.

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Migration SQL criada
- [x] Helper híbrido implementado
- [x] Compatível com tenancyMiddleware
- [x] Função de lookup SQL
- [x] Fallback para Supabase Auth
- [x] Documentação criada
- [ ] Migration executada no banco
- [ ] Dados migrados (popular `legacy_imobiliaria_id`)
- [ ] Rotas atualizadas para usar helper
- [ ] Testes realizados

---

## 📚 REFERÊNCIAS

- `supabase/functions/rendizy-server/utils-tenancy.ts` - TenancyMiddleware atual
- `supabase/functions/rendizy-server/utils-session.ts` - Helpers de sessão KV Store
- `supabase/functions/rendizy-server/utils-organization.ts` - Helpers antigos (não usar mais)

---

**Última atualização:** 2025-11-17  
**Versão:** 1.0.103.500

