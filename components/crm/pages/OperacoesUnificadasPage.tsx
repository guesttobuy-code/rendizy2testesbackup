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
  Square,
  CheckSquare,
  Phone,
  MapPin,
  Copy,
  User,
  Users,
  MessageCircle,
  Send,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { reservationsApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

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

interface OperationComment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface OperationCardProps {
  operation: OperationalTask;
  onMarkComplete: (id: string) => void;
  isCompleting?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onSaveComment?: (operationId: string, comment: string) => void;
}

const OperationCard: React.FC<OperationCardProps> = ({ 
  operation, 
  onMarkComplete, 
  isCompleting,
  isSelected = false,
  onSelect,
  onSaveComment,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  
  const isUrgent = operation.status === 'pending' && operation.metadata?.hasCheckinToday;
  
  // Determine type from triggered_by_event or template
  const type = operation.triggered_by_event?.includes('checkin') ? 'checkin' 
    : operation.triggered_by_event?.includes('checkout') ? 'checkout'
    : operation.title?.toLowerCase().includes('limpeza') ? 'cleaning'
    : operation.title?.toLowerCase().includes('manuten') ? 'maintenance'
    : 'checkin';

  // Extract property and guest info from metadata or operation fields
  const propertyName = operation.metadata?.property_name || operation.property_id?.substring(0, 8) || 'Imóvel';
  const propertyCode = operation.metadata?.property_code || '';
  const propertyAddress = operation.metadata?.property_address || '';
  const guestName = operation.metadata?.guest_name || '';
  const guestPhone = operation.metadata?.guest_phone || '';
  const guestCount = operation.metadata?.guest_count || 0;

  // Get comments from metadata
  const comments: OperationComment[] = operation.metadata?.comments || [];
  const hasComments = comments.length > 0;

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    toast.success('Telefone copiado!');
  };

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleSaveComment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newComment.trim()) return;
    
    setIsSavingComment(true);
    try {
      // TODO: Integrar com API real
      onSaveComment?.(operation.id, newComment.trim());
      toast.success('Comentário salvo!');
      setNewComment('');
    } catch (error) {
      toast.error('Erro ao salvar comentário');
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative',
        expanded && 'ring-2 ring-primary',
        isUrgent && 'ring-2 ring-red-400 bg-red-50/30',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50/50',
        hasComments && !isUrgent && !isSelected && 'ring-2 ring-amber-400'
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

      {/* Comments Badge - Show when has comments and not urgent */}
      {hasComments && !isUrgent && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-amber-500 text-white border-amber-600 shadow-lg flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {comments.length} nota{comments.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Selection Checkbox */}
            <button
              className="flex-shrink-0 mt-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(operation.id);
              }}
            >
              {isSelected ? (
                <CheckSquare className="h-5 w-5 text-blue-600" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground hover:text-blue-600" />
              )}
            </button>

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
                <h3 className="font-semibold truncate">{propertyName}</h3>
                {propertyCode && (
                  <span className="text-xs text-muted-foreground">{propertyCode}</span>
                )}
                {isUrgent && (
                  <span className="text-red-600 text-xs font-medium animate-pulse">⚠️ URGENTE</span>
                )}
                {hasComments && (
                  <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {comments.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {operation.scheduled_time || '09:00'}
                </span>
                {guestName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {guestName}
                  </span>
                )}
                {guestCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {guestCount} hóspedes
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

        {/* Comments Preview (Always visible if has comments) */}
        {hasComments && !expanded && (
          <div className="mt-3 pt-3 border-t">
            <div className="bg-amber-50 rounded-lg p-2.5 text-sm border border-amber-200">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-800 line-clamp-2">
                    {comments[comments.length - 1]?.text}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {comments[comments.length - 1]?.author} • {comments.length > 1 ? `+${comments.length - 1} nota(s)` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Property Address */}
            {propertyAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span>{propertyAddress}</span>
              </div>
            )}

            {/* Guest Contact */}
            {guestPhone && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{guestPhone}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={(e) => handleCopyPhone(guestPhone, e)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={(e) => handleWhatsApp(guestPhone, e)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            )}

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
                    <AvatarFallback>
                      {operation.metadata?.assignee_name?.substring(0, 2)?.toUpperCase() || 'AT'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {operation.metadata?.assignee_name || 'Responsável atribuído'}
                    </p>
                    {operation.metadata?.assignee_phone && (
                      <p className="text-xs text-muted-foreground">{operation.metadata.assignee_phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {operation.metadata?.assignee_phone && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`tel:${operation.metadata?.assignee_phone}`, '_blank');
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => handleWhatsApp(operation.metadata?.assignee_phone || '', e)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Mensagem
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* All Comments (when expanded) */}
            {hasComments && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Notas da equipe ({comments.length})
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments.map((comment, idx) => (
                    <div 
                      key={comment.id || idx} 
                      className="bg-amber-50 rounded-lg p-2.5 text-sm border border-amber-200"
                    >
                      <p className="text-amber-800">{comment.text}</p>
                      <p className="text-xs text-amber-600 mt-1">
                        {comment.author} • {comment.createdAt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Input Field (Always visible when expanded) */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Adicionar nota
              </p>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite uma nota para a equipe..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="min-h-[60px] resize-none text-sm"
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveComment}
                  disabled={!newComment.trim() || isSavingComment}
                  className="gap-2"
                >
                  {isSavingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            {operation.status === 'pending' && (
              <div className="flex items-center gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkComplete(operation.id);
                  }}
                  disabled={isCompleting}
                >
                  {isCompleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Marcar como Concluído
                </Button>
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

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

  // Selection handlers
  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredOperations.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all filtered operations
      setSelectedIds(new Set(filteredOperations.map(op => op.id)));
    }
  };

  const allSelected = filteredOperations.length > 0 && selectedIds.size === filteredOperations.length;

  // Comment handler - salva no campo internalComments da reserva
  const handleSaveComment = async (operationId: string, comment: string) => {
    // O operationId tem formato: reservationId-checkin ou reservationId-checkout
    // Extrair o ID real da reserva
    const reservationId = operationId.replace(/-checkin$|-checkout$/, '');
    
    console.log(`📝 Salvando comentário para reserva ${reservationId}:`, comment);
    
    try {
      // Buscar a reserva atual para pegar os comentários existentes
      const currentReservation = await reservationsApi.get(reservationId);
      
      if (!currentReservation.success || !currentReservation.data) {
        throw new Error('Reserva não encontrada');
      }
      
      // Montar o novo comentário com timestamp e autor
      const now = new Date();
      const timestamp = format(now, "dd/MM/yyyy HH:mm", { locale: ptBR });
      const newCommentEntry = `[${timestamp}] ${comment}`;
      
      // Concatenar com comentários existentes (separados por nova linha)
      const existingComments = currentReservation.data.internalComments || '';
      const updatedComments = existingComments 
        ? `${existingComments}\n${newCommentEntry}`
        : newCommentEntry;
      
      // Salvar na reserva
      const response = await reservationsApi.update(reservationId, {
        internalComments: updatedComments
      });
      
      if (response.success) {
        toast.success('Nota salva com sucesso!');
        // Invalidar cache para forçar refetch
        queryClient.invalidateQueries({ queryKey: ['crmTasks'] });
      } else {
        throw new Error(response.error || 'Erro ao salvar nota');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar comentário:', error);
      toast.error('Erro ao salvar nota. Tente novamente.');
    }
  };

  const isLoading = loadingCheckins || loadingCheckouts || loadingCleanings || loadingMaintenances;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header compacto */}
      <div className="flex-shrink-0 bg-background border-b px-6 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Título + Navegação de Data */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold">Operações do Dia</h1>
              <p className="text-xs text-muted-foreground">
                Gerencie check-ins, check-outs, limpezas e manutenções
              </p>
            </div>
            
            <Separator orientation="vertical" className="h-8" />
            
            {/* Date Navigation inline */}
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedDate(d => subDays(d, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-1.5 bg-muted rounded-md text-sm">
                <Calendar className="h-3.5 w-3.5 inline-block mr-1.5" />
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </div>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedDate(d => addDays(d, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8"
                onClick={() => setSelectedDate(new Date())}
              >
                Hoje
              </Button>
            </div>
          </div>

          {/* Search + Filter + Realtime */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar operação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <Wifi className="h-3.5 w-3.5" />
              <span>Tempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards compactos */}
      <div className="flex-shrink-0 px-6 py-2 bg-muted/30 border-b">
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-gray-100 rounded-md">
              <Calendar className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{counts.all}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-green-100 rounded-md">
              <LogIn className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{counts.checkin}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-orange-100 rounded-md">
              <LogOut className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{counts.checkout}</p>
              <p className="text-xs text-muted-foreground">Check-outs</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{counts.cleaning}</p>
              <p className="text-xs text-muted-foreground">Limpezas</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-100 rounded-md">
              <Wrench className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{counts.maintenance}</p>
              <p className="text-xs text-muted-foreground">Manutenções</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 min-h-0 flex flex-col px-6 py-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OperationType)} className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <TabsList>
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

            {/* Select All Button */}
            {filteredOperations.length > 0 && (
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="gap-2"
                >
                  {allSelected ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Desmarcar Todos
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Selecionar Todos
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
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
                    isSelected={selectedIds.has(operation.id)}
                    onSelect={handleSelect}
                    onSaveComment={handleSaveComment}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default OperacoesUnificadasPage;
