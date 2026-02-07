# 🚀 ROADMAP: Integração Rendizy ↔ Channex

**Data:** 2026-02-06  
**Versão:** 3.4  
**Status:** ✅ Fase 2.5 Concluída — Rate Plans Unificado + Fix Trigger Cancelamento  
**Última atualização:** 2026-02-06 18:30

---

# 📚 DOCUMENTOS DE REFERÊNCIA

> ⚠️ **IMPORTANTE:** Consulte estes documentos antes de iniciar qualquer implementação.

## � ÍNDICE PRINCIPAL

| Documento | Descrição | Caminho |
|-----------|-----------|---------|
| **INDICE_DOCUMENTOS_INTEGRACAO_CHANNEX** | Índice centralizado com todos os documentos relevantes | `docs/INDICE_DOCUMENTOS_INTEGRACAO_CHANNEX.md` |

---

## �🔴 DOCUMENTOS CRÍTICOS (Leitura Obrigatória)

| # | Documento | Linhas | Tema Principal | Caminho |
|---|-----------|--------|----------------|---------|
| 1 | **MASTER_CHECKLIST_OTA** | 327 | Checklist único - status migrations, 50% progresso | `docs/MASTER_CHECKLIST_OTA_2026_02.md` |
| 2 | **FUNCTIONAL_MAPPING_OTA_FIELDS** | 2470 | 63 prints, 17 passos formulário, hierarquia 3 níveis | `docs/roadmaps/FUNCTIONAL_MAPPING_OTA_FIELDS.md` |
| 3 | **ROADMAP_EXPEDIA_GAP_ANALYSIS** | 1458 | Gap analysis Rendizy vs Expedia API | `Expedia Group API/ROADMAP_EXPEDIA_GAP_ANALYSIS.md` |

## 🏗️ ARQUITETURA OTA

| # | Documento | Tema Principal | Caminho |
|---|-----------|----------------|---------|
| 4 | **ADR-001 Arquitetura** | Schema Universal + Adaptadores por OTA | `docs/architecture/ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md` |
| 5 | **ADR-002 Schema** | Diagrama entidades, campos universais | `docs/architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md` |
| 6 | **ADR-003 Migrations** | Ordem de execução migrations | `docs/architecture/ADR-003-MIGRATIONS-OTA-ORDER.md` |
| 7 | **MODELO_DADOS_UNIVERSAL_OTA** | Filosofia "Rendizy é Fonte de Verdade" | `Expedia Group API/MODELO_DADOS_UNIVERSAL_OTA.md` |
| 8 | **IMPLEMENTACAO_MAPEAMENTO_OTA** | Exemplos práticos de mapeamento | `Expedia Group API/IMPLEMENTACAO_MAPEAMENTO_OTA.md` |

## 📋 MAPEAMENTO DE CAMPOS

| # | Documento | Tema Principal | Caminho |
|---|-----------|----------------|---------|
| 9 | **MAPEAMENTO_WIZARD_COMPLETO** | 17 steps do wizard detalhados | `docs/MAPEAMENTO_WIZARD_COMPLETO_BACKEND_v1.0.103.264.md` |
| 10 | **MAPEAMENTO_CAMPOS_WIZARD_VS_BACKEND** | 85% campos com suporte | `docs/MAPEAMENTO_CAMPOS_WIZARD_VS_BACKEND.md` |

## 📕 DOCUMENTAÇÃO CHANNEX API (LINKS OFICIAIS)

### Documentação Geral
| Link | Descrição |
|------|----------|
| https://docs.channex.io/ | Página principal da documentação |
| https://docs.channex.io/about-channex-and-faq | Sobre Channex e FAQ |
| https://docs.channex.io/changelog | Changelog - novidades e mudanças |

### API para PMS (Nossa integração)
| Link | Descrição | Status Rendizy |
|------|----------|----------------|
| https://docs.channex.io/for-pms/api-reference | Referência API (endpoints, paginação, filtros) | ✅ Implementado |
| https://docs.channex.io/for-pms/api-rate-limits | Rate Limits (20 req/min ARI, 10/min property) | ✅ Conhecemos |
| https://docs.channex.io/for-pms/property-size-limits | Limites de tamanho por propriedade | 📖 Lido |
| https://docs.channex.io/for-pms/properties-collection | **Properties CRUD** | ✅ Implementado |
| https://docs.channex.io/for-pms/property-users-collection | Property Users | ⏳ Futuro |
| https://docs.channex.io/for-pms/groups-collection | Groups (agrupamento de properties) | ⏳ Futuro |
| https://docs.channex.io/for-pms/group-users-collection | Group Users | ⏳ Futuro |
| https://docs.channex.io/for-pms/room-types-collection | **Room Types CRUD** | ✅ Implementado |
| https://docs.channex.io/for-pms/rate-plans-collection | **Rate Plans CRUD** | ✅ Implementado |
| https://docs.channex.io/for-pms/availability-and-rates | **ARI - Availability, Rates, Inventory** | ✅ Client pronto, sync ⏳ Fase 3 |
| https://docs.channex.io/for-pms/webhook-collection | **Webhooks CRUD + eventos** | ✅ Client pronto, handler ⏳ Fase 4 |
| https://docs.channex.io/for-pms/bookings-collection | **Bookings Collection (feed, CRUD)** | ✅ Client pronto, handler ⏳ Fase 4 |
| https://docs.channex.io/for-pms/booking-crs-api | Booking CRS (Central Reservation) | ⏳ Futuro |
| https://docs.channex.io/for-pms/channel-api | **Channel API (listar, conectar OTAs)** | ✅ Implementado |
| https://docs.channex.io/for-pms/photos-collection | **📸 Photos Collection (CRUD + upload + batch)** | ⚠️ NÃO IMPLEMENTADO — PRIORIDADE |
| https://docs.channex.io/for-pms/hotel-policy-collection | Hotel Policy (check-in, check-out, regras) | ⏳ Fase 3/4 |
| https://docs.channex.io/for-pms/facilities-collection | **Facilities (amenidades)** | ⏳ Fase 3 |
| https://docs.channex.io/for-pms/taxes-and-tax-sets | **Taxes & Tax Sets (taxas, impostos)** | ⏳ Fase 3 |
| https://docs.channex.io/for-pms/applications-api | Applications API (apps de terceiros) | ⏳ Futuro |
| https://docs.channex.io/for-pms/messages-collection | **Messages (chat com hóspedes via OTA)** | ⏳ Fase 5 |
| https://docs.channex.io/for-pms/reviews-collection | **Reviews (avaliações)** | ⏳ Fase 5 |
| https://docs.channex.io/for-pms/availability-rules-collection | **Availability Rules (close_out, offset, max)** | ⏳ Fase 3 |
| https://docs.channex.io/for-pms/stripe-tokenization-app | Stripe Tokenization App | ⏳ Futuro |
| https://docs.channex.io/for-pms/payment-application-api | Payment Application API | ⏳ Futuro |
| https://docs.channex.io/for-pms/channel-codes | Channel Codes (códigos das OTAs) | 📖 Referência |
| https://docs.channex.io/for-pms/channel-iframe | Channel iFrame (embed dashboard Channex) | ⏳ Futuro |
| https://docs.channex.io/for-pms/pms-certification-tests | **🎯 PMS Certification Tests (14 testes)** | ⏳ Fase 6 |
| https://docs.channex.io/for-pms/pms-integration-guide | PMS Integration Guide | 📖 Lido |
| https://docs.channex.io/for-pms/best-practices-guide | **Best Practices Guide** | 📖 Lido |
| https://docs.channex.io/for-pms/test-account-for-booking.com | Conta teste Booking.com (certificação) | ⏳ Fase 6 |
| https://docs.channex.io/for-pms/test-accounts-for-airbnb | Conta teste Airbnb (certificação) | ⏳ Fase 6 |

### API para OTAs (Referência)
| Link | Descrição |
|------|----------|
| https://docs.channex.io/for-ota/intro | Introdução para OTAs |
| https://docs.channex.io/for-ota/channex-shopping-api | Shopping API |
| https://docs.channex.io/for-ota/open-channel-api | Open Channel API |

### Guias & App Documentation
| Link | Descrição |
|------|----------|
| https://docs.channex.io/guides/channex-retention-periods | Retenção de dados |
| https://docs.channex.io/guides/guide-to-pci | Guia PCI compliance |
| https://docs.channex.io/app-documentation/overview-of-app-documentation | Visão geral do app |
| https://docs.channex.io/app-documentation/dashboard | Dashboard |
| https://docs.channex.io/app-documentation/properties-and-groups-management | Gestão de properties |
| https://docs.channex.io/app-documentation/property-tasks | Tarefas de property |
| https://docs.channex.io/app-documentation/rooms-management | Gestão de rooms |
| https://docs.channex.io/app-documentation/inventory-management | Gestão de inventário |
| https://docs.channex.io/app-documentation/channels-management | Gestão de canais |
| https://docs.channex.io/app-documentation/channel-log | Log de canais |
| https://docs.channex.io/app-documentation/bookings-management | Gestão de reservas |
| https://docs.channex.io/app-documentation/availability-rules | Regras de disponibilidade |
| https://docs.channex.io/app-documentation/api-key-access | Acesso por API Key |
| https://docs.channex.io/app-documentation/change-log-feature | Change Log |

### Documentação Local Extraída
| # | Documento | Tema Principal | Caminho |
|---|-----------|----------------|---------|
| 11 | **channex_master_documentation** | Visão geral completa da API | `integração Channex/extracted/channex_master_documentation.md` |
| 12 | **channex_api_full_documentation** | Documentação técnica completa (11690 linhas) | `integração Channex/extracted/channex_api_full_documentation.md` |
| 13 | **channex_compendium_raw** | Compêndio de referência | `integração Channex/extracted/channex_compendium_raw.md` |

## 🔗 REFERÊNCIA STAYS.NET (Padrão de integração)

| # | Documento | Tema Principal | Caminho |
|---|-----------|----------------|---------|
| 14 | **STAYS_SYNC_FIX** | Padrão de sincronização | `_PROMPT_HANDOFF_2026_01_30_STAYS_SYNC_FIX.md` |
| 15 | **STAYSNET_WEBHOOK_REFERENCE** | Padrão de webhooks | `docs/ADR_STAYSNET_WEBHOOK_REFERENCE.md` |
| 16 | **STAYSNET_RAW_OBJECT_STORE** | Armazenamento de dados brutos | `docs/architecture/STAYSNET_RAW_OBJECT_STORE.md` |

---

# 📊 VISÃO GERAL CHANNEX

## O que é Channex?

**Channex.io** é um Channel Manager que conecta propriedades a múltiplas OTAs via uma única API.

```
┌─────────────────────────────────────────────────────────────────┐
│                         RENDIZY                                  │
│                    (PMS / Fonte de Verdade)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API RESTful
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CHANNEX.io                               │
│                     (Channel Manager)                            │
├─────────────────────────────────────────────────────────────────┤
│  • Properties    • Room Types    • Rate Plans                   │
│  • ARI (Availability, Rates, Inventory)                         │
│  • 📸 Photos     • Facilities    • Hotel Policies               │
│  • Taxes/TaxSets • Availability Rules                           │
│  • Bookings      • Webhooks      • Messages    • Reviews        │
└─────────────────────────────────────────────────────────────────┘
         │           │           │           │           │
         ▼           ▼           ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Booking │ │ Airbnb  │ │ Expedia │ │  VRBO   │ │ Agoda   │
    │  .com   │ │         │ │ Group   │ │         │ │         │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
         │           │           │           │           │
         └───────────┴───────────┴───────────┴───────────┘
                              │
                              ▼
                    17+ OTAs Conectadas
```

## APIs Disponíveis

### 1. API para PMS (Rendizy → Channex)
- **Base URL Produção:** `https://app.channex.io/api/v1`
- **Base URL Staging:** `https://staging.channex.io/api/v1`
- **Autenticação:** Header `user-api-key` (⚠️ NÃO é `x-api-key`)
- **Docs oficiais:** https://docs.channex.io/

### 2. Photos Collection (Channex suporta fotos!)
- **CRUD completo:** `GET/POST/PUT/DELETE /api/v1/photos`
- **Upload via multipart:** `POST /api/v1/photos/upload` → retorna URL temporária
- **Batch via property/room_type:** Pode criar fotos junto com property/room_type em `content.photos`
- **Campos:** `property_id` (required), `url` (required), `room_type_id` (optional), `kind` (`photo`/`ad`/`menu`), `author`, `description`, `position` (0 = cover)
- **Operações batch:** `is_removed: true` para deletar em batch
- ⚠️ **IMPORTANTE:** Fotos SÃO sincronizáveis via Channex — precisa implementar sync de fotos do Rendizy → Channex

### 3. Webhooks (Channex → Rendizy)
- Endpoint: `POST /api/v1/webhooks` (criar via API ✅)
- Eventos: `booking`, `booking_new`, `booking_modification`, `booking_cancellation`
- Eventos Airbnb: `reservation_request`, `alteration_request`, `inquiry`
- Extra: `ari`, `message`, `sync_error`, `review`
- Formato: JSON POST com `send_data: true`

### 4. APIs Adicionais Importantes
- **Hotel Policy:** `GET/POST/PUT/DELETE /api/v1/hotel_policies` — check-in/out times, regras
- **Facilities:** `GET/POST/PUT/DELETE /api/v1/facilities` — amenidades da property/room
- **Taxes & Tax Sets:** CRUD para impostos (ISS, taxa turística, taxa limpeza como taxa)
- **Availability Rules:** Regras de close_out, offset, max_availability por canal
- **Messages:** Mensagens de hóspedes via OTA
- **Reviews:** Avaliações dos hóspedes

### 5. Sandbox Validado ✅ (2026-02-06)

| Recurso | Endpoint | Status |
|---------|----------|--------|
| **Conexão** | `GET /properties` | ✅ Funcionando |
| **Property** | `6eb57376-a581-4207-96df-7bab312ea6be` (Teste - Rio de Janeiro) | ✅ Criada |
| **Room Type** | `1d2cd2c3-62aa-4703-90e6-b80ba1a8e2d7` (Quarto Standard Teste) | ✅ Criada via API |
| **Rate Plan** | `9c869a49-80a3-48d5-bc00-7425b42fe50f` (Tarifa Standard BRL) | ✅ Criada via API |
| **Webhook** | `a361c5c2-7722-41f3-b01d-7d4ed8f93b47` (event_mask: *) | ✅ Criada via API (inactive) |
| **Group** | `dd97d53c-13c3-4834-a959-7da3cf8bcbdf` (User Group) | ✅ Existe |

> **Conclusão:** Tudo pode ser criado 100% via API, sem necessidade de dashboard manual.

---

# 🔬 DIAGNÓSTICO PRÉ-FASE 3 (2026-02-06)

## Propriedade Eleita para Testes

**João e Gisele - Búzios RJ** (`dfe3d5d2-0691-4d64-bee3-e1bcae3ee915`)

| Campo | Valor |
|-------|-------|
| **ID** | `dfe3d5d2-0691-4d64-bee3-e1bcae3ee915` |
| **org_id** | `00000000-0000-0000-0000-000000000000` |
| **user_id** | `00000000-0000-0000-0000-000000000002` |
| **Status** | `active` |
| **Endereço** | Alameda Andorinhas, 3 - condomínio Le Corsaire - Armação dos Búzios, RJ |
| **CEP** | `28957-720` |
| **Quartos** | 2 |
| **Banheiros** | 3 |
| **Camas** | 2 |
| **Hóspedes** | 4 |
| **Rooms JSONB** | 8 items (vindo do Stays) |
| **Origem** | Importação via Stays.net API |

### Rooms no JSONB (`properties.data.rooms`):
| # | type | typeName | customName | Fotos | Relevante p/ Channex? |
|---|------|----------|------------|-------|----------------------|
| 0 | outras | Outras Dep. | — | 13 fotos | Não (área comum) |
| 1 | outras | Outras Dep. | Piscina | 5 fotos | Não (amenidade) |
| 2 | outras | Outras Dep. | — | 2 fotos | Não |
| 3 | **quarto-duplo** | **Quarto Duplo/Std/Eco** | — | **16 fotos** | **✅ SIM — room_type** |
| 4 | banheiro | Banheiro | — | 6 fotos | Não (dependência) |
| 5 | sala-comum | Sala/Estar | — | 11 fotos | Não (área comum) |
| 6 | outras | Outras Dep. | Cozinha | 13 fotos | Não (amenidade) |
| 7 | outras | Outras Dep. | — | 1 foto | Não |

> ⚠️ **Problemas identificados:**
> 1. Apenas 1 room do tipo `quarto-duplo` — mas `bedrooms: 2`. A Stays registrou apenas 1 quarto.
> 2. `beds: {}` em TODOS os rooms — nenhuma cama definida (importação Stays incompleta)
> 3. `moeda` e `preco_base_noite` estão vazios — precisa definir preço
> 4. `tipo_local` e `tipo_acomodacao` vazios — importação Stays não setou

## 🐛 BUG: Integração Stays.net → Rendizy

**Problema detectado:** A importação de propriedades da API Stays.net apresenta falhas:

1. **Quartos não são mapeados corretamente** — `bedrooms: 2` mas só 1 room do tipo `quarto-duplo` foi criado
2. **Camas vazias** — `beds: {}` em todos os rooms; a Stays tem dados de camas mas não estão sendo importados
3. **Campos de tipo vazios** — `tipo_local`, `tipo_acomodacao` não são setados pela importação
4. **Preços não importados** — `moeda`, `preco_base_noite` vazios
5. **Rooms misturados** — áreas comuns (piscina, cozinha, sala) são importadas como "rooms" junto com quartos reais

**Impacto no Channex:** Como os rooms do Stays ficam no JSONB e `property_rooms` (tabela SQL) está **vazia** (0 registros em produção para TODAS as propriedades), o sync atual (`routes-channex-sync.ts`) que lê de `property_rooms` **não vai funcionar**.

**Ações necessárias (a decidir com o Rafael):**
- [ ] Investigar código de importação Stays para corrigir mapeamento de quartos/camas
- [ ] Decidir: adaptar sync para ler do JSONB `data.rooms` OU popular `property_rooms` a partir do JSONB
- [ ] Identificar em qual tela/componente criar o form de rooms para Channex
- [ ] Criar rate_plan "Standard" automaticamente quando ausente

## Descoberta: property_rooms e rate_plans VAZIOS

| Tabela | Registros | Esperado | Status |
|--------|-----------|----------|--------|
| `property_rooms` | **0** | ~350+ (2 rooms × 175 props) | ❌ Vazio |
| `rate_plans` | **0** | ~175+ (1 rate × 175 props) | ❌ Vazio |
| `properties` | **175** | 175 | ✅ OK |
| `properties.data.rooms` | **JSONB com dados** | N/A | ✅ Tem dados (do Stays) |

**Root cause:** Os dados de rooms ficam dentro do JSONB `properties.data.rooms` (formato do wizard/Stays), mas as tabelas SQL `property_rooms` e `rate_plans` nunca foram populadas.

## Mapeamento Completo: 16 Tabs do FormularioAnuncio

| Tab | Nome | Campos Chave | Relevante p/ Channex? |
|-----|------|-------------|----------------------|
| 1 | Básico | `title`, `tipo_local`, `tipo_acomodacao`, `subtype` | ✅ `title`, `property_type` |
| 2 | Localização | `pais`, `estado`, `cidade`, `rua`, `cep` | ✅ `address`, `city`, `zip`, `country` |
| 3 | Cômodos | `rooms[]`, `bedrooms`, `bathrooms`, `beds`, `guests` | ✅ `room_types`, `occupancy` |
| 4 | Tour/Fotos | `coverPhoto`, `rooms[].photos[]` | ✅ **Photos Collection API** |
| 5 | Amenidades Local | `location_amenities[]` | ✅ **Facilities API** |
| 6 | Amenidades Acomod. | `listing_amenities[]` | ✅ **Facilities API** |
| 7 | Descrição | multilíngue pt/en/es | ✅ `content.description` |
| 8 | Relacionamento | titular, admin, contrato | ❌ Interno Rendizy |
| 9 | Preços Base | aluguel, venda, IPTU | ❌ Locação longa |
| 10 | Config Temporada | `moeda`, depósito, taxas | ✅ `currency`, Taxes API |
| 11 | Preços Individuais | `preco_base_noite`, sazonais | ✅ ARI `rate` |
| 12 | Preços Derivados | extra hóspedes, crianças | Parcial (occupancy rates) |
| 13 | Config Reservas | min/max noites | ✅ ARI `min_stay`, `max_stay` |
| 14 | Config Check-in | horários, instruções | ✅ **Hotel Policy API** |
| 15 | Config Regras | `registrationNumber` | ❌ Placeholder |
| 16 | Config Políticas | cancelamento, integração | ✅ Cancellation policies |

## Hierarquia de Settings (3 Níveis)

```
Organização (Global)          → organization_settings
  └── Listing (Override)      → listing_settings (overrides por seção)
      └── Canal (Per-OTA)     → property_channel_settings (per channel per property)
```

**6 seções configuráveis:**
1. `cancellation_policy` — tipo, porcentagens por prazo, horas sem reembolso
2. `checkin_checkout` — horários de/para, taxas early/late, flex
3. `minimum_nights` — default, weekend, holiday, high season
4. `advance_booking` — min/max dias, same_day
5. `house_rules` — pets, festas, fumantes, silêncio
6. `communication` — auto-confirm, welcome msg, instruções

> Tudo isso mapeável para Channex via **Hotel Policy API** + **ARI restrictions**

---

# � ARQUITETURA RATE PLANS — APROVADA (2026-02-06)

> ⚠️ **DECISÃO APROVADA:** Unificar os 3 sistemas de pricing em uma única fonte de verdade.

## O Problema: 3 Sistemas Desconectados

Antes da decisão, havia **3 sistemas paralelos** que não se comunicavam:

| Sistema | Onde vive | Usado por | Sincroniza OTA? |
|---------|-----------|-----------|------------------|
| **A) Property JSONB** | `properties.data.preco_base_noite` | Reservations, FormularioAnuncio | ❌ |
| **B) calendar_pricing_rules** | Tabela SQL separada | Calendário UI (condition_percent) | ❌ |
| **C) rate_plans** | Tabelas SQL (rate_plans, rate_plan_availability) | Ninguém (tabelas existem mas vazias) | ✅ Arquitetura pronta |

**Problemas identificados:**
- O calendário mostra `basePrice` flat + `condition_percent` separado, mas **não calcula preço efetivo**
- A criação de reservas lê `properties.data.preco_base_noite` e **ignora** `calendar_pricing_rules`
- As tabelas `rate_plans` e `rate_plan_availability` estão **vazias** (0 registros)
- O sync Channex não funciona porque depende de `rate_plans` populado

## A Solução: Fonte de Verdade Única — `rate_plans`

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FONTE DE VERDADE ÚNICA                          │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                       rate_plans (tabela)                        │   │
│   │                                                                  │   │
│   │  - id, property_id, organization_id                             │   │
│   │  - code: 'STANDARD' (default), 'NON_REFUNDABLE', etc            │   │
│   │  - name_pt: "Tarifa Padrão"                                      │   │
│   │  - price_adjustment_type: 'none' | 'percentage' | 'fixed'       │   │
│   │  - price_adjustment_value: 0 (para Standard)                     │   │
│   │  - cancellation_policy_id → FK cancellation_policy_templates    │   │
│   │  - included_amenities: ['wifi', 'breakfast']                     │   │
│   │  - is_default: true (o "Standard" de cada property)              │   │
│   │                                                                  │   │
│   └──────────────────────────────────┬──────────────────────────────┘   │
│                                      │                                   │
│                        ┌─────────────┴─────────────┐                     │
│                        ▼                           ▼                     │
│   ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│   │  rate_plan_availability    │  │  rate_plan_pricing_overrides    │  │
│   │  (diário)                   │  │  (períodos)                      │  │
│   │                             │  │                                  │  │
│   │  - date                     │  │  - date_from, date_to           │  │
│   │  - rate_plan_id             │  │  - rate_plan_id                  │  │
│   │  - property_id              │  │  - override_type: adjustment    │  │
│   │  - price_override ← ⭐      │  │  - price_adjustment_value: +15% │  │
│   │  - min_nights              │  │  - min_nights: 3                 │  │
│   │  - stop_sell, CTA, CTD     │  │  - reason: 'alta temporada'     │  │
│   └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼─────────────────────┐
                 ▼                  ▼                     ▼
   ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────┐
   │  CALENDÁRIO UI      │  │  RESERVATIONS   │  │  OTA SYNC       │
   │                     │  │                 │  │                 │
   │  Lê de:             │  │  Calcula preço  │  │  Exporta para:  │
   │  - rate_plan_       │  │  lendo de:      │  │  - Channex      │
   │    availability     │  │  - rate_plans   │  │  - Airbnb       │
   │  - rate_plan_       │  │  - availability │  │  - Booking      │
   │    pricing_overrides│  │  - overrides    │  │                 │
   │                     │  │                 │  │  Via:           │
   │  Mostra:            │  │                 │  │  ota_rate_plan_ │
   │  - Preço efetivo    │  │                 │  │  _mappings      │
   │  - Min noites       │  │                 │  │                 │
   │  - Restrições       │  │                 │  │                 │
   └─────────────────────┘  └─────────────────┘  └─────────────────┘
```

## Fluxo de Implementação Aprovado

### Passo 1: Auto-criar Rate Plan STANDARD para cada Property

```sql
-- Trigger/script: ao criar property, cria rate_plan STANDARD
INSERT INTO rate_plans (organization_id, property_id, code, name_pt, is_default, is_active)
SELECT 
  p.organization_id,
  p.id,
  'STANDARD',
  'Tarifa Padrão',
  true,  -- is_default
  true   -- is_active
FROM properties p
WHERE NOT EXISTS (
  SELECT 1 FROM rate_plans rp 
  WHERE rp.property_id = p.id AND rp.code = 'STANDARD'
);
```

### Passo 2: Migrar preco_base_noite para Rate Plan

O preço base (`properties.data.preco_base_noite`) continua sendo a **referência visual** no wizard. Mas o rate_plan STANDARD lê desse campo (ou duplica para `rate_plan_pricing_overrides` como override default).

### Passo 3: calendar_pricing_rules → Deprecar

- A tabela `calendar_pricing_rules` será **descontinuada**
- As regras de % e min_nights vão para `rate_plan_availability` + `rate_plan_pricing_overrides`
- O calendário UI será adaptado para ler/escrever nas novas tabelas

### Passo 4: Múltiplos Rate Plans (Futuro)

Usuário pode criar novos rate plans além do STANDARD:

| rate_plan_id | property | code | adjustment | OTA Sync |
|--------------|----------|------|------------|----------|
| uuid1 | João e Gisele | STANDARD | 0% | ✅ Channex, Airbnb, Booking |
| uuid2 | João e Gisele | NON_REFUNDABLE | -15% | ✅ Channex, Booking (Airbnb não) |
| uuid3 | João e Gisele | WITH_BREAKFAST | +20% | ✅ Só Booking |

Cada OTA vê os rate plans via `ota_rate_plan_mappings`:
- `sync_enabled: true/false` por OTA
- `ota_config: JSONB` para config específica de cada canal

## Tabelas Envolvidas (Já Existem em Produção)

| Tabela | Status | Registros | Objetivo |
|--------|--------|-----------|----------|
| `rate_plans` | ✅ Criada | 0 (vazio) | Rate plans por property |
| `rate_plan_availability` | ✅ Criada | 0 (vazio) | Disponibilidade diária |
| `rate_plan_pricing_overrides` | ✅ Criada | 0 (vazio) | Preços por período |
| `ota_rate_plan_mappings` | ✅ Criada | 0 (vazio) | Sync com cada OTA |
| `cancellation_policy_templates` | ✅ Criada | 5 templates | Flexible, Moderate, etc |
| `calendar_pricing_rules` | ⚠️ Deprecar | ? registros | Migrar para rate_plan_* |

## Referência: Documento MODELO_DADOS_UNIVERSAL_OTA

A filosofia vem do documento `Expedia Group API/MODELO_DADOS_UNIVERSAL_OTA.md`:

> **"Rendizy é a Fonte de Verdade"** (Canonical Data)
> - Mapeamentos são configuração, não código
> - Campos opcionais têm defaults sensatos
> - Extensível sem breaking changes
> - Adicionar OTA = adicionar mapeamento, não código novo

---

# �🏗️ ARQUITETURA MULTI-CONTA POR CANAL

## Problema Real

Uma imobiliária (ex: Sua Casa Rende Mais) pode ter:
- **150 imóveis** sob gestão
- **8 contas do Airbnb** conectadas (limite de ~20 listings por conta)
- **N contas do Booking.com**, cada uma com subconjunto de propriedades
- Tudo gerenciado sob **1 organization_id** no Rendizy

## Modelo de Dados: Arquitetura Modular por Canal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RENDIZY ORGANIZATION                                │
│                     (ex: Sua Casa Rende Mais)                               │
│                     organization_id: UUID                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │               channex_accounts (multi-API-key)                        │   │
│  │  Cada imobiliária pode ter N contas Channex (N api keys)             │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ id | org_id | label          | api_key | env     | group_id        │   │
│  │ 1  | ORG1   | "Conta Geral"  | key1    | staging | grp1            │   │
│  │ 2  | ORG1   | "Conta Airbnb" | key2    | prod    | grp2            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │          channex_channel_connections (N contas por OTA)               │   │
│  │  Cada OTA pode ter N logins/contas conectadas                        │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ id | account_id | channel  | label              | channex_ch_id    │   │
│  │ 1  | ACC-1      | airbnb   | "Airbnb Conta 1"   | ch-uuid-1        │   │
│  │ 2  | ACC-1      | airbnb   | "Airbnb Conta 2"   | ch-uuid-2        │   │
│  │ 3  | ACC-1      | airbnb   | "Airbnb Conta 3"   | ch-uuid-3        │   │
│  │ 4  | ACC-1      | booking  | "Booking Principal" | ch-uuid-4        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │      channex_property_mappings (imóvel ↔ property Channex)           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ id | account_id | rendizy_prop_id | channex_prop_id | sync_status  │   │
│  │ 1  | ACC-1      | prop-001        | chx-prop-001    | synced       │   │
│  │ 2  | ACC-1      | prop-002        | chx-prop-002    | synced       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │      channex_listing_connections (listing ↔ canal específico)        │   │
│  │  Qual imóvel está em qual conta de qual OTA                          │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ id | property_map_id | channel_conn_id | ota_listing_id | status   │   │
│  │ 1  | MAP-1           | CONN-1 (airbnb1)| 12345678       | active   │   │
│  │ 2  | MAP-1           | CONN-4 (booking)| 987654         | active   │   │
│  │ 3  | MAP-2           | CONN-2 (airbnb2)| 23456789       | active   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Princípios da Arquitetura

### 1. **Separação por Canal (Não Monolítica)**
```
supabase/functions/rendizy-server/
├── utils-channex.ts               ← ✅ Client base (HTTP, auth, types)
├── routes-channex.ts              ← ✅ Rotas genéricas (test, status, list)
├── routes-channex-sync.ts         ← ✅ Fase 2: CRUD accounts, sync, mappings
├── routes-channex-photos.ts       ← ⏳ Fase 2.5: Sync fotos (Photos Collection API)
├── routes-channex-ari.ts          ← ⏳ ARI sync (Fase 3)
├── routes-channex-webhooks.ts     ← ⏳ Handler de webhooks (Fase 4)
├── routes-channex-airbnb.ts       ← ⏳ Específico Airbnb
├── routes-channex-booking.ts      ← ⏳ Específico Booking.com
└── adapters/
    ├── channex-adapter-base.ts    ← ⏳ Interface base
    ├── channex-adapter-airbnb.ts  ← ⏳ Mapeamento Airbnb
    └── channex-adapter-booking.ts ← ⏳ Mapeamento Booking
```

### 2. **Multi-Account por Organization**
- 1 Organization → N `channex_accounts` (API keys)
- 1 Account → N `channex_channel_connections` (contas OTA)
- 1 Channel Connection → N listings (propriedades naquele canal)

### 3. **Card de OTA no UI**
```
┌─────────────────────────────────────────────────────┐
│ 🏠 Channex: Airbnb                    [Expandir ▼] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Conta: Airbnb Conta 1 (host@email.com)        ✅   │
│   → 18 listings conectados                         │
│   → Última sync: há 5 min                          │
│                                                     │
│ Conta: Airbnb Conta 2 (host2@email.com)       ✅   │
│   → 22 listings conectados                         │
│   → Última sync: há 3 min                          │
│                                                     │
│ Conta: Airbnb Conta 3 (host3@email.com)       ⚠️   │
│   → 15 listings conectados                         │
│   → Erro: Token expirado                           │
│                                                     │
│            [+ Adicionar Conta Airbnb]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4. **Webhook Dispatcher Pattern**
```typescript
// Um webhook por property no Channex → Dispatcher interno
async function handleChannexWebhook(event, payload, propertyId) {
  // 1. Identificar account e organization pelo propertyId
  // 2. Identificar canal de origem (payload.ota_name)
  // 3. Despachar para adapter específico
  switch (payload.ota_name) {
    case 'Airbnb': return airbnbAdapter.handle(event, payload);
    case 'BookingCom': return bookingAdapter.handle(event, payload);
    default: return genericAdapter.handle(event, payload);
  }
}
```

---

# 🎯 FASES DE IMPLEMENTAÇÃO

```
┌──────────────────────────────────────────────────────────────────────┐
│                     ROADMAP CHANNEX - 6 FASES                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  FASE 1 ✅       FASE 2 ✅       FASE 3          FASE 4              │
│  ────────        ────────        ────────        ────────            │
│  Credenciais     Mapping         ARI Push        Webhooks            │
│  & Auth          Entities        & Sync          Bookings            │
│  ✅ 1 dia         ✅ 1 dia         ⏱️ 4 dias        ⏱️ 3 dias            │
│                                                                       │
│                              FASE 5          FASE 6                   │
│                              ────────        ────────                 │
│                              UI Config       Certificação             │
│                              Dashboard       & Go-Live                │
│                              ⏱️ 3 dias        ⏱️ 2 dias                 │
│                                                                       │
│  ═══════════════════════════════════════════════════════════════     │
│  TOTAL ESTIMADO: 17 dias (3-4 semanas)                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 📋 FASE 1: CREDENCIAIS & AUTENTICAÇÃO

**Duração estimada:** 2 dias  
**Dependências:** Nenhuma  
**Status:** ✅ CONCLUÍDA (2026-02-06)

## 1.1 Criar Conta Staging Channex

- [x] Registrar em `staging.channex.io`
- [x] Criar property de teste com rooms e rates
- [x] Gerar API Key de staging
- [x] Salvar credenciais em `.env.local`

## 1.2 Implementar Autenticação ✅

**Arquivo criado:** `supabase/functions/rendizy-server/utils-channex.ts`  
**Header correto:** `user-api-key` (não `x-api-key`)

## 1.3 Rotas API Backend ✅

**Arquivo criado:** `supabase/functions/rendizy-server/routes-channex.ts`  
**Registrado em:** `index.ts` → `registerChannexRoutes(app)`

## 1.4 Testar Conexão ✅

- [x] `GET /channex/properties` → 200 OK (property "Teste" encontrada)
- [x] `POST /room_types` → Room type criado via API
- [x] `POST /rate_plans` → Rate plan criado via API (options.rate=integer)
- [x] `POST /webhooks` → Webhook criado via API (event_mask: *)

## 1.5 Migration: Tabela Multi-Account Channex ✅

> ✅ **EXECUTADA EM PRODUÇÃO** (2026-02-06) — 8 tabelas criadas com sucesso.

**Arquivo:** `supabase/migrations/2026020601_channex_multi_account_architecture.sql`

```sql
-- ============================================================================
-- CHANNEX MULTI-ACCOUNT ARCHITECTURE
-- Uma organização pode ter N contas Channex (N API keys)
-- Cada conta pode ter N canais OTA conectados
-- Cada canal pode ter N listings
-- ============================================================================

-- 1. Contas Channex por organização
CREATE TABLE IF NOT EXISTS channex_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Identificação
  label TEXT NOT NULL,                      -- "Conta Principal", "Conta Airbnb 2"
  
  -- Credenciais
  api_key TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'staging' CHECK (environment IN ('staging', 'production')),
  
  -- Channex IDs
  channex_group_id TEXT,                    -- Group UUID no Channex
  channex_user_id TEXT,                     -- User UUID no Channex
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_connection_test_at TIMESTAMPTZ,
  last_connection_status TEXT,              -- 'ok', 'error', 'unauthorized'
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, label)
);

-- 2. Conexões de canal (contas OTA) por account
CREATE TABLE IF NOT EXISTS channex_channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES channex_accounts(id) ON DELETE CASCADE,
  
  -- Identificação
  channel_code TEXT NOT NULL,               -- 'airbnb', 'booking', 'expedia', etc.
  label TEXT NOT NULL,                      -- "Airbnb Conta 1", "Booking Principal"
  
  -- Channex IDs
  channex_channel_id TEXT,                  -- Channel UUID no Channex
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'pending',       -- 'synced', 'error', 'pending'
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Metadata
  ota_account_email TEXT,                   -- Email da conta na OTA
  ota_account_name TEXT,                    -- Nome na OTA
  listings_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mapeamento de Properties
CREATE TABLE IF NOT EXISTS channex_property_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES channex_accounts(id) ON DELETE CASCADE,
  
  -- Mapeamento
  rendizy_property_id UUID NOT NULL REFERENCES properties(id),
  channex_property_id TEXT NOT NULL,
  
  -- Status
  sync_status TEXT DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rendizy_property_id),
  UNIQUE(account_id, channex_property_id)
);

-- 4. Mapeamento de Room Types
CREATE TABLE IF NOT EXISTS channex_room_type_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_mapping_id UUID NOT NULL REFERENCES channex_property_mappings(id) ON DELETE CASCADE,
  
  rendizy_room_id UUID NOT NULL REFERENCES property_rooms(id),
  channex_room_type_id TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rendizy_room_id),
  UNIQUE(property_mapping_id, channex_room_type_id)
);

-- 5. Mapeamento de Rate Plans
CREATE TABLE IF NOT EXISTS channex_rate_plan_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_mapping_id UUID NOT NULL REFERENCES channex_room_type_mappings(id) ON DELETE CASCADE,
  
  rendizy_rate_plan_id UUID NOT NULL REFERENCES rate_plans(id),
  channex_rate_plan_id TEXT NOT NULL,
  
  -- Config
  sell_mode TEXT DEFAULT 'per_room',
  currency TEXT DEFAULT 'BRL',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rendizy_rate_plan_id),
  UNIQUE(room_type_mapping_id, channex_rate_plan_id)
);

-- 6. Conexão listing ↔ canal OTA
CREATE TABLE IF NOT EXISTS channex_listing_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_mapping_id UUID NOT NULL REFERENCES channex_property_mappings(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channex_channel_connections(id) ON DELETE CASCADE,
  
  -- IDs na OTA
  ota_listing_id TEXT,                      -- ID do anúncio na OTA (ex: Airbnb listing ID)
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(property_mapping_id, channel_connection_id)
);

-- 7. Webhooks registrados
CREATE TABLE IF NOT EXISTS channex_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES channex_accounts(id) ON DELETE CASCADE,
  property_mapping_id UUID REFERENCES channex_property_mappings(id),
  
  channex_webhook_id TEXT NOT NULL,
  event_mask TEXT NOT NULL DEFAULT '*',
  callback_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  send_data BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Logs de webhooks recebidos  
CREATE TABLE IF NOT EXISTS channex_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES channex_accounts(id),
  property_mapping_id UUID REFERENCES channex_property_mappings(id),
  
  event_type TEXT NOT NULL,
  event_id TEXT,
  channex_property_id TEXT,
  ota_name TEXT,
  
  payload JSONB NOT NULL,
  
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Resultado
  result_type TEXT,          -- 'reservation_created', 'reservation_updated', etc.
  result_id TEXT,            -- ID da entidade criada/atualizada
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE channex_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_room_type_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_rate_plan_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_listing_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channex_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (via organization_id)
CREATE POLICY "Users access own org channex accounts" ON channex_accounts
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- Índices para performance
CREATE INDEX idx_chx_accounts_org ON channex_accounts(organization_id);
CREATE INDEX idx_chx_channels_account ON channex_channel_connections(account_id);
CREATE INDEX idx_chx_prop_map_account ON channex_property_mappings(account_id);
CREATE INDEX idx_chx_wh_logs_created ON channex_webhook_logs(created_at DESC);
CREATE INDEX idx_chx_wh_logs_processed ON channex_webhook_logs(processed) WHERE NOT processed;
```

---

# 📋 FASE 2: MAPPING DE ENTIDADES

**Duração estimada:** 3 dias  
**Duração real:** 1 dia  
**Dependências:** Fase 1 completa ✅  
**Status:** ✅ CONCLUÍDA (2026-02-06)

> **NOTA:** As tabelas de mapeamento foram definidas na migration da Fase 1.
> A Fase 2 implementou todos os endpoints de sync + CRUD de accounts.

## 2.1 Migration Executada ✅

- [x] Rodar migration `2026020601_channex_multi_account_architecture.sql` no Supabase
- [x] Verificar todas 8 tabelas criadas ✅ (confirmado via SQL Editor)
- [x] Verificar RLS e índices ✅ (16 policies + 18 indexes)

## 2.2 Arquivo Criado: `routes-channex-sync.ts` ✅

**Arquivo:** `supabase/functions/rendizy-server/routes-channex-sync.ts`  
**Registrado em:** `index.ts` → `registerChannexSyncRoutes(app)`

### Endpoints Implementados (15 rotas):

| Método | Endpoint | Função |
|--------|----------|--------|
| POST | `/channex/accounts` | Criar conta Channex (API key) |
| GET | `/channex/accounts` | Listar contas da org |
| PUT | `/channex/accounts/:id` | Atualizar conta |
| DELETE | `/channex/accounts/:id` | Deletar conta (cascade) |
| POST | `/channex/accounts/:id/test` | Testar conexão |
| POST | `/channex/accounts/:accountId/sync-property` | Sync property → Channex |
| POST | `/channex/accounts/:accountId/sync-rooms` | Sync rooms → room_types |
| POST | `/channex/accounts/:accountId/sync-rate-plans` | Sync rate plans |
| POST | `/channex/accounts/:accountId/full-sync` | **Sync completo** (prop+rooms+rates) |
| GET | `/channex/accounts/:accountId/mappings` | Ver mapeamentos (nested) |
| POST | `/channex/accounts/:accountId/channels` | Registrar conexão OTA |
| GET | `/channex/accounts/:accountId/channels` | Listar conexões OTA |
| POST | `/channex/listings` | Conectar listing a canal |
| GET | `/channex/accounts/:accountId/listings` | Listar listings |

### Helper interno:
- `getClientForAccount(supabase, accountId, orgId)` — Cria ChannexClient com API key da conta específica

## 2.3 Mapeamento de Campos Property ✅

| Campo Channex | Campo Rendizy | Mapeamento |
|---------------|---------------|------------|
| `title` | `properties.data.name \|\| data.title` | JSONB |
| `currency` | `properties.data.pricing.currency` | JSONB → `mapCurrencyToChannex()` |
| `timezone` | `properties.data.timezone \|\| 'America/Sao_Paulo'` | JSONB |
| `address` | `properties.data.address.street` | JSONB |
| `zip` | `properties.data.address.postalCode` | JSONB |
| `city` | `properties.data.address.city` | JSONB |
| `country` | `properties.data.address.country` | JSONB → `mapCountryToISO()` |
| `email` | `properties.data.contact.email` | JSONB |
| `phone` | `properties.data.contact.phone` | JSONB |
| `latitude` | `properties.data.location.lat` | JSONB |
| `longitude` | `properties.data.location.lng` | JSONB |

## 2.4 Mapeamento de Campos Room Type ✅

| Campo Channex | Campo Rendizy | Mapeamento |
|---------------|---------------|------------|
| `title` | `property_rooms.name` | Direto |
| `property_id` | `channex_property_mappings.channex_property_id` | Lookup |
| `count_of_rooms` | `1` | Constante |
| `occ_base` | `property_rooms.standard_occupancy \|\| max_adults` | Direto |
| `occ_max` | `property_rooms.max_occupancy \|\| max_adults` | Direto |
| `default_occupancy` | `property_rooms.standard_occupancy \|\| 2` | Direto |

## 2.5 Mapeamento de Campos Rate Plan ✅

| Campo Channex | Campo Rendizy | Mapeamento |
|---------------|---------------|------------|
| `title` | `rate_plans.name_pt \|\| name_en \|\| code` | Direto |
| `room_type_id` | `channex_room_type_mappings.channex_room_type_id` | Lookup |
| `currency` | `rate_plans.deposit_currency \|\| 'BRL'` | Direto |
| `sell_mode` | `'per_room'` | Constante |
| `rate_mode` | `'manual'` | Constante |
| `options` | `[{occupancy: 2, is_primary: true, rate: 0}]` | ⚠️ rate=0 (via ARI na Fase 3) |

> **⚠️ IMPORTANTE:** O `rate` no rate_plan options é `0` (placeholder). Os preços reais
> são enviados via ARI updates (Fase 3), que é o padrão recomendado pelo Channex.

## 2.6 Fluxo Típico de Uso ✅

```
1. POST /channex/accounts          → Registrar API key
2. POST /channex/accounts/:id/test → Validar conexão
3. POST /channex/accounts/:id/full-sync {propertyId} → Sync completo
   ├── Step 1: Property → Channex (create/update)
   ├── Step 2: Rooms → Room Types (create/update each)
   └── Step 3: Rate Plans → Rate Plans (create/update per room)
4. POST /channex/accounts/:id/channels → Registrar conta OTA
5. POST /channex/listings → Conectar property a canal
```

## 2.7 Alterações em Arquivos Existentes ✅

| Arquivo | Alteração |
|---------|----------|
| `utils-channex.ts` | Adicionada interface `ChannexRatePlanOption` (occupancy, is_primary, rate) |
| `routes-channex.ts` | `syncProperty()` marcado `@deprecated` — redireciona para multi-account |
| `index.ts` | Adicionado import + `registerChannexSyncRoutes(app)` |

---

# 📋 FASE 3: ARI PUSH & SYNC

**Duração estimada:** 4 dias  
**Dependências:** Fase 2 completa  
**Status:** ⏳ Não iniciado

## 3.1 Entender ARI (Availability, Rates, Inventory)

```
ARI = Availability (disponibilidade) 
    + Rates (preços) 
    + Inventory (restrições)

┌───────────────────────────────────────────────────────────────┐
│                    CHANNEX ARI UPDATE                         │
├───────────────────────────────────────────────────────────────┤
│  POST /ari/updates                                            │
│                                                               │
│  {                                                            │
│    "room_type_id": "xxx",                                    │
│    "date_from": "2026-02-10",                                │
│    "date_to": "2026-02-15",                                  │
│    "availability": 2,          ← Quartos disponíveis         │
│    "rate_plan_id": "yyy",                                    │
│    "rate": 350.00,             ← Preço por noite            │
│    "min_stay_arrival": 2,      ← Mínimo de noites           │
│    "stop_sell": false,         ← Bloquear vendas            │
│    "closed_to_arrival": false  ← Fechar para check-in       │
│  }                                                            │
└───────────────────────────────────────────────────────────────┘
```

## 3.2 Rate Limits

⚠️ **IMPORTANTE:** Channex tem limites de requisição:
- **20 req/min total** para ARI
- **10 req/min** para Restrições e Preços (por property)
- **10 req/min** para Disponibilidade (por property)

**Estratégia:** Usar batching (até 10MB por chamada JSON)

## 3.3 Implementar Sync Inicial (Full Sync)

**Arquivo:** `supabase/functions/rendizy-server/routes-channex-ari.ts`

```typescript
// Estrutura da função
async function fullARISync(propertyId: string, credentials: ChannexCredentials) {
  // 1. Buscar property e mappings
  // 2. Buscar calendário (pricing_rules, blocks)
  // 3. Converter para formato Channex
  // 4. Enviar em batches respeitando rate limit
  // 5. Logar resultado em ota_sync_logs
}
```

## 3.4 Implementar Sync Incremental

Quando houver alteração no calendário Rendizy:
1. Detectar mudança (trigger ou webhook interno)
2. Calcular delta (apenas datas afetadas)
3. Enviar update para Channex

## 3.5 Campos ARI a Sincronizar

| Campo Channex | Origem Rendizy | Tabela |
|---------------|----------------|--------|
| `availability` | Calcular (quartos - reservas - bloqueios) | `reservations`, `calendar_blocks` |
| `rate` | `pricing_rules.price` ou `properties.data.pricing.basePrice` | `pricing_rules` |
| `min_stay_arrival` | `properties.data.restrictions.minNights` | `properties` |
| `max_stay` | `properties.data.restrictions.maxNights` | `properties` |
| `stop_sell` | `calendar_blocks.type = 'blocked'` | `calendar_blocks` |
| `closed_to_arrival` | `pricing_rules.closed_to_arrival` | `pricing_rules` |
| `closed_to_departure` | `pricing_rules.closed_to_departure` | `pricing_rules` |

---

# 📋 FASE 4: WEBHOOKS & BOOKINGS

**Duração estimada:** 3 dias  
**Dependências:** Fase 3 completa  
**Status:** ⏳ Não iniciado

## 4.1 Configurar Webhooks no Channex

No painel Channex, configurar endpoint para receber:
- `booking.created` 
- `booking.modified`
- `booking.cancelled`
- `ari.updated` (opcional)

**Endpoint Rendizy:** `POST /api/webhooks/channex`

## 4.2 Migration: Logs de Webhooks Channex

**Arquivo:** `supabase/migrations/2026020603_channex_webhooks.sql`

```sql
-- Logs de webhooks Channex
CREATE TABLE IF NOT EXISTS channex_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Evento
  event_type TEXT NOT NULL,
  event_id TEXT UNIQUE,
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Processamento
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Resultado
  reservation_id TEXT REFERENCES reservations(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_channex_wh_event_type ON channex_webhook_logs(event_type);
CREATE INDEX idx_channex_wh_processed ON channex_webhook_logs(processed);
CREATE INDEX idx_channex_wh_created ON channex_webhook_logs(created_at DESC);
```

## 4.3 Implementar Handler de Webhooks

**Arquivo:** `supabase/functions/rendizy-server/routes-channex-webhooks.ts`

```typescript
// Eventos suportados
type ChannexWebhookEvent = 
  | 'booking.created'
  | 'booking.modified'
  | 'booking.cancelled';

async function handleChannexWebhook(event: ChannexWebhookEvent, payload: any) {
  // 1. Logar evento em channex_webhook_logs
  // 2. Validar payload
  // 3. Processar conforme tipo
  // 4. Criar/atualizar reserva no Rendizy
  // 5. Marcar como processado
}
```

## 4.4 Mapeamento de Booking Channex → Reserva Rendizy

| Campo Channex | Campo Rendizy | Tabela |
|---------------|---------------|--------|
| `reservation_id` | `reservations.external_id` | `reservations` |
| `hotel_code` | Lookup → `properties.id` | `channex_property_mappings` |
| `arrival_date` | `reservations.check_in` | `reservations` |
| `departure_date` | `reservations.check_out` | `reservations` |
| `customer.name` | `crm_contacts.first_name` | `crm_contacts` |
| `customer.surname` | `crm_contacts.last_name` | `crm_contacts` |
| `customer.mail` | `crm_contacts.email` | `crm_contacts` |
| `customer.phone` | `crm_contacts.phone` | `crm_contacts` |
| `rooms[].room_type_code` | Lookup → `property_rooms.id` | `channex_room_type_mappings` |
| `rooms[].occupancy.adults` | `reservations.adults` | `reservations` |
| `currency` | `reservations.currency` | `reservations` |
| `rooms[].days[].price` | `reservation_pricing_breakdown` | `reservation_pricing_breakdown` |
| `ota_name` | `reservations.source` | `reservations` |

## 4.5 Criar Reservas no Channex (Push)

Para reservas criadas no Rendizy (booking engine):

**Endpoint:** `POST /channel_webhooks/open_channel/new_booking`

---

# 📋 FASE 5: UI & DASHBOARD

**Duração estimada:** 3 dias  
**Dependências:** Fase 4 completa  
**Status:** ⏳ Não iniciado

## 5.1 Componente de Configuração Channex

**Arquivo:** `components/settings/ChannexIntegration.tsx`

### Abas do Componente:

#### Aba 1: Credenciais
- Input API Key (password field)
- Select Ambiente (Staging/Production)
- Botão "Testar Conexão"
- Status da última sync

#### Aba 2: Mapeamento de Properties
- Lista de properties Rendizy
- Para cada: Property ID Channex (input ou selector)
- Status de sync (ícone verde/amarelo/vermelho)
- Botão "Sincronizar Agora"

#### Aba 3: Mapeamento de Rooms/Rates
- Seletor de Property
- Grid mostrando:
  - Room Rendizy ↔ Room Type Channex
  - Rate Plan Rendizy ↔ Rate Plan Channex
- Botão "Auto-mapear" (quando IDs coincidem)

#### Aba 4: Logs de Sync
- Tabela com últimas syncs
- Filtro por status (sucesso/erro)
- Detalhes de erros

#### Aba 5: Webhooks
- URL do webhook (read-only, para copiar)
- Secret (se aplicável)
- Lista de eventos recebidos
- Status de processamento

## 5.2 Dashboard de Status OTA

Adicionar card no Dashboard principal:

```
┌────────────────────────────────────────────────┐
│ 🔗 Channex - Status de Integração              │
├────────────────────────────────────────────────┤
│                                                │
│ Properties conectadas:  3/5                    │
│ Última sync:            há 2 min ✅            │
│ Reservas hoje:          2 novas                │
│                                                │
│ [Ver detalhes]  [Sincronizar agora]           │
└────────────────────────────────────────────────┘
```

## 5.3 Atualizar SettingsManager

Adicionar card "Channex" na seção de integrações (já preparado na sessão anterior).

---

# 📋 FASE 6: CERTIFICAÇÃO & GO-LIVE

**Duração estimada:** 2 dias  
**Dependências:** Fases 1-5 completas  
**Status:** ⏳ Não iniciado

## 6.1 Cenários de Teste Channex

Para certificação PMS, Channex exige:

| # | Cenário | Descrição | Status |
|---|---------|-----------|--------|
| 1 | Full Data Update | Enviar carga completa de ARI | ⬜ |
| 2 | Single Date Update | Atualizar apenas 1 data | ⬜ |
| 3 | Stop Sell | Fechar vendas para período | ⬜ |
| 4 | Close to Arrival | Bloquear check-ins | ⬜ |
| 5 | Receive Booking | Receber nova reserva | ⬜ |
| 6 | Modify Booking | Receber modificação | ⬜ |
| 7 | Cancel Booking | Receber cancelamento | ⬜ |
| 8 | Rate Limits | Respeitar limites de API | ⬜ |

## 6.2 Checklist de Go-Live

- [ ] Todos cenários de teste passando
- [ ] Credenciais de produção obtidas
- [ ] Migrar environmental variables
- [ ] Configurar webhook de produção
- [ ] Fazer full sync inicial em produção
- [ ] Monitorar primeiras 24h
- [ ] Documentar runbook de operações

## 6.3 Monitoramento Pós-Go-Live

- [ ] Alertas para erros de sync
- [ ] Dashboard de health check
- [ ] Relatório diário de reservas via Channex
- [ ] Auditoria semanal de divergências

---

# 📊 CRONOGRAMA VISUAL

```
Semana 1 (CONCLUÍDA)             Semana 2                    Semana 3
═══════════════════════     ═══════════════════════     ═══════════════════════
│ Fase 1 ✅ │ Fase 2 ✅│     │ Fase 3              │     │ Fase 4    │ Fase 5  │
│ Auth      │ Sync    │     │ ARI Sync            │     │ Webhooks  │ UI      │
│ 1 dia     │ 1 dia   │     │ 4 dias              │     │ 3 dias    │ 3 dias  │
└───────────┴─────────┘     └─────────────────────┘     └───────────┴─────────┘
                                                                      
                                                        Semana 4
                                                        ═══════════════════════
                                                        │ Fase 6              │
                                                        │ Certificação        │
                                                        │ 2 dias              │
                                                        └─────────────────────┘
```

---

# 🚨 RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rate limiting Channex | Alta | Médio | Implementar batching + exponential backoff |
| Mapeamento de amenidades | Média | Médio | Usar tabela `ota_amenity_mappings` existente |
| Divergência de preços | Média | Alto | Implementar reconciliação diária |
| Webhook perdido | Baixa | Alto | Implementar polling como fallback (booking_revisions/feed) |
| Dados de cartão (PCI) | Baixa | Crítico | Usar endpoint `secure.channex.io` |

---

# ✅ PRÓXIMOS PASSOS IMEDIATOS

## Concluídos
1. **✅ Concluído:** Conta staging criada + property/rooms/rates de teste
2. **✅ Concluído:** Fase 1 — Credenciais, auth, client base (`utils-channex.ts`)
3. **✅ Concluído:** Fase 1.5 — Migration multi-account (8 tabelas em produção)
4. **✅ Concluído:** Fase 2 — Sync endpoints (`routes-channex-sync.ts`, 15 rotas)
5. **✅ Concluído:** Diagnóstico pré-Fase 3 — estudei 16 tabs, 3 níveis settings, mapeei todos os campos
6. **✅ Concluído:** Leitura completa do MODELO_DADOS_UNIVERSAL_OTA.md e arquitetura OTA
7. **✅ Concluído:** Análise dos 3 sistemas de pricing desconectados
8. **✅ APROVADO:** Arquitetura de Rate Plans unificada (ver seção dedicada acima)

## Descobertas Críticas
- **🔬 property_rooms e rate_plans vazios:** 0 registros. Dados de rooms ficam em `data.rooms` JSONB
- **🔬 Três sistemas de pricing desconectados:** Property JSONB, calendar_pricing_rules, rate_plans
- **🐛 Bug Stays.net:** Importação não popula quartos/camas corretamente
- **📸 Channex TEM Photos API:** Sync de fotos é possível e necessário
- **🧪 Propriedade de teste:** João e Gisele - Búzios RJ (`dfe3d5d2`)

## Em Andamento — Fase 2.5: Unificação Rate Plans
9. **✅ Concluído:** Auto-criar rate_plan STANDARD para cada property existente (**201 criados**, migração `2026020701`)
   - Trigger criado para auto-criar em novas properties
   - Funções `calculate_effective_price()` e `get_default_rate_plan_id()` criadas
   - View `v_property_pricing` criada para consultas
   - Rate plan João e Gisele: `cee6c0fe-f50b-4d94-90e9-f53529e8c336`
10. **✅ Concluído:** Migração `2026020702_migrate_calendar_pricing_to_rate_plans.sql`
    - 1000 pricing_overrides migrados de calendar_pricing_rules
11. **✅ Concluído:** Migração `2026020703_calculate_stay_price_function.sql`
    - Função `calculate_stay_price()` criada
12. **✅ Concluído:** Migração `2026020704_fix_calculate_stay_price.sql`
    - Corrigido para ler preço de `properties.data.preco_base_noite`
13. **✅ Concluído:** Adaptar `routes-reservations.ts` para usar rate_plans
    - Nova função `getStayPriceFromRatePlan()` que chama `calculate_stay_price` via RPC
    - `createReservation` e `updateReservation` com fallback legado
14. **✅ Testado:** Cálculo de preço João e Gisele: 7 noites × R$200 = **R$1.400** + R$130 (limpeza) = **R$1.530**
15. **✅ Criado:** Script `scripts/Run-SupabaseSql.ps1` para executar migrations via API
16. **✅ Removidos:** Scripts obsoletos `apply-calendar-rules-migration*.ps1`
17. **🟡 MAPEADO:** Composição de Preço Total (ver seção abaixo)
18. **⚠️ REQUER SUPERVISÃO:** Adaptar calendário UI para rate_plan_availability
    - `hooks/useCalendarPricingRules.ts` lê/escreve em calendar_pricing_rules
    - Precisa adaptar para rate_plan_availability + rate_plan_pricing_overrides
    - **IMPACTO:** Mudança de backend (hooks) — **TELA PERMANECE IGUAL**
    - Ver seção "Impacto Calendário UI" abaixo
19. **🔄 Próximo:** Deprecar calendar_pricing_rules após validar nova arquitetura
20. **🔄 Próximo:** Sync ARI para Channex (Fase 3) — agora viável com rate_plans populado
21. **✅ Concluído:** Migration `2026020706_populate_organization_settings_defaults.sql`
    - Populou defaults para todas as organizações que não tinham settings
    - 12 seções de settings: cancellation_policy, checkin_checkout, minimum_nights, maximum_nights, advance_booking, house_rules, preparation_time, instant_booking, communication, deposit, security_deposit, special_fees
22. **✅ Concluído:** Backend `utils-settings.ts` atualizado com 12 seções
    - `DEFAULT_SETTINGS` expandido com novos campos (baseado em FUNCTIONAL_MAPPING_OTA_FIELDS.md)
    - `mergeSettings()` atualizado para fazer merge de todas as seções
    - **Tela Settings Global agora funciona com dados reais do banco**
23. **✅ Concluído:** Migration `2026020707_fix_organization_settings_field_names.sql`
    - Alinhados nomes de campos `security_deposit` para match frontend (`amount`, `required_for_all`, `refund_days_after_checkout`, `payment_method`)
    - Adicionada seção `additional_fees` para compatibilidade (cleaning_fee, service_fee_percentage, etc.)
    - Executada via supabase-js — 4 organizações atualizadas
24. **✅ Concluído:** Frontend `GlobalSettingsManager.tsx` expandido com 4 tabs funcionais
    - Tab **Antecedência** (advance_booking): min_hours, max_days, same_day, last_minute_cutoff
    - Tab **Taxas** (additional_fees): cleaning_fee, service_fee_percentage, passthrough
    - Tab **Regras** (house_rules): no_smoking, no_parties, no_pets, quiet_hours, children
    - Tab **Comunicação** (communication): auto_confirm, welcome, checkin, checkout, review, idioma
    - Interface TypeScript atualizada com todos os campos do backend
25. **✅ Concluído:** Frontend `GlobalSettingsManager.tsx` — Todas 13 seções funcionais
    - Tab **Noites** agora inclui: minimum_nights + maximum_nights
    - Tab **Depósito** agora inclui: deposit (sinal 30%) + security_deposit (caução R$500)
    - Tab **Antecedência** agora inclui: advance_booking + preparation_time + instant_booking
    - Tab **Taxas** agora inclui: additional_fees + special_fees (early/late checkout)
26. **✅ Concluído:** Novo hook `useCalendarAvailability.ts` (V3 Rate Plans)
    - Lê de `rate_plan_availability` + `rate_plan_pricing_overrides`
    - Interface compatível com `CalendarPricingRule` para transição suave
    - Optimistic updates + debounce 500ms + batch queue (mesma arquitetura V2.1)
    - Feature flag `USE_V3_RATE_PLANS` no hook antigo para ativação gradual
27. **✅ Concluído:** Edge Function `/calendar-availability/batch`
    - Nova rota em `routes-calendar-availability-batch.ts`
    - Escreve em `rate_plan_availability` (restrições) + `rate_plan_pricing_overrides` (ajustes %)
    - Rotas registradas: GET/POST `/calendar-availability/batch`
28. **✅ Concluído:** Fix trigger `log_reservation_changes()` (causava erro 500 no cancelamento)
    - Migração `2026020708_fix_log_reservation_changes_trigger.sql`
    - Corrigido mapeamento de colunas: `event_type` → `change_type`, `previous_data` → `old_values`, etc.
    - **Cancelamento de reservas funcionando** ✅
29. **✅ Concluído:** Limpeza de migrations lixo
    - Removidas 6 migrations problemáticas/obsoletas
    - Migrations restantes: organizadas e funcionais
30. **✅ Concluído:** Schema dump completo do banco
    - Arquivo: `supabase/schema_dump_2026_02_06.sql` (753 KB)
    - Documentação: `docs/database/SCHEMA_REFERENCE_2026_02_06.md`
    - Total: **203 tabelas** organizadas por domínio

---

## ⚙️ CONFIGURAÇÕES GLOBAIS — STATUS (2026-02-06)

### Campos Implementados (13 seções) — ✅ TODOS FUNCIONAIS

| # | Seção | Backend | Frontend | Tab | Channex API |
|---|-------|---------|----------|-----|-------------|
| 1 | `cancellation_policy` | ✅ | ✅ | Cancelamento | Hotel Policy |
| 2 | `checkin_checkout` | ✅ | ✅ | Check-in/out | Hotel Policy |
| 3 | `minimum_nights` | ✅ | ✅ | Noites | ARI min_stay |
| 4 | `maximum_nights` | ✅ | ✅ | Noites | ARI max_stay |
| 5 | `advance_booking` | ✅ | ✅ | Antecedência | ARI restrictions |
| 6 | `preparation_time` | ✅ | ✅ | Antecedência | ARI offset |
| 7 | `instant_booking` | ✅ | ✅ | Antecedência | - |
| 8 | `house_rules` | ✅ | ✅ | Regras | Hotel Policy |
| 9 | `communication` | ✅ | ✅ | Comunicação | - |
| 10 | `deposit` | ✅ | ✅ | Depósito | - |
| 11 | `security_deposit` | ✅ | ✅ | Depósito | - |
| 12 | `additional_fees` | ✅ | ✅ | Taxas | Taxes API |
| 13 | `special_fees` | ✅ | ✅ | Taxas | Taxes API |

**Status:** 🎉 **Configurações 100% funcional** — todos os campos leem/escrevem do banco

---

## 💰 COMPOSIÇÃO DE PREÇO TOTAL — MAPEAMENTO

> ⚠️ **REGRA:** Taxa de limpeza é **sempre inclusa na primeira diária**

### Componentes do Preço Final

| # | Componente | Fonte | Obrigatório | Aplicação |
|---|------------|-------|-------------|-----------|
| 1 | **Preço Base por Noite** | `properties.data.preco_base_noite` | ✅ | × número de noites |
| 2 | **Ajuste Rate Plan** | `rate_plans.price_adjustment_value` | ❌ | % sobre base (ex: NON_REFUNDABLE -15%) |
| 3 | **Override por Data** | `rate_plan_pricing_overrides` | ❌ | % ou valor fixo por período |
| 4 | **Taxa de Limpeza** | `properties.data.taxa_limpeza` | ✅ | Somada à primeira diária |
| 5 | **Taxa de Pet** | `properties.data.taxa_pet` | ❌ | Por estadia |
| 6 | **Taxa Serviços Extras** | `properties.data.taxa_servicos_extras` | ❌ | Por estadia |
| 7 | **Acréscimo Hóspedes Extras** | `properties.data.taxa_hospede_extra` | ❌ | × hóspedes acima do base |
| 8 | **Desconto por Pacote** | `discount_packages` via org settings | ❌ | % por min_nights (7d, 14d, 28d) |

### Fórmula de Cálculo

```
PREÇO_FINAL = 
  (BASE × NOITES) 
  + AJUSTE_RATE_PLAN 
  + OVERRIDES_POR_DATA
  + TAXA_LIMPEZA (1ª diária)
  + TAXA_PET (se pet)
  + TAXA_SERVICOS
  + (HOSPEDES_EXTRAS × TAXA_HOSPEDE_EXTRA)
  - DESCONTO_PACOTE (se aplicável)
```

### Exemplo: João e Gisele (7 noites, 2 adultos, sem pets)

| Item | Cálculo | Valor |
|------|---------|-------|
| Base | R$200 × 7 noites | R$1.400 |
| Taxa Limpeza | Inclusa na 1ª diária | R$130 |
| **TOTAL** | | **R$1.530** |

### Próximos Passos — Composição de Preço

1. **Adaptar `calculate_stay_price()` SQL** para incluir taxa de limpeza automática
2. **Adaptar `routes-reservations.ts`** para somar taxa de limpeza ao total
3. **Mapear taxa de hóspedes extras** no cálculo
4. **Mapear descontos por pacote** (7d 2%, 14d 4%, 28d 8% conforme calendário mostra)
5. **Sync para Channex:** Enviar preço total (base + fees) ou base separado conforme OTA

---

## 📅 IMPACTO CALENDÁRIO UI — Adaptar para rate_plan_availability

### O que a tela mostra hoje (screenshot):

| Linha | Campo | Fonte Atual | Nova Fonte |
|-------|-------|-------------|------------|
| % Condição (%) | condition_percent | calendar_pricing_rules | rate_plan_pricing_overrides |
| Restrições | restriction | calendar_pricing_rules | rate_plan_availability.is_closed, CTA, CTD |
| Min. noites | min_nights | calendar_pricing_rules | rate_plan_availability.min_nights |
| Base (R$) | preco_base_noite | properties.data | properties.data (não muda) |
| Semanal 07d | calculado | -2% sobre base | discount_packages 7d |
| Personalizado 14d | calculado | -4% sobre base | discount_packages 14d |
| Mensal 28d | calculado | -8% sobre base | discount_packages 28d |

### Impacto Técnico

| Aspecto | Impacto | Mudança Necessária |
|---------|---------|-------------------|
| **Visual da tela** | ✅ NENHUM | A tela permanece idêntica |
| **UX do usuário** | ✅ NENHUM | Fluxo igual |
| **Hook `useCalendarPricingRules.ts`** | ✅ Feito | Novo hook `useCalendarAvailability.ts` criado, flag `USE_V3_RATE_PLANS` |
| **API endpoints** | ✅ Feito | Nova rota `/calendar-availability/batch` para rate_plan_* |
| **Testes** | 🔄 Necessários | Ativar flag, testar leitura/escrita nas novas tabelas |

### Recomendação

A mudança é **apenas de backend (hooks e queries)** — a tela mostra os mesmos dados, apenas lidos de tabelas diferentes. Não requer redesign de UI.

**Para ativar novo sistema:**
1. Abrir `hooks/useCalendarPricingRules.ts`
2. Mudar `USE_V3_RATE_PLANS = true`
3. Testar calendário (leitura/escrita)
4. Após validação, remover hook antigo

---

## Próximas Fases
13. **Fase 3:** ARI Push (disponibilidade, preços, restrições) — agora funciona porque rate_plans estará populado
14. **Fase 4:** Webhooks & Bookings
15. **Fase 5:** UI Dashboard Channex
16. **Fase 6:** PMS Certification (14 testes, conta Booking.com teste)

---

# 📎 ANEXOS

## A. Códigos de OTAs Channex

Principais OTAs disponíveis via Channex:
- `booking` - Booking.com
- `airbnb` - Airbnb
- `expedia` - Expedia Group
- `vrbo` - VRBO
- `agoda` - Agoda
- `trip_com` - Trip.com
- `google` - Google Vacation Rentals
- `hostelworld` - Hostelworld

## B. Exemplos de Payloads

### Criar Property no Channex
```json
{
  "property": {
    "title": "Apartamento Copacabana",
    "currency": "BRL",
    "timezone": "America/Sao_Paulo",
    "address": "Av. Atlântica, 1000",
    "zip": "22010-000",
    "city": "Rio de Janeiro",
    "country": "BR",
    "email": "reservas@exemplo.com",
    "phone": "+5521999999999"
  }
}
```

### Update ARI
```json
{
  "values": [
    {
      "property_id": "xxx",
      "room_type_id": "yyy",
      "rate_plan_id": "zzz",
      "date_from": "2026-02-10",
      "date_to": "2026-02-15",
      "availability": 2,
      "rate": 350.00,
      "min_stay_arrival": 2,
      "stop_sell": false
    }
  ]
}
```

### Webhook: Nova Reserva
```json
{
  "event": "booking.created",
  "payload": {
    "reservation_id": "CHX-123456",
    "hotel_code": "PROP-001",
    "ota_name": "booking",
    "arrival_date": "2026-02-15",
    "departure_date": "2026-02-18",
    "currency": "BRL",
    "customer": {
      "name": "João",
      "surname": "Silva",
      "mail": "joao@email.com",
      "phone": "+5521999999999"
    },
    "rooms": [
      {
        "room_type_code": "ROOM-001",
        "occupancy": {"adults": 2, "children": 0},
        "days": [
          {"date": "2026-02-15", "price": 350.00},
          {"date": "2026-02-16", "price": 350.00},
          {"date": "2026-02-17", "price": 380.00}
        ]
      }
    ]
  }
}
```

---

*Documento criado em: 2026-02-06*  
*Baseado na documentação oficial Channex.io e arquitetura OTA Universal do Rendizy*
