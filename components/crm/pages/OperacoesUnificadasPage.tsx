/**
 * Página de Operações Unificadas
 * 
 * Mostra Check-ins, Check-outs, Limpezas e Manutenções em uma única tela
 * Design baseado no mock OperationsView
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  Search,
  MoreHorizontal,
  LogIn,
  LogOut,
  Sparkles,
  Wrench,
  Building2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Wifi,
  Loader2,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  useCheckIns, 
  useCheckOuts, 
  useCleanings, 
  useMaintenances,
  useMarkOperationalTaskCompleted,
  useOperationalTasksRealtime 
} from '@/hooks/useCRMTasks';
import { OperationalTask } from '@/utils/services/crmTasksService';

// ============================================================================
// TYPES
// ============================================================================

type OperationType = 'checkin' | 'checkout' | 'cleaning' | 'maintenance' | 'all';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'checkin': return <LogIn className="h-4 w-4" />;
    case 'checkout': return <LogOut className="h-4 w-4" />;
    case 'cleaning': return <Sparkles className="h-4 w-4" />;
    case 'maintenance': return <Wrench className="h-4 w-4" />;
    default: return <Circle className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'checkin': return 'Check-in';
    case 'checkout': return 'Check-out';
    case 'cleaning': return 'Limpeza';
    case 'maintenance': return 'Manutenção';
    default: return type;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'checkin': return 'bg-green-100 text-green-700 border-green-200';
    case 'checkout': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'cleaning': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'maintenance': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-gray-50"><Circle className="h-3 w-3 mr-1" />Pendente</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Em andamento</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
    case 'delayed':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Atrasado</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-gray-100 text-gray-500">Cancelado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// ============================================================================
// OPERATION CARD COMPONENT
// ============================================================================

interface OperationCardProps {
  operation: OperationalTask;
  onMarkComplete: (id: string) => void;
  isCompleting?: boolean;
}

const OperationCard: React.FC<OperationCardProps> = ({ operation, onMarkComplete, isCompleting }) => {
  const [expanded, setExpanded] = useState(false);
  const isUrgent = operation.status === 'pending' && operation.metadata?.hasCheckinToday;
  
  // Determine type from triggered_by_event or template
  const type = operation.triggered_by_event?.includes('checkin') ? 'checkin' 
    : operation.triggered_by_event?.includes('checkout') ? 'checkout'
    : operation.title?.toLowerCase().includes('limpeza') ? 'cleaning'
    : operation.title?.toLowerCase().includes('manuten') ? 'maintenance'
    : 'checkin';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative',
        expanded && 'ring-2 ring-primary',
        isUrgent && 'ring-2 ring-red-400 bg-red-50/30'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Urgent Badge */}
      {isUrgent && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-red-500 text-white border-red-600 animate-pulse shadow-lg flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Check-in Hoje!
          </Badge>
        </div>
      )}

      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Type Badge */}
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg border',
              getTypeColor(type),
              isUrgent && 'border-red-300 bg-red-100'
            )}>
              {getTypeIcon(type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{operation.title}</h3>
                {isUrgent && (
                  <span className="text-red-600 text-xs font-medium animate-pulse">⚠️ URGENTE</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {operation.scheduled_time || '09:00'}
                </span>
                {operation.property_id && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Imóvel
                  </span>
                )}
                {operation.reservation_id && (
                  <Badge variant="outline" className="text-xs">
                    Reserva #{operation.reservation_id.substring(0, 8)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2">
            {getStatusBadge(operation.status)}
            
            {/* Complete Button */}
            {operation.status !== 'completed' && (
              <Button
                size="sm"
                variant={isUrgent ? 'default' : 'outline'}
                className={cn(
                  'gap-1.5',
                  isUrgent && 'bg-green-600 hover:bg-green-700 text-white'
                )}
                disabled={isCompleting}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkComplete(operation.id);
                }}
              >
                {isCompleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Concluído
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enviar mensagem
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver reserva
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Building2 className="h-4 w-4 mr-2" />
                  Ver imóvel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Description */}
            {operation.description && (
              <div className="text-sm text-muted-foreground">
                {operation.description}
              </div>
            )}

            {/* Instructions */}
            {operation.instructions && (
              <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-800 mb-1">Instruções:</p>
                <p className="text-yellow-700">{operation.instructions}</p>
              </div>
            )}

            {/* Assignee */}
            {operation.assignee_id && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>AT</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">Responsável atribuído</p>
                    <p className="text-xs text-muted-foreground">ID: {operation.assignee_id}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensagem
                </Button>
              </div>
            )}

            {/* Metadata */}
            {operation.metadata && (
              <div className="text-xs text-muted-foreground">
                <pre className="bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(operation.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OperacoesUnificadasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<OperationType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Fetch all operation types
  const { data: checkins = [], isLoading: loadingCheckins } = useCheckIns(dateStr);
  const { data: checkouts = [], isLoading: loadingCheckouts } = useCheckOuts(dateStr);
  const { data: cleanings = [], isLoading: loadingCleanings } = useCleanings({ date: dateStr });
  const { data: maintenances = [], isLoading: loadingMaintenances } = useMaintenances({});
  
  // Realtime subscription
  useOperationalTasksRealtime(dateStr);
  
  const markCompleted = useMarkOperationalTaskCompleted();

  // Combine all operations
  const allOperations = useMemo(() => {
    const ops: (OperationalTask & { _type: string })[] = [];
    checkins.forEach((op: OperationalTask) => ops.push({ ...op, _type: 'checkin' }));
    checkouts.forEach((op: OperationalTask) => ops.push({ ...op, _type: 'checkout' }));
    cleanings.forEach((op: OperationalTask) => ops.push({ ...op, _type: 'cleaning' }));
    maintenances.forEach((op: OperationalTask) => ops.push({ ...op, _type: 'maintenance' }));
    return ops;
  }, [checkins, checkouts, cleanings, maintenances]);

  // Filter operations
  const filteredOperations = useMemo(() => {
    let ops = allOperations;
    
    // Filter by type
    if (activeTab !== 'all') {
      ops = ops.filter(op => op._type === activeTab);
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      ops = ops.filter(op => op.status === statusFilter);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      ops = ops.filter(op => 
        op.title.toLowerCase().includes(query) ||
        op.description?.toLowerCase().includes(query)
      );
    }
    
    // Sort by time
    return ops.sort((a, b) => {
      const timeA = a.scheduled_time || '00:00';
      const timeB = b.scheduled_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [allOperations, activeTab, statusFilter, searchQuery]);

  // Calculate counts
  const counts = useMemo(() => ({
    all: allOperations.length,
    checkin: checkins.length,
    checkout: checkouts.length,
    cleaning: cleanings.length,
    maintenance: maintenances.length,
    pending: allOperations.filter(op => op.status === 'pending').length,
    completed: allOperations.filter(op => op.status === 'completed').length,
  }), [allOperations, checkins, checkouts, cleanings, maintenances]);

  const handleMarkComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await markCompleted.mutateAsync({ id });
      toast.success('Operação concluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao concluir operação');
      console.error(error);
    } finally {
      setCompletingId(null);
    }
  };

  const isLoading = loadingCheckins || loadingCheckouts || loadingCleanings || loadingMaintenances;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Operações do Dia</h1>
            <p className="text-muted-foreground">
              Gerencie check-ins, check-outs, limpezas e manutenções
            </p>
          </div>
          
          {/* Realtime indicator */}
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Wifi className="h-4 w-4" />
            <span>Tempo real</span>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate(d => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-md min-w-[200px] text-center">
              <Calendar className="h-4 w-4 inline-block mr-2" />
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Hoje
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar operação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex-shrink-0 px-6 py-4 bg-muted/30 border-b">
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.all}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <LogIn className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.checkin}</p>
                <p className="text-sm text-muted-foreground">Check-ins</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <LogOut className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.checkout}</p>
                <p className="text-sm text-muted-foreground">Check-outs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.cleaning}</p>
                <p className="text-sm text-muted-foreground">Limpezas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wrench className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.maintenance}</p>
                <p className="text-sm text-muted-foreground">Manutenções</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OperationType)} className="flex-1 flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="gap-2">
              <Calendar className="h-4 w-4" />
              Todas ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="checkin" className="gap-2">
              <LogIn className="h-4 w-4" />
              Check-ins ({counts.checkin})
            </TabsTrigger>
            <TabsTrigger value="checkout" className="gap-2">
              <LogOut className="h-4 w-4" />
              Check-outs ({counts.checkout})
            </TabsTrigger>
            <TabsTrigger value="cleaning" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Limpezas ({counts.cleaning})
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="h-4 w-4" />
              Manutenções ({counts.maintenance})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-64" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredOperations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma operação encontrada</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' 
                      ? 'Não há operações agendadas para esta data.'
                      : `Não há ${getTypeLabel(activeTab).toLowerCase()}s agendados para esta data.`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 pb-6">
                {filteredOperations.map(operation => (
                  <OperationCard
                    key={operation.id}
                    operation={operation}
                    onMarkComplete={handleMarkComplete}
                    isCompleting={completingId === operation.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

export default OperacoesUnificadasPage;
