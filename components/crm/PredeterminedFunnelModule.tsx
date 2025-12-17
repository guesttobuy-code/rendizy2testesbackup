import React, { useState, useEffect } from 'react';
import { Funnel, ServiceTicket } from '../../types/funnels';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Plus, Globe, List, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { funnelsApi, servicesTicketsApi } from '../../utils/api';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { PredeterminedFunnelView } from './PredeterminedFunnelView';
import { ServicesTicketDetail } from './ServicesTicketDetail';
import { CreateTicketModal } from './CreateTicketModal';
import { PredeterminedFunnelBuilder } from './PredeterminedFunnelBuilder';
import { useAuth } from '../../contexts/AuthContext';

export function PredeterminedFunnelModule() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [viewMode, setViewMode] = useState<'wizard' | 'list'>('wizard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);

  // Carregar funis pré-determinados
  useEffect(() => {
    loadFunnels();
  }, []);

  const loadFunnels = async () => {
    setIsLoading(true);
    try {
      const response = await funnelsApi.list();
      let predeterminedFunnels: Funnel[] = [];
      let globalFunnels: Funnel[] = [];

      if (response.success && response.data) {
        const allFunnels = response.data;
        // Separar funis globais dos funis da organização
        globalFunnels = allFunnels.filter(f => f.type === 'PREDETERMINED' && f.isGlobalDefault === true);
        predeterminedFunnels = allFunnels.filter(f => f.type === 'PREDETERMINED' && !f.isGlobalDefault);
      } else {
        // Fallback: usar localStorage
        const savedFunnels = localStorage.getItem('rendizy_funnels');
        if (savedFunnels) {
          const allFunnels = JSON.parse(savedFunnels);
          globalFunnels = allFunnels.filter((f: Funnel) => f.type === 'PREDETERMINED' && f.isGlobalDefault === true);
          predeterminedFunnels = allFunnels.filter((f: Funnel) => f.type === 'PREDETERMINED' && !f.isGlobalDefault);
        }
      }

      // Combinar: globais primeiro, depois os da organização
      predeterminedFunnels = [...globalFunnels, ...predeterminedFunnels];

      // Se não houver funis, criar um padrão
      if (predeterminedFunnels.length === 0) {
        const defaultFunnel: Funnel = {
          id: 'predetermined-default',
          organizationId: '',
          name: 'Funil Pré-determinado',
          type: 'PREDETERMINED',
          description: 'Processos sequenciais tipo wizard',
          stages: [
            { id: '1', funnelId: 'predetermined-default', name: 'Etapa 1', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
            { id: '2', funnelId: 'predetermined-default', name: 'Etapa 2', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
            { id: '3', funnelId: 'predetermined-default', name: 'Etapa 3', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
            { id: '4', funnelId: 'predetermined-default', name: 'Etapa 4', order: 4, color: '#10b981', createdAt: new Date().toISOString() },
          ],
          statusConfig: {
            resolvedStatus: 'Concluído',
            unresolvedStatus: 'Cancelado',
            inProgressStatus: 'Em Andamento',
          },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        predeterminedFunnels = [defaultFunnel];
      }

      setFunnels(predeterminedFunnels);
      
      // Selecionar primeiro funil ou salvo no localStorage
      const savedFunnelId = localStorage.getItem('rendizy_selected_predetermined_funnel');
      if (savedFunnelId && predeterminedFunnels.find(f => f.id === savedFunnelId)) {
        setSelectedFunnelId(savedFunnelId);
      } else if (predeterminedFunnels.length > 0) {
        setSelectedFunnelId(predeterminedFunnels[0].id);
        localStorage.setItem('rendizy_selected_predetermined_funnel', predeterminedFunnels[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar funis pré-determinados:', error);
      toast.error('Erro ao carregar funis pré-determinados');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar tickets do funil selecionado
  useEffect(() => {
    if (selectedFunnelId) {
      loadTickets(selectedFunnelId);
    }
  }, [selectedFunnelId]);

  const loadTickets = async (funnelId: string) => {
    try {
      const response = await servicesTicketsApi.list(funnelId);
      if (response.success && response.data) {
        // Filtrar apenas tickets do tipo PREDETERMINED (ou todos se não houver filtro)
        setTickets(response.data);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      setTickets([]);
    }
  };

  const handleTicketUpdate = async (updatedTicket: ServiceTicket) => {
    try {
      // Salvar atualização no backend
      const response = await servicesTicketsApi.update(updatedTicket.id, updatedTicket);
      if (response.success && response.data) {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? response.data! : t));
        if (selectedTicket?.id === updatedTicket.id) {
          setSelectedTicket(response.data);
        }
        toast.success('Ticket atualizado com sucesso!');
      } else {
        // Fallback: atualizar apenas localmente se API falhar
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        if (selectedTicket?.id === updatedTicket.id) {
          setSelectedTicket(updatedTicket);
        }
        console.warn('Erro ao salvar no backend, atualizado localmente:', response.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
      // Fallback: atualizar apenas localmente
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      if (selectedTicket?.id === updatedTicket.id) {
        setSelectedTicket(updatedTicket);
      }
      toast.error('Erro ao salvar atualização');
    }
  };

  const handleCreateTicket = async (ticketData: Partial<ServiceTicket>) => {
    if (!selectedFunnelId) return;

    try {
      const response = await servicesTicketsApi.create({
        ...ticketData,
        funnelId: selectedFunnelId,
        stageId: selectedFunnel?.stages[0]?.id || '',
      } as any);

      if (response.success && response.data) {
        toast.success('Ticket criado com sucesso!');
        setIsCreateModalOpen(false);
        loadTickets(selectedFunnelId);
        if (response.data) {
          setSelectedTicket(response.data);
        }
      } else {
        toast.error(response.error || 'Erro ao criar ticket');
      }
    } catch (error: any) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao criar ticket');
    }
  };

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);

  const filteredFunnels = funnels.filter(funnel => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      funnel.name.toLowerCase().includes(query) ||
      funnel.description?.toLowerCase().includes(query)
    );
  });

  // Selecionar primeiro ticket se não houver selecionado
  const displayTicket = selectedTicket || (tickets.length > 0 ? tickets[0] : undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Carregando funis pré-determinados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Funis Pré-determinados</h1>
            <p className="text-sm text-gray-500 mt-1">
              Processos sequenciais tipo wizard (ex: vistoria, implantação)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'wizard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('wizard')}
            >
              <Grid3x3 className="w-4 h-4 mr-2" />
              Wizard
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              Lista
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingFunnel(null);
                setIsBuilderOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Processo
            </Button>
            {selectedFunnel && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingFunnel(selectedFunnel);
                  setIsBuilderOpen(true);
                }}
              >
                Editar Processo
              </Button>
            )}
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Ticket
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Funil:</label>
            <Select
              value={selectedFunnelId || ''}
              onValueChange={(value) => {
                setSelectedFunnelId(value);
                localStorage.setItem('rendizy_selected_predetermined_funnel', value);
              }}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Selecione um funil..." />
              </SelectTrigger>
              <SelectContent>
                {filteredFunnels.map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    <div className="flex items-center gap-2">
                      {funnel.isGlobalDefault && (
                        <Globe className="w-4 h-4 text-purple-600" />
                      )}
                      <span>{funnel.name}</span>
                      {funnel.isGlobalDefault && (
                        <Badge variant="outline" className="ml-2">Global</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar processos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {selectedFunnel ? (
          <>
            {viewMode === 'wizard' ? (
              <PredeterminedFunnelView
                funnel={selectedFunnel}
                ticket={displayTicket}
                onStageClick={(stage, index) => {
                  // Ao clicar em uma etapa, pode abrir detalhes ou permitir interação
                  if (displayTicket) {
                    setSelectedTicket(displayTicket);
                  }
                }}
                onViewTicketDetails={() => {
                  if (displayTicket) {
                    setSelectedTicket(displayTicket);
                  }
                }}
                onCreateTicket={() => setIsCreateModalOpen(true)}
                onTicketUpdate={handleTicketUpdate}
                currentUser={
                  user
                    ? {
                        id: user.id,
                        name: user.name || user.email || 'Usuário',
                        avatar: user.avatar,
                      }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold">{selectedFunnel.name}</h2>
                      {selectedFunnel.description && (
                        <p className="text-sm text-gray-500 mt-1">{selectedFunnel.description}</p>
                      )}
                    </div>
                    {selectedFunnel.isGlobalDefault && (
                      <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                        <Globe className="w-3 h-3 mr-1" />
                        Global
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Etapas do Processo:</h3>
                      <div className="space-y-2">
                        {selectedFunnel.stages.map((stage, index) => (
                          <div
                            key={stage.id}
                            className="flex items-center gap-3 p-3 border rounded-lg"
                            style={{ borderLeftColor: stage.color, borderLeftWidth: '4px' }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{stage.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Etapa {index + 1}
                                </Badge>
                              </div>
                              {stage.description && (
                                <p className="text-sm text-gray-500 mt-1">{stage.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Tickets */}
                {tickets.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Tickets ({tickets.length}):</h3>
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{ticket.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {ticket.description || 'Sem descrição'}
                            </p>
                          </div>
                          <Badge variant="outline">{ticket.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-4">Nenhum funil pré-determinado selecionado</p>
              <Button onClick={loadFunnels}>
                Carregar Funis
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Ticket */}
      {selectedTicket && selectedFunnel && (
        <ServicesTicketDetail
          ticket={selectedTicket}
          funnel={selectedFunnel}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdate}
        />
      )}

      {/* Modal de Criar Ticket */}
      {selectedFunnel && (
        <CreateTicketModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateTicket}
          funnel={selectedFunnel}
        />
      )}

      {/* Modal de Construtor de Processos */}
      <PredeterminedFunnelBuilder
        open={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingFunnel(null);
        }}
        onSave={async (funnel) => {
          try {
            const response = funnel.id && funnels.some(f => f.id === funnel.id)
              ? await funnelsApi.update(funnel.id, funnel)
              : await funnelsApi.create(funnel);

            if (response.success && response.data) {
              toast.success('Processo salvo com sucesso!');
              await loadFunnels();
              if (response.data) {
                setSelectedFunnelId(response.data.id);
              }
            } else {
              toast.error(response.error || 'Erro ao salvar processo');
            }
          } catch (error: any) {
            console.error('Erro ao salvar processo:', error);
            toast.error('Erro ao salvar processo');
          }
        }}
        existingFunnel={editingFunnel || undefined}
      />
    </div>
  );
}

