import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Building2,
  FileText,
  Settings,
  ChevronLeft,
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
  ClipboardList
} from 'lucide-react';

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
      {
        id: 'leads',
        label: 'Leads',
        icon: <UserPlus className="w-5 h-5" />,
        path: '/crm/leads',
        badge: '32',
      },
      {
        id: 'proprietarios',
        label: 'Proprietários',
        icon: <Building2 className="w-5 h-5" />,
        path: '/crm/proprietarios',
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
    title: 'Configurações',
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
        label: 'Configurações',
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

  const isActive = (path: string) => {
    if (path === '/crm') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`
      ${isCollapsed ? 'w-20' : 'w-64'}
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
                    <Button
                      key={item.id}
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
