/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           AUTOMATIONS MANAGER - GESTÃO DE AUTOMAÇÕES                      ║
 * ║                                                                           ║
 * ║  Tela principal de gestão de automações com:                             ║
 * ║  • Listagem em grid/cards visuais                                        ║
 * ║  • Filtros por categoria, status, trigger                                ║
 * ║  • Ações em lote (ativar/desativar/excluir)                             ║
 * ║  • Histórico de execuções                                                ║
 * ║  • Duplicação rápida                                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useMemo } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import {
  Zap,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Play,
  History,
  ArrowRight,
  LayoutGrid,
  List,
  RefreshCw,
  ChevronRight,
  Calendar,
  MessageCircle,
  DollarSign,
  Settings2,
  Star,
} from 'lucide-react';
import { Automation, TriggerCategory } from './types';
import { useAutomations } from './hooks/useAutomations';
import { TRIGGERS_CATALOG } from '../settings/automation-catalog';

// ============================================================================
// ICON MAP
// ============================================================================

const CATEGORY_ICONS: Record<TriggerCategory, React.ComponentType<any>> = {
  reservas: Calendar,
  comunicacao: MessageCircle,
  financeiro: DollarSign,
  operacional: Settings2,
  reviews: Star,
};

const CATEGORY_COLORS: Record<TriggerCategory, string> = {
  reservas: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  comunicacao: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  financeiro: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  operacional: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  reviews: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

// ============================================================================
// AUTOMATION CARD
// ============================================================================

interface AutomationCardProps {
  automation: Automation;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  onTest: () => void;
  onViewHistory: () => void;
}

function AutomationCard({
  automation,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  onTest,
  onViewHistory,
}: AutomationCardProps) {
  const CategoryIcon = CATEGORY_ICONS[automation.category];
  const trigger = TRIGGERS_CATALOG.find(t => t.id === automation.trigger.type);

  const stats = automation.stats;
  const successRate = stats.totalRuns > 0 
    ? Math.round((stats.successRuns / stats.totalRuns) * 100) 
    : 0;

  return (
    <Card className={`
      group relative overflow-hidden transition-all duration-200 hover:shadow-lg
      ${automation.isActive 
        ? 'border-gray-200 dark:border-gray-700' 
        : 'border-gray-200 dark:border-gray-700 opacity-75 bg-gray-50 dark:bg-gray-800/50'
      }
    `}>
      {/* Status indicator line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        automation.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      }`} />

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${CATEGORY_COLORS[automation.category]}`}>
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {automation.name}
                </h3>
                {!automation.isActive && (
                  <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-700">
                    Pausada
                  </Badge>
                )}
              </div>
              {automation.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {automation.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={automation.isActive}
              onCheckedChange={onToggle}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTest}>
                  <Play className="h-4 w-4 mr-2" />
                  Testar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewHistory}>
                  <History className="h-4 w-4 mr-2" />
                  Ver Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Flow Preview */}
        <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600 dark:text-blue-400 font-medium">QUANDO</span>
            <Badge variant="outline" className="font-normal">
              {trigger?.name || automation.trigger.type}
            </Badge>
            {automation.conditions.length > 0 && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="text-amber-600 dark:text-amber-400 font-medium">SE</span>
                <Badge variant="outline" className="font-normal">
                  {automation.conditions.length} condição(ões)
                </Badge>
              </>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-purple-600 dark:text-purple-400 font-medium">ENTÃO</span>
            <Badge variant="outline" className="font-normal">
              {automation.actions.length} ação(ões)
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {stats.totalRuns}
            </div>
            <div className="text-xs text-gray-500">Execuções</div>
          </div>
          <div>
            <div className={`text-lg font-semibold ${
              successRate >= 90 ? 'text-green-600' : 
              successRate >= 70 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {successRate}%
            </div>
            <div className="text-xs text-gray-500">Taxa de Sucesso</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {stats.lastRun ? new Date(stats.lastRun).toLocaleDateString('pt-BR') : '-'}
            </div>
            <div className="text-xs text-gray-500">Última Execução</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
        <Zap className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Nenhuma automação criada
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        Automações permitem executar ações automaticamente quando eventos específicos acontecem, 
        economizando seu tempo e garantindo consistência nas operações.
      </p>
      <Button onClick={onCreateFirst} size="lg">
        <Plus className="h-5 w-5 mr-2" />
        Criar Primeira Automação
      </Button>

      {/* Sugestões */}
      <div className="mt-8 w-full max-w-lg">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          💡 Ideias para começar:
        </p>
        <div className="grid gap-2 text-left">
          {[
            { trigger: 'Check-in amanhã', action: 'Enviar instruções de acesso' },
            { trigger: 'Nova reserva', action: 'Criar tarefa de preparação' },
            { trigger: 'Checkout realizado', action: 'Agendar limpeza' },
          ].map((suggestion, i) => (
            <div 
              key={i}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600 font-medium">Quando</span>
                <span className="text-gray-600 dark:text-gray-400">{suggestion.trigger}</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="text-purple-600 font-medium">Então</span>
                <span className="text-gray-600 dark:text-gray-400">{suggestion.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUTOMATIONS MANAGER
// ============================================================================

interface AutomationsManagerProps {
  onNavigateToBuilder: (automationId?: string) => void;
}

export function AutomationsManager({ onNavigateToBuilder }: AutomationsManagerProps) {
  // Hook de automações com persistência
  const {
    automations,
    isLoading,
    toggleAutomation,
    deleteAutomation,
    duplicateAutomation,
    testAutomation,
  } = useAutomations();

  // UI State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TriggerCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string }>({ open: false });

  // Filtered automations
  const filteredAutomations = useMemo(() => {
    return automations.filter(a => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !a.name.toLowerCase().includes(searchLower) &&
          !a.description?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'all' && a.category !== categoryFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'active' && !a.isActive) return false;
      if (statusFilter === 'paused' && a.isActive) return false;

      return true;
    });
  }, [automations, search, categoryFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const active = automations.filter(a => a.isActive).length;
    const paused = automations.filter(a => !a.isActive).length;
    const totalRuns = automations.reduce((sum, a) => sum + a.stats.totalRuns, 0);
    return { total: automations.length, active, paused, totalRuns };
  }, [automations]);

  // Handlers
  const handleEdit = (id: string) => {
    onNavigateToBuilder(id);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateAutomation(id);
  };

  const handleDelete = async () => {
    if (deleteDialog.id) {
      await deleteAutomation(deleteDialog.id);
      setDeleteDialog({ open: false });
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await toggleAutomation(id, active);
  };

  const handleTest = async (id: string) => {
    await testAutomation(id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ============ HEADER ============ */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Automações
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gerencie suas automações e workflows automatizados
            </p>
          </div>
          <Button onClick={() => onNavigateToBuilder()}>
            <Plus className="h-5 w-5 mr-2" />
            Nova Automação
          </Button>
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-xs text-gray-500">Ativas</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <div className="text-2xl font-bold text-amber-600">{stats.paused}</div>
              <div className="text-xs text-gray-500">Pausadas</div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRuns}</div>
              <div className="text-xs text-gray-500">Execuções Totais</div>
            </div>
          </div>
        )}
      </div>

      {/* ============ FILTERS ============ */}
      {stats.total > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar automações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category filter */}
              <Select 
                value={categoryFilter} 
                onValueChange={(v) => setCategoryFilter(v as any)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  <SelectItem value="reservas">📅 Reservas</SelectItem>
                  <SelectItem value="comunicacao">💬 Comunicação</SelectItem>
                  <SelectItem value="financeiro">💰 Financeiro</SelectItem>
                  <SelectItem value="operacional">⚙️ Operacional</SelectItem>
                  <SelectItem value="reviews">⭐ Reviews</SelectItem>
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select 
                value={statusFilter} 
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">✓ Ativas</SelectItem>
                  <SelectItem value="paused">⏸ Pausadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View mode */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============ CONTENT ============ */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
        {filteredAutomations.length === 0 ? (
          stats.total === 0 ? (
            <EmptyState onCreateFirst={() => onNavigateToBuilder()} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma automação encontrada com os filtros aplicados</p>
              <Button 
                variant="link" 
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )
        ) : (
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
              : 'space-y-3'
            }
          `}>
            {filteredAutomations.map(automation => (
              <AutomationCard
                key={automation.id}
                automation={automation}
                onEdit={() => handleEdit(automation.id)}
                onDuplicate={() => handleDuplicate(automation.id)}
                onDelete={() => setDeleteDialog({ open: true, id: automation.id })}
                onToggle={(active) => handleToggle(automation.id, active)}
                onTest={() => handleTest(automation.id)}
                onViewHistory={() => {/* TODO: Implementar modal de histórico */}}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============ DELETE DIALOG ============ */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A automação será permanentemente excluída 
              e não será mais executada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AutomationsManager;
