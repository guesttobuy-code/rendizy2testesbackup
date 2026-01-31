/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║             OPERATIONAL TASKS CONFIG - TELA MÃE                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente principal para gerenciamento de Tarefas Operacionais
 * Organizado em 3 tabs independentes:
 * 
 * 1. Limpeza & Vistoria - Gestão de limpeza e conferência pós-checkout
 * 2. Manutenção - Gestão de manutenção preventiva e corretiva
 * 3. Check-in - Módulo separado com dinâmica própria (futuro)
 * 
 * @version 2.0.0
 * @date 2026-01-31
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Wrench,
  LogIn,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CleaningVistoriaTab } from './CleaningVistoriaTab';
import { MaintenanceTab } from './MaintenanceTab';
import { CheckinTab } from './CheckinTab';

// ============================================================================
// TYPES
// ============================================================================

interface OperationalTasksConfigProps {
  organizationId: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OperationalTasksConfig({ organizationId }: OperationalTasksConfigProps) {
  const [activeTab, setActiveTab] = useState<'cleaning' | 'maintenance' | 'checkin'>('cleaning');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tarefas Operacionais</h2>
        <p className="text-muted-foreground">
          Configure como as tarefas de limpeza, manutenção e check-in serão gerenciadas
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="cleaning" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Limpeza & Vistoria</span>
            <span className="sm:hidden">Limpeza</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span>Manutenção</span>
          </TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2">
            <LogIn className="h-4 w-4" />
            <span>Check-in</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1">Em breve</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cleaning" className="space-y-6">
          <CleaningVistoriaTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <MaintenanceTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="checkin" className="space-y-6">
          <CheckinTab organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OperationalTasksConfig;
