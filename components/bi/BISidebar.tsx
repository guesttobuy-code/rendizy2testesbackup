import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Settings,
  ChevronLeft,
  TrendingUp,
  Calendar,
  Target,
  DollarSign,
  Users,
  Building2
} from 'lucide-react';

const menuSections = [
  {
    title: 'Visão Geral',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        path: '/bi',
      },
    ]
  },
  {
    title: 'Relatórios',
    items: [
      {
        id: 'financeiro',
        label: 'Financeiro',
        icon: <DollarSign className="w-5 h-5" />,
        path: '/bi/financeiro',
      },
      {
        id: 'ocupacao',
        label: 'Ocupação',
        icon: <Building2 className="w-5 h-5" />,
        path: '/bi/ocupacao',
      },
      {
        id: 'reservas',
        label: 'Reservas',
        icon: <Calendar className="w-5 h-5" />,
        path: '/bi/reservas',
      },
      {
        id: 'clientes',
        label: 'Clientes',
        icon: <Users className="w-5 h-5" />,
        path: '/bi/clientes',
      },
    ]
  },
  {
    title: 'Análises',
    items: [
      {
        id: 'tendencias',
        label: 'Tendências',
        icon: <TrendingUp className="w-5 h-5" />,
        path: '/bi/tendencias',
      },
      {
        id: 'comparativos',
        label: 'Comparativos',
        icon: <BarChart3 className="w-5 h-5" />,
        path: '/bi/comparativos',
      },
      {
        id: 'previsoes',
        label: 'Previsões',
        icon: <LineChart className="w-5 h-5" />,
        path: '/bi/previsoes',
      },
    ]
  },
  {
    title: 'Relatórios Dinâmicos',
    items: [
      {
        id: 'construtor',
        label: 'Construtor de Relatórios',
        icon: <FileText className="w-5 h-5" />,
        path: '/bi/construtor',
        badge: 'NOVO',
      },
      {
        id: 'meus-relatorios',
        label: 'Meus Relatórios',
        icon: <PieChart className="w-5 h-5" />,
        path: '/bi/meus-relatorios',
      },
      {
        id: 'agendados',
        label: 'Relatórios Agendados',
        icon: <Calendar className="w-5 h-5" />,
        path: '/bi/agendados',
      },
    ]
  },
  {
    title: 'Metas',
    items: [
      {
        id: 'kpis',
        label: 'KPIs e Metas',
        icon: <Target className="w-5 h-5" />,
        path: '/bi/kpis',
      },
    ]
  },
  {
    title: 'Configurações',
    items: [
      {
        id: 'config',
        label: 'Configurações',
        icon: <Settings className="w-5 h-5" />,
        path: '/bi/configuracoes',
      },
    ]
  },
];

export default function BISidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/bi') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`
      ${isCollapsed ? 'w-20' : 'w-64'}
      bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      flex flex-col transition-all duration-300
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg">BI & Relatórios</h2>
              <p className="text-xs text-muted-foreground">Business Intelligence</p>
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
      <ScrollArea className="flex-1">
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
                        ${active ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : ''}
                        ${isCollapsed ? 'justify-center px-2' : ''}
                      `}
                      onClick={() => navigate(item.path)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
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
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                Módulo Beta
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Recursos sendo implementados. Envie feedback!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
