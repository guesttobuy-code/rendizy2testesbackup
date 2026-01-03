# 📊 Estrutura Real da Tabela `organizations`

**Data:** 2025-11-30  
**Fonte:** Query `information_schema.columns` executada no banco de dados

---

## ✅ Colunas que EXISTEM na Tabela

### Identificação
- `id` (uuid) - PRIMARY KEY
- `name` (character varying)
- `slug` (character varying) - UNIQUE
- `is_master` (boolean)

### Informações de Contato
- `email` (character varying)
- `phone` (character varying)
- `logo` (text)

### Informações Legais
- `trading_name` (character varying)
- `legal_name` (character varying)
- `tax_id` (character varying)

### Endereço
- `address_street` (character varying)
- `address_number` (character varying)
- `address_complement` (character varying)
- `address_neighborhood` (character varying)
- `address_city` (character varying)
- `address_state` (character varying)
- `address_zip_code` (character varying)
- `address_country` (character varying)

### Plano e Status
- `plan` (character varying)
- `status` (character varying)
- `trial_ends_at` (timestamp with time zone)
- `suspended_at` (timestamp with time zone)

### Settings (Colunas Individuais)
- `settings_language` (character varying)
- `settings_timezone` (character varying)
- `settings_currency` (character varying)
- `settings_date_format` (character varying)
- `settings_max_users` (integer)
- `settings_max_properties` (integer)

### Limites
- `limits_users` (integer)
- `limits_properties` (integer)
- `limits_reservations` (integer)
- `limits_storage` (integer)

### Uso Atual
- `usage_users` (integer)
- `usage_properties` (integer)
- `usage_reservations` (integer)
- `usage_storage` (integer)

### Billing (Colunas Individuais)
- `billing_email` (character varying)
- `billing_cycle` (character varying)
- `next_billing_date` (timestamp with time zone)

### Timestamps
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### Outros
- `legacy_imobiliaria_id` (text)
- `metadata` (jsonb)

---

## ❌ Colunas que NÃO EXISTEM (mas aparecem nas migrações)

- `created_by` (TEXT) - **NÃO EXISTE**
- `settings` (JSONB) - **NÃO EXISTE** (existem colunas individuais)
- `billing` (JSONB) - **NÃO EXISTE** (existem colunas individuais)

---

## 📝 Observações

1. A estrutura real é **muito diferente** das migrações
2. Settings e Billing são **colunas individuais**, não JSONB
3. Há muitas colunas adicionais (endereço, informações legais, etc.)
4. Para plano Enterprise, usar `-1` nos limites significa "ilimitado"

---

**Última atualização:** 2025-11-30 20:05
