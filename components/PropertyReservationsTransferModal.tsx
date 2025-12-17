/**
 * RENDIZY - Property Reservations Transfer Modal
 * 
 * Modal exibido quando o usuário tenta deletar um imóvel que possui reservas ativas.
 * Permite transferir reservas para outro imóvel ou cancelá-las antes da exclusão.
 * 
 * 🎯 REGRA CRÍTICA: Uma reserva NUNCA pode ficar órfã sem imóvel atrelado!
 * 
 * @version 1.0.103.273
 * @date 2025-11-04
 */

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Calendar, ArrowRight, Trash2, X, Users, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { propertiesApi, reservationsApi } from '../utils/api';
import { toast } from 'sonner';

interface Reservation {
  id: string;
  code: string;
  propertyId: string;
  propertyName?: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  adults: number;
  children?: number;
  pricing: {
    total: number;
    currency: string;
  };
  platform?: string;
}

interface PropertyReservationsTransferModalProps {
  open: boolean;
  onClose: () => void;
  property: any; // Property que será deletada
  onAllResolved: () => void; // Callback quando todas as reservas foram resolvidas
}

export function PropertyReservationsTransferModal({ 
  open, 
  onClose, 
  property,
  onAllResolved 
}: PropertyReservationsTransferModalProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Map de transferências: reservationId -> targetPropertyId
  const [transfers, setTransfers] = useState<Record<string, string>>({});
  
  // Set de reservas marcadas para cancelamento
  const [cancellations, setCancellations] = useState<Set<string>>(new Set());
  
  // ⚡ Ref para verificar se o componente ainda está montado
  const isMountedRef = useRef(true);
  
  // ⚡ Ref para BLOQUEAR fechamento durante callback crítico
  const isExecutingCallbackRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (open && property) {
      loadReservations();
      loadAvailableProperties();
    }
    
    // Cleanup: marcar componente como desmontado
    return () => {
      // ⚡ SE estiver executando callback, NÃO marcar como desmontado ainda
      if (isExecutingCallbackRef.current) {
        console.log('⚠️ [TRANSFER] BLOQUEIO: Callback em execução, mantendo componente "montado"');
        // Não altera isMountedRef - mantém como true
      } else {
        isMountedRef.current = false;
        console.log('🧹 [TRANSFER] Componente desmontado');
      }
    };
  }, [open, property]);

  const loadReservations = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      // Buscar reservas ativas do imóvel
      const response = await reservationsApi.list({
        propertyId: property.id,
        status: ['pending', 'confirmed', 'checked_in']
      });

      if (response.success && response.data) {
        setReservations(response.data);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar reservas:', error);
      toast.error('Erro ao carregar reservas do imóvel');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProperties = async () => {
    try {
      const response = await propertiesApi.list();
      
      if (response.success && response.data) {
        // Filtrar para remover o imóvel atual e mostrar apenas ativos
        const available = response.data.filter((p: any) => 
          p.id !== property.id && 
          p.status === 'active'
        );
        setAvailableProperties(available);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar imóveis disponíveis:', error);
      toast.error('Erro ao carregar lista de imóveis');
    }
  };

  const handleTransferSelect = (reservationId: string, targetPropertyId: string) => {
    setTransfers(prev => ({
      ...prev,
      [reservationId]: targetPropertyId
    }));
    
    // Remove do set de cancelamentos se estava lá
    setCancellations(prev => {
      const newSet = new Set(prev);
      newSet.delete(reservationId);
      return newSet;
    });
  };

  const handleCancelSelect = (reservationId: string) => {
    setCancellations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
    
    // Remove do map de transferências se estava lá
    setTransfers(prev => {
      const { [reservationId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleProcessAll = async () => {
    // ⚡ Prevenir múltiplos cliques
    if (processing) {
      console.log('⚠️ [TRANSFER] Já está processando, ignorando clique duplo');
      return;
    }
    
    console.log('🎯 [TRANSFER] Iniciando processamento de reservas...');
    console.log('📊 [TRANSFER] Transfers:', transfers);
    console.log('📊 [TRANSFER] Cancellations:', Array.from(cancellations));
    
    // Validar que TODAS as reservas foram resolvidas
    const unresolvedReservations = reservations.filter(r => 
      !transfers[r.id] && !cancellations.has(r.id)
    );

    if (unresolvedReservations.length > 0) {
      console.error('❌ [TRANSFER] Reservas não resolvidas:', unresolvedReservations);
      toast.error(
        `Você precisa resolver TODAS as ${reservations.length} reservas antes de continuar`,
        {
          description: `${unresolvedReservations.length} reserva(s) ainda não foram transferidas nem canceladas`
        }
      );
      return;
    }

    setProcessing(true);

    try {
      let transferredCount = 0;
      let cancelledCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Processar transferências
      console.log('🔄 [TRANSFER] Processando transferências...');
      for (const [reservationId, targetPropertyId] of Object.entries(transfers)) {
        try {
          console.log(`  📤 Transferindo reserva ${reservationId} → imóvel ${targetPropertyId}`);
          
          const response = await reservationsApi.update(reservationId, {
            propertyId: targetPropertyId
          });
          
          console.log(`  📥 Response:`, response);
          
          if (response.success) {
            console.log(`  ✅ Reserva ${reservationId} transferida com sucesso`);
            transferredCount++;
          } else {
            console.error(`  ❌ Falha ao transferir ${reservationId}:`, response.error);
            errors.push(`Transferir ${reservationId}: ${response.error || 'erro desconhecido'}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ [TRANSFER] Erro ao transferir reserva ${reservationId}:`, error);
          errors.push(`Transferir ${reservationId}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
          errorCount++;
        }
      }

      // Processar cancelamentos
      console.log('🗑️ [TRANSFER] Processando cancelamentos...');
      for (const reservationId of cancellations) {
        try {
          console.log(`  📤 Cancelando reserva ${reservationId}`);
          
          const response = await reservationsApi.cancel(reservationId, {
            reason: `Imóvel ${property.name || property.internalName} foi deletado`
          });
          
          // ⚡ Pequeno delay após operação para dar tempo do React processar
          await new Promise(resolve => setTimeout(resolve, 100));
          
          console.log(`  📥 Response:`, response);
          
          if (response.success) {
            console.log(`  ✅ Reserva ${reservationId} cancelada com sucesso`);
            cancelledCount++;
          } else {
            console.error(`  ❌ Falha ao cancelar ${reservationId}:`, response.error);
            errors.push(`Cancelar ${reservationId}: ${response.error || 'erro desconhecido'}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ [TRANSFER] Erro ao cancelar reserva ${reservationId}:`, error);
          errors.push(`Cancelar ${reservationId}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
          errorCount++;
        }
      }

      console.log('📊 [TRANSFER] Resultado:');
      console.log(`  ✅ Transferidas: ${transferredCount}`);
      console.log(`  🗑️ Canceladas: ${cancelledCount}`);
      console.log(`  ❌ Erros: ${errorCount}`);

      if (errorCount === 0) {
        console.log('🎉 [TRANSFER] Todas as reservas resolvidas com sucesso!');
        
        // ⚡ Toast sempre, componente montado ou não
        toast.success(
          `✅ Todas as reservas foram resolvidas!`,
          {
            description: `${transferredCount} transferidas, ${cancelledCount} canceladas`
          }
        );
        
        console.log('🔄 [TRANSFER] Preparando para chamar onAllResolved()...');
        console.log('🔒 [TRANSFER] ATIVANDO BLOQUEIO de desmontagem...');
        
        // ⚡ IMPORTANTE: Liberar o botão ANTES de chamar callback
        setProcessing(false);
        
        // ⚡ CRÍTICO: BLOQUEAR desmontagem durante callback
        isExecutingCallbackRef.current = true;
        
        // ⚡ CRÍTICO: Chamar callback IMEDIATAMENTE
        console.log('🚀 [TRANSFER] Chamando onAllResolved() IMEDIATAMENTE...');
        try {
          onAllResolved();
          console.log('✅ [TRANSFER] onAllResolved() executado com sucesso');
        } catch (err) {
          console.error('❌ [TRANSFER] Erro ao executar onAllResolved():', err);
          toast.error('Erro ao processar callback');
        } finally {
          // ⚡ LIBERAR bloqueio após callback
          console.log('🔓 [TRANSFER] LIBERANDO BLOQUEIO de desmontagem');
          isExecutingCallbackRef.current = false;
        }
        
        // ⚡ Retornar aqui para não executar o finally
        return;
      } else {
        console.error('⚠️ [TRANSFER] Algumas operações falharam:', errors);
        
        if (isMountedRef.current) {
          toast.error(
            `⚠️ Algumas operações falharam`,
            {
              description: `${errorCount} erro(s). Ver console F12 para detalhes.`
            }
          );
        }
      }

    } catch (error) {
      console.error('❌ [TRANSFER] Erro ao processar reservas:', error);
      
      if (isMountedRef.current) {
        toast.error('Erro ao processar reservas');
      }
    } finally {
      console.log('🔄 [TRANSFER] Finally: setProcessing(false)');
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'checked_in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendente';
      case 'checked_in': return 'Check-in Feito';
      default: return status;
    }
  };

  if (!property) return null;

  const allResolved = reservations.length === Object.keys(transfers).length + cancellations.size;
  const resolvedCount = Object.keys(transfers).length + cancellations.size;

  // ⚡ Handler que BLOQUEIA fechamento durante processamento crítico
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Tentando fechar
      if (processing) {
        console.log('⚠️ [TRANSFER] Tentativa de fechar modal BLOQUEADA - processamento em andamento');
        toast.warning('Aguarde o processamento terminar');
        return;
      }
      
      if (isExecutingCallbackRef.current) {
        console.log('⚠️ [TRANSFER] Tentativa de fechar modal BLOQUEADA - callback em execução');
        return;
      }
    }
    
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">
                ⚠️ Imóvel possui reservas ativas
              </DialogTitle>
              <DialogDescription>
                Resolva todas as reservas antes de excluir o imóvel
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alert de Integridade Crítica */}
        <Alert variant="destructive" className="border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2">
              <strong>🎯 REGRA CRÍTICA DE INTEGRIDADE:</strong>
            </p>
            <p className="text-sm">
              Uma reserva NUNCA pode ficar órfã sem imóvel atrelado!
              Você precisa <strong>transferir</strong> ou <strong>cancelar</strong> todas as reservas.
            </p>
          </AlertDescription>
        </Alert>

        {/* Informações do Imóvel */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Imóvel que será deletado:
          </p>
          <p>
            <strong>{property.internalName || property.name}</strong>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {property.address?.city}, {property.address?.state}
          </p>
        </div>

        {/* Contador de Progresso */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">
              Progresso: <strong>{resolvedCount}/{reservations.length}</strong> reservas resolvidas
            </span>
            <Badge variant={allResolved ? "default" : "secondary"}>
              {allResolved ? '✅ Pronto para excluir' : '⏳ Aguardando'}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(resolvedCount / reservations.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Lista de Reservas */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando reservas...
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ✅ Nenhuma reserva ativa encontrada
            </div>
          ) : (
            reservations.map((reservation, index) => (
              <div 
                key={reservation.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        #{index + 1}
                      </span>
                      <Badge className={getStatusColor(reservation.status)}>
                        {getStatusLabel(reservation.status)}
                      </Badge>
                      {reservation.platform && (
                        <Badge variant="outline" className="text-xs">
                          {reservation.platform}
                        </Badge>
                      )}
                    </div>
                    <p>
                      <strong>{reservation.guestName}</strong>
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {reservation.adults} {reservation.children ? `+ ${reservation.children}` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(reservation.pricing.total, reservation.pricing.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Como resolver esta reserva?
                  </p>

                  {/* Opção 1: Transferir */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={transfers[reservation.id] || ''}
                        onValueChange={(value) => handleTransferSelect(reservation.id, value)}
                      >
                        <SelectTrigger className={
                          transfers[reservation.id] 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : ''
                        }>
                          <SelectValue placeholder="Transferir para outro imóvel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map((prop) => (
                            <SelectItem key={prop.id} value={prop.id}>
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3" />
                                {prop.name || prop.internalName}
                                <span className="text-xs text-gray-500">
                                  ({prop.address?.city})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {transfers[reservation.id] && (
                      <Badge variant="default" className="bg-green-600">
                        ✅ Transferir
                      </Badge>
                    )}
                  </div>

                  {/* Opção 2: Cancelar */}
                  <Button
                    variant={cancellations.has(reservation.id) ? "destructive" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleCancelSelect(reservation.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    {cancellations.has(reservation.id) 
                      ? '✅ Marcada para cancelamento' 
                      : 'Cancelar esta reserva'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={processing}
          >
            <X className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <Button
            variant="default"
            onClick={handleProcessAll}
            disabled={!allResolved || processing || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {processing ? (
              <>Processando...</>
            ) : (
              <>
                ✅ Resolver Todas ({resolvedCount}/{reservations.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
