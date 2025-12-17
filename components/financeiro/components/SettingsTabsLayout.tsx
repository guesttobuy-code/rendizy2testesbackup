/**
 * RENDIZY - Layout Padrão para Telas de Configurações
 * Componente reutilizável que cria um layout com abas para configurações
 * 
 * @version v1.0.103.1300
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Settings } from 'lucide-react';

export interface SettingsTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: string;
}

interface SettingsTabsLayoutProps {
  title: string;
  description?: string;
  tabs: SettingsTab[];
  defaultTab?: string;
  className?: string;
}

/**
 * Layout padrão para telas de configurações com abas
 * 
 * Uso:
 * ```tsx
 * <SettingsTabsLayout
 *   title="Configurações Financeiras"
 *   description="Gerencie todas as configurações do módulo financeiro"
 *   tabs={[
 *     {
 *       id: 'mapeamento',
 *       label: 'Mapeamento de Campos',
 *       icon: <Link2 className="h-4 w-4" />,
 *       content: <CampoPlanoContasMapping />
 *     },
 *     {
 *       id: 'pagamentos',
 *       label: 'Plataformas de Pagamento',
 *       icon: <CreditCard className="h-4 w-4" />,
 *       content: <PlataformasPagamento />
 *     }
 *   ]}
 * />
 * ```
 */
export function SettingsTabsLayout({
  title,
  description,
  tabs,
  defaultTab,
  className = '',
}: SettingsTabsLayoutProps) {
  const firstTabId = tabs.length > 0 ? tabs[0].id : '';
  const activeTab = defaultTab || firstTabId;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="mb-4">
          <h1 className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 gap-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3 h-auto"
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          <div className="flex-1 overflow-auto">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 p-6"
              >
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

