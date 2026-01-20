// ============================================================================
// ROTAS DE CONCILIAÇÃO BANCÁRIA
// ============================================================================

import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  logInfo,
  logError,
} from './utils.ts';
import {
  linhaExtratoToSql,
  sqlToLinhaExtrato,
  regraConciliacaoToSql,
  sqlToRegraConciliacao,
  LINHA_EXTRATO_SELECT_FIELDS,
} from './utils-financeiro-mapper.ts';
import type { LinhaExtrato, RegraConciliacao } from './utils-financeiro-mapper.ts';

// Helper para gerar UUID
function randomUUID(): string {
  // @ts-ignore - crypto global do Deno
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// IMPORTAR EXTRATO BANCÁRIO
// ============================================================================

/**
 * POST /financeiro/conciliacao/importar
 * Importa extrato bancário (OFX, CSV)
 */
export async function importarExtrato(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const formData = await c.req.formData();
    const arquivo = formData.get('arquivo') as File;
    const contaId = formData.get('contaId') as string;
    const formato = formData.get('formato') as string; // 'ofx' | 'csv'
    
    if (!arquivo || !contaId || !formato) {
      return c.json(validationErrorResponse('arquivo, contaId e formato são obrigatórios'), 400);
    }
    
    // Verificar se conta existe
    const { data: conta, error: contaError } = await client
      .from('financeiro_contas_bancarias')
      .select('id, nome')
      .eq('id', contaId)
      .eq('organization_id', organizationId)
      .single();
    
    if (contaError || !conta) {
      return c.json(notFoundResponse('Conta bancária não encontrada'), 404);
    }
    
    // Ler conteúdo do arquivo
    const conteudo = await arquivo.text();
    
    // Parsear arquivo
    let linhas: LinhaExtrato[] = [];
    if (formato === 'csv') {
      linhas = await parsearCSV(conteudo, contaId);
    } else if (formato === 'ofx') {
      linhas = await parsearOFX(conteudo, contaId);
    } else {
      return c.json(validationErrorResponse('Formato não suportado. Use "csv" ou "ofx"'), 400);
    }
    
    if (linhas.length === 0) {
      return c.json(validationErrorResponse('Nenhuma linha encontrada no arquivo'), 400);
    }
    
    // Processar linhas
    let linhasImportadas = 0;
    let linhasDuplicadas = 0;
    let linhasErro = 0;
    const linhasProcessadas: LinhaExtrato[] = [];
    
    for (const linha of linhas) {
      try {
        // Gerar hash único
        const hashUnico = linha.hashUnico || gerarHashExtrato(linha);
        
        // Verificar se já existe (deduplicação)
        const { data: existente } = await client
          .from('financeiro_linhas_extrato')
          .select('id')
          .eq('hash_unico', hashUnico)
          .eq('organization_id', organizationId)
          .single();
        
        if (existente) {
          linhasDuplicadas++;
          continue;
        }
        
        // Criar linha de extrato
        const linhaSql = linhaExtratoToSql({
          ...linha,
          id: randomUUID(),
          hashUnico,
          origem: formato as 'csv' | 'ofx',
          conciliado: false,
          createdAt: new Date().toISOString(),
        }, organizationId);
        
        const { error: insertError } = await client
          .from('financeiro_linhas_extrato')
          .insert(linhaSql);
        
        if (insertError) {
          logError('Erro ao inserir linha de extrato:', insertError);
          linhasErro++;
          continue;
        }
        
        linhasImportadas++;
        linhasProcessadas.push(linha);
      } catch (err: any) {
        logError('Erro ao processar linha:', err);
        linhasErro++;
      }
    }
    
    // Aplicar regras de conciliação automática
    if (linhasProcessadas.length > 0) {
      await aplicarRegrasConciliacao(organizationId, linhasProcessadas.map(l => l.id!));
    }
    
    return c.json(successResponse({
      importacaoId: randomUUID(),
      contaId,
      formato,
      linhasImportadas,
      linhasDuplicadas,
      linhasErro,
      periodo: {
        inicio: linhas[0]?.data,
        fim: linhas[linhas.length - 1]?.data,
      },
      linhas: linhasProcessadas.slice(0, 10), // Retornar primeiras 10 para preview
    }));
  } catch (error: any) {
    logError('Erro ao importar extrato:', error);
    return c.json(errorResponse('Erro ao importar extrato bancário', error.message), 500);
  }
}

// ============================================================================
// LISTAR LINHAS PENDENTES
// ============================================================================

/**
 * GET /financeiro/conciliacao/pendentes
 * Lista linhas de extrato pendentes de conciliação
 */
export async function listarPendentes(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const contaId = c.req.query('contaId');
    const dataInicio = c.req.query('dataInicio');
    const dataFim = c.req.query('dataFim');
    const conciliado = c.req.query('conciliado') !== 'true';
    
    let query = client
      .from('financeiro_linhas_extrato')
      .select(`${LINHA_EXTRATO_SELECT_FIELDS}, financeiro_contas_bancarias(nome)`)
      .eq('organization_id', organizationId)
      .eq('conciliado', conciliado);
    
    if (contaId) {
      query = query.eq('conta_id', contaId);
    }
    
    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }
    
    if (dataFim) {
      query = query.lte('data', dataFim);
    }
    
    query = query.order('data', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      logError('Erro ao listar linhas pendentes:', error);
      return c.json(errorResponse('Erro ao listar linhas pendentes', error.message), 500);
    }
    
    const linhas = (data || []).map(sqlToLinhaExtrato);
    
    // Calcular totais
    const totalPendente = linhas.reduce((sum, l) => sum + Math.abs(l.valor), 0);
    
    return c.json(successResponse({
      data: linhas,
      summary: {
        totalPendente,
        countPendente: linhas.length,
      },
    }));
  } catch (error: any) {
    logError('Erro ao listar pendentes:', error);
    return c.json(errorResponse('Erro ao listar linhas pendentes', error.message), 500);
  }
}

// ============================================================================
// CONCILIAR LINHA COM LANÇAMENTO
// ============================================================================

/**
 * POST /financeiro/conciliacao/match
 * Concilia uma linha de extrato com um lançamento
 */
export async function conciliarLinha(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const body = await c.req.json();
    const { linhaExtratoId, lancamentoId, observacoes } = body;
    
    if (!linhaExtratoId || !lancamentoId) {
      return c.json(validationErrorResponse('linhaExtratoId e lancamentoId são obrigatórios'), 400);
    }
    
    // Buscar linha de extrato
    const { data: linha, error: linhaError } = await client
      .from('financeiro_linhas_extrato')
      .select('*')
      .eq('id', linhaExtratoId)
      .eq('organization_id', organizationId)
      .single();
    
    if (linhaError || !linha) {
      return c.json(notFoundResponse('Linha de extrato não encontrada'), 404);
    }
    
    if (linha.conciliado) {
      return c.json(validationErrorResponse('Linha já está conciliada'), 400);
    }
    
    // Buscar lançamento
    const { data: lancamento, error: lancamentoError } = await client
      .from('financeiro_lancamentos')
      .select('*')
      .eq('id', lancamentoId)
      .eq('organization_id', organizationId)
      .single();
    
    if (lancamentoError || !lancamento) {
      return c.json(notFoundResponse('Lançamento não encontrado'), 404);
    }
    
    if (lancamento.conciliado) {
      return c.json(validationErrorResponse('Lançamento já está conciliado'), 400);
    }
    
    // Validar valores (tolerância de 5%)
    const valorLinha = Math.abs(Number(linha.valor));
    const valorLancamento = Math.abs(Number(lancamento.valor));
    const diferencaPercentual = Math.abs((valorLinha - valorLancamento) / valorLancamento);
    
    if (diferencaPercentual > 0.05) {
      return c.json(validationErrorResponse('Valores não correspondem (diferença > 5%)'), 400);
    }
    
    // Atualizar linha de extrato
    const { error: updateLinhaError } = await client
      .from('financeiro_linhas_extrato')
      .update({
        conciliado: true,
        lancamento_id: lancamentoId,
      })
      .eq('id', linhaExtratoId);
    
    if (updateLinhaError) {
      logError('Erro ao atualizar linha:', updateLinhaError);
      return c.json(errorResponse('Erro ao conciliar linha', updateLinhaError.message), 500);
    }
    
    // Atualizar lançamento
    const { error: updateLancamentoError } = await client
      .from('financeiro_lancamentos')
      .update({
        conciliado: true,
        linha_extrato_id: linhaExtratoId,
        observacoes: observacoes || lancamento.observacoes,
      })
      .eq('id', lancamentoId);
    
    if (updateLancamentoError) {
      logError('Erro ao atualizar lançamento:', updateLancamentoError);
      return c.json(errorResponse('Erro ao conciliar lançamento', updateLancamentoError.message), 500);
    }
    
    return c.json(successResponse({
      linhaExtratoId,
      lancamentoId,
      conciliado: true,
    }));
  } catch (error: any) {
    logError('Erro ao conciliar linha:', error);
    return c.json(errorResponse('Erro ao conciliar linha', error.message), 500);
  }
}

// ============================================================================
// APLICAR REGRAS AUTOMÁTICAS
// ============================================================================

/**
 * POST /financeiro/conciliacao/aplicar-regras
 * Aplica regras de conciliação automática nas linhas pendentes
 */
export async function aplicarRegras(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const body = await c.req.json();
    const linhaIds = body.linhaIds || []; // Se vazio, aplica em todas pendentes
    
    // Buscar linhas pendentes
    let query = client
      .from('financeiro_linhas_extrato')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('conciliado', false);
    
    if (linhaIds.length > 0) {
      query = query.in('id', linhaIds);
    }
    
    const { data: linhas, error } = await query;
    
    if (error) {
      logError('Erro ao buscar linhas:', error);
      return c.json(errorResponse('Erro ao buscar linhas', error.message), 500);
    }
    
    if (!linhas || linhas.length === 0) {
      return c.json(successResponse({ aplicadas: 0, criadas: 0, conciliadas: 0 }));
    }
    
    // Aplicar regras
    const resultado = await aplicarRegrasConciliacao(organizationId, linhas.map(l => l.id));
    
    return c.json(successResponse(resultado));
  } catch (error: any) {
    logError('Erro ao aplicar regras:', error);
    return c.json(errorResponse('Erro ao aplicar regras', error.message), 500);
  }
}

// ============================================================================
// FECHAMENTO DE CAIXA DIÁRIO
// ============================================================================

/**
 * GET /financeiro/conciliacao/fechamento
 * Calcula fechamento de caixa diário
 */
export async function fechamentoCaixa(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const data = c.req.query('data') || new Date().toISOString().substring(0, 10);
    const contaId = c.req.query('contaId');
    
    if (!contaId) {
      return c.json(validationErrorResponse('contaId é obrigatório'), 400);
    }
    
    // Buscar conta bancária
    const { data: conta, error: contaError } = await client
      .from('financeiro_contas_bancarias')
      .select('*')
      .eq('id', contaId)
      .eq('organization_id', organizationId)
      .single();
    
    if (contaError || !conta) {
      return c.json(notFoundResponse('Conta bancária não encontrada'), 404);
    }
    
    // Buscar saldo inicial (último saldo do dia anterior)
    const dataAnterior = new Date(data);
    dataAnterior.setDate(dataAnterior.getDate() - 1);
    const dataAnteriorStr = dataAnterior.toISOString().substring(0, 10);
    
    const { data: saldoAnterior } = await client
      .from('financeiro_linhas_extrato')
      .select('valor, tipo')
      .eq('conta_id', contaId)
      .eq('organization_id', organizationId)
      .lte('data', dataAnteriorStr)
      .order('data', { ascending: false })
      .limit(1);
    
    let saldoInicial = Number(conta.saldo_inicial) || 0;
    if (saldoAnterior && saldoAnterior.length > 0) {
      // Calcular saldo até o dia anterior
      const { data: todasLinhas } = await client
        .from('financeiro_linhas_extrato')
        .select('valor, tipo')
        .eq('conta_id', contaId)
        .eq('organization_id', organizationId)
        .lte('data', dataAnteriorStr);
      
      todasLinhas?.forEach(linha => {
        if (linha.tipo === 'credito') {
          saldoInicial += Number(linha.valor);
        } else {
          saldoInicial -= Number(linha.valor);
        }
      });
    }
    
    // Buscar receitas do dia (lançamentos de entrada)
    const { data: receitas } = await client
      .from('financeiro_lancamentos')
      .select('valor')
      .eq('conta_id', contaId)
      .eq('organization_id', organizationId)
      .eq('tipo', 'entrada')
      .eq('data', data);
    
    const totalReceitas = receitas?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;
    
    // Buscar despesas do dia (lançamentos de saída)
    const { data: despesas } = await client
      .from('financeiro_lancamentos')
      .select('valor')
      .eq('conta_id', contaId)
      .eq('organization_id', organizationId)
      .eq('tipo', 'saida')
      .eq('data', data);
    
    const totalDespesas = despesas?.reduce((sum, d) => sum + Number(d.valor), 0) || 0;
    
    // Calcular saldo final esperado
    const saldoFinalEsperado = saldoInicial + totalReceitas - totalDespesas;
    
    // Buscar saldo bancário real (última linha de extrato do dia)
    const { data: saldoBancario } = await client
      .from('financeiro_linhas_extrato')
      .select('valor, tipo')
      .eq('conta_id', contaId)
      .eq('organization_id', organizationId)
      .lte('data', data)
      .order('data', { ascending: false })
      .limit(1);
    
    let saldoBancarioReal = saldoInicial;
    if (saldoBancario && saldoBancario.length > 0) {
      // Calcular saldo real até o dia
      const { data: todasLinhasDia } = await client
        .from('financeiro_linhas_extrato')
        .select('valor, tipo')
        .eq('conta_id', contaId)
        .eq('organization_id', organizationId)
        .lte('data', data);
      
      todasLinhasDia?.forEach(linha => {
        if (linha.tipo === 'credito') {
          saldoBancarioReal += Number(linha.valor);
        } else {
          saldoBancarioReal -= Number(linha.valor);
        }
      });
    }
    
    // Calcular diferença
    const diferenca = saldoFinalEsperado - saldoBancarioReal;
    const estaBateu = Math.abs(diferenca) < 0.01; // Tolerância de 1 centavo
    
    return c.json(successResponse({
      data,
      conta: {
        id: conta.id,
        nome: conta.nome,
      },
      saldoInicial,
      receitas: {
        total: totalReceitas,
        quantidade: receitas?.length || 0,
      },
      despesas: {
        total: totalDespesas,
        quantidade: despesas?.length || 0,
      },
      saldoFinalEsperado,
      saldoBancarioReal,
      diferenca,
      estaBateu,
      status: estaBateu ? 'ok' : 'divergente',
    }));
  } catch (error: any) {
    logError('Erro ao calcular fechamento:', error);
    return c.json(errorResponse('Erro ao calcular fechamento de caixa', error.message), 500);
  }
}

// ============================================================================
// REGRAS DE CONCILIAÇÃO - CRUD
// ============================================================================

/**
 * GET /financeiro/conciliacao/regras
 * Lista regras de conciliação
 */
export async function listarRegras(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('financeiro_regras_conciliacao')
      .select('*')
      .eq('organization_id', organizationId)
      .order('prioridade', { ascending: false });
    
    if (error) {
      logError('Erro ao listar regras:', error);
      return c.json(errorResponse('Erro ao listar regras', error.message), 500);
    }
    
    const regras = (data || []).map(sqlToRegraConciliacao);
    
    return c.json(successResponse(regras));
  } catch (error: any) {
    logError('Erro ao listar regras:', error);
    return c.json(errorResponse('Erro ao listar regras', error.message), 500);
  }
}

/**
 * POST /financeiro/conciliacao/regras
 * Cria nova regra de conciliação
 */
export async function criarRegra(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const body = await c.req.json();
    const regra: RegraConciliacao = {
      id: randomUUID(),
      nome: body.nome,
      descricao: body.descricao,
      ativo: body.ativo !== false,
      prioridade: body.prioridade || 50,
      padrao: body.padrao,
      valor: body.valor,
      tipo: body.tipo,
      categoriaId: body.categoriaId,
      contaContrapartidaId: body.contaContrapartidaId,
      centroCustoId: body.centroCustoId,
      acao: body.acao || 'sugerir',
      aplicacoes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const regraSql = regraConciliacaoToSql(regra, organizationId);
    
    const { error } = await client
      .from('financeiro_regras_conciliacao')
      .insert(regraSql);
    
    if (error) {
      logError('Erro ao criar regra:', error);
      return c.json(errorResponse('Erro ao criar regra', error.message), 500);
    }
    
    return c.json(successResponse(regra));
  } catch (error: any) {
    logError('Erro ao criar regra:', error);
    return c.json(errorResponse('Erro ao criar regra', error.message), 500);
  }
}

/**
 * PUT /financeiro/conciliacao/regras/:id
 * Atualiza regra de conciliação
 */
export async function atualizarRegra(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data: regraExistente, error: fetchError } = await client
      .from('financeiro_regras_conciliacao')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();
    
    if (fetchError || !regraExistente) {
      return c.json(notFoundResponse('Regra não encontrada'), 404);
    }
    
    const regraAtualizada: Partial<RegraConciliacao> = {
      nome: body.nome ?? regraExistente.nome,
      descricao: body.descricao ?? regraExistente.descricao,
      ativo: body.ativo !== undefined ? body.ativo : regraExistente.ativo,
      prioridade: body.prioridade ?? regraExistente.prioridade,
      padrao: body.padrao ?? {
        operador: regraExistente.padrao_operador,
        termo: regraExistente.padrao_termo,
      },
      valor: body.valor ?? (regraExistente.valor_operador ? {
        operador: regraExistente.valor_operador,
        a: regraExistente.valor_a ? Number(regraExistente.valor_a) : undefined,
        b: regraExistente.valor_b ? Number(regraExistente.valor_b) : undefined,
      } : undefined),
      tipo: body.tipo ?? regraExistente.tipo_lancamento,
      categoriaId: body.categoriaId ?? regraExistente.categoria_id,
      contaContrapartidaId: body.contaContrapartidaId ?? regraExistente.conta_contrapartida_id,
      centroCustoId: body.centroCustoId ?? regraExistente.centro_custo_id,
      acao: body.acao ?? regraExistente.acao,
      updatedAt: new Date().toISOString(),
    };
    
    const regraSql = regraConciliacaoToSql(regraAtualizada as RegraConciliacao, organizationId);
    
    const { error } = await client
      .from('financeiro_regras_conciliacao')
      .update(regraSql)
      .eq('id', id)
      .eq('organization_id', organizationId);
    
    if (error) {
      logError('Erro ao atualizar regra:', error);
      return c.json(errorResponse('Erro ao atualizar regra', error.message), 500);
    }
    
    return c.json(successResponse(regraAtualizada));
  } catch (error: any) {
    logError('Erro ao atualizar regra:', error);
    return c.json(errorResponse('Erro ao atualizar regra', error.message), 500);
  }
}

/**
 * DELETE /financeiro/conciliacao/regras/:id
 * Deleta regra de conciliação
 */
export async function deletarRegra(c: Context) {
  try {
    const organizationId = await getOrganizationIdOrThrow(c);
    const client = getSupabaseClient();
    
    const id = c.req.param('id');
    
    const { error } = await client
      .from('financeiro_regras_conciliacao')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    
    if (error) {
      logError('Erro ao deletar regra:', error);
      return c.json(errorResponse('Erro ao deletar regra', error.message), 500);
    }
    
    return c.json(successResponse({ id }));
  } catch (error: any) {
    logError('Erro ao deletar regra:', error);
    return c.json(errorResponse('Erro ao deletar regra', error.message), 500);
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Parsear arquivo CSV
 */
async function parsearCSV(conteudo: string, contaId: string): Promise<LinhaExtrato[]> {
  const linhas: LinhaExtrato[] = [];
  const linhasArquivo = conteudo.split('\n');
  
  // Pular cabeçalho (primeira linha)
  for (let i = 1; i < linhasArquivo.length; i++) {
    const linha = linhasArquivo[i].trim();
    if (!linha) continue;
    
    // Formato esperado: Data,Descrição,Valor,Tipo
    const partes = linha.split(',');
    if (partes.length < 4) continue;
    
    const data = partes[0].trim();
    const descricao = partes[1].trim();
    const valor = parseFloat(partes[2].trim());
    const tipo = partes[3].trim().toLowerCase();
    
    if (isNaN(valor) || !data) continue;
    
    linhas.push({
      id: randomUUID(),
      contaId,
      data: formatarData(data),
      descricao,
      valor: tipo === 'debito' ? -Math.abs(valor) : Math.abs(valor),
      moeda: 'BRL',
      tipo: tipo === 'debito' ? 'debito' : 'credito',
      origem: 'csv',
      conciliado: false,
      createdAt: new Date().toISOString(),
    });
  }
  
  return linhas;
}

/**
 * Parsear arquivo OFX (simplificado)
 */
async function parsearOFX(conteudo: string, contaId: string): Promise<LinhaExtrato[]> {
  const linhas: LinhaExtrato[] = [];
  
  // Parser OFX simplificado - busca tags <STMTTRN>
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  
  while ((match = regex.exec(conteudo)) !== null) {
    const transacao = match[1];
    
    const dataMatch = transacao.match(/<DTPOSTED>(\d{8})/);
    const valorMatch = transacao.match(/<TRNAMT>([-\d.]+)/);
    const descMatch = transacao.match(/<MEMO>(.*?)<\/MEMO>/);
    
    if (!dataMatch || !valorMatch) continue;
    
    const dataStr = dataMatch[1];
    const data = `${dataStr.substring(0, 4)}-${dataStr.substring(4, 6)}-${dataStr.substring(6, 8)}`;
    const valor = parseFloat(valorMatch[1]);
    const descricao = descMatch ? descMatch[1].trim() : 'Transação OFX';
    
    linhas.push({
      id: randomUUID(),
      contaId,
      data,
      descricao,
      valor,
      moeda: 'BRL',
      tipo: valor >= 0 ? 'credito' : 'debito',
      origem: 'ofx',
      conciliado: false,
      createdAt: new Date().toISOString(),
    });
  }
  
  return linhas;
}

/**
 * Aplicar regras de conciliação automática
 */
async function aplicarRegrasConciliacao(organizationId: string, linhaIds: string[]): Promise<any> {
  const client = getSupabaseClient();
  
  // Buscar regras ativas ordenadas por prioridade
  const { data: regras } = await client
    .from('financeiro_regras_conciliacao')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('ativo', true)
    .order('prioridade', { ascending: false });
  
  if (!regras || regras.length === 0) {
    return { aplicadas: 0, criadas: 0, conciliadas: 0 };
  }
  
  let aplicadas = 0;
  let criadas = 0;
  let conciliadas = 0;
  
  // Buscar linhas
  const { data: linhas } = await client
    .from('financeiro_linhas_extrato')
    .select('*')
    .in('id', linhaIds)
    .eq('conciliado', false);
  
  if (!linhas || linhas.length === 0) {
    return { aplicadas: 0, criadas: 0, conciliadas: 0 };
  }
  
  for (const linha of linhas) {
    for (const regra of regras) {
      if (avaliarRegra(regra, linha)) {
        aplicadas++;
        
        if (regra.acao === 'auto_criar') {
          // Criar lançamento automaticamente
          const lancamentoId = randomUUID();
          const tipo = linha.tipo === 'credito' ? 'entrada' : 'saida';
          
          await client.from('financeiro_lancamentos').insert({
            id: lancamentoId,
            organization_id: organizationId,
            tipo,
            data: linha.data,
            competencia: linha.data,
            descricao: linha.descricao,
            valor: Math.abs(Number(linha.valor)),
            moeda: linha.moeda || 'BRL',
            categoria_id: regra.categoria_id,
            conta_id: linha.conta_id,
            centro_custo_id: regra.centro_custo_id,
            conciliado: true,
            linha_extrato_id: linha.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
          await client
            .from('financeiro_linhas_extrato')
            .update({ conciliado: true, lancamento_id: lancamentoId })
            .eq('id', linha.id);
          
          criadas++;
          conciliadas++;
          break; // Primeira regra que der match vence
        } else if (regra.acao === 'auto_conciliar') {
          // Tentar encontrar lançamento existente
          const { data: lancamentos } = await client
            .from('financeiro_lancamentos')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('conciliado', false)
            .eq('tipo', linha.tipo === 'credito' ? 'entrada' : 'saida')
            .eq('categoria_id', regra.categoria_id)
            .limit(10);
          
          // Procurar match por valor e data
          const valorLinha = Math.abs(Number(linha.valor));
          const lancamentoMatch = lancamentos?.find(l => {
            const valorLanc = Math.abs(Number(l.valor));
            const diferenca = Math.abs(valorLinha - valorLanc) / valorLanc;
            return diferenca < 0.05; // 5% de tolerância
          });
          
          if (lancamentoMatch) {
            await client
              .from('financeiro_linhas_extrato')
              .update({ conciliado: true, lancamento_id: lancamentoMatch.id })
              .eq('id', linha.id);
            
            await client
              .from('financeiro_lancamentos')
              .update({ conciliado: true, linha_extrato_id: linha.id })
              .eq('id', lancamentoMatch.id);
            
            conciliadas++;
            break;
          }
        }
      }
    }
  }
  
  return { aplicadas, criadas, conciliadas };
}

/**
 * Avaliar se regra se aplica à linha
 */
function avaliarRegra(regra: any, linha: any): boolean {
  const descricao = (linha.descricao || '').toLowerCase();
  const termo = (regra.padrao_termo || '').toLowerCase();
  
  // Avaliar padrão de texto
  let matchPadrao = false;
  if (regra.padrao_operador === 'contains') {
    matchPadrao = descricao.includes(termo);
  } else if (regra.padrao_operador === 'equals') {
    matchPadrao = descricao === termo;
  } else if (regra.padrao_operador === 'regex') {
    try {
      const regex = new RegExp(termo, 'i');
      matchPadrao = regex.test(descricao);
    } catch {
      matchPadrao = false;
    }
  }
  
  if (!matchPadrao) return false;
  
  // Avaliar valor (se especificado)
  if (regra.valor_operador) {
    const valor = Math.abs(Number(linha.valor));
    const a = Number(regra.valor_a);
    const b = Number(regra.valor_b);
    
    if (regra.valor_operador === 'eq' && valor !== a) return false;
    if (regra.valor_operador === 'gte' && valor < a) return false;
    if (regra.valor_operador === 'lte' && valor > a) return false;
    if (regra.valor_operador === 'between' && (valor < a || valor > b)) return false;
  }
  
  // Avaliar tipo (se especificado)
  if (regra.tipo_lancamento) {
    const tipoLinha = linha.tipo === 'credito' ? 'entrada' : 'saida';
    if (tipoLinha !== regra.tipo_lancamento) return false;
  }
  
  return true;
}

/**
 * Gerar hash único para linha de extrato
 */
function gerarHashExtrato(linha: LinhaExtrato): string {
  const data = linha.data.substring(0, 10);
  const valor = Math.abs(linha.valor).toFixed(2);
  const descricao = (linha.descricao || '').toLowerCase().trim().substring(0, 50);
  const hashString = `${data}|${valor}|${descricao}|${linha.contaId}`;
  return btoa(hashString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
}

/**
 * Formatar data (suporta vários formatos)
 */
function formatarData(data: string): string {
  // Tentar vários formatos comuns
  const formatos = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{2})/, // DD/MM/YY
  ];
  
  for (const formato of formatos) {
    const match = data.match(formato);
    if (match) {
      if (match[0].includes('/')) {
        // DD/MM/YYYY ou DD/MM/YY
        const dia = match[1];
        const mes = match[2];
        const ano = match[3].length === 2 ? `20${match[3]}` : match[3];
        return `${ano}-${mes}-${dia}`;
      } else {
        // YYYY-MM-DD
        return match[0];
      }
    }
  }
  
  // Se não conseguir formatar, retornar data atual
  return new Date().toISOString().substring(0, 10);
}

