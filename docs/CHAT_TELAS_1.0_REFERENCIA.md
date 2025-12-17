# 🎨 CHAT TELAS 1.0 - Design de Referência

**Nome Oficial:** Chat Telas 1.0  
**Data:** 03 NOV 2025  
**Versão Sistema:** v1.0.103.254  
**Status:** ✅ DESIGN DE REFERÊNCIA OFICIAL

---

## 📸 Screenshot de Referência

Este é o design exato que deve ser mantido como padrão:

![Chat Telas 1.0](figma:asset/8000f657dd96db0bab786aad50fdfabcd8c965a5.png)

---

## 🎯 O QUE É O CHAT TELAS 1.0?

Este documento serve como **referência oficial** do design do Chat RENDIZY. Qualquer alteração futura deve respeitar este layout ou ser explicitamente aprovada.

---

## 🎨 LAYOUT EXATO - CHAT TELAS 1.0

### **Estrutura Geral:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔹 HEADER                                                       │
│ [Chat Inbox] [WhatsApp]                    [Desenvolvimento]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌───────────────┬──────────────────┬────────────────────────┐  │
│ │               │                  │                        │  │
│ │  SIDEBAR      │  CONVERSAS       │  ÁREA DE MENSAGENS     │  │
│ │  ESQUERDA     │  (LISTA)         │  (CHAT ATIVO)          │  │
│ │               │                  │                        │  │
│ │  🔍 Buscar    │  WhatsApp        │  João Silva            │  │
│ │  imóveis...   │  Evolution API   │  Mock Data             │  │
│ │               │                  │  URL: 54c58f4...       │  │
│ │  Filtros      │  [Importar]      │  Visual / Mail         │  │
│ │  ─────────    │                  │                        │  │
│ │               │  Conversas (5)   │  Check-in/out datas    │  │
│ │  📍 Principal │  ┌─────────────┐ │                        │  │
│ │  ☑ Admin      │  │ 📌 Fixadas  │ │  [Ações] [Bloqueio]    │  │
│ │    Master     │  │ (0/5)       │ │                        │  │
│ │  ☑ Dashboard  │  └─────────────┘ │  ─────────────────     │  │
│ │  ☑ Calendário │                  │                        │  │
│ │  ☑ Reservas   │  ⚡ Urgentes(2) │  "Olá! Já estou no     │  │
│ │  ☑ Chat   [8] │  ┌─────────────┐ │   imóvel. Qual o       │  │
│ │  ☑ Locais     │  │ JS João Sil │ │   código do WiFi?"     │  │
│ │  ☑ Edição     │  │ RES-015  🏠 │ │   5d atrás             │  │
│ │  ☑ Preços     │  │ Casa Itaunas│ │                        │  │
│ │               │  │ "Qual cód.."│ │  ─────────────────     │  │
│ │  🎨 Promoções │  └─────────────┘ │                        │  │
│ │  ☑ Light      │                  │  [📎] [Mensagem...]    │  │
│ │  ☑ Dark       │  ┌─────────────┐ │  [Enviar]              │  │
│ │               │  │ PO Patricia │ │                        │  │
│ │  👤 João Silva│  │ 🟢 ➕       │ │                        │  │
│ │  joao@...     │  │ "Quero casa"│ │                        │  │
│ │               │  └─────────────┘ │                        │  │
│ │               │                  │                        │  │
│ │               │  📋 Normais (2)  │                        │  │
│ │               │  ┌─────────────┐ │                        │  │
│ │               │  │ MS Maria    │ │                        │  │
│ │               │  │ RES-020  🏠 │ │                        │  │
│ │               │  │ Arraial Novo│ │                        │  │
│ │               │  │ "Perfeito!" │ │                        │  │
│ │               │  └─────────────┘ │                        │  │
│ │               │                  │                        │  │
│ │               │  ┌─────────────┐ │                        │  │
│ │               │  │ AP Ana Paula│ │                        │  │
│ │               │  │ RES-025  🏠 │ │                        │  │
│ │               │  └─────────────┘ │                        │  │
│ └───────────────┴──────────────────┴────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 MEDIDAS E PROPORÇÕES

### **Layout Três Colunas:**

| Coluna | Largura | Função |
|--------|---------|--------|
| **Sidebar Principal** | ~200px | Menu lateral do sistema (Admin, Dashboard, etc.) |
| **Lista de Conversas** | ~320px | WhatsApp Evolution API + Lista de chats |
| **Área de Mensagens** | ~flex-1 | Chat ativo com mensagens |

### **Cores de Referência:**

| Elemento | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background Sidebar | `bg-gray-50` | `bg-gray-900` |
| Background Conversas | `bg-white` | `bg-gray-800` |
| Background Mensagens | `bg-gray-50` | `bg-gray-900` |
| Texto Principal | `text-gray-900` | `text-gray-100` |
| Texto Secundário | `text-gray-600` | `text-gray-400` |
| Border | `border-gray-200` | `border-gray-700` |

---

## 🎨 ELEMENTOS VISUAIS CHAVE

### **1. Header Superior:**
```
[Chat Inbox] [WhatsApp]  ← Tabs principais
                          [🛠️ Desenvolvimento] [Código] [Dados] ← Badges
```

### **2. Sidebar Esquerda (Menu Principal):**
- Logo/Título no topo
- Campo de busca
- Seção "PRINCIPAL" com menu items:
  - Admin Master
  - Dashboard
  - Calendário (badge: 12)
  - Reservas
  - **Chat (badge: 8) ← Item ativo**
  - Locais e Anúncios
  - Edição de site
  - Preços em Lote

- Seção "PROMOÇÕES":
  - Tema: Light/Dark toggle

- Footer:
  - Avatar do usuário
  - Nome: João Silva
  - Email: joao@rendizy.com

### **3. Área de Conversas (Coluna Central):**

**Topo:**
```
WhatsApp
Evolution API               [⚙️] [🔄 Importar Conversas]
```

**Lista de Conversas:**
```
🔍 Buscar conversas...

📌 Fixadas (0/5)           ← Seção vazia (expansível)

⚡ Urgentes (2)            ← Badge laranja
┌─────────────────────────┐
│ JS  João Silva      🏠  │ ← Avatar + Nome + Badge
│ RES-015                 │ ← Código da reserva
│ Casa Itaunas Vista Mar  │ ← Nome da propriedade
│ "Qual o código do WiFi?"│ ← Preview mensagem
└─────────────────────────┘

┌─────────────────────────┐
│ PO  Patricia Oliveira   │
│ 🟢 ➕                   │ ← Ícones: Online + Novo
│ "Quero uma casa em..."  │
└─────────────────────────┘

📋 Normais (2)            ← Badge cinza
┌─────────────────────────┐
│ MS  Maria Santos    🏠  │
│ RES-020                 │
│ Arraial Novo Beach      │
│ "Perfeito, muito obrig."│
└─────────────────────────┘

┌─────────────────────────┐
│ AP  Ana Paula       🏠  │
│ RES-025                 │
└─────────────────────────┘
```

### **4. Área de Mensagens (Coluna Direita):**

**Header da Conversa:**
```
┌─────────────────────────────────────────────┐
│ JS  João Silva                   Ambiente   │
│     Mock Data                    Vida       │
│     URL: 54c58f4-65aa-8b1c...              │
│     Visual / Mail                           │
├─────────────────────────────────────────────┤
│ Check-in: 29/10/2025  Check-out: 03/11/2025│
│                                             │
│ 🏠 HÓSPEDE - Reserva RES-015               │
│                                             │
│ [Ações Rápidas]  [🔒 Bloqueio]             │
└─────────────────────────────────────────────┘
```

**Área de Mensagens:**
```
┌─────────────────────────────────────────────┐
│                                             │
│ João Silva                                  │
│ "Olá! Já estou no imóvel. Qual o código    │
│  do WiFi?"                                  │
│                                  5d atrás   │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
└─────────────────────────────────────────────┘
```

**Input de Mensagem:**
```
┌─────────────────────────────────────────────┐
│ [📎]  [Digite uma mensagem...]              │
│                              [Enviar ➜]     │
└─────────────────────────────────────────────┘
```

---

## 🎯 FUNCIONALIDADES VISÍVEIS NO CHAT TELAS 1.0

### **✅ Implementadas e Visíveis:**

1. **Tabs Principais:**
   - ✅ "Chat Inbox" (ativa)
   - ✅ "WhatsApp"

2. **WhatsApp Evolution API:**
   - ✅ Botão "Importar Conversas"
   - ✅ Badge "WhatsApp Evolution API"

3. **Categorização de Conversas:**
   - ✅ 📌 Fixadas (0/5)
   - ✅ ⚡ Urgentes (2)
   - ✅ 📋 Normais (2)
   - ✅ (Resolvidas não aparece se vazia)

4. **Cards de Conversa:**
   - ✅ Avatar com iniciais
   - ✅ Nome do contato
   - ✅ Código da reserva (ex: RES-015)
   - ✅ Nome da propriedade
   - ✅ Preview da última mensagem
   - ✅ Badges de status (🏠 hóspede, 🟢 online, ➕ novo)

5. **Header da Conversa Ativa:**
   - ✅ Avatar + Nome
   - ✅ Ambiente/Status
   - ✅ URL parcial
   - ✅ Visual/Mail
   - ✅ Check-in e Check-out
   - ✅ Badge "HÓSPEDE - Reserva RES-015"
   - ✅ Botões "Ações Rápidas" e "Bloqueio"

6. **Área de Mensagens:**
   - ✅ Mensagens com timestamp
   - ✅ Nome do remetente
   - ✅ Conteúdo da mensagem

7. **Input de Mensagem:**
   - ✅ Botão de anexo (📎)
   - ✅ Campo de texto
   - ✅ Botão "Enviar"

---

## 🔧 COMPONENTES USADOS

### **Principais:**

```typescript
// Componente Principal
<ChatInboxWithEvolution />
  ├── Tabs (Chat Inbox / WhatsApp)
  │   ├── TabsContent: "inbox"
  │   │   └── <ChatInbox />
  │   │       ├── Sidebar de Filtros
  │   │       ├── Lista de Conversas
  │   │       └── Área de Mensagens
  │   └── TabsContent: "whatsapp"
  │       └── <EvolutionContactsList />
  └── Dark Mode support
```

### **Subcomponentes:**

```
ChatInbox.tsx
├── ChatFilterSidebar (filtros laterais)
├── ConversationCard (card de conversa)
├── TemplateManagerModal (gerenciar templates)
├── ChatTagsModal (gerenciar tags)
├── QuickActionsModal (ações rápidas)
├── QuotationModal (fazer cotação)
├── CreateReservationWizard (criar reserva)
├── BlockModal (criar bloqueio)
└── WhatsAppChatsImporter (importar conversas)
```

---

## 📦 ARQUIVOS RELACIONADOS

### **Componentes:**
- `/components/ChatInboxWithEvolution.tsx` - Wrapper principal
- `/components/ChatInbox.tsx` - Chat completo
- `/components/EvolutionContactsList.tsx` - Lista de contatos
- `/components/ChatFilterSidebar.tsx` - Filtros laterais
- `/components/TemplateManagerModal.tsx` - Templates
- `/components/ChatTagsModal.tsx` - Tags
- `/components/QuickActionsModal.tsx` - Ações rápidas

### **Utilitários:**
- `/utils/chatApi.ts` - API do chat
- `/utils/evolutionApi.ts` - Client Evolution API
- `/utils/services/evolutionService.ts` - Serviço mensagens
- `/utils/services/evolutionContactsService.ts` - Serviço contatos

### **Backend (Mock):**
- `/supabase/functions/server/routes-chat.ts` - Rotas do chat
- `/supabase/functions/server/routes-whatsapp-evolution.ts` - Rotas WhatsApp

---

## 🎨 DECISÕES DE DESIGN

### **Por que esse layout?**

1. **Três Colunas:**
   - Familiaridade (WhatsApp, Telegram, Slack)
   - Navegação eficiente
   - Contexto sempre visível

2. **Categorização com Cores:**
   - ⚡ Urgentes (laranja) = atenção imediata
   - 📋 Normais (cinza) = fluxo regular
   - 📌 Fixadas (azul) = importantes mas não urgentes

3. **Preview de Mensagens:**
   - Entender contexto sem abrir
   - Economiza tempo
   - Priorização visual

4. **Badges Informativos:**
   - 🏠 = Hóspede (já tem reserva)
   - 🟢 = Online
   - ➕ = Nova conversa

5. **Header Completo:**
   - Check-in/out sempre visível
   - Código da reserva fácil acesso
   - Ações rápidas à mão

---

## 🚀 COMO MANTER O DESIGN CHAT TELAS 1.0

### **Regras de Ouro:**

1. ✅ **Nunca remover** as três colunas (sidebar, conversas, mensagens)
2. ✅ **Manter** categorização (Fixadas/Urgentes/Normais/Resolvidas)
3. ✅ **Preservar** badges de status (🏠🟢➕)
4. ✅ **Não alterar** cores das categorias sem aprovação
5. ✅ **Manter** header completo da conversa
6. ✅ **Preservar** botões "Ações Rápidas" e "Bloqueio"

### **Permitido Evoluir:**

- ✅ Adicionar novas funcionalidades no menu "..."
- ✅ Novos tipos de badges (com aprovação)
- ✅ Melhorias de performance
- ✅ Drag & Drop (quando reimplementado)
- ✅ Novas categorias de conversa (com aprovação)

### **Proibido sem Aprovação:**

- ❌ Remover colunas
- ❌ Alterar cores das categorias
- ❌ Remover badges de status
- ❌ Simplificar header da conversa
- ❌ Remover filtros laterais
- ❌ Alterar estrutura visual principal

---

## 📊 CHECKLIST DE CONFORMIDADE

Use este checklist para validar se uma alteração mantém o padrão Chat Telas 1.0:

### **Layout:**
- [ ] Três colunas preservadas?
- [ ] Sidebar esquerda com menu principal?
- [ ] Lista de conversas no centro?
- [ ] Área de mensagens à direita?

### **Categorização:**
- [ ] 📌 Fixadas visível (mesmo vazia)?
- [ ] ⚡ Urgentes com cor laranja?
- [ ] 📋 Normais com cor cinza?
- [ ] ✓✓ Resolvidas com cor verde (quando há)?

### **Cards de Conversa:**
- [ ] Avatar com iniciais?
- [ ] Nome do contato?
- [ ] Código da reserva (se houver)?
- [ ] Nome da propriedade (se houver)?
- [ ] Preview da mensagem?
- [ ] Badges de status corretos?

### **Header da Conversa:**
- [ ] Check-in e Check-out visíveis?
- [ ] Badge "HÓSPEDE" ou "NEGOCIAÇÃO"?
- [ ] Botões "Ações Rápidas" e "Bloqueio"?

### **Funcionalidades:**
- [ ] Templates funcionando?
- [ ] Tags funcionando?
- [ ] Filtros funcionando?
- [ ] Busca funcionando?
- [ ] Modais integrados?

---

## 🔄 VERSÕES FUTURAS

### **Chat Telas 1.1 (Planejado):**
- Drag & Drop reimplementado
- Reordenação de conversas
- Arrastar entre categorias
- Mais filtros avançados

### **Chat Telas 2.0 (Futuro):**
- Backend real conectado
- Webhook tempo real
- IA para extração de dados
- Auto-resposta inteligente
- Analytics de conversas

### **Mas SEMPRE respeitando o layout base do Chat Telas 1.0!**

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `/docs/HISTORICO_DESIGN_CHAT_COMPLETO.md` - Histórico completo
- `/docs/CHAT_FIXES_v1.0.103.254.md` - Correções aplicadas
- `/docs/CHAT_DRAG_DROP_SYSTEM.md` - Sistema Kanban
- `/docs/CHAT_TEMPLATE_MANAGER_v1.0.91.md` - Templates
- `/docs/CHAT_MODAIS_INTEGRACAO_v1.0.90.md` - Modais
- `/docs/INTEGRACAO_EVOLUTION_API_GUIA_COMPLETO.md` - WhatsApp

---

## 🎯 RESUMO EXECUTIVO

**Chat Telas 1.0** é o design de referência oficial do Chat RENDIZY.

### **Características Principais:**
✅ Layout três colunas (sidebar, conversas, mensagens)  
✅ Categorização visual (Fixadas/Urgentes/Normais/Resolvidas)  
✅ Badges informativos (🏠🟢➕)  
✅ Integração com modais (Cotação/Reserva/Bloqueio)  
✅ Sistema de templates multilíngue  
✅ WhatsApp Evolution API integrado  
✅ Dark mode completo  

### **Status:**
✅ **100% funcional** (Frontend Only)  
⚠️ Drag & Drop temporariamente desabilitado  
🔄 Aguardando backend real  

### **Próximos Passos:**
1. Conectar backend real
2. Reimplementar Drag & Drop
3. Webhook tempo real
4. IA para extração de dados

---

**✅ Este é o padrão de referência oficial!**

Qualquer alteração deve ser comparada com este documento. Em caso de dúvida, consulte o screenshot de referência ou os documentos relacionados.

**Versão:** Chat Telas 1.0  
**Data de Criação:** 03 NOV 2025  
**Autor:** Equipe RENDIZY  
**Status:** ✅ APROVADO E DOCUMENTADO  
**Última Atualização:** 03 NOV 2025
