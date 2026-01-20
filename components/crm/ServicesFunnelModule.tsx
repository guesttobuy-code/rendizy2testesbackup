import React, { useState, useEffect } from 'react';
import { ServiceTicket, Funnel, FunnelStage } from '../../types/funnels';
import { ServicesKanbanBoard } from './ServicesKanbanBoard';
import { ServicesTicketDetail } from './ServicesTicketDetail';
import { CreateTicketModal } from './CreateTicketModal';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Plus, Grid3x3, List, Globe } from 'lucide-react';
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

export function ServicesFunnelModule() {
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [allFunnels, setAllFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar funis disponíveis e selecionar o ativo
  useEffect(() => {
    loadFunnels();
  }, []);

  // Carregar tickets quando o funil selecionado mudar
  useEffect(() => {
    if (selectedFunnelId && funnel) {
      loadTickets(selectedFunnelId);
    }
  }, [selectedFunnelId, funnel]);

  const loadFunnels = async () => {
    setIsLoading(true);
    try {
      // Carregar todos os funis do tipo SERVICES
      const response = await funnelsApi.list();
      let servicesFunnels: Funnel[] = [];
      let globalFunnels: Funnel[] = [];

      if (response.success && response.data) {
        const allFunnels = response.data;
        // Separar funis globais dos funis da organização
        globalFunnels = allFunnels.filter(f => f.type === 'SERVICES' && f.isGlobalDefault === true);
        servicesFunnels = allFunnels.filter(f => f.type === 'SERVICES' && !f.isGlobalDefault);
      } else {
        // Fallback: usar localStorage
        const savedFunnels = localStorage.getItem('rendizy_funnels');
        if (savedFunnels) {
          const allFunnels = JSON.parse(savedFunnels);
          globalFunnels = allFunnels.filter((f: Funnel) => f.type === 'SERVICES' && f.isGlobalDefault === true);
          servicesFunnels = allFunnels.filter((f: Funnel) => f.type === 'SERVICES' && !f.isGlobalDefault);
        }
      }

      // Combinar: globais primeiro, depois os da organização
      servicesFunnels = [...globalFunnels, ...servicesFunnels];

      // Se não houver funis, criar um padrão
      if (servicesFunnels.length === 0) {
        const defaultFunnel: Funnel = {
          id: 'services-default',
          organizationId: '',
          name: 'Funil de Serviços',
          type: 'SERVICES',
          description: 'Gestão de tickets e resolução de problemas',
          stages: [
            { id: '1', funnelId: 'services-default', name: 'Triagem', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
            { id: '2', funnelId: 'services-default', name: 'Em Análise', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
            { id: '3', funnelId: 'services-default', name: 'Em Resolução', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
            { id: '4', funnelId: 'services-default', name: 'Aguardando Cliente', order: 4, color: '#6366f1', createdAt: new Date().toISOString() },
            { id: '5', funnelId: 'services-default', name: 'Resolvido', order: 5, color: '#10b981', createdAt: new Date().toISOString() },
            { id: '6', funnelId: 'services-default', name: 'Não Resolvido', order: 6, color: '#ef4444', createdAt: new Date().toISOString() },
          ],
          statusConfig: {
            resolvedStatus: 'Resolvido',
            unresolvedStatus: 'Não Resolvido',
            inProgressStatus: 'Em Análise',
          },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        servicesFunnels = [defaultFunnel];
      }

      setAllFunnels(servicesFunnels);

      // Selecionar funil salvo ou o primeiro disponível
      const savedFunnelId = localStorage.getItem('rendizy_selected_services_funnel');
      const funnelToSelect = savedFunnelId && servicesFunnels.find(f => f.id === savedFunnelId)
        ? savedFunnelId
        : servicesFunnels[0]?.id || null;

      setSelectedFunnelId(funnelToSelect);
      const selectedFunnel = servicesFunnels.find(f => f.id === funnelToSelect);
      if (selectedFunnel) {
        setFunnel(selectedFunnel);
        if (funnelToSelect) {
          localStorage.setItem('rendizy_selected_services_funnel', funnelToSelect);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      toast.error('Erro ao carregar funis. Usando funil padrão.');
      // Criar funil padrão em caso de erro
      const defaultFunnel: Funnel = {
        id: 'services-default',
        organizationId: '',
        name: 'Funil de Serviços',
        type: 'SERVICES',
        description: 'Gestão de tickets e resolução de problemas',
        stages: [
          { id: '1', funnelId: 'services-default', name: 'Triagem', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
          { id: '2', funnelId: 'services-default', name: 'Em Análise', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
          { id: '3', funnelId: 'services-default', name: 'Em Resolução', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
          { id: '4', funnelId: 'services-default', name: 'Aguardando Cliente', order: 4, color: '#6366f1', createdAt: new Date().toISOString() },
          { id: '5', funnelId: 'services-default', name: 'Resolvido', order: 5, color: '#10b981', createdAt: new Date().toISOString() },
          { id: '6', funnelId: 'services-default', name: 'Não Resolvido', order: 6, color: '#ef4444', createdAt: new Date().toISOString() },
        ],
        statusConfig: {
          resolvedStatus: 'Resolvido',
          unresolvedStatus: 'Não Resolvido',
          inProgressStatus: 'Em Análise',
        },
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAllFunnels([defaultFunnel]);
      setSelectedFunnelId(defaultFunnel.id);
      setFunnel(defaultFunnel);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTickets = async (funnelId: string) => {
    try {
      // Tentar carregar da API
      const response = await servicesTicketsApi.list(funnelId);
      if (response.success && response.data) {
        setTickets(response.data);
      } else {
        // Fallback: usar dados mock filtrados por funil
        const mockTickets = getMockTickets();
        setTickets(mockTickets.filter(t => t.funnelId === funnelId));
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      // Fallback: usar dados mock
      const mockTickets = getMockTickets();
      setTickets(mockTickets.filter(t => t.funnelId === funnelId));
    }
  };

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    localStorage.setItem('rendizy_selected_services_funnel', funnelId);
    const selectedFunnel = allFunnels.find(f => f.id === funnelId);
    if (selectedFunnel) {
      setFunnel(selectedFunnel);
      setSelectedTicket(null); // Fechar modal de detalhes ao trocar funil
    }
  };

  const getMockTickets = (): ServiceTicket[] => [
    {
      id: '3',
      organizationId: '',
      funnelId: 'services-default',
      stageId: '1',
      title: 'Implantação teste',
      description: 'Ticket de teste para validar funcionalidades de tarefas e subtarefas no sistema',
      status: 'PENDING',
      priority: 'high',
      assignedTo: 'user1',
      assignedToName: 'João Silva',
      createdBy: 'user1',
      createdByName: 'Sistema',
      progress: 0,
      tasks: [],
      currency: 'BRL',
      products: [
        {
          id: 'prod1',
          name: 'Manutenção de ar condicionado',
          quantity: 2,
          price: 6000,
          description: 'Serviço completo de manutenção preventiva',
        },
      ],
      hideProducts: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '1',
      organizationId: '',
      funnelId: 'services-default',
      stageId: '1',
      title: 'Problema com Check-in - Apartamento 201',
      description: 'Cliente não consegue acessar o cofre de chaves',
      status: 'IN_ANALYSIS',
      priority: 'high',
      assignedTo: 'user1',
      assignedToName: 'João Silva',
      createdBy: 'user1',
      createdByName: 'Sistema',
      progress: 33, // Calculado automaticamente
      tasks: [
        {
          id: 't1',
          ticketId: '1',
          stageId: '1', // ✅ VINCULADO À ETAPA
          type: 'STANDARD', // ✅ TIPO DE TAREFA
          title: 'Verificar código do cofre',
          status: 'IN_PROGRESS',
          assignedTo: 'user1',
          assignedToName: 'João Silva',
          subtasks: [
            { id: 'st1', taskId: 't1', title: 'Contatar cliente para obter código', status: 'COMPLETED', order: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'st2', taskId: 't1', title: 'Testar código no cofre', status: 'IN_PROGRESS', order: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 't2',
          ticketId: '1',
          stageId: '1', // ✅ VINCULADO À ETAPA
          type: 'FORM', // ✅ TIPO FORMULÁRIO
          title: 'Cliente responde formulário',
          status: 'TODO',
          formData: {
            completed: false,
          },
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subtasks: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      organizationId: '',
      funnelId: 'services-default',
      stageId: '2',
      title: 'Manutenção - Ar condicionado não funciona',
      description: 'Cliente reportou que o ar condicionado da sala não está funcionando',
      status: 'IN_ANALYSIS',
      priority: 'medium',
      assignedTo: 'user2',
      assignedToName: 'Maria Santos',
      createdBy: 'user1',
      createdByName: 'Sistema',
      progress: 0,
      tasks: [
        {
          id: 't3',
          ticketId: '2',
          stageId: '2', // ✅ VINCULADO À ETAPA
          type: 'ATTACHMENT', // ✅ TIPO ANEXO
          title: 'Enviar documentos',
          status: 'TODO',
          attachments: {
            files: [],
          },
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subtasks: [],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const handleTicketUpdate = async (updatedTicket: ServiceTicket) => {
    try {
      // TODO: Atualizar via API
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      if (selectedTicket?.id === updatedTicket.id) {
        setSelectedTicket(updatedTicket);
      }
      toast.success('Ticket atualizado com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar ticket:', error);
      toast.error(error.message || 'Erro ao atualizar ticket');
    }
  };

  const handleTicketClick = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
  };

  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  const handleCreateTicket = () => {
    setCreateTicketOpen(true);
  };

  const handleTicketCreated = (newTicket: ServiceTicket) => {
    setTickets(prev => [...prev, newTicket]);
    setCreateTicketOpen(false);
  };

  if (!funnel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Carregando funil de serviços...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            {/* Seletor de Funil */}
            <div className="flex items-center gap-3 mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Funil:
              </label>
              <Select
                value={selectedFunnelId || ''}
                onValueChange={handleFunnelChange}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione um funil" />
                </SelectTrigger>
                <SelectContent>
                  {allFunnels.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{f.name}</span>
                          {f.isGlobalDefault && (
                            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </div>
                        {f.description && (
                          <span className="text-xs text-gray-500">{f.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Informações do Funil Selecionado */}
            {funnel && (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {funnel.name}
                </h1>
                {funnel.description && (
                  <p className="text-sm text-gray-500 mt-1">{funnel.description}</p>
                )}
              </div>
            )}
          </div>
          <Button onClick={handleCreateTicket}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Ticket
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'kanban' | 'list')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kanban">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Kanban
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Lista
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando tickets...</p>
          </div>
        ) : (
          <ServicesKanbanBoard
            funnel={funnel}
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onTicketUpdate={handleTicketUpdate}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && funnel && (
        <ServicesTicketDetail
          ticket={selectedTicket}
          funnel={funnel}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdate}
        />
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={createTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
        onSuccess={handleTicketCreated}
        funnel={funnel}
      />
    </div>
  );
}

