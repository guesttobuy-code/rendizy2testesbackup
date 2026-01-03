# 📋 PROMPTS PRONTOS PARA CURSOR - Sistema Multi-Tenant

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** ✅ Maioria implementada, prompts documentados para referência

---

## ✅ STATUS DAS IMPLEMENTAÇÕES

| Prompt | Status | Arquivos Modificados |
|--------|--------|---------------------|
| **1. Middleware multi-tenant (backend)** | ✅ **IMPLEMENTADO** | `utils-tenancy.ts`, `routes-properties.ts`, `index.ts` |
| **2. ProtectedRoute + onboarding** | ✅ **IMPLEMENTADO** | `ProtectedRoute.tsx`, `AuthContext.tsx` |
| **3. Seed de novo tenant** | ✅ **IMPLEMENTADO** | `routes-tenants.ts`, `index.ts` |
| **4. Refinamento geral multi-tenant** | ⚠️ **PENDENTE** | `routes-reservations.ts`, `routes-blocks.ts`, etc. |

---

## 📝 PROMPTS FORMATADOS PARA CURSOR

### 1. Middleware Multi-Tenant (Backend)

**Status:** ✅ **JÁ IMPLEMENTADO** (Passo 1 e 2)

**Prompt:**
```
Abra o arquivo supabase/functions/rendizy-server/utils-tenancy.ts e verifique se o middleware tenancyMiddleware está implementado corretamente. Depois, aplique esse middleware em todas as rotas de propriedades, reservas e bloqueios, usando o helper getTenant para filtrar por imobiliariaId quando o usuário não for superadmin.

Arquivos a verificar:
- supabase/functions/rendizy-server/utils-tenancy.ts (já existe)
- supabase/functions/rendizy-server/routes-properties.ts (já aplicado)
- supabase/functions/rendizy-server/routes-reservations.ts (verificar)
- supabase/functions/rendizy-server/routes-blocks.ts (verificar)
- supabase/functions/rendizy-server/index.ts (já aplicado em properties)
```

**O que já foi feito:**
- ✅ `utils-tenancy.ts` criado com `tenancyMiddleware` e `getTenant()`
- ✅ Middleware aplicado em rotas de properties (`/make-server-67caf26a/properties/*`)
- ✅ `listProperties` atualizado para usar `getTenant()`

**O que falta:**
- ⚠️ Aplicar middleware em rotas de reservations
- ⚠️ Aplicar middleware em rotas de blocks
- ⚠️ Adicionar filtro por `imobiliariaId` em todas as rotas

---

### 2. ProtectedRoute + Onboarding

**Status:** ✅ **JÁ IMPLEMENTADO** (Passo 2.2)

**Prompt:**
```
Atualize o arquivo src/components/ProtectedRoute.tsx para garantir que, se o usuário estiver logado com type === 'imobiliaria' e não tiver imobiliariaId (ou organizationId), redirecione para /onboarding, exceto quando já estiver em /onboarding. Ajuste as rotas em App.tsx para que todas as rotas privadas usem esse componente.

Arquivos a verificar:
- src/components/ProtectedRoute.tsx (já atualizado)
- src/contexts/AuthContext.tsx (já atualizado para garantir organizationId)
- src/App.tsx (verificar se todas as rotas estão protegidas)
```

**O que já foi feito:**
- ✅ `ProtectedRoute.tsx` atualizado com lógica de redirecionamento para `/onboarding`
- ✅ `AuthContext.tsx` atualizado para garantir `organizationId` no login
- ✅ Verificação de SuperAdmin (não precisa de organização)

**O que falta:**
- ⚠️ Criar página `OnboardingPage.tsx`
- ⚠️ Adicionar rota `/onboarding` no `App.tsx`

---

### 3. Seed de Novo Tenant

**Status:** ✅ **JÁ IMPLEMENTADO** (Passo 3)

**Prompt:**
```
Verifique se o arquivo supabase/functions/rendizy-server/routes-tenants.ts existe e contém a rota POST /tenants/create-tenant. A rota deve:
1. Verificar se o usuário é SuperAdmin
2. Criar imobiliária no KV Store
3. Criar usuário de imobiliária no KV Store
4. Retornar dados criados

Arquivos a verificar:
- supabase/functions/rendizy-server/routes-tenants.ts (já criado)
- supabase/functions/rendizy-server/index.ts (rota já registrada)
```

**O que já foi feito:**
- ✅ `routes-tenants.ts` criado com rota `POST /create-tenant`
- ✅ Proteção: apenas SuperAdmin pode criar tenants
- ✅ Criação de imobiliária e usuário no KV Store
- ✅ Validações completas (email, senha, duplicados)
- ✅ Rota registrada no `index.ts`

**O que falta:**
- ⚠️ Testar criação de tenant
- ⚠️ Migrar para Postgres (futuro)

---

### 4. Refinamento Geral Multi-Tenant

**Status:** ⚠️ **PENDENTE**

**Prompt:**
```
Varra todas as rotas de backend que acessam dados de propriedades, reservas e bloqueios e garanta que, se o usuário for imobiliaria, os selects sempre tenham filtro por imobiliariaId. Use o tenancyMiddleware para extrair o contexto.

Arquivos a verificar e atualizar:
- supabase/functions/rendizy-server/routes-reservations.ts
  - listReservations: adicionar filtro por imobiliariaId
  - getReservation: verificar se reserva pertence à imobiliária
  - createReservation: associar com imobiliariaId
  - updateReservation: verificar permissão
  - deleteReservation: verificar permissão

- supabase/functions/rendizy-server/routes-blocks.ts
  - listBlocks: adicionar filtro por imobiliariaId
  - getBlock: verificar se bloqueio pertence à imobiliária
  - createBlock: associar com imobiliariaId
  - updateBlock: verificar permissão
  - deleteBlock: verificar permissão

- supabase/functions/rendizy-server/routes-properties.ts
  - getProperty: verificar se propriedade pertence à imobiliária
  - createProperty: associar com imobiliariaId
  - updateProperty: verificar permissão
  - deleteProperty: verificar permissão

- supabase/functions/rendizy-server/routes-guests.ts
  - listGuests: adicionar filtro por imobiliariaId
  - getGuest: verificar se hóspede pertence à imobiliária
  - createGuest: associar com imobiliariaId

- supabase/functions/rendizy-server/routes-calendar.ts
  - getCalendarData: filtrar por imobiliariaId

Padrão a seguir:
1. Aplicar tenancyMiddleware na rota (ou grupo de rotas)
2. Usar getTenant(c) para obter contexto
3. Se tenant.type === 'imobiliaria', filtrar por tenant.imobiliariaId
4. Se tenant.type === 'superadmin', não filtrar (ver tudo)
```

**O que precisa ser feito:**
- ⚠️ Aplicar `tenancyMiddleware` em todas as rotas listadas
- ⚠️ Adicionar filtro por `imobiliariaId` em todas as queries
- ⚠️ Verificar permissões em operações de update/delete
- ⚠️ Associar `imobiliariaId` em operações de create

---

## 🔄 PRÓXIMOS PASSOS RECOMENDADOS

### Prioridade Alta:
1. **Refinamento Multi-Tenant (Prompt 4)**
   - Aplicar middleware em rotas de reservations
   - Aplicar middleware em rotas de blocks
   - Adicionar filtros por `imobiliariaId` em todas as rotas

### Prioridade Média:
2. **OnboardingPage**
   - Criar componente `OnboardingPage.tsx`
   - Adicionar rota `/onboarding` no `App.tsx`
   - Conectar com rota de criação de tenant

### Prioridade Baixa:
3. **Migração Postgres**
   - Migrar criação de tenant para Postgres
   - Manter compatibilidade com KV Store

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `ANALISE_PASSO_1_TENANCY_MIDDLEWARE.md` - Análise do Passo 1
- `RESUMO_PASSO_2_PROPERTIES.md` - Implementação do Passo 2
- `RESUMO_PASSO_2_2_ONBOARDING.md` - Implementação do Passo 2.2
- `RESUMO_PASSO_3_TENANTS.md` - Implementação do Passo 3
- `EXEMPLO_USO_TENANCY_MIDDLEWARE.md` - Exemplos de uso

---

## 💡 DICAS DE USO

1. **Copiar e colar prompts:**
   - Use os prompts formatados acima
   - Adapte conforme necessário para seu contexto

2. **Verificar status:**
   - Consulte a tabela de status no início do documento
   - Veja o que já foi implementado antes de pedir novamente

3. **Priorizar:**
   - Foque no Prompt 4 (Refinamento Geral) que ainda está pendente
   - Os outros 3 prompts já foram implementados

---

**Última atualização:** 17/11/2025  
**Versão:** 1.0.103.400

