/**
 * REACT QUERY CLIENT SETUP
 * Configuração otimizada para RENDIZY
 * v1.0.0
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configurações globais
      staleTime: 2 * 60 * 1000, // 2 minutos default
      gcTime: 5 * 60 * 1000, // Mantém em cache por 5 minutos
      refetchOnWindowFocus: true, // Revalida ao voltar pro app
      refetchOnReconnect: true, // Revalida ao reconectar internet
      retry: 2, // 2 tentativas em caso de erro
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 1, // 1 tentativa para mutations
      onError: (error) => {
        console.error('❌ [Mutation Error]:', error);
      },
    },
  },
});
