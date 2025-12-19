# 🎯 PROPOSTA: Módulo de Controle de Desenvolvimento no Rendizy

## 📌 Visão Geral

Criar um módulo interno no Rendizy para tracking de desenvolvimento, similar a Jira/Linear mas integrado ao próprio sistema.

---

## 🏗️ Arquitetura

### Tabelas no Supabase

```sql
-- Tabela: dev_sessions (Sessões de desenvolvimento)
CREATE TABLE dev_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  context TEXT,
  status TEXT CHECK (status IN ('planning', 'in_progress', 'completed', 'blocked')),
  duration_minutes INT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: dev_tasks (Tarefas da sessão)
CREATE TABLE dev_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dev_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES users(id),
  estimated_minutes INT,
  actual_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabela: dev_changes (Mudanças de código)
CREATE TABLE dev_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dev_sessions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_start INT,
  line_end INT,
  change_type TEXT CHECK (change_type IN ('added', 'modified', 'deleted')),
  reason TEXT,
  code_before TEXT,
  code_after TEXT,
  git_commit_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: dev_bugs (Bugs encontrados)
CREATE TABLE dev_bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dev_sessions(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
  file_path TEXT,
  line_number INT,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Tabela: dev_docs (Documentação criada)
CREATE TABLE dev_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES dev_sessions(id),
  file_path TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT CHECK (doc_type IN ('architecture', 'api', 'guide', 'log')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_dev_sessions_date ON dev_sessions(date);
CREATE INDEX idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX idx_dev_bugs_status ON dev_bugs(status);
CREATE INDEX idx_dev_changes_file ON dev_changes(file_path);
```

---

## 🎨 Interface do Módulo

### Tela 1: Dashboard de Desenvolvimento
```typescript
interface DevDashboard {
  // Métricas principais
  totalSessions: number;
  activeTasks: number;
  openBugs: number;
  filesChanged: number;
  
  // Timeline
  recentSessions: DevSession[];
  
  // Gráficos
  tasksOverTime: ChartData;
  bugsResolved: ChartData;
}
```

### Tela 2: Sessão de Desenvolvimento
```typescript
interface DevSession {
  id: string;
  date: Date;
  title: string;
  objective: string;
  context: string;
  status: 'planning' | 'in_progress' | 'completed' | 'blocked';
  
  // Relacionamentos
  tasks: DevTask[];
  changes: DevChange[];
  bugs: DevBug[];
  docs: DevDoc[];
  
  // Métricas
  duration: number; // minutos
  filesModified: number;
  linesAdded: number;
  linesRemoved: number;
}
```

### Tela 3: Timeline de Mudanças
```typescript
interface ChangeTimeline {
  // Visualização cronológica de todas mudanças
  changes: {
    date: Date;
    file: string;
    author: string;
    type: 'added' | 'modified' | 'deleted';
    description: string;
    gitCommit: string;
  }[];
}
```

---

## 🔌 Integração com Git

### Sincronização Automática
```typescript
// Hook: useDevSessionSync
const syncGitChanges = async (sessionId: string) => {
  // 1. Buscar commits desde última sincronização
  const commits = await execGit('git log --since="1 hour ago" --name-status');
  
  // 2. Parsear arquivos modificados
  const changes = parseGitChanges(commits);
  
  // 3. Salvar no banco
  await supabase.from('dev_changes').insert(
    changes.map(change => ({
      session_id: sessionId,
      file_path: change.file,
      change_type: change.type,
      git_commit_hash: change.commit,
    }))
  );
};
```

---

## 🚀 Features Principais

### 1. Tracking Automático
- ✅ Detecta arquivos modificados via git
- ✅ Parseia diffs automaticamente
- ✅ Sugere descrição baseada no código
- ✅ Linka commits com tarefas

### 2. Context Preservation
- ✅ Cada sessão documenta contexto completo
- ✅ IA futura pode ler histórico
- ✅ Onboarding de novos devs facilitado

### 3. Métricas de Produtividade
- ✅ Tempo por tarefa
- ✅ Bugs encontrados vs resolvidos
- ✅ Velocidade de desenvolvimento
- ✅ Arquivos mais modificados (hotspots)

### 4. AI-Friendly
- ✅ Formato estruturado (JSON)
- ✅ Histórico completo acessível
- ✅ Contexto sempre disponível

---

## 📱 Wireframe Simplificado

```
┌─────────────────────────────────────────────┐
│ 🛠️ Desenvolvimento                          │
├─────────────────────────────────────────────┤
│                                             │
│ 📊 Dashboard                                │
│ ├─ 12 Sessões esta semana                   │
│ ├─ 45 Tarefas completadas                   │
│ ├─ 8 Bugs resolvidos                        │
│ └─ 23 Arquivos modificados                  │
│                                             │
│ 📅 Sessões Recentes                         │
│ ┌───────────────────────────────────────┐   │
│ │ 🟢 19/12 - Auditoria Calendário       │   │
│ │    ├─ 4 tarefas (3 completas)         │   │
│ │    ├─ 2 bugs encontrados              │   │
│ │    └─ 4h 30min                        │   │
│ └───────────────────────────────────────┘   │
│ ┌───────────────────────────────────────┐   │
│ │ 🔴 18/12 - Correção UUID Reservas     │   │
│ │    ├─ 6 tarefas (6 completas)         │   │
│ │    ├─ 3 bugs corrigidos               │   │
│ │    └─ 3h 15min                        │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ [+ Nova Sessão]                             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 Roadmap de Implementação

### Fase 1: MVP (1-2 dias)
- [ ] Criar tabelas no Supabase
- [ ] Interface básica (listar/criar sessões)
- [ ] Adicionar tarefas manualmente
- [ ] Visualizar timeline simples

### Fase 2: Automação (3-4 dias)
- [ ] Integração com Git (detectar mudanças)
- [ ] Parser de diffs
- [ ] Sugestão automática de descrições
- [ ] Métricas básicas

### Fase 3: Avançado (1 semana)
- [ ] Gráficos e dashboards
- [ ] Exportar para CHANGELOG.md automático
- [ ] Notificações de tarefas pendentes
- [ ] Integração com GitHub Issues

---

## 💰 Custo Benefício

### Benefícios
- ✅ **Zero custo** (usa Supabase existente)
- ✅ **Sempre acessível** (dentro do Rendizy)
- ✅ **AI-friendly** (contexto estruturado)
- ✅ **Multi-usuário** (time inteiro usa)
- ✅ **Métricas** (produtividade visível)

### Alternativas Externas
| Ferramenta | Custo/Mês | Pros | Contras |
|------------|-----------|------|---------|
| Linear | $8/usuário | Bonito, rápido | Caro para times |
| Jira | $7.75/usuário | Robusto | Lento, complexo |
| GitHub Projects | Grátis | Integrado Git | Limitado |
| **Módulo Interno** | **Grátis** | **Integrado, customizável** | **Precisa desenvolver** |

---

## 🏁 Conclusão

**Recomendação:** Implementar o módulo interno **EM PARALELO** com boas práticas de Git/Docs.

**Estratégia Híbrida:**
1. **Curto Prazo (Hoje):** Usar CHANGELOG.md + Git commits semânticos
2. **Médio Prazo (1 semana):** Implementar MVP do módulo interno
3. **Longo Prazo:** Evoluir módulo com IA/automação

**Por quê híbrido?**
- Boas práticas Git são padrão mercado (portátil)
- Módulo interno resolve problema específico (memória curta IA)
- Combinação é mais poderosa que cada um isolado
