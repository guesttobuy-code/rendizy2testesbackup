/**
 * RENDIZY - Conciliação Bancária Page
 * Gestão completa de conciliação bancária
 * 
 * @version v1.0.103.600
 */

import React, { useState, useEffect } from 'react';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { Money } from '../components/Money';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Upload, Check, X, Loader2, Search, Filter, Download } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { LinhaExtrato, ContaBancaria, Lancamento } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function ConciliacaoPage() {
  const [linhas, setLinhas] = useState<LinhaExtrato[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [selectedLinha, setSelectedLinha] = useState<LinhaExtrato | null>(null);
  
  // Filtros
  const [contaId, setContaId] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [conciliado, setConciliado] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [formato, setFormato] = useState<'csv' | 'ofx'>('csv');
  const [contaUpload, setContaUpload] = useState<string>('');

  useEffect(() => {
    loadContas();
    loadLinhas();
  }, [contaId, dataInicio, dataFim, conciliado]);

  const loadContas = async () => {
    try {
      const response = await financeiroApi.contasBancarias.list();
      if (response.success && response.data) {
        setContas(response.data || []);
        if (response.data.length > 0 && !contaUpload) {
          setContaUpload(response.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar contas:', err);
    }
  };

  const loadLinhas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.conciliacao.pendentes({
        contaId: contaId && contaId !== 'all' ? contaId : undefined,
        dataInicio,
        dataFim,
        conciliado,
      });
      
      if (response.success && response.data) {
        setLinhas(response.data.data || []);
      } else {
        setError(response.error || 'Erro ao carregar linhas');
        setLinhas([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar linhas:', err);
      setError(err.message || 'Erro ao carregar linhas');
      setLinhas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!arquivo || !contaUpload) {
      toast.error('Selecione um arquivo e uma conta bancária');
      return;
    }

    try {
      setLoading(true);
      const response = await financeiroApi.conciliacao.importar(arquivo, contaUpload, formato);
      
      if (response.success) {
        toast.success(`Importação concluída! ${response.data.linhasImportadas} linhas importadas`);
        setIsUploadDialogOpen(false);
        setArquivo(null);
        await loadLinhas();
      } else {
        toast.error(response.error || 'Erro ao importar extrato');
      }
    } catch (err: any) {
      console.error('Erro ao importar:', err);
      toast.error(err.message || 'Erro ao importar extrato');
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarRegras = async () => {
    try {
      setLoading(true);
      const response = await financeiroApi.conciliacao.aplicarRegras();
      
      if (response.success) {
        toast.success(`Regras aplicadas! ${response.data.conciliadas} linhas conciliadas, ${response.data.criadas} lançamentos criados`);
        await loadLinhas();
      } else {
        toast.error(response.error || 'Erro ao aplicar regras');
      }
    } catch (err: any) {
      console.error('Erro ao aplicar regras:', err);
      toast.error(err.message || 'Erro ao aplicar regras');
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async (lancamentoId: string) => {
    if (!selectedLinha) return;

    try {
      setLoading(true);
      const response = await financeiroApi.conciliacao.match(selectedLinha.id, lancamentoId);
      
      if (response.success) {
        toast.success('Linha conciliada com sucesso!');
        setIsMatchDialogOpen(false);
        setSelectedLinha(null);
        await loadLinhas();
      } else {
        toast.error(response.error || 'Erro ao conciliar linha');
      }
    } catch (err: any) {
      console.error('Erro ao conciliar:', err);
      toast.error(err.message || 'Erro ao conciliar linha');
    } finally {
      setLoading(false);
    }
  };

  const loadLancamentosParaMatch = async () => {
    if (!selectedLinha) return;

    try {
      const tipo = selectedLinha.tipo === 'credito' ? 'entrada' : 'saida';
      const response = await financeiroApi.lancamentos.list({
        tipo,
        conciliado: false,
        dataInicio: selectedLinha.data,
        dataFim: selectedLinha.data,
        limit: 50,
      });
      
      if (response.success && response.data) {
        setLancamentos(response.data.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar lançamentos:', err);
    }
  };

  useEffect(() => {
    if (selectedLinha && isMatchDialogOpen) {
      loadLancamentosParaMatch();
    }
  }, [selectedLinha, isMatchDialogOpen]);

  const columns: DataTableColumn<LinhaExtrato>[] = [
    {
      key: 'data',
      label: 'Data',
      sortable: true,
      render: (value) => format(new Date(value), 'dd/MM/yyyy')
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (value) => <span className="max-w-md truncate">{value}</span>
    },
    {
      key: 'valor',
      label: 'Valor',
      className: 'text-right',
      render: (value, row) => (
        <Money 
          amount={value} 
          currency={row.moeda} 
          colorize={row.tipo === 'debito'}
        />
      )
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (value) => (
        <Badge variant={value === 'credito' ? 'default' : 'destructive'}>
          {value === 'credito' ? 'Crédito' : 'Débito'}
        </Badge>
      )
    },
    {
      key: 'origem',
      label: 'Origem',
      render: (value) => <Badge variant="outline">{value?.toUpperCase() || 'MANUAL'}</Badge>
    },
    {
      key: 'conciliado',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Conciliado' : 'Pendente'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_, row) => (
        !row.conciliado ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedLinha(row);
              setIsMatchDialogOpen(true);
            }}
            title="Conciliar"
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <Badge variant="default">OK</Badge>
        )
      )
    }
  ];

  const linhasPendentes = linhas.filter(l => !l.conciliado);
  const totalPendente = linhasPendentes.reduce((sum, l) => sum + Math.abs(l.valor), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Conciliação Bancária</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importe extratos e concilie automaticamente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar linhas de extrato..."
            />
            <Button variant="outline" size="sm" onClick={handleAplicarRegras} disabled={loading}>
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Regras
            </Button>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Extrato
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Importar Extrato Bancário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Conta Bancária *</Label>
                    <Select value={contaUpload} onValueChange={setContaUpload}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome} - {conta.banco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Formato *</Label>
                    <Select value={formato} onValueChange={(v: 'csv' | 'ofx') => setFormato(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="ofx">OFX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Arquivo *</Label>
                    <Input
                      type="file"
                      accept={formato === 'csv' ? '.csv' : '.ofx'}
                      onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleUpload} disabled={loading || !arquivo}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Importar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <Label>Conta Bancária</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={conciliado ? 'true' : 'false'} onValueChange={(v) => setConciliado(v === 'true')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Pendentes</SelectItem>
                <SelectItem value="true">Conciliados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo */}
        {linhasPendentes.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {linhasPendentes.length} linha(s) pendente(s) - Total: <Money amount={totalPendente} />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && linhas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando linhas de extrato...</span>
          </div>
        ) : linhas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">Nenhuma linha de extrato encontrada</span>
          </div>
        ) : (
          <DataTable
            data={linhas}
            columns={columns}
            pageSize={25}
          />
        )}
      </div>

      {/* Dialog de Match */}
      <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conciliar Linha de Extrato</DialogTitle>
          </DialogHeader>
          {selectedLinha && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm font-medium mb-2">Linha de Extrato:</div>
                <div className="text-sm">
                  <div><strong>Data:</strong> {format(new Date(selectedLinha.data), 'dd/MM/yyyy')}</div>
                  <div><strong>Descrição:</strong> {selectedLinha.descricao}</div>
                  <div><strong>Valor:</strong> <Money amount={selectedLinha.valor} currency={selectedLinha.moeda} /></div>
                </div>
              </div>
              <div>
                <Label>Selecione um lançamento para conciliar:</Label>
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {lancamentos.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 text-center">
                      Nenhum lançamento encontrado para conciliar
                    </div>
                  ) : (
                    lancamentos.map((lancamento) => (
                      <div
                        key={lancamento.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleMatch(lancamento.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{lancamento.descricao}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(lancamento.data), 'dd/MM/yyyy')}
                            </div>
                          </div>
                          <div className="text-right">
                            <Money amount={lancamento.valor} currency={lancamento.moeda} />
                            {lancamento.categoriaNome && (
                              <div className="text-xs text-gray-500">{lancamento.categoriaNome}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ConciliacaoPage;

