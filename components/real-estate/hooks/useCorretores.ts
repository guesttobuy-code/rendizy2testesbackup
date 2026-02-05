/**
 * 👤 Hook: useCorretores
 * 
 * Gerencia dados de corretores do módulo Real Estate
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import type { Corretor, FiltroCorretor } from '../types';

export function useCorretores(filtro?: FiltroCorretor) {
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCorretores = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      
      let query = supabase
        .from('re_brokers')
        .select(`
          *,
          company:re_companies(id, name, logo_url, type)
        `)
        .order('name');

      // Aplicar filtro de busca
      if (filtro?.search) {
        query = query.ilike('name', `%${filtro.search}%`);
      }

      // Filtro por imobiliária
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

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Formatar dados
      const formatted: Corretor[] = (data || []).map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        email: broker.email || '',
        phone: broker.phone || '',
        whatsapp: broker.whatsapp || broker.phone || '',
        avatar: broker.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(broker.name)}&background=8b5cf6&color=fff`,
        creci: broker.creci || '',
        companyId: broker.company_id,
        companyName: broker.company?.name || '',
        companyType: broker.company?.type || 'real_estate',
        city: broker.city || '',
        state: broker.state || '',
        specialties: broker.specialties || [],
        rating: broker.rating ?? 4.5,
        reviewsCount: broker.reviews_count ?? 0,
        salesCount: broker.sales_count ?? 0,
        leadsCount: broker.leads_count ?? 0,
        status: broker.status || 'active',
        verified: broker.verified ?? false,
        bio: broker.bio || '',
        socialLinks: broker.social_links || {},
        createdAt: broker.created_at,
      }));

      setCorretores(formatted);
    } catch (err: any) {
      console.error('[useCorretores] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filtro?.search, filtro?.companyId, filtro?.status, filtro?.city]);

  useEffect(() => {
    loadCorretores();
  }, [loadCorretores]);

  // Estatísticas
  const stats = {
    total: corretores.length,
    ativos: corretores.filter(c => c.status === 'active').length,
    verificados: corretores.filter(c => c.verified).length,
    mediaRating: corretores.length > 0 
      ? corretores.reduce((acc, c) => acc + c.rating, 0) / corretores.length 
      : 0,
    totalVendas: corretores.reduce((acc, c) => acc + c.salesCount, 0),
  };

  return {
    corretores,
    isLoading,
    error,
    reload: loadCorretores,
    total: corretores.length,
    stats,
  };
}
