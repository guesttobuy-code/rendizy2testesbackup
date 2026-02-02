# 🚀 ROADMAP: Implementação OTA Universal

**Data:** 2026-02-02  
**Versão:** 3.0  
**Status:** 🔄 Em Implementação

---

## 📋 DOCUMENTAÇÃO ARQUITETURAL (ADRs)

> ⚠️ **IMPORTANTE**: Leia os ADRs antes de fazer qualquer modificação!

| ADR | Título | Descrição |
|-----|--------|-----------|
| [ADR-001](../architecture/ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md) | Arquitetura OTA Universal | Princípios e estrutura geral |
| [ADR-002](../architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md) | Schema de Dados Universal | Campos, tabelas e mapeamentos |
| [ADR-003](../architecture/ADR-003-MIGRATIONS-OTA-ORDER.md) | Migrations - Ordem e Dependências | Ordem de execução obrigatória |

### Princípios Fundamentais

1. **Schema UNIVERSAL** - Campos marcados `[OTA-UNIVERSAL]` suportam TODAS as OTAs
2. **Adaptadores por OTA** - Código TypeScript específico para cada OTA
3. **Views OTA-específicas** - Formatação em migrations separadas
4. **Tabelas de Mapeamento** - `ota_*_mappings` para traduzir IDs

---

## 📊 STATUS ATUAL

### ✅ CONCLUÍDO

| Item | Descrição | Data |
|------|-----------|------|
| 🗄️ Migration 01 | `ota_universal_foundation.sql` - Amenities, Images, Addresses, Room Types | 02/02/2026 |
| 🗄️ Migration 02 | `ota_cancellation_rates.sql` - Políticas de cancelamento, Rate Plans | 02/02/2026 |
| 🗄️ Migration 03 | `ota_reservations_multiroom.sql` - Reservas multi-quarto, billing, pricing | 02/02/2026 |
| 🗄️ Migration 04 | `ota_payments_3dsecure.sql` - Pagamentos, 3D Secure, virtual cards | 02/02/2026 |
| 🗄️ Migration 05 | `ota_webhooks_extensions.sql` - Webhooks, sync, credenciais | 02/02/2026 |
| 🗄️ Migration 07 | `ota_seed_amenities_expedia.sql` - Seeds de amenidades Expedia | 02/02/2026 |
| 🗄️ Migration 08 | `ota_crm_enhancements.sql` - Phone estruturado, loyalty, date_of_birth | 02/02/2026 |
| 🎨 UI Card | Card "Expedia Group" em Configurações > Integrações | 02/02/2026 |
| 📄 Componente | `ExpediaGroupIntegration.tsx` com 4 tabs | 02/02/2026 |
| 📋 ADRs | 3 ADRs documentando arquitetura OTA | 02/02/2026 |

### 🔄 EM EXECUÇÃO

| Item | Descrição | Dependências |
|------|-----------|--------------|
| 🗄️ Migration 09 | `ota_reservations_enhancements.sql` - History, adjustments, invoicing | Migration 03 |

---

## 🎯 PRÓXIMOS PASSOS (Ordenado por Prioridade)

### FASE 1: AJUSTAR SCHEMA `properties` (CRÍTICO) ⏱️ ~3 dias

A tabela `properties` (antiga `anuncios_ultimate`) precisa de novos campos para suportar OTAs.

#### 1.1 Campos já adicionados (migration 05)
```sql
-- Já existem via ALTER TABLE:
property_rating, property_rating_type, category_id, category_name,
supply_source, expedia_collect, property_collect, registry_number, 
tax_id, chain_id, chain_name, brand_id, brand_name, multi_unit,
payment_registration_recommended, descriptions, statistics,
spoken_languages, themes, onsite_payment_types
```

#### 1.2 Campos que ainda FALTAM adicionar
```sql
-- Precisamos adicionar:
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_begin_time TIME;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_end_time TIME;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_time TIME;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_instructions TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkin_special_instructions TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS checkout_instructions TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS min_age_checkin INTEGER DEFAULT 18;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS know_before_you_go TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mandatory_fees_description TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS optional_fees_description TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS all_inclusive_details TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS obfuscation_required BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vrbo_listing_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vrbo_srp_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS private_host BOOLEAN DEFAULT true;
```

#### 1.3 Tarefa: Atualizar Formulário de Propriedades
- [ ] Adicionar seção "Políticas de Check-in/Check-out"
- [ ] Adicionar seção "Configurações OTA"
- [ ] Adicionar seção "Taxas e Fees"
- [ ] Vincular com `cancellation_policies` existente
- [ ] Vincular com `rate_plans` existente

---

### FASE 2: POLÍTICAS DE CANCELAMENTO (ALTA) ⏱️ ~2 dias

#### 2.1 Tabela já criada
```sql
-- cancellation_policies (migration 02)
-- cancellation_policy_rules (migration 02)
```

#### 2.2 Tarefa: UI para Gerenciar Políticas
- [ ] Criar componente `CancellationPoliciesManager.tsx`
- [ ] CRUD completo de políticas
- [ ] Regras por período (days_before_checkin)
- [ ] Penalidades configuráveis (%, fixa, noites)
- [ ] Vincular política a propriedades

#### 2.3 Exemplo de Políticas Padrão Expedia
| Tipo | Reembolso | Deadline |
|------|-----------|----------|
| Flexível | 100% | 24h antes |
| Moderada | 50% | 5 dias antes |
| Rígida | 0% | 14 dias antes |
| Não-reembolsável | 0% | Sempre |

---

### FASE 3: RATE PLANS (CRÍTICO) ⏱️ ~3 dias

#### 3.1 Tabela já criada
```sql
-- rate_plans (migration 02)
-- rate_plan_amenities (migration 02)
```

#### 3.2 Tarefa: UI para Rate Plans
- [ ] Criar componente `RatePlansManager.tsx`
- [ ] Tipos: Standard, Package, Corporate, Promotional
- [ ] Vincular amenidades inclusas
- [ ] Vincular política de cancelamento
- [ ] Definir markup/desconto sobre base
- [ ] Restrições (min/max noites, advance booking)

#### 3.3 Exemplo de Rate Plans
| Nome | Tipo | Cancelamento | Café | Desconto |
|------|------|--------------|------|----------|
| Standard | standard | Moderada | Não | 0% |
| Com Café | package | Moderada | Sim | +15% |
| Early Bird | promotional | Rígida | Não | -20% |
| Corporativo | corporate | Flexível | Sim | -10% |

---

### FASE 4: ROOMS/QUARTOS SEPARADOS (ALTA) ⏱️ ~2 dias

#### 4.1 Tabela já criada
```sql
-- room_types (migration 01) - tipos genéricos
-- reservation_rooms (migration 03) - quartos por reserva
```

#### 4.2 Nova Tabela: `property_rooms`
```sql
-- Precisamos criar tabela de quartos por propriedade
CREATE TABLE property_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  room_type_id UUID REFERENCES room_types(id),
  name TEXT NOT NULL,
  description TEXT,
  area_sqm DECIMAL(6,2),
  max_occupancy INTEGER,
  max_adults INTEGER,
  max_children INTEGER,
  base_price DECIMAL(10,2),
  images JSONB DEFAULT '[]',
  amenities UUID[], -- FK para amenities
  bed_configuration JSONB,
  views TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.3 Tarefa: UI para Quartos
- [ ] Seção de quartos no formulário de propriedade
- [ ] Configuração de camas (tipos, tamanhos, quantidade)
- [ ] Área em m²
- [ ] Imagens por quarto
- [ ] Amenidades específicas do quarto
- [ ] Ocupação máxima

---

### FASE 5: PRICING BREAKDOWN (MÉDIA) ⏱️ ~2 dias

#### 5.1 Tabela já criada
```sql
-- reservation_pricing_breakdown (migration 03)
```

#### 5.2 Tarefa: Calculadora de Pricing
- [ ] Criar `utils-pricing-calculator.ts` no backend
- [ ] Cálculo por noite com variação
- [ ] Breakdown: base, taxas, fees, serviço
- [ ] Suporte a múltiplas moedas
- [ ] Aplicar rate plan ao cálculo
- [ ] Exibir breakdown no checkout

---

### FASE 6: API ROUTES EXPEDIA (ALTA) ⏱️ ~5 dias

#### 6.1 Autenticação
- [ ] Criar `utils-expedia-auth.ts` (SHA-512 signature)
- [ ] Wrapper para requests autenticados
- [ ] Refresh automático de tokens

#### 6.2 Routes
- [ ] `routes-expedia-content.ts` - Sync de propriedades
- [ ] `routes-expedia-availability.ts` - Disponibilidade e preços
- [ ] `routes-expedia-booking.ts` - Criar/modificar reservas
- [ ] `routes-expedia-webhooks.ts` - Receber notificações

#### 6.3 Endpoints Principais
| Endpoint | Descrição |
|----------|-----------|
| `POST /api/expedia/sync-property` | Sincronizar propriedade para Expedia |
| `GET /api/expedia/availability` | Buscar disponibilidade |
| `POST /api/expedia/booking` | Criar reserva |
| `PUT /api/expedia/booking/:id` | Modificar reserva |
| `DELETE /api/expedia/booking/:id` | Cancelar reserva |

---

### FASE 7: WEBHOOKS EXPEDIA (ALTA) ⏱️ ~2 dias

#### 7.1 Eventos Suportados
- [ ] `itinerary.agent.create` - Nova reserva
- [ ] `itinerary.agent.cancel` - Cancelamento
- [ ] `itinerary.agent.modify` - Modificação
- [ ] `payment.completed` - Pagamento
- [ ] `refund.processed` - Reembolso

#### 7.2 Implementação
- [ ] Endpoint `POST /api/webhooks/expedia`
- [ ] Validação de assinatura
- [ ] Processamento assíncrono
- [ ] Logs na tabela `ota_webhooks`

---

### FASE 8: UI DE SINCRONIZAÇÃO (MÉDIA) ⏱️ ~2 dias

#### 8.1 Funcionalidades
- [ ] Botão "Sincronizar com Expedia" no formulário de propriedade
- [ ] Status de sincronização em tempo real
- [ ] Histórico de sync em `ota_sync_logs`
- [ ] Dashboard de propriedades sincronizadas

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Sprint 1 (Semana 1) - Fundação
- [ ] Migration 06: Campos faltantes em `properties`
- [ ] Migration 07: Tabela `property_rooms`
- [ ] UI: Seção Check-in/Check-out no formulário
- [ ] UI: Seção Configurações OTA no formulário

### Sprint 2 (Semana 2) - Políticas e Preços
- [ ] UI: `CancellationPoliciesManager.tsx`
- [ ] UI: `RatePlansManager.tsx`
- [ ] Backend: `utils-pricing-calculator.ts`
- [ ] Testes unitários

### Sprint 3 (Semana 3) - API
- [ ] Backend: Autenticação Expedia
- [ ] Backend: Routes de conteúdo
- [ ] Backend: Routes de disponibilidade
- [ ] Backend: Routes de booking

### Sprint 4 (Semana 4) - Webhooks e Polish
- [ ] Backend: Webhook handler
- [ ] UI: Dashboard de sincronização
- [ ] Testes E2E
- [ ] Documentação

---

## 🔗 ARQUIVOS RELACIONADOS

### Migrations Criadas
- [2026020301_ota_universal_foundation.sql](../../../supabase/migrations/2026020301_ota_universal_foundation.sql)
- [2026020302_ota_cancellation_rates.sql](../../../supabase/migrations/2026020302_ota_cancellation_rates.sql)
- [2026020303_ota_reservations_multiroom.sql](../../../supabase/migrations/2026020303_ota_reservations_multiroom.sql)
- [2026020304_ota_payments_3dsecure.sql](../../../supabase/migrations/2026020304_ota_payments_3dsecure.sql)
- [2026020305_ota_webhooks_extensions.sql](../../../supabase/migrations/2026020305_ota_webhooks_extensions.sql)

### Componentes Criados
- [ExpediaGroupIntegration.tsx](../../../components/ExpediaGroupIntegration.tsx)

### Documentos de Referência
- [ROADMAP_EXPEDIA_VRBO_INTEGRATION.md](../estudos/ROADMAP_EXPEDIA_VRBO_INTEGRATION.md)
- [ROADMAP_EXPEDIA_GAP_ANALYSIS.md](../../../../Expedia%20Group%20API/ROADMAP_EXPEDIA_GAP_ANALYSIS.md)

---

## 📊 MÉTRICAS DE PROGRESSO

| Fase | Status | Progresso |
|------|--------|-----------|
| Migrations (7/9) | ✅ Quase Completo | 78% |
| UI Card Expedia | ✅ Completo | 100% |
| Schema Properties | 🔄 Parcial | 60% |
| Schema CRM/Guests | ⏳ Migration 08 | 60% |
| Schema Reservations | ⏳ Migration 09 | 70% |
| Políticas Cancelamento | ⏳ Pendente | 10% (tabelas criadas) |
| Rate Plans | ⏳ Pendente | 10% (tabelas criadas) |
| Rooms/Quartos | ⏳ Pendente | 20% (parcial) |
| API Routes | ⏳ Pendente | 0% |
| Webhooks | ⏳ Pendente | 0% |
| UI Sync | ⏳ Pendente | 0% |

**PROGRESSO GERAL: 40%**

---

## 🔧 SDK EXPEDIA - OPÇÕES DE INTEGRAÇÃO

### Opção 1: SDK Java (Oficial)

A Expedia oferece um SDK oficial para Java que simplifica a integração:

```xml
<!-- Maven -->
<dependency>
    <groupId>com.expediagroup</groupId>
    <artifactId>rapid-sdk</artifactId>
    <version>LATEST</version>
</dependency>
```

**Uso básico:**
```java
// Criar cliente
RapidClient rapidClient = RapidClient.builder()
    .key("YOUR_API_KEY")
    .secret("YOUR_SECRET")
    .build();

// Buscar disponibilidade
GetAvailabilityOperationParams params = GetAvailabilityOperationParams.builder()
    .checkin("2026-03-01")
    .checkout("2026-03-05")
    .currency("BRL")
    .language("pt_BR")
    .build();

GetAvailabilityOperation operation = new GetAvailabilityOperation(params);
Response<List<Property>> response = rapidClient.execute(operation);
```

**Execução Assíncrona:**
```java
CompletableFuture getAvailability = rapidClient.executeAsync(operation)
    .thenAccept(response -> System.out.println(response.getData()));
```

### Opção 2: API REST Direta (Rendizy)

Como o Rendizy usa **TypeScript/Node.js**, vamos implementar a integração direta via REST API com autenticação HMAC SHA-512.

**Autenticação:**
```typescript
// utils-expedia-auth.ts
import crypto from 'crypto';

export function generateExpediaSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `${apiKey}${secret}${timestamp}`;
  const signature = crypto.createHash('sha512').update(toSign).digest('hex');
  return signature;
}

export function getExpediaHeaders(apiKey: string, secret: string) {
  return {
    'Authorization': `EAN apikey=${apiKey},signature=${generateExpediaSignature(apiKey, secret)},timestamp=${Math.floor(Date.now() / 1000)}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}
```

### Logging e Rastreabilidade

O SDK Java usa SLF4J para logging. Para nossa implementação TypeScript:

```typescript
// Cada request deve ter um transaction-id único
const transactionId = crypto.randomUUID();

// Adicionar aos headers
headers['X-Transaction-Id'] = transactionId;

// Logar para troubleshooting
console.log(`ExpediaSDK: Request started - transaction-id: ${transactionId}`);
```

**Níveis de Log:**
| Nível | Uso |
|-------|-----|
| `INFO` | Headers e body de requests/responses |
| `WARN` | Exceções e erros com transaction-id |
| `DEBUG` | Detalhes de conexão OkHttp/fetch |

---

## ⚡ PRÓXIMA AÇÃO IMEDIATA

**Criar Migration 08** (CRM enhancements) e **Migration 09** (Reservations enhancements) para cobrir os gaps identificados no Gap Analysis.

Depois, executar no Supabase e continuar com UI components.
