import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Building2,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CreditCard,
  AlertCircle,
  BarChart3,
  Calendar,
  Settings,
  ChevronLeft,
  Receipt,
  Landmark,
  Target,
  LineChart,
  Filter,
  Calculator
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

const menuSections = [
  {
    title: 'Visão Geral',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        path: '/financeiro',
      },
    ]
  },
  {
    title: 'Gestão Contábil',
    items: [
      {
        id: 'plano-contas',
        label: 'Plano de Contas',
        icon: <FileText className="w-5 h-5" />,
        path: '/financeiro/plano-contas',
      },
      {
        id: 'lancamentos',
        label: 'Lançamentos',
        icon: <Receipt className="w-5 h-5" />,
        path: '/financeiro/lancamentos',
      },
      {
        id: 'centro-custos',
        label: 'Centro de Custos',
        icon: <Target className="w-5 h-5" />,
        path: '/financeiro/centro-custos',
      },
    ]
  },
  {
    title: 'Contas',
    items: [
      {
        id: 'contas-receber',
        label: 'Contas a Receber',
        icon: <TrendingUp className="w-5 h-5" />,
        path: '/financeiro/contas-receber',
        badge: '12',
        badgeVariant: 'default' as const,
      },
      {
        id: 'contas-pagar',
        label: 'Contas a Pagar',
        icon: <TrendingDown className="w-5 h-5" />,
        path: '/financeiro/contas-pagar',
        badge: '8',
        badgeVariant: 'destructive' as const,
      },
      {
        id: 'inadimplencia',
        label: 'Inadimplência',
        icon: <AlertCircle className="w-5 h-5" />,
        path: '/financeiro/inadimplencia',
        badge: 'NOVO',
        badgeVariant: 'secondary' as const,
      },
    ]
  },
  {
    title: 'Bancos',
    items: [
      {
        id: 'conciliacao',
        label: 'Conciliação Bancária',
        icon: <Landmark className="w-5 h-5" />,
        path: '/financeiro/conciliacao',
      },
      {
        id: 'regras-conciliacao',
        label: 'Regras de Conciliação',
        icon: <Filter className="w-5 h-5" />,
        path: '/financeiro/conciliacao/regras',
      },
      {
        id: 'fechamento-caixa',
        label: 'Fechamento de Caixa',
        icon: <Calculator className="w-5 h-5" />,
        path: '/financeiro/conciliacao/fechamento',
      },
      {
        id: 'contas-bancarias',
        label: 'Contas Bancárias',
        icon: <CreditCard className="w-5 h-5" />,
        path: '/financeiro/contas-bancarias',
      },
    ]
  },
  {
    title: 'Relatórios',
    items: [
      {
        id: 'dre',
        label: 'DRE',
        icon: <BarChart3 className="w-5 h-5" />,
        path: '/financeiro/dre',
      },
      {
        id: 'fluxo-caixa',
        label: 'Fluxo de Caixa',
        icon: <LineChart className="w-5 h-5" />,
        path: '/financeiro/fluxo-caixa',
      },
      {
        id: 'relatorios',
        label: 'Relatórios Gerenciais',
        icon: <FileText className="w-5 h-5" />,
        path: '/financeiro/relatorios',
      },
    ]
  },
  {
    title: 'Configurações',
    items: [
      {
        id: 'config',
        label: 'Configurações do Financeiro',
        icon: <Settings className="w-5 h-5" />,
        path: '/financeiro/configuracoes',
      },
    ]
  },
];

export default function FinanceiroSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/financeiro') {
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
              <h2 className="font-bold text-lg">Financeiro</h2>
              <p className="text-xs text-muted-foreground">Gestão Completa</p>
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
          onClick={() => navigate('/modules')}
        >
          <ChevronLeft className="w-4 h-4" />
          {!isCollapsed && 'Voltar aos Módulos'}
        </Button>
      </div>

      <Separator />

      {/* Menu Items */}
      <div 
        className="flex-1 overflow-y-auto pr-2 scrollbar-right"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(209 213 219) transparent'
        }}
      >
        <style>{`
          .scrollbar-right::-webkit-scrollbar {
            width: 8px;
          }
          .scrollbar-right::-webkit-scrollbar-track {
            background: transparent;
            margin: 4px 0;
          }
          .scrollbar-right::-webkit-scrollbar-thumb {
            background-color: rgb(209 213 219);
            border-radius: 9999px;
            margin-right: 4px;
          }
          .scrollbar-right::-webkit-scrollbar-thumb:hover {
            background-color: rgb(156 163 175);
          }
          .dark .scrollbar-right::-webkit-scrollbar-thumb {
            background-color: rgb(75 85 99);
          }
          .dark .scrollbar-right::-webkit-scrollbar-thumb:hover {
            background-color: rgb(107 114 128);
          }
        `}</style>
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
                      type="button"
                      variant={active ? 'secondary' : 'ghost'}
                      className={`
                        w-full justify-start gap-3
                        ${active ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : ''}
                        ${isCollapsed ? 'justify-center px-2' : ''}
                      `}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                      }}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <Badge variant={item.badgeVariant} className="ml-auto">
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
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
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
