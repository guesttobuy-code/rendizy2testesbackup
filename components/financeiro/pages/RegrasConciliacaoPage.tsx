/**
 * RENDIZY - Regras de Conciliação Page
 * Gestão de regras automáticas de conciliação
 * 
 * @version v1.0.103.600
 */

import React, { useState, useEffect } from 'react';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import type { RegraConciliacao, ContaContabil, ContaBancaria, CentroCusto } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';

export function RegrasConciliacaoPage() {
  const [regras, setRegras] = useState<RegraConciliacao[]>([]);
  const [categorias, setCategorias] = useState<ContaContabil[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [centrosCustos, setCentrosCustos] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraConciliacao | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
    prioridade: 50,
    padraoOperador: 'contains' as 'contains' | 'equals' | 'regex',
    padraoTermo: '',
    valorOperador: '' as 'eq' | 'gte' | 'lte' | 'between' | '',
    valorA: '',
    valorB: '',
    tipo: '' as 'entrada' | 'saida' | 'transferencia' | '',
    categoriaId: '',
    contaContrapartidaId: '',
    centroCustoId: '',
    acao: 'sugerir' as 'sugerir' | 'auto_conciliar' | 'auto_criar',
  });

  useEffect(() => {
    loadRegras();
    loadCategorias();
    loadContas();
    loadCentrosCustos();
  }, []);

  const loadRegras = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.conciliacao.regras.list();
      
      if (response.success && response.data) {
        setRegras(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar regras');
        setRegras([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar regras:', err);
      setError(err.message || 'Erro ao carregar regras');
      setRegras([]);
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

  const loadContas = async () => {
    try {
      const response = await financeiroApi.contasBancarias.list();
      if (response.success && response.data) {
        setContas(response.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar contas:', err);
    }
  };

  const loadCentrosCustos = async () => {
    try {
      const response = await financeiroApi.centroCustos.list();
      if (response.success && response.data) {
        setCentrosCustos(response.data || []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar centros de custos:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.padraoTermo.trim()) {
      toast.error('Nome e termo do padrão são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const regraData: Partial<RegraConciliacao> = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        ativo: formData.ativo,
        prioridade: Number(formData.prioridade),
        padrao: {
          operador: formData.padraoOperador,
          termo: formData.padraoTermo.trim(),
        },
        valor: formData.valorOperador ? {
          operador: formData.valorOperador,
          a: formData.valorA ? Number(formData.valorA) : undefined,
          b: formData.valorB ? Number(formData.valorB) : undefined,
        } : undefined,
        tipo: formData.tipo || undefined,
        categoriaId: formData.categoriaId || undefined,
        contaContrapartidaId: formData.contaContrapartidaId || undefined,
        centroCustoId: formData.centroCustoId || undefined,
        acao: formData.acao,
      };

      let response;
      if (editingRegra) {
        response = await financeiroApi.conciliacao.regras.update(editingRegra.id, regraData);
      } else {
        response = await financeiroApi.conciliacao.regras.create(regraData);
      }

      if (response.success) {
        toast.success('Regra salva com sucesso!');
        setIsDialogOpen(false);
        setEditingRegra(null);
        resetForm();
        await loadRegras();
      } else {
        setError(response.error || 'Erro ao salvar regra');
        toast.error(response.error || 'Erro ao salvar regra');
      }
    } catch (err: any) {
      console.error('Erro ao salvar regra:', err);
      setError(err.message || 'Erro ao salvar regra');
      toast.error(err.message || 'Erro ao salvar regra');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      ativo: true,
      prioridade: 50,
      padraoOperador: 'contains',
      padraoTermo: '',
      valorOperador: '',
      valorA: '',
      valorB: '',
      tipo: '',
      categoriaId: '',
      contaContrapartidaId: '',
      centroCustoId: '',
      acao: 'sugerir',
    });
  };

  const handleEdit = (regra: RegraConciliacao) => {
    setEditingRegra(regra);
    setFormData({
      nome: regra.nome,
      descricao: regra.descricao || '',
      ativo: regra.ativo,
      prioridade: regra.prioridade,
      padraoOperador: regra.padrao.operador,
      padraoTermo: regra.padrao.termo,
      valorOperador: regra.valor?.operador || '',
      valorA: regra.valor?.a?.toString() || '',
      valorB: regra.valor?.b?.toString() || '',
      tipo: regra.tipo || '',
      categoriaId: regra.categoriaId || '',
      contaContrapartidaId: regra.contaContrapartidaId || '',
      centroCustoId: regra.centroCustoId || '',
      acao: regra.acao,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingRegra(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await financeiroApi.conciliacao.regras.delete(id);
      
      if (response.success) {
        toast.success('Regra excluída com sucesso!');
        await loadRegras();
      } else {
        toast.error(response.error || 'Erro ao excluir regra');
      }
    } catch (err: any) {
      console.error('Erro ao excluir regra:', err);
      toast.error(err.message || 'Erro ao excluir regra');
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn<RegraConciliacao>[] = [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
    },
    {
      key: 'padrao',
      label: 'Padrão',
      render: (value) => (
        <div className="text-sm">
          <span className="font-mono">{value.operador}</span>: &quot;{value.termo}&quot;
        </div>
      )
    },
    {
      key: 'acao',
      label: 'Ação',
      render: (value) => {
        const labels: Record<string, string> = {
          sugerir: 'Sugerir',
          auto_conciliar: 'Auto-conciliar',
          auto_criar: 'Auto-criar',
        };
        return <Badge variant="outline">{labels[value] || value}</Badge>;
      }
    },
    {
      key: 'prioridade',
      label: 'Prioridade',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'aplicacoes',
      label: 'Aplicações',
      render: (value) => value || 0
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl">Regras de Conciliação</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure regras automáticas para conciliação bancária
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRegra ? 'Editar Regra' : 'Nova Regra de Conciliação'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: PIX Recebido"
                    />
                  </div>
                  <div>
                    <Label>Prioridade (0-100) *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.prioridade}
                      onChange={(e) => setFormData({ ...formData, prioridade: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição da regra"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Operador do Padrão *</Label>
                    <Select
                      value={formData.padraoOperador}
                      onValueChange={(v: 'contains' | 'equals' | 'regex') => 
                        setFormData({ ...formData, padraoOperador: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="regex">Expressão Regular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Termo do Padrão *</Label>
                    <Input
                      value={formData.padraoTermo}
                      onChange={(e) => setFormData({ ...formData, padraoTermo: e.target.value })}
                      placeholder="Ex: PIX RECEBIDO"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Operador de Valor</Label>
                    <Select
                      value={formData.valorOperador}
                      onValueChange={(v: 'eq' | 'gte' | 'lte' | 'between' | '') => 
                        setFormData({ ...formData, valorOperador: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        <SelectItem value="eq">Igual a</SelectItem>
                        <SelectItem value="gte">Maior ou igual</SelectItem>
                        <SelectItem value="lte">Menor ou igual</SelectItem>
                        <SelectItem value="between">Entre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.valorOperador && (
                    <>
                      <div>
                        <Label>Valor A</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.valorA}
                          onChange={(e) => setFormData({ ...formData, valorA: e.target.value })}
                        />
                      </div>
                      {formData.valorOperador === 'between' && (
                        <div>
                          <Label>Valor B</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.valorB}
                            onChange={(e) => setFormData({ ...formData, valorB: e.target.value })}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Lançamento</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v: 'entrada' | 'saida' | 'transferencia' | '') => 
                        setFormData({ ...formData, tipo: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer</SelectItem>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ação *</Label>
                    <Select
                      value={formData.acao}
                      onValueChange={(v: 'sugerir' | 'auto_conciliar' | 'auto_criar') => 
                        setFormData({ ...formData, acao: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sugerir">Sugerir</SelectItem>
                        <SelectItem value="auto_conciliar">Auto-conciliar</SelectItem>
                        <SelectItem value="auto_criar">Auto-criar lançamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={formData.categoriaId}
                      onValueChange={(value) => setFormData({ ...formData, categoriaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.codigo} - {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Conta Contrapartida</Label>
                    <Select
                      value={formData.contaContrapartidaId}
                      onValueChange={(value) => setFormData({ ...formData, contaContrapartidaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {contas.map((conta) => (
                          <SelectItem key={conta.id} value={conta.id}>
                            {conta.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Centro de Custos</Label>
                    <Select
                      value={formData.centroCustoId}
                      onValueChange={(value) => setFormData({ ...formData, centroCustoId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {centrosCustos.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.nome}
                          </SelectItem>
                        ))}
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
                  <Label>Regra ativa</Label>
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

      <div className="flex-1 overflow-auto p-6">
        {loading && regras.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando regras...</span>
          </div>
        ) : regras.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">Nenhuma regra encontrada</span>
          </div>
        ) : (
          <DataTable
            data={regras}
            columns={columns}
            pageSize={25}
          />
        )}
      </div>
    </div>
  );
}

export default RegrasConciliacaoPage;

