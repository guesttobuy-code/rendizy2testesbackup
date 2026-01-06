# 🚀 Ligando os Motores — Prompt de Inicialização de Chat

> **IMPORTANTE:** Cole este arquivo inteiro no início de um novo chat para que a IA se ambientar no projeto Rendizy.

---

## 📋 INSTRUÇÕES PARA A IA

Você está iniciando uma sessão de trabalho no projeto **Rendizy** — um SaaS multi-tenant para gestão de imóveis de temporada, aluguel curto prazo e integração com canais como Stays.net, Airbnb, Booking.com, etc.

### 🔴 LEITURA OBRIGATÓRIA (execute nesta ordem)

Antes de responder qualquer pergunta ou executar qualquer tarefa, você **DEVE** ler e processar os seguintes arquivos:

---

### 1️⃣ DOCUMENTAÇÃO CORE (`/docs`)

Leia **TODOS** os arquivos na pasta `/docs` (subpastas incluídas):

```
docs/
├── 01-setup/           ← Configuração inicial e ambiente
├── 02-architecture/    ← Arquitetura do sistema
├── 03-conventions/     ← Convenções de código e nomenclatura
├── 04-modules/         ← Documentação por módulo
├── 05-operations/      ← Operações e deploy
├── 06-troubleshooting/ ← Resolução de problemas comuns
├── 07-sessions/        ← Logs de sessões anteriores
├── changelogs/         ← Histórico de mudanças
├── resumos/            ← Resumos executivos
└── README.md           ← Índice principal
```

**Comando para ler todos:**
```
Leia recursivamente todos os arquivos .md em /docs
```

---

### 2️⃣ CHANGELOGS (Histórico de Mudanças)

Leia **TODOS** os changelogs para entender a evolução recente:

```
docs/changelogs/*.md
CHANGELOG*.md (na raiz e subpastas)
```

**Arquivos prioritários:**
- `CHANGELOG.md` (raiz)
- `docs/changelogs/` (pasta completa)
- Qualquer arquivo com padrão `CHANGELOG_V*.md`

---

### 3️⃣ SETUP COMPLETO (Ligando os Motores Único)

Leia o arquivo consolidado de setup:

```
docs/operations/SETUP_COMPLETO.md
```

Este arquivo contém:
- Modelo único de acesso ao Supabase
- Configuração de ambiente
- Regras de ouro do projeto
- Histórico de decisões arquiteturais

---

### 4️⃣ ÚLTIMOS 20 ARQUIVOS .MD POR DATA

Execute este comando PowerShell para identificar os arquivos mais recentes:

```powershell
Get-ChildItem -Path "." -Recurse -Filter "*.md" -File | 
  Where-Object { $_.FullName -notmatch "node_modules|\.git|offline_archives" } |
  Sort-Object LastWriteTime -Descending | 
  Select-Object -First 20 FullName, LastWriteTime |
  Format-Table -AutoSize
```

Leia esses 20 arquivos para entender o contexto atual de trabalho.

---

### 5️⃣ ARQUIVOS DE CONTEXTO CRÍTICO

Sempre verifique estes arquivos se existirem:

| Arquivo | Propósito |
|---------|-----------|
| `_PROMPT_NOVO_CHAT__*.md` | Prompts de handoff de sessões anteriores |
| `CHECKLIST_ANTES_DE_MUDAR_CODIGO.md` | Regras antes de alterar código |
| `docs/README_PARA_IA.md` | Guia específico para IAs |
| `docs/GUIA_USO_DIARIO.md` | Fluxo de trabalho diário |

---

## 🏗️ STACK TECNOLÓGICO

| Camada | Tecnologia |
|--------|------------|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + Radix UI |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (anon key, não SSR) |
| Storage | Supabase Storage |
| Deploy Frontend | Vercel |
| Deploy Backend | Supabase CLI |
| Integrações | Stays.net API, Evolution API (WhatsApp) |

---

## 🚨 REGRAS DE OURO (NUNCA VIOLAR)

1. **Autenticação:** Usar APENAS `supabase-js` com `anon_key` via localStorage. NUNCA cookies HttpOnly.

2. **Multi-tenancy:** TODA query deve filtrar por `organization_id`. Sem exceção.

3. **Nomenclatura:** Seguir padrões em `docs/03-conventions/`

4. **Antes de editar:** Verificar `CHECKLIST_ANTES_DE_MUDAR_CODIGO.md`

5. **Deploy:** 
   - Frontend: `git push` → Vercel auto-deploy
   - Backend: `npx supabase functions deploy`

6. **🛡️ COMMIT SEGURO — SEMPRE REVISAR ANTES DE COMMITAR:**
   - Rodar `npx tsc --noEmit` antes de qualquer commit
   - Verificar se alterações não quebraram código existente
   - Usar o script: `.\scripts\safe-commit.ps1 -Message "tipo: desc" -Push`
   - Ler `docs/COMMIT_SEGURO.md` para mais detalhes

---

## 📍 ESTADO ATUAL DO PROJETO

Após ler a documentação, você deve ser capaz de responder:

- [ ] Qual é a versão atual do sistema?
- [ ] Quais foram as últimas 5 alterações significativas?
- [ ] Existem bugs conhecidos ou issues pendentes?
- [ ] Qual módulo está sendo desenvolvido atualmente?
- [ ] Existem handoffs pendentes de sessões anteriores?

---

## 🎯 APÓS LEITURA, CONFIRME:

Depois de processar toda a documentação, responda:

```
✅ Documentação lida e processada.

📊 Resumo do Estado Atual:
- Versão: [identificar]
- Último changelog: [identificar]
- Módulo em foco: [identificar]
- Issues pendentes: [listar se houver]

🎯 Pronto para receber instruções.
```

---

## 📝 TEMPLATE DE RESPOSTA INICIAL

Use este formato após processar a documentação:

```markdown
# 🚀 Sessão Iniciada — [DATA]

## 📚 Documentação Processada
- [x] /docs (X arquivos)
- [x] Changelogs (X arquivos)
- [x] SETUP_COMPLETO.md
- [x] Últimos 20 .md por data

## 📍 Contexto Identificado
- Versão atual: vX.X.X
- Último trabalho: [descrição]
- Handoffs pendentes: [sim/não]

## ⚠️ Alertas
- [listar se houver]

## ✅ Pronto
Aguardando instruções.
```

---

**Última atualização:** 2026-01-05
**Autor:** Equipe Rendizy
