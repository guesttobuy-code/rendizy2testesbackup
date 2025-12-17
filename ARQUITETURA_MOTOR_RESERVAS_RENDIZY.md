# 🏗️ Arquitetura: Motor de Reservas RENDIZY

**Data:** 2025-12-02  
**Objetivo:** Construir um motor de reservas completo para sites de clientes, similar a Jetimob, Stays.net e Bolt

---

## 📊 Análise: Como os Concorrentes Fazem

### 1. **Jetimob** (Sistema Imobiliário)
- **Site White Label:** Cada imobiliária tem seu próprio site
- **Backend Unificado:** Um único backend serve todos os clientes
- **Multi-tenant:** Isolamento por `organization_id`
- **Funcionalidades:**
  - Listagem de imóveis
  - Busca avançada
  - Formulário de contato → Lead no CRM
  - Integração com portais (ZAP, VivaReal)

### 2. **Stays.net** (PMS Temporada)
- **Site Customizado:** Cada cliente tem site próprio
- **Motor de Reservas:** Sistema completo de booking
- **Funcionalidades:**
  - Busca por cidade, datas, hóspedes
  - Calendário de disponibilidade
  - Reserva online com pagamento
  - Integração com Airbnb/Booking.com
  - Gestão financeira e operacional

### 3. **Bolt.dev** (Criador de Sites)
- **Backend Automático:** Cria API automaticamente
- **Domínio Próprio:** `{projeto}-{id}.bolt.host`
- **Deploy Automático:** Site + Backend em um clique

---

## 🎯 O Que Precisamos Construir no RENDIZY

### Fase 1: Site Funcional (ATUAL - 80% completo)
- ✅ Servir HTML do ZIP
- ✅ Servir assets (JS/CSS/imagens)
- ✅ API pública de propriedades
- ⚠️ **URGENTE:** Corrigir Content-Type dos assets JS

### Fase 2: Motor de Reservas Básico
```
┌─────────────────────────────────────────┐
│  1. API de Disponibilidade              │
│     GET /api/:subdomain/availability   │
│     - Verifica conflitos no calendário  │
│     - Retorna períodos disponíveis     │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  2. API de Busca                        │
│     GET /api/:subdomain/search          │
│     - Filtra por cidade, datas, guests │
│     - Retorna propriedades disponíveis │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  3. API de Detalhes da Propriedade      │
│     GET /api/:subdomain/properties/:id  │
│     - Informações completas             │
│     - Calendário de disponibilidade    │
│     - Preços por período               │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  4. API de Criação de Reserva           │
│     POST /api/:subdomain/reservations   │
│     - Valida disponibilidade            │
│     - Cria reserva no banco            │
│     - Bloqueia período no calendário   │
└─────────────────────────────────────────┘
```

### Fase 3: Integração Site ↔ Backend
- Modificar HTML do site para chamar APIs do RENDIZY
- Substituir dados mock por dados reais
- Implementar formulário de busca funcional
- Implementar página de detalhes com reserva

---

## 🗄️ Estrutura de Dados Necessária

### Tabela: `reservations` (já existe, verificar estrutura)
```sql
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  
  -- Datas
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  
  -- Hóspedes
  guests INTEGER NOT NULL,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  
  -- Financeiro
  total_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'BRL',
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (check_out > check_in),
  CONSTRAINT valid_guests CHECK (guests > 0)
);

CREATE INDEX idx_reservations_org ON reservations(organization_id);
CREATE INDEX idx_reservations_property ON reservations(property_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
```

### Tabela: `property_availability` (para bloqueios/regras)
```sql
CREATE TABLE IF NOT EXISTS property_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  
  -- Período
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Tipo de bloqueio
  type VARCHAR(50) NOT NULL, -- 'reservation', 'maintenance', 'blocked'
  reservation_id UUID REFERENCES reservations(id),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (end_date >= start_date)
);

CREATE INDEX idx_availability_property ON property_availability(property_id);
CREATE INDEX idx_availability_dates ON property_availability(start_date, end_date);
```

### Tabela: `property_pricing` (precificação dinâmica)
```sql
CREATE TABLE IF NOT EXISTS property_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  
  -- Período
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Preço
  price_per_night DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  
  -- Regras
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (end_date >= start_date),
  CONSTRAINT valid_nights CHECK (min_nights > 0)
);

CREATE INDEX idx_pricing_property ON property_pricing(property_id);
CREATE INDEX idx_pricing_dates ON property_pricing(start_date, end_date);
```

---

## 🔌 APIs a Implementar

### 1. **GET /api/:subdomain/availability**
```typescript
// Verifica disponibilidade de uma propriedade
GET /api/:subdomain/availability?property_id=xxx&check_in=2025-12-10&check_out=2025-12-15

Response:
{
  "available": true,
  "price": 1500.00,
  "currency": "BRL",
  "nights": 5,
  "total": 7500.00,
  "blocked_dates": ["2025-12-12"] // Datas já reservadas
}
```

### 2. **GET /api/:subdomain/search**
```typescript
// Busca propriedades disponíveis
GET /api/:subdomain/search?city=São Paulo&check_in=2025-12-10&check_out=2025-12-15&guests=2

Response:
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "Flat Comfort",
      "address": {...},
      "price_per_night": 300.00,
      "total_price": 1500.00,
      "available": true,
      "photos": [...]
    }
  ],
  "total": 10
}
```

### 3. **GET /api/:subdomain/properties/:id**
```typescript
// Detalhes completos da propriedade
GET /api/:subdomain/properties/xxx

Response:
{
  "id": "xxx",
  "name": "Flat Comfort",
  "description": "...",
  "address": {...},
  "amenities": [...],
  "photos": [...],
  "pricing": {
    "base_price": 300.00,
    "currency": "BRL",
    "min_nights": 1
  },
  "availability": {
    "available_dates": ["2025-12-10", "2025-12-11", ...],
    "blocked_dates": ["2025-12-12"]
  }
}
```

### 4. **POST /api/:subdomain/reservations**
```typescript
// Cria uma nova reserva
POST /api/:subdomain/reservations
{
  "property_id": "xxx",
  "check_in": "2025-12-10",
  "check_out": "2025-12-15",
  "guests": 2,
  "guest_name": "João Silva",
  "guest_email": "joao@example.com",
  "guest_phone": "+5511999999999"
}

Response:
{
  "success": true,
  "data": {
    "reservation_id": "yyy",
    "status": "pending",
    "total_price": 1500.00,
    "payment_url": "https://..." // Se tiver gateway
  }
}
```

---

## 🔄 Fluxo Completo de Reserva

```
1. Cliente acessa medhome.rendizy.app
   ↓
2. Preenche formulário de busca (cidade, datas, hóspedes)
   ↓
3. Site chama GET /api/medhome/search
   ↓
4. Backend retorna propriedades disponíveis
   ↓
5. Cliente clica em "Ver Detalhes"
   ↓
6. Site chama GET /api/medhome/properties/:id
   ↓
7. Cliente clica em "Reservar"
   ↓
8. Site chama POST /api/medhome/reservations
   ↓
9. Backend valida disponibilidade
   ↓
10. Backend cria reserva e bloqueia período
    ↓
11. Backend retorna confirmação
    ↓
12. Site exibe confirmação e envia email (futuro)
```

---

## 🚀 Próximos Passos Imediatos

### 1. **Corrigir Content-Type (URGENTE)**
- Problema: JS sendo servido como `text/plain`
- Impacto: Site não carrega JavaScript
- Solução: Ajustar `routes-client-sites.ts` para usar `c.body()` com headers corretos

### 2. **Implementar API de Busca**
- Endpoint: `GET /api/:subdomain/search`
- Funcionalidade: Filtrar propriedades por cidade, datas, hóspedes
- Integração: Conectar com formulário de busca do site

### 3. **Implementar API de Disponibilidade**
- Endpoint: `GET /api/:subdomain/availability`
- Funcionalidade: Verificar conflitos no calendário
- Uso: Validar antes de criar reserva

### 4. **Implementar API de Reserva**
- Endpoint: `POST /api/:subdomain/reservations`
- Funcionalidade: Criar reserva e bloquear período
- Validação: Verificar disponibilidade antes de criar

---

## 📚 Referências Técnicas

### Arquitetura Multi-Tenant
- **Padrão:** Subdomain-based routing
- **Database:** RLS por `organization_id`
- **Storage:** Isolado por tenant

### Motor de Reservas
- **Core:** Verificação de conflitos em tempo real
- **Precificação:** Regras dinâmicas (sazonalidade)
- **Disponibilidade:** Sync entre portais (futuro)

### Sites White Label
- **Deploy:** ZIP → Extract → Serve
- **Assets:** Edge Function serving
- **Customização:** Template + Config por tenant

---

## ✅ Conclusão

**Status Atual:**
- ✅ Base multi-tenant funcionando
- ✅ Sites servidos do ZIP
- ✅ API pública de propriedades
- ⚠️ Content-Type incorreto (bloqueando JS)

**Próximas Ações:**
1. Corrigir Content-Type dos assets
2. Implementar APIs de busca e disponibilidade
3. Implementar API de reservas
4. Integrar site com backend

**Meta Final:**
Motor de reservas completo similar a Stays.net, integrado ao sistema RENDIZY.

