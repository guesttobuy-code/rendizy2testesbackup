/**
 * 🏢 Hook: useImobiliarias
 * 
 * Gerencia dados de imobiliárias do módulo Real Estate
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import type { Imobiliaria, FiltroImobiliaria } from '../types';

// Helper para formatar location
function formatLocation(location: any): string {
  if (!location) return 'Brasil';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    const parts = [location.city, location.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Brasil';
  }
  return String(location);
}

export function useImobiliarias(filtro?: FiltroImobiliaria) {
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImobiliarias = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('re_companies')
        .select('*')
        .eq('type', 'real_estate')
        .order('name');

      // Aplicar filtro de busca
      if (filtro?.search) {
        query = query.ilike('name', `%${filtro.search}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Formatar dados
      const formatted: Imobiliaria[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || 'Imobiliária especializada em imóveis de médio e alto padrão',
        logo: c.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=059669&color=fff`,
        location: formatLocation(c.location),
        rating: c.rating ?? 4.5,
        reviewsCount: c.reviews_count ?? 0,
        brokersCount: c.brokers_count ?? 0,
        activeListings: c.active_listings ?? 0,
        partnershipStatus: c.partnership_status || 'open',
        partnershipModel: c.partnership_model || '50/50',
        verified: c.verified ?? false,
        createdAt: c.created_at,
      }));

      setImobiliarias(formatted);
    } catch (err: any) {
      console.error('[useImobiliarias] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filtro?.search]);

  useEffect(() => {
    loadImobiliarias();
  }, [loadImobiliarias]);

  return {
    imobiliarias,
    isLoading,
    error,
    reload: loadImobiliarias,
    total: imobiliarias.length,
  };
}
