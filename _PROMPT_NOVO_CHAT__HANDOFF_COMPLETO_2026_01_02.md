# Prompt (handoff) MUITO COMPLETO — novo chat — Rendizy (Windows) — 02/01/2026

> **Idioma obrigatório**: PT-BR
>
> **Ambiente**: VS Code (Windows)
>
> **Objetivo**: você (assistente) deve retomar o trabalho **exatamente** do estado atual do workspace, sem inventar contexto, e ajudar com manutenção/desenvolvimento/deploy/push com **segurança** (sem vazar tokens).
>
> **Regra de ouro**: **NÃO cole** em chat nenhum valor de token/chave/senha. Cite somente **onde ficam** e quais scripts leem isso localmente.

---

## 0) Contexto rápido do que está “quente” agora

### 0.1 Bug/feature recente no Frontend (Calendário)
- Problema: override de “Descontos por pacote de dias” por anúncio não refletia no calendário individualmente.
- Correção aplicada no código:
  - O calendário agora usa, por imóvel:
    - `anuncios_ultimate.data.discount_packages_override` **se existir**, senão usa o padrão da organização.
  - O App agora carrega esse campo no objeto `Property`.
  - Ao salvar “Precificação Individual” no wizard, dispara refresh do cache de propriedades para refletir no calendário sem F5.

### 0.2 Importante (quando for validar)
- Se o calendário ainda parecer “igual para todos”, confirme se o endpoint que carrega a lista de anúncios/properties está devolvendo `data.discount_packages_override`.
- Confirme também que a UI de edição está persistindo no campo correto.

---

## 1) Pastas e paths (muito importante)

### 1.1 Workspace root (pasta “pai”)
- `C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025`

### 1.2 Projeto principal (onde está o app e a Edge Function)
- `C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main`

⚠️ Existe muita coisa no root, mas o “projeto” mesmo (com `.env.local`, `.git`, `supabase/`, etc.) fica no **subdiretório** `Rendizyoficial-main`.

---

## 2) Documentos principais (leia/cite estes antes de mudar coisas)

### 2.1 Deploy / Supabase
- `Rendizyoficial-main/CONFIRMACAO_DEPLOY.md`
  - Contém histórico de comandos de deploy.
  - **ATENÇÃO**: este arquivo pode conter token `sbp_...` em texto. Não exibir em chat.
- `Rendizyoficial-main/COMO_AUTENTICAR_SUPABASE.md`
  - Guia de login/link/deploy no Supabase.
- `Rendizyoficial-main/LINKS_TOKENS.md`
  - Links oficiais para gerar tokens (GitHub e Supabase) e como usar via variável de ambiente.

### 2.2 Git / Push
- `Rendizyoficial-main/GUIA_GIT_PUSH.md`
  - Guia completo de push + scripts recomendados.
- `Rendizyoficial-main/LINK_TOKEN_GITHUB.md`
- `Rendizyoficial-main/TOKEN_GITHUB_CONFIGURADO.md`

### 2.3 Handoffs anteriores (StaysNet etc.)
- `_PROMPT_NOVO_CHAT__STAYSNET_CUSTOM_FIELDS_E2E.md`
- `_PROMPT_PARA_NOVO_CHAT__STAYSNET_ROOMS_DEPLOY.md`
- `🆘_PROMPT_NOVO_CHAT_STAYSNET.md`
- `🆘_PROMPT_NOVO_CHAT_STAYSNET_WEBHOOKS_BLOCKS.md`

---

## 3) Onde estão os tokens/chaves (SEM MOSTRAR VALORES)

### 3.1 Supabase (frontend/back)
- Arquivo local (sensível, não versionar): `Rendizyoficial-main/.env.local`
  - Normalmente contém:
    - `SUPABASE_URL` / `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY` (MUITO sensível)

### 3.2 Supabase CLI (token `sbp_...`)
- Pode estar referenciado em:
  - `Rendizyoficial-main/CONFIRMACAO_DEPLOY.md` (histórico de deploy com `npx supabase login --token sbp_...`)
- Scripts que conseguem extrair/usar isso **sem imprimir**:
  - `Rendizyoficial-main/_tmp_supabase_login_from_confirmacao.ps1`

### 3.3 Credenciais de admin para geração/refresh de token interno (app)
- Arquivo local (gitignored): `_rendizy-creds.local.ps1`
  - Define:
    - `RENDIZY_ADMIN_EMAIL`
    - `RENDIZY_ADMIN_PASSWORD`

### 3.4 Token interno do app (para endpoints protegidos)
- Arquivo: `token.txt` (no workspace root)
  - Usado por scripts de teste (ex.: `TEST-STAYSNET-MODULAR.ps1`) via header `X-Auth-Token`.

### 3.5 GitHub token
- Recomendação: usar via `GITHUB_TOKEN` (variável de ambiente) ou credenciais do Git/GitHub CLI.
- Documentação: `Rendizyoficial-main/LINKS_TOKENS.md` e `Rendizyoficial-main/GUIA_GIT_PUSH.md`.

---

## 4) Scripts oficiais (o que rodar e quando)

### 4.1 Supabase — login seguro no CLI (sem colar token no terminal)
- Script: `Rendizyoficial-main/_tmp_supabase_login_from_confirmacao.ps1`
  - Lê `Rendizyoficial-main/CONFIRMACAO_DEPLOY.md`, extrai `sbp_...` e executa `npx -y supabase@latest login --token ...` **sem imprimir o token**.

### 4.2 Supabase — deploy da Edge Function (recomendado)
- Script: `Rendizyoficial-main/_tmp_deploy_rendizy_server_no_link.ps1`
  - Faz scan por tokens `sbp_` (sem imprimir valores), testa acesso ao project ref e deploya:
    - `npx -y supabase@latest functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc --use-api`

- Script: `Rendizyoficial-main/_tmp_scan_and_deploy_rendizy_server.ps1`
  - Variante que também executa `link` (quando necessário) e deploy com flags.

- Script “interativo” (para humanos): `Rendizyoficial-main/DEPLOY-SUPABASE-NPX.ps1`
  - Guia com prompts (cole token só se você quiser; melhor usar os scripts acima).

- Script “CLI global” (menos recomendado): `Rendizyoficial-main/deploy-edge-function.ps1`
  - Exige `supabase` instalado globalmente.

### 4.3 Testes/import StaysNet (smokes)
- Script: `TEST-STAYSNET-MODULAR.ps1` (no workspace root)
  - Usa `Rendizyoficial-main/.env.local` (anon key) e `token.txt` (X-Auth-Token).
  - Usa `_rendizy-creds.local.ps1` para refresh automático (não interativo) do token do app.

### 4.4 Git push
- Scripts recomendados (interativos, seguros):
  - `Rendizyoficial-main/git-quick-push.ps1`
  - `Rendizyoficial-main/git-commit-push.ps1`

- Script com repo hardcoded (cautela):
  - `Rendizyoficial-main/push-github-completo.ps1`
    - Tem URL fixa de repo. Use só se for o repo correto.

---

## 5) VS Code Tasks (atalhos já prontos)

Os tasks estão em `.vscode/tasks.json` (no workspace root).

Sugestões úteis:
- `supabase-login-from-confirmacao-deploy` (login Supabase CLI sem expor token)
- `scan-and-deploy-rendizy-server` (scan+deploy)
- `tmp-deploy-rendizy-server-no-link` (deploy no-link)
- `git-info-correct` (status/log)
- `test-staysnet-modular-log-short` (smoke curto)

---

## 6) Resolver o erro de PowerShell com caminho/aspas (o seu problema atual)

### 6.1 Sintoma
Você viu erros do tipo:
- "The term '=C:\\Users\\...' is not recognized"
- "=Join-Path: The term '=Join-Path' is not recognized"
- PowerShell pedindo `ChildPath:`

Isso acontece quando o comando foi montado com aspas quebradas e o PowerShell passa a interpretar partes como texto solto.

### 6.2 Solução (automatizada e sem quoting)
Use scripts com `-File` (não `-Command`) e paths com `-LiteralPath`.

---

## 7) Checklist operacional (para o novo chat)

### 7.1 Antes de mexer em deploy/push
1. Rodar `git status --porcelain=v1` dentro do repo correto.
2. Conferir que nenhum segredo será commitado:
   - `.env.local` não pode ir pro Git.
   - `_rendizy-creds.local.ps1` não pode ir pro Git.
   - `token.txt` geralmente não deve ir pro Git.

### 7.2 Deploy Supabase (sequência recomendada)
1. (Opcional) `Rendizyoficial-main/_tmp_supabase_login_from_confirmacao.ps1`
2. `Rendizyoficial-main/_tmp_deploy_rendizy_server_no_link.ps1`
3. Ver logs no dashboard do Supabase (não colar tokens).

### 7.3 Push GitHub (sequência recomendada)
1. Estar no git root correto.
2. Rodar `Rendizyoficial-main/git-quick-push.ps1` (mais rápido) ou `git-commit-push.ps1` (mais guiado).

---

## 8) Regras de resposta (para o assistente no novo chat)

- Responda sempre em PT-BR.
- Seja extremamente cuidadoso com segredos: nunca reproduzir tokens, chaves, ou conteúdo de `.env.local`.
- Quando precisar de credenciais, oriente a usar os scripts existentes (eles lêem local e ocultam valores).
- Quando citar comandos de PowerShell, prefira `-File` e `Set-Location -LiteralPath` para evitar bugs de quoting.

---

## 9) Se o usuário pedir “qual o modelo?”
- Responda: **GPT-5.2**.
