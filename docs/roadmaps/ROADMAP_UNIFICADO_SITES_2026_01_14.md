# 🎯 ROADMAP UNIFICADO — Sites + Guest Area + Checkout v2

> **Atualizado em**: 14/01/2026 às 22:10  
> **Autor**: GitHub Copilot + Rafael  
> **Status Geral**: 🟡 Em Progresso

---

## 📋 Resumo Executivo

Este roadmap unifica todos os itens relacionados a:
- Sites whitelabel (MedHome, etc.)
- Booking form (formulário de reserva)
- Guest Area (área do cliente/hóspede)
- Checkout v2 (Stripe nova aba + webhook)
- Autenticação SSO (login unificado)

---

## ✅ CONCLUÍDO (o que já funciona)

### Infraestrutura
- [x] **14/01** Proxy `/site/:slug/*` servindo HTML do Storage via Vercel
- [x] **14/01** Headers anti-cache no HTML (`no-store`, `X-Rendizy-Proxy-Version`)
- [x] **14/01** Script injetado `/api/inject/booking-v2.js?v=<deploy>` (versionado)
- [x] **14/01** Marcador debug `window.__RENDIZY_BOOKING_V2__`

### Autenticação (BFF Cookie)
- [x] **13/01** Login Google via `/api/auth/google` (seta cookie httpOnly)
- [x] **13/01** Sessão via `/api/auth/me?siteSlug=...` (lê cookie)
- [x] **13/01** Logout `/api/auth/logout` (limpa cookie)

### Guest Area (Cápsula)
- [x] **13/01** Build separado em `/public/guest-area/`
- [x] **13/01** Rotas: `#/reservas`, `#/perfil`
- [x] **13/01** Login Google manual (evita FedCM cooldown)
- [x] **13/01** Perfil com telefone + país (E.164)
- [x] **14/01** Deep-link `#/reservas?focus=<reservationId>`

### Booking Form (inject)
- [x] **14/01** Telefone obrigatório com país/prefixo (E.164)
- [x] **14/01** Autofill nome/email/telefone quando logado
- [x] **14/01** Lock apenas se phone já salvo no perfil
- [x] **14/01** Seletores tolerantes (fallback por label)

### Checkout v2
- [x] **14/01** Páginas `/api/checkout/success` e `/api/checkout/cancel`
- [x] **14/01** Patch no bundle para `window.open(..., "_blank")` (checkout em nova aba)
- [x] **14/01** Success faz polling até webhook confirmar
- [x] **14/01** Eventos entre abas (BroadcastChannel/localStorage)

---

## 🔴 BUGS ENCONTRADOS HOJE (14/01)

### BUG #1: Mensagem "Reserva Criada!" antes do pagamento
- **Sintoma**: Tela mostra "✅ Reserva Criada!" com código `WEB-MKEQXFF9-2RBA` ANTES de pagar
- **Problema**: Confunde usuário — parece que já reservou
- **Deveria ser**: "Pré-Reserva Criada — Aguardando Pagamento"
- **Causa**: Bolt não seguiu o prompt (prompt estava certo)
- **Correção aplicada**: Prompt v5.7 agora diz "❌❌❌ PROIBIDO" e "✅✅✅ OBRIGATÓRIO"
- **Status**: ✅ Prompt corrigido | 🔴 Site MedHome precisa rebuild

### BUG #2: Checkout abrindo na mesma aba (não nova)
- **Sintoma**: Ao clicar "selecionar forma de pagamento", abriu Stripe na MESMA aba
- **Problema**: Usuário perde contexto do site
- **Deveria ser**: Checkout em NOVA aba, site continua aberto
- **Causa**: Bolt usou `&&(window.location.href=checkoutUrl)` — patch antigo não cobria
- **Correção aplicada**: Patch agora cobre `(window.location.href=...)` inline
- **Status**: ✅ CORRIGIDO — patch funcionando (testado às 22:25)

---

## 🟡 EM PROGRESSO (esta semana)

### Correções Urgentes (14-15/01)
- [ ] **BUG #1** — Alterar mensagem de "Reserva Criada" → "Pré-Reserva - Aguardando Pagamento"
  - Arquivo: bundle do site ou patch no proxy
  - Responsável: próximo commit

- [ ] **BUG #2** — Garantir checkout em nova aba em TODOS os caminhos
  - Arquivo: `api/site.js` (patch) + validar bundle
  - Responsável: próximo commit

- [ ] Validar smoke test completo MedHome:
  - [ ] Headers corretos (`X-Rendizy-Proxy-Version`)
  - [ ] Script `booking-v2.js` carregado
  - [ ] Autofill/lock funcionando
  - [ ] Checkout em nova aba
  - [ ] Success confirma via polling
  - [ ] Área do cliente mostra reserva

### Melhorias de UX (15-17/01)
- [ ] Timer de expiração na pré-reserva (30 min)
- [ ] Toast/notificação quando pagamento confirmado
- [ ] Auto-fechar aba do checkout após confirmação
- [ ] Após confirmação, levar o usuário direto para a Guest Area
  - Link com focus da reserva: `#/reservas?focus=<reservationId>`

---

## 🔵 PRÓXIMAS FASES (semanas seguintes)

### FASE 2: Status de Reserva Correto (17-20/01)
- [ ] Reserva nasce como `pending_payment` (não `confirmed`)
- [ ] Webhook Stripe atualiza para `confirmed` + `paid`
- [ ] Timeout de 30 min cancela pré-reserva não paga
- [ ] Email de confirmação apenas após pagamento

### FASE 3: Métodos de Pagamento Salvos (21-25/01)
- [ ] Vincular guest ao Stripe Customer ID
- [ ] Salvar cartões para futuras reservas
- [ ] Mostrar "Usar cartão •••• 4242" no checkout
- [ ] Coluna `stripe_customer_id` na tabela `guests`

### FASE 4: Comunicação Host ↔ Hóspede (futuro)
- [ ] Chat por reserva
- [ ] Notificações push
- [ ] Anexos (fotos/docs)

---

## 📊 Matriz de Status por Funcionalidade

| Funcionalidade | Site MedHome | Guest Area | Backend | Prompt IA |
|----------------|:------------:|:----------:|:-------:|:---------:|
| Login Google | ✅ | ✅ | ✅ | ✅ |
| Sessão via cookie | ✅ | ✅ | ✅ | 🔴 |
| Autofill quando logado | ✅ | N/A | ✅ | 🔴 |
| Telefone obrigatório | ✅ | ✅ | ✅ | ✅ |
| Checkout nova aba | 🔴 | N/A | ✅ | 🔴 |
| Status pending_payment | 🔴 | 🔴 | 🔴 | 🔴 |
| Webhook confirma | ✅ | ✅ | ✅ | 🔴 |
| Pagamentos salvos | 🔴 | 🔴 | 🔴 | 🔴 |

**Legenda**: ✅ Pronto | 🔴 Pendente | 🟡 Parcial | N/A Não Aplica

---

## 🔧 Arquivos Principais

### Proxy & Inject
| Arquivo | Responsabilidade |
|---------|------------------|
| `api/site.js` | Proxy HTML + patches |
| `api/inject/booking-v2.js` | Regras de booking |
| `vercel.json` | Rewrites e cache |

### Checkout
| Arquivo | Responsabilidade |
|---------|------------------|
| `api/checkout/success.js` | Polling + confirmação |
| `api/checkout/cancel.js` | Cancelamento |

### Auth BFF
| Arquivo | Responsabilidade |
|---------|------------------|
| `api/auth/google.js` | Login + set cookie |
| `api/auth/me.js` | Sessão (read cookie) |
| `api/auth/logout.js` | Limpa cookie |

### Guest Area
| Arquivo | Responsabilidade |
|---------|------------------|
| `guest-area/src/contexts/GuestAuthContext.tsx` | Estado de auth |
| `guest-area/src/pages/MyReservationsPage.tsx` | Lista de reservas |
| `guest-area/src/pages/MyProfilePage.tsx` | Perfil + telefone |

---

## 📝 Histórico de Mudanças

| Data | Hora | Mudança | Commit |
|------|------|---------|--------|
| 14/01 | 21:58 | Fix layout telefone + lock apenas se phone salvo | `d97d10b` |
| 14/01 | 21:30 | Patch bundle MedHome com name/id inputs | Upload Storage |
| 14/01 | 20:55 | Prompt v5.3 → v5.6 (auth Vercel) | Vários |
| 13/01 | - | Checkout v2 (success/cancel pages) | `91b77fa` |
| 13/01 | - | Auth BFF cookie | `02fd1cd` |
| 13/01 | - | Guest Area login manual | `970db09` |

---

## 🚨 Dívidas Técnicas

1. **Patch por regex no bundle** — Frágil, precisa virar regra no prompt
2. **Seletores por label** — Deveria ser `name/id` canônicos
3. **Status de reserva** — Backend precisa distinguir `pending_payment` de `confirmed`
4. **Stripe Customer ID** — Não existe vínculo com guest ainda

---

## 📌 Próxima Ação Imediata

1. Corrigir **BUG #1** (mensagem "Reserva Criada")
2. Corrigir **BUG #2** (checkout mesma aba)
3. Rodar smoke test completo
4. Atualizar prompt se smoke passar

