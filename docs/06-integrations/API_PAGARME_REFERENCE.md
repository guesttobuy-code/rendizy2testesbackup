# Pagar.me API - Referência Completa

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Endpoints Base](#endpoints-base)
4. [Métodos de Pagamento](#métodos-de-pagamento)
5. [Pedidos (Orders)](#pedidos-orders)
6. [Webhooks](#webhooks)
7. [Split de Pagamento](#split-de-pagamento)
8. [Assinaturas](#assinaturas)
9. [Erros e Status](#erros-e-status)
10. [Exemplos Práticos](#exemplos-práticos)

---

## Visão Geral

A API Pagar.me é desenvolvida seguindo os padrões **REST** com mensagens em **JSON**.

### Características principais:
- ✅ **API RESTful** com verbos HTTP padrão
- ✅ **JSON** para requests e responses
- ✅ **Códigos de status HTTP** para interpretação de respostas
- ✅ **Sandbox completo** para testes sem cobranças reais
- ✅ **SDKs** disponíveis para múltiplas linguagens
- ✅ **Antifraude incluído** gratuitamente em transações com cartão

### Versão da API
- **Versão atual:** v5
- **Base URL:** `https://api.pagar.me/core/v5`

---

## Autenticação

### Obtendo suas chaves

1. Acesse: [https://id.pagar.me/](https://id.pagar.me/)
2. Faça login
3. Navegue até **Desenvolvimento → Chaves**

### Tipos de Chaves

#### Ambiente de Sandbox (Teste)
- **Secret Key:** `sk_test_*` (uso no backend)
- **Public Key:** `pk_test_*` (uso no frontend/checkout)

#### Ambiente de Produção
- **Secret Key:** `sk_*` (uso no backend)
- **Public Key:** `pk_*` (uso no frontend/checkout)

### Autenticação HTTP Basic Auth

A autenticação usa **HTTP Basic Authentication** no cabeçalho `Authorization`:

```javascript
// Node.js - Exemplo de autenticação
const request = require("request");
const secretKey = "sk_test_*"; // ou sk_* para produção

const options = {
  method: 'POST',
  uri: 'https://api.pagar.me/core/v5/orders',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
    'Content-Type': 'application/json'
  },
  json: requestBody
};

request(options, function(error, response, body) {
  console.log(response.body);
});
```

**Importante:**
- User: `SecretKey`
- Password: (vazio)
- A chave **NUNCA** deve ser compartilhada ou exposta no frontend
- Use **Public Key** apenas para integrações de checkout

---

## Endpoints Base

### Ambiente único para teste e produção

```
https://api.pagar.me/core/v5
```

**Nota:** O mesmo endpoint é usado para teste e produção. O que define o ambiente é o **tipo da chave** (test vs produção).

### Principais recursos disponíveis:

| Recurso | Endpoint |
|---------|----------|
| Pedidos | `/orders` |
| Cobranças | `/charges` |
| Clientes | `/customers` |
| Cartões | `/cards` |
| Assinaturas | `/subscriptions` |
| Planos | `/plans` |
| Webhooks | `/hooks` |
| Recebedores | `/recipients` |
| Split | `/splits` |

---

## Métodos de Pagamento

### Meios de pagamento suportados

| Método | Código | Descrição |
|--------|--------|-----------|
| **PIX** | `pix` | Pagamento instantâneo brasileiro |
| **Cartão de Crédito** | `credit_card` | Visa, Mastercard, Elo, Amex, etc. |
| **Cartão de Débito** | `debit_card` | Débito online |
| **Boleto** | `boleto` | Boleto bancário |
| **Voucher** | `voucher` | Vale-alimentação, refeição |
| **Cash** | `cash` | Dinheiro |
| **SafetyPay** | `safety_pay` | Gateway para transferências |
| **Google Pay** | `google_pay` | Google Pay™ |
| **Checkout** | `checkout` | Checkout Pagar.me |

### Objeto Payment

```json
{
  "payment_method": "pix|credit_card|boleto|...",
  "amount": 2990,
  "pix": { /* dados PIX */ },
  "credit_card": { /* dados cartão */ },
  "boleto": { /* dados boleto */ },
  "metadata": {
    "reservation_id": "123456"
  }
}
```

---

## PIX

### Características do PIX

- ✅ **Confirmação:** Até 5 minutos
- ✅ **Taxa:** 0,99% (mais competitiva do mercado)
- ✅ **QR Code:** Gerado automaticamente
- ✅ **Expiração:** Configurável (até 10 anos, recomendado: 30 min a 24h)
- ✅ **Split:** Suporta divisão de pagamento
- ✅ **Estorno:** Suportado via cancelamento de cobrança

### Campos obrigatórios para PIX

```json
{
  "payment_method": "pix",
  "pix": {
    "expires_in": 1800,  // 30 minutos em segundos (OBRIGATÓRIO)
    "expires_at": "2026-01-08T12:00:00",  // Alternativa ao expires_in
    "additional_information": [
      {
        "name": "Reserva",
        "value": "Quarto Duplo - 3 noites"
      }
    ]
  }
}
```

### Dados obrigatórios do cliente (customer)

Para criar pagamento PIX, é **obrigatório** enviar:

```json
{
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "document": "12345678901",  // CPF/CNPJ
    "type": "individual",       // ou "company"
    "phones": {
      "home_phone": {
        "country_code": "55",
        "area_code": "11",
        "number": "987654321"
      }
    }
  }
}
```

### Status das transações PIX

| Status | Descrição |
|--------|-----------|
| `waiting_payment` | Aguardando pagamento |
| `paid` | Pago |
| `pending_refund` | Aguardando estorno |
| `refunded` | Estornado |
| `with_error` | Com erro |
| `failed` | Falha |

### Exemplo completo de pedido PIX

```json
{
  "items": [
    {
      "amount": 29900,
      "description": "Reserva - Chalé Vista Mar",
      "quantity": 1,
      "code": "RES-2026-001"
    }
  ],
  "customer": {
    "name": "Maria Santos",
    "email": "maria@example.com",
    "type": "individual",
    "document": "12345678901",
    "phones": {
      "home_phone": {
        "country_code": "55",
        "number": "987654321",
        "area_code": "11"
      }
    }
  },
  "payments": [
    {
      "payment_method": "pix",
      "pix": {
        "expires_in": 3600,
        "additional_information": [
          {
            "name": "Check-in",
            "value": "2026-02-15"
          },
          {
            "name": "Check-out",
            "value": "2026-02-18"
          }
        ]
      }
    }
  ]
}
```

### Response PIX

```json
{
  "id": "or_abc123xyz",
  "status": "pending",
  "charges": [
    {
      "id": "ch_abc123xyz",
      "status": "pending",
      "last_transaction": {
        "transaction_type": "pix",
        "qr_code": "00020126580014br.gov.bcb.pix...",
        "qr_code_url": "https://api.pagar.me/core/v5/transactions/tran_abc/qrcode"
      }
    }
  ]
}
```

---

## Cartão de Crédito

### Campos obrigatórios

```json
{
  "payment_method": "credit_card",
  "credit_card": {
    "card": {
      "number": "4111111111111111",
      "holder_name": "MARIA SANTOS",
      "exp_month": 12,
      "exp_year": 2028,
      "cvv": "123"
    },
    "installments": 3,
    "statement_descriptor": "RENDIZY",
    "card_id": "card_abc123",  // Ou usar cartão salvo
    "card_token": "tok_abc123"  // Ou usar token
  }
}
```

### Tokenização de cartão

Use o **Tokenizecard JS** para tokenizar dados do cartão no frontend:

```html
<script src="https://assets.pagar.me/checkout/1.1.0/pagarme.min.js"></script>

<script>
  const pagarme = require('pagarme');
  
  pagarme.client.connect({ encryption_key: 'ek_test_*' })
    .then(client => client.security.encrypt({
      card_number: '4111111111111111',
      card_holder_name: 'MARIA SANTOS',
      card_expiration_date: '1228',
      card_cvv: '123'
    }))
    .then(card_hash => {
      // Enviar card_hash para o backend
      console.log('Card hash:', card_hash);
    });
</script>
```

### Parcelamento

```json
{
  "credit_card": {
    "installments": 3,  // Número de parcelas (1-12)
    "operation_type": "auth_and_capture",  // ou "auth_only"
    "recurrence": false
  }
}
```

---

## Boleto

### Campos do boleto

```json
{
  "payment_method": "boleto",
  "boleto": {
    "bank": "033",  // Código do banco (033 = Santander, 237 = Bradesco)
    "instructions": "Pagar até o vencimento",
    "due_at": "2026-01-15T23:59:59",
    "document_number": "123456",
    "type": "DM",  // Tipo do boleto
    "interest": {
      "days": 1,
      "type": "percentage",
      "amount": 100  // 1% ao mês (em centavos)
    },
    "fine": {
      "days": 2,
      "type": "percentage",
      "amount": 200  // 2% de multa
    }
  }
}
```

### Taxas do boleto

- **Taxa fixa:** R$ 2,99 por boleto

---

## Pedidos (Orders)

### Estrutura do objeto Order

```json
{
  "id": "or_abc123xyz",
  "code": "PEDIDO-2026-001",  // Código interno da loja
  "amount": 29900,  // Valor total em centavos
  "currency": "BRL",
  "closed": true,  // true = fechado, false = aberto
  "status": "pending|paid|canceled|failed",
  "customer": { /* objeto customer */ },
  "items": [ /* array de items */ ],
  "payments": [ /* array de payments */ ],
  "shipping": { /* dados de entrega */ },
  "metadata": {
    "reservation_id": "123456",
    "property_id": "prop_789"
  },
  "created_at": "2026-01-07T10:00:00Z",
  "updated_at": "2026-01-07T10:05:00Z"
}
```

### Pedidos Abertos vs Fechados

#### Pedido Fechado (`closed: true`)
- **Default**
- Não pode ser alterado após criação
- Status muda para `paid` automaticamente quando todas as cobranças são pagas

#### Pedido Aberto (`closed: false`)
- Pode ser alterado após criação
- Status **NÃO** muda para `paid` automaticamente
- Precisa ser fechado manualmente via endpoint `/orders/{id}/close`

### Endpoints principais de Orders

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/orders` | Criar pedido |
| GET | `/orders/{id}` | Obter pedido |
| GET | `/orders` | Listar pedidos |
| PATCH | `/orders/{id}/close` | Fechar pedido aberto |
| POST | `/orders/{id}/charges` | Incluir cobrança no pedido |

### Criar pedido completo

```bash
POST https://api.pagar.me/core/v5/orders
Authorization: Basic {base64(sk_test_*:)}
Content-Type: application/json
```

```json
{
  "code": "RES-2026-789",
  "items": [
    {
      "amount": 50000,
      "description": "Hospedagem - Chalé Premium",
      "quantity": 3,
      "code": "CHALE-001"
    }
  ],
  "customer": {
    "name": "João Silva",
    "email": "joao@example.com",
    "type": "individual",
    "document": "12345678901",
    "phones": {
      "mobile_phone": {
        "country_code": "55",
        "area_code": "11",
        "number": "987654321"
      }
    },
    "address": {
      "line_1": "Rua Exemplo, 123",
      "line_2": "Apto 45",
      "zip_code": "01310100",
      "city": "São Paulo",
      "state": "SP",
      "country": "BR"
    }
  },
  "payments": [
    {
      "payment_method": "pix",
      "pix": {
        "expires_in": 3600
      }
    }
  ],
  "metadata": {
    "reservation_id": "123456",
    "property_id": "prop_789",
    "check_in": "2026-02-15",
    "check_out": "2026-02-18"
  }
}
```

---

## Webhooks

### Configuração de Webhooks

1. Acesse o **Dashboard Pagar.me**
2. Vá em **Configurações → Webhooks**
3. Clique em **Adicionar Webhook**
4. Configure a URL: `https://seu-dominio.com/api/webhooks/pagarme`
5. Selecione os eventos desejados

### Estrutura do Webhook

```json
{
  "id": "hook_abc123xyz",
  "url": "https://seu-dominio.com/api/webhooks/pagarme",
  "event": "order.paid",
  "status": "sent|pending|failed",
  "attempts": 3,
  "last_attempt": "2026-01-07T10:00:00Z",
  "response_status": "200",
  "response_raw": "OK",
  "account": {
    "id": "acc_123",
    "name": "RENDIZY"
  },
  "data": {
    /* Dados do evento */
  }
}
```

### Eventos de Webhook

#### Pedidos (Orders)
- `order.created` - Pedido criado
- `order.paid` - Pedido pago
- `order.canceled` - Pedido cancelado
- `order.payment_failed` - Falha no pagamento
- `order.updated` - Pedido atualizado

#### Cobranças (Charges)
- `charge.created` - Cobrança criada
- `charge.pending` - Cobrança pendente
- `charge.paid` - Cobrança paga
- `charge.refunded` - Cobrança estornada
- `charge.failed` - Cobrança falhou
- `charge.processing` - Cobrança em processamento
- `charge.underpaid` - Cobrança paga com valor menor
- `charge.overpaid` - Cobrança paga com valor maior

#### Assinaturas (Subscriptions)
- `subscription.created` - Assinatura criada
- `subscription.updated` - Assinatura atualizada
- `subscription.canceled` - Assinatura cancelada
- `subscription.payment_success` - Pagamento da assinatura bem-sucedido
- `subscription.payment_failed` - Pagamento da assinatura falhou

#### Faturas (Invoices)
- `invoice.created` - Fatura criada
- `invoice.paid` - Fatura paga
- `invoice.payment_failed` - Pagamento da fatura falhou
- `invoice.refunded` - Fatura estornada

### Validando Webhooks

**Importante:** Sempre valide a origem do webhook para garantir segurança.

```javascript
// Node.js - Exemplo de validação
app.post('/api/webhooks/pagarme', (req, res) => {
  const webhookData = req.body;
  
  // 1. Verificar IP do Pagar.me (opcional, mas recomendado)
  const allowedIPs = ['54.94.252.0', '54.207.71.0'];
  const clientIP = req.ip;
  
  // 2. Processar o evento
  const event = webhookData.event;
  const data = webhookData.data;
  
  switch(event) {
    case 'order.paid':
      // Atualizar reserva como paga
      updateReservation(data.id, 'paid');
      break;
      
    case 'charge.refunded':
      // Processar estorno
      processRefund(data.id);
      break;
      
    default:
      console.log('Evento não tratado:', event);
  }
  
  // 3. Responder com status 200
  res.status(200).send('OK');
});
```

### Retry Policy

O Pagar.me tenta reenviar webhooks em caso de falha:
- **Tentativas:** Até 10 tentativas
- **Intervalo:** Exponencial (1min, 5min, 15min, 30min, 1h, 2h, 4h, 8h, 16h, 24h)
- **Status esperado:** 200-299 (qualquer status 2xx é considerado sucesso)

---

## Split de Pagamento

### Visão geral do Split

O **Split** permite dividir automaticamente o valor de uma transação entre múltiplos recebedores (marketplace).

**Casos de uso:**
- ✅ Marketplace de hospedagem (proprietário + plataforma)
- ✅ Comissões de vendas
- ✅ Taxas de serviço
- ✅ Múltiplos prestadores de serviço

### Tipos de Split

#### 1. Split Fixo (flat)
Valor fixo em centavos para cada recebedor

```json
{
  "split": [
    {
      "recipient_id": "rp_abc123",  // ID do recebedor
      "amount": 2000,               // R$ 20,00
      "type": "flat",
      "options": {
        "liable": true,             // Responsável por chargebacks
        "charge_processing_fee": true  // Paga taxa de processamento
      }
    }
  ]
}
```

#### 2. Split Percentual (percentage)
Porcentagem do valor total

```json
{
  "split": [
    {
      "recipient_id": "rp_xyz789",
      "percentage": 1500,  // 15% (em base points: 15.00%)
      "type": "percentage",
      "options": {
        "liable": false,
        "charge_processing_fee": false
      }
    }
  ]
}
```

### Exemplo completo de pedido com Split

```json
{
  "items": [
    {
      "amount": 100000,
      "description": "Hospedagem - Chalé Premium",
      "quantity": 1
    }
  ],
  "customer": { /* dados do cliente */ },
  "payments": [
    {
      "payment_method": "pix",
      "pix": {
        "expires_in": 3600
      },
      "split": [
        {
          "recipient_id": "rp_proprietario_123",
          "amount": 85000,  // R$ 850,00 para o proprietário
          "type": "flat",
          "options": {
            "liable": true,
            "charge_processing_fee": true
          }
        },
        {
          "recipient_id": "rp_plataforma_456",
          "amount": 15000,  // R$ 150,00 para a plataforma (15%)
          "type": "flat",
          "options": {
            "liable": false,
            "charge_processing_fee": false
          }
        }
      ]
    }
  ]
}
```

### Recebedores (Recipients)

Antes de usar Split, é necessário **criar recebedores**:

```bash
POST https://api.pagar.me/core/v5/recipients
```

```json
{
  "name": "João Proprietário",
  "email": "joao@example.com",
  "description": "Proprietário do Chalé Vista Mar",
  "document": "12345678901",
  "type": "individual",
  "default_bank_account": {
    "holder_name": "João Silva",
    "holder_type": "individual",
    "holder_document": "12345678901",
    "bank": "237",  // Código do banco
    "branch_number": "1234",
    "branch_check_digit": "5",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "checking",  // ou "savings"
    "metadata": {
      "property_id": "prop_123"
    }
  },
  "transfer_settings": {
    "transfer_enabled": true,
    "transfer_interval": "daily",  // daily, weekly, monthly
    "transfer_day": 0  // 0 = todos os dias (se daily)
  }
}
```

---

## Assinaturas (Subscriptions)

### Criar Plano

```bash
POST https://api.pagar.me/core/v5/plans
```

```json
{
  "name": "Plano Premium RENDIZY",
  "amount": 9900,  // R$ 99,00/mês
  "currency": "BRL",
  "interval": "month",  // month, week, year
  "interval_count": 1,
  "billing_type": "prepaid",  // prepaid ou postpaid
  "payment_methods": ["credit_card", "boleto", "pix"],
  "installments": [1, 2, 3],  // Parcelas aceitas
  "trial_period_days": 7,  // 7 dias de trial
  "metadata": {
    "plan_type": "premium"
  }
}
```

### Criar Assinatura

```bash
POST https://api.pagar.me/core/v5/subscriptions
```

```json
{
  "plan_id": "plan_abc123",
  "customer": { /* dados do cliente */ },
  "payment_method": "credit_card",
  "card_id": "card_xyz789",  // Cartão salvo do cliente
  "metadata": {
    "organization_id": "org_123"
  }
}
```

### Cancelar Assinatura

```bash
DELETE https://api.pagar.me/core/v5/subscriptions/{id}
```

---

## Erros e Status

### Códigos HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Bad Request (erro no payload) |
| 401 | Não autorizado (chave inválida) |
| 404 | Recurso não encontrado |
| 422 | Validação falhou |
| 500 | Erro interno do servidor |

### Estrutura de erro

```json
{
  "errors": [
    {
      "type": "invalid_parameter",
      "parameter_name": "customer.document",
      "message": "O documento é obrigatório para pagamentos PIX"
    }
  ],
  "url": "https://docs.pagar.me/reference/erros-1"
}
```

### Status de transações

| Status | Descrição |
|--------|-----------|
| `pending` | Aguardando pagamento |
| `authorized` | Autorizado (cartão) |
| `paid` | Pago |
| `refunded` | Estornado |
| `waiting_payment` | Aguardando pagamento |
| `pending_refund` | Aguardando estorno |
| `refused` | Recusado |
| `chargedback` | Chargeback |
| `analyzing` | Em análise (antifraude) |
| `pending_review` | Aguardando revisão manual |
| `canceled` | Cancelado |
| `processing` | Processando |
| `with_error` | Com erro |
| `failed` | Falhou |

---

## Paginação

### Parâmetros de paginação

```bash
GET https://api.pagar.me/core/v5/orders?page=1&size=25
```

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | integer | Número da página (inicia em 1) |
| `size` | integer | Itens por página (max: 100) |

### Response com paginação

```json
{
  "data": [ /* array de objetos */ ],
  "paging": {
    "total": 150,
    "page": 1,
    "size": 25,
    "pages": 6
  }
}
```

---

## Metadata

Você pode adicionar **metadados personalizados** em qualquer recurso:

```json
{
  "metadata": {
    "reservation_id": "RES-2026-789",
    "property_id": "prop_abc123",
    "property_name": "Chalé Vista Mar",
    "check_in": "2026-02-15",
    "check_out": "2026-02-18",
    "guests": 4,
    "special_requests": "Late checkout",
    "internal_notes": "Cliente VIP"
  }
}
```

**Vantagens:**
- ✅ Armazenar dados adicionais sem criar tabelas extras
- ✅ Buscar transações por metadata
- ✅ Associar transações com recursos do seu sistema

---

## Exemplos Práticos

### 1. Pagamento de Reserva com PIX

```javascript
const axios = require('axios');

async function createReservationPayment(reservation) {
  const secretKey = process.env.PAGARME_SECRET_KEY;
  const auth = Buffer.from(`${secretKey}:`).toString('base64');
  
  const payload = {
    code: reservation.code,
    items: [
      {
        amount: reservation.total_amount * 100, // Converter para centavos
        description: `Reserva - ${reservation.property_name}`,
        quantity: reservation.nights,
        code: reservation.id
      }
    ],
    customer: {
      name: reservation.guest_name,
      email: reservation.guest_email,
      type: 'individual',
      document: reservation.guest_document,
      phones: {
        mobile_phone: {
          country_code: '55',
          area_code: reservation.guest_phone.substring(0, 2),
          number: reservation.guest_phone.substring(2)
        }
      }
    },
    payments: [
      {
        payment_method: 'pix',
        pix: {
          expires_in: 3600, // 1 hora
          additional_information: [
            {
              name: 'Check-in',
              value: reservation.check_in
            },
            {
              name: 'Check-out',
              value: reservation.check_out
            },
            {
              name: 'Hóspedes',
              value: reservation.guests.toString()
            }
          ]
        }
      }
    ],
    metadata: {
      reservation_id: reservation.id,
      property_id: reservation.property_id,
      organization_id: reservation.organization_id
    }
  };
  
  try {
    const response = await axios.post(
      'https://api.pagar.me/core/v5/orders',
      payload,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      order_id: response.data.id,
      qr_code: response.data.charges[0].last_transaction.qr_code,
      qr_code_url: response.data.charges[0].last_transaction.qr_code_url,
      status: response.data.status
    };
  } catch (error) {
    console.error('Erro ao criar pagamento:', error.response?.data || error.message);
    throw error;
  }
}
```

### 2. Pagamento com Split (Marketplace)

```javascript
async function createMarketplacePayment(reservation, ownerRecipientId, platformRecipientId) {
  const totalAmount = reservation.total_amount * 100;
  const platformFee = Math.round(totalAmount * 0.15); // 15% para plataforma
  const ownerAmount = totalAmount - platformFee;
  
  const payload = {
    items: [
      {
        amount: totalAmount,
        description: `Reserva - ${reservation.property_name}`,
        quantity: 1
      }
    ],
    customer: { /* dados do cliente */ },
    payments: [
      {
        payment_method: 'credit_card',
        credit_card: {
          card_id: reservation.saved_card_id,
          installments: 1,
          statement_descriptor: 'RENDIZY'
        },
        split: [
          {
            recipient_id: ownerRecipientId,
            amount: ownerAmount,
            type: 'flat',
            options: {
              liable: true,
              charge_processing_fee: true,
              charge_remainder_fee: true
            }
          },
          {
            recipient_id: platformRecipientId,
            amount: platformFee,
            type: 'flat',
            options: {
              liable: false,
              charge_processing_fee: false
            }
          }
        ]
      }
    ]
  };
  
  // Enviar para API...
}
```

### 3. Webhook Handler completo

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/webhooks/pagarme', async (req, res) => {
  const { event, data } = req.body;
  
  try {
    switch(event) {
      case 'order.paid':
        await handleOrderPaid(data);
        break;
        
      case 'charge.refunded':
        await handleChargeRefunded(data);
        break;
        
      case 'subscription.payment_failed':
        await handleSubscriptionFailed(data);
        break;
        
      default:
        console.log('Evento não tratado:', event);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro processando webhook:', error);
    res.status(500).send('Error');
  }
});

async function handleOrderPaid(orderData) {
  const reservationId = orderData.metadata.reservation_id;
  
  // Atualizar reserva no banco
  await db.reservations.update({
    where: { id: reservationId },
    data: {
      payment_status: 'paid',
      pagarme_order_id: orderData.id,
      paid_at: new Date()
    }
  });
  
  // Enviar email de confirmação
  await sendConfirmationEmail(reservationId);
  
  console.log(`Reserva ${reservationId} marcada como paga`);
}

async function handleChargeRefunded(chargeData) {
  const orderId = chargeData.order_id;
  
  // Buscar reserva pelo order_id
  const reservation = await db.reservations.findFirst({
    where: { pagarme_order_id: orderId }
  });
  
  if (reservation) {
    await db.reservations.update({
      where: { id: reservation.id },
      data: {
        payment_status: 'refunded',
        refunded_at: new Date(),
        refund_amount: chargeData.amount
      }
    });
    
    console.log(`Reserva ${reservation.id} estornada`);
  }
}
```

### 4. Assinatura de Plano RENDIZY

```javascript
async function createPlatformSubscription(organization, plan) {
  const payload = {
    plan_id: plan.pagarme_plan_id,
    customer: {
      name: organization.owner_name,
      email: organization.owner_email,
      type: 'company',
      document: organization.cnpj
    },
    payment_method: 'credit_card',
    card: {
      number: organization.card_number,
      holder_name: organization.card_holder,
      exp_month: organization.card_exp_month,
      exp_year: organization.card_exp_year,
      cvv: organization.card_cvv
    },
    metadata: {
      organization_id: organization.id,
      plan_name: plan.name
    }
  };
  
  const response = await axios.post(
    'https://api.pagar.me/core/v5/subscriptions',
    payload,
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
}
```

---

## Taxas Pagar.me

### Transações

| Método | Taxa |
|--------|------|
| **PIX** | 0,99% |
| **Cartão de Crédito** | 3,79% + R$ 0,39 |
| **Cartão de Débito** | 2,79% |
| **Boleto** | R$ 2,99 fixo |

### Recursos inclusos

- ✅ **Antifraude gratuito** em transações de cartão
- ✅ **Webhooks ilimitados**
- ✅ **API sem limite de chamadas**
- ✅ **Dashboard completo**
- ✅ **Suporte técnico**

---

## Recursos Avançados

### 1. Tokenizecard JS

Tokenize dados do cartão no frontend:

```html
<script src="https://assets.pagar.me/checkout/1.1.0/pagarme.min.js"></script>
```

### 2. Checkout Pagar.me

Use o checkout hospedado do Pagar.me:

```json
{
  "payment_method": "checkout",
  "checkout": {
    "expires_in": 3600,
    "default_payment_method": "credit_card",
    "accepted_payment_methods": ["credit_card", "pix", "boleto"],
    "accepted_multi_payment_methods": [
      ["credit_card"],
      ["pix", "credit_card"]
    ],
    "success_url": "https://seu-site.com/sucesso",
    "skip_checkout_success_page": false,
    "accepted_brands": ["visa", "mastercard", "elo", "amex"]
  }
}
```

### 3. Link de Pagamento

Permite criar um **checkout hospedado** via URL, sem precisar implementar formulário de pagamento no seu frontend.

#### 3.1 Tipos
- `order`: compra única
- `subscription`: recorrência (precisa estar vinculado a um plano)

#### 3.2 Principais campos
- `is_building`: `false` para ativar imediatamente (se `true`, fica como rascunho)
- `name`: nome interno do link
- `payment_settings.accepted_payment_methods`: métodos aceitos (`credit_card`, `pix`, `boleto`)
- `payment_settings.credit_card_settings`:
  - `operation_type`: ex: `auth_and_capture`
  - `installments`: opções de parcelamento
- `cart_settings.items`: itens (para `type=order`)
- `cart_settings.recurrence`: recorrência (para `type=subscription`)

#### 3.3 Endpoints

```bash
POST   https://api.pagar.me/core/v5/payment-links
GET    https://api.pagar.me/core/v5/payment-links
GET    https://api.pagar.me/core/v5/payment-links/{link_id}
PATCH  https://api.pagar.me/core/v5/payment-links/{link_id}/activate
PATCH  https://api.pagar.me/core/v5/payment-links/{link_id}/cancel
```

#### 3.4 Exemplo (order)

```bash
curl -X POST https://api.pagar.me/core/v5/payment-links \
  -u "sk_test_...:" \
  -H "Content-Type: application/json" \
  -d '{
    "is_building": false,
    "type": "order",
    "name": "Reserva RENDIZY - Exemplo",
    "payment_settings": {
      "accepted_payment_methods": ["credit_card", "pix"],
      "credit_card_settings": {
        "operation_type": "auth_and_capture",
        "installments": [
          {"number": 1, "total": 15000},
          {"number": 2, "total": 15000},
          {"number": 3, "total": 15300}
        ]
      }
    },
    "cart_settings": {
      "items": [
        {
          "amount": 15000,
          "name": "Reserva 3 noites",
          "default_quantity": 1
        }
      ]
    }
  }'
```

#### 3.5 Observação (subscription)

Para links de assinatura, a recorrência precisa ser vinculada a um **plano** (plan_id) conforme o modelo do Checkout Link.

### 4. Antifraude

Configure análise antifraude:

```json
{
  "antifraud": {
    "type": "clearsale",
    "clearsale": {
      "custom_sla": 120
    }
  }
}
```

### 5. Endereços (Addresses)

Os endereços ficam sob o recurso de clientes.

#### 5.1 Requisito importante (line_1)

O campo `line_1` deve seguir o formato **"Número, Rua, Bairro"** (nesta ordem e separado por vírgulas).

Exemplos:
- `"375, Av. General Justo, Centro"`
- `"Av. General Justo, Centro"` (sem número)

`line_2` é o complemento (andar, apto, sala), ex: `"7º andar, sala 01"`.

#### 5.2 Campos (resumo)

- `zip_code`: CEP apenas números
- `city`
- `state`: UF (ISO 3166-2, ex: `SP`, `RJ`)
- `country`: `BR` (ISO 3166-1 alpha-2)

#### 5.3 Campos deprecated

Evite usar: `street`, `number`, `complement`, `neighborhood` (serão descontinuados).

#### 5.4 Endpoints

```bash
POST   https://api.pagar.me/core/v5/customers/{customer_id}/addresses
GET    https://api.pagar.me/core/v5/customers/{customer_id}/addresses
GET    https://api.pagar.me/core/v5/customers/{customer_id}/addresses/{address_id}
PUT    https://api.pagar.me/core/v5/customers/{customer_id}/addresses/{address_id}
DELETE https://api.pagar.me/core/v5/customers/{customer_id}/addresses/{address_id}
```

#### 5.5 Antifraude

Para análise antifraude, é necessário ter **ao menos um endereço** (em customer/billing), conforme as exigências do provedor.

### 6. BIN Lookup

Consulta informações do cartão a partir do BIN (primeiros 6 dígitos) para melhorar UX (bandeira, máscara, CVV).

#### 6.1 Endpoint

```bash
GET https://api.pagar.me/core/v5/bins/{bin}
```

#### 6.2 Exemplo

```bash
curl -X GET https://api.pagar.me/core/v5/bins/411111 \
  -u "pk_test_...:"
```

Resposta costuma incluir campos como: `brand`, `gaps`, `lengths`, `mask`, `cvv`, `brandImage`, `possibleBrands`.

---

## SDKs Oficiais

### Node.js
```bash
npm install pagarme
```

### PHP
```bash
composer require pagarme/pagarme-php
```

### Python
```bash
pip install pagarme-python
```

### Ruby
```bash
gem install pagarme
```

---

## Suporte e Recursos

- 📚 **Documentação:** [https://docs.pagar.me](https://docs.pagar.me)
- 💬 **Suporte:** [https://pagarme.helpjuice.com](https://pagarme.helpjuice.com)
- 🔑 **Dashboard:** [https://dashboard.pagar.me](https://dashboard.pagar.me)
- 🧪 **Sandbox:** Use chaves `sk_test_*` e `pk_test_*`

---

## Checklist de Integração

### Pré-requisitos
- [ ] Criar conta no Pagar.me
- [ ] Obter chaves de sandbox (`sk_test_*`, `pk_test_*`)
- [ ] Configurar ambiente de desenvolvimento
- [ ] Instalar SDK ou configurar HTTP client

### Desenvolvimento
- [ ] Implementar autenticação Basic Auth
- [ ] Criar endpoint para criar pedidos
- [ ] Implementar pagamento PIX
- [ ] Implementar pagamento com cartão
- [ ] Implementar pagamento com boleto
- [ ] Criar webhook handler
- [ ] Testar todos os fluxos em sandbox

### Split/Marketplace (opcional)
- [ ] Criar recebedores (recipients)
- [ ] Configurar contas bancárias
- [ ] Implementar split em pagamentos
- [ ] Testar transferências

### Assinaturas (opcional)
- [ ] Criar planos
- [ ] Implementar criação de assinaturas
- [ ] Implementar cancelamento
- [ ] Testar cobranças recorrentes

### Produção
- [ ] Obter chaves de produção
- [ ] Configurar webhooks em produção
- [ ] Implementar logs e monitoramento
- [ ] Testar com transações reais pequenas
- [ ] Documentar processos internos
- [ ] Treinar equipe de suporte

---

## Conclusão

A API Pagar.me oferece uma solução completa e robusta para pagamentos no Brasil, com:

✅ **Múltiplos métodos** de pagamento (PIX, cartão, boleto)
✅ **Taxas competitivas** (especialmente PIX: 0,99%)
✅ **Split nativo** para marketplaces
✅ **Antifraude incluído** gratuitamente
✅ **Assinaturas** e cobranças recorrentes
✅ **Webhooks** para notificações em tempo real
✅ **SDKs** em diversas linguagens
✅ **Sandbox completo** para testes

Para RENDIZY, a integração com Pagar.me permite:
- Processar pagamentos de reservas
- Dividir valores entre proprietários e plataforma (split)
- Gerenciar planos de assinatura
- Oferecer múltiplas formas de pagamento aos hóspedes
- Automatizar todo o fluxo financeiro

---

**Documentação atualizada em:** 07/01/2026
