/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           TAB AUTOMAÇÕES - PRATELEIRA DE EVENTOS E AÇÕES                  ║
 * ║                                                                           ║
 * ║  Catálogo visual de todos os triggers e ações disponíveis para           ║
 * ║  automações. Inspirado no padrão "Componentes e Dados" do módulo Sites.  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

import React, { useState } from 'react';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  TRIGGERS_CATALOG,
  ACTIONS_CATALOG,
  CONDITIONS_CATALOG,
  CATEGORY_LABELS,
  type TriggerDefinition,
  type ActionDefinition,
  type TriggerCategory,
  type ActionCategory,
  type StabilityLevel,
} from './automation-catalog';
import {
  Search,
  Zap,
  Play,
  Filter,
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  LogIn,
  LogOut,
  CircleDollarSign,
  AlertCircle,
  MessageSquare,
  Clock,
  CheckSquare,
  CheckCircle2,
  UserCheck,
  GitBranch,
  Wrench,
  Package,
  Calendar,
  Timer,
  Webhook,
  Bell,
  Mail,
  MessageCircle,
  Plus,
  Edit,
  Database,
  FileText,
  Globe,
  Hourglass,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react';

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function StabilityBadge({ stability }: { stability: StabilityLevel }) {
  const config = {
    stable: { label: 'Disponível', variant: 'secondary' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    beta: { label: 'Beta', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    planned: { label: 'Planejado', variant: 'outline' as const, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  };

  const { label, className } = config[stability];
  return <Badge className={className}>{label}</Badge>;
}

// Mapeamento de string para componente de ícone
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  CalendarPlus,
  CalendarCheck,
  CalendarX,
  LogIn,
  LogOut,
  CircleDollarSign,
  AlertCircle,
  MessageSquare,
  Clock,
  CheckSquare,
  CheckCircle2,
  UserCheck,
  GitBranch,
  Wrench,
  Package,
  Calendar,
  Timer,
  Webhook,
  Bell,
  Mail,
  MessageCircle,
  Plus,
  Edit,
  Database,
  FileText,
  Globe,
  Hourglass,
  Play,
  Zap,
};

function IconRenderer({ name, className }: { name: string; className?: string }) {
  const IconComponent = ICON_MAP[name] || Zap;
  return <IconComponent className={className} />;
}

// ============================================================================
// TRIGGER CARD
// ============================================================================

function TriggerCard({ trigger }: { trigger: TriggerDefinition }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <IconRenderer name={trigger.icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{trigger.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">{trigger.description}</CardDescription>
            </div>
          </div>
          <StabilityBadge stability={trigger.stability} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Campos disponíveis - preview */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {trigger.availableFields.length} campos disponíveis
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 pl-6">
              {trigger.availableFields.map((field) => (
                <div key={field.path} className="flex items-start gap-2 text-sm">
                  <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono text-blue-600 dark:text-blue-400">
                    {`{{${field.path}}}`}
                  </code>
                  <span className="text-gray-600 dark:text-gray-400">{field.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exemplos de uso */}
        <div className="border-t pt-3 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Exemplos de uso
          </div>
          <ul className="space-y-1">
            {trigger.examples.slice(0, 2).map((example, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-amber-500" />
                {example}
              </li>
            ))}
          </ul>
        </div>

        {/* Aliases */}
        {trigger.aliases.length > 1 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {trigger.aliases.slice(0, 3).map((alias) => (
              <Badge key={alias} variant="outline" className="font-mono text-xs">
                {alias}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ACTION CARD
// ============================================================================

function ActionCard({ action }: { action: ActionDefinition }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <IconRenderer name={action.icon} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{action.name}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">{action.description}</CardDescription>
            </div>
          </div>
          <StabilityBadge stability={action.stability} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Campos */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {action.requiredFields.length} obrigatórios, {action.optionalFields.length} opcionais
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 pl-6">
              {action.requiredFields.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Obrigatórios</div>
                  {action.requiredFields.map((field) => (
                    <div key={field.name} className="flex items-start gap-2 text-sm py-1">
                      <code className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-xs font-mono text-red-600 dark:text-red-400">
                        {field.name}
                      </code>
                      <span className="text-gray-600 dark:text-gray-400">{field.description}</span>
                    </div>
                  ))}
                </div>
              )}
              {action.optionalFields.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Opcionais</div>
                  {action.optionalFields.map((field) => (
                    <div key={field.name} className="flex items-start gap-2 text-sm py-1">
                      <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-600 dark:text-gray-400">
                        {field.name}
                      </code>
                      <span className="text-gray-600 dark:text-gray-400">{field.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Exemplos */}
        <div className="border-t pt-3 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Exemplos
          </div>
          <ul className="space-y-1">
            {action.examples.map((example, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-amber-500" />
                {example}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SEÇÃO DE CATEGORIA
// ============================================================================

function CategorySection({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AutomationsSettingsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'triggers' | 'actions' | 'conditions'>('triggers');

  // Filtrar por busca
  const filteredTriggers = TRIGGERS_CATALOG.filter(t => 
    searchTerm === '' ||
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredActions = ACTIONS_CATALOG.filter(a =>
    searchTerm === '' ||
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar triggers por categoria
  const triggerCategories: TriggerCategory[] = ['reservas', 'financeiro', 'comunicacao', 'crm', 'operacional', 'sistema', 'funis'];
  const actionCategories: ActionCategory[] = ['notificacoes', 'tarefas', 'dados', 'integracao', 'funis'];

  const categoryDescriptions: Record<TriggerCategory | ActionCategory, string> = {
    reservas: 'Eventos relacionados ao ciclo de vida das reservas.',
    financeiro: 'Eventos de pagamentos, cobranças e transações financeiras.',
    comunicacao: 'Eventos de mensagens recebidas e interações de chat.',
    crm: 'Eventos de leads, deals, tarefas e pipeline de vendas.',
    operacional: 'Eventos de manutenção, inventário e operações.',
    sistema: 'Eventos agendados, manuais e webhooks externos.',
    funis: 'Eventos e ações específicos de Funis de Vendas e gestão de leads.',
    notificacoes: 'Ações para enviar alertas, emails e mensagens.',
    tarefas: 'Ações para criar e gerenciar tarefas.',
    dados: 'Ações para manipular registros e logs.',
    integracao: 'Ações para integrar com sistemas externos.',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Catálogo de Automações</CardTitle>
              <CardDescription>
                Todos os eventos (triggers), ações e condições disponíveis para criar automações.
                Use esta referência para entender o que você pode automatizar no Rendizy.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{TRIGGERS_CATALOG.length}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Eventos (Triggers)</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{ACTIONS_CATALOG.length}</div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Ações Disponíveis</div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{CONDITIONS_CATALOG.length}</div>
              <div className="text-sm text-amber-700 dark:text-amber-300">Tipos de Condição</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar eventos, ações ou palavras-chave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Triggers (Eventos)
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Ações
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Condições
          </TabsTrigger>
        </TabsList>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-8 mt-6">
          {triggerCategories.map((category) => {
            const triggers = filteredTriggers.filter(t => t.category === category);
            if (triggers.length === 0) return null;

            return (
              <CategorySection
                key={category}
                title={CATEGORY_LABELS[category]}
                description={categoryDescriptions[category]}
              >
                {triggers.map((trigger) => (
                  <TriggerCard key={trigger.id} trigger={trigger} />
                ))}
              </CategorySection>
            );
          })}

          {filteredTriggers.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum trigger encontrado para "{searchTerm}"</p>
            </div>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-8 mt-6">
          {actionCategories.map((category) => {
            const actions = filteredActions.filter(a => a.category === category);
            if (actions.length === 0) return null;

            return (
              <CategorySection
                key={category}
                title={CATEGORY_LABELS[category]}
                description={categoryDescriptions[category]}
              >
                {actions.map((action) => (
                  <ActionCard key={action.id} action={action} />
                ))}
              </CategorySection>
            );
          })}

          {filteredActions.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma ação encontrada para "{searchTerm}"</p>
            </div>
          )}
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operadores de Condição</CardTitle>
              <CardDescription>
                Use condições para filtrar quando uma automação deve executar.
                Combine múltiplas condições com lógica AND.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CONDITIONS_CATALOG.map((condition) => (
                  <div
                    key={condition.id}
                    className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <code className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-xs font-mono text-amber-700 dark:text-amber-300">
                        {condition.operator}
                      </code>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{condition.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{condition.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {condition.applicableTo.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dica de uso */}
          <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">Como usar condições</div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Condições permitem filtrar quando uma automação deve executar. Por exemplo: 
                    "Quando <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">canal</code> 
                    <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded mx-1">equals</code> 
                    <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">Airbnb</code>" 
                    executará apenas para reservas vindas do Airbnb.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
