/**
 * CRM Tasks V2 Demo Page
 * 
 * Página de demonstração que combina todos os componentes mock
 * para visualização e aprovação do design.
 */

import React, { useState } from 'react';
import {
  Layout,
  LayoutGrid,
  List,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import all mock components
import { CRMSidebarV2 } from './CRMSidebarV2';
import { ProjectsListView } from './ProjectsListView';
import { ProjectDetailModal } from './ProjectDetailModal';
import { OperationsView } from './OperationsView';
import { ActivityLogSidebar } from './ActivityLogSidebar';
import { TaskFormModalV2 } from './TaskFormModalV2';
import { TasksDashboardV2 } from './TasksDashboardV2';

// ============================================================================
// DEMO CONTROLS COMPONENT
// ============================================================================

interface DemoControlsProps {
  activeDemo: string;
  onChangeDemo: (demo: string) => void;
}

const DemoControls: React.FC<DemoControlsProps> = ({ activeDemo, onChangeDemo }) => {
  const demos = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'projects', label: 'Lista Projetos', icon: <List className="h-4 w-4" /> },
    { id: 'operations', label: 'Operações', icon: <Calendar className="h-4 w-4" /> },
    { id: 'sidebar', label: 'Menu Lateral', icon: <Layout className="h-4 w-4" /> },
    { id: 'modal-detail', label: 'Modal Detalhe', icon: <FileText className="h-4 w-4" /> },
    { id: 'modal-form', label: 'Modal Criar', icon: <FileText className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity Log', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed top-4 right-4 z-[100] bg-background border rounded-lg shadow-lg p-2">
      <div className="flex items-center gap-1 flex-wrap max-w-[400px]">
        {demos.map((demo) => (
          <Button
            key={demo.id}
            variant={activeDemo === demo.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChangeDemo(demo.id)}
            className="gap-1"
          >
            {demo.icon}
            {demo.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// DEMO WRAPPER COMPONENT
// ============================================================================

interface DemoWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

const DemoWrapper: React.FC<DemoWrapperProps> = ({
  title,
  description,
  children,
  fullHeight = false,
}) => {
  return (
    <div className={cn('flex flex-col', fullHeight && 'h-screen')}>
      {/* Demo Header */}
      <div className="bg-muted/50 px-6 py-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Badge variant="outline" className="bg-purple-100 text-purple-700">
            MOCK / DESIGN
          </Badge>
        </div>
      </div>

      {/* Demo Content */}
      <div className={cn('flex-1', fullHeight && 'overflow-hidden')}>{children}</div>
    </div>
  );
};

// ============================================================================
// SIDEBAR + CONTENT LAYOUT
// ============================================================================

const SidebarWithContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-300 border-r',
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[260px]'
        )}
      >
        <CRMSidebarV2 />
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute left-[250px] top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-1 shadow hover:bg-muted transition-all"
        style={{ left: sidebarCollapsed ? '0' : '250px' }}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
};

// ============================================================================
// MAIN DEMO PAGE
// ============================================================================

export const CRMTasksV2Demo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState('dashboard');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showActivitySidebar, setShowActivitySidebar] = useState(false);

  const renderDemo = () => {
    switch (activeDemo) {
      case 'dashboard':
        return (
          <DemoWrapper
            title="Dashboard de Tarefas V2"
            description="Visão geral com KPIs, métricas de performance e atividades recentes"
            fullHeight
          >
            <SidebarWithContent>
              <TasksDashboardV2 />
            </SidebarWithContent>
          </DemoWrapper>
        );

      case 'projects':
        return (
          <DemoWrapper
            title="Lista de Projetos & Serviços"
            description="Visualização estilo ClickUp com grupos por status, progresso e filtros"
            fullHeight
          >
            <SidebarWithContent>
              <div className="h-full flex">
                <div className="flex-1">
                  <ProjectsListView />
                </div>
                {showActivitySidebar && (
                  <div className="w-80 border-l">
                    <ActivityLogSidebar />
                  </div>
                )}
              </div>
            </SidebarWithContent>

            {/* Toggle Activity Sidebar */}
            <Button
              variant="outline"
              size="sm"
              className="fixed bottom-4 right-4 z-50"
              onClick={() => setShowActivitySidebar(!showActivitySidebar)}
            >
              {showActivitySidebar ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Activity
            </Button>

            {/* Open Detail Modal Button */}
            <Button
              variant="default"
              size="sm"
              className="fixed bottom-4 right-32 z-50"
              onClick={() => setShowProjectModal(true)}
            >
              Abrir Modal Detalhe
            </Button>

            {/* Project Detail Modal */}
            <ProjectDetailModal
              isOpen={showProjectModal}
              onClose={() => setShowProjectModal(false)}
            />
          </DemoWrapper>
        );

      case 'operations':
        return (
          <DemoWrapper
            title="Operações do Dia"
            description="Check-ins, Check-outs, Limpezas e Manutenções com timeline"
            fullHeight
          >
            <SidebarWithContent>
              <OperationsView />
            </SidebarWithContent>
          </DemoWrapper>
        );

      case 'sidebar':
        return (
          <DemoWrapper
            title="Menu Lateral Reorganizado"
            description="Nova estrutura com grupos OPERAÇÕES e TAREFAS destacados"
          >
            <div className="flex h-[600px] bg-muted/30">
              <div className="w-[260px] border-r bg-background">
                <CRMSidebarV2 />
              </div>
              <div className="flex-1 p-6">
                <div className="bg-background rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Estrutura do Menu</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700">VISÃO GERAL</Badge>
                      <span className="text-muted-foreground">Dashboard, Inbox</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700">CLIENTES</Badge>
                      <span className="text-muted-foreground">Funil, Contatos, Empresas, Negociações</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-700">OPERAÇÕES</Badge>
                      <span className="text-muted-foreground">Check-ins, Check-outs, Limpezas, Manutenções</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-700">TAREFAS</Badge>
                      <span className="text-muted-foreground">Minhas Tarefas, Projetos, Templates</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-gray-100 text-gray-700">CONFIGURAÇÕES</Badge>
                      <span className="text-muted-foreground">Automações, Campos, Integrações</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </DemoWrapper>
        );

      case 'modal-detail':
        return (
          <DemoWrapper
            title="Modal de Detalhe do Projeto"
            description="Hierarquia de subtarefas, campos editáveis e activity log"
          >
            <div className="relative h-[700px] bg-muted/30">
              <ProjectDetailModal isOpen={true} onClose={() => {}} />
            </div>
          </DemoWrapper>
        );

      case 'modal-form':
        return (
          <DemoWrapper
            title="Modal de Criação de Tarefa"
            description="Formulário completo com todos os campos, subtarefas inline e IA"
          >
            <div className="p-6">
              <div className="flex justify-center">
                <Button onClick={() => setShowTaskModal(true)}>
                  Abrir Modal de Criação
                </Button>
              </div>
              <TaskFormModalV2
                isOpen={showTaskModal}
                onClose={() => setShowTaskModal(false)}
                mode="create"
              />
            </div>
          </DemoWrapper>
        );

      case 'activity':
        return (
          <DemoWrapper
            title="Activity Log Sidebar"
            description="Histórico de atividades com comentários, reações e filtros"
          >
            <div className="flex h-[600px] bg-muted/30">
              <div className="flex-1 p-6">
                <div className="bg-background rounded-lg border p-6 h-full">
                  <h3 className="font-semibold mb-4">Funcionalidades do Activity Log</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline">1</Badge>
                      <span>Timeline de eventos agrupados por data (Hoje, Ontem, etc)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline">2</Badge>
                      <span>Comentários com suporte a @menções e formatação</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline">3</Badge>
                      <span>Reações em comentários (emoji reactions)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline">4</Badge>
                      <span>Respostas aninhadas (threads)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline">5</Badge>
                      <span>Filtros por tipo (Comentários, Atividades)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline">6</Badge>
                      <span>Input de comentário com emoji, menções e anexos</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="w-80 border-l bg-background">
                <ActivityLogSidebar />
              </div>
            </div>
          </DemoWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Controls */}
      <DemoControls activeDemo={activeDemo} onChangeDemo={setActiveDemo} />

      {/* Demo Content */}
      {renderDemo()}
    </div>
  );
};

export default CRMTasksV2Demo;
