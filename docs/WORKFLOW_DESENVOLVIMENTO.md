# 📘 GUIA: Workflow Profissional de Desenvolvimento

## 🎯 Objetivo

Este documento define o **processo padrão** para desenvolvimento no Rendizy, garantindo que:
- ✅ Nada se perde (código + contexto preservados)
- ✅ Qualquer dev (ou IA) pode continuar de onde parou
- ✅ Histórico auditável e rastreável

---

## 🔄 FLUXO DE TRABALHO (Passo a Passo)

### 1️⃣ ANTES DE COMEÇAR

```bash
# 1. Criar branch de feature
git checkout -b feat/nome-da-feature

# 2. Criar log de desenvolvimento
cp docs/DEV_LOG_TEMPLATE.md docs/dev-logs/YYYY-MM-DD_nome-tarefa.md

# 3. Editar log com objetivo e contexto
code docs/dev-logs/YYYY-MM-DD_nome-tarefa.md
```

**Exemplo de objetivo bem definido:**
```markdown
## 🎯 Objetivo da Sessão
Ativar rota /calendario-v2 e testar migração do calendário antigo

## 📝 Contexto
Refatoração React Query foi feita dia 16/12 mas rota não foi ativada.
Sistema continua usando componentes antigos com datas hardcoded.

Arquivos envolvidos:
- App.tsx (adicionar rota)
- CalendarContext.tsx (corrigir datas)
- main.tsx (verificar imports)
```

---

### 2️⃣ DURANTE O DESENVOLVIMENTO

#### **A cada mudança significativa:**

```typescript
// 1. ANTES de modificar, documente PORQUE
/**
 * BUG #42: Datas hardcoded causam calendário mostrar outubro
 * SOLUÇÃO: Usar new Date() para pegar data atual
 * RELACIONADO: docs/dev-logs/2024-12-19_auditoria-calendario.md
 */
const initialState: CalendarState = {
  dateRange: {
    from: new Date(), // ← ANTES: new Date(2025, 9, 24)
    to: addDays(new Date(), 30) // ← ANTES: new Date(2025, 10, 11)
  }
};
```

#### **Atualizar log continuamente:**

```markdown
## 🔧 Mudanças Implementadas

### ✅ Arquivo: `contexts/CalendarContext.tsx` (Linhas 81-84)
**Status:** Completo  
**Motivo:** Datas hardcoded causavam bug #42  
**Commit:** abc123  

### 🔄 Arquivo: `App.tsx` (Linha 1015)
**Status:** Em progresso  
**Motivo:** Adicionar rota /calendario-v2  
```

---

### 3️⃣ COMMITS (Padrão Conventional)

```bash
# ❌ ERRADO (genérico)
git commit -m "fix"

# ✅ CERTO (descritivo)
git commit -m "fix(calendario): corrigir datas hardcoded outubro→dezembro

- CalendarContext.tsx linhas 81-84 agora usam new Date()
- Calendário mostra data atual ao invés de outubro 2025
- Remove constantes HARDCODED_START e HARDCODED_END

Fixes: #42
Docs: docs/dev-logs/2024-12-19_auditoria-calendario.md"
```

#### **Prefixos Obrigatórios:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `refactor:` - Refatoração (sem mudar comportamento)
- `docs:` - Apenas documentação
- `test:` - Adicionar/corrigir testes
- `chore:` - Manutenção (build, deps, etc)

#### **Formato Completo:**
```
<tipo>(<escopo>): <descrição curta>
<linha vazia>
<corpo explicativo>
<linha vazia>
Fixes: #issue-number
Docs: caminho/para/doc.md
```

---

### 4️⃣ TESTES (Checklist Obrigatório)

```markdown
## 🧪 Testes Realizados

### Teste Manual
- [x] Calendário abre sem erros
- [x] Data atual (19/12) é exibida
- [x] Reservas aparecem corretamente
- [ ] Navegação entre meses funciona

### Teste Funcional
- [x] API responde com status 200
- [x] Cache funciona (5 minutos)
- [ ] Performance: < 1s para carregar

### Teste de Regressão
- [x] Rota antiga /calendario ainda funciona
- [x] Não quebrou módulo de reservas
```

---

### 5️⃣ DOCUMENTAÇÃO (Atualizar Docs)

```markdown
## 📚 Documentação Criada/Atualizada

- ✅ `docs/dev-logs/2024-12-19_calendario-v2.md` (novo)
- ✅ `CHANGELOG.md` (adicionado entrada [1.0.103.406])
- ✅ `docs/README_DOCUMENTACAO.md` (atualizado índice)
- ⚠️ `README.md` (falta atualizar)
```

---

### 6️⃣ FINALIZAÇÃO (Antes de Pushar)

```bash
# 1. Verificar mudanças
git status
git diff

# 2. Atualizar CHANGELOG.md
# Adicionar na seção [Unreleased]:
#   ### Added
#   - Rota /calendario-v2 com React Query
#
#   ### Fixed
#   - #42: Calendário mostrando datas hardcoded

# 3. Commit final
git add .
git commit -m "docs: atualizar CHANGELOG e logs de desenvolvimento"

# 4. Push da branch
git push origin feat/calendario-v2

# 5. Criar Pull Request (GitHub)
# Título: "feat(calendario): ativar calendário v2 com React Query"
# Descrição: Colar conteúdo do dev-log
```

---

## 📊 CHECKLIST FINAL (Antes de Mergear)

```markdown
### Código
- [ ] Commits seguem padrão Conventional
- [ ] Código comentado (motivos, não o quê)
- [ ] Sem console.logs desnecessários
- [ ] Nenhum TODO sem issue linkada

### Testes
- [ ] Testes manuais passaram
- [ ] Sem erros no console
- [ ] Performance aceitável

### Documentação
- [ ] CHANGELOG.md atualizado
- [ ] Dev log criado em docs/dev-logs/
- [ ] README atualizado (se necessário)
- [ ] Docs de API atualizadas (se mudou endpoints)

### Git
- [ ] Branch atualizada com main
- [ ] Sem conflitos
- [ ] Pull Request criado
- [ ] Issues relacionadas linkadas
```

---

## 🚨 EMERGÊNCIAS (Código Quebrou)

### Se algo quebrar em produção:

```bash
# 1. ROLLBACK IMEDIATO
git revert HEAD
git push origin main

# 2. Criar HOTFIX
git checkout -b hotfix/nome-do-problema
# ... fazer correção ...
git commit -m "hotfix: descrição do problema"

# 3. Documentar incidente
cat > docs/incidents/YYYY-MM-DD_nome-incidente.md <<EOF
# 🚨 INCIDENTE: [Título]

## Impacto
- Sistema: [calendário, reservas, etc]
- Severidade: [critical, high, medium, low]
- Downtime: [X minutos]

## Timeline
- 10:00 - Problema detectado
- 10:05 - Rollback aplicado
- 10:15 - Hotfix deployado
- 10:30 - Sistema normalizado

## Causa Raiz
[Explicação detalhada]

## Correção Aplicada
[O que foi feito]

## Prevenção Futura
[Como evitar que aconteça novamente]
EOF
```

---

## 🎓 BOAS PRÁTICAS

### ✅ FAZER:
- Commits pequenos e frequentes
- Branches por feature
- Documentar ANTES de codificar
- Testar ANTES de commitar
- Revisar próprio código antes de PR

### ❌ NÃO FAZER:
- Commits genéricos ("fix", "update", "changes")
- Trabalhar direto na main
- Commitar sem testar
- Deixar TODOs sem issue
- Código comentado sem explicação

---

## 📚 RECURSOS ÚTEIS

### Ferramentas Recomendadas:
- **Commitizen**: Ajuda a escrever commits padronizados
  ```bash
  npm install -g commitizen
  git cz  # Ao invés de git commit
  ```

- **Husky**: Valida commits antes de aceitar
  ```bash
  npm install --save-dev husky
  npx husky install
  ```

- **Conventional Changelog**: Gera CHANGELOG automático
  ```bash
  npm install -g conventional-changelog-cli
  conventional-changelog -p angular -i CHANGELOG.md -s
  ```

### Links:
- [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
- [Keep a Changelog](https://keepachangelog.com/pt-BR/)
- [Semantic Versioning](https://semver.org/lang/pt-BR/)

---

## 🎯 EXEMPLO COMPLETO (Início ao Fim)

### Dia 1 - Início
```bash
# 1. Criar branch
git checkout -b feat/calendario-v2

# 2. Criar log
cp docs/DEV_LOG_TEMPLATE.md docs/dev-logs/2024-12-20_ativar-calendario-v2.md

# 3. Editar objetivo
vim docs/dev-logs/2024-12-20_ativar-calendario-v2.md
# (definir objetivo, contexto, tarefas)

# 4. Trabalhar...
# (fazer mudanças, documentar no log)

# 5. Commit incremental
git add contexts/CalendarContext.tsx
git commit -m "fix(calendario): corrigir datas hardcoded

Linhas 81-84 agora usam new Date() ao invés de outubro hardcoded
Ref: docs/dev-logs/2024-12-20_ativar-calendario-v2.md"

# 6. Continuar trabalhando...
```

### Dia 1 - Fim
```bash
# 7. Atualizar CHANGELOG
vim CHANGELOG.md
# (adicionar em [Unreleased])

# 8. Commit de docs
git add CHANGELOG.md docs/
git commit -m "docs: atualizar CHANGELOG e dev-log do dia"

# 9. Push
git push origin feat/calendario-v2
```

### Dia 2 - Finalização
```bash
# 10. Criar Pull Request no GitHub
# Título: feat(calendario): ativar calendário v2
# Corpo: Colar resumo do dev-log

# 11. Review + aprovar

# 12. Merge
git checkout main
git merge feat/calendario-v2
git push origin main

# 13. Tag de versão
git tag v1.0.103.406
git push --tags

# 14. Atualizar CHANGELOG (mover Unreleased → versão)
vim CHANGELOG.md
git commit -m "chore: release v1.0.103.406"
```

---

**Última Atualização:** 2024-12-19  
**Autor:** Time Rendizy  
**Revisão:** v1.0
