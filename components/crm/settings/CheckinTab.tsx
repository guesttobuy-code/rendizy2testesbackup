/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║          TAB: CHECK-IN - Configuração (Módulo Separado)                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * IMPORTANTE: Check-in tem dinâmica COMPLETAMENTE DIFERENTE de limpeza/manutenção
 * Este módulo é independente e não compartilha estrutura com os outros.
 * 
 * @version 1.0.0
 * @date 2026-01-31
 */

import React from 'react';
import {
  LogIn,
  Key,
  Clock,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  Settings2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface CheckinTabProps {
  organizationId: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CheckinTab({ organizationId: _organizationId }: CheckinTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <div className="p-3 bg-green-100 rounded-full">
          <LogIn className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-green-800">Gestão de Check-in</h2>
          <p className="text-sm text-green-600">
            Configure como os check-ins serão gerenciados no sistema
          </p>
        </div>
      </div>

      {/* Em desenvolvimento */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Módulo em desenvolvimento</strong>
          <br />
          O módulo de Check-in está sendo construído com uma dinâmica própria, diferente de Limpeza e Manutenção.
          Este módulo incluirá funcionalidades específicas para gestão de chegada de hóspedes.
        </AlertDescription>
      </Alert>

      {/* Preview de funcionalidades planejadas */}
      <div className="grid gap-4 md:grid-cols-2">
        <FeaturePreviewCard
          icon={Key}
          title="Entrega de Chaves"
          description="Configure como e quando as chaves serão entregues ao hóspede"
          status="planned"
        />
        <FeaturePreviewCard
          icon={Clock}
          title="Horários de Check-in"
          description="Defina horários padrão e exceções por imóvel"
          status="planned"
        />
        <FeaturePreviewCard
          icon={MessageSquare}
          title="Comunicação Pré-Chegada"
          description="Automatize mensagens de boas-vindas e instruções"
          status="planned"
        />
        <FeaturePreviewCard
          icon={FileText}
          title="Documentação do Hóspede"
          description="Colete documentos e informações necessárias"
          status="planned"
        />
        <FeaturePreviewCard
          icon={Users}
          title="Recepção Presencial"
          description="Gerencie recepcionistas e escalas de atendimento"
          status="planned"
        />
        <FeaturePreviewCard
          icon={Calendar}
          title="Agenda de Check-ins"
          description="Visualize todos os check-ins do dia em um calendário"
          status="planned"
        />
      </div>

      {/* CTA */}
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Settings2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Funcionalidades em breve</h3>
          <p className="text-sm text-muted-foreground mb-4">
            O módulo de Check-in terá configurações específicas para gerenciar a chegada de hóspedes,
            incluindo integração com fechaduras inteligentes, automação de mensagens e muito mais.
          </p>
          <Button variant="outline" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Configurar Check-in (Em breve)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FeaturePreviewCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  status: 'planned' | 'development' | 'beta';
}

function FeaturePreviewCard({ icon: Icon, title, description, status }: FeaturePreviewCardProps) {
  const statusInfo = {
    planned: { label: 'Planejado', color: 'bg-gray-100 text-gray-600' },
    development: { label: 'Em desenvolvimento', color: 'bg-blue-100 text-blue-600' },
    beta: { label: 'Beta', color: 'bg-green-100 text-green-600' },
  };

  return (
    <Card className="opacity-75 hover:opacity-100 transition-opacity">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{title}</h4>
              <Badge variant="secondary" className={cn("text-xs", statusInfo[status].color)}>
                {statusInfo[status].label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CheckinTab;
