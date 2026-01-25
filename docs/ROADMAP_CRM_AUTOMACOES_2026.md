# 🗺️ ROADMAP - CRM + TAREFAS + AUTOMAÇÕES INTELIGENTES

**Data:** 24 JAN 2026  
**Versão RENDIZY:** v1.0.103+  
**Autor:** Rafael (com análise do Copilot)  
**Status:** 📋 ANÁLISE/PLANEJAMENTO

---

## 📊 RESUMO EXECUTIVO

### Decisão Definitiva: n8n ❌ DESCARTADO

O n8n foi pesquisado e **rejeitado** devido à sua licença "Sustainable Use License" que:
- ❌ Proíbe embedding/white-labeling para uso comercial
- ❌ Não permite oferecer n8n como parte de um SaaS
- ❌ Restringe uso a "internal business purposes only"

### Solução Adotada: Componente Nativo React Flow

**Tecnologia escolhida:** [React Flow (@xyflow/react)](https://reactflow.dev/)
- ✅ Licença MIT (100% livre para uso comercial)
- ✅ 2.2M+ downloads semanais no npm
- ✅ Usado por Stripe, Typeform, Zapier
- ✅ Suporte a drag & drop, zoom, pan, mini-map
- ✅ Totalmente customizável

---

## 🎯 VISÃO GERAL DO OBJETIVO

> **"O módulo de automações deve ser um componente nativo do Rendizy, reutilizável em todas as telas, com possibilidade infinita de criar automações através de linguagem natural com IA"**

### Pilares da Implementação:

1. **Componente Universal de Automações** - Reutilizável em qualquer módulo
2. **Integração com Provedor de IA** - Linguagem natural → Automação
3. **Editor Visual de Workflows** - React Flow para construção visual
4. **Engine de Execução** - Backend para processar automações

---

## 📈 ESTADO ATUAL (JANEIRO 2026)

### ✅ O QUE JÁ EXISTE

#### 1. Provedor de IA (Card de Integração)
- **Componente:** `AIIntegration.tsx` (851 linhas)
- **Rota:** Settings > Integrações > Provedor de IA
- **Provedores suportados:**
  - OpenAI (ChatGPT) ✅
  - DeepSeek ✅
  - Anthropic (Claude) ✅
  - Google Gemini ✅
  - Groq ✅
  - Together AI ✅
  - Azure OpenAI ✅
  - HuggingFace ✅
  - Custom (qualquer provider) ✅

#### 2. Laboratório de Automações IA
- **Componente:** `AutomationsNaturalLanguageLab.tsx` (401 linhas)
- **Rota:** `/crm/automacoes-lab`
- **Funcionalidades:**
  - Formulário de entrada com linguagem natural
  - Seleção de módulo, canal, prioridade
  - Chamada à API `automationsApi.ai.interpretNaturalLanguage()`
  - Exibição do JSON gerado
  - Modal para salvar automação
  - Modo conversacional com histórico

#### 3. Backend de Interpretação IA
- **Arquivo:** `routes-automations-ai.ts` (436 linhas)
- **Endpoint:** `POST /automations/ai/interpret`
- **Funcionalidades:**
  - Prompt system para converter linguagem natural em JSON
  - Suporte a modo conversacional
  - Validação de JSON gerado
  - Tratamento de erros específicos (saldo, credenciais, etc.)

#### 4. CRUD de Automações
- **Arquivo:** `routes-automations.ts` (352 linhas)
- **Endpoints:**
  - `GET /automations` - Listar
  - `GET /automations/:id` - Buscar
  - `POST /automations` - Criar
  - `PUT /automations/:id` - Atualizar
  - `DELETE /automations/:id` - Deletar
  - `PATCH /automations/:id/status` - Ativar/Pausar

#### 5. Estrutura de Automação (JSON Schema)
```typescript
interface AutomationDefinition {
  name: string;
  description?: string;
  trigger: {
    type: string;          // 'new_reservation', 'checkin_date', etc.
    field?: string;
    operator?: string;
    value?: unknown;
    schedule?: string;     // Cron expression
    threshold?: number;
  };
  conditions?: Array<{
    field: string;
    operator: string;      // 'equals', 'contains', 'gt', 'lt'
    value: unknown;
  }>;
  actions: Array<{
    type: string;          // 'send_whatsapp', 'send_email', 'create_task'
    channel?: string;
    template?: string;
    payload?: Record<string, unknown>;
  }>;
  metadata?: {
    priority?: 'baixa' | 'media' | 'alta';
    requiresApproval?: boolean;
    notifyChannels?: string[];
  };
}
```

### ⚠️ O QUE FALTA

1. **Engine de Execução** - Não há processamento automático de automações
2. **Editor Visual** - Apenas texto/JSON, sem drag & drop
3. **Componente Reutilizável** - Não é modal/componente universal
4. **Triggers Reais** - Não há listeners em eventos do sistema
5. **Ações Efetivas** - Não executa WhatsApp/Email/Tarefas automaticamente

---

## 🚀 ROADMAP DE IMPLEMENTAÇÃO

### FASE 0: Estabilização (1-2 sprints)
> Concluir o que está pendente no CRM antes de evoluir automações

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 0.1 | Finalizar CRUD de Tarefas (backend real) | 🔴 Alta | ⏳ Pendente |
| 0.2 | Conectar TasksDashboard com API real | 🔴 Alta | ⏳ Pendente |
| 0.3 | Implementar drag & drop no Kanban existente | 🟡 Média | ⏳ Pendente |
| 0.4 | Finalizar timeline de atividades | 🟡 Média | ⏳ Pendente |

---

### FASE 1: Componente Universal de Automações (2 sprints)
> Transformar o Lab em componente reutilizável

#### 1.1 AutomationCreatorModal (Modal Universal)
- Extrair lógica do `AutomationsNaturalLanguageLab` para modal reutilizável
- Props: `onSave`, `initialModule`, `initialProperties`, `allowedActions`
- Pode ser invocado de qualquer tela

#### 1.2 AutomationTriggerButton (Botão Universal)
- Componente simples que abre o modal
- Props: `module`, `label`, `variant`
- Exemplo: `<AutomationTriggerButton module="reservas" label="Criar Automação" />`

#### 1.3 Integração em Módulos Existentes
| Módulo | Local de Integração | Gatilhos Disponíveis |
|--------|---------------------|---------------------|
| Reservas | Header da lista | Nova reserva, Check-in, Check-out, Cancelamento |
| Propriedades | Dropdown de ações | Novo bloqueio, Preço alterado |
| CRM | Sidebar + Cards | Nova tarefa, Lead qualificado, Pipeline movido |
| Chat | Header da conversa | Mensagem recebida, Primeiro contato |
| Financeiro | Dashboard | Pagamento recebido, Pagamento atrasado |

---

### FASE 2: Editor Visual com React Flow (3 sprints)
> Interface drag & drop para criação avançada

#### 2.1 Instalação e Setup
```bash
npm install @xyflow/react
```

#### 2.2 Componentes do Editor
| Componente | Descrição |
|------------|-----------|
| `WorkflowCanvas` | Container principal com React Flow |
| `TriggerNode` | Nó de gatilho (evento inicial) |
| `ConditionNode` | Nó de condição (if/else) |
| `ActionNode` | Nó de ação (WhatsApp, Email, Tarefa) |
| `DelayNode` | Nó de espera (aguardar X minutos/horas) |
| `BranchNode` | Nó de bifurcação (múltiplos caminhos) |

#### 2.3 Paleta de Nós
```
┌─────────────────────────────────────────────────────────────┐
│  GATILHOS           CONDIÇÕES         AÇÕES                 │
│  ──────────         ──────────        ──────                │
│  📥 Nova Reserva    🔀 Se/Então       📱 WhatsApp           │
│  🚪 Check-in       🔢 Comparar       📧 Email              │
│  🚶 Check-out      📅 Data           📝 Criar Tarefa       │
│  💬 Mensagem       🏷️ Tag            🏷️ Adicionar Tag     │
│  💰 Pagamento      👤 Cliente        🔔 Notificação        │
│  ⏰ Agendado       🏠 Propriedade    📊 Atualizar Campo    │
└─────────────────────────────────────────────────────────────┘
```

#### 2.4 Sincronização JSON ↔ Visual
- Converter JSON existente para nós visuais
- Gerar JSON a partir do diagrama visual
- Validação em tempo real

---

### FASE 3: Engine de Execução (3 sprints)
> Backend para processar automações em tempo real

#### 3.1 Arquitetura
```
┌─────────────────────────────────────────────────────────────┐
│                    RENDIZY SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Reservas] [Chat] [Financeiro] [CRM] [Propriedades]      │
│        │        │        │         │         │              │
│        └────────┴────────┴─────────┴─────────┘              │
│                         │                                   │
│                    EVENT BUS                                │
│                         │                                   │
│              ┌──────────┴──────────┐                       │
│              │  AUTOMATION ENGINE  │                       │
│              │  ─────────────────  │                       │
│              │  • Event Listener   │                       │
│              │  • Condition Eval   │                       │
│              │  • Action Executor  │                       │
│              │  • Retry Logic      │                       │
│              │  • Execution Log    │                       │
│              └─────────────────────┘                       │
│                         │                                   │
│         ┌───────────────┼───────────────┐                  │
│         ▼               ▼               ▼                  │
│    [WhatsApp]     [Email SMTP]    [Task Creator]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 Tabela de Execuções
```sql
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY,
  automation_id UUID REFERENCES automations(id),
  organization_id UUID NOT NULL,
  trigger_event JSONB NOT NULL,        -- Evento que disparou
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,         -- 'running', 'completed', 'failed', 'skipped'
  steps_executed JSONB[],              -- Array de passos executados
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.3 Event Listeners a Implementar
| Evento | Tabela/Trigger | Dados Disponíveis |
|--------|----------------|-------------------|
| `reservation.created` | `reservations` | reserva completa, hóspede, propriedade |
| `reservation.confirmed` | `reservations` | idem |
| `reservation.cancelled` | `reservations` | idem + motivo |
| `checkin.approaching` | Cron job | reservas com checkin em X dias |
| `checkout.approaching` | Cron job | reservas com checkout em X dias |
| `message.received` | `chat_messages` | mensagem, conversa, contato |
| `payment.received` | `transactions` | transação, reserva |
| `task.created` | `crm_tasks` | tarefa, responsável |
| `lead.qualified` | `crm_oportunidades` | oportunidade, cliente |

---

### FASE 4: IA Avançada para Automações (2 sprints)
> Melhorar interpretação e sugestões

#### 4.1 Assistente de Criação
- IA sugere automações baseadas no uso do sistema
- "Percebi que você sempre envia mensagem após confirmar reserva. Criar automação?"

#### 4.2 Otimização de Automações
- IA analisa execuções e sugere melhorias
- "Esta automação tem 30% de falha. Quer que eu analise?"

#### 4.3 Templates Inteligentes
- Biblioteca de templates pré-configurados
- IA adapta templates ao contexto da organização

---

## 📅 CRONOGRAMA PROPOSTO

```
JAN 2026  FEV 2026  MAR 2026  ABR 2026  MAI 2026  JUN 2026
   │         │         │         │         │         │
   ├─────────┤         │         │         │         │
   │ FASE 0  │         │         │         │         │
   │Estabiliz│         │         │         │         │
   │         ├─────────┤         │         │         │
   │         │ FASE 1  │         │         │         │
   │         │Componnt │         │         │         │
   │         │Universal│         │         │         │
   │         │         ├─────────┴─────────┤         │
   │         │         │     FASE 2        │         │
   │         │         │  Editor Visual    │         │
   │         │         │   React Flow      │         │
   │         │         │         ├─────────┴─────────┤
   │         │         │         │     FASE 3        │
   │         │         │         │ Engine Execução   │
   │         │         │         │                   │
   │         │         │         │         ├─────────┤
   │         │         │         │         │ FASE 4  │
   │         │         │         │         │IA Avanç │
```

---

## 🎯 MÉTRICAS DE SUCESSO

### KPIs Técnicos
- [ ] Tempo de criação de automação < 2 minutos (via linguagem natural)
- [ ] Taxa de sucesso de execução > 95%
- [ ] Latência de trigger → execução < 5 segundos

### KPIs de Negócio
- [ ] 80% dos usuários com pelo menos 1 automação ativa
- [ ] Redução de 50% em tarefas manuais repetitivas
- [ ] NPS do módulo de automações > 8

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Complexidade do editor visual | Alta | Alto | Começar simples, iterar |
| Performance da engine | Média | Alto | Fila de processamento, rate limiting |
| Custo de IA | Média | Médio | Cache de respostas, limites por org |
| Falhas em ações externas | Alta | Médio | Retry com backoff, logs detalhados |

---

## 📋 PRÓXIMOS PASSOS IMEDIATOS

1. **Validar este roadmap** com stakeholders
2. **Priorizar** Fase 0 ou Fase 1 primeiro
3. **Definir** equipe e recursos
4. **Criar issues** no GitHub para tracking

---

## 🔗 REFERÊNCIAS

- [React Flow Documentation](https://reactflow.dev/docs/)
- [React Flow Examples](https://reactflow.dev/examples/)
- [HANDOFF_BACKEND_CRM_CODEX.md](./HANDOFF_BACKEND_CRM_CODEX.md)
- [AutomationsNaturalLanguageLab.tsx](../components/automations/AutomationsNaturalLanguageLab.tsx)
- [routes-automations-ai.ts](../supabase/functions/rendizy-server/routes-automations-ai.ts)

---

**Documento gerado em:** 24 JAN 2026  
**Revisão necessária:** Antes de iniciar qualquer implementação
