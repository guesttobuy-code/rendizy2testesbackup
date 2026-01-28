/**
 * Projects List View - Tela de Projetos & Serviços
 * 
 * Estilo ClickUp/Asana:
 * - Lista agrupada por status
 * - Colunas configuráveis
 * - Progresso visual
 * - Click abre modal lateral
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Search,
  Filter,
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
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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

// ============================================================================
// MOCK DATA - Dados de exemplo para prototipagem
// ============================================================================

interface MockUser {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
}

interface MockProject {
  id: string;
  name: string;
  status: 'NAO_INICIADO' | 'FOTOS_VISTORIA' | 'TRANSPORTANDO_CS' | 'AGUARDANDO_PROPRIETARIO' | 'FIM_DE' | 'DESISTENTES';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignee?: MockUser;
  dueDate?: string;
  createdAt: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  comments: number;
  attachments: number;
  starred?: boolean;
  linkedContact?: string;
}

const MOCK_USERS: MockUser[] = [
  { id: '1', name: 'Rafael Milfont', initials: 'RM', avatar: '' },
  { id: '2', name: 'Maria Silva', initials: 'MS', avatar: '' },
  { id: '3', name: 'João Santos', initials: 'JS', avatar: '' },
  { id: '4', name: 'Ana Costa', initials: 'AC', avatar: '' },
];

const MOCK_PROJECTS: MockProject[] = [
  // DESISTENTES
  { id: '1', name: 'CARLOS EDUARDO - SÃO PAULO SP', status: 'DESISTENTES', priority: 'low', assignee: MOCK_USERS[0], dueDate: '2025-06-15', createdAt: '2025-06-01', progress: 15, totalTasks: 48, completedTasks: 7, comments: 2, attachments: 1 },
  { id: '2', name: 'FERNANDO LIMA - CURITIBA PR', status: 'DESISTENTES', priority: 'low', assignee: MOCK_USERS[1], dueDate: '2025-07-20', createdAt: '2025-07-10', progress: 8, totalTasks: 48, completedTasks: 4, comments: 0, attachments: 0 },
  
  // FIM DE
  { id: '3', name: 'PATRICIA SANTOS - RIO DE JANEIRO RJ', status: 'FIM_DE', priority: 'medium', assignee: MOCK_USERS[2], dueDate: '2025-10-30', createdAt: '2025-08-15', progress: 100, totalTasks: 48, completedTasks: 48, comments: 15, attachments: 8, starred: true },
  { id: '4', name: 'MARCOS OLIVEIRA - BELO HORIZONTE MG', status: 'FIM_DE', priority: 'medium', assignee: MOCK_USERS[0], dueDate: '2025-11-15', createdAt: '2025-09-01', progress: 100, totalTasks: 55, completedTasks: 55, comments: 12, attachments: 5 },
  
  // TRANSPORTANDO CS
  { id: '5', name: 'JULIANA COSTA - FLORIANÓPOLIS SC', status: 'TRANSPORTANDO_CS', priority: 'high', assignee: MOCK_USERS[3], dueDate: '2026-01-30', createdAt: '2025-12-10', progress: 65, totalTasks: 48, completedTasks: 31, comments: 8, attachments: 3, starred: true },
  { id: '6', name: 'ROBERTO ALMEIDA - SALVADOR BA', status: 'TRANSPORTANDO_CS', priority: 'high', assignee: MOCK_USERS[1], dueDate: '2026-02-05', createdAt: '2025-12-20', progress: 58, totalTasks: 48, completedTasks: 28, comments: 5, attachments: 2 },
  
  // FOTOS/VISTORIA/CHECKIN
  { id: '7', name: 'LUCIANA - VOLTA REDONDA RJ', status: 'FOTOS_VISTORIA', priority: 'urgent', assignee: MOCK_USERS[0], dueDate: '2025-08-16', createdAt: '2025-08-13', progress: 82, totalTasks: 55, completedTasks: 45, comments: 5, attachments: 3 },
  { id: '8', name: 'GASTÃO VIANNA - VOLTA REDONDA RJ', status: 'FOTOS_VISTORIA', priority: 'urgent', assignee: MOCK_USERS[2], dueDate: '2025-11-15', createdAt: '2025-11-12', progress: 44, totalTasks: 55, completedTasks: 24, comments: 3, attachments: 1 },
  
  // AGUARDANDO PROPRIETÁRIO
  { id: '9', name: 'WALKER PIERRE - GRAMADO RS / GUARAPARI ES', status: 'AGUARDANDO_PROPRIETARIO', priority: 'urgent', assignee: MOCK_USERS[3], dueDate: '2025-11-15', createdAt: '2025-11-12', progress: 42, totalTasks: 55, completedTasks: 23, comments: 3, attachments: 2, starred: true },
  
  // NÃO INICIADO
  { id: '10', name: 'Padrão de Implantação - GTB', status: 'NAO_INICIADO', priority: 'urgent', assignee: MOCK_USERS[0], dueDate: '2025-07-17', createdAt: '2025-07-14', progress: 2, totalTasks: 65, completedTasks: 1, comments: 0, attachments: 0 },
  { id: '11', name: 'CI de Implantação', status: 'NAO_INICIADO', priority: 'urgent', assignee: undefined, dueDate: '2025-07-20', createdAt: '2025-07-17', progress: 0, totalTasks: 55, completedTasks: 0, comments: 0, attachments: 0 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'NAO_INICIADO': { label: 'NÃO INICIADO', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  'FOTOS_VISTORIA': { label: 'FOTOS/VISTORIA/CHECKIN', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'TRANSPORTANDO_CS': { label: 'TRANSPORTANDO CS', color: 'text-green-600', bgColor: 'bg-green-100' },
  'AGUARDANDO_PROPRIETARIO': { label: 'AGUARDANDO PROPRIETÁRIO', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  'FIM_DE': { label: 'FIM DE', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'DESISTENTES': { label: 'DESISTENTES', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'urgent': { label: 'Urgente', color: 'text-red-500', icon: <Flag className="h-3 w-3 fill-red-500 text-red-500" /> },
  'high': { label: 'Alta', color: 'text-orange-500', icon: <Flag className="h-3 w-3 fill-orange-500 text-orange-500" /> },
  'medium': { label: 'Média', color: 'text-yellow-500', icon: <Flag className="h-3 w-3 fill-yellow-500 text-yellow-500" /> },
  'low': { label: 'Baixa', color: 'text-gray-400', icon: <Flag className="h-3 w-3 text-gray-400" /> },
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface ProjectRowProps {
  project: MockProject;
  onClick?: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, onClick }) => {
  const statusConfig = STATUS_CONFIG[project.status];
  const priorityConfig = PRIORITY_CONFIG[project.priority];
  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date();

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 px-4 py-3 border-b hover:bg-accent/50 cursor-pointer transition-colors',
        project.starred && 'bg-yellow-50/50'
      )}
    >
      {/* Checkbox / Expand */}
      <button className="p-1 hover:bg-accent rounded">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Status indicator */}
      <div className={cn('w-1.5 h-8 rounded-full', statusConfig.bgColor)} />

      {/* Star */}
      <button className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100">
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
          {project.attachments > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {project.attachments}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {project.completedTasks}/{project.totalTasks}
          </span>
          {project.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {project.comments}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-24 hidden md:block">
        <div className="flex items-center gap-2">
          <Progress value={project.progress} className="h-1.5" />
          <span className="text-xs text-muted-foreground w-8">{project.progress}%</span>
        </div>
      </div>

      {/* Due Date */}
      <div className="w-24 hidden lg:block">
        {project.dueDate && (
          <span className={cn(
            'text-sm flex items-center gap-1',
            isOverdue ? 'text-red-500' : 'text-muted-foreground'
          )}>
            <Calendar className="h-3 w-3" />
            {new Date(project.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          </span>
        )}
      </div>

      {/* Priority */}
      <div className="w-20 hidden lg:block">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className={cn('flex items-center gap-1', priorityConfig.color)}>
                {priorityConfig.icon}
                <span className="text-xs">{priorityConfig.label}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Prioridade: {priorityConfig.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Status Badge */}
      <div className="w-40 hidden xl:block">
        <Badge className={cn('text-xs font-normal', statusConfig.bgColor, statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Assignee */}
      <div className="w-10">
        {project.assignee ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={project.assignee.avatar} />
                  <AvatarFallback className="text-xs">{project.assignee.initials}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{project.assignee.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <User className="h-3 w-3 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
  projects: MockProject[];
  onProjectClick?: (project: MockProject) => void;
}

const StatusGroup: React.FC<StatusGroupProps> = ({ status, projects, onProjectClick }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = STATUS_CONFIG[status];

  return (
    <div className="mb-2">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent/30 transition-colors"
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
        <button className="text-xs text-primary hover:underline ml-auto opacity-0 group-hover:opacity-100">
          + Adicionar tarefa
        </button>
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="border-l-2 ml-4 border-muted">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onClick={() => onProjectClick?.(project)}
            />
          ))}
          {/* Add Task Row */}
          <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">
            <Plus className="h-4 w-4" />
            Adicionar tarefa
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProjectsListViewProps {
  onProjectClick?: (project: MockProject) => void;
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({ onProjectClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list');

  // Group projects by status
  const groupedProjects = MOCK_PROJECTS.reduce((acc, project) => {
    if (!acc[project.status]) {
      acc[project.status] = [];
    }
    acc[project.status].push(project);
    return acc;
  }, {} as Record<string, MockProject[]>);

  // Order of status groups
  const statusOrder = ['DESISTENTES', 'FIM_DE', 'TRANSPORTANDO_CS', 'FOTOS_VISTORIA', 'AGUARDANDO_PROPRIETARIO', 'NAO_INICIADO'];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Projetos & Serviços</h1>
            <p className="text-sm text-muted-foreground">
              {MOCK_PROJECTS.length} projetos • {MOCK_PROJECTS.reduce((acc, p) => acc + p.totalTasks, 0)} tarefas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button>
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
              placeholder="Procurar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtro
          </Button>
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
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
        <div className="w-8" /> {/* Expand */}
        <div className="w-1.5" /> {/* Status line */}
        <div className="w-8" /> {/* Star */}
        <div className="flex-1">Nome</div>
        <div className="w-24 hidden md:block">Progresso</div>
        <div className="w-24 hidden lg:block">Data de ven...</div>
        <div className="w-20 hidden lg:block">Prioridade</div>
        <div className="w-40 hidden xl:block">Status</div>
        <div className="w-10">Atribuído</div>
        <div className="w-7" /> {/* Actions */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {statusOrder.map((status) => {
          const projects = groupedProjects[status] || [];
          if (projects.length === 0) return null;
          return (
            <StatusGroup
              key={status}
              status={status}
              projects={projects}
              onProjectClick={onProjectClick}
            />
          );
        })}

        {/* New Status */}
        <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">
          <Plus className="h-4 w-4" />
          Novo status
        </button>
      </div>
    </div>
  );
};

export default ProjectsListView;
