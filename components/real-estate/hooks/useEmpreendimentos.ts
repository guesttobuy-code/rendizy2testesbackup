/**
 * 🏘️ Hook: useEmpreendimentos
 * 
 * Gerencia dados de empreendimentos do módulo Real Estate
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import type { Empreendimento, FiltroEmpreendimento } from '../types';

export function useEmpreendimentos(filtro?: FiltroEmpreendimento) {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmpreendimentos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('re_developments')
        .select(`
          *,
          company:re_companies(id, name, logo_url)
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtro de busca
      if (filtro?.search) {
        query = query.ilike('name', `%${filtro.search}%`);
      }

      // Filtro por construtora
      if (filtro?.companyId) {
        query = query.eq('company_id', filtro.companyId);
      }

      // Filtro por status
      if (filtro?.status && filtro.status !== 'all') {
        query = query.eq('status', filtro.status);
      }

      // Filtro por cidade
      if (filtro?.city) {
        query = query.ilike('city', `%${filtro.city}%`);
      }

      // Filtro por tipo
      if (filtro?.propertyType) {
        query = query.eq('property_type', filtro.propertyType);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Buscar contagem de unidades por empreendimento
      const { data: units } = await supabase
        .from('re_units')
        .select('development_id, status');

      const unitCounts: Record<string, { total: number; available: number }> = {};
      (units || []).forEach((unit: any) => {
        if (!unitCounts[unit.development_id]) {
          unitCounts[unit.development_id] = { total: 0, available: 0 };
        }
        unitCounts[unit.development_id].total++;
        if (unit.status === 'available') {
          unitCounts[unit.development_id].available++;
        }
      });

      // Formatar dados
      const formatted: Empreendimento[] = (data || []).map((dev: any) => ({
        id: dev.id,
        name: dev.name,
        description: dev.description || '',
        companyId: dev.company_id,
        companyName: dev.company?.name || 'Construtora',
        companyLogo: dev.company?.logo_url,
        images: dev.images || [],
        mainImage: dev.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=3b82f6&color=fff&size=400`,
        city: dev.city || '',
        state: dev.state || '',
        neighborhood: dev.neighborhood || '',
        address: dev.address || '',
        status: dev.status || 'launch',
        propertyType: dev.property_type || 'apartment',
        priceMin: dev.price_min || 0,
        priceMax: dev.price_max || 0,
        areaMin: dev.area_min || 0,
        areaMax: dev.area_max || 0,
        bedroomsMin: dev.bedrooms_min || 0,
        bedroomsMax: dev.bedrooms_max || 0,
        totalUnits: unitCounts[dev.id]?.total || dev.total_units || 0,
        availableUnits: unitCounts[dev.id]?.available || dev.available_units || 0,
        deliveryDate: dev.delivery_date,
        amenities: dev.amenities || [],
        differentials: dev.differentials || [],
        commission: dev.commission || '5%',
        featured: dev.featured ?? false,
        vgv: dev.vgv || 0,
        createdAt: dev.created_at,
      }));

      setEmpreendimentos(formatted);
    } catch (err: any) {
      console.error('[useEmpreendimentos] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filtro?.search, filtro?.companyId, filtro?.status, filtro?.city, filtro?.propertyType]);

  useEffect(() => {
    loadEmpreendimentos();
  }, [loadEmpreendimentos]);

  // Agrupados por status
  const byStatus = {
    lancamentos: empreendimentos.filter(e => e.status === 'launch'),
    emConstrucao: empreendimentos.filter(e => e.status === 'construction'),
    prontos: empreendimentos.filter(e => e.status === 'ready'),
  };

  return {
    empreendimentos,
    isLoading,
    error,
    reload: loadEmpreendimentos,
    total: empreendimentos.length,
    byStatus,
  };
}
