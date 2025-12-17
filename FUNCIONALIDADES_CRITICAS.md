# ⚠️ FUNCIONALIDADES CRÍTICAS - NÃO MODIFICAR SEM AUTORIZAÇÃO

## 🎯 Objetivo
Este documento lista todas as funcionalidades que estão **FUNCIONANDO EM PRODUÇÃO** e **NÃO PODEM SER MODIFICADAS** sem:
1. Testes completos
2. Code review
3. Documentação da mudança
4. Aprovação do time

---

## 📱 WhatsApp Integration (Evolution API)

### Status: ✅ FUNCIONANDO EM PRODUÇÃO
### Última Verificação: 2025-11-30
### Prioridade: 🔴 CRÍTICA
### Cadeado: ✅ **IMPLEMENTADO** (Isolamento + Contrato + Validação)

### Rotas Críticas (NUNCA REMOVER):

#### Rotas em `routes-chat.ts`:
- ✅ `POST /rendizy-server/chat/channels/whatsapp/connect`
- ✅ `POST /rendizy-server/chat/channels/whatsapp/status`
- ✅ `POST /rendizy-server/chat/channels/whatsapp/disconnect`
- ⚠️ `POST /rendizy-server/chat/channels/whatsapp/send` (placeholder)

#### Rotas em `routes-whatsapp-evolution.ts`:
- ✅ `GET /rendizy-server/make-server-67caf26a/whatsapp/status`
- ✅ `GET /rendizy-server/make-server-67caf26a/whatsapp/qr-code`
- ✅ `POST /rendizy-server/make-server-67caf26a/whatsapp/disconnect`
- ✅ `POST /rendizy-server/make-server-67caf26a/whatsapp/send-message`
- ✅ `POST /rendizy-server/make-server-67caf26a/whatsapp/send-media`
- ✅ `GET /rendizy-server/make-server-67caf26a/whatsapp/messages`

### Dependências Frontend:
- `channelsApi.evolution.connect()` → `/chat/channels/whatsapp/connect`
- `channelsApi.evolution.status()` → `/chat/channels/whatsapp/status`
- `channelsApi.evolution.disconnect()` → `/chat/channels/whatsapp/disconnect`
- `evolutionService.getStatus()` → `/whatsapp/status`
- `evolutionService.getQRCode()` → `/whatsapp/qr-code`

### Arquivos Relacionados:
- `supabase/functions/rendizy-server/routes-chat.ts`
- `supabase/functions/rendizy-server/routes-whatsapp-evolution.ts`
- `RendizyPrincipal/utils/chatApi.ts`
- `RendizyPrincipal/utils/services/evolutionService.ts`
- `RendizyPrincipal/components/WhatsAppIntegration.tsx`

### 🔒 CADEADOS IMPLEMENTADOS:

#### **1. Cadeado de Isolamento** (Frontend)
- **Arquivo:** `RendizyPrincipal/components/chat/ChatModule.tsx`
- **Status:** ✅ Implementado
- **Rotas isoladas:** `/chat/channels/whatsapp/*`, `/whatsapp/*`
- **Entrelaçamentos documentados:** CRM, Reservations, Guests

#### **2. Cadeado de Contrato** (Backend)
- **Arquivo:** `supabase/functions/rendizy-server/routes-whatsapp-evolution.ts`
- **Status:** ✅ Implementado
- **Contrato documentado:** Input/Output de todas as rotas
- **Dependências frontend:** Listadas no código

#### **3. Cadeado de Validação** (Testes)
- **Arquivo:** `supabase/functions/rendizy-server/__tests__/whatsapp-routes.test.ts`
- **Status:** ✅ Implementado
- **Comando:** `npm run test:whatsapp`
- **Validações:** Rotas existem, contrato correto, rotas registradas

### ⚠️ REGRAS DE MODIFICAÇÃO:
1. **NUNCA** remover rotas sem criar versão alternativa
2. **SEMPRE** testar em ambiente de desenvolvimento primeiro
3. **SEMPRE** executar `npm run test:whatsapp` antes de fazer deploy
4. **SEMPRE** ler comentários de cadeado antes de modificar
5. **SEMPRE** documentar entrelaçamentos se criar novos
3. **SEMPRE** verificar se frontend ainda funciona após mudança
4. **SEMPRE** documentar mudanças neste arquivo

---

## 🔐 Sistema de Autenticação

### Status: ✅ FUNCIONANDO EM PRODUÇÃO
### Última Verificação: 2025-11-28
### Prioridade: 🔴 CRÍTICA

### Rotas Críticas:
- ✅ `POST /rendizy-server/auth/login`
- ✅ `GET /rendizy-server/auth/me`
- ✅ `POST /rendizy-server/auth/logout`
- ✅ `POST /rendizy-server/auth/refresh`

### Arquivos Relacionados:
- `supabase/functions/rendizy-server/routes-auth.ts`
- `RendizyPrincipal/utils/authService.ts`
- `RendizyPrincipal/contexts/AuthContext.tsx`

---

## 💼 CRM - Deals & Services

### Status: ✅ FUNCIONANDO EM PRODUÇÃO
### Última Verificação: 2025-11-28
### Prioridade: 🟡 ALTA

### Rotas Críticas:
- ✅ `/rendizy-server/crm/deals/*`
- ✅ `/rendizy-server/crm/services/tickets/*`
- ✅ `/rendizy-server/crm/services/templates/*`

### Arquivos Relacionados:
- `supabase/functions/rendizy-server/routes-deals.ts`
- `supabase/functions/rendizy-server/routes-services-tickets.ts`
- `supabase/functions/rendizy-server/routes-service-templates.ts`

---

## 🗄️ Integração Supabase

### Status: ✅ FUNCIONANDO EM PRODUÇÃO
### Última Verificação: 2025-11-28
### Prioridade: 🔴 CRÍTICA

### Componentes Críticos:
- ✅ `getSupabaseClient()` - Conexão com banco
- ✅ `getOrganizationIdOrThrow()` - Validação de organização
- ✅ `ChannelConfigRepository` - Configurações de canais

### Arquivos Relacionados:
- `supabase/functions/rendizy-server/kv_store.tsx`
- `supabase/functions/rendizy-server/utils-get-organization-id.ts`
- `supabase/functions/rendizy-server/repositories/channel-config-repository.ts`

---

## 📝 Como Adicionar Nova Funcionalidade Crítica

1. Adicionar entrada neste arquivo
2. Listar todas as rotas/arquivos relacionados
3. Documentar dependências frontend
4. Adicionar comentários de proteção no código
5. Criar testes de regressão

---

## 🔄 Histórico de Modificações

| Data | Funcionalidade | Mudança | Autor |
|------|---------------|---------|-------|
| 2025-11-28 | WhatsApp | Adicionadas rotas em routes-chat.ts | Auto |
| 2025-11-28 | WhatsApp | Documentação inicial | Auto |

---

## ⚠️ AVISO IMPORTANTE

**ANTES DE MODIFICAR QUALQUER FUNCIONALIDADE LISTADA AQUI:**

1. ✅ Ler este documento completamente
2. ✅ Entender todas as dependências
3. ✅ Executar testes existentes
4. ✅ Criar testes para sua mudança
5. ✅ Testar em ambiente de desenvolvimento
6. ✅ Solicitar code review
7. ✅ Atualizar este documento

**SE NÃO TEM CERTEZA, NÃO MODIFIQUE!**





