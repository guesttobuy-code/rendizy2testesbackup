/**
 * RENDIZY - Contas a Pagar Page
 * Gestão completa de contas a pagar
 * 
 * @version v1.0.103.400
 */

import React, { useState, useEffect } from 'react';
import { KpiCard } from '../components/KpiCard';
import { Money } from '../components/Money';
import { PeriodPicker } from '../components/PeriodPicker';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { DollarSign, TrendingDown, Calendar, AlertTriangle, Check, FileText, Upload, Plus, Loader2 } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { Titulo, ContaContabil, ContaBancaria } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export function ContasPagarPage() {
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
    moeda: 'BRL' as const,
    categoriaId: '',
    contaId: '',
  });

  // Carregar títulos do backend
  useEffect(() => {
    loadTitulos();
  }, [startDate, endDate]);

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
        tipo: 'pagar',
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
        tipo: 'pagar',
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

  const kpis = {
    totalPagar: titulos.filter(t => t.status !== 'pago').reduce((sum, t) => sum + t.saldo, 0),
    pagos: titulos.filter(t => t.status === 'pago').reduce((sum, t) => sum + (t.valorPago || 0), 0),
    vencidos: titulos.filter(t => t.status === 'vencido' || (t.vencimento && new Date(t.vencimento) < new Date() && t.status !== 'pago')).reduce((sum, t) => sum + t.saldo, 0),
    apDays: titulos.length > 0 
      ? titulos.filter(t => t.status === 'pago' && t.dataPagamento).reduce((sum, t) => {
          const venc = new Date(t.vencimento).getTime();
          const pag = new Date(t.dataPagamento!).getTime();
          return sum + Math.ceil((pag - venc) / (1000 * 60 * 60 * 24));
        }, 0) / titulos.filter(t => t.status === 'pago').length || 0
      : 0
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      aberto: { variant: 'default', label: 'A Pagar' },
      pago: { variant: 'default', label: 'Pago' },
      vencido: { variant: 'destructive', label: 'Vencido' },
      parcial: { variant: 'secondary', label: 'Parcial' }
    };
    const config = variants[status] || variants.aberto;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filtrar títulos por termo de busca
  const filteredTitulos = searchTerm.trim()
    ? titulos.filter(t => {
        const term = searchTerm.toLowerCase();
        return (
          t.pessoa?.toLowerCase().includes(term) ||
          t.descricao?.toLowerCase().includes(term) ||
          t.valor.toString().includes(term) ||
          (t.emissao && format(new Date(t.emissao), 'dd/MM/yyyy').includes(term)) ||
          (t.vencimento && format(new Date(t.vencimento), 'dd/MM/yyyy').includes(term))
        );
      })
    : titulos;

  const columns: DataTableColumn<Titulo>[] = [
    {
      key: 'emissao',
      label: 'Emissão',
      sortable: true,
      render: (value) => value ? format(new Date(value), 'dd/MM/yyyy') : '-'
    },
    {
      key: 'vencimento',
      label: 'Vencimento',
      sortable: true,
      render: (value, row) => {
        const diasVencimento = value 
          ? Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        
        return (
          <div className="flex flex-col">
            <span>{value ? format(new Date(value), 'dd/MM/yyyy') : '-'}</span>
            {diasVencimento < 0 && row.status !== 'pago' && (
              <span className="text-xs text-red-600">
                {Math.abs(diasVencimento)} dias vencido
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'pessoa',
      label: 'Fornecedor',
      sortable: true,
      render: (value) => value || '-'
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (value) => <span className="max-w-xs truncate">{value || '-'}</span>
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      className: 'text-right',
      render: (value, row) => <Money amount={value} currency={row.moeda} />
    },
    {
      key: 'saldo',
      label: 'Saldo',
      sortable: true,
      className: 'text-right',
      render: (value, row) => <Money amount={value} currency={row.moeda} colorize />
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status !== 'pago' && (
            <Button 
              variant="ghost" 
              size="sm" 
              title="Pagar"
              onClick={() => {
                setSelectedTitulo(row);
                setValorPago(row.saldo);
                setIsQuitarDialogOpen(true);
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" title="Detalhes">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Contas a Pagar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestão de fornecedores e pagamentos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar contas a pagar..."
            />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar
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
                  <DialogTitle>Novo Título a Pagar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fornecedor *</Label>
                      <Input
                        value={formData.pessoa}
                        onChange={(e) => setFormData({ ...formData, pessoa: e.target.value })}
                        placeholder="Nome do fornecedor"
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
                    <Input
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
                            .filter((cat: ContaContabil) => cat.tipo === 'despesa')
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard
            title="Total a Pagar"
            value={<Money amount={kpis.totalPagar} />}
            icon={<DollarSign className="h-5 w-5" />}
            tone="warning"
          />
          <KpiCard
            title="Pagos"
            value={<Money amount={kpis.pagos} />}
            icon={<Check className="h-5 w-5" />}
            tone="success"
          />
          <KpiCard
            title="Vencidos"
            value={<Money amount={kpis.vencidos} />}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="danger"
          />
          <KpiCard
            title="Prazo Médio"
            value={`${kpis.apDays.toFixed(0)} dias`}
            icon={<TrendingDown className="h-5 w-5" />}
            tone="neutral"
          />
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
        {loading && !titulos.length ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <>
            {searchTerm.trim() && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {filteredTitulos.length} {filteredTitulos.length === 1 ? 'título encontrado' : 'títulos encontrados'} 
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
            )}
            <DataTable
              data={filteredTitulos}
              columns={columns}
              pageSize={10}
              selectable
            />
          </>
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
              <Label>Valor a Pagar</Label>
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

export default ContasPagarPage;
