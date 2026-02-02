# 🎯 MASTER CHECKLIST - Integração OTA Universal

**Data:** 2026-02-02  
**Versão:** 1.0  
**Status:** 🔄 Em Implementação

> ⚠️ **DOCUMENTO ÚNICO** - Este é o único documento que você precisa consultar.
> Todos os outros documentos estão vinculados aqui como referência.

---

## 📚 DOCUMENTOS VINCULADOS

| Documento | Propósito | Link |
|-----------|-----------|------|
| Gap Analysis Expedia | Diagnóstico completo | [ROADMAP_EXPEDIA_GAP_ANALYSIS.md](../../Expedia%20Group%20API/ROADMAP_EXPEDIA_GAP_ANALYSIS.md) |
| ADR-001 Arquitetura | Princípios de design | [ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md](architecture/ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md) |
| ADR-002 Schema | Mapeamento de campos | [ADR-002-OTA-UNIVERSAL-SCHEMA.md](architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md) |
| ADR-003 Migrations | Ordem de execução | [ADR-003-MIGRATIONS-OTA-ORDER.md](architecture/ADR-003-MIGRATIONS-OTA-ORDER.md) |
| Roadmap OTA (antigo) | Detalhes técnicos | [ROADMAP_OTA_IMPLEMENTATION_2026_02.md](roadmaps/ROADMAP_OTA_IMPLEMENTATION_2026_02.md) |

---

## 📊 PROGRESSO GERAL

```
███████████████░░░░░░░░░░░░░░░ 50% COMPLETO
```

| Fase | Status | Progresso |
|------|--------|-----------|
| 1. Migrations Schema | ✅ Completo | 100% (10/10) |
| 2. UI Managers | ⏳ Pendente | 0% |
| 3. Backend Utils | ⏳ Pendente | 0% |
| 4. API Routes | ⏳ Pendente | 0% |
| 5. Webhooks | ⏳ Pendente | 0% |
| 6. Dashboard | ⏳ Pendente | 0% |

---

## ✅ FASE 1: MIGRATIONS SCHEMA (COMPLETO)

### 1.1 Migrations Executadas no Supabase

| # | Migration | Arquivo | Status | Data |
|---|-----------|---------|--------|------|
| 01 | Foundation | `2026020301_ota_universal_foundation.sql` | ✅ | 02/02 |
| 02 | Cancellation/Rates | `2026020302_ota_cancellation_rates.sql` | ✅ | 02/02 |
| 03 | Reservations Multi-room | `2026020303_ota_reservations_multiroom.sql` | ✅ | 02/02 |
| 04 | Payments 3D Secure | `2026020304_ota_payments_3dsecure.sql` | ✅ | 02/02 |
| 05 | Webhooks/Credentials | `2026020305_ota_webhooks_extensions.sql` | ✅ | 02/02 |
| 06 | *(pulado)* | - | - | - |
| 07 | Seeds Amenidades | `2026020307_ota_seed_amenities_expedia.sql` | ✅ | 02/02 |
| 08 | CRM Enhancements | `2026020308_ota_crm_enhancements.sql` | ✅ | 02/02 |
| 09 | Reservations History | `2026020309_CLEAN_AND_RUN.sql` | ✅ | 02/02 |
| 10 | History Trigger | `2026020310_ota_reservation_history_trigger.sql` | ✅ | 02/02 |

### 1.2 Tabelas Criadas

| Tabela | Propósito | Migration |
|--------|-----------|-----------|
| `amenities` | Comodidades universais | 01 |
| `property_images` | Imagens com categorias | 01 |
| `property_addresses` | Endereços estruturados | 01 |
| `room_types` | Tipos de quarto padrão | 01 |
| `cancellation_policies` | Políticas de cancelamento | 02 |
| `cancellation_policy_rules` | Regras por período | 02 |
| `rate_plans` | Planos tarifários | 02 |
| `rate_plan_amenities` | Amenidades por rate plan | 02 |
| `reservation_rooms` | Quartos por reserva | 03 |
| `reservation_pricing_breakdown` | Detalhamento de preços | 03 |
| `ota_webhooks` | Logs de webhooks OTA | 05 |
| `ota_credentials` | Credenciais por OTA | 05 |
| `ota_sync_logs` | Logs de sincronização | 05 |
| `country_iso_codes` | Códigos ISO países | 08 |
| `reservation_history` | Audit trail reservas | 09 |
| `reservation_room_history` | Histórico por quarto | 09 |

### 1.3 Colunas Adicionadas

| Tabela | Colunas | Migration |
|--------|---------|-----------|
| `reservations` | `billing_*`, `pricing_*`, `travel_purpose`, `adjustment_*`, `invoicing_*`, `ota_links`, `trader_information` | 03, 09 |
| `crm_contacts` | `phone_country_code`, `phone_area_code`, `phone_number_only`, `middle_name`, `date_of_birth`, `loyalty_*` | 08 |
| `reservation_rooms` | `child_ages` | 09 |
| `properties` | `property_rating`, `category_*`, `supply_source`, `descriptions`, `statistics` | 05 |

---

## ⏳ FASE 2: UI MANAGERS

### 2.1 CancellationPoliciesManager.tsx

- [ ] **Criar componente** em `components/settings/`
- [ ] **Listagem** de políticas existentes
- [ ] **CRUD completo** (criar, editar, excluir)
- [ ] **Regras por período** (days_before_checkin → penalidade)
- [ ] **Tipos de penalidade** (%, valor fixo, noites)
- [ ] **Vincular a propriedades**
- [ ] **Políticas padrão** (Flexível, Moderada, Rígida, Não-reembolsável)

**Referência:** Gap Analysis seção "Rates/Tarifas"

### 2.2 RatePlansManager.tsx

- [ ] **Criar componente** em `components/settings/`
- [ ] **Listagem** de rate plans
- [ ] **CRUD completo**
- [ ] **Tipos:** Standard, Package, Corporate, Promotional
- [ ] **Vincular política de cancelamento**
- [ ] **Vincular amenidades inclusas**
- [ ] **Markup/desconto** sobre preço base
- [ ] **Restrições** (min/max noites, advance booking)

**Referência:** Gap Analysis seção "Rates/Tarifas"

### 2.3 PropertyRoomsSection.tsx

- [ ] **Criar seção** no formulário de propriedades
- [ ] **Migration 11:** Tabela `property_rooms`
- [ ] **CRUD de quartos** por propriedade
- [ ] **Configuração de camas** (tipos, tamanhos, quantidade)
- [ ] **Área em m²**
- [ ] **Imagens por quarto**
- [ ] **Amenidades específicas**
- [ ] **Ocupação máxima** (adultos, crianças, total)

**Referência:** Gap Analysis seção "Rooms/Quartos"

### 2.4 CheckinCheckoutSettings.tsx

- [ ] **Criar seção** no formulário de propriedades
- [ ] **Migration 12:** Campos `checkin_*`, `checkout_*` em properties
- [ ] **Horários:** begin_time, end_time, checkout_time
- [ ] **Instruções:** texto livre ou HTML
- [ ] **Idade mínima** para check-in
- [ ] **Know before you go**
- [ ] **Fees:** mandatory, optional, all-inclusive

**Referência:** Gap Analysis seção "Property Content"

---

## ⏳ FASE 3: BACKEND UTILS

### 3.1 utils-expedia-auth.ts

- [ ] **Criar arquivo** em `server/utils/`
- [ ] **Função:** `generateExpediaSignature(apiKey, secret)` → SHA-512
- [ ] **Função:** `getExpediaHeaders(apiKey, secret)` → Headers completos
- [ ] **Timestamp** em segundos
- [ ] **Testes unitários**

**Código base:**
```typescript
import crypto from 'crypto';

export function generateExpediaSignature(apiKey: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `${apiKey}${secret}${timestamp}`;
  return crypto.createHash('sha512').update(toSign).digest('hex');
}
```

### 3.2 utils-pricing-calculator.ts

- [ ] **Criar arquivo** em `server/utils/`
- [ ] **Função:** `calculateNightlyBreakdown(property, dates, guests)`
- [ ] **Função:** `applyRatePlan(basePrice, ratePlan)`
- [ ] **Função:** `calculateTaxesAndFees(subtotal, property)`
- [ ] **Suporte a múltiplas moedas**
- [ ] **Variação por dia da semana**
- [ ] **Testes unitários**

### 3.3 utils-expedia-mapper.ts

- [ ] **Criar arquivo** em `server/utils/`
- [ ] **Função:** `mapPropertyToExpedia(property)` → formato Expedia
- [ ] **Função:** `mapExpediaToReservation(expediaBooking)` → formato Rendizy
- [ ] **Função:** `mapAmenitiesExpedia(amenityIds)` → códigos Expedia
- [ ] **Usar tabelas de mapeamento** `ota_*_mappings`

---

## ⏳ FASE 4: API ROUTES

### 4.1 routes-expedia-content.ts

- [ ] **Criar arquivo** em `server/routes/`
- [ ] `POST /api/expedia/sync-property` - Enviar propriedade para Expedia
- [ ] `GET /api/expedia/property/:id` - Buscar propriedade na Expedia
- [ ] `PUT /api/expedia/property/:id` - Atualizar propriedade
- [ ] **Logging** em `ota_sync_logs`

### 4.2 routes-expedia-availability.ts

- [ ] **Criar arquivo** em `server/routes/`
- [ ] `GET /api/expedia/availability` - Buscar disponibilidade
- [ ] `PUT /api/expedia/availability` - Atualizar disponibilidade
- [ ] `GET /api/expedia/rates` - Buscar tarifas
- [ ] `PUT /api/expedia/rates` - Atualizar tarifas

### 4.3 routes-expedia-booking.ts

- [ ] **Criar arquivo** em `server/routes/`
- [ ] `POST /api/expedia/booking` - Criar reserva
- [ ] `GET /api/expedia/booking/:id` - Buscar reserva
- [ ] `PUT /api/expedia/booking/:id` - Modificar reserva
- [ ] `DELETE /api/expedia/booking/:id` - Cancelar reserva
- [ ] **Sync automático** com tabela `reservations`

---

## ⏳ FASE 5: WEBHOOKS

### 5.1 routes-expedia-webhooks.ts

- [ ] **Criar arquivo** em `server/routes/`
- [ ] `POST /api/webhooks/expedia` - Endpoint público
- [ ] **Validação de assinatura**
- [ ] **Processamento assíncrono** (queue ou background job)
- [ ] **Logging** em `ota_webhooks`

### 5.2 Eventos Suportados

- [ ] `itinerary.agent.create` - Nova reserva
- [ ] `itinerary.agent.cancel` - Cancelamento
- [ ] `itinerary.agent.modify` - Modificação
- [ ] `payment.completed` - Pagamento recebido
- [ ] `refund.processed` - Reembolso processado

---

## ⏳ FASE 6: DASHBOARD

### 6.1 OtaSyncDashboard.tsx

- [ ] **Criar componente** em `components/integrations/`
- [ ] **Lista de propriedades** sincronizadas por OTA
- [ ] **Status de sincronização** (success, error, pending)
- [ ] **Botão "Sincronizar Agora"**
- [ ] **Histórico de sync** (últimas 50 entradas)
- [ ] **Filtros:** por OTA, por status, por data

### 6.2 OtaCredentialsManager.tsx

- [ ] **Criar componente** em `components/settings/`
- [ ] **CRUD de credenciais** por OTA
- [ ] **Campos:** api_key, api_secret, environment (sandbox/production)
- [ ] **Teste de conexão** antes de salvar
- [ ] **Criptografia** de secrets

---

## 🗓️ CRONOGRAMA SUGERIDO

### Semana 1 (03-07 Fev)
| Dia | Tarefa |
|-----|--------|
| Seg | Migration 11 (property_rooms) + Migration 12 (checkin/checkout) |
| Ter | UI: CancellationPoliciesManager |
| Qua | UI: RatePlansManager |
| Qui | UI: PropertyRoomsSection |
| Sex | UI: CheckinCheckoutSettings |

### Semana 2 (10-14 Fev)
| Dia | Tarefa |
|-----|--------|
| Seg | Backend: utils-expedia-auth |
| Ter | Backend: utils-pricing-calculator |
| Qua | Backend: utils-expedia-mapper |
| Qui | API: routes-expedia-content |
| Sex | API: routes-expedia-availability |

### Semana 3 (17-21 Fev)
| Dia | Tarefa |
|-----|--------|
| Seg | API: routes-expedia-booking |
| Ter | Webhooks: routes-expedia-webhooks |
| Qua | UI: OtaSyncDashboard |
| Qui | UI: OtaCredentialsManager |
| Sex | Testes E2E + Ajustes |

---

## 📝 NOTAS IMPORTANTES

### Tipos de ID no Banco

| Tabela | Tipo do ID |
|--------|------------|
| `reservations` | **TEXT** (não UUID!) |
| `reservation_rooms` | **UUID** |
| `properties` | **UUID** |
| `crm_contacts` | **UUID** |

### Princípios de Design (ADR-001)

1. **Schema UNIVERSAL** - Campos marcados `[OTA-UNIVERSAL]` suportam TODAS as OTAs
2. **Adaptadores por OTA** - Código TypeScript específico para cada OTA
3. **Tabelas de Mapeamento** - `ota_*_mappings` para traduzir IDs entre sistemas

### Credenciais Expedia (quando tiver)

```
API Key: _______________
Secret:  _______________
Environment: [ ] Sandbox [ ] Production
```

---

## 📞 PRÓXIMA AÇÃO

**Qual item você quer começar?**

1. 🗄️ Migration 11: property_rooms
2. 🎨 UI: CancellationPoliciesManager
3. 🎨 UI: RatePlansManager
4. ⚙️ Backend: utils-expedia-auth
5. 📋 Outro (especifique)

---

*Última atualização: 2026-02-02 por Copilot*
