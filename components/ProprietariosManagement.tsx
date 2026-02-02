/**
 * RENDIZY - Proprietários Management
 * Sistema de gestão de proprietários de imóveis com:
 * - 3 tipos de contrato (exclusividade, não exclusivo, temporário)
 * - Dados bancários completos
 * - Sistema de comissões
 * - Sistema premium
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { toast } from 'sonner';
import { useAutoSave } from '../hooks/useAutoSave';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import {
  Building2,
  UserPlus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  TrendingUp,
  Crown,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Award,
  X
} from 'lucide-react';
import { cn } from './ui/utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Types
type ContractType = 'exclusivity' | 'non_exclusive' | 'temporary';
type OwnerStatus = 'active' | 'inactive';

type PropertyListItem = {
  id: string;
  internalId?: string;
  name?: string;
  title?: string;
  location?: string;
  tags?: string[];
};

interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  cpf?: string;
  rg?: string;
  profissao?: string;
  rendaMensal?: number;
  
  // Tipo de Contrato
  contractType: ContractType;
  contractStartDate?: string;
  contractEndDate?: string;
  
  // Dados Bancários
  bankData?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: 'corrente' | 'poupanca';
    chavePix?: string;
  };
  
  // Comissões
  taxaComissao?: number;
  formaPagamentoComissao?: string;
  
  // Premium
  isPremium: boolean;

  // Imóveis vinculados
  propertyIds?: string[];
  
  // Estatísticas
  stats?: {
    totalProperties?: number;
    activeProperties?: number;
    totalRevenue?: number;
  };
  
  status: OwnerStatus;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

const contractTypeLabels: Record<ContractType, string> = {
  exclusivity: 'Exclusividade',
  non_exclusive: 'Não Exclusivo',
  temporary: 'Temporário'
};

const contractTypeColors: Record<ContractType, string> = {
  exclusivity: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  non_exclusive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  temporary: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
};

export function ProprietariosManagement() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | ContractType | 'premium' | OwnerStatus>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Owner>>({
    contractType: 'non_exclusive',
    status: 'active',
    isPremium: false,
    propertyIds: []
  });

  // Auto-save
  const { saveStatus, triggerSave } = useAutoSave(formData, {
    onSave: async (data) => {
      if (editModalOpen && selectedOwner) {
        await handleUpdateOwner(selectedOwner.id, data);
      }
    },
    debounceMs: 2000
  });

  // Load owners
  useEffect(() => {
    loadOwners();
    loadProperties();
  }, []);

  const NONE_MARKER = '__NONE__';

  const getPropertyLabel = (property: PropertyListItem) =>
    property.internalId || property.name || property.title || 'Sem nome';

  const filteredProperties = properties.filter((property) => {
    const query = propertySearchQuery.toLowerCase();
    return (
      getPropertyLabel(property).toLowerCase().includes(query) ||
      (property.location?.toLowerCase() || '').includes(query)
    );
  });

  const selectAllProperties = () => {
    const ids = filteredProperties.map((p) => p.id);
    setSelectedProperties(ids);
  };

  const deselectAllProperties = () => {
    setSelectedProperties([NONE_MARKER]);
  };

  const isPropertySelected = (id: string) =>
    selectedProperties.length > 0 &&
    !(selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) &&
    selectedProperties.includes(id);

  const toggleProperty = (id: string) => {
    if (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) {
      setSelectedProperties([id]);
      return;
    }
    setSelectedProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const loadOwners = async () => {
    try {
      setLoading(true);
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar proprietários');
      }

      const data = await response.json();
      setOwners(data.owners || []);
    } catch (error) {
      console.error('Erro ao carregar proprietários:', error);
      toast.error('Erro ao carregar proprietários');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties/lista`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar imóveis');
      }

      const data = await response.json();
      const rows = Array.isArray(data?.anuncios) ? data.anuncios : [];
      const mapped: PropertyListItem[] = rows.map((item: any) => ({
        id: item.id,
        internalId: item.data?.internalId || item.data?.internal_id || item.data?.identificacao_interna,
        name: item.data?.title || item.title,
        title: item.data?.title || item.title,
        location: item.data?.address_city || item.data?.location || item.data?.address?.city,
        tags: item.data?.tags || [],
      })).filter((p: PropertyListItem) => p.id);

      setProperties(mapped);
    } catch (error) {
      console.error('Erro ao carregar imóveis:', error);
      setProperties([]);
    }
  };

  const handleCreateOwner = async () => {
    try {
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao criar proprietário (detalhes):', errorText);
        let detailMessage = 'Erro ao criar proprietário';
        try {
          const parsed = JSON.parse(errorText);
          detailMessage = parsed?.details || parsed?.error || detailMessage;
        } catch {
          // ignore
        }
        throw new Error(detailMessage);
      }

      toast.success('Proprietário criado com sucesso!');
      setCreateModalOpen(false);
      setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false, propertyIds: [] });
      loadOwners();
    } catch (error) {
      console.error('Erro ao criar proprietário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar proprietário');
    }
  };

  const handleUpdateOwner = async (id: string, data: Partial<Owner>) => {
    try {
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao atualizar proprietário');
      }

      toast.success('Proprietário atualizado com sucesso!');
      loadOwners();
    } catch (error) {
      console.error('Erro ao atualizar proprietário:', error);
      toast.error('Erro ao atualizar proprietário');
    }
  };

  const handleDeleteOwner = async () => {
    if (!selectedOwner) return;

    try {
      const userToken = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners/${selectedOwner.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': userToken || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao deletar proprietário');
      }

      toast.success('Proprietário deletado com sucesso!');
      setDeleteModalOpen(false);
      setSelectedOwner(null);
      loadOwners();
    } catch (error) {
      console.error('Erro ao deletar proprietário:', error);
      toast.error('Erro ao deletar proprietário');
    }
  };

  // Filtros
  const filteredOwners = owners.filter(owner => {
    const matchesSearch = 
      owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.phone.includes(searchQuery) ||
      owner.document.includes(searchQuery);

    const matchesFilter = 
      selectedFilter === 'all' ||
      owner.contractType === selectedFilter ||
      owner.status === selectedFilter ||
      (selectedFilter === 'premium' && owner.isPremium);

    const hasPropertyFilter =
      selectedProperties.length > 0 &&
      !(selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER);

    const matchesProperty = !hasPropertyFilter
      ? true
      : (owner.propertyIds || []).some((id) => selectedProperties.includes(id));

    return matchesSearch && matchesFilter && matchesProperty;
  });

  // Estatísticas
  const stats = {
    total: owners.length,
    exclusivity: owners.filter(o => o.contractType === 'exclusivity').length,
    nonExclusive: owners.filter(o => o.contractType === 'non_exclusive').length,
    temporary: owners.filter(o => o.contractType === 'temporary').length,
    premium: owners.filter(o => o.isPremium).length
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (selectedFilter !== 'all' ? 1 : 0) +
    (selectedProperties.length > 0 && !(selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER) ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedProperties([]);
    setPropertySearchQuery('');
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Filtro Lateral Esquerdo */}
      <div
        className={`border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full self-start sticky top-0 transition-all duration-300 relative ${isCollapsed ? 'w-12' : 'w-80'} overflow-hidden`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-4 right-2 z-20 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          aria-label={isCollapsed ? 'Expandir filtros' : 'Recolher filtros'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Filtros</h3>
                <p className="text-xs text-gray-500">Proprietários</p>
              </div>
            )}
            {!isCollapsed && activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2 text-xs text-gray-500 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {!isCollapsed && (
            <div className="space-y-3 mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros Avançados
                  {activeFiltersCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        {!isCollapsed && showFilters && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'all'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Todos</span>
                <Badge variant="secondary">{stats.total}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('exclusivity')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'exclusivity'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Exclusividade</span>
                <Badge variant="secondary">{stats.exclusivity}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('non_exclusive')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'non_exclusive'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Não Exclusivo</span>
                <Badge variant="secondary">{stats.nonExclusive}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('temporary')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'temporary'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Temporário</span>
                <Badge variant="secondary">{stats.temporary}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('premium')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'premium'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Premium</span>
                <Badge variant="secondary">{stats.premium}</Badge>
              </div>
            </button>

            <button
              onClick={() => setSelectedFilter('active')}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors",
                selectedFilter === 'active'
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Ativos</span>
                <Badge variant="secondary">{owners.filter(o => o.status === 'active').length}</Badge>
              </div>
            </button>

            {/* Propriedades - Multi seleção */}
            <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
              <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex-1 text-left">
                      <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-1 cursor-pointer">
                        Imóveis
                      </Label>
                      {!isPropertiesOpen && (
                        <span className="text-[10px] text-gray-500">
                          {selectedProperties.length === 0 || (selectedProperties.length === 1 && selectedProperties[0] === NONE_MARKER)
                            ? 'Todos'
                            : `${selectedProperties.length} selecionados`}
                        </span>
                      )}
                    </div>
                    {isPropertiesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-800">
                    <div className="relative mt-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por identificação ou cidade..."
                        value={propertySearchQuery}
                        onChange={(e) => setPropertySearchQuery(e.target.value)}
                        className="pl-8 pr-8 h-8 text-xs"
                      />
                      {propertySearchQuery && (
                        <button
                          onClick={() => setPropertySearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>
                        {filteredProperties.length} de {properties.length} selecionados
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="hover:text-blue-600" onClick={selectAllProperties}>
                          Todos
                        </button>
                        <button className="hover:text-blue-600" onClick={deselectAllProperties}>
                          Nenhum
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 max-h-56 overflow-y-auto space-y-2">
                      {filteredProperties.length === 0 ? (
                        <div className="text-xs text-gray-500 py-2">Nenhum imóvel encontrado</div>
                      ) : (
                        filteredProperties.map((property) => (
                          <label
                            key={property.id}
                            className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Checkbox
                              checked={isPropertySelected(property.id)}
                              onCheckedChange={() => toggleProperty(property.id)}
                            />
                            <div className="min-w-0">
                              <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                                {getPropertyLabel(property)}
                              </div>
                              {property.location && (
                                <div className="text-[10px] text-gray-500 truncate">
                                  {property.location}
                                </div>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto">
        {/* Spacer para TopBar */}
        <div className="h-14 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
        
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Proprietários
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Administre informações dos proprietários de imóveis
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Proprietário
            </Button>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </span>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Exclusivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.exclusivity}
                  </span>
                  <Award className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Não Exclusivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.nonExclusive}
                  </span>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Temporário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.temporary}
                  </span>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Premium
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.premium}
                  </span>
                  <Crown className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo de Contrato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredOwners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum proprietário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOwners.map((owner) => (
                      <TableRow key={owner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {owner.name}
                            {owner.isPremium && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={contractTypeColors[owner.contractType]}>
                            {contractTypeLabels[owner.contractType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {owner.email}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {owner.phone}
                        </TableCell>
                        <TableCell>
                          {owner.taxaComissao ? `${owner.taxaComissao}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setViewModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setFormData(owner);
                                setEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Criação */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Proprietário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo proprietário
            </DialogDescription>
          </DialogHeader>

          <OwnerForm
            data={formData}
            onChange={setFormData}
            onSubmit={handleCreateOwner}
            onCancel={() => {
              setCreateModalOpen(false);
              setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false, propertyIds: [] });
            }}
            properties={properties}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proprietário</DialogTitle>
            <DialogDescription>
              Atualize os dados do proprietário
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <AutoSaveIndicator status={saveStatus} />
          </div>

          <OwnerForm
            data={formData}
            onChange={(data) => {
              setFormData(data);
              triggerSave();
            }}
            onSubmit={() => {
              setEditModalOpen(false);
              setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false, propertyIds: [] });
              setSelectedOwner(null);
            }}
            onCancel={() => {
              setEditModalOpen(false);
              setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false, propertyIds: [] });
              setSelectedOwner(null);
            }}
            isEdit
            properties={properties}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Proprietário</DialogTitle>
          </DialogHeader>

          {selectedOwner && (
            <OwnerView owner={selectedOwner} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o proprietário <strong>{selectedOwner?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedOwner(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOwner}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Formulário
function OwnerForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  isEdit = false,
  properties
}: {
  data: Partial<Owner>;
  onChange: (data: Partial<Owner>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  properties: PropertyListItem[];
}) {
  const [propertySearch, setPropertySearch] = useState('');

  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const updateBankField = (field: string, value: any) => {
    onChange({
      ...data,
      bankData: {
        ...(data.bankData || {}),
        [field]: value
      }
    });
  };

  const selectedPropertyIds = data.propertyIds || [];
  const filteredProperties = properties.filter((property) => {
    const query = propertySearch.toLowerCase();
    const label = property.internalId || property.name || property.title || 'Sem nome';
    return (
      label.toLowerCase().includes(query) ||
      (property.location?.toLowerCase() || '').includes(query)
    );
  });

  const toggleProperty = (id: string) => {
    if (selectedPropertyIds.includes(id)) {
      updateField('propertyIds', selectedPropertyIds.filter((p) => p !== id));
    } else {
      updateField('propertyIds', [...selectedPropertyIds, id]);
    }
  };

  const selectAllProperties = () => {
    updateField('propertyIds', filteredProperties.map((p) => p.id));
  };

  const deselectAllProperties = () => {
    updateField('propertyIds', []);
  };

  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <div className="space-y-4">
        <h4 className="font-medium">Dados Básicos</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nome Completo *</Label>
            <Input
              value={data.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={data.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label>Telefone *</Label>
            <Input
              value={data.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>CPF/CNPJ</Label>
            <Input
              value={data.document || ''}
              onChange={(e) => updateField('document', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <Label>RG</Label>
            <Input
              value={data.rg || ''}
              onChange={(e) => updateField('rg', e.target.value)}
              placeholder="00.000.000-0"
            />
          </div>

          <div>
            <Label>Profissão</Label>
            <Input
              value={data.profissao || ''}
              onChange={(e) => updateField('profissao', e.target.value)}
              placeholder="Profissão"
            />
          </div>

          <div>
            <Label>Renda Mensal</Label>
            <Input
              type="number"
              value={data.rendaMensal || ''}
              onChange={(e) => updateField('rendaMensal', parseFloat(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
      </div>

      {/* Tipo de Contrato */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Tipo de Contrato</h4>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <Label>Tipo de Contrato</Label>
            <Select
              value={data.contractType || 'non_exclusive'}
              onValueChange={(value) => updateField('contractType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusivity">Exclusividade</SelectItem>
                <SelectItem value="non_exclusive">Não Exclusivo</SelectItem>
                <SelectItem value="temporary">Temporário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Início do Contrato</Label>
            <Input
              type="date"
              value={data.contractStartDate || ''}
              onChange={(e) => updateField('contractStartDate', e.target.value)}
            />
          </div>

          <div>
            <Label>Fim do Contrato</Label>
            <Input
              type="date"
              value={data.contractEndDate || ''}
              onChange={(e) => updateField('contractEndDate', e.target.value)}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={data.status || 'active'}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dados Bancários */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Dados Bancários</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Banco</Label>
            <Input
              value={data.bankData?.banco || ''}
              onChange={(e) => updateBankField('banco', e.target.value)}
              placeholder="Nome do banco"
            />
          </div>

          <div>
            <Label>Agência</Label>
            <Input
              value={data.bankData?.agencia || ''}
              onChange={(e) => updateBankField('agencia', e.target.value)}
              placeholder="0000-0"
            />
          </div>

          <div>
            <Label>Conta</Label>
            <Input
              value={data.bankData?.conta || ''}
              onChange={(e) => updateBankField('conta', e.target.value)}
              placeholder="00000-0"
            />
          </div>

          <div>
            <Label>Tipo de Conta</Label>
            <Select
              value={data.bankData?.tipoConta || ''}
              onValueChange={(value) => updateBankField('tipoConta', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Chave PIX</Label>
            <Input
              value={data.bankData?.chavePix || ''}
              onChange={(e) => updateBankField('chavePix', e.target.value)}
              placeholder="CPF, email, telefone ou chave aleatória"
            />
          </div>
        </div>
      </div>

      {/* Comissões */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Comissões</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Taxa de Comissão (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.taxaComissao || ''}
              onChange={(e) => updateField('taxaComissao', parseFloat(e.target.value))}
              placeholder="10.0"
            />
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select
              value={data.formaPagamentoComissao || ''}
              onValueChange={(value) => updateField('formaPagamentoComissao', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="ted">TED</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Premium */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2">
          <Switch
            checked={data.isPremium || false}
            onCheckedChange={(checked) => updateField('isPremium', checked)}
          />
          <div>
            <Label className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Proprietário Premium
            </Label>
            <p className="text-sm text-gray-500">
              Proprietários premium recebem benefícios exclusivos
            </p>
          </div>
        </div>
      </div>

      {/* Vincular Imóveis */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Vincular Imóveis</h4>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por identificação ou cidade..."
            value={propertySearch}
            onChange={(e) => setPropertySearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {propertySearch && (
            <button
              onClick={() => setPropertySearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filteredProperties.length} de {properties.length} imóveis</span>
          <div className="flex items-center gap-2">
            <button className="hover:text-blue-600" onClick={selectAllProperties}>
              Todos
            </button>
            <button className="hover:text-blue-600" onClick={deselectAllProperties}>
              Nenhum
            </button>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2">
          {filteredProperties.length === 0 ? (
            <div className="text-xs text-gray-500 py-2">Nenhum imóvel encontrado</div>
          ) : (
            filteredProperties.map((property) => {
              const label = property.internalId || property.name || property.title || 'Sem nome';
              return (
                <label
                  key={property.id}
                  className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPropertyIds.includes(property.id)}
                    onCheckedChange={() => toggleProperty(property.id)}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                      {label}
                    </div>
                    {property.location && (
                      <div className="text-[10px] text-gray-500 truncate">
                        {property.location}
                      </div>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Salvar Alterações' : 'Criar Proprietário'}
        </Button>
      </div>
    </div>
  );
}

// Componente de Visualização
function OwnerView({ owner }: { owner: Owner }) {
  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          Dados Básicos
          {owner.isPremium && (
            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Nome:</span>
            <p className="font-medium">{owner.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Tipo de Contrato:</span>
            <p>
              <Badge className={contractTypeColors[owner.contractType]}>
                {contractTypeLabels[owner.contractType]}
              </Badge>
            </p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium">{owner.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Telefone:</span>
            <p className="font-medium">{owner.phone}</p>
          </div>
          <div>
            <span className="text-gray-500">CPF/CNPJ:</span>
            <p className="font-medium">{owner.document}</p>
          </div>
          <div>
            <span className="text-gray-500">Imóveis vinculados:</span>
            <p className="font-medium">{owner.propertyIds?.length || 0}</p>
          </div>
          {owner.rg && (
            <div>
              <span className="text-gray-500">RG:</span>
              <p className="font-medium">{owner.rg}</p>
            </div>
          )}
          {owner.profissao && (
            <div>
              <span className="text-gray-500">Profissão:</span>
              <p className="font-medium">{owner.profissao}</p>
            </div>
          )}
          {owner.rendaMensal && (
            <div>
              <span className="text-gray-500">Renda Mensal:</span>
              <p className="font-medium">
                R$ {owner.rendaMensal.toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dados Bancários */}
      {owner.bankData && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Dados Bancários</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {owner.bankData.banco && (
              <div>
                <span className="text-gray-500">Banco:</span>
                <p className="font-medium">{owner.bankData.banco}</p>
              </div>
            )}
            {owner.bankData.agencia && (
              <div>
                <span className="text-gray-500">Agência:</span>
                <p className="font-medium">{owner.bankData.agencia}</p>
              </div>
            )}
            {owner.bankData.conta && (
              <div>
                <span className="text-gray-500">Conta:</span>
                <p className="font-medium">{owner.bankData.conta}</p>
              </div>
            )}
            {owner.bankData.tipoConta && (
              <div>
                <span className="text-gray-500">Tipo de Conta:</span>
                <p className="font-medium capitalize">{owner.bankData.tipoConta}</p>
              </div>
            )}
            {owner.bankData.chavePix && (
              <div className="col-span-2">
                <span className="text-gray-500">Chave PIX:</span>
                <p className="font-medium">{owner.bankData.chavePix}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comissões */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-3">Comissões</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {owner.taxaComissao && (
            <div>
              <span className="text-gray-500">Taxa de Comissão:</span>
              <p className="font-medium">{owner.taxaComissao}%</p>
            </div>
          )}
          {owner.formaPagamentoComissao && (
            <div>
              <span className="text-gray-500">Forma de Pagamento:</span>
              <p className="font-medium uppercase">{owner.formaPagamentoComissao}</p>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      {owner.stats && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Estatísticas</h4>
          <div className="grid grid-cols-3 gap-4">
            {owner.stats.totalProperties !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">
                    Total de Imóveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{owner.stats.totalProperties}</p>
                </CardContent>
              </Card>
            )}
            {owner.stats.activeProperties !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">
                    Imóveis Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600">{owner.stats.activeProperties}</p>
                </CardContent>
              </Card>
            )}
            {owner.stats.totalRevenue !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">
                    Receita Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-blue-600">
                    R$ {owner.stats.totalRevenue.toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Metadados */}
      <div className="pt-4 border-t text-xs text-gray-500">
        <p>Criado em: {new Date(owner.createdAt).toLocaleString('pt-BR')}</p>
        <p>Atualizado em: {new Date(owner.updatedAt).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
