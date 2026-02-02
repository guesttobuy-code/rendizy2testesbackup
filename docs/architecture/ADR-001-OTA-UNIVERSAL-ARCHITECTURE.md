# ADR-001: Arquitetura OTA Universal

**Status:** Aceito  
**Data:** 2026-02-02  
**Autores:** Equipe Rendizy  
**Relacionado:** ROADMAP_OTA_IMPLEMENTATION_2026_02.md

---

## Contexto

O Rendizy precisa integrar com múltiplas OTAs (Online Travel Agencies):
- **Expedia Group** (Expedia, VRBO, Hotels.com)
- **Booking.com**
- **Airbnb**
- **Decolar**
- **Channel Managers** (Stays.net, etc.)

Cada OTA tem seu próprio formato de dados, mas muitos conceitos são universais.

## Decisão

**Adotar uma arquitetura de "Schema Universal" + "Adaptadores por OTA".**

### Princípios:

1. **Campos Universais no Core**
   - Tabelas `reservations`, `crm_contacts`, `properties` contêm campos genéricos
   - Campos marcados com `[OTA-UNIVERSAL]` nos comentários SQL
   - Suportam TODAS as OTAs sem modificação

2. **Tabelas de Mapeamento por OTA**
   - `ota_amenity_mappings`: Amenidade Rendizy → ID na OTA
   - `ota_category_mappings`: Tipo de propriedade → Categoria OTA
   - `ota_credentials`: Credenciais por organização/OTA

3. **Views OTA-Específicas**
   - `crm_contacts_expedia_format`: Formata contatos para Expedia
   - `reservations_expedia_format`: Formata reservas para Expedia
   - Criadas em migrations SEPARADAS (não no core)

4. **Adaptadores TypeScript**
   - `adapters/expedia-adapter.ts`: Transforma dados Rendizy ↔ Expedia
   - `adapters/booking-adapter.ts`: Transforma dados Rendizy ↔ Booking
   - Interface comum `IOTAAdapter`

## Estrutura de Migrations

```
migrations/
├── 2026020301_ota_universal_foundation.sql   # Core: amenities, images, addresses
├── 2026020302_ota_cancellation_rates.sql     # Core: rate plans, cancellation policies
├── 2026020303_ota_reservations_multiroom.sql # Core: reservation_rooms, billing
├── 2026020304_ota_payments_3dsecure.sql      # Core: payments, 3DS
├── 2026020305_ota_webhooks_extensions.sql    # Core: webhooks, credentials
├── 2026020306_ota_property_extensions.sql    # Core: campos extras em properties
├── 2026020307_ota_seed_amenities_expedia.sql # Expedia-specific: seeds
├── 2026020308_ota_crm_enhancements.sql       # Core: phone estruturado, loyalty
├── 2026020309_ota_reservations_enhancements.sql # Core: history, adjustments
└── 2026020310_ota_expedia_views.sql          # Expedia-specific: views formatadas
```

## Convenções

### Nomenclatura de Campos

| Prefixo/Sufixo | Significado |
|----------------|-------------|
| `ota_*` | Campo usado por múltiplas OTAs |
| `expedia_*` | Campo específico Expedia |
| `booking_*` | Campo específico Booking.com |
| `airbnb_*` | Campo específico Airbnb |

### Comentários SQL

```sql
-- [OTA-UNIVERSAL] = Campo genérico para todas OTAs
COMMENT ON COLUMN reservations.travel_purpose IS '[OTA-UNIVERSAL] Propósito da viagem';

-- [EXPEDIA-SPECIFIC] = Campo apenas para Expedia
COMMENT ON COLUMN reservations.expedia_links IS '[EXPEDIA-SPECIFIC] Links HATEOAS';
```

### Tabelas de Mapeamento

Todas seguem o padrão:
```sql
CREATE TABLE ota_X_mappings (
  id UUID PRIMARY KEY,
  rendizy_X_id TEXT,      -- ID interno Rendizy
  rendizy_X_name TEXT,    -- Nome interno
  ota TEXT NOT NULL,      -- 'expedia', 'booking', 'airbnb'
  ota_X_id TEXT,          -- ID na OTA
  ota_X_name TEXT,        -- Nome na OTA
  ota_scope TEXT,         -- Escopo: 'property', 'room', 'rate'
  UNIQUE(ota, ota_X_id)
);
```

## Consequências

### Positivas
- ✅ Adicionar nova OTA não requer alterar schema core
- ✅ Código mais limpo e organizado
- ✅ Fácil manutenção e testes
- ✅ Dados consistentes entre OTAs

### Negativas
- ⚠️ Mais tabelas no banco
- ⚠️ Complexidade inicial maior
- ⚠️ Precisa manter adaptadores sincronizados

## Alternativas Consideradas

1. **Schema por OTA**: Tabelas separadas para cada OTA
   - Rejeitado: Duplicação massiva de dados

2. **JSONB para tudo**: Armazenar dados OTA em campos JSONB
   - Rejeitado: Perde validação e integridade

3. **Schema único flat**: Todos campos em uma tabela
   - Rejeitado: Fica incontrolável com 20+ OTAs

---

## Referências

- [MODELO_DADOS_UNIVERSAL_OTA.md](../../Expedia%20Group%20API/MODELO_DADOS_UNIVERSAL_OTA.md)
- [ROADMAP_EXPEDIA_GAP_ANALYSIS.md](../../Expedia%20Group%20API/ROADMAP_EXPEDIA_GAP_ANALYSIS.md)
- [ROADMAP_OTA_IMPLEMENTATION_2026_02.md](./ROADMAP_OTA_IMPLEMENTATION_2026_02.md)
