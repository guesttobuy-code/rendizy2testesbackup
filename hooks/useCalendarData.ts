/**
 * CALENDAR DATA HOOKS
 * React Query hooks para data fetching otimizado
 * Mantém compatibilidade com sistema existente
 * v1.0.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi, reservationsApi, calendarApi } from '../utils/api';
import { toast } from 'sonner';
import type { Property } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================
// PROPERTIES
// ============================================

/**
 * Hook para carregar propriedades de anuncios_ultimate
 * Cache: 5 minutos
 * Refetch: ao focar janela
 */
export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      console.log('🔄 [useProperties] Carregando imóveis de Anúncios Ultimate...');
      
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
      const ANON_KEY = publicAnonKey;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/anuncios-ultimate/lista`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
          'Content-Type': 'application/json'
        }
      });

      let anuncios: any[] = [];

      if (response.ok) {
        if (response.status === 204) {
          console.log('ℹ️ [useProperties] API retornou 204 (sem conteúdo)');
        } else {
          const contentType = response.headers.get('content-type') || '';
          const rawText = await response.text();

          if (!rawText.trim()) {
            console.log('ℹ️ [useProperties] API retornou body vazio');
          } else if (!contentType.toLowerCase().includes('application/json')) {
            console.warn('⚠️ [useProperties] content-type não JSON:', contentType);
            throw new Error('Resposta inválida do servidor (esperado JSON)');
          } else {
            const result = JSON.parse(rawText);
            anuncios = result.anuncios || [];
          }
        }
      }

      if (anuncios && anuncios.length) {
        const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
        const properties: Property[] = anuncios.map((a: any) => {
          const title = a.data?.title || a.title || 'Sem título';
          const internalId = a.data?.internalId || a.data?.internal_id || a.internalId || a.internal_id || '';
          const propertyId = a.id || '';
          const pricing = a.data?.pricing || a.pricing || {};

          const toNumberOrUndefined = (v: unknown): number | undefined => {
            if (v === null || v === undefined) return undefined;
            const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
            if (!Number.isFinite(n)) return undefined;
            return n;
          };

          const basePriceRaw =
            pricing?.basePrice ??
            pricing?.base_price ??
            a.data?.basePrice ??
            a.data?.base_price ??
            a.data?.preco_base_noite ??
            a.data?.precoBaseNoite ??
            a.pricing_base_price ??
            a.basePrice ??
            a.base_price;

          const basePrice = toNumberOrUndefined(basePriceRaw);
          const coverPhoto =
            a.data?.coverPhoto ||
            a.data?.cover_photo ||
            a.coverPhoto ||
            a.cover_photo ||
            a.data?.photos?.[0] ||
            a.photos?.[0] ||
            '';
          
          return {
            id: propertyId,
            name: title,
            title,
            internalId,
            coverPhoto,
            basePrice,
            image: coverPhoto || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=100&h=100&fit=crop',
            type: 'Imóvel',
            location: 'A definir',
            tarifGroup: 'Ultimate',
            tags: []
          };
        }).filter((p: Property) => p.id);

        // Ordenação fixa: alfabética por name/title + desempate por id
        properties.sort((a, b) => {
          const ta = String(a.title || a.name || '').trim();
          const tb = String(b.title || b.name || '').trim();
          const ka = ta ? ta : `\uffff\uffff\uffff-${a.id}`;
          const kb = tb ? tb : `\uffff\uffff\uffff-${b.id}`;
          const byTitle = collator.compare(ka, kb);
          if (byTitle !== 0) return byTitle;
          return String(a.id).localeCompare(String(b.id));
        });

        console.log(`✅ [useProperties] ${properties.length} imóveis carregados`);
        return properties;
      }
      
      return [];
    },
    staleTime: 5 * 60 * 1000, // Cache válido por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém em cache por 10 minutos após não usado
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

// ============================================
// RESERVATIONS
// ============================================

interface UseReservationsOptions {
  enabled?: boolean;
}

/**
 * Hook para carregar reservas
 * Cache: 2 minutos
 */
export function useReservations(options: UseReservationsOptions = {}) {
  return useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      console.log('🔄 [useReservations] Carregando reservas...');
      const response = await reservationsApi.list();
      
      if (response.success && response.data) {
        // ✅ Filtrar reservas canceladas
        const activeReservations = response.data.filter((r: any) => r.status !== 'cancelled');
        console.log(`✅ [useReservations] ${activeReservations.length} reservas ativas carregadas (${response.data.length} total, ${response.data.length - activeReservations.length} canceladas)`);
        return activeReservations;
      }

      // ✅ Estabilidade: não “zerar” reservas em falha temporária.
      // Se a API falhar (token expirar, 401, rede), lançar erro para o React Query
      // manter o último dado bom em cache, evitando sumir todos os cards.
      throw new Error(response.error || 'Falha ao carregar reservas');
    },
    staleTime: 2 * 60 * 1000, // Cache válido por 2 minutos
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: options.enabled !== false,
    retry: 2,
  });
}

// ============================================
// CALENDAR DATA
// ============================================

interface UseCalendarDataOptions {
  propertyIds: string[];
  dateRange: { from: Date; to: Date };
  enabled?: boolean;
}

/**
 * Hook para carregar dados do calendário (preços, disponibilidade, etc)
 * Cache: 3 minutos
 * Só busca se houver propriedades selecionadas
 */
export function useCalendarData({ propertyIds, dateRange, enabled = true }: UseCalendarDataOptions) {
  return useQuery({
    queryKey: ['calendar', propertyIds, dateRange],
    queryFn: async () => {
      if (propertyIds.length === 0) return { days: [], blocks: [] };
      
      console.log(`🔄 [useCalendarData] Buscando bloqueios para ${propertyIds.length} propriedades`);
      
      try {
        // ✅ Buscar todos os bloqueios de uma vez (API aceita array de IDs)
        const blocksResponse = await calendarApi.getBlocks(propertyIds);

        if (!blocksResponse.success) {
          // ✅ Estabilidade: não sobrescrever com [] em falha temporária
          throw new Error(blocksResponse.error || 'Falha ao carregar bloqueios');
        }

        const allBlocks = blocksResponse.data || [];
        
        console.log(`✅ [useCalendarData] ${allBlocks.length} bloqueios carregados`);
        
        return { blocks: allBlocks };
      } catch (error) {
        console.error('❌ [useCalendarData] Erro ao buscar bloqueios:', error);

        // Deixar o React Query marcar como erro e manter o último valor bom.
        throw error instanceof Error ? error : new Error('Erro desconhecido ao buscar bloqueios');
      }
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: enabled && propertyIds.length > 0,
    retry: 1,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Hook para criar reserva
 * Invalida cache de reservations após sucesso
 */
export function useCreateReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      console.log('📤 [useCreateReservation] Criando reserva:', data);
      const response = await reservationsApi.create(data);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar reserva');
      }
      
      return response.data;
    },
    onSuccess: () => {
      console.log('✅ [useCreateReservation] Reserva criada com sucesso');
      
      // Invalida cache para forçar reload
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      
      toast.success('Reserva criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('❌ [useCreateReservation] Erro:', error);
      toast.error(error.message);
    },
  });
}

/**
 * Hook para criar bloqueio
 */
export function useCreateBlock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      console.log('📤 [useCreateBlock] Criando bloqueio:', data);
      const response = await calendarApi.createBlock(data);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar bloqueio');
      }
      
      return response.data;
    },
    onSuccess: () => {
      console.log('✅ [useCreateBlock] Bloqueio criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Bloqueio criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('❌ [useCreateBlock] Erro:', error);
      toast.error(error.message);
    },
  });
}

// ============================================
// PREFETCH HELPERS
// ============================================

/**
 * Hook para prefetch de dados do calendário
 * Útil para carregar dados antes de navegar
 */
export function usePrefetchCalendar() {
  const queryClient = useQueryClient();
  
  return {
    prefetchProperties: () => {
      queryClient.prefetchQuery({
        queryKey: ['properties'],
        queryFn: async () => {
          const response = await propertiesApi.list();
          return response.data || [];
        },
      });
    },
    
    prefetchReservations: () => {
      queryClient.prefetchQuery({
        queryKey: ['reservations'],
        queryFn: async () => {
          const response = await reservationsApi.list();
          return response.data || [];
        },
      });
    },
  };
}
