/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    PROJETOS PAGE - LISTA ESTILO CLICKUP                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Página de projetos/serviços com:
 * - Lista agrupada por status
 * - Colunas configuráveis
 * - Progresso visual
 * - Click abre modal lateral
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import React, { useState, useMemo, useCallback } from 'react';
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
  Building,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Modal lateral unificado para tarefas
import { TaskFormSheet } from '../modals/TaskFormSheet';

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
// MOCK DATA (temporário - será substituído por dados reais)
// ============================================================================

const MOCK_PROJECTS: ProjectWithStats[] = [
  // DESISTENTES
  { 
    id: '1', 
    organization_id: 'org-1',
    name: 'CARLOS EDUARDO - SÃO PAULO SP', 
    description: 'Desistiu do projeto',
    status: 'DESISTENTES', 
    color: '#ef4444',
    total_tasks: 48, 
    completed_tasks: 7, 
    created_at: '2025-06-01',
    updated_at: '2025-06-15',
    dueDate: '2025-06-15',
    stats: { comments: 2, attachments: 1 } 
  },
  { 
    id: '2', 
    organization_id: 'org-1',
    name: 'FERNANDO LIMA - CURITIBA PR', 
    description: 'Desistência por motivos pessoais',
    status: 'DESISTENTES', 
    color: '#ef4444',
    total_tasks: 48, 
    completed_tasks: 4, 
    created_at: '2025-07-10',
    updated_at: '2025-07-20',
    dueDate: '2025-07-20',
    stats: { comments: 0, attachments: 0 } 
  },
  
  // FIM DE
  { 
    id: '3', 
    organization_id: 'org-1',
    name: 'PATRICIA SANTOS - RIO DE JANEIRO RJ', 
    description: 'Projeto finalizado com sucesso',
    status: 'FIM_DE', 
    color: '#3b82f6',
    total_tasks: 48, 
    completed_tasks: 48, 
    created_at: '2025-08-15',
    updated_at: '2025-10-30',
    dueDate: '2025-10-30',
    stats: { comments: 15, attachments: 8 }, 
    starred: true 
  },
  { 
    id: '4', 
    organization_id: 'org-1',
    name: 'MARCOS OLIVEIRA - BELO HORIZONTE MG', 
    description: 'Implantação concluída',
    status: 'FIM_DE', 
    color: '#3b82f6',
    total_tasks: 55, 
    completed_tasks: 55, 
    created_at: '2025-09-01',
    updated_at: '2025-11-15',
    dueDate: '2025-11-15',
    stats: { comments: 12, attachments: 5 } 
  },
  
  // TRANSPORTANDO CS
  { 
    id: '5', 
    organization_id: 'org-1',
    name: 'JULIANA COSTA - FLORIANÓPOLIS SC', 
    description: 'Em transferência para CS',
    status: 'TRANSPORTANDO_CS', 
    color: '#22c55e',
    total_tasks: 48, 
    completed_tasks: 31, 
    created_at: '2025-12-10',
    updated_at: '2026-01-30',
    dueDate: '2026-01-30',
    stats: { comments: 8, attachments: 3 }, 
    starred: true 
  },
  { 
    id: '6', 
    organization_id: 'org-1',
    name: 'ROBERTO ALMEIDA - SALVADOR BA', 
    description: 'Transportando para operações',
    status: 'TRANSPORTANDO_CS', 
    color: '#22c55e',
    total_tasks: 48, 
    completed_tasks: 28, 
    created_at: '2025-12-20',
    updated_at: '2026-02-05',
    dueDate: '2026-02-05',
    stats: { comments: 5, attachments: 2 } 
  },
  
  // FOTOS/VISTORIA/CHECKIN
  { 
    id: '7', 
    organization_id: 'org-1',
    name: 'LUCIANA - VOLTA REDONDA RJ', 
    description: 'Aguardando fotos e vistoria',
    status: 'FOTOS_VISTORIA', 
    color: '#8b5cf6',
    total_tasks: 55, 
    completed_tasks: 45, 
    created_at: '2025-08-13',
    updated_at: '2025-08-16',
    dueDate: '2025-08-16',
    stats: { comments: 5, attachments: 3 } 
  },
  { 
    id: '8', 
    organization_id: 'org-1',
    name: 'GASTÃO VIANNA - VOLTA REDONDA RJ', 
    description: 'Vistoria inicial em andamento',
    status: 'FOTOS_VISTORIA', 
    color: '#8b5cf6',
    total_tasks: 55, 
    completed_tasks: 24, 
    created_at: '2025-11-12',
    updated_at: '2025-11-15',
    dueDate: '2025-11-15',
    stats: { comments: 3, attachments: 1 } 
  },
  
  // AGUARDANDO PROPRIETÁRIO
  { 
    id: '9', 
    organization_id: 'org-1',
    name: 'WALKER PIERRE - GRAMADO RS / GUARAPARI ES', 
    description: 'Aguardando retorno do proprietário',
    status: 'AGUARDANDO_PROPRIETARIO', 
    color: '#f59e0b',
    total_tasks: 55, 
    completed_tasks: 23, 
    created_at: '2025-11-12',
    updated_at: '2025-11-15',
    dueDate: '2025-11-15',
    stats: { comments: 3, attachments: 2 }, 
    starred: true 
  },
  
  // NÃO INICIADO
  { 
    id: '10', 
    organization_id: 'org-1',
    name: 'Padrão de Implantação - GTB', 
    description: 'Template de implantação',
    status: 'NAO_INICIADO', 
    color: '#64748b',
    total_tasks: 65, 
    completed_tasks: 1, 
    created_at: '2025-07-14',
    updated_at: '2025-07-17',
    dueDate: '2025-07-17',
    stats: { comments: 0, attachments: 0 } 
  },
  { 
    id: '11', 
    organization_id: 'org-1',
    name: 'CI de Implantação', 
    description: 'Checklist inicial de implantação',
    status: 'NAO_INICIADO', 
    color: '#64748b',
    total_tasks: 55, 
    completed_tasks: 0, 
    created_at: '2025-07-17',
    updated_at: '2025-07-20',
    dueDate: '2025-07-20',
    stats: { comments: 0, attachments: 0 } 
  },
];

const MOCK_MEMBERS: ProjectMember[] = [
  { id: '1', name: 'Rafael Marques', initials: 'RM' },
  { id: '2', name: 'Maria Silva', initials: 'MS' },
  { id: '3', name: 'João Santos', initials: 'JS' },
  { id: '4', name: 'Ana Costa', initials: 'AC' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

interface ProjectRowProps {
  project: ProjectWithStats;
  onClick?: () => void;
  onStar?: () => void;
}

const ProjectRow: React.FC<ProjectRowProps> = ({ project, onClick, onStar }) => {
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
          <DropdownMenuItem>
            <Eye className="h-4 w-4 mr-2" />
            Visualizar
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
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
}

const StatusGroup: React.FC<StatusGroupProps> = ({ status, projects, onProjectClick }) => {
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
            // TODO: Open create project modal with status
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
            />
          ))}
          {/* Add Project Row */}
          <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-colors">
            <Plus className="h-4 w-4" />
            Adicionar projeto
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PROJECT DETAIL MODAL
// ============================================================================

interface ProjectDetailModalProps {
  project: ProjectWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateTask?: (projectId: string) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, isOpen, onClose, onCreateTask }) => {
  if (!project) return null;
  
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['active'];
  const stats = project.stats || { comments: 0, attachments: 0 };
  const progress = project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-10 rounded-full" 
              style={{ backgroundColor: project.color || '#64748b' }}
            />
            <div>
              <SheetTitle className="text-xl">{project.name}</SheetTitle>
              <SheetDescription>{project.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden px-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas ({project.total_tasks})</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="files">Arquivos ({stats.attachments})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="overflow-auto">
            <div className="space-y-6 py-4">
              {/* Status & Progress */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={cn('text-sm', statusConfig.bgColor, statusConfig.color)}>
                      {statusConfig.label}
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Progresso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="flex-1 h-2" />
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.completed_tasks} de {project.total_tasks} tarefas concluídas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Comentários</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.comments}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Atualizado</span>
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {project.updated_at ? formatDistanceToNow(parseISO(project.updated_at), { addSuffix: true, locale: ptBR }) : '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Team */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Equipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {MOCK_MEMBERS.slice(0, 4).map(member => (
                      <TooltipProvider key={member.id}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{member.name}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    <Button variant="outline" size="sm" className="h-8">
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="tasks">
            <div className="py-4 text-center text-muted-foreground">
              <p>Lista de tarefas do projeto aparecerá aqui.</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => onCreateTask?.(project.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Tarefa
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="activity">
            <div className="py-4 text-center text-muted-foreground">
              <p>Timeline de atividades aparecerá aqui.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="files">
            <div className="py-4 text-center text-muted-foreground">
              <p>Arquivos e anexos aparecerão aqui.</p>
              <Button variant="outline" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjetosPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estado do modal de criação de tarefa
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState<string | undefined>();

  // Handler para abrir modal de criação de tarefa
  const handleCreateTask = (projectId?: string) => {
    setTaskProjectId(projectId);
    setIsTaskFormOpen(true);
  };

  // TODO: Replace with real data
  // const { data: projects = [], isLoading } = useProjects();
  const projects = MOCK_PROJECTS;

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
            <Button className="mt-4">
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
    </div>
  );
}

export default ProjetosPage;
