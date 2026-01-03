# Funcionalidades Detalhadas - Funil de Serviços
## Parte 2: Tickets e Criação

---

## 🎫 4. CRIAÇÃO DE TICKETS

### 4.1. Modal de Criação
**Onde aparece:** Ao clicar em "Novo Ticket"
**Elementos visuais:**
- Modal com título "Criar Novo Ticket"
- Campos:
  - Título (obrigatório)
  - Descrição (opcional, textarea)
  - Prioridade (select: low/medium/high/urgent)
  - Responsável (select com busca)
  - Data de vencimento (date picker)
- Seção "Criar a partir de modelo"
- Seção "Relacionamentos"
- Botões: Cancelar, Criar

**Comportamento:**
- Validação de campos obrigatórios
- Ao selecionar template, preenche campos automaticamente
- Salva via API ao clicar em "Criar"

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Criar Novo Ticket                  │
├─────────────────────────────────────┤
│ Título *: [                    ]    │
│ Descrição: [                   ]    │
│            [                   ]    │
│ Prioridade: [high ▼]               │
│ Responsável: [João Silva ▼]        │
│ Vencimento: [📅 30/11/2025]         │
│                                      │
│ Criar a partir de modelo:           │
│ [Selecione um modelo... ▼]          │
│                                      │
│ Relacionamentos:                    │
│ Pessoas: [Adicionar pessoas...]     │
│ Imóveis: [Adicionar imóveis...]     │
│ Automações: [Adicionar...]          │
│                                      │
│ [Cancelar] [Criar]                  │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Abrir modal ao clicar "Novo Ticket" ✅ **VERIFICADO: Modal abre corretamente**
- ✅ Campo título (obrigatório, validação) ✅ **VERIFICADO: Campo "Título *" aparece**
- ✅ Campo descrição (opcional, textarea) ✅ **VERIFICADO: Campo "Descrição" aparece**
- ✅ Select de prioridade (low/medium/high/urgent) ✅ **VERIFICADO: Select "Prioridade" aparece com "Média" selecionado**
- ✅ Select de responsável com busca ⚠️ **VERIFICAR: Não visível no snapshot atual**
- ✅ Date picker para vencimento ⚠️ **VERIFICAR: Não visível no snapshot atual**
- ✅ Seletor de template ✅ **VERIFICADO: "Criar a partir de modelo" aparece com "Criar do zero" selecionado**
- ✅ Carregar templates da API ⚠️ **PRECISA TESTAR: Selecionar template**
- ✅ Separar templates globais dos da organização ⚠️ **PRECISA TESTAR: Abrir dropdown de templates**
- ✅ Preencher campos ao selecionar template ⚠️ **PRECISA TESTAR: Selecionar template**
- ✅ Seletor de pessoas (PersonSelector) ⚠️ **VERIFICAR: Não visível no snapshot atual**
- ✅ Seletor de imóveis (PropertySelector) ⚠️ **VERIFICAR: Não visível no snapshot atual**
- ✅ Seletor de automações (AutomationSelector) ✅ **VERIFICADO: Seção "Automações" aparece com botão "Selecione automação(ões)..."**
- ✅ Validação de campos obrigatórios ⚠️ **PRECISA TESTAR: Tentar criar sem título**
- ✅ Botão criar desabilitado se inválido ⚠️ **PRECISA TESTAR: Tentar criar sem título**
- ✅ Salvar via API (`servicesTicketsApi.create()`) ⚠️ **PRECISA TESTAR: Criar ticket**
- ✅ Fechar modal após criar ⚠️ **PRECISA TESTAR: Criar ticket**
- ✅ Atualizar lista de tickets ⚠️ **PRECISA TESTAR: Criar ticket**
- ✅ Toast de sucesso/erro ⚠️ **PRECISA TESTAR: Criar ticket**

**STATUS VISUAL:**
- ✅ Modal "Criar Novo Ticket" abre corretamente
- ✅ Campos visíveis: Título *, Descrição, Prioridade, Automações
- ✅ Botões: Cancelar, Criar Ticket
- ⚠️ Responsável, Vencimento, Pessoas, Imóveis não visíveis (podem estar mais abaixo, precisa scroll)

---

### 4.2. Seleção de Template
**Onde aparece:** Dentro do modal de criação, seção "Criar a partir de modelo"
**Elementos visuais:**
- Select/Dropdown com lista de templates
- Opção "Criar do zero"
- Separador visual entre templates globais e da organização
- Badge "Global" para templates globais
- Descrição do template (se houver)

**Comportamento:**
- Ao selecionar template, preenche:
  - Tarefas do template
  - Estrutura do funil
  - Configurações padrão
- Templates globais aparecem primeiro

**O que deve aparecer na tela:**
```
Criar a partir de modelo:
[Selecione um modelo... ▼]
  ├─ Criar do zero
  ├─ ─── Modelos Globais ───
  ├─ [🌐 Global] Modelo Implantação
  ├─ [🌐 Global] Modelo Suporte
  ├─ ─── Meus Modelos ───
  ├─ Modelo Check-in
  └─ Modelo Manutenção
```

**Micro-funcionalidades:**
- ✅ Carregar templates da API (`ticketTemplatesApi.list()`)
- ✅ Separar templates globais (`isGlobalDefault: true`)
- ✅ Exibir templates globais primeiro
- ✅ Badge "Global" para templates globais
- ✅ Separador visual entre seções
- ✅ Opção "Criar do zero"
- ✅ Mostrar descrição do template
- ✅ Ao selecionar, preencher tarefas
- ✅ Ao selecionar, copiar estrutura do funil
- ✅ Resetar seleção ao fechar modal

---

### 4.3. Relacionamentos na Criação
**Onde aparece:** Seção "Relacionamentos" no modal de criação
**Elementos visuais:**
- "Pessoas relacionadas" com botão "Adicionar pessoas"
- "Imóveis relacionados" com botão "Adicionar imóveis"
- "Automações relacionadas" com botão "Adicionar automações"
- Lista de itens selecionados (chips/badges)

**Comportamento:**
- Ao clicar em "Adicionar", abre seletor multi-select
- Permite selecionar múltiplos itens
- Mostra itens selecionados como chips
- Permite remover itens selecionados

**O que deve aparecer na tela:**
```
Relacionamentos:
Pessoas: [Adicionar pessoas...]
         [👤 João Silva ✕] [👥 Maria Santos ✕]

Imóveis: [Adicionar imóveis...]
         [🏠 Apartamento 201 ✕]

Automações: [Adicionar automações...]
```

**Micro-funcionalidades:**
- ✅ PersonSelector com busca
- ✅ PropertySelector com busca
- ✅ AutomationSelector com busca
- ✅ Multi-select (múltiplos itens)
- ✅ Busca em tempo real
- ✅ Mostrar itens selecionados como chips
- ✅ Botão X para remover item
- ✅ Salvar relacionamentos no ticket
- ✅ Carregar dados reais da API (usersApi, guestsApi, propertiesApi, automationsApi)

---

### 4.4. Preenchimento Automático do Chat
**Onde acontece:** Ao criar ticket a partir do chat
**Comportamento:**
- Se ticket criado a partir do chat, preenche automaticamente:
  - Contato da conversa
  - Imóvel (se mencionado)
  - Reserva (se mencionado)
  - Hóspede (se mencionado)

**Micro-funcionalidades:**
- ✅ Receber props de preenchimento (`prefillContactId`, etc.)
- ✅ Preencher campos automaticamente
- ✅ Selecionar pessoas relacionadas
- ✅ Selecionar imóveis relacionados
- ✅ Mostrar dados pré-preenchidos no modal

---

## 📝 5. DETALHES DO TICKET

### 5.1. Visualização Split-View
**Onde aparece:** Ao clicar em um ticket
**Elementos visuais:**
- Painel esquerdo: Detalhes do ticket + Tarefas
- Painel direito: Chat IA
- Botão X para fechar
- Header com título do ticket

**Comportamento:**
- Split 50/50 (ou 60/40)
- Scroll independente em cada painel
- Responsivo (mobile: empilhado)

**O que deve aparecer na tela:**
```
┌──────────────────────┬──────────────────────┐
│ Detalhes do Ticket   │ Chat IA              │
│                      │                      │
│ [Conteúdo...]        │ [Chat...]            │
│                      │                      │
└──────────────────────┴──────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Layout split-view (grid 2 colunas)
- ✅ Painel esquerdo: ServicesTicketDetailLeft
- ✅ Painel direito: ServicesTicketDetailRight
- ✅ Scroll independente
- ✅ Botão fechar (X) no header
- ✅ Responsivo (mobile: coluna única)
- ✅ Fechar ao clicar fora (opcional)

---

### 5.2. Header do Ticket
**Onde aparece:** Topo do painel esquerdo, dentro dos detalhes
**Elementos visuais:**
- Título do ticket (text-2xl, bold)
- Botão "Salvar como Modelo" (outline, small)
- Badges: Status e Prioridade
- **Valor Total dos Produtos** (se houver produtos e não estiver oculto)

**Comportamento:**
- Título editável (se implementado)
- Badges com cores específicas
- Valor total calculado automaticamente

**O que deve aparecer na tela:**
```
Implantação teste                    [Salvar como Modelo]
[Pendente] [high]

Products
R$ 12.000,00
```

**Micro-funcionalidades:**
- ✅ Mostrar título do ticket
- ✅ Botão "Salvar como Modelo" (ícone Save)
- ✅ Badge de status com cor
- ✅ Badge de prioridade
- ✅ **Valor total dos produtos** (se `products.length > 0` e `hideProducts !== true`)
- ✅ Formatação de moeda (BRL/USD/EUR)
- ✅ Cálculo automático: `products.reduce((total, p) => total + p.price * p.quantity, 0)`
- ✅ Condição: `ticket.products && ticket.products.length > 0 && (ticket.hideProducts !== true)`

---

### 5.3. Seletor de Status
**Onde aparece:** Abaixo do header, dentro de um Card
**Elementos visuais:**
- Card com título "Status"
- Select/Dropdown com statuses disponíveis
- Statuses baseados em `funnel.statusConfig`

**Comportamento:**
- Ao mudar status, atualiza ticket
- Salva via API
- Feedback visual (toast)

**O que deve aparecer na tela:**
```
┌──────────────────────┐
│ Status               │
│ [Pendente ▼]         │
└──────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Card com título "Status"
- ✅ Select com statuses do funil
- ✅ Statuses: Resolvido, Não Resolvido, Em Análise, Pendente, Cancelado
- ✅ Status customizados (se configurados)
- ✅ Ao mudar, atualizar `ticket.status`
- ✅ Salvar via API
- ✅ Toast de sucesso
- ✅ Atualizar badge no header

---

### 5.4. Abas (Tabs)
**Onde aparece:** Abaixo do seletor de status
**Elementos visuais:**
- Tabs: "Tarefas", "Detalhes", "Atividade"
- Conteúdo da aba ativa abaixo
- Indicador visual da aba ativa

**Comportamento:**
- Trocar de aba mostra conteúdo diferente
- Estado da aba ativa persiste durante sessão

**O que deve aparecer na tela:**
```
[Tarefas] [Detalhes] [Atividade]
─────────────────────────────────
[Conteúdo da aba ativa...]
```

**Micro-funcionalidades:**
- ✅ Tab "Tarefas" (padrão)
- ✅ Tab "Detalhes"
- ✅ Tab "Atividade"
- ✅ Trocar de aba ao clicar
- ✅ Indicador visual da aba ativa
- ✅ Renderizar conteúdo da aba ativa
- ✅ Manter estado da aba durante sessão

---

## 📋 6. ABA TAREFAS

### 6.1. Informações de Progresso
**Onde aparece:** Topo da aba "Tarefas"
**Elementos visuais:**
- "Progresso da Etapa: X%"
- "X de Y tarefas completas"
- Barra de progresso visual (opcional)

**Comportamento:**
- Calculado automaticamente baseado em tarefas completas
- Atualiza em tempo real

**O que deve aparecer na tela:**
```
Progresso da Etapa: 0%
0 de 0 tarefas completas
[░░░░░░░░░░] 0%
```

**Micro-funcionalidades:**
- ✅ Calcular progresso: `(tarefasCompletas / totalTarefas) * 100`
- ✅ Filtrar tarefas da etapa atual (`filterTasksByStage`)
- ✅ Contar tarefas completas (`status === 'COMPLETED'`)
- ✅ Mostrar texto "X de Y tarefas completas"
- ✅ Barra de progresso visual (opcional)
- ✅ Atualizar automaticamente ao completar tarefa

---

### 6.2. Lista de Tarefas
**Onde aparece:** Aba "Tarefas", abaixo do progresso
**Elementos visuais:**
- Lista de tarefas da etapa atual
- Cada tarefa mostra:
  - Checkbox (círculo ou check)
  - Título
  - Tipo (badge: STANDARD/FORM/ATTACHMENT)
  - Responsável (avatar + nome)
  - Data de vencimento
  - Subtarefas (se houver)
- Botão "Adicionar Tarefa"
- Estado vazio: "Nenhuma tarefa nesta etapa..."

**Comportamento:**
- Drag & drop para reordenar
- Clicar na tarefa expande detalhes
- Checkbox completa tarefa

**O que deve aparecer na tela:**
```
[○] Verificar logs (STANDARD) 👤 João Silva 📅 30/11
    [○] Sub-tarefa 1
    [✓] Sub-tarefa 2

[○] Cliente responde formulário (FORM) 👤 Maria
    [Link para formulário]

[Adicionar Tarefa]
```

**Micro-funcionalidades:**
- ✅ Filtrar tarefas da etapa atual (`ticket.stageId`)
- ✅ Renderizar lista de tarefas
- ✅ Checkbox para completar tarefa
- ✅ Badge de tipo (STANDARD/FORM/ATTACHMENT)
- ✅ Avatar e nome do responsável
- ✅ Data de vencimento formatada
- ✅ Lista de subtarefas (se houver)
- ✅ Drag & drop para reordenar
- ✅ Expandir/colapsar detalhes da tarefa
- ✅ Estado vazio com mensagem
- ✅ Botão "Adicionar Tarefa"

---

### 6.3. Adicionar Tarefa
**Onde aparece:** Botão "Adicionar Tarefa" na aba Tarefas
**Elementos visuais:**
- Formulário inline ou modal:
  - Título (obrigatório)
  - Tipo (STANDARD/FORM/ATTACHMENT)
  - Responsável (select com busca)
  - Data de vencimento (date picker)
- Botões: Cancelar, Adicionar

**Comportamento:**
- Validação de título obrigatório
- Tarefa criada vinculada à etapa atual (`ticket.stageId`)
- Salva no ticket

**O que deve aparecer na tela:**
```
[Adicionar Tarefa] (clica)

Título: [                    ]
Tipo: [STANDARD ▼]
Responsável: [João Silva ▼]
Vencimento: [📅 30/11/2025]

[Cancelar] [Adicionar]
```

**Micro-funcionalidades:**
- ✅ Abrir formulário ao clicar "Adicionar Tarefa"
- ✅ Campo título (obrigatório)
- ✅ Select de tipo (STANDARD/FORM/ATTACHMENT)
- ✅ AssigneeSelector para responsável
- ✅ TaskDatePicker para vencimento
- ✅ Validação de campos
- ✅ Criar tarefa com `stageId: ticket.stageId`
- ✅ Adicionar à lista de tarefas
- ✅ Atualizar progresso automaticamente
- ✅ Salvar via API (se implementado)
- ✅ Toast de sucesso

---

### 6.4. Tipos de Tarefa
**Onde aparece:** Na lista de tarefas e ao criar
**Tipos disponíveis:**
- **STANDARD**: Tarefa normal
- **FORM**: Tarefa de formulário
- **ATTACHMENT**: Tarefa de anexo

**Comportamento:**
- Cada tipo tem comportamento específico
- FORM: Mostra link para formulário
- ATTACHMENT: Mostra área de upload

**Micro-funcionalidades:**
- ✅ Tipo STANDARD: Checkbox simples
- ✅ Tipo FORM: Mostrar FormTaskViewer com link
- ✅ Tipo ATTACHMENT: Mostrar FileUpload
- ✅ Badge visual indicando tipo
- ✅ Comportamento específico por tipo

---

### 6.5. Subtarefas
**Onde aparece:** Dentro de cada tarefa, expandida
**Elementos visuais:**
- Lista de subtarefas indentadas
- Cada subtarefa tem checkbox
- Botão "+ Adicionar subtarefa"

**Comportamento:**
- Subtarefas completas contam para progresso
- Drag & drop para reordenar

**O que deve aparecer na tela:**
```
[○] Tarefa Principal
    [○] Sub-tarefa 1
    [✓] Sub-tarefa 2
    [+ Adicionar subtarefa]
```

**Micro-funcionalidades:**
- ✅ Lista de subtarefas indentadas
- ✅ Checkbox para cada subtarefa
- ✅ Completar subtarefa atualiza progresso
- ✅ Adicionar nova subtarefa
- ✅ Editar subtarefa
- ✅ Excluir subtarefa
- ✅ Reordenar subtarefas (drag & drop)

---

---

## 📊 RESUMO DA VERIFICAÇÃO - PARTE 2

### ✅ VERIFICADO E FUNCIONANDO

1. **Modal de Criação de Ticket**
   - ✅ Modal abre ao clicar "Novo Ticket"
   - ✅ Título "Criar Novo Ticket" aparece
   - ✅ Campo "Título *" aparece (obrigatório)
   - ✅ Campo "Descrição" aparece (textarea)
   - ✅ Select "Prioridade" aparece com "Média" selecionado
   - ✅ Seção "Criar a partir de modelo" aparece
   - ✅ Seletor de templates aparece com "Criar do zero" selecionado
   - ✅ Seção "Automações" aparece com botão "Selecione automação(ões)..."
   - ✅ Botões "Cancelar" e "Criar Ticket" aparecem

### ⚠️ PRECISA TESTAR/VERIFICAR

1. **Campos não visíveis no snapshot**
   - ⚠️ Responsável (select com busca)
   - ⚠️ Data de vencimento (date picker)
   - ⚠️ Seletor de pessoas (PersonSelector)
   - ⚠️ Seletor de imóveis (PropertySelector)
   - ⚠️ Podem estar mais abaixo, precisa scroll

2. **Funcionalidades de Template**
   - ⚠️ Carregar templates da API
   - ⚠️ Separar templates globais dos da organização
   - ⚠️ Badge "Global" para templates globais
   - ⚠️ Preencher campos ao selecionar template

3. **Validação e Criação**
   - ⚠️ Validação de campos obrigatórios
   - ⚠️ Botão criar desabilitado se inválido
   - ⚠️ Salvar via API
   - ⚠️ Fechar modal após criar
   - ⚠️ Atualizar lista de tickets
   - ⚠️ Toast de sucesso/erro

4. **Detalhes do Ticket**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Visualização split-view
   - ⚠️ Header do ticket com valor total de produtos
   - ⚠️ Seletor de status
   - ⚠️ Abas (Tarefas, Detalhes, Atividade)
   - ⚠️ Lista de tarefas
   - ⚠️ Adicionar tarefa
   - ⚠️ Tipos de tarefa (STANDARD/FORM/ATTACHMENT)
   - ⚠️ Subtarefas

### 🔍 PRÓXIMAS AÇÕES

1. Fazer scroll no modal de criação para ver todos os campos
2. Testar seleção de template
3. Testar criação de ticket
4. Resolver problema de abrir ticket (card não abre ao clicar)
5. Verificar detalhes do ticket quando conseguir abrir

---

**FIM DA PARTE 2**

