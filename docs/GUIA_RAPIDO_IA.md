# 🤖 GUIA RÁPIDO PARA IA - Contexto do Projeto

> **Para:** GitHub Copilot, Claude, ou qualquer IA que trabalhe neste projeto  
> **Objetivo:** Fornecer contexto completo em 5 minutos de leitura

---

## 📍 ONDE ESTOU?

**Projeto:** RENDIZY - Sistema de gestão de imóveis para aluguel temporário  
**Tecnologias:** React + TypeScript + Supabase + Deno Edge Functions  
**Versão Atual:** v1.0.103.406 (Dezembro 2024)

---

## 📚 PRIMEIRA COISA: LER A DOCUMENTAÇÃO

### **Índice Central (SEMPRE COMECE AQUI):**
📖 **[docs/README_DOCUMENTACAO.md](README_DOCUMENTACAO.md)**

Esse arquivo é o **mapa do projeto**. Contém:
- Links para todos os documentos importantes
- Logs de desenvolvimento cronológicos
- Arquitetura do sistema
- APIs disponíveis
- Issues conhecidos

### **Processo de Desenvolvimento:**
📋 **[docs/WORKFLOW_DESENVOLVIMENTO.md](WORKFLOW_DESENVOLVIMENTO.md)**

Explica como trabalhar no projeto:
- Política de Git (branch único: `main`)
- Padrão de commits
- Como documentar mudanças
- Testes obrigatórios

---

## 🗂️ ESTRUTURA DO PROJETO

```
Rendizyoficial-main/
├── components/              ← UI Components (React)
│   ├── calendar/           ← Módulo de calendário
│   ├── anuncio-ultimate/   ← Sistema de anúncios
│   └── StaysNetIntegration/ ← Integração Stays.net
├── contexts/               ← React Contexts
│   └── CalendarContext.tsx ← Estado global do calendário
├── hooks/                  ← Custom React Hooks
│   └── useCalendarData.ts  ← Hook de dados do calendário
├── supabase/               ← Backend (Deno + PostgreSQL)
│   ├── functions/          ← Edge Functions
│   │   └── rendizy-server/ ← API principal
│   └── migrations/         ← Migrations SQL
├── docs/                   ← 📍 DOCUMENTAÇÃO (IMPORTANTE!)
│   ├── README_DOCUMENTACAO.md ← 🎯 COMECE AQUI
│   ├── dev-logs/           ← Logs diários de desenvolvimento
│   └── WORKFLOW_DESENVOLVIMENTO.md
├── CHANGELOG.md            ← Histórico de versões
└── App.tsx                 ← Componente raiz
```

---

## 🎯 CONTEXTO ATUAL (Dezembro 2024)

### **O que funciona:** ✅
- ✅ Sistema de anúncios (Anúncios Ultimate)
- ✅ Gestão de reservas (CRUD completo)
- ✅ Integração StaysNet (autenticação corrigida)
- ✅ Backend em Deno Edge Functions
- ✅ Autenticação multi-tenant

### **O que está em progresso:** 🔄
- 🔄 Calendário v2 (React Query implementado mas não ativado)
- 🔄 Migração de documentação antiga para nova estrutura

### **Issues conhecidos:** 🔴
- 🔴 **#42**: Calendário com datas hardcoded (outubro ao invés de dezembro)
- 🔴 **#41**: Rota `/calendario-v2` não ativada no App.tsx

---

## 🚨 REGRAS CRÍTICAS (NÃO QUEBRE!)

### **1. Arquitetura Modular (Cápsulas)**
```typescript
// ✅ BOM: Módulos separados e independentes
components/StaysNetIntegration/
├── index.tsx (9 linhas - só export)
├── hooks/
├── components/
├── services/
└── utils/

// ❌ RUIM: Tudo em um arquivo de 1500 linhas
components/StaysNetIntegration.tsx (1469 linhas - monolito)
```

### **2. Autenticação StaysNet**
```typescript
// ✅ CORRETO (Supabase Edge + sessão do app):
// - Authorization/apikey: ANON KEY (JWT do Supabase Gateway)
// - X-Auth-Token: token de sessão real do usuário (Rendizy)
headers: {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY,
  'X-Auth-Token': sessionToken
}

// ❌ ERRADO: colocar token do usuário no Authorization (gateway tenta validar como JWT)
headers: {
  'Authorization': `Bearer ${sessionToken}` // NÃO USAR!
}
```

### **3. Sistema de Anúncios**
```sql
-- ✅ Sistema ATIVO: properties (Sistema Ultimate)
-- Tabela única: properties
-- Não existe tabela separada de rascunhos

-- ❌ Sistema DESCONTINUADO: properties (Wizard antigo)
-- Não usar mais!
```

### **4. Commits Semânticos (Obrigatório)**
```bash
# ✅ CERTO
git commit -m "fix(calendario): corrigir datas hardcoded

- CalendarContext.tsx linhas 81-84 agora usam new Date()
Fixes: #42"

# ❌ ERRADO
git commit -m "fix"
```

---

## 🔍 COMO ENCONTRAR INFORMAÇÃO

### **Procurando por funcionalidade específica?**

1. **Abra:** [docs/README_DOCUMENTACAO.md](README_DOCUMENTACAO.md)
2. **Busque** na seção apropriada:
   - **Arquitetura** → `architecture/`
   - **API** → `api/`
   - **Bugs** → "Issues Conhecidos"
   - **Histórico** → `dev-logs/`

### **Procurando por código relacionado a X?**

```bash
# Busca semântica no workspace
grep -r "texto" .

# Busca em arquivos específicos
grep -r "CalendarContext" components/

# Busca em logs de desenvolvimento
grep -r "calendário" docs/dev-logs/
```

### **Procurando o que mudou recentemente?**

1. **CHANGELOG.md** - Mudanças por versão
2. **docs/dev-logs/** - Logs diários
3. **git log** - Commits recentes

---

## 📋 CHECKLIST ANTES DE FAZER MUDANÇAS

### **1. Entender o contexto:**
- [ ] Li o log de desenvolvimento mais recente?
- [ ] Entendi qual problema estou resolvendo?
- [ ] Sei quais arquivos estão envolvidos?

### **2. Verificar documentação:**
- [ ] Existe doc sobre esse módulo?
- [ ] Há issues relacionadas?
- [ ] Alguém já tentou resolver isso?

### **3. Planejar mudança:**
- [ ] Sei ONDE mudar?
- [ ] Sei COMO mudar?
- [ ] Sei POR QUE mudar?

### **4. Executar mudança:**
- [ ] Confirmar que está no branch `main`
- [ ] Fazer mudanças incrementais
- [ ] Commitar com mensagem descritiva
- [ ] Documentar no dev-log

### **5. Validar:**
- [ ] Testes manuais passaram?
- [ ] Nenhum console.error?
- [ ] CHANGELOG atualizado?

---

## 🎓 PADRÕES DE CÓDIGO

### **React Components:**
```typescript
// ✅ BOM: Tipos explícitos, props documentadas
interface CalendarProps {
  /** Data inicial exibida */
  currentMonth: Date;
  /** Propriedades selecionadas para filtro */
  selectedProperties: string[];
}

export function Calendar({ currentMonth, selectedProperties }: CalendarProps) {
  // ...
}
```

### **Backend (Deno):**
```typescript
// ✅ BOM: Validação + error handling + logging
export async function createReservation(c: Context) {
  try {
    logInfo('[createReservation] Iniciando...');
    
    // Validar input
    const body = await c.req.json();
    if (!body.propertyId) {
      return c.json(validationErrorResponse('propertyId required'), 400);
    }
    
    // Lógica...
    
    return c.json(successResponse(data), 201);
  } catch (error) {
    logError('[createReservation]', error);
    return c.json(errorResponse('Internal error'), 500);
  }
}
```

---

## 🐛 DEBUGGING COMUM

### **Problema: Calendário mostra data errada**
```typescript
// CAUSA: Datas hardcoded em CalendarContext.tsx linha 81-84
// SOLUÇÃO: Usar new Date() ao invés de new Date(2025, 9, 24)
```

### **Problema: StaysNet retorna 401**
```typescript
// CAUSA: Headers errados
// SOLUÇÃO: Usar X-Auth-Token ao invés de Authorization Bearer
```

### **Problema: Reserva não é criada (FK error)**
```sql
-- CAUSA: FK aponta para tabela errada (properties)
-- SOLUÇÃO: FK deve apontar para properties
```

---

## 📞 CONTATO E RECURSOS

### **Documentação Online:**
- Supabase: https://supabase.com/docs
- React Query: https://tanstack.com/query
- Deno: https://deno.land/manual

### **Repositório:**
- GitHub: [URL do repositório]
- Issues: [URL/issues]

### **Time:**
- Rafael (Product Owner)
- GitHub Copilot (AI Assistant)

---

## 🚀 COMEÇANDO AGORA

### **Primeira tarefa?**

1. Leia [docs/README_DOCUMENTACAO.md](README_DOCUMENTACAO.md)
2. Leia último dev-log em `docs/dev-logs/`
3. Verifique CHANGELOG.md para entender versão atual
4. Identifique a tarefa no índice
5. Crie novo dev-log usando template
6. Comece a trabalhar seguindo workflow

### **Dúvidas?**

- **Sobre arquitetura:** Leia `docs/architecture/`
- **Sobre API:** Leia `docs/api/`
- **Sobre processo:** Leia `docs/WORKFLOW_DESENVOLVIMENTO.md`
- **Sobre bug:** Busque em `docs/dev-logs/` ou Issues

---

## 💡 DICA FINAL

**Quando em dúvida:**
1. Leia a documentação (docs/)
2. Busque em logs anteriores (dev-logs/)
3. Verifique CHANGELOG.md
4. Só então faça mudanças

**Lembre-se:**
- ✅ Documentar é tão importante quanto codificar
- ✅ Contexto salvo hoje = tempo economizado amanhã
- ✅ Commits descritivos = auditoria fácil
- ✅ Testes antes de commitar = menos bugs

---

**Última Atualização:** 2024-12-19  
**Próxima Revisão:** Quando houver mudança arquitetural significativa  
**Versão:** 1.0
