# 🔍 Pesquisa: Arquitetura de Sites de Clientes (Multi-Tenant)

**Data:** 2025-12-02  
**Objetivo:** Entender como Jetimob, Stays.net, Bolt e similares servem sites customizados atrelados ao backend

---

## 📋 Referências Analisadas

### 1. **Jetimob** (https://www.jetimob.com)
- **Sistema:** CRM + ERP + Site Imobiliário integrado
- **Arquitetura:** Sistema multi-tenant onde cada cliente tem:
  - Site próprio (white label)
  - Integração com portais (ZAP, VivaReal, etc)
  - Backend unificado
  - Gestão de imóveis centralizada

### 2. **Stays.net** (https://stays.net)
- **Sistema:** PMS (Property Management System) para aluguel por temporada
- **Funcionalidades:**
  - Site próprio para cada cliente
  - Motor de reservas integrado
  - Publicação automática em portais (Airbnb, Booking.com)
  - Gestão financeira e operacional
- **Arquitetura:** Cada cliente tem subdomínio próprio com site customizado

### 3. **Bolt.dev**
- **Plataforma:** Criador de sites com backend integrado
- **Funcionalidade:** 
  - Cria site + backend automaticamente
  - Domínio próprio: `{projeto}-{id}.bolt.host`
  - Backend API integrado ao site
  - Deploy automático

---

## 🏗️ Arquitetura Comum: Multi-Tenant com Subdomínios

### Padrão Identificado:

```
┌─────────────────────────────────────────────────┐
│           Backend Unificado (RENDIZY)          │
│  ┌──────────────────────────────────────────┐  │
│  │  Edge Function / API Gateway             │  │
│  │  - Detecta subdomain do request         │  │
│  │  - Roteia para tenant correto           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Database (PostgreSQL)                   │  │
│  │  - organizations (tenants)              │  │
│  │  - client_sites (configurações)         │  │
│  │  - properties (imóveis por tenant)       │  │
│  │  - reservations (reservas por tenant)    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Storage (Supabase Storage)              │  │
│  │  - client-sites/{org_id}/site.zip        │  │
│  │  - client-sites/{org_id}/assets/        │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │
         │ HTTP Request
         │ Host: medhome.rendizy.app
         │
         ▼
┌─────────────────────────────────────────────────┐
│         Frontend (Site do Cliente)              │
│  ┌──────────────────────────────────────────┐  │
│  │  medhome.rendizy.app                     │  │
│  │  - HTML extraído do ZIP                  │  │
│  │  - Assets servidos do ZIP               │  │
│  │  - API: /api/medhome/properties         │  │
│  │  - Motor de reservas integrado          │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🔑 Componentes Essenciais de um Motor de Reservas

### 1. **Frontend (Site do Cliente)**
- ✅ HTML/CSS/JS servidos do ZIP (já implementado)
- ✅ Formulário de busca (cidade, check-in, check-out, hóspedes)
- ✅ Listagem de propriedades
- ✅ Página de detalhes da propriedade
- ✅ Sistema de reservas online
- ✅ Integração com WhatsApp/Contato

### 2. **Backend API (RENDIZY)**
- ✅ API pública de propriedades: `/api/:subdomain/properties` (já implementado)
- ⚠️ **FALTA:** API de disponibilidade (verificar conflitos de reservas)
- ⚠️ **FALTA:** API de criação de reservas
- ⚠️ **FALTA:** API de cálculo de preços (precificação dinâmica)
- ⚠️ **FALTA:** API de pagamento (integração com gateway)

### 3. **Motor de Reservas (Core)**
```
┌─────────────────────────────────────┐
│  1. Busca de Disponibilidade        │
│     - Verifica conflitos no calendário │
│     - Aplica regras (min. noites)   │
│     - Calcula preço final           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. Criação de Reserva              │
│     - Valida disponibilidade        │
│     - Cria registro em 'reservations'│
│     - Bloqueia período no calendário│
│     - Envia confirmação             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. Processamento de Pagamento      │
│     - Integração com gateway        │
│     - Webhook de confirmação        │
│     - Atualiza status da reserva    │
└─────────────────────────────────────┘
```

---

## 🎯 O Que Precisamos Implementar no RENDIZY

### Fase 1: Site Funcional (ATUAL - em progresso)
- ✅ Servir HTML do ZIP
- ✅ Servir assets (JS/CSS/imagens)
- ✅ API pública de propriedades
- ⚠️ **FALTA:** Corrigir Content-Type dos assets JS

### Fase 2: Motor de Reservas Básico
- ⚠️ **FALTA:** API de disponibilidade (`/api/:subdomain/availability`)
- ⚠️ **FALTA:** API de busca (`/api/:subdomain/search`)
- ⚠️ **FALTA:** API de criação de reserva (`/api/:subdomain/reservations`)
- ⚠️ **FALTA:** Integração do formulário de busca do site com a API

### Fase 3: Funcionalidades Avançadas
- ⚠️ **FALTA:** Precificação dinâmica (preços por período)
- ⚠️ **FALTA:** Regras de negócio (min. noites, restrições)
- ⚠️ **FALTA:** Sistema de pagamento
- ⚠️ **FALTA:** Confirmação automática de reservas
- ⚠️ **FALTA:** Notificações (email, WhatsApp)

---

## 🏛️ Arquitetura de Subdomínios (Como Implementar)

### Opção 1: Wildcard DNS + Edge Function (Recomendado)
```
DNS:
*.rendizy.app → CNAME → Supabase Edge Function

Edge Function:
1. Extrai subdomain do header Host
2. Busca configuração do site no SQL
3. Serve HTML/assets ou roteia para API
```

### Opção 2: Reverse Proxy (Nginx/Cloudflare)
```
Nginx/Cloudflare:
- Detecta subdomain
- Proxy para Supabase Edge Function
- Cache de assets estáticos
```

### Opção 3: CDN + Edge Functions (Supabase)
```
Supabase Edge Functions:
- Rota /serve/* detecta subdomain
- Serve site do tenant correto
- Assets servidos do Storage
```

**✅ ATUAL:** Estamos usando Opção 3 (Supabase Edge Functions)

---

## 📊 Comparação: Jetimob vs Stays.net vs RENDIZY

| Funcionalidade | Jetimob | Stays.net | RENDIZY (Atual) | RENDIZY (Meta) |
|----------------|---------|-----------|-----------------|----------------|
| Site White Label | ✅ | ✅ | ✅ | ✅ |
| Motor de Reservas | ✅ | ✅ | ❌ | ✅ |
| Integração Portais | ✅ | ✅ | ❌ | ⚠️ Futuro |
| Gestão Financeira | ✅ | ✅ | ✅ | ✅ |
| CRM | ✅ | ❌ | ✅ | ✅ |
| Multi-tenant | ✅ | ✅ | ✅ | ✅ |

---

## 🚀 Próximos Passos para RENDIZY

### 1. Corrigir Content-Type dos Assets (URGENTE)
- Problema: JS sendo servido como `text/plain`
- Solução: Usar `c.body()` com headers explícitos ou `new Response()`

### 2. Implementar Motor de Reservas Básico
```typescript
// API de Disponibilidade
GET /api/:subdomain/availability
  ?property_id=xxx
  &check_in=2025-12-10
  &check_out=2025-12-15
  
// API de Busca
GET /api/:subdomain/search
  ?city=São Paulo
  &check_in=2025-12-10
  &check_out=2025-12-15
  &guests=2

// API de Reserva
POST /api/:subdomain/reservations
  {
    property_id: "xxx",
    check_in: "2025-12-10",
    check_out: "2025-12-15",
    guests: 2,
    guest_info: {...}
  }
```

### 3. Integrar Site com Backend
- Modificar HTML do site para fazer chamadas à API do RENDIZY
- Substituir dados mock por dados reais da API
- Implementar formulário de busca funcional

---

## 📚 Referências Técnicas

### Arquitetura Multi-Tenant
- **Padrão:** Subdomain-based routing
- **Database:** Row Level Security (RLS) por `organization_id`
- **Storage:** Isolado por `organization_id` ou `client_site_id`

### Motor de Reservas
- **Core:** Verificação de conflitos no calendário
- **Precificação:** Regras dinâmicas (sazonalidade, eventos, etc)
- **Disponibilidade:** Real-time sync entre portais

### Sites White Label
- **Deploy:** ZIP upload → Extract → Serve
- **Assets:** CDN ou Edge Function serving
- **Customização:** Template + Configurações por tenant

---

## ✅ Conclusão

O RENDIZY já tem a base correta:
- ✅ Multi-tenant funcionando
- ✅ Sites servidos do ZIP
- ✅ API pública de propriedades

**Falta implementar:**
- ⚠️ Motor de reservas completo
- ⚠️ Integração site ↔ backend
- ⚠️ Sistema de pagamento

**Próxima ação:** Corrigir Content-Type e depois implementar APIs de reservas.

