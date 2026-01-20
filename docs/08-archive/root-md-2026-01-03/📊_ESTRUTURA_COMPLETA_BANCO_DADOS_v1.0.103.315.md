# 📊 ESTRUTURA COMPLETA DO BANCO DE DADOS - RENDIZY

## 🎯 ARQUITETURA: KV STORE (KEY-VALUE)

### Tabela Única: `kv_store_67caf26a`

```sql
CREATE TABLE kv_store_67caf26a (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🗂️ TODAS AS ENTIDADES SALVAS

### 1. **ORGANIZAÇÕES (Multi-Tenant)**
```
PREFIX: org_
EXEMPLO: org_123e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "org_123e4567-e89b-12d3-a456-426614174000",
  "name": "Imobiliária Paraíso Ltda",
  "subdomain": "paraiso",
  "cnpj": "12.345.678/0001-90",
  "settings": {
    "theme": "light",
    "language": "pt-BR"
  },
  "createdAt": "2025-11-05T10:30:00Z"
}
```

### 2. **USUÁRIOS**
```
PREFIX: user_
EXEMPLO: user_789e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "user_789e4567-e89b-12d3-a456-426614174000",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "email": "admin@paraiso.com",
  "name": "João Silva",
  "role": "admin",
  "permissions": ["properties.read", "properties.write"],
  "createdAt": "2025-11-05T10:35:00Z"
}
```

### 3. **IMÓVEIS (Properties)**
```
PREFIX: acc_
EXEMPLO: acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1

ESTRUTURA (UNIFICADA v1.0.103.315):
{
  // ========== CAMPOS RAIZ (NORMALIZADOS) ==========
  "id": "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  "shortId": "H3K9P2",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Campos normalizados do wizard
  "name": "Casa da Praia",
  "photos": [
    "https://supabase.co/storage/v1/object/photo1.jpg",
    "https://supabase.co/storage/v1/object/photo2.jpg",
    "https://supabase.co/storage/v1/object/photo3.jpg"
  ],
  "coverPhoto": "https://supabase.co/storage/v1/object/photo1.jpg",
  "locationAmenities": [
    "beach_nearby",
    "restaurant_nearby",
    "supermarket_nearby"
  ],
  "listingAmenities": [
    "wifi",
    "pool",
    "air_conditioning"
  ],
  "address": "Rua das Flores, 123",
  "description": "Linda casa à beira-mar...",
  "rooms": [
    {
      "type": "bedroom",
      "quantity": 3,
      "beds": [
        { "type": "queen", "quantity": 2 },
        { "type": "single", "quantity": 1 }
      ]
    },
    {
      "type": "bathroom",
      "quantity": 2
    }
  ],
  
  // ========== ESTRUTURA WIZARD (ORIGINAL) ==========
  "contentType": {
    "internalName": "Casa da Praia",
    "propertyTypeId": "type_beach_house",
    "category": "residential"
  },
  "contentPhotos": {
    "photos": [
      {
        "url": "https://supabase.co/storage/v1/object/photo1.jpg",
        "isCover": true
      },
      {
        "url": "https://supabase.co/storage/v1/object/photo2.jpg",
        "isCover": false
      }
    ]
  },
  "contentLocationAmenities": {
    "amenities": ["beach_nearby", "restaurant_nearby"]
  },
  "contentPropertyAmenities": {
    "listingAmenities": ["wifi", "pool", "air_conditioning"]
  },
  "contentLocation": {
    "address": "Rua das Flores, 123",
    "city": "Florianópolis",
    "state": "SC",
    "zipCode": "88000-000"
  },
  "contentDescription": {
    "fixedFields": {
      "description": "Linda casa à beira-mar..."
    }
  },
  "contentRooms": {
    "rooms": [...]
  },
  
  // ========== DADOS FINANCEIROS ==========
  "financialIndividualPricing": {
    "basePrice": 500,
    "weekendPrice": 700,
    "cleaningFee": 150,
    "extraGuestFee": 50
  },
  
  // ========== CONFIGURAÇÕES ==========
  "settingsRules": {
    "checkInTime": "15:00",
    "checkOutTime": "11:00",
    "minNights": 2,
    "maxGuests": 8,
    "petFriendly": true,
    "smokingAllowed": false
  },
  
  // ========== METADATA ==========
  "status": "active",
  "createdAt": "2025-11-05T11:00:00Z",
  "updatedAt": "2025-11-05T14:30:00Z"
}
```

### 4. **RESERVAS (Reservations)**
```
PREFIX: res_
EXEMPLO: res_456e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "res_456e4567-e89b-12d3-a456-426614174000",
  "shortId": "R5K9P2",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "propertyId": "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  
  // Dados da reserva
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-27",
  "nights": 7,
  
  // Dados do hóspede
  "guestName": "Maria Santos",
  "guestEmail": "maria@email.com",
  "guestPhone": "+5548999887766",
  "adults": 4,
  "children": 2,
  "pets": 1,
  
  // Valores
  "totalAmount": 4200,
  "baseAmount": 3500,
  "cleaningFee": 150,
  "extraGuestFee": 100,
  "taxes": 450,
  
  // Status e origem
  "status": "confirmed",
  "source": "direct",
  "channel": "website",
  
  // Metadata
  "createdAt": "2025-11-05T09:00:00Z",
  "updatedAt": "2025-11-05T09:15:00Z"
}
```

### 5. **BLOQUEIOS (Blocks)**
```
PREFIX: block_
EXEMPLO: block_789e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "block_789e4567-e89b-12d3-a456-426614174000",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "propertyId": "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  
  // Período
  "startDate": "2025-12-01",
  "endDate": "2025-12-15",
  
  // Motivo
  "reason": "Manutenção programada",
  "type": "maintenance",
  
  // Metadata
  "createdAt": "2025-11-05T10:00:00Z"
}
```

### 6. **TIPOS DE IMÓVEIS (Property Types)**
```
PREFIX: type_
EXEMPLO: type_beach_house

ESTRUTURA:
{
  "id": "type_beach_house",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "name": {
    "pt-BR": "Casa de Praia",
    "en": "Beach House",
    "es": "Casa de Playa"
  },
  "category": "residential",
  "icon": "🏖️",
  "isDefault": false,
  "createdAt": "2025-11-05T08:00:00Z"
}
```

### 7. **AMENIDADES DE LOCALIZAÇÃO**
```
PREFIX: location_amenity_
EXEMPLO: location_amenity_beach_nearby

ESTRUTURA:
{
  "id": "location_amenity_beach_nearby",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "name": {
    "pt-BR": "Praia Próxima",
    "en": "Beach Nearby",
    "es": "Playa Cercana"
  },
  "category": "leisure",
  "icon": "🏖️",
  "distance": 200,
  "distanceUnit": "meters",
  "createdAt": "2025-11-05T08:00:00Z"
}
```

### 8. **AMENIDADES DO IMÓVEL**
```
PREFIX: listing_amenity_
EXEMPLO: listing_amenity_wifi

ESTRUTURA:
{
  "id": "listing_amenity_wifi",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "name": {
    "pt-BR": "Wi-Fi",
    "en": "Wi-Fi",
    "es": "Wi-Fi"
  },
  "category": "internet",
  "icon": "📶",
  "isEssential": true,
  "createdAt": "2025-11-05T08:00:00Z"
}
```

### 9. **HÓSPEDES (Guests)**
```
PREFIX: guest_
EXEMPLO: guest_321e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "guest_321e4567-e89b-12d3-a456-426614174000",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Dados pessoais
  "name": "Pedro Oliveira",
  "email": "pedro@email.com",
  "phone": "+5548998776655",
  "cpf": "123.456.789-00",
  "birthDate": "1985-05-15",
  
  // Endereço
  "address": "Rua das Palmeiras, 456",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01234-567",
  
  // Histórico
  "totalReservations": 5,
  "totalSpent": 12500,
  "lastReservation": "2025-10-15",
  
  // Tags
  "tags": ["vip", "frequent"],
  
  // Metadata
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-11-05T10:00:00Z"
}
```

### 10. **PROPRIETÁRIOS (Owners)**
```
PREFIX: owner_
EXEMPLO: owner_654e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "owner_654e4567-e89b-12d3-a456-426614174000",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Dados pessoais
  "name": "Ana Costa",
  "email": "ana@email.com",
  "phone": "+5548997665544",
  "cpfCnpj": "987.654.321-00",
  
  // Dados bancários
  "bankAccount": {
    "bank": "001",
    "agency": "1234",
    "account": "12345-6",
    "accountType": "checking",
    "pixKey": "ana@email.com"
  },
  
  // Comissão
  "commissionPercentage": 20,
  
  // Imóveis
  "properties": [
    "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1"
  ],
  
  // Metadata
  "createdAt": "2025-01-10T10:00:00Z"
}
```

### 11. **CONVERSAS WHATSAPP (Chats)**
```
PREFIX: chat_
EXEMPLO: chat_5511999887766

ESTRUTURA:
{
  "id": "chat_5511999887766",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Dados do contato
  "contactId": "5511999887766@c.us",
  "contactName": "Carlos Mendes",
  "contactPhone": "+5511999887766",
  
  // Status
  "unreadCount": 3,
  "lastMessage": "Ainda tem vaga para Ano Novo?",
  "lastMessageTime": "2025-11-05T15:30:00Z",
  "lastMessageFromMe": false,
  
  // Classificação
  "tags": ["lead", "high_priority"],
  "assignedTo": "user_789e4567-e89b-12d3-a456-426614174000",
  "status": "active",
  
  // Integração
  "source": "evolution_api",
  "instanceId": "rendizy_main",
  
  // Metadata
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-05T15:30:00Z"
}
```

### 12. **MENSAGENS WHATSAPP (Messages)**
```
PREFIX: msg_
EXEMPLO: msg_147e4567-e89b-12d3-a456-426614174000

ESTRUTURA:
{
  "id": "msg_147e4567-e89b-12d3-a456-426614174000",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "chatId": "chat_5511999887766",
  
  // Conteúdo
  "body": "Olá! Gostaria de saber sobre disponibilidade.",
  "type": "text",
  "timestamp": "2025-11-05T14:30:00Z",
  
  // Remetente
  "fromMe": false,
  "from": "5511999887766@c.us",
  
  // Status
  "ack": 3,
  "read": true,
  
  // Mídia (se houver)
  "hasMedia": false,
  "mediaUrl": null,
  "mimetype": null,
  
  // Metadata
  "createdAt": "2025-11-05T14:30:00Z"
}
```

### 13. **TEMPLATES WHATSAPP**
```
PREFIX: template_
EXEMPLO: template_welcome

ESTRUTURA:
{
  "id": "template_welcome",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Dados do template
  "name": "Boas-vindas",
  "category": "greeting",
  "content": "Olá {{name}}! Bem-vindo à {{company}}. Como posso ajudar?",
  
  // Variáveis
  "variables": ["name", "company"],
  
  // Configurações
  "isActive": true,
  "usageCount": 245,
  
  // Metadata
  "createdAt": "2025-01-01T10:00:00Z",
  "updatedAt": "2025-11-05T10:00:00Z"
}
```

### 14. **CONFIGURAÇÕES GLOBAIS**
```
PREFIX: setting_
EXEMPLO: setting_global

ESTRUTURA:
{
  "id": "setting_global",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Configurações gerais
  "companyName": "Imobiliária Paraíso",
  "companyLogo": "https://supabase.co/storage/v1/object/logo.png",
  "primaryColor": "#667eea",
  "secondaryColor": "#764ba2",
  
  // Configurações de email
  "emailFrom": "contato@paraiso.com",
  "emailSignature": "Equipe Paraíso",
  
  // Configurações de reserva
  "defaultCheckInTime": "15:00",
  "defaultCheckOutTime": "11:00",
  "defaultMinNights": 2,
  
  // Integrations
  "bookingComEnabled": true,
  "airbnbEnabled": false,
  "evolutionApiEnabled": true,
  
  // Metadata
  "updatedAt": "2025-11-05T10:00:00Z"
}
```

### 15. **PREÇOS SAZONAIS (Seasonal Pricing)**
```
PREFIX: seasonal_
EXEMPLO: seasonal_summer_2025

ESTRUTURA:
{
  "id": "seasonal_summer_2025",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "propertyId": "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  
  // Período
  "startDate": "2025-12-20",
  "endDate": "2026-03-20",
  "name": "Verão 2025/2026",
  
  // Preços
  "weekdayPrice": 800,
  "weekendPrice": 1200,
  "minNights": 3,
  
  // Metadata
  "createdAt": "2025-10-01T10:00:00Z"
}
```

### 16. **INTEGRAÇÕES EXTERNAS**
```
PREFIX: integration_
EXEMPLO: integration_bookingcom_main

ESTRUTURA:
{
  "id": "integration_bookingcom_main",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  
  // Tipo
  "type": "booking.com",
  "provider": "booking",
  
  // Credenciais (criptografadas)
  "credentials": {
    "hotelId": "123456",
    "apiKey": "encrypted_key_here"
  },
  
  // Status
  "isActive": true,
  "lastSync": "2025-11-05T15:00:00Z",
  "lastSyncStatus": "success",
  
  // Mapeamento de imóveis
  "propertyMappings": {
    "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1": "room_123"
  },
  
  // Metadata
  "createdAt": "2025-09-01T10:00:00Z",
  "updatedAt": "2025-11-05T15:00:00Z"
}
```

### 17. **SITES DE CLIENTES**
```
PREFIX: site_
EXEMPLO: site_paraiso_beach_house

ESTRUTURA:
{
  "id": "site_paraiso_beach_house",
  "organizationId": "org_123e4567-e89b-12d3-a456-426614174000",
  "propertyId": "acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1",
  
  // Configuração
  "template": "site-moderno",
  "domain": "casadapraia.paraisoimoveis.com.br",
  "customDomain": "casadapraia.com.br",
  
  // Conteúdo personalizado
  "heroTitle": "Casa da Praia - Seu refúgio perfeito",
  "heroSubtitle": "Aconchego à beira-mar",
  "customSections": [
    {
      "type": "gallery",
      "title": "Galeria",
      "photos": [...]
    }
  ],
  
  // SEO
  "metaTitle": "Casa da Praia - Aluguel de Temporada",
  "metaDescription": "Linda casa à beira-mar...",
  
  // Status
  "isPublished": true,
  "publishedAt": "2025-11-01T10:00:00Z",
  
  // Analytics
  "visits": 1245,
  "conversions": 23,
  
  // Metadata
  "createdAt": "2025-10-15T10:00:00Z",
  "updatedAt": "2025-11-05T10:00:00Z"
}
```

---

## 🔑 SISTEMA DE PREFIXOS (KEYS)

```
┌─────────────────────────────────────────────────────────┐
│                  PREFIXOS DE CHAVE                      │
├─────────────────────────────────────────────────────────┤
│ org_          → Organizações                            │
│ user_         → Usuários                                │
│ acc_          → Imóveis (Accommodations)                │
│ res_          → Reservas                                │
│ block_        → Bloqueios                               │
│ type_         → Tipos de Imóveis                        │
│ location_     → Amenidades de Localização               │
│ listing_      → Amenidades do Imóvel                    │
│ guest_        → Hóspedes                                │
│ owner_        → Proprietários                           │
│ chat_         → Conversas WhatsApp                      │
│ msg_          → Mensagens WhatsApp                      │
│ template_     → Templates WhatsApp                      │
│ setting_      → Configurações                           │
│ seasonal_     → Preços Sazonais                         │
│ integration_  → Integrações Externas                    │
│ site_         → Sites de Clientes                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 COMO OS DADOS SÃO SALVOS

### Função KV Store (`kv_store.tsx`)

```typescript
// SET - Salvar um item
await kv.set('acc_97239cad', {
  id: 'acc_97239cad',
  name: 'Casa da Praia',
  photos: [...]
});

// GET - Buscar um item
const property = await kv.get('acc_97239cad');

// MGET - Buscar múltiplos itens
const properties = await kv.mget([
  'acc_97239cad',
  'acc_12345678'
]);

// GET BY PREFIX - Buscar todos com prefixo
const allProperties = await kv.getByPrefix('acc_');

// DELETE - Deletar um item
await kv.del('acc_97239cad');

// MDELETE - Deletar múltiplos
await kv.mdel([
  'acc_97239cad',
  'acc_12345678'
]);
```

---

## 🔍 EXEMPLOS REAIS DE QUERIES

### 1. Buscar todos os imóveis de uma organização
```typescript
// Buscar todos com prefixo acc_
const allAccs = await kv.getByPrefix('acc_');

// Filtrar por organização
const orgProperties = allAccs.filter(
  acc => acc.organizationId === 'org_123e4567'
);
```

### 2. Buscar reservas de um imóvel
```typescript
// Buscar todas as reservas
const allReservations = await kv.getByPrefix('res_');

// Filtrar por imóvel
const propertyReservations = allReservations.filter(
  res => res.propertyId === 'acc_97239cad'
);
```

### 3. Buscar conversas com mensagens não lidas
```typescript
// Buscar todos os chats
const allChats = await kv.getByPrefix('chat_');

// Filtrar por não lidas
const unreadChats = allChats.filter(
  chat => chat.unreadCount > 0
);
```

---

## 🎨 ESTRUTURA VISUAL DA TABELA

```
┌──────────────────────────────────────────────────────────────────┐
│                    kv_store_67caf26a                             │
├──────────────────────────┬───────────────────────────────────────┤
│ KEY (TEXT)               │ VALUE (JSONB)                         │
├──────────────────────────┼───────────────────────────────────────┤
│ org_123e4567             │ {"id":"org_123e4567","name":"..."}    │
│ user_789e4567            │ {"id":"user_789e4567","email":"..."}  │
│ acc_97239cad             │ {"id":"acc_97239cad","name":"..."}    │
│ acc_12345678             │ {"id":"acc_12345678","name":"..."}    │
│ res_456e4567             │ {"id":"res_456e4567","checkIn":"..."} │
│ res_987e4567             │ {"id":"res_987e4567","checkIn":"..."} │
│ block_789e4567           │ {"id":"block_789e4567","reason":"..."} │
│ type_beach_house         │ {"id":"type_beach_house","name":"..."} │
│ guest_321e4567           │ {"id":"guest_321e4567","name":"..."}  │
│ chat_5511999887766       │ {"id":"chat_5511999887766","..."}     │
│ setting_global           │ {"id":"setting_global","..."}         │
└──────────────────────────┴───────────────────────────────────────┘
```

---

## 💡 VANTAGENS DO KV STORE

### ✅ Simplicidade
- Uma única tabela
- Sem migrations complexas
- Fácil de entender

### ✅ Flexibilidade
- Schema dinâmico (JSONB)
- Fácil adicionar campos
- Versionamento simples

### ✅ Performance
- Índice em `key` (PRIMARY KEY)
- Busca O(1) por chave
- Busca por prefixo eficiente

### ✅ Multi-Tenancy
- Isolamento por `organizationId`
- Fácil filtrar dados
- Escalável

---

## 🚨 IMPORTANTE: ISOLAMENTO MULTI-TENANT

### REGRA DE OURO:
**Todo dado salvo DEVE ter `organizationId`!**

### Exemplo CORRETO:
```typescript
await kv.set('acc_97239cad', {
  id: 'acc_97239cad',
  organizationId: 'org_123e4567',  // ✅ OBRIGATÓRIO
  name: 'Casa da Praia'
});
```

### Exemplo ERRADO:
```typescript
await kv.set('acc_97239cad', {
  id: 'acc_97239cad',
  // ❌ FALTOU organizationId
  name: 'Casa da Praia'
});
```

---

## 📊 ESTATÍSTICAS DO BANCO

### Dados Atuais (Exemplo):
```
Total de registros: ~250

Por tipo:
- Organizações: 1
- Usuários: 3
- Imóveis: 10
- Reservas: 45
- Bloqueios: 12
- Tipos de Imóveis: 8
- Amenidades: 50
- Hóspedes: 35
- Chats: 67
- Mensagens: 1.234
- Configurações: 5
- Outros: 30
```

---

## 🔧 TROUBLESHOOTING

### Problema: Não encontro meu imóvel
```typescript
// Verificar se existe
const property = await kv.get('acc_97239cad');
console.log('Property:', property);

// Listar todos os imóveis
const all = await kv.getByPrefix('acc_');
console.log('All properties:', all.map(p => p.id));
```

### Problema: Dados parecem desatualizados
```sql
-- Ver quando foi atualizado
SELECT key, updated_at 
FROM kv_store_67caf26a 
WHERE key = 'acc_97239cad';
```

### Problema: Quero ver estrutura de um dado
```typescript
const data = await kv.get('acc_97239cad');
console.log(JSON.stringify(data, null, 2));
```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `supabase/functions/server/kv_store.tsx` - Funções KV
- `supabase/functions/server/routes-properties.ts` - CRUD de imóveis
- `supabase/functions/server/types.ts` - Tipos TypeScript
- `docs/QUICK_GUIDE_SUPABASE_TABELA.md` - Guia rápido

---

**VERSÃO:** v1.0.103.315  
**DATA:** 05/11/2025  
**DOCUMENTADO POR:** Sistema RENDIZY
