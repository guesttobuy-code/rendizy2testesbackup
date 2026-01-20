/**
 * Fetch com retry automático e melhor tratamento de erros
 */

interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Realiza fetch com retry automático
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 10000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1}: ${url}`);

      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Se receber resposta, retornar (mesmo que seja erro HTTP)
      console.log(`✅ Resposta recebida: ${response.status} ${response.statusText}`);
      return response;

    } catch (error) {
      lastError = error as Error;
      
      // Se foi abortado por timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ Timeout após ${timeout}ms`);
        lastError = new Error(`Timeout após ${timeout}ms - servidor não respondeu`);
      } else {
        console.error(`❌ Erro na tentativa ${attempt + 1}:`, error);
      }

      // Se não for a última tentativa, aguardar e tentar novamente
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt); // Backoff exponencial
        console.log(`⏳ Aguardando ${delay}ms antes de tentar novamente...`);
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  throw lastError || new Error('Falha ao conectar com o servidor');
}

/**
 * Testa se o backend está acessível
 */
export async function testBackendHealth(baseUrl: string, token: string): Promise<boolean> {
  try {
    console.log('🏥 Testando saúde do backend...');
    
    const response = await fetchWithRetry(
      `${baseUrl}/health`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        maxRetries: 2,
        timeout: 5000
      }
    );

    const isHealthy = response.ok;
    console.log(isHealthy ? '✅ Backend está saudável' : '⚠️ Backend respondeu mas com erro');
    
    return isHealthy;
  } catch (error) {
    console.error('❌ Backend não está acessível:', error);
    return false;
  }
}

/**
 * Diagnóstico completo de erro de fetch
 */
export function diagnoseFetchError(error: Error): {
  type: 'timeout' | 'cors' | 'network' | 'unknown';
  message: string;
  suggestions: string[];
} {
  const errorMessage = error.message.toLowerCase();

  // Timeout
  if (errorMessage.includes('timeout') || error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: 'O servidor demorou muito para responder',
      suggestions: [
        'Verifique se o backend está online',
        'Tente novamente em alguns segundos',
        'Verifique sua conexão com a internet'
      ]
    };
  }

  // CORS
  if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
    return {
      type: 'cors',
      message: 'Bloqueio CORS - o servidor recusou a requisição',
      suggestions: [
        'Verifique se a origem está permitida no backend',
        'Adicione sua URL nas configurações CORS do Supabase',
        'Execute: supabase functions deploy rendizy-server'
      ]
    };
  }

  // Network
  if (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('networkerror')
  ) {
    return {
      type: 'network',
      message: 'Falha na conexão com o servidor',
      suggestions: [
        'Verifique se o backend está rodando',
        'Teste o health check: curl https://uknccixtubkdkofyieie.supabase.co/functions/v1/rendizy-server/health',
        'Verifique se há firewall ou proxy bloqueando',
        'Confirme se as credenciais Supabase estão corretas'
      ]
    };
  }

  // Unknown
  return {
    type: 'unknown',
    message: error.message || 'Erro desconhecido',
    suggestions: [
      'Verifique o console do navegador (F12) para mais detalhes',
      'Tente recarregar a página',
      'Verifique se o backend está online'
    ]
  };
}
