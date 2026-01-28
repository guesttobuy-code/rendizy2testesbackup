/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           TAB GESTÃO DE ATIVIDADES E TAREFAS - CRM SETTINGS               ║
 * ║                                                                           ║
 * ║  Configurações de Times, Campos Customizados e Tarefas Operacionais      ║
 * ║  Sistema completo de gestão estilo Asana.                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 2.0.0
 * @date 2026-01-28
 * 
 * REFATORADO: Agora integra os componentes completos:
 * - TeamsConfig: Gestão de times e equipes
 * - CustomFieldsConfig: Campos personalizados
 * - OperationalTasksConfig: Templates de tarefas operacionais
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Users, 
  Settings2, 
  ClipboardList,
  Sparkles 
} from 'lucide-react';

// Importar os novos componentes completos
import { TeamsConfig } from './TeamsConfig';
import { CustomFieldsConfig } from './CustomFieldsConfig';
import { OperationalTasksConfig } from './OperationalTasksConfig';

// TODO: Pegar organizationId do contexto de autenticação
// Por enquanto usa um valor mockado para desenvolvimento
const MOCK_ORGANIZATION_ID = 'org_demo_001';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function TasksSettingsTab() {
  const [activeTab, setActiveTab] = useState('teams');
  
  // TODO: Substituir pelo organizationId real do contexto de auth
  const organizationId = MOCK_ORGANIZATION_ID;

  return (
    <div className="space-y-6">
      {/* Sub-tabs para as diferentes seções */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Times e Equipes</span>
            <span className="sm:hidden">Times</span>
          </TabsTrigger>
          <TabsTrigger value="customFields" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Campos Customizados</span>
            <span className="sm:hidden">Campos</span>
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Tarefas Operacionais</span>
            <span className="sm:hidden">Operações</span>
          </TabsTrigger>
        </TabsList>

        {/* Times e Equipes */}
        <TabsContent value="teams" className="mt-6">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">Times e Equipes</div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Configure times para atribuição de tarefas, notificações em grupo e regras de distribuição automática. 
                  Suporta membros internos e colaboradores externos (terceirizados).
                </p>
              </div>
            </div>
          </div>
          <TeamsConfig organizationId={organizationId} />
        </TabsContent>

        {/* Campos Customizados */}
        <TabsContent value="customFields" className="mt-6">
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <div className="font-medium text-purple-900 dark:text-purple-100">Campos Personalizados</div>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  Crie campos customizados para suas tarefas: texto, número, data, seleção única/múltipla, 
                  usuário e moeda. Arraste para reordenar a exibição.
                </p>
              </div>
            </div>
          </div>
          <CustomFieldsConfig organizationId={organizationId} />
        </TabsContent>

        {/* Tarefas Operacionais */}
        <TabsContent value="operational" className="mt-6">
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">Tarefas Operacionais Automáticas</div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Configure templates de tarefas que são criadas automaticamente por eventos (check-in, check-out) 
                  ou agendamento cíclico (semanal, mensal). Ideal para limpezas, vistorias e manutenções.
                </p>
              </div>
            </div>
          </div>
          <OperationalTasksConfig organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
