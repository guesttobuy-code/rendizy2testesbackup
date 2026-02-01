/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           TAB GESTÃO DE ATIVIDADES E TAREFAS - CRM SETTINGS               ║
 * ║                                                                           ║
 * ║  Configurações de Times, Campos Customizados e Tarefas Operacionais      ║
 * ║  Sistema completo de gestão estilo Asana.                                ║
 * ║                                                                           ║
 * ║  ✅ URL reflete a sub-aba: /crm/configuracoes/gestao-tarefas/:subTab     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 2.2.0
 * @date 2026-01-31
 * 
 * SIMPLIFICADO: 3 abas apenas
 * - TeamsConfig: Gestão de times e equipes
 * - CustomFieldsConfig: Campos personalizados
 * - OperationalTasksConfig: Templates + Responsabilidade (integrados)
 */

import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Users, 
  Settings2, 
  ClipboardList,
  Sparkles 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Importar os componentes
import { TeamsConfig } from './TeamsConfig';
import { CustomFieldsConfig } from './CustomFieldsConfig';
import { OperationalTasksConfig } from './OperationalTasksConfig';

// Mapeamento de tabs para slugs de URL
const SUB_TAB_SLUGS = {
  teams: 'times-equipes',
  customFields: 'campos-customizados',
  operational: 'tarefas-operacionais',
} as const;

// Mapeamento inverso (slug -> tab value)
const SLUG_TO_SUB_TAB: Record<string, string> = {
  'times-equipes': 'teams',
  'campos-customizados': 'customFields',
  'tarefas-operacionais': 'operational',
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface TasksSettingsTabProps {
  subTab?: string;
}

export function TasksSettingsTab({ subTab }: TasksSettingsTabProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Usar organizationId real do contexto de auth
  const organizationId = user?.organizationId || '';
  
  // Determinar a aba ativa baseado na URL
  const activeTab = subTab ? (SLUG_TO_SUB_TAB[subTab] || 'teams') : 'teams';
  
  // Handler para mudança de sub-tab - atualiza URL
  const handleSubTabChange = (value: string) => {
    const slug = SUB_TAB_SLUGS[value as keyof typeof SUB_TAB_SLUGS] || value;
    navigate(`/crm/configuracoes/gestao-tarefas/${slug}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs para as diferentes seções */}
      <Tabs value={activeTab} onValueChange={handleSubTabChange} className="w-full">
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

        {/* Tarefas Operacionais - INTEGRADO com responsabilidade */}
        <TabsContent value="operational" className="mt-6">
          <OperationalTasksConfig organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
