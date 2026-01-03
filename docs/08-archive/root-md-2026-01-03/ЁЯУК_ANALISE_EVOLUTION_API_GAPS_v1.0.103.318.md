# 📊 Análise Comparativa - Evolution API Endpoints

**Versão:** v1.0.103.318  
**Data:** 06/11/2025  
**Análise:** Documento OpenAPI fornecido vs Implementação atual

---

## 🎯 RESUMO EXECUTIVO

Comparação entre o **contrato OpenAPI** da Evolution API (documentado pelo usuário) e nossa **implementação atual** no Rendizy.

### ✅ **Status Geral:**

- **Endpoints implementados:** 13/40+ (32.5%)
- **Controllers mapeados:** 1/3 (33%)
- **Rotas críticas:** ✅ Implementadas
- **Rotas avançadas:** ❌ Faltando

---

## 📋 ENDPOINTS IMPLEMENTADOS vs DOCUMENTADOS

### **✅ IMPLEMENTADOS (13 rotas)**

#### **Mensagens (Message Controller)**
```
✅ POST /whatsapp/send-message          → /message/sendText/{instance}
✅ POST /whatsapp/send-media            → /message/sendMedia/{instance}
✅ GET  /whatsapp/messages              → /message/inbox/{instance}
```

#### **Instância (Instance Controller)**
```
✅ GET  /whatsapp/status                → /instance/status/{instance}
✅ GET  /whatsapp/instance-info         → /instance/fetchInstances
✅ GET  /whatsapp/qr-code              → /instance/connect/{instance}
✅ POST /whatsapp/disconnect            → /instance/logout/{instance}
✅ POST /whatsapp/reconnect             → /instance/restart/{instance}
```

#### **Contatos & Chats**
```
✅ POST /whatsapp/check-number          → /chat/whatsappNumbers/{instance}
✅ GET  /whatsapp/contacts              → /contact/findContacts/{instance}
✅ GET  /whatsapp/chats                 → /chat/findChats/{instance}
```

#### **Webhook**
```
✅ POST /whatsapp/webhook               → Recebe eventos da Evolution
```

#### **Saúde**
```
✅ GET  /whatsapp/health                → Health check interno
```

---

## ❌ ENDPOINTS NÃO IMPLEMENTADOS (27 rotas)

### **Chat Controller (10 rotas faltando)**

#### **Mensagens**
```
❌ PUT    /chat/markMessageAsRead/{instance}
❌ DELETE /chat/deleteMessageForEveryone/{instance}
❌ PUT    /chat/updateMessage/{instance}
```

#### **Chat Management**
```
❌ PUT  /chat/archiveChat/{instance}
❌ POST /chat/sendPresence/{instance}         # Typing indicator
❌ POST /chat/findMessages/{instance}
❌ POST /chat/findStatusMessage/{instance}
❌ POST /chat/findContacts/{instance}         # Busca avançada
```

#### **Perfil & Business**
```
❌ POST /chat/fetchProfilePictureUrl/{instance}
❌ POST /chat/fetchBusinessProfile/{instance}
```

---

### **Profile Settings (7 rotas faltando)**

#### **Perfil**
```
❌ POST /chat/fetchProfile/{instance}
❌ POST /chat/updateProfileName/{instance}
❌ POST /chat/updateProfileStatus/{instance}
❌ PUT  /chat/updateProfilePicture/{instance}
❌ PUT  /chat/removeProfilePicture/{instance}
```

#### **Privacidade**
```
❌ GET  /chat/fetchPrivacySettings/{instance}
❌ PUT  /chat/updatePrivacySettings/{instance}
```

**Settings disponíveis:**
- `readreceipts` - Confirmações de leitura
- `profile` - Quem vê perfil
- `status` - Quem vê status
- `online` - Quem vê online
- `last` - Quem vê última vez
- `groupadd` - Quem pode adicionar em grupos

---

### **Group Controller (17 rotas faltando)**

#### **Criação & Info**
```
❌ POST /group/create/{instance}
❌ GET  /group/findGroupInfos/{instance}
❌ GET  /group/fetchAllGroups/{instance}
❌ GET  /group/participants/{instance}
```

#### **Atualização**
```
❌ PUT /group/updateGroupPicture/{instance}
❌ PUT /group/updateGroupSubject/{instance}
❌ PUT /group/updateGroupDescription/{instance}
❌ PUT /group/updateParticipant/{instance}      # add/remove/promote/demote
❌ PUT /group/updateSetting/{instance}          # announcement/locked
```

#### **Convites**
```
❌ GET  /group/inviteCode/{instance}
❌ GET  /group/acceptInviteCode/{instance}
❌ PUT  /group/revokeInviteCode/{instance}
❌ POST /group/sendInvite/{instance}
❌ GET  /group/inviteInfo/{instance}
```

#### **Avançado**
```
❌ PUT    /group/toggleEphemeral/{instance}    # Mensagens temporárias
❌ DELETE /group/leaveGroup/{instance}
```

---

## 🎨 ESTRUTURA DE DADOS - SCHEMAS

### ✅ **Schemas que TEMOS:**

```typescript
// Mensagem básica (send-message)
{
  number: string;
  text: string;
}

// Mídia (send-media)
{
  number: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
}

// Check number (check-number)
{
  number: string;
}
```

### ❌ **Schemas que FALTAM:**

#### **Chat Controller**
```typescript
// ReadMessagesRequest
{
  read_messages: Array<{
    remoteJid: string;
    fromMe: boolean;
    id: string;
  }>
}

// ArchiveChatRequest
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

// DeleteForEveryoneRequest
{
  id: string;
  remoteJid: string;
  fromMe: boolean;
  participant?: string;  // Para grupos
}

// SendPresenceRequest
{
  number: string;
  options: {
    delay: number;
    presence: 'composing' | 'recording' | 'paused' | 'available';
  }
}

// UpdateMessageRequest
{
  number: number;
  text: string;
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  }
}
```

#### **Profile Settings**
```typescript
// UpdatePrivacySettingsRequest
{
  privacySettings: {
    readreceipts?: 'all' | 'none' | 'contacts' | 'contact_blacklist';
    profile?: 'all' | 'none' | 'contacts' | 'contact_blacklist';
    status?: 'all' | 'none' | 'contacts' | 'contact_blacklist';
    online?: 'all' | 'none' | 'contacts';
    last?: 'all' | 'none' | 'contacts';
    groupadd?: 'all' | 'none' | 'contacts';
  }
}
```

#### **Group Controller**
```typescript
// CreateGroupRequest
{
  subject: string;
  description?: string;
  participants: string[];  // Array de números
}

// UpdateGroupParticipantsRequest
{
  action: 'add' | 'remove' | 'promote' | 'demote';
  participants: string[];
}

// UpdateGroupSettingRequest
{
  action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked';
}

// ToggleEphemeralRequest
{
  expiration: number;  // Segundos (0 = desativar, 86400 = 1 dia, 604800 = 7 dias)
}

// SendGroupInviteRequest
{
  groupJid: string;
  description?: string;
  numbers: string[];
}
```

---

## 🔍 ANÁLISE POR CONTROLLER

### **1. Chat Controller**

**Implementado:** 3/13 (23%)

**Crítico faltando:**
- ✅ `markMessageAsRead` - Marcar como lida (importante UX)
- ✅ `archiveChat` - Arquivar conversas
- ✅ `sendPresence` - Indicador "digitando..."
- ⚠️ `deleteMessageForEveryone` - Apagar para todos
- ⚠️ `updateMessage` - Editar mensagem enviada

**Nice to have:**
- `fetchProfilePictureUrl` - Foto de perfil
- `findMessages` - Busca avançada
- `findStatusMessage` - Status (stories)

---

### **2. Profile Settings**

**Implementado:** 0/7 (0%)

**Crítico faltando:**
- ✅ `updateProfileName` - Atualizar nome do perfil
- ✅ `updateProfilePicture` - Atualizar foto
- ⚠️ `updatePrivacySettings` - Configurações de privacidade

**Nice to have:**
- `fetchProfile` - Ver perfil de contato
- `fetchPrivacySettings` - Ver configurações atuais

---

### **3. Group Controller**

**Implementado:** 0/17 (0%)

**Crítico faltando:**
- ✅ `create` - Criar grupo
- ✅ `updateParticipant` - Adicionar/remover membros
- ✅ `inviteCode` - Gerar link de convite
- ✅ `updateGroupSubject` - Renomear grupo
- ✅ `updateGroupPicture` - Foto do grupo

**Nice to have:**
- `fetchAllGroups` - Listar todos os grupos
- `updateSetting` - Configurações (announcement/locked)
- `toggleEphemeral` - Mensagens temporárias
- `leaveGroup` - Sair do grupo

---

## 🎯 PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### **🔥 CRÍTICO (Próxima Sprint)**

#### **1. Chat Controller - Essencial UX (3 rotas)**
```
Priority 1:
- PUT  /chat/markMessageAsRead/{instance}
- POST /chat/sendPresence/{instance}
- PUT  /chat/archiveChat/{instance}
```

**Justificativa:** Melhorar experiência do usuário no chat

**Esforço:** 4 horas  
**Impacto:** Alto

---

#### **2. Profile Settings - Personalização (3 rotas)**
```
Priority 1:
- POST /chat/updateProfileName/{instance}
- PUT  /chat/updateProfilePicture/{instance}
- PUT  /chat/removeProfilePicture/{instance}
```

**Justificativa:** Usuário precisa personalizar perfil WhatsApp

**Esforço:** 3 horas  
**Impacto:** Médio

---

#### **3. Group Controller - Gestão de Grupos (8 rotas)**
```
Priority 1:
- POST /group/create/{instance}
- PUT  /group/updateParticipant/{instance}
- GET  /group/inviteCode/{instance}
- PUT  /group/updateGroupSubject/{instance}

Priority 2:
- PUT  /group/updateGroupPicture/{instance}
- GET  /group/fetchAllGroups/{instance}
- GET  /group/participants/{instance}
- POST /group/sendInvite/{instance}
```

**Justificativa:** Gestão completa de grupos WhatsApp

**Esforço:** 8 horas  
**Impacto:** Alto (diferencial competitivo)

---

### **⚠️ IMPORTANTE (Sprint seguinte)**

#### **4. Chat Controller - Avançado (4 rotas)**
```
- DELETE /chat/deleteMessageForEveryone/{instance}
- PUT    /chat/updateMessage/{instance}
- POST   /chat/fetchProfilePictureUrl/{instance}
- POST   /chat/findMessages/{instance}
```

**Esforço:** 4 horas  
**Impacto:** Médio

---

#### **5. Profile Settings - Privacidade (2 rotas)**
```
- GET /chat/fetchPrivacySettings/{instance}
- PUT /chat/updatePrivacySettings/{instance}
```

**Esforço:** 3 horas  
**Impacto:** Baixo (usuário raramente altera)

---

### **📦 NICE TO HAVE (Backlog)**

#### **6. Group Controller - Features Avançadas (6 rotas)**
```
- PUT    /group/updateSetting/{instance}
- PUT    /group/toggleEphemeral/{instance}
- PUT    /group/revokeInviteCode/{instance}
- GET    /group/acceptInviteCode/{instance}
- GET    /group/inviteInfo/{instance}
- DELETE /group/leaveGroup/{instance}
```

**Esforço:** 5 horas  
**Impacto:** Baixo

---

## 📊 ESTATÍSTICAS

### **Por Controller:**

| Controller        | Implementado | Total | % Completo | Prioridade |
|------------------|--------------|-------|------------|------------|
| Chat Controller  | 3            | 13    | 23%        | 🔥 CRÍTICO |
| Profile Settings | 0            | 7     | 0%         | ⚠️ IMPORTANTE |
| Group Controller | 0            | 17    | 0%         | 🔥 CRÍTICO |
| **TOTAL**        | **3**        | **37**| **8%**     | -          |

### **Por Prioridade:**

| Prioridade       | Rotas | Esforço | Status |
|-----------------|-------|---------|---------|
| 🔥 Crítico      | 14    | 15h     | ❌ Não iniciado |
| ⚠️ Importante   | 6     | 7h      | ❌ Não iniciado |
| 📦 Nice to Have | 6     | 5h      | ❌ Backlog |
| ✅ Implementado | 13    | -       | ✅ Concluído |

---

## 🔧 IMPACTO TÉCNICO

### **Headers & Autenticação:**

**✅ Temos:**
```typescript
// Manager endpoints
{
  'apikey': GLOBAL_API_KEY,
  'instanceToken': INSTANCE_TOKEN,
  'Content-Type': 'application/json'
}

// Message endpoints
{
  'apikey': GLOBAL_API_KEY,
  'instanceToken': INSTANCE_TOKEN,  // Adicionado para instâncias seguras
  'Content-Type': 'application/json'
}
```

**✅ Status:** Correto e alinhado com documentação

---

### **Validação de Configuração:**

**✅ Temos:**
```typescript
// Validação obrigatória no início do arquivo
if (!EVOLUTION_API_URL_RAW) throw Error(...)
if (!EVOLUTION_INSTANCE_NAME) throw Error(...)
if (!EVOLUTION_GLOBAL_API_KEY) throw Error(...)
if (!EVOLUTION_INSTANCE_TOKEN) throw Error(...)
```

**✅ Status:** Seguro e robusto

---

### **Error Handling:**

**✅ Temos:**
```typescript
// Modo offline/fallback
if (!response.ok) {
  return c.json({ 
    success: true, 
    data: [],
    offline: true,
    message: 'Evolution API offline'
  });
}
```

**✅ Status:** Graceful degradation implementado

---

## 🚀 PLANO DE AÇÃO

### **Sprint 1 (15 horas) - CRÍTICO**

**Objetivo:** Completar experiência básica de chat e grupos

#### **Semana 1 (8 horas):**
```
1. Chat Controller (4h)
   ✓ markMessageAsRead
   ✓ sendPresence
   ✓ archiveChat

2. Group Controller - Básico (4h)
   ✓ create
   ✓ updateParticipant (add/remove)
   ✓ inviteCode
   ✓ updateGroupSubject
```

#### **Semana 2 (7 horas):**
```
3. Profile Settings (3h)
   ✓ updateProfileName
   ✓ updateProfilePicture
   ✓ removeProfilePicture

4. Group Controller - Avançado (4h)
   ✓ updateGroupPicture
   ✓ fetchAllGroups
   ✓ participants
   ✓ sendInvite
```

---

### **Sprint 2 (7 horas) - IMPORTANTE**

**Objetivo:** Features avançadas de chat

```
1. Chat Controller - Avançado (4h)
   ✓ deleteMessageForEveryone
   ✓ updateMessage
   ✓ fetchProfilePictureUrl
   ✓ findMessages

2. Profile Settings - Privacidade (3h)
   ✓ fetchPrivacySettings
   ✓ updatePrivacySettings
```

---

### **Sprint 3 (5 horas) - BACKLOG**

**Objetivo:** Features premium de grupos

```
1. Group Controller - Premium (5h)
   ✓ updateSetting (announcement/locked)
   ✓ toggleEphemeral
   ✓ revokeInviteCode
   ✓ acceptInviteCode
   ✓ inviteInfo
   ✓ leaveGroup
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

Para cada endpoint novo:

- [ ] **1. Definir schema de request/response**
  ```typescript
  interface RequestDTO { ... }
  interface ResponseDTO { ... }
  ```

- [ ] **2. Criar rota no backend**
  ```typescript
  app.post('/make-server-67caf26a/whatsapp/nova-rota', async (c) => {
    // Implementação
  })
  ```

- [ ] **3. Adicionar validação**
  ```typescript
  if (!param) {
    return c.json({ error: 'Parâmetro obrigatório' }, 400);
  }
  ```

- [ ] **4. Implementar chamada Evolution API**
  ```typescript
  const response = await fetch(
    `${EVOLUTION_API_URL}/endpoint/${EVOLUTION_INSTANCE_NAME}`,
    { method, headers: getEvolutionMessagesHeaders(), body }
  );
  ```

- [ ] **5. Adicionar error handling**
  ```typescript
  if (!response.ok) {
    console.error('[WhatsApp] Erro:', await response.text());
    return c.json({ error: 'Mensagem amigável' }, response.status);
  }
  ```

- [ ] **6. Criar wrapper no frontend**
  ```typescript
  // utils/evolutionApi.ts
  export async function novaFuncao(params) {
    return fetchAPI('/whatsapp/nova-rota', { method: 'POST', body: params });
  }
  ```

- [ ] **7. Documentar no OpenAPI**
  - Adicionar path no YAML
  - Definir schemas
  - Especificar responses

- [ ] **8. Testar endpoint**
  - Criar teste manual
  - Validar response
  - Testar error cases

- [ ] **9. Integrar na UI**
  - Adicionar botão/ação
  - Implementar loading state
  - Toast de sucesso/erro

- [ ] **10. Atualizar documentação**
  - Changelog
  - Guia de uso
  - Exemplos

---

## 🎓 APRENDIZADOS DO DOCUMENTO

### **1. Estrutura de Keys:**

O documento OpenAPI mostra que WhatsApp usa estrutura de `key`:

```typescript
{
  key: {
    remoteJid: string;  // ID da conversa/contato
    fromMe: boolean;    // Se mensagem foi enviada por mim
    id: string;         // ID único da mensagem
  }
}
```

**Ação:** Adaptar nosso modelo de dados para usar essa estrutura

---

### **2. Presença (Typing Indicator):**

Tipos de presença disponíveis:

```typescript
'composing'  // Digitando...
'recording'  // Gravando áudio...
'paused'     // Parou de digitar
'available'  // Disponível
```

**Ação:** Implementar indicador visual no chat UI

---

### **3. Privacidade - Níveis:**

Configurações de privacidade têm 4 níveis:

```typescript
'all'              // Todos
'none'             // Ninguém
'contacts'         // Apenas contatos
'contact_blacklist'// Contatos exceto bloqueados
```

**Ação:** Criar UI para configurar privacidade

---

### **4. Grupos - Actions:**

Gerenciamento de membros tem 4 ações:

```typescript
'add'     // Adicionar
'remove'  // Remover
'promote' // Tornar admin
'demote'  // Remover admin
```

**Ação:** Implementar gestão completa de membros

---

### **5. Mensagens Efêmeras:**

Grupos podem ter mensagens temporárias:

```typescript
0       // Desativado
86400   // 24 horas (1 dia)
604800  // 7 dias
```

**Ação:** Adicionar configuração de mensagens temporárias

---

## 📚 RECURSOS ADICIONAIS

### **Documentação Evolution API:**

- OpenAPI YAML fornecido pelo usuário
- [Evolution API Docs](https://doc.evolution-api.com/)
- Swagger/Redoc para testes

### **Ferramentas Sugeridas:**

```bash
# Gerar cliente TypeScript automaticamente
npm i -D openapi-typescript
npx openapi-typescript evolution-api.yaml -o src/clients/evolution.types.ts

# OU
npm i -D swagger-typescript-api
npx swagger-typescript-api -p evolution-api.yaml -o src/clients -n evolution.client.ts
```

---

## 🎯 RESUMO FINAL

### **O QUE TEMOS:**
✅ 13 endpoints básicos (mensagens, status, contatos)  
✅ Autenticação correta (apikey + instanceToken)  
✅ Error handling robusto  
✅ Modo offline/fallback  
✅ Webhook funcionando  

### **O QUE FALTA:**
❌ 27 endpoints avançados (73% da API)  
❌ Chat Controller - Features UX (marcar lida, arquivar, typing)  
❌ Profile Settings - 100% não implementado  
❌ Group Controller - 100% não implementado  

### **IMPACTO:**
🔥 **CRÍTICO:** Sem grupos e profile, perdemos diferencial competitivo  
⚠️ **UX:** Falta indicador "digitando...", marcar como lida, arquivar  
📦 **PREMIUM:** Mensagens efêmeras, configurações avançadas  

### **RECOMENDAÇÃO:**
**Implementar Sprint 1 (15 horas) URGENTE:**
- Chat UX (marcar lida, typing, arquivar)
- Grupos básicos (criar, adicionar/remover, convite)
- Perfil básico (nome, foto)

**ROI:** Alto  
**Esforço:** Baixo (15 horas)  
**Diferencial:** Competitivo  

---

**PRÓXIMO PASSO:**  
Começar implementação pelos endpoints críticos listados em "Sprint 1"

---

**VERSÃO:** v1.0.103.318  
**CRIADO:** 06/11/2025  
**STATUS:** ✅ ANÁLISE COMPLETA  
**AÇÃO:** Implementar Sprint 1 URGENTE
