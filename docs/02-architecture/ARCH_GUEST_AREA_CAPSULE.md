# Arquitetura — Guest Area (Cápsula)

> Objetivo: usar **uma base única de UI/UX do Rendizy** e expor ao hóspede apenas o necessário, com dados filtrados e **sem misturar** com o painel admin.

## ✅ Princípios

- **Cápsula separada**: build isolado em `/guest-area/`.
- **UI compartilhada**: shell, layout, padrões visuais e componentes do Rendizy.
- **Dados segregados**: endpoints e sessão do hóspede são diferentes do admin.
- **Whitelabel**: cores/logo/textos via `site-config` e parâmetros de URL.
- **Manutenção simples**: um código para UI, múltiplas fontes de dados por “perfil”.

---

## 📦 Estrutura física

```
/guest-area
  ├─ src/                # app capsule (React)
  ├─ vite.config.ts      # build -> ../public/guest-area
/public/guest-area       # output estático servido em produção
```

**Build**: `guest-area/vite.config.ts` gera para `public/guest-area`.

---

## 🔐 Autenticação & Sessão (Hóspede)

- **Login**: Google via `/api/auth/google` (BFF).  
- **Sessão**: cookie httpOnly via `/api/auth/me?siteSlug=...`.
- **Logout**: `/api/auth/logout`.

> Regra: **nunca** usar tokens do painel admin na cápsula.

---

## 📚 Dados do hóspede (adaptados)

Os endpoints de hóspede retornam **dados filtrados**:

- `/api/guest/reservations/mine?siteSlug=...`  
  Retorna apenas reservas do hóspede autenticado.

**Sem misturar** com:
- `/api/admin/*`
- endpoints internos do painel

---

## 🧱 UI compartilhada (mesmo design Rendizy)

A cápsula usa o **mesmo shell** do painel:

- Sidebar e Header padronizados
- Cartões resumo (Total/Confirmadas/Pendentes)
- Listagem em linhas, badges de status

> Só muda o **conjunto de módulos** e a **fonte de dados**.

---

## 🔁 Evolução

Próximos módulos possíveis no mesmo shell:
- Reservas (hóspede)
- Calendário (hóspede)
- Chat
- Financeiro/Histórico
- Notificações

---

## ✅ Garantias de não-mistura

- `guest-area` tem **seu próprio build** e rota.
- Sessão do hóspede é **independente** (cookie BFF separado).
- UI compartilhada é reutilizada via **componentes**, não via endpoints admin.

---

## 📌 Referências

- [docs/roadmaps/guest-area-unificacao-visual.md](../roadmaps/guest-area-unificacao-visual.md)
- [docs/roadmaps/ROADMAP_AREA_INTERNA_CLIENTE.md](../roadmaps/ROADMAP_AREA_INTERNA_CLIENTE.md)
