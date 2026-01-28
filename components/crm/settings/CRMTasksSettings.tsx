/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRM TASKS SETTINGS PAGE                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Página de configurações que integra todos os componentes de gestão:
 * - Equipes (Teams)
 * - Campos Customizados
 * - Templates de Tarefas Operacionais
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState } from 'react';
import {
  Users,
  Tag,
  Zap,
  Settings,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import configurator components
import { TeamsConfig } from './TeamsConfig';
import { CustomFieldsConfig } from './CustomFieldsConfig';
import { OperationalTasksConfig } from './OperationalTasksConfig';

// ============================================================================
// TYPES
// ============================================================================

interface CRMTasksSettingsProps {
  organizationId: string;
  onBack?: () => void;
}

type SettingsSection = 'teams' | 'custom_fields' | 'operational_tasks';

interface SettingsMenuItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ElementType;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SETTINGS_MENU: SettingsMenuItem[] = [
  {
    id: 'teams',
    label: 'Equipes',
    description: 'Gerencie equipes e membros',
    icon: Users,
  },
  {
    id: 'custom_fields',
    label: 'Campos Customizados',
    description: 'Configure campos personalizados para tarefas',
    icon: Tag,
  },
  {
    id: 'operational_tasks',
    label: 'Tarefas Operacionais',
    description: 'Configure templates de tarefas automáticas',
    icon: Zap,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CRMTasksSettings({ organizationId, onBack }: CRMTasksSettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('teams');

  const activeMenuItem = SETTINGS_MENU.find(item => item.id === activeSection);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </h2>
              <p className="text-xs text-muted-foreground">CRM Tasks</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <ScrollArea className="flex-1 p-2">
          <nav className="space-y-1">
            {SETTINGS_MENU.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  activeSection === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={cn(
                    'text-xs truncate',
                    activeSection === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  'h-4 w-4 shrink-0',
                  activeSection === item.id ? 'opacity-100' : 'opacity-0'
                )} />
              </button>
            ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6">
            {activeSection === 'teams' && (
              <TeamsConfig organizationId={organizationId} />
            )}
            
            {activeSection === 'custom_fields' && (
              <CustomFieldsConfig organizationId={organizationId} scope="task" />
            )}
            
            {activeSection === 'operational_tasks' && (
              <OperationalTasksConfig organizationId={organizationId} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default CRMTasksSettings;
