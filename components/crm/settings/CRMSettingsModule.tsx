/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRM SETTINGS MODULE - CONFIGURAÇÕES                    ║
 * ║                                                                           ║
 * ║  Tela de configurações do módulo CRM com 4 abas:                         ║
 * ║  1. Origens de Lead (fontes de entrada de leads)                         ║
 * ║  2. Automações (catálogo de triggers/ações)                              ║
 * ║  3. Gestão de Atividades e Tarefas                                       ║
 * ║  4. Configurações Gerais                                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.1.0
 * @date 2026-01-26
 * 
 * Segue o padrão de SettingsTabsLayout do módulo Financeiro.
 */


import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { AutomationsSettingsTab } from './AutomationsSettingsTab';
import { TasksSettingsTab } from './TasksSettingsTab';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { LeadSourcesSettingsTab } from './LeadSourcesSettingsTab';
import {
  Settings,
  Zap,
  CheckSquare,
  SlidersHorizontal,
  Target,
} from 'lucide-react';

export default function CRMSettingsModule() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Settings className="h-6 w-6" />
            Configurações do CRM
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie origens de lead, automações, tarefas e preferências do módulo CRM
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="origens" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="origens"
              className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3 h-auto flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Origens de Lead
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                Novo
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="automacoes"
              className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3 h-auto flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Automações
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Catálogo
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="tarefas"
              className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3 h-auto flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Gestão de Atividades e Tarefas
            </TabsTrigger>
            <TabsTrigger
              value="geral"
              className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 px-6 py-3 h-auto flex items-center gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Configurações Gerais
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="origens" className="mt-0 p-6">
              <LeadSourcesSettingsTab />
            </TabsContent>

            <TabsContent value="automacoes" className="mt-0 p-6">
              <AutomationsSettingsTab />
            </TabsContent>

            <TabsContent value="tarefas" className="mt-0 p-6">
              <TasksSettingsTab />
            </TabsContent>

            <TabsContent value="geral" className="mt-0 p-6">
              <GeneralSettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
