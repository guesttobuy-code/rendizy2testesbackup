# Funcionalidades Detalhadas - Funil de Serviços
## Parte 1: Estrutura e Funis

---

## 📋 1. ESTRUTURA BÁSICA DO FUNIL

### 1.1. Seleção de Funil
**Onde aparece:** Topo da tela, acima do Kanban/Lista
**Elementos visuais:**
- Label: "Funil:"
- Select/Dropdown com lista de funis disponíveis
- Badge "Global" (ícone Globe) ao lado de funis globais
- Ícone de dropdown (seta para baixo)

**Comportamento:**
- Ao carregar: Mostra funil salvo no localStorage ou primeiro disponível
- Ao selecionar: Carrega tickets do funil selecionado
- Persiste seleção no localStorage (`rendizy_selected_services_funnel`)
- Separa visualmente funis globais dos da organização

**O que deve aparecer na tela:**
```
[Funil: ▼] [Funil de Serviços - Gestão de tickets...]
```

**Micro-funcionalidades:**
- ✅ Carregar funis da API (`funnelsApi.list()`) ✅ **VERIFICADO: Funciona**
- ✅ Separar funis globais (`isGlobalDefault: true`) dos da organização ✅ **VERIFICADO: Funciona**
- ✅ Exibir funis globais primeiro na lista ⚠️ **VERIFICAR: Precisa testar se há funis globais**
- ✅ Badge "Global" para funis globais ⚠️ **VERIFICAR: Precisa testar se há funis globais**
- ✅ Fallback: Criar funil padrão se não houver nenhum ✅ **VERIFICADO: Funil padrão aparece**
- ✅ Persistir seleção no localStorage ✅ **VERIFICADO: Funciona**
- ✅ Recarregar tickets ao trocar funil ✅ **VERIFICADO: Funciona**

**STATUS VISUAL:**
- ✅ Label "Funil:" aparece no topo
- ✅ Select/Dropdown aparece com funil selecionado: "Funil de Serviço Gestão de ticket e resolução de problema"
- ⚠️ Badge "Global" não visível (pode não haver funis globais ou não estar implementado)

---

### 1.2. Criação e Edição de Funis
**Onde aparece:** Modal "Editar Funis" (botão "Editar Funil" no menu lateral)
**Elementos visuais:**
- Modal com título "Gerenciar Funis"
- Lista de funis existentes
- Botão "+ Novo Funil"
- Para cada funil:
  - Nome do funil
  - Badge "Global" se for global
  - Botão "Editar"
  - Botão "Excluir" (desabilitado se for global e usuário não for super_admin)

**Comportamento:**
- Super Admin pode criar funis globais
- Usuários normais só podem criar funis da organização
- Funis globais não podem ser editados/excluídos por usuários normais

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Gerenciar Funis                     │
├─────────────────────────────────────┤
│ [🌐] Funil de Serviços (Global)     │
│      [Editar] [Excluir ❌]          │
│                                      │
│ Funil Implantação                    │
│      [Editar] [Excluir]              │
│                                      │
│ [+ Novo Funil]                      │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Listar todos os funis (globais + organização) ✅ **VERIFICADO: Modal "Gerenciar Funis" aparece**
- ✅ Indicar visualmente funis globais ⚠️ **VERIFICAR: Badge "Global" não visível no snapshot**
- ✅ Permitir criar novo funil ✅ **VERIFICADO: Botão "Novo Funil" aparece**
- ✅ Permitir editar funil (exceto globais para não-admin) ✅ **VERIFICADO: Botões "Editar funil" aparecem**
- ✅ Permitir excluir funil (exceto globais para não-admin) ⚠️ **VERIFICAR: Botão excluir não visível no snapshot**
- ✅ Validar permissões (super_admin para globais) ⚠️ **PRECISA TESTAR: Criar funil global**
- ✅ Salvar via API (`funnelsApi.create/update/delete`) ⚠️ **PRECISA TESTAR: Criar/editar funil**

**STATUS VISUAL:**
- ✅ Modal "Gerenciar Funis" abre ao clicar "Editar Funil"
- ✅ Tabs: "Meu Funil" e "Criar/Editar"
- ✅ Botão "Novo Funil" aparece
- ✅ Lista de funis com botões "Editar funil"
- ⚠️ Badge "Global" não visível (pode não haver funis globais ou não estar implementado)

---

### 1.3. Configuração de Etapas (Stages)
**Onde aparece:** Dentro do modal "Editar Funis", ao editar um funil
**Elementos visuais:**
- Lista de etapas com drag handle (GripVertical)
- Para cada etapa:
  - Ícone de arrastar (GripVertical)
  - Campo de nome
  - Seletor de cor
  - Botão "Excluir"
- Botão "+ Adicionar Etapa"
- Campos de configuração de status:
  - Status Resolvido
  - Status Não Resolvido
  - Status Em Análise
  - Statuses customizados (lista)

**Comportamento:**
- Drag & drop para reordenar etapas
- Cada etapa tem cor única
- Ordem das etapas define o fluxo do funil

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Editar Funil                        │
├─────────────────────────────────────┤
│ Nome: [Funil de Serviços        ]   │
│                                      │
│ Etapas:                              │
│ [☰] [Triagem        ] [🔵] [X]     │
│ [☰] [Em Análise     ] [🟠] [X]     │
│ [☰] [Em Resolução   ] [🟣] [X]     │
│ [+ Adicionar Etapa]                 │
│                                      │
│ Status Resolvido: [Resolvido    ▼] │
│ Status Não Resolvido: [Não...  ▼]  │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Adicionar etapa
- ✅ Editar nome da etapa
- ✅ Selecionar cor da etapa
- ✅ Reordenar etapas (drag & drop)
- ✅ Excluir etapa
- ✅ Configurar status padrão (Resolvido, Não Resolvido, Em Análise)
- ✅ Adicionar statuses customizados
- ✅ Validar que há pelo menos uma etapa
- ✅ Validar nomes únicos de etapas

---

### 1.4. Funis Globais (Default Global)
**Onde aparece:** Em todos os lugares onde funis são listados
**Elementos visuais:**
- Badge "Global" com ícone Globe (🌐)
- Texto explicativo no modal de criação/edição
- Checkbox "Default Global" (apenas para super_admin)
- Campo de observação "Observação Global"

**Comportamento:**
- Apenas super_admin pode criar/editar funis globais
- Funis globais aparecem para todas as organizações
- Alterações em funis globais afetam todos os clientes
- Usuários normais não podem editar/excluir funis globais

**O que deve aparecer na tela:**
```
[🌐 Global] Funil de Serviços - Gestão de tickets...

No modal de edição (apenas super_admin):
┌─────────────────────────────────────┐
│ ☑ Default Global                    │
│    Este funil será aplicado como    │
│    padrão para todas as organizações│
│                                      │
│ Observação Global:                   │
│ [                                    │
│ ]                                    │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Verificar se usuário é super_admin (`isSuperAdmin`)
- ✅ Mostrar checkbox apenas para super_admin
- ✅ Validar que apenas super_admin pode criar globais
- ✅ Impedir edição/exclusão de globais por não-admin
- ✅ Exibir badge "Global" em todos os lugares
- ✅ Salvar `isGlobalDefault: true` e `globalDefaultNote`
- ✅ Filtrar e separar funis globais na listagem

---

## 📊 2. VISUALIZAÇÃO DE TICKETS

### 2.1. Modo Kanban
**Onde aparece:** Área principal, quando `viewMode === 'kanban'`
**Elementos visuais:**
- Colunas horizontais (uma por etapa do funil)
- Cada coluna tem:
  - Header com nome da etapa
  - Contador de tickets na coluna
  - Cor de fundo (cor da etapa)
- Cards de tickets dentro de cada coluna
- Botão "+ Novo Ticket" no topo

**Comportamento:**
- Drag & drop de cards entre colunas (muda etapa)
- Cards mostram informações resumidas
- Ao clicar no card, abre detalhes

**O que deve aparecer na tela:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ Triagem  │ Em Análise│ Resolvido│ Não...  │
│ (2)      │ (1)       │ (0)      │ (0)     │
├──────────┼──────────┼──────────┼──────────┤
│ [Card 1] │ [Card 2]  │          │          │
│ [Card 3] │          │          │          │
└──────────┴──────────┴──────────┴──────────┘
```

**Micro-funcionalidades:**
- ✅ Renderizar colunas para cada etapa do funil ✅ **VERIFICADO: Colunas aparecem**
- ✅ Mostrar contador de tickets por coluna ⚠️ **VERIFICAR: Contador não visível no snapshot**
- ✅ Aplicar cor da etapa no header da coluna ⚠️ **VERIFICAR: Cores não visíveis no snapshot**
- ✅ Renderizar cards de tickets dentro das colunas ✅ **VERIFICADO: Cards aparecem nas colunas**
- ✅ Drag & drop entre colunas ⚠️ **PRECISA TESTAR: Arrastar card**
- ✅ Atualizar `stageId` do ticket ao soltar ⚠️ **PRECISA TESTAR: Arrastar card**
- ✅ Salvar mudança de etapa via API ⚠️ **PRECISA TESTAR: Arrastar card**
- ✅ Feedback visual durante drag ⚠️ **PRECISA TESTAR: Arrastar card**
- ✅ Scroll horizontal se muitas colunas ✅ **VERIFICADO: Scroll funciona**

**STATUS VISUAL:**
- ✅ Colunas do Kanban aparecem (Triagem, Em Análise, etc.)
- ✅ Cards de tickets aparecem dentro das colunas
- ✅ 3 tickets visíveis: "Implantação teste", "Problema com Check-in", "Manutenção - Ar condicionado"

---

### 2.2. Modo Lista
**Onde aparece:** Área principal, quando `viewMode === 'list'`
**Elementos visuais:**
- Tabela com colunas:
  - Título
  - Status
  - Prioridade
  - Etapa
  - Responsável
  - Progresso
  - Data
- Linhas clicáveis (cada ticket)
- Botão toggle Kanban/Lista no topo

**Comportamento:**
- Clicar na linha abre detalhes
- Ordenação por colunas (se implementado)
- Filtros (se implementado)

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────────────────────────┐
│ Título          │ Status │ Prioridade │ Etapa │ ...     │
├─────────────────────────────────────────────────────────┤
│ Implantação...  │ Pendente│ High      │ Triagem│ ...    │
│ Problema...     │ Em Análise│ High   │ Em Análise│ ... │
└─────────────────────────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Renderizar tabela com colunas ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Mostrar dados do ticket em cada linha ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Badge de status com cor ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Badge de prioridade ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Nome da etapa ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Avatar/nome do responsável ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Barra de progresso ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Data formatada ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Clicar na linha abre detalhes ⚠️ **PRECISA TESTAR: Selecionar modo Lista**
- ✅ Toggle entre Kanban/Lista ✅ **VERIFICADO: Dropdown aparece com opções Kanban e Lista**

**STATUS VISUAL:**
- ✅ Toggle aparece no topo com dropdown
- ✅ Opções: "Kanban" e "Lista"

---

### 2.3. Busca de Tickets
**Onde aparece:** Topo da tela, ao lado do seletor de funil
**Elementos visuais:**
- Campo de input com ícone de busca (Search)
- Placeholder: "Buscar tickets..."
- Filtro em tempo real

**Comportamento:**
- Busca em tempo real (onChange)
- Filtra por título, descrição, tags
- Atualiza lista/kanban conforme digita

**O que deve aparecer na tela:**
```
[🔍 Buscar tickets...]
```

**Micro-funcionalidades:**
- ✅ Input de busca com ícone ✅ **VERIFICADO: Campo "Buscar tickets..." aparece**
- ✅ Busca em tempo real ⚠️ **PRECISA TESTAR: Digitar no campo**
- ✅ Filtrar por título ⚠️ **PRECISA TESTAR: Digitar no campo**
- ✅ Filtrar por descrição ⚠️ **PRECISA TESTAR: Digitar no campo**
- ✅ Filtrar por tags ⚠️ **PRECISA TESTAR: Digitar no campo**
- ✅ Case-insensitive ⚠️ **PRECISA TESTAR: Digitar no campo**
- ✅ Limpar busca (X quando há texto) ⚠️ **PRECISA TESTAR: Digitar no campo**
- ✅ Atualizar visualização (Kanban/Lista) ⚠️ **PRECISA TESTAR: Digitar no campo**

**STATUS VISUAL:**
- ✅ Campo de busca aparece no topo com ícone de lupa
- ✅ Placeholder: "Buscar tickets..."

---

### 2.4. Card de Ticket no Kanban
**Onde aparece:** Dentro das colunas do Kanban
**Elementos visuais:**
- Título do ticket (negrito)
- Badge de prioridade (low/medium/high/urgent)
- Badge de status
- Avatar e nome do responsável
- Contador de tarefas (ex: "0 / 2 tarefas")
- Barra de progresso (opcional)

**Comportamento:**
- Clicar no card abre detalhes
- Drag & drop para mover entre colunas
- Hover mostra mais informações

**O que deve aparecer na tela:**
```
┌─────────────────────────────┐
│ Implantação teste           │
│ [Pendente] [high]           │
│ 👤 João Silva               │
│ 0 / 2 tarefas               │
└─────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Mostrar título do ticket ✅ **VERIFICADO: Títulos aparecem nos cards**
- ✅ Badge de status com cor ⚠️ **VERIFICAR: Badges não visíveis claramente no snapshot**
- ✅ Badge de prioridade ⚠️ **VERIFICAR: Badges não visíveis claramente no snapshot**
- ✅ Avatar do responsável ⚠️ **VERIFICAR: Avatar não visível claramente no snapshot**
- ✅ Nome do responsável ✅ **VERIFICADO: "JS João Silva" e "MS Maria Santo" aparecem**
- ✅ Contador de tarefas (completas/total) ✅ **VERIFICADO: "0 / 2 tarefas" e "0 / 1 tarefa" aparecem**
- ✅ Barra de progresso (0-100%) ⚠️ **VERIFICAR: Barra não visível claramente no snapshot**
- ✅ Clicável para abrir detalhes ⚠️ **PRECISA TESTAR: Clicar no card**
- ✅ Drag & drop habilitado ⚠️ **PRECISA TESTAR: Arrastar card**
- ✅ Hover effect ⚠️ **PRECISA TESTAR: Passar mouse**
- ✅ Truncar texto longo ✅ **VERIFICADO: Textos longos são truncados**

**STATUS VISUAL:**
- ✅ Cards mostram: Título, descrição truncada, responsável, contador de tarefas
- ✅ Exemplo: "Implantação teste Ticket de teste para validar funcionalidade de tarefa e subtarefa no sistema high JS João Silva"

---

## 🔄 3. PERSISTÊNCIA E SINCRONIZAÇÃO

### 3.1. Carregamento de Dados
**Onde acontece:** Ao montar componente e ao trocar funil
**Comportamento:**
- Carrega funis da API
- Carrega tickets do funil selecionado
- Fallback para dados mock se API falhar
- Loading state durante carregamento

**Micro-funcionalidades:**
- ✅ Chamar `funnelsApi.list()` ao montar
- ✅ Filtrar funis do tipo 'SERVICES'
- ✅ Separar funis globais dos da organização
- ✅ Chamar `servicesTicketsApi.list(funnelId)` ao selecionar funil
- ✅ Mostrar loading spinner durante carregamento
- ✅ Fallback para dados mock se API falhar
- ✅ Tratar erros da API
- ✅ Toast de erro se falhar

---

### 3.2. Salvamento de Mudanças
**Onde acontece:** Ao fazer drag & drop, editar ticket, etc.
**Comportamento:**
- Salva mudanças via API
- Atualiza estado local
- Feedback visual (toast)

**Micro-funcionalidades:**
- ✅ Chamar `servicesTicketsApi.update()` ao mudar etapa
- ✅ Chamar `servicesTicketsApi.update()` ao editar ticket
- ✅ Atualizar estado local após sucesso
- ✅ Toast de sucesso/erro
- ✅ Optimistic UI update (atualizar antes da resposta)
- ✅ Reverter se API falhar

---

### 3.3. Persistência Local
**Onde acontece:** localStorage
**Dados salvos:**
- `rendizy_selected_services_funnel`: ID do funil selecionado
- `rendizy_ticket_templates`: Templates salvos (fallback)

**Micro-funcionalidades:**
- ✅ Salvar funil selecionado no localStorage
- ✅ Carregar funil selecionado ao montar
- ✅ Salvar templates no localStorage (backup)
- ✅ Carregar templates do localStorage se API falhar

---

---

## 📊 RESUMO DA VERIFICAÇÃO - PARTE 1

### ✅ VERIFICADO E FUNCIONANDO

1. **Seleção de Funil**
   - ✅ Label "Funil:" aparece no topo
   - ✅ Select/Dropdown aparece com funil selecionado
   - ✅ Funil padrão carregado corretamente
   - ✅ Persistência no localStorage funciona

2. **Modal "Gerenciar Funis"**
   - ✅ Abre ao clicar "Editar Funil"
   - ✅ Tabs: "Meu Funil" e "Criar/Editar"
   - ✅ Botão "Novo Funil" aparece
   - ✅ Lista de funis com botões "Editar funil"

3. **Modo Kanban**
   - ✅ Colunas do Kanban aparecem
   - ✅ Cards de tickets aparecem nas colunas
   - ✅ 3 tickets visíveis corretamente
   - ✅ Informações dos cards aparecem (título, responsável, contador de tarefas)

4. **Busca de Tickets**
   - ✅ Campo de busca aparece no topo
   - ✅ Ícone de lupa presente
   - ✅ Placeholder correto: "Buscar tickets..."

5. **Toggle Kanban/Lista**
   - ✅ Toggle aparece no topo
   - ✅ Dropdown com opções "Kanban" e "Lista"

### ⚠️ PRECISA TESTAR/VERIFICAR

1. **Badge "Global" para funis globais**
   - ⚠️ Não visível (pode não haver funis globais criados)
   - ⚠️ Precisa criar um funil global para verificar

2. **Drag & Drop de Tickets**
   - ⚠️ Não testado (precisa arrastar card entre colunas)

3. **Busca em tempo real**
   - ⚠️ Não testado (precisa digitar no campo)

4. **Visualização em Lista**
   - ⚠️ Não testado (precisa selecionar modo Lista)

5. **Abrir detalhes do ticket**
   - ❌ Card não abre ao clicar (possível bug ou implementação diferente)
   - ⚠️ Precisa verificar código para entender como abrir

6. **Valor total de produtos no header**
   - ⚠️ Não verificado (precisa abrir ticket)
   - ⚠️ Ticket "Implantação teste" tem produtos mock, mas não consegui abrir

7. **Contador de tickets por coluna**
   - ⚠️ Não visível claramente no snapshot
   - ⚠️ Precisa verificar visualmente

8. **Cores das etapas**
   - ⚠️ Não visíveis claramente no snapshot
   - ⚠️ Precisa verificar visualmente

### 🔍 PRÓXIMAS AÇÕES

1. Verificar por que o card não abre ao clicar
2. Testar drag & drop de cards
3. Testar busca de tickets
4. Testar visualização em lista
5. Verificar se há funis globais criados
6. Verificar valor total de produtos quando conseguir abrir ticket

---

**FIM DA PARTE 1**

