# 🏠 Roadmap: Área Interna do Cliente (Sites Whitelabel)

> **Versão**: v2.0 (Arquitetura Cápsula)  
> **Data**: 2026-01-13  
> **Autor**: Copilot + Rafael

---

## 📋 Visão Geral

A **Área Interna** é uma seção protegida nos sites dos clientes onde hóspedes logados podem:
- Ver suas reservas (passadas, atuais, futuras)
- Acompanhar status de pagamentos
- Gerenciar dados pessoais
- (Futuro) Baixar vouchers, recibos, comunicar-se com host

### 🏗️ Arquitetura: Cápsula Separada

A área interna é construída como **aplicação separada** que é servida centralmente:

```
┌─────────────────────────────────────────────────────────────┐
│  rendizy2testesbackup.vercel.app/guest-area/               │
│                                                             │
│  Cápsula React standalone:                                  │
│  - Build separado em /public/guest-area/                    │
│  - CSS variables para whitelabel                            │
│  - Recebe tema via URL params                               │
└─────────────────────────────────────────────────────────────┘
                           ▲
         Iframe ou link    │
┌──────────────────────────┼──────────────────────────────────┐
│  Site do Cliente         │                                  │
│  (medhome, etc)          │                                  │
│                          │                                  │
│  [Área do Cliente] ──────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

**Vantagens da Cápsula:**
- ✅ Um update afeta TODOS os sites
- ✅ Bundle do site menor
- ✅ Versionamento independente
- ✅ Manutenção centralizada
- ✅ Deploy único

### Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Whitelabel** | Cores, fontes e logo seguem o `site-config` da organização |
| **Modular** | Menu lateral com seções ativáveis por feature flag |
| **Backend-driven** | Funcionalidades refletem endpoints disponíveis |
| **Mobile-first** | Menu responsivo (sidebar → bottom nav em mobile) |
| **Progressivo** | Começar simples, enriquecer por demanda |

---

## 🎨 Estrutura Visual

### Layout Base
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]        ÁREA DO CLIENTE           [Avatar] [Sair]    │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  📋 Minhas  │     CONTEÚDO PRINCIPAL                        │
│   Reservas  │                                               │
│             │     (muda conforme seção selecionada)         │
│  👤 Meu     │                                               │
│   Perfil    │                                               │
│             │                                               │
│  📞 Contato │                                               │
│   (futuro)  │                                               │
│             │                                               │
│  📄 Docs    │                                               │
│   (futuro)  │                                               │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────────┐
│ [≡] ÁREA DO CLIENTE  [👤]  │
├─────────────────────────────┤
│                             │
│   CONTEÚDO PRINCIPAL        │
│                             │
│                             │
│                             │
├─────────────────────────────┤
│ [📋] [👤] [📞] [⚙️]         │  ← Bottom navigation
└─────────────────────────────┘
```

---

## 🗂️ Fases de Implementação

### FASE 1: MVP (Básico) ✅ Prioridade ALTA

**Objetivo**: Hóspede consegue logar e ver suas reservas.

#### 1.1 Rotas do Site
```typescript
// HashRouter
#/area-interna              → Redirect para /area-interna/reservas se logado
#/area-interna/reservas     → Lista de reservas
#/area-interna/perfil       → Dados do hóspede
#/login                     → Login (Google One Tap)
```

#### 1.2 Endpoints Backend Necessários

| Endpoint | Método | Status | Descrição |
|----------|--------|--------|-----------|
| `/auth/guest/google` | POST | ✅ Existe | Login via Google |
| `/auth/guest/me` | GET | ✅ Existe | Dados do hóspede logado |
| `/reservations/mine` | GET | 🔨 Criar | Reservas do hóspede |

#### 1.3 Menu Lateral MVP
```typescript
const MENU_ITEMS_MVP = [
  { id: 'reservas', icon: '📋', label: 'Minhas Reservas', path: '/area-interna/reservas' },
  { id: 'perfil', icon: '👤', label: 'Meu Perfil', path: '/area-interna/perfil' },
];
```

#### 1.4 Componentes a Criar

| Componente | Descrição |
|------------|-----------|
| `GuestLayout.tsx` | Layout base com sidebar + header |
| `GuestSidebar.tsx` | Menu lateral responsivo |
| `GuestHeader.tsx` | Header com avatar, nome, botão sair |
| `GuestGuard.tsx` | HOC que redireciona para /login se não autenticado |
| `MyReservationsPage.tsx` | Lista de reservas do hóspede |
| `MyProfilePage.tsx` | Dados pessoais (readonly MVP) |
| `LoginPage.tsx` | Google One Tap + fallback botão |

---

### FASE 2: Enriquecimento 📊 Prioridade MÉDIA

**Objetivo**: Mais detalhes e interações úteis.

#### 2.1 Novos Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/reservations/:id` | GET | Detalhe de uma reserva |
| `/reservations/:id/voucher` | GET | PDF do voucher (futuro) |
| `/guest/update` | PATCH | Atualizar dados do hóspede |

#### 2.2 Novas Funcionalidades

| Feature | Descrição |
|---------|-----------|
| **Detalhe da Reserva** | Modal/página com todas as infos da reserva |
| **Status Visual** | Badges coloridos: Pendente, Confirmada, Concluída, Cancelada |
| **Contagem Regressiva** | Timer para reservas pendentes (payment_expires_at) |
| **Editar Perfil** | Atualizar telefone, nome preferido |
| **Filtros** | Filtrar reservas por status, data |

#### 2.3 Menu Expandido
```typescript
const MENU_ITEMS_PHASE2 = [
  { id: 'reservas', icon: '📋', label: 'Minhas Reservas', path: '/area-interna/reservas', badge: 2 },
  { id: 'perfil', icon: '👤', label: 'Meu Perfil', path: '/area-interna/perfil' },
  { id: 'pagamentos', icon: '💳', label: 'Pagamentos', path: '/area-interna/pagamentos', flag: 'payments' },
];
```

---

### FASE 3: Comunicação 💬 Prioridade BAIXA

**Objetivo**: Canal direto com o host.

#### 3.1 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/messages` | GET | Lista de conversas |
| `/messages/:conversationId` | GET | Mensagens de uma conversa |
| `/messages/:conversationId` | POST | Enviar mensagem |

#### 3.2 Features

| Feature | Descrição |
|---------|-----------|
| **Chat com Host** | Mensagens sobre reserva específica |
| **Notificações** | Badge de mensagens não lidas |
| **Anexos** | Enviar fotos/docs (futuro) |

---

### FASE 4: Documentos 📄 Prioridade FUTURA

| Feature | Descrição |
|---------|-----------|
| **Voucher PDF** | Download do voucher da reserva |
| **Recibo** | Comprovante de pagamento |
| **Contrato** | Termos e condições (se aplicável) |
| **Avaliação** | Avaliar estadia após checkout |

---

## 🎨 Sistema de Cores (Whitelabel)

O tema segue as cores do `site-config`:

```typescript
// Exemplo de como aplicar cores do site-config
const GuestLayout = ({ children, siteConfig }) => {
  const theme = {
    '--primary': siteConfig.theme.primaryColor || '#3B82F6',
    '--secondary': siteConfig.theme.secondaryColor || '#10B981',
    '--accent': siteConfig.theme.accentColor || '#F59E0B',
    '--font-family': siteConfig.theme.fontFamily || 'Inter, sans-serif',
  };

  return (
    <div style={theme} className="min-h-screen bg-gray-50">
      <GuestSidebar logo={siteConfig.logo} siteName={siteConfig.siteName} />
      <main className="flex-1">{children}</main>
    </div>
  );
};
```

### Variáveis CSS
```css
:root {
  /* Cores do site-config */
  --primary: #3B82F6;
  --secondary: #10B981;
  --accent: #F59E0B;
  
  /* Derivadas (calculadas) */
  --primary-hover: color-mix(in srgb, var(--primary), black 10%);
  --primary-light: color-mix(in srgb, var(--primary), white 90%);
  
  /* Área interna específica */
  --sidebar-bg: #1F2937;
  --sidebar-text: #F9FAFB;
  --sidebar-active: var(--primary);
}
```

---

## 📦 Estrutura de Arquivos (Prompt para Bolt)

```
src/
├── components/
│   ├── guest-area/
│   │   ├── GuestLayout.tsx           # Layout principal
│   │   ├── GuestSidebar.tsx          # Menu lateral
│   │   ├── GuestHeader.tsx           # Header com avatar
│   │   ├── GuestGuard.tsx            # Proteção de rota
│   │   ├── GuestMobileNav.tsx        # Nav inferior mobile
│   │   └── GuestAvatar.tsx           # Avatar com dropdown
│   │
│   ├── reservations/
│   │   ├── ReservationCard.tsx       # Card na lista
│   │   ├── ReservationStatus.tsx     # Badge de status
│   │   ├── ReservationDetail.tsx     # Modal/página detalhe
│   │   └── ReservationTimer.tsx      # Countdown pendentes
│   │
│   └── profile/
│       ├── ProfileView.tsx           # Dados readonly
│       └── ProfileEdit.tsx           # Form de edição
│
├── pages/
│   ├── GuestAreaPage.tsx             # /area-interna (redirect)
│   ├── MyReservationsPage.tsx        # /area-interna/reservas
│   ├── MyProfilePage.tsx             # /area-interna/perfil
│   └── GuestLoginPage.tsx            # /login
│
├── hooks/
│   ├── useGuestAuth.ts               # Estado de autenticação
│   ├── useGuestReservations.ts       # Fetch reservas
│   └── useGuestProfile.ts            # Dados do perfil
│
└── contexts/
    └── GuestAuthContext.tsx          # Provider de auth do hóspede
```

---

## 🔌 API: Endpoint `/reservations/mine`

### Request
```http
GET /client-sites/api/:subdomain/reservations/mine
Authorization: Bearer <guest_token>
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reservationCode": "RES-2026-001234",
      "property": {
        "id": "uuid",
        "name": "Apartamento Vista Mar",
        "coverPhoto": "https://..."
      },
      "checkIn": "2026-02-10",
      "checkOut": "2026-02-15",
      "guests": 2,
      "status": "confirmed",
      "paymentStatus": "paid",
      "totalPrice": 1500.00,
      "currency": "BRL",
      "createdAt": "2026-01-10T14:30:00Z"
    }
  ],
  "total": 5
}
```

### Status Possíveis

| status | paymentStatus | Descrição |
|--------|---------------|-----------|
| `pending` | `pending` | Aguardando pagamento |
| `pending` | `expired` | Pagamento expirou |
| `confirmed` | `paid` | Reserva confirmada |
| `cancelled` | `cancelled` | Cancelada |
| `completed` | `paid` | Check-out realizado |

---

## 🔗 Integração com Sites (Cápsula)

### Como o Site Abre a Área Interna

No site do cliente, o botão "Área do Cliente" deve **redirecionar** para a cápsula:

```typescript
// Exemplo de link no site do cliente
const GUEST_AREA_URL = 'https://rendizy2testesbackup.vercel.app/guest-area/';

function GuestAreaButton({ siteConfig }) {
  const params = new URLSearchParams({
    slug: siteConfig.slug,
    primary: encodeURIComponent(siteConfig.theme.primaryColor || '#3B82F6'),
    secondary: encodeURIComponent(siteConfig.theme.secondaryColor || '#10B981'),
    accent: encodeURIComponent(siteConfig.theme.accentColor || '#F59E0B'),
  });
  
  return (
    <a 
      href={`${GUEST_AREA_URL}?${params.toString()}`}
      className="btn-primary"
    >
      Área do Cliente
    </a>
  );
}
```

### Parâmetros da URL

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `slug` | Slug do site para identificar org | `medhome` |
| `primary` | Cor primária (hex encoded) | `%233B82F6` |
| `secondary` | Cor secundária | `%2310B981` |
| `accent` | Cor de destaque | `%23F59E0B` |

### Build da Cápsula

```bash
# Localização: /guest-area/
cd guest-area
npm install
npm run build  # Output: ../public/guest-area/
```

O Vercel automaticamente executa ambos os builds via `buildCommand`:
```json
{
  "buildCommand": "npm install && npm run build && cd guest-area && npm install && npm run build"
}
```

---

## ✅ Checklist de Implementação

### Backend (Edge Functions)
- [x] Criar endpoint `GET /reservations/mine` em `rendizy-public`
- [x] Filtrar reservas por `guest_id` do token JWT
- [x] Incluir dados básicos do imóvel (join)
- [x] Adicionar ao catálogo `catalog.ts`

### Frontend Cápsula (guest-area/)
- [x] Estrutura Vite + React + TailwindCSS
- [x] `GuestAuthContext` com Google One Tap
- [x] `GuestLayout` com sidebar responsiva
- [x] `LoginPage` com Google Sign-In
- [x] `MyReservationsPage` com filtros e badges
- [x] `MyProfilePage` com dados do usuário
- [x] CSS variables para whitelabel

### Vercel Config
- [x] Adicionar rewrites para `/guest-area/*`
- [x] Atualizar `buildCommand` para incluir cápsula

### Prompt IA (ClientSitesManager.tsx)
- [x] Adicionar seção "Área Interna do Hóspede"
- [x] Documentar redirecionamento para cápsula
- [x] Incluir código de exemplo do botão

---

## 🚀 Próximos Passos Imediatos

1. **Criar endpoint `/reservations/mine`** no `rendizy-public`
2. **Atualizar catálogo** com novo endpoint
3. **Atualizar prompt v4.2** com orientações para área interna
4. **Testar no MedHome** como piloto

---

## 📝 Notas Técnicas

### Autenticação
- Token JWT salvo em `localStorage.rendizy_guest_token`
- Dados do guest em `localStorage.rendizy_guest`
- Token expira em 7 dias (configurável)
- Refresh automático não implementado (MVP: re-login)

### Navegação
- Usar `<a href="#/...">` ou `window.location.hash` (nunca `navigate()`)
- Páginas protegidas redirecionam para `/login` se não autenticado
- Após login, redirecionar para página original ou `/area-interna`

### Cache
- Reservas: cache de 5 minutos no front
- Perfil: cache de 1 hora
- Invalidar cache após ações (criar reserva, editar perfil)
