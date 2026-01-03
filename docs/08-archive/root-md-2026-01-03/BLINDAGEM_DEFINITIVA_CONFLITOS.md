# 🛡️ BLINDAGEM DEFINITIVA CONTRA CONFLITOS DE MERGE

## 🚨 REGRA ABSOLUTA: NUNCA FAZER GIT PULL SEM VALIDAÇÃO

**Esta é a regra mais importante para prevenir conflitos de merge.**

### ❌ PROIBIDO:
- ❌ `git pull` sem executar `verificar-antes-deploy.ps1` primeiro
- ❌ `git pull` em scripts de deploy sem validação
- ❌ Commits com conflitos de merge
- ❌ Deploy sem verificar conflitos

### ✅ OBRIGATÓRIO:
- ✅ **SEMPRE** executar `verificar-antes-deploy.ps1` antes de qualquer operação Git
- ✅ **SEMPRE** executar `resolver-todos-conflitos-definitivo.ps1` se encontrar conflitos
- ✅ **SEMPRE** verificar conflitos antes de fazer deploy
- ✅ **SEMPRE** verificar conflitos antes de fazer commit

---

## 📋 PROCESSO OBRIGATÓRIO

### ANTES DE QUALQUER OPERAÇÃO GIT:

```powershell
# 1. SEMPRE verificar conflitos primeiro
.\verificar-antes-deploy.ps1

# 2. Se encontrar conflitos, resolver
.\resolver-todos-conflitos-definitivo.ps1

# 3. Verificar novamente
.\verificar-antes-deploy.ps1

# 4. Só então fazer operação Git
git pull  # ou git commit, git push, etc.
```

### ANTES DE QUALQUER DEPLOY:

```powershell
# 1. SEMPRE verificar conflitos primeiro
.\verificar-antes-deploy.ps1

# 2. Se encontrar conflitos, resolver ANTES de fazer deploy
.\resolver-todos-conflitos-definitivo.ps1

# 3. Verificar novamente
.\verificar-antes-deploy.ps1

# 4. Só então fazer deploy
npx supabase functions deploy rendizy-server --no-verify-jwt
```

---

## 🔧 SCRIPTS DE PROTEÇÃO

### 1. `verificar-antes-deploy.ps1`
**O que faz:** Verifica TODOS os arquivos do projeto por conflitos de merge
**Quando usar:** ANTES de qualquer deploy ou operação Git
**Resultado:** Bloqueia operação se encontrar conflitos

### 2. `resolver-todos-conflitos-definitivo.ps1`
**O que faz:** Resolve TODOS os conflitos mantendo versão HEAD
**Quando usar:** Quando `verificar-antes-deploy.ps1` encontrar conflitos
**Resultado:** Remove todos os marcadores de conflito

### 3. `prevenir-conflitos.ps1`
**O que faz:** Verifica conflitos antes de fazer commit
**Quando usar:** ANTES de cada commit
**Resultado:** Bloqueia commit se encontrar conflitos

---

## 🚨 REGRAS CRÍTICAS

1. **NUNCA fazer `git pull` sem executar `verificar-antes-deploy.ps1` primeiro**
2. **NUNCA fazer deploy sem executar `verificar-antes-deploy.ps1` primeiro**
3. **NUNCA fazer commit com conflitos**
4. **SEMPRE resolver conflitos imediatamente quando aparecerem**
5. **SEMPRE verificar novamente após resolver conflitos**

---

## 🔍 CAUSA RAIZ DOS CONFLITOS

Os conflitos aparecem quando:
1. **Histórico Git com conflitos não resolvidos** - Commits anteriores foram feitos com conflitos
2. **Scripts de deploy fazendo `git pull` sem validação** - Scripts antigos ainda fazem pull automático
3. **Falta de proteção no processo de deploy** - Deploy não verifica conflitos antes de executar

**SOLUÇÃO:** Sempre verificar conflitos ANTES de qualquer operação Git ou deploy.

---

## 📝 CHECKLIST DIÁRIO

- [ ] Executei `verificar-antes-deploy.ps1` antes de trabalhar?
- [ ] Não há conflitos no código?
- [ ] Servidor inicia sem erros?
- [ ] Posso fazer deploy com segurança?
- [ ] Executei `verificar-antes-deploy.ps1` antes de fazer commit?

---

## ⚠️ AVISO FINAL

**Se você ver `<<<<<<< HEAD` no código, PARE TUDO e execute:**

```powershell
.\resolver-todos-conflitos-definitivo.ps1
.\verificar-antes-deploy.ps1
```

**NÃO continue trabalhando com conflitos no código!**

**NÃO faça deploy com conflitos!**

**NÃO faça commit com conflitos!**

---

## 🎯 OBJETIVO

**Blindar o código contra erros idiotas de conflitos de merge.**

**Garantir que conflitos NUNCA mais quebrem o deploy ou o desenvolvimento.**

**Criar processo automático que previne conflitos antes que aconteçam.**
