# Minha Conta: identificação do usuário logado (2025-12-24)

## Objetivo

Garantir que fique **claro quem está logado** no painel e **em qual organização**, sem depender de informações “mockadas” ou de UI estática.

## Onde ver

- Menu lateral → rodapé (perfil) → **Minha Conta**
- Rota direta: `/minha-conta`

## O que a tela mostra

A tela **Minha Conta** exibe 3 abas:

- **Usuário**: nome, email, role, user id.
- **Organização**: nome, slug, org id (quando disponível).
- **Sessão**: status e token **mascarado** (com botão para copiar).

## Como o sistema identifica o usuário

- O token de sessão do painel é salvo em `localStorage` como `rendizy-token`.
- O frontend valida e carrega o usuário no backend via endpoint:
  - `GET /functions/v1/rendizy-server/auth/me`
  - Header obrigatório: `X-Auth-Token: <rendizy-token>`

## Troubleshooting rápido

### 1) Tela mostra: "Token presente (usuário não carregado)"

Isso significa que existe `rendizy-token`, mas o `AuthContext` não conseguiu carregar o usuário. Causas comuns:

- `VITE_SUPABASE_ANON_KEY` ausente/inválida (401 / Invalid JWT)
- token expirado (sessão removida/invalidada no banco)
- falha de rede no momento da validação

Veja também:
- `docs/FIX_401_SUPABASE_ANON_KEY_2025-12-24.md`

### 2) Admin Master aparece para todo mundo

Isso acontece quando a UI está com bypass/placeholder. Agora o menu "Admin Master" só aparece para `super_admin` (via `AuthContext`).
