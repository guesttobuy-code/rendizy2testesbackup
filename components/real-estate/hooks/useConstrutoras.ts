/**
 * 🏗️ Hook: useConstrutoras
 * 
 * Gerencia dados de construtoras do módulo Real Estate
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import type { Construtora, FiltroConstrutora } from '../types';

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

export function useConstrutoras(filtro?: FiltroConstrutora) {
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConstrutoras = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('re_companies')
        .select('*')
        .eq('type', 'constructor')
        .order('name');

      // Aplicar filtro de busca
      if (filtro?.search) {
        query = query.ilike('name', `%${filtro.search}%`);
      }

      // Aplicar filtro de status de parceria
      if (filtro?.partnershipStatus && filtro.partnershipStatus !== 'all') {
        query = query.eq('partnership_status', filtro.partnershipStatus);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Buscar contagem de empreendimentos por construtora
      const { data: developments } = await supabase
        .from('re_developments')
        .select('company_id');

      const launchCounts: Record<string, number> = {};
      (developments || []).forEach((dev: any) => {
        launchCounts[dev.company_id] = (launchCounts[dev.company_id] || 0) + 1;
      });

      // Formatar dados
      const formatted: Construtora[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || 'Especializada em empreendimentos de médio e alto padrão',
        logo: c.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=1e40af&color=fff`,
        location: formatLocation(c.location),
        rating: c.rating ?? 4.5,
        reviewsCount: c.reviews_count ?? 0,
        segments: c.segments || ['Médio', 'Alto Padrão'],
        launchesCount: launchCounts[c.id] || 0,
        partnershipStatus: c.partnership_status || 'open',
        verified: c.verified ?? false,
        commissionModel: c.commission_model || '5% sobre VGV',
        createdAt: c.created_at,
      }));

      setConstrutoras(formatted);
    } catch (err: any) {
      console.error('[useConstrutoras] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filtro?.search, filtro?.partnershipStatus]);

  useEffect(() => {
    loadConstrutoras();
  }, [loadConstrutoras]);

  return {
    construtoras,
    isLoading,
    error,
    reload: loadConstrutoras,
    total: construtoras.length,
  };
}
