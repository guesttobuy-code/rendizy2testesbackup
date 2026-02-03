# 🎯 MAPEAMENTO FUNCIONAL: Dados OTA → Funcionalidades de Produto

**Data:** 2026-02-03  
**Versão:** 3.4  
**Vinculado a:** [MASTER_CHECKLIST_OTA_2026_02.md](../MASTER_CHECKLIST_OTA_2026_02.md)

> **Objetivo:** Documento de referência para implementação em sprints.
> Mapeia campos OTA → funcionalidades de produto, organizadas por categoria.

---

## 📑 ÍNDICE DO DOCUMENTO

### PARTE 1: MAPEAMENTO FUNCIONAL OTA
- [1.1 Endereço e Localização](#11-endereço-e-localização)
- [1.2 Quartos e Camas](#12-quartos-e-camas)
- [1.3 Amenidades](#13-amenidades)
- [1.4 Políticas da Casa](#14-políticas-da-casa)
- [1.5 Licenças e Registros](#15-licenças-e-registros)
- [1.6 Contatos e Emergência](#16-contatos-e-emergência)
- [2.1 Rate Plans e Preços](#21-rate-plans-e-preços)
- [2.2 Políticas de Cancelamento](#22-políticas-de-cancelamento)
- [2.3 Check-in / Check-out](#23-check-in--check-out)
- [2.4 Pagamentos e 3D Secure](#24-pagamentos-e-3d-secure)
- [2.5 Multi-room Booking](#25-multi-room-booking)
- [2.6 Histórico de Reservas](#26-histórico-de-reservas)
- [2.7 Webhooks e Sync OTA](#27-webhooks-e-sync-ota)
- [3.1-3.4 Hóspedes & CRM](#categoria-3-hóspedes--crm)

### PARTE 2: INVENTÁRIO DE TELAS
- [A. RENDIZY - Formulário de Anúncio](#a-formulário-de-anúncio-propertiesidedit)
- [B. RENDIZY - Configurações Gerais](#b-configurações-gerais-settings)
- [A. STAYS - No Anúncio](#a-no-anúncio---seções-do-formulário)
- [B. STAYS - Configs Globais Gerais](#b-configurações-globais-settingsgeneral)
- [C. STAYS - Configs de Reserva Global](#c-configurações-de-reserva-global-settingsreserve---8-prints)
- [D. STAYS - Configs de Hóspedes Global](#d-configurações-de-hóspedes-global-settingsclient---1-print)
- [E. STAYS - Configs de Proprietários Global](#e-configurações-de-proprietários-global-settingslandlord---4-prints)
- [F. STAYS - Configs de E-mails Global](#f-configurações-de-e-mails-global-settingsemail---5-prints)
- [G. STAYS - Channel Manager Airbnb](#g-channel-manager---airbnb-chmanagerairbnb---8-prints)
- [H. STAYS - Gerenciamento de Taxas](#h-gerenciamento-de-taxas-fee-manager---1-print)

### PENDÊNCIAS DE DESENVOLVIMENTO
- [Separação de Telas de Integração](#-pendência-crítica-separação-de-telas-de-integração)

### PARTE 3: ANÁLISE COMPARATIVA
- [Mapeamento Global ↔ Individual](#-mapeamento-crítico-global--individual)
- [Tabela Stays vs Rendizy](#tabela-de-relacionamento-stays-vs-rendizy)
- [GAPs Identificados](#️-gaps-identificados)
- [Nota para o Código](#-nota-para-o-código)

---

## 🗂️ ORGANIZAÇÃO POR CATEGORIA

| Categoria | Descrição | Telas Relacionadas | Responsável |
|-----------|-----------|-------------------|-------------|
| 🏠 **ANÚNCIOS** | Configuração do imóvel | Formulário de propriedade | Anfitrião |
| 📅 **RESERVAS & OPERAÇÕES** | Fluxo de reserva e gestão | Checkout, calendário, integrações | Sistema/Hóspede |
| 👤 **HÓSPEDES & CRM** | Gestão de clientes | CRM, perfil do hóspede | Operações |

---

# ═══════════════════════════════════════════════════════════════
# 🏠 CATEGORIA 1: ANÚNCIOS (Configuração do Imóvel)
# ═══════════════════════════════════════════════════════════════

> **Telas:** Formulário de criação/edição de propriedade  
> **Responsável:** Anfitrião/Proprietário  
> **Frequência:** Configuração inicial + atualizações esporádicas

---

## 1.1 ENDEREÇO E LOCALIZAÇÃO

### Campos no Schema
```sql
address_line_1, address_line_2, address_line_3
city, state_province_code, postal_code, country_code
latitude, longitude
obfuscation_required  -- VRBO privacy
nearby_attractions JSONB, transportation_options JSONB
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| LOC-01 | 🗺️ **Mapa do anúncio** | Mostrar localização ao hóspede | ALTA |
| LOC-02 | 🔍 **Busca por região** | Filtro "apartamentos em Copacabana" | ALTA |
| LOC-03 | 📊 **Mapa de preços** | Heatmap de preço médio por região | MÉDIA |
| LOC-04 | 🎯 **Raio de distância** | "Imóveis a 2km da praia" | MÉDIA |
| LOC-05 | 🚕 **Instruções de chegada** | "15min do aeroporto" | ALTA |
| LOC-06 | 🔒 **Privacidade VRBO** | Ocultar endereço até confirmar | MÉDIA |
| LOC-07 | 📋 **Conformidade legal** | Validar licença por município | ALTA |

---

## 1.2 QUARTOS E CAMAS

### Campos no Schema
```sql
-- Tabela: property_rooms (Migration 11)
room_type_id, name, description
area_sqm, max_occupancy, max_adults, max_children
bed_configuration JSONB  -- [{"type":"double","size":"king","count":1}]
images JSONB, amenity_ids UUID[], views TEXT[]
is_smoking_allowed, is_accessible, floor_number
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| ROOM-01 | 🛏️ **Cadastro de quartos** | Definir quartos do imóvel | ALTA |
| ROOM-02 | 🔢 **Contagem de camas** | "2 camas de casal + 1 solteiro" | ALTA |
| ROOM-03 | 👨‍👩‍👧‍👦 **Capacidade** | Máximo de hóspedes por quarto | ALTA |
| ROOM-04 | 📐 **Área do quarto** | "45m²" como diferencial | MÉDIA |
| ROOM-05 | 🖼️ **Galeria por quarto** | Fotos específicas de cada quarto | MÉDIA |
| ROOM-06 | ♿ **Acessibilidade** | Marcar quartos acessíveis | MÉDIA |
| ROOM-07 | 🌊 **Vista do quarto** | Vista mar, cidade, jardim | BAIXA |

---

## 1.3 AMENIDADES

### Campos no Schema
```sql
-- Tabela: amenities (Migration 01)
id, code, name, name_pt, category, icon, is_highlight

-- Tabela: ota_amenity_mappings (Migration 07)
rendizy_amenity_id → ota_amenity_id (por OTA)

-- Em property_rooms
amenity_ids UUID[]
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| AMEN-01 | ✅ **Checklist de amenidades** | Selecionar o que o imóvel tem | ALTA |
| AMEN-02 | 🏷️ **Destaques** | "Wi-Fi • Piscina • Estacionamento" | ALTA |
| AMEN-03 | 🔄 **Mapeamento OTA** | Traduzir para códigos Expedia/Booking | CRÍTICA |
| AMEN-04 | 📊 **Score de completude** | "80% das amenidades preenchidas" | MÉDIA |
| AMEN-05 | 🔍 **Filtros de busca** | "Com piscina", "Com churrasqueira" | ALTA |
| AMEN-06 | 🏠 **Amenidades por quarto** | Wi-Fi no quarto, AC no quarto | MÉDIA |

---

## 1.4 POLÍTICAS DA CASA

### Campos no Schema
```sql
-- Em properties (Migration 12)
pets_policy JSONB        -- {"allowed": true, "fee": 50, "max": 2}
smoking_policy TEXT      -- no_smoking, designated_areas, allowed
party_policy TEXT        -- no_parties, small_gatherings, allowed
quiet_hours_start TIME, quiet_hours_end TIME
know_before_you_go TEXT
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| RULE-01 | 🐕 **Política de pets** | Permitir/proibir, taxa, máximo | ALTA |
| RULE-02 | 🚭 **Política de fumo** | Proibido, áreas designadas | ALTA |
| RULE-03 | 🎉 **Política de eventos** | Festas, reuniões | ALTA |
| RULE-04 | 🔇 **Horário de silêncio** | 22h às 8h | MÉDIA |
| RULE-05 | ⚠️ **Know Before You Go** | Informações importantes | ALTA |
| RULE-06 | 📋 **Contrato digital** | Hóspede aceita termos | MÉDIA |

---

## 1.5 LICENÇAS E REGISTROS

### Campos no Schema
```sql
-- Em properties (Migration 12)
license_number TEXT
license_type TEXT        -- tourism, short_term_rental, hotel
license_expiry DATE
tax_registration TEXT    -- CNPJ/ISS
insurance_policy TEXT
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| LIC-01 | 📋 **Número de registro** | Exigido por lei em várias cidades | ALTA |
| LIC-02 | ⏰ **Validade da licença** | Alerta de expiração | MÉDIA |
| LIC-03 | 🏛️ **Conformidade OTA** | Expedia/Airbnb exigem registro | ALTA |
| LIC-04 | 📄 **Seguro** | Apólice de seguro do imóvel | MÉDIA |

---

## 1.6 CONTATOS E EMERGÊNCIA

### Campos no Schema
```sql
-- Em properties (Migration 12)
emergency_contact_name, emergency_contact_phone
property_manager_name, property_manager_phone, property_manager_email
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| CONT-01 | 📞 **Contato de emergência** | Número para urgências | ALTA |
| CONT-02 | 👤 **Gerente da propriedade** | Quem cuida do imóvel | MÉDIA |
| CONT-03 | 📧 **Email automático** | Enviar instruções com contatos | ALTA |

---

# ═══════════════════════════════════════════════════════════════
# 📅 CATEGORIA 2: RESERVAS & OPERAÇÕES
# ═══════════════════════════════════════════════════════════════

> **Telas:** Checkout, calendário, dashboard de integrações  
> **Responsável:** Sistema automático + Hóspede  
> **Frequência:** Toda reserva

---

## 2.1 RATE PLANS E PREÇOS

### Campos no Schema
```sql
-- Tabela: rate_plans (Migration 02)
name, description, type TEXT  -- standard, promotional, package
refundable BOOLEAN
cancellation_policy_id UUID
min_nights, max_nights
advance_booking_min, advance_booking_max
markup_percent, discount_percent
amenities_included JSONB
valid_from, valid_until
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| RATE-01 | 🏷️ **Múltiplas tarifas** | "Flexível" vs "Não-reembolsável (-15%)" | CRÍTICA |
| RATE-02 | 📅 **Reserva antecipada** | "30 dias antes = 10% off" | ALTA |
| RATE-03 | 🎁 **Pacotes** | "Pacote Romântico: inclui champagne" | MÉDIA |
| RATE-04 | 🏢 **Tarifa corporativa** | Preço especial para empresas | MÉDIA |
| RATE-05 | ⏰ **Mínimo de noites** | "Mínimo 3 noites nesta tarifa" | ALTA |
| RATE-06 | ✨ **Amenidades inclusas** | "Inclui café da manhã" | MÉDIA |
| RATE-07 | 🗓️ **Validade** | "Promoção até 28/02" | MÉDIA |
| RATE-08 | 🔄 **Paridade de preços** | Mesmo preço em todas OTAs | ALTA |

---

## 2.2 POLÍTICAS DE CANCELAMENTO

### Campos no Schema
```sql
-- Tabela: cancellation_policies (Migration 02)
name, description, is_default, is_refundable

-- Tabela: cancellation_policy_rules
days_before_checkin INTEGER
penalty_type TEXT  -- percentage, fixed, nights
penalty_value DECIMAL
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| CANCEL-01 | 💸 **Cálculo de reembolso** | "5 dias antes = 100% reembolso" | CRÍTICA |
| CANCEL-02 | ⚠️ **Aviso de penalidade** | "Se cancelar agora, perde 50%" | ALTA |
| CANCEL-03 | 💳 **Cobrança automática** | Cobrar penalidade no cartão | ALTA |
| CANCEL-04 | 🏷️ **Badge "Cancelamento grátis"** | Destacar no card do anúncio | ALTA |
| CANCEL-05 | 📧 **Email de lembrete** | "Cancele grátis até amanhã" | MÉDIA |
| CANCEL-06 | 📊 **Taxa de cancelamento** | KPI: "12% cancelam" | MÉDIA |

---

## 2.3 CHECK-IN / CHECK-OUT

### Campos no Schema
```sql
-- Em properties (Migration 12)
checkin_begin_time TIME, checkin_end_time TIME
checkout_time TIME
checkin_instructions TEXT
checkin_special_instructions TEXT
checkout_instructions TEXT
min_age_checkin INTEGER
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| CHK-01 | ⏰ **Horários** | "Check-in: 14h às 22h" | ALTA |
| CHK-02 | 🚪 **Self check-in** | Instruções + código fechadura | ALTA |
| CHK-03 | 💰 **Early check-in** | "10h: +R$80" | MÉDIA |
| CHK-04 | 💰 **Late checkout** | "14h: +R$60" | MÉDIA |
| CHK-05 | 📧 **Email pré-chegada** | Instruções 24h antes | ALTA |
| CHK-06 | 👤 **Idade mínima** | Bloquear menores de 25 | MÉDIA |
| CHK-07 | 🔑 **Integração fechadura** | Código temporário IoT | BAIXA |

---

## 2.4 PAGAMENTOS E 3D SECURE

### Campos no Schema
```sql
-- Tabela: payment_sessions (Migration 04)
reservation_id, session_id, status
cavv, eci, three_ds_version  -- 3D Secure
payment_type TEXT  -- customer_card, virtual_card
card_last_four, card_brand

-- Em reservations (Migration 03)
billing_name, billing_address, billing_city
billing_state, billing_postal_code, billing_country
billing_phone, billing_email
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| PAY-01 | 🔒 **3D Secure** | Autenticação forte anti-fraude | CRÍTICA |
| PAY-02 | 🏢 **Faturamento empresarial** | Billing ≠ hóspede | ALTA |
| PAY-03 | 💳 **Virtual card** | Receber da OTA via cartão virtual | ALTA |
| PAY-04 | 📊 **Conciliação** | Quem cobrou: Expedia ou direto? | ALTA |
| PAY-05 | 📧 **Comprovante** | Enviar recibo automático | ALTA |
| PAY-06 | 💰 **Parcelamento** | "Parcele em até 12x" | MÉDIA |
| PAY-07 | 🔐 **Tokenização** | Salvar cartão para futuras | MÉDIA |

---

## 2.5 MULTI-ROOM BOOKING

### Campos no Schema
```sql
-- Tabela: reservation_rooms (Migration 03)
reservation_id, room_id, rate_plan_id
confirmation_expedia, confirmation_property
number_of_adults, child_ages INTEGER[]
guest_given_name, guest_family_name
smoking BOOLEAN, special_request TEXT
bed_group_id, pricing JSONB

-- Em reservations
pricing_subtotal, pricing_taxes, pricing_fees
pricing_total, pricing_currency, pricing_breakdown JSONB
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| MULTI-01 | 🏨 **Múltiplos quartos** | Reservar 3 quartos de uma vez | ALTA |
| MULTI-02 | 👥 **Hóspede por quarto** | Nome de cada ocupante | MÉDIA |
| MULTI-03 | 👶 **Idades das crianças** | Para calcular taxa | ALTA |
| MULTI-04 | 💰 **Pricing breakdown** | Detalhe por noite/quarto | ALTA |
| MULTI-05 | 🎫 **Confirmação dupla** | ID Expedia + ID Propriedade | ALTA |

---

## 2.6 HISTÓRICO DE RESERVAS

### Campos no Schema
```sql
-- Tabela: reservation_history (Migration 09/10)
reservation_id, change_type TEXT
old_values JSONB, new_values JSONB
changed_by UUID, changed_at TIMESTAMPTZ
change_source TEXT  -- manual, webhook, api
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| HIST-01 | 🔍 **Audit trail** | Quem alterou essa reserva? | ALTA |
| HIST-02 | ⚖️ **Disputas** | Provar alteração ao hóspede | ALTA |
| HIST-03 | 🔄 **Rollback** | Desfazer alteração acidental | MÉDIA |
| HIST-04 | 📧 **Notificação** | "Sua reserva foi alterada" | ALTA |
| HIST-05 | 💰 **Recálculo** | Se mudou data, recalcular preço | ALTA |

---

## 2.7 WEBHOOKS E SYNC OTA

### Campos no Schema
```sql
-- Tabela: ota_webhooks (Migration 05)
ota TEXT, event_id TEXT UNIQUE
event_type TEXT, payload JSONB
processed BOOLEAN, processing_error TEXT
retry_count INTEGER

-- Tabela: ota_credentials (Migration 05)
ota TEXT, api_key, api_secret
environment TEXT  -- sandbox, production

-- Tabela: ota_sync_logs (Migration 05)
property_id, ota, sync_type TEXT
status TEXT, duration_ms INTEGER
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| SYNC-01 | ⚡ **Real-time sync** | Reserva Expedia em 2 segundos | CRÍTICA |
| SYNC-02 | 📊 **Status de sync** | "Última sync: há 5 min" | ALTA |
| SYNC-03 | 🔴 **Alertas de erro** | "Falha ao sincronizar" | ALTA |
| SYNC-04 | 🔄 **Retry automático** | Reprocessar webhooks falhados | ALTA |
| SYNC-05 | 🧪 **Modo sandbox** | Testar sem dados reais | ALTA |
| SYNC-06 | 📋 **Logs detalhados** | Debug de problemas | MÉDIA |

---

# ═══════════════════════════════════════════════════════════════
# 👤 CATEGORIA 3: HÓSPEDES & CRM
# ═══════════════════════════════════════════════════════════════

> **Telas:** CRM, perfil do hóspede, comunicação  
> **Responsável:** Operações/Atendimento  
> **Frequência:** Diária

---

## 3.1 DADOS DO HÓSPEDE

### Campos no Schema
```sql
-- Tabela: crm_contacts (Migration 08)
first_name, last_name, middle_name
email, phone
phone_country_code, phone_area_code, phone_number_only
date_of_birth DATE
address_*
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| GUEST-01 | 👤 **Perfil completo** | Nome, email, telefone, endereço | ALTA |
| GUEST-02 | 📞 **Telefone estruturado** | +55 21 99999-8888 | ALTA |
| GUEST-03 | 🎂 **Data de nascimento** | Para ofertas de aniversário | MÉDIA |
| GUEST-04 | 🔍 **Deduplicação** | Identificar mesmo cliente em OTAs | MÉDIA |
| GUEST-05 | 📊 **Histórico** | "5 reservas, R$12.000 gastos" | ALTA |

---

## 3.2 PROGRAMA DE FIDELIDADE

### Campos no Schema
```sql
-- Em crm_contacts (Migration 08)
loyalty_program_id TEXT
loyalty_tier TEXT      -- bronze, silver, gold, platinum
loyalty_number TEXT

-- Stats existentes
stats_total_reservations, stats_total_spent
stats_average_stay_length, stats_last_stay_date
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| LOYAL-01 | 🏆 **Níveis** | Bronze, Silver, Gold, Platinum | MÉDIA |
| LOYAL-02 | 🎁 **Benefícios** | "GOLD: upgrade grátis" | MÉDIA |
| LOYAL-03 | 📧 **Marketing segmentado** | Ofertas por nível | MÉDIA |
| LOYAL-04 | 📊 **Dashboard VIP** | Clientes mais valiosos | MÉDIA |

---

## 3.3 PREFERÊNCIAS DO HÓSPEDE

### Campos no Schema
```sql
-- Em crm_contacts (existente)
prefers_early_checkin, prefers_late_checkout
prefers_quiet_room, prefers_high_floor, prefers_ground_floor
notes TEXT, tags TEXT[]
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| PREF-01 | ⭐ **Preferências salvas** | Andar alto, não fumante | MÉDIA |
| PREF-02 | 📝 **Notas internas** | "Sempre pede toalhas extras" | MÉDIA |
| PREF-03 | 🏷️ **Tags** | VIP, Corporativo, Problemático | MÉDIA |
| PREF-04 | ⚠️ **Blacklist** | Bloquear hóspede problemático | ALTA |

---

## 3.4 COMUNICAÇÃO E WHATSAPP

### Campos no Schema
```sql
-- Telefone estruturado (Migration 08)
phone_country_code  -- Para WhatsApp internacional
phone_area_code
phone_number_only
```

### Funcionalidades

| ID | Funcionalidade | Descrição | Prioridade |
|----|---------------|-----------|------------|
| COMM-01 | 📱 **WhatsApp automático** | Mensagem com DDD correto | ALTA |
| COMM-02 | 📧 **Email pré-chegada** | Instruções 24h antes | ALTA |
| COMM-03 | 📧 **Email pós-saída** | Pedir avaliação | MÉDIA |
| COMM-04 | 🎂 **Aniversário** | "Feliz aniversário! 10% off" | BAIXA |

---

# ═══════════════════════════════════════════════════════════════
# 📊 RESUMOS
# ═══════════════════════════════════════════════════════════════

## RESUMO POR MIGRATION

| # | Migration | Categoria | Funcionalidades Principais |
|---|-----------|-----------|---------------------------|
| 01 | Foundation | 🏠 Anúncios | Amenidades, imagens, endereço |
| 02 | Cancellation/Rates | 📅 Reservas | Rate plans, cancelamento |
| 03 | Multi-room | 📅 Reservas | Billing, pricing breakdown |
| 04 | Payments | 📅 Reservas | 3D Secure, virtual cards |
| 05 | Webhooks | 📅 Reservas | Sync OTA, credentials |
| 07 | Seeds | 🏠 Anúncios | Mapeamento Expedia |
| 08 | CRM | 👤 Hóspedes | Telefone, fidelidade |
| 09 | History | 📅 Reservas | Audit trail |
| 10 | Trigger | 📅 Reservas | Auto-log |
| 11 | Rooms | 🏠 Anúncios | Quartos, camas |
| 12 | Check-in | 🏠+📅 | Horários, políticas |

---

## COMPONENTES UI POR CATEGORIA

### 🏠 ANÚNCIOS (Formulário de Propriedade)

| Componente | Seções que implementa | Prioridade |
|------------|----------------------|------------|
| `PropertyAddressSection` | 1.1 Endereço | ALTA |
| `PropertyRoomsSection` | 1.2 Quartos | ALTA |
| `AmenitiesSelector` | 1.3 Amenidades | ALTA |
| `HousePoliciesSection` | 1.4 Políticas | ALTA |
| `LicensesSection` | 1.5 Licenças | MÉDIA |
| `ContactsSection` | 1.6 Contatos | MÉDIA |

### 📅 RESERVAS & OPERAÇÕES (Settings/Integrações)

| Componente | Seções que implementa | Prioridade |
|------------|----------------------|------------|
| `RatePlansManager` | 2.1 Rate Plans | CRÍTICA |
| `CancellationPoliciesManager` | 2.2 Cancelamento | CRÍTICA |
| `CheckinCheckoutSettings` | 2.3 Check-in/out | ALTA |
| `PaymentSettingsCard` | 2.4 Pagamentos | ALTA |
| `ReservationHistoryLog` | 2.6 Histórico | MÉDIA |
| `OtaSyncDashboard` | 2.7 Sync OTA | ALTA |
| `OtaCredentialsManager` | 2.7 Credenciais | ALTA |

### 👤 HÓSPEDES & CRM

| Componente | Seções que implementa | Prioridade |
|------------|----------------------|------------|
| `GuestProfileCard` | 3.1 Dados | ALTA |
| `LoyaltyProgramSettings` | 3.2 Fidelidade | MÉDIA |
| `GuestPreferencesPanel` | 3.3 Preferências | MÉDIA |
| `CommunicationSettings` | 3.4 WhatsApp | MÉDIA |

---

# ═══════════════════════════════════════════════════════════════
# 📸 PARTE 2: INVENTÁRIO DE TELAS
# ═══════════════════════════════════════════════════════════════

> ⚠️ **ATENÇÃO:** Muitas telas foram CRIADAS mas não estão FUNCIONAIS.
> Não confiar cegamente no que está na UI. O Stays.net (produção real) é a REFERÊNCIA.

---

# 🔵 RENDIZY - TELAS EXISTENTES (31 prints)

## A. FORMULÁRIO DE ANÚNCIO (`/properties/:id/edit`)

### 🟠 CONTEÚDO DO ANÚNCIO (7 abas)

| # | Aba | Campos/Seções | Status |
|---|-----|---------------|--------|
| 1 | **Básico** | Identificação interna, Tipo de local, Tipo de acomodação, Modalidades (Temporada/Venda/Locação), Subtipo | ⚠️ Funcional |
| 2 | **Localização** | Endereço completo, Mapa, Características do Local (Estacionamento, Wi-Fi), Fotos do endereço | ⚠️ Funcional |
| 3 | **Cômodos** | Lista de cômodos, Tipo (Quarto/Banheiro), Contador de camas, Fotos por cômodo | ⚠️ Funcional |
| 4 | **Tour Virtual** | Galeria 20 fotos, Foto destaque/capa, Filtro por cômodo, Tags nas fotos | ⚠️ Funcional |
| 5 | **Amenidades Local** | Checkboxes: Área/Vista, Estacionamento/Instalações, Serviços | ⚠️ Funcional |
| 6 | **Amenidades Acomod.** | Checkboxes: Banheiro, Climatização, Cozinha, Entretenimento, Internet, Quarto/Lavanderia, Segurança | ⚠️ Funcional |
| 7 | **Descrição** | Título (PT/EN/ES), Notas gerais, Sobre espaço, Sobre acesso, Interação anfitrião, Descrição bairro | ⚠️ Funcional |

### 🟡 FINANCEIRO (5 abas)

| # | Aba | Campos/Seções | Status |
|---|-----|---------------|--------|
| 8 | **Relacionamento** | Titular do Imóvel, Administrador, Toggle Repasse, Toggle Exclusividade | ⚠️ A validar |
| 9 | **Preços Base** | Valores Aluguel (R$, IPTU, Condomínio, Taxa), Valores Venda (Financiamento, Permuta) | ⚠️ A validar |
| 10 | **Temporada** | Modo (Global/Individual), Região/Moeda, Descontos por pacote, Depósito/Diária, Taxas Adicionais | ⚠️ A validar |
| 11 | **Preços Individuais** | Preço Base/noite, Períodos Sazonais, Preços por Dia da Semana, Datas Especiais | ⚠️ A validar |
| 12 | **Preços Derivados** | Variação por Número de Hóspedes, Configuração para Crianças | ⚠️ A validar |

### ⚙️ CONFIGURAÇÕES (5 abas)

| # | Aba | Campos/Seções | Status |
|---|-----|---------------|--------|
| 13 | **Reservas** | Estadia mínima (override), Link para configuração global | ⚠️ Parcial |
| 14 | **Check-in** | *"Em desenvolvimento - Campos serão migrados aqui"* | 🚧 Não funcional |
| 15 | **Regras Casa** | *"Em desenvolvimento - Campos serão migrados aqui"* | 🚧 Não funcional |
| 16 | **Políticas** | *"Em desenvolvimento - Campos serão migrados aqui"* | 🚧 Não funcional |
| 17 | **Integração** | *"Em desenvolvimento - Campos serão migrados aqui"* | 🚧 Não funcional |

---

## B. CONFIGURAÇÕES GERAIS (`/settings/*`)

### 🔷 Settings/Properties (`/settings/properties`)

| # | Sub-aba | Seções/Campos | Status |
|---|---------|---------------|--------|
| 18 | **Locais e Anúncios** | Preferências de Visualização, Prefixos de Códigos (LOC/PROP/LIST), Config. Fotos (mín/máx/tamanho/capa), Validação e Aprovação, Campos Obrigatórios | ⚠️ A validar |
| 19 | **Locais e Anúncios (cont.)** | Comodidades: Ícones, Customizadas, Herança, Campos Personalizados (PT/EN/ES) | ⚠️ A validar |
| 20 | **Tipos de Imóveis** | Tipos de Local (hotéis, pousadas), Tipos de Anúncio (apartamentos, casas) | ⚠️ A validar |
| 21 | **Amenidades de Locais** | 13 Categorias, 269 Amenidades (Acessibilidade, Ar livre/Vista, Banheiro, Climatização, Cozinha, Entretenimento...) | ⚠️ A validar |

### 🔷 Settings/Reservas (`/settings/reservas`)

| # | Sub-aba | Seções/Campos | Status |
|---|---------|---------------|--------|
| 22 | **Configurações Gerais** | Política Cancelamento, Check-in/out, Estadia mínima (por período), Antecedência, Regras Casa, Comunicação | ⚠️ A validar |
| 23 | **Reservas Temporárias** | Ativar, Tempo Limite (24h), Cancelamento Automático, Notificações, Fluxo Status (Pendente→Confirmado→Cancelada) | ⚠️ A validar |

### 🔷 Settings/Precificação (`/settings/precificacao`)

| # | Sub-aba | Seções/Campos | Status |
|---|---------|---------------|--------|
| 24 | **Precificação** | Descontos por pacote (Semanal 7n/2%, Custom 14n/4%, Mensal 28n/8%), Moeda padrão (BRL), Moedas adicionais | ⚠️ A validar |

### 🔷 Settings/Chat (`/settings/chat`)

| # | Sub-aba | Seções/Campos | Status |
|---|---------|---------------|--------|
| 25-26 | **Chat** | Resposta Automática, Notificações (Email, Som, Desktop, Badge), Comportamento (Auto-lido, Arquivar, Digitação, 90 dias), Templates/Atalhos, Filtros (50 conversas) | ⚠️ A validar |

### 🔷 Settings/Integrações (`/settings/integracoes`)

| # | Sub-aba | Seções/Campos | Status |
|---|---------|---------------|--------|
| 27 | **Integrações (lista)** | Cards: Stays.net PMS, Booking.com, Airbnb, Expedia Group, Decolar (Em Breve) | ⚠️ Cards criados |
| 28 | **Expedia - Credenciais** | Ambiente (Sandbox/Prod), API Key, API Secret, Partner ID, Property ID, Testar Conexão | 🚧 Modal criado |
| 29 | **Expedia - Canais** | Expedia.com ✓, VRBO, Hotels.com, Trivago, VRBO Listing ID, Sincronização (Conteúdo/Preços/Disponibilidade/Reservas) | 🚧 Modal criado |
| 30 | **Expedia - Pagamentos** | Expedia Collect vs Property Collect, 3D Secure, Taxa Comissão (%) | 🚧 Modal criado |
| 31 | **Expedia - Webhooks** | URL, Secret, Eventos (itinerary.agent.create/modify/cancel, payment.captured, refund.processed, review.submitted) | 🚧 Modal criado |

### Sidebar - Catálogo (dentro de Integrações)
- Grupos
- Restrições dos Proprietários
- Regras Tarifárias
- Modelos de E-mail
- Modelos para Impressão
- Gerenciador de Mídia

---

# 🟢 STAYS.NET - REFERÊNCIA DE PRODUÇÃO (24+ prints)

> **URL Base:** `bvm.stays.net/i/apartment/LX01I/*`
> **Padrão:** Todas configs têm toggle `[Global] [Individual]` + botão `[Prévia]`

---

## A. NO ANÚNCIO - Seções do Formulário

### 📋 Regras da Acomodação (`/house_rules`) - 3 prints

| Seção | Campos | Multi-idioma |
|-------|--------|--------------|
| **Ocupação máxima** | Adultos (da config de camas), Idade mínima | - |
| **Crianças (2-12 anos)** | Sim/Não + quantidade máxima | ✅ PT/ES/EN |
| **Bebês (0-2 anos)** | Sim/Não + quantidade + Berços | ✅ PT/ES/EN |
| **Fumar** | Sim/Não | - |
| **Animais** | Sim/Não/Mediante Solicitação + Grátis/Cobrança | - |
| **Eventos** | Sim/Não | - |
| **Silêncio** | Sim/Não + Horário (22:00-8:00) | - |
| **Regras adicionais** | Texto livre com lista de regras | ✅ PT/ES/EN |

### 💼 Contrato (`/contract`) - 6 prints

| Seção | Campos | Global/Individual |
|-------|--------|-------------------|
| **Responsável** | Proprietário (select), Gestor do proprietário (select) | - |
| **Tipo de contrato** | Registrado em (data), Sublocação (Sim/Não), Exclusivo (Sim/Não) | - |
| **Duração do contrato** | De-até (datas), Bloquear calendário após fim? | - |
| **Comissão** | Modelo (Global/Individual), Tipo (Fixa %), Base cálculo (fatura total/diárias/hospedagem) | ✅ G/I |
| **Considerar comissão canais** | Sim/Não, Descontar antes do repasse? | ✅ G/I |
| **Repasse após balancete** | Permitir exclusão? Sim/Não | - |
| **Energia elétrica** | Cobrar consumo? Global/Individual | ✅ G/I |
| **E-mails (8 tipos)** | Pré-reserva (prop/agente), Confirmada (prop/agente), Cancelamento, Reserva excluída, Antes do repasse | ✅ G/I + Prévia |
| **Pagamentos diretos** | Mostrar dados bancários no site | ✅ G/I |
| **Prestação de contas** | Início: Sem restrição / Com restrição | - |
| **Repasse automático** | Config de repasse | ✅ G/I |
| **Taxas durante repasse** | Taxa limpeza, Enxoval/roupagem | ✅ G/I |

### 💰 Config. Preço de Venda (`/sellprice/setting`) - 2 prints

| Seção | Campos | Global/Individual |
|-------|--------|-------------------|
| **Moeda/Taxas/Caução** | Região, Moeda padrão (BRL), Importar preços | Individual |
| **Desconto por duração** | Política desconto por estadia | ✅ G/I + Prévia |
| **Coupons** | BRL + Valor | - |
| **Precificação dinâmica** | Regras de precificação | ✅ G/I + Prévia |
| **Taxas e impostos** | Taxa limpeza (R$), Enxoval/roupagem (%), Taxa Airbnb | ✅ G/I (maioria Individual) |
| **Preços derivados** | Por nº hóspedes (Sim/Não + Porcentagem/Valor fixo), Crianças adicionais | - |
| **Garantia de reserva** | Sinal para confirmar reserva | ✅ G/I |

### 📋 Configs sobre Reservas (`/reservation-settings`) - 2 prints

| Campo | Global/Individual |
|-------|-------------------|
| Reservas instantâneas? | ✅ G/I |
| Restrição última hora (last minute) | ✅ G/I + Prévia |
| Check-in | ✅ G/I + Prévia |
| Checkout | ✅ G/I + Prévia |
| Tempo de preparação | ✅ G/I + Prévia |
| Período de disponibilidade | ✅ G/I + Prévia |
| **Política de cancelamento** | ✅ G/I + link "Saiba mais" |

### 📅 iCal (`/icalendar`) - 1 print

| Campo | Descrição |
|-------|-----------|
| Link iCal deste anúncio | URL para exportar calendário |
| Calendários importados | Nome de referência + Link iCal + Logs |
| ⚠️ Aviso importante | "iCal atualiza em 15-25 min, última alternativa para conectar" |

### 🔌 Channel Manager (`/partnership`) - 1 print

| OTA | Status Exemplo |
|-----|----------------|
| Airbnb | 🔴 Não conectado |
| Booking.com | 🟢 Conectado (ID: 12713526) |
| Decolar | 🟢 Conectado (ID: 6435531) |
| Google Vacation Rentals | 🟢 Conectado |
| Site próprio | 🟢 Conectado |
| **Parcerias** | Tabela: Nome do Parceiro, ID no Parceiro, Link, Data criação |

---

## B. CONFIGURAÇÕES GLOBAIS (`/settings/general#*`)

### Sidebar de Configs Globais (1º nível)

```
📋 Configurações gerais    ← ATUAL
├── Modelo de negócio
├── Idioma
├── Moeda
├── Precificação
├── Campos personalizados de anúncio
├── Contabilidade
├── Taxas de câmbio
├── Gestão de acesso
└── Fuso horário

🏨 Reservas
👤 Hóspedes
👨‍💼 Proprietários
📧 E-mails
⚙️ Tarefas operacionais
🏢 Informações da empresa
🏠 Setor Locação Residencial
🏪 Setor Compra e Venda
🎯 Setor Turismo e Experiências
```

### 🌐 Idioma (`#language`) - 1 print

| Campo | Valor |
|-------|-------|
| Idioma padrão | Português do Brasil |
| Idiomas adicionais | Español ✅ Ativar para o site, English ✅ Ativar para o site |
| + Idioma | Adicionar mais |

### 💱 Moeda (`#currency`) - 1 print

| Campo | Valor |
|-------|-------|
| Moeda padrão | BRL (R$), Formato: US$ 123.456.789,00 |
| Moedas adicionais | USD (US$) ✅ Ativar para o site |
| + Moeda | Adicionar mais |

### 💰 Precificação (`#pricing`) - 2 prints

| Seção | Campos |
|-------|--------|
| **Modelo de precificação** | Por noite / Por período (quinzenal, mensal) |
| **Estadia mínima** | Mín: 1 noite |
| **Descontos por duração** | Semanal (7n, 2%), Quinzenal-oculto (14n, 4%), Mensal (28n, 11%) + Definir desconto |
| **Precificação dinâmica Airbnb** | |
| - Early bird | Ativar? % desconto, A partir de quantos dias? |
| - Last minute | Ativar? % desconto, Período de última hora? |
| + Definir desconto | Adicionar regra |
| **Arredondar preços?** | Sim/Não |
| **Garantia de reserva** | Apenas na reserva / Valor integral da reserva / Somente a garantia |

### 📝 Campos Personalizados (`#listing`) - 1 print

| Campo | Descrição |
|-------|-----------|
| Nome do Campo | PT / ES ⚠️ / EN ⚠️ |
| Variável para e-mail | Ex: `InstrucoesDeVendas`, `videolinkcomochegar`, `linkdogps` |
| Conteúdo teste | Valor de exemplo para editor de e-mails |

**Exemplos criados:**
- Instruções de Vendas
- vídeo link como chegar
- link do gps
- Instruções de como chegar (algo bem específico)

### 🧾 Contabilidade (`#accounting`) - 1 print

| Seção | Campos |
|-------|--------|
| **Numeração de faturas** | ✅ Ativado, Formato: [prefixo]-[nnnnnnn]-[sufixo] ou [AAAA][MM][código reserva][número inicial][versão] |
| **Tokenização de cartões** | Salvar dados de cartão do hóspede? Sim/Não |
| **Data início rotina financeira** | Ex: 17 fev 2023 |

### 💱 Taxas de Câmbio (`#exchange`) - 1 print

| Par | Taxa Manual |
|-----|-------------|
| BRL/USD | 0% |
| USD/BRL | 0% |

### 🕐 Fuso Horário (`#timezone`) - 1 print

| Campo | Valor |
|-------|-------|
| Fuso horário padrão | America/Sao_Paulo (GMT-3) |

---

## C. CONFIGURAÇÕES DE RESERVA GLOBAL (`/settings/reserve#*`) - 8 prints

> **⭐ SEÇÃO CRÍTICA:** Estas são as configurações DEFAULT que cada anúncio herda.
> Cada uma pode ser sobrescrita no nível individual do anúncio.

### Sidebar de Reservas (2º nível)

```
🏨 Reservas                    ← SEÇÃO ATUAL
├── Duração                    ← #duration
├── Check-in e checkout        ← #inout
├── Tempo de preparação        ← #block
├── Pré-reservas               ← #prebooking
├── Reservas Instantâneas      ← #instantbooking
├── Fatura                     ← #invoice
├── Contrato                   ← #contract
└── Política de cancelamento   ← #policy
```

### 📅 Duração (`#duration`) - 1 print

| Seção | Campos | Valores Exemplo |
|-------|--------|-----------------|
| **Restrições sobre número de noites** | | |
| Reservas feitas a partir do site | MIN: 1, MAX: 365 | Considera política de rate plans |
| Reservas feitas manualmente nos calendários (backend) | MIN: 1, MAX: 1094 | Para admin criar reservas |
| Restringir período de reserva em alguns canais de venda | MIN: baseado no calendário, MAX: 720 | ⚠️ Airbnb e VRBO via conexão API |
| Limites de período sobre bloqueios nos calendários | MIN: 1, MAX: 1094 | Evitar desativar anúncio |
| **Período de disponibilidade** | | |
| Qual é o período máximo para reservas? | Meses: 14 | ⚠️ Booking aceita só até 360 dias |

### ⏰ Check-in e Checkout (`#inout`) - 1 print

| Seção | Campos | Valores Exemplo |
|-------|--------|-----------------|
| **Check-in** | | |
| Horário de check-in | Início: 13:00, Fim: 20:00 | Janela padrão |
| Você cobra taxa para check-in antecipado? | Sim/Não | |
| Horário de check-in com custo adicional | Início: 0:00, Fim: 14:00 | |
| Como será cobrado? | [Porcentagem] [Valor fixo] | % ou R$ |
| Valor | R$ 50 | |
| Relação com contabilidade | Receitas > Early Check-in | Categoria contábil |
| **Checkout** | | |
| Horário de checkout | Início: 6:00, Fim: 12:00 | |
| Você cobra taxa para checkout tardio? | Sim/Não | |
| Horário de checkout com custo adicional | Início: 12:00, Fim: 17:00 | |
| Como será cobrado? | [Porcentagem] [Valor fixo] | |
| Valor | R$ 50 | |
| Relação com contabilidade | Receitas > Late Check-out | |

### 🔒 Tempo de Preparação (`#block`) - 1 print

| Campo | Descrição |
|-------|-----------|
| Quantos dias você precisa para deixar suas acomodações prontas? | Bloqueio automático para limpeza |
| Dias (default) | 0 dias | |
| ⚠️ Aviso | "A definir dias reservados, nova unicidade é verificar aplicando o tempo de preparação automaticamente" |
| Quer bloquear em noites anteriores a check-ins já existentes? | Sim/Não - Aplica retroativo |
| ⚠️ Aviso em Sim | "Você tem mais segundos para aceitar mensalidade. Inclusive reserve-se e bloqueios manuais" |

### 📋 Pré-reservas (`#prebooking`) - 1 print

| Seção | Campos |
|-------|--------|
| **Pré-reservas vindas do site** | |
| Automaticamente cancelar reservas incompletas do site? | Sim/Não + definir regras |
| ⚠️ Aviso | "O sistema irá verificar a cada 15 minutos as reservas expiradas" |
| Processo de reserva não finalizada no site | Dias: 0, Horas: 4, Minutos: 0 |
| Reservas em que o hóspede escolheu pagar via boleto/PIX | Dias: 0, Horas: 0, Minutos: 0 |
| **Pré-reservas criadas pelo seu time** | |
| Automaticamente cancelar pré-reservas feitas pelo time? | Sim/Não |
| ⚠️ Aviso | "O sistema irá verificar a cada 15 minutos as reservas expiradas" |
| **Pré-reservas criadas pelos agentes via calendário** | |
| Boleto pendente: o hóspede precisa enviar comprovante | (configurável) |

### ⚡ Reservas Instantâneas (`#instantbooking`) - 1 print

| Campo | Descrição |
|-------|-----------|
| Você permite reservas instantâneas? | Sim/Não |
| ⚠️ Explicação | "Ao marcar [Sim], o hóspede poderá reservar diretamente para seu site, Airbnb e outros canais que permitem essa opção" |
| **Tempo de antecedência** | |
| Que horas um tempo de antecedência para reservas de última hora (last minute)? | Sim/Não |
| Opções | [Por horário] [Por dias] |
| Até às (se por horário) | 11:00 |

### 🧾 Fatura (`#invoice`) - 1 print

| Seção | Campos |
|-------|--------|
| **Central de reservas e finanças** | |
| Relação com o plano de contas | Receitas > Valor das Diárias |
| **Descontos** | |
| Limite para descontos | % máximo que operadores de reservas podem aplicar |
| Valor | 100% |
| **Total das diárias na fatura** | |
| Exibir detalhes sobre como o preço foi calculado? | ✅ Exibir detalhes sobre como foi calculado |
| | ✅ Exibir detalhes sobre como o preço das diárias foi calculado? |
| **Taxa por hóspede adicional** | |
| Como apresentar esta cobrança na fatura? | Opções: |
| | ○ Incluir a taxa no valor total das diárias |
| | ● Exibir como um item de taxa na fatura de hospedagem |
| **Consumo de energia elétrica** | |
| Cobrar o consumo de eletricidade à parte? | [Nunca] [Sempre] [Apenas mensalmente] [Para todas as reservas acima de X dias] |

### 📄 Contrato (`#contract`) - 1 print

| Seção | Campos |
|-------|--------|
| **Campos necessários para criar contrato** | |
| **Informações de contato do hóspede** | |
| Selecione quais dados são campos obrigatórios | |
| | ✅ E-mail |
| | ✅ Telefone |
| **Documentação do hóspede** | |
| | ☐ Passaporte |
| | ☐ Código da reserva |
| | ☐ CPF |
| | ☐ Identificação fiscal (CPNJ) |
| **Endereço do hóspede** | |
| | ☐ CEP |
| | ☐ País |
| | ☐ Estado |
| | ✅ Bairro |
| | ☐ Cidade |
| | ☐ Rua |
| | ☐ Número |
| | ☐ Complemento |

### ❌ Política de Cancelamento (`#policy`) - 1 print

| Campo | Descrição |
|-------|-----------|
| Qual é sua política de cancelamento padrão? | Dropdown para selecionar |
| Link "Saiba mais" | Leva para documentação de como criar políticas |
| ⚠️ Nota | Esta política é herdada por TODOS os anúncios novos |

---

# 🔗 MAPEAMENTO CRÍTICO: GLOBAL ↔ INDIVIDUAL

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 PADRÃO STAYS.NET QUE DEVEMOS SEGUIR                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  GLOBAL (Configurações Gerais)     ←→     INDIVIDUAL (No Anúncio)            ║
║  /settings/reservas                       /properties/:id/edit                ║
║  /settings/precificacao                   > FINANCEIRO > Relacionamento       ║
║                                           > CONFIGURAÇÕES > *                 ║
║                                                                               ║
║  ┌─────────────────┐                      ┌─────────────────┐                 ║
║  │  DEFAULT        │  ─── herda de ───►  │  OVERRIDE       │                 ║
║  │  (organização)  │  ◄── se vazio ───   │  (por anúncio)  │                 ║
║  └─────────────────┘                      └─────────────────┘                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## Tabela de Relacionamento: Stays vs Rendizy

| Funcionalidade | STAYS Global | STAYS Individual | RENDIZY Global | RENDIZY Individual |
|----------------|--------------|------------------|----------------|-------------------|
| **Política Cancelamento** | ✅ `/settings/general#pricing` | ✅ `/reservation-settings` | ⚠️ `/settings/reservas` | 🚧 `CONFIGURAÇÕES > Políticas` |
| **Check-in/Check-out** | ✅ Configs globais | ✅ G/I + Prévia | ⚠️ `/settings/reservas` | 🚧 `CONFIGURAÇÕES > Check-in` |
| **Estadia mínima** | ✅ `/settings/general#pricing` | ✅ `/reservation-settings` | ⚠️ `/settings/reservas` | ⚠️ `CONFIGURAÇÕES > Reservas` |
| **Regras da Casa** | - | ✅ `/house_rules` | ⚠️ `/settings/reservas` | 🚧 `CONFIGURAÇÕES > Regras Casa` |
| **Comissão/Repasse** | ✅ `/settings/landlord#comission` | ✅ `/contract` G/I | ❌ Não existe | ⚠️ `FINANCEIRO > Relacionamento` |
| **Automação Repasse** | ✅ `/settings/landlord#automation` | - | ❌ Não existe | - |
| **Permissões Proprietário** | ✅ `/settings/landlord#permissio` | - | ❌ Não existe | - |
| **Permissões Hóspede** | ✅ `/settings/client#settings_permissions` | - | ❌ Não existe | - |
| **Descontos pacote** | ✅ `/settings/general#pricing` | ✅ `/sellprice` G/I | ⚠️ `/settings/precificacao` | ⚠️ `FINANCEIRO > Temporada` |
| **Taxas (limpeza, etc)** | ✅ Em Contrato | ✅ `/sellprice` G/I | ❓ A verificar | ⚠️ `FINANCEIRO > Temporada` |
| **E-mails Geral** | ✅ `/settings/email#general` | - | ❓ Em Chat | - |
| **E-mails Reserva** | ✅ `/settings/email#reservation` | ✅ 8 tipos em `/contract` | ❓ Em Chat | ❌ Não vinculado ao anúncio |
| **E-mails Proprietário** | ✅ `/settings/email#owner` | - | ❌ Não existe | - |
| **E-mails Site** | ✅ `/settings/email#website` | - | ❌ Não existe | - |
| **iCal** | - | ✅ `/icalendar` | ❓ A verificar | ❓ A verificar |
| **Channel Manager** | - | ✅ `/partnership` | ⚠️ `/settings/integracoes` | 🚧 `CONFIGURAÇÕES > Integração` |
| **Idiomas** | ✅ `#language` | - | ❓ Não visto | - |
| **Moedas** | ✅ `#currency` | ⚠️ Individual em sellprice | ⚠️ `/settings/precificacao` | - |
| **Fuso horário** | ✅ `#timezone` | - | ❓ Não visto | - |
| **Campos personalizados** | ✅ `#listing` | - | ⚠️ Em Settings/Properties | - |

---

## D. CONFIGURAÇÕES DE HÓSPEDES GLOBAL (`/settings/client#*`) - 1 print

### 🎫 Permissão (`#settings_permissions`) - 1 print

| Seção | Campos | Valores |
|-------|--------|---------|
| **Painel de hóspedes do site** | | |
| Hóspedes podem informar o horário estimado de check-in e checkout? | [Sim/Não] + "Saiba mais" | |
| Hóspedes podem inserir informações sobre os acompanhantes? | [Sim/Não] | Ao habilitar, hóspedes informam quantidade e nomes |
| Hóspedes podem anexar documentos dos acompanhantes? | [Sim/Não] | Arquivos aparecem na página de reserva |
| **Permissões de reserva** | | |
| Hóspedes podem alterar a data do check-in? | [Sim/Não] | Não precisa de autorização |
| Hóspedes podem alterar a data do checkout? | [Sim/Não] | Não precisa de autorização |
| Hóspedes podem escolher o horário de check-in ou checkout da reserva? | [Sim/Não] + "Saiba mais" | Taxa cobrada automaticamente se diferente do padrão |

---

## E. CONFIGURAÇÕES DE PROPRIETÁRIOS GLOBAL (`/settings/landlord#*`) - 4 prints

### 🔐 Permissão (`#permissio`) - 1 print

| Seção | Campos | Tipo |
|-------|--------|------|
| **O que deve aparecer no calendário do proprietário?** | | |
| Link do anúncio | [Sim/Não] | O proprietário pode ver a lista de anúncios no site |
| **Quais informações da reserva o proprietário pode ver?** | | |
| Nome do hóspede | [Sim/Não] | Configuração herdada ou personalizada a nível de anúncio também |
| Canal de venda | [Sim/Não] | Informar ao proprietário por qual portal a reserva veio |
| Reservas vindas antes do repasse | [Sim/Não] | Área de repasse destaca as reservas não repassadas |
| Taxas aplicadas no repasse | [Sim/Não] | Mostrar taxas que descontaram do valor final do proprietário |
| Comissão sobre a reserva | [Sim/Não] | Quanto a administradora cobrou em cada reserva |
| Separar transações por tipo | [Sim/Não] | Mostrar as transações confirmadas e pendentes em tabelas separadas |
| Valor total da reserva | [Sim/Não] | Mostrar aos proprietários o valor total das reservas |
| Saldo acumulado | [Sim/Não] | Mostrar o saldo acumulado dos proprietários |

### 💰 Comissão (`#comission`) - 1 print

| Seção | Campos | Valores |
|-------|--------|---------|
| **Modelo de comissão** | | |
| Modelo de negócio | [Comissão Fixa %] | A opção "Comissão Fixa %" é a mais comum |
| **Comissão padrão** | | "Será calculada durante o processo de repasse da reserva" + "Saiba mais" |
| Valor (%) | Input numérico | Ex: 25% |
| Base de cálculo | ○ Do total da fatura de hospedagem | |
| | ○ Do valor total das diárias | |
| | ● Do valor da fatura total | |
| **Deseja considerar a comissão dos canais?** | [Sim/Não] | Considera comissões das OTAs no cálculo do repasse |
| **Descontar as comissões dos canais antes de calcular o repasse?** | [Sim/Não] + "Saiba mais" | Valor cobrado pelo canal é descontado da base de cálculo |
| **Permitir que um repasse seja excluído após o balancete?** | [Sim/Não] | Se [Sim], pode excluir qualquer repasse. Se [Não], não exclui depois de pago |

### ⚙️ Automação (`#automation`) - 1 print

| Seção | Campos | Valores |
|-------|--------|---------|
| **Configure seu repasse de reservas automático** | | |
| Repasse automatizado | [Sim/Não] | Aplica regra a todas reservas que ainda não foram repassadas |
| **Sempre repassar o valor total do proprietário?** | [Sim/Não] | Se [Não], pode enviar valores em etapas diferentes |
| **Automatizar o repasse para todos os canais?** | [Todos/Selecionados] | Escolhe para quais parceiros o repasse é automatizado |
| **Quando o sistema deve iniciar o repasse automático?** | | "Saiba mais" sobre comportamento de créditos |
| Modo | [A cada reserva*] [Em grupos] | |
| Trigger | [Criação] [Check-in] [Checkout*] [Pagamento] [Status] | |
| Dias após o trigger | Input numérico | Ex: 1 dia após o checkout |
| + Adicionar condição | Botão | Permite múltiplas regras |
| **Você quer definir quando a automação de repasse deve começar?** | [Sim/Não] | Escolhe data de início da automação |
| **Não faça a automatização se...** | Checkboxes | |
| | ☑️ Inservidas / Reservas | Reservas problemáticas |
| | ☐ Alterações sobre o período da reserva (datas de check-in e checkout) | |
| | ☐ Reservas onde houve transferência de acomodações | |

---

## F. CONFIGURAÇÕES DE E-MAILS GLOBAL (`/settings/email#*`) - 5 prints

> **📧 SEÇÃO CRÍTICA:** Configurações de e-mails automáticos por evento.
> Define QUEM recebe QUAL notificação e QUANDO.

### Sidebar de E-mails

```
📧 E-mails                     ← SEÇÃO ATUAL
├── Geral                      ← #general
├── Reserva                    ← #reservation
├── Proprietário               ← #owner
└── Site                       ← #website
```

### 📧 Geral (`#general`) - 1 print

| Campo | Descrição | Valor Exemplo |
|-------|-----------|---------------|
| **E-mail padrão do sistema** | E-mail usado para envio de atualizações e criação de contas básicas de usuários | contato@suacasarendemais.com.br |
| **Receber cópia dos e-mails** | Coloque um e-mail para receber cópias das notificações enviadas pelo Stays (backup de mensagens) | contato@suacasarendemais.com.br |

### 📧 Reserva (`#reservation`) - 2 prints

| Seção | Campos | Opções |
|-------|--------|--------|
| **Atualizações de reserva para seu time** | | |
| Status das reservas | Marque para quais eventos deseja receber notificações | ☑️ pré-reservas |
| | | ☑️ Reservas |
| | | ☐ Checkout |
| | | ☑️ canceladas |
| | | ☐ Retirada |
| Destinatários | Lista de e-mails que receberão | + Usar instâncias |
| **Cancelamento de reservas** | | |
| Enviar aviso sobre cancelamento de reserva | [Ninguém] [Confirmar antes do envio] [Nunca] | |
| | ☑️ Notificar hóspede | |
| | ☑️ Notificar proprietário | |
| | ☐ Notificar agente do proprietário | |
| **Exclusão de reservas** | | |
| Enviar notificação sobre exclusão de reserva | [Sempre] [Confirmar antes do envio] [Nunca] | |
| **Lembrete de reserva ao hóspede** | | |
| Enviar e-mail de lembrete ao hóspede? | [Sim/Não] | |
| Quando devemos enviar o e-mail? | Dias: [input] | Ex: 1 dia antes da chegada |
| **Comunicação com o hóspede após o check-in e antes do checkout** | | |
| Enviar email de avaliação ao hóspede | ☐ 1 dia após o check-in | "Saiba mais" |
| Enviar email de agradecimento ao hóspede | ☐ 1 dia antes do checkout | |
| **Avaliação sobre a reserva** | | |
| Enviar pedido de avaliação aos hóspedes? | [Sim/Não] | |
| Quando devemos enviar o e-mail? | Dias: [input] | Ex: 0 dias após checkout |
| Insistir o pedido? | [Sim/Não] | Segunda tentativa |
| Quando devemos enviar o e-mail? (insistência) | Dias: [input] | Ex: 1 dia depois |

### 📧 Proprietário (`#owner`) - 1 print

| Seção | Campos | Opções |
|-------|--------|--------|
| **Pedidos de parceria (captura de imóveis)** | | |
| Quem deve receber a notificação? | E-mail do responsável por novos pedidos de proprietários | "Saiba mais" |
| **Fim do contrato com os proprietários** | | |
| Deseja receber um alerta se meus casos? | [Sim/Não] | Alerta quando contrato expira |
| **Pré-reservas** | | |
| Informar aos proprietários sobre novas pré-reservas? | [Sim/Não] | Por email automaticamente |
| Informar ao agente do proprietário sobre pré-reservas? | [Sim/Não] | |
| **Reservas confirmadas** | | |
| Informar aos proprietários sobre novas reservas confirmadas? | [Sim/Não] | |
| Informar ao agente do proprietário sobre novas reservas confirmadas? | [Sim/Não] | |

### 📧 Site (`#website`) - 1 print

| Seção | Campos | Valores |
|-------|--------|---------|
| **Pedidos recebidos pelo site** | | |
| Formulário de contato | E-mail que recebe mensagens do formulário de contato | "Saiba mais" |
| Formulário de solicitação de reserva | E-mail que recebe pedidos de reserva | |
| **Notificar hóspedes sobre informações da reserva** | | |
| | ☐ msg. reserva incompleta | |
| | ☐ msg. confirmação automática | |
| | ☐ msg. confirmação de pagamento | |
| **Reservas de última hora (last minute)** | | |
| Enviar um e-mail específico para reservas de última hora (last minute)? | [Sim/Não] | "Saiba mais" |
| Qual período você considera como "última hora"? | Horas: [input] | Considera reserva feita X horas antes da chegada |

---

## G. CHANNEL MANAGER - AIRBNB (`/chmanager/airbnb/*`) - 8 prints

> **🔴 SEÇÃO CRÍTICA - INTERFACE DO USUÁRIO**
> Esta é a tela onde o CLIENTE (não o dev) configura suas regras de conexão com o Airbnb.
> **⚠️ DIFERENTE da tela de Integrações (Admin Master/Dev) que configura APIs.**

### Sidebar do Channel Manager Airbnb

```
🏠 Airbnb                      ← SEÇÃO ATUAL
├── Anúncios                   ← Lista de anúncios conectados
├── Configurações              ← /settings (7 sub-seções)
├── Conta                      ← /authorization (OAuth)
├── Atualizações               ← Logs de sync
└── FAQ                        ← Ajuda
```

### ⚙️ Menu Configurações (`/settings`) - 1 print

| Item | Descrição | URL |
|------|-----------|-----|
| **Usuário** | Responsabilidade pelas reservas | /settings/user |
| **Financeiro** | Moeda, correção de preços, fluxo de caixa | /settings/finance |
| **Grupos tarifários verticais** | Configurações sobre disponibilidade | /settings/groups |
| **Políticas de cancelamento** | Mapeamento, condições | /settings/cancel |
| **Taxas e impostos** | Mapeamento e condições de taxas | /settings/fees |
| **Reservas** | Instantâneas, check-in flexível, instruções | /settings/booking_settings |
| **Conteúdo** | Quais conteúdos devemos enviar | /settings/content |

### 💰 Financeiro (`/settings/finance`) - 1 print

| Seção | Campos | Opções |
|-------|--------|--------|
| **Correção de preço** | | |
| Correção de preços | Aumentar ou diminuir percentualmente os preços das diárias no Airbnb | Ex: 10%, -10% |
| Aplicar correção do preço | Base de cálculo da comissão | [Valor das diárias*] [Taxas] |
| Definir individualmente para cada anúncio? | Override por anúncio | [Sim/Não*] |
| **Moeda** | | |
| Em qual moeda devemos enviar seus preços para o canal? | Moeda padrão | BRL (dropdown) |
| Definir individualmente para cada anúncio? | Override por anúncio | [Sim] [Não*] |
| **Contabilidade** | | |
| Relacione as transações do Airbnb a uma conta bancária e a uma posição contábil no seu plano de contas | | |
| Comissão (D) | Despesas - Taxa Airbnb | Dropdown |
| Comissão (C) | Receitas - Reservas Airbnb | Dropdown |

### 📊 Grupos Tarifários Verticais (`/settings/groups`) - 1 print

| Campo | Descrição | Opções |
|-------|-----------|--------|
| **Grupos tarifários verticais** | Suas unidades podem ser enviadas como anúncios individuais ou com a estrutura de categoria de quarto | "Saiba mais" |
| Como seu grupo com anúncios clonados deve ser enviado? | Para anúncios duplicados | [Agrupados] [Individual*] |
| Como seu grupo com anúncios similares deve ser enviado? | Para anúncios parecidos | [Agrupados] [Individual*] |

### ❌ Políticas de Cancelamento (`/settings/cancel`) - 1 print

| Seção | Campos | Opções |
|-------|--------|--------|
| **Política padrão** | Defina a política padrão das reservas vindas do Airbnb | Dropdown: Moderada |
| **Relacione suas políticas com as do canal** | | |
| ☐ **Política** | Selecione a política do canal que você se relaciona com a sua | |
| | Política Stays | Dropdown: Moderada |
| | Desconto para reservas não reembolsáveis? | [Sim/Não*] |
| | Qual oferece desconto/do desconto que será dado ao hóspede | R$ [input] |
| ☐ **Reservas antecipadas** | Política para reservas feitas com antecedência | Dropdown: Flexível |
| ☐ **Isenção total de Cancelamento** | Política sem penalidade | Dropdown: Não fazer submissão |
| | Desconto para reservas não reembolsáveis? | [Sim] [Não*] |
| ☐ **Não reembolsável - sem desconto** | Política rígida | Dropdown: Não fazer submissão |
| | Desconto para reservas não reembolsáveis? | [Sim] [Não*] |
| **Definir individualmente para cada anúncio?** | Override | [Sim] [Não*] |

### 🧾 Taxas e Impostos (`/settings/fees`) - 1 print

| Campo | Descrição | Mapeamento |
|-------|-----------|------------|
| **Relacione suas taxas cadastradas no Stays com as taxas do canal** | Link: iCatálogo > Auxiliares > Gerenciamento de Taxas | |
| Taxa de Limpeza * | Taxa obrigatória | CLEANING_FEE (dropdown) |
| Taxa para impulsionamento de mídias sociais | Taxa opcional | MANAGEMENT_FEE (dropdown) |

### 📅 Reservas (`/settings/booking_settings`) - 1 print

| Seção | Campos | Opções |
|-------|--------|--------|
| **Reserva instantânea** | | |
| Reserva instantânea | Quais tipos de hóspedes podem fazer reservas instantâneas? | [Todos*] [Bem avaliados] |
| **Instruções para checkout** | | |
| Instruções para checkout | O Airbnb pode enviar suas instruções de checkout para os hóspedes | Tags selecionáveis: |
| | | [Devolver chaves] [Desligar tudo da acomodação] [Tirar o lixo] [Trancar tudo] [Recolher as toalhas usadas] |
| **Check-in flexível** | | |
| Seu horário inicial para check-in é flexível? | Ao marcar [Sim], seu check-in pode iniciar em qualquer horário | [Sim] [Não*] |
| Seu horário final para check-in é flexível? | Ao marcar [Sim], não há horário final para check-in | [Sim] [Não*] |

### 📝 Conteúdo (`/settings/content`) - 1 print

| Campo | Descrição | Opções |
|-------|-----------|--------|
| **Configurações de conteúdo API** | | |
| Stays deve gerenciar os principais conteúdos do seu anúncio Airbnb? | Atualiza dados do anúncio (endereço, comodidades, tipo) | [Sim*] [Não] + "saiba como alterar estes detalhes no Airbnb" |
| Stays deve gerenciar as descrições do seu anúncio no Airbnb? | Atualiza título e texto completo | [Sim] [Não*] + "saiba como alterar no Airbnb" |
| Stays deve gerenciar as configurações de reserva do seu anúncio no Airbnb? | Atualiza política de cancelamento, horários, reserva instantânea | [Sim*] [Não] |
| Stays deve gerenciar as fotos do seu anúncio no Airbnb? | Atualiza imagens do anúncio e dos cômodos | [Sim*] [Não] |
| Stays deve gerenciar o valor de caução no Airbnb? | Atualiza valor e regras da caução | [Sim*] [Não] + "saiba como alterar no Airbnb" |

### 🔐 Conta/Autorização (`/authorization`) - 1 print

| Seção | Campos |
|-------|--------|
| **Conecte sua conta Airbnb com o Stays** | Se você administra mais de uma conta, deve conectar uma por vez. Para evitar conflitos, esteja logado apenas na conta que pretende conectar agora. |
| 1. Defina o nome interno da conta | Nome ou referência para identificar a conta conectada |
| | Input: "Nome interno da conta" |
| | Botão: [Próximo] |
| **Conexão de conta Airbnb** (cards múltiplos) | |
| | Nome interno: Ex: "Celso Teixeira - Imóveis Celso Volta Redonda e Citta vespasiano" |
| | 👤 Autorize a conexão: Nome do usuário Airbnb + 🔑 ID (ex: 33041297) |
| | Botão: [↻ Atualizar token] |

### 🏠 Lista de Anúncios (`/apartments/0`) - 1 print

| Seção | Campos | Opções |
|-------|--------|--------|
| **Sidebar** | | |
| Tabs | Anúncios*, Configurações, Conta, Atualizações, FAQ | |
| **Filtros** | | |
| Status | Dropdown de status | Todos (default) |
| Acomodações | Dropdown multi-select | Não selecionado |
| Busca por texto | Input de busca livre | ... |
| Selecione o ID Airbnb | Dropdown + botão [+] | Para conectar novo |
| **Status disponíveis** | | |
| 🟢 Conectado | Anúncio sincronizado | Badge verde |
| 🟠 Não conectado | Aguardando conexão | Badge laranja |
| 🔴 Fechado | Desativado | Badge vermelho |
| **Ações** | | |
| Importar anúncios | Importar da conta Airbnb | Botão secundário |
| Atualizar | Sincronizar lista | Botão primário azul |
| **Lista de Cards** | | |
| Cada card contém | Foto thumbnail + Nome do anúncio + Badge status + Seta [>] | Clicável para editar |

---

## H. GERENCIAMENTO DE TAXAS (`/fee-manager/*`) - 1 print

> **📋 NOTA:** Esta funcionalidade deve ser criada em **Configurações Gerais** do Rendizy.
> Achar o melhor lugar na sidebar (possivelmente em `/settings/precificacao` ou nova seção).

### 🧾 Criar/Editar Taxa (`/fee-manager/new`) - 1 print

| Seção | Campos | Opções |
|-------|--------|--------|
| **Sidebar** | | |
| Gerenciamento de taxa | "Aplicar taxas nos serviços oferecidos" | |
| Lista de taxas existentes | Ex: Taxa de Limpeza (Obrigatória, ATIVO) | Badge: ATIVO/DESATIVADO |
| | Taxa PET (Hóspedes, DESATIVADO) | |
| | Impulsionamento Instagram (Proprietário/Hóspede, ATIVO) | |
| | Vendas Instagram e Youtube (Proprietário/Hóspede, DESLIGADO) | |
| | Limpeza 3.0 (Hóspedes, DESATIVADO) | |
| Botão | [+ Criar taxa] | Primário verde |
| **Configurações gerais** | | |
| Ativo | Esta taxa está ativa? | [Sim] [Não*] |
| Nome interno | Nome no Sistema | Input texto |
| Nome | Nome da taxa apresentado aos seus parceiros e/ou clientes | Multi-idioma: PT / ES ⚠️ / EN ⚠️ |
| | | "Saiba mais" link |
| **Definir um valor** | | |
| Como o valor total da taxa será definido/calculado | Modo de cálculo | [Por noite] [Por reserva] [Por hóspede e noites] |
| Tipo de valor | | [Porcentagem] [Moeda*] |
| Valor | | BRL + Input numérico |
| **Cobrança ao Hóspede** | | |
| A taxa deve ser cobrada na fatura do hóspede? | Ao marcar [Sim], a taxa será cobrada ao hóspede no momento da reserva | [Sim] [Não*] |
| | "Você poderá definir como será a cobrança dentro da aba [Comportamento]" | |
| **Desconto do Proprietário** | | |
| A taxa deve ser descontada do proprietário no repasse de reservas? | Ao marcar [Sim], o proprietário não receberá comissão sobre o valor da taxa | [Sim] [Não*] |
| | "Saiba mais" link | |
| **Proprietário** | | |
| Marque [Sim] se você deseja cobrar a taxa para uso próprio do proprietário no imóvel | Cobrança será com base nos bloqueios criados pelo proprietário via extranet dele | [Sim] [Não*] |
| | "Você pode colocar um valor diferenciado de taxa nesses casos" | |
| **Ações** | | |
| Botão Salvar | Canto superior direito | [💾 Salvar] |

---

# ═══════════════════════════════════════════════════════════════
# 🔴 PENDÊNCIAS DE DESENVOLVIMENTO
# ═══════════════════════════════════════════════════════════════

## 🚨 PENDÊNCIA CRÍTICA: Separação de Telas de Integração

### Situação Atual (Rendizy)
```
/settings > Integrações
├── Cards de OTAs (Stays, Booking, Airbnb, Expedia, Decolar)
├── Modal Expedia Group
│   ├── Credenciais (API Key, Secret, Partner ID)  ← DEV CONFIG
│   ├── Canais (VRBO, Hotels.com)                  ← DEV CONFIG
│   ├── Pagamentos (Collect, 3DS)                  ← DEV CONFIG
│   └── Webhooks (URL, Secret, Eventos)            ← DEV CONFIG
└── 12 ativos, 1 em breve, 13 total
```

### Problema
⚠️ **MISTURA configurações de DEV (API) com configurações de USUÁRIO (regras de canal)**

### Solução Necessária

#### 1. ADMIN MASTER (Dev Only) - Manter em `/settings/integracoes`
```
🔧 Integrações (Admin Master)
├── Credenciais de API
├── Webhooks
├── Ambiente (Sandbox/Produção)
└── Logs técnicos
```

#### 2. NOVA ABA: Channel Managers (Usuário) - Criar em `/settings/channels`
```
📺 Channel Managers (Usuário)
├── Airbnb
│   ├── Financeiro (correção %, moeda)
│   ├── Grupos tarifários
│   ├── Políticas de cancelamento (mapeamento)
│   ├── Taxas e impostos (mapeamento)
│   ├── Reservas (instantânea, check-in flexível)
│   ├── Conteúdo (o que sincronizar)
│   └── Conta (OAuth, múltiplas contas)
├── Booking.com (similar)
├── Expedia Group (similar)
└── Decolar (similar)
```

### Referência: Stays.net
- **Admin/Dev:** Não exposto ao usuário
- **Usuário:** `/chmanager/airbnb/settings` com 7 sub-seções completas

### Status
- [ ] **TODO:** Criar aba "Channel Managers" em Configurações
- [ ] **TODO:** Mover/criar interface de usuário para cada OTA
- [ ] **TODO:** Restringir "Integrações" ao Admin Master
- [ ] **TODO:** Implementar OAuth para conexão de contas (Airbnb, etc.)

---

## 🚨 PENDÊNCIA: Gerenciamento de Taxas

### Situação Atual
- Stays.net tem `/fee-manager` com CRUD completo de taxas
- Taxas podem ser: Por noite, Por reserva, Por hóspede e noites
- Taxas podem ser cobradas do hóspede E/OU descontadas do proprietário
- Multi-idioma (PT/ES/EN)

### Onde criar no Rendizy?
**Opções a avaliar:**
1. `/settings/precificacao` - Junto com descontos e moedas
2. `/settings/taxas` - Nova seção dedicada
3. `Configurações Gerais > Taxas` - Sub-item

### Status
- [ ] **TODO:** Definir melhor localização na sidebar
- [ ] **TODO:** Criar CRUD de taxas (similar ao Stays)
- [ ] **TODO:** Integrar taxas com Channel Manager (mapeamento)

---

# 🔗 MAPEAMENTO CRÍTICO: GLOBAL ↔ INDIVIDUAL

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 PADRÃO STAYS.NET QUE DEVEMOS SEGUIR                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  GLOBAL (Configurações Gerais)     ←→     INDIVIDUAL (No Anúncio)            ║
║  /settings/reservas                       /properties/:id/edit                ║
║  /settings/precificacao                   > FINANCEIRO > Relacionamento       ║
║  /settings/landlord (NOVO)                > CONFIGURAÇÕES > *                 ║
║  /settings/email (NOVO)                                                       ║
║  /settings/client (NOVO)                                                      ║
║                                                                               ║
║  ┌─────────────────┐                      ┌─────────────────┐                 ║
║  │  DEFAULT        │  ─── herda de ───►  │  OVERRIDE       │                 ║
║  │  (organização)  │  ◄── se vazio ───   │  (por anúncio)  │                 ║
║  └─────────────────┘                      └─────────────────┘                 ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## ⚠️ GAPS IDENTIFICADOS

### 1. **Falta Global de Comissão/Repasse no Rendizy**
- Stays tem em `/settings/landlord#comission` com modelo completo (% fixa, base cálculo, considerar canais)
- Stays tem em `/settings/landlord#automation` com repasse automático configurável
- Rendizy só tem em `FINANCEIRO > Relacionamento` (apenas individual)
- **AÇÃO:** Criar seção em `/settings/` para comissão padrão da organização + automação de repasse

### 2. **Falta padrão visual "Global/Individual"**
- Stays tem toggle claro: `[Global] [Individual]` + botão `[Prévia]`
- Rendizy não tem esse padrão visual consistente
- **AÇÃO:** Padronizar componente UI com toggle Global/Individual

### 3. **E-mails por evento não vinculados ao anúncio**
- Stays tem 8+ tipos de e-mail configuráveis POR ANÚNCIO (no `/contract`)
- Stays tem configuração GLOBAL completa em `/settings/email` (4 sub-seções)
- Rendizy tem e-mails em Chat mas não vinculado ao anúncio específico
- **AÇÃO:** Criar estrutura de e-mails similar ao Stays (Geral, Reserva, Proprietário, Site)

### 4. **Falta Fuso Horário e Idiomas em Settings**
- Stays tem configuração clara de timezone e multi-idioma
- Rendizy parece não ter isso exposto
- **AÇÃO:** Verificar se existe e se não, criar

### 5. **Falta Configurações de Hóspedes Global**
- Stays tem `/settings/client#settings_permissions` com permissões de painel
- Hóspede pode informar horário, acompanhantes, documentos, alterar datas
- Rendizy não tem essa configuração global
- **AÇÃO:** Criar seção de permissões de hóspedes em Settings

### 6. **Falta Configurações de Proprietários Global**
- Stays tem `/settings/landlord` com 4 sub-seções completas:
  - Cadastro (não documentado ainda)
  - Permissão (o que proprietário pode ver)
  - Comissão (modelo de negócio)
  - Automação (repasse automático)
- Rendizy não tem essa estrutura completa
- **AÇÃO:** Criar módulo completo de configurações de proprietários

### 7. **iCal não visível no Rendizy**
- Stays tem `/icalendar` com import/export
- Rendizy pode ter mas não foi printado
- **AÇÃO:** Verificar existência

### 8. **🚨 CRÍTICO: Falta Interface de Channel Manager para Usuário**
- Stays tem `/chmanager/airbnb/settings` com 7 sub-seções completas para o USUÁRIO configurar
- Rendizy tem apenas tela de Integrações com configs de API/DEV
- **AÇÃO URGENTE:** Criar aba "Channel Managers" em Configurações separada de "Integrações"
- **Detalhes:** Ver seção "PENDÊNCIAS DE DESENVOLVIMENTO" neste documento

---

## 📝 NOTA PARA O CÓDIGO

```typescript
/**
 * ═══════════════════════════════════════════════════════════════
 * RELACIONAMENTO GLOBAL ↔ INDIVIDUAL
 * ═══════════════════════════════════════════════════════════════
 * 
 * GLOBAL (default da organização):
 * - Arquivo: /src/pages/settings/reservas/ConfiguracoesGerais.tsx
 * - Tabela: organization_settings
 * 
 * INDIVIDUAL (override por anúncio):
 * - Arquivo: /src/pages/properties/edit/FinanceiroRelacionamento.tsx
 * - Tabela: properties (campos específicos)
 * 
 * LÓGICA DE HERANÇA:
 * const valorEfetivo = property.campo ?? organization.campo_default
 * 
 * Referências cruzadas no código:
 * - settings/reservas → "Pode ser sobrescrito em cada anúncio"
 * - anuncio/relacionamento → "Herda de Configurações Gerais se vazio"
 * 
 * COMPONENTE PADRÃO A CRIAR:
 * <GlobalIndividualToggle
 *   globalValue={orgSettings.campo}
 *   individualValue={property.campo}
 *   onChange={(value, isIndividual) => {...}}
 *   showPreview={true}
 * />
 * ═══════════════════════════════════════════════════════════════
 */
```

---

# 🎯 PROPOSTA DE ORGANIZAÇÃO NO RENDIZY (v1.0)

> **PRINCÍPIO:** Organizar pela LÓGICA DO NEGÓCIO, não copiar estrutura do Stays.net cegamente.
> **CRÍTICA:** Stays.net tem taxas em Catálogo - deveria estar em Financeiro/Precificação.

## 📐 ARQUITETURA PROPOSTA

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                        🏛️ ESTRUTURA DE MENUS RENDIZY                                   ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║  📊 DASHBOARD                                                                         ║
║  📋 RESERVAS                                                                          ║
║  🏠 ANÚNCIOS                                                                          ║
║  👥 CRM                                                                               ║
║  💼 FINANCEIRO ────────────────────────────────────────────────────────────────────►  ║
║  │   ├── Dashboard                                                                    ║
║  │   ├── Contas a Receber/Pagar                                                       ║
║  │   ├── Caixas                                                                       ║
║  │   ├── ⭐ TAXAS E IMPOSTOS (NOVO - mover do catálogo!)                              ║
║  │   │   ├── Lista de Taxas (CRUD)                                                    ║
║  │   │   ├── Tipos: Por noite | Por reserva | Por hóspede | Por hóspede/noite         ║
║  │   │   ├── Aplicação: Cobrar do hóspede | Descontar do proprietário | Ambos         ║
║  │   │   └── Mapeamento OTA (qual taxa mapeia pra qual no Airbnb/Expedia)             ║
║  │   └── ⭐ COMISSÕES E REPASSES (NOVO)                                               ║
║  │       ├── Modelo de comissão padrão (% fixa, base cálculo)                         ║
║  │       ├── Repasse automático (período, método)                                     ║
║  │       └── Override por proprietário                                                ║
║  │                                                                                    ║
║  📈 BI                                                                                ║
║  💬 CHAT                                                                              ║
║  📅 CALENDÁRIO                                                                        ║
║  🌐 SITE/BOOKING ENGINE                                                               ║
║  ⚙️ CONFIGURAÇÕES ─────────────────────────────────────────────────────────────────►  ║
║      ├── Geral (Organização, Fuso, Idiomas)                                           ║
║      ├── Reservas ─────────────────────────────────────────────────────────────────►  ║
║      │   ├── ⭐ Políticas de Cancelamento (CRUD global)                               ║
║      │   │   ├── Lista de políticas customizadas                                      ║
║      │   │   ├── Mapeamento: "Minha política X = Airbnb Strict"                       ║
║      │   │   └── Default por canal                                                    ║
║      │   ├── Janela de Reserva (min/max)                                              ║
║      │   ├── Duração (mínima/máxima)                                                  ║
║      │   ├── Check-in/out padrão                                                      ║
║      │   └── Reserva Instantânea (default)                                            ║
║      ├── Precificação ─────────────────────────────────────────────────────────────►  ║
║      │   ├── Moeda padrão                                                             ║
║      │   ├── Descontos (por tempo, último minuto)                                     ║
║      │   ├── ⭐ Planos Tarifários (CRUD global)                                       ║
║      │   │   ├── Lista de rate plans                                                  ║
║      │   │   ├── Mapeamento por OTA                                                   ║
║      │   │   └── Regras (não-reembolsável, café incluso, etc.)                        ║
║      │   └── Markup/Ajuste por canal                                                  ║
║      ├── 📺 CHANNEL MANAGERS (NOVO - interface do USUÁRIO) ────────────────────────►  ║
║      │   ├── 🏡 Airbnb                                                                ║
║      │   │   ├── 🔗 Conectar Conta (OAuth) - status: Conectado/Desconectado           ║
║      │   │   ├── 💰 Financeiro (correção %, moeda)                                    ║
║      │   │   ├── 📊 Grupos Tarifários (mapeamento)                                    ║
║      │   │   ├── 🚫 Políticas de Cancelamento (mapeamento)                            ║
║      │   │   ├── 💵 Taxas e Impostos (mapeamento)                                     ║
║      │   │   ├── 📅 Reservas (instantânea, check-in flexível, request-to-book)        ║
║      │   │   ├── 📝 Conteúdo (o que sincronizar: fotos, descrição, amenities)         ║
║      │   │   └── 📋 Anúncios (lista de imóveis com status por imóvel)                 ║
║      │   ├── 🅱️ Booking.com (estrutura similar)                                       ║
║      │   ├── 🌐 Expedia Group (estrutura similar)                                     ║
║      │   └── ✈️ Decolar (estrutura similar)                                           ║
║      ├── Hóspedes ─────────────────────────────────────────────────────────────────►  ║
║      │   ├── Permissões no painel (o que hóspede pode fazer)                          ║
║      │   ├── Campos obrigatórios (documentos, etc.)                                   ║
║      │   └── Comunicação (e-mail automático, WhatsApp)                                ║
║      ├── Proprietários ────────────────────────────────────────────────────────────►  ║
║      │   ├── Permissões no painel                                                     ║
║      │   ├── Relatórios visíveis                                                      ║
║      │   └── Automação de repasse (link com Financeiro)                               ║
║      └── 🔒 Integrações (ADMIN MASTER - apenas dev/API) ───────────────────────────►  ║
║          ├── ⚠️ NÃO É PARA USUÁRIO FINAL - apenas config técnica                      ║
║          ├── Credenciais de API (client_id, client_secret, API keys)                  ║
║          ├── Webhooks (URLs, eventos, logs)                                           ║
║          ├── Ambiente (Sandbox/Produção)                                              ║
║          └── Logs técnicos                                                            ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

## 📍 ONDE CADA REQUISITO EXPEDIA DEVE FICAR

| REQUISITO EXPEDIA | ONDE NO RENDIZY | JUSTIFICATIVA |
|-------------------|-----------------|---------------|
| **Cancellation Policies** | `Settings > Reservas > Políticas de Cancelamento` | Política de cancelamento é regra de RESERVA, não de catálogo |
| **Rate Plans** | `Settings > Precificação > Planos Tarifários` | Planos são PRECIFICAÇÃO, não produto |
| **Taxes/Fees** | `Financeiro > Taxas e Impostos` | Taxas são FINANCEIRO (Stays erra colocando em Catálogo!) |
| **Room Types** | `Anúncios > Editar > Quartos/Acomodações` | Já existe, apenas adicionar campos OTA |
| **Content (fotos, desc)** | `Anúncios > Editar > Galeria/Descrição` | Já existe |
| **Availability** | `Calendário` | Já existe |
| **Pricing** | `Anúncios > Editar > Precificação` | Já existe, adicionar suporte a rate plans |
| **Reservations** | `Reservas` | Já existe, adicionar campos OTA |
| **OTA Mapping Config** | `Settings > Channel Managers > Expedia` | Nova seção para config do USUÁRIO |
| **API Credentials** | `Settings > Integrações` (Admin Master) | Config técnica, não usuário |

## 🔄 PADRÃO GLOBAL ↔ INDIVIDUAL (Herança)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PADRÃO DE HERANÇA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GLOBAL (Settings)                    INDIVIDUAL (Anúncio)                  │
│  ─────────────────                    ────────────────────                  │
│                                                                             │
│  Settings > Reservas                  Anúncio > Configurações > Reservas    │
│  ├── check_in_default: 15:00         ├── check_in: null (herda) ou 14:00   │
│  ├── check_out_default: 11:00        ├── check_out: null (herda) ou 12:00  │
│  └── min_nights_default: 2           └── min_nights: null (herda) ou 3     │
│                                                                             │
│  Settings > Precificação              Anúncio > Financeiro                  │
│  ├── currency_default: BRL           ├── currency: null (herda) ou USD     │
│  └── rate_plan_default: standard     └── rate_plan: null ou custom         │
│                                                                             │
│  LÓGICA NO CÓDIGO:                                                          │
│  const effectiveValue = property.field ?? organization.field_default        │
│                                                                             │
│  COMPONENTE UI:                                                             │
│  <InheritanceToggle                                                         │
│    label="Check-in"                                                         │
│    globalValue={org.check_in_default}                                       │
│    localValue={property.check_in}                                           │
│    onInherit={() => setCheckIn(null)}                                       │
│    onOverride={(val) => setCheckIn(val)}                                    │
│  />                                                                         │
│                                                                             │
│  Visual no UI:                                                              │
│  ┌─────────────────────────────────────────────────┐                        │
│  │ Check-in    ○ Usar padrão (15:00)  ● Definir    │                        │
│  │             └─ [14:00]                          │                        │
│  └─────────────────────────────────────────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✅ DECISÕES ARQUITETURAIS

### 1. **TAXAS → FINANCEIRO** (não Catálogo como Stays)
- **Decisão:** Taxas ficam em `Financeiro > Taxas e Impostos`
- **Motivo:** Taxa é conceito financeiro, não de produto/catálogo
- **Mapeamento OTA:** Cada taxa tem campo `ota_mappings: { airbnb: 'CLEANING_FEE', expedia: 'CleaningFee' }`

### 2. **POLÍTICAS DE CANCELAMENTO → RESERVAS** (não em lugar aleatório)
- **Decisão:** Políticas ficam em `Settings > Reservas > Políticas de Cancelamento`
- **Motivo:** Política de cancelamento afeta RESERVA, é regra de negócio de reserva
- **Mapeamento OTA:** Cada política tem `ota_mappings: { airbnb: 'STRICT', expedia: 'FC_POLICY_1' }`

### 3. **CHANNEL MANAGERS ≠ INTEGRAÇÕES**
- **Decisão:** Separar em duas seções:
  - `Channel Managers` = Interface para USUÁRIO configurar mapeamentos, preferências
  - `Integrações` = Interface para ADMIN/DEV configurar API keys, webhooks
- **Motivo:** Usuário não precisa ver credentials de API, precisa configurar o comportamento

### 4. **PLANOS TARIFÁRIOS → PRECIFICAÇÃO**
- **Decisão:** Rate Plans ficam em `Settings > Precificação > Planos Tarifários`
- **Motivo:** Plano tarifário é regra de preço, não de produto

---

## 🔄 MAPEAMENTO COMPLETO: GLOBAL ↔ INDIVIDUAL (POR ANÚNCIO)

```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║                    MAPEAMENTO COMPLETO: GLOBAL ↔ INDIVIDUAL                             ║
╠═════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║  ┌─────────────────────────────────┐      ┌─────────────────────────────────────────┐   ║
║  │      GLOBAL (Settings)          │      │       INDIVIDUAL (Anúncio)              │   ║
║  │      /settings/*                │      │       /properties/:id/edit/*            │   ║
║  └─────────────────────────────────┘      └─────────────────────────────────────────┘   ║
║                                                                                         ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║  RESERVAS                                                                               ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║                                                                                         ║
║  Settings > Reservas                      Anúncio > ⚙️ Configurações > Reservas         ║
║  ├── Políticas de Cancelamento (CRUD)     ├── Política padrão: [Dropdown das criadas]   ║
║  │   └── Criar/editar políticas           │   └── "Flexível" | "Moderada" | "Rígida"    ║
║  ├── check_in_default: 15:00              ├── check_in: ○ Padrão (15:00) ● 14:00        ║
║  ├── check_out_default: 11:00             ├── check_out: ○ Padrão (11:00) ● 12:00       ║
║  ├── min_nights_default: 2                ├── min_nights: ○ Padrão (2) ● 3              ║
║  ├── max_nights_default: 30               ├── max_nights: ○ Padrão (30) ● 14            ║
║  └── instant_booking_default: true        └── instant_booking: ○ Padrão ● Sim/Não       ║
║                                                                                         ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║  PRECIFICAÇÃO                                                                           ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║                                                                                         ║
║  Settings > Precificação                  Anúncio > 💰 Precificação                     ║
║  ├── Planos Tarifários (CRUD)             ├── Planos ativos: [Multiselect]              ║
║  │   └── "Standard", "Non-refund", etc    │   └── ☑ Standard ☑ Non-refund ☐ Weekly      ║
║  ├── currency_default: BRL                ├── currency: ○ Padrão (BRL) ● USD            ║
║  ├── markup_airbnb: +5%                   ├── (herda do channel manager)                ║
║  └── markup_expedia: +3%                  └── (herda do channel manager)                ║
║                                                                                         ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║  FINANCEIRO (TAXAS)                                                                     ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║                                                                                         ║
║  Financeiro > Taxas e Impostos            Anúncio > 💰 Precificação > Taxas             ║
║  ├── Taxas (CRUD global)                  ├── Taxas aplicáveis: [Multiselect]           ║
║  │   └── "Limpeza", "IPTU", "ISS"         │   └── ☑ Limpeza (R$150) ☐ IPTU ☑ ISS        ║
║  └── (valores default)                    └── Override valor: Limpeza = R$200          ║
║                                                                                         ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║  🚨 CHANNEL MANAGERS (POR ANÚNCIO!) - CRÍTICO                                           ║
║  ══════════════════════════════════════════════════════════════════════════════════════ ║
║                                                                                         ║
║  Settings > Channel Managers > Airbnb     Anúncio > 📺 Canais > Airbnb                  ║
║  ├── Conta conectada (OAuth)              ├── Status: ✅ Publicado | ⏸️ Pausado         ║
║  ├── Política cancelamento DEFAULT        ├── Política: ○ Padrão (Strict) ● Flexible    ║
║  ├── Reserva instantânea DEFAULT          ├── Reserva instantânea: ○ Padrão ● Não       ║
║  ├── Sincronizar fotos: Sim               ├── Sincronizar fotos: ○ Padrão ● Não         ║
║  └── Markup: +5%                          └── Markup: ○ Padrão (+5%) ● +10%             ║
║                                                                                         ║
║  Settings > Channel Managers > Booking    Anúncio > 📺 Canais > Booking.com             ║
║  ├── Conta conectada                      ├── Status: ✅ Publicado | ⏸️ Pausado         ║
║  ├── Política cancelamento DEFAULT        ├── Política: ○ Padrão ● Reservas antecipadas ║
║  │   └── Mapeamento: Flexível→Padrão      │   └── (4 opções como no print)              ║
║  ├── Exige garantia pagamento: Sim        ├── Garantia: ○ Padrão (Sim) ● Não            ║
║  ├── No-show: Padrão                      ├── No-show: ○ Padrão ● Cobrar 1ª noite       ║
║  └── Markup: +3%                          └── Markup: ○ Padrão (+3%) ● +5%              ║
║                                                                                         ║
║  Settings > Channel Managers > Expedia    Anúncio > 📺 Canais > Expedia                 ║
║  ├── Conta conectada                      ├── Status: ✅ Publicado | ⏸️ Pausado         ║
║  ├── Política cancelamento DEFAULT        ├── Política: ○ Padrão ● Não-reembolsável     ║
║  ├── Rate Plan DEFAULT                    ├── Rate Plan: ○ Padrão ● Pay at Property     ║
║  ├── Room Type mapping                    ├── Room Type: [Suite Master] → [King Suite]  ║
║  └── Markup: +3%                          └── Markup: ○ Padrão (+3%) ● +8%              ║
║                                                                                         ║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 📍 ESTRUTURA DE ABAS NO ANÚNCIO (Property Edit) - EXPANDIDA

```
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║                     🏠 EDITAR ANÚNCIO - ESTRUTURA DE ABAS                              ║
╠═══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                       ║
║  /properties/:id/edit                                                                 ║
║                                                                                       ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │  📋 GERAL  │  📸 FOTOS  │  🛏️ QUARTOS  │  💰 PREÇOS  │  📺 CANAIS  │  ⚙️ CONFIG  │  ║
║  └─────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                       ║
║  ════════════════════════════════════════════════════════════════════════════════════ ║
║  📋 GERAL (já existe)                                                                 ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  • Título, descrição, endereço                                                        ║
║  • Capacidade, tipo de propriedade                                                    ║
║  • Comodidades/Amenities                                                              ║
║                                                                                       ║
║  ════════════════════════════════════════════════════════════════════════════════════ ║
║  📸 FOTOS (já existe)                                                                 ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  • Galeria de imagens                                                                 ║
║  • Ordenação, legendas                                                                ║
║                                                                                       ║
║  ════════════════════════════════════════════════════════════════════════════════════ ║
║  🛏️ QUARTOS/ACOMODAÇÕES (expandir para OTA)                                           ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  • Lista de quartos com campos OTA:                                                   ║
║    - room_type_code (Expedia: KING, TWIN, SUITE...)                                   ║
║    - bed_types (camas e quantidades)                                                  ║
║    - max_occupancy, standard_occupancy                                                ║
║    - smoking_preference                                                               ║
║  • Mapeamento para OTAs: "Suíte Master" → Expedia "King Suite"                        ║
║                                                                                       ║
║  ════════════════════════════════════════════════════════════════════════════════════ ║
║  💰 PRECIFICAÇÃO (expandir)                                                           ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  • Preço base por noite                                                               ║
║  • Planos tarifários ativos para este imóvel                                          ║
║  • Taxas aplicáveis (com override de valor)                                           ║
║  • Descontos específicos                                                              ║
║  • 🆕 Markup por canal (se diferente do global)                                       ║
║                                                                                       ║
║  ════════════════════════════════════════════════════════════════════════════════════ ║
║  📺 CANAIS (NOVA ABA!) ⭐                                                              ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  │                                                                                    ║
║  │  Lista de canais com status e ações:                                              ║
║  │  ┌──────────────────────────────────────────────────────────────────────────────┐ ║
║  │  │ 🏡 Airbnb          ✅ Publicado    [Configurar] [Pausar] [Ver no Airbnb]     │ ║
║  │  ├──────────────────────────────────────────────────────────────────────────────┤ ║
║  │  │ 🅱️ Booking.com     ✅ Publicado    [Configurar] [Pausar] [Ver no Booking]    │ ║
║  │  ├──────────────────────────────────────────────────────────────────────────────┤ ║
║  │  │ 🌐 Expedia         ⏸️ Pausado      [Configurar] [Ativar] [Ver no Expedia]    │ ║
║  │  ├──────────────────────────────────────────────────────────────────────────────┤ ║
║  │  │ ✈️ Decolar         ❌ Não conectado [Conectar]                                │ ║
║  │  └──────────────────────────────────────────────────────────────────────────────┘ ║
║  │                                                                                    ║
║  │  Ao clicar [Configurar] abre modal/drawer com configurações DO CANAL:             ║
║  │  ┌─────────────────────────────────────────────────────────────────────────────┐  ║
║  │  │  ⚙️ Configurações Booking.com - Apartamento Centro                          │  ║
║  │  │  ─────────────────────────────────────────────────────────────────────────  │  ║
║  │  │                                                                             │  ║
║  │  │  Política de Cancelamento                                                   │  ║
║  │  │  ○ Usar padrão da organização (Flexível)                                    │  ║
║  │  │  ● Definir para este anúncio:                                               │  ║
║  │  │    ┌─────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │    │ ○ Padrão (Flexível) - Cancela até 1 dia antes                       │  │  ║
║  │  │    │ ● Reservas antecipadas - Cancela até 21 dias antes                  │  │  ║
║  │  │    │ ○ Isenção total - Cancela a qualquer momento                        │  │  ║
║  │  │    │ ○ Não reembolsável                                                   │  │  ║
║  │  │    └─────────────────────────────────────────────────────────────────────┘  │  ║
║  │  │                                                                             │  ║
║  │  │  Exige garantia de pagamento?                                               │  ║
║  │  │  ○ Usar padrão (Sim)  ● [Sim] [Não]                                         │  ║
║  │  │                                                                             │  ║
║  │  │  Regras para no-show                                                        │  ║
║  │  │  ○ Usar padrão  ● [Padrão ▼]                                                │  ║
║  │  │                                                                             │  ║
║  │  │  Markup de preço                                                            │  ║
║  │  │  ○ Usar padrão (+3%)  ● [+5%]                                               │  ║
║  │  │                                                                             │  ║
║  │  │                                    [Cancelar] [Salvar]                      │  ║
║  │  └─────────────────────────────────────────────────────────────────────────────┘  ║
║  │                                                                                    ║
║                                                                                       ║
║  ════════════════════════════════════════════════════════════════════════════════════ ║
║  ⚙️ CONFIGURAÇÕES (expandir)                                                          ║
║  ────────────────────────────────────────────────────────────────────────────────────  ║
║  • Reservas (check-in/out, min/max noites, instant booking)                           ║
║  • Política de cancelamento PADRÃO (usada quando canal não tem override)              ║
║  • Relacionamento (proprietário, comissão - já existe)                                ║
║  • Notificações                                                                       ║
║                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 📸 INVENTÁRIO COMPLETO: Booking.com Channel Manager (Stays.net) - 11 prints

> **URL Base:** `bvm.stays.net/i/chmanager/bookingcom/config/*`
> **Padrão:** Todas configs têm opção `[Usar para todos]` vs `[Permitir edição por anúncio]`

---

### Print 53-54: Políticas de Cancelamento (`/config/cancel`)
**Seção:** Política de cancelamento
**Cabeçalho:** "Política padrão - Utilize apenas as suas favoritas como política da foda"

**Campos Globais:**
- Dropdown: Selecionar política favorita (ex: "All house")

**4 Políticas Mapeadas para Booking.com:**

| # | Política Stays | Mapeamento Booking | Campos |
|---|----------------|-------------------|--------|
| 1 | **Padrão** | Flexível | Multa: "Cancela até 1 dia antes", Garantia: [Sim/Não], No-show: [Padrão] |
| 2 | **Reservas antecipadas** | Early Bird | Multa: "Cancela até 21 dias antes", Garantia: [Sim/Não], Válido: "Após confirmação", No-show: [Padrão] |
| 3 | **Isenção total** | Free Cancellation | Multa: "Cancela a qualquer momento, não requer pré-pagamento", Garantia: [Não], No-show: [Padrão] |
| 4 | **Não reembolsável** | Non-refundable | Multa: "O hóspede será cobrado o preço total", Garantia: [Sim], Válido: "Após confirmação", No-show: "Valor total" |

---

### Print 55: Reservas (`/config/reserve`)
**Seção:** Reservas - Instruções de Reserva

**Campos:**
- **Status padrão das reservas importadas:** [Dropdown - ex: "Reserva confirmada"]
- **Tipo de reserva:** [Checkbox] [x] reserva
- **Como você recepciona os hóspedes?**
  
**Opção padrão:**
- Dropdown: "Ao Chaves entram dentro de uma caixa de Bloqueio (Lock-box)"
- **Onde está o seu hóspede?** 
  - [No local] [Em um local diferente]
- **Qual é a marca da caixa de bloqueio de chave ou fechadura eletrônica que você usa?**
  - Input texto
- **O que mais seus hóspedes devem saber sobre seu processo de check-in?**
  - Dropdown idioma: "Português do Brasil"
  - Textarea multiline

**Opção alternativa:**
- Dropdown: "Ao Chaves estarão na recepção (portaria)"
- Mesmos campos de localização e instruções

---

### Print 56: Conteúdo/Conexão (`/config/content`)
**Seção:** Configurações de conteúdo API

**Toggles de Sincronização (todos [Sim/Não]):**

| Configuração | Descrição | Default |
|--------------|-----------|---------|
| **Gerenciar políticas, taxas e impostos** | Atualiza políticas/taxas cadastradas para seus anúncios Booking. Saiba [link] sobre como cadastrar | [Sim] |
| **Gerenciar as amenities das suas propriedades** | Stays atualiza a lista de amenidades para seu anúncio. O que você cadastra nas amenities, saiba [link] sobre | [Sim] |
| **Sincronizar as fotos do seu anúncio** | Ao marcar [Sim], sincronizamos as fotos do anúncio Booking utilizando com suas enviadas Stays. Fotos do seu anúncio Booking que não foram encontradas no painel | [Sim] |
| **Stays deve gerenciar o conteúdo sobre sua propriedade no Booking** | Ao marcar [Sim], Stays atualiza informações dos quartos enviados ao Booking de acordo com o que você cadastrou em amenities e nome, saiba como alterar outros detalhes no Booking | [Sim] |
| **Stays deve gerenciar as amenities dos seus quartos** | Ao marcar [Sim], Stays poderá atualizar a lista de amenidades oferecidas nos seus quartos no Booking, se marcar [Não], saiba como alterar amenities no Booking | [Sim] |

**Definir individualmente para cada anúncio?**
- [Usar para todos] [Permitir edição por anúncio]

---

### Print 57: Usuário (`/config/users`)
**Seção:** Configurações de usuário

**Campo:**
- **Responsável pelas reservas deste canal**
  - "Para aparecer nesta lista, o usuário precisa ter a responsabilidade (Business/Publisher). Saiba mais."
  - Dropdown: "A - Não selecionado"

**Definir individualmente para cada anúncio?**
- [Usar para todos] [Permitir edição por anúncio]

---

### Print 58: Financeiro (`/config/finance`)
**Seção:** Financeiro - Informações financeiras

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **Correção de preço** | Input % (ex: -4%) | "É possível utilizar valores decimais e negativos. Exemplo: 7.25 ou -10" |
| **Definir individualmente?** | [Usar para todos] [Permitir edição por anúncio] | |

**Relação com taxas e impostos:**
- **Cobrar impostos ao Booking.com?**
  - Toggle [Sim/Não] (atual: Não)
  - "Ao marcar [Sim], os impostos dos dias dados e podem ser aplicados do lado Booking. Ao marcar [Não], o valor de seus dados de impostos cobrados serão"

- **Taxas e impostos não repassados a fatura**
  - "Em qual título da reserva você quer que abaixe as taxas e impostos não repassados com o Booking? Saiba mais."
  - Opções: [Tributos de hospedagem] [Taxas de serviços complementares]

**Comissão e contas:**
- "A comissão de cada canal em que atua é calculada em que período mensal? Definimos para facilitar o encontro das transações no seu extrato financeiro"
- Saiba mais.
- Dropdown "Despesas - Taxa Booking" 
- Dropdown "Recebidos - Reservas Booking"

**Conta bancária:**
- "Em qual conta irmã que receber os pagamentos do Booking?"
- Dropdown: "Não selecionado"

---

### Print 59: Grupos Tarifários Estáticos (`/config/groups`)
**Seção:** Grupos tarifários estáticos

**Status:** "Em breve - Você poderá criar tipos de tarifas para os seus anúncios conectados (futuro)"

*(Tela vazia - funcionalidade em desenvolvimento)*

---

### Print 60: Comunicação com os hóspedes / E-mail (`/config/email`)
**Seção:** E-mail

**Campos:**

| Campo | Tipo | Valor |
|-------|------|-------|
| **Enviar um e-mail específico para reservas de última hora (last minute)?** | Toggle [Sim/Não] | Não |
| **Qual período você considera como "Última hora"?** | Label + Input | "Consideramos a partir do momento onde a reserva seja feita X horas antes de chegada" |
| | Input número | 2 (horas) |
| **Enviar e-mail de confirmação logo após o hóspede pagar pela reserva no seu site?** | Toggle [Sim/Não] | Sim |

---

### Print 61: Taxas e Impostos (`/config/fees`)
**Seção:** Taxas e impostos

**Cabeçalho:**
- "Relacione suas taxas cadastradas no Stays com as taxas do canal."
- "Você pode criar suas taxas em [Catálogo > Preblicador > Gerenciamento de Taxas]"
- "Quer manter apenas as taxas Configurações do Stays?"
- "Ao marcar a (Seguir taxas do Stays) e adicionar os valores das taxas que você configurar para seu, as taxas cadastradas no Booking serão de conexão com a Stays serão removidas."

**Importante:** "Taxas de impostos só podem ser enviadas durante a conexão. Para fazer um editar dados, é preciso entrar em contato com a Booking."

**Botões:** [Seguir taxas do Stays] [Manter o que está no Booking]

**Mapeamento de Taxas:**

| Taxa Stays | → | Taxa Booking |
|------------|---|--------------|
| Taxa de Limpeza* | → | Cleaning fee [Dropdown] |
| | | Não selecionado [Dropdown] |
| Taxa para mais/desconto de X noites | → | Assessment tax [Dropdown] |
| | | Net room price [Dropdown] |

---

### Print 62: Promoções para celulares (`/config/mpromo`)
**Seção:** Promoções para reservas pelo celular

**Cabeçalho:**
- "Ative - Aumentar a visibilidade dos seus anúncios Booking com promoções para reservas com celular. Saiba mais."

**Campos:**

| Campo | Tipo | Valor |
|-------|------|-------|
| **Ativo** | Toggle [Sim/Não] | Não |
| **Públicos alvo da promoção** (Disponível a promoção em qual plataforma?) | Botões | [App e site celular] [Apenas pelo app] |
| **Desconto** | Label + Input % | "Configure um mínimo 10% de desconto. A comissão do Booking é de 15%" |
| | | Input: 10 % |
| **Períodos para não aplicar a promoção** | Label + Botão | "Escolha abaixo as datas de chegada em que a promoção não deve ser aplicada na reserva. Você pode restringir o uso em no máximo 30 dias" |
| | | [+ Adicionar período] |
| **Definir individualmente para cada anúncio?** | Botões | [Usar para todos] [Permitir edição por anúncio] |

---

### Print 63: Planos de Refeições (`/config/mealplan`)
**Seção:** Planos de refeições incluídas

**Cabeçalho:**
- "Informe quais refeições serão incluídas ao valor da diária."

**Campos:**

| Campo | Tipo | Valor |
|-------|------|-------|
| **Planos de refeições incluídas** | Botão | [+ Refeições...] |
| **Definir individualmente para cada anúncio?** | Botões | [Usar para todos] [Permitir edição por anúncio] |

**Valores dos planos de refeições:**
- "Informe valores dos planos com refeição de refeições."
- Botões: [+ Almoço] [+ Refeições]

**Definir individualmente para cada anúncio?**
- [Usar para todos] [Permitir edição por anúncio]

---

## 🎯 RESUMO: ESTRUTURA DO CHANNEL MANAGER BOOKING.COM

```
📺 Channel Manager Booking.com (11 seções)
├── 📋 Reserva (/reserve)
│   ├── Status padrão das reservas importadas
│   ├── Tipo de reserva
│   └── Instruções de check-in (opção padrão + alternativa)
│
├── 🔗 Conexão (/content) 
│   ├── Gerenciar políticas, taxas, impostos [Sim/Não]
│   ├── Gerenciar amenities propriedade [Sim/Não]
│   ├── Sincronizar fotos [Sim/Não]
│   ├── Gerenciar conteúdo propriedade [Sim/Não]
│   ├── Gerenciar amenities quartos [Sim/Não]
│   └── [Usar para todos] / [Por anúncio]
│
├── 👤 Usuário (/users)
│   ├── Responsável pelas reservas (dropdown)
│   └── [Usar para todos] / [Por anúncio]
│
├── 💳 Pagamentos (não printado)
│   └── ...
│
├── 💰 Financeiro (/finance)
│   ├── Correção de preço (%)
│   ├── Cobrar impostos ao Booking? [Sim/Não]
│   ├── Taxas não repassadas → qual título?
│   ├── Comissão → contas (Despesas/Recebidos)
│   ├── Conta bancária para receber
│   └── [Usar para todos] / [Por anúncio]
│
├── 📊 Grupos tarifários estáticos (/groups)
│   └── (Em breve)
│
├── 💬 Comunicação hóspedes / E-mail (/email)
│   ├── E-mail última hora? [Sim/Não]
│   ├── Período "última hora" (X horas)
│   └── E-mail confirmação após pagamento [Sim/Não]
│
├── 🚫 Políticas de cancelamento (/cancel) ⭐
│   ├── Política padrão (dropdown)
│   ├── 4 políticas mapeadas:
│   │   ├── Padrão → Flexível
│   │   ├── Reservas antecipadas → Early Bird
│   │   ├── Isenção total → Free Cancellation
│   │   └── Não reembolsável → Non-refundable
│   └── Cada uma com: Multa, Garantia, Válido, No-show
│
├── 💵 Taxas e impostos (/fees) ⭐
│   ├── [Seguir taxas Stays] / [Manter Booking]
│   └── Mapeamento: Taxa Stays → Taxa Booking
│       ├── Limpeza → Cleaning fee
│       └── Outras → Assessment tax / Net room price
│
├── 📱 Promoções celulares (/mpromo)
│   ├── Ativo [Sim/Não]
│   ├── Público alvo (App/Site)
│   ├── Desconto mínimo 10%
│   ├── Períodos de exceção
│   └── [Usar para todos] / [Por anúncio]
│
└── 🍽️ Planos de refeições (/mealplan)
    ├── Refeições incluídas
    ├── Valores dos planos
    └── [Usar para todos] / [Por anúncio]
```

---

# 🔺 TRIANGULAÇÃO FINAL: GLOBAL → INDIVIDUAL → POR CANAL

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║                           🔺 MODELO DE 3 NÍVEIS DE CONFIGURAÇÃO                               ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  NÍVEL 1: GLOBAL (Organização)                                                                ║
║  ════════════════════════════════                                                             ║
║  📍 Onde: /settings/*                                                                         ║
║  🎯 Quem configura: Admin/Gestor                                                              ║
║  📋 O que define: Defaults para TODA a organização                                            ║
║                                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │ Settings > Reservas                                                                     │  ║
║  │   └── Políticas de Cancelamento: [Flexível] [Moderada] [Rígida] ← CRUD                  │  ║
║  │   └── Check-in/out padrão: 15:00 / 11:00                                                │  ║
║  │   └── Estadia mínima: 2 noites                                                          │  ║
║  │                                                                                         │  ║
║  │ Settings > Precificação                                                                 │  ║
║  │   └── Planos Tarifários: [Standard] [Non-refund] ← CRUD                                 │  ║
║  │   └── Moeda padrão: BRL                                                                 │  ║
║  │   └── Descontos por duração: 7n=5%, 14n=10%, 28n=15%                                    │  ║
║  │                                                                                         │  ║
║  │ Financeiro > Taxas e Impostos                                                           │  ║
║  │   └── Taxas: [Limpeza R$150] [IPTU] [ISS] ← CRUD                                        │  ║
║  │                                                                                         │  ║
║  │ Settings > Channel Managers > Booking.com                                               │  ║
║  │   └── Correção de preço DEFAULT: +3%                                                    │  ║
║  │   └── Política cancelamento DEFAULT: Flexível                                           │  ║
║  │   └── Sincronizar fotos: Sim                                                            │  ║
║  │   └── Mapeamento taxas: Limpeza → Cleaning Fee                                          │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                           │                                                   ║
║                                           ▼                                                   ║
║  NÍVEL 2: INDIVIDUAL (Por Anúncio)                                                            ║
║  ════════════════════════════════════                                                         ║
║  📍 Onde: /properties/:id/edit > ⚙️ Configurações                                              ║
║  🎯 Quem configura: Gestor/Proprietário                                                       ║
║  📋 O que define: Override do GLOBAL para este anúncio específico                             ║
║                                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │ Anúncio > Configurações > Reservas                                                      │  ║
║  │   └── Política Cancelamento: ○ Usar padrão (Flexível) ● Override: [Rígida]              │  ║
║  │   └── Check-in: ○ Usar padrão (15:00) ● Override: [14:00]                               │  ║
║  │   └── Estadia mínima: ○ Usar padrão (2) ● Override: [3]                                 │  ║
║  │                                                                                         │  ║
║  │ Anúncio > Precificação                                                                  │  ║
║  │   └── Planos ativos: ☑ Standard ☑ Non-refund (herda disponíveis)                        │  ║
║  │   └── Moeda: ○ Usar padrão (BRL) ● Override: [USD]                                      │  ║
║  │                                                                                         │  ║
║  │ Anúncio > Precificação > Taxas                                                          │  ║
║  │   └── Taxas aplicáveis: ☑ Limpeza ☐ IPTU ☑ ISS                                          │  ║
║  │   └── Limpeza valor: ○ Usar padrão (R$150) ● Override: [R$200]                          │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                           │                                                   ║
║                                           ▼                                                   ║
║  NÍVEL 3: POR CANAL (No Anúncio)                                                              ║
║  ════════════════════════════════════                                                         ║
║  📍 Onde: /properties/:id/edit > 📺 Canais > [Booking.com]                                     ║
║  🎯 Quem configura: Gestor                                                                    ║
║  📋 O que define: Override do INDIVIDUAL para este CANAL neste anúncio                        ║
║                                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────────────────────┐  ║
║  │ Anúncio > Canais > Booking.com                                                          │  ║
║  │   └── Status: ✅ Publicado                                                               │  ║
║  │   └── Política Cancelamento:                                                            │  ║
║  │       ○ Usar padrão do anúncio (Rígida)                                                 │  ║
║  │       ● Override para este canal: [Reservas antecipadas]                                │  ║
║  │   └── Correção de preço:                                                                │  ║
║  │       ○ Usar padrão da org (+3%)                                                        │  ║
║  │       ● Override: [+5%]                                                                 │  ║
║  │   └── Exige garantia pagamento: ○ Usar padrão ● [Não]                                   │  ║
║  │   └── No-show: ○ Usar padrão ● [Cobrar 1ª noite]                                        │  ║
║  │   └── Sincronizar fotos: ○ Usar padrão (Sim) ● [Não]                                    │  ║
║  │   └── Promoção celular: [Ativar 10% desconto]                                           │  ║
║  └─────────────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
```

## 🧮 LÓGICA DE RESOLUÇÃO (Cascata)

```typescript
/**
 * REGRA DE CASCATA: Canal > Anúncio > Organização
 * 
 * Para qualquer configuração, o valor efetivo é:
 * 1. Se tem override no CANAL → usa o do canal
 * 2. Senão, se tem override no ANÚNCIO → usa o do anúncio  
 * 3. Senão → usa o da ORGANIZAÇÃO (global)
 */

function getEffectiveValue<T>(
  orgDefault: T,
  propertyOverride: T | null,
  channelOverride: T | null
): T {
  return channelOverride ?? propertyOverride ?? orgDefault;
}

// Exemplo: Política de cancelamento para Booking.com no Apto Centro
const policy = getEffectiveValue(
  org.cancellation_policy_id,           // "flexible" (global)
  property.cancellation_policy_id,       // "strict" (override anúncio)
  propertyChannel.cancellation_policy_id // "early_bird" (override canal)
);
// Resultado: "early_bird"
```

---

## 📍 MAPEAMENTO FINAL: 17 PASSOS DO RENDIZY + CHANNEL MANAGERS

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════╗
║              🏠 FORMULÁRIO DE ANÚNCIO - 17 PASSOS + CANAIS                                    ║
╠═══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                               ║
║  🟠 CONTEÚDO DO ANÚNCIO (Passos 1-7) - já funcional                                          ║
║  ═══════════════════════════════════════════════════                                          ║
║  │ 1  │ Básico        │ Identificação, Tipo local/acomodação, Modalidades    │ ✅ OK         ║
║  │ 2  │ Localização   │ Endereço, Mapa, Características                      │ ✅ OK         ║
║  │ 3  │ Cômodos       │ Lista quartos, Camas, Fotos por cômodo              │ ✅ OK         ║
║  │ 4  │ Tour Virtual  │ Galeria 20 fotos, Capa, Tags                        │ ✅ OK         ║
║  │ 5  │ Amenidades Loc│ Checkboxes área/estacionamento/serviços             │ ✅ OK         ║
║  │ 6  │ Amenidades Ac │ Checkboxes banheiro/clima/cozinha/etc               │ ✅ OK         ║
║  │ 7  │ Descrição     │ Título PT/EN/ES, Notas, Sobre espaço                │ ✅ OK         ║
║                                                                                               ║
║  🟡 FINANCEIRO (Passos 8-12) - a validar                                                     ║
║  ═══════════════════════════════════════════════════                                          ║
║  │ 8  │ Relacionamento│ Titular, Admin, Repasse, Exclusividade              │ ⚠️ A validar  ║
║  │ 9  │ Preços Base   │ Aluguel, IPTU, Condomínio, Venda                    │ ⚠️ A validar  ║
║  │ 10 │ Temporada     │ Modo G/I, Região, Descontos, Taxas                  │ ⚠️ A validar  ║
║  │ 11 │ Preços Indiv. │ Base/noite, Sazonais, Por dia, Especiais            │ ⚠️ A validar  ║
║  │ 12 │ Preços Deriv. │ Por nº hóspedes, Crianças                           │ ⚠️ A validar  ║
║                                                                                               ║
║  ⚙️ CONFIGURAÇÕES (Passos 13-17) - EXPANDIR                                                  ║
║  ═══════════════════════════════════════════════════                                          ║
║  │ 13 │ Reservas      │ 🔧 EXPANDIR: Estadia min/max, Antecedência,         │ 🔧 Expandir   ║
║  │    │               │    Reserva instantânea, POLÍTICA CANCELAMENTO        │               ║
║  │    │               │    (○ Usar padrão ● Override)                        │               ║
║  │ 14 │ Check-in      │ 🔧 EXPANDIR: Horários, Instruções, Self check-in    │ 🔧 Expandir   ║
║  │    │               │    (○ Usar padrão ● Override)                        │               ║
║  │ 15 │ Regras Casa   │ 🔧 EXPANDIR: Fumar, Animais, Eventos, Silêncio      │ 🔧 Expandir   ║
║  │    │               │    Crianças, Bebês (○ Usar padrão ● Override)        │               ║
║  │ 16 │ Políticas     │ 🔧 EXPANDIR: Pagamento, Depósito, Danos             │ 🔧 Expandir   ║
║  │    │               │    (○ Usar padrão ● Override)                        │               ║
║  │ 17 │ Integração    │ ❌ REMOVER - Mover para nova aba CANAIS              │ ❌ Remover    ║
║                                                                                               ║
║  📺 CANAIS (NOVA ABA - Substituir passo 17) ⭐⭐⭐                                             ║
║  ═══════════════════════════════════════════════════                                          ║
║  │ 17 │ Canais        │ Lista de canais conectados com status               │ 🆕 CRIAR      ║
║  │ NEW│               │                                                      │               ║
║  │    │               │ ┌─────────────────────────────────────────────────┐  │               ║
║  │    │               │ │ 🏡 Airbnb      ✅ Publicado  [Config] [Pausar]  │  │               ║
║  │    │               │ │ 🅱️ Booking     ✅ Publicado  [Config] [Pausar]  │  │               ║
║  │    │               │ │ 🌐 Expedia     ⏸️ Pausado    [Config] [Ativar]  │  │               ║
║  │    │               │ │ ✈️ Decolar     ❌ Não conectado     [Conectar]  │  │               ║
║  │    │               │ └─────────────────────────────────────────────────┘  │               ║
║  │    │               │                                                      │               ║
║  │    │               │ [Config] abre drawer com seções do canal:            │               ║
║  │    │               │ ├── Política cancelamento (override)                 │               ║
║  │    │               │ ├── Correção de preço/markup (override)              │               ║
║  │    │               │ ├── Garantia pagamento (override)                    │               ║
║  │    │               │ ├── No-show rules (override)                         │               ║
║  │    │               │ ├── Sincronização (fotos, amenities, conteúdo)       │               ║
║  │    │               │ ├── Instruções check-in (override)                   │               ║
║  │    │               │ ├── Promoções (celular, etc)                         │               ║
║  │    │               │ └── Planos de refeição (se aplicável)                │               ║
║  │    │               │                                                      │               ║
║  │    │               │ Todos campos com toggle:                             │               ║
║  │    │               │ ○ Usar padrão (do anúncio/org)                       │               ║
║  │    │               │ ● Definir para este canal                            │               ║
║                                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 PRÓXIMOS PASSOS (Implementação) - v3 FINAL

### Fase 1: Tabelas de Banco (Backend) 
```sql
[ ] property_channel_settings
    - id, property_id, channel_code
    - status (published, paused, not_connected)
    - external_listing_id
    - cancellation_policy_id (override)
    - price_correction_percent (override markup)
    - require_payment_guarantee (override)
    - no_show_rule (override)
    - sync_photos, sync_amenities, sync_content
    - checkin_instructions (override)
    - mobile_promo_enabled, mobile_promo_percent
    - last_sync_at, created_at, updated_at
```

### Fase 2: Estrutura de Menus GLOBAL (/settings)
```
[ ] Financeiro > Taxas e Impostos (CRUD)
[ ] Financeiro > Comissões e Repasses
[ ] Settings > Reservas > Políticas de Cancelamento (CRUD)
[ ] Settings > Precificação > Planos Tarifários (CRUD)
[ ] Settings > Channel Managers (nova seção)
    [ ] Lista de canais conectados
    [ ] Config por canal (11 seções do Booking como referência)
[ ] Settings > Integrações (restringir a Admin Master)
```

### Fase 3: Expandir Passos 13-16 do Anúncio
```
[ ] Passo 13 - Reservas: Adicionar campos com toggle Global/Individual
    [ ] Política de cancelamento (dropdown das criadas)
    [ ] Estadia min/max
    [ ] Reserva instantânea
    
[ ] Passo 14 - Check-in: Popular campos
    [ ] Horário check-in/out com toggle G/I
    [ ] Instruções check-in (opção padrão + alternativa)
    [ ] Self check-in (lockbox, fechadura digital)
    
[ ] Passo 15 - Regras Casa: Popular campos
    [ ] Fumar, Animais, Eventos, Silêncio
    [ ] Crianças, Bebês
    [ ] Regras adicionais (texto)
    
[ ] Passo 16 - Políticas: Popular campos
    [ ] Pagamento, Depósito, Danos
```

### Fase 4: Criar Aba CANAIS (Substituir Passo 17)
```
[ ] Remover conteúdo atual do Passo 17 "Integração"
[ ] Criar nova aba "📺 Canais" com:
    [ ] Lista de canais (Airbnb, Booking, Expedia, Decolar)
    [ ] Status por canal (Publicado/Pausado/Não conectado)
    [ ] Ações: [Configurar] [Pausar/Ativar] [Ver no Canal]
    
[ ] Drawer/Modal de configuração por canal:
    [ ] Seção: Política de cancelamento (override)
    [ ] Seção: Preço/Markup (override)
    [ ] Seção: Garantia pagamento (override)
    [ ] Seção: No-show rules (override)
    [ ] Seção: Sincronização (fotos, amenities, conteúdo)
    [ ] Seção: Instruções check-in (override)
    [ ] Seção: Promoções celular
    [ ] Seção: Planos refeição
    
[ ] Componente <ChannelOverrideField /> com:
    [ ] ○ Usar padrão (mostra valor efetivo)
    [ ] ● Definir para este canal (mostra input)
```

### Fase 5: Componente de Herança 3 Níveis
```
[ ] Criar <InheritanceField /> genérico:
    interface InheritanceFieldProps<T> {
      label: string;
      orgValue: T;           // Nível 1: Global
      propertyValue: T | null; // Nível 2: Anúncio (null = herda)
      channelValue?: T | null; // Nível 3: Canal (null = herda)
      onChange: (value: T | null, level: 'property' | 'channel') => void;
      renderInput: (value: T, onChange: (v: T) => void) => ReactNode;
    }
    
[ ] Visual indicando fonte do valor:
    ┌─────────────────────────────────────────────┐
    │ Check-in                                    │
    │ ○ Usar padrão da organização (15:00)        │
    │ ○ Usar padrão do anúncio (14:00) ← override │
    │ ● Definir para este canal: [13:00]          │
    └─────────────────────────────────────────────┘
```

### Fase 6: Hooks e Services
```
[ ] usePropertyChannelSettings(propertyId, channelCode)
[ ] useEffectiveValue(orgDefault, propertyOverride, channelOverride)
[ ] channelSettingsService.ts (CRUD property_channel_settings)
[ ] syncService.ts (push para OTAs)
```

---

*Documento atualizado em 2026-02-03 v3.7 - BOOKING.COM COMPLETO + TRIANGULAÇÃO 3 NÍVEIS*
*63 prints documentados (Rendizy 31 + Stays/Airbnb 21 + Booking 11)*
*🎯 DECISÃO: Aba CANAIS substitui Passo 17 "Integração" no anúncio*
*🔺 MODELO: Global (Org) → Individual (Anúncio) → Por Canal*
