/**
 * CRM Templates Service
 * 
 * Serviço para gerenciar templates de tarefas e projetos.
 * Templates podem ser públicos (compartilhados) ou privados.
 * 
 * @version 1.0.0
 * @date 2026-01-30
 */

import { getSupabaseClient } from '@/utils/supabase/client';

// Usar cliente Supabase com any para evitar erros de tipo até que os tipos sejam gerados
const supabase = getSupabaseClient() as any;

// ============================================================================
// TIPOS
// ============================================================================

export type TemplateType = 'task' | 'project';

export interface TaskTemplateData {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subtasks?: Array<{
    title: string;
    children?: Array<{ title: string }>;
  }>;
  custom_fields?: Record<string, any>;
}

export interface ProjectTemplateData {
  name: string;
  description?: string;
  color?: string;
  sections?: Array<{
    name: string;
    color: string;
    tasks?: Array<{
      title: string;
      description?: string;
      priority?: string;
      subtasks?: Array<{ title: string }>;
    }>;
  }>;
}

export interface CRMTemplate {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description?: string;
  template_type: TemplateType;
  is_public: boolean;
  template_data: TaskTemplateData | ProjectTemplateData;
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
  use_count: number;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  template_type: TemplateType;
  is_public: boolean;
  template_data: TaskTemplateData | ProjectTemplateData;
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  is_public?: boolean;
  template_data?: TaskTemplateData | ProjectTemplateData;
  icon?: string;
  color?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
}

// ============================================================================
// FUNÇÕES
// ============================================================================

/**
 * Busca todos os templates disponíveis para o usuário
 * (seus privados + públicos da organização)
 */
export async function getTemplates(
  type?: TemplateType,
  options?: {
    category?: string;
    search?: string;
    onlyMine?: boolean;
  }
): Promise<CRMTemplate[]> {
  let query = supabase
    .from('crm_templates')
    .select(`
      *,
      users:created_by (
        id,
        name,
        email
      )
    `)
    .eq('is_active', true)
    .order('use_count', { ascending: false })
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('template_type', type);
  }

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar templates:', error);
    throw error;
  }

  // Se onlyMine, filtrar no cliente (RLS já cuida da permissão)
  if (options?.onlyMine) {
    const { data: userData } = await supabase.auth.getUser();
    return (data || []).filter((t: CRMTemplate) => t.created_by === userData.user?.id);
  }

  return data || [];
}

/**
 * Busca um template específico por ID
 */
export async function getTemplateById(id: string): Promise<CRMTemplate | null> {
  const { data, error } = await supabase
    .from('crm_templates')
    .select(`
      *,
      users:created_by (
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar template:', error);
    return null;
  }

  return data;
}

/**
 * Cria um novo template
 */
export async function createTemplate(input: CreateTemplateInput): Promise<CRMTemplate> {
  // Buscar dados do usuário atual
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar organization_id do usuário
  const { data: userProfile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userData.user.id)
    .single();

  if (!userProfile?.organization_id) {
    throw new Error('Usuário sem organização');
  }

  const { data, error } = await supabase
    .from('crm_templates')
    .insert({
      ...input,
      organization_id: userProfile.organization_id,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar template:', error);
    throw error;
  }

  return data;
}

/**
 * Atualiza um template existente
 */
export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<CRMTemplate> {
  const { data, error } = await supabase
    .from('crm_templates')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar template:', error);
    throw error;
  }

  return data;
}

/**
 * Exclui um template (soft delete)
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('crm_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir template:', error);
    throw error;
  }
}

/**
 * Incrementa o contador de uso de um template
 */
export async function incrementTemplateUsage(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_template_use_count', {
    template_id: id,
  });

  if (error) {
    console.error('Erro ao incrementar uso do template:', error);
    // Não lança erro para não atrapalhar o fluxo principal
  }
}

// ============================================================================
// FUNÇÕES DE CRIAÇÃO A PARTIR DE TEMPLATES
// ============================================================================

/**
 * Cria uma tarefa a partir de um template
 */
export async function createTaskFromTemplate(
  templateId: string,
  projectId: string,
  overrides?: Partial<TaskTemplateData>
): Promise<{ taskId: string }> {
  const template = await getTemplateById(templateId);
  
  if (!template || template.template_type !== 'task') {
    throw new Error('Template de tarefa não encontrado');
  }

  const templateData = template.template_data as TaskTemplateData;
  
  // Buscar dados do usuário atual
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('Usuário não autenticado');
  }

  // Criar a tarefa principal
  const { data: task, error: taskError } = await supabase
    .from('crm_tasks')
    .insert({
      title: overrides?.title || templateData.title,
      description: overrides?.description || templateData.description,
      priority: overrides?.priority || templateData.priority || 'medium',
      project_id: projectId,
      created_by: userData.user.id,
      status: 'pending',
    })
    .select()
    .single();

  if (taskError) {
    throw taskError;
  }

  // Criar subtarefas se existirem
  if (templateData.subtasks && templateData.subtasks.length > 0) {
    for (const subtask of templateData.subtasks) {
      const { data: createdSubtask } = await supabase
        .from('crm_tasks')
        .insert({
          title: subtask.title,
          parent_id: task.id,
          project_id: projectId,
          created_by: userData.user.id,
          status: 'pending',
          priority: 'medium',
        })
        .select()
        .single();

      // Criar sub-subtarefas se existirem
      if (subtask.children && subtask.children.length > 0 && createdSubtask) {
        for (const child of subtask.children) {
          await supabase
            .from('crm_tasks')
            .insert({
              title: child.title,
              parent_id: createdSubtask.id,
              project_id: projectId,
              created_by: userData.user.id,
              status: 'pending',
              priority: 'medium',
            });
        }
      }
    }
  }

  // Incrementar uso do template
  await incrementTemplateUsage(templateId);

  return { taskId: task.id };
}

/**
 * Cria um projeto a partir de um template
 */
export async function createProjectFromTemplate(
  templateId: string,
  overrides?: { name?: string; description?: string }
): Promise<{ projectId: string }> {
  const template = await getTemplateById(templateId);
  
  if (!template || template.template_type !== 'project') {
    throw new Error('Template de projeto não encontrado');
  }

  const templateData = template.template_data as ProjectTemplateData;
  
  // Buscar dados do usuário atual
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar organization_id
  const { data: userProfile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userData.user.id)
    .single();

  if (!userProfile?.organization_id) {
    throw new Error('Usuário sem organização');
  }

  // Criar o projeto
  const { data: project, error: projectError } = await supabase
    .from('crm_projects')
    .insert({
      name: overrides?.name || templateData.name,
      description: overrides?.description || templateData.description,
      color: templateData.color || '#6366f1',
      organization_id: userProfile.organization_id,
      created_by: userData.user.id,
      status: 'active',
    })
    .select()
    .single();

  if (projectError) {
    throw projectError;
  }

  // Criar tarefas das seções se existirem
  if (templateData.sections) {
    for (const section of templateData.sections) {
      // Mapear seção para status
      const statusMap: Record<string, string> = {
        'A fazer': 'pending',
        'Em andamento': 'in_progress',
        'Concluído': 'completed',
      };
      const status = statusMap[section.name] || 'pending';

      // Criar tarefas da seção
      if (section.tasks) {
        for (const taskData of section.tasks) {
          const { data: task } = await supabase
            .from('crm_tasks')
            .insert({
              title: taskData.title,
              description: taskData.description,
              priority: taskData.priority || 'medium',
              project_id: project.id,
              created_by: userData.user.id,
              status: status,
            })
            .select()
            .single();

          // Criar subtarefas
          if (taskData.subtasks && task) {
            for (const subtask of taskData.subtasks) {
              await supabase
                .from('crm_tasks')
                .insert({
                  title: subtask.title,
                  parent_id: task.id,
                  project_id: project.id,
                  created_by: userData.user.id,
                  status: 'pending',
                  priority: 'medium',
                });
            }
          }
        }
      }
    }
  }

  // Incrementar uso do template
  await incrementTemplateUsage(templateId);

  return { projectId: project.id };
}

// ============================================================================
// FUNÇÕES PARA CRIAR TEMPLATES A PARTIR DE ITENS EXISTENTES
// ============================================================================

/**
 * Cria um template a partir de uma tarefa existente
 */
export async function createTemplateFromTask(
  taskId: string,
  templateName: string,
  isPublic: boolean,
  options?: { description?: string; category?: string }
): Promise<CRMTemplate> {
  // Buscar tarefa com subtarefas
  const { data: task, error: taskError } = await supabase
    .from('crm_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error('Tarefa não encontrada');
  }

  // Buscar subtarefas (1 nível)
  const { data: subtasks } = await supabase
    .from('crm_tasks')
    .select('*')
    .eq('parent_id', taskId)
    .order('created_at');

  // Buscar sub-subtarefas
  const subtasksWithChildren: Array<{ title: string; children?: Array<{ title: string }> }> = [];
  
  if (subtasks) {
    for (const subtask of subtasks) {
      const { data: children } = await supabase
        .from('crm_tasks')
        .select('title')
        .eq('parent_id', subtask.id)
        .order('created_at');

      subtasksWithChildren.push({
        title: subtask.title,
        children: children || undefined,
      });
    }
  }

  // Montar dados do template
  const templateData: TaskTemplateData = {
    title: task.title,
    description: task.description || undefined,
    priority: task.priority || 'medium',
    subtasks: subtasksWithChildren.length > 0 ? subtasksWithChildren : undefined,
  };

  // Criar o template
  return createTemplate({
    name: templateName,
    description: options?.description,
    template_type: 'task',
    is_public: isPublic,
    template_data: templateData,
    category: options?.category,
    icon: 'check-square',
    color: '#6366f1',
  });
}

/**
 * Cria um template a partir de um projeto existente
 */
export async function createTemplateFromProject(
  projectId: string,
  templateName: string,
  isPublic: boolean,
  options?: { description?: string; category?: string; includeTasks?: boolean }
): Promise<CRMTemplate> {
  // Buscar projeto
  const { data: project, error: projectError } = await supabase
    .from('crm_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error('Projeto não encontrado');
  }

  // Montar dados do template
  const templateData: ProjectTemplateData = {
    name: project.name,
    description: project.description || undefined,
    color: project.color || '#6366f1',
  };

  // Se deve incluir tarefas
  if (options?.includeTasks) {
    // Buscar tarefas principais (sem parent_id)
    const { data: tasks } = await supabase
      .from('crm_tasks')
      .select('*')
      .eq('project_id', projectId)
      .is('parent_id', null)
      .order('created_at');

    // Agrupar por status (seções)
    const sections: ProjectTemplateData['sections'] = [
      { name: 'A fazer', color: '#f59e0b', tasks: [] },
      { name: 'Em andamento', color: '#3b82f6', tasks: [] },
      { name: 'Concluído', color: '#22c55e', tasks: [] },
    ];

    if (tasks) {
      for (const task of tasks) {
        // Buscar subtarefas
        const { data: subtasks } = await supabase
          .from('crm_tasks')
          .select('title')
          .eq('parent_id', task.id)
          .order('created_at');

        const taskData = {
          title: task.title,
          description: task.description || undefined,
          priority: task.priority,
          subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
        };

        // Determinar seção baseado no status
        const sectionIndex = task.status === 'completed' ? 2 : task.status === 'in_progress' ? 1 : 0;
        sections[sectionIndex].tasks!.push(taskData);
      }
    }

    // Remover seções vazias (opcional)
    templateData.sections = sections.filter(s => s.tasks && s.tasks.length > 0);
    
    // Se todas vazias, manter estrutura básica
    if (templateData.sections.length === 0) {
      templateData.sections = sections.map(s => ({ ...s, tasks: [] }));
    }
  }

  // Criar o template
  return createTemplate({
    name: templateName,
    description: options?.description,
    template_type: 'project',
    is_public: isPublic,
    template_data: templateData,
    category: options?.category,
    icon: 'folder',
    color: project.color || '#6366f1',
  });
}

export default {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementTemplateUsage,
  createTaskFromTemplate,
  createProjectFromTemplate,
  createTemplateFromTask,
  createTemplateFromProject,
};

