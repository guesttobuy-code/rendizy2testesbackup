# Funcionalidades Detalhadas - Funil de Serviços
## Análise Analítica Completa - O que deve aparecer na tela

---

## 📋 ÍNDICE

1. [Estrutura do Funil](#1-estrutura-do-funil)
2. [Tela Principal - Lista/Kanban](#2-tela-principal---listakanban)
3. [Criação de Tickets](#3-criação-de-tickets)
4. [Detalhes do Ticket - Header](#4-detalhes-do-ticket---header)
5. [Detalhes do Ticket - Aba Tarefas](#5-detalhes-do-ticket---aba-tarefas)
6. [Detalhes do Ticket - Aba Detalhes](#6-detalhes-do-ticket---aba-detalhes)
7. [Detalhes do Ticket - Aba Atividade](#7-detalhes-do-ticket---aba-atividade)
8. [Produtos e Orçamento](#8-produtos-e-orçamento)
9. [Relacionamentos](#9-relacionamentos)
10. [Templates](#10-templates)
11. [Chat IA](#11-chat-ia)
12. [Funcionalidades Avançadas](#12-funcionalidades-avançadas)

---

## 1. ESTRUTURA DO FUNIL

### 1.1. Seleção de Funil
**Onde aparece:** Topo da tela principal, lado esquerdo
**O que deve aparecer:**
- Label: "Funil:"
- Select/Dropdown com:
  - Funis globais (Default Global) primeiro, com badge "🌐 Global"
  - Funis da organização abaixo
  - Nome do funil selecionado visível
  - Ícone de dropdown (seta para baixo)

**Comportamento:**
- Ao clicar, abre lista de funis disponíveis
- Funis globais aparecem primeiro com badge "Global"
- Funis da organização aparecem depois
- Ao selecionar, carrega tickets do funil selecionado
- Salva seleção no localStorage

### 1.2. Etapas do Funil (Stages)
**Onde aparece:** Tela Kanban - colunas horizontais
**O que deve aparecer:**
- Cada etapa como uma coluna vertical
- Header da coluna com:
  - Nome da etapa (ex: "Triagem", "Em Análise")
  - Cor de fundo (configurável por etapa)
  - Contador de tickets na etapa (ex: "3")
- Cards de tickets dentro de cada coluna
- Scroll horizontal se muitas etapas

**Etapas padrão:**
1. Triagem (azul #3b82f6)
2. Em Análise (laranja #f59e0b)
3. Em Resolução (roxo #8b5cf6)
4. Aguardando Cliente (índigo #6366f1)
5. Resolvido (verde #10b981)
6. Não Resolvido (vermelho #ef4444)

### 1.3. Edição de Funis
**Onde aparece:** Botão "Editar Funil" no menu lateral
**O que deve aparecer:**
- Modal com:
  - Lista de funis existentes
  - Botão "+ Novo Funil"
  - Para cada funil:
    - Nome
    - Descrição
    - Etapas (drag & drop para reordenar)
    - Botão editar/excluir
  - Checkbox "Default Global" (apenas super_admin)
  - Campo "Observação Global" (apenas super_admin)

---

## 2. TELA PRINCIPAL - LISTA/KANBAN

### 2.1. Barra Superior
**Onde aparece:** Topo da tela, abaixo do seletor de funil
**O que deve aparecer:**
- **Botão "Novo Ticket"** (lado direito)
  - Ícone: Plus (+)
  - Texto: "Novo Ticket"
  - Ao clicar: abre modal de criação

- **Campo de Busca** (centro)
  - Ícone: Search (lupa)
  - Placeholder: "Buscar tickets..."
  - Filtra tickets em tempo real

- **Toggle de Visualização** (lado direito)
  - Ícone: Grid3x3 (Kanban) ou List (Lista)
  - Alterna entre Kanban e Lista

### 2.2. Visualização Kanban
**O que deve aparecer:**
- Colunas verticais (uma por etapa)
- Cada coluna contém:
  - Header com nome da etapa e contador
  - Cards de tickets (arrastáveis)
  - Scroll vertical se muitos tickets

**Card do Ticket (no Kanban):**
- Título do ticket (negrito)
- Descrição (truncada, máximo 2 linhas)
- Badge de prioridade (low/medium/high/urgent)
- Badge de status (Pendente, Em Análise, etc.)
- Avatar do responsável (se atribuído)
- Nome do responsável
- Contador de tarefas (ex: "0 / 2 tarefas")
- Progresso visual (barra de progresso, se houver tarefas)
- **VALOR TOTAL DOS PRODUTOS** (se houver produtos e não estiver oculto)
  - Formato: "R$ 12.000,00" ou "USD 2.500,00"
  - Posição: abaixo do título ou no rodapé do card

### 2.3. Visualização Lista
**O que deve aparecer:**
- Tabela com colunas:
  - Título
  - Status
  - Prioridade
  - Responsável
  - Etapa
  - Progresso
  - Valor (se houver produtos e não estiver oculto)
  - Data de criação
  - Ações (ícone de 3 pontos)

### 2.4. Drag & Drop
**Comportamento:**
- Arrastar card entre colunas (etapas)
- Feedback visual durante arrasto
- Atualização otimista (muda antes de salvar)
- Salva mudança de etapa automaticamente

---

## 3. CRIAÇÃO DE TICKETS

### 3.1. Modal de Criação
**O que deve aparecer:**
- **Título do Modal:** "Novo Ticket de Serviço"

- **Seleção de Template** (primeiro campo)
  - Label: "Criar a partir de modelo"
  - Select com:
    - Opção "Criar do zero" (ícone FileText)
    - Separador "Modelos Globais" (se houver)
    - Templates globais com badge "🌐 Global"
    - Separador "Meus Modelos" (se houver)
    - Templates da organização
  - Texto abaixo: "O ticket será criado com todas as tarefas do modelo"

- **Título** (obrigatório)
  - Input de texto
  - Placeholder: "Ex: Problema com Check-in"

- **Descrição** (opcional)
  - Textarea
  - Placeholder: "Descreva o problema ou serviço..."

- **Prioridade**
  - Select com: low, medium, high, urgent
  - Badge colorido ao lado

- **Etapa Inicial**
  - Select com etapas do funil
  - Padrão: primeira etapa

- **Responsável** (opcional)
  - Select com busca
  - Mostra avatar e nome

- **Data de Vencimento** (opcional)
  - Date picker
  - Formato: DD/MM/YYYY

- **Relacionamentos:**
  - **Pessoas Relacionadas**
    - Multi-select com busca
    - Tipos: Usuários, Contatos, Hóspedes, Compradores, Vendedores
    - Mostra avatar e tipo
  - **Imóveis Relacionados**
    - Multi-select com busca
    - Mostra nome e código
  - **Automações Relacionadas**
    - Multi-select com busca
    - Mostra nome

- **Botões:**
  - "Cancelar" (outline)
  - "Criar Ticket" (primary)

### 3.2. Pré-preenchimento (do Chat)
**Quando vem do chat:**
- Campos pré-preenchidos:
  - Contato (se houver)
  - Imóvel (se houver)
  - Reserva (se houver)
  - Descrição inicial (se houver)

---

## 4. DETALHES DO TICKET - HEADER

### 4.1. Área do Header
**Onde aparece:** Topo do painel esquerdo, quando ticket está aberto
**O que deve aparecer:**

- **Título do Ticket**
  - Texto grande (text-2xl, font-bold)
  - Ex: "Implantação teste"

- **Botão "Salvar como Modelo"** (lado direito do título)
  - Ícone: Save (disquete)
  - Texto: "Salvar como Modelo"
  - Ao clicar: abre modal

- **Badges de Status e Prioridade** (abaixo do título)
  - Badge de status (colorido):
    - Pendente (azul)
    - Em Análise (laranja)
    - Resolvido (verde)
    - Não Resolvido (vermelho)
  - Badge de prioridade (outline):
    - low, medium, high, urgent

- **VALOR TOTAL DOS PRODUTOS** (abaixo dos badges)
  - **CONDIÇÃO:** Só aparece se:
    - `ticket.products` existe E
    - `ticket.products.length > 0` E
    - `ticket.hideProducts !== true`
  - **O que aparece:**
    - Label: "Products" (text-sm, text-gray-500)
    - Valor formatado (text-xl, font-bold):
      - Ex: "R$ 12.000,00"
      - Formato: moeda brasileira (pt-BR)
      - Moeda: BRL, USD ou EUR (conforme ticket.currency)

- **Seletor de Status** (abaixo do valor ou badges)
  - Card com:
    - Label: "Status"
    - Select dropdown com status disponíveis:
      - Pendente
      - Em Análise
      - Resolvido
      - Não Resolvido
      - Cancelado

---

## 5. DETALHES DO TICKET - ABA TAREFAS

### 5.1. Aba "Tarefas"
**Onde aparece:** Tabs abaixo do header
**O que deve aparecer:**

- **Progresso da Etapa** (topo)
  - Label: "Progresso da Etapa"
  - Porcentagem: "X%"
  - Barra de progresso visual
  - Texto: "X de Y tarefas completas"

- **Filtro de Tarefas** (opcional)
  - Badges clicáveis:
    - "Pendente" (azul, selecionado por padrão)
    - "Em Progresso"
    - "Concluídas"
  - Filtra tarefas por status

- **Lista de Tarefas da Etapa Atual**
  - **IMPORTANTE:** Só mostra tarefas da etapa atual do ticket (wizard-like)
  - Cada tarefa mostra:
    - Checkbox (círculo ou check)
    - Título da tarefa
    - Tipo de tarefa (badge):
      - STANDARD (padrão)
      - FORM (formulário)
      - ATTACHMENT (anexo)
    - Status (TODO, IN_PROGRESS, COMPLETED)
    - Responsável (avatar + nome)
    - Data de vencimento (se houver)
    - Botão de ações (3 pontos)

- **Botão "Adicionar Tarefa"** (centro, se não houver tarefas)
  - Ícone: Plus (+)
  - Texto: "Adicionar Tarefa"
  - Ao clicar: expande formulário

### 5.2. Formulário de Adicionar Tarefa
**O que deve aparecer:**
- Input "Título da Tarefa" (obrigatório)
- Select "Tipo de Tarefa":
  - STANDARD
  - FORM
  - ATTACHMENT
- Select "Responsável" (opcional)
  - Com busca
  - Mostra avatar
- Date Picker "Data de Vencimento" (opcional)
- Botões:
  - "Cancelar"
  - "Adicionar"

### 5.3. Detalhes da Tarefa (ao clicar)
**O que deve aparecer:**
- Card expandido com:
  - Título editável
  - Descrição (textarea)
  - Tipo de tarefa (não editável após criação)
  - Status (select)
  - Responsável (selector)
  - Data de vencimento (date picker)
  - Subtarefas (se STANDARD)
  - Formulário (se FORM)
  - Anexos (se ATTACHMENT)
  - Comentários
  - Botão "Excluir"

### 5.4. Subtarefas
**O que deve aparecer:**
- Lista de subtarefas abaixo da tarefa principal
- Cada subtarefa:
  - Checkbox
  - Título
  - Responsável (opcional)
  - Data de vencimento (opcional)
- Botão "+ Adicionar Subtarefa"
- Drag & drop para reordenar

### 5.5. Tarefa Tipo FORM
**O que deve aparecer:**
- Link/URL do formulário
- Status: "Aguardando resposta" ou "Respondido"
- Botão "Ver Respostas" (se respondido)
- Data de resposta (se houver)

### 5.6. Tarefa Tipo ATTACHMENT
**O que deve aparecer:**
- Área de upload (drag & drop)
- Lista de arquivos anexados:
  - Nome do arquivo
  - Tipo (imagem/documento)
  - Data de upload
  - Preview (se imagem)
  - Botão download/excluir

### 5.7. Drag & Drop de Tarefas
**Comportamento:**
- Arrastar tarefas para reordenar
- Feedback visual durante arrasto
- Salva ordem automaticamente

---

## 6. DETALHES DO TICKET - ABA DETALHES

### 6.1. Aba "Detalhes"
**Onde aparece:** Segunda tab
**O que deve aparecer:**

- **Card "Informações do Ticket"**
  - **Descrição**
    - Label: "Descrição"
    - Textarea editável
    - Placeholder: "Adicione uma descrição..."

  - **Responsável**
    - Label: "Atribuído a"
    - Select com busca
    - Mostra avatar e nome
    - Opção "Não atribuído"

  - **Data de Vencimento**
    - Label: "Data de Vencimento"
    - Date picker
    - Formato: DD/MM/YYYY
    - Opção de limpar

  - **Criado por**
    - Label: "Criado por"
    - Texto: Nome do criador
    - Data: "em DD/MM/YYYY"

  - **Última atualização**
    - Label: "Última atualização"
    - Data: "em DD/MM/YYYY HH:MM"

- **SEÇÃO: PRODUTOS / ORÇAMENTO**
  - **Título:** "Produtos / Orçamento" (com ícone Package)
  - **Componente TicketProductsManager:**
    
    **Se NÃO houver produtos:**
    - Card vazio com:
      - Ícone Package (grande, cinza)
      - Texto: "Nenhum produto adicionado"
      - Botão "+ Adicionar produto"

    **Se HOUVER produtos E NÃO estiver oculto:**
    - **Header:**
      - Label: "Products"
      - **Toggle "Visível/Oculto"** (botão pequeno ao lado)
        - Se visível: ícone Eye + texto "Visível"
        - Se oculto: ícone EyeOff + texto "Oculto"
      - **Valor Total** (text-2xl, font-bold):
        - Ex: "R$ 12.000,00"
        - Formato: moeda brasileira
      - Botão "+ Add products" (lado direito)
    
    - **Lista de Produtos:**
      - Card para cada produto com:
        - Nome do produto (font-medium)
        - Quantidade: "(2x)"
        - Preço unitário: "R$ 6.000,00 cada"
        - Subtotal: "= R$ 12.000,00"
        - Descrição (se houver, text-xs)
        - Botões: Editar (ícone Plus/Edit) e Excluir (ícone Trash2, vermelho)

    **Se HOUVER produtos E ESTIVER oculto:**
    - Card com:
      - Ícone EyeOff (grande, cinza)
      - Texto: "Produtos ocultos"
      - Texto menor: "Os produtos e valores não são visíveis para clientes"
      - Botão "Mostrar produtos"

    **Modal de Adicionar/Editar Produto:**
    - Título: "Adicionar Produto" ou "Editar Produto"
    - Campos:
      - Nome do Produto (input, obrigatório)
      - Quantidade (number, min: 1)
      - Preço Unitário (number, min: 0, step: 0.01)
      - Descrição (textarea, opcional)
    - Botões: "Cancelar" e "Adicionar Produto" / "Salvar Alterações"

- **SEÇÃO: RELACIONAMENTOS**
  - **Pessoas Relacionadas**
    - Título: "Pessoas Relacionadas" (com ícone Users)
    - Lista de pessoas com:
      - Avatar (ou inicial)
      - Nome
      - Tipo (badge): Usuário, Contato, Hóspede, Comprador, Vendedor
      - Email (se houver)
      - Botão remover (X)
    - Botão "+ Adicionar Pessoa"
    - Modal com multi-select e busca

  - **Imóveis Relacionados**
    - Título: "Imóveis Relacionados" (com ícone Home)
    - Lista de imóveis com:
      - Nome
      - Código (se houver)
      - Endereço (se houver)
      - Botão remover (X)
    - Botão "+ Adicionar Imóvel"
    - Modal com multi-select e busca

  - **Automações Relacionadas**
    - Título: "Automações Relacionadas" (com ícone Zap)
    - Lista de automações com:
      - Nome
      - Descrição (se houver)
      - Botão remover (X)
    - Botão "+ Adicionar Automação"
    - Modal com multi-select e busca

- **Botão "Salvar como Modelo"** (rodapé do card)
  - Ícone: Save
  - Texto: "Salvar como Modelo"
  - Ao clicar: abre modal

---

## 7. DETALHES DO TICKET - ABA ATIVIDADE

### 7.1. Aba "Atividade"
**Onde aparece:** Terceira tab
**O que deve aparecer:**

- **Timeline de Atividades**
  - Lista cronológica (mais recente primeiro)
  - Cada atividade mostra:
    - Data e hora
    - Tipo de atividade:
      - Ticket criado
      - Status alterado
      - Tarefa adicionada
      - Tarefa concluída
      - Produto adicionado
      - Responsável alterado
      - Etapa alterada
    - Descrição da mudança
    - Autor (avatar + nome)

- **Campo de Comentário**
  - Textarea
  - Placeholder: "Adicione um comentário..."
  - Botão "Enviar"
  - Ao enviar: adiciona à timeline

---

## 8. PRODUTOS E ORÇAMENTO

### 8.1. Funcionalidade de Ocultar Produtos
**Onde aparece:** Seção de produtos na aba Detalhes
**O que deve aparecer:**

- **Toggle "Visível/Oculto"**
  - Posição: Ao lado do label "Products"
  - Botão pequeno (h-6, px-2, text-xs)
  - **Estado Visível:**
    - Ícone: Eye
    - Texto: "Visível"
    - Tooltip: "Ocultar produtos"
  - **Estado Oculto:**
    - Ícone: EyeOff
    - Texto: "Oculto"
    - Tooltip: "Mostrar produtos"

**Comportamento:**
- Ao clicar em "Visível" → muda para "Oculto"
- Ao clicar em "Oculto" → muda para "Visível"
- Salva estado em `ticket.hideProducts`

**Efeitos visuais:**
- **Quando oculto:**
  - Valor total NÃO aparece no header
  - Seção de produtos mostra mensagem "Produtos ocultos"
  - Botão "Add products" desaparece
  - Lista de produtos não é exibida

- **Quando visível:**
  - Valor total aparece no header (se houver produtos)
  - Seção de produtos mostra lista completa
  - Botão "Add products" visível

### 8.2. Cálculo de Valor Total
**Onde aparece:**
1. Header do ticket (abaixo dos badges)
2. Seção de produtos na aba Detalhes

**Fórmula:**
```
Total = Σ (produto.price × produto.quantity)
```

**Formatação:**
- Moeda: BRL, USD ou EUR (conforme ticket.currency)
- Formato: pt-BR (R$ 12.000,00)
- Mínimo 2 casas decimais

---

## 9. RELACIONAMENTOS

### 9.1. Pessoas Relacionadas
**Tipos suportados:**
- Usuário (User) - ícone User
- Contato (Contact) - ícone UserCircle
- Hóspede (Guest) - ícone Users
- Comprador (Buyer) - ícone ShoppingCart
- Vendedor (Seller) - ícone Store

**Seletor:**
- Multi-select com busca
- Busca em tempo real
- Mostra avatar, nome, tipo, email
- Permite selecionar múltiplas pessoas

### 9.2. Imóveis Relacionados
**Seletor:**
- Multi-select com busca
- Busca por nome ou código
- Mostra nome, código, endereço
- Permite selecionar múltiplos imóveis

### 9.3. Automações Relacionadas
**Seletor:**
- Multi-select com busca
- Busca por nome
- Mostra nome e descrição
- Permite selecionar múltiplas automações

---

## 10. TEMPLATES

### 10.1. Criar Template a partir de Ticket
**Onde aparece:** Botão "Salvar como Modelo" no header e na aba Detalhes
**O que deve aparecer:**

- **Modal "Salvar como Modelo"**
  - Título: "Salvar como Modelo"
  - Descrição: "Salve este ticket como um modelo reutilizável. Todas as tarefas e etapas serão preservadas."
  
  - **Campos:**
    - Nome do Modelo (input, obrigatório)
      - Placeholder: "Ex: Modelo Implantação"
    - Descrição (textarea, opcional)
      - Placeholder: "Descreva quando usar este modelo..."
    
    - **Seção "Default Global"** (apenas super_admin)
      - Card com fundo roxo claro
      - Checkbox "Default Global"
        - Label com ícone Globe
        - Texto: "Este template será aplicado como padrão para todas as organizações (clientes). Apenas o Admin Master pode criar e editar templates globais."
      - Se marcado:
        - Alert: "Este modelo será visível e utilizável por todas as organizações. Qualquer alteração aqui afetará todos os clientes."
        - Campo "Observação Global" (textarea, opcional)
          - Placeholder: "Descreva o propósito e impacto deste modelo global..."
    
    - **Card informativo:**
      - "Este modelo incluirá:"
      - Lista:
        - "X tarefa(s) em Y etapa(s)"
        - "Todas as configurações de tarefas (tipos, atribuições, etc.)"
        - "Estrutura completa do processo"
  
  - **Botões:**
    - "Cancelar"
    - "Salvar Modelo" (com ícone Save)

### 10.2. Criar Ticket a partir de Template
**Onde aparece:** Modal de criação de ticket
**O que deve aparecer:**

- **Select "Criar a partir de modelo"**
  - Primeira opção: "Criar do zero" (ícone FileText)
  - **Separador "Modelos Globais"** (se houver templates globais)
  - Templates globais:
    - Ícone Copy
    - Nome do template
    - Badge "🌐 Global" (roxo)
    - Descrição (se houver, text-xs, muted)
  - **Separador "Meus Modelos"** (se houver templates da organização)
  - Templates da organização:
    - Ícone Copy
    - Nome do template
    - Descrição (se houver)

**Comportamento:**
- Ao selecionar template:
  - Preenche campos do ticket
  - Copia todas as tarefas do template
  - Reseta IDs e status das tarefas para TODO
  - Mantém estrutura do funil

### 10.3. Restrições de Templates Globais
**Apenas super_admin pode:**
- Criar templates globais
- Editar templates globais
- Excluir templates globais

**Usuários normais:**
- Podem ver e usar templates globais
- NÃO podem editar ou excluir templates globais
- Podem criar seus próprios templates (não globais)

---

## 11. CHAT IA

### 11.1. Painel Direito - Chat IA
**Onde aparece:** Painel direito quando ticket está aberto
**O que deve aparecer:**

- **Header:**
  - Ícone estrela
  - Título: "Chat IA - Tarefas & Automações"
  - Botão fechar (X)

- **Mensagem inicial:**
  - Avatar do bot (robô)
  - Texto: "Olá! Sou o assistente IA do Rendizy. Posso ajudar você a:"
  - Lista:
    - "Criar e gerenciar tarefas"
    - "Atribuir pessoas"
    - "Mudar status e etapas"
    - "Criar automações"
    - "E muito mais!"
  - Exemplo: "Exemplo: 'Criar tarefa 'Verificar logs' atribuída a João'"

- **Campo de Input:**
  - Placeholder: "Digite um comando... (ex: Criar tarefa 'Verificar logs' atribuída a João)"
  - Botão enviar (ícone avião de papel)

- **Dica:**
  - Ícone lâmpada
  - Texto: "💡 Dica: Use comandos em linguagem natural para criar tarefas, atribuir pessoas e criar automações"

### 11.2. Comandos Suportados
**Tipos:**
- CREATE_TASK: Criar tarefa
- UPDATE_TASK: Atualizar tarefa
- ASSIGN_TASK: Atribuir tarefa
- MOVE_STAGE: Mover etapa
- CREATE_AUTOMATION: Criar automação
- UPDATE_STATUS: Atualizar status
- COMPLETE_TASK: Completar tarefa

---

## 12. FUNCIONALIDADES AVANÇADAS

### 12.1. Progresso Automático
**Cálculo:**
- Baseado em tarefas completas
- Fórmula: `(tarefas_completas / total_tarefas) × 100`
- Atualiza automaticamente quando tarefa é completada

**Onde aparece:**
- Header do ticket (barra de progresso)
- Card no Kanban (barra de progresso)
- Aba Tarefas (porcentagem)

### 12.2. Busca Avançada
**Campos pesquisáveis:**
- Título do ticket
- Descrição
- Status
- Prioridade
- Responsável
- Etapa
- Tags

**Comportamento:**
- Busca em tempo real
- Filtra lista/Kanban
- Highlight dos termos encontrados

### 12.3. Tags
**Onde aparece:** Aba Detalhes
**O que deve aparecer:**
- Lista de tags (badges)
- Input para adicionar tag
- Botão remover em cada tag

### 12.4. Histórico de Mudanças (Audit Log)
**Onde aparece:** Aba Atividade
**O que deve aparecer:**
- Lista cronológica de todas as mudanças
- Tipo de mudança
- Valor antigo → novo
- Autor
- Data e hora

### 12.5. Dependências entre Tarefas
**Status:** Implementado (campos no tipo)
**Onde aparece:** Detalhes da tarefa
**O que deve aparecer:**
- Lista de tarefas dependentes
- Bloqueio visual se dependência não completada

### 12.6. Estimativa de Tempo
**Campos:**
- `estimatedHours`: Estimativa em horas
- `actualHours`: Tempo real gasto

**Onde aparece:** Detalhes da tarefa

### 12.7. Visualização Timeline/Gantt
**Status:** Implementado (componente TimelineView)
**O que deve aparecer:**
- Linha do tempo com tarefas
- Barras de Gantt
- Dependências visuais

### 12.8. Lembretes por Email
**Status:** Implementado (utils/emailReminders)
**Comportamento:**
- Envia email quando tarefa está próxima do vencimento
- Configurável por usuário

### 12.9. Integração com Calendário
**Status:** Implementado (utils/calendarIntegration)
**Comportamento:**
- Sincroniza tarefas com calendário
- Mostra eventos no calendário

### 12.10. Relatórios de Produtividade
**Status:** Implementado (componente ProductivityReports)
**O que deve aparecer:**
- Gráficos de produtividade
- Estatísticas de tarefas
- Tempo médio de resolução

### 12.11. Modo Offline
**Status:** Implementado (utils/offlineSync)
**Comportamento:**
- Salva mudanças localmente quando offline
- Sincroniza quando volta online

---

## 📝 CHECKLIST DE VERIFICAÇÃO VISUAL

### Tela Principal
- [ ] Seletor de funil aparece no topo
- [ ] Funis globais aparecem primeiro com badge "Global"
- [ ] Botão "Novo Ticket" aparece
- [ ] Campo de busca funciona
- [ ] Toggle Kanban/Lista funciona
- [ ] Cards de tickets aparecem nas colunas corretas
- [ ] Valor total aparece nos cards (se houver produtos e não estiver oculto)

### Modal de Criação
- [ ] Templates globais aparecem primeiro com badge "Global"
- [ ] Templates da organização aparecem depois
- [ ] Seletores de relacionamentos funcionam
- [ ] Busca nos seletores funciona

### Detalhes do Ticket - Header
- [ ] Título aparece
- [ ] Badges de status e prioridade aparecem
- [ ] **VALOR TOTAL DOS PRODUTOS aparece (se houver produtos e não estiver oculto)**
- [ ] Seletor de status funciona

### Detalhes do Ticket - Aba Tarefas
- [ ] Progresso da etapa aparece
- [ ] Apenas tarefas da etapa atual aparecem
- [ ] Tipos de tarefa aparecem corretamente
- [ ] Drag & drop funciona
- [ ] Subtarefas aparecem

### Detalhes do Ticket - Aba Detalhes
- [ ] Seção de produtos aparece
- [ ] **Toggle "Visível/Oculto" aparece**
- [ ] **Valor total aparece quando visível**
- [ ] **Mensagem "Produtos ocultos" aparece quando oculto**
- [ ] Lista de produtos aparece quando visível
- [ ] Relacionamentos aparecem
- [ ] Botão "Salvar como Modelo" aparece

### Produtos
- [ ] Adicionar produto funciona
- [ ] Editar produto funciona
- [ ] Excluir produto funciona
- [ ] Cálculo do total está correto
- [ ] Formatação de moeda está correta
- [ ] Toggle ocultar/mostrar funciona
- [ ] Valor desaparece do header quando oculto
- [ ] Valor volta ao header quando mostrado

### Templates
- [ ] Modal "Salvar como Modelo" aparece
- [ ] Checkbox "Default Global" aparece (apenas super_admin)
- [ ] Templates globais aparecem primeiro na criação
- [ ] Badge "Global" aparece nos templates globais

### Chat IA
- [ ] Painel direito aparece
- [ ] Mensagem inicial aparece
- [ ] Campo de input funciona
- [ ] Comandos são processados

---

## 🎯 RESUMO EXECUTIVO

### Funcionalidades Principais
1. ✅ Gestão de funis (criar, editar, selecionar)
2. ✅ Funis globais (Default Global)
3. ✅ Visualização Kanban e Lista
4. ✅ Criação de tickets
5. ✅ Tarefas vinculadas à etapa (wizard-like)
6. ✅ Tipos de tarefa (STANDARD, FORM, ATTACHMENT)
7. ✅ Subtarefas
8. ✅ Produtos e orçamento
9. ✅ **Ocultar produtos (toggle visível/oculto)**
10. ✅ Relacionamentos (pessoas, imóveis, automações)
11. ✅ Templates (criar, usar, globais)
12. ✅ Chat IA
13. ✅ Progresso automático
14. ✅ Drag & drop

### Pontos de Atenção
- ⚠️ **Valor total de produtos no header:** Deve aparecer quando `ticket.products.length > 0` E `ticket.hideProducts !== true`
- ⚠️ **Toggle ocultar produtos:** Deve aparecer na seção de produtos na aba Detalhes
- ⚠️ **Templates globais:** Devem aparecer primeiro, com badge "Global"
- ⚠️ **Tarefas:** Devem ser filtradas por etapa atual (wizard-like)

---

**Documento criado em:** 28/11/2025
**Versão:** 1.0
**Última atualização:** 28/11/2025

