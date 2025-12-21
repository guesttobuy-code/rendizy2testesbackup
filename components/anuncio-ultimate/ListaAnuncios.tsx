/**
 * RENDIZY - Lista de Anúncios Ultimate
 * 
 * Tela de listagem e gerenciamento de anúncios criados campo-por-campo
 * com persistência SQL garantida via anuncios_drafts table (V2)
 * 
 * @version 1.0.1
 * @date 2025-12-16
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Image as ImageIcon, Grid3x3, List, Building2, Home, CheckCircle2, Clock, XCircle, Users, Bed, Bath, MapPin, Hash } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AnuncioUltimate {
  id: string;
  data: {
    title?: string;
    internalId?: string; // Identificação interna
    description?: string;
    propertyType?: 'apartment' | 'house' | 'studio' | 'loft';
    guests?: number;
    bedrooms?: number;
    beds?: number; // Quantidade de camas
    bathrooms?: number;
    basePrice?: number;
    cleaningFee?: number;
    amenities?: string[];
    photos?: string[];
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  status?: 'inactive' | 'draft' | 'active'; // Status do anúncio
  organization_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export const ListaAnuncios = () => {
  const [anuncios, setAnuncios] = useState<AnuncioUltimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  useEffect(() => {
    loadAnuncios();
  }, []);

  const loadAnuncios = async () => {
    setLoading(true);
    try {
      // ✅ v1.0.103.404: Usar backend Edge Function ao invés de REST API direta
      // Problema: RLS bloqueia registros quando usa REST API sem org context
      const token = localStorage.getItem('rendizy-token');
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/make-server-67caf26a/anuncios-ultimate/lista`, {
        headers: {
          'apikey': ANON_KEY,
          'X-Auth-Token': token || '',
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const response = await res.json();
      const data = response.anuncios || [];
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Anúncios carregados - Total:', data.length);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (data.length > 0) {
        const primeiro = data[0];
        console.log('📊 ANÚNCIO COMPLETO [0]:', JSON.stringify(primeiro, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 CAMPO data:', primeiro.data);
        console.log('🔍 TIPO de data:', typeof primeiro.data);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Se data for string, tentar parsear
        if (typeof primeiro.data === 'string') {
          try {
            const parsedData = JSON.parse(primeiro.data);
            console.log('🔄 data parseado:', parsedData);
            console.log('🏷️ InternalId após parse:', parsedData?.internalId);
            console.log('📍 Address após parse:', parsedData?.address);
          } catch (e) {
            console.error('❌ Erro ao parsear data:', e);
          }
        } else {
          console.log('🏷️ InternalId direto:', primeiro.data?.internalId);
          console.log('📍 Address direto:', primeiro.data?.address);
          console.log('🛏️ Bedrooms direto:', primeiro.data?.bedrooms);
          console.log('🛁 Bathrooms direto:', primeiro.data?.bathrooms);
          console.log('🛏️ Beds direto:', primeiro.data?.beds);
          console.log('👥 Guests direto:', primeiro.data?.guests);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Status:', primeiro.status);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
      
      setAnuncios(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar anúncios:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate('/anuncios-ultimate/novo');
  };

  const handleEdit = (anuncio: AnuncioUltimate) => {
    navigate(`/anuncios-ultimate/${anuncio.id}/edit`);
  };

  const handleView = (anuncio: AnuncioUltimate) => {
    navigate(`/anuncios-ultimate/${anuncio.id}`);
  };

  const handleStatusChange = async (anuncio: AnuncioUltimate, newStatus: 'inactive' | 'draft' | 'active') => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_drafts?id=eq.${anuncio.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Erro ao atualizar status');

      setAnuncios(prev => prev.map(a => 
        a.id === anuncio.id ? { ...a, status: newStatus } : a
      ));

      const statusLabel = { inactive: 'Desligado', draft: 'Rascunho', active: 'Ativo' }[newStatus];
      toast.success(`Status atualizado para ${statusLabel}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (anuncio: AnuncioUltimate) => {
    if (!confirm(`Tem certeza que deseja excluir "${anuncio.data.title || 'este anúncio'}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/anuncios_drafts?id=eq.${anuncio.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      toast.success('Anúncio excluído com sucesso');
      loadAnuncios();
    } catch (error) {
      console.error('❌ Erro ao excluir anúncio:', error);
      toast.error('Erro ao excluir anúncio');
    }
  };

  // Calcular KPIs
  const kpis = useMemo(() => {
    const total = anuncios.length;
    const completos = anuncios.filter(a => 
      a.data.title && 
      a.data.description && 
      a.data.propertyType && 
      a.data.basePrice
    ).length;
    const rascunhos = total - completos;
    const comFotos = anuncios.filter(a => a.data.photos && a.data.photos.length > 0).length;

    return { total, completos, rascunhos, comFotos };
  }, [anuncios]);

  const getPropertyTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      apartment: 'Apartamento',
      house: 'Casa',
      studio: 'Studio',
      loft: 'Loft'
    };
    return labels[type || ''] || 'Não definido';
  };

  const getPropertyTypeIcon = (type?: string) => {
    if (type === 'apartment' || type === 'loft') return Building2;
    return Home;
  };

  // Garantir que valores sejam sempre strings (evitar objetos)
  const getStringValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'text' in value) return value.text;
    if (typeof value === 'object' && value !== null && 'value' in value) return value.value;
    return String(value || '');
  };

  const isCompleto = (anuncio: AnuncioUltimate) => {
    return !!(
      anuncio.data.title &&
      anuncio.data.description &&
      anuncio.data.propertyType &&
      anuncio.data.basePrice
    );
  };

  // Mapear dados do wizard antigo (campos em português) para formato esperado
  const mapWizardData = (data: any) => {
    // Mapear endereço
    const address = {
      street: data.address?.street || data.rua || '',
      number: data.address?.number || data.numero || '',
      neighborhood: data.address?.neighborhood || data.bairro || '',
      city: data.address?.city || data.cidade || '',
      state: data.address?.state || data.estado || data.sigla_estado || ''
    };
    
    // Calcular cômodos do array rooms[]
    let bedrooms = 0;
    let beds = 0;
    let coverPhoto = data.coverPhoto || '';
    
    try {
      const rooms = typeof data.rooms === 'string' ? JSON.parse(data.rooms) : data.rooms;
      if (Array.isArray(rooms)) {
        bedrooms = rooms.filter(r => 
          r.type?.includes('quarto') || r.typeName?.toLowerCase().includes('quarto')
        ).length;
        
        rooms.forEach(room => {
          if (room.beds && typeof room.beds === 'object') {
            Object.values(room.beds).forEach((count: any) => {
              beds += parseInt(count) || 0;
            });
          }
        });
        
        // Buscar foto de capa se não tiver
        if (!coverPhoto && data.cover_photo_id) {
          // Buscar foto específica pelo ID
          for (const room of rooms) {
            if (room.photos && Array.isArray(room.photos)) {
              const photo = room.photos.find((p: any) => p.id === data.cover_photo_id);
              if (photo?.url) {
                coverPhoto = photo.url;
                break;
              }
            }
          }
        }
        
        // Se não achou, pegar primeira foto disponível
        if (!coverPhoto) {
          for (const room of rooms) {
            if (room.photos && Array.isArray(room.photos) && room.photos.length > 0) {
              coverPhoto = room.photos[0].url || '';
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Erro ao parsear rooms:', e);
    }
    
    return {
      ...data,
      address,
      bedrooms,
      beds,
      bathrooms: data.bathrooms || 0,
      guests: data.guests || 0,
      coverPhoto
    };
  };

  const formatAddress = (dataOriginal: any): string => {
    const data = mapWizardData(dataOriginal);
    const address = data.address;
    
    if (!address) {
      return 'Endereço não definido';
    }
    
    const parts = [
      address.street,
      address.number,
      address.neighborhood,
      address.city,
      address.state
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Endereço não definido';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'draft': return 'bg-yellow-600';
      case 'inactive': return 'bg-gray-600';
      default: return 'bg-yellow-600';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'draft': return 'Rascunho';
      case 'inactive': return 'Desligado';
      default: return 'Rascunho';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Lista de Anúncios Ultimate
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Anúncios criados com persistência campo-por-campo garantida
            </p>
          </div>
          
          <Button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Anúncio
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="bg-gray-50 dark:bg-gray-900 px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {/* Total */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{kpis.total}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Home className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completos */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completos</p>
                  <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{kpis.completos}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rascunhos */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rascunhos</p>
                  <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{kpis.rascunhos}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Com Fotos */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Com Fotos</p>
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{kpis.comFotos}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Toggle View */}
      <div className="bg-white dark:bg-gray-800 px-8 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-end gap-2">
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Carregando anúncios...</p>
            </div>
          </div>
        ) : anuncios.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
                <Home className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Nenhum anúncio criado ainda
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Crie seu primeiro anúncio com persistência campo-por-campo garantida
              </p>
              <Button
                onClick={handleCreateNew}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Primeiro Anúncio
              </Button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {anuncios.map((anuncio, index) => {
                // Log detalhado na renderização
                console.log(`🎨 RENDERIZANDO CARD [${index}] - ID: ${anuncio.id}`);
                console.log(`  📝 Title:`, anuncio.data?.title);
                console.log(`  🏷️ InternalId:`, anuncio.data?.internalId);
                console.log(`  📍 Address:`, anuncio.data?.address);
                console.log(`  🛏️ Bedrooms:`, anuncio.data?.bedrooms);
                console.log(`  🛁 Bathrooms:`, anuncio.data?.bathrooms);
                console.log(`  🛏️ Beds:`, anuncio.data?.beds);
                console.log(`  👥 Guests:`, anuncio.data?.guests);
                console.log(`  📊 Status:`, anuncio.status);
                console.log(`  📦 data completo:`, anuncio.data);
                
                const Icon = getPropertyTypeIcon(anuncio.data?.propertyType);
                const completo = isCompleto(anuncio);
                
                return (
                  <Card key={anuncio.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    {/* Card com foto de fundo horizontal e overlay */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {/* Foto de Capa (sempre horizontal) */}
                      {(() => {
                        const mappedData = mapWizardData(anuncio.data);
                        const coverPhoto = mappedData.coverPhoto;
                        
                        return coverPhoto ? (
                          <img
                            src={coverPhoto}
                            alt={anuncio.data.title || 'Anúncio'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Icon className="w-20 h-20 text-white/30" />
                          </div>
                        );
                      })()}
                      
                      {/* Overlay gradiente para legibilidade */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      
                      {/* Conteúdo sobreposto */}
                      <div className="absolute inset-0 p-4 flex flex-col justify-between">
                        {/* Topo: Identificação Interna + Status */}
                        <div className="flex items-start justify-between gap-2">
                          {anuncio.data?.internalId && (
                            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                              <Hash className="w-3 h-3 mr-1" />
                              {anuncio.data.internalId}
                            </Badge>
                          )}
                          
                          {/* Status Badge (clicável para trocar) */}
                          <div 
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const currentStatus = anuncio.status || 'draft';
                              const statusOrder = ['inactive', 'draft', 'active'];
                              const currentIndex = statusOrder.indexOf(currentStatus);
                              const nextIndex = (currentIndex + 1) % statusOrder.length;
                              handleStatusChange(anuncio, statusOrder[nextIndex] as 'inactive' | 'draft' | 'active');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                const currentStatus = anuncio.status || 'draft';
                                const statusOrder = ['inactive', 'draft', 'active'];
                                const currentIndex = statusOrder.indexOf(currentStatus);
                                const nextIndex = (currentIndex + 1) % statusOrder.length;
                                handleStatusChange(anuncio, statusOrder[nextIndex] as 'inactive' | 'draft' | 'active');
                              }
                            }}
                            className={`cursor-pointer px-3 py-1 rounded-md text-xs font-medium text-white ${getStatusColor(anuncio.status)} backdrop-blur-sm hover:opacity-90 transition-opacity`}
                            title="Clique para alterar status (Desligado → Rascunho → Ativo)"
                          >
                            {getStatusLabel(anuncio.status)}
                          </div>
                        </div>
                        
                        {/* Base: Informações do Imóvel */}
                        <div className="space-y-2">
                          {/* Título */}
                          <h3 
                            className="text-lg font-bold text-white cursor-pointer hover:text-blue-300 transition-colors line-clamp-2"
                            onClick={() => handleEdit(anuncio)}
                          >
                            {getStringValue(anuncio.data.title) || 'Sem título'}
                          </h3>
                          
                          {/* Property ID */}
                          <div className="flex items-center gap-2 text-xs text-white/90">
                            <Hash className="w-3 h-3" />
                            <span className="font-mono">ID: {anuncio.id.slice(0, 8)}</span>
                          </div>
                          
                          {/* Ícones: Quartos, Banheiros, Camas, Hóspedes */}
                          <div className="flex items-center gap-4 text-white/90 text-sm flex-wrap">
                            {(() => {
                              const mappedData = mapWizardData(anuncio.data);
                              return (
                                <>
                                  <div className="flex items-center gap-1">
                                    <Bed className="w-4 h-4" />
                                    <span>{mappedData.bedrooms || 0} quarto{(mappedData.bedrooms || 0) !== 1 ? 's' : ''}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Bath className="w-4 h-4" />
                                    <span>{mappedData.bathrooms || 0} banheiro{(mappedData.bathrooms || 0) !== 1 ? 's' : ''}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Bed className="w-4 h-4" />
                                    <span>{mappedData.beds || 0} cama{(mappedData.beds || 0) !== 1 ? 's' : ''}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{mappedData.guests || 0}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          
                          {/* Endereço Completo */}
                          <div className="flex items-start gap-1 text-xs text-white/80">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{formatAddress(anuncio.data)}</span>
                          </div>
                          
                          {/* Ações */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleView(anuncio)}
                              className="flex-1 h-8 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(anuncio)}
                              className="flex-1 h-8 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete(anuncio)}
                              className="h-8 bg-red-500/80 hover:bg-red-600 text-white border-none backdrop-blur-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          // Lista View (simplificada)
          <div className="p-8">
            <div className="space-y-3">
              {anuncios.map((anuncio) => (
                <Card key={anuncio.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {getStringValue(anuncio.data.title) || 'Sem título'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getStringValue(anuncio.data.description) || 'Sem descrição'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(anuncio)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(anuncio)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(anuncio)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
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
  );
};
