/**
 * CRM Sidebar V2 - Menu Lateral Reorganizado
 * 
 * Estrutura:
 * - VISÃO GERAL (Dashboard)
 * - CLIENTES (Vendas, Projetos, Contatos, Leads, Proprietários)
 * - OPERAÇÕES (Check-ins, Check-outs, Limpezas, Manutenções)
 * - TAREFAS (Minhas, Todas, Calendário)
 * - CONFIGURAÇÕES
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  FolderKanban, 
  Users, 
  Target, 
  Home,
  Key,
  DoorOpen,
  Sparkles,
  Wrench,
  CheckSquare,
  ListTodo,
  Calendar,
  Settings,
  FileText,
  Zap,
  Gauge,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  X
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_COUNTS = {
  vendas: 4,
  projetos: 5,
  contatos: 156,
  leads: 32,
  proprietarios: 28,
  checkinsHoje: 8,
  checkoutsHoje: 5,
  limpezas: 12,
  manutencoes: 3,
  minhasTarefas: 8,
  todasTarefas: 24,
};

// ============================================================================
// TYPES
// ============================================================================

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  indent?: boolean;
}

interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// ============================================================================
// COMPONENTS
// ============================================================================

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  count,
  active,
  onClick,
  badge,
  badgeVariant = 'secondary',
  indent = false,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-primary/10 text-primary font-medium',
        indent && 'pl-8'
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && (
        <Badge variant={badgeVariant} className="text-xs">
          {badge}
        </Badge>
      )}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">
          {count}
        </Badge>
      )}
    </button>
  );
};

const SidebarGroup: React.FC<SidebarGroupProps> = ({ 
  title, 
  children, 
  defaultOpen = true 
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {title}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CRMSidebarV2Props {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  onClose?: () => void;
  className?: string;
}

export const CRMSidebarV2: React.FC<CRMSidebarV2Props> = ({
  activeItem = 'dashboard',
  onItemClick,
  onClose,
  className,
}) => {
  const handleClick = (item: string) => {
    onItemClick?.(item);
  };

  return (
    <aside className={cn(
      'w-64 h-full bg-card border-r flex flex-col',
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">CRM & Tasks</h2>
          <p className="text-xs text-muted-foreground">Clientes e Tarefas</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* VISÃO GERAL */}
        <SidebarGroup title="Visão Geral">
          <SidebarItem
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
            active={activeItem === 'dashboard'}
            onClick={() => handleClick('dashboard')}
          />
        </SidebarGroup>

        {/* CLIENTES */}
        <SidebarGroup title="Clientes">
          <SidebarItem
            icon={<Briefcase className="h-4 w-4" />}
            label="Vendas"
            count={MOCK_COUNTS.vendas}
            active={activeItem === 'vendas'}
            onClick={() => handleClick('vendas')}
          />
          <SidebarItem
            icon={<FolderKanban className="h-4 w-4" />}
            label="Projetos & Serviços"
            count={MOCK_COUNTS.projetos}
            active={activeItem === 'projetos'}
            onClick={() => handleClick('projetos')}
          />
          <SidebarItem
            icon={<Users className="h-4 w-4" />}
            label="Contatos"
            count={MOCK_COUNTS.contatos}
            active={activeItem === 'contatos'}
            onClick={() => handleClick('contatos')}
          />
          <SidebarItem
            icon={<Target className="h-4 w-4" />}
            label="Leads"
            count={MOCK_COUNTS.leads}
            active={activeItem === 'leads'}
            onClick={() => handleClick('leads')}
          />
          <SidebarItem
            icon={<Home className="h-4 w-4" />}
            label="Proprietários"
            count={MOCK_COUNTS.proprietarios}
            active={activeItem === 'proprietarios'}
            onClick={() => handleClick('proprietarios')}
          />
        </SidebarGroup>

        {/* OPERAÇÕES - NOVO! */}
        <SidebarGroup title="Operações">
          <SidebarItem
            icon={<Key className="h-4 w-4" />}
            label="Check-ins Hoje"
            count={MOCK_COUNTS.checkinsHoje}
            active={activeItem === 'checkins'}
            onClick={() => handleClick('checkins')}
          />
          <SidebarItem
            icon={<DoorOpen className="h-4 w-4" />}
            label="Check-outs Hoje"
            count={MOCK_COUNTS.checkoutsHoje}
            active={activeItem === 'checkouts'}
            onClick={() => handleClick('checkouts')}
          />
          <SidebarItem
            icon={<Sparkles className="h-4 w-4" />}
            label="Limpezas Pendentes"
            count={MOCK_COUNTS.limpezas}
            active={activeItem === 'limpezas'}
            onClick={() => handleClick('limpezas')}
          />
          <SidebarItem
            icon={<Wrench className="h-4 w-4" />}
            label="Manutenções"
            count={MOCK_COUNTS.manutencoes}
            active={activeItem === 'manutencoes'}
            onClick={() => handleClick('manutencoes')}
            badge={MOCK_COUNTS.manutencoes > 0 ? '!' : undefined}
            badgeVariant="destructive"
          />
        </SidebarGroup>

        {/* TAREFAS */}
        <SidebarGroup title="Tarefas">
          <SidebarItem
            icon={<CheckSquare className="h-4 w-4" />}
            label="Minhas Tarefas"
            count={MOCK_COUNTS.minhasTarefas}
            active={activeItem === 'minhas-tarefas'}
            onClick={() => handleClick('minhas-tarefas')}
          />
          <SidebarItem
            icon={<ListTodo className="h-4 w-4" />}
            label="Todas as Tarefas"
            count={MOCK_COUNTS.todasTarefas}
            active={activeItem === 'todas-tarefas'}
            onClick={() => handleClick('todas-tarefas')}
          />
          <SidebarItem
            icon={<Calendar className="h-4 w-4" />}
            label="Calendário"
            active={activeItem === 'calendario'}
            onClick={() => handleClick('calendario')}
          />
        </SidebarGroup>

        {/* CONFIGURAÇÕES */}
        <SidebarGroup title="Configurações" defaultOpen={false}>
          <SidebarItem
            icon={<FileText className="h-4 w-4" />}
            label="Tipos de Tarefa"
            active={activeItem === 'tipos-tarefa'}
            onClick={() => handleClick('tipos-tarefa')}
          />
          <SidebarItem
            icon={<FolderKanban className="h-4 w-4" />}
            label="Templates de Projeto"
            active={activeItem === 'templates'}
            onClick={() => handleClick('templates')}
          />
          <SidebarItem
            icon={<Zap className="h-4 w-4" />}
            label="Automações"
            active={activeItem === 'automacoes'}
            onClick={() => handleClick('automacoes')}
          />
          <SidebarItem
            icon={<Gauge className="h-4 w-4" />}
            label="Prioridades & SLA"
            active={activeItem === 'sla'}
            onClick={() => handleClick('sla')}
          />
        </SidebarGroup>

        {/* MÓDULO BETA */}
        <div className="pt-2">
          <SidebarItem
            icon={<FlaskConical className="h-4 w-4" />}
            label="Módulo Beta"
            badge="NOVO"
            badgeVariant="default"
            active={activeItem === 'beta'}
            onClick={() => handleClick('beta')}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={() => handleClick('fechar-modulo')}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Fechar Módulo
        </Button>
      </div>
    </aside>
  );
};

export default CRMSidebarV2;
