# Changelog — 2026-01-17

## 🧩 Sites de Clientes — Deploy por Repositório

### ✅ O que mudou
- Novo **modelo de deploy** baseado em repositório Git + Vercel.
- Persistência de configuração do repo no `client_sites`.
- Webhook GitHub para disparo automático de deploy.
- Botão de deploy manual no painel (fallback).

### 🗄️ Banco de dados
**Novos campos em `client_sites`:**
- `repo_provider`
- `repo_url`
- `repo_branch`
- `repo_deploy_hook_url`
- `repo_vercel_project_url`
- `repo_last_deploy_*`

### 🔌 Backend
- `POST /client-sites/repo/webhook/github`
- `POST /client-sites/:organizationId/repo/deploy`

### 🖥️ Painel
- Aba **Repositório** no modal de edição de sites.
- Campos para repo, branch, deploy hook e URL do projeto Vercel.

### 📌 Regras
- Deploy via repositório é **padrão canônico**.
- Upload manual via ZIP é **exceção emergencial**.

---

## 📝 Arquivos principais
- `supabase/functions/rendizy-server/routes-client-sites.ts`
- `components/ClientSitesManager.tsx`
- `docs/02-architecture/ARCH_CLIENT_SITES_REPO_DEPLOY.md`
- `docs/Rules.md`
