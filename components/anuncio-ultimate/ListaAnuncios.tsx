/**
 * RENDIZY - Lista de Anúncios Ultimate
 * 
 * Tela de listagem e gerenciamento de anúncios criados campo-por-campo
 * com persistência SQL garantida via properties table
 * 
 * @version 1.0.1
 * @date 2025-12-16
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Image as ImageIcon, Grid3x3, List, Building2, Home, CheckCircle2, Clock, XCircle, Users, Bed, Bath, MapPin, Hash, Search, SlidersHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Link2, Check, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { toast } from 'sonner';

import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const ANON_KEY = publicAnonKey;
const CLIENT_SITES_BASE_URL = 'https://rendizy2testesbackup.vercel.app/site';

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

// Garantir que valores sejam sempre strings (evitar objetos)
function getStringValue(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'text' in value) return (value as any).text;
  if (typeof value === 'object' && value !== null && 'value' in value) return (value as any).value;
  return String(value || '');
}

function extractPhotoUrl(photo: any): string {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  if (typeof photo === 'object') {
    const url =
      (typeof photo.url === 'string' ? photo.url : '') ||
      (typeof photo.signedUrl === 'string' ? photo.signedUrl : '') ||
      (typeof photo.publicUrl === 'string' ? photo.publicUrl : '') ||
      (typeof photo.href === 'string' ? photo.href : '');
    return url;
  }
  return '';
}

function getRoomsArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getRoomPhotosFlat(rooms: any[]): any[] {
  const out: any[] = [];
  for (const r of rooms) {
    const photos = (r as any)?.photos;
    if (Array.isArray(photos)) out.push(...photos);
  }
  return out;
}

function countPhotosFromData(data: any): number {
  const direct = Array.isArray(data?.photos) ? data.photos.length : 0;
  const rooms = getRoomsArray(data?.rooms);
  const roomPhotos = getRoomPhotosFlat(rooms);
  return direct + roomPhotos.length;
}

export const ListaAnuncios = () => {
  const [anuncios, setAnuncios] = useState<AnuncioUltimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [siteSubdomains, setSiteSubdomains] = useState<Record<string, string | null>>({});
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ════════════════════════════════════════════════════════════════════════════
  // � PAGINAÇÃO EFICIENTE - Carrega apenas a página atual
  // ════════════════════════════════════════════════════════════════════════════
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12); // 12 para grid (3x4), ajustável
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ════════════════════════════════════════════════════════════════════════════
  // �🔗 FILTROS COM URL SYNC - Seguindo padrão de PropertySidebar/Calendário
  // ════════════════════════════════════════════════════════════════════════════
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);
  
  // Collapsible sections - seguindo mesmo padrão do PropertySidebar
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isNeighborhoodOpen, setIsNeighborhoodOpen] = useState(false);
  
  // Busca dentro dos filtros
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [neighborhoodSearchQuery, setNeighborhoodSearchQuery] = useState('');

  // Valores da URL (aplicados) - arrays para múltipla seleção
  const appliedStatusFilter = useMemo(() => {
    const raw = searchParams.get('status');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const appliedTypeFilter = useMemo(() => {
    const raw = searchParams.get('type');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const appliedCityFilter = useMemo(() => {
    const raw = searchParams.get('city');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const appliedNeighborhoodFilter = useMemo(() => {
    const raw = searchParams.get('neighborhood');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const appliedTagsFilter = useMemo(() => {
    const raw = searchParams.get('tags');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const appliedPropertiesFilter = useMemo(() => {
    const raw = searchParams.get('properties');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const appliedSearchQuery = searchParams.get('q') || '';

  // Valores draft (editados pelo usuário, não aplicados ainda)
  const [draftStatusFilter, setDraftStatusFilter] = useState<string[]>(appliedStatusFilter);
  const [draftTypeFilter, setDraftTypeFilter] = useState<string[]>(appliedTypeFilter);
  const [draftCityFilter, setDraftCityFilter] = useState<string[]>(appliedCityFilter);
  const [draftNeighborhoodFilter, setDraftNeighborhoodFilter] = useState<string[]>(appliedNeighborhoodFilter);
  const [draftTagsFilter, setDraftTagsFilter] = useState<string[]>(appliedTagsFilter);
  const [draftPropertiesFilter, setDraftPropertiesFilter] = useState<string[]>(appliedPropertiesFilter);
  const [draftSearchQuery, setDraftSearchQuery] = useState(appliedSearchQuery);

  // Sincronizar draft com URL quando URL muda
  useEffect(() => {
    setDraftStatusFilter(appliedStatusFilter);
    setDraftTypeFilter(appliedTypeFilter);
    setDraftCityFilter(appliedCityFilter);
    setDraftNeighborhoodFilter(appliedNeighborhoodFilter);
    setDraftTagsFilter(appliedTagsFilter);
    setDraftPropertiesFilter(appliedPropertiesFilter);
    setDraftSearchQuery(appliedSearchQuery);
  }, [appliedStatusFilter, appliedTypeFilter, appliedCityFilter, appliedNeighborhoodFilter, 
      appliedTagsFilter, appliedPropertiesFilter, appliedSearchQuery]);

  // Verificar se há mudanças pendentes
  const hasPendingChanges = useMemo(() => {
    const statusChanged = JSON.stringify([...draftStatusFilter].sort()) !== JSON.stringify([...appliedStatusFilter].sort());
    const typeChanged = JSON.stringify([...draftTypeFilter].sort()) !== JSON.stringify([...appliedTypeFilter].sort());
    const cityChanged = JSON.stringify([...draftCityFilter].sort()) !== JSON.stringify([...appliedCityFilter].sort());
    const neighborhoodChanged = JSON.stringify([...draftNeighborhoodFilter].sort()) !== JSON.stringify([...appliedNeighborhoodFilter].sort());
    const tagsChanged = JSON.stringify([...draftTagsFilter].sort()) !== JSON.stringify([...appliedTagsFilter].sort());
    const propertiesChanged = JSON.stringify([...draftPropertiesFilter].sort()) !== JSON.stringify([...appliedPropertiesFilter].sort());
    const searchChanged = draftSearchQuery !== appliedSearchQuery;
    return statusChanged || typeChanged || cityChanged || neighborhoodChanged || tagsChanged || propertiesChanged || searchChanged;
  }, [draftStatusFilter, appliedStatusFilter, draftTypeFilter, appliedTypeFilter, 
      draftCityFilter, appliedCityFilter, draftNeighborhoodFilter, appliedNeighborhoodFilter,
      draftTagsFilter, appliedTagsFilter, draftPropertiesFilter, appliedPropertiesFilter,
      draftSearchQuery, appliedSearchQuery]);

  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return appliedStatusFilter.length > 0 || 
           appliedTypeFilter.length > 0 || 
           appliedCityFilter.length > 0 ||
           appliedNeighborhoodFilter.length > 0 ||
           appliedTagsFilter.length > 0 ||
           appliedPropertiesFilter.length > 0 ||
           appliedSearchQuery !== '';
  }, [appliedStatusFilter, appliedTypeFilter, appliedCityFilter, appliedNeighborhoodFilter, 
      appliedTagsFilter, appliedPropertiesFilter, appliedSearchQuery]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    return (appliedStatusFilter.length > 0 ? 1 : 0) +
           (appliedTypeFilter.length > 0 ? 1 : 0) +
           (appliedCityFilter.length > 0 ? 1 : 0) +
           (appliedNeighborhoodFilter.length > 0 ? 1 : 0) +
           (appliedTagsFilter.length > 0 ? 1 : 0) +
           (appliedPropertiesFilter.length > 0 ? 1 : 0) +
           (appliedSearchQuery !== '' ? 1 : 0);
  }, [appliedStatusFilter, appliedTypeFilter, appliedCityFilter, appliedNeighborhoodFilter,
      appliedTagsFilter, appliedPropertiesFilter, appliedSearchQuery]);

  // Aplicar filtros (atualiza URL)
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (draftStatusFilter.length > 0) params.set('status', draftStatusFilter.join(','));
    if (draftTypeFilter.length > 0) params.set('type', draftTypeFilter.join(','));
    if (draftCityFilter.length > 0) params.set('city', draftCityFilter.join(','));
    if (draftNeighborhoodFilter.length > 0) params.set('neighborhood', draftNeighborhoodFilter.join(','));
    if (draftTagsFilter.length > 0) params.set('tags', draftTagsFilter.join(','));
    if (draftPropertiesFilter.length > 0) params.set('properties', draftPropertiesFilter.join(','));
    if (draftSearchQuery.trim()) params.set('q', draftSearchQuery.trim());
    setSearchParams(params, { replace: true });
    toast.success('Filtros aplicados!');
  }, [draftStatusFilter, draftTypeFilter, draftCityFilter, draftNeighborhoodFilter, 
      draftTagsFilter, draftPropertiesFilter, draftSearchQuery, setSearchParams]);

  // Resetar todos os filtros
  const resetAllFilters = useCallback(() => {
    setDraftStatusFilter([]);
    setDraftTypeFilter([]);
    setDraftCityFilter([]);
    setDraftNeighborhoodFilter([]);
    setDraftTagsFilter([]);
    setDraftPropertiesFilter([]);
    setDraftSearchQuery('');
    setPropertySearchQuery('');
    setCitySearchQuery('');
    setNeighborhoodSearchQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
    toast.success('Filtros resetados');
  }, [setSearchParams]);

  // Copiar URL com filtros
  const copyFilterUrl = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      setUrlCopied(true);
      toast.success('Link copiado! Compartilhe para manter os filtros.');
      setTimeout(() => setUrlCopied(false), 2000);
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  }, [searchParams]);

  // 🔑 Marcador especial para indicar "nenhum selecionado explicitamente"
  const NONE_MARKER = '__NONE__';

  // Funções de seleção Todas/Nenhuma
  const selectAllStatus = () => setDraftStatusFilter(['active', 'draft', 'inactive']);
  const deselectAllStatus = () => setDraftStatusFilter([NONE_MARKER]);

  // Lista de todos os tipos de imóvel disponíveis
  const allPropertyTypes = useMemo(() => {
    const types = new Set<string>();
    anuncios.forEach(a => {
      const type = (a as any)?.data?.property_type;
      if (type && typeof type === 'string') {
        types.add(type);
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [anuncios]);

  // Lista de todas as cidades disponíveis
  const allCities = useMemo(() => {
    const cities = new Set<string>();
    anuncios.forEach(a => {
      const city = (a as any)?.data?.location?.city;
      if (city && typeof city === 'string') {
        cities.add(city);
      }
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [anuncios]);

  // Lista de todos os bairros disponíveis
  const allNeighborhoods = useMemo(() => {
    const neighborhoods = new Set<string>();
    anuncios.forEach(a => {
      const neighborhood = (a as any)?.data?.location?.neighborhood || (a as any)?.data?.address?.neighborhood;
      if (neighborhood && typeof neighborhood === 'string') {
        neighborhoods.add(neighborhood);
      }
    });
    return Array.from(neighborhoods).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [anuncios]);

  // Tags disponíveis - pré-definidas (igual ao PropertySidebar)
  const tagsOptions = useMemo(() => [
    { value: 'Praia', label: 'Praia', colorClass: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'Montanha', label: 'Montanha', colorClass: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'Cidade', label: 'Cidade', colorClass: 'bg-purple-100 text-purple-700 border-purple-300' },
    { value: 'Luxo', label: 'Luxo', colorClass: 'bg-pink-100 text-pink-700 border-pink-300' },
    { value: 'Econômico', label: 'Econômico', colorClass: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'Pet Friendly', label: 'Pet Friendly', colorClass: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: 'Família', label: 'Família', colorClass: 'bg-teal-100 text-teal-700 border-teal-300' },
    { value: 'Romântico', label: 'Romântico', colorClass: 'bg-red-100 text-red-700 border-red-300' }
  ], []);

  // Funções de seleção Todas/Nenhuma para tipos
  const selectAllTypes = () => setDraftTypeFilter([...allPropertyTypes]);
  const deselectAllTypes = () => setDraftTypeFilter([NONE_MARKER]);

  // Funções de seleção Todas/Nenhuma para cidades
  const selectAllCities = () => setDraftCityFilter([...allCities]);
  const deselectAllCities = () => setDraftCityFilter([NONE_MARKER]);

  // Funções de seleção Todas/Nenhuma para bairros
  const selectAllNeighborhoods = () => setDraftNeighborhoodFilter([...allNeighborhoods]);
  const deselectAllNeighborhoods = () => setDraftNeighborhoodFilter([NONE_MARKER]);

  // Funções de seleção Todas/Nenhuma para tags
  const selectAllTags = () => setDraftTagsFilter(tagsOptions.map(t => t.value));
  const deselectAllTags = () => setDraftTagsFilter([NONE_MARKER]);

  // Funções de seleção Todas/Nenhuma para propriedades
  const selectAllProperties = () => setDraftPropertiesFilter(anuncios.map(a => a.id));
  const deselectAllProperties = () => setDraftPropertiesFilter([NONE_MARKER]);

  // Propriedades filtradas pela busca
  const filteredPropertiesForSelection = useMemo(() => {
    if (!propertySearchQuery.trim()) return anuncios;
    const q = propertySearchQuery.toLowerCase();
    return anuncios.filter(a => {
      const title = getStringValue((a as any)?.data?.title || '').toLowerCase();
      const internalId = getStringValue((a as any)?.data?.internalId || '').toLowerCase();
      return title.includes(q) || internalId.includes(q);
    });
  }, [anuncios, propertySearchQuery]);

  const collator = useMemo(
    () => new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true }),
    []
  );

  // Recarregar quando página ou filtros mudam
  useEffect(() => {
    loadAnuncios();
  }, [currentPage, itemsPerPage]);

  // Resetar para página 1 quando filtros são aplicados
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedStatusFilter, appliedTypeFilter, appliedCityFilter, appliedNeighborhoodFilter, 
      appliedTagsFilter, appliedPropertiesFilter, appliedSearchQuery]);

  const loadAnuncios = async () => {
    setLoading(true);
    try {
      // ✅ v1.0.103.405: Corrigida URL da Edge Function (removido /make-server-67caf26a/)
      // URL correta: /functions/v1/rendizy-server/properties/lista
      // 📄 PAGINAÇÃO: Enviamos page e limit para o servidor
      const token = localStorage.getItem('rendizy-token');
      
      // Construir URL com parâmetros de paginação e filtros
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      
      // Adicionar filtros aplicados à query
      if (appliedStatusFilter.length > 0) params.set('status', appliedStatusFilter.join(','));
      if (appliedTypeFilter.length > 0) params.set('type', appliedTypeFilter.join(','));
      if (appliedCityFilter.length > 0) params.set('city', appliedCityFilter.join(','));
      if (appliedNeighborhoodFilter.length > 0) params.set('neighborhood', appliedNeighborhoodFilter.join(','));
      if (appliedTagsFilter.length > 0) params.set('tags', appliedTagsFilter.join(','));
      if (appliedPropertiesFilter.length > 0) params.set('properties', appliedPropertiesFilter.join(','));
      if (appliedSearchQuery) params.set('q', appliedSearchQuery);
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/lista?${params.toString()}`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token || '',
          'Content-Type': 'application/json'
        }
      });

      let data: any[] = [];
      let total = 0;

      if (res.ok) {
        const response = await res.json();
        data = response.anuncios || [];
        // Se o servidor retornar total, usar; senão estimar
        total = response.total ?? response.count ?? data.length;
      }
      
      // Normalizar: alguns registros antigos podem vir com data como string
      const normalized = (data || []).map((row: any) => {
        const d = row?.data;
        if (typeof d === 'string') {
          try {
            return { ...row, data: JSON.parse(d) };
          } catch {
            return { ...row, data: {} };
          }
        }
        return row;
      });

      setAnuncios(normalized);
      setTotalCount(total);
    } catch (error) {
      console.error('❌ Erro ao carregar anúncios:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  // Funções de navegação de página
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll para o topo da lista
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const buildPublicSiteUrl = (subdomain: string, anuncioId: string) => {
    return `${CLIENT_SITES_BASE_URL}/${encodeURIComponent(subdomain)}/#/imovel/${encodeURIComponent(anuncioId)}`;
  };

  const fetchClientSiteSubdomain = async (orgId: string): Promise<string | null> => {
    if (siteSubdomains[orgId] !== undefined) {
      return siteSubdomains[orgId] || null;
    }

    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/rendizy-server/client-sites?organization_id=${encodeURIComponent(orgId)}`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            'X-Auth-Token': token || '',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        setSiteSubdomains(prev => ({ ...prev, [orgId]: null }));
        return null;
      }

      const data = await response.json().catch(() => null);
      const subdomain = typeof data?.data?.subdomain === 'string' ? data.data.subdomain.trim() : '';
      const resolved = subdomain ? subdomain : null;
      setSiteSubdomains(prev => ({ ...prev, [orgId]: resolved }));
      return resolved;
    } catch (error) {
      console.error('❌ Erro ao buscar site do cliente:', error);
      setSiteSubdomains(prev => ({ ...prev, [orgId]: null }));
      return null;
    }
  };

  const handleViewOnSite = async (anuncio: AnuncioUltimate) => {
    const orgId = anuncio.organization_id;
    if (!orgId) {
      toast.error('Organização do anúncio não encontrada');
      return;
    }

    const subdomain = await fetchClientSiteSubdomain(orgId);
    if (!subdomain) {
      toast.error('Site do cliente não encontrado para esta organização');
      return;
    }

    const url = buildPublicSiteUrl(subdomain, anuncio.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const orgIds = Array.from(
      new Set(
        (anuncios || [])
          .map((anuncio) => anuncio.organization_id)
          .filter((orgId): orgId is string => Boolean(orgId))
      )
    );

    const missing = orgIds.filter((orgId) => siteSubdomains[orgId] === undefined);
    if (missing.length === 0) return;

    missing.forEach((orgId) => {
      void fetchClientSiteSubdomain(orgId);
    });
  }, [anuncios, siteSubdomains]);

  // Filtrar anúncios baseado nos filtros aplicados (URL)
  const filteredAnuncios = useMemo(() => {
    // 🔑 Se qualquer filtro contém NONE_MARKER, retorna vazio
    if (appliedStatusFilter.includes('__NONE__') ||
        appliedTypeFilter.includes('__NONE__') ||
        appliedCityFilter.includes('__NONE__') ||
        appliedNeighborhoodFilter.includes('__NONE__') ||
        appliedTagsFilter.includes('__NONE__') ||
        appliedPropertiesFilter.includes('__NONE__')) {
      return [];
    }

    return anuncios.filter(anuncio => {
      // Filtro por status
      if (appliedStatusFilter.length > 0) {
        const status = (anuncio as any)?.status || 'draft';
        if (!appliedStatusFilter.includes(status)) return false;
      }

      // Filtro por tipo de imóvel
      if (appliedTypeFilter.length > 0) {
        const type = (anuncio as any)?.data?.property_type;
        if (!type || !appliedTypeFilter.includes(type)) return false;
      }

      // Filtro por cidade
      if (appliedCityFilter.length > 0) {
        const city = (anuncio as any)?.data?.location?.city;
        if (!city || !appliedCityFilter.includes(city)) return false;
      }

      // Filtro por bairro
      if (appliedNeighborhoodFilter.length > 0) {
        const neighborhood = (anuncio as any)?.data?.location?.neighborhood || 
                            (anuncio as any)?.data?.address?.neighborhood;
        if (!neighborhood || !appliedNeighborhoodFilter.includes(neighborhood)) return false;
      }

      // Filtro por tags (se o anúncio tiver tags)
      if (appliedTagsFilter.length > 0) {
        const tags = (anuncio as any)?.data?.tags || [];
        const hasMatchingTag = appliedTagsFilter.some(tag => tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Filtro por propriedades selecionadas
      if (appliedPropertiesFilter.length > 0) {
        if (!appliedPropertiesFilter.includes(anuncio.id)) return false;
      }

      // Filtro por busca (nome do imóvel)
      if (appliedSearchQuery.trim()) {
        const query = appliedSearchQuery.toLowerCase().trim();
        const title = getStringValue((anuncio as any)?.data?.title || '').toLowerCase();
        const address = getStringValue((anuncio as any)?.data?.location?.address || '').toLowerCase();
        const city = getStringValue((anuncio as any)?.data?.location?.city || '').toLowerCase();
        const internalId = getStringValue((anuncio as any)?.data?.internalId || '').toLowerCase();
        
        if (!title.includes(query) && !address.includes(query) && !city.includes(query) && !internalId.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [anuncios, appliedStatusFilter, appliedTypeFilter, appliedCityFilter, appliedNeighborhoodFilter, 
      appliedTagsFilter, appliedPropertiesFilter, appliedSearchQuery]);

  const sortedAnuncios = useMemo(() => {
    const keyFor = (a: AnuncioUltimate): string => {
      const raw = getStringValue((a as any)?.data?.title || '').trim();
      // Sem título (ou vazio) vai para o final, mantendo ordem estável por id
      if (!raw) return `\uffff\uffff\uffff-${a.id}`;
      return raw;
    };

    return [...filteredAnuncios].sort((a, b) => {
      const ka = keyFor(a);
      const kb = keyFor(b);
      const byTitle = collator.compare(ka, kb);
      if (byTitle !== 0) return byTitle;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [filteredAnuncios, collator]);

  // 📄 PAGINAÇÃO: Calcular itens da página atual
  const paginatedAnuncios = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedAnuncios.slice(startIndex, endIndex);
  }, [sortedAnuncios, currentPage, itemsPerPage]);

  // Total de páginas baseado nos itens filtrados
  const calculatedTotalPages = useMemo(() => {
    return Math.ceil(sortedAnuncios.length / itemsPerPage);
  }, [sortedAnuncios.length, itemsPerPage]);

  // Atualizar totalCount quando sortedAnuncios muda
  useEffect(() => {
    setTotalCount(sortedAnuncios.length);
  }, [sortedAnuncios.length]);

  // Resetar para página 1 se a página atual for maior que o total
  useEffect(() => {
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [calculatedTotalPages, currentPage]);

  const handleCreateNew = () => {
    navigate('/properties/novo');
  };

  const handleEdit = (anuncio: AnuncioUltimate) => {
    navigate(`/properties/${anuncio.id}/edit`);
  };

  const handleView = (anuncio: AnuncioUltimate) => {
    void handleViewOnSite(anuncio);
  };

  const handleStatusChange = async (anuncio: AnuncioUltimate, newStatus: 'inactive' | 'draft' | 'active') => {
    try {
      const token = localStorage.getItem('rendizy-token');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/${anuncio.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token || '',
          'Content-Type': 'application/json'
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
      const token = localStorage.getItem('rendizy-token');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/${anuncio.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': token || '',
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
      (a.data.propertyType || (a.data as any)?.tipoAcomodacao) &&
      (
        (a.data as any)?.basePrice ||
        (a.data as any)?.preco_base_noite ||
        (a.data as any)?.valor_aluguel ||
        (a.data as any)?.valor_venda
      )
    ).length;
    const rascunhos = total - completos;
    const comFotos = anuncios.filter(a => countPhotosFromData(a.data) > 0).length;

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

  const isCompleto = (anuncio: AnuncioUltimate) => {
    return !!(
      anuncio.data.title &&
      anuncio.data.description &&
      (anuncio.data.propertyType || (anuncio.data as any)?.tipoAcomodacao) &&
      (
        (anuncio.data as any)?.basePrice ||
        (anuncio.data as any)?.preco_base_noite ||
        (anuncio.data as any)?.valor_aluguel ||
        (anuncio.data as any)?.valor_venda
      )
    );
  };

  // Mapear dados do wizard antigo (campos em português) para formato esperado
  const mapWizardData = (data: any) => {
    // Mapear endereço
    const address = {
      street: data.address?.street || data.endereco?.street || data.rua || '',
      number: data.address?.number || data.endereco?.number || data.numero || '',
      neighborhood: data.address?.neighborhood || data.endereco?.neighborhood || data.bairro || '',
      city: data.address?.city || data.endereco?.city || data.cidade || '',
      state: data.address?.state || data.endereco?.state || data.estado || data.sigla_estado || ''
    };
    
    // PRIORIDADE 1: Dados diretos dos campos (importação StaysNet)
    let bedrooms = data.quartos || data.bedrooms || 0;
    let bathrooms = data.banheiros || data.bathrooms || 0;
    let beds = data.camas || data.beds || 0;
    let guests = data.capacidade || data.guests || 0;
    let coverPhoto = getStringValue(data.fotoPrincipal || data.coverPhoto || data.cover_photo || '');
    
    // PRIORIDADE 2: Calcular do array rooms[] se não tiver valores diretos
    // Rooms may exist even when counts are already persisted.
    const rooms = getRoomsArray(data.rooms);
    const roomPhotosFlat = getRoomPhotosFlat(rooms);

    if (bedrooms === 0 || beds === 0 || !coverPhoto) {
      try {
        if (Array.isArray(rooms)) {
          if (bedrooms === 0) {
            bedrooms = rooms.filter(r => 
              r.type?.includes('quarto') || r.typeName?.toLowerCase().includes('quarto')
            ).length;
          }
          
          if (beds === 0) {
            rooms.forEach(room => {
              if (room.beds && typeof room.beds === 'object') {
                Object.values(room.beds).forEach((count: any) => {
                  beds += parseInt(count) || 0;
                });
              }
            });
          }
          
          // Buscar foto de capa se não tiver
          if (!coverPhoto) {
            const coverPhotoId = data.cover_photo_id || data.coverPhotoId || null;

            // 1) Try exact match by id when photos are objects
            if (coverPhotoId) {
              const found = roomPhotosFlat.find((p: any) => {
                if (!p || typeof p !== 'object') return false;
                return String((p as any).id || (p as any).photoId || (p as any).photo_id || '') === String(coverPhotoId);
              });
              const foundUrl = extractPhotoUrl(found);
              if (foundUrl) coverPhoto = foundUrl;
            }

            // 2) Fallback to first available room photo (string or object)
            if (!coverPhoto) {
              const firstUrl = extractPhotoUrl(roomPhotosFlat[0]);
              if (firstUrl) coverPhoto = firstUrl;
            }
          }
        }
      } catch (e) {
        console.error('Erro ao parsear rooms:', e);
      }
    }

    // Final fallback: data.photos[0]
    if (!coverPhoto && Array.isArray(data.photos) && data.photos.length > 0) {
      coverPhoto = extractPhotoUrl(data.photos[0]);
    }
    
    return {
      ...data,
      address,
      bedrooms,
      bathrooms,
      beds,
      guests,
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
        {/* ✅ v1.0.105.001: pr-52 para espaço do TopBar */}
        <div className="flex items-center justify-between pr-52">
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
          {/* View Mode Toggle */}
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

      {/* Conteúdo com Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de Filtros - Design igual ao PropertySidebar */}
        <div className={`border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full transition-all duration-300 relative flex-shrink-0 ${isSidebarCollapsed ? 'w-12' : 'w-80'} overflow-hidden`}>
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 rounded-md transition-colors group"
            title={isSidebarCollapsed ? 'Expandir painel' : 'Minimizar painel'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
            )}
          </button>

          {/* Header - Fixo */}
          <div className={`p-4 border-b border-gray-200 flex-shrink-0 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* URL Sync Header */}
            <div className="flex flex-col gap-2 mb-3 pr-8">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900 dark:text-gray-100 font-medium">Propriedades</h2>
                <div className="flex items-center gap-1">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetAllFilters}
                      className="h-7 px-2 text-xs text-gray-500 hover:text-red-600"
                      title="Limpar todos os filtros"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyFilterUrl}
                    className="h-7 px-2 text-xs text-gray-500 hover:text-purple-600"
                    title="Copiar link com filtros"
                  >
                    {urlCopied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Botão BUSCAR - Aparece quando há alterações pendentes */}
              <Button
                variant={hasPendingChanges ? 'default' : 'outline'}
                size="sm"
                onClick={applyFilters}
                className={`w-full ${hasPendingChanges ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse' : ''}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                {hasPendingChanges ? 'Buscar (filtros alterados)' : 'Buscar'}
              </Button>
            </div>

            {/* Busca por nome */}
            <div className="mb-3">
              <Label className="text-xs text-gray-600 block mb-1">Buscar por nome</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Nome do imóvel..."
                  value={draftSearchQuery}
                  onChange={(e) => setDraftSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Filtros Avançados toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
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
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Filtros - Área Scrollável */}
          {showAdvancedFilters && !isSidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              
              {/* Propriedades - Collapsible */}
              <Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
                <div className="border border-gray-200 rounded-md bg-white">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1 text-left">
                        <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Propriedades</Label>
                        {/* 🔑 Mostrar "Nenhuma selecionada" quando NONE_MARKER */}
                        {!isPropertiesOpen && draftPropertiesFilter.includes(NONE_MARKER) && (
                          <span className="text-[10px] text-gray-500">Nenhuma selecionada</span>
                        )}
                        {!isPropertiesOpen && !draftPropertiesFilter.includes(NONE_MARKER) && draftPropertiesFilter.length > 0 && draftPropertiesFilter.length < anuncios.length && (
                          <span className="text-[10px] text-gray-500">{draftPropertiesFilter.length} de {anuncios.length} selecionadas</span>
                        )}
                        {!isPropertiesOpen && !draftPropertiesFilter.includes(NONE_MARKER) && (draftPropertiesFilter.length === 0 || draftPropertiesFilter.length === anuncios.length) && (
                          <span className="text-[10px] text-gray-500">Todas selecionadas</span>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isPropertiesOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                      {/* Busca */}
                      <div className="relative mb-3 mt-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar por identificação interna..."
                          value={propertySearchQuery}
                          onChange={(e) => setPropertySearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs"
                        />
                      </div>

                      {/* Controles de Seleção */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-600">
                          {/* 🔑 Mostrar 0 se contém NONE_MARKER */}
                          {draftPropertiesFilter.includes(NONE_MARKER) ? 0 : (draftPropertiesFilter.length || anuncios.length)} de {anuncios.length} selecionadas
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={selectAllProperties} className="h-6 px-2 text-[10px]">
                            Todas
                          </Button>
                          <Button variant="ghost" size="sm" onClick={deselectAllProperties} disabled={draftPropertiesFilter.includes(NONE_MARKER)} className="h-6 px-2 text-[10px]">
                            Nenhuma
                          </Button>
                        </div>
                      </div>

                      {/* Lista de Propriedades */}
                      <div className="max-h-[200px] overflow-y-auto space-y-1.5">
                        {filteredPropertiesForSelection.length === 0 ? (
                          <div className="py-4 text-center text-gray-400 text-[10px]">
                            Nenhuma propriedade encontrada
                          </div>
                        ) : (
                          filteredPropertiesForSelection.map(anuncio => (
                            <label
                              key={anuncio.id}
                              className={`
                                flex items-center gap-2 p-2 rounded cursor-pointer
                                transition-colors hover:bg-gray-50
                                ${!draftPropertiesFilter.includes(NONE_MARKER) && (draftPropertiesFilter.length === 0 || draftPropertiesFilter.includes(anuncio.id)) ? 'bg-blue-50' : ''}
                              `}
                            >
                              <Checkbox
                                checked={!draftPropertiesFilter.includes(NONE_MARKER) && (draftPropertiesFilter.length === 0 || draftPropertiesFilter.includes(anuncio.id))}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    // 🔑 Se estava em NONE_MARKER, começa selecionando apenas este
                                    if (draftPropertiesFilter.includes(NONE_MARKER) || draftPropertiesFilter.length === 0) {
                                      setDraftPropertiesFilter([anuncio.id]);
                                    } else {
                                      setDraftPropertiesFilter(prev => [...prev, anuncio.id]);
                                    }
                                  } else {
                                    const next = draftPropertiesFilter.filter(id => id !== anuncio.id && id !== NONE_MARKER);
                                    // 🔑 Se removeu todos, define NONE_MARKER
                                    setDraftPropertiesFilter(next.length === 0 ? [NONE_MARKER] : next);
                                  }
                                }}
                              />
                              <span className="text-[11px] text-gray-900 line-clamp-1 flex-1">
                                {getStringValue(anuncio.data?.title) || getStringValue(anuncio.data?.internalId) || 'Sem título'}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Tags - Collapsible */}
              <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                <div className="border border-gray-200 rounded-md bg-white">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1 text-left">
                        <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Tags</Label>
                        {!isTagsOpen && draftTagsFilter.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tagsOptions
                              .filter(tag => draftTagsFilter.includes(tag.value))
                              .slice(0, 3)
                              .map(tag => (
                                <Badge key={tag.value} className={`text-[10px] px-1.5 py-0 border ${tag.colorClass}`}>
                                  {tag.label}
                                </Badge>
                              ))}
                            {draftTagsFilter.length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                +{draftTagsFilter.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        {!isTagsOpen && draftTagsFilter.length === 0 && (
                          <span className="text-[10px] text-gray-500">Todas</span>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isTagsOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2 mt-3 pb-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-600">Selecionar tags</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={selectAllTags} className="h-6 px-2 text-[10px]">
                            Todas
                          </Button>
                          <Button variant="ghost" size="sm" onClick={deselectAllTags} disabled={draftTagsFilter.includes(NONE_MARKER)} className="h-6 px-2 text-[10px]">
                            Nenhuma
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 mt-3">
                        {tagsOptions.map(tag => (
                          <label key={tag.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                            <Checkbox
                              checked={!draftTagsFilter.includes(NONE_MARKER) && draftTagsFilter.includes(tag.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // 🔑 Se estava em NONE_MARKER, começa selecionando apenas este
                                  if (draftTagsFilter.includes(NONE_MARKER)) {
                                    setDraftTagsFilter([tag.value]);
                                  } else {
                                    setDraftTagsFilter(prev => [...prev, tag.value]);
                                  }
                                } else {
                                  const next = draftTagsFilter.filter(t => t !== tag.value && t !== NONE_MARKER);
                                  setDraftTagsFilter(next.length === 0 ? [NONE_MARKER] : next);
                                }
                              }}
                            />
                            <Badge className={`text-xs border ${tag.colorClass}`}>
                              {tag.label}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Tipo de Imóvel - Collapsible */}
              <Collapsible open={isTypeOpen} onOpenChange={setIsTypeOpen}>
                <div className="border border-gray-200 rounded-md bg-white">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1 text-left">
                        <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Tipo de Imóvel</Label>
                        {!isTypeOpen && draftTypeFilter.length > 0 && (
                          <span className="text-[10px] text-gray-500">{draftTypeFilter.length} selecionado(s)</span>
                        )}
                        {!isTypeOpen && draftTypeFilter.length === 0 && (
                          <span className="text-[10px] text-gray-500">Todos</span>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2 mt-3 pb-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-600">Selecionar tipos</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={selectAllTypes} className="h-6 px-2 text-[10px]">
                            Todas
                          </Button>
                          <Button variant="ghost" size="sm" onClick={deselectAllTypes} disabled={draftTypeFilter.includes(NONE_MARKER)} className="h-6 px-2 text-[10px]">
                            Nenhuma
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto mt-3">
                        {allPropertyTypes.length === 0 ? (
                          <div className="py-4 text-center text-gray-400 text-[10px]">
                            Nenhum tipo disponível
                          </div>
                        ) : (
                          allPropertyTypes.map(type => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                              <Checkbox
                                checked={!draftTypeFilter.includes(NONE_MARKER) && draftTypeFilter.includes(type)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    if (draftTypeFilter.includes(NONE_MARKER)) {
                                      setDraftTypeFilter([type]);
                                    } else {
                                      setDraftTypeFilter(prev => [...prev, type]);
                                    }
                                  } else {
                                    const next = draftTypeFilter.filter(t => t !== type && t !== NONE_MARKER);
                                    setDraftTypeFilter(next.length === 0 ? [NONE_MARKER] : next);
                                  }
                                }}
                              />
                              <span className="text-[11px] text-gray-900">{type}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Status - Collapsible */}
              <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
                <div className="border border-gray-200 rounded-md bg-white">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1 text-left">
                        <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Status</Label>
                        {/* 🔑 Mostrar "Nenhum" quando NONE_MARKER */}
                        {!isStatusOpen && draftStatusFilter.includes(NONE_MARKER) && (
                          <span className="text-[10px] text-gray-500">Nenhum</span>
                        )}
                        {!isStatusOpen && !draftStatusFilter.includes(NONE_MARKER) && draftStatusFilter.length > 0 && (
                          <span className="text-[10px] text-gray-500">{draftStatusFilter.length} selecionado(s)</span>
                        )}
                        {!isStatusOpen && !draftStatusFilter.includes(NONE_MARKER) && draftStatusFilter.length === 0 && (
                          <span className="text-[10px] text-gray-500">Todos</span>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2 mt-3 pb-2 border-b border-gray-100">
                        <span className="text-[10px] text-gray-600">Selecionar status</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={selectAllStatus} className="h-6 px-2 text-[10px]">
                            Todas
                          </Button>
                          <Button variant="ghost" size="sm" onClick={deselectAllStatus} className="h-6 px-2 text-[10px]">
                            Nenhuma
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        {[
                          { value: 'active', label: 'Ativo', color: 'bg-green-500' },
                          { value: 'draft', label: 'Rascunho', color: 'bg-yellow-500' },
                          { value: 'inactive', label: 'Desligado', color: 'bg-gray-500' }
                        ].map(status => (
                          <label key={status.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                            <Checkbox
                              checked={!draftStatusFilter.includes(NONE_MARKER) && draftStatusFilter.includes(status.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  if (draftStatusFilter.includes(NONE_MARKER)) {
                                    setDraftStatusFilter([status.value]);
                                  } else {
                                    setDraftStatusFilter(prev => [...prev, status.value]);
                                  }
                                } else {
                                  const next = draftStatusFilter.filter(s => s !== status.value && s !== NONE_MARKER);
                                  setDraftStatusFilter(next.length === 0 ? [NONE_MARKER] : next);
                                }
                              }}
                            />
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            <span className="text-[11px] text-gray-900">{status.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Cidade - Collapsible */}
              {allCities.length > 0 && (
                <Collapsible open={isCityOpen} onOpenChange={setIsCityOpen}>
                  <div className="border border-gray-200 rounded-md bg-white">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1 text-left">
                          <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Cidade</Label>
                          {!isCityOpen && draftCityFilter.includes(NONE_MARKER) && (
                            <span className="text-[10px] text-gray-500">Nenhuma</span>
                          )}
                          {!isCityOpen && !draftCityFilter.includes(NONE_MARKER) && draftCityFilter.length > 0 && (
                            <span className="text-[10px] text-gray-500">{draftCityFilter.length} selecionada(s)</span>
                          )}
                          {!isCityOpen && !draftCityFilter.includes(NONE_MARKER) && draftCityFilter.length === 0 && (
                            <span className="text-[10px] text-gray-500">Todas</span>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isCityOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                        {/* Busca */}
                        <div className="relative mb-3 mt-3">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Buscar cidade..."
                            value={citySearchQuery}
                            onChange={(e) => setCitySearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-[10px] text-gray-600">Selecionar cidades</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={selectAllCities} className="h-6 px-2 text-[10px]">
                              Todas
                            </Button>
                            <Button variant="ghost" size="sm" onClick={deselectAllCities} className="h-6 px-2 text-[10px]">
                              Nenhuma
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {allCities
                            .filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
                            .map(city => (
                              <label key={city} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                                <Checkbox
                                  checked={!draftCityFilter.includes(NONE_MARKER) && draftCityFilter.includes(city)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      if (draftCityFilter.includes(NONE_MARKER)) {
                                        setDraftCityFilter([city]);
                                      } else {
                                        setDraftCityFilter(prev => [...prev, city]);
                                      }
                                    } else {
                                      const next = draftCityFilter.filter(c => c !== city && c !== NONE_MARKER);
                                      setDraftCityFilter(next.length === 0 ? [NONE_MARKER] : next);
                                    }
                                  }}
                                />
                                <span className="text-[11px] text-gray-900 truncate">{city}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Bairro - Collapsible */}
              {allNeighborhoods.length > 0 && (
                <Collapsible open={isNeighborhoodOpen} onOpenChange={setIsNeighborhoodOpen}>
                  <div className="border border-gray-200 rounded-md bg-white">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex-1 text-left">
                          <Label className="text-xs text-gray-600 block mb-1 cursor-pointer">Bairro</Label>
                          {!isNeighborhoodOpen && draftNeighborhoodFilter.includes(NONE_MARKER) && (
                            <span className="text-[10px] text-gray-500">Nenhum</span>
                          )}
                          {!isNeighborhoodOpen && !draftNeighborhoodFilter.includes(NONE_MARKER) && draftNeighborhoodFilter.length > 0 && (
                            <span className="text-[10px] text-gray-500">{draftNeighborhoodFilter.length} selecionado(s)</span>
                          )}
                          {!isNeighborhoodOpen && !draftNeighborhoodFilter.includes(NONE_MARKER) && draftNeighborhoodFilter.length === 0 && (
                            <span className="text-[10px] text-gray-500">Todos</span>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isNeighborhoodOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                        {/* Busca */}
                        <div className="relative mb-3 mt-3">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Buscar bairro..."
                            value={neighborhoodSearchQuery}
                            onChange={(e) => setNeighborhoodSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-[10px] text-gray-600">Selecionar bairros</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={selectAllNeighborhoods} className="h-6 px-2 text-[10px]">
                              Todas
                            </Button>
                            <Button variant="ghost" size="sm" onClick={deselectAllNeighborhoods} className="h-6 px-2 text-[10px]">
                              Nenhuma
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {allNeighborhoods
                            .filter(n => n.toLowerCase().includes(neighborhoodSearchQuery.toLowerCase()))
                            .map(neighborhood => (
                              <label key={neighborhood} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                                <Checkbox
                                  checked={!draftNeighborhoodFilter.includes(NONE_MARKER) && draftNeighborhoodFilter.includes(neighborhood)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      if (draftNeighborhoodFilter.includes(NONE_MARKER)) {
                                        setDraftNeighborhoodFilter([neighborhood]);
                                      } else {
                                        setDraftNeighborhoodFilter(prev => [...prev, neighborhood]);
                                      }
                                    } else {
                                      const next = draftNeighborhoodFilter.filter(n => n !== neighborhood && n !== NONE_MARKER);
                                      setDraftNeighborhoodFilter(next.length === 0 ? [NONE_MARKER] : next);
                                    }
                                  }}
                                />
                                <span className="text-[11px] text-gray-900 truncate">{neighborhood}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

            </div>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Carregando anúncios...</p>
            </div>
          </div>
        ) : sortedAnuncios.length === 0 ? (
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
              {paginatedAnuncios.map((anuncio) => {
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
          // Lista View - Card Horizontal com mesmas funcionalidades do Grid
          <div className="p-8">
            <div className="space-y-4">
              {paginatedAnuncios.map((anuncio) => {
                const Icon = getPropertyTypeIcon(anuncio.data?.propertyType);
                const mappedData = mapWizardData(anuncio.data);
                const coverPhoto = mappedData.coverPhoto;
                
                return (
                  <Card key={anuncio.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    <div className="flex h-48">
                      {/* Foto de Capa - Lado Esquerdo */}
                      <div className="relative w-72 flex-shrink-0 overflow-hidden">
                        {coverPhoto ? (
                          <img
                            src={coverPhoto}
                            alt={anuncio.data.title || 'Anúncio'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Icon className="w-16 h-16 text-white/30" />
                          </div>
                        )}
                        
                        {/* Overlay sutil */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                        
                        {/* ID e Status no canto superior */}
                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                          {anuncio.data?.internalId && (
                            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs">
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
                            className={`cursor-pointer px-2 py-1 rounded-md text-xs font-medium text-white ${getStatusColor(anuncio.status)} backdrop-blur-sm hover:opacity-90 transition-opacity`}
                            title="Clique para alterar status (Desligado → Rascunho → Ativo)"
                          >
                            {getStatusLabel(anuncio.status)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Conteúdo - Lado Direito */}
                      <div className="flex-1 p-4 flex flex-col justify-between bg-white dark:bg-gray-800">
                        {/* Topo: Título e ID */}
                        <div>
                          <h3 
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 transition-colors line-clamp-1 mb-1"
                            onClick={() => handleEdit(anuncio)}
                          >
                            {getStringValue(anuncio.data.title) || 'Sem título'}
                          </h3>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <Hash className="w-3 h-3" />
                            <span className="font-mono">ID: {anuncio.id.slice(0, 8)}</span>
                          </div>
                          
                          {/* Ícones: Quartos, Banheiros, Camas, Hóspedes */}
                          <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300 text-sm flex-wrap mb-2">
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
                          </div>
                          
                          {/* Endereço */}
                          <div className="flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{formatAddress(anuncio.data)}</span>
                          </div>
                        </div>
                        
                        {/* Base: Ações */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(anuncio)}
                            className="h-8"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(anuncio)}
                            className="h-8"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(anuncio)}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 📄 CONTROLES DE PAGINAÇÃO */}
        {sortedAnuncios.length > 0 && (
          <div className="border-t bg-muted/30 px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Info de itens */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando{' '}
                  <span className="font-medium text-foreground">
                    {((currentPage - 1) * itemsPerPage) + 1}
                  </span>
                  {' '}-{' '}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * itemsPerPage, sortedAnuncios.length)}
                  </span>
                  {' '}de{' '}
                  <span className="font-medium text-foreground">
                    {sortedAnuncios.length}
                  </span>
                  {' '}anúncios
                </span>
                
                {/* Seletor de itens por página */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 text-sm border rounded-md bg-background"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={96}>96</option>
                  </select>
                </div>
              </div>

              {/* Navegação de páginas */}
              <div className="flex items-center gap-1">
                {/* Primeira página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  title="Primeira página"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                {/* Página anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Números das páginas */}
                <div className="flex items-center gap-1 mx-2">
                  {(() => {
                    const pages: (number | string)[] = [];
                    const total = calculatedTotalPages;
                    const current = currentPage;
                    
                    if (total <= 7) {
                      // Mostrar todas as páginas
                      for (let i = 1; i <= total; i++) pages.push(i);
                    } else {
                      // Mostrar páginas com elipses
                      if (current <= 4) {
                        pages.push(1, 2, 3, 4, 5, '...', total);
                      } else if (current >= total - 3) {
                        pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
                      } else {
                        pages.push(1, '...', current - 1, current, current + 1, '...', total);
                      }
                    }
                    
                    return pages.map((page, idx) => (
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(page as number)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    ));
                  })()}
                </div>

                {/* Próxima página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === calculatedTotalPages}
                  className="h-8 w-8 p-0"
                  title="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Última página */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToLastPage}
                  disabled={currentPage === calculatedTotalPages}
                  className="h-8 w-8 p-0"
                  title="Última página"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ListaAnuncios;
