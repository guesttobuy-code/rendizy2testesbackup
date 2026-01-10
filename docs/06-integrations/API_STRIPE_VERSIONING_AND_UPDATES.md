# Atualizações de API do Stripe

**Documentação de Referência - RENDIZY**  
**Última atualização**: 07 de janeiro de 2026

---

## Índice

1. [Controle de Versão da API](#1-controle-de-versão-da-api)
2. [Alterações Retrocompatíveis](#2-alterações-retrocompatíveis)
3. [Como Atualizar a Versão da API](#3-como-atualizar-a-versão-da-api)
4. [Changelog de Versões da API](#4-changelog-de-versões-da-api)
5. [Política de Versionamento dos SDKs](#5-política-de-versionamento-dos-sdks)
6. [Política de Suporte às Versões de Linguagem](#6-política-de-suporte-às-versões-de-linguagem)
7. [Canais de Lançamento](#7-canais-de-lançamento)
8. [Definindo a Versão da API](#8-definindo-a-versão-da-api)
9. [Política do Stripe.js](#9-política-do-stripejs)
10. [Política dos SDKs Mobile](#10-política-dos-sdks-mobile)

---

## 1. Controle de Versão da API

### 1.1 Visão Geral

A **versão da API** controla o comportamento da API e dos webhooks que você vê (parâmetros de requisição, propriedades de resposta, etc.). Sua versão é definida na primeira vez que você faz uma requisição à API.

**Versão atual**: `2025-12-15.clover`

### 1.2 Versionamento Principal e Mensal

- **Versão Principal** (ex: `2024-09-30.acacia`): Inclui alterações que **não são compatíveis com versões anteriores**. Lançadas 2x por ano.
- **Versão Mensal**: Inclui apenas alterações **compatíveis com versões anteriores**. Usa o mesmo nome da última versão principal.

### 1.3 Connect e Versões da API

Quando uma plataforma Connect faz solicitações em nome de contas conectadas **sem especificar versão**, o Stripe usa a **versão da API da plataforma**.

---

## 2. Alterações Retrocompatíveis

O Stripe considera as seguintes alterações como **retrocompatíveis**:

### 2.1 Alterações Permitidas

✅ Adicionar novos recursos à API  
✅ Adicionar novos parâmetros **opcionais** aos métodos existentes  
✅ Adicionar novas propriedades às respostas existentes  
✅ Alterar a **ordem** das propriedades nas respostas  
✅ Alterar o **comprimento** ou **formato** de strings opacas (IDs, mensagens de erro)  
✅ Adicionar novos **tipos de eventos** de webhook  

### 2.2 Considerações Importantes

#### IDs de Objetos
- IDs gerados pelo Stripe podem ter até **255 caracteres**
- Podem conter prefixos fixos (ex: `ch_` para cobranças)
- Exemplo de armazenamento MySQL:
  ```sql
  VARCHAR(255) COLLATE utf8_bin
  ```

#### Webhooks
- Certifique-se de que seu ouvinte de webhook **lide corretamente com tipos de eventos desconhecidos**
- Não dependa de tipos de eventos específicos que possam não existir em versões antigas

---

## 3. Como Atualizar a Versão da API

### 3.1 Verificação no Workbench

1. Acesse a aba **Visão Geral** no Workbench
2. Veja a versão atual e a atualização disponível
3. Clique em **Atualização disponível** se houver uma versão mais recente

### 3.2 Passos para Atualização

1. **Teste uma versão mais recente** usando o cabeçalho `Stripe-Version`:
   ```bash
   curl https://api.stripe.com/v1/customers \
     -u sk_test_...: \
     -H "Stripe-Version: 2025-12-15.clover"
   ```

2. **Atualize e teste seus webhooks** (veja seção 3.3)

3. **Execute a atualização** no Workbench:
   - Abra **Workbench** > **Visão geral**
   - Clique em **Atualizar**
   - Confirme a versão que será atribuída

### 3.3 Atualização de Webhooks

O formato dos recursos internos em **eventos recuperados da API** é definido pela versão padrão da API da sua conta **no momento em que o evento ocorreu**.

⚠️ **Importante**: Se você recuperar eventos criados quando sua versão padrão era diferente, seu código deve considerar as diferenças de versão.

### 3.4 Reversão de Versão

Durante **72 horas** após a atualização, você pode reverter para a versão anterior no Workbench. Após a reversão:
- Webhooks que falharam com a nova estrutura serão **reenviados** com a estrutura antiga

---

## 4. Changelog de Versões da API

### 4.1 Versões Recentes

#### **2024-06-20**

**Novos valores** para `Issuing Authorization.request_history.reason`:
- `card_canceled`
- `card_expired`
- `cardholder_blocked`
- `insecure_authorization_method`
- `pin_blocked`

**Renomeações**:
- `fuel.volume_decimal` → `fuel.quantity_decimal`
- `purchase_details.fuel.volume_decimal` → `purchase_details.fuel.quantity_decimal`

**Novos valores** para `Transaction.purchase_details.fuel.unit`:
- `imperial_gallon`, `kilogram`, `pound`, `charging_minute`, `kilowatt_hour`

**Depreciação**: `fleet.cardholder_prompt_data.alphanumeric_id` (use `driver_id`, `vehicle_number` ou `user_id`)

**Novas capacidades** (API de Recursos):
- `paused.inactivity`, `other` como novos motivos de desativação

**Tipos de capacidade** - `bank_transfer_payments` dividido em:
- `gb_bank_transfer_payments` (GBP)
- `jp_bank_transfer_payments` (JPY)
- `mx_bank_transfer_payments` (MXN)
- `sepa_bank_transfer_payments` (EUR)
- `us_bank_transfer_payments` (USD)

#### **2024-04-10**

**PaymentIntents**:
- `automatic_async` agora é o padrão quando nenhum método de captura é especificado

**Migração de campos**:
- `rendering_options` → `rendering`

**Renomeação**:
- `features` (produto) → `marketing_features`

#### **2023-10-16**

**Novos códigos de erro** em `Account.requirements.errors`:
- `invalid_address_highway_contract_box`
- `invalid_address_private_mailbox`
- `invalid_business_profile_name`
- `invalid_business_profile_name_denylisted`
- `invalid_company_name_denylisted`
- `invalid_dob_age_over_maximum`
- `invalid_dob_age_under_minimum`
- E outros 20+ códigos relacionados a validação

**Descritor de extrato automático**:
- Se `settings.payments.statement_descriptor` não for fornecido, será definido automaticamente (em ordem de prioridade):
  1. `business_profile.name`
  2. `business_profile.url`
  3. `company.name` ou `individual.first_name + individual.last_name`

#### **2023-08-16** (Principal)

**PaymentIntents e SetupIntents**:
- `automatic_payment_methods` agora é **habilitado por padrão**
- Quando `off_session=false`, `return_url` é **obrigatório** ao confirmar

**Checkout Sessions**:
- `payment_method_collection` mudou de `always` → `if_required`

**PaymentMethod Fingerprints**:
- `us_bank_account`, `acss_debit`, `sepa_debit`, `bacs_debit`, `au_becs_debit` renderizados no escopo da plataforma

**Novos códigos de erro** (Klarna):
- `payment_method_customer_decline`
- `payment_method_not_available`
- `payment_method_provider_decline`
- `payment_intent_payment_attempt_expired`

**Novos códigos de erro** (Contas):
- `verification_missing_directors`
- `verification_directors_mismatch`
- `verification_document_directors_mismatch`
- `verification_extraneous_directors`

#### **2022-11-15**

**Charge**:
- `charges` não são mais expandidos automaticamente por padrão (use `expand`)

**PaymentIntent**:
- `charges` (propriedade) removida → use `latest_charge`

**Novos códigos de erro** (métodos bancários):
- Bancontact, EPS, Giropay, iDEAL, Przelewy24, Sofort:
  - `payment_intent_payment_attempt_expired`
  - `payment_method_customer_decline`
  - `payment_method_provider_timeout`
  - `payment_method_not_available`
  - `payment_method_provider_decline`

**SetupIntent**:
- Mesmos novos códigos de erro

**Contas**:
- Novo código de erro: `verification_legal_entity_structure_mismatch`

#### **2022-08-01**

**Invoice**:
- `pending_invoice_items_behavior` não suporta mais `include_and_require` (padrão agora é `exclude`)

**Checkout Session**:
- Modo de pagamento: `customer_creation` padrão mudou de `always` → `if_required`
- PaymentIntent não é criado durante a criação da sessão (criado ao confirmar)
- Não retorna mais `setup_intent` no modo de assinatura

**Parâmetros removidos** de `Create Checkout Session`:
- `line_items[amount]`, `line_items[currency]`, `line_items[name]`, `line_items[description]`, `line_items[images]`
  - Use `price` e `price_data`
- `subscription_data[coupon]` → use `discounts`
- `shipping_rates` → use `shipping_options`

**Checkout Session (recurso)**:
- `shipping_rate` → `shipping_cost`
- `shipping` → `shipping_details`

**Charge**:
- `exempted` agora aparece em `three_d_secure` (cobranças com cartão)

**Contas**:
- Novo código de erro: `invalid_tos_acceptance`

**Issuing Cards (modo de teste)**:
- `shipping.status` não muda mais automaticamente de `pending` → `delivered`
- Novos endpoints de teste:
  ```
  /v1/test_helpers/issuing/cards/:card/shipping/ship
  /v1/test_helpers/issuing/cards/:card/shipping/deliver
  /v1/test_helpers/issuing/cards/:card/shipping/return
  /v1/test_helpers/issuing/cards/:card/shipping/fail
  ```
- `cancellation_reason` agora pode ser `design_rejected`

**Customer**:
- `default_currency` removido

### 4.2 Versões Históricas Importantes

#### **2020-08-27** (Principal)

**Depreciações**:
- `tax_percent` removido → use `tax_rates`
- `phases.plans` → `phases.items` (cronograma de assinatura)
- Webhook `payment_method.card_automatically_updated` → `payment_method.automatically_updated`

**Checkout Session**:
- `display_items` removido → use `line_items`

**Account/Capability/Country Spec**:
- `requirements`/`verification_fields` agora prefixados com função:
  - `representative.phone` (em vez de `relationship.representative`)
  - `owners.first_name`, `owners.last_name` (em vez de `relationship.owner`)
  - `executives.id_number`, `directors.dob.day` etc.

**Novos códigos de erro** (requirements):
- `verification_document_issue_or_expiry_date_missing`
- `verification_document_not_signed`
- `verification_failed_tax_id_not_issued`
- `verification_failed_tax_id_match`
- `invalid_address_po_boxes_disallowed`

**Charge**:
- `payment_method_details.card.three_d_secure.succeeded` e `.authenticated` removidos → use `.result` (enum)

**Customer**:
- `subscriptions`, `sources`, `tax_ids` não incluídos por padrão (use `expand`)

**Plan**:
- `tiers` não incluído por padrão (use `expand`)

**Depreciações**:
- `prorate`, `subscription_prorate` → use `proration_behavior`

#### **2020-03-02** (Principal)

**Faturas**:
- Agora você pode optar por numerar faturas **sequencialmente em toda a conta** (não só por cliente)
- Faturas que podem ser excluídas (rascunhos) só recebem números quando finalizadas

#### **2019-12-03** (Principal)

**Invoice Line Items**:
- `id` agora tem prefixo `il_` (antes: `sub_`, `su_item_`, `sli_`, `ii_`)
- O prefixo antigo não era globalmente único
- Use `type` para determinar a origem (não o prefixo do ID)
- Para `type=invoiceitem`, use `invoice_item` para referenciar o objeto de origem
- Campo `unique_id` adicionado para migração de referências internas

**Notas de Crédito**:
- `out_of_band_amount` é **obrigatório** se `credit_amount + refund/refund_amount < total`

**Saldo de Cliente**:
- Saldos aplicados a faturas são **devolvidos ao cliente** quando a fatura é anulada
- Versões antigas:
  - Use `consume_applied_balance=false` em `/v1/invoices/:id/void`
  - Use `invoice_customer_balance_settings[consume_applied_balance_on_void]=false` em `/v1/subscriptions`

**Informações fiscais**:
- `tax_info` e `tax_info_verification` (Customer) removidos → use `tax_ids`
- Parâmetro `tax_info` (create/update) removido → use `tax_id_data`

#### **2019-11-05**

**Contas**:
- `requested_capabilities` agora **obrigatório** para contas personalizadas

#### **2019-10-17**

**Planos de Assinatura**:
- `renewal_behavior` → `end_behavior` (valores: `cancel`, `release`)
- `renewal_interval` removido

#### **2019-10-08**

**Faturas**:
- `due_date` sempre `null` quando `billing=charge_automatically`
- `billing` → `collection_method`

**Saldo de Cliente**:
- `account_balance` → `balance`
- Nova API de transações de saldo do cliente disponível

#### **2019-09-09**

**Pessoa**:
- `relationship[account_opener]` → `relationship[representative]`

#### **2019-09-09**

**Contas**:
- `requested_capabilities` agora obrigatório para AU, AT, BE, DK, FI, FR, DE, IE, IT, LU, NL, NZ, NO, PT, ES, SE, CH, UK

#### **2019-08-14**

**Pessoa**:
- `verification[document].details_code` com valores adicionais

#### **2019-05-16**

**Transferências**:
- Débito automático em conta bancária não expõe mais reembolsos internos em caso de falha

#### **2019-03-14**

**Invoice**:
- `application_fee` → `application_fee_amount`

#### **2019-03-14** (Principal)

**Assinaturas**:
- Criação bem-sucedida mesmo que primeiro pagamento falhe (status `incomplete`)
- Permanece `incomplete` por 23h, depois vira `incomplete_expired`

**Invoice**:
- `status_transitions` contém `finalized_at`, `paid_at`, `marked_uncollectible_at`, `voided_at`
- `date` → `created`
- `finalized_at` movido para `status_transitions`

#### **2019-02-19** (Principal)

**Descritores de Extrato** (cobranças com cartão):
- Cobranças com `on_behalf_of` ou `destination` usam descritor da conta conectada
- Descritor completo pode não ser fornecido no momento da criação
- Prefixo dinâmico via `settings[card_payments][statement_descriptor_prefix]`
- Se conta não tiver `statement_descriptor`, usa nome comercial/jurídico
- Não pode mais conter `*`, `'`, `"`

**Account**:
- `legal_entity[business_id_number]` → `legal_entity[business_registration_number]`

#### **2019-02-19** (Principal - Reformulação de Contas)

**Account (reformulação completa)**:
- `legal_entity` → `individual`, `company`, `business_type`
- `verification` → `requirements`
- `verification[fields_needed]` → `requirements[eventually_due]`, `requirements[currently_due]`, `requirements[past_due]`
- `verification[due_by]` → `requirements[current_deadline]`
- `disabled_reason` enum `fields_needed` → `requirements.past_due`

**Configurações movidas para `settings`**:
- `payout_schedule` → `settings[payouts][schedule]`
- `payout_statement_descriptor` → `settings[payouts][statement_descriptor]`
- `debit_negative_balances` → `settings[payouts][debit_negative_balances]`
- `statement_descriptor` → `settings[payments][statement_descriptor]`
- `decline_charge_on` → `settings[card_payments][decline_on]`
- `business_logo`, `business_logo_large`, `business_primary_color` → `settings[branding]`
- `display_name`, `timezone` → `settings[dashboard]`
- `business_name`, `business_url`, `product_description`, `support_*` → `business_profile`

**Account (verificação de documentos)**:
- `legal_entity[verification][document]` → hash com `front` e `back`
- `details_code` com novos tipos de erro (15+ códigos)

**Account (criação)**:
- `keys` removido - use cabeçalho `Stripe-Account`
- `requested_capabilities` obrigatório para contas dos EUA

#### **2019-02-11**

**PaymentIntent (renomeações)**:
- `requires_source` → `requires_payment_method`
- `requires_source_action` → `requires_action`
- `save_source_to_customer` → `save_payment_method`
- `allowed_source_types` → `payment_method_types`
- `next_source_action` → `next_action`
- `authorize_with_url` → `redirect_to_url`

#### **2018-11-08**

**Invoice**:
- `closed` descontinuado → use `auto_advance`
- `auto_advance=false` (padrão) para faturas avulsas
- `forgiven` removido → use status `uncollectible`

**PaymentIntent (pré-visualização)**:
- `next_source_action.value` → `authorize_with_url` e `use_stripe_sdk`
- `attempt_confirmation` → `confirm`
- Endpoint de confirmação não suporta mais `payment_intent` como parâmetro

#### **2018-10-31**

**Limites de caracteres**:
- `Customer.description`: máx 350 caracteres
- `Product.name`: máx 250 caracteres
- `InvoiceLineItem.description`: máx 500 caracteres

**Invoice**:
- `billing_reason=subscription_create` para primeira fatura de assinatura

#### **2018-09-24**

**File**:
- `FileUpload` → `File`
- `url` agora é autenticado (requer chave secreta)
- Use `create file link` para URL pública

#### **2018-09-06**

**SKU**:
- Valores de atributos não precisam mais ser únicos

#### **2018-08-23**

**Subscription**:
- `DELETE` endpoint não suporta mais `at_period_end`
- Use endpoint de atualização para `cancel_at_period_end`

**Customer**:
- `business_vat_id` → `tax_info` (hash com `tax_id` e `type`)

**Plan**:
- `tiers[amount]` → `tiers[unit_amount]`

### 4.3 Changelog Completo

Para histórico completo de todas as versões, consulte:
- **Changelog oficial**: https://stripe.com/docs/upgrades
- **Changelog da API**: https://stripe.com/docs/api/versioning

---

## 5. Política de Versionamento dos SDKs

### 5.1 Versionamento Semântico

Os SDKs do Stripe seguem **versionamento semântico** (semver):

```
MAJOR.MINOR.PATCH
  |     |     |
  |     |     └─ Correções de bugs (retrocompatível)
  |     └─────── Novos recursos (retrocompatível)
  └───────────── Alterações incompatíveis
```

**Exemplos**:
- `4.3.2`: versão principal 4, versão secundária 3, patch 2
- `5.0.0` → `5.1.0`: novo recurso adicionado
- `5.1.0` → `5.1.1`: correção de bug
- `5.1.1` → `6.0.0`: alteração incompatível

### 5.2 Versão da API Usada pelo SDK

Cada versão do SDK usa a **versão da API vigente no momento do lançamento**. Consulte a wiki do SDK para o mapeamento:

- [Python SDK Wiki](https://github.com/stripe/stripe-python/wiki)
- [.NET SDK Wiki](https://github.com/stripe/stripe-dotnet/wiki)
- [Java SDK Wiki](https://github.com/stripe/stripe-java/wiki)
- [Go SDK Wiki](https://github.com/stripe/stripe-go/wiki)
- [PHP SDK Wiki](https://github.com/stripe/stripe-php/wiki)
- [Ruby SDK Wiki](https://github.com/stripe/stripe-ruby/wiki)
- [Node.js SDK Wiki](https://github.com/stripe/stripe-node/wiki)

### 5.3 Política de Suporte

- Novos recursos e correções de bugs são lançados na **versão principal mais recente**
- Versões principais antigas continuam disponíveis, mas **não recebem mais atualizações**
- Recomendamos atualizar para a versão principal mais recente

---

## 6. Política de Suporte às Versões de Linguagem

### 6.1 Ciclo de Vida

Quando uma versão de linguagem chega ao **fim de seu ciclo de vida (EOL)**:

1. Marcamos como "obsoleta" (deprecated)
2. Iniciamos período de **suporte estendido** (1-2 anos, dependendo da linguagem)
3. Após o período estendido, a próxima versão principal do SDK **remove suporte**

⚠️ **Aviso**: Embora um SDK possa continuar funcionando em versões não suportadas, não recomendamos usá-lo. Pode apresentar falhas inesperadas.

### 6.2 Política por Linguagem

#### **Python**

- **Suportado**: Python 3.7+
- **Suporte estendido**: 1 ano (duas versões principais da API)
- **Remoção**: Versão mais antiga removida em **março de cada ano**

| Versão Python | Status | EOL | Suporte removido | Último SDK |
|---------------|--------|-----|------------------|------------|
| 3.10 | ✅ Suportado | Out 2026 | Mar 2028 | TBD |
| 3.9 | ✅ Suportado | Out 2025 | Mar 2027 | TBD |
| 3.8 | ⚠️ Obsoleto | Out 2024 | Mar 2026 | TBD |
| 3.7 | ⚠️ Obsoleto | Jun 2023 | Mar 2026 | TBD |
| 3.6 | ❌ Sem suporte | Dez 2021 | Set 2025 | v12.5.1 |

#### **Ruby**

- **Suportado**: Ruby 2.5+
- **Suporte estendido**: 1 ano
- Consulte [Ruby EOL Schedule](https://www.ruby-lang.org/en/downloads/branches/)

#### **PHP**

- **Suportado**: PHP 7.3+
- **Suporte estendido**: 1 ano
- Consulte [PHP Supported Versions](https://www.php.net/supported-versions.php)

#### **Go**

- **Suportado**: Duas versões principais mais recentes do Go
- Consulte [Go Release Policy](https://go.dev/doc/devel/release)

#### **Node.js**

- **Suportado**: Versões LTS (Long Term Support) ativas
- Consulte [Node.js Release Schedule](https://nodejs.org/en/about/releases/)

#### **.NET**

- **Suportado**: .NET Core 3.1+ e .NET 5+
- Consulte [.NET Support Policy](https://dotnet.microsoft.com/platform/support/policy)

#### **Java**

- **Suportado**: Java 8+
- Consulte [Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)

---

## 7. Canais de Lançamento

### 7.1 Pré-visualização Pública (Public Preview)

**Versão da API**: `2025-12-15.preview`

**Recursos**:
- Novos recursos em fase **beta**
- Disponível publicamente
- Pode conter alterações incompatíveis

**Como usar**:
- **Python**: Instale `5.1.0b3` (sufixo `b`)
- **Outros SDKs**: Instale `5.1.0-beta.3` (sufixo `-beta`)

**Instalação**:
```bash
# Python
pip install stripe==5.1.0b3

# Node.js
npm install stripe@5.1.0-beta.3

# Ruby
gem install stripe -v 5.1.0.beta.3
```

**Documentação**:
- [Python Preview SDK](https://github.com/stripe/stripe-python#public-preview)
- [Node.js Preview SDK](https://github.com/stripe/stripe-node#public-preview)
- [Ruby Preview SDK](https://github.com/stripe/stripe-ruby#public-preview)

### 7.2 Pré-visualização Privada (Private Preview)

**Versão da API**: `2025-12-15.preview`

**Recursos**:
- Funcionalidades em fase **alpha**
- Requer **convite** (acesso apenas por convite)

**Como usar**:
- **Python**: Instale `5.1.0a3` (sufixo `a`)
- **Outros SDKs**: Instale `5.1.0-alpha.3` (sufixo `-alpha`)

**Instalação**:
```bash
# Python
pip install stripe==5.1.0a3

# Node.js
npm install stripe@5.1.0-alpha.3

# Ruby
gem install stripe -v 5.1.0.alpha.3
```

**Documentação**:
- [Python Private Preview SDK](https://github.com/stripe/stripe-python#private-preview)
- [Node.js Private Preview SDK](https://github.com/stripe/stripe-node#private-preview)
- [Ruby Private Preview SDK](https://github.com/stripe/stripe-ruby#private-preview)

---

## 8. Definindo a Versão da API

### 8.1 Globalmente (Ruby)

```ruby
require 'stripe'

Stripe.api_key = 'sk_test_...'
Stripe.api_version = '2025-12-15.clover'
```

### 8.2 Por Requisição (Ruby)

```ruby
require 'stripe'

intent = Stripe::PaymentIntent.retrieve(
  'pi_1DlIVK2eZvKYlo2CW4yj5l2C',
  {
    stripe_version: '2025-12-15.clover',
  }
)
intent.capture
```

### 8.3 Por Cabeçalho HTTP (cURL)

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_...: \
  -H "Stripe-Version: 2025-12-15.clover"
```

### 8.4 Python

```python
import stripe

stripe.api_key = "sk_test_..."
stripe.api_version = "2025-12-15.clover"

# Ou por requisição:
intent = stripe.PaymentIntent.retrieve(
    "pi_1DlIVK2eZvKYlo2CW4yj5l2C",
    stripe_version="2025-12-15.clover",
)
```

### 8.5 Node.js

```javascript
const stripe = require('stripe')('sk_test_...', {
  apiVersion: '2025-12-15.clover',
});

// Ou por requisição:
const intent = await stripe.paymentIntents.retrieve(
  'pi_1DlIVK2eZvKYlo2CW4yj5l2C',
  {
    stripeVersion: '2025-12-15.clover',
  }
);
```

### 8.6 PHP

```php
\Stripe\Stripe::setApiKey('sk_test_...');
\Stripe\Stripe::setApiVersion('2025-12-15.clover');

// Ou por requisição:
$intent = \Stripe\PaymentIntent::retrieve(
  'pi_1DlIVK2eZvKYlo2CW4yj5l2C',
  [
    'stripe_version' => '2025-12-15.clover',
  ]
);
```

### 8.7 Chaves de API Organizacional

⚠️ **Importante**: Todas as solicitações feitas com **chaves de API organizacional** devem incluir o cabeçalho `Stripe-Version` para garantir consistência.

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_org_...: \
  -H "Stripe-Version: 2025-12-15.clover"
```

---

## 9. Política do Stripe.js

### 9.1 Versionamento do Stripe.js

O Stripe.js segue um **modelo de atualização contínua**. A versão mais recente é sempre recomendada.

**Versões disponíveis**:
- `js.stripe.com/v3` (não recomendado para novas integrações)
- `js.stripe.com/acacia` (versão principal `acacia`)
- `js.stripe.com/clover` (versão principal `clover` - **mais recente**)

### 9.2 Tipos de Alterações

#### Otimizações e Novos Recursos (não disruptivos)
- Rótulos de entrada acessíveis no elemento de pagamento
- Atualização de UI para BNPL
- Novos parâmetros (ex: `postalCode` opcional)

#### Alterações Incompatíveis
- Remoção de parâmetros (ex: `captureMethod: manual` descontinuado)
- Remoção de campos de entrada (ex: `country` para Klarna)
- Alteração de comportamento padrão (ex: layout de tabs → acordeão)

### 9.3 Uso com Tag `<script>`

```html
<!-- Versão mais recente (recomendado) -->
<script src="https://js.stripe.com/clover/stripe.js"></script>

<!-- Versão específica -->
<script src="https://js.stripe.com/acacia/stripe.js"></script>

<!-- Versão v3 (não recomendado) -->
<script src="https://js.stripe.com/v3/stripe.js"></script>
```

### 9.4 Uso com npm (`@stripe/stripe-js`)

```bash
# Instalar versão mais recente
npm install @stripe/stripe-js
```

**Relação entre versões**:
- `@stripe/stripe-js@6.0.0` → `acacia`
- `@stripe/stripe-js@7.0.0` → `clover`

Consulte [releases](https://github.com/stripe/stripe-js/releases) para mapeamento completo.

### 9.5 Uso com React (`@stripe/react-stripe-js`)

```bash
npm install @stripe/react-stripe-js @stripe/stripe-js
```

O `@stripe/react-stripe-js` usa `@stripe/stripe-js` como `peerDependency`.

### 9.6 Compatibilidade com Versões da API

Cada versão do Stripe.js usa automaticamente a **versão da API associada**:
- `acacia` → `2024-12-18.acacia`
- `clover` → `2025-12-15.clover`

⚠️ **Não é possível** sobrescrever a versão da API ao usar Stripe.js.

### 9.7 Migração do Stripe.js v3

**Considerações**:
1. Identifique sua versão atual da API
2. Consulte o [changelog](https://stripe.com/docs/js/changelog)
3. Atualize gradualmente a versão da API antes de atualizar o Stripe.js

**Betas da API**:
- Versões de pré-visualização podem conter alterações não listadas no changelog
- Não é possível adicionar cabeçalhos beta diretamente (`Stripe-Version: ...`)
- O Stripe.js adiciona automaticamente cabeçalhos beta quando necessário (ex: `custom_checkout_beta_5`)

**Betas suportadas em `acacia`**:
- `custom_checkout_beta`
- `nz_bank_account_beta`

### 9.8 Suporte ao Stripe.js v3

- O Stripe.js v3 **não está obsoleto**
- Continuará recebendo recursos retroportáveis
- Recomendamos atualizar para versões mais recentes para acessar novos recursos

---

## 10. Política dos SDKs Mobile

### 10.1 iOS

#### Versionamento Semântico
- `MAJOR.MINOR.PATCH`
- Código aberto: [stripe-ios](https://github.com/stripe/stripe-ios)
- Documentação completa disponível

#### Guias de Migração
- [Guias de migração](https://github.com/stripe/stripe-ios/wiki/Migration-Guides)
- [Changelog](https://github.com/stripe/stripe-ios/blob/master/CHANGELOG.md)

#### Política de Suporte
- Novos recursos e correções: versão principal mais recente
- Versões antigas: disponíveis, mas sem atualizações

#### Compatibilidade com API do Backend
- Compatível com **qualquer versão** da API do Stripe no backend (salvo indicação específica)

### 10.2 Android

#### Versionamento Semântico
- `MAJOR.MINOR.PATCH`
- Código aberto: [stripe-android](https://github.com/stripe/stripe-android)

#### Guias de Migração
- [Guias de migração](https://github.com/stripe/stripe-android/wiki/Migration-Guides)
- [Changelog](https://github.com/stripe/stripe-android/blob/master/CHANGELOG.md)

#### Política de Suporte
- Novos recursos e correções: versão principal mais recente
- Versões antigas: disponíveis, mas sem atualizações

#### Compatibilidade com API do Backend
- Compatível com **qualquer versão** da API do Stripe no backend (salvo indicação específica)

### 10.3 React Native

#### Versionamento Semântico
- `MAJOR.MINOR.PATCH`
- Código aberto: [stripe-react-native](https://github.com/stripe/stripe-react-native)

#### Guias de Migração
- [Guias de migração](https://github.com/stripe/stripe-react-native/wiki/Migration-Guides)
- [Changelog](https://github.com/stripe/stripe-react-native/blob/master/CHANGELOG.md)

#### Política de Suporte
- Novos recursos e correções: versão principal mais recente
- Versões antigas: disponíveis, mas sem atualizações

#### Compatibilidade com API do Backend
- Compatível com **qualquer versão** da API do Stripe no backend (salvo indicação específica)

---

## Conclusão

Manter-se atualizado com as versões da API do Stripe é essencial para:
- Aproveitar novos recursos
- Receber correções de bugs e patches de segurança
- Garantir compatibilidade futura

**Recomendações**:
- Assine o [Stripe Developer Digest](https://stripe.com/resources/newsletters/developer-digest)
- Monitore o [Changelog da API](https://stripe.com/docs/upgrades)
- Teste atualizações em **modo sandbox** antes de produção
- Mantenha SDKs atualizados

---

## Links Úteis

- [Documentação Oficial do Stripe](https://stripe.com/docs)
- [Changelog da API](https://stripe.com/docs/upgrades)
- [Stripe Developer Digest](https://stripe.com/resources/newsletters/developer-digest)
- [Workbench (Versionamento)](https://dashboard.stripe.com/workbench)
- [Guia de Webhooks](https://stripe.com/docs/webhooks)
- [Sandboxes do Stripe](https://stripe.com/docs/testing)
- [GitHub - stripe-samples](https://github.com/stripe-samples)

---

**Última atualização**: 07 de janeiro de 2026  
**Versão da API**: 2025-12-15.clover  
**Documento**: API_STRIPE_VERSIONING_AND_UPDATES.md
