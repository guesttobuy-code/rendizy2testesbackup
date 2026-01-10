# 📋 PROMPT DE CONTEXTO COMPLETO - Sessão 06/11/2025

**Data:** 06/11/2025  
**Versão Projeto:** v1.0.103.322  
**Objetivo:** Documentar todas as alterações e análises para contexto futuro

---

## 🎯 SITUAÇÃO INICIAL DO PROJETO

### **Arquitetura:**
- **Frontend:** React 18.3.1 + TypeScript + Vite 6.3.5
- **Backend:** Deno + Hono (Supabase Edge Functions)
- **Banco:** PostgreSQL (Supabase) - **MIGRADO PARA SQL RELACIONAL**
- **Roteamento:** React Router DOM (NÃO Next.js)
- **Deploy:** Frontend (Vercel) + Backend (Supabase)

### **Status:**
- ✅ **Banco de Dados:** 35 tabelas relacionais criadas
- ❌ **Backend:** Ainda usa KV Store (não migrado para SQL relacional)
- ✅ **Frontend:** Funcionando com React Router

---

## 📊 SCHEMA DO BANCO DE DADOS

### **Total de Tabelas:** 35

**Principais Tabelas:**
- `organizations` - Organizações/Imobiliárias
- `users` - Usuários do sistema
- `properties` - Imóveis/Acomodações
- `locations` - Locais/Edifícios
- `listings` - Anúncios nas plataformas
- `reservations` - Reservas
- `guests` - Hóspedes
- `blocks` - Bloqueios de calendário
- `rooms`, `beds`, `room_photos` - Estrutura de quartos
- `accommodation_rules` - Regras de acomodação
- `pricing_settings`, `custom_prices`, `custom_min_nights` - Precificação
- `chat_channels_config`, `chat_conversations`, `chat_messages` - Sistema de chat
- `evolution_instances` - WhatsApp Evolution API
- `staysnet_*` - Integração Stays.net
- `short_ids` - IDs curtos para URLs
- `kv_store_67caf26a` - KV Store (legado?)

### **Questões Críticas Identificadas:**

1. **`evolution_instances`** - Perdeu `user_id`, como funciona multi-tenant agora?
2. **Duas tabelas WhatsApp Config** - `organization_channel_config` vs `chat_channels_config`
3. **`kv_store_67caf26a`** - Ainda está sendo usada ou é legado?
4. **Campos ARRAY** - Vários sem tipo definido (TEXT[], UUID[], etc)
5. **RLS** - Políticas não documentadas no schema

**Documentos Criados:**
- `SCHEMA_ANALISE_COMPLETA.md` - Análise detalhada de todas as 35 tabelas
- `SCHEMA_RESUMO_VISUAL.md` - Resumo visual com diagramas
- `SCHEMA_QUESTOES_PENDENTES.md` - 8 questões que precisam de decisão

---

## 🔄 MIGRAÇÃO BACKEND: KV STORE → SQL RELACIONAL

### **Situação Atual:**
- ❌ Backend ainda usa `kv_store.tsx` (KV Store)
- ❌ Todas as rotas salvam em `kv_store_67caf26a` (JSON)
- ❌ Não está usando as 35 tabelas relacionais criadas

### **Problema:**
```
Backend → kv_store.tsx → kv_store_67caf26a (JSON)
                ❌
Banco → 35 tabelas relacionais (vazias ou não sincronizadas)
```

### **Plano de Migração:**
1. Criar módulo `db.ts` para acessar tabelas relacionais
2. Migrar rotas gradualmente (organizations → properties → reservations)
3. Migrar dados do KV Store se necessário
4. Remover dependência do KV Store

**Documento Criado:**
- `PLANO_MIGRACAO_BACKEND.md` - Plano completo com código exemplo

---

## 🔐 ALTERAÇÕES NO PROTECTEDROUTE

### **Arquivo Modificado:**
- `src/components/ProtectedRoute.tsx`

### **Melhorias Implementadas:**
1. ✅ Verificação de rotas públicas (`/login`, `/signup`, `/reset-password`)
2. ✅ Verificação de organização (redireciona para `/onboarding` se não tiver)
3. ✅ Redirecionamento inteligente (usuário autenticado acessando `/login` → redireciona para `/`)
4. ✅ Nova prop `requireOrganization` (padrão: `true`)

### **Código Adaptado:**
- Lógica do middleware Next.js adaptada para React Router
- Integrado com `AuthContext` existente
- Compatível com estrutura atual do projeto

**Documentos Criados:**
- `ANALISE_MIDDLEWARE_CHATGPT.md` - Análise do código Next.js
- `RESUMO_IMPLEMENTACAO_PROTECTED_ROUTE.md` - Guia de uso

---

## 📝 ANÁLISES DE CÓDIGOS DO CHATGPT

### **1. Middleware Next.js**
- **Código:** Middleware para Next.js App Router
- **Problema:** Projeto usa React Router DOM
- **Solução:** Adaptado para `ProtectedRoute.tsx` (componente React)
- **Status:** ✅ Implementado

### **2. Página Onboarding Next.js**
- **Código:** `/app/onboarding/page.tsx` (Next.js)
- **Problema:** Projeto usa React Router
- **Solução:** Precisa criar `OnboardingPage.tsx` adaptado
- **Status:** ⏳ Pendente

### **3. Trigger SQL Signup**
- **Código:** Trigger para criar organização automaticamente
- **Problema:** Faltam campos obrigatórios, slug hardcoded
- **Solução:** Versão corrigida criada, recomendado usar Edge Function + Webhook
- **Status:** ⚠️ Precisa implementar

### **4. Prompt Multi-Tenant Completo**
- **Código:** Sistema completo multi-tenant para Next.js
- **Problema:** Tudo para Next.js (Server Components, RSC, etc)
- **Solução:** Estrutura adaptada para React + Vite documentada
- **Status:** ⚠️ Precisa implementar

**Documentos Criados:**
- `ANALISE_TRIGGER_SIGNUP.md` - Análise e versão corrigida do trigger
- `ANALISE_PROMPT_MULTI_TENANT.md` - Análise completa com adaptações
- `RESUMO_ANALISES_CHATGPT.md` - Resumo executivo

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS NESTA SESSÃO

### **Documentação (10 arquivos):**
1. `SCHEMA_ANALISE_COMPLETA.md` - Análise completa do schema
2. `SCHEMA_RESUMO_VISUAL.md` - Resumo visual
3. `SCHEMA_QUESTOES_PENDENTES.md` - Questões a resolver
4. `PLANO_MIGRACAO_BACKEND.md` - Plano de migração
5. `RESUMO_SITUACAO_ATUAL.md` - Resumo executivo
6. `ANALISE_MIDDLEWARE_CHATGPT.md` - Análise middleware
7. `RESUMO_IMPLEMENTACAO_PROTECTED_ROUTE.md` - Guia ProtectedRoute
8. `ANALISE_TRIGGER_SIGNUP.md` - Análise trigger SQL
9. `ANALISE_PROMPT_MULTI_TENANT.md` - Análise multi-tenant
10. `RESUMO_ANALISES_CHATGPT.md` - Resumo análises

### **Código Modificado (1 arquivo):**
1. `src/components/ProtectedRoute.tsx` - Melhorado com lógica de organização

---

## ⚠️ QUESTÕES PENDENTES QUE PRECISAM DE DECISÃO

### **1. evolution_instances**
- **Problema:** Schema atual não tem `user_id` ou `organization_id`
- **Pergunta:** Como funciona multi-tenant agora?
- **Opções:**
  - A) Adicionar `organization_id UUID` (FK)
  - B) Manter sem FK (instância global)
  - C) Adicionar `user_id` de volta
- **Recomendação:** Opção A

### **2. Duas Tabelas WhatsApp Config**
- **Problema:** Existem 2 tabelas:
  - `organization_channel_config` (antiga, TEXT)
  - `chat_channels_config` (nova, UUID FK)
- **Pergunta:** Qual usar?
- **Recomendação:** Usar apenas `chat_channels_config`

### **3. kv_store_67caf26a**
- **Problema:** Tabela ainda existe, mas sistema migrou para SQL relacional
- **Pergunta:** Ainda está sendo usada?
- **Ação:** Verificar se há dados, migrar se necessário

### **4. Migração Backend**
- **Problema:** Backend ainda usa KV Store
- **Ação:** Migrar gradualmente para tabelas relacionais
- **Prioridade:** Alta

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

### **Curto Prazo (Esta Semana):**
1. ✅ Criar `OnboardingPage.tsx` (adaptado do código ChatGPT)
2. ✅ Testar fluxo de onboarding
3. ✅ Decidir sobre questões críticas (evolution_instances, etc)

### **Médio Prazo (Próximas 2 Semanas):**
1. ✅ Criar módulo `db.ts` para acessar tabelas relacionais
2. ✅ Migrar rotas backend (organizations → properties → reservations)
3. ✅ Criar seed automático (Edge Function + Webhook)
4. ✅ Implementar `OrganizationContext` e `useOrganization` hook

### **Longo Prazo (Futuro):**
1. ✅ Implementar Realtime para organizações
2. ✅ Melhorar RLS policies
3. ✅ Otimizar performance

---

## 📚 ESTRUTURA DO PROJETO

```
Rendizy2producao-main/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.tsx          ← MODIFICADO (melhorado)
│   │   └── OnboardingPage.tsx          ← CRIAR (pendente)
│   ├── contexts/
│   │   ├── AuthContext.tsx            ← Existe
│   │   └── OrganizationContext.tsx   ← CRIAR (pendente)
│   ├── hooks/
│   │   └── useOrganization.ts         ← CRIAR (pendente)
│   └── lib/
│       └── org/                       ← CRIAR (pendente)
│
├── supabase/
│   ├── functions/
│   │   └── rendizy-server/
│   │       ├── index.ts               ← Usa KV Store (precisa migrar)
│   │       ├── kv_store.tsx           ← Usado atualmente
│   │       └── db.ts                  ← CRIAR (pendente)
│   └── migrations/
│       └── (8 migrations existentes)
│
└── (documentação criada na raiz)
```

---

## 🔑 PONTOS IMPORTANTES PARA CONTEXTO FUTURO

### **1. Framework:**
- ⚠️ **NÃO é Next.js** - É React + Vite
- ⚠️ **NÃO usar** Server Components, RSC, ou middleware Next.js
- ✅ Usar React Router DOM, Context API, Hooks

### **2. Banco de Dados:**
- ✅ Schema relacional completo (35 tabelas)
- ❌ Backend ainda não migrado (usa KV Store)
- ⚠️ Questões pendentes sobre multi-tenant

### **3. Autenticação:**
- ✅ `AuthContext` existe e funciona
- ✅ `ProtectedRoute` melhorado
- ⏳ Falta `OrganizationContext` e `useOrganization`

### **4. Códigos do ChatGPT:**
- ⚠️ Todos são para Next.js
- ✅ Lógica pode ser adaptada
- ✅ Documentação de adaptação criada

---

## 📋 CHECKLIST DE STATUS

### **Implementado:**
- [x] Análise completa do schema
- [x] ProtectedRoute melhorado
- [x] Documentação de análises
- [x] Plano de migração backend

### **Pendente:**
- [ ] OnboardingPage.tsx
- [ ] OrganizationContext.tsx
- [ ] useOrganization hook
- [ ] Migração backend (KV Store → SQL)
- [ ] Seed automático (Edge Function)
- [ ] OrgSwitcher component
- [ ] Resolver questões críticas

---

## 💡 COMANDOS ÚTEIS

### **Criar ZIP com alterações:**
```powershell
.\criar-zip-alteracoes.ps1
```

### **Verificar arquivos modificados:**
```powershell
git status
```

### **Estrutura de pastas:**
```
src/components/ProtectedRoute.tsx  ← Modificado
src/components/OnboardingPage.tsx  ← Criar
src/contexts/OrganizationContext.tsx ← Criar
```

---

## 🎯 RESUMO EXECUTIVO

**O que foi feito:**
1. ✅ Analisado schema completo (35 tabelas)
2. ✅ Documentado todas as questões pendentes
3. ✅ Melhorado ProtectedRoute com lógica de organização
4. ✅ Analisado e adaptado códigos do ChatGPT
5. ✅ Criado plano de migração backend

**O que precisa ser feito:**
1. ⏳ Resolver questões críticas (evolution_instances, etc)
2. ⏳ Criar OnboardingPage
3. ⏳ Migrar backend para SQL relacional
4. ⏳ Implementar sistema multi-tenant completo

**Status Geral:**
- ✅ Documentação: Completa
- ⚠️ Implementação: Parcial
- ⏳ Migração Backend: Pendente

---

**Última atualização:** 06/11/2025  
**Versão:** 1.0.103.323  
**Status:** ✅ Contexto completo documentado


