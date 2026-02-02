# ADR-002: Schema de Dados Universal para OTAs

**Status:** Aceito  
**Data:** 2026-02-02  
**Autores:** Equipe Rendizy  
**Supersede:** N/A

---

## Contexto

Precisamos de um modelo de dados que:
1. Suporte campos de TODAS as OTAs principais
2. Seja extensível para novas OTAs
3. Mantenha integridade referencial
4. Permita queries eficientes

## Decisão

Adotar o seguinte schema universal:

---

## 📊 DIAGRAMA DE ENTIDADES

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCHEMA OTA UNIVERSAL                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   properties     │     │   rate_plans     │     │   cancellation   │
│                  │     │                  │     │   _policies      │
│ - id             │◄────│ - property_id    │────►│ - rate_plan_id   │
│ - organization_id│     │ - name           │     │ - days_before    │
│ - name           │     │ - refundable     │     │ - penalty_type   │
│ - [OTA fields]   │     │ - min_nights     │     │ - penalty_value  │
└────────┬─────────┘     └──────────────────┘     └──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   reservations   │     │ reservation_rooms│     │  billing_contacts│
│                  │     │                  │     │                  │
│ - id             │◄────│ - reservation_id │     │ - reservation_id │
│ - property_id    │     │ - rate_plan_id   │     │ - given_name     │
│ - guest_id       │     │ - child_ages[]   │     │ - family_name    │
│ - check_in/out   │     │ - pricing JSONB  │     │ - address_*      │
│ - travel_purpose │     │ - status         │     │ - phone_*        │
│ - adjustment_*   │     └──────────────────┘     └──────────────────┘
│ - invoicing_*    │
│ - ota_links JSONB│
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐
│ reservation      │     │   crm_contacts   │
│ _history         │     │                  │
│                  │     │ - id             │
│ - reservation_id │     │ - first_name     │
│ - change_type    │     │ - last_name      │
│ - old_values     │     │ - phone_*        │
│ - new_values     │     │ - date_of_birth  │
│ - changed_by     │     │ - loyalty_*      │
└──────────────────┘     └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         TABELAS DE MAPEAMENTO                           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ ota_amenity      │     │ ota_category     │     │ ota_credentials  │
│ _mappings        │     │ _mappings        │     │                  │
│                  │     │                  │     │ - organization_id│
│ - rendizy_id     │     │ - rendizy_type   │     │ - ota            │
│ - ota            │     │ - ota            │     │ - api_key        │
│ - ota_id         │     │ - ota_category_id│     │ - secret         │
│ - ota_scope      │     │                  │     │ - enabled        │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 🔑 CAMPOS UNIVERSAIS POR ENTIDADE

### `reservations` (Campos OTA-Universal)

| Campo | Tipo | Descrição | OTAs que usam |
|-------|------|-----------|---------------|
| `travel_purpose` | TEXT | business/leisure/unspecified | Expedia, Booking |
| `adjustment_value` | DECIMAL | Valor de ajuste | Todas |
| `adjustment_type` | TEXT | Tipo de ajuste | Todas |
| `adjustment_currency` | TEXT | Moeda do ajuste | Todas |
| `invoicing_consent` | BOOLEAN | Emitir fatura? | Expedia, Booking |
| `invoicing_company_name` | TEXT | Nome empresa | Expedia, Booking |
| `invoicing_vat_number` | TEXT | CNPJ/VAT | Todas |
| `ota_links` | JSONB | Links HATEOAS | Expedia |
| `trader_information` | JSONB | Info do vendedor | Expedia |
| `supplier_transparency` | JSONB | Transparência | Expedia |

### `crm_contacts` (Campos OTA-Universal)

| Campo | Tipo | Descrição | OTAs que usam |
|-------|------|-----------|---------------|
| `phone_country_code` | TEXT | Código país | Todas |
| `phone_area_code` | TEXT | DDD | Todas |
| `phone_number_only` | TEXT | Número | Todas |
| `middle_name` | TEXT | Nome do meio | Expedia |
| `date_of_birth` | DATE | Data nascimento | Expedia, Booking |
| `address_country_code` | TEXT | ISO 2-letter | Todas |
| `loyalty_program_name` | TEXT | Programa fidelidade | Expedia, Booking |
| `loyalty_id` | TEXT | ID no programa | Expedia, Booking |
| `prefers_smoking` | BOOLEAN | Fumante? | Expedia |

### `reservation_rooms` (Campos OTA-Universal)

| Campo | Tipo | Descrição | OTAs que usam |
|-------|------|-----------|---------------|
| `child_ages` | INTEGER[] | Idades crianças | Todas |
| `confirmation_expedia` | TEXT | Conf. Expedia | Expedia |
| `confirmation_property` | TEXT | Conf. Propriedade | Todas |
| `bed_group_id` | TEXT | Grupo de camas | Expedia |
| `smoking` | BOOLEAN | Quarto fumante | Expedia, Booking |
| `special_request` | TEXT | Pedido especial | Todas |

---

## 📋 REGRAS DE MAPEAMENTO

### Amenidades
```
Rendizy          →  Expedia         →  Booking        →  Airbnb
─────────────────────────────────────────────────────────────────
wifi             →  1073743392      →  107            →  4
pool             →  2821            →  22             →  7
parking          →  1073742924      →  12             →  9
kitchen          →  5118            →  64             →  8
```

### Status de Reserva
```
Rendizy          →  Expedia         →  Booking        →  Airbnb
─────────────────────────────────────────────────────────────────
pending          →  pending         →  new            →  pending
confirmed        →  booked          →  confirmed      →  accepted
checked_in       →  in_house        →  checked_in     →  active
checked_out      →  departed        →  checked_out    →  completed
cancelled        →  cancelled       →  cancelled      →  cancelled
no_show          →  no_show         →  no_show        →  cancelled
```

---

## 🔄 FLUXO DE DADOS

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   EXPEDIA   │     │   RENDIZY   │     │   BOOKING   │
│   API       │     │   CORE      │     │   API       │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │   Webhook/Pull    │                   │
       │ ─────────────────►│                   │
       │                   │                   │
       │   Adapter         │                   │
       │ ──────────────────┤                   │
       │                   │                   │
       │                   │   Adapter         │
       │                   ├──────────────────►│
       │                   │                   │
       │                   │   Webhook/Pull    │
       │                   │◄──────────────────│
```

---

## Consequências

### Positivas
- ✅ Schema normalizado e consistente
- ✅ Fácil adicionar nova OTA (só criar adapter)
- ✅ Queries SQL simples no core
- ✅ Validação de dados no banco

### Negativas
- ⚠️ Precisa manter sync entre OTAs
- ⚠️ Alguns campos ficam NULL para certas OTAs
- ⚠️ Adapter precisa conhecer ambos schemas

---

## Referências

- [ADR-001: Arquitetura OTA Universal](./ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md)
- [MODELO_DADOS_UNIVERSAL_OTA.md](../../Expedia%20Group%20API/MODELO_DADOS_UNIVERSAL_OTA.md)
