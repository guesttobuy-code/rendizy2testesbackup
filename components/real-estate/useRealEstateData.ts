/**
 * 🏗️ REAL ESTATE - Hook para Dados Reais
 * 
 * Busca dados das tabelas re_* do Supabase
 * Substitui os dados MOCK do módulo
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../utils/supabase/client';

// Tipos
interface RECompany {
  id: string;
  name: string;
  type: 'constructor' | 'real_estate_agency';
  description?: string;
  logo_url?: string;
  location?: { city?: string; state?: string; address?: string };
  partnership_status: 'open' | 'closed';
  verified?: boolean;
  rating?: number;
  reviews_count?: number;
  launchesCount?: number; // calculado
  segments?: string[];
  commissionModel?: string;
}

interface REDevelopment {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  location?: { city?: string; state?: string; address?: string };
  phase: 'launch' | 'construction' | 'ready';
  total_units: number;
  available_units: number;
  sold_percentage: number;
  price_range?: { min?: number; max?: number; currency?: string };
  typologies?: string[];
  virtual_tour_url?: string;
  marketing_materials?: any[];
  // Campos calculados para compatibilidade com MOCK
  constructor?: string;
  constructorLogo?: string;
  image?: string;
  priceRange?: string;
  deliveryDate?: string;
  hasVirtualTour?: boolean;
  campanhaAtiva?: boolean;
}

interface REUnit {
  id: string;
  development_id: string;
  unit_number: string;
  block?: string;
  typology?: string;
  status: 'available' | 'reserved' | 'sold';
  sold_date?: string;
  // ✨ FASE 3.6 - Campos de condições de pagamento
  price?: number;
  price_source?: string;
  price_updated_at?: string;
  payment_conditions?: {
    campanha?: string;
    sinal?: { percentual: number; valor: number; data_inicio?: string };
    mensais?: { quantidade: number; percentual: number; valor_parcela: number; data_inicio?: string };
    intermediarias?: { quantidade: number; percentual: number; valor_parcela: number; data_inicio?: string };
    balao_final?: { percentual: number; valor: number; data?: string };
  };
}

export function useRealEstateData() {
  const [companies, setCompanies] = useState<RECompany[]>([]);
  const [developments, setDevelopments] = useState<REDevelopment[]>([]);
  const [units, setUnits] = useState<REUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    console.log('[RE] loadData iniciando...');
    setIsLoading(true);
    setError(null);
    
    try {
      const supabase = getSupabaseClient();
      console.log('[RE] Supabase client obtido');
      
      // Buscar construtoras
      const { data: companiesData, error: companiesError } = await supabase
        .from('re_companies')
        .select('*')
        .order('name');
      
      console.log('[RE] Companies carregadas:', companiesData?.length, companiesData);
      console.log('[RE] Companies error:', companiesError);
      if (companiesError) {
        console.error('[RE] Erro ao buscar companies:', companiesError);
        throw companiesError;
      }
      
      // Buscar empreendimentos com join na company
      const { data: developmentsData, error: developmentsError } = await supabase
        .from('re_developments')
        .select(`
          *,
          company:re_companies(id, name, logo_url)
        `)
        .order('name');
      
      if (developmentsError) throw developmentsError;
      
      // Buscar unidades (limitado para performance)
      const { data: unitsData, error: unitsError } = await supabase
        .from('re_units')
        .select('*')
        .limit(1000);
      
      if (unitsError) throw unitsError;
      
      // Contar lançamentos por construtora
      const launchCounts: Record<string, number> = {};
      (developmentsData || []).forEach((dev: any) => {
        launchCounts[dev.company_id] = (launchCounts[dev.company_id] || 0) + 1;
      });
      
      // Formatar companies
      const formattedCompanies: RECompany[] = (companiesData || []).map((c: any) => {
        // Formatar location como string se for objeto
        const locationStr = typeof c.location === 'object' && c.location
          ? [c.location.city, c.location.state].filter(Boolean).join(', ') || 'Brasil'
          : (c.location || 'Brasil');
        
        return {
          ...c,
          launchesCount: launchCounts[c.id] || 0,
          logo: c.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'C')}&background=1e40af&color=fff`,
          location: locationStr,
          segments: c.segments || ['Médio', 'Alto Padrão'],
          commissionModel: c.commission_model || '5% sobre VGV',
          partnershipStatus: c.partnership_status || 'open',
          rating: c.rating ?? 4.5,
          reviewsCount: c.reviews_count ?? 0,
        };
      });
      
      // Formatar developments para compatibilidade com MOCK
      const formattedDevelopments: REDevelopment[] = (developmentsData || []).map((d: any) => ({
        ...d,
        constructor: d.company?.name || 'Construtora',
        constructorLogo: d.company?.logo_url || 'https://ui-avatars.com/api/?name=C&background=1e40af&color=fff',
        // ✅ Usar imagem real do banco (array images[0]) ou fallback
        image: d.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
        priceRange: d.price_range ? 
          `R$ ${(d.price_range.min || 0).toLocaleString('pt-BR')} - R$ ${(d.price_range.max || 0).toLocaleString('pt-BR')}` : 
          'Consulte',
        deliveryDate: 'Dez/2027', // TODO: extrair do banco
        hasVirtualTour: !!d.virtual_tour_url,
        virtualTourUrl: d.virtual_tour_url,
        campanhaAtiva: false, // TODO: implementar campanhas
        materiais: {
          bookDigital: true,
          tabelaPrecos: true,
          fichaTecnica: true,
          decoradoVirtual: !!d.virtual_tour_url,
        },
        soldPercentage: d.sold_percentage || 0,
        totalUnits: d.total_units || 0,
        availableUnits: d.available_units || 0,
        typologies: d.typologies || [],
        // ✅ Manter location como objeto para que formatLocationForCard possa extrair neighborhood
        location: d.location || { city: 'Rio de Janeiro', state: 'RJ' },
      }));
      
      setCompanies(formattedCompanies);
      setDevelopments(formattedDevelopments);
      setUnits(unitsData || []);
      
    } catch (err: any) {
      console.error('[RE] Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Filtrar construtoras (aceita 'constructor' ou 'construtora')
  const construtoras = companies.filter(c => c.type === 'constructor' || c.type === 'construtora');
  const imobiliarias = companies.filter(c => c.type === 'real_estate_agency' || c.type === 'imobiliaria');

  // Buscar unidades de um empreendimento (direto do banco)
  const fetchUnitsByDevelopment = useCallback(async (developmentId: string): Promise<REUnit[]> => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('re_units')
        .select('*')
        .eq('development_id', developmentId)
        .order('floor', { ascending: false })
        .order('unit_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[RE] Erro ao buscar unidades:', err);
      return [];
    }
  }, []); // Sem dependências - função estável

  // Estatísticas
  const stats = {
    totalConstrutoras: construtoras.length,
    totalImobiliarias: imobiliarias.length,
    totalDevelopments: developments.length,
    totalUnits: units.length,
    availableUnits: units.filter(u => u.status === 'available').length,
    soldUnits: units.filter(u => u.status === 'sold').length,
  };

  return {
    companies,
    construtoras,
    imobiliarias,
    developments,
    units,
    stats,
    isLoading,
    error,
    reload: loadData,
    getUnitsByDevelopment: fetchUnitsByDevelopment, // Usa a versão assíncrona que busca do banco
  };
}

// Hook para buscar detalhes de um empreendimento
export function useDevelopmentDetail(developmentId: string) {
  const [development, setDevelopment] = useState<REDevelopment | null>(null);
  const [units, setUnits] = useState<REUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!developmentId) return;
    loadDetail();
  }, [developmentId]);

  async function loadDetail() {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      // Buscar empreendimento
      const { data: devData, error: devError } = await supabase
        .from('re_developments')
        .select(`
          *,
          company:re_companies(id, name, logo_url)
        `)
        .eq('id', developmentId)
        .single();
      
      if (devError) throw devError;
      
      // Buscar unidades
      const { data: unitsData, error: unitsError } = await supabase
        .from('re_units')
        .select('*')
        .eq('development_id', developmentId)
        .order('unit_number');
      
      if (unitsError) throw unitsError;
      
      // Type assertion para o resultado do join
      const dev = devData as any;
      
      setDevelopment({
        ...dev,
        constructor: dev.company?.name,
        constructorLogo: dev.company?.logo_url,
      } as REDevelopment);
      setUnits((unitsData as REUnit[]) || []);
      
    } catch (err: any) {
      console.error('[RE] Erro ao carregar detalhe:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Agrupar unidades por bloco
  const unitsByBlock = units.reduce((acc, unit) => {
    const block = unit.block || 'Principal';
    if (!acc[block]) acc[block] = [];
    acc[block].push(unit);
    return acc;
  }, {} as Record<string, REUnit[]>);

  // Estatísticas do empreendimento
  const stats = {
    total: units.length,
    available: units.filter(u => u.status === 'available').length,
    reserved: units.filter(u => u.status === 'reserved').length,
    sold: units.filter(u => u.status === 'sold').length,
  };

  return {
    development,
    units,
    unitsByBlock,
    stats,
    isLoading,
    error,
    reload: loadDetail,
  };
}
