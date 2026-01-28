/**
 * Página de Operações - Limpezas
 * Integrado com Supabase via React Query hooks + Realtime
 * 
 * @version 2.1.0
 * @date 2026-01-28
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Clock, MapPin, Phone, CheckCircle2, AlertCircle, Calendar, Users, Play, Camera, Loader2, RefreshCw, Plus, Wifi } from 'lucide-react';
import { useCleanings, useMarkOperationalTaskStarted, useMarkOperationalTaskCompleted, useOperationalTasksRealtime } from '@/hooks/useCRMTasks';
import { OperationalTask } from '@/utils/services/crmTasksService';
import { toast } from 'sonner';

export function LimpezasPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: limpezas = [], isLoading, isError, refetch } = useCleanings();
  const markStarted = useMarkOperationalTaskStarted();
  const markCompleted = useMarkOperationalTaskCompleted();
  
  // Realtime subscription - atualiza automaticamente quando há mudanças
  useOperationalTasksRealtime(today);
  
  const pendingCount = limpezas.filter((c: OperationalTask) => c.status === 'pending').length;
  const inProgressCount = limpezas.filter((c: OperationalTask) => c.status === 'in_progress').length;
  const completedCount = limpezas.filter((c: OperationalTask) => c.status === 'completed').length;

  const handleStart = async (id: string) => {
    try {
      await markStarted.mutateAsync(id);
      toast.success('Limpeza iniciada!');
    } catch (error) {
      toast.error('Erro ao iniciar limpeza');
      console.error('Erro:', error);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await markCompleted.mutateAsync({ id });
      toast.success('Limpeza finalizada!');
    } catch (error) {
      toast.error('Erro ao finalizar limpeza');
      console.error('Erro:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge className="bg-red-500 text-white">Urgente</Badge>;
      case 'high': return <Badge className="bg-red-100 text-red-700">Alta</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700">Média</Badge>;
      case 'low': return <Badge className="bg-green-100 text-green-700">Baixa</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <Play className="w-3 h-3 mr-1" />
            Em Andamento
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold">Erro ao carregar limpezas</h3>
            <p className="text-muted-foreground mb-4">Não foi possível carregar os dados.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Limpezas
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de limpezas e preparação de imóveis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1" />
            Nova Limpeza
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-lg px-4 py-2">
          <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
          {pendingCount} Pendentes
        </Badge>
        {inProgressCount > 0 && (
          <Badge variant="outline" className="text-lg px-4 py-2 bg-blue-50">
            <Play className="w-4 h-4 mr-2 text-blue-500" />
            {inProgressCount} Em Andamento
          </Badge>
        )}
        <Badge variant="outline" className="text-lg px-4 py-2 bg-green-50">
          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
          {completedCount} Concluídos
        </Badge>
      </div>

      {/* Lista de Limpezas */}
      <div className="grid gap-4">
        {limpezas.map((limpeza: OperationalTask) => (
          <Card 
            key={limpeza.id} 
            className={`
              ${limpeza.status === 'completed' ? 'opacity-60 bg-green-50/50' : ''}
              ${limpeza.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' : ''}
            `}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {/* Ícone */}
                  <div className={`text-center rounded-lg p-3 min-w-[60px] ${
                    limpeza.status === 'in_progress'
                      ? 'bg-blue-100 dark:bg-blue-900/20' 
                      : 'bg-purple-100 dark:bg-purple-900/20'
                  }`}>
                    <Sparkles className={`w-6 h-6 mx-auto ${
                      limpeza.status === 'in_progress' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>
                  
                  {/* Info Principal */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">
                        {limpeza.property_name || 'Propriedade'}
                      </h3>
                      {getPriorityBadge(limpeza.priority)}
                      {getStatusBadge(limpeza.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {limpeza.property_name || 'Propriedade'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {limpeza.scheduled_date && new Date(limpeza.scheduled_date).toLocaleDateString('pt-BR')}
                        {limpeza.scheduled_time && ` às ${limpeza.scheduled_time}`}
                      </span>
                    </div>
                    
                    {limpeza.assigned_user_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-green-700">
                          <Users className="w-4 h-4" />
                          {limpeza.assigned_user_name}
                        </span>
                        {limpeza.team_name && (
                          <Badge variant="outline" className="text-xs">
                            {limpeza.team_name}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {limpeza.notes && (
                      <p className="text-sm text-muted-foreground bg-gray-50 px-2 py-1 rounded">
                        📝 {limpeza.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {limpeza.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleStart(limpeza.id)}
                        disabled={markStarted.isPending}
                      >
                        {markStarted.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        Iniciar
                      </Button>
                    </>
                  )}
                  {limpeza.status === 'in_progress' && (
                    <>
                      <Button variant="outline" size="sm">
                        <Camera className="w-4 h-4 mr-1" />
                        Fotos
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleComplete(limpeza.id)}
                        disabled={markCompleted.isPending}
                      >
                        {markCompleted.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Finalizar
                      </Button>
                    </>
                  )}
                  {limpeza.status === 'completed' && (
                    <Button variant="outline" size="sm" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Concluído
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {limpezas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma limpeza registrada</h3>
            <p className="text-muted-foreground">Não há limpezas pendentes no momento.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LimpezasPage;
