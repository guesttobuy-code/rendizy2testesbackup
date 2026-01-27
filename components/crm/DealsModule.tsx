import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KanbanBoard } from './KanbanBoard';
import { DealsListView } from './DealsListView';
import { DealDetail } from './DealDetail';
import { FunnelSelector } from './FunnelSelector';
import { Deal } from '../../types/crm';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Plus, Grid3x3, List, Check, User, Mail, Phone, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
// ✅ API MODULAR - Separada por módulo (Sales, Services, Predetermined)
import { crmSalesApi, SalesFunnel, SalesDeal } from '../../utils/api-crm-sales';

// Estado inicial para novo deal
const initialNewDeal = {
  title: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  value: 0,
  description: '',
  expectedCloseDate: '',
  source: 'manual',
};

export function DealsModule() {
  // ✅ URL STATE SYNC - Sincroniza estado com URL params
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [urlInitialized, setUrlInitialized] = useState(false);
  
  // Estado para funis de vendas (API modular)
  const [salesFunnels, setSalesFunnels] = useState<SalesFunnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  
  // ✅ Estado para modal de novo deal
  const [newDealModalOpen, setNewDealModalOpen] = useState(false);
  const [newDeal, setNewDeal] = useState(initialNewDeal);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);

  // ✅ SYNC URL → STATE: Ler parâmetros da URL na inicialização
  useEffect(() => {
    const funnelParam = searchParams.get('funnel');
    const dealParam = searchParams.get('deal');
    const viewParam = searchParams.get('view');
    
    if (viewParam === 'kanban' || viewParam === 'list') {
      setViewMode(viewParam);
    }
    
    // Marcar como inicializado para permitir sincronização STATE → URL
    if (!urlInitialized && salesFunnels.length > 0) {
      if (funnelParam) {
        const funnelExists = salesFunnels.find(f => f.id === funnelParam);
        if (funnelExists) {
          setSelectedFunnelId(funnelParam);
        }
      }
      setUrlInitialized(true);
    }
  }, [searchParams, salesFunnels, urlInitialized]);

  // ✅ SYNC URL → DEAL: Abrir deal da URL após carregar deals
  useEffect(() => {
    const dealParam = searchParams.get('deal');
    if (dealParam && deals.length > 0 && !selectedDeal) {
      const dealFromUrl = deals.find(d => d.id === dealParam);
      if (dealFromUrl) {
        setSelectedDeal(dealFromUrl);
      }
    }
  }, [searchParams, deals, selectedDeal]);

  // ✅ SYNC STATE → URL: Atualizar URL quando estado mudar
  const updateUrl = useCallback((updates: { funnel?: string | null; deal?: string | null; view?: string }) => {
    const params = new URLSearchParams(searchParams);
    
    if (updates.funnel !== undefined) {
      if (updates.funnel) {
        params.set('funnel', updates.funnel);
      } else {
        params.delete('funnel');
      }
    }
    
    if (updates.deal !== undefined) {
      if (updates.deal) {
        params.set('deal', updates.deal);
      } else {
        params.delete('deal');
      }
    }
    
    if (updates.view) {
      params.set('view', updates.view);
    }
    
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // ✅ COPIAR LINK DO DEAL
  const copyDealLink = useCallback((dealId: string) => {
    const params = new URLSearchParams();
    if (selectedFunnelId) params.set('funnel', selectedFunnelId);
    params.set('deal', dealId);
    
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copiado para área de transferência!', {
        icon: <Check className="w-4 h-4 text-green-500" />,
      });
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  }, [selectedFunnelId]);

  // Carregar funis de vendas
  useEffect(() => {
    loadSalesFunnels();
  }, []);

  const loadSalesFunnels = async () => {
    try {
      // ✅ API MODULAR: crmSalesApi.funnels.list()
      const response = await crmSalesApi.funnels.list();
      if (response.success && Array.isArray(response.data)) {
        setSalesFunnels(response.data);
        
        // Checar se há funil na URL
        const funnelFromUrl = searchParams.get('funnel');
        let funnelToSelect: string | null = null;
        
        if (funnelFromUrl && response.data.find(f => f.id === funnelFromUrl)) {
          funnelToSelect = funnelFromUrl;
        } else {
          // Selecionar funil default ou primeiro disponível
          const defaultFunnel = response.data.find(f => f.is_default);
          funnelToSelect = defaultFunnel?.id || response.data[0]?.id || null;
        }
        
        setSelectedFunnelId(funnelToSelect);
        
        if (response.data.length === 0) {
          console.log('[SALES] Nenhum funil encontrado - execute a migration');
          toast.info('Nenhum funil encontrado. Execute a migration SQL.');
        }
      } else {
        console.warn('[SALES] Erro ao carregar funis:', response.error);
        toast.error('Erro ao carregar funis de vendas');
      }
    } catch (error) {
      console.error('[SALES] Erro ao carregar funis:', error);
      toast.error('Erro ao conectar com API de vendas');
    }
  };

  const handleFunnelChange = (funnelId: string) => {
    setSelectedFunnelId(funnelId);
    updateUrl({ funnel: funnelId, deal: null }); // Limpar deal ao mudar funil
    // Recarregar deals quando mudar de funil
    loadDeals(funnelId);
  };

  // Obter funil selecionado com memoização para garantir re-render quando stages mudam
  const selectedFunnel = React.useMemo(() => {
    return salesFunnels.find(f => f.id === selectedFunnelId);
  }, [salesFunnels, selectedFunnelId]);

  // Carregar deals da API
  useEffect(() => {
    if (selectedFunnelId) {
      loadDeals(selectedFunnelId);
    }
  }, [selectedFunnelId]);

  const loadDeals = async (funnelId?: string) => {
    setIsLoading(true);
    try {
      // ✅ API MODULAR: crmSalesApi.deals.list()
      const response = await crmSalesApi.deals.list({ funnel_id: funnelId });
      if (response.success && Array.isArray(response.data)) {
        // Converter SalesDeal para Deal format usado pelo componente
        const mappedDeals: Deal[] = response.data.map(d => ({
          id: d.id,
          title: d.title,
          value: d.value,
          currency: d.currency,
          stage: d.stage_id, // Usar stage_id do banco
          source: d.source as any,
          probability: d.probability,
          contactName: d.contact_name,
          contactEmail: d.contact_email,
          contactPhone: d.contact_phone,
          contactWhatsAppJid: d.contact_whatsapp_jid,
          ownerName: d.owner_name,
          expectedCloseDate: d.expected_close_date,
          description: d.description,
          tags: d.tags,
          notes: d.notes,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        setDeals(mappedDeals);
        if (mappedDeals.length === 0) {
          console.log('[SALES] Nenhum deal encontrado para este funil');
        }
      } else {
        console.warn('[SALES] Erro ao carregar deals:', response.error);
        setDeals([]);
      }
    } catch (error) {
      console.error('[SALES] Erro ao carregar deals:', error);
      toast.error('Erro ao carregar deals');
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    updateUrl({ deal: deal.id }); // ✅ Atualizar URL com deal
  };

  const handleCloseDetail = () => {
    setSelectedDeal(null);
    updateUrl({ deal: null }); // ✅ Remover deal da URL
  };

  const handleDealUpdate = async (updatedDeal: Deal) => {
    try {
      // ✅ API MODULAR: crmSalesApi.deals.update()
      const response = await crmSalesApi.deals.update(updatedDeal.id, {
        stage_id: updatedDeal.stage,
        title: updatedDeal.title,
        value: updatedDeal.value,
        probability: updatedDeal.probability,
        contact_name: updatedDeal.contactName,
        contact_email: updatedDeal.contactEmail,
        contact_phone: updatedDeal.contactPhone,
        description: updatedDeal.description,
        notes: updatedDeal.notes,
      });
      if (response.success && response.data) {
        // Recarregar deals para garantir consistência
        if (selectedFunnelId) {
          loadDeals(selectedFunnelId);
        }
        if (selectedDeal?.id === updatedDeal.id) {
          setSelectedDeal(updatedDeal);
        }
        toast.success('Deal atualizado com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao atualizar deal');
      }
    } catch (error: any) {
      console.error('[SALES] Erro ao atualizar deal:', error);
      toast.error(error.message || 'Erro ao atualizar deal');
      // Atualizar localmente mesmo em caso de erro
      setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
      if (selectedDeal?.id === updatedDeal.id) {
        setSelectedDeal(updatedDeal);
      }
    }
  };

  // ✅ CRIAR NOVO DEAL
  const handleCreateDeal = async () => {
    if (!newDeal.title.trim()) {
      toast.error('Nome do negócio é obrigatório');
      return;
    }

    if (!selectedFunnelId || !selectedFunnel?.stages?.length) {
      toast.error('Selecione um funil com etapas');
      return;
    }

    setIsCreatingDeal(true);
    try {
      // Usar primeira etapa do funil como stage inicial
      const firstStage = selectedFunnel.stages.sort((a, b) => a.order - b.order)[0];

      const response = await crmSalesApi.deals.create({
        funnel_id: selectedFunnelId,
        stage_id: firstStage.id,
        title: newDeal.title.trim(),
        contact_name: newDeal.contactName.trim() || undefined,
        contact_email: newDeal.contactEmail.trim() || undefined,
        contact_phone: newDeal.contactPhone.trim() || undefined,
        value: newDeal.value || 0,
        description: newDeal.description.trim() || undefined,
        expected_close_date: newDeal.expectedCloseDate || undefined,
        source: newDeal.source,
      });

      if (response.success && response.data) {
        toast.success('Negócio criado com sucesso!');
        setNewDealModalOpen(false);
        setNewDeal(initialNewDeal);
        // Recarregar deals
        loadDeals(selectedFunnelId);
      } else {
        throw new Error(response.error || 'Erro ao criar negócio');
      }
    } catch (error: any) {
      console.error('[SALES] Erro ao criar deal:', error);
      toast.error(error.message || 'Erro ao criar negócio');
    } finally {
      setIsCreatingDeal(false);
    }
  };

  if (selectedDeal) {
    return (
      <DealDetail
        deal={selectedDeal}
        onClose={handleCloseDetail}
        onUpdate={handleDealUpdate}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 pt-14">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedFunnel?.name || 'Vendas'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Seletor de Funil + Gestão */}
            <FunnelSelector
              type="SALES"
              selectedFunnelId={selectedFunnelId}
              onFunnelChange={handleFunnelChange}
              funnels={salesFunnels}
              onFunnelsUpdate={(updatedFunnels) => {
                // ✅ Atualizar funis E forçar refresh visual
                setSalesFunnels(updatedFunnels);
                // Se o funil editado é o selecionado, forçar refresh dos deals
                const editedFunnel = updatedFunnels.find(f => f.id === selectedFunnelId);
                if (editedFunnel) {
                  console.log('[SALES] Funil atualizado com novas stages:', editedFunnel.stages?.length);
                }
              }}
            />
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
            <Button 
              size="sm" 
              onClick={() => setNewDealModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Negócio
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar vendas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="consulting">Consultoria e agências</SelectItem>
              <SelectItem value="real-estate">Imóveis</SelectItem>
              <SelectItem value="hospitality">Hospitalidade</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setViewMode('kanban'); updateUrl({ view: 'kanban' }); }}
              className="h-8"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setViewMode('list'); updateUrl({ view: 'list' }); }}
              className="h-8"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Carregando deals...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            deals={deals}
            onDealClick={handleDealClick}
            onDealUpdate={handleDealUpdate}
            onCopyDealLink={copyDealLink}
            searchQuery={searchQuery}
            stages={selectedFunnel?.stages}
          />
        ) : (
          <DealsListView
            deals={deals}
            onDealClick={handleDealClick}
            onDealUpdate={handleDealUpdate}
            onCopyDealLink={copyDealLink}
          />
        )}
      </div>

      {/* Modal de Novo Negócio */}
      <Dialog open={newDealModalOpen} onOpenChange={setNewDealModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Novo Negócio
            </DialogTitle>
            <DialogDescription>
              Criar negócio no funil "{selectedFunnel?.name}". Será adicionado na primeira etapa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Nome do Negócio */}
            <div className="space-y-2">
              <Label htmlFor="deal-title" className="flex items-center gap-2">
                <span className="text-red-500">*</span> Nome do Negócio
              </Label>
              <Input
                id="deal-title"
                value={newDeal.title}
                onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Venda Apartamento Centro"
                autoFocus
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="deal-value" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                Valor (R$)
              </Label>
              <Input
                id="deal-value"
                type="number"
                min={0}
                value={newDeal.value || ''}
                onChange={(e) => setNewDeal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            {/* Contato */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="deal-contact" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Nome do Contato
                </Label>
                <Input
                  id="deal-contact"
                  value={newDeal.contactName}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Telefone
                </Label>
                <Input
                  id="deal-phone"
                  value={newDeal.contactPhone}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email
              </Label>
              <Input
                id="deal-email"
                type="email"
                value={newDeal.contactEmail}
                onChange={(e) => setNewDeal(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Data Prevista de Fechamento */}
            <div className="space-y-2">
              <Label htmlFor="deal-date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Previsão de Fechamento
              </Label>
              <Input
                id="deal-date"
                type="date"
                value={newDeal.expectedCloseDate}
                onChange={(e) => setNewDeal(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="deal-description">Descrição</Label>
              <Textarea
                id="deal-description"
                value={newDeal.description}
                onChange={(e) => setNewDeal(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes sobre este negócio..."
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setNewDealModalOpen(false);
                  setNewDeal(initialNewDeal);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateDeal}
                disabled={isCreatingDeal || !newDeal.title.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCreatingDeal ? 'Criando...' : 'Criar Negócio'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

