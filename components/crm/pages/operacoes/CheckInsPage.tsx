/**
 * Página de Operações - Check-ins do Dia
 * Integrado com Supabase via React Query hooks + Realtime
 * 
 * @version 2.1.0
 * @date 2026-01-28
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Key, Clock, MapPin, Phone, CheckCircle2, AlertCircle, Calendar, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { useCheckIns, useMarkOperationalTaskCompleted, useOperationalTasksRealtime } from '@/hooks/useCRMTasks';
import { OperationalTask } from '@/utils/services/crmTasksService';
import { toast } from 'sonner';

export function CheckInsPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: checkins = [], isLoading, isError, refetch } = useCheckIns(today);
  const markCompleted = useMarkOperationalTaskCompleted();
  
  // Realtime subscription - atualiza automaticamente quando há mudanças
  useOperationalTasksRealtime(today);
  
  const pendingCount = checkins.filter((c: OperationalTask) => c.status === 'pending').length;
  const completedCount = checkins.filter((c: OperationalTask) => c.status === 'completed').length;

  const handleMarkComplete = async (id: string) => {
    try {
      await markCompleted.mutateAsync({ id });
      toast.success('Check-in confirmado com sucesso!');
    } catch (error) {
      toast.error('Erro ao confirmar check-in');
      console.error('Erro:', error);
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
                  <Skeleton className="h-20 w-20" />
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
            <h3 className="text-lg font-semibold">Erro ao carregar check-ins</h3>
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
            <Key className="w-6 h-6 text-green-600" />
            Check-ins de Hoje
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
            {pendingCount} Pendentes
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2 bg-green-50">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            {completedCount} Concluídos
          </Badge>
        </div>
      </div>

      {/* Lista de Check-ins */}
      <div className="grid gap-4">
        {checkins.map((checkin: OperationalTask) => (
          <Card 
            key={checkin.id} 
            className={checkin.status === 'completed' ? 'opacity-60 bg-green-50/50' : ''}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {/* Horário */}
                  <div className="text-center bg-purple-100 dark:bg-purple-900/20 rounded-lg p-3 min-w-[80px]">
                    <Clock className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                    <span className="text-xl font-bold text-purple-700">
                      {checkin.scheduled_time || '14:00'}
                    </span>
                  </div>
                  
                  {/* Info Principal */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {checkin.guest_name || 'Hóspede'}
                      </h3>
                      {checkin.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {checkin.property_name || 'Propriedade'}
                      </span>
                      {checkin.guest_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {checkin.guest_phone}
                        </span>
                      )}
                    </div>
                    
                    {checkin.notes && (
                      <p className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        📝 {checkin.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {checkin.status === 'pending' ? (
                    <>
                      {checkin.guest_phone && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`https://wa.me/${checkin.guest_phone?.replace(/\D/g, '')}`, '_blank')}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkComplete(checkin.id)}
                        disabled={markCompleted.isPending}
                      >
                        {markCompleted.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Confirmar Check-in
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Concluído {checkin.completed_at && `às ${new Date(checkin.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {checkins.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum check-in hoje</h3>
            <p className="text-muted-foreground">Não há check-ins programados para hoje.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CheckInsPage;
