# 📘 DOCUMENTAÇÃO COMPLETA - APIs BACKEND NECESSÁRIAS

**Versão:** v1.0.103.249-FRONTEND-ONLY  
**Data:** 01/11/2025  
**Objetivo:** Documentar TODAS as APIs para implementar backend em qualquer plataforma

---

## 🎯 VISÃO GERAL

O RENDIZY precisa de um backend que forneça APIs REST para:
- Gestão de propriedades (imóveis)
- Gestão de reservas
- Gestão de hóspedes/clientes
- Calendário e disponibilidade
- Finanças e transações
- Mensagens/Chat (WhatsApp)
- Configurações multi-tenant

---

## 📦 ESTRUTURA DE DADOS

### 1️⃣ **PROPRIEDADES (Properties)**

```typescript
interface Property {
  id: string;                    // Código único: "PRP-XXXXXX"
  name: string;                  // Nome do imóvel
  code: string;                  // Código curto: "COP201"
  type: 'apartment' | 'house' | 'studio' | 'loft' | 'condo' | 'villa' | 'other';
  status: 'active' | 'inactive' | 'maintenance' | 'draft';
  
  // Endereço
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Capacidade
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  area?: number;                 // m²
  
  // Precificação
  pricing: {
    basePrice: number;           // Em centavos (ex: 35000 = R$ 350,00)
    currency: 'BRL' | 'USD' | 'EUR';
    weeklyDiscount: number;      // %
    biweeklyDiscount: number;    // %
    monthlyDiscount: number;     // %
  };
  
  // Restrições
  restrictions: {
    minNights: number;
    maxNights: number;
    advanceBooking: number;      // dias
    preparationTime: number;     // dias
  };
  
  // Comodidades e tags
  amenities: string[];           // ['wifi', 'ar-condicionado', 'piscina']
  tags: string[];                // ['praia', 'familia', 'luxo']
  
  // Visual
  color: string;                 // Hex color
  photos: string[];              // URLs das fotos
  description?: string;
  
  // Plataformas
  platforms: {
    airbnb?: { enabled: boolean; listingId?: string; syncEnabled?: boolean };
    booking?: { enabled: boolean; listingId?: string; syncEnabled?: boolean };
    direct?: boolean;
  };
  
  // Metadados
  createdAt: string;             // ISO 8601
  updatedAt: string;
  ownerId: string;
  isActive: boolean;
}
```

### 2️⃣ **RESERVAS (Reservations)**

```typescript
interface Reservation {
  id: string;                    // Código único: "RSV-XXXXXX"
  propertyId: string;            // FK para Property
  guestId: string;               // FK para Guest
  
  // Datas
  checkIn: string;               // YYYY-MM-DD
  checkOut: string;              // YYYY-MM-DD
  nights: number;                // Calculado automaticamente
  
  // Hóspedes
  guests: {
    adults: number;
    children: number;
    infants: number;
    pets: number;
    total: number;
  };
  
  // Precificação
  pricing: {
    pricePerNight: number;       // Em centavos
    baseTotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    discount: number;
    total: number;
    currency: 'BRL' | 'USD' | 'EUR';
    appliedTier: 'base' | 'weekly' | 'biweekly' | 'monthly';
  };
  
  // Status
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'completed' | 'cancelled' | 'no_show';
  
  // Plataforma
  platform: 'airbnb' | 'booking' | 'decolar' | 'direct' | 'other';
  externalId?: string;           // ID na plataforma externa
  
  // Pagamento
  payment: {
    status: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
    method?: 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer' | 'cash' | 'platform';
    transactionId?: string;
  };
  
  // Observações
  notes?: string;                // Visível para hóspede
  internalComments?: string;     // Apenas interno
  
  // Metadados
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  confirmedAt?: string;
  cancelledAt?: string;
}
```

### 3️⃣ **HÓSPEDES (Guests)**

```typescript
interface Guest {
  id: string;                    // Código único: "GST-XXXXXX"
  
  // Dados pessoais
  firstName: string;
  lastName: string;
  fullName: string;              // Concatenação automática
  email: string;
  phone?: string;
  
  // Documentos
  cpf?: string;                  // Brasil
  passport?: string;             // Internacional
  
  // Estatísticas
  stats: {
    totalReservations: number;
    totalNights: number;
    totalSpent: number;          // Em centavos
  };
  
  // Tags e classificação
  tags: string[];                // ['vip', 'frequente', 'problematico']
  isBlacklisted: boolean;
  
  // Metadados
  createdAt: string;
  updatedAt: string;
  source: 'airbnb' | 'booking' | 'decolar' | 'direct' | 'other';
}
```

### 4️⃣ **BLOQUEIOS (Blocks)**

```typescript
interface Block {
  id: string;
  propertyId: string;
  
  // Período
  startDate: string;             // YYYY-MM-DD
  endDate: string;               // YYYY-MM-DD
  
  // Motivo
  reason: 'maintenance' | 'personal_use' | 'other';
  notes?: string;
  
  // Metadados
  createdAt: string;
  createdBy: string;
}
```

### 5️⃣ **TRANSAÇÕES FINANCEIRAS**

```typescript
interface Transaction {
  id: string;
  
  // Tipo
  type: 'income' | 'expense';
  category: string;              // Ex: 'reserva', 'manutencao', 'limpeza'
  
  // Valores
  amount: number;                // Em centavos
  currency: 'BRL' | 'USD' | 'EUR';
  
  // Relacionamentos
  reservationId?: string;
  propertyId?: string;
  
  // Datas
  date: string;                  // Data da transação
  dueDate?: string;              // Data de vencimento
  paidAt?: string;               // Data do pagamento
  
  // Status
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  
  // Detalhes
  description: string;
  paymentMethod?: string;
  
  // Metadados
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔌 ENDPOINTS NECESSÁRIOS

### **PROPRIEDADES**

#### `GET /api/properties`
Lista todas as propriedades

**Query Params:**
- `status` (optional): `active`, `inactive`, `maintenance`, `draft`
- `page` (optional): número da página
- `limit` (optional): itens por página

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "PRP-A1B2C3",
      "name": "Apartamento Copacabana 201",
      "code": "COP201",
      "type": "apartment",
      "status": "active",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### `GET /api/properties/:id`
Busca uma propriedade específica

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "PRP-A1B2C3",
    "name": "Apartamento Copacabana 201",
    ...
  }
}
```

#### `POST /api/properties`
Cria nova propriedade

**Body:**
```json
{
  "name": "Meu Apartamento",
  "code": "MEU001",
  "type": "apartment",
  "address": { ... },
  "pricing": { ... },
  ...
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "PRP-D4E5F6",
    ...
  }
}
```

#### `PUT /api/properties/:id`
Atualiza propriedade

**Body:** (campos a atualizar)

#### `DELETE /api/properties/:id`
Remove propriedade

---

### **RESERVAS**

#### `GET /api/reservations`
Lista todas as reservas

**Query Params:**
- `propertyId` (optional)
- `status` (optional)
- `startDate` (optional): filtrar a partir de
- `endDate` (optional): filtrar até
- `page`, `limit`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "RSV-M1N2O3",
      "propertyId": "PRP-A1B2C3",
      "guestId": "GST-X1Y2Z3",
      "checkIn": "2025-11-10",
      "checkOut": "2025-11-13",
      ...
    }
  ]
}
```

#### `POST /api/reservations`
Cria nova reserva

**Body:**
```json
{
  "propertyId": "PRP-A1B2C3",
  "guestId": "GST-X1Y2Z3",
  "checkIn": "2025-11-10",
  "checkOut": "2025-11-13",
  "guests": {
    "adults": 2,
    "children": 0,
    "infants": 0,
    "pets": 0
  },
  "platform": "direct"
}
```

**Response:** Nova reserva criada

#### `PUT /api/reservations/:id`
Atualiza reserva

#### `DELETE /api/reservations/:id`
Cancela reserva

---

### **HÓSPEDES**

#### `GET /api/guests`
Lista hóspedes

#### `GET /api/guests/:id`
Busca hóspede específico

#### `POST /api/guests`
Cria novo hóspede

**Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "email": "joao@email.com",
  "phone": "+5521987654321"
}
```

#### `PUT /api/guests/:id`
Atualiza hóspede

---

### **CALENDÁRIO**

#### `GET /api/calendar`
Busca disponibilidade

**Query Params:**
- `propertyId` (optional)
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD

**Response:**
```json
{
  "success": true,
  "data": {
    "reservations": [...],
    "blocks": [...]
  }
}
```

#### `POST /api/blocks`
Cria bloqueio

**Body:**
```json
{
  "propertyId": "PRP-A1B2C3",
  "startDate": "2025-12-01",
  "endDate": "2025-12-05",
  "reason": "maintenance",
  "notes": "Pintura do apartamento"
}
```

---

### **FINANÇAS**

#### `GET /api/transactions`
Lista transações

**Query Params:**
- `type`: `income`, `expense`
- `startDate`, `endDate`
- `propertyId` (optional)
- `status` (optional)

#### `POST /api/transactions`
Cria transação

#### `GET /api/reports/dre`
Relatório DRE (Demonstração de Resultados)

**Query Params:**
- `startDate`, `endDate`

**Response:**
```json
{
  "success": true,
  "data": {
    "receitas": 150000,
    "despesas": 45000,
    "lucro": 105000,
    "detalhamento": { ... }
  }
}
```

#### `GET /api/reports/fluxo-caixa`
Relatório de Fluxo de Caixa

---

### **CONFIGURAÇÕES**

#### `GET /api/settings`
Busca configurações da organização

#### `PUT /api/settings`
Atualiza configurações

---

## 🔐 AUTENTICAÇÃO

### Sugestão: JWT Bearer Token

**Headers necessários:**
```
Authorization: Bearer <token>
```

**Login:**
```
POST /api/auth/login
Body: { "email": "user@email.com", "password": "****" }
Response: { "token": "...", "user": { ... } }
```

---

## 📊 FORMATOS PADRÃO

### Datas
- Sempre **ISO 8601**: `2025-11-01T14:30:00Z`
- Datas sem hora: `YYYY-MM-DD`

### Valores Monetários
- Sempre em **centavos** (integer)
- Exemplo: R$ 350,00 = `35000`

### IDs
- Formato: `PREFIX-XXXXXX` (6 caracteres alfanuméricos)
- Prefixes:
  - `PRP-` = Property
  - `RSV-` = Reservation
  - `GST-` = Guest
  - `BLK-` = Block
  - `TXN-` = Transaction

### Códigos HTTP
- `200` - Sucesso
- `201` - Criado
- `400` - Erro de validação
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Não encontrado
- `500` - Erro no servidor

---

## 🚀 IMPLEMENTAÇÃO SUGERIDA

### Opção 1: Node.js + Express
```bash
npm install express mongoose jsonwebtoken bcrypt
```

### Opção 2: Python + FastAPI
```bash
pip install fastapi uvicorn sqlalchemy pydantic
```

### Opção 3: PHP + Laravel
```bash
composer create-project laravel/laravel rendizy-backend
```

### Opção 4: Ruby on Rails
```bash
rails new rendizy-backend --api
```

---

## 📝 EXEMPLO DE IMPLEMENTAÇÃO (Node.js)

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Properties
app.get('/api/properties', async (req, res) => {
  // Buscar do banco
  const properties = await db.properties.find({});
  res.json({ success: true, data: properties });
});

app.post('/api/properties', async (req, res) => {
  const property = await db.properties.create({
    id: generateId('PRP'),
    ...req.body,
    createdAt: new Date().toISOString()
  });
  res.status(201).json({ success: true, data: property });
});

// ... outras rotas

app.listen(3000, () => {
  console.log('API rodando na porta 3000');
});
```

---

## 🎯 PRÓXIMOS PASSOS

1. **Escolher tecnologia** (Node.js, Python, PHP, etc)
2. **Configurar banco de dados** (PostgreSQL, MySQL, MongoDB)
3. **Implementar endpoints** seguindo esta documentação
4. **Testar com Postman/Insomnia**
5. **Conectar frontend** (mudar URLs em `/utils/api.ts`)

---

## 📞 TESTANDO O FRONTEND SEM BACKEND

O frontend já funciona 100% com **mock backend** em:
- `/utils/mockBackend.ts`

Todas as operações funcionam localmente usando `localStorage`.

Quando o backend estiver pronto:
1. Configure a URL em `/utils/api.ts`
2. Descomente as chamadas reais de API
3. Teste gradualmente substituindo mock por APIs reais

---

**FIM DA DOCUMENTAÇÃO** ✅

Esta documentação cobre 100% das necessidades do RENDIZY.
Implemente o backend na plataforma que preferir!
