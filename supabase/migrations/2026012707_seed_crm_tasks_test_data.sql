-- ============================================================================
-- SEED: Dados de Teste para Sistema CRM Tasks
-- Version: 1.0.0
-- Date: 2026-01-28
-- 
-- IMPORTANTE: Substitua 'YOUR_ORG_ID' pelo ID real da sua organização
-- Execute: SELECT id FROM organizations LIMIT 1;
-- ============================================================================

-- Variável para facilitar (substitua pelo seu org_id real)
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_team_limpeza_id UUID;
  v_team_manutencao_id UUID;
  v_team_recepcao_id UUID;
  v_project_id UUID;
  v_task_id UUID;
BEGIN
  -- Pega a primeira organização disponível
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  
  -- Pega o primeiro usuário disponível
  SELECT id INTO v_user_id FROM users WHERE organization_id = v_org_id LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma organização encontrada. Crie uma organização primeiro.';
  END IF;
  
  RAISE NOTICE 'Usando organization_id: %', v_org_id;
  RAISE NOTICE 'Usando user_id: %', v_user_id;

  -- ============================================================================
  -- 1. EQUIPES (Teams)
  -- ============================================================================
  
  INSERT INTO teams (id, organization_id, name, description, color, icon, notification_channels, assignment_rule)
  VALUES 
    (gen_random_uuid(), v_org_id, 'Equipe de Limpeza', 'Responsável por limpezas e preparação de imóveis', '#10b981', 'sparkles', ARRAY['whatsapp', 'push'], 'round_robin')
  RETURNING id INTO v_team_limpeza_id;
  
  INSERT INTO teams (id, organization_id, name, description, color, icon, notification_channels, assignment_rule)
  VALUES 
    (gen_random_uuid(), v_org_id, 'Equipe de Manutenção', 'Reparos e manutenções preventivas', '#f59e0b', 'wrench', ARRAY['whatsapp', 'push'], 'least_busy')
  RETURNING id INTO v_team_manutencao_id;
  
  INSERT INTO teams (id, organization_id, name, description, color, icon, notification_channels, assignment_rule)
  VALUES 
    (gen_random_uuid(), v_org_id, 'Equipe de Recepção', 'Check-ins, check-outs e atendimento', '#3b82f6', 'users', ARRAY['whatsapp', 'push'], 'notify_all')
  RETURNING id INTO v_team_recepcao_id;

  -- Membros das equipes (externos para teste)
  INSERT INTO team_members (team_id, external_name, external_phone, role) VALUES
    (v_team_limpeza_id, 'Maria Silva', '11999001001', 'leader'),
    (v_team_limpeza_id, 'João Santos', '11999001002', 'member'),
    (v_team_limpeza_id, 'Ana Oliveira', '11999001003', 'member'),
    (v_team_manutencao_id, 'Carlos Ferreira', '11999002001', 'leader'),
    (v_team_manutencao_id, 'Pedro Lima', '11999002002', 'member'),
    (v_team_recepcao_id, 'Fernanda Costa', '11999003001', 'leader'),
    (v_team_recepcao_id, 'Lucas Mendes', '11999003002', 'member');

  -- ============================================================================
  -- 2. PROJETOS
  -- ============================================================================
  
  INSERT INTO crm_projects (id, organization_id, name, description, status, color, icon, created_by)
  VALUES (gen_random_uuid(), v_org_id, 'Operações Janeiro 2026', 'Gestão operacional do mês de janeiro', 'active', '#8b5cf6', 'calendar', v_user_id)
  RETURNING id INTO v_project_id;
  
  INSERT INTO crm_projects (organization_id, name, description, status, color, icon, created_by)
  VALUES 
    (v_org_id, 'Manutenção Preventiva Q1', 'Manutenções programadas para o 1º trimestre', 'active', '#f59e0b', 'wrench', v_user_id),
    (v_org_id, 'Onboarding Novos Imóveis', 'Checklist para novos imóveis na plataforma', 'active', '#10b981', 'home', v_user_id);

  -- ============================================================================
  -- 3. TAREFAS CRM (crm_tasks) - Variedade de status e prioridades
  -- ============================================================================
  
  -- Tarefas pendentes de alta prioridade
  INSERT INTO crm_tasks (organization_id, title, description, status, priority, due_date, team_id, project_id, tags, created_by) VALUES
    (v_org_id, 'Revisar contrato Apt 302 - Locação anual', 'Cliente solicitou revisão de cláusulas', 'pending', 'urgent', NOW() + INTERVAL '1 day', v_team_recepcao_id, v_project_id, ARRAY['contrato', 'urgente'], v_user_id),
    (v_org_id, 'Orçamento reforma cozinha Casa 15', 'Solicitar 3 orçamentos para reforma completa', 'pending', 'high', NOW() + INTERVAL '3 days', v_team_manutencao_id, v_project_id, ARRAY['reforma', 'orçamento'], v_user_id),
    (v_org_id, 'Agendar vistoria Cobertura 801', 'Vistoria de saída do inquilino anterior', 'pending', 'high', NOW() + INTERVAL '2 days', v_team_recepcao_id, v_project_id, ARRAY['vistoria'], v_user_id);
  
  -- Tarefas em andamento
  INSERT INTO crm_tasks (organization_id, title, description, status, priority, due_date, start_date, team_id, project_id, tags, created_by) VALUES
    (v_org_id, 'Pintura externa Casa 08', 'Pintura das paredes externas - 2º dia', 'in_progress', 'medium', NOW() + INTERVAL '5 days', NOW() - INTERVAL '1 day', v_team_manutencao_id, v_project_id, ARRAY['pintura', 'manutenção'], v_user_id),
    (v_org_id, 'Atualizar fotos Apt 205', 'Sessão fotográfica profissional agendada', 'in_progress', 'medium', NOW() + INTERVAL '1 day', NOW(), v_team_recepcao_id, v_project_id, ARRAY['fotos', 'marketing'], v_user_id),
    (v_org_id, 'Negociação renovação Apt 101', 'Em negociação com o inquilino', 'in_progress', 'high', NOW() + INTERVAL '7 days', NOW() - INTERVAL '3 days', v_team_recepcao_id, v_project_id, ARRAY['renovação', 'negociação'], v_user_id);
  
  -- Tarefas completadas recentemente
  INSERT INTO crm_tasks (organization_id, title, description, status, priority, due_date, completed_at, team_id, project_id, tags, created_by) VALUES
    (v_org_id, 'Limpeza pós-obra Apt 405', 'Limpeza completa após reforma do banheiro', 'completed', 'high', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours', v_team_limpeza_id, v_project_id, ARRAY['limpeza', 'pós-obra'], v_user_id),
    (v_org_id, 'Instalação ar-condicionado Casa 12', 'Split 12000 BTUs instalado', 'completed', 'medium', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', v_team_manutencao_id, v_project_id, ARRAY['instalação', 'ar-condicionado'], v_user_id),
    (v_org_id, 'Entrega de chaves Apt 503', 'Chaves entregues ao novo inquilino', 'completed', 'urgent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', v_team_recepcao_id, v_project_id, ARRAY['chaves', 'entrega'], v_user_id);
  
  -- Tarefas com subtarefas (hierarquia)
  INSERT INTO crm_tasks (id, organization_id, title, description, status, priority, due_date, team_id, project_id, tags, created_by)
  VALUES (gen_random_uuid(), v_org_id, 'Preparação Apt 607 para nova locação', 'Checklist completo de preparação', 'in_progress', 'high', NOW() + INTERVAL '4 days', v_team_limpeza_id, v_project_id, ARRAY['preparação', 'checklist'], v_user_id)
  RETURNING id INTO v_task_id;
  
  -- Subtarefas
  INSERT INTO crm_tasks (organization_id, title, status, priority, parent_id, depth, team_id, created_by) VALUES
    (v_org_id, 'Limpeza geral', 'completed', 'medium', v_task_id, 1, v_team_limpeza_id, v_user_id),
    (v_org_id, 'Verificar instalações elétricas', 'completed', 'medium', v_task_id, 1, v_team_manutencao_id, v_user_id),
    (v_org_id, 'Verificar encanamento', 'in_progress', 'medium', v_task_id, 1, v_team_manutencao_id, v_user_id),
    (v_org_id, 'Pintura de retoques', 'pending', 'low', v_task_id, 1, v_team_manutencao_id, v_user_id),
    (v_org_id, 'Sessão de fotos', 'pending', 'medium', v_task_id, 1, v_team_recepcao_id, v_user_id),
    (v_org_id, 'Publicar anúncio', 'pending', 'medium', v_task_id, 1, v_team_recepcao_id, v_user_id);

  -- Mais tarefas variadas
  INSERT INTO crm_tasks (organization_id, title, description, status, priority, due_date, team_id, tags, created_by) VALUES
    (v_org_id, 'Dedetização trimestral - Bloco A', 'Agendada para semana que vem', 'pending', 'medium', NOW() + INTERVAL '7 days', v_team_manutencao_id, ARRAY['dedetização', 'preventiva'], v_user_id),
    (v_org_id, 'Trocar fechadura Apt 102', 'Inquilino perdeu a chave', 'pending', 'urgent', NOW(), v_team_manutencao_id, ARRAY['fechadura', 'urgente'], v_user_id),
    (v_org_id, 'Limpeza de caixa d''água', 'Manutenção semestral obrigatória', 'pending', 'high', NOW() + INTERVAL '14 days', v_team_manutencao_id, ARRAY['caixa-dagua', 'obrigatória'], v_user_id),
    (v_org_id, 'Revisar extintores - Todos os imóveis', 'Vencimento em 30 dias', 'pending', 'medium', NOW() + INTERVAL '21 days', v_team_manutencao_id, ARRAY['extintores', 'segurança'], v_user_id),
    (v_org_id, 'Atualizar cadastro proprietários', 'Dados fiscais para IRPF', 'in_progress', 'medium', NOW() + INTERVAL '30 days', v_team_recepcao_id, ARRAY['cadastro', 'fiscal'], v_user_id),
    (v_org_id, 'Follow-up leads janeiro', 'Contatar leads que não responderam', 'pending', 'high', NOW() + INTERVAL '2 days', v_team_recepcao_id, ARRAY['leads', 'follow-up'], v_user_id),
    (v_org_id, 'Preparar relatório mensal', 'Relatório de ocupação e receita', 'pending', 'medium', NOW() + INTERVAL '5 days', v_team_recepcao_id, ARRAY['relatório', 'mensal'], v_user_id);

  -- ============================================================================
  -- 4. TAREFAS OPERACIONAIS (operational_tasks) - Check-ins, Check-outs, Limpezas
  -- ============================================================================
  
  -- CHECK-INS de hoje
  INSERT INTO operational_tasks (organization_id, title, description, status, priority, scheduled_date, scheduled_time, triggered_by_event, reservation_id, team_id) VALUES
    (v_org_id, 'Check-in - Apt 302 - Família Silva', 'Chegada prevista às 14h. 4 pessoas, 2 crianças.', 'pending', 'high', CURRENT_DATE, '14:00', 'checkin_day', 'RES-2026-001', v_team_recepcao_id),
    (v_org_id, 'Check-in - Casa 15 - João Santos', 'Chegada prevista às 16h. Hóspede recorrente.', 'pending', 'medium', CURRENT_DATE, '16:00', 'checkin_day', 'RES-2026-002', v_team_recepcao_id),
    (v_org_id, 'Check-in - Apt 508 - Maria Costa', 'Chegada prevista às 18h. Primeira visita.', 'pending', 'medium', CURRENT_DATE, '18:00', 'checkin_day', 'RES-2026-003', v_team_recepcao_id),
    (v_org_id, 'Check-in - Cobertura 801 - Empresa ABC', 'Chegada às 15h. Reserva corporativa, 2 executivos.', 'in_progress', 'high', CURRENT_DATE, '15:00', 'checkin_day', 'RES-2026-004', v_team_recepcao_id);
  
  -- CHECK-OUTS de hoje
  INSERT INTO operational_tasks (organization_id, title, description, status, priority, scheduled_date, scheduled_time, triggered_by_event, reservation_id, team_id) VALUES
    (v_org_id, 'Check-out - Apt 205 - Pedro Lima', 'Saída até 11h. Verificar estado do imóvel.', 'completed', 'medium', CURRENT_DATE, '11:00', 'checkout_day', 'RES-2026-010', v_team_recepcao_id),
    (v_org_id, 'Check-out - Casa 08 - Ana Oliveira', 'Saída até 10h. Limpeza agendada para 11h.', 'pending', 'high', CURRENT_DATE, '10:00', 'checkout_day', 'RES-2026-011', v_team_recepcao_id),
    (v_org_id, 'Check-out - Apt 101 - Carlos Mendes', 'Saída às 12h. Hóspede pediu late checkout.', 'pending', 'medium', CURRENT_DATE, '12:00', 'checkout_day', 'RES-2026-012', v_team_recepcao_id);
  
  -- LIMPEZAS de hoje
  INSERT INTO operational_tasks (organization_id, title, description, instructions, status, priority, scheduled_date, scheduled_time, triggered_by_event, team_id) VALUES
    (v_org_id, 'Limpeza completa - Apt 205', 'Limpeza pós check-out para novo hóspede às 16h', 'Trocar roupas de cama, toalhas. Verificar amenities. Limpar todos os cômodos.', 'pending', 'urgent', CURRENT_DATE, '11:30', 'checkout_day', v_team_limpeza_id),
    (v_org_id, 'Limpeza completa - Casa 08', 'Limpeza pós check-out', 'Limpeza pesada. Casa com jardim. Verificar piscina.', 'pending', 'high', CURRENT_DATE, '11:00', 'checkout_day', v_team_limpeza_id),
    (v_org_id, 'Limpeza expressa - Apt 302', 'Preparação para check-in às 14h', 'Apenas revisão rápida. Já foi limpo ontem.', 'in_progress', 'high', CURRENT_DATE, '12:00', 'checkin_day', v_team_limpeza_id),
    (v_org_id, 'Limpeza completa - Apt 101', 'Limpeza após check-out às 12h', 'Verificar se não há danos. Inquilino ficou 7 dias.', 'pending', 'medium', CURRENT_DATE, '13:00', 'checkout_day', v_team_limpeza_id);
  
  -- MANUTENÇÕES de hoje
  INSERT INTO operational_tasks (organization_id, title, description, instructions, status, priority, scheduled_date, scheduled_time, triggered_by_event, team_id) VALUES
    (v_org_id, 'Reparo vazamento - Apt 405', 'Torneira do banheiro pingando', 'Verificar vedação. Trocar reparo se necessário.', 'pending', 'high', CURRENT_DATE, '09:00', 'manual', v_team_manutencao_id),
    (v_org_id, 'Troca de lâmpadas - Casa 12', 'Lâmpadas queimadas na área externa', 'Trocar 4 lâmpadas LED. Material no almoxarifado.', 'completed', 'low', CURRENT_DATE, '08:00', 'manual', v_team_manutencao_id),
    (v_org_id, 'Verificar ar-condicionado - Apt 607', 'Hóspede reclamou que não está gelando', 'Verificar gás e filtros. Limpar se necessário.', 'in_progress', 'high', CURRENT_DATE, '10:00', 'manual', v_team_manutencao_id),
    (v_org_id, 'Instalar suporte TV - Cobertura 801', 'Solicitação do hóspede corporativo', 'Suporte para TV 55". Furadeira necessária.', 'pending', 'medium', CURRENT_DATE, '14:00', 'manual', v_team_manutencao_id);

  -- Tarefas operacionais para os próximos dias
  INSERT INTO operational_tasks (organization_id, title, status, priority, scheduled_date, scheduled_time, triggered_by_event, reservation_id, team_id) VALUES
    (v_org_id, 'Check-in - Apt 405 - Roberto Alves', 'pending', 'medium', CURRENT_DATE + 1, '15:00', 'checkin_day', 'RES-2026-020', v_team_recepcao_id),
    (v_org_id, 'Check-in - Casa 03 - Família Pereira', 'pending', 'high', CURRENT_DATE + 1, '14:00', 'checkin_day', 'RES-2026-021', v_team_recepcao_id),
    (v_org_id, 'Check-out - Apt 302 - Família Silva', 'pending', 'medium', CURRENT_DATE + 3, '10:00', 'checkout_day', 'RES-2026-001', v_team_recepcao_id),
    (v_org_id, 'Limpeza completa - Apt 405', 'pending', 'high', CURRENT_DATE + 1, '11:00', 'checkin_day', v_team_limpeza_id),
    (v_org_id, 'Manutenção preventiva piscina - Casa 03', 'pending', 'medium', CURRENT_DATE + 1, '08:00', 'manual', v_team_manutencao_id);

  -- ============================================================================
  -- 5. TEMPLATES DE TAREFAS OPERACIONAIS
  -- ============================================================================
  
  INSERT INTO operational_task_templates (organization_id, name, description, instructions, priority, trigger_type, event_trigger, assigned_team_id, color, icon) VALUES
    (v_org_id, 'Check-in Padrão', 'Recepção de hóspedes no dia do check-in', 'Verificar documentos, entregar chaves, explicar regras da casa, mostrar funcionamento dos equipamentos.', 'high', 'event', '{"event": "checkin_day", "days_offset": 0, "time_mode": "fixed", "fixed_time": "14:00"}', v_team_recepcao_id, '#3b82f6', 'key'),
    (v_org_id, 'Check-out Padrão', 'Despedida e verificação no check-out', 'Receber chaves, verificar estado do imóvel, conferir consumíveis, registrar observações.', 'high', 'event', '{"event": "checkout_day", "days_offset": 0, "time_mode": "fixed", "fixed_time": "10:00"}', v_team_recepcao_id, '#ef4444', 'log-out'),
    (v_org_id, 'Limpeza Pós Check-out', 'Limpeza completa após saída do hóspede', 'Limpeza completa de todos os cômodos, troca de roupas de cama e banho, reposição de amenities.', 'urgent', 'event', '{"event": "checkout_day", "days_offset": 0, "offset_hours": 1, "time_mode": "relative"}', v_team_limpeza_id, '#10b981', 'sparkles'),
    (v_org_id, 'Limpeza Pré Check-in', 'Revisão rápida antes da chegada', 'Verificar se está tudo em ordem, últimos ajustes, conferir amenities.', 'high', 'event', '{"event": "checkin_day", "days_offset": 0, "offset_hours": -2, "time_mode": "relative"}', v_team_limpeza_id, '#10b981', 'sparkles'),
    (v_org_id, 'Manutenção Semanal Piscina', 'Tratamento e limpeza da piscina', 'Verificar pH, adicionar cloro, limpar bordas, aspirar fundo.', 'medium', 'scheduled', '{"frequency": "weekly", "weekly_days": [1], "time": "08:00"}', v_team_manutencao_id, '#06b6d4', 'droplets');

  -- ============================================================================
  -- 6. CAMPOS CUSTOMIZADOS
  -- ============================================================================
  
  INSERT INTO custom_fields (organization_id, name, description, field_type, options, scope, display_order) VALUES
    (v_org_id, 'Tipo de Imóvel', 'Categoria do imóvel', 'single_select', '[{"id": "apt", "label": "Apartamento", "color": "#3b82f6"}, {"id": "casa", "label": "Casa", "color": "#10b981"}, {"id": "cobertura", "label": "Cobertura", "color": "#8b5cf6"}, {"id": "studio", "label": "Studio", "color": "#f59e0b"}]', 'task', 1),
    (v_org_id, 'Custo Estimado', 'Valor estimado para a tarefa', 'currency', '[]', 'task', 2),
    (v_org_id, 'Fornecedor', 'Fornecedor responsável', 'text', '[]', 'task', 3),
    (v_org_id, 'Data de Garantia', 'Validade da garantia do serviço', 'date', '[]', 'task', 4);

  -- ============================================================================
  -- 7. COMENTÁRIOS EM TAREFAS (exemplo)
  -- ============================================================================
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO task_comments (task_id, user_id, content) 
    SELECT id, v_user_id, 'Tarefa criada automaticamente pelo seed de teste.'
    FROM crm_tasks 
    WHERE organization_id = v_org_id 
    LIMIT 3;
  END IF;

  RAISE NOTICE 'Seed de teste criado com sucesso!';
  RAISE NOTICE 'Equipes: 3';
  RAISE NOTICE 'Projetos: 3';
  RAISE NOTICE 'Tarefas CRM: ~20';
  RAISE NOTICE 'Tarefas Operacionais: ~20';
  RAISE NOTICE 'Templates: 5';
  RAISE NOTICE 'Campos Customizados: 4';

END $$;
