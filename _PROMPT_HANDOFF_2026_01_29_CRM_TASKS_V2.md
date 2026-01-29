# 🔄 PROMPT HANDOFF - CRM TASKS V2 SYSTEM

**Data:** 2026-01-29
**Sessão:** Continuação do módulo CRM Tasks v2
**Autor:** Rafael + Claude Opus 4.5
**Status:** ✅ MVP COMPLETO - Fase de Ajustes UI

---

## 📋 CONTEXTO COMPLETO

### O que é o Rendizy?
Sistema de gestão de **aluguel por temporada** (short-term rental) com:
- Gestão de imóveis/anúncios
- Reservas e calendário
- Chat WhatsApp (Evolution API)
- CRM com funis de vendas
- **Módulo CRM Tasks** (foco desta sessão)

### Tecnologias
- **Frontend:** React 18 + TypeScript + Vite (porta 3004)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **State:** TanStack React Query
- **Auth:** Supabase Auth + AuthContext customizado

---

## 🎯 MÓDULO CRM TASKS V2 - STATUS ATUAL

### ✅ O que foi implementado (MVP Completo)

#### 1. Database Schema (11+ tabelas)
**Migration:** `supabase/migrations/2026012706_create_crm_tasks_system.sql`

```
Tabelas criadas:
├── teams (times/equipes)
├── team_members (internos + terceirizados)
├── custom_fields (campos personalizados)
├── custom_field_values (valores dos campos)
├── crm_tasks (tarefas com hierarquia de subtarefas)
├── task_dependencies (dependências entre tarefas)
├── task_comments (comentários com menções)
├── operational_task_templates (templates automáticos)
├── operational_tasks (tarefas geradas automaticamente)
├── crm_projects (projetos/serviços)
└── task_activities (histórico de atividades)
```

#### 2. Triggers para Automação
**Migration:** `supabase/migrations/2026012708_create_operational_tasks_triggers.sql`

- `generate_operational_tasks_from_reservation()` - Gera tarefas quando reserva é criada
- `cancel_operational_tasks_on_reservation_cancel()` - Cancela tarefas quando reserva cancela
- `update_operational_tasks_on_reservation_change()` - Atualiza datas quando reserva muda
- `generate_tasks_for_existing_reservations()` - RPC para gerar retroativamente

**IMPORTANTE:** Tabela `reservations` usa colunas diretas `check_in DATE` e `check_out DATE` (não JSONB)

#### 3. Service Layer
**Arquivo:** `utils/services/crmTasksService.ts`

Services disponíveis:
- `teamsService` - CRUD de times
- `tasksService` - CRUD de tarefas CRM
- `taskCommentsService` - Comentários
- `operationalTasksService` - Tarefas operacionais
- `projectsService` - Projetos/serviços
- `customFieldsService` - Campos customizados
- `taskActivitiesService` - Histórico
- `tasksDashboardService` - KPIs e métricas

#### 4. React Query Hooks
**Arquivo:** `hooks/useCRMTasks.ts` (~800 linhas)

```typescript
// Teams
useTeams(), useTeam(id), useCreateTeam(), useUpdateTeam(), useDeleteTeam()

// Tasks
useTasks(filters), useTask(id), useCreateTask(), useUpdateTask(), useDeleteTask()
useSubtasks(parentId), useMyTasks(), useTasksByDateRange()

// Operational Tasks
useCheckIns(date), useCheckOuts(date), useCleanings({ date }), useMaintenances({})
useMarkOperationalTaskCompleted(), useOperationalTasksRealtime(date)

// Projects
useProjects(), useProject(id), useCreateProject()

// Dashboard
useTasksDashboardStats(), useTeamPerformance(), useRecentActivities()
```

**ATENÇÃO:** Os hooks corretos são:
- `useCleanings` (NÃO useLimpezas)
- `useMaintenances` (NÃO useManutencoes)

#### 5. Páginas Implementadas

```
components/crm/pages/
├── index.ts                     # Exports centralizados
├── TasksDashboardPage.tsx       # Dashboard com KPIs
├── TodasTarefasPage.tsx         # Lista de todas as tarefas
├── CalendarioTarefasPage.tsx    # Calendário de tarefas
├── EquipesPage.tsx              # Gestão de equipes
├── ProjetosPage.tsx             # Lista de projetos estilo ClickUp (~858 linhas) ✨ NOVO
├── OperacoesUnificadasPage.tsx  # Painel unificado de operações (~620 linhas) ✨ NOVO
└── operacoes/
    ├── index.ts
    ├── CheckInsPage.tsx
    ├── CheckOutsPage.tsx
    ├── LimpezasPage.tsx
    └── ManutencoesPage.tsx
```

#### 6. Views de UI
```
components/crm/views/
├── TasksListView.tsx      # Lista com colunas configuráveis (~900 linhas)
├── TasksBoardView.tsx     # Kanban drag-and-drop (~600 linhas)
├── TasksCalendarView.tsx  # Calendário semana/mês (~550 linhas)
└── TasksDashboard.tsx     # Dashboard com gráficos (~600 linhas)
```

#### 7. Mocks de Design (Referência)
```
components/crm/mocks/
├── CRMTasksV2Demo.tsx       # Demo page: /crm-tasks-demo
├── TasksDashboardV2.tsx     # Mock do dashboard
├── ProjectsListView.tsx     # Mock de projetos
├── OperationsView.tsx       # Mock de operações
├── CRMSidebarV2.tsx         # Mock do sidebar
├── TaskFormModalV2.tsx      # Mock do form de tarefa
├── ProjectDetailModal.tsx   # Mock do modal de projeto
├── ActivityLogSidebar.tsx   # Mock do log de atividades
└── SubtasksHierarchy.tsx    # Mock de subtarefas
```

#### 8. Rotas Configuradas no App.tsx

```typescript
// Dentro de <Route path="crm" element={<CRMTasksModule />}>
<Route path="projetos" element={<ProjetosPage />} />           // NOVO
<Route path="operacoes" element={<OperacoesUnificadasPage />} /> // NOVO
<Route path="operacoes/checkins" element={<CheckInsPage />} />
<Route path="operacoes/checkouts" element={<CheckOutsPage />} />
<Route path="operacoes/limpezas" element={<LimpezasPage />} />
<Route path="operacoes/manutencoes" element={<ManutencoesPage />} />
<Route path="todas-tarefas" element={<TodasTarefasPage />} />
<Route path="calendario-tarefas" element={<CalendarioTarefasPage />} />
<Route path="equipes" element={<EquipesPage />} />
```

#### 9. Menu Lateral (CRMTasksSidebar.tsx)

Seções atualizadas:
- **Clientes:** Vendas, Projetos & Serviços (NOVO), Serviços (Legacy), Contatos, Leads, etc.
- **Operações:** Todas Operações (NOVO badge "NOVO"), Check-ins, Check-outs, Limpezas, Manutenções
- **Tarefas:** Minhas Tarefas, Todas as Tarefas, Calendário, Equipes
- **Vendas:** Pipeline, Propostas, Negócios
- **Configurações**

---

## 📊 COMMITS RECENTES (cronológico)

```
2076229 feat(crm): adiciona Operações Unificadas e Projetos Page
72cc193 feat(crm-tasks): Add Realtime subscriptions and auto-generation triggers
64777c9 feat(crm-tasks): Implementação CRM Tasks v2 - Fase 1 Supabase
89ea7a6 fix(crm-tasks): corrigir persistência e exibição de tarefas
162cc69 feat(crm): CRM Tasks module - create, edit, complete tasks
```

---

## 🔧 TIPOS IMPORTANTES

### ProjectStatus (para ProjetosPage)
```typescript
type ProjectStatus = 'active' | 'completed' | 'archived';
// NÃO USAR: 'not_started', 'in_progress', 'review', 'cancelled' (não existem)
```

### Project Fields
```typescript
interface Project {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  total_tasks: number;      // Campo direto (não stats.totalTasks)
  completed_tasks: number;  // Campo direto (não stats.completedTasks)
  created_at: string;
  updated_at: string;
}
```

### OperationalTask
```typescript
interface OperationalTask {
  id: string;
  organization_id: string;
  template_id?: string;
  property_id?: string;
  reservation_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  scheduled_time?: string;
  assignee_id?: string;
  triggered_by_event?: string;
  metadata?: Record<string, any>;
  completed_at?: string;
  completed_by?: string;
}
```

---

## 📁 ARQUIVOS-CHAVE PARA REFERÊNCIA

| Arquivo | Propósito | Linhas |
|---------|-----------|--------|
| `hooks/useCRMTasks.ts` | Todos os React Query hooks | ~800 |
| `utils/services/crmTasksService.ts` | Service layer Supabase | ~600 |
| `types/crm-tasks.ts` | Tipos TypeScript | ~200 |
| `components/crm/pages/OperacoesUnificadasPage.tsx` | Painel unificado | ~620 |
| `components/crm/pages/ProjetosPage.tsx` | Lista de projetos | ~858 |
| `components/crm/CRMTasksSidebar.tsx` | Menu lateral CRM | ~300 |
| `App.tsx` | Rotas principais | ~2000 |

---

## 🎨 FASE ATUAL: AJUSTES DE UI

### Objetivo
Fazer as páginas reais ficarem visualmente idênticas aos mocks em `/crm-tasks-demo`

### Mocks vs Real (Comparação)

| Mock (Design) | Real (Implementado) | Status |
|---------------|---------------------|--------|
| `TasksDashboardV2` | `TasksDashboard` | ⏳ Ajustar |
| `ProjectsListView` | `ProjetosPage` | ✅ Criado |
| `OperationsView` | `OperacoesUnificadasPage` | ✅ Criado |
| `CRMSidebarV2` | `CRMTasksSidebar` | ✅ Atualizado |

### URLs para Testar

| Página | URL |
|--------|-----|
| Mock Demo (referência) | http://localhost:3004/crm-tasks-demo |
| Dashboard CRM | http://localhost:3004/crm |
| Operações Unificadas | http://localhost:3004/crm/operacoes |
| Projetos | http://localhost:3004/crm/projetos |
| Todas Tarefas | http://localhost:3004/crm/todas-tarefas |
| Calendário | http://localhost:3004/crm/calendario-tarefas |
| Equipes | http://localhost:3004/crm/equipes |

---

## 🚨 PROBLEMAS CONHECIDOS / CORRIGIDOS

### 1. Hook names incorretos
**Problema:** Código usava `useLimpezas`/`useManutencoes`
**Solução:** Usar `useCleanings`/`useMaintenances`

### 2. Import do useAuth faltando
**Problema:** ProjetosPage usava `useAuth` sem importar
**Solução:** Adicionado `import { useAuth } from '@/src/contexts/AuthContext';`

### 3. Tipo de status incorreto
**Problema:** Código usava status 'in_progress', 'not_started' etc
**Solução:** Usar apenas 'active', 'completed', 'archived'

### 4. Campos de stats incorretos
**Problema:** Código usava `project.stats?.totalTasks`
**Solução:** Usar `project.total_tasks` diretamente

### 5. Triggers SQL com colunas JSONB
**Problema:** Triggers tentavam ler `data->>'check_in'`
**Solução:** Corrigido para usar `check_in` e `check_out` diretamente

---

## ⏳ PRÓXIMOS PASSOS SUGERIDOS

### Prioridade Alta
1. [ ] Testar `/crm/operacoes` - verificar se dados reais aparecem
2. [ ] Testar `/crm/projetos` - verificar se modal abre corretamente
3. [ ] Verificar se realtime está funcionando nas operações

### Prioridade Média
4. [ ] Ajustar TasksDashboard para ficar igual ao mock TasksDashboardV2
5. [ ] Conectar ProjetosPage com dados reais (trocar MOCK_PROJECTS)
6. [ ] Implementar criação/edição de projetos

### Prioridade Baixa (Nice to have)
7. [ ] View Timeline/Gantt
8. [ ] Notificações WhatsApp para equipes
9. [ ] Atalhos de teclado

---

## 📝 COMANDOS ÚTEIS

```bash
# Iniciar servidor
cd "Pasta oficial Rendizy"
npm run dev

# Git status
git status --short

# Commit
git add -A && git commit -m "feat(crm): descrição"

# Push
git push origin main

# Ver logs
git log --oneline -10
```

---

## 🔗 DOCUMENTAÇÃO RELACIONADA

- `docs/roadmaps/ROADMAP_TAREFAS_ASANA_STYLE_2026.md` - Roadmap completo v2.3
- `components/crm/crm-tasks-index.ts` - Index de exports do módulo
- `components/crm/mocks/index.tsx` - Index dos mocks de design

---

## 💡 DICAS PARA O PRÓXIMO CHAT

1. **Sempre verificar imports** - O sistema usa paths com @/ (aliases)
2. **AuthContext path:** `@/src/contexts/AuthContext` (com src)
3. **UI components:** `@/components/ui/*`
4. **Utils:** `@/components/ui/utils` (não @/lib/utils)
5. **Hooks:** `@/hooks/useCRMTasks`
6. **Services:** `@/utils/services/crmTasksService`

---

**Servidor:** http://localhost:3004/
**Branch:** main
**Última atualização:** 2026-01-29

---

*Este documento foi gerado automaticamente para continuidade entre sessões.*
