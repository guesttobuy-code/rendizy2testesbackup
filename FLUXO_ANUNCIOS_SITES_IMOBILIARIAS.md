# Fluxo Completo: Anúncios nos Sites das Imobiliárias

## 📋 Visão Geral

Este documento explica como os anúncios (propriedades/imóveis) criados no RENDIZY aparecem automaticamente nos sites das imobiliárias.

## 🔄 Fluxo Completo

### 1. Criação de Anúncio (RENDIZY Admin)

**Onde:** Interface RENDIZY → Módulo de Propriedades

**Processo:**
1. Usuário logado como imobiliária (ex: Medhome) cria uma nova propriedade
2. Backend salva no SQL na tabela `properties` com:
   - `organization_id`: ID da organização (ex: Medhome)
   - `status`: "active" (para aparecer no site)
   - Todos os dados do imóvel (nome, endereço, preço, fotos, etc.)

**Rota Backend:**
```
POST /rendizy-server/make-server-67caf26a/properties
```

**Arquivo:** `supabase/functions/rendizy-server/routes-properties.ts`

---

### 2. API Pública para Sites

**Rota:** 
```
GET /rendizy-server/make-server-67caf26a/client-sites/api/:subdomain/properties
```

**Exemplo:**
```
GET /rendizy-server/make-server-67caf26a/client-sites/api/medhome/properties
```

**Como funciona:**
1. Recebe o `subdomain` (ex: "medhome")
2. Busca o site no SQL (`client_sites`) pelo subdomain
3. Obtém o `organization_id` do site
4. Busca todas as propriedades ativas dessa organização
5. Retorna formato JSON otimizado para sites

**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts` (linha ~2449)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Casa na Praia",
      "code": "CASA001",
      "type": "house",
      "status": "active",
      "address": {
        "city": "Rio de Janeiro",
        "state": "RJ",
        "street": "Av. Atlântica",
        "number": "100",
        "zipCode": "22010-000"
      },
      "pricing": {
        "basePrice": 500.00,
        "currency": "BRL"
      },
      "capacity": {
        "bedrooms": 3,
        "bathrooms": 2,
        "maxGuests": 6,
        "area": 120
      },
      "description": "Casa moderna com vista para o mar",
      "photos": ["url1", "url2"],
      "amenities": ["wifi", "parking", "pool"],
      "tags": ["praia", "vista-mar"]
    }
  ],
  "total": 1
}
```

---

### 3. Injeção de Configuração nos Sites

**Onde:** Quando o site é servido via `/serve/:subdomain`

**Processo:**
1. Backend extrai o HTML do ZIP
2. Injeta automaticamente um `<script>` no HTML com:
   - `window.RENDIZY_CONFIG`: Configurações (API URL, subdomain, organization_id)
   - `window.RENDIZY`: Funções auxiliares

**Código injetado:**
```javascript
window.RENDIZY_CONFIG = {
  API_BASE_URL: "https://...supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites",
  SUBDOMAIN: "medhome",
  ORGANIZATION_ID: "uuid-da-organizacao",
  SITE_NAME: "Medhome"
};

window.RENDIZY = {
  // Buscar imóveis da organização
  getProperties: async () => {
    const response = await fetch(
      `${window.RENDIZY_CONFIG.API_BASE_URL}/api/${window.RENDIZY_CONFIG.SUBDOMAIN}/properties`
    );
    return await response.json();
  },
  
  // Verificar disponibilidade
  checkAvailability: async (propertyId, startDate, endDate) => { ... },
  
  // Criar reserva
  createBooking: async (bookingData) => { ... }
};
```

**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts` (linha ~750)

---

### 4. Uso no Site do Cliente

**Como o site usa:**

**Opção 1: JavaScript puro**
```javascript
// No site do cliente (ex: Medhome)
async function loadProperties() {
  const response = await window.RENDIZY.getProperties();
  if (response.success) {
    const properties = response.data;
    // Renderizar propriedades na página
    properties.forEach(property => {
      console.log(property.name, property.pricing.basePrice);
    });
  }
}

loadProperties();
```

**Opção 2: React**
```jsx
import { useEffect, useState } from 'react';

function PropertiesList() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    async function load() {
      const response = await window.RENDIZY.getProperties();
      if (response.success) {
        setProperties(response.data);
      }
    }
    load();
  }, []);

  return (
    <div>
      {properties.map(property => (
        <div key={property.id}>
          <h3>{property.name}</h3>
          <p>R$ {property.pricing.basePrice}/noite</p>
          <img src={property.coverPhoto} alt={property.name} />
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Checklist de Funcionamento

Para garantir que os anúncios apareçam nos sites:

- [x] **API pública implementada** (`/api/:subdomain/properties`)
- [x] **Configuração injetada automaticamente** (`window.RENDIZY`)
- [x] **Propriedades salvas com `organization_id`** no SQL
- [x] **Query SQL corrigida** (campos corretos: `address_zip_code`, `pricing_base_price`)
- [ ] **Testar criação de propriedade** para Medhome
- [ ] **Testar API pública** retornando propriedades
- [ ] **Testar site Medhome** buscando propriedades

---

## 🧪 Como Testar

### 1. Criar Propriedade de Teste

**Via Interface RENDIZY:**
1. Login como Medhome
2. Ir em "Propriedades" → "Nova Propriedade"
3. Preencher dados básicos:
   - Nome: "Casa Teste"
   - Tipo: "Casa"
   - Status: "Ativo"
   - Endereço, preço, fotos, etc.
4. Salvar

**Verificar no SQL:**
```sql
SELECT id, name, code, organization_id, status 
FROM properties 
WHERE organization_id = 'e78c7bb9-7823-44b8-9aee-95c9b073e7b7';
```

### 2. Testar API Pública

**URL:**
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/api/medhome/properties
```

**Via PowerShell:**
```powershell
$response = Invoke-RestMethod -Uri "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/api/medhome/properties" -Method GET
$response | ConvertTo-Json -Depth 10
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Casa Teste",
      ...
    }
  ],
  "total": 1
}
```

### 3. Testar no Site Medhome

**Abrir console do navegador no site Medhome:**
```javascript
// Verificar se configuração foi injetada
console.log(window.RENDIZY_CONFIG);
console.log(window.RENDIZY);

// Buscar propriedades
const response = await window.RENDIZY.getProperties();
console.log(response);
```

---

## 🔧 Troubleshooting

### Problema: API retorna vazio

**Causas possíveis:**
1. Propriedade não está com `status = 'active'`
2. Propriedade não tem `organization_id` correto
3. Site não está ativo (`is_active = true`)

**Solução:**
```sql
-- Verificar propriedades da organização
SELECT id, name, status, organization_id 
FROM properties 
WHERE organization_id = 'e78c7bb9-7823-44b8-9aee-95c9b073e7b7';

-- Verificar site
SELECT subdomain, organization_id, is_active 
FROM client_sites 
WHERE subdomain = 'medhome';
```

### Problema: window.RENDIZY não existe

**Causa:** Script não foi injetado no HTML

**Solução:**
1. Verificar se o site foi servido via `/serve/:subdomain`
2. Verificar logs do backend ao servir o HTML
3. Verificar se o HTML tem `</head>` ou `<body>` para injeção

---

## 📝 Próximas Melhorias

1. **Filtros na API:**
   - Filtrar por tipo (casa, apartamento, etc.)
   - Filtrar por preço (min/max)
   - Filtrar por localização (cidade, estado)
   - Busca por texto (nome, descrição)

2. **Paginação:**
   - Limite atual: 100 propriedades
   - Adicionar `?page=1&limit=20`

3. **Cache:**
   - Cachear resposta da API por alguns minutos
   - Invalidar quando propriedade é criada/atualizada

4. **Webhooks:**
   - Notificar site quando propriedade é criada/atualizada
   - Permitir atualização em tempo real

---

## 🎯 Resumo

**Fluxo em 3 passos:**

1. **Criar** → Propriedade salva no SQL com `organization_id`
2. **Buscar** → API pública retorna propriedades da organização
3. **Exibir** → Site usa `window.RENDIZY.getProperties()` para buscar e renderizar

**Tudo automático!** 🚀



