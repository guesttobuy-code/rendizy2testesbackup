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
  X,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Users,
  Link2,
  FileText,
  Send,
  AtSign,
  Smile,
  Image,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
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
// PROJECT DETAIL MODAL - ESTILO MOCK COMPLETO
// ============================================================================

// Mock Subtasks for checklist
interface MockSubtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: { name: string; initials: string };
  children?: MockSubtask[];
  expanded?: boolean;
}

const MOCK_CHECKLIST: MockSubtask[] = [
  {
    id: '1',
    title: 'Tarefas Iniciais',
    completed: true,
    expanded: true,
    children: [
      { id: '1.1', title: 'Reunião inicial com proprietário', completed: true, assignee: { name: 'Maria Teresa', initials: 'MT' } },
      { id: '1.2', title: 'Alinhamento de expectativas', completed: true, assignee: { name: 'Arthur', initials: 'AR' } },
    ],
  },
  {
    id: '2',
    title: 'Implantação',
    completed: false,
    expanded: true,
    children: [
      { id: '2.1', title: 'Criar anúncio na plataforma', completed: false, assignee: { name: 'Rocha', initials: 'RO' } },
      { id: '2.2', title: 'Configurar precificação', completed: false, assignee: { name: 'Rafael', initials: 'RM' } },
      { id: '2.3', title: 'Liberar para vendas', completed: false, assignee: { name: 'Rafael', initials: 'RM' } },
    ],
  },
];

// Mock activities
const MOCK_ACTIVITIES = [
  { id: '1', type: 'comment', user: { name: 'Sua Casa Rende Mais', initials: 'SC' }, content: 'FICHA PREENCHIDA DO PROPRIETÁRIO', timestamp: '13 de nov. de 2025' },
  { id: '2', type: 'task', user: { name: 'You', initials: 'YO' }, content: 'checked Preencher a tarefa Aqpira', timestamp: '13 de nov. de 2025 at 10:04' },
  { id: '3', type: 'status', user: { name: 'You', initials: 'YO' }, content: 'changed status from 🟡 Fotos/Vistoria to ⏳ Aguardando', timestamp: '20 de dez. de 2025 at 12:08' },
];

// Subtask Item Component
const SubtaskItem: React.FC<{ task: MockSubtask; level?: number }> = ({ task, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(task.expanded ?? true);
  const hasChildren = task.children && task.children.length > 0;
  const completedChildren = task.children?.filter(c => c.completed).length || 0;
  const totalChildren = task.children?.length || 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-start gap-2 py-1.5 px-2 rounded hover:bg-accent/50 transition-colors'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 hover:bg-accent rounded mt-0.5">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <Checkbox checked={task.completed} className={cn('mt-0.5', task.completed && 'data-[state=checked]:bg-green-500')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm', task.completed && 'line-through text-muted-foreground')}>{task.title}</span>
            {hasChildren && <span className="text-xs text-muted-foreground">{completedChildren}/{totalChildren}</span>}
          </div>
        </div>
        {task.assignee && (
          <Avatar className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <AvatarFallback className="text-[10px]">{task.assignee.initials}</AvatarFallback>
          </Avatar>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="border-l border-muted" style={{ marginLeft: `${level * 20 + 20}px` }}>
          {task.children?.map((child) => <SubtaskItem key={child.id} task={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

interface ProjectDetailModalProps {
  project: ProjectWithStats | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateTask?: (projectId: string) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project, isOpen, onClose, onCreateTask }) => {
  const [activeTab, setActiveTab] = useState('items');
  const [newComment, setNewComment] = useState('');
  
  if (!project || !isOpen) return null;
  
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['active'];
  const progress = project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onClose()} />

      {/* Modal - Largura grande como no mock */}
      <div className="relative ml-auto h-full w-full max-w-5xl bg-background shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <Checkbox className="h-5 w-5" />
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>SETOR - IMPLANTAÇÃO</span>
                <ChevronRight className="h-3 w-3" />
                <span>Imóveis - Proprietários</span>
                <ChevronRight className="h-3 w-3" />
                <span>Lista</span>
              </div>
              <h2 className="font-semibold text-lg mt-1">{project.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Star className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onClose()}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* AI Assistant Banner */}
        <div className="px-6 py-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Peça ao cérebro para escrever uma descrição, criar um resumo ou encontrar tarefas semelhantes</span>
          </div>
        </div>

        {/* Content - Duas colunas */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Status & Fields - Grid 2 colunas */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Status
                  </label>
                  <Select defaultValue={project.status}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NAO_INICIADO">⚪ Não Iniciado</SelectItem>
                      <SelectItem value="FOTOS_VISTORIA">🟣 Fotos/Vistoria/CheckIn</SelectItem>
                      <SelectItem value="TRANSPORTANDO_CS">🟢 Transportando CS</SelectItem>
                      <SelectItem value="AGUARDANDO_PROPRIETARIO">🟡 Aguardando Proprietário</SelectItem>
                      <SelectItem value="FIM_DE">🔵 Fim de</SelectItem>
                      <SelectItem value="DESISTENTES">🔴 Desistentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Cessionários
                  </label>
                  <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Datas
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span>Começar +</span>
                    {project.dueDate && <span className="text-orange-500">🗓️ {format(parseISO(project.dueDate), 'dd/MM/yy')}</span>}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4" /> Prioridade
                  </label>
                  <Badge className="mt-1 bg-red-100 text-red-600">🚩 Urgente</Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> Relacionamentos
                  </label>
                  <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 cursor-pointer hover:text-foreground">
                  <FileText className="h-4 w-4" />
                  Adicionar descrição
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-500 cursor-pointer hover:text-purple-600">
                  <Sparkles className="h-4 w-4" />
                  Escreva com IA
                </div>
              </div>

              <Separator />

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="subtasks">Subtarefas</TabsTrigger>
                  <TabsTrigger value="items">
                    Itens de ação
                    <Badge variant="secondary" className="ml-2">{project.total_tasks}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4">
                  <p className="text-sm text-muted-foreground">Detalhes do projeto serão exibidos aqui.</p>
                </TabsContent>

                <TabsContent value="subtasks" className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => onCreateTask?.(project.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Tarefa
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4">Subtarefas simples serão exibidas aqui.</p>
                </TabsContent>

                <TabsContent value="items" className="mt-4 space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Listas de verificação</span>
                      <span className="text-sm text-muted-foreground">
                        <span className="text-green-500">●</span> {project.completed_tasks}/{project.total_tasks}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Checklist Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">MODELO DA IMPLANTAÇÃO</h3>
                    <span className="text-sm text-muted-foreground">{project.completed_tasks} de {project.total_tasks}</span>
                  </div>

                  {/* Subtasks Tree */}
                  <div className="space-y-1">
                    {MOCK_CHECKLIST.map((task) => <SubtaskItem key={task.id} task={task} />)}
                  </div>

                  {/* Add Item */}
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Item
                  </button>

                  {/* Hide Completed */}
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <CheckCheck className="h-4 w-4" />
                    Ocultar concluído
                  </button>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="w-80 border-l flex flex-col bg-muted/10">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Activity</h3>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {MOCK_ACTIVITIES.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarFallback className="text-[10px]">{activity.user.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{activity.user.name}</span>
                        <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                      <div className="flex items-start gap-2 mt-1">
                        {activity.type === 'task' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />}
                        {activity.type === 'status' && <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                        {activity.type === 'comment' && <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />}
                        <p className="text-sm">{activity.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-4 border-t">
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">YO</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><AtSign className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Image className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Paperclip className="h-4 w-4" /></Button>
                    </div>
                    <Button size="sm" disabled={!newComment.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
