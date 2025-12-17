/**
 * RENDIZY - Properties Management
 * 
 * Tela base de gestão de imóveis, acomodações e locais
 * Com filtro lateral padrão e listagem de cards
 * 
 * @version 1.0.103
 * @date 2025-10-28
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Home, MapPin, Edit, Eye, Trash2, Image as ImageIcon, Grid3x3, List, CheckCircle2, Wrench, DollarSign, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CreatePropertyTypeModal } from './CreatePropertyTypeModal';
import { PropertiesFilterSidebar } from './PropertiesFilterSidebar';
import { PropertyViewModal } from './PropertyViewModal';
import { PropertyDeleteModal } from './PropertyDeleteModal';
import { propertiesApi, locationsApi } from '../utils/api';
import { toast } from 'sonner';
import { exportPropertiesToExcel } from '../utils/excelExport';
import { usePropertyActions } from '../hooks/usePropertyActions';

interface Property {
  id: string;
  internalName: string;
  publicName: string;
  type: 'location' | 'accommodation';
  structureType?: 'hotel' | 'house' | 'apartment' | 'condo';
  address?: {
    street: string;
    number: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  status: 'active' | 'inactive' | 'draft';
  tags?: string[];
  photos?: string[];
  accommodationsCount?: number;
  parentLocationId?: string;
  pricing?: {
    basePrice: number;
    currency: string;
  };
  capacity?: {
    guests: number;
    bedrooms: number;
    bathrooms: number;
  };
}

export const PropertiesManagement = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Estados para os novos modais
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Navigation
  const navigate = useNavigate();
  
  // Hook de ações padronizadas
  const { deleteProperty } = usePropertyActions();

  // Carregar propriedades do backend
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      // Carregar Locations e Properties em paralelo
      const [locationsResponse, propertiesResponse] = await Promise.all([
        locationsApi.list(),
        propertiesApi.list()
      ]);

      const allProperties: Property[] = [];

      // Adicionar Locations
      if (locationsResponse.success && locationsResponse.data) {
        const locations = locationsResponse.data.map((loc: any) => ({
          id: loc.id,
          internalName: loc.internalName,
          publicName: loc.publicName,
          type: 'location' as const,
          structureType: loc.structureType || 'hotel',
          address: loc.address,
          status: loc.status || 'active',
          tags: loc.tags || [],
          photos: loc.photos || [],
          accommodationsCount: loc.accommodations?.length || 0
        }));
        allProperties.push(...locations);
      }

      // Adicionar Properties (Accommodations individuais)
      if (propertiesResponse.success && propertiesResponse.data) {
        const accommodations = propertiesResponse.data
          .filter((prop: any) => !prop.locationId) // Apenas individuais (sem locationId)
          .map((prop: any) => ({
            id: prop.id,
            // 🆕 v1.0.103.313 - Usar 'name' como fallback primário
            internalName: prop.name || prop.internalName || 'Sem nome',
            publicName: prop.name || prop.publicName || 'Sem nome',
            type: 'accommodation' as const,
            structureType: prop.type?.toLowerCase() || 'house',
            address: prop.address,
            status: prop.status || 'active',
            tags: prop.tags || [],
            // 🆕 v1.0.103.313 - Mapear fotos corretamente
            photos: Array.isArray(prop.photos) 
              ? prop.photos.map((p: any) => p.url || p)
              : prop.coverPhoto 
              ? [prop.coverPhoto]
              : [],
            pricing: prop.pricing,
            capacity: {
              guests: prop.maxGuests || 0,
              bedrooms: prop.bedrooms || 0,
              bathrooms: prop.bathrooms || 0
            }
          }));
        allProperties.push(...accommodations);
      }

      console.log('✅ Propriedades carregadas:', allProperties);
      setProperties(allProperties);
      setSelectedProperties(allProperties.map(p => p.id));
    } catch (error) {
      console.error('❌ Erro ao carregar propriedades:', error);
      toast.error('Erro ao carregar propriedades');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleProperty = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedProperties(properties.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedProperties([]);
  };

  const handleEdit = (property: Property) => {
    navigate(`/properties/${property.id}/edit`);
  };

  const handleView = (property: Property) => {
    setSelectedProperty(property);
    setViewModalOpen(true);
  };

  const handleDelete = (property: Property) => {
    setSelectedProperty(property);
    setDeleteModalOpen(true);
  };

  const handleSaveProperty = async (data: any) => {
    console.log('💾 Salvando propriedade:', data);
    toast.success('Propriedade salva com sucesso!');
    // TODO: Integrar com backend quando necessário
    // await propertiesApi.update(data.id, data);
    // loadProperties();
  };

  const handleConfirmDelete = async (softDelete: boolean) => {
    if (!selectedProperty) {
      toast.error('Erro: Nenhum imóvel selecionado');
      return;
    }

    try {
      console.log('🗑️ [PROPERTIES] Iniciando exclusão de imóvel...');
      console.log('📊 [PROPERTIES] softDelete:', softDelete);
      
      // ⚡ IMPORTANTE: NÃO fechar o modal aqui
      // O PropertyDeleteModal gerencia o fechamento internamente
      // Especialmente quando há transferência de reservas
      
      // Usar hook padronizado de ações
      await deleteProperty(selectedProperty, softDelete, {
        reloadPage: false,     // NÃO recarrega página (evita tela branca)
        redirectToList: false, // NÃO redireciona (já estamos na lista)
        onSuccess: () => {
          console.log('✅ [PROPERTIES] Exclusão concluída com sucesso');
          
          // Fechar modal APÓS sucesso
          setDeleteModalOpen(false);
          setSelectedProperty(null);
          
          // Atualizar lista localmente (SEM reload de página)
          console.log('🔄 [PROPERTIES] Atualizando lista localmente...');
          loadProperties();
        },
        onError: (error) => {
          console.error('❌ [PROPERTIES] Erro na exclusão:', error);
          
          // Fechar modal mesmo com erro
          setDeleteModalOpen(false);
          setSelectedProperty(null);
        }
      });
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [PROPERTIES] ERRO AO EXCLUIR:', error);
      console.error('📊 [PROPERTIES] Tipo do erro:', typeof error);
      console.error('📊 [PROPERTIES] Error message:', error instanceof Error ? error.message : 'não é Error');
      console.error('📊 [PROPERTIES] Error stack:', error instanceof Error ? error.stack : 'sem stack');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // ⚡ IMPORTANTE: Garantir que modal feche mesmo com erro
      try {
        console.log('🔄 [PROPERTIES] Tentando fechar modal após erro...');
        setDeleteModalOpen(false);
        setSelectedProperty(null);
        console.log('✅ [PROPERTIES] Modal fechado após erro');
      } catch (closeErr) {
        console.error('❌ [PROPERTIES] Erro ao fechar modal:', closeErr);
      }
    }
  };

  // Filtrar apenas propriedades selecionadas
  const displayedProperties = properties.filter(p => selectedProperties.includes(p.id));

  // Função para exportar para Excel
  const handleExportExcel = () => {
    try {
      if (displayedProperties.length === 0) {
        toast.error('Nenhum imóvel para exportar');
        return;
      }

      const fileName = exportPropertiesToExcel(displayedProperties, 'imoveis_rendizy');
      toast.success(`Arquivo exportado: ${fileName}`);
      console.log('✅ Exportação Excel concluída:', fileName);
    } catch (error) {
      console.error('❌ Erro ao exportar para Excel:', error);
      toast.error('Erro ao exportar arquivo Excel');
    }
  };

  // Calcular KPIs
  const kpis = useMemo(() => {
    const total = displayedProperties.length;
    const available = displayedProperties.filter(p => p.status === 'active').length;
    const occupied = 0; // TODO: Conectar com reservas
    const maintenance = displayedProperties.filter(p => p.status === 'inactive').length;
    
    // Calcular diária média
    const propertiesWithPrice = displayedProperties.filter(p => p.pricing?.basePrice);
    const averagePrice = propertiesWithPrice.length > 0
      ? propertiesWithPrice.reduce((sum, p) => sum + (p.pricing?.basePrice || 0), 0) / propertiesWithPrice.length / 100
      : 0;

    return {
      total,
      available,
      occupied,
      maintenance,
      averagePrice
    };
  }, [displayedProperties]);

  return (
    <div className="flex h-full">
      {/* Filtro Lateral */}
      <PropertiesFilterSidebar
        properties={properties}
        selectedProperties={selectedProperties}
        onToggleProperty={handleToggleProperty}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header com Título e Botão */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900 dark:text-gray-100">
                Locais
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gerencie suas propriedades e unidades
              </p>
            </div>
            
            {/* Botões de Ação */}
            <div className="flex items-center gap-3">
              {/* Botão de Exportar Excel */}
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                disabled={displayedProperties.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>

              {/* Botão de Criar */}
              <Button
                onClick={() => navigate('/properties/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Propriedade
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs Cards */}
        <div className="bg-gray-50 dark:bg-gray-900 px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="grid grid-cols-5 gap-4">
            {/* Total */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{kpis.total}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disponíveis */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Disponíveis</p>
                    <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{kpis.available}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ocupadas */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ocupadas</p>
                    <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{kpis.occupied}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manutenção */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Manutenção</p>
                    <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{kpis.maintenance}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diária Média */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Diária Média</p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      R$ {kpis.averagePrice.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Barra de Filtros e Toggle View */}
        <div className="bg-white dark:bg-gray-800 px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-end gap-2">
            {/* Toggle Grade/Lista */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              >
                <Grid3x3 className="w-4 h-4 mr-1" />
                Grade
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              >
                <List className="w-4 h-4 mr-1" />
                Lista
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {loading ? (
            // Loading State
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Carregando imóveis...</p>
              </div>
            </div>
          ) : displayedProperties.length === 0 ? (
            // Empty State
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-6">
                {/* Ícones ilustrativos */}
                <div className="flex justify-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Home className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>

                {/* Título */}
                <h2 className="text-gray-900 dark:text-gray-100 mb-2">
                  {properties.length === 0 ? 'Comece criando seu primeiro anúncio' : 'Nenhum imóvel selecionado'}
                </h2>

                {/* Descrição */}
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {properties.length === 0 
                    ? 'Crie locais com múltiplas unidades (hotéis, pousadas) ou anúncios individuais (casas, apartamentos) para aluguel ou venda.'
                    : 'Use os filtros na barra lateral para encontrar imóveis.'}
                </p>

                {/* Botão CTA */}
                {properties.length === 0 && (
                  <Button
                    onClick={() => navigate('/properties/new')}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Nova Propriedade
                  </Button>
                )}

                {/* Cards informativos */}
                {properties.length === 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    {/* Card Local Multi-Unidades */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-gray-900 dark:text-gray-100 mb-1">
                        Local Multi-Unidades
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Hotéis, pousadas, hostels com quartos e chalés
                      </p>
                    </div>

                    {/* Card Anúncio Individual */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                        <Home className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-gray-900 dark:text-gray-100 mb-1">
                        Anúncio Individual
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Casas, apartamentos, lofts para temporada
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            // VISUALIZAÇÃO EM GRADE (máx 3 colunas)
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Imagem */}
                    <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                      {property.photos && property.photos.length > 0 ? (
                        <img
                          src={property.photos[0]}
                          alt={property.internalName || property.publicName || 'Imóvel'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Se falhar carregar, mostrar placeholder
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Badge de Tipo */}
                      <div className="absolute top-2 left-2">
                        <Badge className={property.type === 'location' ? 'bg-blue-600' : 'bg-emerald-600'}>
                          {property.type === 'location' ? (
                            <>
                              <Building2 className="w-3 h-3 mr-1" />
                              Local
                            </>
                          ) : (
                            <>
                              <Home className="w-3 h-3 mr-1" />
                              Acomodação
                            </>
                          )}
                        </Badge>
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant={property.status === 'active' ? 'default' : 'secondary'}
                          className={
                            property.status === 'active' ? 'bg-green-600' :
                            property.status === 'draft' ? 'bg-yellow-600' :
                            'bg-gray-600'
                          }
                        >
                          {property.status === 'active' ? 'Ativo' :
                           property.status === 'draft' ? 'Rascunho' :
                           'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <CardContent className="p-4">
                      {/* Nome Clicável */}
                      <h3 
                        className="group text-black dark:text-white mb-1 cursor-pointer transition-all flex items-center gap-1.5 hover:gap-2"
                        onClick={() => handleEdit(property)}
                        title="Clique para editar"
                      >
                        <span className="truncate underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 group-hover:decoration-blue-600 dark:group-hover:decoration-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                          {property.internalName || property.publicName || 'Sem nome'}
                        </span>
                        <Edit className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                      </h3>

                      {/* ID do Imóvel - Copiável */}
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 select-all font-mono bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 inline-block">
                          ID: {property.id}
                        </p>
                      </div>

                      {/* Localização */}
                      {property.address && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2">
                          <MapPin className="h-3 w-3" />
                          {property.address.city}, {property.address.state}
                        </p>
                      )}

                      {/* Info específica */}
                      {property.type === 'location' ? (
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {property.accommodationsCount || 0} acomodações
                        </p>
                      ) : (
                        property.capacity && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {property.capacity.guests} hóspedes · {property.capacity.bedrooms} quartos
                          </p>
                        )
                      )}

                      {/* Tags */}
                      {property.tags && property.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {property.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {property.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{property.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(property)}
                          className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visualizar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(property)}
                          className="flex-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(property)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            // VISUALIZAÇÃO EM LISTA
            <div className="p-8">
              <div className="space-y-4">
                {displayedProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4">
                        {/* Imagem */}
                        <div className="relative w-48 h-32 flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                          {property.photos && property.photos.length > 0 ? (
                            <img
                              src={property.photos[0]}
                              alt={property.internalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Badge de Status */}
                          <div className="absolute top-2 right-2">
                            <Badge 
                              variant={property.status === 'active' ? 'default' : 'secondary'}
                              className={
                                property.status === 'active' ? 'bg-emerald-600' :
                                property.status === 'draft' ? 'bg-yellow-600' :
                                'bg-gray-600'
                              }
                            >
                              {property.status === 'active' ? 'Disponível' :
                               property.status === 'draft' ? 'Rascunho' :
                               'Inativo'}
                            </Badge>
                          </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 py-4 pr-4">
                          {/* Header */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              {/* Nome Clicável */}
                              <h3 
                                className="group text-black dark:text-white cursor-pointer transition-all flex items-center gap-1.5 hover:gap-2"
                                onClick={() => handleEdit(property)}
                                title="Clique para editar"
                              >
                                <span className="underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 group-hover:decoration-blue-600 dark:group-hover:decoration-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                                  {property.internalName}
                                </span>
                                <Edit className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                              </h3>
                              
                              {/* Botões de Ação */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleView(property)}
                                  className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Visualizar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(property)}
                                  className="h-8 px-3 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(property)}
                                  className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Excluir
                                </Button>
                              </div>
                            </div>
                            
                            {/* Tipo e ID */}
                            <div className="flex items-center gap-2">
                              <Badge className={property.type === 'location' ? 'bg-blue-600' : 'bg-emerald-600'}>
                                {property.type === 'location' ? (
                                  <>
                                    <Building2 className="w-3 h-3 mr-1" />
                                    {property.structureType || 'Local'}
                                  </>
                                ) : (
                                  <>
                                    <Home className="w-3 h-3 mr-1" />
                                    {property.structureType || 'Acomodação'}
                                  </>
                                )}
                              </Badge>
                              
                              {/* ID do Imóvel - Copiável */}
                              <span className="text-xs text-gray-500 dark:text-gray-400 select-all font-mono bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                ID: {property.id}
                              </span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            {/* Localização */}
                            {property.address && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {property.address.city}, {property.address.state}
                              </div>
                            )}

                            {/* Info específica */}
                            {property.type === 'location' ? (
                              <div className="text-blue-600 dark:text-blue-400">
                                {property.accommodationsCount || 0} acomodações
                              </div>
                            ) : (
                              property.capacity && (
                                <div>
                                  {property.capacity.guests} hóspedes · {property.capacity.bedrooms} quartos · {property.capacity.bathrooms} banheiros
                                </div>
                              )
                            )}

                            {/* Preço */}
                            {property.pricing && (
                              <div className="ml-auto font-semibold text-gray-900 dark:text-gray-100">
                                R$ {(property.pricing.basePrice / 100).toFixed(2).replace('.', ',')} / noite
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {property.tags && property.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {property.tags.slice(0, 5).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {property.tags.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{property.tags.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Escolha de Tipo */}
      <CreatePropertyTypeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadProperties(); // Recarregar lista
        }}
      />

      {/* Modal de Visualização */}
      <PropertyViewModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedProperty(null);
        }}
        property={selectedProperty}
        onEdit={() => {
          if (selectedProperty) {
            navigate(`/properties/${selectedProperty.id}/edit`);
            setViewModalOpen(false);
          }
        }}
      />

      {/* Modal de Exclusão */}
      <PropertyDeleteModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedProperty(null);
        }}
        property={selectedProperty}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
