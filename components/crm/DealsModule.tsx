import React, { useState, useEffect } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { DealsListView } from './DealsListView';
import { DealDetail } from './DealDetail';
import { Deal } from '../../types/crm';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Plus, Sparkles, Grid3x3, List } from 'lucide-react';
import { dealsApi } from '../../utils/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function DealsModule() {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar deals da API
  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    setIsLoading(true);
    try {
      const response = await dealsApi.list();
      if (response.success && response.data) {
        setDeals(response.data);
      } else {
        // Fallback para dados mock se API não estiver disponível
        console.warn('API não disponível, usando dados mock');
        setDeals(getMockDeals());
      }
    } catch (error) {
      console.error('Erro ao carregar deals:', error);
      toast.error('Erro ao carregar deals. Usando dados mock.');
      setDeals(getMockDeals());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockDeals = (): Deal[] => [
    {
      id: '1',
      title: 'Rafael Teste Deal',
      value: 12000,
      currency: 'BRL',
      stage: 'QUALIFIED',
      source: 'WHATSAPP',
      probability: 75,
      contactName: 'Rafael Milfont',
      ownerName: 'Rafael Milfont',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Website Redesign',
      value: 15000,
      currency: 'BRL',
      stage: 'QUALIFIED',
      source: 'WHATSAPP',
      probability: 80,
      contactName: 'Tech Corp',
      ownerName: 'Rafael Milfont',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Consulting Project',
      value: 4500,
      currency: 'BRL',
      stage: 'CONTACT_MADE',
      source: 'EMAIL',
      probability: 70,
      contactName: 'Ana Silva',
      ownerName: 'Rafael Milfont',
      expectedCloseDate: '2025-11-30',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Airbnb Integration',
      value: 800,
      currency: 'USD',
      stage: 'MEETING_ARRANGED',
      source: 'AIRBNB',
      probability: 60,
      contactName: 'John Doe',
      ownerName: 'Rafael Milfont',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
  };

  const handleCloseDetail = () => {
    setSelectedDeal(null);
  };

  const handleDealUpdate = async (updatedDeal: Deal) => {
    try {
      const response = await dealsApi.update(updatedDeal.id, updatedDeal);
      if (response.success && response.data) {
        setDeals(prev => prev.map(d => d.id === updatedDeal.id ? response.data! : d));
        if (selectedDeal?.id === updatedDeal.id) {
          setSelectedDeal(response.data);
        }
        toast.success('Deal atualizado com sucesso');
      } else {
        throw new Error(response.error || 'Erro ao atualizar deal');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar deal:', error);
      toast.error(error.message || 'Erro ao atualizar deal');
      // Atualizar localmente mesmo em caso de erro
      setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
      if (selectedDeal?.id === updatedDeal.id) {
        setSelectedDeal(updatedDeal);
      }
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Deals
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800">
              <Sparkles className="w-4 h-4 mr-2" />
              AI chat
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search Pipedrive"
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
              <SelectItem value="consulting">Consulting and agencies</SelectItem>
              <SelectItem value="real-estate">Real Estate</SelectItem>
              <SelectItem value="hospitality">Hospitality</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
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
            searchQuery={searchQuery}
          />
        ) : (
          <DealsListView
            deals={deals}
            onDealClick={handleDealClick}
            onDealUpdate={handleDealUpdate}
          />
        )}
      </div>
    </div>
  );
}

