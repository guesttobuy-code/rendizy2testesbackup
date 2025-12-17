# 🗺️ Roadmap de Implementação - Evolution API

**Versão:** v1.0.103.318  
**Data:** 06/11/2025  
**Análise Completa:** `/📊_ANALISE_EVOLUTION_API_GAPS_v1.0.103.318.md`

---

## 🎯 VISÃO GERAL

```
┌─────────────────────────────────────────────────────────────┐
│                    EVOLUTION API ROADMAP                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Implementado:  13/40 rotas (32.5%)  ████░░░░░░░░░░░░       │
│                                                              │
│  Sprint 1 (15h): +11 rotas → 24/40 (60%)  ████████░░░░░░    │
│  Sprint 2 (7h):  +6 rotas  → 30/40 (75%)  ██████████░░░░    │
│  Sprint 3 (5h):  +6 rotas  → 36/40 (90%)  ████████████░░    │
│  Sprint 4 (3h):  +4 rotas  → 40/40 (100%) ████████████████  │
│                                                              │
│  Total: 30 horas para API completa                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 SPRINT 1 - ESSENCIAL (15 horas)

**Objetivo:** Completar experiência básica de chat e gestão de grupos  
**Prazo:** 1 semana  
**Impacto:** 🔥 CRÍTICO  
**ROI:** Alto  

### **Dia 1-2: Chat Controller - UX Essencial (4 horas)**

#### **1. markMessageAsRead (1h)**
```typescript
// POST /make-server-67caf26a/whatsapp/mark-read
{
  remoteJid: string;
  messageIds: string[];
}

→ PUT /chat/markMessageAsRead/{instance}
{
  read_messages: Array<{
    remoteJid: string;
    fromMe: boolean;
    id: string;
  }>
}
```

**Features:**
- Marcar mensagem como lida
- Marcar conversa inteira como lida
- Atualizar badge de não lidas

**UI Integration:**
- Botão "Marcar como lida" no card de chat
- Auto-marcar quando abrir conversa
- Atualizar contador em tempo real

---

#### **2. sendPresence (1.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/send-presence
{
  number: string;
  presence: 'composing' | 'recording' | 'paused' | 'available';
  delay?: number;  // ms
}

→ POST /chat/sendPresence/{instance}
{
  number: string;
  options: {
    delay: number;
    presence: 'composing' | 'recording' | 'paused' | 'available';
  }
}
```

**Features:**
- Mostrar "digitando..." quando usuário digita
- Mostrar "gravando áudio..." quando grava
- Auto-pausar após 3 segundos sem digitar

**UI Integration:**
- Indicator automático no textarea
- Visual "..." animado na conversa do outro lado
- Cancelar quando enviar mensagem

---

#### **3. archiveChat (1.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/archive-chat
{
  chatId: string;
  archive: boolean;
  lastMessageId: string;
}

→ PUT /chat/archiveChat/{instance}
{
  lastMessage: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    }
  };
  archive: boolean;
}
```

**Features:**
- Arquivar conversa
- Desarquivar conversa
- Filtro "Arquivados" na sidebar

**UI Integration:**
- Menu dropdown no card de chat
- Tab "Arquivados" na lista
- Botão "Desarquivar" em conversas arquivadas

---

### **Dia 3-4: Group Controller - Básico (4 horas)**

#### **4. create (1h)**
```typescript
// POST /make-server-67caf26a/whatsapp/groups/create
{
  subject: string;
  description?: string;
  participants: string[];  // Array de números
}

→ POST /group/create/{instance}
```

**Features:**
- Criar grupo
- Adicionar participantes na criação
- Definir nome e descrição

**UI Integration:**
- Modal "Criar Grupo"
- Multi-select de contatos
- Preview dos participantes

---

#### **5. updateParticipant (1.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/groups/participants
{
  groupJid: string;
  action: 'add' | 'remove' | 'promote' | 'demote';
  participants: string[];
}

→ PUT /group/updateParticipant/{instance}?groupJid=...
{
  action: 'add' | 'remove' | 'promote' | 'demote';
  participants: string[];
}
```

**Features:**
- Adicionar membros
- Remover membros
- Promover a admin
- Remover admin

**UI Integration:**
- Modal "Gerenciar Membros"
- Lista de membros com badges (admin/member)
- Actions por membro (kick, promote, demote)

---

#### **6. inviteCode (1h)**
```typescript
// GET /make-server-67caf26a/whatsapp/groups/invite-code
?groupJid=...

→ GET /group/inviteCode/{instance}?groupJid=...

Response:
{
  inviteUrl: string;
  inviteCode: string;
}
```

**Features:**
- Gerar link de convite
- Copiar link
- Compartilhar link

**UI Integration:**
- Botão "Gerar Link" no modal do grupo
- Copy to clipboard
- Botão "Compartilhar"

---

#### **7. updateGroupSubject (0.5h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/groups/subject
{
  groupJid: string;
  subject: string;
}

→ PUT /group/updateGroupSubject/{instance}?groupJid=...
{
  subject: string;
}
```

**Features:**
- Renomear grupo
- Validar nome (max 25 chars)

**UI Integration:**
- Input inline no header do grupo
- Modal "Editar Grupo"

---

### **Dia 5: Profile Settings - Básico (3 horas)**

#### **8. updateProfileName (1h)**
```typescript
// POST /make-server-67caf26a/whatsapp/profile/name
{
  name: string;
}

→ POST /chat/updateProfileName/{instance}
{
  name: string;
}
```

**Features:**
- Atualizar nome do perfil WhatsApp
- Validar nome (max 25 chars)

**UI Integration:**
- Modal "Editar Perfil"
- Input com contador de caracteres

---

#### **9. updateProfilePicture (1.5h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/profile/picture
{
  picture: string;  // URL ou base64
}

→ PUT /chat/updateProfilePicture/{instance}
{
  picture: string;
}
```

**Features:**
- Upload de foto de perfil
- Crop e resize automático
- Preview antes de salvar

**UI Integration:**
- Upload com drag & drop
- Editor de imagem (crop)
- Botão "Remover Foto"

---

#### **10. removeProfilePicture (0.5h)**
```typescript
// DELETE /make-server-67caf26a/whatsapp/profile/picture

→ PUT /chat/removeProfilePicture/{instance}
```

**Features:**
- Remover foto de perfil

**UI Integration:**
- Botão "Remover Foto" no modal

---

### **Dia 6-7: Group Controller - Avançado (4 horas)**

#### **11. updateGroupPicture (1h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/groups/picture
{
  groupJid: string;
  image: string;  // URL
}

→ PUT /group/updateGroupPicture/{instance}?groupJid=...
{
  image: string;
}
```

**Features:**
- Atualizar foto do grupo
- Crop e resize

**UI Integration:**
- Upload no modal do grupo
- Editor de imagem

---

#### **12. fetchAllGroups (1h)**
```typescript
// GET /make-server-67caf26a/whatsapp/groups
?getParticipants=true

→ GET /group/fetchAllGroups/{instance}?getParticipants=true
```

**Features:**
- Listar todos os grupos
- Opcionalmente incluir participantes
- Cache local

**UI Integration:**
- Tab "Grupos" na sidebar
- Cards de grupos com foto e nome
- Contador de membros

---

#### **13. participants (1h)**
```typescript
// GET /make-server-67caf26a/whatsapp/groups/participants
?groupJid=...

→ GET /group/participants/{instance}?groupJid=...
```

**Features:**
- Listar membros de um grupo
- Mostrar quem é admin
- Ordenar (admins primeiro)

**UI Integration:**
- Modal "Membros do Grupo"
- Lista com avatares
- Badge "Admin" para admins

---

#### **14. sendInvite (1h)**
```typescript
// POST /make-server-67caf26a/whatsapp/groups/send-invite
{
  groupJid: string;
  numbers: string[];
  description?: string;
}

→ POST /group/sendInvite/{instance}
{
  groupJid: string;
  numbers: string[];
  description?: string;
}

Response:
{
  send: boolean;
  inviteUrl: string;
}
```

**Features:**
- Enviar convite para múltiplos números
- Mensagem personalizada
- Validar números

**UI Integration:**
- Modal "Convidar para Grupo"
- Multi-select de contatos
- Textarea para mensagem

---

## 📅 SPRINT 2 - AVANÇADO (7 horas)

**Objetivo:** Features avançadas de chat  
**Prazo:** 3-4 dias  
**Impacto:** ⚠️ IMPORTANTE  
**ROI:** Médio  

### **Chat Controller - Avançado**

#### **15. deleteMessageForEveryone (1h)**
```typescript
// DELETE /make-server-67caf26a/whatsapp/messages/delete-for-everyone
{
  id: string;
  remoteJid: string;
  fromMe: boolean;
  participant?: string;  // Se for grupo
}

→ DELETE /chat/deleteMessageForEveryone/{instance}
```

**Features:**
- Apagar mensagem para todos
- Limite de 7 minutos (WhatsApp)
- Apenas próprias mensagens

**UI Integration:**
- Menu dropdown na mensagem
- Confirmação "Apagar para todos?"
- Toast "Mensagem apagada"

---

#### **16. updateMessage (1.5h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/messages/update
{
  number: number;
  text: string;
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  }
}

→ PUT /chat/updateMessage/{instance}
```

**Features:**
- Editar mensagem enviada
- Limite de 15 minutos (WhatsApp)
- Indicador "editada"

**UI Integration:**
- Menu dropdown "Editar"
- Input inline para edição
- Badge "editada" na mensagem

---

#### **17. fetchProfilePictureUrl (1h)**
```typescript
// POST /make-server-67caf26a/whatsapp/profile/picture-url
{
  number: string;
}

→ POST /chat/fetchProfilePictureUrl/{instance}
{
  number: string;
}

Response:
{
  wuid: string;
  profilePictureUrl: string;
}
```

**Features:**
- Buscar foto de perfil de qualquer contato
- Cache local por 24h

**UI Integration:**
- Avatar nos cards de chat
- Avatar nas mensagens
- Modal de perfil do contato

---

#### **18. findMessages (1.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/messages/find
{
  remoteJid?: string;
  fromMe?: boolean;
  limit?: number;
}

→ POST /chat/findMessages/{instance}
{
  where: {
    key: {
      remoteJid?: string;
    }
  }
}
```

**Features:**
- Busca avançada de mensagens
- Filtrar por chat
- Filtrar enviadas/recebidas

**UI Integration:**
- Input de busca no header
- Filtros avançados
- Resultados com highlight

---

### **Profile Settings - Privacidade**

#### **19. fetchPrivacySettings (1h)**
```typescript
// GET /make-server-67caf26a/whatsapp/profile/privacy

→ GET /chat/fetchPrivacySettings/{instance}

Response:
{
  readreceipts: 'all' | 'none' | 'contacts';
  profile: 'all' | 'none' | 'contacts';
  status: 'all' | 'none' | 'contacts';
  online: 'all' | 'none' | 'contacts';
  last: 'all' | 'none' | 'contacts';
  groupadd: 'all' | 'none' | 'contacts';
}
```

**Features:**
- Buscar configurações de privacidade
- Cache local

**UI Integration:**
- Modal "Configurações de Privacidade"
- Exibir settings atuais

---

#### **20. updatePrivacySettings (2h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/profile/privacy
{
  privacySettings: {
    readreceipts?: 'all' | 'none' | 'contacts';
    profile?: 'all' | 'none' | 'contacts';
    status?: 'all' | 'none' | 'contacts';
    online?: 'all' | 'none' | 'contacts';
    last?: 'all' | 'none' | 'contacts';
    groupadd?: 'all' | 'none' | 'contacts';
  }
}

→ PUT /chat/updatePrivacySettings/{instance}
```

**Features:**
- Atualizar cada setting individualmente
- Validar valores permitidos

**UI Integration:**
- Selects para cada configuração
- Labels explicativos
- Botão "Salvar Alterações"

**Opções:**
- `all` - Todos
- `none` - Ninguém
- `contacts` - Apenas contatos
- `contact_blacklist` - Contatos exceto bloqueados

---

## 📅 SPRINT 3 - PREMIUM (5 horas)

**Objetivo:** Features premium de grupos  
**Prazo:** 2-3 dias  
**Impacto:** 📦 NICE TO HAVE  
**ROI:** Baixo  

### **Group Controller - Premium**

#### **21. updateSetting (1h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/groups/setting
{
  groupJid: string;
  action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked';
}

→ PUT /group/updateSetting/{instance}?groupJid=...
{
  action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked';
}
```

**Features:**
- `announcement` - Apenas admins enviam mensagens
- `not_announcement` - Todos enviam
- `locked` - Apenas admins editam info do grupo
- `unlocked` - Todos editam

**UI Integration:**
- Toggle "Apenas admins podem enviar"
- Toggle "Apenas admins podem editar"
- Modal de configurações do grupo

---

#### **22. toggleEphemeral (1h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/groups/ephemeral
{
  groupJid: string;
  expiration: number;  // 0 = off, 86400 = 1 dia, 604800 = 7 dias
}

→ PUT /group/toggleEphemeral/{instance}?groupJid=...
{
  expiration: number;
}
```

**Features:**
- Mensagens temporárias desativadas (0)
- 24 horas (86400)
- 7 dias (604800)
- 90 dias (7776000)

**UI Integration:**
- Select "Mensagens Temporárias"
- Opções: Desativado, 24h, 7 dias, 90 dias
- Warning explicativo

---

#### **23. revokeInviteCode (0.5h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/groups/revoke-invite
{
  groupJid: string;
}

→ PUT /group/revokeInviteCode/{instance}?groupJid=...
```

**Features:**
- Revogar link de convite atual
- Gerar novo link automaticamente

**UI Integration:**
- Botão "Revogar Link"
- Confirmação "Tem certeza?"
- Toast "Link revogado, novo gerado"

---

#### **24. acceptInviteCode (0.5h)**
```typescript
// GET /make-server-67caf26a/whatsapp/groups/accept-invite
?inviteCode=...

→ GET /group/acceptInviteCode/{instance}?inviteCode=...
```

**Features:**
- Aceitar convite por código
- Entrar em grupo automaticamente

**UI Integration:**
- Input "Código do Convite"
- Botão "Entrar no Grupo"
- Preview do grupo antes de aceitar

---

#### **25. inviteInfo (1h)**
```typescript
// GET /make-server-67caf26a/whatsapp/groups/invite-info
?inviteCode=...

→ GET /group/inviteInfo/{instance}?inviteCode=...
```

**Features:**
- Buscar informações do grupo por código
- Preview antes de aceitar

**UI Integration:**
- Modal "Preview do Grupo"
- Nome, foto, descrição, membros
- Botão "Entrar"

---

#### **26. leaveGroup (1h)**
```typescript
// DELETE /make-server-67caf26a/whatsapp/groups/leave
{
  groupJid: string;
}

→ DELETE /group/leaveGroup/{instance}?groupJid=...
```

**Features:**
- Sair do grupo
- Confirmação obrigatória

**UI Integration:**
- Menu dropdown "Sair do Grupo"
- Modal de confirmação crítica
- Remover grupo da lista após sair

---

## 📅 SPRINT 4 - COMPLEMENTAR (3 horas)

**Objetivo:** Completar 100% da API  
**Prazo:** 1-2 dias  
**Impacto:** 📦 COMPLEMENTAR  

### **Rotas Faltantes**

#### **27. findContacts (avançado) (0.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/contacts/find
{
  where: {
    id?: string;
  }
}

→ POST /chat/findContacts/{instance}
```

---

#### **28. findStatusMessage (0.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/status/find
{
  where: {
    _id?: string;
    id?: string;
    remoteJid?: string;
  };
  limit?: number;
}

→ POST /chat/findStatusMessage/{instance}
```

---

#### **29. fetchBusinessProfile (0.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/profile/business
{
  number: string;
}

→ POST /chat/fetchBusinessProfile/{instance}
```

---

#### **30. fetchProfile (0.5h)**
```typescript
// POST /make-server-67caf26a/whatsapp/profile/fetch
{
  number: string;
}

→ POST /chat/fetchProfile/{instance}
```

---

#### **31. updateGroupDescription (0.5h)**
```typescript
// PUT /make-server-67caf26a/whatsapp/groups/description
{
  groupJid: string;
  description: string;
}

→ PUT /group/updateGroupDescription/{instance}?groupJid=...
```

---

#### **32. findGroupInfos (0.5h)**
```typescript
// GET /make-server-67caf26a/whatsapp/groups/info
?groupJid=...

→ GET /group/findGroupInfos/{instance}?groupJid=...
```

---

## 📊 CRONOGRAMA VISUAL

```
┌────────────────────────────────────────────────────────────────┐
│                      TIMELINE (30 horas)                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Semana 1 (15h) - SPRINT 1 - ESSENCIAL                         │
│  ├── Dia 1-2: Chat UX ████░░░░░░░░░░░░ (4h)                   │
│  ├── Dia 3-4: Grupos Básico ████░░░░░░░░░░░░ (4h)             │
│  ├── Dia 5: Profile ███░░░░░░░░░░░░░░ (3h)                    │
│  └── Dia 6-7: Grupos Avançado ████░░░░░░░░░░░░ (4h)           │
│                                                                 │
│  ───────────────────────────────────────────────────────       │
│                                                                 │
│  Semana 2 (7h) - SPRINT 2 - AVANÇADO                          │
│  ├── Dia 1-2: Chat Avançado █████░░░░░░░░░░░ (5h)            │
│  └── Dia 3-4: Privacidade ██░░░░░░░░░░░░░░░░ (2h)            │
│                                                                 │
│  ───────────────────────────────────────────────────────       │
│                                                                 │
│  Semana 3 (5h) - SPRINT 3 - PREMIUM                           │
│  └── Dia 1-3: Grupos Premium █████░░░░░░░░░░░░░ (5h)         │
│                                                                 │
│  ───────────────────────────────────────────────────────       │
│                                                                 │
│  Semana 4 (3h) - SPRINT 4 - COMPLEMENTAR                      │
│  └── Dia 1-2: Rotas faltantes ███░░░░░░░░░░░░░░░ (3h)        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 MÉTRICAS DE SUCESSO

### **Sprint 1:**
- [ ] Mensagens marcadas como lidas funcionando
- [ ] Indicador "digitando..." funcionando
- [ ] Arquivar/Desarquivar chats funcionando
- [ ] Criar grupos funcionando
- [ ] Adicionar/Remover membros funcionando
- [ ] Links de convite funcionando
- [ ] Perfil (nome + foto) funcionando

**KPIs:**
- 60% da API implementada
- Tempo de resposta < 200ms
- 0 erros em produção

---

### **Sprint 2:**
- [ ] Apagar mensagens funcionando
- [ ] Editar mensagens funcionando
- [ ] Busca de mensagens funcionando
- [ ] Configurações de privacidade funcionando

**KPIs:**
- 75% da API implementada
- Busca retorna em < 500ms

---

### **Sprint 3:**
- [ ] Configurações avançadas de grupo funcionando
- [ ] Mensagens temporárias funcionando
- [ ] Sistema de convites completo

**KPIs:**
- 90% da API implementada
- Todas features premium testadas

---

### **Sprint 4:**
- [ ] 100% da API implementada
- [ ] Toda documentação atualizada
- [ ] Testes E2E passando

**KPIs:**
- 100% da API implementada
- Cobertura de testes > 80%

---

## 🚀 COMO COMEÇAR

### **1. Setup (30 minutos)**

```bash
# Criar branch
git checkout -b feature/evolution-api-sprint-1

# Verificar env vars
cat .env | grep EVOLUTION

# Deve ter:
EVOLUTION_API_URL=https://...
EVOLUTION_INSTANCE_NAME=...
EVOLUTION_GLOBAL_API_KEY=...
EVOLUTION_INSTANCE_TOKEN=...
```

---

### **2. Implementar Rota (modelo)**

```typescript
// 1. Adicionar rota no backend
// /supabase/functions/server/routes-whatsapp-evolution.ts

app.put('/make-server-67caf26a/whatsapp/mark-read', async (c) => {
  try {
    const { remoteJid, messageIds } = await c.req.json();
    
    if (!remoteJid || !messageIds?.length) {
      return c.json({ error: 'remoteJid e messageIds são obrigatórios' }, 400);
    }

    const response = await fetch(
      `${EVOLUTION_API_URL}/chat/markMessageAsRead/${EVOLUTION_INSTANCE_NAME}`,
      {
        method: 'PUT',
        headers: getEvolutionMessagesHeaders(),
        body: JSON.stringify({
          read_messages: messageIds.map(id => ({
            remoteJid,
            fromMe: true,
            id
          }))
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp] Erro ao marcar como lida:', errorText);
      return c.json({ error: 'Erro ao marcar como lida' }, response.status);
    }

    const data = await response.json();
    return c.json({ success: true, data });
  } catch (error) {
    console.error('[WhatsApp] Erro em mark-read:', error);
    return c.json({ error: 'Erro interno' }, 500);
  }
});

// 2. Criar wrapper no frontend
// /utils/evolutionApi.ts

export async function markMessagesAsRead(remoteJid: string, messageIds: string[]) {
  return fetchAPI('/whatsapp/mark-read', {
    method: 'PUT',
    body: JSON.stringify({ remoteJid, messageIds })
  });
}

// 3. Usar na UI
// /components/ChatInbox.tsx

const handleMarkAsRead = async (chatId: string, messageIds: string[]) => {
  try {
    await markMessagesAsRead(chatId, messageIds);
    toast.success('Mensagens marcadas como lidas');
    // Atualizar UI
  } catch (error) {
    toast.error('Erro ao marcar como lidas');
  }
};
```

---

### **3. Testar**

```typescript
// Teste manual no navegador
const response = await fetch('/whatsapp/mark-read', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ...'
  },
  body: JSON.stringify({
    remoteJid: '5511999999999@s.whatsapp.net',
    messageIds: ['msg123', 'msg456']
  })
});

console.log(await response.json());
```

---

## 📝 CHECKLIST POR ROTA

Para cada rota implementar:

- [ ] **Backend:** Rota criada com validação
- [ ] **Backend:** Error handling completo
- [ ] **Backend:** Logs detalhados
- [ ] **Frontend:** Wrapper criado em `evolutionApi.ts`
- [ ] **Frontend:** Integração na UI
- [ ] **Frontend:** Loading state
- [ ] **Frontend:** Toast de sucesso/erro
- [ ] **Docs:** Adicionar ao OpenAPI YAML
- [ ] **Docs:** Atualizar changelog
- [ ] **Teste:** Teste manual executado
- [ ] **Teste:** Edge cases validados

---

## 🎓 RECURSOS

### **Documentação:**
- `/📊_ANALISE_EVOLUTION_API_GAPS_v1.0.103.318.md`
- `/docs/INTEGRACAO_EVOLUTION_API_GUIA_COMPLETO.md`
- [Evolution API Docs](https://doc.evolution-api.com/)

### **Ferramentas:**
```bash
# Gerar SDK TypeScript
npm i -D openapi-typescript
npx openapi-typescript evolution-api.yaml -o src/clients/evolution.types.ts
```

### **Arquivos Principais:**
- `/supabase/functions/server/routes-whatsapp-evolution.ts` (backend)
- `/utils/evolutionApi.ts` (wrapper frontend)
- `/components/ChatInbox.tsx` (UI principal)
- `/components/WhatsAppIntegration.tsx` (configuração)

---

## 🎯 RESUMO

**Total:** 30 horas divididas em 4 sprints  
**Prioridade:** Sprint 1 (15h) é CRÍTICO  
**ROI:** Alto (diferencial competitivo)  
**Complexidade:** Baixa a Média  

**Próximo Passo:**  
Começar Sprint 1 - Chat UX (4 horas)

---

**VERSÃO:** v1.0.103.318  
**CRIADO:** 06/11/2025  
**STATUS:** ✅ ROADMAP COMPLETO
