/**
 * RENDIZY - Contas Bancárias Page
 * Gestão completa de contas bancárias
 * 
 * @version v1.0.103.500
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
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import type { ContaBancaria } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function ContasBancariasPage() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
    agencia: '',
    numero: '',
    tipo: 'corrente' as 'corrente' | 'poupanca' | 'investimento',
    moeda: 'BRL' as 'BRL' | 'USD' | 'EUR',
    saldoInicial: 0,
    ativo: true,
  });

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.contasBancarias.list();
      
      if (response.success && response.data) {
        setContas(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar contas bancárias');
        setContas([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar contas bancárias:', err);
      setError(err.message || 'Erro ao carregar contas bancárias');
      setContas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const contaData: Partial<ContaBancaria> = {
        nome: formData.nome.trim(),
        banco: formData.banco.trim() || undefined,
        agencia: formData.agencia.trim() || undefined,
        numero: formData.numero.trim() || undefined,
        tipo: formData.tipo,
        moeda: formData.moeda,
        saldoInicial: formData.saldoInicial,
        ativo: formData.ativo,
      };

      let response;
      if (editingConta) {
        // TODO: Implementar update quando disponível no backend
        toast.error('Edição ainda não implementada no backend');
        return;
      } else {
        response = await financeiroApi.contasBancarias.create(contaData);
      }

      if (response.success) {
        toast.success('Conta bancária salva com sucesso!');
        setIsDialogOpen(false);
        setEditingConta(null);
        resetForm();
        await loadContas();
      } else {
        setError(response.error || 'Erro ao salvar conta bancária');
        toast.error(response.error || 'Erro ao salvar conta bancária');
      }
    } catch (err: any) {
      console.error('Erro ao salvar conta bancária:', err);
      setError(err.message || 'Erro ao salvar conta bancária');
      toast.error(err.message || 'Erro ao salvar conta bancária');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      banco: '',
      agencia: '',
      numero: '',
      tipo: 'corrente',
      moeda: 'BRL',
      saldoInicial: 0,
      ativo: true,
    });
  };

  const handleEdit = (conta: ContaBancaria) => {
    setEditingConta(conta);
    setFormData({
      nome: conta.nome,
      banco: conta.banco || '',
      agencia: conta.agencia || '',
      numero: conta.numero || '',
      tipo: conta.tipo,
      moeda: conta.moeda,
      saldoInicial: conta.saldoInicial || 0,
      ativo: conta.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingConta(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Filtrar contas por termo de busca
  const filteredContas = searchTerm.trim()
    ? contas.filter(c => {
        const term = searchTerm.toLowerCase();
        return (
          c.nome?.toLowerCase().includes(term) ||
          c.banco?.toLowerCase().includes(term) ||
          c.agencia?.toLowerCase().includes(term) ||
          c.numero?.toLowerCase().includes(term) ||
          c.tipo?.toLowerCase().includes(term)
        );
      })
    : contas;

  const columns: DataTableColumn<ContaBancaria>[] = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
    },
    {
      key: 'banco',
      label: 'Banco',
      render: (value) => value || '-'
    },
    {
      key: 'agencia',
      label: 'Agência',
      render: (value) => value || '-'
    },
    {
      key: 'numero',
      label: 'Número',
      render: (value) => value || '-'
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (value) => {
        const labels: Record<string, string> = {
          corrente: 'Corrente',
          poupanca: 'Poupança',
          investimento: 'Investimento'
        };
        return <Badge variant="outline">{labels[value] || value}</Badge>;
      }
    },
    {
      key: 'moeda',
      label: 'Moeda',
      render: (value) => <Badge variant="secondary">{value}</Badge>
    },
    {
      key: 'saldo',
      label: 'Saldo',
      className: 'text-right',
      render: (value, row) => (
        <Money amount={value || 0} currency={row.moeda} />
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Contas Bancárias</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestão de contas bancárias e saldos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar contas bancárias..."
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Conta Principal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Banco</Label>
                    <Input
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                      placeholder="Ex: Banco do Brasil"
                    />
                  </div>
                  <div>
                    <Label>Agência</Label>
                    <Input
                      value={formData.agencia}
                      onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                      placeholder="0000-0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número da Conta</Label>
                    <Input
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="00000-0"
                    />
                  </div>
                  <div>
                    <Label>Saldo Inicial</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.saldoInicial}
                      onChange={(e) => setFormData({ ...formData, saldoInicial: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value: 'corrente' | 'poupanca' | 'investimento') => 
                        setFormData({ ...formData, tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                        <SelectItem value="investimento">Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Moeda *</Label>
                    <Select
                      value={formData.moeda}
                      onValueChange={(value: 'BRL' | 'USD' | 'EUR') => 
                        setFormData({ ...formData, moeda: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL - Real</SelectItem>
                        <SelectItem value="USD">USD - Dólar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <Label>Conta ativa</Label>
                </div>
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
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && contas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando contas bancárias...</span>
          </div>
        ) : contas.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">Nenhuma conta bancária encontrada</span>
          </div>
        ) : (
          <>
            {searchTerm.trim() && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {filteredContas.length} {filteredContas.length === 1 ? 'conta encontrada' : 'contas encontradas'} 
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
            )}
            <DataTable
              data={filteredContas}
              columns={columns}
              pageSize={25}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default ContasBancariasPage;

