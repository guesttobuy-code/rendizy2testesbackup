# 💬 HANDOFF - GAPS DO MÓDULO CHAT/WHATSAPP RENDIZY

**Destinatário:** Codex AI / Equipe de Desenvolvimento  
**Data:** 03 NOV 2025  
**Versão RENDIZY:** v1.0.103.260-MULTI-TENANT-AUTH  
**Status:** 🟢 FRONTEND 90% | 🟡 BACKEND 70%  

---

## 🎯 VISÃO GERAL

O módulo de Chat/WhatsApp está **90% completo**, mas possui alguns **gaps funcionais** que precisam ser implementados para ficar 100% production-ready.

---

## ✅ O QUE JÁ ESTÁ COMPLETO

### **Frontend (90%):**
- ✅ ChatInbox.tsx - Inbox de conversas
- ✅ ChatInboxWithEvolution.tsx - Integração Evolution API
- ✅ ChatFilterSidebar.tsx - Filtros laterais
- ✅ ChatTagsModal.tsx - Gestão de tags
- ✅ TemplateManagerModal.tsx - Gestão de templates
- ✅ WhatsAppIntegration.tsx - Tela de configuração

### **Backend (70%):**
- ✅ routes-chat.ts - CRUD de conversas
- ✅ routes-whatsapp-evolution.ts - Integração Evolution API
- ✅ Busca básica de mensagens
- ✅ Filtros por status/tag
- ✅ Upload de anexos

---

## 🔴 GAPS IDENTIFICADOS

### **GAP 1: Templates com Variáveis Dinâmicas**

**Status:** Frontend 100% | Backend 50%

**O que falta:**
```typescript
// Backend deve processar variáveis nos templates

// Template salvo:
"Olá {{nome}}, sua reserva em {{propriedade}} está confirmada!"

// Ao enviar, substituir:
"Olá João Silva, sua reserva em Apt 501 - Copacabana está confirmada!"

// Variáveis disponíveis:
{{nome}}
{{propriedade}}
{{checkin}}
{{checkout}}
{{valor}}
{{codigo_reserva}}
```

**Endpoint a criar:**
```http
POST /chat/templates/:id/processar
```

**Request:**
```json
{
  "templateId": "template_001",
  "variaveis": {
    "nome": "João Silva",
    "propriedade": "Apt 501 - Copacabana",
    "checkin": "15/12/2025",
    "checkout": "22/12/2025",
    "valor": "R$ 5.000,00",
    "codigo_reserva": "RES-001"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mensagemProcessada": "Olá João Silva, sua reserva em Apt 501 - Copacabana está confirmada!",
    "variaveis": { /* ... */ }
  }
}
```

**Implementação backend:**
```typescript
app.post('/chat/templates/:id/processar', async (c) => {
  const { id } = c.req.param();
  const { variaveis } = await c.req.json();
  
  const template = await kv.get(`chat_template:${id}`);
  if (!template) {
    return c.json({ success: false, error: 'Template não encontrado' }, 404);
  }
  
  let mensagem = template.mensagem;
  
  // Substituir variáveis
  for (const [chave, valor] of Object.entries(variaveis)) {
    mensagem = mensagem.replace(new RegExp(`{{${chave}}}`, 'g'), valor);
  }
  
  return c.json({
    success: true,
    data: {
      mensagemProcessada: mensagem,
      variaveis
    }
  });
});
```

---

### **GAP 2: Filtros Avançados por Tags**

**Status:** Frontend 100% | Backend 60%

**O que falta:**
```http
GET /chat/conversas?tags=vip,urgente&operador=AND
```

Atualmente só funciona filtro por 1 tag. Precisa suportar:
- Múltiplas tags
- Operador AND (tem todas) ou OR (tem qualquer uma)
- Filtro por ausência de tag

**Implementação backend:**
```typescript
app.get('/chat/conversas', async (c) => {
  const { tags, operador = 'OR' } = c.req.query();
  
  let conversas = await kv.getByPrefix('chat_conversa:');
  
  if (tags) {
    const tagsArray = tags.split(',');
    
    conversas = conversas.filter(conv => {
      if (!conv.tags) return false;
      
      if (operador === 'AND') {
        // Deve ter TODAS as tags
        return tagsArray.every(tag => conv.tags.includes(tag));
      } else {
        // Deve ter QUALQUER uma das tags
        return tagsArray.some(tag => conv.tags.includes(tag));
      }
    });
  }
  
  return c.json({ success: true, data: conversas });
});
```

---

### **GAP 3: Busca Full-Text Otimizada**

**Status:** Frontend 100% | Backend 50%

**Problema atual:**
Busca é feita em memória percorrendo todas as mensagens. Para +10k mensagens, fica lento.

**Solução:**
Implementar índice invertido para busca rápida.

**Estrutura de índice:**
```typescript
// KV Store
chat_search_index:{palavra}:{conversaId}:{mensagemId}

// Exemplo:
chat_search_index:reserva:conv_001:msg_001
chat_search_index:reserva:conv_002:msg_015
chat_search_index:copacabana:conv_001:msg_003
```

**Ao salvar mensagem, indexar:**
```typescript
async function indexarMensagem(mensagem: Mensagem) {
  const palavras = mensagem.texto
    .toLowerCase()
    .split(/\s+/)
    .filter(p => p.length >= 3);  // Ignorar palavras < 3 letras
  
  for (const palavra of palavras) {
    const chave = `chat_search_index:${palavra}:${mensagem.conversaId}:${mensagem.id}`;
    await kv.set(chave, {
      conversaId: mensagem.conversaId,
      mensagemId: mensagem.id,
      data: mensagem.timestamp
    });
  }
}
```

**Buscar:**
```typescript
app.get('/chat/buscar', async (c) => {
  const { termo } = c.req.query();
  
  const palavras = termo.toLowerCase().split(/\s+/);
  const resultados: Set<string> = new Set();
  
  for (const palavra of palavras) {
    const matches = await kv.getByPrefix(`chat_search_index:${palavra}:`);
    matches.forEach(m => resultados.add(m.conversaId));
  }
  
  // Buscar conversas
  const conversas = await Promise.all(
    Array.from(resultados).map(id => kv.get(`chat_conversa:${id}`))
  );
  
  return c.json({ success: true, data: conversas });
});
```

---

### **GAP 4: Estatísticas de Chat**

**Status:** Frontend 50% (placeholders) | Backend 0%

**O que criar:**

**Endpoint:**
```http
GET /chat/estatisticas?dataInicio=2025-11-01&dataFim=2025-11-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "inicio": "2025-11-01",
      "fim": "2025-11-30"
    },
    "metricas": {
      "totalConversas": 156,
      "conversasNovas": 45,
      "mensagensEnviadas": 523,
      "mensagensRecebidas": 789,
      "tempoRespostaMediaMinutos": 12.5,
      "taxaResposta": 98.5,
      "conversasAtivas": 23,
      "conversasArquivadas": 133
    },
    "porDia": [
      {
        "dia": "2025-11-01",
        "conversas": 5,
        "mensagens": 42
      }
    ],
    "porHora": [
      {
        "hora": 9,
        "mensagens": 45
      },
      {
        "hora": 14,
        "mensagens": 78
      }
    ],
    "porTag": [
      {
        "tag": "vip",
        "conversas": 12,
        "percentual": 7.7
      },
      {
        "tag": "urgente",
        "conversas": 8,
        "percentual": 5.1
      }
    ]
  }
}
```

**Implementação:**
```typescript
app.get('/chat/estatisticas', async (c) => {
  const { dataInicio, dataFim } = c.req.query();
  const organizationId = c.get('organizationId');
  
  const conversas = await kv.getByPrefix('chat_conversa:');
  const filtradas = conversas.filter(conv =>
    conv.organizationId === organizationId &&
    conv.ultimaMensagemTimestamp >= dataInicio &&
    conv.ultimaMensagemTimestamp <= dataFim
  );
  
  // Calcular métricas
  const totalConversas = filtradas.length;
  const conversasNovas = filtradas.filter(c => c.createdAt >= dataInicio).length;
  
  // Buscar mensagens
  const mensagens = await Promise.all(
    filtradas.map(conv => kv.getByPrefix(`chat_mensagem:${conv.id}:`))
  );
  const todasMensagens = mensagens.flat();
  
  const mensagensEnviadas = todasMensagens.filter(m => m.fromMe).length;
  const mensagensRecebidas = todasMensagens.filter(m => !m.fromMe).length;
  
  // Tempo de resposta médio
  const temposResposta = [];
  for (const conv of filtradas) {
    const msgs = await kv.getByPrefix(`chat_mensagem:${conv.id}:`);
    const ordenadas = msgs.sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].fromMe && !ordenadas[i-1].fromMe) {
        const diff = ordenadas[i].timestamp - ordenadas[i-1].timestamp;
        temposResposta.push(diff / 60000);  // em minutos
      }
    }
  }
  
  const tempoRespostaMedia = temposResposta.length > 0
    ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length
    : 0;
  
  return c.json({
    success: true,
    data: {
      periodo: { inicio: dataInicio, fim: dataFim },
      metricas: {
        totalConversas,
        conversasNovas,
        mensagensEnviadas,
        mensagensRecebidas,
        tempoRespostaMediaMinutos: Math.round(tempoRespostaMedia * 10) / 10,
        // ... mais métricas
      }
    }
  });
});
```

---

### **GAP 5: Integração com CRM (Criar Tasks)**

**Status:** Planejado | Backend 0%

**Funcionalidade:**
Permitir criar tarefa CRM diretamente de uma conversa do WhatsApp.

**Endpoint:**
```http
POST /chat/conversas/:id/criar-task
```

**Request:**
```json
{
  "titulo": "Follow-up João Silva",
  "descricao": "Cliente interessado em propriedades na praia",
  "dataVencimento": "2025-11-05",
  "prioridade": "alta",
  "tipo": "whatsapp"
}
```

**Implementação:**
```typescript
app.post('/chat/conversas/:id/criar-task', async (c) => {
  const { id } = c.req.param();
  const taskData = await c.req.json();
  const organizationId = c.get('organizationId');
  
  const conversa = await kv.get(`chat_conversa:${id}`);
  if (!conversa) {
    return c.json({ success: false, error: 'Conversa não encontrada' }, 404);
  }
  
  // Criar task no CRM
  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    organizationId,
    titulo: taskData.titulo,
    descricao: taskData.descricao,
    tipo: taskData.tipo || 'whatsapp',
    dataVencimento: taskData.dataVencimento,
    prioridade: taskData.prioridade || 'media',
    status: 'pendente',
    clienteId: conversa.contatoId,
    clienteNome: conversa.nomeContato,
    conversaId: id,
    criadaPor: 'manual',
    createdAt: new Date().toISOString()
  };
  
  await kv.set(`crm_task:${task.id}`, task);
  
  // Adicionar tag na conversa
  if (!conversa.tags) conversa.tags = [];
  if (!conversa.tags.includes('task_criada')) {
    conversa.tags.push('task_criada');
    await kv.set(`chat_conversa:${id}`, conversa);
  }
  
  return c.json({
    success: true,
    data: task
  });
});
```

---

## 📅 PLANO DE IMPLEMENTAÇÃO

### **SPRINT 1 (1 semana) - Templates Dinâmicos**

**Tasks:**
1. [ ] Implementar POST /chat/templates/:id/processar
2. [ ] Testar com variáveis reais de reservas
3. [ ] Atualizar frontend para usar endpoint

---

### **SPRINT 2 (1 semana) - Filtros e Busca**

**Tasks:**
1. [ ] Implementar filtros AND/OR de tags
2. [ ] Implementar índice invertido para busca
3. [ ] Migrar busca atual para usar índice
4. [ ] Testes de performance

---

### **SPRINT 3 (1 semana) - Estatísticas**

**Tasks:**
1. [ ] Implementar GET /chat/estatisticas
2. [ ] Criar componente de dashboard no frontend
3. [ ] Gráficos com Recharts

---

### **SPRINT 4 (1 semana) - Integração CRM**

**Tasks:**
1. [ ] Implementar POST /chat/conversas/:id/criar-task
2. [ ] Botão "Criar Tarefa" no frontend
3. [ ] Modal de criação rápida
4. [ ] Testes de integração

---

## 🧪 CENÁRIOS DE TESTE

### **Cenário 1: Template com Variáveis**

```bash
POST /chat/templates/template_001/processar
{
  "variaveis": {
    "nome": "João Silva",
    "propriedade": "Apt 501",
    "checkin": "15/12/2025"
  }
}

Template: "Olá {{nome}}, sua reserva em {{propriedade}} confirmada!"
Resultado: "Olá João Silva, sua reserva em Apt 501 confirmada!"
```

---

### **Cenário 2: Filtro AND de Tags**

```bash
GET /chat/conversas?tags=vip,urgente&operador=AND

Espera-se: Apenas conversas com AMBAS as tags
```

---

### **Cenário 3: Busca Full-Text**

```bash
GET /chat/buscar?termo=reserva+copacabana

Espera-se: Conversas que contêm "reserva" E "copacabana"
Tempo: < 100ms (mesmo com 10k mensagens)
```

---

**FIM DO DOCUMENTO** 🚀

**Status:** Gaps menores, fácil de implementar em 4 semanas
