/**
 * Operations View - Tela de Operações
 * 
 * Visualização de operações do dia:
 * - Check-ins
 * - Check-outs
 * - Limpezas
 * - Manutenções
 * 
 * Com timeline, cards expandíveis e status
 */

import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  MapPin,
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
  Users,
  ExternalLink,
  Copy,
  RefreshCw,
  Square,
  CheckSquare,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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

// ============================================================================
// MOCK DATA
// ============================================================================

interface Operation {
  id: string;
  type: 'checkin' | 'checkout' | 'cleaning' | 'maintenance';
  propertyName: string;
  propertyCode: string;
  propertyAddress: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  time: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  assignee?: { name: string; initials: string; phone: string };
  notes?: string;
  reservationId: string;
  platform: 'airbnb' | 'booking' | 'stays' | 'direct';
  isCheckinToday?: boolean; // NEW: Flag for check-in today urgency
}

const MOCK_OPERATIONS: Operation[] = [
  {
    id: '1',
    type: 'checkout',
    propertyName: 'Chalé Aconchego',
    propertyCode: 'CHC-001',
    propertyAddress: 'Rua das Hortênsias, 123 - Centro, Gramado',
    guestName: 'João Silva',
    guestPhone: '+55 11 99999-1234',
    guestCount: 4,
    time: '10:00',
    status: 'completed',
    assignee: { name: 'Maria Limpeza', initials: 'ML', phone: '+55 54 99999-0001' },
    reservationId: 'RES-001',
    platform: 'airbnb',
    isCheckinToday: true, // Has check-in today!
  },
  {
    id: '2',
    type: 'cleaning',
    propertyName: 'Chalé Aconchego',
    propertyCode: 'CHC-001',
    propertyAddress: 'Rua das Hortênsias, 123 - Centro, Gramado',
    guestName: '-',
    guestPhone: '-',
    guestCount: 0,
    time: '11:00',
    status: 'in_progress',
    assignee: { name: 'Maria Limpeza', initials: 'ML', phone: '+55 54 99999-0001' },
    notes: 'Limpeza completa + troca de roupa de cama',
    reservationId: 'RES-001',
    platform: 'airbnb',
    isCheckinToday: true, // Urgent: Has check-in today!
  },
  {
    id: '3',
    type: 'checkin',
    propertyName: 'Chalé Aconchego',
    propertyCode: 'CHC-001',
    propertyAddress: 'Rua das Hortênsias, 123 - Centro, Gramado',
    guestName: 'Ana Oliveira',
    guestPhone: '+55 21 98888-5678',
    guestCount: 2,
    time: '15:00',
    status: 'pending',
    reservationId: 'RES-002',
    platform: 'booking',
  },
  {
    id: '4',
    type: 'checkout',
    propertyName: 'Vista Serrana',
    propertyCode: 'VTS-002',
    propertyAddress: 'Av. Borges de Medeiros, 456 - Centro, Gramado',
    guestName: 'Carlos Mendes',
    guestPhone: '+55 51 97777-4321',
    guestCount: 6,
    time: '11:00',
    status: 'in_progress',
    reservationId: 'RES-003',
    platform: 'stays',
  },
  {
    id: '5',
    type: 'maintenance',
    propertyName: 'Vista Serrana',
    propertyCode: 'VTS-002',
    propertyAddress: 'Av. Borges de Medeiros, 456 - Centro, Gramado',
    guestName: '-',
    guestPhone: '-',
    guestCount: 0,
    time: '13:00',
    status: 'pending',
    assignee: { name: 'Pedro Técnico', initials: 'PT', phone: '+55 54 99999-0002' },
    notes: 'Trocar lâmpada do banheiro + verificar aquecedor',
    reservationId: '-',
    platform: 'direct',
  },
  {
    id: '6',
    type: 'checkin',
    propertyName: 'Refúgio do Lago',
    propertyCode: 'RDL-003',
    propertyAddress: 'Estrada do Lago Negro, 789 - Lago Negro, Gramado',
    guestName: 'Família Pereira',
    guestPhone: '+55 41 96666-8765',
    guestCount: 5,
    time: '16:00',
    status: 'pending',
    reservationId: 'RES-004',
    platform: 'airbnb',
  },
  {
    id: '7',
    type: 'checkout',
    propertyName: 'Cabana Neve',
    propertyCode: 'CNV-004',
    propertyAddress: 'Rua Coberta, 321 - Centro, Gramado',
    guestName: 'Roberto Santos',
    guestPhone: '+55 31 95555-3210',
    guestCount: 3,
    time: '10:00',
    status: 'delayed',
    notes: 'Hóspede pediu extensão até 12h',
    reservationId: 'RES-005',
    platform: 'direct',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const getTypeIcon = (type: Operation['type']) => {
  switch (type) {
    case 'checkin':
      return <LogIn className="h-4 w-4" />;
    case 'checkout':
      return <LogOut className="h-4 w-4" />;
    case 'cleaning':
      return <Sparkles className="h-4 w-4" />;
    case 'maintenance':
      return <Wrench className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: Operation['type']) => {
  switch (type) {
    case 'checkin':
      return 'Check-in';
    case 'checkout':
      return 'Check-out';
    case 'cleaning':
      return 'Limpeza';
    case 'maintenance':
      return 'Manutenção';
  }
};

const getTypeColor = (type: Operation['type']) => {
  switch (type) {
    case 'checkin':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'checkout':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'cleaning':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'maintenance':
      return 'bg-purple-100 text-purple-700 border-purple-200';
  }
};

const getStatusBadge = (status: Operation['status']) => {
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
  }
};

const getPlatformIcon = (platform: Operation['platform']) => {
  switch (platform) {
    case 'airbnb':
      return '🏠';
    case 'booking':
      return '🅱️';
    case 'stays':
      return '🏨';
    case 'direct':
      return '📱';
  }
};

// ============================================================================
// OPERATION CARD COMPONENT
// ============================================================================

interface OperationCardProps {
  operation: Operation;
  expanded?: boolean;
  onExpand?: () => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onMarkComplete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const OperationCard: React.FC<OperationCardProps> = ({
  operation,
  expanded = false,
  onExpand,
  isSelected = false,
  onSelect,
  onMarkComplete,
  onEdit,
}) => {
  const isUrgent = operation.isCheckinToday && operation.status !== 'completed';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md relative',
        expanded && 'ring-2 ring-primary',
        isUrgent && 'ring-2 ring-red-400 bg-red-50/30',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50/50'
      )}
      onClick={onExpand}
    >
      {/* Urgent Badge - Check-in Today Alert */}
      {isUrgent && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge 
            className="bg-red-500 text-white border-red-600 animate-pulse shadow-lg flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Check-in Hoje!
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
              getTypeColor(operation.type),
              isUrgent && 'border-red-300 bg-red-100'
            )}>
              {getTypeIcon(operation.type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{operation.propertyName}</h3>
                <span className="text-xs text-muted-foreground">{operation.propertyCode}</span>
                <span>{getPlatformIcon(operation.platform)}</span>
                {isUrgent && (
                  <span className="text-red-600 text-xs font-medium animate-pulse">⚠️ URGENTE</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {operation.time}
                </span>
                {operation.guestName !== '-' && (
                  <>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {operation.guestName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {operation.guestCount} hóspedes
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2">
            {getStatusBadge(operation.status)}
            
            {/* External Complete Button - Always visible */}
            {operation.status !== 'completed' && (
              <Button
                size="sm"
                variant={isUrgent ? 'default' : 'outline'}
                className={cn(
                  'gap-1.5',
                  isUrgent && 'bg-green-600 hover:bg-green-700 text-white'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkComplete?.(operation.id);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Concluído
              </Button>
            )}

            {/* Edit Button for Cleaning */}
            {operation.type === 'cleaning' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(operation.id);
                }}
              >
                <Edit className="h-4 w-4" />
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
                <DropdownMenuItem>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar para hóspede
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
            {/* Address */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>{operation.propertyAddress}</span>
            </div>

            {/* Guest Contact */}
            {operation.guestPhone !== '-' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{operation.guestPhone}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            )}

            {/* Assignee */}
            {operation.assignee && (
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{operation.assignee.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{operation.assignee.name}</p>
                    <p className="text-xs text-muted-foreground">{operation.assignee.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mensagem
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {operation.notes && (
              <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-yellow-800 mb-1">Observações:</p>
                <p className="text-yellow-700">{operation.notes}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-2">
              {operation.status === 'pending' && operation.type === 'checkin' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Concluído
                </Button>
              )}
              {operation.status === 'pending' && operation.type !== 'checkin' && (
                <Button size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Iniciar
                </Button>
              )}
              {operation.status === 'in_progress' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              )}
              {operation.type === 'cleaning' && (
                <Button size="sm" variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(operation.id);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button size="sm" variant="outline">
                Adicionar nota
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// TIMELINE VIEW COMPONENT
// ============================================================================

interface TimelineViewProps {
  operations: Operation[];
  selectedIds: string[];
  onSelectId: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onEdit: (id: string) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ 
  operations, 
  selectedIds,
  onSelectId,
  onMarkComplete,
  onEdit
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by time slots
  const timeSlots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  return (
    <div className="relative">
      {/* Timeline */}
      <div className="absolute left-[60px] top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {timeSlots.map((time) => {
          const slotOperations = operations.filter((op) => op.time === time);
          if (slotOperations.length === 0) return null;

          return (
            <div key={time} className="flex gap-4">
              {/* Time Label */}
              <div className="w-[60px] flex-shrink-0 pt-4">
                <span className="text-sm font-medium">{time}</span>
              </div>

              {/* Operations */}
              <div className="flex-1 space-y-2">
                {slotOperations.map((operation) => (
                  <OperationCard
                    key={operation.id}
                    operation={operation}
                    expanded={expandedId === operation.id}
                    onExpand={() =>
                      setExpandedId(expandedId === operation.id ? null : operation.id)
                    }
                    isSelected={selectedIds.includes(operation.id)}
                    onSelect={onSelectId}
                    onMarkComplete={onMarkComplete}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OperationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Toggle selection
  const handleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  // Select all visible
  const handleSelectAll = () => {
    const visibleIds = getTabOperations().map(op => op.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  // Mark complete handler
  const handleMarkComplete = (id: string) => {
    console.log('Mark complete:', id);
    // In real implementation, call API
  };

  // Mark selected as complete
  const handleMarkSelectedComplete = () => {
    console.log('Mark complete:', selectedIds);
    setSelectedIds([]);
    // In real implementation, call API
  };

  // Edit handler
  const handleEdit = (id: string) => {
    console.log('Edit:', id);
    // In real implementation, open edit modal
  };

  const filterOperations = (type?: Operation['type']) => {
    if (!type || activeTab === 'all') return MOCK_OPERATIONS;
    return MOCK_OPERATIONS.filter((op) => op.type === type);
  };

  const getTabOperations = () => {
    switch (activeTab) {
      case 'checkin':
        return filterOperations('checkin');
      case 'checkout':
        return filterOperations('checkout');
      case 'cleaning':
        return filterOperations('cleaning');
      case 'maintenance':
        return filterOperations('maintenance');
      default:
        return MOCK_OPERATIONS;
    }
  };

  const countByType = (type: Operation['type']) =>
    MOCK_OPERATIONS.filter((op) => op.type === type).length;

  // Count operations with check-in today urgency
  const countCheckinToday = () =>
    MOCK_OPERATIONS.filter((op) => op.isCheckinToday && op.status !== 'completed').length;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const checkinTodayCount = countCheckinToday();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Urgent Alert Banner - Check-ins Today */}
      {checkinTodayCount > 0 && (
        <div className="flex-shrink-0 bg-red-500 text-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <span className="font-medium">
                ⚠️ ATENÇÃO: {checkinTodayCount} {checkinTodayCount === 1 ? 'operação tem' : 'operações têm'} check-in para hoje!
              </span>
            </div>
            <Button variant="secondary" size="sm" className="bg-white text-red-600 hover:bg-red-50">
              Ver urgentes
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Operações do Dia</h1>
            <p className="text-muted-foreground">
              Gerencie check-ins, check-outs, limpezas e manutenções
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mr-4 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                </span>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleMarkSelectedComplete}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Concluído
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedIds([])}
                >
                  Limpar
                </Button>
              </div>
            )}
            <Button 
              variant="outline"
              onClick={handleSelectAll}
            >
              {selectedIds.length === getTabOperations().length ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Desmarcar Todos
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Selecionar Todos
                </>
              )}
            </Button>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <Calendar className="h-4 w-4" />
              <span className="font-medium capitalize">{formatDate(selectedDate)}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setSelectedDate(new Date())}>
              Hoje
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-10 w-[200px]" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="delayed">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              Todos
              <Badge variant="secondary">{MOCK_OPERATIONS.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="checkout" className="gap-2">
              <LogOut className="h-4 w-4" />
              Check-outs
              <Badge variant="secondary">{countByType('checkout')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cleaning" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Limpezas
              <Badge variant="secondary">{countByType('cleaning')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="checkin" className="gap-2">
              <LogIn className="h-4 w-4" />
              Check-ins
              <Badge variant="secondary">{countByType('checkin')}</Badge>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="h-4 w-4" />
              Manutenções
              <Badge variant="secondary">{countByType('maintenance')}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Check-outs</p>
                  <p className="text-2xl font-bold">{countByType('checkout')}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Limpezas</p>
                  <p className="text-2xl font-bold">{countByType('cleaning')}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(checkinTodayCount > 0 && 'ring-2 ring-red-400 bg-red-50/50')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Check-ins</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{countByType('checkin')}</p>
                    {checkinTodayCount > 0 && (
                      <Badge className="bg-red-500 text-white animate-pulse">
                        {checkinTodayCount} hoje!
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Manutenções</p>
                  <p className="text-2xl font-bold">{countByType('maintenance')}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <TimelineView 
          operations={getTabOperations()} 
          selectedIds={selectedIds}
          onSelectId={handleSelectId}
          onMarkComplete={handleMarkComplete}
          onEdit={handleEdit}
        />
      </ScrollArea>
    </div>
  );
};

export default OperationsView;
