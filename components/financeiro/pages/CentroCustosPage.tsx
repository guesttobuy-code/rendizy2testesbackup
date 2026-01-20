/**
 * RENDIZY - Centro de Custos Page
 * Gestão completa de centros de custos
 * 
 * @version v1.0.103.500
 */

import React, { useState, useEffect } from 'react';
import { DataTable, DataTableColumn } from '../components/DataTable';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import type { CentroCusto } from '../../../types/financeiro';
import { financeiroApi } from '../../../utils/api';
import { toast } from 'sonner';
import { SearchInput } from '../components/SearchInput';

export function CentroCustosPage() {
  const [centrosCustos, setCentrosCustos] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCentro, setEditingCentro] = useState<CentroCusto | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    ativo: true,
  });

  useEffect(() => {
    loadCentrosCustos();
  }, []);

  const loadCentrosCustos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeiroApi.centroCustos.list();
      
      if (response.success && response.data) {
        setCentrosCustos(response.data || []);
      } else {
        setError(response.error || 'Erro ao carregar centros de custos');
        setCentrosCustos([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar centros de custos:', err);
      setError(err.message || 'Erro ao carregar centros de custos');
      setCentrosCustos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.codigo.trim() || !formData.nome.trim()) {
      toast.error('Código e nome são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const centroData: Partial<CentroCusto> = {
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        ativo: formData.ativo,
      };

      let response;
      if (editingCentro) {
        // TODO: Implementar update quando disponível no backend
        toast.error('Edição ainda não implementada no backend');
        return;
      } else {
        response = await financeiroApi.centroCustos.create(centroData);
      }

      if (response.success) {
        toast.success('Centro de custos salvo com sucesso!');
        setIsDialogOpen(false);
        setEditingCentro(null);
        resetForm();
        await loadCentrosCustos();
      } else {
        setError(response.error || 'Erro ao salvar centro de custos');
        toast.error(response.error || 'Erro ao salvar centro de custos');
      }
    } catch (err: any) {
      console.error('Erro ao salvar centro de custos:', err);
      setError(err.message || 'Erro ao salvar centro de custos');
      toast.error(err.message || 'Erro ao salvar centro de custos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      ativo: true,
    });
  };

  const handleEdit = (centro: CentroCusto) => {
    setEditingCentro(centro);
    setFormData({
      codigo: centro.codigo,
      nome: centro.nome,
      descricao: centro.descricao || '',
      ativo: centro.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingCentro(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Filtrar centros de custos por termo de busca
  const filteredCentrosCustos = searchTerm.trim()
    ? centrosCustos.filter(c => {
        const term = searchTerm.toLowerCase();
        return (
          c.codigo?.toLowerCase().includes(term) ||
          c.nome?.toLowerCase().includes(term) ||
          c.descricao?.toLowerCase().includes(term)
        );
      })
    : centrosCustos;

  const columns: DataTableColumn<CentroCusto>[] = [
    {
      key: 'codigo',
      label: 'Código',
      sortable: true,
      render: (value) => <span className="font-mono">{value}</span>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (value) => value || <span className="text-gray-400">-</span>
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
            <h1 className="text-2xl">Centro de Custos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestão de centros de custos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar centros de custos..."
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
              <Button size="sm" onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Centro de Custos
              </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCentro ? 'Editar Centro de Custos' : 'Novo Centro de Custos'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Código *</Label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Ex: CC001"
                    />
                  </div>
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Marketing"
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição do centro de custos"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <Label>Centro de custos ativo</Label>
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
        {loading && centrosCustos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando centros de custos...</span>
          </div>
        ) : centrosCustos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-gray-500">Nenhum centro de custos encontrado</span>
          </div>
        ) : (
          <>
            {searchTerm.trim() && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {filteredCentrosCustos.length} {filteredCentrosCustos.length === 1 ? 'centro encontrado' : 'centros encontrados'} 
                  {searchTerm && ` para "${searchTerm}"`}
                </span>
              </div>
            )}
            <DataTable
              data={filteredCentrosCustos}
              columns={columns}
              pageSize={25}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default CentroCustosPage;

