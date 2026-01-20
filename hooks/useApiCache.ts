import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseApiCacheOptions {
  cacheTime?: number; // Tempo em ms para considerar cache válido (default: 5 min)
  staleTime?: number; // Tempo em ms para considerar dados "frescos" (default: 1 min)
}

/**
 * Hook para cachear resultados de API com invalidação automática
 * 
 * @example
 * const { data, isLoading, refetch } = useApiCache(
 *   'guests-list',
 *   () => guestsApi.list(),
 *   { cacheTime: 5 * 60 * 1000 }
 * );
 */
export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const { cacheTime = 5 * 60 * 1000, staleTime = 1 * 60 * 1000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Verificar se tem cache válido
  const getCachedData = useCallback((): CacheEntry<T> | null => {
    try {
      const cached = localStorage.getItem(`api-cache-${key}`);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const age = Date.now() - entry.timestamp;
        
        // Se ainda está dentro do cacheTime, retorna
        if (age < cacheTime) {
          return entry;
        }
      }
    } catch (err) {
      console.error('Error reading cache:', err);
    }
    return null;
  }, [key, cacheTime]);

  // Salvar no cache
  const setCachedData = useCallback((newData: T) => {
    try {
      const entry: CacheEntry<T> = {
        data: newData,
        timestamp: Date.now()
      };
      localStorage.setItem(`api-cache-${key}`, JSON.stringify(entry));
    } catch (err) {
      console.error('Error writing cache:', err);
    }
  }, [key]);

  // Fetch data
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Se não é force refresh, tenta usar cache
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        
        // Se está "stale", busca em background
        const age = Date.now() - cached.timestamp;
        if (age < staleTime) {
          return; // Dados frescos, não precisa buscar
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      setCachedData(result);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching ${key}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, getCachedData, setCachedData, staleTime]);

  // Refetch manual
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Invalidar cache
  const invalidate = useCallback(() => {
    try {
      localStorage.removeItem(`api-cache-${key}`);
      setData(null);
    } catch (err) {
      console.error('Error invalidating cache:', err);
    }
  }, [key]);

  // Buscar na montagem
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate
  };
}

/**
 * Utilitário para invalidar cache por padrão
 */
export function invalidateCachePattern(pattern: string) {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('api-cache-') && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error('Error invalidating cache pattern:', err);
  }
}
