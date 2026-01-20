# Docs Governance (Fonte de Verdade)

Este repositório trata documentação como **produto**: poucas fontes de verdade, estrutura previsível e zero “.md jogado na raiz”.

## 1) Tripé núcleo (o que é “fundamental”)

1. **Arquitetura & Safety**
   - Edge Functions, `index.ts`, CORS, roteamento, middlewares, padrões anti-regressão.
   - Pastas: `docs/02-architecture/` e `docs/architecture/`.

2. **Dados & Persistência (contratos)**
   - Regras de multi-tenant (`organization_id`), token/header, e persistência atômica via RPC.
   - **Regra do produto**: tabela única `properties` (não existe `anuncios_drafts`).
   - Pastas: `docs/02-architecture/`, `docs/04-modules/`.

3. **Operação (runbooks) & Troubleshooting**
   - Setup, deploy, checks, como diagnosticar erros, playbooks.
   - Pastas: `docs/01-setup/`, `docs/05-operations/`, `docs/06-troubleshooting/`.

Tudo fora disso é **não-núcleo** e deve ir para `docs/07-sessions/` (sessões) ou `docs/08-archive/` (histórico/legado).

## 2) Regra de ouro: onde pode criar arquivos

- **Proibido criar `.md` na raiz do repo**.
- **Se precisar criar nota temporária**: use `docs/07-sessions/YYYY-MM-DD/`.
- **Conteúdo histórico/antigo**: use `docs/08-archive/YYYY-MM-DD/`.

Exceções são controladas por whitelist (ver `docs/03-conventions/ROOT_MD_WHITELIST.txt`).

## 3) Convenções de nomes

- Preferir `snake_case` ou `kebab-case` (sem emojis).
- Para sessões/debug: `YYYY-MM-DD__assunto.md`.
- Evitar espaços e acentos em arquivos novos.

## 4) Regras para I.A.

- Antes de criar qualquer `.md`, verificar se já existe doc na árvore `docs/`.
- Se for informação temporária (debug/log/rascunho): **obrigatório** em `docs/07-sessions/`.
- Se for “fonte de verdade”: **obrigatório** em `docs/01-setup/`, `docs/02-architecture/`, `docs/03-conventions/`, `docs/04-modules/`, `docs/05-operations/` ou `docs/06-troubleshooting/`.
