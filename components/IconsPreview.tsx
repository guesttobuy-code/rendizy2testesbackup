import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Wallet,
  CheckSquare,
  Users,
  Bell,
  Settings,
  LifeBuoy,
  FolderKanban,
  ClipboardList,
  TrendingUp,
  Zap,
  Grid3x3,
  Database
} from 'lucide-react';

interface IconPreviewItem {
  name: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description: string;
}

export function IconsPreview() {
  const icons: IconPreviewItem[] = [
    {
      name: 'Dashboard Inicial',
      icon: LayoutDashboard,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      description: 'Visão geral do sistema'
    },
    {
      name: 'Calendário',
      icon: Calendar,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      description: 'Calendário de reservas'
    },
    {
      name: 'Tasks',
      icon: CheckSquare,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
      description: 'Gerenciamento de tarefas'
    },
    {
      name: 'Usuários',
      icon: Users,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      description: 'Usuários e hóspedes'
    },
    {
      name: 'Notificações',
      icon: Bell,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      description: 'Central de mensagens'
    },
    {
      name: 'Configurações',
      icon: Settings,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-gray-600 to-gray-700',
      description: 'Configurações do sistema'
    },
    {
      name: 'Suporte',
      icon: LifeBuoy,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      description: 'Assistentes e ajuda'
    },
    {
      name: 'Locais-Imóveis',
      icon: MapPin,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
      description: 'Gestão de propriedades'
    },
    {
      name: 'Reservas',
      icon: ClipboardList,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
      description: 'Central de reservas'
    },
    {
      name: 'Catálogo',
      icon: FolderKanban,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      description: 'Catálogo de recursos'
    },
    {
      name: 'Finanças',
      icon: Wallet,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      description: 'Gestão financeira'
    },
    {
      name: 'Estatísticas',
      icon: TrendingUp,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
      description: 'Análises e relatórios'
    },
    {
      name: 'Motor de Reservas',
      icon: Zap,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      description: 'Sistema de reservas'
    },
    {
      name: 'Aplicativos',
      icon: Grid3x3,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
      description: 'Centro de aplicativos'
    },
    {
      name: 'Backend',
      icon: Database,
      iconColor: 'text-white',
      iconBg: 'bg-gradient-to-br from-slate-600 to-slate-700',
      description: 'Ferramentas de desenvolvimento'
    }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Nova Paleta de Ícones Rendizy</h1>
          <p className="text-gray-600">Ícones modernos com gradientes coloridos para uma melhor identificação visual</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {icons.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ${item.iconBg}`}>
                    <Icon className={`h-6 w-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 mb-1 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-4">Paleta de Cores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Azul - Dashboard</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Roxo - Calendário</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Verde - Tasks</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Laranja - Usuários</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Vermelho - Notif.</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Teal - Locais</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Rosa - Reservas</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Índigo - Catálogo</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Esmeralda - Finanças</p>
            </div>
            <div className="space-y-2">
              <div className="h-12 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-md"></div>
              <p className="text-sm text-gray-600">Violeta - Stats</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
