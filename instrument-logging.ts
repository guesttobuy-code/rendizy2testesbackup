// ============================================================================
// INSTRUMENTAÇÃO: Enviar logs de erro para tabela SQL (recomendado)
// ============================================================================
// Adicione este código nas suas Edge Functions para logging estruturado
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';

// Helper: Obter cliente Supabase para logging
function getSupabaseClientForLogging() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

/**
 * Logar erro em tabela SQL para auditoria e Realtime
 */
export async function logErrorToDatabase(
  functionName: string,
  level: 'error' | 'warning' | 'info',
  message: string,
  metadata?: Record<string, any>
) {
  try {
    const supabase = getSupabaseClientForLogging();
    
    // Garantir que tabela function_logs existe (criar se não existir)
    await supabase.from('function_logs').insert({
      function_name: functionName,
      level: level,
      message: message,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }).catch(err => {
      // Se tabela não existe, criar
      console.warn('⚠️ Tabela function_logs não existe. Criando...');
      // Nota: Criação de tabela deve ser feita via migration
    });
  } catch (error) {
    // Não bloquear execução se logging falhar
    console.error('⚠️ Erro ao logar no banco:', error);
  }
}

/**
 * Wrapper para capturar erros automaticamente em rotas
 */
export function withErrorLogging(
  functionName: string,
  handler: (c: any) => Promise<any>
) {
  return async (c: any) => {
    try {
      return await handler(c);
    } catch (error) {
      // Logar erro no banco
      await logErrorToDatabase(
        functionName,
        'error',
        error instanceof Error ? error.message : 'Erro desconhecido',
        {
          stack: error instanceof Error ? error.stack : undefined,
          url: c.req.url,
          method: c.req.method,
          timestamp: new Date().toISOString()
        }
      );
      
      // Re-throw para que o error handler do Hono capture
      throw error;
    }
  };
}

/**
 * Exemplo de uso em routes-auth.ts:
 * 
 * import { withErrorLogging, logErrorToDatabase } from './instrument-logging.ts';
 * 
 * app.post('/login', withErrorLogging('rendizy-server/auth/login', async (c) => {
 *   // ... código do login
 *   
 *   // Ou logar manualmente:
 *   await logErrorToDatabase(
 *     'rendizy-server/auth/login',
 *     'info',
 *     'Login bem-sucedido',
 *     { username, type: user.type }
 *   );
 * }));
 */

