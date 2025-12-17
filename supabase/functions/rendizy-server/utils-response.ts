/**
 * UTILS - Response Helpers
 * 
 * Helpers para garantir respostas JSON corretas em todas as rotas
 * Sempre retorna { success: true, data: ... } ou { success: false, error: ... }
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Versão simplificada
 */

/**
 * Retorna resposta de sucesso padronizada
 * @param data - Dados da resposta
 * @returns { success: true, data: any }
 */
export function successResponse(data: any) {
  return { success: true, data };
}

/**
 * Retorna resposta de erro padronizada
 * @param message - Mensagem de erro (string ou Error)
 * @param details - Detalhes adicionais (opcional)
 * @returns { success: false, error: string, details?: any }
 */
export function errorResponse(message: any, details: any = null) {
  const errorMessage = message instanceof Error ? message.message : message;
  
  const response: { success: false; error: string; details?: any } = {
    success: false,
    error: errorMessage,
  };

  if (details !== null) {
    response.details = details;
  }

  return response;
}

