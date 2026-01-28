# 🎯 ROADMAP: Sistema de Tarefas Estilo Asana para Rendizy

**Data:** 2026-01-27  
**Versão:** 2.2  
**Status:** ✅ Fase 2 IMPLEMENTADA - Realtime & Triggers (2026-01-28)  
**Autor:** Rafael + Claude Opus 4.5  
**Última Atualização:** 2026-01-28

---

## 🚀 STATUS DE IMPLEMENTAÇÃO (2026-01-28)

### ✅ FASE 1 - UI COMPONENTS (Completa)

| Componente | Status | Arquivo |
|------------|--------|---------|
| **View Lista** | ✅ Pronto | `components/crm/views/TasksListView.tsx` |
| **View Board/Kanban** | ✅ Pronto | `components/crm/views/TasksBoardView.tsx` |
| **View Calendário** | ✅ Pronto | `components/crm/views/TasksCalendarView.tsx` |
| **Dashboard Avançado** | ✅ Pronto | `components/crm/views/TasksDashboard.tsx` |
| **Gestão de Times** | ✅ Pronto | `components/crm/settings/TeamsConfig.tsx` |
| **Campos Customizados** | ✅ Pronto | `components/crm/settings/CustomFieldsConfig.tsx` |
| **Tarefas Operacionais** | ✅ Pronto | `components/crm/settings/OperationalTasksConfig.tsx` |

### ✅ FASE 1.5 - SUPABASE INTEGRATION (Completa - 2026-01-28)

| Componente | Status | Arquivo |
|------------|--------|---------|
| **Schema de Banco (11 tabelas)** | ✅ Migrado | `supabase/migrations/2026012706_create_crm_tasks_system.sql` |
| **Seed de Dados de Teste** | ✅ Migrado | `supabase/migrations/2026012707_seed_crm_tasks_test_data.sql` |
| **Tipos TypeScript** | ✅ Pronto | `types/crm-tasks.ts` |
| **Service Layer Supabase** | ✅ Pronto | `utils/services/crmTasksService.ts` |
| **React Query Hooks** | ✅ Pronto | `hooks/useCRMTasks.ts` |
| **Modal Criar/Editar Tarefa** | ✅ Pronto | `components/crm/modals/TaskFormModalV2.tsx` |
| **Modal Detalhes Tarefa** | ✅ Pronto | `components/crm/modals/TaskDetailModal.tsx` |
| **Página Check-ins** | ✅ Pronto | `components/crm/pages/operacoes/CheckInsPage.tsx` |
| **Página Check-outs** | ✅ Pronto | `components/crm/pages/operacoes/CheckOutsPage.tsx` |
| **Página Limpezas** | ✅ Pronto | `components/crm/pages/operacoes/LimpezasPage.tsx` |
| **Página Manutenções** | ✅ Pronto | `components/crm/pages/operacoes/ManutencoesPage.tsx` |
| **Página Equipes** | ✅ Pronto | `components/crm/pages/EquipesPage.tsx` |
| **Página Todas Tarefas** | ✅ Pronto | `components/crm/pages/TodasTarefasPage.tsx` |
| **Página Calendário** | ✅ Pronto | `components/crm/pages/CalendarioTarefasPage.tsx` |
| **Index de Exports** | ✅ Pronto | `components/crm/crm-tasks-index.ts` |

### ✅ FASE 2 - REALTIME & AUTOMAÇÕES (Completa - 2026-01-28)

| Componente | Status | Arquivo |
|------------|--------|---------|
| **Realtime Subscriptions** | ✅ Pronto | `hooks/useCRMTasks.ts` |
| **Hook useCRMTasksRealtime** | ✅ Pronto | `hooks/useCRMTasks.ts` |
| **Hook useOperationalTasksRealtime** | ✅ Pronto | `hooks/useCRMTasks.ts` |
| **Hook useGenerateTasksForReservations** | ✅ Pronto | `hooks/useCRMTasks.ts` |
| **Triggers SQL para Reservas** | ✅ Pronto | `supabase/migrations/2026012708_create_operational_tasks_triggers.sql` |
| **Função generate_operational_tasks_from_reservation** | ✅ Pronto | Migration acima |
| **Função cancel_operational_tasks_on_reservation_cancel** | ✅ Pronto | Migration acima |
| **Função update_operational_tasks_on_reservation_change** | ✅ Pronto | Migration acima |
| **RPC generate_tasks_for_existing_reservations** | ✅ Pronto | Migration acima |

### 📊 Funcionalidades Detalhadas

#### Database Schema (700+ linhas)
- ✅ Tabela `teams` com configuração de notificações
- ✅ Tabela `team_members` (internos e externos/terceirizados)
- ✅ Tabela `custom_fields` com opções coloridas
- ✅ Tabela `custom_field_values` (relação polimórfica)
- ✅ Tabela `crm_tasks` com hierarquia (subtarefas)
- ✅ Tabela `task_dependencies` (finish_to_start, start_to_start)
- ✅ Tabela `task_comments` com menções e anexos
- ✅ Tabela `operational_task_templates` (triggers de evento/agendamento)
- ✅ Tabela `operational_tasks` (geradas automaticamente)
- ✅ Tabela `crm_projects` para templates
- ✅ Tabela `task_activities` (histórico)
- ✅ RLS policies por organização
- ✅ Índices para performance
- ✅ Views e RPCs otimizadas

#### View Lista (~900 linhas)
- ✅ Colunas configuráveis (mostrar/ocultar)
- ✅ Ordenação por qualquer coluna
- ✅ Filtros: status, prioridade, responsável, time, datas
- ✅ Ações em lote (bulk actions)
- ✅ Hierarquia visual de subtarefas
- ✅ Edição inline de status

#### View Board/Kanban (~600 linhas)
- ✅ Drag-and-drop entre colunas (@dnd-kit)
- ✅ WIP limits por coluna
- ✅ Colunas colapsáveis
- ✅ Cards com indicadores de prioridade
- ✅ Contador de tarefas por coluna

#### View Calendário (~550 linhas)
- ✅ Visualização por semana
- ✅ Visualização por mês
- ✅ Integração com check-ins/check-outs
- ✅ Mini-cards de tarefas nos dias
- ✅ Indicadores de status

#### Dashboard (~600 linhas)
- ✅ 6 KPIs principais (total, concluídas, atrasadas, SLA em risco, taxa de conclusão, tempo médio)
- ✅ Distribuição por status (gráfico)
- ✅ Performance por equipe (barras)
- ✅ Distribuição por prioridade
- ✅ Tarefas atrasadas e SLA em risco
- ✅ Timeline de atividades recentes

#### Configurações
- ✅ Gestão de Times (criar, editar, membros internos/externos)
- ✅ Campos Customizados (drag reorder, tipos variados, opções coloridas)
- ✅ Tarefas Operacionais (templates com triggers de evento/agendamento)

### 📝 Para Rodar a Migration

```bash
# Executar a migration para criar as tabelas
supabase migration up

# OU via Supabase CLI
supabase db push
```

---

## 📊 PROGRESSO TOTAL DO MÓDULO

```
┌─────────────────────────────────────────────────────────────────┐
│  CRM TASKS v2 - PROGRESSO: ██████████████████░░ 90%            │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Fase 1   - UI Components          100% ████████████████    │
│  ✅ Fase 1.5 - Supabase Integration   100% ████████████████    │
│  ✅ Fase 2   - Realtime & Triggers    100% ████████████████    │
│  ⏳ Fase 3   - Polish & Nice-to-have   20% ████░░░░░░░░░░░░    │
└─────────────────────────────────────────────────────────────────┘
```

### ✅ FASE 2 - REALTIME & AUTOMAÇÕES (Completa)

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Realtime Subscriptions | ✅ Pronto | 🔴 Alta | 2h |
| Integrar views com organizationId real | ✅ Feito | 🔴 Alta | - |
| Remover dados mock residuais | ✅ Feito | 🟡 Média | - |
| Trigger geração de tarefas por reserva | ✅ Pronto | 🔴 Alta | 2h |
| Trigger cancelamento de tarefas | ✅ Pronto | 🔴 Alta | 1h |
| RPC para gerar tarefas retroativamente | ✅ Pronto | 🟡 Média | 1h |
| Hook useGenerateTasksForReservations | ✅ Pronto | 🟡 Média | 0.5h |

### ⏳ FASE 3 - POLISH & NICE-TO-HAVE (Pendente)

| Item | Status | Prioridade | Esforço |
|------|--------|------------|---------|
| Notificações WhatsApp para equipes | ❌ Não iniciado | 🟡 Média | 6h |
| View Timeline/Gantt | ❌ Não iniciado | 🟡 Média | 8h |
| Dependências visuais entre tarefas | ❌ Não iniciado | 🟢 Baixa | 4h |
| Atalhos de teclado | ❌ Não iniciado | 🟢 Baixa | 2h |
| Testes de integração E2E | ⏳ Parcial | 🟡 Média | 4h |

---

### 🎯 STATUS DO MVP

**✅ MVP PRONTO PARA PRODUÇÃO!**

O módulo CRM Tasks v2 está funcional com:
- UI completa (Lista, Board, Calendário, Dashboard)
- Banco de dados com 11+ tabelas
- Service layer integrada com Supabase
- Realtime updates (Supabase Channels)
- Triggers para geração automática de tarefas
- Hooks React Query para todas as operações

**Nice to have (pós-MVP):** ~20h adicionais
- Timeline/Gantt
- Notificações WhatsApp
- Automações avançadas
- Atalhos de teclado

---

### 📝 MIGRATION COMMANDS

```bash
# 1. Criar tabelas e schema
supabase migration up 2026012706_create_crm_tasks_system.sql

# 2. Popular com dados de teste
supabase migration up 2026012707_seed_crm_tasks_test_data.sql

# 3. Criar triggers de automação
supabase migration up 2026012708_create_operational_tasks_triggers.sql
```

---

## 📋 SUMÁRIO

1. [Contexto e Motivação](#1-contexto-e-motivação)
2. [Taxonomia de Tarefas no Rendizy](#2-taxonomia-de-tarefas-no-rendizy)
   - 2.5 [Configurações de Tarefas de Operações](#25-configurações-de-tarefas-de-operações-novo)
   - 2.6 [Gestão de Atividades e Tarefas - Configuração Avançada](#26-gestão-de-atividades-e-tarefas---configuração-avançada-novo)
     - 2.6.1 [Times e Equipes](#261-times-e-equipes)
     - 2.6.2 [Tipos de Tarefas Operacionais](#262-tipos-de-tarefas-operacionais)
     - 2.6.3 [Criar Tarefa Operacional - Detalhado](#263-criar-tarefa-operacional---detalhado)
     - 2.6.4 [Agendamento Cíclico (Recorrente)](#264-agendamento-cíclico-recorrente)
3. [Análise do Asana](#3-análise-do-asana)
4. [Estado Atual do Rendizy](#4-estado-atual-do-rendizy)
5. [Gap Analysis](#5-gap-analysis)
6. [Roadmap de Implementação](#6-roadmap-de-implementação)
7. [Arquitetura Proposta](#7-arquitetura-proposta)
8. [Integração com Notificações e Automações](#8-integração-com-notificações-e-automações)
   - 8.6 [Integração de Times com Sistema de Notificações](#86-integração-de-times-com-sistema-de-notificações-novo)
9. [Referência de UI/UX](#9-referência-de-uiux)

---

## 1. CONTEXTO E MOTIVAÇÃO

### Por que Asana como referência?

O Asana representa o **padrão ouro** em gestão de tarefas e projetos, com uma UX extremamente refinada que permite:
- Múltiplas visualizações dos mesmos dados
- Fluidez no gerenciamento de tarefas
- Automações poderosas
- Colaboração em tempo real

### Objetivo

Criar um sistema de tarefas no Rendizy que combine:
- ✅ A **fluidez e UX do Asana**
- ✅ Os **diferenciais do Rendizy** (chat integrado, AI Agent, funis de serviço)
- ✅ **Integração nativa** com o ecossistema de gestão de imóveis

---

## 2. TAXONOMIA DE TAREFAS NO RENDIZY

### 2.1 Insight Fundamental

> **"Tarefa" não é uma coisa só** - são contextos diferentes que precisam de UX diferentes.

O Rendizy opera em um domínio específico (gestão de imóveis/aluguel por temporada) que gera **4 fontes distintas** de tarefas, cada uma com comportamento único.

### 2.2 As 4 Fontes de Tarefas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FONTES DE TAREFAS NO RENDIZY                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐│
│  │  QUICK TASKS    │  │   PROJETOS &    │  │   OPERAÇÕES     │  │ MANUTEN-││
│  │  (Vendas)       │  │   SERVIÇOS      │  │   (Cíclicas)    │  │ ÇÃO     ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────┬────┘│
│           │                    │                    │                │     │
│    Card no Funil         Template            Automático           Chat     │
│    de Vendas             Replicável          (Reservas)         Hóspede    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 🔵 Fonte 1: Quick Tasks (Funil de Vendas)

**Origem:** Card do negócio no pipeline de vendas  
**Comportamento:** Rápida, objetiva, pontual  
**UX:** Inline no card ou modal compacto

| Tipo | Duração | Exemplo |
|------|---------|---------|
| 📞 Ligação | 15min | Ligar para confirmar interesse |
| 💬 WhatsApp | 15min | Enviar proposta por WhatsApp |
| 🤝 Reunião | 60min | Reunião de apresentação |
| 🔄 Follow-up | 15min | Acompanhar resposta do cliente |
| 📝 Proposta | 30min | Preencher e enviar proposta |

**Já implementado:** Configurações de tipos de tarefa com duração e auto-atribuição.

#### 🟢 Fonte 2: Projetos & Serviços (Templates Replicáveis)

**Origem:** Template criado e replicado para cada cliente/projeto  
**Comportamento:** Sequência estruturada, modelo de implantação  
**UX:** Lista estilo ClickUp/Asana com modal lateral

**Exemplo: Modelo de Implantação de Cliente**
```
MODELO DA IMPLANTAÇÃO (23 de 48 itens)
├── ✅ Tarefas Iniciais
│   ├── ✅ MARIA TERESA e ARTHUR - Reunião ES
│   └── ✅ MARIA TERESA: Limpeza
│       ├── ✅ Limpeza: alinhar com o proprietário a responsabilidade
│       ├── ✅ Explicar as opções de pagamento das limpezas
│       ├── ✅ Caso o proprietário já tenha contato de limpeza, anote
│       └── ✅ Caso existam reservas ativas, esclareça...
├── ○ Implantação
│   ├── ○ ROCHA - Anúncio
│   │   ├── ○ Continuar com o anúncio após o envio das fotos
│   │   ├── ○ Informações na descrição do grupo do proprietário
│   │   └── ○ Solicite que o proprietário confirme o acesso
│   ├── ○ RAFAEL - Precificação
│   │   ├── ○ Apresentar o anúncio ao proprietário
│   │   └── ○ Solicite ao proprietário fazer simulações diferentes
│   └── ○ ARTHUR - Acesso à estadia do proprietário
│       ├── ○ Solicite que o proprietário confirme o acesso
│       ├── ○ Orientar o proprietário a assistir o Link de Treinamento
│       └── ○ Solicite que o proprietário veja o vídeo de bloqueios
└── ○ SUCESSO DO CLIENTE (0 de 7)
    ├── ○ Monitoramento de reservas
    │   ├── ○ 1ª reserva - monitorar, observar avaliação, responder
    │   ├── ○ 2ª reserva - monitorar, observar avaliação, responder
    │   └── ○ 3ª reserva - monitorar, observar avaliação, responder
    └── ○ Pesquisa de Satisfação
        ├── ○ Pesquisa de satisfação com o cliente
        └── ○ Identificar oportunidades de crescimento vertical
```

**Cada linha na lista = Uma instância do template** (ex: Walker Pierre, Gastão Vianna, Luciana)

**Funcionalidades necessárias:**
- ✅ Templates de projeto salvos
- ✅ Duplicar template para novo cliente
- ✅ Hierarquia de subtarefas (múltiplos níveis)
- ✅ Progresso visual (23/48)
- ✅ Agrupamento por status (seções)
- ✅ Atribuição por tarefa
- ✅ Datas de vencimento
- ✅ Activity log lateral

#### 🟡 Fonte 3: Operações (Tarefas Cíclicas)

**Origem:** Automático, gerado a partir de reservas  
**Comportamento:** Cíclico, dependente, recorrente  
**UX:** Espaço separado, timeline visual

```
CICLO OPERACIONAL POR RESERVA
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   📅 RESERVA         →    🔑 CHECK-IN    →    🧹 LIMPEZA   │
│   Confirmada              Executar            Agendar       │
│       │                       │                   │         │
│       └───────────────────────┼───────────────────┘         │
│                               │                             │
│                          🚪 CHECK-OUT                       │
│                           Executar                          │
│                               │                             │
│                          🔄 PRÓXIMO                         │
│                           CICLO                             │
└─────────────────────────────────────────────────────────────┘
```

**Características especiais:**
- 🔗 **Dependências automáticas**: Checkout depende de Check-in
- 📅 **Geração automática**: Criadas quando reserva é confirmada
- 🔄 **Comportamento cíclico**: Cada reserva reinicia o ciclo
- 📍 **Por imóvel**: Agrupamento visual por propriedade

**Tipos de tarefa operacional:**
| Tipo | Trigger | SLA |
|------|---------|-----|
| Check-in | Reserva D-1 | Antes do hóspede chegar |
| Check-out | Checkout D-0 | Após hóspede sair |
| Limpeza | Checkout completado | Antes do próximo check-in |
| Vistoria | Configurable | Após limpeza |

#### 🔴 Fonte 4: Manutenção (Tickets de Suporte)

**Origem:** Chat do hóspede ou detecção interna  
**Comportamento:** Ticket com SLA, notificações bidirecionais  
**UX:** Modal pré-configurado, feedback para hóspede

```
FLUXO DE MANUTENÇÃO
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  💬 HÓSPEDE           →    🎫 TICKET         →   📱 NOTIFY │
│  "Quebrou o chuveiro"      Manutenção criada     Hóspede +  │
│       │                         │                 Time      │
│       │                    ┌────┴────┐                      │
│       │                    │ TRIAGEM │                      │
│       │                    └────┬────┘                      │
│       │                         │                           │
│       │                    ┌────┴────┐                      │
│       │                    │ EXECUÇÃO│                      │
│       │                    └────┬────┘                      │
│       │                         │                           │
│       └─────────────────────────┴──────→ 📱 FEEDBACK        │
│                                          "Resolvido!"       │
└─────────────────────────────────────────────────────────────┘
```

**Campos pré-configurados:**
- Tipo de problema (Elétrica, Hidráulica, Móveis, Ar-condicionado)
- Imóvel (auto-detectado do chat)
- Reserva ativa (auto-linkado)
- Prioridade (baseada em SLA)
- Fotos/Evidências

### 2.3 Proposta de Menu Lateral Reorganizado

```
CRM & Tasks
├── VISÃO GERAL
│   └── 📊 Dashboard
│
├── CLIENTES
│   ├── 💼 Vendas (4)              ← Quick Tasks inline
│   ├── 📁 Projetos & Serviços (5) ← Templates replicados
│   ├── 👥 Contatos (156)
│   ├── 🎯 Leads (32)
│   └── 🏠 Proprietários
│
├── OPERAÇÕES                       ← NOVO GRUPO
│   ├── 🔑 Check-ins Hoje (8)
│   ├── 🚪 Check-outs Hoje (5)
│   ├── 🧹 Limpezas Pendentes (12)
│   └── 🔧 Manutenções (3)
│
├── TAREFAS
│   ├── 📋 Minhas Tarefas (8)
│   ├── 📋 Todas as Tarefas (24)
│   └── 📅 Calendário
│
├── CONFIGURAÇÕES
│   ├── 📝 Tipos de Tarefa
│   ├── 📄 Templates de Projeto
│   ├── ⚡ Automações
│   ├── ⚙️ Prioridades & SLA
│   └── 🔧 Tarefas de Operações     ← NOVA ABA (regras de limpeza por imóvel)
│
└── 🧪 Módulo Beta
```

### 2.4 Matriz de Funcionalidades por Fonte

| Funcionalidade | Quick Tasks | Projetos | Operações | Manutenção |
|----------------|-------------|----------|-----------|------------|
| Templates | ⚠️ Tipos fixos | ✅ Full | ⚠️ Ciclo fixo | ⚠️ Por tipo |
| Subtarefas | ❌ | ✅ Multi-nível | ❌ | ⚠️ Checklist |
| Dependências | ❌ | ✅ Manual | ✅ Auto | ❌ |
| SLA | ❌ | ⚠️ Opcional | ✅ Crítico | ✅ Crítico |
| Atribuição | ✅ Auto/Manual | ✅ Por tarefa | ✅ Por função | ✅ Triagem |
| Chat integrado | ❌ | ⚠️ Opcional | ❌ | ✅ Essencial |
| Notificações | ⚠️ Interna | ⚠️ Interna | ✅ WhatsApp | ✅ WhatsApp |
| Geração | Manual | Manual/Template | Automática | Chat/Manual |

### 2.5 Configurações de Tarefas de Operações (NOVO)

**Localização no Sistema:** Configurações do CRM → Aba "Tarefas de Operações"

#### 2.5.1 Regras de Amarração (Limpeza)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ CONFIGURAÇÕES DE TAREFAS DE OPERAÇÕES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📌 Regras de Limpeza                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Quando gerar tarefa de limpeza?                                    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ ○ Após Check-in  (limpeza intermediária, durante estadia)   │   │   │
│  │  │ ● Após Check-out (padrão - preparar para próximo hóspede)   │   │   │
│  │  │ ○ Ambos (check-in E check-out geram limpeza)                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  Antecedência mínima para próximo check-in:                        │   │
│  │  [  2  ] horas ⓘ Alerta se limpeza não concluída nesse prazo       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📌 Responsabilidade por Imóvel                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Quem é responsável pela limpeza?                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ ○ Imobiliária (equipe interna)                              │   │   │
│  │  │ ○ Proprietário (responsabilidade do dono)                   │   │   │
│  │  │ ○ Terceirizado (empresa externa)                            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  Selecione imóveis para aplicar esta regra:                        │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ ☑ Chalé Aconchego (CHC-001)                                 │   │   │
│  │  │ ☑ Vista Serrana (VTS-002)                                   │   │   │
│  │  │ ☐ Refúgio do Lago (RDL-003)                                 │   │   │
│  │  │ ☐ Cabana Neve (CNV-004)                                     │   │   │
│  │  │ ...                                                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  [Selecionar Todos] [Limpar Seleção] [Aplicar em Lote]             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📌 Atribuição Automática                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Atribuir automaticamente para:                                     │   │
│  │  [ Maria Limpeza (Equipe interna)        ▼ ]                       │   │
│  │                                                                     │   │
│  │  Regra de rodízio:                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ ○ Sem rodízio (sempre mesmo responsável)                    │   │   │
│  │  │ ○ Por disponibilidade                                       │   │   │
│  │  │ ○ Por região/proximidade                                    │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.5.2 Regras por Imóvel (Batch Configuration)

| Campo | Descrição | Tipo |
|-------|-----------|------|
| Limpeza amarrada a | Check-in / Check-out / Ambos | Select |
| Responsável Limpeza | Imobiliária / Proprietário / Terceiro | Select |
| Pessoa/Equipe Default | Dropdown de usuários/equipes | Select |
| SLA Limpeza | Horas antes do próximo check-in | Number |
| Notificar Proprietário | Sim / Não | Toggle |
| Gerar tarefa vistoria | Após limpeza (opcional) | Toggle |

#### 2.5.3 Aplicação em Lote

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 APLICAR REGRAS EM LOTE                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Selecione os imóveis:                                       │
│     [x] Todos (15 imóveis)                                      │
│     [ ] Filtrar por proprietário: [ Selecione... ▼ ]            │
│     [ ] Filtrar por região: [ Selecione... ▼ ]                  │
│                                                                 │
│  2. Configure a regra:                                          │
│     Limpeza amarrada ao: [ Check-out ▼ ]                        │
│     Responsável: [ Imobiliária ▼ ]                              │
│     Atribuir para: [ Maria Limpeza ▼ ]                          │
│     SLA: [ 2 ] horas antes do check-in                          │
│                                                                 │
│  3. Confirme:                                                   │
│     ⚠️ Esta ação vai atualizar 15 imóveis                       │
│                                                                 │
│     [Cancelar]                      [Aplicar em 15 Imóveis]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.5.4 Visualização de Regras Ativas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 REGRAS DE OPERAÇÕES POR IMÓVEL                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔍 Buscar imóvel...                              [+ Nova Regra]            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Imóvel              │ Limpeza   │ Responsável  │ Atribuído │ SLA     │ │
│  ├─────────────────────┼───────────┼──────────────┼───────────┼─────────┤ │
│  │ Chalé Aconchego     │ Checkout  │ Imobiliária  │ Maria     │ 2h      │ │
│  │ Vista Serrana       │ Checkout  │ Proprietário │ -         │ 3h      │ │
│  │ Refúgio do Lago     │ Ambos     │ Imobiliária  │ João      │ 2h      │ │
│  │ Cabana Neve         │ Checkout  │ Terceiro     │ CleanCo   │ 4h      │ │
│  └─────────────────────┴───────────┴──────────────┴───────────┴─────────┘ │
│                                                                             │
│  [Exportar CSV]  [Importar Regras]  [Editar em Lote]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.5.5 Casos de Uso

| Cenário | Configuração |
|---------|--------------|
| **Proprietário cuida da limpeza** | Responsável: Proprietário, Notificar: Sim, SLA: 3h |
| **Imobiliária com equipe interna** | Responsável: Imobiliária, Atribuir: Equipe X, Rodízio: Por disponibilidade |
| **Empresa terceirizada** | Responsável: Terceiro, Atribuir: CleanCo, Notificar proprietário: Sim |
| **Imóvel com limpeza intermediária** | Amarrado: Ambos, Gerar vistoria: Não (limpeza rápida) |
| **Imóvel premium com vistoria** | Amarrado: Checkout, Gerar vistoria: Sim, SLA: 4h |

### 2.6 Gestão de Atividades e Tarefas - Configuração Avançada (NOVO)

**Localização:** Configurações do CRM → Aba "Gestão de Atividades e Tarefas"

Esta seção centraliza a configuração de **todas** as tarefas que podem ser criadas no sistema, incluindo:
- Tarefas condicionais a eventos (check-in, check-out, reserva confirmada)
- Tarefas com agendamento cíclico (semanal, quinzenal, mensal)
- Configuração de Times para atribuição e notificação

---

#### 2.6.1 Times e Equipes

> **Conceito:** Um Time é um grupo de pessoas que compartilham acesso e notificações para determinadas tarefas ou atividades.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  👥 TIMES E EQUIPES                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [+ Novo Time]                                        🔍 Buscar time...     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Time               │ Membros       │ Função           │ Notificações  │ │
│  ├────────────────────┼───────────────┼──────────────────┼───────────────┤ │
│  │ 🧹 Equipe Limpeza  │ Maria, João   │ Limpezas         │ WhatsApp      │ │
│  │ 🔧 Manutenção      │ Pedro, Carlos │ Manutenções      │ WhatsApp+App  │ │
│  │ 🔑 Check-in/out    │ Ana, Lucas    │ Operações        │ App           │ │
│  │ ☕ Serviço Premium │ Juliana       │ Serviços extras  │ WhatsApp      │ │
│  │ 👔 Proprietários   │ Externos      │ Notificação      │ Email+WhatsApp│ │
│  └────────────────────┴───────────────┴──────────────────┴───────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

##### Configuração de Time

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ➕ NOVO TIME                                                      [✕]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Nome do Time *                                                             │
│  [ Equipe de Limpeza                                      ]                 │
│                                                                             │
│  Descrição                                                                  │
│  [ Responsáveis pelas limpezas dos imóveis               ]                 │
│                                                                             │
│  📌 Membros do Time                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ Maria Limpeza      maria@email.com       +55 54 99999-0001       │   │
│  │ ☑ João Auxiliar      joao@email.com        +55 54 99999-0002       │   │
│  │ ☐ Pedro Técnico      pedro@email.com       +55 54 99999-0003       │   │
│  │ ☐ Ana Operações      ana@email.com         +55 54 99999-0004       │   │
│  │ [+ Adicionar membro externo]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📢 Configuração de Notificação                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  Quando notificar o time?                                           │   │
│  │  ☑ Tarefa criada e atribuída ao time                               │   │
│  │  ☑ Tarefa com SLA próximo de vencer                                │   │
│  │  ☑ Tarefa atrasada                                                 │   │
│  │  ☐ Qualquer atualização na tarefa                                  │   │
│  │                                                                     │   │
│  │  Canais de notificação:                                             │   │
│  │  ☑ WhatsApp    ☑ App (Push)    ☐ Email    ☐ SMS                   │   │
│  │                                                                     │   │
│  │  Regra de atribuição dentro do time:                                │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ ○ Notificar todos (qualquer um pode assumir)                │   │   │
│  │  │ ● Rodízio automático (round-robin)                          │   │   │
│  │  │ ○ Por disponibilidade (quem tiver menos tarefas)            │   │   │
│  │  │ ○ Por região/proximidade do imóvel                          │   │   │
│  │  │ ○ Sempre mesmo responsável: [ Maria Limpeza ▼ ]             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Cancelar]                                                    [Salvar]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

##### Estrutura de Dados - Times

```typescript
interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  notification_config: {
    on_task_created: boolean;
    on_sla_approaching: boolean;
    on_task_overdue: boolean;
    on_any_update: boolean;
    channels: ('whatsapp' | 'push' | 'email' | 'sms')[];
  };
  assignment_rule: 'notify_all' | 'round_robin' | 'least_busy' | 'by_region' | 'fixed';
  fixed_assignee_id?: string;
  created_at: Date;
}

interface TeamMember {
  user_id?: string;           // Se for usuário interno
  external_name?: string;     // Se for externo
  external_phone?: string;
  external_email?: string;
  is_active: boolean;
}
```

---

#### 2.6.2 Tipos de Tarefas Operacionais

> **Conceito:** Criar templates de tarefas que podem ser disparadas por eventos ou agendamento.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 TIPOS DE TAREFAS OPERACIONAIS                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [+ Nova Tarefa Operacional]                          🔍 Buscar...          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Nome                    │ Gatilho         │ Time         │ Imóveis    │ │
│  ├─────────────────────────┼─────────────────┼──────────────┼────────────┤ │
│  │ 🧹 Limpeza Padrão       │ Após Checkout   │ Eq. Limpeza  │ Todos      │ │
│  │ ☕ Café da Manhã        │ Check-in (D-0)  │ Serv.Premium │ 3 imóveis  │ │
│  │ 🏊 Limpeza Piscina      │ Toda Segunda    │ Manutenção   │ 5 imóveis  │ │
│  │ 🧽 Faxina Master        │ Mensal          │ Eq. Limpeza  │ 8 imóveis  │ │
│  │ 🔍 Vistoria Trimestral  │ Trimestral      │ Operações    │ Todos      │ │
│  │ 🛏️ Troca Enxoval        │ Quinzenal       │ Eq. Limpeza  │ 4 imóveis  │ │
│  │ 🌳 Jardinagem           │ Mensal          │ Terceirizado │ 2 imóveis  │ │
│  └─────────────────────────┴─────────────────┴──────────────┴────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.6.3 Criar Tarefa Operacional - Detalhado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ➕ NOVA TAREFA OPERACIONAL                                        [✕]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📝 INFORMAÇÕES BÁSICAS                                                     │
│  ──────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  Nome da Tarefa *                                                           │
│  [ Café da Manhã Premium                                  ]                 │
│                                                                             │
│  Descrição / Instruções                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Preparar e entregar café da manhã no quarto do hóspede.            │   │
│  │ - Verificar alergias no cadastro da reserva                        │   │
│  │ - Horário padrão: 8h ou conforme solicitado                        │   │
│  │ - Incluir: frutas, pães, café, suco                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Prioridade: [ Média ▼ ]      Duração Estimada: [ 30 ] min                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🎯 GATILHO (Quando esta tarefa deve ser criada?)                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Tipo de Gatilho:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ● Condicional a Evento                                             │   │
│  │ ○ Agendamento Cíclico (recorrente)                                 │   │
│  │ ○ Manual (criar sob demanda)                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  CONDICIONAL A EVENTO                                                 ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                       ║ │
│  ║  Evento gatilho:                                                      ║ │
│  ║  ┌─────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │ ○ Reserva Confirmada                                            │ ║ │
│  ║  │ ● Check-in (dia do check-in)                                    │ ║ │
│  ║  │ ○ Check-out (dia do checkout)                                   │ ║ │
│  ║  │ ○ Após Check-in Concluído                                       │ ║ │
│  ║  │ ○ Após Check-out Concluído                                      │ ║ │
│  ║  │ ○ Após Limpeza Concluída                                        │ ║ │
│  ║  └─────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                       ║ │
│  ║  Antecedência/Delay:                                                  ║ │
│  ║  Criar tarefa [ 0 ] dias [ antes ▼ ] do evento                       ║ │
│  ║                                                                       ║ │
│  ║  Horário da tarefa:                                                   ║ │
│  ║  ○ Mesmo horário do evento                                            ║ │
│  ║  ● Horário fixo: [ 08:00 ]                                            ║ │
│  ║  ○ X horas antes/depois: [ 2 ] horas [ antes ▼ ]                      ║ │
│  ║                                                                       ║ │
│  ║  Condição adicional (opcional):                                       ║ │
│  ║  ☑ Apenas se reserva tiver tag: [ Premium ▼ ]                        ║ │
│  ║  ☐ Apenas se estadia for maior que [ ] dias                          ║ │
│  ║  ☐ Apenas se for primeira reserva do hóspede                          ║ │
│  ║                                                                       ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  👥 ATRIBUIÇÃO                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Atribuir para:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Pessoa específica: [ Juliana ▼ ]                                 │   │
│  │ ● Time: [ Serviço Premium ▼ ]                                      │   │
│  │ ○ Definir na hora (manual)                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🏠 APLICAR EM QUAIS IMÓVEIS?                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Todos os imóveis                                                 │   │
│  │ ● Imóveis selecionados:                                            │   │
│  │   ┌─────────────────────────────────────────────────────────────┐ │   │
│  │   │ ☑ Chalé Aconchego (CHC-001) - Premium                       │ │   │
│  │   │ ☑ Vista Serrana (VTS-002) - Premium                         │ │   │
│  │   │ ☑ Refúgio do Lago (RDL-003) - Premium                       │ │   │
│  │   │ ☐ Cabana Neve (CNV-004)                                     │ │   │
│  │   │ ☐ Loft Centro (LFC-005)                                     │ │   │
│  │   └─────────────────────────────────────────────────────────────┘ │   │
│  │ ○ Por tag de imóvel: [ Premium ▼ ]                                 │   │
│  │ ○ Por proprietário: [ Selecione... ▼ ]                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Cancelar]                                                    [Salvar]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.6.4 Agendamento Cíclico (Recorrente)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ➕ NOVA TAREFA OPERACIONAL - AGENDAMENTO CÍCLICO                  [✕]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Nome: [ Limpeza da Piscina                              ]                 │
│  Time: [ Equipe Manutenção ▼ ]                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🔄 CONFIGURAÇÃO DE RECORRÊNCIA                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Frequência:                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Diária      ○ Semanal      ○ Quinzenal                           │   │
│  │ ● Mensal      ○ Trimestral   ○ Personalizada                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  CONFIGURAÇÃO SEMANAL                                                 ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                       ║ │
│  ║  Repetir toda:                                                        ║ │
│  ║  ☐ Seg  ● Ter  ☐ Qua  ☐ Qui  ☐ Sex  ☐ Sáb  ☐ Dom                    ║ │
│  ║                                                                       ║ │
│  ║  Horário: [ 09:00 ]                                                   ║ │
│  ║                                                                       ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ╔═══════════════════════════════════════════════════════════════════════╗ │
│  ║  CONFIGURAÇÃO MENSAL                                                  ║ │
│  ╠═══════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                       ║ │
│  ║  Repetir:                                                             ║ │
│  ║  ● No dia [ 15 ] de cada mês                                          ║ │
│  ║  ○ Na [ primeira ▼ ] [ segunda-feira ▼ ] de cada mês                  ║ │
│  ║                                                                       ║ │
│  ║  Horário: [ 10:00 ]                                                   ║ │
│  ║                                                                       ║ │
│  ╚═══════════════════════════════════════════════════════════════════════╝ │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ⚠️ CONFLITO COM RESERVAS                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Se a data agendada coincidir com uma reserva:                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Criar tarefa mesmo assim (será executada com hóspede)            │   │
│  │ ● Adiar para a data mais próxima disponível                        │   │
│  │ ○ Antecipar para antes do check-in                                 │   │
│  │ ○ Pular esta ocorrência                                            │   │
│  │ ○ Notificar para decisão manual                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Limite de adiamento: [ 7 ] dias (se não houver janela, notificar)         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🏠 IMÓVEIS COM ESTA TAREFA                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ☑ Chalé Aconchego (CHC-001) - Tem piscina                                 │
│  ☑ Vista Serrana (VTS-002) - Tem piscina                                   │
│  ☐ Refúgio do Lago (RDL-003) - Sem piscina                                 │
│                                                                             │
│  [Cancelar]                                                    [Salvar]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.6.5 Exemplos de Tarefas Operacionais

| Tarefa | Gatilho | Frequência | Conflito Reserva | Time |
|--------|---------|------------|------------------|------|
| **Café da Manhã** | Check-in D-0 | Por evento | N/A | Serviço Premium |
| **Welcome Pack** | Reserva Confirmada | Por evento | N/A | Operações |
| **Limpeza Piscina** | Toda Segunda 9h | Semanal | Adiar | Manutenção |
| **Faxina Master** | Dia 15 cada mês | Mensal | Adiar | Eq. Limpeza |
| **Troca Enxoval** | A cada 15 dias | Quinzenal | Antecipar | Eq. Limpeza |
| **Vistoria Geral** | Trimestral | Trimestral | Adiar | Supervisor |
| **Jardinagem** | Primeira Seg/mês | Mensal | Criar mesmo | Terceiro |
| **Checklist Pre-VIP** | Check-in D-1 | Por evento | N/A | Operações |
| **Lavagem Ar Cond.** | A cada 3 meses | Trimestral | Adiar | Manutenção |

---

#### 2.6.6 Estrutura de Dados - Tarefas Operacionais

```typescript
interface OperationalTaskTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  instructions?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_duration_minutes: number;
  
  // Gatilho
  trigger_type: 'event' | 'scheduled' | 'manual';
  
  // Se trigger_type = 'event'
  event_trigger?: {
    event: 'reservation_confirmed' | 'checkin_day' | 'checkout_day' | 
           'checkin_completed' | 'checkout_completed' | 'cleaning_completed';
    days_offset: number;      // -1 = dia antes, 0 = mesmo dia, 1 = dia depois
    offset_direction: 'before' | 'after';
    time_mode: 'same_as_event' | 'fixed' | 'offset_hours';
    fixed_time?: string;      // "08:00"
    offset_hours?: number;
    conditions?: {
      reservation_tag?: string;
      min_stay_days?: number;
      first_booking_only?: boolean;
    };
  };
  
  // Se trigger_type = 'scheduled'
  schedule_config?: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
    weekly_days?: number[];    // 0=Dom, 1=Seg, etc
    monthly_day?: number;      // 1-31
    monthly_week?: 'first' | 'second' | 'third' | 'fourth' | 'last';
    monthly_weekday?: number;  // 0-6
    time: string;              // "09:00"
    conflict_resolution: 'create_anyway' | 'postpone' | 'anticipate' | 'skip' | 'notify';
    max_postpone_days?: number;
  };
  
  // Atribuição
  assignment_type: 'person' | 'team' | 'manual';
  assigned_user_id?: string;
  assigned_team_id?: string;
  
  // Escopo
  property_scope: 'all' | 'selected' | 'by_tag' | 'by_owner';
  property_ids?: string[];
  property_tag?: string;
  property_owner_id?: string;
  
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

#### 2.6.7 Visualização Calendário de Tarefas Agendadas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📅 CALENDÁRIO DE TAREFAS OPERACIONAIS              Janeiro 2026           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ◀ Anterior                                                    Próximo ▶   │
│                                                                             │
│  ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐                │
│  │ Dom   │ Seg   │ Ter   │ Qua   │ Qui   │ Sex   │ Sáb   │                │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤                │
│  │       │       │       │   1   │   2   │   3   │   4   │                │
│  │       │       │       │       │       │       │       │                │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤                │
│  │   5   │   6   │   7   │   8   │   9   │  10   │  11   │                │
│  │       │🏊 Pisc│       │       │       │       │       │                │
│  │       │CHC,VTS│       │       │       │       │       │                │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤                │
│  │  12   │  13   │  14   │  15   │  16   │  17   │  18   │                │
│  │       │🏊 Pisc│       │🧽 Fax │       │       │       │                │
│  │       │       │       │Master │       │       │       │                │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤                │
│  │  19   │  20   │  21   │  22   │  23   │  24   │  25   │                │
│  │       │🏊 Pisc│🛏️ Enxo│       │       │       │       │                │
│  │       │⚠️     │val    │       │       │       │       │                │
│  │       │Adiado │       │       │       │       │       │                │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤                │
│  │  26   │  27   │  28   │  29   │  30   │  31   │       │                │
│  │       │🏊 Pisc│       │       │       │       │       │                │
│  └───────┴───────┴───────┴───────┴───────┴───────┴───────┘                │
│                                                                             │
│  Legenda:                                                                   │
│  🏊 Limpeza Piscina  🧽 Faxina Master  🛏️ Troca Enxoval  ⚠️ Conflito       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.6.8 Integração com Operações do Dia

As tarefas criadas (tanto por evento quanto por agendamento) aparecem automaticamente na **tela de Operações do Dia** junto com check-ins, check-outs e limpezas:

```
OPERAÇÕES DO DIA - 27/01/2026
┌────────────────────────────────────────────────────────────────────────────┐
│ 08:00  ☕ Café da Manhã - Chalé Aconchego              [Juliana] ○ Pendente│
│        Reserva: Ana Oliveira (Check-in hoje 15:00)                        │
├────────────────────────────────────────────────────────────────────────────┤
│ 09:00  🏊 Limpeza Piscina - Vista Serrana             [Pedro]   ○ Pendente│
│        Agendamento: Toda Segunda                                          │
├────────────────────────────────────────────────────────────────────────────┤
│ 10:00  🚪 Check-out - Chalé Aconchego                 [João]    ✓ Concluído
│        Hóspede: João Silva                                                │
├────────────────────────────────────────────────────────────────────────────┤
│ 11:00  🧹 Limpeza - Chalé Aconchego                   [Maria]   ◐ Em andamento
│        ⚠️ CHECK-IN HOJE 15:00 - URGENTE                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ 15:00  🔑 Check-in - Chalé Aconchego                  [-]       ○ Pendente│
│        Hóspede: Ana Oliveira (2 hóspedes)                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.1 Estrutura Hierárquica

```
Workspace
└── Projetos
    └── Seções (To do, Doing, Done)
        └── Tarefas
            └── Subtarefas
                └── Sub-subtarefas (opcional)
```

### 3.2 Visualizações (Multi-View)

| View | URL Pattern | Descrição |
|------|-------------|-----------|
| **Lista** | `/list/...` | Tabela com colunas customizáveis |
| **Quadro** | `/board/...` | Kanban com drag & drop |
| **Cronograma** | `/timeline/...` | Gantt horizontal |
| **Calendário** | `/calendar/...` | Visão semanal/mensal |
| **Painel** | `/dashboard/...` | KPIs e gráficos |
| **Fluxo de Trabalho** | `/workflow/...` | Automações visuais |

### 3.3 Componentes do Card/Tarefa

#### Campos Core
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | Texto | ✅ Sim |
| Responsável | User picker | Não |
| Data de conclusão | Date range | Não |
| Projetos | Multi-select | Não |
| Dependências | Relation | Não |

#### Campos Customizados (Custom Fields)
| Campo | Tipo | Exemplo |
|-------|------|---------|
| Priority | Single-select | Low, Medium, High |
| Status | Single-select | On track, At risk, Off track |
| Budget | Number | R$ 1.500,00 |
| Sprint | Single-select | Sprint 1, Sprint 2 |

#### Metadados
- Descrição (rich text)
- Subtarefas
- Comentários
- Anexos
- Histórico de atividades
- Colaboradores

### 3.4 Modal de Detalhes (Task Detail)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [✓ Marcar como concluída]                    [📎] [🔗] [⋯] [→|]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Task 1                                                            │
│                                                                     │
│  Responsável      👤 Guest to Buy  × [Recently assigned ∨]         │
│  Data de conclusão 📅 Hoje - 29 jan ×                              │
│  Projetos         📁 Guest's first project > To do × ×             │
│                   Adicionar aos projetos                           │
│  Dependências     Adicionar dependências                           │
│                                                                     │
│  Campos                                                            │
│  ○ Priority       [Low]                                            │
│  ○ Status         [On track]                                       │
│                                                                     │
│  Descrição                                                         │
│  Do que se trata esta tarefa?                                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Subtarefas                                          [📅] [👤] [>] │
│  ○ ________________________________________________               │
│  [+ Adicionar subtarefa] [✨ Criar rascunhos de subtarefas]        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [Comentários] [Todas as atividades]           [↑ Mais antigos]    │
│                                                                     │
│  👤 Guest to Buy criou esta tarefa · Hoje às 14:36                 │
│                                                                     │
│  [Adicionar um comentário...]                                      │
│                                                                     │
│  Colaboradores: 👤👤 +                          ◉ Sair da tarefa   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Automações (Workflow)

#### Triggers (Quando)
- Tarefa criada
- Tarefa movida para seção X
- Data de vencimento chegou
- Campo X alterado
- Tarefa marcada como concluída

#### Actions (Então)
- Definir responsável
- Adicionar colaboradores
- Adicionar comentário
- Mover para seção
- Definir campo customizado
- Enviar notificação

#### Exemplo de Regra
```
QUANDO: Tarefa movida para "Doing"
ENTÃO: 
  - Definir responsável como criador
  - Adicionar colaboradores do projeto
  - Postar comentário "🚀 Trabalho iniciado!"
```

### 3.6 Formulários

```
┌─────────────────────────────────────────────────────────────────┐
│  [Adicionar imagem de capa]                                     │
│                                                                 │
│  Nome do Projeto                                               │
│  Adicionar a descrição do formulário                           │
│                                                                 │
│  Nome *                                                        │
│  [_________________________________________________]           │
│                                                                 │
│  Endereço de e-mail *                                          │
│  [_________________________________________________]           │
│                                                                 │
│  [Arraste outra pergunta para cá]                              │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │ ⊞ Campos (0)    │  ← Campos customizados do projeto        │
│  │ ✉ Email         │                                           │
│  │ 📎 Anexo        │                                           │
│  │ H₁ Título       │                                           │
│  │ + Nova pergunta │                                           │
│  └─────────────────┘                                           │
│                                                                 │
│  [Descartar] [Enviar feedback]                    [Publicar]   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.7 Dashboard/Painel de Indicadores

| Widget | Tipo | Métricas |
|--------|------|----------|
| KPI Cards | Número grande | Concluídas, Por concluir, Atrasadas, Total |
| Gráfico Barras | Por seção | To do: 3, Doing: 0, Done: 0 |
| Gráfico Donut | Por status | Concluídas vs Pendentes |
| Gráfico Linha | Temporal | Conclusão ao longo do tempo |
| Gráfico Barras | Por responsável | Tarefas por pessoa |

### 3.8 Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Tab` | Próximo campo |
| `Tab + P` | Adicionar a outro projeto |
| `Tab + T` | Adicionar tags |
| `Tab + Bksp` | Excluir tarefa |
| `Shift + Tab + F` | Criar tarefa de acompanhamento |
| `Shift + Tab + D` | Juntar tarefas duplicadas |

---

## 4. ESTADO ATUAL DO RENDIZY

### 4.1 Módulo CRM & Tasks

```
CRM & Tasks
├── VISÃO GERAL
│   └── Dashboard
├── CLIENTES
│   ├── Vendas (4)
│   ├── Serviços (2)        ← Analisado
│   ├── Pré-determinados NEW
│   ├── Contatos (156)
│   ├── Leads (32)
│   └── Proprietários
├── TAREFAS
│   ├── Minhas Tarefas (8)
│   └── Automações
└── Módulo Beta
```

### 4.2 Estrutura de Ticket (Serviços)

```
Funil de Serviços
├── TRIAGEM (1 ticket)
├── EM ANÁLISE (0 tickets)
└── EM RESOLUÇÃO (0 tickets)
```

### 4.3 Ticket Detail (Atual)

**Layout:**
```
┌──────────────────────────────────────┬────────────────────────┐
│  CONTEÚDO PRINCIPAL (70%)            │  CHAT CLIENTE (30%)    │
│                                      │                        │
│  Título + [Salvar como Modelo]       │  👤 Cliente            │
│  [Pendente] [high]                   │  WhatsApp Integration  │
│                                      │                        │
│  Status [dropdown]                   │  💬 Mensagens          │
│                                      │                        │
│  [Tarefas] [Detalhes] [Atividade]    │  🤖 AI Agent           │
│                                      │                        │
│  Progresso da Etapa: 0%              │                        │
│  0 de 0 tarefas completas            │                        │
│                                      │                        │
│  [+ Adicionar Tarefa]                │                        │
└──────────────────────────────────────┴────────────────────────┘
```

### 4.4 Formulário Adicionar Tarefa (Atual)

| Campo | Tipo |
|-------|------|
| Título da tarefa | Input texto |
| Tipo | Dropdown (Tarefa Padrão, Formulário, Anexo) |
| Atribuir a... | User picker |
| Prazo (opcional) | Date picker |

### 4.5 Diferenciais Exclusivos do Rendizy

| Recurso | Descrição |
|---------|-----------|
| 💬 **Chat integrado** | WhatsApp direto no ticket |
| 🤖 **AI Agent** | Automações inteligentes ativas |
| 📊 **Progresso visual duplo** | Etapa do funil + Tarefas |
| 🔄 **Integração com Funil** | Contexto de CRM completo |
| 📱 **WhatsApp nativo** | Comunicação bidirecional |

---

## 5. GAP ANALYSIS

### 5.1 Recursos do Asana vs Rendizy

| Recurso | Asana | Rendizy Atual | Gap | Prioridade |
|---------|-------|---------------|-----|------------|
| **Multi-view Lista** | ✅ | ✅ IMPLEMENTADO | `TasksListView.tsx` | ✅ Completo |
| **Multi-view Kanban** | ✅ | ✅ IMPLEMENTADO | `TasksBoardView.tsx` | ✅ Completo |
| **Multi-view Calendário** | ✅ | ✅ IMPLEMENTADO | `TasksCalendarView.tsx` | ✅ Completo |
| **Multi-view Timeline/Gantt** | ✅ | ❌ | Criar view | 🟢 Baixa |
| **Multi-view Dashboard** | ✅ | ✅ IMPLEMENTADO | `TasksDashboard.tsx` | ✅ Completo |
| **Subtarefas** | ✅ | ✅ IMPLEMENTADO | Hierarquia no schema | ✅ Completo |
| **Dependências** | ✅ | ✅ IMPLEMENTADO | `task_dependencies` table | ✅ Completo |
| **Campos customizados** | ✅ | ✅ IMPLEMENTADO | `CustomFieldsConfig.tsx` | ✅ Completo |
| **Automações visuais** | ✅ | ⚠️ Existe | Melhorar builder | 🟡 Média |
| **Formulários públicos** | ✅ | ❌ | Criar | 🟢 Baixa |
| **Comentários** | ✅ | ✅ IMPLEMENTADO | `task_comments` table | ✅ Completo |
| **Histórico de atividades** | ✅ | ✅ IMPLEMENTADO | `task_activities` table | ✅ Completo |
| **Templates de tarefa** | ✅ | ✅ IMPLEMENTADO | `OperationalTasksConfig.tsx` | ✅ Completo |
| **Atalhos de teclado** | ✅ | ❌ | Criar | 🟢 Baixa |
| **Chat integrado** | ❌ | ✅ | - | ✅ Diferencial |
| **AI Agent** | ❌ | ✅ | - | ✅ Diferencial |
| **Funil de serviços** | ❌ | ✅ | - | ✅ Diferencial |
| **Times e Equipes** | ✅ | ✅ IMPLEMENTADO | `TeamsConfig.tsx` | ✅ Completo |

### 5.2 Priorização

**✅ Fase 1 COMPLETA (Implementada 2026-01-27):**
1. ~~Melhorar UX de subtarefas (hierarquia visual)~~ ✅
2. ~~Campos customizados dinâmicos~~ ✅
3. ~~Multi-view Lista com colunas configuráveis~~ ✅
4. ~~Dependências entre tarefas~~ ✅
5. ~~Dashboard com KPIs avançados~~ ✅
6. ~~Separar Comentários de Atividades~~ ✅
7. ~~View Calendário~~ ✅
8. ~~Times e Equipes~~ ✅
9. ~~Templates de Tarefas Operacionais~~ ✅

**🟡 Média Prioridade (Fase 2):**
4. Melhorar builder de automações
5. Integração com rotas Next.js
6. Realtime com Supabase

**🟢 Baixa Prioridade (Fase 3):**
8. View Timeline/Gantt
9. Formulários públicos
10. Atalhos de teclado

---

## 6. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: Fundação (2-3 semanas)

#### 1.1 Subtarefas Melhoradas
```typescript
interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assignee?: User;
  dueDate?: Date;
  subtasks: Task[];  // Recursivo
  parentId?: string;
  order: number;
}
```

**UI:**
- Checkbox com indentação visual
- Drag & drop para reordenar
- Expandir/colapsar subtarefas
- Contador de subtarefas concluídas

#### 1.2 Campos Customizados
```typescript
interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'single_select' | 'multi_select' | 'date' | 'user';
  options?: { id: string; label: string; color: string }[];
  required: boolean;
}

interface TaskCustomFieldValue {
  taskId: string;
  fieldId: string;
  value: string | number | string[];
}
```

**Tipos de campo:**
- Texto
- Número
- Seleção única (com cores)
- Seleção múltipla
- Data
- Usuário

#### 1.3 View Lista com Colunas

**Colunas padrão:**
| Coluna | Tipo | Largura |
|--------|------|---------|
| ✓ | Checkbox | 40px |
| Nome | Texto | Flex |
| Responsável | Avatar | 120px |
| Data | Date | 120px |
| Priority | Tag | 100px |
| Status | Tag | 100px |

**Funcionalidades:**
- Ordenar por coluna (click no header)
- Redimensionar colunas (drag border)
- Ocultar/mostrar colunas (menu)
- Fixar colunas (pin)

---

### Fase 2: Colaboração (2-3 semanas)

#### 2.1 Dependências
```typescript
interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  type: 'finish_to_start' | 'start_to_start';
}
```

**UI:**
- Campo "Depende de..." no modal
- Linha visual conectando tarefas (timeline view)
- Alerta: "Tarefa bloqueada por dependência"

#### 2.2 Comentários Separados
```typescript
interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;  // Markdown
  mentions: string[];  // User IDs
  attachments: Attachment[];
  createdAt: Date;
  updatedAt?: Date;
}
```

**UI:**
- Aba "Comentários" separada de "Atividade"
- Mention com @usuario
- Upload de anexos
- Editar/excluir próprios comentários

#### 2.3 Dashboard Avançado

**Widgets:**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Concluídas    │   Pendentes     │   Atrasadas     │   Em andamento  │
│       12        │       8         │       3         │       5         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘

┌─────────────────────────────────┬─────────────────────────────────────┐
│   Por Responsável (Barras)      │   Por Prioridade (Donut)           │
│   ████████████ João (15)        │          ┌───┐                      │
│   █████████ Maria (12)          │         /     \                     │
│   ██████ Pedro (9)              │        │ HIGH  │                    │
└─────────────────────────────────┴────────│ 35%   │────────────────────┘
                                           \       /
                                            └─────┘
```

---

### Fase 3: Automação (2-3 semanas)

#### 3.1 Builder de Automações Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│  QUANDO                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Tarefa] [é movida para] [seção] [Doing ▼]                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ENTÃO                                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Definir] [responsável] [como] [criador da tarefa ▼]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [Definir] [Priority] [como] [High ▼]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [+ Adicionar ação]                                                │
│                                                                     │
│  [Cancelar]                                        [Salvar Regra]  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.2 View Calendário

```
┌────────────────────────────────────────────────────────────────────┐
│  < Janeiro 2026 >                              [Semana] [Mês]      │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────────┤
│  DOM  │  SEG  │  TER  │  QUA  │  QUI  │  SEX  │  SAB  │           │
│  26   │  27   │  28   │  29   │  30   │  31   │   1   │           │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────────┤
│       │███████████████████████████████│       │       │ Task 1    │
│       │       │███████████████████████████████│       │ Task 2    │
│       │       │       │███████████████████████████████│ Task 3    │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────────┤
│  + Add│  + Add│  + Add│  + Add│  + Add│  + Add│  + Add│           │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────────┘
```

---

## 7. ARQUITETURA PROPOSTA

### 7.1 Modelo de Dados

```sql
-- Tarefas (já existe, expandir)
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  project_id UUID,           -- Novo: projeto/funil
  section_id UUID,           -- Seção (To do, Doing, Done)
  parent_id UUID,            -- Subtarefa de
  
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(32) DEFAULT 'TODO',
  
  assignee_id UUID,
  due_date DATE,
  due_date_end DATE,         -- Range de datas
  
  priority VARCHAR(32),
  
  order_index INT DEFAULT 0,
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Campos customizados
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  project_id UUID,           -- NULL = global
  
  name TEXT NOT NULL,
  type VARCHAR(32) NOT NULL, -- text, number, single_select, etc
  options JSONB,             -- Para selects
  required BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores dos campos customizados
CREATE TABLE task_custom_field_values (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL,
  field_id UUID NOT NULL,
  value JSONB NOT NULL,
  
  UNIQUE(task_id, field_id)
);

-- Dependências
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL,
  depends_on_task_id UUID NOT NULL,
  type VARCHAR(32) DEFAULT 'finish_to_start',
  
  UNIQUE(task_id, depends_on_task_id)
);

-- Comentários
CREATE TABLE task_comments (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================================================
-- TIMES E EQUIPES (NOVO)
-- ============================================================================

CREATE TABLE teams (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuração de notificação
  notify_on_task_created BOOLEAN DEFAULT TRUE,
  notify_on_sla_approaching BOOLEAN DEFAULT TRUE,
  notify_on_task_overdue BOOLEAN DEFAULT TRUE,
  notify_on_any_update BOOLEAN DEFAULT FALSE,
  notification_channels TEXT[] DEFAULT ARRAY['push'], -- 'whatsapp', 'push', 'email', 'sms'
  
  -- Regra de atribuição
  assignment_rule VARCHAR(32) DEFAULT 'notify_all', -- 'notify_all', 'round_robin', 'least_busy', 'by_region', 'fixed'
  fixed_assignee_id UUID,
  last_assigned_index INT DEFAULT 0, -- Para round-robin
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Membro interno (usuário do sistema)
  user_id UUID,
  
  -- Membro externo (terceirizado)
  external_name TEXT,
  external_phone TEXT,
  external_email TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: deve ter user_id OU dados externos
  CONSTRAINT member_has_identity CHECK (
    user_id IS NOT NULL OR 
    (external_name IS NOT NULL AND (external_phone IS NOT NULL OR external_email IS NOT NULL))
  )
);

-- ============================================================================
-- TAREFAS OPERACIONAIS (Templates)
-- ============================================================================

CREATE TABLE operational_task_templates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  priority VARCHAR(32) DEFAULT 'medium',
  estimated_duration_minutes INT DEFAULT 30,
  
  -- Tipo de gatilho
  trigger_type VARCHAR(32) NOT NULL, -- 'event', 'scheduled', 'manual'
  
  -- Configuração de evento (se trigger_type = 'event')
  event_config JSONB,
  /*
  {
    "event": "checkin_day",
    "days_offset": 0,
    "offset_direction": "before",
    "time_mode": "fixed",
    "fixed_time": "08:00",
    "conditions": {
      "reservation_tag": "Premium",
      "min_stay_days": 3
    }
  }
  */
  
  -- Configuração de agendamento (se trigger_type = 'scheduled')
  schedule_config JSONB,
  /*
  {
    "frequency": "weekly",
    "weekly_days": [1], // Segunda
    "time": "09:00",
    "conflict_resolution": "postpone",
    "max_postpone_days": 7
  }
  */
  
  -- Atribuição
  assignment_type VARCHAR(32) DEFAULT 'team', -- 'person', 'team', 'manual'
  assigned_user_id UUID,
  assigned_team_id UUID REFERENCES teams(id),
  
  -- Escopo de imóveis
  property_scope VARCHAR(32) DEFAULT 'all', -- 'all', 'selected', 'by_tag', 'by_owner'
  property_ids UUID[],
  property_tag TEXT,
  property_owner_id UUID,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas geradas a partir dos templates
CREATE TABLE operational_tasks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_id UUID REFERENCES operational_task_templates(id),
  
  -- Contexto
  property_id UUID NOT NULL,
  reservation_id UUID,
  
  -- Dados da tarefa
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  priority VARCHAR(32),
  
  -- Agendamento
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  original_date DATE, -- Se foi adiada
  postponed_reason TEXT,
  
  -- Status
  status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled', 'skipped'
  
  -- Atribuição
  assigned_user_id UUID,
  assigned_team_id UUID REFERENCES teams(id),
  
  -- Execução
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_operational_tasks_date ON operational_tasks(scheduled_date);
CREATE INDEX idx_operational_tasks_property ON operational_tasks(property_id);
CREATE INDEX idx_operational_tasks_status ON operational_tasks(status);
```

### 7.2 Componentes React

```
components/tasks/
├── TasksModule.tsx              # Cápsula principal
├── views/
│   ├── TaskListView.tsx         # Visualização Lista
│   ├── TaskBoardView.tsx        # Visualização Kanban
│   ├── TaskCalendarView.tsx     # Visualização Calendário
│   └── TaskDashboardView.tsx    # Dashboard
├── components/
│   ├── TaskCard.tsx             # Card em lista/kanban
│   ├── TaskDetailModal.tsx      # Modal de detalhes
│   ├── TaskForm.tsx             # Formulário criar/editar
│   ├── SubtasksList.tsx         # Lista de subtarefas
│   ├── CustomFieldsEditor.tsx   # Editor de campos
│   ├── DependencyPicker.tsx     # Seletor de dependências
│   ├── CommentsList.tsx         # Lista de comentários
│   └── ActivityLog.tsx          # Log de atividades
├── hooks/
│   ├── useTasks.ts              # CRUD de tarefas
│   ├── useSubtasks.ts           # Gerenciar subtarefas
│   ├── useCustomFields.ts       # Campos customizados
│   └── useTaskFilters.ts        # Filtros e ordenação
└── utils/
    ├── taskHelpers.ts           # Funções auxiliares
    └── taskValidation.ts        # Validações

components/settings/
├── teams/
│   ├── TeamsListView.tsx        # Lista de times
│   ├── TeamFormModal.tsx        # Criar/editar time
│   └── TeamMembersPicker.tsx    # Seletor de membros
├── operational-tasks/
│   ├── OperationalTasksConfig.tsx    # Configuração geral
│   ├── OperationalTaskForm.tsx       # Criar/editar template
│   ├── EventTriggerConfig.tsx        # Config de gatilho evento
│   ├── ScheduleConfig.tsx            # Config de agendamento
│   └── PropertyScopeSelector.tsx     # Seletor de imóveis
└── hooks/
    ├── useTeams.ts                   # CRUD de times
    ├── useOperationalTasks.ts        # CRUD de tarefas operacionais
    └── useTaskScheduler.ts           # Lógica de agendamento
```

---

## 8. INTEGRAÇÃO COM NOTIFICAÇÕES E AUTOMAÇÕES

### 8.1 Visão da Arquitetura Existente

O Rendizy já possui um sistema robusto de notificações e automações que **DEVE** ser aproveitado:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTOMATION ENGINE                                   │
│                      (automation-engine.ts)                                  │
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│   │ Trigger      │ →  │ Conditions   │ →  │ Actions      │                 │
│   │ (Evento)     │    │ (Filtros)    │    │ (Execução)   │                 │
│   └──────────────┘    └──────────────┘    └──────────────┘                 │
│                                                  │                          │
│                                    ┌─────────────┼─────────────┐            │
│                                    ▼             ▼             ▼            │
│                            ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│                            │create_task│ │  notify   │ │  webhook  │       │
│                            └───────────┘ └───────────┘ └───────────┘       │
│                                                  │                          │
└──────────────────────────────────────────────────┼──────────────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NOTIFICATION DISPATCHER                                │
│                         (dispatcher.ts)                                      │
│                                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ sendEmail   │  │  sendSms    │  │sendWhatsApp │  │ sendInApp   │       │
│   │  (Resend/   │  │  (Brevo)    │  │ (Evolution) │  │ (Dashboard) │       │
│   │   Brevo)    │  │             │  │             │  │             │       │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.5.2 Triggers de Tarefas (Novos)

Adicionar ao `TRIGGER_TYPE_ALIASES` no `automation-engine.ts`:

```typescript
const TRIGGER_TYPE_ALIASES: Record<string, string[]> = {
  // ... existentes ...
  
  // NOVOS - TAREFAS
  'task_created': ['task_created', 'tarefa_criada', 'new_task'],
  'task_completed': ['task_completed', 'tarefa_concluida', 'task_done'],
  'task_overdue': ['task_overdue', 'tarefa_atrasada', 'task_late'],
  'task_assigned': ['task_assigned', 'tarefa_atribuida', 'task_delegated'],
  'task_status_changed': ['task_status_changed', 'status_alterado', 'task_moved'],
  
  // NOVOS - PROJETOS
  'project_created': ['project_created', 'projeto_criado', 'new_project'],
  'project_completed': ['project_completed', 'projeto_concluido'],
  'project_milestone': ['project_milestone', 'marco_atingido', 'milestone_reached'],
  
  // NOVOS - OPERAÇÕES
  'checkin_due': ['checkin_due', 'checkin_hoje', 'checkin_approaching'],
  'checkout_due': ['checkout_due', 'checkout_hoje', 'checkout_approaching'],
  'cleaning_due': ['cleaning_due', 'limpeza_pendente', 'cleaning_needed'],
  'maintenance_created': ['maintenance_created', 'manutencao_criada'],
  'maintenance_resolved': ['maintenance_resolved', 'manutencao_resolvida'],
};
```

### 8.5.3 Actions para Tarefas (Novos)

Adicionar ao `executeAction` no `automation-engine.ts`:

```typescript
// ─────────────────────────────────────────────────────────────
// ATRIBUIR TAREFA
// ─────────────────────────────────────────────────────────────
case 'assign_task':
case 'atribuir_tarefa': {
  const supabase = getSupabaseClient();
  const taskId = action.payload?.task_id || eventPayload.taskId;
  const assigneeId = action.payload?.assignee_id || action.payload?.user_id;
  
  const { error } = await supabase
    .from('tasks')
    .update({ assignee_id: assigneeId, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('organization_id', organizationId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// MOVER TAREFA PARA SEÇÃO
// ─────────────────────────────────────────────────────────────
case 'move_task':
case 'mover_tarefa': {
  const supabase = getSupabaseClient();
  const taskId = action.payload?.task_id || eventPayload.taskId;
  const sectionId = action.payload?.section_id;
  const status = action.payload?.status;
  
  const updates: any = { updated_at: new Date().toISOString() };
  if (sectionId) updates.section_id = sectionId;
  if (status) updates.status = status;
  
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('organization_id', organizationId);
    
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// CRIAR SUBTAREFA
// ─────────────────────────────────────────────────────────────
case 'create_subtask':
case 'criar_subtarefa': {
  const supabase = getSupabaseClient();
  const parentId = action.payload?.parent_id || eventPayload.taskId;
  
  let taskTitle = replaceVariables(action.payload?.title || 'Subtarefa automática');
  
  const { error } = await supabase.from('tasks').insert({
    organization_id: organizationId,
    parent_id: parentId,
    title: taskTitle,
    status: 'TODO',
    created_at: new Date().toISOString(),
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// DUPLICAR TEMPLATE DE PROJETO
// ─────────────────────────────────────────────────────────────
case 'duplicate_project_template':
case 'duplicar_modelo_projeto': {
  // Chamar função RPC que duplica projeto com todas as tarefas
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('duplicate_project_template', {
    p_template_id: action.payload?.template_id,
    p_organization_id: organizationId,
    p_new_name: replaceVariables(action.payload?.new_name || '{{contact_name}} - Projeto'),
    p_linked_contact_id: eventPayload.contactId || action.payload?.contact_id,
  });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
```

### 8.5.4 Fluxo de Integração Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO: TAREFA → AUTOMAÇÃO → NOTIFICAÇÃO                  │
└─────────────────────────────────────────────────────────────────────────────┘

EXEMPLO 1: Tarefa Atribuída
─────────────────────────────────────────
                                    
   ┌──────────────┐                 
   │ UI: Atribuir │                 
   │   tarefa     │                 
   └──────┬───────┘                 
          │                         
          ▼                         
   ┌──────────────┐    ┌──────────────────────────────────────────┐
   │ triggerEvent │ →  │ automation_engine.processAutomationTrigger │
   │ 'task_assigned'│  │   - Busca automações com esse trigger      │
   └──────────────┘    │   - Avalia condições (prioridade=alta?)    │
          │            │   - Executa actions                        │
          │            └───────────────────┬──────────────────────┘
          │                                │
          │            ┌───────────────────┼───────────────────┐
          │            ▼                   ▼                   ▼
          │    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
          │    │ notify        │  │ send_whatsapp │  │ send_email    │
          │    │ (dashboard)   │  │ (responsável) │  │ (responsável) │
          │    └───────────────┘  └───────────────┘  └───────────────┘
          │                                │
          │                                ▼
          │                    ┌───────────────────────┐
          │                    │ notification_dispatcher │
          │                    │   - Seleciona provider  │
          │                    │   - Envia mensagem      │
          │                    │   - Loga resultado      │
          │                    └───────────────────────┘


EXEMPLO 2: Check-in Automático (Operações)
─────────────────────────────────────────

   ┌──────────────┐                 
   │ Cron Job     │    (roda todo dia às 6h)
   │ /api/cron/   │                 
   │ process-ops  │                 
   └──────┬───────┘                 
          │                         
          ▼                         
   ┌──────────────────────┐        
   │ SELECT reservations  │        
   │ WHERE checkin = TODAY│        
   └──────┬───────────────┘        
          │                         
          │  para cada reserva:     
          ▼                         
   ┌──────────────────────┐    ┌─────────────────────────────────────┐
   │ INSERT task          │    │ automation_engine.triggerEvent      │
   │ type: 'checkin'      │ →  │   type: 'checkin_due'               │
   │ property_id: X       │    │   payload: { reservation, property }│
   └──────────────────────┘    └──────────────────┬──────────────────┘
                                                  │
                                 ┌────────────────┼────────────────┐
                                 ▼                ▼                ▼
                         ┌───────────┐    ┌───────────┐    ┌───────────┐
                         │ WhatsApp  │    │ Dashboard │    │ Assign to │
                         │ Hóspede   │    │ Notif     │    │ Operator  │
                         └───────────┘    └───────────┘    └───────────┘


EXEMPLO 3: Manutenção via Chat
─────────────────────────────────────────

   ┌──────────────────────┐                 
   │ Hóspede no Chat:     │                 
   │ "Quebrou o chuveiro" │                 
   └──────┬───────────────┘                 
          │                         
          ▼                         
   ┌──────────────────────┐    ┌─────────────────────────────────────┐
   │ AI Agent detecta     │    │ automation_engine.triggerEvent      │
   │ intent: manutenção   │ →  │   type: 'maintenance_created'       │
   └──────────────────────┘    │   payload: { category: 'hidraulica'}│
          │                    └──────────────────┬──────────────────┘
          ▼                                       │
   ┌──────────────────────┐          ┌────────────┼────────────┐
   │ CREATE task          │          ▼            ▼            ▼
   │ type: 'maintenance'  │   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │ category: 'hidraulica'│  │ Notifica  │ │ Cria card │ │ Responde  │
   │ linked_reservation   │   │ time      │ │ Triagem   │ │ hóspede   │
   └──────────────────────┘   └───────────┘ └───────────┘ └───────────┘
```

### 8.5.5 Templates de Notificação para Tarefas

Adicionar à Fase 5 do Roadmap de Notificações:

| Template | Trigger | Canais | Variáveis |
|----------|---------|--------|-----------|
| Tarefa Atribuída | `task_assigned` | In-app, Email | `{{taskTitle}}`, `{{assigneeName}}`, `{{dueDate}}` |
| Tarefa Vencendo | `task_due_soon` | In-app, WhatsApp | `{{taskTitle}}`, `{{hoursRemaining}}` |
| Tarefa Atrasada | `task_overdue` | In-app, Email, SMS | `{{taskTitle}}`, `{{daysOverdue}}` |
| Projeto Iniciado | `project_created` | In-app | `{{projectName}}`, `{{tasksCount}}` |
| Check-in Hoje | `checkin_due` | WhatsApp (hóspede + time) | `{{guestName}}`, `{{propertyName}}`, `{{checkinTime}}` |
| Checkout Hoje | `checkout_due` | WhatsApp | `{{guestName}}`, `{{checkoutTime}}` |

### 8.6 Integração de Times com Sistema de Notificações (NOVO)

#### 8.6.1 Fluxo de Notificação para Times

```
FLUXO: TAREFA OPERACIONAL → TIME → MEMBROS
─────────────────────────────────────────────────────────────────────

   ┌────────────────────────┐                 
   │ Tarefa Criada          │  (Ex: Limpeza Piscina - Segunda 9h)
   │ assigned_team_id: X    │                 
   └──────────┬─────────────┘                 
              │                         
              ▼                         
   ┌────────────────────────────────────────────────────────────────┐
   │                    TEAM NOTIFICATION SERVICE                    │
   ├────────────────────────────────────────────────────────────────┤
   │                                                                │
   │  1. Buscar configuração do Time                                │
   │     SELECT * FROM teams WHERE id = X                           │
   │                                                                │
   │  2. Aplicar regra de atribuição:                               │
   │     ┌─────────────────────────────────────────────────────┐   │
   │     │ notify_all   → Notificar TODOS os membros           │   │
   │     │ round_robin  → Atribuir e notificar próximo da fila │   │
   │     │ least_busy   → Atribuir ao com menos tarefas        │   │
   │     │ by_region    → Atribuir ao mais próximo do imóvel   │   │
   │     │ fixed        → Sempre para o mesmo membro           │   │
   │     └─────────────────────────────────────────────────────┘   │
   │                                                                │
   │  3. Buscar membros do time                                     │
   │     SELECT * FROM team_members WHERE team_id = X               │
   │                                                                │
   │  4. Para cada membro, enviar nos canais configurados:          │
   │     notification_channels: ['whatsapp', 'push']                │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
              │
              ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │   Maria (WhatsApp + Push)    João (WhatsApp + Push)            │
   │   ┌───────────────────┐      ┌───────────────────┐             │
   │   │ 🏊 Nova tarefa:   │      │ 🏊 Nova tarefa:   │             │
   │   │ Limpeza Piscina   │      │ Limpeza Piscina   │             │
   │   │ Vista Serrana     │      │ Vista Serrana     │             │
   │   │ Seg 27/01 - 9h    │      │ Seg 27/01 - 9h    │             │
   │   │                   │      │                   │             │
   │   │ [Aceitar] [Ver]   │      │ [Aceitar] [Ver]   │             │
   │   └───────────────────┘      └───────────────────┘             │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘
```

#### 8.6.2 Action: Notificar Time

Adicionar ao `executeAction` no `automation-engine.ts`:

```typescript
// ─────────────────────────────────────────────────────────────
// NOTIFICAR TIME
// ─────────────────────────────────────────────────────────────
case 'notify_team':
case 'notificar_time': {
  const supabase = getSupabaseClient();
  const teamId = action.payload?.team_id;
  const message = replaceVariables(action.payload?.message || 'Nova tarefa atribuída');
  const taskId = action.payload?.task_id || eventPayload.taskId;
  
  // 1. Buscar configuração do time
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*, team_members(*)')
    .eq('id', teamId)
    .single();
  
  if (teamError || !team) {
    return { success: false, error: 'Time não encontrado' };
  }
  
  // 2. Aplicar regra de atribuição
  let assignedMember = null;
  if (team.assignment_rule === 'round_robin') {
    const members = team.team_members.filter((m: any) => m.is_active);
    const nextIndex = (team.last_assigned_index + 1) % members.length;
    assignedMember = members[nextIndex];
    
    // Atualizar índice
    await supabase
      .from('teams')
      .update({ last_assigned_index: nextIndex })
      .eq('id', teamId);
      
    // Atribuir tarefa
    if (taskId) {
      await supabase
        .from('operational_tasks')
        .update({ assigned_user_id: assignedMember.user_id })
        .eq('id', taskId);
    }
  }
  
  // 3. Determinar quem notificar
  const membersToNotify = team.assignment_rule === 'notify_all' 
    ? team.team_members.filter((m: any) => m.is_active)
    : [assignedMember];
  
  // 4. Enviar notificações nos canais configurados
  const channels = team.notification_channels || ['push'];
  
  for (const member of membersToNotify) {
    for (const channel of channels) {
      if (channel === 'whatsapp' && member.external_phone) {
        await sendWhatsApp({
          to: member.external_phone,
          message: message,
          organizationId
        });
      }
      if (channel === 'push' && member.user_id) {
        await sendInAppNotification({
          userId: member.user_id,
          title: 'Nova Tarefa',
          body: message,
          organizationId
        });
      }
      if (channel === 'email') {
        const email = member.external_email || await getUserEmail(member.user_id);
        if (email) {
          await sendEmail({
            to: email,
            subject: 'Nova Tarefa Atribuída',
            body: message,
            organizationId
          });
        }
      }
    }
  }
  
  return { success: true };
}
```

#### 8.6.3 Triggers de Tarefas Operacionais (NOVOS)

Adicionar ao `TRIGGER_TYPE_ALIASES`:

```typescript
const TRIGGER_TYPE_ALIASES: Record<string, string[]> = {
  // ... existentes ...
  
  // TAREFAS OPERACIONAIS
  'operational_task_created': ['operational_task_created', 'tarefa_operacional_criada'],
  'operational_task_due': ['operational_task_due', 'tarefa_operacional_vencendo'],
  'operational_task_overdue': ['operational_task_overdue', 'tarefa_operacional_atrasada'],
  'operational_task_completed': ['operational_task_completed', 'tarefa_operacional_concluida'],
  
  // AGENDAMENTO CÍCLICO
  'scheduled_task_generated': ['scheduled_task_generated', 'tarefa_agendada_gerada'],
  'scheduled_task_postponed': ['scheduled_task_postponed', 'tarefa_agendada_adiada'],
  'scheduled_task_conflict': ['scheduled_task_conflict', 'conflito_agendamento'],
};
```

#### 8.6.4 Cron Job: Gerador de Tarefas Agendadas

```typescript
// /api/cron/generate-scheduled-tasks.ts

export async function generateScheduledTasks() {
  const supabase = getSupabaseClient();
  const today = new Date();
  
  // 1. Buscar templates ativos com agendamento
  const { data: templates } = await supabase
    .from('operational_task_templates')
    .select('*, teams(*)')
    .eq('trigger_type', 'scheduled')
    .eq('is_active', true);
  
  for (const template of templates || []) {
    // 2. Verificar se deve gerar hoje
    const shouldGenerate = checkSchedule(template.schedule_config, today);
    if (!shouldGenerate) continue;
    
    // 3. Buscar imóveis do escopo
    const properties = await getPropertiesForScope(template);
    
    for (const property of properties) {
      // 4. Verificar conflito com reservas
      const hasConflict = await checkReservationConflict(property.id, today);
      
      let scheduledDate = today;
      let postponedReason = null;
      
      if (hasConflict) {
        const resolution = template.schedule_config.conflict_resolution;
        
        if (resolution === 'skip') {
          continue; // Pular esta ocorrência
        } else if (resolution === 'postpone') {
          scheduledDate = await findNextAvailableDate(property.id, today, template.schedule_config.max_postpone_days);
          postponedReason = 'Adiado por conflito com reserva';
        } else if (resolution === 'anticipate') {
          scheduledDate = await findPreviousAvailableDate(property.id, today);
          postponedReason = 'Antecipado por conflito com reserva';
        } else if (resolution === 'notify') {
          // Criar tarefa mas notificar para decisão manual
          await notifyConflict(template, property, today);
        }
        // 'create_anyway' - não faz nada, cria normalmente
      }
      
      // 5. Criar tarefa operacional
      const { data: task } = await supabase
        .from('operational_tasks')
        .insert({
          organization_id: template.organization_id,
          template_id: template.id,
          property_id: property.id,
          title: template.name,
          description: template.description,
          instructions: template.instructions,
          priority: template.priority,
          scheduled_date: scheduledDate,
          scheduled_time: template.schedule_config.time,
          original_date: hasConflict ? today : null,
          postponed_reason: postponedReason,
          assigned_team_id: template.assigned_team_id,
          assigned_user_id: template.assigned_user_id,
          status: 'pending'
        })
        .select()
        .single();
      
      // 6. Disparar trigger para notificações
      if (task) {
        await triggerEvent('scheduled_task_generated', {
          taskId: task.id,
          templateId: template.id,
          propertyId: property.id,
          teamId: template.assigned_team_id,
          organizationId: template.organization_id
        });
        
        // 7. Notificar time
        if (template.assigned_team_id) {
          await executeAction(
            { type: 'notify_team', payload: { team_id: template.assigned_team_id, task_id: task.id } },
            { taskId: task.id, taskTitle: template.name, propertyName: property.name },
            template.organization_id
          );
        }
      }
    }
  }
}
```
| Limpeza Necessária | `cleaning_due` | WhatsApp, In-app | `{{propertyName}}`, `{{nextCheckin}}` |
| Manutenção Criada | `maintenance_created` | In-app, WhatsApp | `{{category}}`, `{{guestName}}`, `{{propertyName}}` |
| Manutenção Resolvida | `maintenance_resolved` | WhatsApp (hóspede) | `{{resolution}}`, `{{resolvedBy}}` |

### 8.5.6 Automações Pré-definidas para Tarefas

Automações que serão criadas automaticamente (templates):

```typescript
// 1. Notificar quando tarefa de alta prioridade for criada
{
  name: 'Alerta: Tarefa Urgente',
  trigger: { type: 'task_created' },
  conditions: [
    { field: 'priority', operator: 'equals', value: 'urgent' }
  ],
  actions: [
    { type: 'notification', channel: 'in_app', template: '🚨 Tarefa urgente: {{taskTitle}}' },
    { type: 'notification', channel: 'email', payload: { to: '{{assignee.email}}' } }
  ]
}

// 2. Lembrete de tarefa vencendo
{
  name: 'Lembrete: Tarefa vence em 24h',
  trigger: { type: 'task_due_soon', threshold: 24 }, // 24 horas
  conditions: [
    { field: 'status', operator: 'not_equals', value: 'DONE' }
  ],
  actions: [
    { type: 'notification', channel: 'in_app', template: '⏰ Tarefa vence amanhã: {{taskTitle}}' }
  ]
}

// 3. Criar tarefas de check-in automaticamente
{
  name: 'Auto: Criar tarefa de check-in',
  trigger: { type: 'reservation_created' },
  conditions: [],
  actions: [
    { 
      type: 'create_task', 
      payload: {
        title: 'Check-in: {{guestName}} - {{propertyName}}',
        type: 'checkin',
        due_date: '{{checkinDate}}',
        linked_reservation_id: '{{reservationId}}'
      }
    }
  ]
}

// 4. Duplicar projeto quando contrato fechado
{
  name: 'Auto: Iniciar Implantação de Cliente',
  trigger: { type: 'deal_won' },
  conditions: [],
  actions: [
    {
      type: 'duplicate_project_template',
      payload: {
        template_id: 'modelo-implantacao-uuid',
        new_name: '{{contactName}} - Implantação'
      }
    },
    { type: 'notification', channel: 'in_app', template: '🎉 Projeto iniciado para {{contactName}}' }
  ]
}

// 5. Escalar tarefa atrasada
{
  name: 'Escalar: Tarefa atrasada 48h',
  trigger: { type: 'task_overdue' },
  conditions: [
    { field: 'daysOverdue', operator: 'gte', value: 2 }
  ],
  actions: [
    { type: 'assign_task', payload: { assignee_id: '{{supervisor.id}}' } },
    { type: 'notification', channel: 'email', payload: { to: '{{supervisor.email}}' } },
    { type: 'move_task', payload: { status: 'ESCALATED' } }
  ]
}
```

### 8.5.7 Diagrama de Dependências de Módulos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDÊNCIA DE MÓDULOS                             │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │     CRM & TASKS          │
                    │                          │
                    │ ┌────────┐ ┌──────────┐ │
                    │ │Vendas  │ │Projetos &│ │
                    │ │(Quick) │ │Serviços  │ │
                    │ └────┬───┘ └────┬─────┘ │
                    │      │          │       │
                    │ ┌────┴──────────┴─────┐ │
                    │ │     OPERAÇÕES       │ │
                    │ │ Check-in/Limpeza    │ │
                    │ └──────────┬──────────┘ │
                    └────────────┼────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  RESERVATIONS   │ │   PROPERTIES    │ │    CONTACTS     │
    │                 │ │                 │ │                 │
    │ - reservation_id│ │ - property_id   │ │ - contact_id    │
    │ - checkin_date  │ │ - owner_id      │ │ - email, phone  │
    │ - checkout_date │ │                 │ │                 │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   AUTOMATION ENGINE    │
                    │                        │
                    │  triggers + conditions │
                    │         + actions      │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ NOTIFICATION DISPATCHER│
                    │                        │
                    │  email | sms | whatsapp│
                    │        | in_app        │
                    └────────────────────────┘
```

---

## 9. REFERÊNCIA DE UI/UX

### 9.1 Paleta de Cores (Tags)

| Prioridade | Cor | Hex |
|------------|-----|-----|
| Low | Amarelo | `#FFC107` |
| Medium | Laranja | `#FF9800` |
| High | Vermelho | `#F44336` |

| Status | Cor | Hex |
|--------|-----|-----|
| On track | Verde | `#4CAF50` |
| At risk | Amarelo | `#FFC107` |
| Off track | Vermelho | `#F44336` |

### 9.2 Interações

| Ação | Comportamento |
|------|---------------|
| Click no card | Abre modal de detalhes |
| Double-click título | Edição inline |
| Drag card | Reordenar/mover seção |
| Hover card | Mostra ações rápidas |
| Checkbox | Toggle conclusão |

### 9.3 Transições

```css
/* Cards */
.task-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Modal */
.task-modal {
  animation: slideIn 0.3s ease-out;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1 - Fundação
- [ ] Expandir schema de `tasks` (subtarefas, parent_id)
- [ ] Criar tabela `custom_fields`
- [ ] Criar tabela `task_custom_field_values`
- [ ] Componente `SubtasksList` com hierarquia
- [ ] Componente `CustomFieldsEditor`
- [ ] View Lista com colunas configuráveis
- [ ] API endpoints para custom fields

### Fase 2 - Colaboração
- [ ] Criar tabela `task_dependencies`
- [ ] Criar tabela `task_comments`
- [ ] Componente `DependencyPicker`
- [ ] Componente `CommentsList` separado de Activity
- [ ] Dashboard com widgets avançados
- [ ] Gráficos com Chart.js ou Recharts

### Fase 3 - Automação
- [ ] Builder visual de regras
- [ ] View Calendário
- [ ] View Timeline (opcional)
- [ ] Formulários públicos
- [ ] Atalhos de teclado

---

## 🎯 MÉTRICAS DE SUCESSO

| Métrica | Meta |
|---------|------|
| Tempo para criar tarefa | < 3 segundos |
| Cliques para completar tarefa | ≤ 2 cliques |
| Carregamento de lista 100 tarefas | < 500ms |
| Satisfação do usuário (NPS) | > 8/10 |

---

## 📚 REFERÊNCIAS

- [Asana Guide](https://asana.com/guide)
- [Asana API](https://developers.asana.com/docs)
- [Linear App](https://linear.app) - Referência adicional
- [Notion Tasks](https://notion.so) - Referência de flexibilidade

---

**Próximos Passos:**
1. ✅ Documento de análise criado
2. ⏳ Validar prioridades com o usuário
3. ⏳ Detalhar specs técnicas da Fase 1
4. ⏳ Implementar MVP

---

*Documento criado em: 2026-01-27*  
*Última atualização: 2026-01-27*
