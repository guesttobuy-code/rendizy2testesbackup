# Módulo — Área Interna do Cliente (Guest Area)

> **Status**: ativo (cápsula)  
> **Rota**: `/guest-area/`

## ✅ Objetivo

Entregar uma **extensão do Rendizy** para o hóspede final, usando o mesmo design e componentes, mas com dados filtrados por sessão.

## ✅ Escopo atual

- Login Google
- Sessão persistente (cookie httpOnly)
- Listagem de reservas
- Calendário simples (agrupado por data)

## 🧩 Componentes principais

- `GuestLayout` — shell principal (sidebar + header + conteúdo)
- `GuestSidebar` — menu lateral (módulos visíveis)
- `GuestHeader` — topo com avatar/sair
- `MyReservationsPage` — lista de reservas do hóspede
- `CalendarPage` — reservas agrupadas por data

## 🔐 Sessão e segurança

- **Sessão**: `/api/auth/me?siteSlug=...`
- **Login**: `/api/auth/google`
- **Logout**: `/api/auth/logout`

> A cápsula **não** usa token do painel admin.

## ✅ Regras de UI

- Layout e padrões idênticos ao painel Rendizy
- Módulos exibidos por configuração (menu centralizado)
- Visual mínimo e consistente (sem inventar design novo)

## 📌 Próximos módulos planejados

- Chat hóspede ↔ host
- Financeiro/Histórico
- Notificações
- Detalhe de reserva (view expandida)

