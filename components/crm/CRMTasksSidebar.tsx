import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Settings,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target,
  CheckSquare,
  ListTodo,
  UsersIcon as TeamIcon,
  Zap,
  Key,
  DoorOpen,
  Sparkle,
  Wrench,
  FolderKanban,
  ClipboardList,
  Folder,
  Plus
} from 'lucide-react';
import { useProjectsWithStats } from '@/hooks/useCRMTasks';

const menuSections = [
  {
    title: 'Visão Geral',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        path: '/crm',
      },
    ]
  },
  {
    title: 'Clientes',
    items: [
      {
        id: 'deals',
        label: 'Vendas',
        icon: <Target className="w-5 h-5" />,
        path: '/crm/deals',
        badge: '4',
      },
      {
        id: 'projetos',
        label: 'Projetos & Serviços',
        icon: <FolderKanban className="w-5 h-5" />,
        path: '/crm/projetos',
        badge: '5',
      },
      {
        id: 'contatos',
        label: 'Contatos',
        icon: <Users className="w-5 h-5" />,
        path: '/crm/contatos',
        badge: '156',
      },
    ]
  },
  {
    title: 'Operações',
    items: [
      {
        id: 'operacoes-unificadas',
        label: 'Todas Operações',
        icon: <ClipboardList className="w-5 h-5" />,
        path: '/crm/operacoes',
      },
      {
        id: 'checkins-hoje',
        label: 'Check-ins Hoje',
        icon: <Key className="w-5 h-5" />,
        path: '/crm/operacoes/checkins',
        badge: '8',
      },
      {
        id: 'checkouts-hoje',
        label: 'Check-outs Hoje',
        icon: <DoorOpen className="w-5 h-5" />,
        path: '/crm/operacoes/checkouts',
        badge: '5',
      },
      {
        id: 'limpezas-pendentes',
        label: 'Limpezas Pendentes',
        icon: <Sparkle className="w-5 h-5" />,
        path: '/crm/operacoes/limpezas',
        badge: '12',
      },
      {
        id: 'manutencoes',
        label: 'Manutenções',
        icon: <Wrench className="w-5 h-5" />,
        path: '/crm/operacoes/manutencoes',
        badge: '3',
      },
    ]
  },
  {
    title: 'Tarefas',
    items: [
      {
        id: 'minhas-tarefas',
        label: 'Minhas Tarefas',
        icon: <CheckSquare className="w-5 h-5" />,
        path: '/crm/minhas-tarefas',
        badge: '8',
      },
      {
        id: 'todas-tarefas',
        label: 'Todas as Tarefas',
        icon: <ListTodo className="w-5 h-5" />,
        path: '/crm/todas-tarefas',
        badge: '24',
      },
      {
        id: 'calendario-tarefas',
        label: 'Calendário',
        icon: <Calendar className="w-5 h-5" />,
        path: '/crm/calendario-tarefas',
      },
      {
        id: 'equipes',
        label: 'Equipes',
        icon: <TeamIcon className="w-5 h-5" />,
        path: '/crm/equipes',
      },
    ]
  },
  {
    title: 'Configurações do CRM',
    items: [
      {
        id: 'tipos-tarefa',
        label: 'Tipos de Tarefa',
        icon: <FileText className="w-5 h-5" />,
        path: '/crm/tipos-tarefa',
      },
      {
        id: 'templates',
        label: 'Templates de Projeto',
        icon: <FolderKanban className="w-5 h-5" />,
        path: '/crm/templates',
      },
      {
        id: 'automacoes',
        label: 'Automações',
        icon: <Zap className="w-5 h-5" />,
        path: '/crm/automacoes',
      },
      {
        id: 'config',
        label: 'Configurações do CRM',
        icon: <Settings className="w-5 h-5" />,
        path: '/crm/configuracoes',
      },
    ]
  },
];

interface CRMTasksSidebarProps {
  onEditFunnels?: () => void;
}

export default function CRMTasksSidebar({ onEditFunnels }: CRMTasksSidebarProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  
  // Carregar projetos do banco
  const { data: projects = [] } = useProjectsWithStats();

  const isActive = (path: string) => {
    if (path === '/crm') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`
      ${isCollapsed ? 'w-20' : 'w-72'}
      bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      flex flex-col transition-all duration-300
      h-screen overflow-hidden pt-14
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg">CRM & Tasks</h2>
              <p className="text-xs text-muted-foreground">Clientes e Tarefas</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Botão Voltar */}
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => window.close()}
        >
          <ChevronLeft className="w-4 h-4" />
          {!isCollapsed && 'Fechar Módulo'}
        </Button>
      </div>

      <Separator />

      {/* Menu Items */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-2 space-y-6">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <div key={item.id}>
                      {/* Botão do item */}
                      <Button
                        variant={active ? 'secondary' : 'ghost'}
                        className={`
                          w-full justify-start gap-3
                          ${active ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : ''}
                          ${isCollapsed ? 'justify-center px-2' : ''}
                        `}
                        onClick={() => {
                          if ((item as any).action === 'edit-funnels' && onEditFunnels) {
                            onEditFunnels();
                          } else {
                            navigate(item.path);
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                      >
                        {item.icon}
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {'badge' in item && item.badge && (
                              <Badge variant="default" className="ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </Button>
                      
                      {/* Lista de projetos - aparece logo após o botão "Projetos & Serviços" */}
                      {item.id === 'projetos' && !isCollapsed && projects.length > 0 && (
                        <div className="mt-1 mb-2">
                          <button
                            type="button"
                            onClick={() => setProjectsExpanded(!projectsExpanded)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/50 rounded-md transition-colors"
                          >
                            {projectsExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            <Folder className="w-3.5 h-3.5" />
                            <span>MEUS PROJETOS</span>
                            <Badge variant="outline" className="ml-auto text-[10px] h-4">
                              {projects.length}
                            </Badge>
                          </button>
                          
                          {projectsExpanded && (
                            <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-muted pl-2">
                              {projects.slice(0, 8).map((project) => {
                                const projectUrl = `/crm/projetos/${project.id}`;
                                const projectActive = location.pathname === projectUrl;
                                return (
                                  <div
                                    key={project.id}
                                    onClick={() => navigate(projectUrl)}
                                    className={`
                                      w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer
                                      ${projectActive 
                                        ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' 
                                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                                      }
                                    `}
                                  >
                                    <div 
                                      className="w-2 h-2 rounded-full flex-shrink-0" 
                                      style={{ backgroundColor: project.color || '#6366f1' }}
                                    />
                                    <span className="truncate flex-1 text-left">{project.name}</span>
                                    {(project.total_tasks || 0) > 0 && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {project.completed_tasks || 0}/{project.total_tasks}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {projects.length > 8 && (
                                <div
                                  onClick={() => navigate('/crm/projetos')}
                                  className="w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Ver todos ({projects.length})...
                                </div>
                              )}
                              
                              <div
                                onClick={() => navigate('/crm/projetos?new=true')}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Novo Projeto</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                Módulo Beta
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              CRM e Tasks unificados. Envie feedback!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
