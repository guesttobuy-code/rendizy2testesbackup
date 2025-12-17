/**
 * RENDIZY - Contas a Receber Page
 * Gestão completa de contas a receber
 * 
 * @version v1.0.103.400
 */

import React, { useState, useEffect } from 'react';
import { KpiCard } from '../components/KpiCard';
import { Money } from '../components/Money';
import { PeriodPicker } from '../components/PeriodPicker';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Card } from '../../ui/card';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Plus, Search, Download, DollarSign, TrendingUp, Calendar, AlertTriangle, Check, X, Mail, FileText, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { Titulo, Currency, ContaContabil, ContaBancaria } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function ContasReceberPage() {
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moedaFilter, setMoedaFilter] = useState<Currency | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuitarDialogOpen, setIsQuitarDialogOpen] = useState(false);
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null);
  const [valorPago, setValorPago] = useState(0);
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Options
  const [categorias, setCategorias] = useState<ContaContabil[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    pessoa: '',
    descricao: '',
    valor: 0,
    emissao: format(new Date(), 'yyyy-MM-dd'),
    vencimento: format(new Date(), 'yyyy-MM-dd'),
    moeda: 'BRL' as Currency,
    categoriaId: '',
    contaId: '',
  });

  // Carregar títulos do backend
  useEffect(() => {
    loadTitulos();
  }, [startDate, endDate, statusFilter, moedaFilter]);

  // Carregar categorias e contas bancárias
  useEffect(() => {
    loadCategorias();
    loadContasBancarias();
  }, []);

  const loadTitulos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.titulos.list({
        tipo: 'receber',
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: 1,
        limit: 100,
      });
      
      if (response.success && response.data) {
        let titulosData = response.data.data || [];
        
        // Filtrar por período
        titulosData = titulosData.filter(t => {
          const vencimento = new Date(t.vencimento);
          return vencimento >= startDate && vencimento <= endDate;
        });

        // Filtrar por moeda
        if (moedaFilter !== 'all') {
          titulosData = titulosData.filter(t => t.moeda === moedaFilter);
        }

        // Filtrar por busca
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          titulosData = titulosData.filter(t => 
            t.pessoa?.toLowerCase().includes(term) ||
            t.descricao?.toLowerCase().includes(term)
          );
        }

        setTitulos(titulosData);
      } else {
        setError(response.error || 'Erro ao carregar títulos');
        setTitulos([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar títulos:', err);
      setError(err.message || 'Erro ao carregar títulos');
      setTitulos([]);
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
    try {
      setLoading(true);
      const response = await financeiroApi.titulos.create({
        tipo: 'receber',
        ...formData,
        valorOriginal: formData.valor,
        valor: formData.valor,
        saldo: formData.valor,
        status: 'aberto',
      });

      if (response.success) {
        toast.success('Título criado com sucesso');
        setIsDialogOpen(false);
        resetForm();
        loadTitulos();
      } else {
        toast.error(response.error || 'Erro ao criar título');
      }
    } catch (err: any) {
      console.error('Erro ao criar título:', err);
      toast.error(err.message || 'Erro ao criar título');
    } finally {
      setLoading(false);
    }
  };

  const handleQuitar = async () => {
    if (!selectedTitulo) return;
    
    try {
      setLoading(true);
      const response = await financeiroApi.titulos.quitar(selectedTitulo.id, {
        valorPago: valorPago || selectedTitulo.saldo,
        dataPagamento,
      });

      if (response.success) {
        toast.success('Título quitado com sucesso');
        setIsQuitarDialogOpen(false);
        setSelectedTitulo(null);
        loadTitulos();
      } else {
        toast.error(response.error || 'Erro ao quitar título');
      }
    } catch (err: any) {
      console.error('Erro ao quitar título:', err);
      toast.error(err.message || 'Erro ao quitar título');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      pessoa: '',
      descricao: '',
      valor: 0,
      emissao: format(new Date(), 'yyyy-MM-dd'),
      vencimento: format(new Date(), 'yyyy-MM-dd'),
      moeda: 'BRL',
      categoriaId: '',
      contaId: '',
    });
  };

  // KPIs calculados
  const kpis = {
    totalReceber: titulos.filter(t => t.status !== 'pago').reduce((sum, t) => sum + t.saldo, 0),
    recebidos: titulos.filter(t => t.status === 'pago').reduce((sum, t) => sum + (t.valorPago || 0), 0),
    vencidos: titulos.filter(t => t.status === 'vencido').reduce((sum, t) => sum + t.saldo, 0),
    arDays: titulos.length > 0 
      ? titulos.filter(t => t.status === 'pago' && t.dataPagamento).reduce((sum, t) => {
          const venc = new Date(t.vencimento).getTime();
          const pag = new Date(t.dataPagamento!).getTime();
          return sum + Math.ceil((pag - venc) / (1000 * 60 * 60 * 24));
        }, 0) / titulos.filter(t => t.status === 'pago').length || 0
      : 0
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon?: React.ReactNode }> = {
      aberto: { variant: 'default', label: 'A Vencer', icon: <Calendar className="h-3 w-3" /> },
      pago: { variant: 'default', label: 'Quitado', icon: <Check className="h-3 w-3" /> },
      vencido: { variant: 'destructive', label: 'Vencido', icon: <AlertTriangle className="h-3 w-3" /> },
      parcial: { variant: 'secondary', label: 'Parcial', icon: <DollarSign className="h-3 w-3" /> },
      cancelado: { variant: 'outline', label: 'Cancelado', icon: <X className="h-3 w-3" /> }
    };

    const config = variants[status] || variants.aberto;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Contas a Receber</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestão de títulos e recebimentos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Título
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Título a Receber</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Cliente *</Label>
                      <Input
                        value={formData.pessoa}
                        onChange={(e) => setFormData({ ...formData, pessoa: e.target.value })}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div>
                      <Label>Valor *</Label>
                      <Input
                        type="number"
                        value={formData.valor}
                        onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição *</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição do título"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Emissão *</Label>
                      <Input
                        type="date"
                        value={formData.emissao}
                        onChange={(e) => setFormData({ ...formData, emissao: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Data de Vencimento *</Label>
                      <Input
                        type="date"
                        value={formData.vencimento}
                        onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categoria</Label>
                      <Select 
                        value={formData.categoriaId} 
                        onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {categorias
                            .filter((cat: ContaContabil) => cat.tipo === 'receita')
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
                      <Select 
                        value={formData.contaId} 
                        onValueChange={(value) => setFormData({ ...formData, contaId: value })}
                      >
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
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard
            title="Total a Receber"
            value={<Money amount={kpis.totalReceber} />}
            hint="Títulos em aberto"
            icon={<DollarSign className="h-5 w-5" />}
            tone="info"
          />
          <KpiCard
            title="Recebidos"
            value={<Money amount={kpis.recebidos} />}
            hint="Neste período"
            icon={<Check className="h-5 w-5" />}
            tone="success"
          />
          <KpiCard
            title="Vencidos"
            value={<Money amount={kpis.vencidos} />}
            hint="Necessita atenção"
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="danger"
          />
          <KpiCard
            title="Prazo Médio"
            value={`${kpis.arDays.toFixed(0)} dias`}
            hint="AR Days (média)"
            icon={<TrendingUp className="h-5 w-5" />}
            tone="neutral"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            className="w-64"
          />

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente, descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="aberto">A Vencer</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="pago">Quitado</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moedaFilter} onValueChange={(v) => setMoedaFilter(v as Currency | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Moeda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading && !titulos.length ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card className="p-6">
            <p className="text-red-600">{error}</p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" className="rounded" />
                  </TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titulos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Nenhum título encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  titulos.map((titulo) => {
                    const diasVencimento = titulo.vencimento 
                      ? Math.ceil((new Date(titulo.vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 0;
                    
                    return (
                      <TableRow key={titulo.id}>
                        <TableCell>
                          <input type="checkbox" className="rounded" />
                        </TableCell>
                        <TableCell className="text-sm">
                          {titulo.emissao ? format(new Date(titulo.emissao), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span>{titulo.vencimento ? format(new Date(titulo.vencimento), 'dd/MM/yyyy') : '-'}</span>
                            {diasVencimento < 0 && (
                              <span className="text-xs text-red-600 dark:text-red-400">
                                {Math.abs(diasVencimento)} dias vencido
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{titulo.pessoa || '-'}</span>
                            {titulo.recorrente && (
                              <span className="text-xs text-gray-500">
                                {titulo.parcela}/{titulo.totalParcelas}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {titulo.descricao || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Money amount={titulo.valor} currency={titulo.moeda} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Money amount={titulo.saldo} currency={titulo.moeda} colorize />
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(titulo.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {titulo.status !== 'pago' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Receber"
                                onClick={() => {
                                  setSelectedTitulo(titulo);
                                  setValorPago(titulo.saldo);
                                  setIsQuitarDialogOpen(true);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" title="Enviar cobrança">
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Detalhes">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Dialog Quitar */}
      <Dialog open={isQuitarDialogOpen} onOpenChange={setIsQuitarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitar Título</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div>
              <Label>Valor a Receber</Label>
              <Input
                type="number"
                value={valorPago}
                onChange={(e) => setValorPago(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Data de Pagamento</Label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsQuitarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleQuitar} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Quitar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContasReceberPage;
