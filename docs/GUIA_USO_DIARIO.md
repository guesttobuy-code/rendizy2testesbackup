# 📘 GUIA PRÁTICO: Uso Diário do Sistema

> **TL;DR:** 3 scripts PowerShell facilitam tudo. Use no dia a dia.

---

## 🎯 **ROTINA DIÁRIA (10 Minutos de Overhead)**

### **MANHÃ - Começar Tarefa (2 minutos)**

```powershell
# 1. Executar script automático
.\start-task.ps1 "calendario-v2-ativar"
```

**O que acontece automaticamente:**
- ✅ Atualiza branch main
- ✅ Mantém tudo no `main` (branch único)
- ✅ Copia template de log
- ✅ Abre log no VS Code

**O que você faz (2 minutos):**
1. Editar objetivo no log que abriu
2. Escrever contexto (de onde veio, por quê)
3. Salvar e fechar

---

### **DIA TODO - Trabalhar Normalmente**

#### **Opção 1: Atualizar Log Manualmente** (recomendado)
```markdown
Você programa normalmente e, a cada 15-20 min, adiciona no log:

## 🔧 Mudanças Implementadas

### ✅ App.tsx (linha 1015)
Adicionei rota /calendario-v2

### 🔄 CalendarContext.tsx (81-84)
Corrigindo datas hardcoded
```

**Tempo:** 30 segundos a cada 15-20 minutos

#### **Opção 2: Usar Script Rápido** (automático)
```powershell
# Toda vez que modificar arquivo importante
.\update-log.ps1 "App.tsx" "adicionei rota calendario-v2"
.\update-log.ps1 "CalendarContext.tsx" "corrigi datas hardcoded"
```

**Tempo:** 10 segundos por arquivo

---

### **TARDE - Commits Descritivos**

#### **ANTES (jeito antigo):**
```bash
git add .
git commit -m "fix"
```

#### **AGORA (novo jeito):**
```bash
git add App.tsx
git commit -m "feat(calendario): adicionar rota /calendario-v2

- App.tsx linha 1015 adiciona nova rota
- Permite testar calendário v2 paralelamente
Ref: docs/dev-logs/2024-12-20_calendario-v2-ativar.md"
```

**Tempo extra:** +30 segundos (mas vale MUITO a pena!)

---

### **FIM DO DIA - Finalizar (5 minutos)**

```powershell
# 1. Executar script de finalização
.\finish-task.ps1
```

**O que acontece:**
1. Script pergunta se quer atualizar CHANGELOG → Você diz "S"
2. Abre CHANGELOG.md no VS Code → Você adiciona 2-3 linhas
3. Script pergunta tipo de commit (feat/fix/docs) → Você escolhe
4. Script pergunta escopo (calendario) → Você digita
5. Script pergunta descrição → Você digita
6. Script cria commit automaticamente ✅
7. Script pergunta se quer fazer push → Você diz "S"
8. Push automático ✅

**Tempo total:** 5 minutos

---

## 📊 **COMPARAÇÃO: TEMPO INVESTIDO**

### **Sem Sistema (Jeito Antigo):**
```
Manhã:  0 min (começa direto)
Dia:    0 min (programa só)
Commits: 10 seg ("git commit -m fix")
Fim:    0 min

TOTAL: ~1 minuto/dia
```

**Problema:** Perde contexto, refaz trabalho, debugging difícil

---

### **Com Sistema (Jeito Novo):**
```
Manhã:  2 min (script + preencher objetivo)
Dia:    3 min (atualizar log 6x de 30seg)
Commits: 2 min (commits descritivos 4x de 30seg)
Fim:    5 min (script + CHANGELOG)

TOTAL: ~12 minutos/dia
```

**Benefício:** 
- ✅ Contexto sempre preservado
- ✅ Nunca perde trabalho
- ✅ IA entende tudo rapidamente
- ✅ Onboarding de novos devs: 1 hora (não 1 semana)

---

## 🎯 **EXEMPLO PRÁTICO DO DIA TODO**

### **09:00 - Começo do Dia**
```powershell
PS> .\start-task.ps1 "calendario-v2-ativar"
🚀 Iniciando nova tarefa: calendario-v2-ativar
📥 Atualizando branch main...
📝 Criando log: docs/dev-logs/2024-12-20_calendario-v2-ativar.md
✏️  Abrindo log no VS Code...

✅ Tudo pronto!
```

**No VS Code que abriu, você edita (2 minutos):**
```markdown
## 🎯 Objetivo da Sessão
Ativar rota /calendario-v2 e testar paralelamente com calendário antigo

## 📝 Contexto
Refatoração React Query foi feita dia 16/12 mas rota não foi ativada.
Sistema continua usando componentes antigos.
```

---

## 📚 **NOME TÉCNICO DISSO**

Este sistema combina:

1. **Version Control** (Git)
2. **Semantic Versioning** (versionamento semântico)
3. **Conventional Commits** (commits padronizados)
4. **Change Log** (registro de mudanças)
5. **Development Log** (diário de desenvolvimento)
6. **Documentation-Driven Development**

**No mercado:** "Boas práticas de engenharia de software"

---

## 🔗 **SOBRE O "Ligando os Motores Único.md"**

Esse arquivo **não foi incluído** porque é documentação **operacional** (setup, deploy).

**Onde ele deveria ficar:**
```
docs/
├── README_DOCUMENTACAO.md
├── operations/              ← Nova pasta recomendada
│   ├── SETUP_INICIAL.md    ← "Ligando os motores único.md" aqui
│   ├── DEPLOY_PRODUCAO.md
│   └── TROUBLESHOOTING.md
```

---

## ✅ **RESUMO EXECUTIVO**

**3 Scripts PowerShell criados:**
- ✅ `start-task.ps1` - Inicia tarefa (2 min)
- ✅ `update-log.ps1` - Atualiza log (10 seg)
- ✅ `finish-task.ps1` - Finaliza (5 min)

**Overhead diário:**
- Manual: ~20 min/dia
- Com scripts: ~12 min/dia ✅

**É automático?**
- 70% automatizado ✅
- 30% manual (descrições)

**Próximos passos:**
Testar na próxima tarefa e ajustar conforme necessário
