/**
 * Financeiro Mapper - Converte entre formato TypeScript e SQL
 * 
 * ✅ MIGRAÇÃO v1.0.103.400 - SQL + RLS + Multi-tenant
 * Mapeia objetos TypeScript ↔ Tabelas SQL do módulo financeiro
 * 
 * @version 1.0.103.400
 * @updated 2025-11-23 - Migração de KV Store para SQL Tables
 */

import type { 
  Lancamento, 
  Titulo, 
  ContaBancaria, 
  CentroCusto,
  ContaContabil,
  SplitDestino
} from './types.ts';

// ============================================================================
// LANÇAMENTOS
// ============================================================================

/**
 * Converte Lancamento (TypeScript) para formato SQL (tabela financeiro_lancamentos)
 */
export function lancamentoToSql(lancamento: Lancamento, organizationId: string): any {
  return {
    id: lancamento.id,
    organization_id: organizationId,
    tipo: lancamento.tipo,
    data: lancamento.data,
    competencia: lancamento.competencia || lancamento.data,
    descricao: lancamento.descricao,
    valor: lancamento.valor,
    moeda: lancamento.moeda || 'BRL',
    valor_convertido: lancamento.valor, // TODO: Implementar conversão de moeda
    documento: lancamento.documento || null,
    nota_fiscal: lancamento.notaFiscal || null,
    categoria_id: lancamento.categoriaId || null,
    conta_id: lancamento.contaId || null,
    centro_custo_id: lancamento.centroCustoId || null,
    property_id: null, // TODO: Mapear se necessário
    conta_origem_id: lancamento.contaOrigemId || null,
    conta_destino_id: lancamento.contaDestinoId || null,
    has_split: lancamento.hasSplit || false,
    conciliado: lancamento.conciliado || false,
    linha_extrato_id: lancamento.linhaExtratoId || null,
    observacoes: lancamento.observacoes || null,
    created_by: lancamento.createdBy || null,
    created_at: lancamento.createdAt || new Date().toISOString(),
    updated_at: lancamento.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_lancamentos) para Lancamento (TypeScript)
 */
export function sqlToLancamento(row: any): Lancamento {
  return {
    id: row.id,
    tipo: row.tipo,
    data: row.data,
    competencia: row.competencia,
    descricao: row.descricao,
    valor: Number(row.valor),
    moeda: row.moeda,
    categoriaId: row.categoria_id,
    categoriaNome: row.categoria_nome || null,
    contaId: row.conta_id,
    contaNome: row.conta_nome || null,
    contaOrigemId: row.conta_origem_id,
    contaDestinoId: row.conta_destino_id,
    centroCustoId: row.centro_custo_id,
    centroCustoNome: row.centro_custo_nome || null,
    documento: row.documento,
    notaFiscal: row.nota_fiscal,
    observacoes: row.observacoes,
    conciliado: row.conciliado || false,
    linhaExtratoId: row.linha_extrato_id,
    hasSplit: row.has_split || false,
    splits: row.splits || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// TÍTULOS
// ============================================================================

/**
 * Converte Titulo (TypeScript) para formato SQL (tabela financeiro_titulos)
 */
export function tituloToSql(titulo: Titulo, organizationId: string): any {
  return {
    id: titulo.id,
    organization_id: organizationId,
    tipo: titulo.tipo,
    numero: titulo.numero || `TIT-${Date.now()}`,
    descricao: titulo.descricao,
    valor_original: titulo.valorOriginal || titulo.valor,
    valor_pago: titulo.valorPago || 0,
    valor_restante: titulo.saldo || (titulo.valorOriginal || titulo.valor) - (titulo.valorPago || 0),
    moeda: titulo.moeda || 'BRL',
    emissao: titulo.emissao,
    vencimento: titulo.vencimento,
    pagamento: titulo.dataPagamento || null,
    categoria_id: titulo.categoriaId || null,
    conta_id: titulo.contaBancariaId || null,
    centro_custo_id: titulo.centroCustoId || null,
    property_id: null, // TODO: Mapear se necessário
    guest_id: null, // TODO: Mapear se necessário
    reservation_id: null, // TODO: Mapear se necessário
    status: titulo.status || 'aberto',
    taxa_juros_mensal: 1.00, // 1% ao mês padrão
    taxa_multa: 2.00, // 2% padrão
    juros_calculado: titulo.juros || 0,
    multa_calculada: titulo.multa || 0,
    desconto_antecipacao: titulo.desconto || 0,
    recorrente: titulo.recorrente || false,
    frequencia: null, // TODO: Mapear se necessário
    proxima_parcela: null,
    total_parcelas: titulo.totalParcelas || null,
    parcela_atual: titulo.parcela || null,
    titulo_pai_id: null, // TODO: Mapear se necessário
    enviar_cobranca: false,
    ultima_cobranca: null,
    proxima_cobranca: null,
    observacoes: titulo.observacoes || null,
    created_by: null, // TODO: Mapear se necessário
    created_at: titulo.createdAt || new Date().toISOString(),
    updated_at: titulo.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_titulos) para Titulo (TypeScript)
 */
export function sqlToTitulo(row: any): Titulo {
  return {
    id: row.id,
    tipo: row.tipo,
    emissao: row.emissao,
    vencimento: row.vencimento,
    pessoa: row.pessoa || 'N/A', // TODO: Buscar nome do guest/property
    pessoaId: row.guest_id || row.property_id || null,
    descricao: row.descricao,
    moeda: row.moeda,
    valorOriginal: Number(row.valor_original),
    valor: Number(row.valor_original),
    valorPago: Number(row.valor_pago || 0),
    saldo: Number(row.valor_restante),
    desconto: Number(row.desconto_antecipacao || 0),
    juros: Number(row.juros_calculado || 0),
    multa: Number(row.multa_calculada || 0),
    categoriaId: row.categoria_id,
    centroCustoId: row.centro_custo_id,
    contaBancariaId: row.conta_id,
    status: row.status,
    diasVencimento: row.vencimento ? Math.ceil((new Date(row.vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
    dataPagamento: row.pagamento,
    formaPagamento: null, // TODO: Mapear se necessário
    numeroDocumento: row.numero,
    recorrente: row.recorrente || false,
    parcela: row.parcela_atual,
    totalParcelas: row.total_parcelas,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// CONTAS BANCÁRIAS
// ============================================================================

/**
 * Converte ContaBancaria (TypeScript) para formato SQL (tabela financeiro_contas_bancarias)
 */
export function contaBancariaToSql(conta: ContaBancaria, organizationId: string): any {
  return {
    id: conta.id,
    organization_id: organizationId,
    nome: conta.nome,
    banco: conta.banco || null,
    agencia: conta.agencia || null,
    numero: conta.numero || null,
    tipo: conta.tipo,
    moeda: conta.moeda || 'BRL',
    saldo_inicial: conta.saldoInicial || conta.saldo || 0,
    saldo_atual: conta.saldo || conta.saldoInicial || 0,
    status_feed: conta.statusFeed || null,
    ultima_sincronizacao: conta.ultimaSincronizacao || null,
    consentimento_id: conta.consentimentoId || null,
    consentimento_validade: conta.consentimentoValidade || null,
    ativo: conta.ativo !== false,
    created_by: null, // TODO: Mapear se necessário
    created_at: conta.createdAt || new Date().toISOString(),
    updated_at: conta.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_contas_bancarias) para ContaBancaria (TypeScript)
 */
export function sqlToContaBancaria(row: any): ContaBancaria {
  return {
    id: row.id,
    nome: row.nome,
    banco: row.banco,
    agencia: row.agencia,
    numero: row.numero,
    tipo: row.tipo,
    moeda: row.moeda,
    saldo: Number(row.saldo_atual),
    saldoInicial: Number(row.saldo_inicial),
    ativo: row.ativo !== false,
    statusFeed: row.status_feed,
    ultimaSincronizacao: row.ultima_sincronizacao,
    consentimentoId: row.consentimento_id,
    consentimentoValidade: row.consentimento_validade,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// CATEGORIAS (Plano de Contas)
// ============================================================================

/**
 * Converte ContaContabil (TypeScript) para formato SQL (tabela financeiro_categorias)
 */
export function categoriaToSql(categoria: ContaContabil, organizationId: string): any {
  return {
    id: categoria.id,
    organization_id: organizationId,
    codigo: categoria.codigo,
    nome: categoria.nome,
    descricao: null, // TODO: Adicionar campo descricao no tipo
    parent_id: categoria.parentId || null,
    nivel: categoria.nivel || 1,
    tipo: categoria.tipo === 'receita' ? 'receita' : categoria.tipo === 'despesa' ? 'despesa' : 'transferencia',
    natureza: categoria.natureza,
    mapeamento_dre: null, // TODO: Mapear se necessário
    mapeamento_ifrs: null, // TODO: Mapear se necessário
    ativo: categoria.ativo !== false,
    created_by: null, // TODO: Mapear se necessário
    created_at: categoria.createdAt || new Date().toISOString(),
    updated_at: categoria.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_categorias) para ContaContabil (TypeScript)
 */
export function sqlToCategoria(row: any): ContaContabil {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    tipo: row.tipo === 'receita' ? 'receita' : row.tipo === 'despesa' ? 'despesa' : 'resultado',
    natureza: row.natureza,
    nivel: row.nivel,
    parentId: row.parent_id,
    analitica: row.nivel >= 4, // Categorias de nível 4+ são analíticas
    moeda: 'BRL', // TODO: Mapear se necessário
    ativo: row.ativo !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// CENTRO DE CUSTOS
// ============================================================================

/**
 * Converte CentroCusto (TypeScript) para formato SQL (tabela financeiro_centro_custos)
 */
export function centroCustoToSql(centroCusto: CentroCusto, organizationId: string): any {
  return {
    id: centroCusto.id,
    organization_id: organizationId,
    codigo: centroCusto.codigo || null,
    nome: centroCusto.nome,
    descricao: centroCusto.descricao || null,
    tipo: centroCusto.tipo === 'unidade' ? 'propriedade' : centroCusto.tipo === 'projeto' ? 'projeto' : centroCusto.tipo === 'departamento' ? 'departamento' : 'outro',
    property_id: null, // TODO: Mapear se tipo = 'propriedade'
    orcamento_anual: centroCusto.orcamentoAnual || null,
    orcamento_mensal: centroCusto.orcamentoMensal || null,
    ativo: centroCusto.ativo !== false,
    created_by: null, // TODO: Mapear se necessário
    created_at: centroCusto.createdAt || new Date().toISOString(),
    updated_at: centroCusto.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_centro_custos) para CentroCusto (TypeScript)
 */
export function sqlToCentroCusto(row: any): CentroCusto {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao,
    tipo: row.tipo === 'propriedade' ? 'unidade' : row.tipo === 'projeto' ? 'projeto' : row.tipo === 'departamento' ? 'departamento' : 'tarefa',
    parentId: null, // TODO: Adicionar suporte a hierarquia se necessário
    nivel: 1, // TODO: Calcular nível se houver hierarquia
    ativo: row.ativo !== false,
    orcamentoMensal: row.orcamento_mensal ? Number(row.orcamento_mensal) : null,
    orcamentoAnual: row.orcamento_anual ? Number(row.orcamento_anual) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// SPLITS
// ============================================================================

/**
 * Converte SplitDestino (TypeScript) para formato SQL (tabela financeiro_lancamentos_splits)
 */
export function splitToSql(split: SplitDestino, lancamentoId: string, organizationId: string): any {
  return {
    id: split.id,
    lancamento_id: lancamentoId,
    organization_id: organizationId,
    tipo_split: split.tipo,
    valor_percentual: split.percentual || null,
    valor_fixo: split.valor || null,
    categoria_id: null, // TODO: Mapear se necessário
    conta_id: split.contaDestinoId || null,
    centro_custo_id: split.centroCustoId || null,
    observacoes: split.observacoes || null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_lancamentos_splits) para SplitDestino (TypeScript)
 */
export function sqlToSplit(row: any): SplitDestino {
  return {
    id: row.id,
    lancamentoId: row.lancamento_id,
    nome: row.nome || 'Split', // TODO: Buscar nome da categoria/conta
    tipo: row.tipo_split,
    percentual: row.valor_percentual ? Number(row.valor_percentual) : null,
    valor: row.valor_fixo ? Number(row.valor_fixo) : null,
    contaDestinoId: row.conta_id,
    centroCustoId: row.centro_custo_id,
    observacoes: row.observacoes,
  };
}

// ============================================================================
// CAMPOS SELECIONADOS (para performance)
// ============================================================================

export const LANCAMENTO_SELECT_FIELDS = `
  id, organization_id, tipo, data, competencia, descricao, valor, moeda,
  documento, nota_fiscal, categoria_id, conta_id, centro_custo_id,
  conta_origem_id, conta_destino_id, has_split, conciliado, linha_extrato_id,
  observacoes, created_by, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

export const TITULO_SELECT_FIELDS = `
  id, organization_id, tipo, numero, descricao, valor_original, valor_pago,
  valor_restante, moeda, emissao, vencimento, pagamento, categoria_id, conta_id,
  centro_custo_id, status, juros_calculado, multa_calculada, desconto_antecipacao,
  recorrente, total_parcelas, parcela_atual, observacoes, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

export const CONTA_BANCARIA_SELECT_FIELDS = `
  id, organization_id, nome, banco, agencia, numero, tipo, moeda,
  saldo_inicial, saldo_atual, status_feed, ultima_sincronizacao,
  consentimento_id, consentimento_validade, ativo, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

export const CATEGORIA_SELECT_FIELDS = `
  id, organization_id, codigo, nome, descricao, parent_id, nivel, tipo, natureza,
  mapeamento_dre, mapeamento_ifrs, ativo, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

export const CENTRO_CUSTO_SELECT_FIELDS = `
  id, organization_id, codigo, nome, descricao, tipo, property_id,
  orcamento_anual, orcamento_mensal, ativo, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

// ============================================================================
// LINHAS DE EXTRATO BANCÁRIO
// ============================================================================

import type { LinhaExtrato, RegraConciliacao } from './types.ts';

// Re-exportar tipos para uso em outros arquivos
export type { LinhaExtrato, RegraConciliacao };

/**
 * Converte LinhaExtrato (TypeScript) para formato SQL (tabela financeiro_linhas_extrato)
 */
export function linhaExtratoToSql(linha: LinhaExtrato, organizationId: string): any {
  // Gerar hash único se não existir
  const hashUnico = linha.hashUnico || generateHashExtrato(linha);
  
  return {
    id: linha.id,
    organization_id: organizationId,
    conta_id: linha.contaId,
    data: linha.data,
    descricao: linha.descricao,
    valor: Math.abs(linha.valor),
    moeda: linha.moeda || 'BRL',
    tipo: linha.tipo,
    ref: linha.ref || null,
    ref_banco: linha.refBanco || null,
    hash_unico: hashUnico,
    origem: linha.origem || 'manual',
    conciliado: linha.conciliado || false,
    lancamento_id: linha.lancamentoId || null,
    confianca_ml: linha.confiancaML || null,
    sugestao_id: linha.sugestaoId || null,
    created_at: linha.createdAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_linhas_extrato) para LinhaExtrato (TypeScript)
 */
export function sqlToLinhaExtrato(row: any): LinhaExtrato {
  return {
    id: row.id,
    contaId: row.conta_id,
    data: row.data,
    descricao: row.descricao,
    valor: row.tipo === 'debito' ? -Number(row.valor) : Number(row.valor),
    moeda: row.moeda,
    tipo: row.tipo,
    ref: row.ref,
    refBanco: row.ref_banco,
    hashUnico: row.hash_unico,
    origem: row.origem,
    conciliado: row.conciliado || false,
    lancamentoId: row.lancamento_id,
    confiancaML: row.confianca_ml,
    sugestaoId: row.sugestao_id,
    createdAt: row.created_at,
  };
}

/**
 * Gera hash único para linha de extrato (deduplicação)
 */
function generateHashExtrato(linha: LinhaExtrato): string {
  const data = linha.data.substring(0, 10); // YYYY-MM-DD
  const valor = Math.abs(linha.valor).toFixed(2);
  const descricao = (linha.descricao || '').toLowerCase().trim().substring(0, 50);
  const hashString = `${data}|${valor}|${descricao}|${linha.contaId}`;
  
  // Hash simples usando crypto (Deno)
  const encoder = new TextEncoder();
  const data_encoded = encoder.encode(hashString);
  // Usar crypto.subtle se disponível, senão usar hash simples
  return btoa(hashString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
}

// ============================================================================
// REGRAS DE CONCILIAÇÃO
// ============================================================================

/**
 * Converte RegraConciliacao (TypeScript) para formato SQL (tabela financeiro_regras_conciliacao)
 */
export function regraConciliacaoToSql(regra: RegraConciliacao, organizationId: string): any {
  return {
    id: regra.id,
    organization_id: organizationId,
    nome: regra.nome,
    descricao: regra.descricao || null,
    ativo: regra.ativo !== false,
    prioridade: regra.prioridade || 50,
    padrao_operador: regra.padrao.operador,
    padrao_termo: regra.padrao.termo,
    valor_operador: regra.valor?.operador || null,
    valor_a: regra.valor?.a || null,
    valor_b: regra.valor?.b || null,
    tipo_lancamento: regra.tipo || null,
    categoria_id: regra.categoriaId || null,
    conta_contrapartida_id: regra.contaContrapartidaId || null,
    centro_custo_id: regra.centroCustoId || null,
    acao: regra.acao,
    aplicacoes: regra.aplicacoes || 0,
    ultima_aplicacao: regra.ultimaAplicacao || null,
    created_by: null, // TODO: Mapear se necessário
    created_at: regra.createdAt || new Date().toISOString(),
    updated_at: regra.updatedAt || new Date().toISOString(),
  };
}

/**
 * Converte resultado SQL (tabela financeiro_regras_conciliacao) para RegraConciliacao (TypeScript)
 */
export function sqlToRegraConciliacao(row: any): RegraConciliacao {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    ativo: row.ativo !== false,
    prioridade: row.prioridade || 50,
    padrao: {
      operador: row.padrao_operador,
      termo: row.padrao_termo,
    },
    valor: row.valor_operador ? {
      operador: row.valor_operador,
      a: row.valor_a ? Number(row.valor_a) : undefined,
      b: row.valor_b ? Number(row.valor_b) : undefined,
    } : undefined,
    tipo: row.tipo_lancamento || undefined,
    categoriaId: row.categoria_id,
    contaContrapartidaId: row.conta_contrapartida_id,
    centroCustoId: row.centro_custo_id,
    acao: row.acao,
    aplicacoes: row.aplicacoes || 0,
    ultimaAplicacao: row.ultima_aplicacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const LINHA_EXTRATO_SELECT_FIELDS = `
  id, organization_id, conta_id, data, descricao, valor, moeda, tipo,
  ref, ref_banco, hash_unico, origem, conciliado, lancamento_id,
  confianca_ml, sugestao_id, created_at
`.replace(/\s+/g, ' ').trim();

export const REGRA_CONCILIACAO_SELECT_FIELDS = `
  id, organization_id, nome, descricao, ativo, prioridade,
  padrao_operador, padrao_termo, valor_operador, valor_a, valor_b,
  tipo_lancamento, categoria_id, conta_contrapartida_id, centro_custo_id,
  acao, aplicacoes, ultima_aplicacao, created_by, created_at, updated_at
`.replace(/\s+/g, ' ').trim();

