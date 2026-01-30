/**
 * ReconciliationDashboard - Dashboard de Reconciliação de Reservas
 * 
 * Exibe histórico de execuções do job de reconciliação e permite
 * executar reconciliação manual.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Loader2, RefreshCw, PlayCircle, CheckCircle2, XCircle, AlertTriangle, Clock, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../ui/utils';

// Create Supabase client for this component
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

interface ReconciliationRun {
  id: string;
  organization_id: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  total_checked: number;
  found_deleted: number;
  found_modified: number;
  found_orphan: number;
  action_cancelled: number;
  action_updated: number;
  action_skipped: number;
  error_message: string | null;
  summary: any;
}

interface ReconciliationItem {
  id: string;
  run_id: string;
  reservation_id: string;
  external_id: string;
  confirmation_code: string | null;
  property_id: string | null;
  issue_type: string;
  local_status: string;
  api_status: string | null;
  action_taken: string;
  action_reason: string;
  created_at: string;
}

// Cores por status
const statusConfig: Record<string, { color: string; icon: React.ComponentType<any>; label: string }> = {
  running: { color: 'bg-blue-500', icon: Loader2, label: 'Executando' },
  completed: { color: 'bg-green-500', icon: CheckCircle2, label: 'Concluído' },
  failed: { color: 'bg-red-500', icon: XCircle, label: 'Falhou' },
  partial: { color: 'bg-yellow-500', icon: AlertTriangle, label: 'Parcial' },
};

// Cores por tipo de issue
const issueTypeConfig: Record<string, { color: string; label: string }> = {
  deleted: { color: 'bg-red-100 text-red-800', label: 'Deletada' },
  status_changed: { color: 'bg-yellow-100 text-yellow-800', label: 'Status alterado' },
  dates_changed: { color: 'bg-blue-100 text-blue-800', label: 'Datas alteradas' },
  guest_changed: { color: 'bg-purple-100 text-purple-800', label: 'Hóspede alterado' },
  orphan: { color: 'bg-gray-100 text-gray-800', label: 'Órfã' },
};

// Cores por ação tomada
const actionConfig: Record<string, { color: string; label: string }> = {
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelada' },
  updated: { color: 'bg-green-100 text-green-800', label: 'Atualizada' },
  skipped: { color: 'bg-gray-100 text-gray-800', label: 'Ignorada' },
  error: { color: 'bg-orange-100 text-orange-800', label: 'Erro' },
};

export function ReconciliationDashboard() {
  const queryClient = useQueryClient();
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  // Buscar histórico de execuções
  const { data: runs, isLoading: runsLoading, error: runsError } = useQuery({
    queryKey: ['reconciliation-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as ReconciliationRun[];
    },
    refetchInterval: 30000, // Refetch a cada 30s
  });

  // Buscar detalhes de uma execução específica
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['reconciliation-items', selectedRun],
    queryFn: async () => {
      if (!selectedRun) return [];
      
      const { data, error } = await supabase
        .from('reconciliation_items')
        .select('*')
        .eq('run_id', selectedRun)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReconciliationItem[];
    },
    enabled: !!selectedRun,
  });

  // Mutation para executar reconciliação manual
  const runReconciliation = useMutation({
    mutationFn: async (dryRun: boolean = false) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rendizy-server/cron/staysnet-reservations-reconcile${dryRun ? '?dryRun=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao executar reconciliação');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Reconciliação concluída');
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Calcular estatísticas gerais
  const stats = React.useMemo(() => {
    if (!runs || runs.length === 0) return null;
    
    const last7Days = runs.filter(r => {
      const date = new Date(r.started_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return date >= sevenDaysAgo;
    });
    
    return {
      totalRuns: last7Days.length,
      totalChecked: last7Days.reduce((sum, r) => sum + (r.total_checked || 0), 0),
      totalIssues: last7Days.reduce((sum, r) => sum + (r.found_deleted || 0) + (r.found_modified || 0), 0),
      totalFixed: last7Days.reduce((sum, r) => sum + (r.action_cancelled || 0) + (r.action_updated || 0), 0),
      lastRun: runs[0],
      successRate: last7Days.length > 0 
        ? Math.round((last7Days.filter(r => r.status === 'completed').length / last7Days.length) * 100)
        : 100,
    };
  }, [runs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reconciliação de Reservas</h2>
          <p className="text-sm text-muted-foreground">
            Verifica se reservas locais ainda existem na Stays.net e corrige divergências
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runReconciliation.mutate(true)}
            disabled={runReconciliation.isPending}
          >
            {runReconciliation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Simular (Dry Run)
          </Button>
          <Button
            size="sm"
            onClick={() => runReconciliation.mutate(false)}
            disabled={runReconciliation.isPending}
          >
            {runReconciliation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Executar Agora
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalRuns}</div>
              <p className="text-xs text-muted-foreground">Execuções (7 dias)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalChecked}</div>
              <p className="text-xs text-muted-foreground">Reservas verificadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.totalIssues}</div>
              <p className="text-xs text-muted-foreground">Divergências encontradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.totalFixed}</div>
              <p className="text-xs text-muted-foreground">Correções aplicadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerta sobre horário do cron */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Execução Automática</AlertTitle>
        <AlertDescription>
          A reconciliação roda automaticamente todos os dias às <strong>03:00 BRT</strong> (06:00 UTC).
          Você pode executar manualmente a qualquer momento usando os botões acima.
        </AlertDescription>
      </Alert>

      {/* Histórico de execuções */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Histórico de Execuções</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : runsError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Erro ao carregar histórico. A tabela pode não existir ainda.
              </AlertDescription>
            </Alert>
          ) : !runs || runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma execução registrada ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => {
                const StatusIcon = statusConfig[run.status]?.icon || Activity;
                const isSelected = selectedRun === run.id;
                
                return (
                  <div
                    key={run.id}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-colors",
                      isSelected ? "border-primary bg-muted/50" : "hover:bg-muted/30"
                    )}
                    onClick={() => setSelectedRun(isSelected ? null : run.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          run.status === 'running' && "bg-blue-100",
                          run.status === 'completed' && "bg-green-100",
                          run.status === 'failed' && "bg-red-100",
                          run.status === 'partial' && "bg-yellow-100",
                        )}>
                          <StatusIcon className={cn(
                            "h-4 w-4",
                            run.status === 'running' && "text-blue-600 animate-spin",
                            run.status === 'completed' && "text-green-600",
                            run.status === 'failed' && "text-red-600",
                            run.status === 'partial' && "text-yellow-600",
                          )} />
                        </div>
                        <div>
                          <div className="font-medium">
                            {formatDate(run.started_at)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Duração: {formatDuration(run.duration_ms)} • {run.total_checked} reservas
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {run.found_deleted > 0 && (
                          <span className="text-red-600">
                            {run.found_deleted} deletadas
                          </span>
                        )}
                        {run.found_modified > 0 && (
                          <span className="text-yellow-600">
                            {run.found_modified} alteradas
                          </span>
                        )}
                        {run.action_cancelled > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {run.action_cancelled} canceladas
                          </Badge>
                        )}
                        {run.action_updated > 0 && (
                          <Badge className="text-xs bg-green-600">
                            {run.action_updated} atualizadas
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {statusConfig[run.status]?.label || run.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t">
                        {run.error_message && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{run.error_message}</AlertDescription>
                          </Alert>
                        )}
                        
                        {itemsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : items && items.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm mb-2">
                              Itens afetados ({items.length})
                            </h4>
                            <div className="max-h-64 overflow-y-auto space-y-1">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge className={cn("text-xs", issueTypeConfig[item.issue_type]?.color)}>
                                      {issueTypeConfig[item.issue_type]?.label || item.issue_type}
                                    </Badge>
                                    <span className="font-mono">
                                      {item.confirmation_code || item.external_id?.substring(0, 8)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {item.local_status} → {item.api_status || 'N/A'}
                                    </span>
                                    <Badge className={cn("text-xs", actionConfig[item.action_taken]?.color)}>
                                      {actionConfig[item.action_taken]?.label || item.action_taken}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhuma divergência encontrada nesta execução.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReconciliationDashboard;
