/**
 * RENDIZY - Proprietários Management
 * Sistema de gestão de proprietários de imóveis com:
 * - 3 tipos de contrato (exclusividade, não exclusivo, temporário)
 * - Dados bancários completos
 * - Sistema de comissões
 * - Sistema premium
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { useAutoSave } from '../hooks/useAutoSave';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import {
  Building2,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  TrendingUp,
  Crown,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Award
} from 'lucide-react';
import { cn } from './ui/utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Types
type ContractType = 'exclusivity' | 'non_exclusive' | 'temporary';
type OwnerStatus = 'active' | 'inactive';

interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  cpf?: string;
  rg?: string;
  profissao?: string;
  rendaMensal?: number;
  
  // Tipo de Contrato
  contractType: ContractType;
  contractStartDate?: string;
  contractEndDate?: string;
  
  // Dados Bancários
  bankData?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    tipoConta?: 'corrente' | 'poupanca';
    chavePix?: string;
  };
  
  // Comissões
  taxaComissao?: number;
  formaPagamentoComissao?: string;
  
  // Premium
  isPremium: boolean;
  
  // Estatísticas
  stats?: {
    totalProperties?: number;
    activeProperties?: number;
    totalRevenue?: number;
  };
  
  status: OwnerStatus;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

const contractTypeLabels: Record<ContractType, string> = {
  exclusivity: 'Exclusividade',
  non_exclusive: 'Não Exclusivo',
  temporary: 'Temporário'
};

const contractTypeColors: Record<ContractType, string> = {
  exclusivity: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  non_exclusive: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  temporary: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
};

export function ProprietariosManagement() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | ContractType | 'premium' | OwnerStatus>('all');
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Owner>>({
    contractType: 'non_exclusive',
    status: 'active',
    isPremium: false
  });

  // Auto-save
  const { saveStatus, triggerSave } = useAutoSave({
    data: formData,
    onSave: async (data) => {
      if (editModalOpen && selectedOwner) {
        await handleUpdateOwner(selectedOwner.id, data);
      }
    },
    delay: 2000
  });

  // Load owners
  useEffect(() => {
    loadOwners();
  }, []);

  const loadOwners = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar proprietários');
      }

      const data = await response.json();
      setOwners(data.owners || []);
    } catch (error) {
      console.error('Erro ao carregar proprietários:', error);
      toast.error('Erro ao carregar proprietários');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOwner = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao criar proprietário');
      }

      toast.success('Proprietário criado com sucesso!');
      setCreateModalOpen(false);
      setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false });
      loadOwners();
    } catch (error) {
      console.error('Erro ao criar proprietário:', error);
      toast.error('Erro ao criar proprietário');
    }
  };

  const handleUpdateOwner = async (id: string, data: Partial<Owner>) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao atualizar proprietário');
      }

      toast.success('Proprietário atualizado com sucesso!');
      loadOwners();
    } catch (error) {
      console.error('Erro ao atualizar proprietário:', error);
      toast.error('Erro ao atualizar proprietário');
    }
  };

  const handleDeleteOwner = async () => {
    if (!selectedOwner) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners/${selectedOwner.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao deletar proprietário');
      }

      toast.success('Proprietário deletado com sucesso!');
      setDeleteModalOpen(false);
      setSelectedOwner(null);
      loadOwners();
    } catch (error) {
      console.error('Erro ao deletar proprietário:', error);
      toast.error('Erro ao deletar proprietário');
    }
  };

  // Filtros
  const filteredOwners = owners.filter(owner => {
    const matchesSearch = 
      owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.phone.includes(searchQuery) ||
      owner.document.includes(searchQuery);

    const matchesFilter = 
      selectedFilter === 'all' ||
      owner.contractType === selectedFilter ||
      owner.status === selectedFilter ||
      (selectedFilter === 'premium' && owner.isPremium);

    return matchesSearch && matchesFilter;
  });

  // Estatísticas
  const stats = {
    total: owners.length,
    exclusivity: owners.filter(o => o.contractType === 'exclusivity').length,
    nonExclusive: owners.filter(o => o.contractType === 'non_exclusive').length,
    temporary: owners.filter(o => o.contractType === 'temporary').length,
    premium: owners.filter(o => o.isPremium).length
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Filtro Lateral Esquerdo */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Filtros</h3>
        
        <div className="space-y-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              selectedFilter === 'all'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Todos</span>
              <Badge variant="secondary">{stats.total}</Badge>
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('exclusivity')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              selectedFilter === 'exclusivity'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Exclusividade</span>
              <Badge variant="secondary">{stats.exclusivity}</Badge>
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('non_exclusive')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              selectedFilter === 'non_exclusive'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Não Exclusivo</span>
              <Badge variant="secondary">{stats.nonExclusive}</Badge>
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('temporary')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              selectedFilter === 'temporary'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Temporário</span>
              <Badge variant="secondary">{stats.temporary}</Badge>
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('premium')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              selectedFilter === 'premium'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Premium</span>
              <Badge variant="secondary">{stats.premium}</Badge>
            </div>
          </button>

          <button
            onClick={() => setSelectedFilter('active')}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg transition-colors",
              selectedFilter === 'active'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <span>Ativos</span>
              <Badge variant="secondary">{owners.filter(o => o.status === 'active').length}</Badge>
            </div>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Proprietários
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Administre informações dos proprietários de imóveis
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Proprietário
            </Button>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </span>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Exclusivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.exclusivity}
                  </span>
                  <Award className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Não Exclusivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.nonExclusive}
                  </span>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Temporário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.temporary}
                  </span>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Premium
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.premium}
                  </span>
                  <Crown className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo de Contrato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredOwners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum proprietário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOwners.map((owner) => (
                      <TableRow key={owner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {owner.name}
                            {owner.isPremium && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={contractTypeColors[owner.contractType]}>
                            {contractTypeLabels[owner.contractType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {owner.email}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {owner.phone}
                        </TableCell>
                        <TableCell>
                          {owner.taxaComissao ? `${owner.taxaComissao}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setViewModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setFormData(owner);
                                setEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOwner(owner);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Criação */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Proprietário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo proprietário
            </DialogDescription>
          </DialogHeader>

          <OwnerForm
            data={formData}
            onChange={setFormData}
            onSubmit={handleCreateOwner}
            onCancel={() => {
              setCreateModalOpen(false);
              setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proprietário</DialogTitle>
            <DialogDescription>
              Atualize os dados do proprietário
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <AutoSaveIndicator status={saveStatus} />
          </div>

          <OwnerForm
            data={formData}
            onChange={(data) => {
              setFormData(data);
              triggerSave();
            }}
            onSubmit={() => {
              setEditModalOpen(false);
              setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false });
              setSelectedOwner(null);
            }}
            onCancel={() => {
              setEditModalOpen(false);
              setFormData({ contractType: 'non_exclusive', status: 'active', isPremium: false });
              setSelectedOwner(null);
            }}
            isEdit
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Proprietário</DialogTitle>
          </DialogHeader>

          {selectedOwner && (
            <OwnerView owner={selectedOwner} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o proprietário <strong>{selectedOwner?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedOwner(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOwner}
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de Formulário
function OwnerForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  isEdit = false
}: {
  data: Partial<Owner>;
  onChange: (data: Partial<Owner>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
}) {
  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const updateBankField = (field: string, value: any) => {
    onChange({
      ...data,
      bankData: {
        ...(data.bankData || {}),
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <div className="space-y-4">
        <h4 className="font-medium">Dados Básicos</h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nome Completo *</Label>
            <Input
              value={data.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={data.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label>Telefone *</Label>
            <Input
              value={data.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>CPF/CNPJ *</Label>
            <Input
              value={data.document || ''}
              onChange={(e) => updateField('document', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <Label>RG</Label>
            <Input
              value={data.rg || ''}
              onChange={(e) => updateField('rg', e.target.value)}
              placeholder="00.000.000-0"
            />
          </div>

          <div>
            <Label>Profissão</Label>
            <Input
              value={data.profissao || ''}
              onChange={(e) => updateField('profissao', e.target.value)}
              placeholder="Profissão"
            />
          </div>

          <div>
            <Label>Renda Mensal</Label>
            <Input
              type="number"
              value={data.rendaMensal || ''}
              onChange={(e) => updateField('rendaMensal', parseFloat(e.target.value))}
              placeholder="R$ 0,00"
            />
          </div>
        </div>
      </div>

      {/* Tipo de Contrato */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Tipo de Contrato</h4>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3">
            <Label>Tipo de Contrato *</Label>
            <Select
              value={data.contractType || 'non_exclusive'}
              onValueChange={(value) => updateField('contractType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusivity">Exclusividade</SelectItem>
                <SelectItem value="non_exclusive">Não Exclusivo</SelectItem>
                <SelectItem value="temporary">Temporário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Início do Contrato</Label>
            <Input
              type="date"
              value={data.contractStartDate || ''}
              onChange={(e) => updateField('contractStartDate', e.target.value)}
            />
          </div>

          <div>
            <Label>Fim do Contrato</Label>
            <Input
              type="date"
              value={data.contractEndDate || ''}
              onChange={(e) => updateField('contractEndDate', e.target.value)}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={data.status || 'active'}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dados Bancários */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Dados Bancários</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Banco</Label>
            <Input
              value={data.bankData?.banco || ''}
              onChange={(e) => updateBankField('banco', e.target.value)}
              placeholder="Nome do banco"
            />
          </div>

          <div>
            <Label>Agência</Label>
            <Input
              value={data.bankData?.agencia || ''}
              onChange={(e) => updateBankField('agencia', e.target.value)}
              placeholder="0000-0"
            />
          </div>

          <div>
            <Label>Conta</Label>
            <Input
              value={data.bankData?.conta || ''}
              onChange={(e) => updateBankField('conta', e.target.value)}
              placeholder="00000-0"
            />
          </div>

          <div>
            <Label>Tipo de Conta</Label>
            <Select
              value={data.bankData?.tipoConta || ''}
              onValueChange={(value) => updateBankField('tipoConta', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Chave PIX</Label>
            <Input
              value={data.bankData?.chavePix || ''}
              onChange={(e) => updateBankField('chavePix', e.target.value)}
              placeholder="CPF, email, telefone ou chave aleatória"
            />
          </div>
        </div>
      </div>

      {/* Comissões */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium">Comissões</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Taxa de Comissão (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={data.taxaComissao || ''}
              onChange={(e) => updateField('taxaComissao', parseFloat(e.target.value))}
              placeholder="10.0"
            />
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select
              value={data.formaPagamentoComissao || ''}
              onValueChange={(value) => updateField('formaPagamentoComissao', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="ted">TED</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Premium */}
      <div className="pt-4 border-t">
        <div className="flex items-center gap-2">
          <Switch
            checked={data.isPremium || false}
            onCheckedChange={(checked) => updateField('isPremium', checked)}
          />
          <div>
            <Label className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Proprietário Premium
            </Label>
            <p className="text-sm text-gray-500">
              Proprietários premium recebem benefícios exclusivos
            </p>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? 'Salvar Alterações' : 'Criar Proprietário'}
        </Button>
      </div>
    </div>
  );
}

// Componente de Visualização
function OwnerView({ owner }: { owner: Owner }) {
  return (
    <div className="space-y-6">
      {/* Dados Básicos */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          Dados Básicos
          {owner.isPremium && (
            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Nome:</span>
            <p className="font-medium">{owner.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Tipo de Contrato:</span>
            <p>
              <Badge className={contractTypeColors[owner.contractType]}>
                {contractTypeLabels[owner.contractType]}
              </Badge>
            </p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="font-medium">{owner.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Telefone:</span>
            <p className="font-medium">{owner.phone}</p>
          </div>
          <div>
            <span className="text-gray-500">CPF/CNPJ:</span>
            <p className="font-medium">{owner.document}</p>
          </div>
          {owner.rg && (
            <div>
              <span className="text-gray-500">RG:</span>
              <p className="font-medium">{owner.rg}</p>
            </div>
          )}
          {owner.profissao && (
            <div>
              <span className="text-gray-500">Profissão:</span>
              <p className="font-medium">{owner.profissao}</p>
            </div>
          )}
          {owner.rendaMensal && (
            <div>
              <span className="text-gray-500">Renda Mensal:</span>
              <p className="font-medium">
                R$ {owner.rendaMensal.toLocaleString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dados Bancários */}
      {owner.bankData && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Dados Bancários</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {owner.bankData.banco && (
              <div>
                <span className="text-gray-500">Banco:</span>
                <p className="font-medium">{owner.bankData.banco}</p>
              </div>
            )}
            {owner.bankData.agencia && (
              <div>
                <span className="text-gray-500">Agência:</span>
                <p className="font-medium">{owner.bankData.agencia}</p>
              </div>
            )}
            {owner.bankData.conta && (
              <div>
                <span className="text-gray-500">Conta:</span>
                <p className="font-medium">{owner.bankData.conta}</p>
              </div>
            )}
            {owner.bankData.tipoConta && (
              <div>
                <span className="text-gray-500">Tipo de Conta:</span>
                <p className="font-medium capitalize">{owner.bankData.tipoConta}</p>
              </div>
            )}
            {owner.bankData.chavePix && (
              <div className="col-span-2">
                <span className="text-gray-500">Chave PIX:</span>
                <p className="font-medium">{owner.bankData.chavePix}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comissões */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-3">Comissões</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {owner.taxaComissao && (
            <div>
              <span className="text-gray-500">Taxa de Comissão:</span>
              <p className="font-medium">{owner.taxaComissao}%</p>
            </div>
          )}
          {owner.formaPagamentoComissao && (
            <div>
              <span className="text-gray-500">Forma de Pagamento:</span>
              <p className="font-medium uppercase">{owner.formaPagamentoComissao}</p>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      {owner.stats && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Estatísticas</h4>
          <div className="grid grid-cols-3 gap-4">
            {owner.stats.totalProperties !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">
                    Total de Imóveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{owner.stats.totalProperties}</p>
                </CardContent>
              </Card>
            )}
            {owner.stats.activeProperties !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">
                    Imóveis Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-green-600">{owner.stats.activeProperties}</p>
                </CardContent>
              </Card>
            )}
            {owner.stats.totalRevenue !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-gray-500">
                    Receita Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-blue-600">
                    R$ {owner.stats.totalRevenue.toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Metadados */}
      <div className="pt-4 border-t text-xs text-gray-500">
        <p>Criado em: {new Date(owner.createdAt).toLocaleString('pt-BR')}</p>
        <p>Atualizado em: {new Date(owner.updatedAt).toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
