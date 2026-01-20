# 🛡️ Padrão de Commit Seguro

## REGRA FUNDAMENTAL

> **SEMPRE revisar antes de commitar.**
> A IA muitas vezes resolve de um lado e quebra de outro.

---

## ✅ Checklist Antes de Commitar

### 1. Verificar Erros de Compilação
```powershell
# No diretório do projeto
npx tsc --noEmit
```
Se houver erros, **NÃO COMITE** até resolver.

### 2. Verificar o que Está Funcionando
Antes de alterar algo, documente:
- O que já funciona? 
- Quais telas/funcionalidades serão impactadas?
- Testou manualmente?

### 3. Revisar Diff
```powershell
git diff --stat
git diff
```

### 4. Usar o Script Seguro
```powershell
.\scripts\safe-commit.ps1 -Message "feat: minha feature" -Push
```

---

## 📋 Script de Commit Seguro

Localização: `scripts/safe-commit.ps1`

### Uso Básico
```powershell
# Commit simples
.\scripts\safe-commit.ps1 -Message "fix: corrige bug X"

# Commit + Push
.\scripts\safe-commit.ps1 -Message "feat: nova feature" -Push

# Arquivos específicos
.\scripts\safe-commit.ps1 -Message "refactor: melhoria" -Files "App.tsx","components/Modal.tsx"
```

### O que o Script Faz
1. ✅ Verifica erros de TypeScript (`tsc --noEmit`)
2. ✅ Verifica ESLint
3. ✅ Mostra diff das alterações
4. ✅ Pede confirmação antes de commitar
5. ✅ Faz push (se `-Push`)

---

## ⚠️ Sinais de Alerta

### Quando NÃO Commitar
- [ ] `tsc --noEmit` retorna erros
- [ ] Você não testou as alterações
- [ ] Alterou arquivo que não entende completamente
- [ ] Múltiplos arquivos grandes modificados sem revisão

### Quando Ter Cuidado Extra
- [ ] Alterando `App.tsx` (roteamento principal)
- [ ] Alterando hooks compartilhados (`use*.ts`)
- [ ] Alterando componentes base usados em múltiplos lugares
- [ ] Alterando tipos/interfaces

---

## 🔧 Para IA (GitHub Copilot)

### Instruções Obrigatórias

1. **Antes de sugerir commit**, SEMPRE:
   - Rodar `get_errors` nos arquivos modificados
   - Verificar se interfaces foram alteradas → verificar usages
   - Se adicionou estado/handler → verificar se está conectado no JSX

2. **Se encontrar erro**, corrigir ANTES de commitar

3. **Documentar o que foi alterado** e potenciais impactos

4. **Usar o script seguro**:
```powershell
.\scripts\safe-commit.ps1 -Message "tipo: descrição" -Push
```

---

## 📝 Convenção de Mensagens

```
<tipo>(<escopo>): <descrição>

Tipos:
- feat: nova funcionalidade
- fix: correção de bug
- refactor: refatoração sem mudar comportamento
- docs: documentação
- chore: tarefas de manutenção
- debug: logs temporários para diagnóstico
- test: adição de testes
```

---

## 🚨 Emergência: Rollback

Se commitou algo quebrado:
```powershell
# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Desfazer último commit (descarta alterações)
git reset --hard HEAD~1

# Se já fez push, reverter
git revert HEAD
git push
```
