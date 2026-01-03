# ✅ RESUMO: MIGRAÇÃO PROPERTIES → LISTINGS (Padrão Airbnb)

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** 🔄 **EM PROGRESSO** (CRUD básico migrado)

---

## ✅ IMPLEMENTADO

### **1. ✅ Mapper TypeScript ↔ SQL**

**Arquivo:** `supabase/functions/rendizy-server/utils-listing-mapper.ts`

**Funcionalidades:**
- ✅ `sqlToListing()` - Converte SQL row → Listing (TypeScript)
- ✅ `listingToSql()` - Converte Listing (TypeScript) → SQL row
- ✅ `LISTING_SELECT_FIELDS` - Campos para SELECT queries
- ✅ Mapeia campos multilíngue (title, description)
- ✅ Mapeia plataformas (airbnb, booking, decolar, direct)
- ✅ Mapeia estatísticas e configurações

---

### **2. ✅ Migração SQL da Tabela**

**Arquivo:** `supabase/migrations/20241117_create_listings_table.sql`

**Funcionalidades:**
- ✅ Tabela `listings` criada
- ✅ Foreign keys para `organizations` e `properties`
- ✅ Constraint UNIQUE(property_id, platform) - uma property pode ter apenas um listing por plataforma
- ✅ Índices para performance (organization_id, property_id, platform, status)
- ✅ Índices GIN para busca em title/description (multilíngue)
- ✅ Row Level Security (RLS) habilitado
- ✅ Trigger para `updated_at` automático

**Schema:**
```sql
listings (
  id UUID PRIMARY KEY,
  organization_id UUID → organizations(id),
  property_id UUID → properties(id),
  platform TEXT (airbnb|booking|decolar|vrbo|direct),
  external_id TEXT,
  external_url TEXT,
  title JSONB,          -- { pt: "...", en: "...", es: "..." }
  description JSONB,    -- { pt: "...", en: "...", es: "..." }
  status TEXT (draft|published|unlisted|archived),
  sync_calendar BOOLEAN,
  sync_pricing BOOLEAN,
  sync_availability BOOLEAN,
  ical_url TEXT,
  pricing_adjustment JSONB,
  min_nights INTEGER,
  max_nights INTEGER,
  instant_book BOOLEAN,
  advance_notice INTEGER,
  total_views INTEGER,
  total_bookings INTEGER,
  total_revenue NUMERIC,
  average_rating NUMERIC,
  last_sync_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(property_id, platform)
)
```

---

### **3. ✅ Rotas CRUD Migradas para SQL**

**Arquivo:** `supabase/functions/rendizy-server/routes-listings.ts`

**Rotas Migradas:**
- ✅ `GET /listings` - Lista todos os listings (com filtros multi-tenant)
- ✅ `GET /listings/:id` - Obtém listing específico
- ✅ `POST /listings` - Cria novo listing
- ✅ `PUT /listings/:id` - Atualiza listing
- ✅ `DELETE /listings/:id` - Deleta listing

**Melhorias Implementadas:**
- ✅ `tenancyMiddleware` aplicado em todas as rotas
- ✅ Filtro por `organization_id` para multi-tenant
- ✅ Validações de permissão (usuários só acessam listings da própria organização)
- ✅ Tratamento de erros (UNIQUE constraint, etc)
- ✅ Uso de `successResponse` e `errorResponse` padronizados

---

## 🔄 EM PROGRESSO / PENDENTE

### **4. ⏳ Rotas de Platforms (Ajustar)**

**Arquivo:** `supabase/functions/rendizy-server/routes-listings.ts`

**Situação:**
- ⚠️ Rotas antigas: `POST /listings/:id/publish`, `DELETE /listings/:id/unpublish/:platform`
- ⚠️ **Mudança de Arquitetura:** Um listing agora representa UMA plataforma (não múltiplas)
- ⚠️ Essas rotas precisam ser ajustadas ou removidas

**Opções:**
- **Opção A:** Remover rotas de publish/unpublish (agora é apenas criar/deletar listing)
- **Opção B:** Manter como helpers que criam/deletam listings por plataforma

**Recomendação:** Opção A (remover, pois agora é redundante)

---

### **5. ⏳ Script de Migração de Dados**

**Arquivo:** `supabase/functions/rendizy-server/migrate-properties-to-listings.ts` (a criar)

**Função:**
- Ler todas as properties do banco (SQL ou KV Store)
- Para cada property que tem `platforms.enabled === true`:
  - Criar listing correspondente na tabela `listings`
- Log de progresso e erros

**Status:** ⏳ **PENDENTE**

---

### **6. ⏳ Atualizar routes-properties.ts**

**Arquivo:** `supabase/functions/rendizy-server/routes-properties.ts`

**Mudanças Necessárias:**
- ✅ Adicionar rota `GET /properties/:id/listings` (listar listings de uma property)
- ⏳ Remover salvamento de `platforms` em Property (ou marcar como deprecated)
- ⏳ Atualizar interface `Property` para remover/marcar `platforms` como deprecated

**Status:** ⏳ **PENDENTE**

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ **Fase 1: Preparação**
- [x] Criar migração SQL para tabela `listings`
- [x] Criar `utils-listing-mapper.ts`
- [x] Aplicar `tenancyMiddleware` em listings

### ✅ **Fase 2: Migração de Código CRUD**
- [x] Migrar `GET /listings` para SQL
- [x] Migrar `GET /listings/:id` para SQL
- [x] Migrar `POST /listings` para SQL
- [x] Migrar `PUT /listings/:id` para SQL
- [x] Migrar `DELETE /listings/:id` para SQL

### ⏳ **Fase 3: Ajustes e Limpeza**
- [ ] Ajustar/remover rotas de platforms (`/publish`, `/unpublish`)
- [ ] Criar rota `GET /properties/:id/listings`
- [ ] Atualizar `routes-properties.ts` (remover platforms)

### ⏳ **Fase 4: Migração de Dados**
- [ ] Criar script `migrate-properties-to-listings.ts`
- [ ] Testar migração em desenvolvimento
- [ ] Executar migração em produção
- [ ] Verificar integridade dos dados

### ⏳ **Fase 5: Documentação e Testes**
- [ ] Atualizar documentação da API
- [ ] Testar todas as rotas de listings
- [ ] Validar multi-tenant isolation

---

## 🎯 ARQUITETURA FINAL

### **Antes (Tudo em Properties):**

```typescript
Property {
  id: "prop_123"
  name: "Apartamento 101"
  platforms: {
    airbnb: { enabled: true, listingId: "AIR123" },
    booking: { enabled: true, listingId: "BKG456" }
  }
}
```

### **Depois (Separado):**

```sql
-- Tabela properties (unidade física)
properties {
  id: "prop_123"
  name: "Apartamento 101"
  -- SEM platforms aqui
}

-- Tabela listings (anúncios por plataforma)
listings {
  id: "list_abc"
  organization_id: "org_xyz"
  property_id: "prop_123"  -- FK
  platform: "airbnb"
  external_id: "AIR123"
  status: "published"
  title: { pt: "Luxo em Copacabana", en: "..." }
  ...
}

listings {
  id: "list_def"
  organization_id: "org_xyz"
  property_id: "prop_123"  -- FK (mesma property!)
  platform: "booking"
  external_id: "BKG456"
  status: "published"
  title: { pt: "Luxo em Copacabana", en: "..." }
  ...
}
```

**Vantagens:**
- ✅ Uma property pode ter múltiplos listings (um por plataforma)
- ✅ Cada listing tem seu próprio título, descrição, preço
- ✅ Melhor rastreamento e estatísticas por plataforma
- ✅ Segue padrão Airbnb/Booking.com

---

## ⚠️ NOTAS IMPORTANTES

### **1. Compatibilidade Retroativa**

**Durante a migração:**
- ✅ Backend já suporta listings SQL
- ⚠️ Frontend ainda pode esperar `Property.platforms`
- ✅ Recomendação: Manter `Property.platforms` como deprecated durante transição

### **2. Multi-Tenant**

✅ **Implementado:**
- Todas as rotas filtram por `organization_id`
- Superadmin vê tudo
- Imobiliária vê apenas seus próprios listings

### **3. Relacionamentos**

✅ **Foreign Keys:**
- `listings.organization_id → organizations.id` (ON DELETE CASCADE)
- `listings.property_id → properties(id)` (ON DELETE CASCADE)

✅ **Constraint UNIQUE:**
- `UNIQUE(property_id, platform)` - Garante que uma property tenha apenas um listing por plataforma

---

## 📊 PROGRESSO GERAL

**Status:** 🔄 **60% COMPLETO**

- ✅ Migração SQL: **100%**
- ✅ Mapper TypeScript ↔ SQL: **100%**
- ✅ Rotas CRUD: **100%**
- ⏳ Ajustes de rotas antigas: **0%**
- ⏳ Migração de dados: **0%**
- ⏳ Atualização de properties: **0%**

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Ajustar rotas de platforms** (remover publish/unpublish ou adaptar)
2. ✅ **Criar rota `GET /properties/:id/listings`**
3. ✅ **Criar script de migração de dados**
4. ✅ **Testar em desenvolvimento**
5. ✅ **Executar migração em produção**

---

**Última atualização:** 17/11/2025  
**Versão:** 1.0.103.400

