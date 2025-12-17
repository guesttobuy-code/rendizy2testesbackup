import React, { useState, useMemo } from 'react';
import { ServiceTicket, Funnel, FunnelStage, PersonType, StageApprovalRecord } from '../../types/funnels';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Lock, FileText, Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { servicesTicketsApi } from '../../utils/api';
import { StageApproval } from './StageApproval';
import { FileUpload, UploadedFile } from './FileUpload';

interface ClientStageViewProps {
  ticket: ServiceTicket;
  funnel: Funnel;
  clientId: string;
  clientName: string;
  clientType: PersonType;
  onBack: () => void;
  onUpdate: (ticket: ServiceTicket) => void;
}

export function ClientStageView({
  ticket,
  funnel,
  clientId,
  clientName,
  clientType,
  onBack,
  onUpdate,
}: ClientStageViewProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Ordenar etapas
  const sortedStages = useMemo(() => {
    return [...funnel.stages].sort((a, b) => a.order - b.order);
  }, [funnel.stages]);

  // Etapa atual
  const currentStage = useMemo(() => {
    return sortedStages.find(s => s.id === ticket.stageId);
  }, [sortedStages, ticket.stageId]);

  // Verificar se cliente é responsável pela etapa atual
  const isClientResponsible = useMemo(() => {
    if (!currentStage) return false;
    const stageName = currentStage.name?.toLowerCase() || '';
    const stageDescription = currentStage.description?.toLowerCase() || '';
    const clientKeywords = ['cliente', 'inquilino', 'comprador', 'vendedor', 'aprovação', 'aprov', 'revisar', 'confirmar'];
    return clientKeywords.some(keyword => 
      stageName.includes(keyword) || stageDescription.includes(keyword)
    );
  }, [currentStage]);

  // Tarefas da etapa atual
  const stageTasks = useMemo(() => {
    return ticket.tasks?.filter(t => t.stageId === ticket.stageId) || [];
  }, [ticket.tasks, ticket.stageId]);

  // Progresso da etapa
  const stageProgress = useMemo(() => {
    if (stageTasks.length === 0) return 0;
    const completed = stageTasks.filter(t => t.status === 'COMPLETED').length;
    return Math.round((completed / stageTasks.length) * 100);
  }, [stageTasks]);

  // Verificar se já foi aprovado
  const existingApproval = ticket.metadata?.stageApprovals?.[ticket.stageId] as StageApprovalRecord | undefined;

  const handleApprove = async (comment?: string) => {
    setIsSubmitting(true);
    try {
      const approvalRecord: StageApprovalRecord = {
        stageId: ticket.stageId,
        approved: true,
        rejected: false,
        comment,
        approvedBy: clientId,
        approvedByName: clientName,
        approvedAt: new Date().toISOString(),
      };

      const updatedTicket: ServiceTicket = {
        ...ticket,
        metadata: {
          ...ticket.metadata,
          stageApprovals: {
            ...(ticket.metadata?.stageApprovals || {}),
            [ticket.stageId]: approvalRecord,
          },
        },
      };

      // Avançar para próxima etapa se aprovado
      const currentStageIndex = sortedStages.findIndex(s => s.id === ticket.stageId);
      if (currentStageIndex >= 0 && currentStageIndex < sortedStages.length - 1) {
        updatedTicket.stageId = sortedStages[currentStageIndex + 1].id;
      }

      const response = await servicesTicketsApi.update(ticket.id, updatedTicket);
      if (response.success && response.data) {
        toast.success('Etapa aprovada com sucesso!');
        onUpdate(response.data);
        setApprovalModalOpen(false);
      } else {
        toast.error('Erro ao aprovar etapa');
      }
    } catch (error) {
      console.error('Erro ao aprovar etapa:', error);
      toast.error('Erro ao aprovar etapa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (comment: string) => {
    setIsSubmitting(true);
    try {
      const approvalRecord: StageApprovalRecord = {
        stageId: ticket.stageId,
        approved: false,
        rejected: true,
        comment,
        approvedBy: clientId,
        approvedByName: clientName,
        approvedAt: new Date().toISOString(),
      };

      const updatedTicket: ServiceTicket = {
        ...ticket,
        metadata: {
          ...ticket.metadata,
          stageApprovals: {
            ...(ticket.metadata?.stageApprovals || {}),
            [ticket.stageId]: approvalRecord,
          },
        },
      };

      const response = await servicesTicketsApi.update(ticket.id, updatedTicket);
      if (response.success && response.data) {
        toast.success('Etapa rejeitada. Sua observação foi registrada.');
        onUpdate(response.data);
        setApprovalModalOpen(false);
      } else {
        toast.error('Erro ao rejeitar etapa');
      }
    } catch (error) {
      console.error('Erro ao rejeitar etapa:', error);
      toast.error('Erro ao rejeitar etapa');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentStage) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Etapa não encontrada</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Processos
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{funnel.description}</p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Etapa Atual: {currentStage.name}</h2>
              {currentStage.description && (
                <p className="text-gray-600 dark:text-gray-400">{currentStage.description}</p>
              )}
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Etapa {sortedStages.findIndex(s => s.id === currentStage.id) + 1} de {sortedStages.length}
            </Badge>
          </div>

          {/* Progresso da Etapa */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Progresso desta etapa</span>
              <span className="font-bold">{stageProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all"
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>

          {/* Status de Aprovação */}
          {existingApproval && (
            <div className={`p-4 rounded-lg mb-6 ${
              existingApproval.approved
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {existingApproval.approved ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold">
                  {existingApproval.approved ? 'Etapa Aprovada' : 'Etapa Rejeitada'}
                </span>
              </div>
              {existingApproval.comment && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {existingApproval.comment}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {new Date(existingApproval.approvedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {/* Tarefas da Etapa */}
          {stageTasks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Tarefas desta Etapa</h3>
              <div className="space-y-2">
                {stageTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                    </div>
                    <Badge variant={task.status === 'COMPLETED' ? 'default' : 'outline'}>
                      {task.status === 'COMPLETED' ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload de Arquivos (se necessário) */}
          {isClientResponsible && (
            <div className="mb-6">
              <Label className="mb-2 block">Anexar Documentos (opcional)</Label>
              <FileUpload
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                maxFiles={5}
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
          )}

          {/* Ações do Cliente */}
          {isClientResponsible && !existingApproval && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientComment">Seus Comentários (opcional)</Label>
                <Textarea
                  id="clientComment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicione observações, dúvidas ou comentários sobre esta etapa..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  onClick={() => setApprovalModalOpen(true)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  onClick={() => setApprovalModalOpen(true)}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Aprovar Etapa
                </Button>
              </div>
            </div>
          )}

          {/* Mensagem se não for responsável */}
          {!isClientResponsible && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                <p className="text-blue-700 dark:text-blue-300">
                  Esta etapa não requer sua ação no momento. Acompanhe o progresso abaixo.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Timeline de Etapas */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Progresso do Processo</h3>
          <div className="space-y-3">
            {sortedStages.map((stage, index) => {
              const isCompleted = index < sortedStages.findIndex(s => s.id === ticket.stageId);
              const isCurrent = stage.id === ticket.stageId;
              const isBlocked = index > sortedStages.findIndex(s => s.id === ticket.stageId);

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg ${
                    isCurrent
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                      : isCompleted
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : isCurrent ? (
                      <Clock className="w-6 h-6 text-purple-600" />
                    ) : (
                      <Lock className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stage.name}</span>
                      {isCurrent && <Badge>Atual</Badge>}
                      {isCompleted && <Badge variant="outline" className="bg-green-100">Concluída</Badge>}
                    </div>
                    {stage.description && (
                      <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Modal de Aprovação/Rejeição */}
      {currentStage && (
        <StageApproval
          stage={currentStage}
          ticket={ticket}
          open={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          onApprove={handleApprove}
          onReject={handleReject}
          currentUser={{
            id: clientId,
            name: clientName,
          }}
        />
      )}
    </div>
  );
}
