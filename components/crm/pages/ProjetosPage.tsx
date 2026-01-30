/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    PROJETOS PAGE - LISTA ESTILO CLICKUP                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Página de projetos/serviços com:
 * - Lista agrupada por status
 * - Colunas configuráveis
 * - Progresso visual
 * - Click abre modal lateral com persistência real
 * 
 * @version 2.0.0
 * @date 2026-01-30
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Flag,
  Search,
  SortAsc,
  LayoutList,
  LayoutGrid,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Copy,
  Trash2,
  Archive,
  Star,
  StarOff,
  RefreshCw,
  Edit2,
  Eye,
  Loader2,
  FileCode,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Modal lateral unificado para tarefas
import { TaskFormSheet } from '../modals/TaskFormSheet';
// Modal de detalhe do projeto com persistência real
import { ProjectDetailModal } from '../modals/ProjectDetailModal';
// Modal para criar templates
import { CreateTemplateModal } from '../modals/CreateTemplateModal';
// Hooks para dados reais
import { useProjectsWithStats, useCreateProject } from '@/hooks/useCRMTasks';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'list' | 'board' | 'calendar';
type ProjectStatus = 'NAO_INICIADO' | 'FOTOS_VISTORIA' | 'TRANSPORTANDO_CS' | 'AGUARDANDO_PROPRIETARIO' | 'FIM_DE' | 'DESISTENTES' | 'active' | 'completed' | 'archived';

interface ProjectMember {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
}

interface ProjectWithStats {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
  updated_at: string;
  dueDate?: string;
  stats?: {
    comments: number;
    attachments: number;
  };
  starred?: boolean;
  assignee?: ProjectMember;
}

// ============================================================================
// CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; order: number }> = {
  'NAO_INICIADO': { label: 'NÃO INICIADO', color: 'text-gray-600', bgColor: 'bg-gray-100', order: 1 },
  'FOTOS_VISTORIA': { label: 'FOTOS/VISTORIA/CHECKIN', color: 'text-purple-600', bgColor: 'bg-purple-100', order: 2 },
  'TRANSPORTANDO_CS': { label: 'TRANSPORTANDO CS', color: 'text-green-600', bgColor: 'bg-green-100', order: 3 },
  'AGUARDANDO_PROPRIETARIO': { label: 'AGUARDANDO PROPRIETÁRIO', color: 'text-yellow-600', bgColor: 'bg-yellow-100', order: 4 },
  'FIM_DE': { label: 'FIM DE', color: 'text-blue-600', bgColor: 'bg-blue-100', order: 5 },
  'DESISTENTES': { label: 'DESISTENTES', color: 'text-red-600', bgColor: 'bg-red-100', order: 6 },
  'active': { label: 'ATIVO', color: 'text-blue-600', bgColor: 'bg-blue-100', order: 1 },
  'completed': { label: 'CONCLUÍDO', color: 'text-green-600', bgColor: 'bg-green-100', order: 2 },
  'archived': { label: 'ARQUIVADO', color: 'text-gray-600', bgColor: 'bg-gray-100', order: 3 },
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface ProjectRowProps {
  project: ProjectWithStats;
  onClick?: () => void;
  onEdit?: () => void;
  onStar?: () => void;
  onCreateTemplate?: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, onClick, onEdit, onStar, onCreateTemplate }) => {
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['active'];
  const stats = project.stats || { comments: 0, attachments: 0 };
  const progress = project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0;
  
  // Use dueDate from project if available, otherwise fall back to updated_at
  const dueDate = project.dueDate ? parseISO(project.dueDate) : (project.updated_at ? parseISO(project.updated_at) : null);
  const isOverdue = dueDate && isBefore(dueDate, new Date()) && !['completed', 'archived', 'FIM_DE', 'DESISTENTES'].includes(project.status);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-4 py-3 border-b hover:bg-accent/50 cursor-pointer transition-colors',
        project.starred && 'bg-yellow-50/50 dark:bg-yellow-950/20'
      )}
    >
      {/* Checkbox / Expand */}
      <button className="p-1 hover:bg-accent rounded" onClick={(e) => e.stopPropagation()}>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Status indicator */}
      <div 
        className="w-1.5 h-8 rounded-full" 
        style={{ backgroundColor: project.color || '#64748b' }}
      />

      {/* Star */}
      <button 
        className={cn(
          'p-1 hover:bg-accent rounded transition-opacity',
          !project.starred && 'opacity-0 group-hover:opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onStar?.();
        }}
      >
        {project.starred ? (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ) : (
          <StarOff className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{project.name}</span>
          {stats.attachments > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {stats.attachments}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {project.completed_tasks}/{project.total_tasks}
          </span>
          {stats.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {stats.comments}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-24 hidden md:block">
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-1.5" />
          <span className="text-xs text-muted-foreground w-8">{progress}%</span>
        </div>
      </div>

      {/* Updated Date */}
      <div className="w-24 hidden lg:block">
        {dueDate && (
          <span className={cn(
            'text-sm flex items-center gap-1',
            isOverdue ? 'text-red-500' : 'text-muted-foreground'
          )}>
            <Calendar className="h-3 w-3" />
            {format(dueDate, "dd/MM/yy", { locale: ptBR })}
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className="w-36 hidden xl:block">
        <Badge className={cn('text-xs font-normal', statusConfig.bgColor, statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Owner Avatar */}
      <div className="w-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">RM</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>Rafael Marques</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Tarefas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar Projeto
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateTemplate?.(); }}>
            <FileCode className="h-4 w-4 mr-2" />
            Criar Modelo
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Archive className="h-4 w-4 mr-2" />
            Arquivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface StatusGroupProps {
  status: string;
  projects: ProjectWithStats[];
  onProjectClick?: (project: ProjectWithStats) => void;
  onProjectEdit?: (project: ProjectWithStats) => void;
  onAddProject?: (status: string) => void;
  onCreateTemplate?: (project: ProjectWithStats) => void;
}

const StatusGroup: React.FC<StatusGroupProps> = ({ status, projects, onProjectClick, onProjectEdit, onAddProject, onCreateTemplate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['not_started'];

  return (
    <div className="mb-2">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group w-full flex items-center gap-2 px-4 py-2 hover:bg-accent/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Badge className={cn('text-xs font-medium', config.bgColor, config.color)}>
          {config.label}
        </Badge>
        <span className="text-sm text-muted-foreground">{projects.length}</span>
        <span className="text-xs text-muted-foreground ml-2">• • •</span>
        <button 
          className="text-xs text-primary hover:underline ml-auto opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onAddProject?.(status);
          }}
        >
          + Adicionar projeto
        </button>
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="border-l-2 ml-4" style={{ borderColor: projects[0]?.color || '#e2e8f0' }}>
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onClick={() => onProjectClick?.(project)}
              onEdit={() => onProjectEdit?.(project)}
              onCreateTemplate={() => onCreateTemplate?.(project)}
            />
          ))}
          {/* Add Project Row */}
          <button 
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
            onClick={() => onAddProject?.(status)}
          >
            <Plus className="h-4 w-4" />
            Adicionar projeto
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjetosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estado do modal de criação de tarefa
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState<string | undefined>();
  
  // Estado do modal de criação de projeto
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(() => {
    // Abre automaticamente se tiver ?new=true na URL
    return searchParams.get('new') === 'true';
  });
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  const [newProjectStatus, setNewProjectStatus] = useState<string>('active');

  // Estado do modal de criar template
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [templateProject, setTemplateProject] = useState<ProjectWithStats | null>(null);

  // Hook para criar projeto
  const createProjectMutation = useCreateProject();

  // Handler para criar template de projeto
  const handleCreateTemplate = useCallback((project: ProjectWithStats) => {
    setTemplateProject(project);
    setIsCreateTemplateOpen(true);
  }, []);

  // Handler para abrir modal de criação de tarefa
  const handleCreateTask = (projectId?: string) => {
    setTaskProjectId(projectId);
    setIsTaskFormOpen(true);
  };

  // Handler para criar novo projeto
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Nome do projeto é obrigatório');
      return;
    }

    try {
      await createProjectMutation.mutateAsync({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        color: newProjectColor,
        status: newProjectStatus,
      });
      
      toast.success('Projeto criado com sucesso!');
      
      // Reset form and close modal
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectColor('#3b82f6');
      setNewProjectStatus('active');
      setIsCreateProjectOpen(false);
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      toast.error('Erro ao criar projeto');
    }
  };

  // Abrir modal de criação de projeto
  const openCreateProjectModal = (status?: string) => {
    if (status) {
      setNewProjectStatus(status);
    }
    setIsCreateProjectOpen(true);
  };

  // Dados reais do banco via React Query
  const { data: projectsData = [], isLoading: isLoadingProjects } = useProjectsWithStats();
  
  // Converter dados do banco para o formato esperado
  const projects: ProjectWithStats[] = useMemo(() => {
    return projectsData.map(p => ({
      id: p.id,
      organization_id: p.organization_id,
      name: p.name,
      description: p.description,
      status: (p.status || 'active') as ProjectStatus,
      color: p.color || '#3b82f6',
      total_tasks: p.total_tasks || 0,
      completed_tasks: p.completed_tasks || 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
      dueDate: undefined, // TODO: add due_date to crm_projects table if needed
      stats: { comments: 0, attachments: 0 }, // TODO: calculate from task_comments
      starred: false, // TODO: add starred to crm_projects table if needed
    }));
  }, [projectsData]);

  // Filter & Group
  const filteredProjects = useMemo(() => {
    let result = projects;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }
    
    return result;
  }, [projects, searchQuery, statusFilter]);

  const groupedProjects = useMemo(() => {
    const groups = filteredProjects.reduce((acc, project) => {
      if (!acc[project.status]) {
        acc[project.status] = [];
      }
      acc[project.status].push(project);
      return acc;
    }, {} as Record<string, ProjectWithStats[]>);
    
    return groups;
  }, [filteredProjects]);

  // Order of status groups
  const statusOrder = Object.keys(STATUS_CONFIG).sort((a, b) => 
    (STATUS_CONFIG[a as ProjectStatus].order || 99) - (STATUS_CONFIG[b as ProjectStatus].order || 99)
  );

  // Stats
  const totalTasks = projects.reduce((acc, p) => acc + (p.total_tasks || 0), 0);
  const completedTasks = projects.reduce((acc, p) => acc + (p.completed_tasks || 0), 0);

  // Handlers
  const handleProjectClick = useCallback((project: ProjectWithStats) => {
    // Navegar para a página de tarefas do projeto
    navigate(`/crm/projetos/${project.id}`);
  }, [navigate]);
  
  // Handler para abrir detalhes do projeto (botão de editar)
  const handleEditProject = useCallback((project: ProjectWithStats) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Projetos & Serviços</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length} projetos • {totalTasks} tarefas ({completedTasks} concluídas)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => openCreateProjectModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Button variant="outline" size="sm">
            <SortAsc className="h-4 w-4 mr-2" />
            Grupo: Status
          </Button>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="h-7 px-2"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="h-7 px-2"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase flex-shrink-0">
        <div className="w-8" /> {/* Expand */}
        <div className="w-1.5" /> {/* Status line */}
        <div className="w-8" /> {/* Star */}
        <div className="flex-1">Nome</div>
        <div className="w-24 hidden md:block">Progresso</div>
        <div className="w-24 hidden lg:block">Atualizado</div>
        <div className="w-36 hidden xl:block">Status</div>
        <div className="w-10">Dono</div>
        <div className="w-7" /> {/* Actions */}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery ? 'Tente outra busca' : 'Crie seu primeiro projeto'}
            </p>
            <Button className="mt-4" onClick={() => openCreateProjectModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        ) : (
          <>
            {statusOrder.map((status) => {
              const statusProjects = groupedProjects[status];
              if (!statusProjects || statusProjects.length === 0) return null;
              return (
                <StatusGroup
                  key={status}
                  status={status}
                  projects={statusProjects}
                  onProjectClick={handleProjectClick}
                  onProjectEdit={handleEditProject}
                  onAddProject={openCreateProjectModal}
                  onCreateTemplate={handleCreateTemplate}
                />
              );
            })}

            {/* New Status */}
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">
              <Plus className="h-4 w-4" />
              Novo status
            </button>
          </>
        )}
      </ScrollArea>

      {/* Project Detail Modal */}
      <ProjectDetailModal 
        project={selectedProject} 
        isOpen={isDetailOpen} 
        onClose={() => setIsDetailOpen(false)}
        onCreateTask={handleCreateTask}
      />

      {/* Task Form Sheet - Modal lateral unificado */}
      <TaskFormSheet
        open={isTaskFormOpen}
        onOpenChange={setIsTaskFormOpen}
        mode="create"
        defaultProjectId={taskProjectId}
        onSuccess={() => setIsTaskFormOpen(false)}
      />

      {/* Create Project Sheet */}
      <Sheet open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <SheetContent className="w-[500px] sm:w-[540px] px-6">
          <SheetHeader className="pr-4">
            <SheetTitle>Novo Projeto</SheetTitle>
            <SheetDescription>
              Crie um novo projeto para organizar suas tarefas
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-5 pr-4">
            {/* Nome do Projeto */}
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome do Projeto *</Label>
              <Input
                id="project-name"
                placeholder="Ex: Site para cliente X"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="project-description">Descrição</Label>
              <Textarea
                id="project-description"
                placeholder="Descreva o projeto..."
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status Inicial</Label>
              <Select value={newProjectStatus} onValueChange={setNewProjectStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label>Cor do Projeto</Label>
              <div className="flex gap-2 flex-wrap">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      newProjectColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewProjectColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? 'Criando...' : 'Criar Projeto'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal para criar template de projeto */}
      {templateProject && (
        <CreateTemplateModal
          open={isCreateTemplateOpen}
          onOpenChange={setIsCreateTemplateOpen}
          sourceType="project"
          sourceId={templateProject.id}
          sourceName={templateProject.name}
          onSuccess={() => {
            setIsCreateTemplateOpen(false);
            setTemplateProject(null);
          }}
        />
      )}
    </div>
  );
}

export default ProjetosPage;
