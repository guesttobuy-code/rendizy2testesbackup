import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, ArrowLeft, Edit, Play, Pause, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import { automationsApi, type Automation, type AutomationExecution } from '../../utils/api';

export function AutomationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadAutomation();
      loadExecutions();
    }
  }, [id]);

  const loadAutomation = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await automationsApi.get(id);
      if (response.success && response.data) {
        setAutomation(response.data);
      } else {
        toast.error(response.error || 'Erro ao carregar automação');
        navigate('/automacoes');
      }
    } catch (error: any) {
      console.error('[AutomationDetails] Erro ao carregar', error);
      toast.error('Erro ao carregar automação');
      navigate('/automacoes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutions = async () => {
    if (!id) return;
    try {
      const response = await automationsApi.getExecutions(id, 20, 0);
      if (response.success && response.data) {
        setExecutions(response.data);
      }
    } catch (error: any) {
      console.error('[AutomationDetails] Erro ao carregar execuções', error);
    }
  };

  const handleToggleStatus = async () => {
    if (!automation) return;
    setIsUpdating(true);
    try {
      const newStatus = automation.status === 'active' ? 'paused' : 'active';
      const response = await automationsApi.updateStatus(automation.id, newStatus as 'active' | 'paused');
      
      if (response.success) {
        toast.success(`Automação ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso`);
        await loadAutomation();
      } else {
        toast.error(response.error || 'Erro ao atualizar status');
      }
    } catch (error: any) {
      console.error('[AutomationDetails] Erro ao atualizar status', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!automation) return;
    if (!confirm(`Tem certeza que deseja deletar a automação "${automation.name}"?`)) {
      return;
    }

    try {
      const response = await automationsApi.delete(automation.id);
      if (response.success) {
        toast.success('Automação deletada com sucesso');
        navigate('/automacoes');
      } else {
        toast.error(response.error || 'Erro ao deletar automação');
      }
    } catch (error: any) {
      console.error('[AutomationDetails] Erro ao deletar', error);
      toast.error('Erro ao deletar automação');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!automation) {
    return null;
  }

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

  const getExecutionStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Ignorada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/automacoes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{automation.name}</h1>
          <p className="text-muted-foreground text-sm">{automation.description}</p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(automation.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : automation.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Ativar
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong className="text-sm text-muted-foreground">Status</strong>
              <div className="mt-1">{getStatusBadge(automation.status)}</div>
            </div>
            {automation.module && (
              <div>
                <strong className="text-sm text-muted-foreground">Módulo</strong>
                <div className="mt-1">{automation.module}</div>
              </div>
            )}
            {automation.channel && (
              <div>
                <strong className="text-sm text-muted-foreground">Canal</strong>
                <div className="mt-1">{automation.channel}</div>
              </div>
            )}
            <div>
              <strong className="text-sm text-muted-foreground">Prioridade</strong>
              <div className="mt-1 capitalize">{automation.priority}</div>
            </div>
            <div>
              <strong className="text-sm text-muted-foreground">Execuções</strong>
              <div className="mt-1">{automation.trigger_count}</div>
            </div>
            {automation.last_triggered_at && (
              <div>
                <strong className="text-sm text-muted-foreground">Última execução</strong>
                <div className="mt-1">
                  {new Date(automation.last_triggered_at).toLocaleString('pt-BR')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gatilho</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
              {JSON.stringify(automation.definition?.trigger, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      {automation.definition?.conditions && automation.definition.conditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Condições</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
              {JSON.stringify(automation.definition.conditions, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ações ({automation.definition?.actions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {automation.definition?.actions?.map((action, index) => (
              <div key={index} className="border rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{action.type}</Badge>
                  {action.channel && <Badge variant="outline">{action.channel}</Badge>}
                </div>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(action, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Execuções
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma execução registrada ainda
            </p>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => (
                <div key={execution.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getExecutionStatusBadge(execution.status)}
                      <span className="text-sm text-muted-foreground">
                        {execution.trigger_event}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(execution.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {execution.error_message && (
                    <div className="text-sm text-destructive mt-2">
                      {execution.error_message}
                    </div>
                  )}
                  {execution.execution_time_ms && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Tempo: {execution.execution_time_ms}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

