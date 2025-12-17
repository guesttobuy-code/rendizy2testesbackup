import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Plus, Play, Pause, Trash2, Edit, Eye, Workflow, Info, Zap, Building2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { toast } from 'sonner';
import { automationsApi, type Automation } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

interface AutomationsListProps {
  /**
   * Sempre que o valor mudar a lista recarrega.
   * Útil para sincronizar criações feitas em outras abas/telas.
   */
  refreshToken?: number;
}

export function AutomationsList({ refreshToken }: AutomationsListProps = {}) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadAutomations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await automationsApi.list();
      if (response.success && response.data) {
        setAutomations(response.data);
      } else {
        toast.error(response.error || 'Erro ao carregar automações');
      }
    } catch (error: any) {
      console.error('[AutomationsList] Erro ao carregar', error);
      toast.error('Erro ao carregar automações');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  useEffect(() => {
    if (refreshToken === undefined) {
      return;
    }
    loadAutomations();
  }, [refreshToken, loadAutomations]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setUpdatingStatus(id);
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const response = await automationsApi.updateStatus(id, newStatus as 'active' | 'paused');
      
      if (response.success) {
        toast.success(`Automação ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso`);
        await loadAutomations();
      } else {
        toast.error(response.error || 'Erro ao atualizar status');
      }
    } catch (error: any) {
      console.error('[AutomationsList] Erro ao atualizar status', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar a automação "${name}"?`)) {
      return;
    }

    try {
      const response = await automationsApi.delete(id);
      if (response.success) {
        toast.success('Automação deletada com sucesso');
        await loadAutomations();
      } else {
        toast.error(response.error || 'Erro ao deletar automação');
      }
    } catch (error: any) {
      console.error('[AutomationsList] Erro ao deletar', error);
      toast.error('Erro ao deletar automação');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'paused':
        return <Badge variant="secondary">Pausada</Badge>;
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'alta':
        return <Badge variant="destructive">Alta</Badge>;
      case 'media':
        return <Badge className="bg-yellow-500">Média</Badge>;
      case 'baixa':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Workflow className="h-5 w-5 text-purple-500" />
            Automações
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas automações de notificações e relatórios
          </p>
        </div>
        <Button onClick={() => navigate('/crm/automacoes-lab')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma automação criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira automação usando o Laboratório de IA
            </p>
            <Button onClick={() => navigate('/crm/automacoes-lab')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Automação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <Card key={automation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{automation.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {automation.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(automation.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Módulos (array) */}
                  {automation.modules && automation.modules.length > 0 ? (
                    automation.modules.map((module) => (
                      <Badge key={module} variant="outline">{module}</Badge>
                    ))
                  ) : automation.module ? (
                    <Badge variant="outline">{automation.module}</Badge>
                  ) : null}
                  {automation.channel && (
                    <Badge variant="outline">{automation.channel}</Badge>
                  )}
                  {getPriorityBadge(automation.priority)}
                  {automation.properties && automation.properties.length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {automation.properties.length} imóvel{automation.properties.length > 1 ? 'eis' : ''}
                    </Badge>
                  )}
                </div>

                {/* Resumo da Interpretação da IA */}
                {automation.ai_interpretation_summary && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg cursor-help">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                                O que a IA interpretou:
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {automation.ai_interpretation_summary}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
                        <p className="text-sm">{automation.ai_interpretation_summary}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Descrição do Impacto */}
                {automation.impact_description && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 bg-green-500/5 border border-green-500/20 rounded-lg cursor-help">
                          <div className="flex items-start gap-2">
                            <Zap className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                                Impacto desta automação:
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {automation.impact_description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-md">
                        <p className="text-sm">{automation.impact_description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <strong>Gatilho:</strong> {automation.definition?.trigger?.type || 'N/A'}
                  </div>
                  <div>
                    <strong>Ações:</strong> {automation.definition?.actions?.length || 0}
                  </div>
                  {automation.trigger_count > 0 && (
                    <div>
                      <strong>Execuções:</strong> {automation.trigger_count}
                    </div>
                  )}
                  {automation.last_triggered_at && (
                    <div>
                      <strong>Última execução:</strong>{' '}
                      {new Date(automation.last_triggered_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/automacoes/${automation.id}`)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(automation.id, automation.status)}
                    disabled={updatingStatus === automation.id}
                  >
                    {updatingStatus === automation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : automation.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(automation.id, automation.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

