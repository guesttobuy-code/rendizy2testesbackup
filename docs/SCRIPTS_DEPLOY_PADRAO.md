# 🚀 Scripts de Deploy Padronizados

> **Atualizado:** 2026-01-06  
> **Versão:** 1.0

## 📋 Uso Diário (5 Principais)

### 1. ⚡ Deploy Edge Functions (rendizy-server)
```powershell
.\⚡_DEPLOY_RENDIZY_SERVER.ps1
```
- Faz deploy do rendizy-server para Supabase
- Extrai token do CONFIRMACAO_DEPLOY.md automaticamente
- Versionado (v1.0.103.332+)

### 2. 🖥️ Deploy Frontend (Git Push)
```powershell
.\deploy-frontend.ps1
```
- Faz git add, commit e push para GitHub
- Detecta root do repo automaticamente
- Não requer prompts interativos

### 3. 🔄 Deploy Completo (Supabase + GitHub + Backup)
```powershell
.\deploy-completo.ps1
```
- Supabase Edge Functions
- GitHub push
- Backup automático antes do deploy
- Versionado

### 4. 🗄️ Deploy Database (Migrations)
```powershell
.\deploy-db.ps1
```
- Aplica migrations SQL pendentes
- Detecta path automaticamente

### 5. ✅ Verificação Pré-Deploy
```powershell
.\verificar-antes-deploy.ps1
```
- Checa conflitos de merge
- Valida arquivos modificados
- **SEMPRE executar antes de qualquer deploy**

---

## 🔧 Casos Específicos

### StaysNet Fix
```powershell
.\DEPLOY-STAYSNET-FIX.ps1
```
Deploy específico para correções da integração StaysNet.

### StaysNet Webhooks Cron
```powershell
.\DEPLOY-AGENDA-STAYSNET-WEBHOOKS-CRON.ps1
```
Configura pg_cron para processamento de webhooks.

### Setup Inicial (Nova Máquina)
```powershell
.\INSTALAR-E-DEPLOY-SUPABASE.ps1
```
Instala Supabase CLI + faz deploy inicial.

### Backup ZIP para Deploy Manual
```powershell
.\criar-zip-deploy.ps1
```
Cria ZIP para upload manual se CLI falhar.

---

## 📁 Scripts Arquivados

19 scripts redundantes/obsoletos foram movidos para:
```
docs/08-archive/scripts/deploy-legacy/
```

3 scripts temporários foram movidos para:
```
docs/08-archive/scripts/_tmp_deploy/
```

---

## 🔑 Credenciais

Os scripts usam credenciais de:
1. `CONFIRMACAO_DEPLOY.md` - Token Supabase Access
2. `.env.local` - Supabase Service Role Key
3. Git config local - Credenciais GitHub

---

## ⚠️ Regras

1. **SEMPRE** executar `verificar-antes-deploy.ps1` primeiro
2. Para Edge Functions, usar `⚡_DEPLOY_RENDIZY_SERVER.ps1`
3. Para frontend/GitHub, usar `deploy-frontend.ps1`
4. Para ambos, usar `deploy-completo.ps1`
