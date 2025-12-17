# 🏨 Arquitetura: Motor de Reservas de Hotelaria - RENDIZY

**Data:** 2025-12-02  
**Objetivo:** Construir um sistema completo de sites multi-tenant com motor de reservas, similar a Jetimob, Stays.net e Bolt.host

---

## 📋 ANÁLISE DOS REFERENCIAIS

### 1. **Jetimob** (https://www.jetimob.com)

- **Arquitetura:** Sistema imobiliário completo (CRM + ERP + Site)
- **Sites:** Cada cliente tem seu próprio site customizado
- **Backend:** Centralizado, multi-tenant
- **Domínios:** Provavelmente usa subdomínios ou domínios customizados
- **Funcionalidades:**
  - Gestão de imóveis
  - Site imobiliário integrado
  - CRM para leads
  - Integração com portais

### 2. **Stays.net** (https://stays.net)

- **Arquitetura:** Software de aluguel por temporada
- **Sites:** Cada cliente tem site próprio com reservas diretas
- **Backend:** API centralizada
- **Funcionalidades:**
  - Motor de reservas integrado
  - Publicação automática em portais (Airbnb, Booking.com)
  - Gestão de preços dinâmica
  - Pagamento online
  - Calendário de disponibilidade

### 3. **Bolt.host** (https://medhome-flexible-ren-ch17.bolt.host)

- **Arquitetura:** Plataforma de criação de sites com backend
- **Domínios:** Cada site tem subdomínio `.bolt.host`
- **Backend:** Criador de backend integrado
- **Funcionalidades:**
  - Site React/TypeScript compilado
  - Backend API gerado automaticamente
  - Deploy automático

---

## 🏗️ ARQUITETURA PROPOSTA PARA RENDIZY

### **Camada 1: Infraestrutura de Domínios**

```
┌─────────────────────────────────────────────────┐
│         DNS / Reverse Proxy Layer               │
├─────────────────────────────────────────────────┤
│  *.rendizy.app → Supabase Edge Functions       │
│  medhome.rendizy.app → /sites/medhome          │
│  cliente2.rendizy.app → /sites/cliente2        │
└─────────────────────────────────────────────────┘
```

**Implementação:**

- **Wildcard DNS:** `*.rendizy.app` aponta para Supabase Edge Functions
- **Roteamento:** Edge Function detecta subdomain e serve site correspondente
- **Domínios Customizados:** Futuro - permitir `www.cliente.com` → `cliente.rendizy.app`

### **Camada 2: Backend API (Supabase Edge Functions)**

```
┌─────────────────────────────────────────────────┐
│         Rendizy Server (Edge Function)         │
├─────────────────────────────────────────────────┤
│  /client-sites/serve/:subdomain                │
│    → Extrai HTML do ZIP                        │
│    → Ajusta caminhos de assets                 │
│    → Serve site completo                       │
│                                                 │
│  /client-sites/assets/:subdomain/*             │
│    → Serve JS, CSS, imagens do ZIP             │
│                                                 │
│  /client-sites/api/:subdomain/properties       │
│    → API pública de imóveis (sem auth)        │
│                                                 │
│  /client-sites/api/:subdomain/availability     │
│    → API de disponibilidade (calendário)       │
│                                                 │
│  /client-sites/api/:subdomain/bookings         │
│    → API de reservas (POST para criar)        │
└─────────────────────────────────────────────────┘
```

### **Camada 3: Motor de Reservas**

#### **3.1. Banco de Dados (SQL)**

```sql
-- Tabela de disponibilidade (já existe como "blocks" ou similar)
CREATE TABLE availability (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  organization_id UUID REFERENCES organizations(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) -- 'available', 'booked', 'blocked', 'maintenance'
);

-- Tabela de reservas (já existe como "reservations")
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  organization_id UUID REFERENCES organizations(id),
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER,
  total_price DECIMAL(10,2),
  status VARCHAR(20), -- 'pending', 'confirmed', 'cancelled', 'completed'
  payment_status VARCHAR(20), -- 'pending', 'paid', 'refunded'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de preços dinâmicos
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  organization_id UUID REFERENCES organizations(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night DECIMAL(10,2),
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER,
  rules JSONB -- Regras específicas (finais de semana, feriados, etc)
);
```

#### **3.2. API de Disponibilidade**

```typescript
// GET /api/:subdomain/availability
// Retorna disponibilidade de imóveis para um período
app.get("/api/:subdomain/availability", async (c) => {
  const { subdomain } = c.req.param();
  const { startDate, endDate, propertyId } = c.req.query();

  // 1. Buscar organização pelo subdomain
  const org = await getOrganizationBySubdomain(subdomain);

  // 2. Buscar imóveis da organização
  const properties = await getProperties(org.id, propertyId);

  // 3. Para cada imóvel, verificar disponibilidade
  const availability = await Promise.all(
    properties.map(async (prop) => {
      const blocks = await getBlocks(prop.id, startDate, endDate);
      const reservations = await getReservations(prop.id, startDate, endDate);

      return {
        propertyId: prop.id,
        available: calculateAvailability(
          blocks,
          reservations,
          startDate,
          endDate
        ),
        price: await getPrice(prop.id, startDate, endDate),
      };
    })
  );

  return c.json({ success: true, data: availability });
});
```

#### **3.3. API de Reservas**

```typescript
// POST /api/:subdomain/bookings
// Cria uma nova reserva
app.post("/api/:subdomain/bookings", async (c) => {
  const { subdomain } = c.req.param();
  const bookingData = await c.req.json();

  // 1. Validar disponibilidade
  const isAvailable = await checkAvailability(
    bookingData.propertyId,
    bookingData.checkIn,
    bookingData.checkOut
  );

  if (!isAvailable) {
    return c.json({ success: false, error: "Período não disponível" }, 400);
  }

  // 2. Calcular preço
  const price = await calculatePrice(
    bookingData.propertyId,
    bookingData.checkIn,
    bookingData.checkOut,
    bookingData.guestsCount
  );

  // 3. Criar reserva
  const reservation = await createReservation({
    ...bookingData,
    organizationId: org.id,
    totalPrice: price,
    status: "pending",
  });

  // 4. Retornar dados da reserva (incluindo link de pagamento se houver)
  return c.json({
    success: true,
    data: reservation,
    paymentUrl: generatePaymentUrl(reservation.id),
  });
});
```

### **Camada 4: Integração Frontend ↔ Backend**

#### **4.1. Site do Cliente (React/Vite)**

O site compilado precisa:

1. **Buscar imóveis:** `GET /api/:subdomain/properties`
2. **Verificar disponibilidade:** `GET /api/:subdomain/availability?startDate=...&endDate=...`
3. **Criar reserva:** `POST /api/:subdomain/bookings`
4. **Processar pagamento:** Integração com gateway (Stripe, Mercado Pago, etc)

#### **4.2. Configuração do Site**

```typescript
// No site do cliente (config/site.ts ou similar)
export const SITE_CONFIG = {
  API_BASE_URL:
    "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites",
  SUBDOMAIN: "medhome", // Extraído do ambiente ou configurado
  ORGANIZATION_ID: "...", // Opcional, pode ser resolvido pelo subdomain
  PUBLIC_ANON_KEY: "...", // Para APIs públicas
};
```

---

## 🔄 FLUXO COMPLETO DE RESERVA

```
1. Cliente acessa: medhome.rendizy.app
   ↓
2. Frontend carrega HTML/CSS/JS do ZIP
   ↓
3. Site busca imóveis: GET /api/medhome/properties
   ↓
4. Cliente preenche formulário (check-in, check-out, hóspedes)
   ↓
5. Site verifica disponibilidade: GET /api/medhome/availability?...
   ↓
6. Site exibe imóveis disponíveis com preços
   ↓
7. Cliente seleciona imóvel e confirma
   ↓
8. Site cria reserva: POST /api/medhome/bookings
   ↓
9. Backend valida, cria reserva, retorna link de pagamento
   ↓
10. Cliente paga (Stripe/Mercado Pago)
   ↓
11. Webhook confirma pagamento → reserva confirmada
   ↓
12. Email de confirmação enviado
```

---

## 🛠️ IMPLEMENTAÇÃO TÉCNICA

### **1. Roteamento de Subdomínios**

```typescript
// routes-client-sites.ts
app.get("/serve/*", async (c) => {
  // Extrair subdomain do Host header ou path
  const host = c.req.header("Host") || "";
  const subdomain = extractSubdomain(host); // "medhome" de "medhome.rendizy.app"

  // Buscar site no SQL
  const site = await getSiteBySubdomain(subdomain);

  // Extrair e servir HTML do ZIP
  // ...
});
```

### **2. API Pública de Imóveis (JÁ IMPLEMENTADA ✅)**

```typescript
// GET /api/:subdomain/properties
app.get("/api/:subdomain/properties", async (c) => {
  const { subdomain } = c.req.param();

  // Buscar organização pelo subdomain
  const org = await getOrganizationBySubdomain(subdomain);

  // Buscar imóveis ativos
  const properties = await getProperties(org.id);

  // Retornar JSON (CORS habilitado)
  return c.json({ success: true, data: properties });
});
```

### **3. API de Disponibilidade (A IMPLEMENTAR)**

```typescript
// GET /api/:subdomain/availability
app.get("/api/:subdomain/availability", async (c) => {
  const { subdomain } = c.req.param();
  const { startDate, endDate, propertyId } = c.req.query();

  const org = await getOrganizationBySubdomain(subdomain);

  // Buscar blocks e reservations
  const availability = await calculateAvailability(
    org.id,
    propertyId,
    startDate,
    endDate
  );

  return c.json({ success: true, data: availability });
});
```

### **4. API de Reservas (A IMPLEMENTAR)**

```typescript
// POST /api/:subdomain/bookings
app.post("/api/:subdomain/bookings", async (c) => {
  const { subdomain } = c.req.param();
  const booking = await c.req.json();

  // Validar, criar reserva, processar pagamento
  const reservation = await createBooking(subdomain, booking);

  return c.json({ success: true, data: reservation });
});
```

---

## 📊 COMPARAÇÃO COM REFERENCIAIS

| Recurso            | Jetimob | Stays.net | Bolt.host | RENDIZY (Atual) | RENDIZY (Planejado) |
| ------------------ | ------- | --------- | --------- | --------------- | ------------------- |
| Site Customizado   | ✅      | ✅        | ✅        | ✅              | ✅                  |
| Subdomínio Próprio | ✅      | ✅        | ✅        | ✅              | ✅                  |
| Motor de Reservas  | ✅      | ✅        | ❌        | ❌              | ✅                  |
| API Pública        | ✅      | ✅        | ✅        | ✅              | ✅                  |
| Calendário         | ✅      | ✅        | ❌        | ✅              | ✅                  |
| Pagamento Online   | ✅      | ✅        | ❌        | ❌              | ✅                  |
| Integração Portais | ✅      | ✅        | ❌        | ❌              | 🔄                  |

---

## 🎯 PRÓXIMOS PASSOS

### **Fase 1: Site Funcionando (ATUAL) ✅**

- [x] Extrair HTML do ZIP
- [x] Servir assets (JS/CSS)
- [x] API pública de imóveis
- [x] Roteamento por subdomain

### **Fase 2: Motor de Reservas (A IMPLEMENTAR)**

- [ ] API de disponibilidade (calendário)
- [ ] API de criação de reservas
- [ ] Validação de conflitos
- [ ] Cálculo de preços dinâmicos

### **Fase 3: Pagamento e Confirmação**

- [ ] Integração com gateway de pagamento
- [ ] Webhook de confirmação
- [ ] Email de confirmação
- [ ] Dashboard de reservas para cliente

### **Fase 4: Integrações**

- [ ] Sincronização com Airbnb
- [ ] Sincronização com Booking.com
- [ ] iCal para importação/exportação
- [ ] WhatsApp para notificações

---

## 🔍 REFERÊNCIAS TÉCNICAS

### **Multi-Tenant Architecture**

- **Wildcard DNS:** `*.rendizy.app` → Supabase Edge Functions
- **Subdomain Routing:** Detectar subdomain no Host header
- **Data Isolation:** `organization_id` em todas as queries

### **Booking Engine**

- **Availability Check:** Verificar blocks + reservations
- **Price Calculation:** Regras de preço dinâmico (temporada, mínimo de noites, etc)
- **Conflict Prevention:** Validação antes de criar reserva

### **API Design**

- **RESTful:** GET para consultas, POST para ações
- **CORS:** Habilitado para APIs públicas
- **Authentication:** Apenas para operações administrativas

---

## 📝 NOTAS IMPORTANTES

1. **Regras de Ouro:** Tudo em SQL, nada em KV Store (exceto cache temporário)
2. **Isolamento:** Cada organização tem seus próprios dados
3. **Performance:** Cache de assets (JS/CSS) com headers apropriados
4. **Segurança:** Validação de inputs, rate limiting, sanitização

---

**Status:** Documento em construção - será atualizado conforme implementação avança.
