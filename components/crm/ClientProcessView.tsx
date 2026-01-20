import React, { useState, useEffect } from 'react';
import { ServiceTicket, Funnel, TicketPerson, PersonType } from '../../types/funnels';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { FileText, Calendar, CheckCircle2, Clock, Lock, ArrowLeft, User } from 'lucide-react';
import { servicesTicketsApi, funnelsApi } from '../../utils/api';
import { toast } from 'sonner';
import { ClientStageView } from './ClientStageView';
import { useAuth } from '../../contexts/AuthContext';

interface ClientProcessViewProps {
  clientId?: string;
  clientName?: string;
  clientType?: PersonType;
}

export function ClientProcessView({ 
  clientId: propClientId, 
  clientName: propClientName,
  clientType: propClientType 
}: ClientProcessViewProps) {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<Array<{
    ticket: ServiceTicket;
    funnel: Funnel;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<{
    ticket: ServiceTicket;
    funnel: Funnel;
  } | null>(null);

  const clientId = propClientId || user?.id || '';
  const clientName = propClientName || user?.name || 'Cliente';
  const clientType = propClientType || 'contact';

  useEffect(() => {
    if (clientId) {
      loadClientProcesses();
    } else {
      setIsLoading(false);
    }
  }, [clientId]);

  const loadClientProcesses = async () => {
    setIsLoading(true);
    try {
      const response = await servicesTicketsApi.list();
      if (response.success && response.data) {
        const clientTickets = response.data.filter(ticket => {
          const hasClient = ticket.relatedPeople?.some(
            person => person.id === clientId || person.email === user?.email
          );
          return hasClient;
        });

        const allFunnelsResponse = await funnelsApi.list();
        const allFunnels = allFunnelsResponse.success && allFunnelsResponse.data ? allFunnelsResponse.data : [];

        const processesWithFunnels = clientTickets
          .map(ticket => {
            const funnel = allFunnels.find(f => f.id === ticket.funnelId && f.type === 'PREDETERMINED');
            return funnel ? { ticket, funnel } : null;
          })
          .filter(p => p !== null) as Array<{ ticket: ServiceTicket; funnel: Funnel }>;

        setProcesses(processesWithFunnels);
      }
    } catch (error) {
      console.error('Erro ao carregar processos do cliente:', error);
      toast.error('Erro ao carregar processos');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (ticket: ServiceTicket, funnel: Funnel) => {
    const currentStageIndex = funnel.stages.findIndex(s => s.id === ticket.stageId);
    if (currentStageIndex === -1) return 0;
    
    const stageProgress = ((currentStageIndex + 1) / funnel.stages.length) * 100;
    const stageTasks = ticket.tasks?.filter(t => t.stageId === ticket.stageId) || [];
    const completedTasks = stageTasks.filter(t => t.status === 'COMPLETED').length;
    const taskProgress = stageTasks.length > 0 ? (completedTasks / stageTasks.length) * 100 : 0;
    
    const completedStages = currentStageIndex;
    const stageWeight = 100 / funnel.stages.length;
    const overall = (completedStages * stageWeight) + (stageWeight * (taskProgress / 100));
    
    return Math.min(100, Math.round(overall));
  };

  const getCurrentStage = (ticket: ServiceTicket, funnel: Funnel) => {
    return funnel.stages.find(s => s.id === ticket.stageId);
  };

  const isClientResponsible = (stage: any, ticket: ServiceTicket) => {
    const stageName = stage?.name?.toLowerCase() || '';
    const clientKeywords = ['cliente', 'inquilino', 'comprador', 'vendedor', 'aprovação', 'aprov', 'revisar', 'confirmar'];
    return clientKeywords.some(keyword => stageName.includes(keyword));
  };

  const getClientTypeLabel = (type: PersonType) => {
    switch (type) {
      case 'guest': return 'Hóspede';
      case 'buyer': return 'Comprador';
      case 'seller': return 'Vendedor';
      case 'contact': return 'Contato';
      default: return 'Cliente';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Carregando seus processos...</p>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-8 text-center max-w-md">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-gray-500 mb-4">Por favor, faça login para acessar seus processos.</p>
          <Button onClick={() => window.location.href = '/login'}>Fazer Login</Button>
        </Card>
      </div>
    );
  }

  if (selectedProcess) {
    return (
      <ClientStageView
        ticket={selectedProcess.ticket}
        funnel={selectedProcess.funnel}
        clientId={clientId}
        clientName={clientName}
        clientType={clientType}
        onBack={() => setSelectedProcess(null)}
        onUpdate={async (updatedTicket) => {
          await loadClientProcesses();
          setSelectedProcess({ ...selectedProcess, ticket: updatedTicket });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {clientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">Área do Cliente</h1>
                <p className="text-sm text-gray-500">
                  Olá, {clientName}! • {getClientTypeLabel(clientType)}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Site
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Meus Processos Ativos</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Acompanhe e participe dos processos relacionados a você
          </p>
        </div>

        {processes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum processo ativo</h3>
            <p className="text-gray-500">
              Você não tem processos ativos no momento. Quando um processo for iniciado para você, ele aparecerá aqui.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {processes.map(({ ticket, funnel }) => {
              const progress = calculateProgress(ticket, funnel);
              const currentStage = getCurrentStage(ticket, funnel);
              const needsAction = isClientResponsible(currentStage, ticket);

              return (
                <Card
                  key={ticket.id}
                  className={`p-6 cursor-pointer hover:shadow-lg transition-all ${
                    needsAction ? 'ring-2 ring-yellow-500' : ''
                  }`}
                  onClick={() => setSelectedProcess({ ticket, funnel })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold">{ticket.title}</h3>
                        <Badge variant="outline">{ticket.status}</Badge>
                        {needsAction && (
                          <Badge className="bg-yellow-600 hover:bg-yellow-700 animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            Ação Necessária
                          </Badge>
                        )}
                      </div>

                      {funnel.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {funnel.description}
                        </p>
                      )}

                      {currentStage && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          {needsAction ? (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <Lock className="w-5 h-5 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">Etapa Atual</p>
                            <p className="text-lg font-bold">{currentStage.name}</p>
                            {currentStage.description && (
                              <p className="text-xs text-gray-500 mt-1">{currentStage.description}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Progresso do Processo</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {ticket.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Criado em {new Date(ticket.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        {ticket.relatedProperties && ticket.relatedProperties.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{ticket.relatedProperties.length} imóvel(is) relacionado(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-6">
                      {needsAction ? (
                        <Button size="lg" className="min-w-[140px]">
                          Ver Detalhes
                          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="lg" className="min-w-[140px]">
                          Visualizar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
