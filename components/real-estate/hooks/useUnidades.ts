/**
 * 🏠 Hook: useUnidades
 * 
 * Gerencia dados de unidades do módulo Real Estate
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import type { Unidade, FiltroUnidade } from '../types';

export function useUnidades(filtro?: FiltroUnidade) {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUnidades = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('re_units')
        .select(`
          *,
          development:re_developments(id, name, city, state)
        `)
        .order('unit_number');

      // Filtro por empreendimento
      if (filtro?.developmentId) {
        query = query.eq('development_id', filtro.developmentId);
      }

      // Filtro por status
      if (filtro?.status && filtro.status !== 'all') {
        query = query.eq('status', filtro.status);
      }

      // Filtro por tipologia
      if (filtro?.typology) {
        query = query.eq('typology', filtro.typology);
      }

      // Filtro por preço
      if (filtro?.priceMin) {
        query = query.gte('price', filtro.priceMin);
      }
      if (filtro?.priceMax) {
        query = query.lte('price', filtro.priceMax);
      }

      // Filtro por área
      if (filtro?.areaMin) {
        query = query.gte('private_area', filtro.areaMin);
      }
      if (filtro?.areaMax) {
        query = query.lte('private_area', filtro.areaMax);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Formatar dados
      const formatted: Unidade[] = (data || []).map((unit: any) => ({
        id: unit.id,
        developmentId: unit.development_id,
        developmentName: unit.development?.name || '',
        developmentCity: unit.development?.city || '',
        developmentState: unit.development?.state || '',
        unitNumber: unit.unit_number || '',
        block: unit.block || '',
        floor: unit.floor || 0,
        typology: unit.typology || '',
        bedrooms: unit.bedrooms || 0,
        suites: unit.suites || 0,
        bathrooms: unit.bathrooms || 0,
        parkingSpaces: unit.parking_spaces || 0,
        privateArea: unit.private_area || 0,
        totalArea: unit.total_area || 0,
        price: unit.price || 0,
        pricePerM2: unit.price && unit.private_area ? unit.price / unit.private_area : 0,
        status: unit.status || 'available',
        position: unit.position || '', // Frente, fundos, lateral
        sunExposure: unit.sun_exposure || '', // Nascente, poente
        view: unit.view || '', // Mar, cidade, parque
        floorPlan: unit.floor_plan_url,
        images: unit.images || [],
        differentials: unit.differentials || [],
        createdAt: unit.created_at,
      }));

      setUnidades(formatted);
    } catch (err: any) {
      console.error('[useUnidades] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filtro?.developmentId, filtro?.status, filtro?.typology, filtro?.priceMin, filtro?.priceMax, filtro?.areaMin, filtro?.areaMax]);

  useEffect(() => {
    loadUnidades();
  }, [loadUnidades]);

  // Estatísticas
  const stats = {
    total: unidades.length,
    disponiveis: unidades.filter(u => u.status === 'available').length,
    reservadas: unidades.filter(u => u.status === 'reserved').length,
    vendidas: unidades.filter(u => u.status === 'sold').length,
    valorTotal: unidades.reduce((acc, u) => acc + u.price, 0),
    precoMedio: unidades.length > 0 
      ? unidades.reduce((acc, u) => acc + u.price, 0) / unidades.length 
      : 0,
  };

  // Agrupadas por tipologia
  const tipologias = Array.from(new Set(unidades.map(u => u.typology))).filter(Boolean);

  return {
    unidades,
    isLoading,
    error,
    reload: loadUnidades,
    stats,
    tipologias,
  };
}
