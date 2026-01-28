/**
 * Página de Operações - Check-outs do Dia
 * Integrado com Supabase via React Query hooks
 * 
 * @version 2.0.0
 * @date 2026-01-28
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DoorOpen, Clock, MapPin, Phone, CheckCircle2, AlertCircle, Calendar, AlertTriangle, Camera, Loader2, RefreshCw } from 'lucide-react';
import { useCheckOuts, useMarkOperationalTaskCompleted } from '@/hooks/useCRMTasks';
import { OperationalTask } from '@/utils/services/crmTasksService';
import { toast } from 'sonner';

export function CheckOutsPage() {
  const today = new Date().toISOString().split('T')[0];
  const { data: checkouts = [], isLoading, isError, refetch } = useCheckOuts(today);
  const markCompleted = useMarkOperationalTaskCompleted();
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const pendingCount = checkouts.filter((c: OperationalTask) => c.status === 'pending').length;
  const completedCount = checkouts.filter((c: OperationalTask) => c.status === 'completed').length;
  const lateCount = checkouts.filter((c: OperationalTask) => 
    c.status === 'pending' && c.scheduled_time && c.scheduled_time < currentTime
  ).length;

  const handleMarkComplete = async (id: string) => {
    try {
      await markCompleted.mutateAsync({ id });
      toast.success('Check-out confirmado com sucesso!');
    } catch (error) {
      toast.error('Erro ao confirmar check-out');
      console.error('Erro:', error);
    }
  };

  const isLate = (checkout: OperationalTask) => {
    return checkout.status === 'pending' && checkout.scheduled_time && checkout.scheduled_time < currentTime;
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
            <h3 className="text-lg font-semibold">Erro ao carregar check-outs</h3>
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
            <DoorOpen className="w-6 h-6 text-blue-600" />
            Check-outs de Hoje
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
          {lateCount > 0 && (
            <Badge variant="outline" className="text-lg px-4 py-2 bg-red-50">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
              {lateCount} Atrasados
            </Badge>
          )}
          <Badge variant="outline" className="text-lg px-4 py-2 bg-green-50">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            {completedCount} Concluídos
          </Badge>
        </div>
      </div>

      {/* Lista de Check-outs */}
      <div className="grid gap-4">
        {checkouts.map((checkout: OperationalTask) => (
          <Card 
            key={checkout.id} 
            className={`
              ${checkout.status === 'completed' ? 'opacity-60 bg-green-50/50' : ''}
              ${isLate(checkout) ? 'border-red-200 bg-red-50/30' : ''}
            `}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {/* Horário */}
                  <div className={`text-center rounded-lg p-3 min-w-[80px] ${
                    isLate(checkout) 
                      ? 'bg-red-100 dark:bg-red-900/20' 
                      : 'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    <Clock className={`w-5 h-5 mx-auto mb-1 ${
                      isLate(checkout) ? 'text-red-600' : 'text-blue-600'
                    }`} />
                    <span className={`text-xl font-bold ${
                      isLate(checkout) ? 'text-red-700' : 'text-blue-700'
                    }`}>{checkout.scheduled_time || '11:00'}</span>
                  </div>
                  
                  {/* Info Principal */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {checkout.guest_name || 'Hóspede'}
                      </h3>
                      {checkout.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                      {isLate(checkout) && (
                        <Badge className="bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Atrasado
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {checkout.property_name || 'Propriedade'}
                      </span>
                      {checkout.guest_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {checkout.guest_phone}
                        </span>
                      )}
                    </div>
                    
                    {checkout.notes && (
                      <p className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        📝 {checkout.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {checkout.status !== 'completed' && (
                    <>
                      {checkout.guest_phone && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`https://wa.me/${checkout.guest_phone?.replace(/\D/g, '')}`, '_blank')}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Camera className="w-4 h-4 mr-1" />
                        Vistoria
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleMarkComplete(checkout.id)}
                        disabled={markCompleted.isPending}
                      >
                        {markCompleted.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Confirmar Saída
                      </Button>
                    </>
                  )}
                  {checkout.status === 'completed' && (
                    <Button variant="outline" size="sm" disabled>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Concluído {checkout.completed_at && `às ${new Date(checkout.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {checkouts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum check-out hoje</h3>
            <p className="text-muted-foreground">Não há check-outs programados para hoje.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CheckOutsPage;
