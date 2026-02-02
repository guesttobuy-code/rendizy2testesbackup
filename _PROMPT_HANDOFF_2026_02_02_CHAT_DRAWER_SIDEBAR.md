# 🔄 PROMPT HANDOFF - Chat Drawer Inline + Sidebar UX

**Data:** 02/02/2026  
**Sessão:** Chat Drawer Multi-Provider + Sidebar Collapsed by Default  
**Status:** ✅ Implementado e commitado

---

## 📋 RESUMO EXECUTIVO

Nesta sessão implementamos:
1. **Chat Drawer Inline** - Painel lateral para chat sem sair da tela atual
2. **Providers Marketplace/Team** - Chat B2B entre organizações e chat interno de equipe
3. **Fix de imports** - Corrigidos paths em `useChatService.ts` e `WhatsAppAdapter.ts`
4. **Sidebar UX** - Seções do menu lateral agora vêm recolhidas por padrão
5. **Roadmap** - Adicionada tarefa de Programa de Indicação Remunerada

---

## 🏗️ ARQUITETURA IMPLEMENTADA

### ADR-010: Chat Multi-Provider Pattern

O sistema de chat agora suporta múltiplos canais:
- **WhatsApp** - Via Evolution API (existente)
- **Marketplace** - Chat B2B entre organizações diferentes (NOVO)
- **Team** - Chat interno da equipe de corretores (NOVO)
- **Airbnb/Booking** - Placeholders para futuro

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos

#### 1. `components/chat/ChatDrawer.tsx` (482 linhas)
```
Painel lateral de chat inline que permite conversar sem sair da tela atual.

Características:
- Abre pelo lado direito da tela
- Minimizável (fica como balão no canto)
- Realtime via Supabase subscriptions
- Auto-scroll para última mensagem
- Usa tabelas re_marketplace_conversations e re_marketplace_messages

Props:
- config: ChatDrawerConfig | null
- onClose: () => void
- isOpen: boolean
```

#### 2. `components/chat/ChatDrawerContext.tsx` (213 linhas)
```
Provider global + hook para abrir chat de qualquer lugar.

Exports:
- ChatDrawerProvider - Wrapper para habilitar chat inline
- useChatDrawer() - Hook com helpers

Helpers disponíveis:
- openChat(config) - Abre chat genérico
- openPartnershipChat(params) - Chat de parceria com empreendimento
- openDemandChat(params) - Chat sobre demanda
- openB2BChat(params) - Chat B2B genérico
- closeChat() - Fecha o drawer
```

#### 3. `components/chat/ChannelBadge.tsx` (292 linhas)
```
Badge visual para indicar canal de origem da conversa.

Canais configurados:
- whatsapp (verde)
- marketplace (indigo)
- team (violeta)
- email (cinza)
- airbnb (rosa)
- booking (azul)
- sms (teal)
- instagram (pink)
- internal (cinza)

Variantes: icon, badge, full, emoji
Tamanhos: xs, sm, md, lg
```

#### 4. `utils/chat/providers/marketplace.ts` (438 linhas)
```
Provider para conversas B2B entre organizações diferentes.

Classe: MarketplaceChatProvider implements IChatProvider
- channel: 'marketplace'
- getConversations(orgId, options)
- getMessages(conversationId, options)
- sendTextMessage(conversationId, text)
- sendMedia(conversationId, url, type, caption)
- markAsRead(conversationId)

Funções utilitárias:
- getOrCreateMarketplaceConversation(myOrgId, targetOrgId, options)
- openMarketplaceChat(myOrgId, targetOrgId, options)
```

#### 5. `utils/chat/providers/team.ts` (493 linhas)
```
Provider para chat interno da equipe (corretores vinculados a imobiliária).

Classe: TeamChatProvider implements IChatProvider
- channel: 'team'
- Verifica permissão can_see_chat do corretor
- Busca canais de re_broker_chat_channels
- Mensagens em re_broker_chat_messages

Funções utilitárias:
- createTeamChannel(companyId, name, options)
- listTeamChannels(companyId)
```

#### 6. `supabase/migrations/20260202_marketplace_conversations.sql` (315 linhas)
```
Tabelas para chat B2B entre organizações:

- re_marketplace_conversations
  - org_a_id, org_b_id (participantes)
  - related_type, related_id (contexto: partnership, demand, etc)
  - last_message_at, last_message_preview
  - unread_count_org_a, unread_count_org_b

- re_marketplace_messages
  - conversation_id, sender_profile_id, sender_org_id
  - content, content_type, attachments
  - read_at, deleted_at

- re_marketplace_participants
  - Para extensibilidade futura (grupos)

RPC Functions:
- get_or_create_marketplace_conversation(p_my_org_id, p_target_org_id, ...)
- mark_marketplace_conversation_as_read(p_conversation_id, p_profile_id)

Trigger:
- trg_marketplace_msg_update_conv (atualiza last_message e unread_count)
```

#### 7. `supabase/migrations/20260202_broker_solo_vinculado.sql` (244 linhas)
```
Tabelas para corretores e chat interno:

Colunas novas em re_brokers:
- broker_type (solo/linked)
- linked_company_id
- permissions (JSONB)
- commission_split (JSONB)

Novas tabelas:
- re_broker_invites (convites para vincular corretor)
- re_broker_chat_channels (canais de chat da imobiliária)
- re_broker_chat_messages (mensagens do chat interno)
- re_broker_campaigns (campanhas internas)
- re_broker_campaign_participation
- re_broker_rankings (ranking/metas)

RLS Policies para todas as tabelas.
```

### Arquivos Modificados

#### 1. `components/chat/index.ts`
```diff
+ export { ChannelBadge, ChannelIcon, CHANNEL_CONFIG, getChannelLabel, getChannelEmoji, getChannelColor } from './ChannelBadge';
+ export type { ChatChannelType } from './ChannelBadge';
+ export { ChatDrawer } from './ChatDrawer';
+ export type { ChatDrawerConfig, ChatContext } from './ChatDrawer';
+ export { ChatDrawerProvider, useChatDrawer } from './ChatDrawerContext';
```

#### 2. `components/chat/ChatConversationList.tsx`
```diff
- export type ChannelType = 'whatsapp' | 'airbnb' | 'booking' | 'email' | 'sms';
+ export type ChannelType = 'whatsapp' | 'airbnb' | 'booking' | 'email' | 'sms' | 'marketplace' | 'team';

+ marketplace: { icon: MessageSquare, color: 'text-indigo-500', label: 'Marketplace' },
+ team: { icon: Users, color: 'text-violet-500', label: 'Equipe' },
```

#### 3. `components/real-estate/RealEstateMockModule.tsx`
```diff
+ import { ChatDrawerProvider, useChatDrawer } from '@/components/chat';

// Wrapper com ChatDrawerProvider
+ export function RealEstateMockModule(props) {
+   return (
+     <ChatDrawerProvider>
+       <RealEstateMockModuleInner {...props} />
+     </ChatDrawerProvider>
+   );
+ }

// Hook no componente interno
+ const { openB2BChat } = useChatDrawer();

// ConstrutoraCard agora aceita onProporParceria
+ onProporParceria={(construtora) => {
+   openB2BChat({
+     targetOrgId: construtora.id,
+     targetOrgName: construtora.name,
+     targetOrgLogo: construtora.logo,
+     initialMessage: `Olá! Tenho interesse em conhecer os empreendimentos...`
+   });
+ }}
```

#### 4. `src/hooks/useChatService.ts`
```diff
- } from '../../services/chat';
+ } from '../services/chat';
```

#### 5. `src/services/chat/adapters/WhatsAppAdapter.ts`
```diff
- import { projectId, publicAnonKey } from '../../../utils/supabase/info';
+ import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
```

#### 6. `utils/chat/types.ts`
```diff
  export type ChatChannel = 
    | 'whatsapp'
    | 'airbnb'
    | 'booking'
    | 'email'
+   | 'marketplace'   // Chat B2B entre orgs diferentes (Real Estate)
+   | 'team'          // Chat interno da equipe (Real Estate)
    | 'internal';
```

#### 7. `utils/chat/registry.ts`
```diff
+ import { getMarketplaceChatProvider } from './providers/marketplace';
+ import { getTeamChatProvider } from './providers/team';

  private registerDefaults(): void {
    this.register(getWhatsAppChatProvider());
    this.register(getAirbnbChatProvider());
    this.register(getBookingChatProvider());
+   this.register(getMarketplaceChatProvider());
+   this.register(getTeamChatProvider());
  }
```

#### 8. `utils/chat/providers/index.ts`
```diff
  export * from './whatsapp';
  export * from './airbnb';
  export * from './booking';
+ export * from './marketplace';
+ export * from './team';
```

#### 9. `components/MainSidebar.tsx`
```diff
- // Seções colapsáveis - CONFIGURAÇÕES GERAIS vem fechada por padrão
- const [collapsedSections, setCollapsedSections] = useState<string[]>(['CONFIGURAÇÕES GERAIS']);
+ // Seções colapsáveis - TODAS as seções vem fechadas por padrão para melhor usabilidade
+ const [collapsedSections, setCollapsedSections] = useState<string[]>([
+   'TEMPORADA, ALUGUEL E VENDAS',
+   'COMUNICAÇÃO',
+   'MÓDULOS AVANÇADOS',
+   'CONFIGURAÇÕES GERAIS'
+ ]);

// Todas as seções agora têm defaultExpanded: false
```

---

## 🗄️ BANCO DE DADOS

### Tabelas Criadas (Migrations pendentes de aplicar)

```sql
-- Chat B2B Marketplace
re_marketplace_conversations
re_marketplace_messages
re_marketplace_participants

-- Chat Interno Equipe
re_broker_chat_channels
re_broker_chat_messages
re_broker_invites
re_broker_campaigns
re_broker_campaign_participation
re_broker_rankings
```

### RPC Functions
```sql
get_or_create_marketplace_conversation(p_my_org_id, p_target_org_id, p_related_type, p_related_id, p_title)
mark_marketplace_conversation_as_read(p_conversation_id, p_profile_id)
```

### ⚠️ IMPORTANTE: Executar migrations no Supabase SQL Editor
```
supabase/migrations/20260202_marketplace_conversations.sql
supabase/migrations/20260202_broker_solo_vinculado.sql
```

---

## 📝 ROADMAP ATUALIZADO

**Arquivo:** `Real Estate - imobiliárias/ROADMAP_MARKETPLACE_REAL_ESTATE_RENDIZY.md`

Nova tarefa adicionada na seção "Prioridade Baixa":

| # | Ação | Responsável | Prazo |
|---|------|-------------|-------|
| 15 | **Programa de Indicação Remunerada** - Criar modelo de referral para novos usuários Rendizy com cashback/comissão por indicação convertida | Dev + Rafael | Fase 3+ |

---

## 🔧 COMMITS REALIZADOS

### Commit Principal
```
299bc10 - feat(chat): Chat Drawer inline + providers Marketplace/Team

- ChatDrawer: painel lateral para chat inline sem sair da tela
- ChatDrawerContext: provider global com useChatDrawer() hook
- ChannelBadge: badge visual para canais de chat
- Marketplace provider: chat B2B entre organizações
- Team provider: chat interno equipe corretores
- Migration: tabelas re_marketplace_conversations/messages
- Migration: tabelas re_broker_chat_channels/messages
- Fix: imports em useChatService e WhatsAppAdapter
- Integração RealEstateMockModule Propor Parceria

ADR-010: Chat Multi-Provider Pattern
```

**Branch:** main  
**Remote:** https://github.com/guesttobuy-code/rendizy2testesbackup.git

---

## 🧪 COMO TESTAR

### 1. Chat Drawer no Marketplace
```
1. Acessar http://localhost:3000/
2. Menu lateral > MÓDULOS AVANÇADOS > Real Estate B2B > Vitrine
3. Na lista de construtoras, clicar em "Propor Parceria"
4. O ChatDrawer deve abrir pelo lado direito
5. Testar minimizar/maximizar
6. Enviar mensagem (requer migrations aplicadas)
```

### 2. Sidebar Recolhida
```
1. Acessar http://localhost:3000/
2. Menu lateral deve aparecer com todas as seções recolhidas
3. Clicar em cada seção para expandir/recolher
4. Verificar se a navegação está mais limpa
```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- **ADR-007:** Chat Module WAHA Integration
- **ADR-010:** Chat Multi-Provider Pattern (a criar/atualizar)
- **ROADMAP:** Real Estate - imobiliárias/ROADMAP_MARKETPLACE_REAL_ESTATE_RENDIZY.md

---

## ⚠️ PENDÊNCIAS PARA PRÓXIMA SESSÃO

### 1. Aplicar Migrations no Supabase
```bash
# Via SQL Editor do Supabase Dashboard
# Executar os arquivos:
supabase/migrations/20260202_marketplace_conversations.sql
supabase/migrations/20260202_broker_solo_vinculado.sql
```

### 2. Testar Chat Drawer End-to-End
- Criar conversa via RPC
- Enviar mensagens
- Verificar realtime
- Testar em múltiplas tabs

### 3. Integrar Chat Drawer em Outros Lugares
- Página de detalhes do empreendimento
- Lista de demandas
- Perfil de imobiliária/construtora

### 4. Sidebar UX Feedback
- Coletar feedback se seções recolhidas são melhores
- Considerar salvar preferência do usuário no localStorage

---

## 🔗 CONTEXTO DO PROJETO

### Stack Principal
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions + Realtime)
- **Chat:** Evolution API (WhatsApp) + Supabase (Marketplace/Team)

### Módulos Ativos
- Temporada/Aluguel/Vendas (core)
- Comunicação (Chat WhatsApp, CRM)
- Módulos Avançados (Finanças, Sites, BI, Real Estate)
- Configurações Gerais

### URLs de Desenvolvimento
- **Local:** http://localhost:3000/
- **Produção:** https://rendizy2producao.vercel.app/

---

## 📌 COMANDO PARA INICIAR

```bash
cd "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-backup_2026-01-18_21- 45-02\Pasta oficial Rendizy"
npm run dev
```

---

**Fim do Handoff - 02/02/2026 11:45**
