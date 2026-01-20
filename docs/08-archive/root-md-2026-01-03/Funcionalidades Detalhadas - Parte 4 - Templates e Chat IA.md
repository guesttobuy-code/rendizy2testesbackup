# Funcionalidades Detalhadas - Funil de Serviços
## Parte 4: Templates e Chat IA

---

## 📄 9. TEMPLATES (MODELOS)

### 9.1. Salvar Ticket como Modelo
**Onde aparece:** Botão "Salvar como Modelo" no header do ticket
**Elementos visuais:**
- Modal "Salvar como Modelo"
- Campos:
  - Nome do Modelo (obrigatório)
  - Descrição (opcional, textarea)
  - Checkbox "Default Global" (apenas super_admin)
  - Campo "Observação Global" (se Default Global marcado)
- Informações do modelo:
  - Quantidade de tarefas
  - Quantidade de etapas
- Botões: Cancelar, Salvar Modelo

**Comportamento:**
- Validação de nome obrigatório
- Copia todas as tarefas do ticket
- Salva estrutura do funil
- Super admin pode criar modelo global

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ Salvar como Modelo                 │
├─────────────────────────────────────┤
│ Nome do Modelo *:                   │
│ [Modelo Implantação]                │
│                                     │
│ Descrição:                          │
│ [Descreva quando usar...]           │
│                                     │
│ ☑ Default Global (apenas admin)     │
│    Este template será aplicado...   │
│                                     │
│ Observação Global:                  │
│ [Descreva o propósito...]           │
│                                     │
│ Este modelo incluirá:               │
│ • 5 tarefa(s) em 6 etapa(s)        │
│ • Todas as configurações...        │
│                                     │
│ [Cancelar] [Salvar Modelo]          │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Abrir modal ao clicar "Salvar como Modelo"
- ✅ Campo nome (obrigatório, validação)
- ✅ Campo descrição (opcional, textarea)
- ✅ Checkbox "Default Global" (apenas super_admin)
- ✅ Campo "Observação Global" (se Default Global)
- ✅ Informações do modelo (tarefas, etapas)
- ✅ Validação de campos
- ✅ Copiar todas as tarefas do ticket
- ✅ Resetar IDs e status das tarefas
- ✅ Copiar estrutura do funil
- ✅ Salvar via API (`ticketTemplatesApi.create()`)
- ✅ Salvar no localStorage (backup)
- ✅ Toast de sucesso
- ✅ Fechar modal após salvar

---

### 9.2. Criar Ticket a partir de Template
**Onde aparece:** Modal de criação, seção "Criar a partir de modelo"
**Elementos visuais:**
- Select/Dropdown com templates
- Opção "Criar do zero"
- Separador "Modelos Globais"
- Separador "Meus Modelos"
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
  │   - Template padrão para...
  ├─ [🌐 Global] Modelo Suporte
  │   - Template para tickets...
  ├─ ─── Meus Modelos ───
  ├─ Modelo Check-in
  │   - Template para problemas...
  └─ Modelo Manutenção
```

**Micro-funcionalidades:**
- ✅ Carregar templates da API (`ticketTemplatesApi.list()`)
- ✅ Separar templates globais (`isGlobalDefault: true`)
- ✅ Exibir templates globais primeiro
- ✅ Separador visual "Modelos Globais"
- ✅ Separador visual "Meus Modelos"
- ✅ Badge "Global" para templates globais
- ✅ Mostrar descrição do template
- ✅ Opção "Criar do zero"
- ✅ Ao selecionar, preencher tarefas
- ✅ Ao selecionar, copiar estrutura do funil
- ✅ Resetar IDs e status das tarefas
- ✅ Criar ticket com `templateId`

---

### 9.3. Templates Globais (Default Global)
**Onde aparece:** Em todos os lugares onde templates são listados
**Elementos visuais:**
- Badge "Global" com ícone Globe (🌐)
- Aparecem primeiro na lista
- Separador visual "Modelos Globais"
- Checkbox "Default Global" no modal (apenas super_admin)

**Comportamento:**
- Apenas super_admin pode criar/editar templates globais
- Templates globais aparecem para todas as organizações
- Alterações afetam todos os clientes
- Usuários normais não podem editar/excluir templates globais

**O que deve aparecer na tela:**
```
[🌐 Global] Modelo Implantação

No modal de criação/edição (apenas super_admin):
┌─────────────────────────────────────┐
│ ☑ Default Global                   │
│    Este template será aplicado...   │
│                                     │
│ Observação Global:                  │
│ [Descreva o propósito...]           │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Verificar se usuário é super_admin (`isSuperAdmin`)
- ✅ Mostrar checkbox apenas para super_admin
- ✅ Validar que apenas super_admin pode criar globais
- ✅ Impedir edição/exclusão de globais por não-admin
- ✅ Exibir badge "Global" em todos os lugares
- ✅ Salvar `isGlobalDefault: true` e `globalDefaultNote`
- ✅ Filtrar e separar templates globais na listagem
- ✅ Exibir templates globais primeiro

---

### 9.4. Persistência de Templates
**Onde acontece:** API e localStorage
**Comportamento:**
- Salva via API (`ticketTemplatesApi`)
- Backup no localStorage
- Carrega da API, fallback para localStorage

**Micro-funcionalidades:**
- ✅ Salvar template via API (`ticketTemplatesApi.create()`)
- ✅ Salvar no localStorage como backup
- ✅ Carregar templates da API
- ✅ Fallback para localStorage se API falhar
- ✅ Atualizar template via API (`ticketTemplatesApi.update()`)
- ✅ Excluir template via API (`ticketTemplatesApi.delete()`)

---

## 🤖 10. CHAT IA - TAREFAS E AUTOMAÇÕES

### 10.1. Painel do Chat IA
**Onde aparece:** Painel direito do split-view ao abrir ticket
**Elementos visuais:**
- Header: "Chat IA - Tarefas & Automações" com ícone estrela
- Botão X para fechar (opcional)
- Mensagem de boas-vindas do assistente
- Lista de capacidades
- Exemplo de comando
- Campo de input para comandos
- Botão enviar (ícone avião)
- Dica abaixo do input

**Comportamento:**
- Chat com IA para gerenciar tarefas
- Comandos em linguagem natural
- Processa comandos e executa ações

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ ⭐ Chat IA - Tarefas & Automações  │
├─────────────────────────────────────┤
│ 🤖 Olá! Sou o assistente IA do     │
│ Rendizy. Posso ajudar você a:       │
│                                     │
│ • Criar e gerenciar tarefas         │
│ • Atribuir pessoas                  │
│ • Mudar status e etapas             │
│ • Criar automações                  │
│ • E muito mais!                     │
│                                     │
│ Exemplo: 'Criar tarefa 'Verificar  │
│ logs' atribuída a João'             │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ Digite um comando...        │   │
│ │                             │   │
│ └─────────────────────────────┘   │
│ [Enviar ➤]                         │
│                                     │
│ 💡 Dica: Use comandos em linguagem │
│ natural para criar tarefas...      │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Painel direito com chat IA
- ✅ Header com título e ícone
- ✅ Mensagem de boas-vindas
- ✅ Lista de capacidades
- ✅ Exemplo de comando
- ✅ Campo de input para comandos
- ✅ Placeholder com exemplo
- ✅ Botão enviar (ícone avião)
- ✅ Dica abaixo do input
- ✅ Processar comandos em linguagem natural
- ✅ Executar ações baseadas em comandos

---

### 10.2. Comandos do Chat IA
**Tipos de comandos:**
- `CREATE_TASK`: Criar tarefa
- `UPDATE_TASK`: Atualizar tarefa
- `ASSIGN_TASK`: Atribuir tarefa
- `MOVE_STAGE`: Mover para outra etapa
- `CREATE_AUTOMATION`: Criar automação
- `UPDATE_STATUS`: Atualizar status
- `COMPLETE_TASK`: Completar tarefa

**Comportamento:**
- Processa comandos em linguagem natural
- Extrai informações (título, pessoa, data, etc.)
- Executa ação correspondente
- Feedback visual (toast, atualização)

**Exemplos de comandos:**
```
"Criar tarefa 'Verificar logs' atribuída a João"
"Mover ticket para etapa 'Em Análise'"
"Completar tarefa 'Verificar logs'"
"Criar automação que notifica quando ticket muda de etapa"
```

**Micro-funcionalidades:**
- ✅ Processar comandos em linguagem natural
- ✅ Extrair tipo de comando
- ✅ Extrair parâmetros (título, pessoa, data, etc.)
- ✅ Validar comando
- ✅ Executar ação correspondente
- ✅ Criar tarefa via comando
- ✅ Atualizar tarefa via comando
- ✅ Atribuir pessoa via comando
- ✅ Mover para etapa via comando
- ✅ Criar automação via comando
- ✅ Atualizar status via comando
- ✅ Completar tarefa via comando
- ✅ Feedback visual (toast)
- ✅ Atualizar interface após ação

---

### 10.3. Histórico de Mensagens
**Onde aparece:** Dentro do painel do chat IA
**Elementos visuais:**
- Lista de mensagens (user e assistant)
- Cada mensagem mostra:
  - Avatar/ícone
  - Conteúdo
  - Timestamp (opcional)
- Scroll automático para última mensagem

**Comportamento:**
- Mantém histórico da conversa
- Mostra comandos enviados e respostas
- Scroll automático

**O que deve aparecer na tela:**
```
┌─────────────────────────────────────┐
│ 🤖 Olá! Sou o assistente...          │
│                                     │
│ 👤 Criar tarefa 'Verificar logs'   │
│    atribuída a João                 │
│                                     │
│ 🤖 ✅ Tarefa criada com sucesso!    │
│    Tarefa: Verificar logs           │
│    Atribuída a: João Silva          │
│                                     │
│ 👤 Mover ticket para 'Em Análise'   │
│                                     │
│ 🤖 ✅ Ticket movido para etapa      │
│    'Em Análise'                     │
└─────────────────────────────────────┘
```

**Micro-funcionalidades:**
- ✅ Lista de mensagens (user e assistant)
- ✅ Avatar/ícone por tipo de mensagem
- ✅ Conteúdo da mensagem
- ✅ Timestamp (opcional)
- ✅ Scroll automático para última mensagem
- ✅ Manter histórico durante sessão
- ✅ Limpar histórico ao fechar ticket (opcional)

---

### 10.4. Integração com Tarefas
**Onde acontece:** Ao processar comandos do chat
**Comportamento:**
- Comandos do chat criam/atualizam tarefas
- Atualiza interface em tempo real
- Feedback visual

**Micro-funcionalidades:**
- ✅ Criar tarefa via comando do chat
- ✅ Atualizar tarefa via comando do chat
- ✅ Atribuir pessoa via comando do chat
- ✅ Completar tarefa via comando do chat
- ✅ Atualizar lista de tarefas em tempo real
- ✅ Feedback visual (toast, highlight)
- ✅ Sincronizar com painel esquerdo

---

## 📊 11. PROGRESSO E MÉTRICAS

### 11.1. Cálculo de Progresso
**Onde aparece:** Header do ticket e aba Tarefas
**Elementos visuais:**
- Barra de progresso (0-100%)
- Texto "X%"
- Texto "X de Y tarefas completas"

**Comportamento:**
- Calculado automaticamente
- Baseado em tarefas completas vs. total
- Atualiza em tempo real

**O que deve aparecer na tela:**
```
Progresso da Etapa: 50%
2 de 4 tarefas completas
[████████░░] 50%
```

**Micro-funcionalidades:**
- ✅ Calcular progresso: `(tarefasCompletas / totalTarefas) * 100`
- ✅ Filtrar tarefas da etapa atual
- ✅ Contar tarefas completas (`status === 'COMPLETED'`)
- ✅ Contar total de tarefas
- ✅ Mostrar porcentagem
- ✅ Mostrar texto "X de Y tarefas completas"
- ✅ Barra de progresso visual
- ✅ Atualizar automaticamente ao completar tarefa
- ✅ Atualizar `ticket.progress`

---

### 11.2. Barras de Progresso
**Onde aparece:** Header do ticket (topo do split-view)
**Elementos visuais:**
- "Etapa do Funil: X%" com barra azul
- "Progresso das Tarefas: X%" com barra verde
- Porcentagem ao lado da barra

**Comportamento:**
- Progresso da etapa: baseado na posição do ticket no funil
- Progresso das tarefas: baseado em tarefas completas

**O que deve aparecer na tela:**
```
Etapa do Funil: 17%
[████░░░░░░░░░░░░░░] 17%

Progresso das Tarefas: 0%
[░░░░░░░░░░░░░░░░░░] 0%
```

**Micro-funcionalidades:**
- ✅ Barra "Etapa do Funil" (baseada em `stageId` vs. total de etapas)
- ✅ Barra "Progresso das Tarefas" (baseada em tarefas completas)
- ✅ Porcentagem ao lado da barra
- ✅ Cores diferentes (azul e verde)
- ✅ Atualizar automaticamente

---

---

## 📊 RESUMO DA VERIFICAÇÃO - PARTE 4

### ✅ VERIFICADO E FUNCIONANDO

1. **Seleção de Template no Modal de Criação**
   - ✅ Seção "Criar a partir de modelo" aparece
   - ✅ Select/Dropdown aparece com "Criar do zero" selecionado
   - ⚠️ Precisa abrir dropdown para verificar templates globais

### ⚠️ PRECISA TESTAR/VERIFICAR

1. **Salvar Ticket como Modelo**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Botão "Salvar como Modelo" aparece no header
   - ⚠️ Modal "Salvar como Modelo" abre
   - ⚠️ Campo nome (obrigatório)
   - ⚠️ Campo descrição (opcional)
   - ⚠️ Checkbox "Default Global" (apenas super_admin)
   - ⚠️ Campo "Observação Global"
   - ⚠️ Informações do modelo (tarefas, etapas)
   - ⚠️ Salvar via API

2. **Criar Ticket a partir de Template**
   - ⚠️ Abrir dropdown de templates
   - ⚠️ Ver templates globais separados
   - ⚠️ Badge "Global" para templates globais
   - ⚠️ Preencher campos ao selecionar template
   - ⚠️ Copiar tarefas do template

3. **Chat IA**
   - ❌ Não consegui abrir ticket para verificar
   - ⚠️ Painel direito com chat IA
   - ⚠️ Interface de chat
   - ⚠️ Comandos de IA
   - ⚠️ Automações no chat

### 🔍 PRÓXIMAS AÇÕES

1. Resolver problema de abrir ticket
2. Testar abrir dropdown de templates no modal de criação
3. Verificar separação de templates globais
4. Testar salvar ticket como modelo
5. Testar criar ticket a partir de template
6. Verificar chat IA quando conseguir abrir ticket

---

**FIM DA PARTE 4**

