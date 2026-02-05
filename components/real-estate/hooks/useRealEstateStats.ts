/**
 * 📊 Hook: useRealEstateStats
 * 
 * Estatísticas gerais do módulo Real Estate
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../../../utils/supabase/client';
import type { RealEstateStats } from '../types';

export function useRealEstateStats() {
  const [stats, setStats] = useState<RealEstateStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Buscar contagens em paralelo
      const [
        companiesResult,
        developmentsResult,
        unitsResult,
        brokersResult,
      ] = await Promise.all([
        supabase.from('re_companies').select('id, type, partnership_status'),
        supabase.from('re_developments').select('id, status, vgv'),
        supabase.from('re_units').select('id, status, price'),
        supabase.from('re_brokers').select('id, status'),
      ]);

      const companies = companiesResult.data || [];
      const developments = developmentsResult.data || [];
      const units = unitsResult.data || [];
      const brokers = brokersResult.data || [];

      // Calcular estatísticas
      const construtoras = companies.filter((c: any) => c.type === 'constructor');
      const imobiliarias = companies.filter((c: any) => c.type === 'real_estate');

      const construtorasParceiras = construtoras.filter((c: any) => c.partnership_status === 'active');
      const imobiliariasParceiras = imobiliarias.filter((c: any) => c.partnership_status === 'active');

      const lancamentos = developments.filter((d: any) => d.status === 'launch');
      const emConstrucao = developments.filter((d: any) => d.status === 'construction');
      const prontos = developments.filter((d: any) => d.status === 'ready');

      const unidadesDisponiveis = units.filter((u: any) => u.status === 'available');
      const unidadesVendidas = units.filter((u: any) => u.status === 'sold');
      const unidadesReservadas = units.filter((u: any) => u.status === 'reserved');

      const corretoresAtivos = brokers.filter((b: any) => b.status === 'active');

      // VGV total
      const vgvTotal = developments.reduce((acc: number, d: any) => acc + (d.vgv || 0), 0);
      const valorUnidades = units.reduce((acc: number, u: any) => acc + (u.price || 0), 0);

      const formattedStats: RealEstateStats = {
        construtoras: {
          total: construtoras.length,
          parceiras: construtorasParceiras.length,
          pendentes: construtoras.filter((c: any) => c.partnership_status === 'pending').length,
        },
        imobiliarias: {
          total: imobiliarias.length,
          parceiras: imobiliariasParceiras.length,
          pendentes: imobiliarias.filter((c: any) => c.partnership_status === 'pending').length,
        },
        empreendimentos: {
          total: developments.length,
          lancamentos: lancamentos.length,
          emConstrucao: emConstrucao.length,
          prontos: prontos.length,
        },
        unidades: {
          total: units.length,
          disponiveis: unidadesDisponiveis.length,
          reservadas: unidadesReservadas.length,
          vendidas: unidadesVendidas.length,
        },
        corretores: {
          total: brokers.length,
          ativos: corretoresAtivos.length,
        },
        financeiro: {
          vgvTotal,
          valorUnidades,
          ticketMedio: units.length > 0 ? valorUnidades / units.length : 0,
        },
      };

      setStats(formattedStats);
    } catch (err: any) {
      console.error('[useRealEstateStats] Erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    error,
    reload: loadStats,
  };
}
