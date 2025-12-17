/**
 * RENDIZY - Helper para Registrar Campos Financeiros
 * 
 * Permite que qualquer módulo registre campos financeiros automaticamente,
 * fazendo-os aparecer na tela de mapeamento de campos x contas
 * 
 * @version v1.0.103.1500
 * 
 * EXEMPLO DE USO:
 * 
 * // No módulo de integração Airbnb:
 * import { registerFinancialField } from '@/utils/registerFinancialField';
 * 
 * // Ao inicializar o módulo:
 * await registerFinancialField({
 *   modulo: 'integracoes',
 *   campo_codigo: 'airbnb.comissao',
 *   campo_nome: 'Comissão do Airbnb',
 *   campo_tipo: 'despesa',
 *   descricao: 'Comissão cobrada pelo Airbnb sobre cada reserva',
 *   registered_by_module: 'integracoes.airbnb',
 *   obrigatorio: true, // Campo obrigatório deve ter mapeamento
 * });
 */

import { financeiroApi } from './api';

export interface RegisterFinancialFieldParams {
  modulo: string;
  campo_codigo: string;
  campo_nome: string;
  campo_tipo: 'receita' | 'despesa';
  descricao?: string;
  registered_by_module?: string;
  obrigatorio?: boolean;
}

/**
 * Registra um campo financeiro do sistema
 * 
 * @param params - Parâmetros do campo financeiro
 * @returns Promise com o resultado do registro
 * 
 * @example
 * ```typescript
 * // Registrar comissão do Airbnb
 * await registerFinancialField({
 *   modulo: 'integracoes',
 *   campo_codigo: 'airbnb.comissao',
 *   campo_nome: 'Comissão do Airbnb',
 *   campo_tipo: 'despesa',
 *   descricao: 'Comissão cobrada pelo Airbnb sobre cada reserva',
 *   registered_by_module: 'integracoes.airbnb',
 *   obrigatorio: true,
 * });
 * 
 * // Registrar taxa de plataforma de pagamento
 * await registerFinancialField({
 *   modulo: 'pagamentos',
 *   campo_codigo: 'stripe.taxa',
 *   campo_nome: 'Taxa do Stripe',
 *   campo_tipo: 'despesa',
 *   descricao: 'Taxa cobrada pelo Stripe por transação',
 *   registered_by_module: 'pagamentos.stripe',
 *   obrigatorio: true,
 * });
 * ```
 */
export async function registerFinancialField(
  params: RegisterFinancialFieldParams
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log('📝 [registerFinancialField] Registrando campo financeiro:', params);

    const response = await financeiroApi.campoMappings.register(params);

    if (response.success) {
      console.log('✅ [registerFinancialField] Campo registrado com sucesso:', response.data);
      return { success: true, data: response.data };
    } else {
      console.error('❌ [registerFinancialField] Erro ao registrar campo:', response.error);
      return { success: false, error: response.error || 'Erro desconhecido' };
    }
  } catch (error: any) {
    console.error('❌ [registerFinancialField] Exceção ao registrar campo:', error);
    return { success: false, error: error.message || 'Erro ao registrar campo financeiro' };
  }
}

/**
 * Registra múltiplos campos financeiros de uma vez
 * 
 * @param campos - Array de campos financeiros para registrar
 * @returns Promise com os resultados do registro
 * 
 * @example
 * ```typescript
 * await registerMultipleFinancialFields([
 *   {
 *     modulo: 'integracoes',
 *     campo_codigo: 'airbnb.comissao',
 *     campo_nome: 'Comissão do Airbnb',
 *     campo_tipo: 'despesa',
 *     registered_by_module: 'integracoes.airbnb',
 *   },
 *   {
 *     modulo: 'integracoes',
 *     campo_codigo: 'booking.comissao',
 *     campo_nome: 'Comissão do Booking.com',
 *     campo_tipo: 'despesa',
 *     registered_by_module: 'integracoes.booking',
 *   },
 * ]);
 * ```
 */
export async function registerMultipleFinancialFields(
  campos: RegisterFinancialFieldParams[]
): Promise<{ success: boolean; errors?: string[]; results: any[] }> {
  const results: any[] = [];
  const errors: string[] = [];

  for (const campo of campos) {
    const result = await registerFinancialField(campo);
    results.push(result);
    
    if (!result.success) {
      errors.push(`${campo.campo_codigo}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    results,
  };
}

