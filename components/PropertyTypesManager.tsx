/**
 * RENDIZY - Property Types Manager
 * 
 * Gerenciamento de Tipos de Local e Tipos de Anúncio
 * Acesso restrito: SOMENTE ADMIN MASTER
 * 
 * @version 1.0.103.8
 * @date 2025-10-29
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
  Search,
  Filter,
  SortAsc,
  Grid3x3,
  List,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../src/contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface PropertyType {
  id: string;
  code: string;
  name: string;
  category: 'location' | 'accommodation';
  icon?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean; // Tipos do sistema não podem ser deletados
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

interface CreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: Partial<PropertyType>) => void;
  editingType: PropertyType | null;
  category: 'location' | 'accommodation';
}

// ============================================================================
// CREATE/EDIT MODAL
// ============================================================================

const CreateEditModal: React.FC<CreateEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingType,
  category,
}) => {
  const [formData, setFormData] = useState<Partial<PropertyType>>({
    code: '',
    name: '',
    category,
    icon: '',
    description: '',
    isActive: true,
    isSystem: false,
  });

  useEffect(() => {
    if (editingType) {
      setFormData(editingType);
    } else {
      setFormData({
        code: '',
        name: '',
        category,
        icon: '',
        description: '',
        isActive: true,
        isSystem: false,
      });
    }
  }, [editingType, category]);

  const handleSave = () => {
    if (!formData.code || !formData.name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingType ? 'Editar' : 'Novo'} {category === 'location' ? 'Tipo de Local' : 'Tipo de Anúncio'}
          </DialogTitle>
          <DialogDescription>
            {editingType
              ? 'Altere as informações do tipo'
              : `Adicione um novo tipo de ${category === 'location' ? 'local' : 'anúncio'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Código */}
          <div className="space-y-2">
            <Label htmlFor="code">
              Código *
              <span className="text-xs text-muted-foreground ml-2">
                (usado internamente, sem espaços)
              </span>
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                })
              }
              placeholder="apartamento"
              disabled={editingType?.isSystem}
            />
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome *
              <span className="text-xs text-muted-foreground ml-2">
                (exibido para o usuário)
              </span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Apartamento"
            />
          </div>

          {/* Ícone (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="icon">
              Ícone (emoji)
              <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
            </Label>
            <Input
              id="icon"
              value={formData.icon || ''}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="🏢"
              maxLength={2}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição
              <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
            </Label>
            <Input
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição breve do tipo"
            />
          </div>

          {/* Sistema */}
          {editingType?.isSystem && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <Lock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Tipo do sistema - código não pode ser alterado
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// DELETE CONFIRMATION MODAL
// ============================================================================

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: PropertyType | null;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, type }) => {
  if (!type) return null;

  const hasUsage = (type.usage_count || 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription>
            Você está prestes a excluir o tipo:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              {type.icon && <span className="text-2xl">{type.icon}</span>}
              <div>
                <p className="font-medium">{type.name}</p>
                <p className="text-sm text-muted-foreground">Código: {type.code}</p>
              </div>
            </div>
          </div>

          {hasUsage && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Atenção: Este tipo está em uso!
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80">
                    {type.usage_count} {type.usage_count === 1 ? 'propriedade usa' : 'propriedades usam'} este tipo.
                  </p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80">
                    Ao excluir, essas propriedades ficarão sem tipo definido.
                  </p>
                </div>
              </div>
            </div>
          )}

          {type.isSystem && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Lock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Tipo do Sistema
                  </p>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                    Este tipo é nativo do sistema. Você pode desativá-lo, mas não deletá-lo completamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            {type.isSystem ? 'Desativar' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PropertyTypesManager: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  
  const [locationTypes, setLocationTypes] = useState<PropertyType[]>([]);
  const [accommodationTypes, setAccommodationTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<PropertyType | null>(null);
  const [currentCategory, setCurrentCategory] = useState<'location' | 'accommodation'>('location');

  // ============================================================================
  // VERIFICAÇÃO DE PERMISSÃO
  // ============================================================================

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <Shield className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Acesso Restrito</h3>
                <p className="text-sm text-muted-foreground">
                  Somente Administradores Master podem gerenciar tipos de propriedades.
                </p>
                <p className="text-xs text-muted-foreground">
                  Entre em contato com o administrador do sistema.
                </p>
              </div>
              <Badge variant="destructive" className="gap-1">
                <Lock className="h-3 w-3" />
                Admin Master Necessário
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': token || '',
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao carregar tipos');

      const data = await response.json();
      // Garante que data seja um array
      const typesArray = Array.isArray(data) ? data : (data?.types || data?.data || []);
      
      setLocationTypes(typesArray.filter((t: PropertyType) => t.category === 'location'));
      setAccommodationTypes(typesArray.filter((t: PropertyType) => t.category === 'accommodation'));
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
      toast.error('Erro ao carregar tipos de propriedades');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleCreate = async (typeData: Partial<PropertyType>) => {
    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify(typeData),
        }
      );

      if (!response.ok) throw new Error('Erro ao criar tipo');

      toast.success('Tipo criado com sucesso!');
      setCreateModalOpen(false);
      loadTypes();
    } catch (error) {
      console.error('Erro ao criar tipo:', error);
      toast.error('Erro ao criar tipo');
    }
  };

  const handleUpdate = async (typeData: Partial<PropertyType>) => {
    if (!editingType) return;

    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types/${editingType.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': token || '',
          },
          body: JSON.stringify(typeData),
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar tipo');

      toast.success('Tipo atualizado com sucesso!');
      setEditingType(null);
      setCreateModalOpen(false);
      loadTypes();
    } catch (error) {
      console.error('Erro ao atualizar tipo:', error);
      toast.error('Erro ao atualizar tipo');
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      const token = localStorage.getItem('rendizy-token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types/${typeToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-Auth-Token': token || '',
          },
        }
      );

      if (!response.ok) throw new Error('Erro ao excluir tipo');

      toast.success(
        typeToDelete.isSystem
          ? 'Tipo desativado com sucesso!'
          : 'Tipo excluído com sucesso!'
      );
      setDeleteModalOpen(false);
      setTypeToDelete(null);
      loadTypes();
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);
      toast.error('Erro ao excluir tipo');
    }
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filterTypes = (types: PropertyType[]) => {
    return types.filter((type) => {
      const matchesSearch =
        type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterActive === 'all' ||
        (filterActive === 'active' && type.isActive) ||
        (filterActive === 'inactive' && !type.isActive);

      return matchesSearch && matchesFilter;
    });
  };

  // ============================================================================
  // RENDER TABLE
  // ============================================================================

  const renderTable = (types: PropertyType[], category: 'location' | 'accommodation') => {
    const filteredTypes = filterTypes(types);

    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredTypes.length === 0) {
      return (
        <div className="text-center py-12 space-y-3">
          <div className="flex justify-center">
            <div className="p-4 bg-muted rounded-full">
              {category === 'location' ? (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Home className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">
              Nenhum tipo encontrado
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Adicionar" para criar um novo tipo'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Ícone</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-24">Uso</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-32 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTypes.map((type) => (
            <TableRow key={type.id}>
              <TableCell>
                {type.icon ? (
                  <span className="text-2xl">{type.icon}</span>
                ) : (
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                    {category === 'location' ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Home className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {type.name}
                {type.isSystem && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Sistema
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {type.code}
                </code>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {type.description || '-'}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {type.usage_count || 0}
                </Badge>
              </TableCell>
              <TableCell>
                {type.isActive ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Inativo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingType(type);
                      setCurrentCategory(category);
                      setCreateModalOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTypeToDelete(type);
                      setDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl text-foreground">Tipos de Propriedades</h2>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin Master
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie os tipos de locais e tipos de anúncios disponíveis no sistema
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-blue-500" />
              Tipos de Local
            </CardTitle>
            <CardDescription>
              Para hotéis, pousadas, resorts, etc
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{locationTypes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {locationTypes.filter((t) => t.isActive).length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-5 w-5 text-green-500" />
              Tipos de Anúncio
            </CardTitle>
            <CardDescription>
              Para apartamentos, casas, chalés, etc
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{accommodationTypes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {accommodationTypes.filter((t) => t.isActive).length} ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="location" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="location" className="gap-2">
              <Building2 className="h-4 w-4" />
              Tipos de Local
            </TabsTrigger>
            <TabsTrigger value="accommodation" className="gap-2">
              <Home className="h-4 w-4" />
              Tipos de Anúncio
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="location" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterActive} onValueChange={(v: any) => setFilterActive(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    setCurrentCategory('location');
                    setEditingType(null);
                    setCreateModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {renderTable(locationTypes, 'location')}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accommodation" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterActive} onValueChange={(v: any) => setFilterActive(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    setCurrentCategory('accommodation');
                    setEditingType(null);
                    setCreateModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {renderTable(accommodationTypes, 'accommodation')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateEditModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingType(null);
        }}
        onSave={editingType ? handleUpdate : handleCreate}
        editingType={editingType}
        category={currentCategory}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTypeToDelete(null);
        }}
        onConfirm={handleDelete}
        type={typeToDelete}
      />
    </div>
  );
};

export default PropertyTypesManager;
