# 🏨 ROADMAP: Integração Expedia Group / VRBO

**Data:** 2026-02-02  
**Versão:** 1.0  
**Status:** 📋 Planejamento

---

## 📊 Visão Geral da API

A **Expedia Rapid API** fornece acesso a:
- **700.000+** acomodações globais (hotéis)
- **900.000+** vacation rentals (incluindo **650.000+ VRBO**)
- APIs modulares para Content, Shopping, Booking, e Manage Booking

### 🔑 Credenciais Necessárias
| Item | Descrição |
|------|-----------|
| **API Key** | Obtida no EPS Portal → Connectivity → API Key |
| **Shared Secret** | Obtida no EPS Portal → API Keys page |
| **Ambiente Test** | `https://test.ean.com/v3` |
| **Ambiente Produção** | `https://api.ean.com/v3` |

---

## 🔐 Autenticação

### Signature Authentication (SHA-512)
A autenticação usa HMAC-SHA512 com o seguinte formato:

```
Authorization: EAN apikey={API_KEY},signature={SHA512_HASH},timestamp={UNIX_TIMESTAMP}
```

**Geração da Signature:**
```typescript
import { createHmac } from 'crypto';

function generateExpediaSignature(apiKey: string, sharedSecret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = apiKey + sharedSecret + timestamp;
  const signature = createHmac('sha512', sharedSecret)
    .update(toSign)
    .digest('hex');
  
  return `EAN apikey=${apiKey},signature=${signature},timestamp=${timestamp}`;
}
```

### OAuth2 (Alternativa)
```
POST /identity/oauth2/v3/token
Authorization: Basic {base64(apikey:shared_secret)}
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

Resposta:
```json
{
  "access_token": "xxxExampleValue...",
  "token_type": "Bearer",
  "expires_in": 1799,
  "scope": "prod.all test.all"
}
```

---

## 🗺️ Arquitetura das APIs

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPEDIA RAPID API v3                         │
│                  Base URL: https://test.ean.com/v3              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Geography   │  │   Content    │  │   Shopping   │          │
│  │     API      │  │     API      │  │     API      │          │
│  │              │  │              │  │              │          │
│  │ • Regions    │  │ • Properties │  │ • Avail.     │          │
│  │ • Region     │  │ • Inactive   │  │ • Rates      │          │
│  │ • Polygon    │  │ • Reviews    │  │ • Price Check│          │
│  │              │  │ • Catalog    │  │ • Payment    │          │
│  │              │  │ • References │  │ • Calendar   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Booking    │  │ Manage Book  │  │ Notifications│          │
│  │     API      │  │     API      │  │     API      │          │
│  │              │  │              │  │              │          │
│  │ • Register   │  │ • Search     │  │ • Undelivered│          │
│  │ • Create     │  │ • Retrieve   │  │ • Test       │          │
│  │ • Resume     │  │ • Receipt    │  │              │          │
│  │ • Complete   │  │ • Change     │  │              │          │
│  │              │  │ • Cancel     │  │              │          │
│  │              │  │ • Commit     │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────┐                                               │
│  │ Merchandising│                                               │
│  │     API      │                                               │
│  │              │                                               │
│  │ • Campaigns  │                                               │
│  │ • Promotions │                                               │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 MAPEAMENTO COMPLETO DE ENDPOINTS

### 🔐 Authentication
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/identity/oauth2/v3/token` | POST | OAuth2 token (alternativa à signature) |

### 📄 Content API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/properties/content` | GET | Property Content - propriedades ativas |
| `/properties/inactive` | GET | Inactive Properties |
| `/properties/{id}/guest-reviews` | GET | Property Guest Reviews |
| `/files/properties/catalog` | GET | Property Catalog File |
| `/files/properties/content` | GET | Property Content File |
| `/references/amenities` | GET | Amenities Reference |
| `/references/categories` | GET | Categories Reference |
| `/references/chains` | GET | Chains Reference |
| `/references/general-attributes` | GET | General Attributes Reference |
| `/references/images` | GET | Images Reference |
| `/references/onsite-payment-types` | GET | Onsite Payment Types Reference |
| `/references/pet-attributes` | GET | Pet Attributes Reference |
| `/references/rate-amenities` | GET | Rate Amenities Reference |
| `/references/room-amenities` | GET | Room Amenities Reference |
| `/references/room-images` | GET | Room Images Reference |
| `/references/room-views` | GET | Room Views Reference |
| `/references/spoken-languages` | GET | Spoken Languages Reference |
| `/references/statistics` | GET | Statistics Reference |
| `/references/themes` | GET | Themes Reference |

### 🌍 Geography API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/regions` | GET | Regions - listar regiões |
| `/regions/{id}` | GET | Region - detalhes de uma região |
| `/properties/geography` | POST | Properties within Polygon |

### 🛒 Shopping API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/properties/availability` | GET | Get property room rates and availability |
| `/properties/{id}/availability` | GET | Get additional property room rates |
| `/properties/{id}/rooms/{room_id}/rates/{rate_id}` | GET | Price-Check |
| `/properties/{id}/payment-options` | GET | Get Accepted Payment Types (EPS MOR) |
| `/calendars/availability` | GET | Calendar of availability (VRBO only) |

### 📝 Bookings API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/payment-sessions` | POST | Register Payments |
| `/itineraries` | POST | Create Booking |
| `/itineraries/{id}` | PUT | Resume Booking |
| `/itineraries/{id}/payment-sessions` | PUT | Complete Payment Session |

### 📊 Manage Booking API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/itineraries` | GET | Search Bookings with Affiliate Reference Id |
| `/itineraries/{id}` | GET | Retrieve Booking |
| `/itineraries/{id}` | DELETE | Cancel Held Booking |
| `/itineraries/{id}/invoice` | GET | Booking Receipt |
| `/itineraries/{id}/payment` | PUT | Payment Change |
| `/itineraries/{id}/rooms/{room_id}` | PUT | Change details of a room |
| `/itineraries/{id}/rooms/{room_id}` | DELETE | Cancel a room |
| `/itineraries/{id}/rooms/{room_id}/pricing` | PUT | Commit change (Hard Change) |

### 🔔 Notifications API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/notifications` | GET | Request Undelivered Notifications |
| `/notifications` | POST | Request Test Notification |

### 🎯 Merchandising API
| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/campaigns` | GET | Campaigns Search |
| `/promotions` | GET | Promotions Search |

---

## 📍 FASE 1: Setup & Autenticação (Semana 1-2)

### 1.1 Configuração de Credenciais
- [ ] Solicitar acesso como parceiro em [partner.expediagroup.com](https://partner.expediagroup.com/en-us/join-us/rapid-api)
- [ ] Obter API Key e Shared Secret no EPS Portal
- [ ] Criar arquivo de configuração seguro

```typescript
// supabase/functions/rendizy-server/config/expedia.ts
export const EXPEDIA_CONFIG = {
  apiKey: Deno.env.get('EXPEDIA_API_KEY'),
  sharedSecret: Deno.env.get('EXPEDIA_SHARED_SECRET'),
  baseUrl: {
    test: 'https://test.ean.com/v3',
    production: 'https://api.ean.com/v3'
  },
  environment: Deno.env.get('EXPEDIA_ENV') || 'test'
};
```

### 1.2 Implementar Módulo de Autenticação
- [ ] Criar `utils-expedia-auth.ts` com geração de signature
- [ ] Implementar refresh automático do OAuth token
- [ ] Criar wrapper para requests autenticados

```typescript
// supabase/functions/rendizy-server/utils-expedia-auth.ts
import { createHmac } from 'node:crypto';

interface ExpediaHeaders {
  'Authorization': string;
  'Accept': string;
  'Accept-Encoding': string;
  'User-Agent': string;
  'Customer-Session-Id'?: string;
}

export function getExpediaHeaders(sessionId?: string): ExpediaHeaders {
  const apiKey = Deno.env.get('EXPEDIA_API_KEY')!;
  const sharedSecret = Deno.env.get('EXPEDIA_SHARED_SECRET')!;
  const timestamp = Math.floor(Date.now() / 1000);
  
  const toSign = apiKey + sharedSecret + timestamp;
  const signature = createHmac('sha512', sharedSecret)
    .update(toSign)
    .digest('hex');

  return {
    'Authorization': `EAN apikey=${apiKey},signature=${signature},timestamp=${timestamp}`,
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'Rendizy/1.0',
    ...(sessionId && { 'Customer-Session-Id': sessionId })
  };
}
```

### 1.3 Testes de Conectividade
- [ ] Testar autenticação com endpoint de teste
- [ ] Validar signature com Signature Generator da Expedia
- [ ] Documentar troubleshooting

---

## 📍 FASE 2: Content API - Catálogo de Propriedades (Semana 3-4)

### 2.1 Endpoints Completos - Content API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/properties/content` | GET | Buscar conteúdo de propriedades ativas |
| `/properties/inactive` | GET | Propriedades inativas |
| `/properties/{id}/guest-reviews` | GET | Reviews dos hóspedes |
| `/files/properties/catalog` | GET | Catálogo completo (arquivo) |
| `/files/properties/content` | GET | Conteúdo completo (arquivo) |

### 2.2 Reference Data Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/references/amenities` | GET | Lista de amenidades |
| `/references/categories` | GET | Categorias de propriedades |
| `/references/chains` | GET | Redes hoteleiras |
| `/references/general-attributes` | GET | Atributos gerais |
| `/references/images` | GET | Referência de imagens |
| `/references/onsite-payment-types` | GET | Tipos de pagamento no local |
| `/references/pet-attributes` | GET | Atributos de pets |
| `/references/rate-amenities` | GET | Amenidades de tarifa |
| `/references/room-amenities` | GET | Amenidades de quarto |
| `/references/room-images` | GET | Imagens de quarto |
| `/references/room-views` | GET | Vistas de quarto |
| `/references/spoken-languages` | GET | Idiomas falados |
| `/references/statistics` | GET | Estatísticas |
| `/references/themes` | GET | Temas |

### 2.3 Geography API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/regions` | GET | Listar regiões (cidades, países, etc) |
| `/regions/{id}` | GET | Detalhes de uma região específica |
| `/properties/geography` | POST | Propriedades dentro de um polígono |

```typescript
// Buscar regiões
const regions = await fetch(
  `${EXPEDIA_CONFIG.baseUrl.test}/regions?` +
  new URLSearchParams({
    language: 'pt-BR',
    include: 'details',
    area_id: '6046853'  // São Paulo, BR
  }),
  { headers: getExpediaHeaders() }
);

// Buscar propriedades em polígono
const propertiesInArea = await fetch(
  `${EXPEDIA_CONFIG.baseUrl.test}/properties/geography`,
  {
    method: 'POST',
    headers: getExpediaHeaders(),
    body: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[-46.63, -23.55], [-46.64, -23.56], ...]]
    })
  }
);
```

### 2.4 Parâmetros Importantes para VRBO

```typescript
// Filtrar apenas propriedades VRBO
const params = {
  language: 'pt-BR',
  supply_source: 'vrbo',  // 'expedia' ou 'vrbo'
  country_code: 'BR',
  category_id: ['7', '9', '10', '11', '14', '16', '17'], // Vacation rentals
  include: [
    'property_id',
    'name',
    'address',
    'images',
    'amenities',
    'descriptions',
    'ratings',
    'rooms'
  ]
};
```

### 2.3 Categorias de Vacation Rentals
| ID | Tipo |
|----|------|
| 7 | Condo |
| 9 | Cabin |
| 10 | Chalet |
| 11 | Cottage |
| 14 | Villa |
| 16 | Apartment |
| 17 | Private vacation home |
| 18 | Houseboat |
| 22 | Aparthotel |
| 23 | Condominium resort |

### 2.4 Implementação
- [ ] Criar `routes-expedia-content.ts`
- [ ] Implementar sync de propriedades VRBO
- [ ] Mapear dados para schema Rendizy
- [ ] Cache local com refresh diário

```typescript
// Exemplo de resposta de propriedade
{
  "12345": {
    "property_id": "12345",
    "name": "Beach House Paradise",
    "address": {
      "line_1": "123 Ocean Drive",
      "city": "Miami Beach",
      "country_code": "US"
    },
    "category": { "id": "14", "name": "Villa" },
    "supply_source": "vrbo",
    "multi_unit": false,
    "images": [...],
    "amenities": {...},
    "rooms": [...]
  }
}
```

---

## 📍 FASE 3: Shopping API - Disponibilidade & Preços (Semana 5-6)

### 3.1 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/properties/availability` | GET | Disponibilidade múltiplas propriedades |
| `/properties/{id}/availability` | GET | Disponibilidade propriedade específica |
| `/properties/{id}/rooms/{room_id}/rates/{rate_id}` | GET | Price Check |
| `/properties/{id}/payment-options` | GET | Opções de pagamento |
| `/calendars/availability` | GET | Calendário de disponibilidade |

### 3.2 Parâmetros de Shopping

```typescript
interface ShoppingParams {
  checkin: string;          // YYYY-MM-DD
  checkout: string;         // YYYY-MM-DD
  currency: string;         // BRL, USD, etc
  language: string;         // pt-BR
  country_code: string;     // BR (ponto de venda)
  occupancy: string[];      // ['2', '2-4'] (adultos-crianças)
  property_id: string[];    // até 250 IDs
  sales_channel: 'website' | 'mobile_app' | 'call_center';
  sales_environment: 'hotel_only' | 'package';
  travel_purpose?: 'leisure' | 'business';
  
  // Filtros opcionais
  filter?: string[];        // ['refundable', 'expedia_collect']
  rate_plan_count?: number; // limitar planos por propriedade
  include?: string[];       // campos adicionais
}
```

### 3.3 Fluxo de Shopping

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SHOP      │────▶│ PRICE CHECK │────▶│   BOOKING   │
│ /availability│     │ /rates/{id} │     │ /itineraries│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Rates + Links      Confirm Price       Create Booking
```

### 3.4 Implementação
- [ ] Criar `routes-expedia-shopping.ts`
- [ ] Implementar busca de disponibilidade
- [ ] Implementar Price Check
- [ ] Integrar com calendário Rendizy

```typescript
// GET /expedia/availability
app.get('/expedia/availability', async (c) => {
  const { checkin, checkout, occupancy, property_ids } = c.req.query();
  
  const response = await fetch(
    `${EXPEDIA_CONFIG.baseUrl.test}/properties/availability?` +
    new URLSearchParams({
      checkin,
      checkout,
      currency: 'BRL',
      language: 'pt-BR',
      country_code: 'BR',
      occupancy,
      property_id: property_ids,
      sales_channel: 'website',
      sales_environment: 'hotel_only'
    }),
    { headers: getExpediaHeaders() }
  );
  
  return c.json(await response.json());
});
```

---

## 📍 FASE 4: Booking API - Reservas (Semana 7-8)

### 4.1 Endpoints Completos

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/payment-sessions` | POST | Register Payments - criar sessão de pagamento |
| `/itineraries` | POST | Create Booking - criar reserva |
| `/itineraries/{id}` | PUT | Resume Booking - retomar reserva em hold |
| `/itineraries/{id}/payment-sessions` | PUT | Complete Payment Session |

### 4.2 Fluxo de Booking

```
1. Price Check → Obtém booking link
2. (Opcional) Register Payments → Sessão de pagamento
3. (Opcional) Hold → Segura inventário por tempo limitado
4. Create Booking → Envia dados do hóspede + pagamento
5. (Se hold) Resume Booking → Completa a reserva
4. Confirmation → Recebe itinerary_id + confirmation numbers
```

### 4.3 Payload de Booking

```typescript
interface BookingRequest {
  affiliate_reference_id: string;  // ID interno Rendizy
  hold?: boolean;                  // Hold and Resume
  email: string;
  phone: {
    country_code: string;
    number: string;
  };
  rooms: [{
    given_name: string;
    family_name: string;
    smoking: boolean;
    special_request?: string;
    loyalty_id?: string;
  }];
  payments: [{
    type: 'customer_card' | 'virtual_card' | 'affiliate_card';
    card?: {
      card_number: string;
      card_type: string;  // 'VI', 'MC', 'AX', etc
      expiration_month: string;
      expiration_year: string;
      security_code: string;
    };
    billing_contact: {
      given_name: string;
      family_name: string;
      address: {
        line_1: string;
        city: string;
        state_province_code: string;
        postal_code: string;
        country_code: string;
      };
    };
  }];
}
```

### 4.4 Hold and Resume (Opcional)
- Permite segurar inventário antes de completar booking
- Útil para pacotes ou validações adicionais
- **Não suportado para VRBO**

### 4.5 Implementação
- [ ] Criar `routes-expedia-booking.ts`
- [ ] Implementar criação de reserva
- [ ] Mapear para tabela `reservations` Rendizy
- [ ] Integrar com sistema de pagamento

---

## 📍 FASE 5: Manage Booking API - Gestão (Semana 9-10)

### 5.1 Endpoints Completos

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/itineraries` | GET | Search Bookings with Affiliate Reference Id |
| `/itineraries/{id}` | GET | Retrieve Booking - obter detalhes |
| `/itineraries/{id}` | DELETE | Cancel Held Booking - cancelar reserva em hold |
| `/itineraries/{id}/invoice` | GET | Booking Receipt - obter fatura/recibo |
| `/itineraries/{id}/payment` | PUT | Payment Change - atualizar pagamento |
| `/itineraries/{id}/rooms/{room_id}` | PUT | Change details of a room |
| `/itineraries/{id}/rooms/{room_id}` | DELETE | Cancel a room - cancelar quarto |
| `/itineraries/{id}/rooms/{room_id}/pricing` | PUT | Commit change (Hard Change) |

### 5.2 Retrieve Itinerary

```typescript
// Resposta do GET /itineraries/{id}
{
  "itinerary_id": "8091234567890",
  "property_id": "12345",
  "links": {
    "cancel": { "method": "DELETE", "href": "..." },
    "change": { "method": "PUT", "href": "..." }
  },
  "rooms": [{
    "id": "room123",
    "confirmation_id": {
      "expedia": "926784314",
      "property": "BEF23123AA"
    },
    "status": "booked",
    "check_in": "2026-03-15",
    "check_out": "2026-03-20",
    "rate": {...}
  }]
}
```

### 5.3 Cancelamento

```typescript
// DELETE /itineraries/{id}
// ou
// DELETE /itineraries/{id}/rooms/{room_id}

// Resposta
{
  "itinerary_id": "8091234567890",
  "rooms": [{
    "id": "room123",
    "status": "canceled",
    "refund": {
      "amount": "500.00",
      "currency": "BRL"
    }
  }]
}
```

### 5.4 Implementação
- [ ] Criar `routes-expedia-manage.ts`
- [ ] Implementar retrieve/cancel
- [ ] Sincronizar status com Rendizy
- [ ] Implementar alterações de reserva

---

## 📍 FASE 6: Notifications API - Webhooks (Semana 11-12)

### 6.1 Tipos de Eventos

| Event Type | Origem | Descrição |
|------------|--------|-----------|
| `itinerary.agent.create` | Agente | Nova reserva via call center |
| `itinerary.agent.change` | Agente | Alteração via call center |
| `itinerary.agent.cancel` | Agente | Cancelamento via call center |
| `itinerary.supplier.cancel` | Propriedade | Cancelamento pelo host |
| `itinerary.supplier.confirm` | Propriedade | Confirmação do host |
| `itinerary.supplier.change` | Propriedade | Alteração (no-show, early checkout) |
| `itinerary.fraud.cancel` | Expedia | Cancelamento por fraude |
| `itinerary.payment_verification.failure` | Expedia | Falha de pagamento |
| `itinerary.traveler.noshow` | Propriedade | No-show registrado |
| `itinerary.supplier.refund` | Propriedade | Reembolso |
| `itinerary.message.received` | PMC | Nova mensagem |

### 6.2 Payload de Webhook

```typescript
interface ExpediaWebhookEvent {
  event_id: string;
  event_type: string;
  event_time: string;  // ISO 8601
  itinerary_id: string;
  email: string;
  message: string;
  affiliate_reference_id: string;
  rooms?: [{
    confirmation_id: {
      expedia: string;
      property?: string;
    }
  }];
  topic_tags?: string;  // Para itinerary.message.received
}
```

### 6.3 Implementação de Webhook Handler

```typescript
// POST /webhooks/expedia
app.post('/webhooks/expedia', async (c) => {
  const event: ExpediaWebhookEvent = await c.req.json();
  
  console.log(`📩 Expedia Event: ${event.event_type} for ${event.itinerary_id}`);
  
  switch (event.event_type) {
    case 'itinerary.supplier.cancel':
      await handleSupplierCancel(event);
      break;
    case 'itinerary.supplier.confirm':
      await handleSupplierConfirm(event);
      break;
    case 'itinerary.payment_verification.failure':
      await handlePaymentFailure(event);
      break;
    // ... outros eventos
  }
  
  return c.json({ received: true });
});
```

### 6.4 Implementação
- [ ] Criar endpoint `/webhooks/expedia`
- [ ] Configurar URL no EPS Portal
- [ ] Implementar handlers para cada evento
- [ ] Sincronizar eventos com Rendizy

---

## 📍 FASE 6B: Merchandising API (Semana 12)

### 6B.1 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/campaigns` | GET | Campaigns Search - buscar campanhas |
| `/promotions` | GET | Promotions Search - buscar promoções |

### 6B.2 Uso de Campanhas
Campanhas são ofertas promocionais da Expedia que podem aumentar a conversão:
- Descontos especiais
- Ofertas por tempo limitado
- Promoções sazonais

```typescript
// GET /campaigns
const response = await fetch(
  `${EXPEDIA_CONFIG.baseUrl.test}/campaigns?` +
  new URLSearchParams({
    property_id: '12345',
    checkin: '2026-03-15',
    checkout: '2026-03-20'
  }),
  { headers: getExpediaHeaders() }
);
```

### 6B.3 Implementação
- [ ] Integrar campanhas na busca de disponibilidade
- [ ] Exibir promoções no frontend
- [ ] Tracking de conversão

---

## 📍 FASE 7: Integração com Rendizy (Semana 13-14)

### 7.1 Mapeamento de Dados

```typescript
// Expedia Property → Rendizy Property
interface PropertyMapping {
  expedia_property_id: string;
  rendizy_property_id: string;
  sync_enabled: boolean;
  last_sync: Date;
  supply_source: 'expedia' | 'vrbo';
}

// Expedia Booking → Rendizy Reservation
interface ReservationMapping {
  expedia_itinerary_id: string;
  rendizy_reservation_id: string;
  expedia_confirmation_id: string;
  property_confirmation_id?: string;
}
```

### 7.2 Tabelas de Integração

```sql
-- Mapeamento de propriedades
CREATE TABLE expedia_property_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  expedia_property_id TEXT NOT NULL,
  rendizy_property_id UUID REFERENCES properties(id),
  supply_source TEXT DEFAULT 'expedia',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, expedia_property_id)
);

-- Mapeamento de reservas
CREATE TABLE expedia_reservation_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  expedia_itinerary_id TEXT NOT NULL,
  rendizy_reservation_id UUID REFERENCES reservations(id),
  expedia_confirmation TEXT,
  property_confirmation TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, expedia_itinerary_id)
);

-- Log de eventos
CREATE TABLE expedia_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ,
  itinerary_id TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 UI Components
- [ ] Página de configuração Expedia
- [ ] Listagem de propriedades mapeadas
- [ ] Status de sincronização
- [ ] Logs de webhooks

---

## 📍 FASE 8: Testes & Go-Live (Semana 15-16)

### 8.1 Testes no Ambiente Sandbox
- [ ] Testar fluxo completo de booking
- [ ] Testar cancelamentos
- [ ] Testar webhooks com Notification Tester
- [ ] Testar edge cases

### 8.2 Test Headers para Booking

```typescript
// Forçar diferentes cenários de teste
const testHeaders = {
  'Test-Sold-Out': 'all',           // Simular sold out
  'Test-Matching-Rates': 'price',   // Simular rate mismatch
  'Test-Booking-Error': '503',      // Simular erro
};
```

### 8.3 Launch Requirements (VRBO)
Segundo a [documentação](https://developers.expediagroup.com/rapid/setup/launch-requirements/vrbo-launch-requirements):

- [ ] Exibir property category corretamente
- [ ] Mostrar se há front desk
- [ ] Exibir checkout instructions (California law)
- [ ] Comunicação host-traveler obrigatória
- [ ] Email do hóspede em todas reservas

### 8.4 Site Review
- [ ] Solicitar site review ao Business Development Manager
- [ ] Aguardar aprovação
- [ ] Migrar de `test.ean.com` para `api.ean.com`

---

## 📊 Cronograma Resumido

| Fase | Semanas | Descrição |
|------|---------|-----------|
| 1 | 1-2 | Setup & Autenticação |
| 2 | 3-4 | Content API |
| 3 | 5-6 | Shopping API |
| 4 | 7-8 | Booking API |
| 5 | 9-10 | Manage Booking API |
| 6 | 11-12 | Notifications/Webhooks |
| 7 | 13-14 | Integração Rendizy |
| 8 | 15-16 | Testes & Go-Live |

**Total estimado: 16 semanas (4 meses)**

---

## 📚 Recursos

### Documentação Oficial
- [Rapid API Home](https://developers.expediagroup.com/rapid)
- [API Explorer](https://developers.expediagroup.com/rapid/api/explorer)
- [Vacation Rentals (VRBO)](https://developers.expediagroup.com/rapid/lodging/vacation-rentals/about-vacation-rentals-api)
- [Signature Generator](https://developers.expediagroup.com/rapid/tools/signature-generator)
- [Notification Tester](https://developers.expediagroup.com/rapid/tools/notification-tester)

### Downloads
- [OpenAPI Spec](https://a.travel-assets.com/documentation-hubs/prod/rapid/latest/en-US/assets/rapid-3-specs.yaml)
- [Postman Collection](https://a.travel-assets.com/documentation-hubs/prod/rapid/latest/en-US/assets/rapid-3-postman-collection.json)

### Suporte
- [EPS Portal](https://www.eps-support.com)
- [Partner Support](https://developers.expediagroup.com/rapid/support)

---

## ⚠️ Limitações do VRBO no Rapid

**Features NÃO suportadas para VRBO:**
- ❌ Hold/Resume (segurar inventário)
- ❌ Change room details (nome, datas, ocupação)
- ❌ Special requests
- ❌ MFS (Multiple Funding Sources)
- ❌ Property Message Center (requer email direto)

**Recomendações para VRBO:**
- ✅ Limitar a propriedades com pagamento único
- ✅ Limitar a propriedades sem depósito de danos
- ✅ Usar virtual card para pagamento
- ✅ Sempre fornecer email do hóspede

---

## 🔐 Variáveis de Ambiente

```bash
# .env.local
EXPEDIA_API_KEY=your_api_key_here
EXPEDIA_SHARED_SECRET=your_shared_secret_here
EXPEDIA_ENV=test  # ou 'production'
EXPEDIA_WEBHOOK_SECRET=your_webhook_secret  # para validação
```

---

*Documento criado para orientar a integração da Rendizy com Expedia Group / VRBO.*
