# 🚀 PLANO DE MIGRAÇÃO: Properties → Listings (Padrão Airbnb)

**Data:** 17/11/2025  
**Versão:** 1.0.103.400  
**Status:** 📋 **PLANO COMPLETO**

---

## 🎯 OBJETIVO

Migrar da arquitetura atual (tudo em `properties`) para arquitetura separada:
- **`properties`** = Unidade física/acomodação (físico)
- **`listings`** = Anúncio dessa propriedade em plataformas (virtual, pode ter múltiplos)

**Padrão:** Airbnb, Booking.com

---

## 📊 ARQUITETURA ATUAL vs NOVA

### ❌ **ATUAL (Tudo em Properties)**

```
Property {
  id: "prop_123"
  name: "Apartamento 101"
  platforms: {
    airbnb: { enabled: true, listingId: "AIR123" },
    booking: { enabled: true, listingId: "BKG456" }
  }
}
```

**Problemas:**
- Uma propriedade = um anúncio por plataforma
- Não permite múltiplos anúncios da mesma propriedade
- Dados de plataforma misturados com dados físicos

### ✅ **NOVA (Separada)**

```
Property {
  id: "prop_123"
  name: "Apartamento 101"
  // SEM platforms aqui
}

Listing {
  id: "list_abc"
  property_id: "prop_123"  // FK
  organization_id: "org_xyz"  // FK
  platform: "airbnb"
  external_id: "AIR123"
  status: "published"
  title: "Luxo em Copacabana"
  pricing: { ... }
}
```

**Vantagens:**
- ✅ Uma propriedade pode ter múltiplos listings (um por plataforma)
- ✅ Separar dados físicos de dados de marketing
- ✅ Flexibilidade: diferentes preços/títulos por plataforma
- ✅ Melhor rastreamento e estatísticas por plataforma

---

## 📋 ESTRUTURA DA TABELA `listings` (SQL)

```sql
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Plataforma
  platform TEXT NOT NULL CHECK (platform IN ('airbnb', 'booking', 'decolar', 'vrbo', 'direct')),
  
  -- Identificação Externa
  external_id TEXT,  -- ID da plataforma (ex: "AIR123")
  external_url TEXT, -- URL do anúncio na plataforma
  
  -- Conteúdo do Anúncio
  title JSONB,       -- { pt: "...", en: "...", es: "..." }
  description JSONB, -- { pt: "...", en: "...", es: "..." }
  slug TEXT,         -- URL-friendly slug
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'unlisted', 'archived')),
  
  -- Configurações de Sincronização
  sync_calendar BOOLEAN DEFAULT true,
  sync_pricing BOOLEAN DEFAULT true,
  sync_availability BOOLEAN DEFAULT true,
  ical_url TEXT,     -- URL do iCal para sincronização
  
  -- Preços Específicos da Plataforma (opcional, pode usar property.pricing como base)
  pricing_adjustment JSONB,  -- { baseAdjustment: 10, cleaningFee: 50, ... }
  
  -- Configurações de Disponibilidade Específicas
  min_nights INTEGER,
  max_nights INTEGER,
  instant_book BOOLEAN DEFAULT false,
  advance_notice INTEGER,  -- horas de antecedência
  
  -- Estatísticas
  total_views INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue NUMERIC(10, 2) DEFAULT 0,
  average_rating NUMERIC(3, 2),
  
  -- Metadata
  last_sync_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que uma propriedade não tenha listings duplicados na mesma plataforma
  UNIQUE(property_id, platform)
);

-- Índices
CREATE INDEX idx_listings_organization_id ON listings(organization_id);
CREATE INDEX idx_listings_property_id ON listings(property_id);
CREATE INDEX idx_listings_platform ON listings(platform);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_external_id ON listings(external_id) WHERE external_id IS NOT NULL;

-- Índice GIN para busca em title/description
CREATE INDEX idx_listings_title_gin ON listings USING gin(title);
CREATE INDEX idx_listings_description_gin ON listings USING gin(description);

-- Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem listings da própria organização
CREATE POLICY "listings_organization_isolation"
ON listings FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations WHERE id = (SELECT organization_id FROM listings WHERE id = listings.id)
  )
);
```

---

## 🔄 MIGRAÇÃO DE DADOS

### **Fase 1: Criar Listings a partir de Property.platforms**

Para cada `Property` que tem `platforms.enabled === true`:

```typescript
// Pseudocódigo de migração
for (const property of properties) {
  if (property.platforms?.airbnb?.enabled) {
    await createListing({
      property_id: property.id,
      organization_id: property.organization_id, // ou tenant.imobiliariaId
      platform: 'airbnb',
      external_id: property.platforms.airbnb.listingId,
      status: property.platforms.airbnb.syncEnabled ? 'published' : 'draft',
      title: { pt: property.name }, // ou usar property.description
      sync_calendar: property.platforms.airbnb.syncEnabled,
      sync_pricing: property.platforms.airbnb.syncEnabled,
      sync_availability: property.platforms.airbnb.syncEnabled,
    });
  }
  
  // Repetir para booking, decolar, etc.
}
```

### **Fase 2: Remover platforms de Property**

Após migração bem-sucedida:
```typescript
// Remover campo platforms de Property
// (ou manter vazio por compatibilidade durante transição)
property.platforms = undefined;
```

---

## 📁 ARQUIVOS A CRIAR/MODIFICAR

### ✅ **1. Mapper TypeScript ↔ SQL**

**Arquivo:** `supabase/functions/rendizy-server/utils-listing-mapper.ts`

**Funções:**
- `listingToSql(listing: Listing): SQLRow`
- `sqlToListing(row: SQLRow): Listing`
- `LISTING_SELECT_FIELDS: string`

### ✅ **2. Migrar routes-listings.ts para SQL**

**Arquivo:** `supabase/functions/rendizy-server/routes-listings.ts`

**Mudanças:**
- ❌ Remover `kv.get()`, `kv.set()`, `kv.getByPrefix()`
- ✅ Usar `client.from('listings').select()`, `.insert()`, `.update()`, `.delete()`
- ✅ Aplicar `tenancyMiddleware` para multi-tenant
- ✅ Filtrar por `organization_id` usando `getTenant(c)`

### ✅ **3. Atualizar routes-properties.ts**

**Arquivo:** `supabase/functions/rendizy-server/routes-properties.ts`

**Mudanças:**
- ✅ Remover salvamento de `platforms` em Property
- ✅ Adicionar rota `GET /properties/:id/listings` (listar listings de uma property)
- ✅ Opcional: Remover campo `platforms` da interface `Property` (ou manter como deprecated)

### ✅ **4. Script de Migração de Dados**

**Arquivo:** `supabase/functions/rendizy-server/migrate-properties-to-listings.ts`

**Função:**
- Ler todas as properties do banco (KV Store ou SQL)
- Criar listings para cada `platforms.enabled === true`
- Log de progresso e erros

### ✅ **5. Atualizar tipos TypeScript**

**Arquivo:** `supabase/functions/rendizy-server/types.ts`

**Mudanças:**
- ✅ Atualizar interface `Listing` para incluir `organization_id` e `property_id`
- ✅ Marcar `Property.platforms` como deprecated (ou remover)

---

## 🔐 MULTI-TENANT

**Aplicar `tenancyMiddleware` em todas as rotas:**

```typescript
import { tenancyMiddleware, getTenant } from './utils-tenancy.ts';

// Aplicar middleware
app.use('/make-server-67caf26a/listings/*', tenancyMiddleware);

// Usar em rotas
app.get('/listings', async (c) => {
  const tenant = getTenant(c);
  const client = kv.getSupabaseClient();
  
  let query = client
    .from('listings')
    .select(LISTING_SELECT_FIELDS);
  
  // Filtrar por organização se não for superadmin
  if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
    query = query.eq('organization_id', tenant.imobiliariaId);
  }
  
  const { data, error } = await query;
  // ...
});
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Preparação**
- [ ] Criar migração SQL para tabela `listings` (se não existir)
- [ ] Criar `utils-listing-mapper.ts`
- [ ] Atualizar tipos TypeScript (`Listing` interface)

### **Fase 2: Migração de Código**
- [ ] Migrar `routes-listings.ts` para SQL
- [ ] Aplicar `tenancyMiddleware` em listings
- [ ] Atualizar `routes-properties.ts` (remover platforms)
- [ ] Criar rota `GET /properties/:id/listings`

### **Fase 3: Migração de Dados**
- [ ] Criar script `migrate-properties-to-listings.ts`
- [ ] Testar migração em ambiente de desenvolvimento
- [ ] Executar migração em produção
- [ ] Verificar integridade dos dados

### **Fase 4: Limpeza**
- [ ] Remover campo `platforms` de Property (ou marcar deprecated)
- [ ] Atualizar documentação
- [ ] Testar todas as rotas de listings

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### **1. Compatibilidade Retroativa**

**Opção A: Manter `Property.platforms` como deprecated**
- Frontend continua funcionando
- Backend ignora ao salvar
- Gradualmente migrar frontend para usar listings

**Opção B: Remover completamente**
- Requer atualização simultânea do frontend
- Mais limpo, mas quebra compatibilidade temporariamente

**Recomendação:** Opção A (deprecated) para transição suave.

### **2. Dados de Pricing**

**Estratégia:**
- Property mantém `pricing` (base/preço padrão)
- Listing pode ter `pricing_adjustment` (ajuste por plataforma)
- Preço final = Property.pricing + Listing.pricing_adjustment

### **3. Título/Descrição**

**Estratégia:**
- Property mantém `description` (descrição física/base)
- Listing tem `title` e `description` multilíngue (otimizado para marketing)
- Se Listing não tiver título, usar Property.name como fallback

---

## ✅ BENEFÍCIOS FINAIS

1. ✅ **Flexibilidade:** Múltiplos anúncios por propriedade
2. ✅ **Separação de Responsabilidades:** Dados físicos vs marketing
3. ✅ **Escalabilidade:** Fácil adicionar novas plataformas
4. ✅ **Estatísticas:** Melhor rastreamento por plataforma
5. ✅ **Padrão Airbnb:** Alinhado com indústria
6. ✅ **Multi-tenant:** Isolamento completo por organização

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Criar mapper `utils-listing-mapper.ts`
2. ✅ Migrar `routes-listings.ts` para SQL
3. ✅ Criar script de migração de dados
4. ✅ Testar em desenvolvimento
5. ✅ Executar migração em produção

---

**Status:** 📋 **PLANO COMPLETO - PRONTO PARA IMPLEMENTAÇÃO**

