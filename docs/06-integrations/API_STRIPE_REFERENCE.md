# API do Stripe - Referência Completa

**Fonte:** docs.stripe.com  
**Data:** Janeiro 2026  
**Tipo:** Documentação oficial de integração

---

## 0. Cobertura (Checklist “não deixar nada para trás”)

Este documento consolida o essencial de **docs.stripe.com/development** para integração. Para detalhes completos de **versionamento, upgrades e changelog**, veja também: `docs/06-integrations/API_STRIPE_VERSIONING_AND_UPDATES.md`.

Checklist (com referência para onde está descrito):

- Fundamentos REST / formatos / base URL → Seção 1
- Autenticação (secret/public/restricted keys, HTTPS) → Seção 2
- Pagamentos recomendados (PaymentIntents) → Seção 3.1
- Webhooks (assinatura, processamento robusto) → Seção 4.1
- Webhooks (retries, ordering, “thin events” vs “snapshot”) → Seção 4.1
- Expand (expandir sub-objetos) → Seção 4.2
- Idempotency-Key (retries seguros) → Seção 4.3
- Paginação (list endpoints) → Seção 4.4
- Rate limits + retries (boas práticas) → Seção 4.5
- Versionamento da API (Stripe-Version) → Seção 4.6 + doc dedicado
- Events API (listar/recuperar, limite ~30 dias, `api_version`) → Seção 4.7
- Erros (tipos, códigos, request id) → Seção 5
- Recursos comuns (PaymentMethods, Products/Prices, Invoices, SetupIntents, Checkout) → Seção 6
- Billing & Subscriptions (proration, dunning, usage-based) → Seção 6.11
- Customer Portal (self-serve) → Seção 6.12
- Stripe Tax (automatic_tax + cálculos) → Seção 6.13
- Stripe Connect (Accounts/onboarding/capabilities + `Stripe-Account`) → Seções 6.8 e 6.14
- Radar (fraude + reviews) → Seção 6.15
- Identity (verificação) → Seção 6.16
- Terminal (presencial) → Seção 6.17
- Issuing (cartões) → Seção 6.18
- Financial Connections (dados bancários permissionados) → Seção 6.19
- Reports / reconciliação (payout reconciliation, Sigma) → Seção 6.20
- Financial Accounts for platforms (Treasury) → Seção 6.21
- Payment Links → Seção 6.22
- Quotes (Invoicing) → Seção 6.23
- Money movement (Refunds, Disputes/chargebacks, Balance Transactions, Payouts) → Seções 6.6–6.10
- Stripe Connect (tipos de charges e responsabilidade por fees/refunds/disputes) → Seção 6.8
- Testes (cartões, sandboxes, CLI) → Seções 9 e 12

---

## 0.1 Mapa de Dores e Soluções (Rendizy)

Objetivo: transformar as funcionalidades do Stripe em um “mapa” de **problemas reais** que elas resolvem, e em **soluções/produtos** que podemos priorizar no Rendizy.

Como ler:

- **Para que serve**: aplicação típica no mercado.
- **Dor que resolve**: o problema operacional/financeiro/UX que some (ou reduz muito).
- **O que construir no Rendizy**: ideias de features e produtos (MVP → evoluções).

### Fundamentos (obrigatórios para produção)

- **Autenticação e segurança** (Seção 2)
  - Para que serve: garantir que somente o backend “assina” operações sensíveis.
  - Dor que resolve: vazamento de chave; fraude; execução de cobranças fora do controle.
  - O que construir no Rendizy: padrão de “backend-only payments”, rotação de chaves, restricted keys por serviço.

- **Webhooks** (Seção 4.1)
  - Para que serve: fonte de verdade assíncrona do Stripe (pagou, falhou, disputou, etc.).
  - Dor que resolve: inconsistência por depender de redirect/cliente; perda de eventos; duplicidade.
  - O que construir no Rendizy: pipeline idempotente por `event.id`, reprocessamento, trilha de auditoria por cliente/reserva/pagamento.

- **Idempotência / retries / rate limits** (Seções 4.3–4.5)
  - Para que serve: permitir reexecução segura quando a rede falha.
  - Dor que resolve: cobranças duplicadas, estados “quebrados” e suporte caro.
  - O que construir no Rendizy: middleware de idempotência por operação, retentativas com backoff, métricas por `Stripe-Request-Id`.

- **Versionamento Stripe (`Stripe-Version`)** (Seção 4.6 + doc dedicado)
  - Para que serve: upgrades previsíveis e controle de breaking changes.
  - Dor que resolve: “parou do nada” após mudança de versão; regressões em produção.
  - O que construir no Rendizy: política de upgrade, ambiente de validação, checklist de rollout.

### Payments (cobrança direta)

- **PaymentIntents (pagamentos)** (Seção 3.1)
  - Para que serve: cobrar cartão e lidar com SCA/3DS e estados intermediários.
  - Dor que resolve: falhas por autenticação; estados confusos; charge sem confirmação adequada.
  - O que construir no Rendizy:
    - Pagamento de reserva (one-time) com status robusto.
    - Pré-autorização/capture (quando fizer sentido) para garantia.
    - Operação “cobrar extras / multas / no-show” com trilha.

- **PaymentMethods (métodos do cliente)** (Seção 6.1)
  - Para que serve: salvar/gerenciar métodos para cobranças futuras.
  - Dor que resolve: atrito de checkout recorrente; baixa conversão; cobranças off-session falhando.
  - O que construir no Rendizy: “carteira do hóspede/cliente”, método padrão por unidade/contrato.

- **SetupIntents (salvar cartão com conformidade)** (Seção 6.4)
  - Para que serve: preparar cobrança futura (off-session) com autenticação quando necessário.
  - Dor que resolve: falha em cobrança posterior por falta de consentimento/autenticação.
  - O que construir no Rendizy: cadastro de cartão para caução/garantia, upgrades de plano, cobranças recorrentes.

### Checkout e conversão

- **Checkout Sessions (checkout hospedado)** (Seção 6.5)
  - Para que serve: checkout pronto (UX + pagamento), menos engenharia e menor risco PCI.
  - Dor que resolve: construir checkout próprio é caro e dá mais bugs/fraude.
  - O que construir no Rendizy: links/flows de pagamento para reservas e upgrades com “o mínimo de UI”.

- **Payment Links (venda via link)** (Seção 6.22)
  - Para que serve: gerar link de pagamento sem código complexo.
  - Dor que resolve: cobrança manual em WhatsApp/email; baixa rastreabilidade.
  - O que construir no Rendizy: “cobrança por link” para reservas fora do site, adiantamentos e ajustes.

### Billing / recorrência / assinaturas

- **Subscriptions (recorrência)** (Seção 6.11)
  - Para que serve: cobrança periódica (planos, mensalidades, contratos).
  - Dor que resolve: gestão manual de mensalidade, proration, mudanças de plano.
  - O que construir no Rendizy:
    - Planos SaaS (por organização) com upgrade/downgrade.
    - Mensalidade de serviços recorrentes para clientes (quando aplicável ao negócio).

- **Invoices (faturas) + dunning (recuperação)** (Seções 6.3 e 6.11)
  - Para que serve: “contabilidade” do ciclo de cobrança e reintentos quando falha.
  - Dor que resolve: inadimplência silenciosa; cancelamento errado; falta de prova/links.
  - O que construir no Rendizy: régua de cobrança (notificações), suspensão gradual, reativação automática.

- **Customer Portal (self-serve)** (Seção 6.12)
  - Para que serve: permitir cliente atualizar cartão/assinatura sem suporte.
  - Dor que resolve: suporte operacional alto; atraso em recuperação de pagamento.
  - O que construir no Rendizy: portal do cliente/organização para “meus pagamentos”.

- **Tax (impostos automáticos)** (Seção 6.13)
  - Para que serve: cálculo/coleta de impostos (quando aplicável e suportado).
  - Dor que resolve: cálculo manual e risco fiscal.
  - O que construir no Rendizy: impostos em checkout/nota (onde fizer sentido), regras por país/UF.

### Marketplace / plataformas (Connect)

- **Connect Accounts + onboarding/capabilities** (Seções 6.8 e 6.14)
  - Para que serve: operar marketplace/plataforma com múltiplos recebedores.
  - Dor que resolve: split payments, KYC, repasse e responsabilidades legais.
  - O que construir no Rendizy:
    - Repasse para proprietários/parceiros.
    - Regras de comissão/taxa por canal/unidade.
    - Dashboard de onboarding e pendências.

### Risco, fraude e verificação

- **Radar + Reviews** (Seção 6.15)
  - Para que serve: reduzir chargebacks/fraude e automatizar decisões.
  - Dor que resolve: prejuízo por fraude + trabalho manual de revisão.
  - O que construir no Rendizy: score/regra de risco por reserva, fila de revisão e bloqueio inteligente.

- **Identity (verificação)** (Seção 6.16)
  - Para que serve: verificar identidade do usuário (KYC/KYB, conforme produto/região).
  - Dor que resolve: fraude e compliance em fluxos de alto risco.
  - O que construir no Rendizy: verificação para anfitriões/parceiros e para reservas suspeitas.

### Operações e canais físicos

- **Terminal (pagamento presencial)** (Seção 6.17)
  - Para que serve: aceitar cartão presente (POS/Tap to Pay).
  - Dor que resolve: conciliar pagamentos presenciais com reservas e backoffice.
  - O que construir no Rendizy: cobrança no check-in, extras no balcão, reconciliação única.

### Programas financeiros (mais avançado)

- **Issuing (cartões)** (Seção 6.18)
  - Para que serve: emitir cartões para gastos controlados.
  - Dor que resolve: controle de despesas e conciliação de gastos operacionais.
  - O que construir no Rendizy: cartões virtuais para manutenção/limpeza com limites por propriedade.

- **Financial Connections** (Seção 6.19)
  - Para que serve: conectar contas bancárias com consentimento para dados/fluxos.
  - Dor que resolve: validação bancária e risco (quando aplicável).
  - O que construir no Rendizy: verificação de conta de recebedor, melhorias de onboarding.

- **Reports / reconciliação** (Seção 6.20)
  - Para que serve: fechar financeiro com clareza (payouts, fees, refunds).
  - Dor que resolve: “por que o payout veio diferente?” e conciliação manual.
  - O que construir no Rendizy: tela de conciliação por período, export contábil, auditoria por transação.

- **Treasury (financial accounts for platforms)** (Seção 6.21)
  - Para que serve: contas financeiras para plataformas (alto nível).
  - Dor que resolve: gestão de saldo/fluxos complexos (casos específicos).
  - O que construir no Rendizy: somente se houver roadmap de fintech/conta digital.

### B2B / vendas assistidas

- **Quotes (propostas)** (Seção 6.23)
  - Para que serve: proposta formal que vira invoice/cobrança.
  - Dor que resolve: negociação B2B sem rastreabilidade; aprovações confusas.
  - O que construir no Rendizy: propostas para contratos corporativos e pacotes.

## 1. Visão Geral da API

A API do Stripe é organizada em torno do **REST**, utilizando URLs orientadas a recursos, corpos de solicitação codificados em formulário e respostas em JSON. Utiliza códigos de resposta HTTP padrão, autenticação e verbos.

| Característica | Detalhes |
|---|---|
| **Base URL** | `https://api.stripe.com` |
| **Formato de Dados** | JSON (Respostas), Form-encoded (Solicitações) |
| **Autenticação** | Chaves de API (Secret Keys) via HTTP Basic Auth |
| **Modos** | Teste (`sk_test_...`) e Live (`sk_live_...`) |

---

## 2. Autenticação e Segurança

A autenticação é feita através de **chaves de API** enviadas no cabeçalho da requisição.

### Tipos de Chaves

- **Chaves Secretas:** Devem ser mantidas em segurança no servidor
- **Chaves Publicáveis:** Usadas no lado do cliente (Stripe.js)
- **Restricted Keys:** Permitem permissões granulares para maior segurança
- **HTTPS:** Obrigatório para todas as chamadas de API

### Exemplo de Autenticação

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_YOUR_SECRET_KEY: \
  -d email="customer@example.com"
```

**Nota:** A chave secreta é enviada como username no HTTP Basic Auth (com ":" como password).

---

## 3. Recursos Principais (Core Resources)

### 3.1 Payment Intents

O recurso **PaymentIntent** é o método recomendado para coletar pagamentos. Ele rastreia o ciclo de vida de um pagamento, desde a criação até a confirmação.

#### Estados Possíveis

| Estado | Descrição |
|---|---|
| `requires_payment_method` | Aguardando método de pagamento |
| `requires_confirmation` | Aguardando confirmação |
| `requires_action` | Requer ação adicional (3DS, etc) |
| `processing` | Processando o pagamento |
| `requires_capture` | Aguardando captura manual |
| `canceled` | Pagamento cancelado |
| `succeeded` | Pagamento bem-sucedido |

#### Atributos Chave

- `amount` - Valor em centavos (ex: 1000 = R$ 10,00)
- `currency` - Moeda (ex: `brl`, `usd`)
- `customer` - ID do cliente
- `client_secret` - Secret para uso no frontend (Stripe.js)

#### Exemplo de Criação

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u sk_test_YOUR_SECRET_KEY: \
  -d amount=1000 \
  -d currency=brl \
  -d "payment_method_types[]"=card
```

#### Fluxo recomendado (resumo)

- Backend cria o `PaymentIntent` e retorna `client_secret`.
- Frontend confirma com Stripe.js (ex.: `confirmCardPayment`).
- Backend “ouve” o resultado via webhook (mais confiável) e atualiza o status interno.

#### Dicas práticas

- **Captura automática vs manual**:
  - Automática (padrão): o pagamento é capturado assim que confirmado.
  - Manual: configure `capture_method=manual` e depois faça `POST /v1/payment_intents/{id}/capture`.
- **Retries seguros**: use `Idempotency-Key` no `create` do PaymentIntent.
- **Preferir `automatic_payment_methods` quando possível** (reduz manutenção de métodos):

Subguia (SCA/3DS, on-session/off-session e confirmação):

- **3DS/SCA**: quando `status=requires_action`, o frontend precisa confirmar/autenticar (Stripe.js/SDK). O backend não deve “forçar” o status para pago; aguarde webhook.
- **On-session** (usuário presente): normalmente você cria o PaymentIntent e confirma no frontend.
- **Off-session** (cobrança futura/recorrente): em geral você:
  - salva um método com **SetupIntent** (ou confirma um PaymentIntent com `setup_future_usage`),
  - depois cria/confirm um PaymentIntent off-session (quando aplicável) e lida com `requires_action` como exceção (notificar o usuário para completar autenticação).
- **Idempotência**: para criação de PaymentIntent e operações internas (criação de pedido/assinatura), use chaves idempotentes para evitar duplicidade.

Campos que você deve considerar no seu design:

- `confirmation_method`: `automatic` (comum) vs `manual` (quando você controla `confirm`).
- `capture_method`: `automatic` vs `manual` (Seção acima).
- `setup_future_usage`: quando você quer reutilizar método em pagamentos futuros.
- `customer`: quando você quer “lembrar” método e conciliar com Billing/Invoices.

APIs comuns em PaymentIntents:

```
POST /v1/payment_intents
GET  /v1/payment_intents/{id}
POST /v1/payment_intents/{id}
POST /v1/payment_intents/{id}/confirm
POST /v1/payment_intents/{id}/capture
POST /v1/payment_intents/{id}/cancel
```

Webhooks comuns no ciclo de pagamento:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.requires_action` (quando aplicável)
- `charge.succeeded` / `charge.refunded` (úteis para reconciliação, dependendo do seu domínio)

**Evite APIs legadas quando possível**:

- Prefira **PaymentIntents** (pagamentos) e **SetupIntents** (salvar método) em vez de fluxos antigos baseados em **Charges**, **Tokens** e **Sources**, exceto quando estiver mantendo legado.

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u sk_test_YOUR_SECRET_KEY: \
  -d amount=1000 \
  -d currency=brl \
  -d "automatic_payment_methods[enabled]"=true
```

---

### 3.2 Customers

Representa os **clientes** da sua empresa. Permite criar cobranças recorrentes e salvar informações de pagamento.

#### Endpoints Principais

```
POST   /v1/customers          # Criar cliente
GET    /v1/customers/:id      # Consultar cliente
POST   /v1/customers/:id      # Atualizar cliente
DELETE /v1/customers/:id      # Deletar cliente
GET    /v1/customers          # Listar clientes
```

#### Atributos Chave

- `email` - Email do cliente
- `name` - Nome completo
- `description` - Descrição ou notas internas
- `metadata` - Objeto JSON com dados customizados (máx 50 keys)

#### Exemplo de Criação

```json
{
  "email": "cliente@exemplo.com",
  "name": "João Silva",
  "description": "Cliente VIP - Plano Premium",
  "metadata": {
    "user_id": "12345",
    "signup_date": "2026-01-07"
  }
}
```

---

### 3.3 Subscriptions

Permite cobrar clientes de forma **recorrente** (assinaturas).

#### Estados Possíveis

| Estado | Descrição |
|---|---|
| `active` | Assinatura ativa |
| `past_due` | Pagamento em atraso |
| `unpaid` | Não pago (após tentativas) |
| `canceled` | Cancelada |
| `incomplete` | Incompleta (primeiro pagamento falhou) |
| `trialing` | Período de teste |

#### Integração

Requer um **Customer** e um **Price** (ou Plan).

#### Exemplo de Criação

```bash
curl https://api.stripe.com/v1/subscriptions \
  -u sk_test_YOUR_SECRET_KEY: \
  -d customer=cus_XXXXXXXXXXXXX \
  -d "items[0][price]"=price_XXXXXXXXXXXXX
```

---

## 4. Funcionalidades Avançadas

### 4.1 Webhooks

Essenciais para receber **notificações assíncronas** sobre eventos na conta Stripe (ex: pagamento bem-sucedido, falha na assinatura).

#### Segurança

O Stripe assina os eventos para que você possa **verificar a origem**.

#### Exemplo de Verificação

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// IMPORTANTE: para validar assinatura, use o corpo RAW (não JSON parseado).
// Exemplo Express:
app.post('/webhook', require('express').raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
    
    // Processar evento
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Pagamento confirmado
        break;
      case 'customer.subscription.deleted':
        // Assinatura cancelada
        break;
    }
    
    res.json({received: true});
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

#### Boas práticas (produção)

- **Responda rápido (2xx)** e processe de forma assíncrona (fila/worker) para evitar timeouts.
- **Não confie em ordenação**: eventos podem chegar fora de ordem.
- **Deduplicação**: use `event.id` como chave idempotente no seu banco (não processe duas vezes).
- **Retries automáticos**: trate o webhook como “pelo menos uma vez” (at-least-once).
- **Seleção de eventos**: assine apenas os eventos necessários para reduzir ruído.
- **Janela de retries**: em Live, o Stripe pode tentar reenviar por até ~**3 dias** (varia por produto/config). Em Test, a janela costuma ser menor.
- **“Thin events” vs “snapshot events”**: alguns eventos podem vir com payload menor; quando precisar de dados completos, recupere o objeto via API usando o `id` em `event.data.object`.
- **Observabilidade**: use o Dashboard para inspecionar deliveries (status, tentativas, payload) e reenviar quando necessário.

#### Eventos Importantes

- `payment_intent.succeeded` - Pagamento confirmado
- `payment_intent.payment_failed` - Pagamento falhou
- `customer.subscription.created` - Assinatura criada
- `customer.subscription.updated` - Assinatura atualizada
- `customer.subscription.deleted` - Assinatura cancelada
- `invoice.payment_succeeded` - Fatura paga
- `invoice.payment_failed` - Fatura não paga

Mapa rápido “evento → ação” (produção):

- `payment_intent.succeeded` → marcar pedido como pago e liberar acesso (idempotente)
- `payment_intent.payment_failed` → marcar tentativa como falha; não “cancelar” pedido automaticamente sem regra
- `payment_intent.requires_action` → notificar/acionar UI para autenticação (quando aplicável)
- `checkout.session.completed` → recuperar Session + objetos relacionados e persistir (não confiar só no redirect)
- `invoice.finalized` → “invoice fechada”; persistir links/valores; iniciar cobrança conforme modelo
- `invoice.payment_succeeded` → marcar ciclo pago; emitir nota/recibo interno; reconciliar
- `invoice.payment_failed` → iniciar dunning (notificação, suspensão, atualizar status)
- `customer.subscription.updated` → atualizar status interno (trial/past_due/canceled) e permissões
- `account.updated` → atualizar status de onboarding/capabilities em Connect

Boas práticas do handler:

- Sempre verifique `livemode` no evento e se o endpoint correto (test vs live) está recebendo.
- Responda 2xx mesmo quando o objeto “já foi processado” (dedupe por `event.id`).

Checklist de eventos por produto (operacional):

- Pagamentos (PaymentIntents):
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.requires_action` (quando aplicável)
-  - `payment_intent.canceled` (quando aplicável)
- Setup (SetupIntents):
  - `setup_intent.succeeded`
  - `setup_intent.setup_failed`
  - `setup_intent.requires_action` (quando aplicável)
- Checkout:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
- Billing/Invoicing:
  - `invoice.created` (útil para observabilidade)
  - `invoice.finalized`
  - `invoice.finalization_failed` (quando aplicável)
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `invoice.payment_action_required` (quando aplicável)
  - `invoice.voided`
  - `customer.subscription.created|updated|deleted`
  - `customer.subscription.trial_will_end` (quando aplicável)
- Clientes & Payment Methods:
  - `customer.created|updated|deleted` (quando você espelha cadastro)
  - `payment_method.attached`
  - `payment_method.detached`
- Connect (onboarding/capabilities):
  - `account.updated`
  - `capability.updated`
  - `person.updated` (quando aplicável)
- Connect (money movement):
  - `transfer.created|updated|reversed` (quando aplicável)
  - `application_fee.created` (quando aplicável)
  - `application_fee.refunded` (quando aplicável)
- Disputes/Refunds (money movement):
  - `charge.refunded` / `refund.updated` (quando aplicável)
  - `charge.dispute.created|updated|closed`
  - `charge.dispute.funds_withdrawn` (quando aplicável)
- Payouts (repasse):
  - `payout.created` (quando aplicável)
  - `payout.paid`
  - `payout.failed`
  - `payout.updated`
- Radar (fraude):
  - `radar.early_fraud_warning.created|updated` (quando aplicável)
  - `review.opened|closed` (quando usar Review)
- Identity:
  - `identity.verification_session.created|processing|verified|requires_input|canceled`
- Terminal (presencial):
  - (além dos eventos de PaymentIntent acima)
  - `terminal.reader.updated` (quando aplicável)
  - `terminal.reader.action_succeeded|action_failed|action_updated` (quando aplicável)
- Issuing (cartões):
  - `issuing_authorization.request` (quando aplicável)
  - `issuing_authorization.created|updated`
  - `issuing_transaction.created|updated`

---

### 4.2 Expansão de Respostas (Expanding Responses)

Muitos objetos permitem solicitar informações adicionais usando o parâmetro **`expand`**.

#### Exemplo

```bash
# Sem expand (retorna apenas customer ID):
curl https://api.stripe.com/v1/charges/ch_XXXXX \
  -u sk_test_YOUR_SECRET_KEY:

# Com expand (retorna objeto customer completo):
curl https://api.stripe.com/v1/charges/ch_XXXXX?expand[]=customer \
  -u sk_test_YOUR_SECRET_KEY:
```

#### Expansões Comuns

- `customer` - Expandir dados do cliente
- `payment_method` - Expandir método de pagamento
- `invoice` - Expandir fatura (em subscriptions)
- `latest_invoice` - Última fatura de uma assinatura

---

### 4.3 Idempotência

Suporte a **chaves de idempotência** (`Idempotency-Key`) para evitar o processamento duplicado de solicitações em caso de falhas de rede.

#### Como Usar

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_YOUR_SECRET_KEY: \
  -H "Idempotency-Key: unique-request-id-12345" \
  -d email="customer@example.com"
```

**Comportamento:**
- Se a requisição falhar e for reenviada com a mesma `Idempotency-Key`, o Stripe retorna o resultado da primeira tentativa bem-sucedida
- Chaves expiram após 24 horas
- Use UUIDs ou identificadores únicos por transação

---

### 4.4 Paginação (List endpoints)

Muitos endpoints de listagem usam paginação baseada em cursor:

- `limit` (ex.: 10)
- `starting_after` (cursor para próxima página)
- `ending_before` (cursor para página anterior)

Exemplo (listar customers):

```bash
curl "https://api.stripe.com/v1/customers?limit=10" \
  -u sk_test_YOUR_SECRET_KEY:
```

Paginar com `starting_after` (use o `id` do último item retornado):

```bash
curl "https://api.stripe.com/v1/customers?limit=10&starting_after=cus_XXXXX" \
  -u sk_test_YOUR_SECRET_KEY:
```

#### 4.4.1 Paginação em endpoints de Search

Alguns recursos suportam **Search** (ex.: `.../search`) com um mecanismo de paginação diferente:

- `query` (string de busca)
- `limit`
- `page` (cursor/token de paginação retornado pelo Stripe)

Você não usa `starting_after`/`ending_before` nesses endpoints. Em vez disso, use o `next_page` retornado na resposta.

---

### 4.5 Rate limits e retries

- A API pode retornar **429** (rate limited). Trate como temporário.
- Em erros transitórios (rede/5xx), implemente **retry com backoff exponencial**.
- Combine retries com `Idempotency-Key` em operações de escrita para evitar duplicidade.

---

### 4.6 Versionamento (Stripe-Version)

O Stripe permite fixar o comportamento da API via header `Stripe-Version`.

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_...: \
  -H "Stripe-Version: 2025-12-15.clover"
```

Notas importantes:

- Sua conta tem uma **versão padrão** (Workbench). Você pode sobrescrever por request.
- Webhooks podem variar conforme versão/configuração do endpoint.
- Detalhes completos (incluindo política de upgrade/rollback e changelog): `docs/06-integrations/API_STRIPE_VERSIONING_AND_UPDATES.md`.

---

### 4.7 Events API (listar/recuperar eventos)

A API de **Events** é útil para auditoria e debug, mas **não substitui webhooks**.

Pontos essenciais:

- **Retenção para acesso via API:** eventos ficam disponíveis via API por cerca de **30 dias**.
- **`api_version` do evento é “congelada”:** o payload do evento (`event.data`) reflete a versão vigente no momento em que o evento foi gerado e não “muda” ao reconsultar depois.
- Eventos podem chegar **fora de ordem** e podem ser reenviados (retries) → dedupe por `event.id`.

Endpoints principais:

```
GET /v1/events
GET /v1/events/{id}
```

Listar eventos (com paginação) e filtrar por tipo(s):

```bash
curl "https://api.stripe.com/v1/events?limit=10&types[]=payment_intent.succeeded" \
  -u sk_test_YOUR_SECRET_KEY:
```

Observação de payload:

- Se algum evento vier com dados “enxutos” (payload menor), trate o `id` do objeto em `event.data.object` como a fonte e recupere o objeto na API correspondente quando necessário.

---

### 4.8 Event Destinations (observabilidade/integração)

Além de webhooks HTTP tradicionais, o Stripe também suporta “**event destinations**” (roteamento de eventos para destinos). Para a integração RENDIZY, a abordagem padrão continua sendo:

- Webhooks HTTP assinados (Seção 4.1)
- Processamento assíncrono + dedupe por `event.id`

## 5. Tratamento de Erros

O Stripe utiliza **códigos HTTP** para indicar o status:

| Código | Significado |
|---|---|
| **2xx** | Sucesso |
| **4xx** | Erro na solicitação (parâmetros inválidos, falha na cobrança) |
| **5xx** | Erro nos servidores do Stripe (raro) |

### Tipos de Erro

| Tipo de Erro | Descrição |
|---|---|
| `api_error` | Erro interno na API do Stripe |
| `card_error` | Erro relacionado ao cartão (ex: declinado) |
| `idempotency_error` | Erro de chave de idempotência |
| `invalid_request_error` | Parâmetros inválidos ou recurso não encontrado |

Observações:

- A lista acima é um **resumo**. Dependendo do endpoint/fluxo, você também pode ver erros como `api_connection_error`, `authentication_error`, `permission_error`, `rate_limit_error` e, em webhooks, `signature_verification_error`.
- Em falhas de rede/timeout (**resultado indeterminado**), trate como “pode ter criado ou não” e use `Idempotency-Key` para retentativas seguras.

### Exemplo de Resposta de Erro

```json
{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "message": "Your card was declined.",
    "param": "payment_method",
    "decline_code": "generic_decline"
  }
}
```

#### Diagnóstico e rastreio

- Guarde o header `Stripe-Request-Id` das respostas (correlação com logs no Dashboard).
- Em produção, registre também:
  - `error.type`, `error.code`, `error.decline_code` (quando existir)
  - endpoint chamado, payload (sem dados sensíveis), idempotency key

Onde alguns erros ficam “armazenados”:

- `PaymentIntent.last_payment_error`
- `Invoice.last_finalization_error`
- `Payout.failure_code` / `Payout.failure_message` (quando aplicável)

### Códigos de Declínio Comuns

- `insufficient_funds` - Saldo insuficiente
- `lost_card` - Cartão reportado como perdido
- `stolen_card` - Cartão reportado como roubado
- `expired_card` - Cartão expirado
- `incorrect_cvc` - CVC incorreto
- `processing_error` - Erro no processamento

---

## 6. Recursos Adicionais

### 6.1 Payment Methods

Representam métodos de pagamento salvos (cartões, débito direto, etc).

Subguia (como isso se liga a PaymentIntents/SetupIntents):

- **PaymentMethod** é o “instrumento” (ex.: cartão). Ele pode ser:
  - coletado no frontend (Stripe.js/SDK) e enviado para seu backend via `id`.
  - anexado a um `Customer` (`/v1/payment_methods/{id}/attach`) para reutilização.
- **PaymentIntent** é a “tentativa de pagamento” (com estados como `requires_action` para 3DS/SCA).
- **SetupIntent** é a “tentativa de salvar método” para uso futuro (on-session/off-session).

Regras práticas:

- Evite criar PaymentMethods diretamente via API com dados de cartão em produção (PCI). Use Stripe.js/SDK.
- Se você precisa cobrar “depois” (off-session), alinhe SetupIntent + `setup_future_usage` (na criação/confirm do PaymentIntent) com seu fluxo.

APIs comuns:

```
GET  /v1/payment_methods/{id}
GET  /v1/payment_methods
POST /v1/payment_methods/{id}/attach
POST /v1/payment_methods/{id}/detach
```

```bash
# Criar Payment Method
curl https://api.stripe.com/v1/payment_methods \
  -u sk_test_YOUR_SECRET_KEY: \
  -d type=card \
  -d "card[number]"=4242424242424242 \
  -d "card[exp_month]"=12 \
  -d "card[exp_year]"=2027 \
  -d "card[cvc]"=123
```

Exemplo (anexar a um Customer):

```bash
curl https://api.stripe.com/v1/payment_methods/pm_XXXXX/attach \
  -u sk_test_YOUR_SECRET_KEY: \
  -d customer=cus_XXXXX
```

Exemplo (definir default no Customer para futuras invoices):

```bash
curl https://api.stripe.com/v1/customers/cus_XXXXX \
  -u sk_test_YOUR_SECRET_KEY: \
  -d "invoice_settings[default_payment_method]"=pm_XXXXX
```

### 6.2 Prices e Products

**Products** representam itens vendidos.  
**Prices** definem valores e recorrência.

```bash
# Criar produto
curl https://api.stripe.com/v1/products \
  -u sk_test_YOUR_SECRET_KEY: \
  -d name="Plano Premium"

# Criar preço recorrente
curl https://api.stripe.com/v1/prices \
  -u sk_test_YOUR_SECRET_KEY: \
  -d product=prod_XXXXX \
  -d unit_amount=2990 \
  -d currency=brl \
  -d "recurring[interval]"=month
```

### 6.3 Invoices

Faturas geradas automaticamente para assinaturas ou criadas manualmente.

Pontos importantes (integração):

- Em Billing, a **Invoice** é frequentemente a “fonte de verdade” do ciclo de cobrança (inclusive para assinatura).
- Estados comuns (alto nível): `draft` → `open` → `paid` (ou `uncollectible` / `void`).
- Use webhooks para refletir status no seu domínio (ex.: `invoice.finalized`, `invoice.payment_succeeded`, `invoice.payment_failed`).
- Para permitir “checkout” do cliente em caso de falha/atraso, guarde links como `hosted_invoice_url` e `invoice_pdf` quando disponíveis.

```bash
# Criar fatura manual
curl https://api.stripe.com/v1/invoices \
  -u sk_test_YOUR_SECRET_KEY: \
  -d customer=cus_XXXXX \
  -d auto_advance=true
```

Dicas práticas:

- **Finalização automática**: `auto_advance=true` normalmente faz a fatura progredir automaticamente.
- **Itens da fatura**: em geral, crie `invoiceitems` ou deixe a assinatura gerar as linhas.
- **Preview**: ao trocar plano/quantidade, use “preview upcoming invoice” para estimar proration e valores (útil para UI e auditoria).

Subguia (fluxo prático e pontos que costumam causar bugs):

- **InvoiceItems primeiro, Invoice depois** (manual): em geral você cria `invoiceitems` (linhas) associadas ao `customer`, e depois cria a `invoice` para consolidar essas linhas.
- **Draft vs Finalized**: enquanto está `draft`, a fatura ainda pode mudar (linhas, impostos, descontos). Após `invoice.finalized`, os números tendem a “fechar” e o ciclo de cobrança segue.
- **Cobrança efetiva**: o pagamento normalmente acontece quando a invoice é `open` e o Stripe tenta cobrar (ou você executa ações que resultem em cobrança, conforme seu modelo).
- **Links úteis para o cliente**: `hosted_invoice_url` e `invoice_pdf` são muito úteis para suporte e cobranças manuais.
- **Falha de pagamento em invoice**: o erro pode aparecer no próprio objeto (ex.: `last_finalization_error`) e/ou no PaymentIntent associado (`latest_invoice.payment_intent.last_payment_error`).

APIs comuns em Invoicing (geralmente usadas junto):

```
POST /v1/invoiceitems
POST /v1/invoices
GET  /v1/invoices/{id}
GET  /v1/invoices
POST /v1/invoices/{id}          # ajustes (quando permitido)
POST /v1/invoices/{id}/finalize # se você estiver controlando finalização
POST /v1/invoices/{id}/pay      # cobrança “manual” (quando faz sentido no seu fluxo)
POST /v1/invoices/{id}/void     # anula invoice (quando aplicável)
GET  /v1/invoices/upcoming      # preview/proration (estimativas)
```

Webhooks que cobrem o “caminho feliz” e o “caminho ruim”:

- `invoice.created` → útil para auditoria
- `invoice.finalized` → ponto comum de “pronto para cobrar”
- `invoice.payment_succeeded` / `invoice.paid` → confirma pagamento
- `invoice.payment_failed` → tratar dunning/retries e suspensão de serviço
- `invoice.voided` / `invoice.marked_uncollectible` → tratar encerramento sem pagamento

### 6.4 Setup Intents

Use **SetupIntents** para salvar um método de pagamento para uso futuro (on-session/off-session), reduzindo riscos de SCA e permitindo cobranças recorrentes.

```bash
curl https://api.stripe.com/v1/setup_intents \
  -u sk_test_YOUR_SECRET_KEY: \
  -d customer=cus_XXXXX \
  -d "payment_method_types[]"=card
```

Padrão de uso:

- Backend cria o `SetupIntent` e retorna `client_secret`.
- Frontend confirma com Stripe.js (ex.: `confirmCardSetup`).
- Depois, você pode anexar/usar o `payment_method` no `Customer` e reutilizar em `PaymentIntents`.

Subguia (salvar método com segurança e usar off-session):

- **Quando usar SetupIntent**: quando seu objetivo principal é **salvar** um método (não cobrar agora) e estar pronto para cobranças futuras (recorrência, pós-pago, no-show, etc.).
- **Alternativa (cobrar agora e salvar para depois)**: em alguns fluxos, você confirma um PaymentIntent com `setup_future_usage` e reaproveita o método mais tarde.
- **Fonte de verdade**: use webhooks de SetupIntent/PaymentMethod para atualizar seu domínio e manter consistência.

Pontos que costumam dar problema:

- Mesmo “salvando cartão”, a primeira autenticação (SCA/3DS) pode ser necessária dependendo do caso.
- Para cobrança off-session futura, ainda pode aparecer `requires_action` no PaymentIntent (exceção). Nesse caso, você precisa reengajar o usuário para autenticar.

APIs comuns:

```
POST /v1/setup_intents
GET  /v1/setup_intents/{id}
POST /v1/setup_intents/{id}
POST /v1/setup_intents/{id}/confirm
POST /v1/setup_intents/{id}/cancel
```

Webhooks comuns no ciclo de “salvar método”:

- `setup_intent.succeeded`
- `setup_intent.setup_failed`
- `payment_method.attached` (quando aplicável)

### 6.5 Checkout (Checkout Sessions)

Para um fluxo hospedado (UI pronta), use **Checkout Sessions**. Útil quando você quer acelerar implementação com uma página de pagamento do Stripe.

Duas abordagens comuns:

- **Stripe-hosted**: o usuário é redirecionado para a página do Stripe.
- **Embedded**: você usa a experiência embutida conforme o modelo recomendado do Stripe.

Pontos práticos:

- `mode=payment` para pagamento único.
- `mode=subscription` para assinaturas via Checkout (quando aplicável).
- Quando você precisa ligar checkout a um usuário interno, use `client_reference_id` e/ou `metadata`.
- Se você quiser “salvar e reutilizar” método de pagamento para futuras cobranças, alinhe com SetupIntents/Customer (Seção 6.4) e com o modo do Checkout.

Subguia (o que persistir e como confirmar o resultado):

- **Não confie só no redirect** (`success_url`). O usuário pode fechar a aba, ter adblock, perder conexão, etc.
- Use `checkout.session.completed` como gatilho para recuperar a Session e persistir IDs no seu domínio.
- Itens normalmente úteis de persistir (no seu banco):
  - `checkout_session_id` (cs_...)
  - `customer` (cus_...) quando criado/usado
  - `payment_intent` (pi_...) no `mode=payment`
  - `subscription` (sub_...) no `mode=subscription`
  - `invoice` (in_...) quando existir no fluxo de assinatura
  - `client_reference_id` e/ou `metadata` (para correlação)

Diferenças por modo:

- `mode=payment`:
  - Fonte de verdade de pagamento: `payment_intent.succeeded` e/ou `checkout.session.completed` + verificação do PaymentIntent.
- `mode=subscription`:
  - Fonte de verdade de “cobrança inicial ok”: normalmente `invoice.payment_succeeded` (ou `invoice.paid`) + `customer.subscription.updated`.
  - A Session é excelente para correlacionar; a Invoice costuma ser melhor para estados financeiros.

APIs comuns:

```
POST /v1/checkout/sessions
GET  /v1/checkout/sessions/{id}
GET  /v1/checkout/sessions
```

Webhooks úteis (além dos já listados):

- `invoice.payment_succeeded` / `invoice.payment_failed` (especialmente em `mode=subscription`)
- `customer.subscription.created|updated|deleted`

```bash
curl https://api.stripe.com/v1/checkout/sessions \
  -u sk_test_YOUR_SECRET_KEY: \
  -d mode=payment \
  -d "line_items[0][price]"=price_XXXXX \
  -d "line_items[0][quantity]"=1 \
  -d success_url="https://example.com/success?session_id={CHECKOUT_SESSION_ID}" \
  -d cancel_url="https://example.com/cancel"
```

Webhooks úteis para Checkout:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`

Boas práticas (produção):

- Trate `checkout.session.completed` como gatilho para **confirmar o estado** no backend (ex.: recuperar a Session e os objetos relacionados) e então persistir.
- Combine com `Idempotency-Key` nas operações internas para evitar duplicidade.

---

### 6.6 Refunds (reembolsos)

Use **Refunds** para reembolsar pagamentos. Um refund pode ser criado a partir de um **Charge** ou de um **PaymentIntent**, e pode ser **parcial** e em **múltiplas etapas** até completar o valor total.

Regras importantes:

- `status` típicos: `pending`, `requires_action`, `succeeded`, `failed`, `canceled`.
- **Cancelamento**: em geral, só faz sentido quando o refund está em `requires_action`.
- Em cenários Stripe Connect, existem flags importantes como `reverse_transfer` e `refund_application_fee` (quando aplicável) que afetam como o dinheiro/fee é revertido.

Endpoints principais:

```
POST /v1/refunds
GET  /v1/refunds/{id}
GET  /v1/refunds
POST /v1/refunds/{id}
POST /v1/refunds/{id}/cancel
```

Criar refund por PaymentIntent:

```bash
curl https://api.stripe.com/v1/refunds \
  -u sk_test_YOUR_SECRET_KEY: \
  -d payment_intent=pi_XXXXX
```

---

### 6.7 Disputes (chargebacks)

**Disputes** (chargebacks) são contestação do pagamento pelo portador do cartão. Quando uma disputa é aberta, o Stripe pode **debitAR** o saldo (valor e possíveis taxas) enquanto o caso é analisado.

Boas práticas de integração:

- Trate disputas como parte do “money movement”: afetam reconciliação e saldo.
- Implemente tratamento por webhook (ex.: `charge.dispute.created` e atualizações) e dedupe.
- Separe claramente “refund voluntário” (Refund) de “refund forçado” (Dispute/chargeback) no seu domínio.

---

### 6.8 Stripe Connect – tipos de charges (funds flow)

Em **Stripe Connect**, o tipo de charge define onde o dinheiro “entra”, quem paga fees, e quem é afetado por **refunds/disputes**:

- **Direct charges**: cobrança diretamente na conta conectada.
- **Destination charges**: cobrança criada pela plataforma, com destino (transferência) para conta conectada.
- **Separate charges and transfers**: cobrança e transferência separadas.

Pontos operacionais:

- A escolha impacta reconciliação (qual saldo recebe/deduz) e responsabilidades em refund/dispute.
- Se você precisa split/fee da plataforma, alinhe o modelo (destination vs separate) com o produto e requisitos regulatórios.

Subguia (decisão prática e “pegadinhas”):

- **Direct charges**: normalmente você cria o PaymentIntent/Charge **na conta conectada** (muitas vezes via `Stripe-Account: acct_...`).
  - Implicação: saldo/fees e alguns relatórios ficam “na conta” (não na plataforma).
- **Destination charges**: você cria o charge na plataforma, e informa destino/transferência para a conta conectada.
  - Implicação: você consegue cobrar `application_fee_amount` na plataforma e transferir o restante.
- **Separate charges and transfers**: você cobra na plataforma e cria `transfer` separado (pode ser útil para fluxos mais custom/repasses por lote).
  - Implicação: exige disciplina de reconciliação (ligar charge ↔ transfer) e cuidado com reversões.

Campos/flags que aparecem com frequência nesse domínio:

- `application_fee_amount`: fee da plataforma (quando aplicável).
- `transfer_data[destination]`: destino do repasse (destination charge).
- `transfer_group`: “chave” para agrupar repasses (muito útil para conciliação).
- `on_behalf_of`: usado em alguns setups para representar entidade/conta no fluxo.
- Refunds em Connect: flags como `reverse_transfer` e `refund_application_fee` (quando aplicável) mudam o efeito financeiro.

Exemplo (alto nível) – destination charge com fee da plataforma:

```bash
curl https://api.stripe.com/v1/payment_intents \
  -u sk_test_YOUR_SECRET_KEY: \
  -d amount=5000 \
  -d currency=brl \
  -d application_fee_amount=500 \
  -d "transfer_data[destination]"=acct_XXXXX \
  -d transfer_group=ORDER_123
```

---

### 6.9 Balance Transactions (reconciliação)

**Balance transactions** representam movimentos no saldo do Stripe (entradas/saídas), úteis para relatórios e conciliação.

Campos típicos:

- `amount`, `fee`, `net = amount - fee`
- `status` (por exemplo `pending` vs `available`)
- `type` e `reporting_category`

Endpoint principal:

```
GET /v1/balance_transactions
```

Dica:

- Para conciliar payouts, filtre balance transactions por `payout` quando aplicável.
- Para “explicar” um valor final (net), cruze `type`/`reporting_category` + `source` do movimento (charge/refund/transfer/fee, etc.).

---

### 6.10 Payouts (saques/repasse)

**Payouts** são os repasses do Stripe para sua conta bancária (automáticos ou manuais).

Status comuns:

- `pending`, `in_transit`, `paid`, `failed`, `canceled`

Endpoints principais:

```
POST /v1/payouts
GET  /v1/payouts/{id}
GET  /v1/payouts
POST /v1/payouts/{id}
POST /v1/payouts/{id}/cancel
POST /v1/payouts/{id}/reverse
```

Observação:

- Para relatórios/financeiro, combine Payouts + Balance Transactions para entender (1) o que entrou/saiu e (2) quando virou disponível/foi pago.

---

### 6.11 Billing & Subscriptions (avançado)

O Stripe Billing é o conjunto de recursos para **cobrança recorrente**, upgrades/downgrades, trials, faturamento por consumo e automações de cobrança.

Conceitos-chave:

- **Customer**: entidade pagadora.
- **Product/Price**: o que é vendido e como é cobrado (recorrência, currency, tiers, etc.).
- **Subscription**: contrato recorrente do customer.
- **Invoice**: fatura gerada para uma assinatura (a cobrança frequentemente acontece via invoice).

Boas práticas de integração:

- Use `payment_behavior='default_incomplete'` em criação de assinaturas quando você precisa confirmar o primeiro pagamento no frontend.
- Use `expand=['latest_invoice.payment_intent']` para obter `client_secret` no fluxo inicial.
- **Proration**: mudanças de plano/quantidade podem gerar proration e (dependendo do caso) uma nova invoice; trate isso explicitamente na UI.
- **Dunning / retries**: falhas de pagamento em recorrência são comuns; modele estados internos para `past_due`, `unpaid`, `canceled` e reações (notificações, suspensão de acesso, etc.).

Subguia (campos e decisões que você precisa fixar no seu domínio):

- **`collection_method`**: muda bastante o fluxo.
  - `charge_automatically`: Stripe tenta cobrar automaticamente.
  - `send_invoice`: você “envia” invoice e o cliente paga depois (fluxo mais próximo de cobrança manual/B2B).
- **`default_payment_method` / `invoice_settings[default_payment_method]`**: padronize onde você grava o método default do customer para evitar cobranças indo para PM “errado”.
- **`billing_cycle_anchor`**: âncora de ciclo (data do ciclo). Em migrações, este campo influencia proration e datas.
- **`proration_behavior`**: define como lidar com diferença de valores em upgrades/downgrades (ex.: criar proration invoice item, ou não prorar). Garanta que sua UI avise o usuário quando houver cobrança imediata.
- **Trials**: tenha regra clara de trial (ex.: `trial_end`) e eventos de término (`customer.subscription.trial_will_end`).
- **Cancelamento**:
  - imediato (cancel now) vs ao fim do período (`cancel_at_period_end`).
  - defina se o produto perde acesso imediatamente ou no fim do ciclo.

Consumo / metered (quando aplicável):

- Em modelos por consumo, você registra uso durante o período e o Stripe fatura no ciclo.
- Tenha cuidado com atrasos de clock e reprocessamentos: trate gravação de uso como operação idempotente do seu lado.

Endpoints típicos envolvidos:

```
POST /v1/customers
POST /v1/subscriptions
GET  /v1/subscriptions/{id}
POST /v1/subscriptions/{id}
GET  /v1/invoices
GET  /v1/invoices/{id}
POST /v1/invoiceitems
POST /v1/subscription_items/{id}/usage_records
GET  /v1/subscription_items/{id}/usage_record_summaries
POST /v1/subscription_schedules
GET  /v1/subscription_schedules/{id}
GET  /v1/subscription_schedules
```

Subscription Schedules (quando usar):

- Use schedules quando você precisa de mudanças **planejadas** em fases (ex.: plano A por 2 meses → plano B depois), ou migrações com regra clara de transição.
- Em muitos casos simples, atualizar a `subscription` diretamente é suficiente; schedules entram quando a complexidade de fases/anchors fica alta.

Assinaturas (boas práticas):

- **Fonte de verdade**: trate a combinação Subscription + Invoice + PaymentIntent (quando houver) como a linha do tempo da cobrança.
- **Mudança de preço/quantidade**: mudanças podem gerar invoice e proration; prefira prever o impacto com “upcoming invoice” antes de efetivar.
- **Cancelamento**: diferencie cancelamento imediato vs ao final do período (`cancel_at_period_end`) no seu domínio.

Webhooks comuns em Billing:

- `customer.subscription.created|updated|deleted`
- `invoice.created|finalized|payment_succeeded|payment_failed|voided`
- `payment_intent.succeeded|payment_failed` (especialmente para primeiro pagamento / retries)

Webhooks muito úteis para “retries/dunning” (especialmente quando há falha de cobrança):

- `invoice.payment_action_required` (quando aplicável)
- `payment_intent.requires_action` (quando o pagamento exige interação)

Subguia (dunning e recuperação de pagamento – ponta-a-ponta):

- **Objetivo**: quando um pagamento falha em recorrência, você precisa:
  1) saber que falhou (webhook),
  2) atualizar status interno (`past_due`/`unpaid`),
  3) tentar recuperar (cliente atualiza PM ou autentica),
  4) confirmar recuperação por webhook e reabilitar serviço.

Estados que você deve refletir no seu domínio:

- `active` (ok)
- `past_due` (falhou/atrasou, ainda em tentativa)
- `unpaid` (considerado não pago após tentativas / regras)
- `canceled` (encerrado)

Táticas de recuperação mais comuns:

- **Customer Portal** (Seção 6.12): forma rápida do cliente atualizar método de pagamento sem você criar UI.
- **Hosted invoice**: use `hosted_invoice_url` para o cliente concluir pagamento quando esse link estiver disponível no seu fluxo.
- **Reengajar quando `requires_action` aparece**:
  - Em cobranças off-session, pode ocorrer de o PaymentIntent/invoice exigir autenticação.
  - Regra prática: marque o ciclo como “ação do cliente requerida” e direcione o usuário para autenticar/atualizar método.

O que persistir para suporte/auditoria:

- `subscription.id`, `customer.id`
- `latest_invoice.id` e links (`hosted_invoice_url`, `invoice_pdf` quando houver)
- `latest_invoice.payment_intent.id` (quando existir)
- timestamp e motivo/erro (`payment_intent.last_payment_error` e/ou `Invoice.last_finalization_error` quando aplicável)

Sequência típica de eventos (falha → recuperação):

- falha: `invoice.payment_failed` → `customer.subscription.updated` (muitas vezes para `past_due`)
- ação requerida (quando aplicável): `invoice.payment_action_required` e/ou `payment_intent.requires_action`
- recuperação: cliente autentica/atualiza método → `invoice.payment_succeeded` → `customer.subscription.updated` (volta a `active`)

Cupons, Promotion Codes e Discounts (precificação comercial):

- **Coupons** e **Promotion Codes** permitem aplicar descontos padronizados.
- “Discount” pode aparecer anexado a `customer`, `subscription` e/ou `invoice` (dependendo do fluxo e do que você aplicou).

APIs comuns:

```
POST /v1/coupons
GET  /v1/coupons/{id}
GET  /v1/coupons
POST /v1/promotion_codes
GET  /v1/promotion_codes/{id}
GET  /v1/promotion_codes
```

Boas práticas:

- Padronize no seu domínio “onde” o desconto é aplicado (no customer vs na subscription) para reduzir surpresa em renovações.
- Em auditoria/suporte, persista o identificador do coupon/promotion_code aplicado e os períodos de vigência.

Nota prática (primeiro pagamento de assinatura):

- Se você cria assinatura com `payment_behavior=default_incomplete`, o status inicial pode depender do PaymentIntent da `latest_invoice`. Em geral, você confirma no frontend via `client_secret`, e a fonte de verdade final é `invoice.payment_succeeded` / `customer.subscription.updated`.

Faturamento por consumo (usage-based / metered):

- Em fluxos por consumo, em vez de “um preço fixo mensal”, você registra **uso** durante o período de cobrança.
- O pagamento costuma ser consolidado em invoice no final do ciclo (ou conforme regras do produto).

---

### 6.12 Customer Portal (self-serve)

O **Customer Portal** permite que o cliente administre aspectos comuns sem você criar UI completa:

- Atualizar método de pagamento
- Baixar invoices
- Cancelar/pausar assinatura
- Trocar plano (dependendo da configuração)

Integração típica:

- Configure o Portal no Dashboard (features habilitadas, branding, regras de cancelamento/troca).
- Crie uma sessão de portal no backend e redirecione o usuário.

Endpoint principal:

```
POST /v1/billing_portal/sessions
```

Exemplo:

```bash
curl https://api.stripe.com/v1/billing_portal/sessions \
  -u sk_test_YOUR_SECRET_KEY: \
  -d customer=cus_XXXXX \
  -d return_url="https://example.com/billing"
```

---

### 6.13 Stripe Tax (visão prática)

O Stripe Tax ajuda a **calcular e cobrar impostos** (IVA/VAT/GST/sales tax) com base em localização, regras e cadastro.

Pontos práticos:

- Para fluxos prontos, prefira `automatic_tax[enabled]=true` em **Checkout**, **Subscriptions** e/ou **Invoices** quando aplicável.
- Garanta que você coleta (ou já possui) dados mínimos de localização do cliente (endereço/país/estado), pois isso afeta a incidência.
- Em ambientes com Connect/marketplace, alinhe **quem é o merchant of record** e como o imposto deve ser calculado (plataforma vs conta conectada).

Cobertura do produto (alto nível):

- **Monitor**: identificar quando você pode precisar registrar (limiares variam por jurisdição).
- **Register**: gerenciar registrations conforme exigências.
- **Calculate**: calcular imposto em transações.
- **File**: relatórios/declarações (quando disponível no seu plano/país).

Quando usar `automatic_tax`:

- Em fluxos prontos (Checkout/Invoices/Subscriptions), prefira ativar `automatic_tax` e garantir coleta de endereço.
- Em fluxos custom, avalie usar as APIs de cálculo de Tax para estimar/registrar corretamente.

Observação:

- O Stripe pode exigir configurações de “origin address” e cadastros/registrations dependendo do país/uso.

Subguia (como escolher o modelo de Tax na prática):

- **Checkout/Subscriptions/Invoices (recomendado quando possível)**: use `automatic_tax[enabled]=true` e garanta que o endereço do cliente seja coletado/atualizado.
- **Fluxos custom / estimativa antes de criar cobrança**: use as APIs de Tax para **calcular** (e então refletir na UI) antes de criar a cobrança final.

APIs comuns do produto Tax (podem variar conforme disponibilidade/região):

```
POST /v1/tax/calculations
GET  /v1/tax/calculations/{id}
GET  /v1/tax/registrations
POST /v1/tax/registrations
```

Boas práticas:

- Armazene a “evidência” mínima que você usa para cálculo (ex.: país/estado/cidade/ZIP e tipo do produto), para auditoria e suporte.
- Em Connect/marketplaces, confirme em qual conta a operação ocorre (`Stripe-Account`) para não calcular/registrar imposto no lugar errado.

---

### 6.14 Stripe Connect (Accounts, onboarding, capabilities)

Além do “funds flow” (Seção 6.8), o Stripe Connect envolve:

- **Accounts** (contas conectadas)
- **Onboarding** (coleta de dados KYC/KYB)
- **Capabilities** (quais produtos podem ser usados pela conta)
- **Payouts/balances** por conta

Integração técnica essencial:

- Para operar “em nome” de uma conta conectada, use o header `Stripe-Account: acct_...`.
- Para criar um fluxo de onboarding hosted, use “Account Links” ou “Account Sessions” (conforme o modelo recomendado no momento) e redirecione o usuário.

Tipos de conta (alto nível):

- **Standard**: conta do Stripe do usuário (mais autonomia no dashboard).
- **Express**: onboarding/UX simplificados pelo Stripe.
- **Custom**: maior controle, maior responsabilidade (KYC/UX/risco/regulatório).

Endpoints comuns de Connect:

```
POST /v1/accounts
GET  /v1/accounts/{id}
POST /v1/accounts/{id}
POST /v1/account_links
POST /v1/account_sessions
POST /v1/accounts/{id}/persons
GET  /v1/accounts/{id}/persons
POST /v1/accounts/{id}/external_accounts
GET  /v1/accounts/{id}/external_accounts
POST /v1/accounts/{id}/login_links
```

OAuth (especialmente para contas Standard, quando aplicável):

- Alguns fluxos usam o Connect OAuth para conectar a conta do usuário.
- Endpoints de OAuth não seguem o prefixo `/v1` (são endpoints do Connect), e o fluxo envolve redirecionamento do usuário e troca de `code` por token.

Webhooks comuns (Connect):

- `account.updated`
- `capability.updated`
- `person.updated` (quando aplicável)

Webhooks comuns relacionados a saldo/payout por conta (dependendo do setup):

- `payout.created|paid|failed`
- `balance.available`

Header típico:

```bash
curl https://api.stripe.com/v1/balance \
  -u sk_test_YOUR_SECRET_KEY: \
  -H "Stripe-Account: acct_XXXXX"
```

Boas práticas:

- Tenha um estado interno de onboarding (incompleto / pendente / verificado / rejeitado) e reaja a atualizações via webhook.
- Trate capabilities como “feature flags” por conta.

Subguia (state machine prática de onboarding):

- Fonte de verdade costuma ser `account.requirements` e `capabilities`.
- Campos comuns para dirigir UI/fluxo:
  - `requirements.currently_due` / `requirements.eventually_due`
  - `requirements.disabled_reason`
  - `charges_enabled` / `payouts_enabled`
- Regra prática: se `charges_enabled=false` ou há itens em `currently_due`, considere a conta “bloqueada para produção” e force onboarding.

Observabilidade:

- Logue e correlacione por `account.id` (acct_...) + `Stripe-Request-Id` para entender por que uma conta foi “travada” (mudanças em requirements são frequentes).

---

### 6.15 Radar (fraude)

O Stripe Radar fornece detecção de fraude e ferramentas de revisão.

Integração (alto nível):

- Modele o ciclo de “review” quando aplicável (pagamentos podem ir para revisão manual dependendo das regras).
- Use webhooks de review (quando usados no seu setup) e mantenha observabilidade para reduzir falsos positivos/negativos.

Endpoints e objetos comuns:

- Reviews (quando habilitado)
- Regras/listas (tipicamente configuradas no Dashboard; trate como configuração, não como código)

Nota prática:

- Algumas verificações podem ser específicas por método de pagamento; trate isso como parte da estratégia de risco.

---

### 6.16 Identity (verificação)

O Stripe Identity permite criar fluxos de **verificação de identidade** (documentos, selfie, etc.).

Integração típica:

- Crie uma `verification_session` no backend.
- O frontend redireciona/embeda o fluxo conforme recomendado.
- Consuma o resultado por webhook (status/outcome) e atualize seu domínio.

Endpoint principal:

```
POST /v1/identity/verification_sessions
```

Endpoints complementares:

```
GET /v1/identity/verification_sessions/{id}
```

Boas práticas:

- Trate o resultado por webhook como fonte de verdade e persista um “status de verificação” no seu domínio.
- Não bloqueie fluxos críticos aguardando sincronicamente a verificação; ela pode ser assíncrona.

Webhooks comuns:

- `identity.verification_session.created|processing|verified|requires_input|canceled`

---

### 6.17 Terminal (pagamentos presenciais)

O Stripe Terminal cobre pagamentos presenciais (POS) com leitores e/ou Tap to Pay.

Integração (alto nível):

- Use PaymentIntents com suporte a “card present” e finalize via SDK do Terminal.
- Modele fluxo de readers + connection tokens no backend.
- Se você usa Connect, determine se o pagamento acontece na plataforma ou na conta conectada.

Conceitos e endpoints comuns (alto nível):

```
POST /v1/terminal/connection_tokens
GET  /v1/terminal/readers
POST /v1/terminal/readers
POST /v1/terminal/readers/{id}
```

Boas práticas:

- Trate reader/offline/network como parte do seu plano de resiliência (retries, re-pairing, etc.).
- Use webhooks para refletir o estado final do pagamento (em vez de depender só do POS).

Subguia (onde normalmente dá erro):

- **PaymentIntent + Terminal SDK**: o Terminal SDK normalmente gerencia a coleta “card present” no reader; o backend cria/atualiza o PaymentIntent, mas a confirmação pode ocorrer via reader.
- **Métodos de pagamento**: quando usando card present, seu PaymentIntent precisa suportar o tipo correspondente (conforme configuração do Terminal e do país). Evite misturar “online card” e “card present” no mesmo fluxo sem uma regra clara.
- **Fonte de verdade**: finalize o fluxo pelo backend via webhooks (`payment_intent.succeeded`, `charge.succeeded`, etc.) e dedupe por `event.id`.

---

### 6.18 Issuing (cartões)

O Stripe Issuing permite emitir cartões (virtuais/físicos) e lidar com:

- **Cardholders**
- **Cards**
- **Authorizations** e **Transactions**
- **Disputes** específicos de issuing

Integração (alto nível):

- Use webhooks para autorizações/transactions e reflita limites/regras do seu produto.
- Em testes, valide cenários de autorização aprovada/negada e reversões.

Subguia (webhooks que costumam ser essenciais):

- Autorizações:
  - `issuing_authorization.request` (quando aplicável)
  - `issuing_authorization.created|updated`
- Transações:
  - `issuing_transaction.created|updated`

Boas práticas:

- Trate qualquer “request” como **at-least-once**: dedupe por `event.id` e/ou por id do objeto (authorization/transaction) no seu domínio.
- Modele seu domínio com estados (aprovada, negada, revertida, parcialmente capturada), pois o ciclo pode ter updates.

Endpoints comuns (alto nível):

```
POST /v1/issuing/cardholders
POST /v1/issuing/cards
GET  /v1/issuing/authorizations
GET  /v1/issuing/transactions
```

---

### 6.19 Financial Connections

O Stripe Financial Connections fornece acesso a dados de contas bancárias com **consentimento** do usuário (ex.: saldos, ownership, transações), útil para:

- verificação de conta
- pagamentos ACH (quando aplicável)
- melhorar onboarding/risco

Integração típica:

- Crie uma session, colete consentimento e use as permissões necessárias para o caso de uso.

Subguia (permissões e manutenção do vínculo):

- Escolha permissões mínimas para o caso de uso (ex.: `balances`, `ownership`, `transactions`, `payment_method`).
- Tenha um fluxo de “refresh” (reautorização) quando o usuário revogar consentimento ou quando o vínculo expirar.
- Trate dados bancários como sensíveis: restrinja logs e minimize persistência (guarde apenas IDs e dados necessários).

Endpoints comuns (alto nível):

```
POST /v1/financial_connections/sessions
GET  /v1/financial_connections/accounts
```

---

### 6.20 Reports e reconciliação (alto nível)

Para financeiro/contabilidade, os pontos mais comuns:

- **Payout reconciliation**: entender por que um payout tem determinado valor, quais charges/refunds/fees compõem o net.
- Use **Balance Transactions** + **Payouts** (Seções 6.9 e 6.10) como base de conciliação.
- Dependendo do plano, **Stripe Sigma** pode ser usado para queries e relatórios.

APIs comuns (Reporting):

```
GET  /v1/reporting/report_types
POST /v1/reporting/report_runs
GET  /v1/reporting/report_runs/{id}
GET  /v1/reporting/report_runs
```

Subguia (como usar report runs sem travar seu backend):

- `report_runs` são **assíncronos**: você cria, depois poll/lista até ficar `succeeded` e então baixa o arquivo via URL retornada.
- Para conciliação, combine:
  - `reporting` (arquivos de extrato/relatório)
  - `balance_transactions` (razão/ledger)
  - `payouts` (o que foi pago)

Boas práticas:

- Não gere relatórios em tempo real no request do usuário; faça via job/queue e entregue por link.
- Guarde a versão e filtros usados para gerar o report (para auditoria e repetibilidade).

---

### 6.21 Financial Accounts for platforms (Treasury)

O Stripe descreve o produto como **Financial Accounts for platforms** (historicamente “Treasury” em alguns materiais). A proposta é permitir que plataformas ofereçam funcionalidades de conta (ex.: movimentação/ledger, recebimentos/saídas) com recursos financeiros integrados.

Pontos importantes:

- Em geral é um produto **habilitado sob demanda** e pode exigir aprovação/ativação.
- Trate como domínio “core financeiro”: eventos e estados são tipicamente assíncronos → webhooks + reconciliação.
- Em plataformas com Connect, alinhe claramente qual entidade (plataforma vs conta conectada) “possui” a conta/fluxo e como isso aparece na contabilidade.

APIs comuns (prefixo `treasury`):

```
GET  /v1/treasury/financial_accounts
GET  /v1/treasury/transactions
```

Observação:

- Endpoints e permissões podem variar conforme o setup do produto. Confirme na documentação vigente do Stripe antes de implementar o fluxo completo.

---

### 6.22 Payment Links

**Payment Links** permitem criar links de pagamento hospedados pelo Stripe, úteis quando você quer um fluxo pronto, com menos front-end.

Boas práticas:

- Use `metadata`/referências internas para correlacionar no seu domínio.
- Para confirmar o resultado, prefira webhooks (por exemplo via evento de Checkout Session associado) em vez de confiar só no redirect.

Subguia (o que Payment Links realmente cria por baixo):

- Payment Links normalmente se materializam como uma experiência de **Checkout**. Na prática, eventos de `checkout.session.*` costumam ser o “sinal” mais confiável.
- Para conciliação, recupere os objetos relacionados quando receber webhooks (ex.: recuperar a Checkout Session, PaymentIntent e/ou Invoice dependendo do modo).

Webhooks comuns no fluxo:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded|async_payment_failed` (pagamentos assíncronos)

APIs comuns:

```
POST /v1/payment_links
GET  /v1/payment_links/{id}
GET  /v1/payment_links
```

---

### 6.23 Quotes (Invoicing)

**Quotes** (cotações) são úteis quando você precisa enviar uma proposta formal com itens/valores e depois converter em cobrança.

Fluxo típico (alto nível):

- Criar Quote (itens, cliente, termos)
- Finalizar/aceitar
- Gerar Invoice/Payment conforme o modelo de cobrança

Subguia (status e operacional):

- Quotes costumam ter etapas como: rascunho/edição → `finalized` → aceito/recusado/expirado (a nomenclatura exata depende do objeto/versão).
- Em geral, o “efeito financeiro” acontece quando o Quote vira Invoice/cobrança. Por isso, trate **Invoice** como a fonte de verdade do resultado (Seção 6.3).
- Se você envia um PDF/link, trate isso como “documento” e não como prova de pagamento.

APIs comuns:

```
POST /v1/quotes
GET  /v1/quotes/{id}
GET  /v1/quotes
POST /v1/quotes/{id}/finalize
POST /v1/quotes/{id}/accept
```

Observação:

- Quotes costumam andar junto com o ecossistema de Invoices/Subscriptions. Trate Invoice como fonte de verdade do estado final de cobrança (Seção 6.3).

---

## 7. Casos de Uso Comuns

### Pagamento Único (One-time Payment)

```javascript
// 1. Criar Payment Intent no backend
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000,
  currency: 'brl',
  metadata: {order_id: '12345'}
});

// 2. Enviar client_secret para frontend
res.json({clientSecret: paymentIntent.client_secret});

// 3. Frontend confirma com Stripe.js
const {error, paymentIntent} = await stripe.confirmCardPayment(
  clientSecret,
  {payment_method: {card: cardElement}}
);
```

### Assinatura Recorrente

```javascript
// 1. Criar cliente
const customer = await stripe.customers.create({
  email: 'cliente@exemplo.com'
});

// 2. Criar assinatura
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{price: 'price_monthly_premium'}],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});

// 3. Confirmar primeiro pagamento no frontend
const {error} = await stripe.confirmCardPayment(
  subscription.latest_invoice.payment_intent.client_secret,
  {payment_method: cardElement}
);
```

### Salvar Cartão para Uso Futuro

```javascript
// 1. Criar Setup Intent
const setupIntent = await stripe.setupIntents.create({
  customer: customer.id,
  payment_method_types: ['card']
});

// 2. Frontend confirma
const {error, setupIntent} = await stripe.confirmCardSetup(
  clientSecret,
  {payment_method: {card: cardElement}}
);

// 3. Payment Method agora está salvo no customer
```

---

## 8. Boas Práticas

### Segurança

✅ **NUNCA exponha chaves secretas** no frontend  
✅ Use **Restricted Keys** para limitar permissões  
✅ **Valide webhooks** usando assinatura do Stripe  
✅ Use **HTTPS** obrigatoriamente  
✅ Implemente **rate limiting** nas rotas de pagamento

### Performance

✅ Use **expand** para reduzir número de requests  
✅ Cache dados de **Products** e **Prices** (mudam raramente)  
✅ Processe **webhooks de forma assíncrona** (retorne 200 rapidamente)

### Confiabilidade

✅ Use **Idempotency Keys** em operações críticas  
✅ Implemente **retry logic** com backoff exponencial  
✅ Monitore **webhooks** (Stripe Dashboard mostra falhas)  
✅ Teste com **cartões de teste** antes de produção

---

## 9. Cartões de Teste

### Sucesso

```
Número: 4242 4242 4242 4242
Qualquer CVC válido, data futura
```

### Requer Autenticação 3DS

```
Número: 4000 0027 6000 3184
```

### Declinado

```
Número: 4000 0000 0000 0002
```

### Saldo Insuficiente

```
Número: 4000 0000 0000 9995
```

[Lista completa de cartões de teste](https://stripe.com/docs/testing)

---

## 10. Conclusão

A API do Stripe é extremamente robusta e bem documentada, oferecendo ferramentas completas para qualquer tipo de fluxo financeiro:

- ✅ **Pagamentos únicos** via Payment Intents
- ✅ **Assinaturas recorrentes** via Subscriptions
- ✅ **Marketplaces** via Stripe Connect
- ✅ **Webhooks** para notificações em tempo real
- ✅ **Suporte a múltiplas moedas** e métodos de pagamento

### Links Úteis

- **Documentação Oficial:** https://docs.stripe.com
- **Dashboard:** https://dashboard.stripe.com
- **Status da API:** https://status.stripe.com
- **Exemplos de Código:** https://github.com/stripe-samples

---

## 11. Integração com RENDIZY

### Casos de Uso Planejados

1. **Pagamentos de Reservas:**
   - Usar Payment Intents para pagamentos únicos
   - Suportar split payments (proprietário + taxa Rendizy)

2. **Planos de Assinatura:**
   - Implementar via Subscriptions
   - Tiers: Free, Basic, Premium, Enterprise

3. **Webhook Handlers:**
   - `payment_intent.succeeded` → Confirmar reserva
   - `invoice.payment_failed` → Suspender assinatura
   - `customer.subscription.deleted` → Downgrade para Free

### Estrutura de Tabelas (Sugestão)

```sql
-- Tabela para sincronizar com Stripe
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  stripe_customer_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT REFERENCES stripe_customers(stripe_customer_id),
  status TEXT, -- active, past_due, canceled, etc
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stripe_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  reservation_id UUID REFERENCES reservations(id),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 12. Sandboxes (Ambientes de Teste)

### O que são Sandboxes?

Um **sandbox** é um ambiente de teste isolado onde você pode experimentar funcionalidades do Stripe sem afetar sua integração em produção. Pagamentos criados em sandboxes **não são processados** pelas redes de cartões ou provedores de pagamento.

### Casos de Uso

| Cenário | Descrição |
|---|---|
| **Simular eventos sem dinheiro real** | Teste pagamentos sem movimentação de dinheiro real. Crie pagamentos para acumular saldo fictício ou use ferramentas de teste para simular eventos externos. |
| **Ambientes isolados por equipe** | Cada equipe pode ter seu próprio sandbox, garantindo isolamento total de dados e ações. |
| **Convidar usuários externos** | Convide parceiros de implementação ou agências sem conceder acesso aos dados de produção. |
| **Testar via Painel ou CLI** | Acesse sandboxes pelo Dashboard do Stripe ou pela CLI (Command Line Interface). |

---

### 12.1 Gerenciar Sandboxes no Dashboard

#### Criar um Sandbox

**Requisitos:** Função de Administrador do Sandbox, Administrador, Desenvolvedor ou Usuário do Sandbox.  
**Limite:** Máximo de **5 sandboxes** por conta.

**Passos:**

1. No Dashboard, clique em **seletor de contas** > **Alternar para ambiente de teste** > **Criar ambiente de teste**
2. Insira um nome exclusivo (ex: "Sandbox Dev - João")
3. Escolha a configuração inicial:
   - **Copiar sua conta:** Cria sandbox com mesmas configurações e funcionalidades da conta existente
   - **Criar do zero:** Cria sandbox vazio (útil para testar país diferente)
4. Clique em **Criar sandbox**

**Nota:** O criador recebe automaticamente a função de **Super Administrador** no sandbox criado.

#### Visualizar Sandboxes

- **Administrador de Sandbox:** Visualiza todos os sandboxes
- **Desenvolvedor:** Visualiza apenas os que criou

**Acesso:**
1. Clique em **seletor de contas** > **Alternar para ambiente de teste** > **Gerenciar ambientes de teste**
2. Clique em **Abrir** para entrar no sandbox

**Indicação:** Banner na parte superior do Dashboard indica que você está em um sandbox.

#### Atualizar Sandbox

- **Administrador de Sandbox:** Pode atualizar qualquer sandbox
- **Desenvolvedor:** Pode atualizar apenas os que criou

**Passos:**
1. Selecione o sandbox
2. Clique em **Configurações** (canto superior direito)
3. Atualize nome ou detalhes (ex: marca)

#### Excluir Sandbox

⚠️ **ATENÇÃO:** Ação irreversível. Remove todos os dados e revoga acesso de todos os membros.

**Requisitos:** Administrador, Administrador de Sandbox ou proprietário do sandbox.

**Passos:**
1. Clique em **seletor de contas** > **Alternar para ambiente de teste** > **Gerenciar ambientes de teste**
2. Clique no ícone da **lixeira** associado ao sandbox
3. Confirme a exclusão

---

### 12.2 Gerenciar Acesso e Chaves de API

#### Funções de Acesso a Sandboxes

| Função | Permissões |
|---|---|
| **Super Administrador** | Todas as operações no sandbox específico |
| **Administrador de Sandbox** | Criar, gerenciar e visualizar todos os sandboxes da conta/organização (sem permissões em produção) |
| **Usuário de Sandbox** | Criar e acessar apenas sandboxes que criou (sem acesso a produção) |
| **Desenvolvedor** | Criar sandboxes e acessar os que criou (possui outras permissões em produção) |
| **Administrador** | Acesso total a produção e todos os sandboxes |

#### Conceder Acesso a Todos os Sandboxes

**Para conta:**
1. Acesse conta de produção no Dashboard
2. Clique em **Configurações** > **Equipe e segurança** > **+ Adicionar membro**
3. Insira email(s) e selecione função **Administrador do Sandbox**
4. Clique em **Enviar convites**

**Para organização:**
- Atribua função **Administrador de Sandbox** na organização de produção
- Usuário obtém acesso a todos os sandboxes da organização e suas contas

#### Conceder Acesso a Sandbox Específico

1. Navegue até o sandbox específico no Dashboard
2. Clique em **Configurações** > **Equipe e segurança** > **+ Adicionar membro**
3. Insira email(s) e selecione uma função
4. Clique em **Enviar convites**

**Nota:** O Stripe atribui automaticamente a função **Usuário Sandbox** na conta de produção.

#### Revogar Acesso

1. Navegue até a conta/organização/sandbox onde o usuário possui atribuição
2. Clique em **Configurações** > **Equipe e segurança**
3. Clique no menu de opções (**...**) > **Remover membro**

#### Chaves de API do Sandbox

Cada sandbox possui suas próprias **chaves de API** para autenticação.

**Gerenciar chaves:**
- Acesse o **Painel do Desenvolvedor** dentro do sandbox
- Revele, revogue ou crie novas chaves de API

**Erro comum:**
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid API Key provided"
  }
}
```
✅ Certifique-se de usar a chave correta para o sandbox específico.

---

### 12.3 CLI do Stripe

A **CLI do Stripe** permite criar, testar e gerenciar integrações via linha de comando.

#### Instalar CLI

**Homebrew (macOS):**
```bash
brew install stripe/stripe-cli/stripe
```

**Scoop (Windows):**
```bash
scoop install stripe
```

**Docker:**
```bash
docker run --rm -it stripe/stripe-cli:latest
```

**Linux (manual):**
```bash
# Baixar tar.gz do GitHub
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
./stripe
```

#### Fazer Login na CLI

```bash
stripe login
```

**Output:**
```
Your pairing code is: enjoy-enough-outwit-win
Press Enter to open the browser (^C to quit)
```

**Modo interativo (sem navegador):**
```bash
stripe login --interactive
```

**Com chave direta:**
```bash
stripe login --api-key sk_test_YOUR_SECRET_KEY
```

#### Login em Sandbox via CLI

```bash
stripe login
# Pressione Enter → Abre navegador → Selecione o sandbox
```

---

### 12.4 Testar com CLI do Stripe

#### Streaming de Logs de Requisições

```bash
stripe logs tail
```

Mantém janela aberta mostrando logs em tempo real de requisições à API.

#### Encaminhar Eventos para Webhook Local

```bash
stripe listen --forward-to localhost:4242/webhooks
```

**Output:**
```
Ready! Your webhook signing secret is 'whsec_...' (^C to quit)
```

**Encaminhar eventos específicos:**
```bash
stripe listen --events payment_intent.created,customer.created,charge.succeeded \
  --forward-to localhost:4242/webhook
```

**Carregar endpoint registrado:**
```bash
stripe listen --load-from-webhooks-api --forward-to localhost:4242
```

#### Criar Recursos via CLI

**Criar produto:**
```bash
stripe products create \
  --name="My First Product" \
  --description="Created with Stripe CLI"
```

**Criar preço:**
```bash
stripe prices create \
  --unit-amount=3000 \
  --currency=brl \
  --product="prod_XXXXX"
```

#### Especificar Versão da API

```bash
# Usar versão específica
stripe products create --name="My Product" --stripe-version 2025-12-15.clover

# Usar versão mais recente
stripe products create --name="My Product" --latest
```

---

### 12.5 Trigger de Eventos Webhook

#### Listar Eventos Disponíveis

```bash
stripe trigger --help
```

#### Acionar Evento Específico

```bash
stripe trigger payment_intent.succeeded
```

**Exemplo - Checkout completo:**
```bash
stripe trigger checkout.session.completed
```

**Output:**
```
Setting up fixture for: checkout_session
Running fixture for: payment_page
Trigger succeeded!
```

#### Personalizar Eventos com Override

**Alterar parâmetros de topo:**
```bash
stripe trigger customer.created --override customer:name=Bob
```

**Parâmetros aninhados:**
```bash
stripe trigger customer.created --override customer:"address[country]"=BR
```

**Arrays:**
```bash
# Adicionar elemento ao final
stripe trigger customer.created --override customer:"preferred_locales[]"=pt-BR

# Substituir elemento específico
stripe trigger customer.created --override customer:"preferred_locales[0]"=pt-BR
```

**Múltiplas substituições:**
```bash
stripe trigger price.created \
  --override product:name="Plano Premium" \
  --override price:unit_amount=2990
```

---

### 12.6 Testar Apple Pay e Google Pay

#### Verificar Renderização

Use a **demonstração oficial** do Stripe para comparar visualmente como carteiras digitais aparecem:
- **Payment Element**
- **Express Checkout Element**
- **Checkout Sessions**
- **Payment Request Button** (legacy)

#### Requisitos para Visualizar Carteiras

✅ **Dispositivo:**
- Apple Pay: iPhone/iPad/Mac compatível com Touch ID/Face ID
- Google Pay: Dispositivo Android 4.4+ ou Chrome 61+

✅ **Carteira:**
- Pelo menos um cartão ativo salvo na carteira

✅ **Navegador:**
- Safari (Apple Pay)
- Chrome (Google Pay)
- Versão suportada e atualizada

✅ **Configurações:**
- Chrome: **Configurações** > **Métodos de pagamento** > Permitir que sites verifiquem métodos salvos
- Safari: **Ajustes** > **Avançado** > Permitir que sites verifiquem Apple Pay

❌ **Não funciona:**
- Janela anônima (Chrome)
- Janela privada (Safari)
- IP da Índia (bloqueado pelo Stripe)

#### Registrar Domínios

⚠️ **OBRIGATÓRIO:** Registre cada domínio e subdomínio separadamente para **cada ambiente** (produção + cada sandbox).

**No Dashboard:**
1. Acesse **Configurações** > **Pagamentos** > **Domínios de método de pagamento**
2. Adicione todos os domínios onde você usará carteiras digitais

**Para iframes (Apple Pay):**
- Defina atributo `allow="payment"` no iframe
- Registre o domínio do iframe E o domínio de nível superior
- Safari 17+: Suporta domínios diferentes para iframe e página pai

#### Habilitar Carteiras na Integração

**Via Dashboard:**
1. **Configurações** > **Métodos de Pagamento**
2. Ative **Apple Pay** e **Google Pay**

**Via código (Payment Intent):**
```javascript
// Incluir 'card' para ativar carteiras digitais automaticamente
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000,
  currency: 'brl',
  payment_method_types: ['card']
});
```

---

### 12.7 Sandboxes Organizacionais

Se você usa **Stripe Organizations**, pode criar sandboxes no nível organizacional para testar recursos como:
- Compartilhamento de clientes entre contas
- Compartilhamento de métodos de pagamento
- Estrutura multi-conta

#### Criar Sandbox Organizacional

1. No dashboard da **organização de produção**, clique em **Criar ambiente de teste**
2. Selecione tipo **Organização** > **Continuar**
3. Insira nome (ex: "Staging")
4. Escolha configuração:
   - **Copiar estrutura organizacional:** Replica toda a organização + sandboxes para cada conta
   - **Em branco:** Cria container vazio
5. Configurar sandboxes de contas:
   - **Copiar estrutura:** Escolha quais contas incluir
   - **Em branco:** Adicione sandboxes vazios manualmente
6. Clique em **Criar Sandbox**

#### Estrutura Hierárquica

```
Organização Produção
├── Conta A (produção)
│   ├── Sandbox Dev A1
│   └── Sandbox Test A2
├── Conta B (produção)
│   └── Sandbox Dev B1
└── Sandboxes Organizacionais
    └── Sandbox Staging Org
        ├── Sandbox Conta A
        └── Sandbox Conta B
```

---

### 12.8 Configurações Copiadas no Sandbox

Ao criar sandbox com opção **"Copiar sua conta"**, o Stripe copia:

#### ✅ Copiado Automaticamente

**Funcionalidades da conta:**
- Payouts habilitados
- Link payments
- Affirm payments
- US Bank ACH payments
- Afterpay/Clearpay
- P24 payments
- Transfers (Connect)

**Configurações de pagamento:**
- Moedas habilitadas
- Saldos mínimos para payouts
- Cronograma de pagamentos
- Horário de início do dia personalizado
- Configurações de payouts instantâneos

**Capital, Financial Connections, Issuing:**
- Todas as configurações (se habilitado em produção)

#### ❌ NÃO Copiado (Precisa Reconfigurar)

**Domínios:**
- Domínios customizados
- Domínios de método de pagamento
- Domínios de email (Connect)
- URIs de redirecionamento OAuth (Connect)

**Webhooks:**
- Endpoints de webhook
- Webhooks de autorização (Issuing)

**Dados de teste:**
- Automações de faturamento
- Designs de personalização (Issuing)
- Configurações de Conversion Testing

**Segurança:**
- Endereço de origem (Tax)

---

### 12.9 Limitações dos Sandboxes

❌ **Não é possível testar:**
- Precificação IC+ (Interchange Plus)
- Conexões entre sandbox de plataforma Connect e sandboxes de contas conectadas
- Carteiras digitais reais (Apple Pay/Google Pay) em Issuing

❌ **Sandboxes reivindicáveis (Claimable Sandboxes):**
- Recurso em **preview privado**
- Permite criar sandboxes anônimos via API
- Usuários podem "reivindicar" via URL especial

---

### 12.10 Autocompletar na CLI (Bash/Zsh)

#### Configurar Zsh

```bash
stripe completion
mkdir -p ~/.stripe
mv stripe-completion.zsh ~/.stripe
```

Adicionar ao `~/.zshrc`:
```bash
# Stripe CLI completion
fpath=(~/.stripe $fpath)
autoload -Uz compinit && compinit -i
```

#### Configurar Bash

```bash
stripe completion
mkdir -p ~/.stripe
mv stripe-completion.bash ~/.stripe
```

Adicionar ao `~/.bashrc`:
```bash
# Stripe CLI completion
source ~/.stripe/stripe-completion.bash
```

---

### 12.11 Chaves e Permissões da CLI

#### Chaves Restritas

Ao executar `stripe login`, a CLI gera automaticamente **chaves restritas** (válidas por 90 dias):
- Uma para **modo teste**
- Uma para **modo produção**

**Diferença de chave secreta:**
- Chave secreta: Sem restrições (poder total)
- Chave restrita: Apenas permissões específicas

#### Localização das Chaves

**No Dashboard:**
- **Configurações** > **Desenvolvedores** > **Chaves de API** > Seção **Chaves Restritas**

**No sistema local:**
```
~/.config/stripe/config.toml
```

#### Ver Permissões

1. Abra **Chaves de API** no Dashboard
2. Role até **Chaves Restritas**
3. Passe o mouse sobre ícone ⓘ ao lado do nome da chave CLI

#### Usar Chave Específica

```bash
# Usar chave diretamente no comando
stripe customers list --api-key sk_test_YOUR_KEY
```

---

### 12.12 Exemplos de Projetos no GitHub

O Stripe mantém repositório oficial com **12+ projetos de exemplo**:

**URL:** https://github.com/stripe-samples

#### Projetos Destacados

| Projeto | Descrição | Linguagens |
|---|---|---|
| **accept-a-payment** | Payment Element com vários métodos | Node, Python, Ruby, PHP, Java, Go, .NET, React, HTML |
| **checkout-one-time-payments** | Checkout para pagamentos únicos | Node, Python, Ruby, PHP, Java, Go, .NET, HTML, React |
| **subscription-use-cases** | Assinaturas com preços fixos | Node, Python, Ruby, PHP, Java, Go, .NET, React, JS |
| **metered-billing-subscriptions** | Faturamento por consumo | Node, Python, Ruby, PHP, Java, Go, .NET, React |
| **identity-verification** | Verificação de identidade com Stripe Identity | Node, Python, Ruby, PHP, Java, Go, .NET, HTML |
| **connect-onboarding-for-standard** | Onboarding Connect completo | Node, React |

#### Abrir Projetos

**Via VS Code:**
```bash
stripe samples list
stripe samples create accept-a-payment
code accept-a-payment
```

**Via GitHub:**
```bash
git clone https://github.com/stripe-samples/accept-a-payment
cd accept-a-payment/server/node
npm install
npm start
```

---

### 12.13 SSO (Single Sign-On) com Sandboxes

Para empresas que usam **SAML SSO**, é possível gerenciar acesso a sandboxes via declarações de atributos SAML.

#### Requisitos para Acesso via SSO

Usuário precisa ter:
1. Função no ambiente **pai** (organização ou conta de produção)
2. Função que concede acesso a sandboxes (no sandbox específico ou na conta real)

#### Funções com Acesso Automático

- **Administrador / Super Administrador:** Cria, gerencia e visualiza todos os sandboxes
- **Desenvolvedor:** Cria sandboxes e acessa os que criou
- **Administrador de Sandbox:** Cria, gerencia e visualiza todos os sandboxes (sem permissões em produção)
- **Usuário de Sandbox:** Cria sandboxes e acessa os que criou (sem permissões em produção)

#### Exemplo - Acesso a Sandbox Específico

```xml
<Attribute Name="Stripe-Role-acct_SANDBOX_ID">
    <AttributeValue>analyst</AttributeValue>
</Attribute>
```

#### Exemplo - Permitir Criação de Sandboxes

```xml
<Attribute Name="Stripe-Role-acct_LIVEMODE_ACCOUNT_ID">
    <AttributeValue>sandbox_user</AttributeValue>
</Attribute>
```

#### Exemplo - Acesso a Todos os Sandboxes

```xml
<Attribute Name="Stripe-Role-acct_LIVEMODE_ACCOUNT_ID">
    <AttributeValue>sandbox_admin</AttributeValue>
</Attribute>
```

#### Exemplo - Múltiplas Funções

```xml
<Attribute Name="Stripe-Role-acct_LIVEMODE_ACCOUNT_ID">
    <AttributeValue>analyst</AttributeValue>
    <AttributeValue>sandbox_admin</AttributeValue>
</Attribute>
```

---

### 12.14 Boas Práticas para Sandboxes

#### Organização

✅ **Use nomes descritivos:**
```
✓ "Dev - Maria - Feature XYZ"
✓ "Staging - Produção Mirror"
✓ "QA - Testes Automatizados"
✗ "Sandbox 1"
✗ "Teste"
```

✅ **Crie sandbox por desenvolvedor:**
- Evita conflitos entre testes simultâneos
- Facilita debugging (cada dev tem logs isolados)

✅ **Mantenha sandbox de staging atualizado:**
- Replique configurações de produção periodicamente
- Use para validar mudanças antes do deploy

#### Segurança

✅ **Nunca use chaves de produção em sandboxes**

✅ **Revogue acesso de usuários externos ao concluir projeto:**
```bash
# Via Dashboard: Configurações > Equipe > Remover membro
```

✅ **Rotacione chaves de API regularmente:**
- Chaves da CLI expiram em 90 dias (renovação automática)
- Chaves manuais: Revogue e crie novas a cada 6 meses

#### Testes

✅ **Use CLI para automatizar testes:**
```bash
# Criar script de teste
stripe trigger payment_intent.succeeded --override amount=10000
stripe trigger customer.subscription.created --override customer:email=test@example.com
```

✅ **Simule cenários de erro:**
```bash
# Cartão declinado
stripe trigger payment_intent.payment_failed

# Assinatura cancelada
stripe trigger customer.subscription.deleted
```

✅ **Teste webhooks localmente:**
```bash
# Terminal 1: Servidor local
npm start

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/webhook
```

#### Limpeza

✅ **Exclua sandboxes não utilizados:**
- Limite de 5 sandboxes por conta
- Libere espaço para novos testes

✅ **Documente propósito de cada sandbox:**
```
Nome: "Staging - Q1 2026"
Descrição: "Ambiente de staging para release Q1.
           Configurações espelham produção.
           Atualizado em 07/01/2026."
```

---

### 12.15 Ferramentas de desenvolvedor (Workbench, API logs)

Para depurar integrações e diferenças de comportamento, estas ferramentas do Stripe costumam ser as mais úteis:

- **Workbench**: ajuda a inspecionar a versão padrão da API da conta, testar chamadas e entender impactos de versionamento.
- **API logs / Developers Dashboard**: ajuda a localizar requests pelo `Stripe-Request-Id`, inspecionar parâmetros enviados, respostas e erros.

Boas práticas:

- Sempre correlacione erros do seu backend com `Stripe-Request-Id` (Seção 5) para encontrar rapidamente a chamada no Dashboard.
- Ao investigar divergências de payload, confirme o `Stripe-Version` usado na requisição e a versão/configuração do endpoint de webhook.

---

**Última atualização:** 07 Janeiro 2026
