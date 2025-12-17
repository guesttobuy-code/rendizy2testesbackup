/**
 * RENDIZY - Tipos do Módulo Financeiro
 * Sistema completo de gestão financeira
 * 
 * @version v1.0.103.234
 * @date 2025-11-01
 */

// ============================================================================
// TIPOS BÁSICOS
// ============================================================================

export type Currency = 'BRL' | 'USD' | 'EUR';
export type LancamentoTipo = 'entrada' | 'saida' | 'transferencia';
export type StatusTitulo = 'aberto' | 'pago' | 'vencido' | 'cancelado' | 'parcial';
export type StatusFiscal = 'pendente' | 'autorizado' | 'rejeitado' | 'cancelado';
export type TipoDocumentoFiscal = 'nfe' | 'nfse';
export type AcaoRegra = 'sugerir' | 'auto_conciliar' | 'auto_criar';
export type OperadorPadrao = 'contains' | 'equals' | 'regex';
export type OperadorValor = 'eq' | 'gte' | 'lte' | 'between';
export type TipoConta = 'corrente' | 'poupanca' | 'investimento';

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

export interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string;
  agencia?: string;
  numero?: string;
  tipo: TipoConta;
  moeda: Currency;
  saldo?: number;
  saldoInicial?: number;
  ativo: boolean;
  statusFeed?: 'conectado' | 'desconectado' | 'erro' | 'expirado';
  ultimaSincronizacao?: string;
  consentimentoId?: string;
  consentimentoValidade?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinhaExtrato {
  id: string;
  contaId: string;
  data: string;
  descricao: string;
  valor: number;
  moeda: Currency;
  tipo: 'debito' | 'credito';
  ref?: string;
  refBanco?: string;
  hashUnico?: string;
  origem?: 'ofx' | 'csv' | 'open_finance' | 'manual';
  conciliado: boolean;
  lancamentoId?: string;
  confiancaML?: number;
  sugestaoId?: string;
  createdAt: string;
}

export interface RegraConciliacao {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  prioridade: number;
  
  // Condições
  padrao: {
    operador: OperadorPadrao;
    termo: string;
  };
  valor?: {
    operador: OperadorValor;
    a?: number;
    b?: number;
  };
  tipo?: LancamentoTipo;
  
  // Ações
  categoriaId?: string;
  contaContrapartidaId?: string;
  centroCustoId?: string;
  acao: AcaoRegra;
  
  // Metadata
  aplicacoes?: number;
  ultimaAplicacao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lancamento {
  id: string;
  tipo: LancamentoTipo;
  data: string;
  competencia?: string;
  descricao: string;
  valor: number;
  moeda: Currency;
  
  // Classificação
  categoriaId?: string;
  categoriaNome?: string;
  contaId?: string;
  contaNome?: string;
  contaOrigemId?: string;
  contaDestinoId?: string;
  centroCustoId?: string;
  centroCustoNome?: string;
  projetoId?: string;
  projetoNome?: string;
  
  // Documentação
  documento?: string;
  notaFiscal?: string;
  anexos?: string[];
  observacoes?: string;
  
  // Conciliação
  conciliado: boolean;
  linhaExtratoId?: string;
  
  // Split
  hasSplit: boolean;
  splits?: SplitDestino[];
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitDestino {
  id: string;
  lancamentoId?: string;
  nome: string;
  tipo: 'percentual' | 'valor';
  percentual?: number;
  valor?: number;
  contaDestinoId?: string;
  contaDestino?: string;
  centroCustoId?: string;
  observacoes?: string;
}

export interface Titulo {
  id: string;
  tipo: 'receber' | 'pagar';
  
  // Dados principais
  emissao: string;
  vencimento: string;
  competencia?: string;
  pessoa: string;
  pessoaId?: string;
  descricao: string;
  
  // Valores
  moeda: Currency;
  valorOriginal: number;
  valor: number;
  valorPago?: number;
  saldo: number;
  desconto?: number;
  juros?: number;
  multa?: number;
  
  // Classificação
  categoriaId?: string;
  centroCustoId?: string;
  contaBancariaId?: string;
  projetoId?: string;
  
  // Status
  status: StatusTitulo;
  diasVencimento?: number;
  
  // Pagamento/Recebimento
  dataPagamento?: string;
  formaPagamento?: string;
  numeroDocumento?: string;
  
  // Recorrência
  recorrente: boolean;
  recorrenciaId?: string;
  parcela?: number;
  totalParcelas?: number;
  
  // Documentação
  notaFiscal?: string;
  anexos?: string[];
  observacoes?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CentroCusto {
  id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  tipo: 'unidade' | 'projeto' | 'departamento' | 'tarefa';
  parentId?: string;
  parent?: CentroCusto;
  children?: CentroCusto[];
  nivel?: number;
  ativo: boolean;
  
  // Rateio
  percentualRateio?: number;
  
  // Orçamento
  orcamentoMensal?: number;
  orcamentoAnual?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'ativo' | 'passivo' | 'receita' | 'despesa' | 'resultado';
  natureza: 'devedora' | 'credora';
  nivel: number;
  parentId?: string;
  parent?: ContaContabil;
  children?: ContaContabil[];
  analitica: boolean;
  moeda: Currency;
  ativo: boolean;
  
  // Classificação
  grupo?: string;
  subgrupo?: string;
  
  // Mapeamento
  contaGerencialId?: string;
  contaIFRSId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface MapCOA {
  id: string;
  gerencialId: string;
  contabilId?: string;
  ifrsId?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentoFiscal {
  id: string;
  tipo: TipoDocumentoFiscal;
  serie: string;
  numero: string;
  
  // Partes
  emitente: {
    nome: string;
    documento: string;
    ie?: string;
    endereco?: string;
  };
  destinatario: {
    nome: string;
    documento: string;
    ie?: string;
    endereco?: string;
  };
  
  // Valores
  moeda: Currency;
  valorTotal: number;
  valorProdutos?: number;
  valorServicos?: number;
  valorDesconto?: number;
  valorImposto?: number;
  
  // Impostos
  impostos?: {
    tipo: string;
    base: number;
    aliquota: number;
    valor: number;
  }[];
  
  // Datas
  dataEmissao: string;
  dataAutorizacao?: string;
  
  // Status
  status: StatusFiscal;
  chaveAcesso?: string;
  protocolo?: string;
  motivoRejeicao?: string;
  
  // Arquivos
  xmlPath?: string;
  pdfPath?: string;
  
  // Relacionamento
  tituloId?: string;
  lancamentoId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguracaoFinanceira {
  id: string;
  organizationId: string;
  
  // Moedas
  moedasAtivas: Currency[];
  moedaPrincipal: Currency;
  
  // Contas padrão
  contaCaixaId?: string;
  contaBancoId?: string;
  contaReceberPadraoId?: string;
  contaPagarPadraoId?: string;
  
  // Formatação
  casasDecimais: number;
  separadorMilhar: string;
  separadorDecimal: string;
  
  // Conciliação
  toleranciaDias: number;
  toleranciaValor: number;
  autoAplicarRegras: boolean;
  ordemPrioridadeRegras: 'crescente' | 'decrescente';
  
  // DRE
  estruturaDRE?: any;
  mapeamentoCOA?: any;
  
  // Fiscal
  certificadoDigitalPath?: string;
  certificadoSenha?: string;
  ambienteFiscal: 'producao' | 'homologacao';
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// INTERFACES DE UI/RELATÓRIOS
// ============================================================================

export interface KPI {
  label: string;
  value: number | string;
  hint?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    pct?: number;
  };
  tone?: 'success' | 'danger' | 'warning' | 'info';
}

export interface ItemDRE {
  id: string;
  codigo?: string;
  nome: string;
  nivel: number;
  tipo: 'grupo' | 'conta';
  valor: number;
  percentual?: number;
  children?: ItemDRE[];
  expanded?: boolean;
}

export interface EventoFluxoCaixa {
  data: string;
  tipo: 'entrada' | 'saida' | 'transferencia';
  descricao: string;
  valor: number;
  categoria?: string;
  confirmado: boolean;
  probabilidade?: number;
}

export interface ProjecaoFluxoCaixa {
  periodo: string;
  entradas: number;
  saidas: number;
  saldo: number;
  saldoAcumulado: number;
  cenario?: 'otimista' | 'base' | 'pessimista';
}

export interface AgingItem {
  cliente: string;
  faixa_0_30: number;
  faixa_31_60: number;
  faixa_61_90: number;
  faixa_90_plus: number;
  total: number;
}

export interface SugestaoConciliacao {
  id: string;
  linhaExtratoId: string;
  lancamentoId?: string;
  confianca: number;
  tipo: 'match' | 'create' | 'transfer' | 'split';
  motivo: string;
  dados?: any;
}

// ============================================================================
// INTERFACES DE FILTROS/PAGINAÇÃO
// ============================================================================

export interface FiltroFinanceiro {
  dataInicio?: string;
  dataFim?: string;
  moeda?: Currency;
  categoriaId?: string;
  centroCustoId?: string;
  contaId?: string;
  tipo?: string;
  status?: string;
  busca?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// TIPOS DE AÇÕES/EVENTOS
// ============================================================================

export type AcaoConciliacao = 'match' | 'create' | 'transfer' | 'split' | 'ignore';

export interface MatchConciliacaoPayload {
  linhaExtratoId: string;
  lancamentoId: string;
  observacoes?: string;
}

export interface CreateLancamentoPayload {
  linhaExtratoId: string;
  tipo: LancamentoTipo;
  categoriaId?: string;
  centroCustoId?: string;
  contaContrapartidaId?: string;
  observacoes?: string;
}

export interface TransferenciaConciliacaoPayload {
  linhaExtratoId: string;
  contaOrigemId: string;
  contaDestinoId: string;
  observacoes?: string;
}

export interface SplitConciliacaoPayload {
  linhaExtratoId: string;
  splits: SplitDestino[];
  observacoes?: string;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Types são exportados individualmente acima
};
