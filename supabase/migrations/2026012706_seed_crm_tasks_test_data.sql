-- ============================================================================
-- SEED: Dados de Teste para Sistema CRM Tasks
-- Version: 1.0.0
-- Date: 2026-01-28
-- 
-- INSTRUÇÕES:
-- 1. Substitua 'SEU_ORGANIZATION_ID' pelo ID real da sua organização
-- 2. Substitua 'SEU_USER_ID' pelo ID real do usuário admin
-- 3. Execute este script no SQL Editor do Supabase
-- ============================================================================

-- IMPORTANTE: Altere estas variáveis para os valores reais do seu ambiente
-- Você pode encontrar esses IDs no Supabase Table Editor em 'organizations' e 'users'
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_team_recepcao_id UUID;
  v_team_limpeza_id UUID;
  v_team_manutencao_id UUID;
  v_project_id UUID;
BEGIN
  -- ============================================================================
  -- PASSO 1: Pegue o organization_id e user_id reais
  -- ============================================================================
  -- Pega a primeira organização disponível (ajuste conforme necessário)
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  -- Pega o primeiro usuário disponível (ajuste conforme necessário)
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  -- Verifica se encontrou os IDs
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'ERRO: Nenhuma organização encontrada. Crie uma organização primeiro.';
    RETURN;
  END IF;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ERRO: Nenhum usuário encontrado. Crie um usuário primeiro.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Usando organization_id: %', v_org_id;
  RAISE NOTICE 'Usando user_id: %', v_user_id;

  -- ============================================================================
  -- PASSO 2: Criar Times/Equipes
  -- ============================================================================
  INSERT INTO teams (organization_id, name, description, color, icon, notification_channels, assignment_rule)
  VALUES 
    (v_org_id, 'Recepção', 'Equipe responsável por check-ins e atendimento', '#3b82f6', 'users', ARRAY['whatsapp', 'push'], 'round_robin')
  RETURNING id INTO v_team_recepcao_id;
  
  INSERT INTO teams (organization_id, name, description, color, icon, notification_channels, assignment_rule)
  VALUES 
    (v_org_id, 'Limpeza', 'Equipe de limpeza e higienização', '#22c55e', 'sparkles', ARRAY['whatsapp', 'push'], 'round_robin')
  RETURNING id INTO v_team_limpeza_id;
  
  INSERT INTO teams (organization_id, name, description, color, icon, notification_channels, assignment_rule)
  VALUES 
    (v_org_id, 'Manutenção', 'Equipe de manutenção e reparos', '#f59e0b', 'wrench', ARRAY['whatsapp', 'push'], 'notify_all')
  RETURNING id INTO v_team_manutencao_id;

  RAISE NOTICE 'Times criados: Recepção (%), Limpeza (%), Manutenção (%)', v_team_recepcao_id, v_team_limpeza_id, v_team_manutencao_id;

  -- ============================================================================
  -- PASSO 3: Adicionar membro aos times (o usuário atual)
  -- ============================================================================
  INSERT INTO team_members (team_id, user_id, role) VALUES (v_team_recepcao_id, v_user_id, 'leader');
  INSERT INTO team_members (team_id, user_id, role) VALUES (v_team_limpeza_id, v_user_id, 'member');
  INSERT INTO team_members (team_id, user_id, role) VALUES (v_team_manutencao_id, v_user_id, 'member');

  -- ============================================================================
  -- PASSO 4: Criar um Projeto de exemplo
  -- ============================================================================
  INSERT INTO crm_projects (organization_id, name, description, status, color, icon, created_by)
  VALUES (v_org_id, 'Operações Janeiro 2026', 'Gestão operacional do mês de janeiro', 'active', '#8b5cf6', 'calendar', v_user_id)
  RETURNING id INTO v_project_id;

  RAISE NOTICE 'Projeto criado: %', v_project_id;

  -- ============================================================================
  -- PASSO 5: Criar Tarefas CRM de exemplo
  -- ============================================================================
  -- Tarefa 1: Em progresso, alta prioridade
  INSERT INTO crm_tasks (
    organization_id, title, description, status, priority, 
    team_id, assignee_id, project_id, due_date, 
    estimated_minutes, tags, created_by
  ) VALUES (
    v_org_id, 
    'Preparar imóvel para check-in', 
    'Verificação completa do apartamento antes da chegada do hóspede',
    'in_progress', 
    'high',
    v_team_recepcao_id,
    v_user_id,
    v_project_id,
    NOW() + INTERVAL '2 hours',
    60,
    ARRAY['check-in', 'urgente'],
    v_user_id
  );

  -- Tarefa 2: A fazer, urgente
  INSERT INTO crm_tasks (
    organization_id, title, description, status, priority, 
    team_id, due_date, estimated_minutes, tags, created_by
  ) VALUES (
    v_org_id, 
    'Limpeza pós check-out - Casa de Praia', 
    'Limpeza completa após saída do hóspede',
    'pending', 
    'urgent',
    v_team_limpeza_id,
    NOW() + INTERVAL '4 hours',
    120,
    ARRAY['check-out', 'limpeza'],
    v_user_id
  );

  -- Tarefa 3: A fazer, média prioridade
  INSERT INTO crm_tasks (
    organization_id, title, description, status, priority, 
    team_id, due_date, estimated_minutes, tags, created_by
  ) VALUES (
    v_org_id, 
    'Manutenção preventiva semanal', 
    'Verificação geral de equipamentos',
    'pending', 
    'medium',
    v_team_manutencao_id,
    NOW() + INTERVAL '3 days',
    90,
    ARRAY['manutenção', 'preventiva'],
    v_user_id
  );

  -- Tarefa 4: Completa
  INSERT INTO crm_tasks (
    organization_id, title, description, status, priority, 
    assignee_id, project_id, due_date, completed_at, tags, created_by
  ) VALUES (
    v_org_id, 
    'Revisão de contrato - Cobertura Luxo', 
    'Revisar e atualizar contrato de locação',
    'completed', 
    'medium',
    v_user_id,
    v_project_id,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day',
    ARRAY['jurídico', 'contrato'],
    v_user_id
  );

  -- Tarefa 5: Baixa prioridade
  INSERT INTO crm_tasks (
    organization_id, title, description, status, priority, 
    assignee_id, due_date, tags, created_by
  ) VALUES (
    v_org_id, 
    'Atualizar fotos do anúncio', 
    'Tirar novas fotos profissionais do Studio',
    'pending', 
    'low',
    v_user_id,
    NOW() + INTERVAL '7 days',
    ARRAY['marketing', 'fotos'],
    v_user_id
  );

  -- ============================================================================
  -- PASSO 6: Criar Templates de Tarefas Operacionais
  -- ============================================================================
  INSERT INTO operational_task_templates (
    organization_id, name, description, instructions, priority,
    estimated_duration_minutes, trigger_type, event_trigger,
    assignment_type, assigned_team_id, color, icon
  ) VALUES (
    v_org_id,
    'Check-in do Dia',
    'Preparação do imóvel para chegada do hóspede',
    '1. Verificar limpeza\n2. Conferir itens de boas-vindas\n3. Ligar ar-condicionado\n4. Preparar kit de amenidades',
    'high',
    45,
    'event',
    '{"event": "checkin_day", "days_offset": 0, "time_mode": "fixed", "fixed_time": "14:00"}'::JSONB,
    'team',
    v_team_recepcao_id,
    '#3b82f6',
    'key'
  );

  INSERT INTO operational_task_templates (
    organization_id, name, description, instructions, priority,
    estimated_duration_minutes, trigger_type, event_trigger,
    assignment_type, assigned_team_id, color, icon
  ) VALUES (
    v_org_id,
    'Check-out e Limpeza',
    'Limpeza completa após saída do hóspede',
    '1. Verificar se hóspede saiu\n2. Inspecionar imóvel\n3. Realizar limpeza completa\n4. Trocar roupas de cama\n5. Fotografar para registro',
    'high',
    120,
    'event',
    '{"event": "checkout_day", "days_offset": 0, "time_mode": "fixed", "fixed_time": "12:00"}'::JSONB,
    'team',
    v_team_limpeza_id,
    '#22c55e',
    'sparkles'
  );

  INSERT INTO operational_task_templates (
    organization_id, name, description, instructions, priority,
    estimated_duration_minutes, trigger_type, schedule_config,
    assignment_type, assigned_team_id, color, icon
  ) VALUES (
    v_org_id,
    'Manutenção Preventiva Mensal',
    'Verificação mensal de equipamentos e instalações',
    '1. Verificar ar-condicionado\n2. Testar chuveiro e torneiras\n3. Verificar fechaduras\n4. Inspecionar eletrodomésticos',
    'medium',
    60,
    'scheduled',
    '{"frequency": "monthly", "monthly_day": 1, "time": "09:00"}'::JSONB,
    'team',
    v_team_manutencao_id,
    '#f59e0b',
    'wrench'
  );

  -- ============================================================================
  -- PASSO 7: Criar Tarefas Operacionais de exemplo para hoje
  -- ============================================================================
  INSERT INTO operational_tasks (
    organization_id, title, description, status, priority,
    team_id, scheduled_date, scheduled_time, triggered_by_event
  ) VALUES (
    v_org_id,
    'Check-in - Apartamento Centro - Carlos Mendes',
    'Preparar imóvel para chegada do hóspede às 15:00',
    'pending',
    'high',
    v_team_recepcao_id,
    CURRENT_DATE,
    '14:00',
    'checkin_day'
  );

  INSERT INTO operational_tasks (
    organization_id, title, description, status, priority,
    team_id, scheduled_date, scheduled_time, triggered_by_event
  ) VALUES (
    v_org_id,
    'Check-out e Limpeza - Casa de Praia - João Silva',
    'Realizar limpeza após saída do hóspede às 10:00',
    'pending',
    'high',
    v_team_limpeza_id,
    CURRENT_DATE,
    '11:00',
    'checkout_day'
  );

  INSERT INTO operational_tasks (
    organization_id, title, description, status, priority,
    team_id, assignee_id, scheduled_date, scheduled_time, triggered_by_event
  ) VALUES (
    v_org_id,
    'Manutenção - Ar-condicionado com defeito - Studio',
    'Verificar e reparar ar-condicionado que não está gelando',
    'in_progress',
    'medium',
    v_team_manutencao_id,
    v_user_id,
    CURRENT_DATE,
    '09:00',
    'maintenance_request'
  );

  -- ============================================================================
  -- PASSO 8: Criar Campos Customizados de exemplo
  -- ============================================================================
  INSERT INTO custom_fields (
    organization_id, name, description, field_type, scope, 
    options, is_visible_in_list
  ) VALUES (
    v_org_id,
    'Tipo de Imóvel',
    'Classificação do tipo de imóvel',
    'single_select',
    'task',
    '[{"id": "apt", "label": "Apartamento", "color": "#3b82f6"}, {"id": "casa", "label": "Casa", "color": "#22c55e"}, {"id": "studio", "label": "Studio", "color": "#f59e0b"}]'::JSONB,
    true
  );

  INSERT INTO custom_fields (
    organization_id, name, description, field_type, scope, 
    is_visible_in_list
  ) VALUES (
    v_org_id,
    'Código da Reserva',
    'ID da reserva no Stays ou Airbnb',
    'text',
    'task',
    true
  );

  INSERT INTO custom_fields (
    organization_id, name, description, field_type, scope, 
    is_visible_in_list
  ) VALUES (
    v_org_id,
    'Custo Estimado',
    'Valor estimado para a tarefa',
    'currency',
    'task',
    false
  );

  RAISE NOTICE '✅ Seed concluído com sucesso!';
  RAISE NOTICE '📋 Criados: 3 times, 5 tarefas CRM, 3 templates operacionais, 3 tarefas operacionais, 3 campos customizados';

END $$;

-- ============================================================================
-- VERIFICAÇÃO: Consultar dados criados
-- ============================================================================
-- Execute estas queries para verificar os dados:

-- SELECT * FROM teams;
-- SELECT * FROM team_members;
-- SELECT * FROM crm_tasks;
-- SELECT * FROM crm_projects;
-- SELECT * FROM operational_task_templates;
-- SELECT * FROM operational_tasks;
-- SELECT * FROM custom_fields;
