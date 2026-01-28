-- ============================================================================
-- MIGRATION: Sistema Completo de Tarefas CRM (Estilo Asana)
-- Version: 1.0.1
-- Date: 2026-01-28
-- 
-- Este arquivo cria todas as tabelas necessárias para o sistema de tarefas:
-- - Teams (equipes) com membros e configuração de notificação
-- - Custom Fields (campos customizados dinâmicos)
-- - Task Dependencies (dependências entre tarefas)
-- - Task Comments (comentários separados de atividades)
-- - Operational Task Templates (templates de tarefas operacionais)
-- - Operational Tasks (instâncias de tarefas operacionais)
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PARTE 0: LIMPEZA (Dropar tabelas antigas se existirem)
-- ============================================================================
-- ATENÇÃO: Isso vai apagar dados existentes nessas tabelas!
-- Comente esta seção se quiser preservar dados e fazer ALTER TABLE manual.

DROP VIEW IF EXISTS v_operations_today CASCADE;
DROP VIEW IF EXISTS v_tasks_complete CASCADE;
DROP TRIGGER IF EXISTS trg_update_project_progress ON crm_tasks;
DROP FUNCTION IF EXISTS update_project_progress() CASCADE;
DROP FUNCTION IF EXISTS get_tasks_with_hierarchy(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_scheduled_operational_tasks(UUID, DATE) CASCADE;

DROP TABLE IF EXISTS task_activities CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS custom_field_values CASCADE;
DROP TABLE IF EXISTS custom_fields CASCADE;
DROP TABLE IF EXISTS operational_tasks CASCADE;
DROP TABLE IF EXISTS operational_task_templates CASCADE;
DROP TABLE IF EXISTS crm_tasks CASCADE;
DROP TABLE IF EXISTS crm_projects CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- ============================================================================
-- PARTE 1: TEAMS E EQUIPES
-- ============================================================================

-- Tabela de Times/Equipes
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Configuração de notificação
  notification_on_task_created BOOLEAN DEFAULT true,
  notification_on_sla_approaching BOOLEAN DEFAULT true,
  notification_on_task_overdue BOOLEAN DEFAULT true,
  notification_on_any_update BOOLEAN DEFAULT false,
  notification_channels TEXT[] DEFAULT ARRAY['push'], -- whatsapp, push, email, sms
  
  -- Regra de atribuição
  assignment_rule VARCHAR(20) DEFAULT 'notify_all', -- notify_all, round_robin, least_busy, by_region, fixed
  fixed_assignee_id UUID REFERENCES users(id),
  
  -- Cor e ícone
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'users',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para teams
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);

-- Tabela de Membros do Time
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Pode ser usuário interno ou externo
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  external_name VARCHAR(100),
  external_phone VARCHAR(20),
  external_email VARCHAR(255),
  
  role VARCHAR(20) DEFAULT 'member', -- leader, member
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: deve ter user_id OU dados externos
  CONSTRAINT chk_team_member_identity CHECK (
    user_id IS NOT NULL OR (external_name IS NOT NULL AND (external_phone IS NOT NULL OR external_email IS NOT NULL))
  )
);

-- Índices para team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- ============================================================================
-- PARTE 2: CUSTOM FIELDS (Campos Customizados)
-- ============================================================================

-- Tabela de definição de campos customizados
CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  field_type VARCHAR(20) NOT NULL, -- text, number, single_select, multi_select, date, user, currency
  
  -- Opções para campos de seleção
  options JSONB DEFAULT '[]', -- [{id, label, color}]
  
  -- Configurações
  is_required BOOLEAN DEFAULT false,
  is_visible_in_list BOOLEAN DEFAULT true,
  default_value TEXT,
  
  -- Escopo
  scope VARCHAR(20) DEFAULT 'task', -- task, deal, ticket, project
  
  -- Ordenação
  display_order INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_custom_field_name UNIQUE (organization_id, name, scope)
);

-- Índices para custom_fields
CREATE INDEX IF NOT EXISTS idx_custom_fields_organization_id ON custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_scope ON custom_fields(scope);

-- Tabela de valores de campos customizados
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- ID da tarefa, deal, ticket, etc.
  entity_type VARCHAR(20) NOT NULL, -- task, deal, ticket, project
  
  -- Valor armazenado
  value_text TEXT,
  value_number DECIMAL(15,2),
  value_date DATE,
  value_json JSONB, -- Para multi_select ou user
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_field_value UNIQUE (custom_field_id, entity_id)
);

-- Índices para custom_field_values
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_id ON custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity_id ON custom_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity_type ON custom_field_values(entity_type);

-- ============================================================================
-- PARTE 3: TAREFAS APRIMORADAS
-- ============================================================================

-- Tabela de Tarefas (expandida)
CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Informações básicas
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Status e tipo
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, urgent
  task_type VARCHAR(20) DEFAULT 'task', -- task, form, attachment
  
  -- Hierarquia (subtarefas)
  parent_id UUID REFERENCES crm_tasks(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0, -- Nível de profundidade (0 = tarefa raiz)
  path TEXT, -- Path completo: "root_id/parent_id/id"
  
  -- Atribuição
  assignee_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  
  -- Datas
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Estimativa e tracking
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  
  -- Contexto
  project_id UUID, -- Referência para projeto/serviço
  deal_id UUID, -- Referência para negócio
  ticket_id UUID, -- Referência para ticket
  property_id UUID, -- Referência para imóvel (sem FK para flexibilidade)
  reservation_id TEXT,
  
  -- Ordenação
  display_order INTEGER DEFAULT 0,
  section_name VARCHAR(100), -- Seção/agrupamento
  
  -- Metadados
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para crm_tasks
CREATE INDEX IF NOT EXISTS idx_crm_tasks_organization_id ON crm_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_parent_id ON crm_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee_id ON crm_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_team_id ON crm_tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_project_id ON crm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_property_id ON crm_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_path ON crm_tasks(path);

-- ============================================================================
-- PARTE 4: DEPENDÊNCIAS DE TAREFAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES crm_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES crm_tasks(id) ON DELETE CASCADE,
  
  dependency_type VARCHAR(20) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, finish_to_finish, start_to_finish
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_task_id),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- Índices para task_dependencies
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- ============================================================================
-- PARTE 5: COMENTÁRIOS DE TAREFAS (Separado de Atividades)
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES crm_tasks(id) ON DELETE CASCADE,
  
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  
  -- Menções (@usuario)
  mentions UUID[] DEFAULT '{}',
  
  -- Anexos
  attachments JSONB DEFAULT '[]', -- [{name, url, type, size}]
  
  -- Thread (resposta a outro comentário)
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_comment_id);

-- ============================================================================
-- PARTE 6: TEMPLATES DE TAREFAS OPERACIONAIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Informações básicas
  name VARCHAR(200) NOT NULL,
  description TEXT,
  instructions TEXT,
  
  priority VARCHAR(10) DEFAULT 'medium',
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- Gatilho
  trigger_type VARCHAR(20) NOT NULL, -- event, scheduled, manual
  
  -- Configuração de evento (trigger_type = 'event')
  event_trigger JSONB, -- {event, days_offset, offset_direction, time_mode, fixed_time, offset_hours, conditions}
  
  -- Configuração de agendamento (trigger_type = 'scheduled')
  schedule_config JSONB, -- {frequency, weekly_days, monthly_day, time, conflict_resolution, etc}
  
  -- Atribuição
  assignment_type VARCHAR(20) DEFAULT 'team', -- person, team, manual
  assigned_user_id UUID REFERENCES users(id),
  assigned_team_id UUID REFERENCES teams(id),
  
  -- Escopo de imóveis
  property_scope VARCHAR(20) DEFAULT 'all', -- all, selected, by_tag, by_owner
  property_ids UUID[] DEFAULT '{}',
  property_tag VARCHAR(50),
  property_owner_id UUID,
  
  -- Cor e ícone
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'clipboard-list',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para operational_task_templates
CREATE INDEX IF NOT EXISTS idx_op_task_templates_org ON operational_task_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_op_task_templates_trigger ON operational_task_templates(trigger_type);
CREATE INDEX IF NOT EXISTS idx_op_task_templates_active ON operational_task_templates(is_active);

-- ============================================================================
-- PARTE 7: INSTÂNCIAS DE TAREFAS OPERACIONAIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES operational_task_templates(id) ON DELETE SET NULL,
  
  -- Informações da tarefa
  title VARCHAR(500) NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, skipped
  priority VARCHAR(10) DEFAULT 'medium',
  
  -- Atribuição
  assignee_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  
  -- Datas
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  due_datetime TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Contexto
  property_id UUID, -- Referência para imóvel (sem FK para flexibilidade)
  reservation_id TEXT,
  
  -- Se foi gerada por evento
  triggered_by_event VARCHAR(50), -- reservation_confirmed, checkin_day, checkout_day, etc
  triggered_by_entity_id TEXT, -- ID da reserva, por exemplo
  
  -- Se foi adiada (conflito com reserva)
  original_scheduled_date DATE,
  postpone_reason TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para operational_tasks
CREATE INDEX IF NOT EXISTS idx_op_tasks_org ON operational_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_op_tasks_template ON operational_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_op_tasks_property ON operational_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_op_tasks_scheduled_date ON operational_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_op_tasks_status ON operational_tasks(status);
CREATE INDEX IF NOT EXISTS idx_op_tasks_assignee ON operational_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_op_tasks_team ON operational_tasks(team_id);

-- ============================================================================
-- PARTE 8: PROJETOS/TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Tipo
  project_type VARCHAR(20) DEFAULT 'project', -- project, template
  template_id UUID REFERENCES crm_projects(id), -- Se foi criado a partir de template
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, completed, archived
  
  -- Cliente/Contexto
  client_name VARCHAR(200),
  client_id UUID, -- Referência para contato ou deal
  
  -- Progresso
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  
  -- Cor e ícone
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50) DEFAULT 'folder',
  
  -- Metadados
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para crm_projects
CREATE INDEX IF NOT EXISTS idx_crm_projects_org ON crm_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_projects_type ON crm_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_crm_projects_status ON crm_projects(status);

-- ============================================================================
-- PARTE 9: ATIVIDADES/LOG (Histórico)
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES crm_tasks(id) ON DELETE CASCADE,
  
  user_id UUID REFERENCES users(id),
  
  activity_type VARCHAR(50) NOT NULL, -- created, updated, status_changed, assigned, completed, commented, attached, etc
  
  -- Detalhes da mudança
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para task_activities
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_type ON task_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_task_activities_created ON task_activities(created_at);

-- ============================================================================
-- PARTE 10: VIEWS ÚTEIS
-- ============================================================================

-- View para tarefas com informações completas
CREATE OR REPLACE VIEW v_tasks_complete AS
SELECT 
  t.*,
  u.name as assignee_name,
  u.email as assignee_email,
  tm.name as team_name,
  p.name as project_name,
  (
    SELECT COUNT(*) FROM crm_tasks st WHERE st.parent_id = t.id
  ) as subtask_count,
  (
    SELECT COUNT(*) FROM crm_tasks st WHERE st.parent_id = t.id AND st.status = 'completed'
  ) as completed_subtask_count,
  (
    SELECT COUNT(*) FROM task_dependencies td WHERE td.task_id = t.id
  ) as dependency_count,
  (
    SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id
  ) as comment_count
FROM crm_tasks t
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN teams tm ON t.team_id = tm.id
LEFT JOIN crm_projects p ON t.project_id = p.id;

-- View para operações do dia
CREATE OR REPLACE VIEW v_operations_today AS
SELECT 
  ot.id,
  ot.title,
  ot.status,
  ot.priority,
  ot.scheduled_date,
  ot.scheduled_time,
  ot.due_datetime,
  ot.property_id,
  ot.reservation_id,
  ot.triggered_by_event,
  ot.assignee_id,
  u.name as assignee_name,
  ot.team_id,
  tm.name as team_name,
  tpl.name as template_name,
  tpl.icon as template_icon,
  tpl.color as template_color
FROM operational_tasks ot
LEFT JOIN users u ON ot.assignee_id = u.id
LEFT JOIN teams tm ON ot.team_id = tm.id
LEFT JOIN operational_task_templates tpl ON ot.template_id = tpl.id
WHERE ot.scheduled_date = CURRENT_DATE
ORDER BY ot.scheduled_time, ot.priority DESC;

-- ============================================================================
-- PARTE 11: FUNÇÕES RPC
-- ============================================================================

-- Função para obter tarefas com hierarquia
CREATE OR REPLACE FUNCTION get_tasks_with_hierarchy(p_organization_id UUID, p_parent_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status VARCHAR,
  priority VARCHAR,
  parent_id UUID,
  depth INTEGER,
  assignee_id UUID,
  assignee_name TEXT,
  due_date TIMESTAMPTZ,
  subtask_count BIGINT,
  completed_subtask_count BIGINT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE task_tree AS (
    -- Base: tarefas raiz
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      t.parent_id,
      0 as depth,
      t.assignee_id,
      t.due_date,
      t.display_order
    FROM crm_tasks t
    WHERE t.organization_id = p_organization_id
      AND (p_parent_id IS NULL AND t.parent_id IS NULL OR t.parent_id = p_parent_id)
    
    UNION ALL
    
    -- Recursivo: subtarefas
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      t.parent_id,
      tt.depth + 1,
      t.assignee_id,
      t.due_date,
      t.display_order
    FROM crm_tasks t
    JOIN task_tree tt ON t.parent_id = tt.id
    WHERE tt.depth < 5 -- Limite de profundidade
  )
  SELECT 
    tt.id,
    tt.title::VARCHAR,
    tt.status::VARCHAR,
    tt.priority::VARCHAR,
    tt.parent_id,
    tt.depth::INTEGER,
    tt.assignee_id,
    u.name::TEXT as assignee_name,
    tt.due_date,
    (SELECT COUNT(*) FROM crm_tasks st WHERE st.parent_id = tt.id)::BIGINT,
    (SELECT COUNT(*) FROM crm_tasks st WHERE st.parent_id = tt.id AND st.status = 'completed')::BIGINT,
    tt.display_order::INTEGER
  FROM task_tree tt
  LEFT JOIN users u ON tt.assignee_id = u.id
  ORDER BY tt.depth, tt.display_order;
END;
$$;

-- Função para atualizar progresso do projeto
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Para DELETE, usa OLD; para INSERT/UPDATE, usa NEW
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    IF v_project_id IS NOT NULL THEN
      UPDATE crm_projects
      SET 
        total_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = v_project_id),
        completed_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = v_project_id AND status = 'completed'),
        updated_at = NOW()
      WHERE id = v_project_id;
    END IF;
    RETURN OLD;
  END IF;
  
  -- Para INSERT ou UPDATE
  IF NEW.project_id IS NOT NULL THEN
    UPDATE crm_projects
    SET 
      total_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = NEW.project_id),
      completed_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = NEW.project_id AND status = 'completed'),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Se projeto mudou no UPDATE, atualiza o antigo também
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id AND OLD.project_id IS NOT NULL THEN
    UPDATE crm_projects
    SET 
      total_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = OLD.project_id),
      completed_tasks = (SELECT COUNT(*) FROM crm_tasks WHERE project_id = OLD.project_id AND status = 'completed'),
      updated_at = NOW()
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar progresso
DROP TRIGGER IF EXISTS trg_update_project_progress ON crm_tasks;
CREATE TRIGGER trg_update_project_progress
AFTER INSERT OR UPDATE OR DELETE ON crm_tasks
FOR EACH ROW EXECUTE FUNCTION update_project_progress();

-- Função para gerar tarefas operacionais agendadas
-- NOTA: Esta função precisa ser adaptada conforme a estrutura real de properties/reservations
CREATE OR REPLACE FUNCTION generate_scheduled_operational_tasks(p_organization_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template RECORD;
  v_property RECORD;
  v_count INTEGER := 0;
  v_schedule JSONB;
  v_should_create BOOLEAN;
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  v_day_of_month := EXTRACT(DAY FROM p_date);
  
  FOR v_template IN 
    SELECT * FROM operational_task_templates 
    WHERE organization_id = p_organization_id 
      AND is_active = true 
      AND trigger_type = 'scheduled'
  LOOP
    v_schedule := v_template.schedule_config;
    v_should_create := false;
    
    -- Verifica frequência
    CASE v_schedule->>'frequency'
      WHEN 'daily' THEN
        v_should_create := true;
      WHEN 'weekly' THEN
        IF v_schedule->'weekly_days' ? v_day_of_week::TEXT THEN
          v_should_create := true;
        END IF;
      WHEN 'biweekly' THEN
        IF v_schedule->'weekly_days' ? v_day_of_week::TEXT AND EXTRACT(WEEK FROM p_date)::INTEGER % 2 = 0 THEN
          v_should_create := true;
        END IF;
      WHEN 'monthly' THEN
        IF (v_schedule->>'monthly_day')::INTEGER = v_day_of_month THEN
          v_should_create := true;
        END IF;
      WHEN 'quarterly' THEN
        IF EXTRACT(MONTH FROM p_date)::INTEGER IN (1, 4, 7, 10) AND (v_schedule->>'monthly_day')::INTEGER = v_day_of_month THEN
          v_should_create := true;
        END IF;
      ELSE
        v_should_create := false;
    END CASE;
    
    IF v_should_create THEN
      -- Cria tarefa para cada imóvel no escopo
      FOR v_property IN
        SELECT id, data->>'name' as name FROM properties 
        WHERE organization_id = p_organization_id
          AND (
            v_template.property_scope = 'all'
            OR (v_template.property_scope = 'selected' AND id = ANY(v_template.property_ids))
          )
      LOOP
        -- Verifica se já existe tarefa para este template/data/imóvel
        IF NOT EXISTS (
          SELECT 1 FROM operational_tasks 
          WHERE template_id = v_template.id 
            AND scheduled_date = p_date 
            AND property_id = v_property.id
        ) THEN
          -- Cria a tarefa
          INSERT INTO operational_tasks (
            organization_id, template_id, title, description, instructions,
            priority, assignee_id, team_id, property_id,
            scheduled_date, scheduled_time,
            created_at
          ) VALUES (
            p_organization_id, v_template.id, 
            v_template.name || COALESCE(' - ' || v_property.name, ''),
            v_template.description, v_template.instructions,
            v_template.priority, v_template.assigned_user_id, v_template.assigned_team_id, v_property.id,
            p_date, (v_schedule->>'time')::TIME,
            NOW()
          );
          v_count := v_count + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- ============================================================================
-- PARTE 12: RLS (Row Level Security)
-- ============================================================================

-- RLS para teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY teams_select_policy ON teams FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY teams_insert_policy ON teams FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY teams_update_policy ON teams FOR UPDATE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY teams_delete_policy ON teams FOR DELETE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

-- RLS para crm_tasks
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_tasks_select_policy ON crm_tasks FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY crm_tasks_insert_policy ON crm_tasks FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY crm_tasks_update_policy ON crm_tasks FOR UPDATE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY crm_tasks_delete_policy ON crm_tasks FOR DELETE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

-- RLS para operational_task_templates
ALTER TABLE operational_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY op_templates_select_policy ON operational_task_templates FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY op_templates_insert_policy ON operational_task_templates FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY op_templates_update_policy ON operational_task_templates FOR UPDATE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

-- RLS para operational_tasks
ALTER TABLE operational_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY op_tasks_select_policy ON operational_tasks FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY op_tasks_insert_policy ON operational_tasks FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY op_tasks_update_policy ON operational_tasks FOR UPDATE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

-- RLS para custom_fields
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_fields_select_policy ON custom_fields FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY custom_fields_insert_policy ON custom_fields FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY custom_fields_update_policy ON custom_fields FOR UPDATE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

-- RLS para crm_projects
ALTER TABLE crm_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_projects_select_policy ON crm_projects FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY crm_projects_insert_policy ON crm_projects FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

CREATE POLICY crm_projects_update_policy ON crm_projects FOR UPDATE
  USING (organization_id IN (SELECT id FROM organizations WHERE id = ANY(current_setting('app.current_org_ids', true)::UUID[])));

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

COMMENT ON TABLE teams IS 'Times/Equipes para atribuição e notificação de tarefas';
COMMENT ON TABLE team_members IS 'Membros de cada time (internos ou externos)';
COMMENT ON TABLE custom_fields IS 'Campos customizados dinâmicos para tarefas, deals, etc';
COMMENT ON TABLE crm_tasks IS 'Tarefas do CRM com suporte a hierarquia (subtarefas)';
COMMENT ON TABLE task_dependencies IS 'Dependências entre tarefas (finish-to-start, etc)';
COMMENT ON TABLE task_comments IS 'Comentários em tarefas (separado de atividades/log)';
COMMENT ON TABLE operational_task_templates IS 'Templates de tarefas operacionais (check-in, limpeza, etc)';
COMMENT ON TABLE operational_tasks IS 'Instâncias de tarefas operacionais geradas';
COMMENT ON TABLE crm_projects IS 'Projetos e templates de projeto';
COMMENT ON TABLE task_activities IS 'Log de atividades/histórico de tarefas';
