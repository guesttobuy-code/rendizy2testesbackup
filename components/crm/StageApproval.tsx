import React, { useState } from 'react';
import { FunnelStage, ServiceTicket } from '../../types/funnels';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface StageApprovalProps {
  stage: FunnelStage;
  ticket: ServiceTicket;
  open: boolean;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment: string) => void;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface StageApprovalRecord {
  stageId: string;
  approved: boolean;
  rejected: boolean;
  comment?: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
}

export function StageApproval({
  stage,
  ticket,
  open,
  onClose,
  onApprove,
  onReject,
  currentUser,
}: StageApprovalProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar se já existe aprovação/rejeição
  const existingApproval = ticket.metadata?.stageApprovals?.[stage.id] as StageApprovalRecord | undefined;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(comment || undefined);
      setComment('');
      onClose();
    } catch (error) {
      console.error('Erro ao aprovar etapa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      return; // Comentário obrigatório para rejeição
    }
    setIsSubmitting(true);
    try {
      await onReject(comment);
      setComment('');
      onClose();
    } catch (error) {
      console.error('Erro ao rejeitar etapa:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {existingApproval?.approved ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : existingApproval?.rejected ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            Aprovar/Rejeitar Etapa: {stage.name}
          </DialogTitle>
          <DialogDescription>
            {existingApproval
              ? 'Esta etapa já foi avaliada. Você pode revisar a decisão anterior.'
              : 'Aprove ou rejeite esta etapa. Comentários são obrigatórios para rejeição.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Atual */}
          {existingApproval && (
            <div className={`p-3 rounded-lg border ${
              existingApproval.approved
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {existingApproval.approved ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium text-sm">
                  {existingApproval.approved ? 'Aprovada' : 'Rejeitada'} por {existingApproval.approvedByName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(existingApproval.approvedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {existingApproval.comment && (
                <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                  {existingApproval.comment}
                </p>
              )}
            </div>
          )}

          {/* Informações da Etapa */}
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">Etapa</label>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stage.name}</p>
            </div>
            {stage.description && (
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stage.description}</p>
              </div>
            )}
          </div>

          {/* Comentário */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Comentário {existingApproval?.rejected && '(obrigatório para rejeição)'}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                existingApproval?.rejected
                  ? 'Explique o motivo da rejeição...'
                  : 'Adicione um comentário (opcional para aprovação)...'
              }
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting || (!comment.trim() && !existingApproval)}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
