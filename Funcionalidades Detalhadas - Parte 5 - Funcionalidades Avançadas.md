# Funcionalidades Detalhadas - Funil de Serviços
## Parte 5: Funcionalidades Avançadas

---

## 🎯 12. DRAG & DROP

### 12.1. Drag & Drop de Tickets (Kanban)
**Onde acontece:** Entre colunas do Kanban
**Elementos visuais:**
- Cursor muda para "grabbing" ao arrastar
- Card fica semi-transparente durante drag
- Indicador visual de onde será solto
- Feedback visual ao soltar

**Comportamento:**
- Arrastar card entre colunas muda etapa
- Atualiza `ticket.stageId`
- Salva via API
- Optimistic UI update

**O que deve aparecer na tela:**
```
Durante drag:
[Card semi-transparente sendo arrastado]
[Indicador visual na coluna de destino]

Após soltar:
[Card aparece na nova coluna]
[Toast: "Ticket movido para 'Em Análise'"]
```

**Micro-funcionalidades:**
- ✅ Habilitar drag & drop nos cards
- ✅ Cursor "grabbing" ao arrastar
- ✅ Card semi-transparente durante drag
- ✅ Indicador visual de destino
- ✅ Atualizar `ticket.stageId` ao soltar
- ✅ Salvar via API (`servicesTicketsApi.update()`)
- ✅ Optimistic UI update
- ✅ Reverter se API falhar
- ✅ Toast de sucesso/erro
- ✅ Atualizar contador de tickets nas colunas

---

### 12.2. Drag & Drop de Tarefas
**Onde acontece:** Dentro da lista de tarefas (aba Tarefas)
**Elementos visuais:**
- Ícone de arrastar (GripVertical) em cada tarefa
- Tarefa fica semi-transparente durante drag
- Indicador visual de nova posição
- Feedback visual ao soltar

**Comportamento:**
- Arrastar tarefa para reordenar
- Atualiza `task.order`
- Salva via API

**O que deve aparecer na tela:**
```
Durante drag:
[☰] [Tarefa semi-transparente sendo arrastada]
[Indicador visual da nova posição]

Após soltar:
[Tarefa aparece na nova posição]
```

**Micro-funcionalidades:**
- ✅ Habilitar drag & drop nas tarefas
- ✅ Ícone GripVertical para arrastar
- ✅ Tarefa semi-transparente durante drag
- ✅ Indicador visual de nova posição
- ✅ Atualizar `task.order` ao soltar
- ✅ Reordenar array de tarefas
- ✅ Salvar via API (se implementado)
- ✅ Atualizar interface

---

## 📎 13. ANEXOS E FORMULÁRIOS

### 13.1. Tarefas de Anexo (ATTACHMENT)
**Onde aparece:** Na lista de tarefas, tarefas do tipo ATTACHMENT
**Elementos visuais:**
- Badge "ATTACHMENT"
- Área de upload de arquivos
- Lista de arquivos anexados
- Botão "Upload" ou drag & drop

**Comportamento:**
- Upload de múltiplos arquivos
- Suporta imagens e documentos
- Preview de imagens
- Download de arquivos

**O que deve aparecer na tela:**
```
[○] Enviar documentos (ATTACHMENT) 👤 João
    ┌─────────────────────────────┐
    │ 📎 Arraste arquivos aqui ou │
    │    [Selecionar arquivos]    │
    │                             │
    │ 📄 documento.pdf            │
    │ 🖼️ imagem.jpg               │
    └─────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Badge "ATTACHMENT" na tarefa
- ✅ Componente FileUpload
- ✅ Área de drag & drop
- ✅ Botão "Selecionar arquivos"
- ✅ Upload de múltiplos arquivos
- ✅ Preview de imagens
- ✅ Lista de arquivos anexados
- ✅ Download de arquivos
- ✅ Excluir arquivo
- ✅ Salvar URLs no `task.attachments.files`

---

### 13.2. Tarefas de Formulário (FORM)
**Onde aparece:** Na lista de tarefas, tarefas do tipo FORM
**Elementos visuais:**
- Badge "FORM"
- Link para formulário
- Status: "Aguardando resposta" ou "Respondido"
- Botão "Ver formulário"

**Comportamento:**
- Link para formulário externo
- Rastreamento de resposta
- Marcar como completo quando respondido

**O que deve aparecer na tela:**
```
[○] Cliente responde formulário (FORM) 👤 Maria
    ┌─────────────────────────────┐
    │ 📝 Formulário de Check-in   │
    │ Status: Aguardando resposta │
    │ [Ver formulário]            │
    └─────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Badge "FORM" na tarefa
- ✅ Componente FormTaskViewer
- ✅ Link para formulário (`formData.responseUrl`)
- ✅ Status do formulário
- ✅ Marcar como completo quando respondido
- ✅ Atualizar `task.formData.completed`

---

## 🏷️ 14. TAGS E METADADOS

### 14.1. Tags do Ticket
**Onde aparece:** Aba "Detalhes", seção de tags
**Elementos visuais:**
- Lista de tags (chips/badges)
- Campo de input para adicionar tag
- Botão X em cada tag para remover

**Comportamento:**
- Adicionar múltiplas tags
- Remover tags
- Busca por tags

**O que deve aparecer na tela:**
```
Tags:
[urgente ✕] [check-in ✕] [cliente-vip ✕]
[+ Adicionar tag]
```

**Micro-funcionalidades:**
- ✅ Seção de tags na aba Detalhes
- ✅ Lista de tags como chips
- ✅ Campo de input para adicionar
- ✅ Adicionar tag ao pressionar Enter
- ✅ Botão X para remover tag
- ✅ Salvar no `ticket.tags`
- ✅ Busca por tags (se implementado)

---

### 14.2. Metadados
**Onde acontece:** Internamente, campo `ticket.metadata`
**Comportamento:**
- Armazena dados adicionais
- Flexível para extensões futuras

**Micro-funcionalidades:**
- ✅ Campo `metadata` no ticket
- ✅ Estrutura flexível (Record<string, any>)
- ✅ Salvar metadados customizados

---

## 📅 15. DATAS E PRAZOS

### 15.1. Data de Vencimento do Ticket
**Onde aparece:** Aba "Detalhes", campo "Data de Vencimento"
**Elementos visuais:**
- Campo de data (date picker)
- Ícone de calendário
- Data formatada (dd/MM/yyyy)

**Comportamento:**
- Selecionar data
- Validar que não é no passado (opcional)
- Alertar se vencido

**O que deve aparecer na tela:**
```
Data de Vencimento:
[📅 30/11/2025]
```

**Micro-funcionalidades:**
- ✅ Campo de data na aba Detalhes
- ✅ Date picker (TaskDatePicker)
- ✅ Formatação de data (pt-BR)
- ✅ Salvar no `ticket.dueDate`
- ✅ Validar data (opcional)
- ✅ Alertar se vencido (opcional)

---

### 15.2. Data de Vencimento da Tarefa
**Onde aparece:** Na tarefa, ao criar ou editar
**Elementos visuais:**
- Campo de data (date picker)
- Ícone de calendário
- Data formatada

**Comportamento:**
- Selecionar data ao criar tarefa
- Editar data da tarefa
- Alertar se vencido

**O que deve aparecer na tela:**
```
Vencimento: [📅 30/11/2025]
```

**Micro-funcionalidades:**
- ✅ Campo de data ao criar tarefa
- ✅ Date picker (TaskDatePicker)
- ✅ Formatação de data (pt-BR)
- ✅ Salvar no `task.dueDate`
- ✅ Mostrar data na lista de tarefas
- ✅ Alertar se vencido (opcional)

---

## 👥 16. ATRIBUIÇÕES

### 16.1. Atribuir Responsável ao Ticket
**Onde aparece:** Aba "Detalhes", campo "Responsável"
**Elementos visuais:**
- Select com busca
- Avatar e nome do responsável
- Lista de usuários disponíveis

**Comportamento:**
- Busca em tempo real
- Selecionar responsável
- Atualizar ticket

**O que deve aparecer na tela:**
```
Responsável:
[👤 João Silva ▼]
  ├─ 👤 João Silva
  ├─ 👤 Maria Santos
  └─ 👤 Pedro Costa
```

**Micro-funcionalidades:**
- ✅ Campo "Responsável" na aba Detalhes
- ✅ Select com busca (AssigneeSelector)
- ✅ Lista de usuários da organização
- ✅ Avatar do responsável
- ✅ Nome do responsável
- ✅ Busca em tempo real
- ✅ Salvar no `ticket.assignedTo` e `ticket.assignedToName`
- ✅ Atualizar ticket via API

---

### 16.2. Atribuir Responsável à Tarefa
**Onde aparece:** Ao criar tarefa ou editar tarefa
**Elementos visuais:**
- Select com busca
- Avatar e nome do responsável

**Comportamento:**
- Selecionar responsável ao criar
- Editar responsável da tarefa
- Atualizar tarefa

**O que deve aparecer na tela:**
```
Responsável: [👤 João Silva ▼]
```

**Micro-funcionalidades:**
- ✅ Campo "Responsável" ao criar tarefa
- ✅ Select com busca (AssigneeSelector)
- ✅ Lista de usuários disponíveis
- ✅ Salvar no `task.assignedTo` e `task.assignedToName`
- ✅ Mostrar responsável na lista de tarefas
- ✅ Editar responsável da tarefa

---

## 📝 17. COMENTÁRIOS E ATIVIDADES

### 17.1. Comentários em Tarefas
**Onde aparece:** Ao expandir tarefa, seção de comentários
**Elementos visuais:**
- Lista de comentários
- Campo de input para novo comentário
- Botão "Enviar"
- Avatar e nome do autor
- Timestamp

**Comportamento:**
- Adicionar comentário
- Listar comentários
- Atualizar em tempo real

**O que deve aparecer na tela:**
```
Comentários:
┌─────────────────────────────────────┐
│ 👤 João Silva - 28/11/2025 10:30   │
│ Verifiquei os logs, tudo OK.       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [Digite um comentário...] [Enviar] │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Seção de comentários na tarefa expandida
- ✅ Lista de comentários
- ✅ Avatar e nome do autor
- ✅ Timestamp formatado
- ✅ Campo de input para novo comentário
- ✅ Botão "Enviar"
- ✅ Adicionar comentário
- ✅ Atualizar lista de comentários
- ✅ Salvar comentários (se implementado)

---

### 17.2. Timeline de Atividades
**Onde aparece:** Aba "Atividade"
**Elementos visuais:**
- Timeline vertical
- Cada atividade mostra:
  - Ícone do tipo
  - Descrição
  - Autor
  - Timestamp
- Ordenado por data (mais recente primeiro)

**Comportamento:**
- Mostra histórico de mudanças
- Atualiza automaticamente

**O que deve aparecer na tela:**
```
Atividade:
┌─────────────────────────────────────┐
│ 🟢 Ticket criado                    │
│    Por: Sistema - 27/11/2025 10:00  │
├─────────────────────────────────────┤
│ 📝 Tarefa adicionada: Verificar logs│
│    Por: João Silva - 27/11 11:00   │
├─────────────────────────────────────┤
│ ✅ Tarefa completada: Verificar logs│
│    Por: João Silva - 27/11 14:00   │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Aba "Atividade" no ticket
- ✅ Timeline vertical de atividades
- ✅ Ícone por tipo de atividade
- ✅ Descrição da atividade
- ✅ Autor da atividade
- ✅ Timestamp formatado
- ✅ Ordenado por data (mais recente primeiro)
- ✅ Atualizar automaticamente

---

## 🔍 18. BUSCA E FILTROS

### 18.1. Busca de Tickets
**Onde aparece:** Topo da tela, campo de busca
**Elementos visuais:**
- Input com ícone de busca
- Placeholder: "Buscar tickets..."
- Filtro em tempo real

**Comportamento:**
- Busca em tempo real
- Filtra por título, descrição, tags
- Atualiza Kanban/Lista

**Micro-funcionalidades:**
- ✅ Input de busca com ícone
- ✅ Busca em tempo real (onChange)
- ✅ Filtrar por título
- ✅ Filtrar por descrição
- ✅ Filtrar por tags
- ✅ Case-insensitive
- ✅ Limpar busca (X quando há texto)
- ✅ Atualizar visualização (Kanban/Lista)

---

### 18.2. Filtros Avançados (se implementado)
**Onde aparece:** Modal ou dropdown de filtros
**Elementos visuais:**
- Filtros por:
  - Status
  - Prioridade
  - Responsável
  - Etapa
  - Data
- Botão "Aplicar" e "Limpar"

**Micro-funcionalidades:**
- ✅ Modal/dropdown de filtros
- ✅ Filtro por status
- ✅ Filtro por prioridade
- ✅ Filtro por responsável
- ✅ Filtro por etapa
- ✅ Filtro por data
- ✅ Aplicar filtros
- ✅ Limpar filtros
- ✅ Atualizar visualização

---

## 📱 19. RESPONSIVIDADE

### 19.1. Layout Responsivo
**Onde acontece:** Em todas as telas
**Comportamento:**
- Desktop: Split-view (50/50 ou 60/40)
- Tablet: Split-view empilhado
- Mobile: Coluna única

**Micro-funcionalidades:**
- ✅ Layout responsivo (grid adaptativo)
- ✅ Desktop: 2 colunas (split-view)
- ✅ Tablet: 1 coluna (empilhado)
- ✅ Mobile: 1 coluna (empilhado)
- ✅ Menu lateral colapsável em mobile
- ✅ Cards adaptáveis ao tamanho da tela

---

## 🔔 20. NOTIFICAÇÕES E FEEDBACK

### 20.1. Toasts de Feedback
**Onde aparece:** Canto da tela (geralmente top-right)
**Tipos:**
- Sucesso (verde)
- Erro (vermelho)
- Aviso (amarelo)
- Info (azul)

**Comportamento:**
- Aparece após ações
- Desaparece automaticamente
- Pode ser fechado manualmente

**Micro-funcionalidades:**
- ✅ Toast de sucesso ao criar ticket
- ✅ Toast de sucesso ao atualizar ticket
- ✅ Toast de sucesso ao criar tarefa
- ✅ Toast de sucesso ao completar tarefa
- ✅ Toast de erro se API falhar
- ✅ Toast de aviso se validação falhar
- ✅ Auto-fechar após alguns segundos
- ✅ Botão X para fechar manualmente

---

## 🔐 21. PERMISSÕES E SEGURANÇA

### 21.1. Controle de Acesso
**Onde acontece:** Em todas as funcionalidades
**Comportamento:**
- Super Admin pode criar/editar funis e templates globais
- Usuários normais só podem criar/editar da organização
- Validação de permissões

**Micro-funcionalidades:**
- ✅ Verificar se usuário é super_admin (`isSuperAdmin`)
- ✅ Impedir criação de globais por não-admin
- ✅ Impedir edição de globais por não-admin
- ✅ Impedir exclusão de globais por não-admin
- ✅ Mostrar opções apenas para quem tem permissão
- ✅ Validar permissões no backend (se implementado)

---

## 📊 22. ESTATÍSTICAS E RELATÓRIOS (se implementado)

### 22.1. Dashboard de Métricas
**Onde aparece:** Seção de dashboard (se implementado)
**Elementos visuais:**
- Cards com métricas:
  - Tickets abertos
  - Tickets resolvidos
  - Tempo médio de resolução
  - Taxa de resolução
- Gráficos (se implementado)

**Micro-funcionalidades:**
- ✅ Cards com métricas
- ✅ Contador de tickets abertos
- ✅ Contador de tickets resolvidos
- ✅ Tempo médio de resolução
- ✅ Taxa de resolução
- ✅ Gráficos (se implementado)

---

---

## 📊 RESUMO DA VERIFICAÇÃO - PARTE 5

### ✅ VERIFICADO (via código)

1. **Drag & Drop de Tickets**
   - ✅ Código implementado em `ServicesKanbanBoard.tsx`
   - ✅ Usa `@dnd-kit/core` e `@dnd-kit/sortable`
   - ✅ `PointerSensor` com `activationConstraint`
   - ✅ `onDragEnd` atualiza `stageId`
   - ✅ Salva via API

2. **Controle de Acesso**
   - ✅ Código implementado para verificar `isSuperAdmin`
   - ✅ Validação de permissões no frontend

### ⚠️ PRECISA TESTAR/VERIFICAR (visualmente)

1. **Drag & Drop de Tickets**
   - ⚠️ Arrastar card entre colunas
   - ⚠️ Cursor muda para "grabbing"
   - ⚠️ Card fica semi-transparente
   - ⚠️ Indicador visual de destino
   - ⚠️ Toast de sucesso
   - ⚠️ Atualizar contador de tickets

2. **Drag & Drop de Tarefas**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Ícone GripVertical em cada tarefa
   - ⚠️ Arrastar tarefa para reordenar
   - ⚠️ Atualizar ordem

3. **Tarefas de Anexo (ATTACHMENT)**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Badge "ATTACHMENT"
   - ⚠️ Área de upload
   - ⚠️ Lista de arquivos anexados

4. **Tarefas de Formulário (FORM)**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Badge "FORM"
   - ⚠️ FormTaskViewer com link
   - ⚠️ Renderização de formulário

5. **Busca Avançada**
   - ⚠️ Componente AdvancedSearch
   - ⚠️ Múltiplos filtros
   - ⚠️ Busca em tempo real

6. **Histórico de Mudanças (Audit Log)**
   - ⚠️ Utility `auditLog.ts`
   - ⚠️ Registrar mudanças
   - ⚠️ Exibir histórico

7. **Dependências entre Tarefas**
   - ⚠️ Componente TaskDependencies
   - ⚠️ Definir dependências
   - ⚠️ Validar dependências

8. **Estimativa de Tempo**
   - ⚠️ Componente TimeEstimate
   - ⚠️ Campo `estimatedTime` e `actualTime`
   - ⚠️ Exibir estimativa

9. **Visualização Timeline/Gantt**
   - ⚠️ Componente TimelineView
   - ⚠️ Visualização em timeline
   - ⚠️ Visualização em Gantt

10. **Lembretes por Email**
    - ⚠️ Utility `emailReminders.ts`
    - ⚠️ Configurar lembretes
    - ⚠️ Enviar emails

11. **Integração com Calendário**
    - ⚠️ Utility `calendarIntegration.ts`
    - ⚠️ Sincronizar com calendário
    - ⚠️ Exibir no calendário

12. **Relatórios de Produtividade**
    - ⚠️ Componente ProductivityReports
    - ⚠️ Gerar relatórios
    - ⚠️ Exibir métricas

13. **Modo Offline com Sincronização**
    - ⚠️ Utility `offlineSync.ts`
    - ⚠️ Detectar modo offline
    - ⚠️ Sincronizar quando online

14. **Dashboard de Métricas**
    - ⚠️ Cards com métricas
    - ⚠️ Contador de tickets abertos/resolvidos
    - ⚠️ Tempo médio de resolução
    - ⚠️ Taxa de resolução
    - ⚠️ Gráficos

### 🔍 PRÓXIMAS AÇÕES

1. Testar drag & drop de tickets no Kanban
2. Resolver problema de abrir ticket
3. Verificar todas as funcionalidades avançadas quando conseguir abrir ticket
4. Testar busca avançada
5. Verificar componentes de funcionalidades avançadas

---

**FIM DA PARTE 5 - DOCUMENTO COMPLETO**

