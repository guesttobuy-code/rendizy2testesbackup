/**
 * RENDIZY - Property Delete Modal
 * 
 * Modal de confirmação de exclusão de propriedade/anúncio
 * Com avisos de impacto e opções de soft/hard delete
 * 
 * 🎯 REGRA CRÍTICA v1.0.103.273: 
 * - Se houver reservas ativas, abre PropertyReservationsTransferModal
 * - Uma reserva NUNCA pode ficar órfã sem imóvel atrelado!
 * 
 * @version 1.0.103.273
 * @date 2025-11-04
 */

import { AlertTriangle, Trash2, X, Calendar, MessageSquare, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useState, useEffect } from 'react';
import { reservationsApi } from '../utils/api';
import { PropertyReservationsTransferModal } from './PropertyReservationsTransferModal';

interface PropertyDeleteModalProps {
  open: boolean;
  onClose: () => void;
  property: any; // TODO: tipar corretamente
  onConfirm: (softDelete: boolean) => void;
  isDeleting?: boolean;
}

export function PropertyDeleteModal({ 
  open, 
  onClose, 
  property, 
  onConfirm,
  isDeleting = false 
}: PropertyDeleteModalProps) {
  const [softDelete, setSoftDelete] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [activeReservations, setActiveReservations] = useState<any[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // 🎯 v1.0.103.273 - Carregar reservas ativas ao abrir modal
  useEffect(() => {
    if (open && property) {
      loadActiveReservations();
    }
  }, [open, property]);

  const loadActiveReservations = async () => {
    if (!property) return;
    
    setLoadingReservations(true);
    try {
      const response = await reservationsApi.list({
        propertyId: property.id,
        status: ['pending', 'confirmed', 'checked_in']
      });

      if (response.success && response.data) {
        setActiveReservations(response.data);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar reservas:', error);
      setActiveReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  };

  if (!property) return null;

  // Dados de impacto baseados nas reservas carregadas
  const impact = {
    activeReservations: activeReservations.length,
    futureReservations: activeReservations.filter(r => 
      new Date(r.checkIn) > new Date()
    ).length,
    linkedMessages: 0, // TODO: buscar do backend quando implementado
    totalRevenue: activeReservations.reduce((sum, r) => sum + (r.pricing?.total || 0), 0)
  };

  const hasActiveImpact = impact.activeReservations > 0;

  const handleConfirm = () => {
    // 🎯 v1.0.103.273 - REGRA CRÍTICA: Verificar reservas ativas
    if (!softDelete && hasActiveImpact) {
      // Se tem reservas e é hard delete, abrir modal de transferência
      setShowTransferModal(true);
      return;
    }
    
    if (!confirmed && !softDelete) {
      return; // Exige confirmação para hard delete
    }
    
    onConfirm(softDelete);
  };

  const handleAllReservationsResolved = () => {
    try {
      console.log('🎯 [DELETE MODAL] Todas as reservas foram resolvidas!');
      console.log('🔄 [DELETE MODAL] Fechando modal de transferência...');
      console.log('📊 [DELETE MODAL] Estado atual:', {
        showTransferModal,
        hasActiveImpact,
        property: property?.id
      });
      
      // Fechar modal de transferência
      setShowTransferModal(false);
      console.log('✅ [DELETE MODAL] setShowTransferModal(false) executado');
      
      // ⚡ IMPORTANTE: Aguardar o React processar o fechamento do modal
      // antes de executar a exclusão (evita erro de removeChild)
      // Reduzido para 300ms - tempo suficiente para React processar
      console.log('⏳ [DELETE MODAL] Aguardando 300ms para React processar fechamento...');
      
      setTimeout(() => {
        try {
          console.log('🗑️ [DELETE MODAL] Timeout concluído, chamando onConfirm(false)...');
          console.log('📊 [DELETE MODAL] onConfirm é uma função?', typeof onConfirm === 'function');
          
          // Fechar o modal principal ANTES de executar a exclusão
          console.log('🔒 [DELETE MODAL] Fechando modal principal...');
          onClose();
          
          // Pequeno delay para garantir que o modal fechou
          setTimeout(() => {
            console.log('🗑️ [DELETE MODAL] Executando exclusão permanente...');
            
            // Executar a exclusão permanente
            onConfirm(false); // Hard delete (softDelete = false)
            
            console.log('✅ [DELETE MODAL] onConfirm(false) executado com sucesso');
          }, 100);
          
        } catch (err) {
          console.error('❌ [DELETE MODAL] Erro ao executar onConfirm:', err);
          toast.error('Erro ao executar exclusão');
        }
      }, 300); // 300ms suficiente para React processar
    } catch (err) {
      console.error('❌ [DELETE MODAL] Erro em handleAllReservationsResolved:', err);
      toast.error('Erro ao processar callback');
    }
  };

  return (
    <>
      {/* Modal de Transferência de Reservas */}
      <PropertyReservationsTransferModal
        open={showTransferModal}
        onClose={() => {
          console.log('⚠️ [DELETE MODAL] onClose chamado no modal de transferência');
          console.log('⚠️ [DELETE MODAL] IGNORANDO - só deve fechar via handleAllReservationsResolved');
          // NÃO fechar aqui! Só deve fechar quando o processo terminar
          // setShowTransferModal(false);
        }}
        property={property}
        onAllResolved={handleAllReservationsResolved}
      />

      {/* Modal Principal de Exclusão */}
      <Dialog open={open && !showTransferModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Excluir Propriedade</DialogTitle>
              <DialogDescription>
                Esta ação pode ter impactos significativos no sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Propriedade */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2">
                Você está prestes a excluir:
              </p>
              <p>
                <strong>{property.internalName}</strong>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {property.address?.city}, {property.address?.state}
              </p>
            </AlertDescription>
          </Alert>

          {/* Análise de Impacto */}
          {hasActiveImpact ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-3">
                  <strong>⚠️ ATENÇÃO: Esta propriedade possui dados ativos!</strong>
                </p>
                <div className="space-y-2">
                  {impact.activeReservations > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        <strong>{impact.activeReservations}</strong> reserva(s) ativa(s) em andamento
                      </span>
                    </div>
                  )}
                  {impact.futureReservations > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        <strong>{impact.futureReservations}</strong> reserva(s) futura(s) confirmada(s)
                      </span>
                    </div>
                  )}
                  {impact.linkedMessages > 0 && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">
                        <strong>{impact.linkedMessages}</strong> mensagem(ns) vinculada(s)
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  Esta propriedade não possui reservas ativas ou futuras.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Opções de Exclusão */}
          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm">
              <strong>Como deseja excluir?</strong>
            </p>

            {/* Soft Delete (Recomendado) */}
            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                softDelete 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setSoftDelete(true)}
            >
              <Checkbox 
                checked={softDelete}
                onCheckedChange={(checked) => setSoftDelete(checked as boolean)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm cursor-pointer">
                    Desativar (Recomendado)
                  </Label>
                  <Badge variant="outline" className="text-xs">Seguro</Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  A propriedade será marcada como inativa e ocultada da listagem, mas seus dados 
                  históricos serão preservados. Você poderá reativá-la a qualquer momento.
                </p>
              </div>
            </div>

            {/* Hard Delete (Perigoso) */}
            <div 
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                !softDelete 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => setSoftDelete(false)}
            >
              <Checkbox 
                checked={!softDelete}
                onCheckedChange={(checked) => setSoftDelete(!checked)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-sm cursor-pointer">
                    Excluir Permanentemente
                  </Label>
                  <Badge variant="destructive" className="text-xs">Irreversível</Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Todos os dados serão removidos permanentemente do sistema, incluindo histórico, 
                  fotos e relatórios. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmação Extra para Hard Delete */}
          {!softDelete && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <Checkbox 
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                id="confirm-delete"
              />
              <div className="flex-1">
                <Label htmlFor="confirm-delete" className="text-sm cursor-pointer">
                  Eu entendo que esta ação é <strong>irreversível</strong> e aceito perder todos 
                  os dados permanentemente
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant={softDelete ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={isDeleting || (!softDelete && !confirmed)}
          >
            {isDeleting ? (
              <>Processando...</>
            ) : softDelete ? (
              <>Desativar Propriedade</>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
