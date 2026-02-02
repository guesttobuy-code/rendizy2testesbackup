# ADR-003: Migrations OTA - Ordem e Dependências

**Status:** Aceito  
**Data:** 2026-02-02  
**Autores:** Equipe Rendizy

---

## Contexto

As migrations OTA têm dependências entre si e precisam ser executadas em ordem.

## Decisão

### Ordem de Execução OBRIGATÓRIA

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIGRATIONS OTA - ORDEM DE EXECUÇÃO                    │
└─────────────────────────────────────────────────────────────────────────┘

   FASE 1: FUNDAÇÃO (Sem dependências externas)
   ════════════════════════════════════════════
   
   01 ──► 02 ──► 03 ──► 04 ──► 05
    │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼
   ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐
   │01│  │02│  │03│  │04│  │05│
   └──┘  └──┘  └──┘  └──┘  └──┘
   
   Foundation  Rates  Rooms  Payments  Webhooks


   FASE 2: EXTENSÕES (Dependem da Fase 1)
   ════════════════════════════════════════════
   
   06 ──► 07 ──► 08 ──► 09
    │      │      │      │
    ▼      ▼      ▼      ▼
   ┌──┐  ┌──┐  ┌──┐  ┌──┐
   │06│  │07│  │08│  │09│
   └──┘  └──┘  └──┘  └──┘
   
   Property  Seeds  CRM    Reservations
   Extensions       Enhance Enhance


   FASE 3: VIEWS OTA-ESPECÍFICAS (Dependem de 08 e 09)
   ════════════════════════════════════════════
   
   10 ──► 11 ──► 12
    │      │      │
    ▼      ▼      ▼
   ┌──┐  ┌──┐  ┌──┐
   │10│  │11│  │12│
   └──┘  └──┘  └──┘
   
   Expedia  Booking  Airbnb
   Views    Views    Views
```

---

## 📋 LISTA COMPLETA DE MIGRATIONS

| # | Arquivo | Tipo | Dependências | O que cria |
|---|---------|------|--------------|------------|
| 01 | `2026020301_ota_universal_foundation.sql` | Core | Nenhuma | `ota_amenity_mappings`, `ota_image_mappings`, `ota_address_mappings`, `room_types` |
| 02 | `2026020302_ota_cancellation_rates.sql` | Core | 01 | `cancellation_policies`, `rate_plans`, `rate_plan_amenities` |
| 03 | `2026020303_ota_reservations_multiroom.sql` | Core | 02 | `reservation_rooms`, `billing_contacts`, `reservation_pricing_breakdown` |
| 04 | `2026020304_ota_payments_3dsecure.sql` | Core | 03 | `payment_sessions`, `payment_cards`, campos 3DS |
| 05 | `2026020305_ota_webhooks_extensions.sql` | Core | 01 | `ota_webhooks`, `ota_sync_logs`, `ota_credentials`, campos em `properties` |
| 06 | `2026020306_ota_property_extensions.sql` | Core | 05 | Campos extras em `properties` (checkin/out, fees, etc) |
| 07 | `2026020307_ota_seed_amenities_expedia.sql` | Seed | 01 | Dados de amenidades Expedia em `ota_amenity_mappings` |
| 08 | `2026020308_ota_crm_enhancements.sql` | Core | Nenhuma | Campos em `crm_contacts` (phone estruturado, loyalty), view `crm_contacts_expedia_format` |
| 09 | `2026020309_ota_reservations_enhancements.sql` | Core | 03 | `reservation_history`, campos em `reservations` (adjustments, invoicing) |
| 10 | `2026020310_ota_expedia_views.sql` | Expedia | 08, 09 | Views formatadas para Expedia API |

---

## ⚠️ REGRAS IMPORTANTES

### 1. NUNCA pule uma migration
```
❌ ERRADO: Executar 09 sem ter executado 03
✅ CERTO:  Executar 01, 02, 03, 04, 05, 06, 07, 08, 09 em ordem
```

### 2. Views OTA-específicas são OPCIONAIS
```
Se não usa Expedia → Não precisa da 10
Se não usa Booking → Não precisa da 11
```

### 3. Seeds podem ser re-executados
```
A migration 07 (seeds) pode ser executada novamente para atualizar dados
Os outros NÃO podem ser re-executados
```

### 4. Verificar dependências ANTES de executar
```sql
-- Verificar se tabela existe antes de criar FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name = 'reservation_rooms') THEN
    -- Criar FK ou alterar tabela
  END IF;
END $$;
```

---

## 🔧 SCRIPT DE VERIFICAÇÃO

Execute antes de rodar novas migrations:

```sql
-- Verificar quais tabelas OTA existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'ota_%' 
   OR table_name LIKE 'rate_%'
   OR table_name LIKE 'reservation_%'
   OR table_name LIKE 'billing_%'
   OR table_name LIKE 'payment_%'
ORDER BY table_name;

-- Verificar se campos universais existem
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
  AND column_name IN ('travel_purpose', 'adjustment_value', 'invoicing_consent', 'ota_links');

-- Verificar se views existem
SELECT table_name 
FROM information_schema.views 
WHERE table_name LIKE '%expedia%' 
   OR table_name LIKE '%booking%';
```

---

## Consequências

### Positivas
- ✅ Ordem clara de execução
- ✅ Dependências documentadas
- ✅ Fácil troubleshooting

### Negativas
- ⚠️ Não pode pular migrations
- ⚠️ Precisa manter documentação atualizada

---

## Referências

- [ADR-001: Arquitetura OTA Universal](./ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md)
- [ADR-002: Schema Universal OTA](./ADR-002-OTA-UNIVERSAL-SCHEMA.md)
