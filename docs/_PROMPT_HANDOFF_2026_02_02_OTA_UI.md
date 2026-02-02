# 🚀 PROMPT HANDOFF - Integração OTA Universal Rendizy

**Data:** 2026-02-02  
**Sessão anterior:** Migrations OTA 01-12 completas  
**Próxima fase:** UI Components

---

## 📋 CONTEXTO DO PROJETO

### O que é o Rendizy?
Sistema SaaS de gestão de propriedades de aluguel por temporada (vacation rentals). Multi-tenant com organizações.

### O que estamos fazendo?
Implementando integração universal com OTAs (Online Travel Agencies):
- **Expedia Group** (Expedia, VRBO, Hotels.com)
- **Booking.com** (futuro)
- **Airbnb** (futuro)

### Princípio de Design
**Schema UNIVERSAL + Adaptadores por OTA**
- Campos marcados `[OTA-UNIVERSAL]` suportam TODAS as OTAs
- Código TypeScript específico para cada OTA (adaptadores)
- Não é "integração Expedia", é "integração OTA com suporte inicial a Expedia"

---

## 📚 DOCUMENTOS DE REFERÊNCIA

### ADRs (Architecture Decision Records)
```
docs/architecture/ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md  - Princípios gerais
docs/architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md        - Mapeamento de campos
docs/architecture/ADR-003-MIGRATIONS-OTA-ORDER.md        - Ordem das migrations
```

### Documentos Principais
```
docs/MASTER_CHECKLIST_OTA_2026_02.md                     - CHECKLIST ÚNICO (usar este!)
docs/roadmaps/ROADMAP_OTA_IMPLEMENTATION_2026_02.md      - Roadmap detalhado
Expedia Group API/ROADMAP_EXPEDIA_GAP_ANALYSIS.md        - Gap Analysis (1458 linhas)
```

---

## ✅ O QUE JÁ FOI FEITO (Migrations 01-12)

### Migrations Executadas no Supabase

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | `2026020301_ota_universal_foundation.sql` | Amenities, Images, Addresses |
| 02 | `2026020302_ota_cancellation_rates.sql` | Cancellation policies, Rate plans |
| 03 | `2026020303_ota_reservations_multiroom.sql` | Multi-room, billing, pricing breakdown |
| 04 | `2026020304_ota_payments_3dsecure.sql` | 3D Secure, virtual cards |
| 05 | `2026020305_ota_webhooks_extensions.sql` | Webhooks, credentials, sync logs |
| 07 | `2026020307_ota_seed_amenities_expedia.sql` | Seeds amenidades |
| 08 | `2026020308_ota_crm_enhancements.sql` | Phone estruturado, loyalty |
| 09 | `2026020309_CLEAN_AND_RUN.sql` | Reservation history tables |
| 10 | `2026020310_ota_reservation_history_trigger.sql` | Trigger audit log |
| 11 | `2026020311_ota_property_rooms.sql` | Property rooms, room_types, bed_types |
| 12 | `2026020312_ota_checkin_checkout_settings.sql` | 30+ campos em properties |

### Tabelas Criadas

```sql
-- OTA Foundation
room_types              -- 10 tipos (standard, deluxe, suite, etc.)
bed_types               -- 13 tipos (single, queen, king, etc.)
property_rooms          -- Quartos por propriedade
cancellation_policies   -- Políticas de cancelamento
cancellation_policy_rules
rate_plans              -- Planos tarifários
rate_plan_amenities

-- Reservations
reservation_rooms       -- Quartos por reserva
reservation_pricing_breakdown
reservation_history     -- Audit trail (com trigger automático!)
reservation_room_history

-- OTA Sync
ota_webhooks           -- Logs de webhooks
ota_credentials        -- Credenciais por OTA
ota_sync_logs          -- Logs de sincronização

-- Referência
country_iso_codes      -- Códigos ISO de países
```

### Colunas Adicionadas

**Em `properties`:**
```sql
-- Check-in/out
checkin_begin_time, checkin_end_time, checkout_time
checkin_instructions, checkout_instructions
min_age_checkin

-- Políticas
pets_policy (JSONB), smoking_policy, party_policy
quiet_hours_start, quiet_hours_end

-- Fees
mandatory_fees_description, optional_fees_description
know_before_you_go, all_inclusive_details

-- OTA específico
obfuscation_required, vrbo_listing_id, vrbo_srp_id, private_host
property_rating, property_rating_type, category_id, category_name

-- Contato
emergency_contact_name, emergency_contact_phone
property_manager_name, property_manager_phone, property_manager_email

-- Licenças
license_number, license_type, license_expiry
tax_registration, insurance_policy

-- Localização
parking_details (JSONB), accessibility_features (TEXT[])
nearby_attractions (JSONB), transportation_options (JSONB)
```

**Em `reservations`:**
```sql
-- Billing
billing_name, billing_address, billing_city, billing_state
billing_postal_code, billing_country, billing_phone, billing_email

-- Pricing
pricing_subtotal, pricing_taxes, pricing_fees
pricing_total, pricing_currency, pricing_breakdown (JSONB)

-- Enhancements
travel_purpose, adjustment_value, adjustment_type
invoicing_consent, invoicing_company_name, invoicing_vat_number
ota_links (JSONB), trader_information (JSONB)
```

**Em `crm_contacts`:**
```sql
phone_country_code, phone_area_code, phone_number_only
middle_name, date_of_birth
loyalty_program_id, loyalty_tier, loyalty_number
```

### Views Criadas
```sql
v_property_rooms_detailed  -- Quartos com detalhes de room_type
v_properties_ota_ready     -- Properties prontas para OTA
```

### Triggers Criados
```sql
trg_reservation_history    -- Auto-log de mudanças em reservations
trg_property_rooms_updated_at
```

---

## ⚠️ INFORMAÇÕES TÉCNICAS CRÍTICAS

### Tipos de ID no Banco (IMPORTANTE!)

| Tabela | Tipo do `id` |
|--------|--------------|
| `reservations` | **TEXT** (não UUID!) |
| `reservation_rooms` | UUID |
| `properties` | UUID |
| `crm_contacts` | UUID |
| `property_rooms` | UUID |

**Isso afeta foreign keys!** Exemplo:
```sql
-- CORRETO:
reservation_id TEXT REFERENCES reservations(id)

-- ERRADO (dá erro):
reservation_id UUID REFERENCES reservations(id)
```

### Estrutura de Pastas
```
Pasta oficial Rendizy/
├── components/
│   └── settings/           -- Onde ficam componentes de configuração
├── server/
│   ├── routes/             -- API routes
│   └── utils/              -- Utilitários backend
├── supabase/
│   └── migrations/         -- Migrations SQL
└── docs/
    ├── architecture/       -- ADRs
    └── roadmaps/           -- Roadmaps
```

### Stack Tecnológica
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js (Nitro/H3)
- **Database:** Supabase (PostgreSQL)
- **UI:** shadcn/ui + Tailwind CSS

---

## 📋 O QUE FALTA FAZER

### FASE 2: UI Components

#### 2.1 CancellationPoliciesManager.tsx
**Localização:** `components/settings/CancellationPoliciesManager.tsx`

**Funcionalidades:**
- [ ] Listagem de políticas com DataTable
- [ ] Modal de criação/edição
- [ ] CRUD completo via Supabase
- [ ] Regras por período (days_before_checkin → penalidade)
- [ ] Tipos de penalidade (%, valor fixo, noites)
- [ ] Vincular política a propriedades

**Tabelas envolvidas:**
```sql
cancellation_policies (id, organization_id, name, description, is_default)
cancellation_policy_rules (policy_id, days_before_checkin, penalty_type, penalty_value)
```

**Políticas padrão:**
| Nome | Reembolso | Deadline |
|------|-----------|----------|
| Flexível | 100% | 24h antes |
| Moderada | 50% | 5 dias antes |
| Rígida | 0% | 14 dias antes |
| Não-reembolsável | 0% | Sempre |

---

#### 2.2 RatePlansManager.tsx
**Localização:** `components/settings/RatePlansManager.tsx`

**Funcionalidades:**
- [ ] Listagem de rate plans
- [ ] CRUD completo
- [ ] Tipos: Standard, Package, Corporate, Promotional
- [ ] Vincular política de cancelamento
- [ ] Vincular amenidades inclusas
- [ ] Markup/desconto sobre preço base
- [ ] Restrições (min/max noites, advance booking)

**Tabelas envolvidas:**
```sql
rate_plans (id, organization_id, name, type, cancellation_policy_id, markup_percent, ...)
rate_plan_amenities (rate_plan_id, amenity_id)
```

---

#### 2.3 PropertyRoomsSection.tsx
**Localização:** `components/property/PropertyRoomsSection.tsx`

**Funcionalidades:**
- [ ] Seção no formulário de propriedades
- [ ] Lista de quartos da propriedade
- [ ] Modal adicionar/editar quarto
- [ ] Configuração de camas (bed_configuration JSONB)
- [ ] Ocupação máxima
- [ ] Imagens por quarto
- [ ] Amenidades específicas

**Tabela:** `property_rooms`

**Formato bed_configuration:**
```json
[
  {"type": "double", "size": "queen", "count": 1},
  {"type": "single", "count": 2}
]
```

---

#### 2.4 CheckinCheckoutSettings.tsx
**Localização:** `components/property/CheckinCheckoutSettings.tsx`

**Funcionalidades:**
- [ ] Seção no formulário de propriedades
- [ ] Horários (begin_time, end_time, checkout_time)
- [ ] Instruções de check-in/checkout (textarea)
- [ ] Idade mínima
- [ ] Políticas (pets, smoking, party)
- [ ] Quiet hours

**Campos:** Todos os novos campos de `properties` da migration 12

---

### FASE 3: Backend Utils

#### 3.1 utils-expedia-auth.ts
```typescript
// server/utils/expedia/utils-expedia-auth.ts

import crypto from 'crypto';

export function generateExpediaSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `${apiKey}${secret}${timestamp}`;
  return crypto.createHash('sha512').update(toSign).digest('hex');
}

export function getExpediaHeaders(apiKey: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  return {
    'Authorization': `EAN apikey=${apiKey},signature=${generateExpediaSignature(apiKey, secret)},timestamp=${timestamp}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Transaction-Id': crypto.randomUUID()
  };
}
```

#### 3.2 utils-pricing-calculator.ts
- Cálculo de breakdown por noite
- Aplicar rate plan
- Taxas e fees
- Múltiplas moedas

#### 3.3 utils-expedia-mapper.ts
- `mapPropertyToExpedia(property)` → formato Expedia
- `mapExpediaToReservation(booking)` → formato Rendizy

---

### FASE 4: API Routes

```
server/routes/expedia/
├── content.ts        -- Sync propriedades
├── availability.ts   -- Disponibilidade e preços
├── booking.ts        -- CRUD reservas
└── webhooks.ts       -- Handler de webhooks
```

---

### FASE 5: Dashboard

#### OtaSyncDashboard.tsx
- Lista propriedades sincronizadas
- Status por OTA
- Botão "Sincronizar Agora"
- Histórico de sync

#### OtaCredentialsManager.tsx
- CRUD credenciais por OTA
- Teste de conexão
- Ambiente (sandbox/production)

---

## 🎯 COMANDO PARA CONTINUAR

```
Continuando implementação OTA Universal do Rendizy.

CONTEXTO:
- Migrations 01-12 já executadas no Supabase ✅
- Schema completo com tabelas, triggers e views
- ADRs documentados

PRÓXIMA TAREFA:
Criar componente CancellationPoliciesManager.tsx

REFERÊNCIAS:
- docs/MASTER_CHECKLIST_OTA_2026_02.md (checklist único)
- docs/architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md (mapeamento)

IMPORTANTE:
- reservations.id é TEXT, não UUID
- Usar shadcn/ui + Tailwind
- Seguir padrão dos outros componentes em components/settings/
```

---

## 📁 ARQUIVOS IMPORTANTES PARA CONTEXTO

Se precisar entender melhor, peça para ler:

```
# ADRs
docs/architecture/ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md
docs/architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md
docs/architecture/ADR-003-MIGRATIONS-OTA-ORDER.md

# Checklist
docs/MASTER_CHECKLIST_OTA_2026_02.md

# Gap Analysis (muito detalhado)
Expedia Group API/ROADMAP_EXPEDIA_GAP_ANALYSIS.md

# Migrations executadas
supabase/migrations/2026020311_ota_property_rooms.sql
supabase/migrations/2026020312_ota_checkin_checkout_settings.sql

# Componente existente de referência
components/ExpediaGroupIntegration.tsx
```

---

## 📊 PROGRESSO GERAL

```
████████████████░░░░░░░░░░░░░░ 55% COMPLETO

✅ Fase 1: Migrations (100%)
⏳ Fase 2: UI Components (0%)
⏳ Fase 3: Backend Utils (0%)
⏳ Fase 4: API Routes (0%)
⏳ Fase 5: Webhooks (0%)
⏳ Fase 6: Dashboard (0%)
```

---

*Documento gerado em 2026-02-02 para handoff de contexto*
