/**
 * RENDIZY - Lançamentos Page
 * Gestão de lançamentos financeiros manuais
 */

import React, { useState, useEffect } from 'react';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { Money } from '../components/Money';
import { PeriodPicker } from '../components/PeriodPicker';
import { SplitEditor } from '../components/SplitEditor';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Plus, Download, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { Lancamento, SplitDestino, ContaContabil, ContaBancaria } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function LancamentosPage() {
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'transferencia'>('entrada');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(0);
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [contaId, setContaId] = useState<string>('');
  const [splits, setSplits] = useState<SplitDestino[]>([]);
  const [usarSplit, setUsarSplit] = useState(false);

  // Options
  const [categorias, setCategorias] = useState<ContaContabil[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  // Carregar lançamentos do backend
  useEffect(() => {
    loadLancamentos();
  }, [startDate, endDate]);

  // Carregar categorias e contas bancárias
  useEffect(() => {
    loadCategorias();
    loadContasBancarias();
  }, []);

  const loadLancamentos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.lancamentos.list({
        dataInicio: format(startDate, 'yyyy-MM-dd'),
        dataFim: format(endDate, 'yyyy-MM-dd'),
        page: 1,
        limit: 100,
        orderBy: 'data',
        order: 'desc',
      });
      
      if (response.success && response.data) {
        setLancamentos(response.data.data || []);
      } else {
        setError(response.error || 'Erro ao carregar lançamentos');
        setLancamentos([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar lançamentos:', err);
      setError(err.message || 'Erro ao carregar lançamentos');
      setLancamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      const response = await financeiroApi.categorias.list();
      if (response.success && response.data) {
        setCategorias(response.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const loadContasBancarias = async () => {
    try {
      const response = await financeiroApi.contasBancarias.list();
      if (response.success && response.data) {
        setContasBancarias(response.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar contas bancárias:', err);
    }
  };

  const handleSave = async () => {
    if (!descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (valor <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const lancamentoData: Partial<Lancamento> = {
        tipo,
        data,
        competencia: data,
        descricao: descricao.trim(),
        valor,
        moeda: 'BRL',
        categoriaId: categoriaId || undefined,
        contaId: contaId || undefined,
        hasSplit: usarSplit,
        splits: usarSplit ? splits : undefined,
        conciliado: false,
      };

      let response;
      if (editingLancamento) {
        response = await financeiroApi.lancamentos.update(editingLancamento.id, lancamentoData);
      } else {
        response = await financeiroApi.lancamentos.create(lancamentoData);
      }

      if (response.success) {
        toast.success('Lançamento salvo com sucesso!');
        setIsDialogOpen(false);
        setEditingLancamento(null);
        // Reset form
        setTipo('entrada');
        setData(format(new Date(), 'yyyy-MM-dd'));
        setDescricao('');
        setValor(0);
        setCategoriaId('');
        setContaId('');
        setSplits([]);
        setUsarSplit(false);
        // Recarregar lista
        await loadLancamentos();
      } else {
        setError(response.error || 'Erro ao salvar lançamento');
        toast.error(response.error || 'Erro ao salvar lançamento');
      }
    } catch (err: any) {
      console.error('Erro ao salvar lançamento:', err);
      setError(err.message || 'Erro ao salvar lançamento');
      toast.error(err.message || 'Erro ao salvar lançamento');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Implementar handleDelete quando necessário
  // const handleDelete = async (id: string) => {
  //   if (!confirm('Tem certeza que deseja excluir este lançamento?')) {
  //     return;
  //   }
  //   try {
  //     setLoading(true);
  //     setError(null);
  //     const response = await financeiroApi.lancamentos.delete(id);
  //     if (response.success) {
  //       await loadLancamentos();
  //     } else {
  //       setError(response.error || 'Erro ao excluir lançamento');
  //     }
  //   } catch (err: any) {
  //     console.error('Erro ao excluir lançamento:', err);
  //     setError(err.message || 'Erro ao excluir lançamento');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'entrada') return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
    if (tipo === 'saida') return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
    return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
  };

  const getTipoBadge = (tipo: string) => {
    const configs = {
      entrada: { variant: 'default' as const, label: 'Entrada' },
      saida: { variant: 'destructive' as const, label: 'Saída' },
      transferencia: { variant: 'secondary' as const, label: 'Transferência' }
    };
    const config = configs[tipo as keyof typeof configs];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filtrar lançamentos por termo de busca
  const filteredLancamentos = searchTerm.trim()
    ? lancamentos.filter(l => {
        const term = searchTerm.toLowerCase();
        return (
          l.descricao?.toLowerCase().includes(term) ||
          l.categoriaNome?.toLowerCase().includes(term) ||
          l.valor.toString().includes(term) ||
          format(new Date(l.data), 'dd/MM/yyyy').includes(term)
        );
      })
    : lancamentos;

  const columns: DataTableColumn<Lancamento>[] = [
    {
      key: 'data',
      label: 'Data',
      sortable: true,
      render: (value) => format(new Date(value), 'dd/MM/yyyy')
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (value) => (
        <div className="flex items-center gap-2">
          {getTipoIcon(value)}
          {getTipoBadge(value)}
        </div>
      )
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (value) => <span className="max-w-md truncate">{value}</span>
    },
    {
      key: 'categoriaNome',
      label: 'Categoria',
      render: (value) => value || <span className="text-gray-400">-</span>
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      className: 'text-right',
      render: (value, row) => (
        <Money
          amount={row.tipo === 'saida' ? -value : value}
          currency={row.moeda}
          colorize
        />
      )
    },
    {
      key: 'conciliado',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'default' : 'outline'}>
          {value ? 'Conciliado' : 'Pendente'}
        </Badge>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Lançamentos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestão de movimentações financeiras
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar lançamentos..."
            />
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Tipo, Data e Valor */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <Label>Descrição *</Label>
                    <Textarea 
                      placeholder="Descreva o lançamento..." 
                      rows={2}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                    />
                  </div>

                  {/* Categoria e Conta Bancária */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={categoriaId} onValueChange={setCategoriaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {categorias
                            .filter((cat: ContaContabil) => {
                              // Filtrar categorias baseado no tipo de lançamento
                              if (tipo === 'entrada') return cat.tipo === 'receita';
                              if (tipo === 'saida') return cat.tipo === 'despesa';
                              return true; // Transferências podem usar qualquer categoria
                            })
                            .map((categoria: ContaContabil) => (
                              <SelectItem key={categoria.id} value={categoria.id}>
                                {categoria.codigo} - {categoria.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Conta Bancária</Label>
                      <Select value={contaId} onValueChange={setContaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma conta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {contasBancarias.map((conta: ContaBancaria) => (
                            <SelectItem key={conta.id} value={conta.id}>
                              {conta.nome} - {conta.banco}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Split */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={usarSplit}
                      onChange={(e) => setUsarSplit(e.target.checked)}
                      className="rounded"
                    />
                    <Label>Dividir entre múltiplos beneficiários</Label>
                  </div>

                  {usarSplit && (
                    <SplitEditor
                      valorTotal={valor}
                      splits={splits}
                      onChange={setSplits}
                    />
                  )}

                  {/* Botões */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <PeriodPicker
          startDate={startDate}
          endDate={endDate}
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && lancamentos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando lançamentos...</span>
          </div>
        ) : lancamentos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">Nenhum lançamento encontrado no período selecionado</span>
          </div>
        ) : (
          <>
            {searchTerm.trim() && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {filteredLancamentos.length} {filteredLancamentos.length === 1 ? 'lançamento encontrado' : 'lançamentos encontrados'} 
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
            )}
            <DataTable
              data={filteredLancamentos}
              columns={columns}
              pageSize={25}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default LancamentosPage;
