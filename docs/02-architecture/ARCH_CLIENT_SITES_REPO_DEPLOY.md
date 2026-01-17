# Arquitetura — Deploy de Sites por Repositório (GitHub + Vercel)

## 🎯 Objetivo
Padronizar o deploy de sites de clientes usando **repositório Git** como fonte de verdade e **Vercel** como CI/CD. Elimina regressões por ZIP manual e garante rastreabilidade.

---

## ✅ Fluxo Canônico
1) Site tem um **repositório Git** (GitHub) com branch principal.
2) Vercel gera o deploy a partir desse repo.
3) Um **Deploy Hook** é salvo no cadastro do site.
4) Push no branch → GitHub envia webhook → Rendizy dispara o Deploy Hook.

---

## 🔌 Endpoints Principais

### Webhook do GitHub
`POST /client-sites/repo/webhook/github`
- Recebe evento `push`.
- Verifica assinatura HMAC (secret do webhook).
- Localiza o site pelo `repo_url` + `repo_branch`.
- Dispara Deploy Hook da Vercel.

### Disparo manual via painel
`POST /client-sites/:organizationId/repo/deploy`
- Usa o Deploy Hook salvo no cadastro do site.

---

## 🗄️ Campos no banco (`client_sites`)
- `repo_provider` (github)
- `repo_url`
- `repo_branch`
- `repo_deploy_hook_url`
- `repo_vercel_project_url`
- `repo_last_deploy_status`
- `repo_last_deploy_at`
- `repo_last_deploy_error`

---

## 🧭 Regras Operacionais
- **Repositório é a fonte de verdade** do site.
- Upload manual via ZIP **só em emergência**.
- Alterações devem acontecer no repo e seguir o fluxo CI/CD.

---

## 🔐 Segurança
- Webhook GitHub usa `GITHUB_WEBHOOK_SECRET`.
- O endpoint de webhook não exige JWT (para receber GitHub).
- Assinatura deve ser validada com o **body bruto**.

---

## ✅ Checklist de Ativação
1) Criar Deploy Hook no projeto Vercel.
2) Preencher no painel: repo URL, branch, deploy hook.
3) Criar webhook no GitHub (evento `push`).
4) Testar com um push real.

---

## 📌 Notas
- O deploy manual via painel continua disponível (fallback).
- O histórico do deploy fica em `repo_last_deploy_*`.
