/**
 * ✅ EMPRESAS MODULE - v1.0.104
 * Página principal de gestão de empresas (CRM)
 * 
 * Funcionalidades:
 * - Lista de empresas com paginação e busca
 * - CRUD completo (criar, editar, excluir)
 * - Detalhes da empresa em painel lateral
 * - Visualizar contatos vinculados
 * - Visualizar deals vinculados
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '../../ui/sheet';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { toast } from 'sonner';
import { crmCompaniesApi, type CrmCompany, type CrmCompanyCreate } from '../../../src/utils/api-crm-companies';

// ============================================
// TYPES
// ============================================

interface CompanyFormData {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  notes: string;
}

const INITIAL_FORM_DATA: CompanyFormData = {
  name: '',
  industry: '',
  website: '',
  phone: '',
  email: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  address_country: 'Brasil',
  notes: ''
};

const INDUSTRIES = [
  'Imobiliário',
  'Hotelaria',
  'Turismo',
  'Tecnologia',
  'Saúde',
  'Educação',
  'Varejo',
  'Alimentação',
  'Construção',
  'Financeiro',
  'Serviços',
  'Outro'
];

// ============================================
// HELPER COMPONENTS
// ============================================

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
      <Building2 className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      Nenhuma empresa cadastrada
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
      Cadastre empresas para gerenciar seus clientes corporativos e vincular aos seus negócios.
    </p>
    <Button onClick={onAdd}>
      <Plus className="w-4 h-4 mr-2" />
      Cadastrar primeira empresa
    </Button>
  </div>
);

// ============================================
// COMPANY FORM MODAL
// ============================================

interface CompanyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CrmCompany | null;
  onSuccess: () => void;
}

const CompanyFormModal: React.FC<CompanyFormModalProps> = ({
  open,
  onOpenChange,
  company,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CompanyFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  const isEditing = !!company;

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        industry: company.industry || '',
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        address_street: company.address_street || '',
        address_city: company.address_city || '',
        address_state: company.address_state || '',
        address_zip: company.address_zip || '',
        address_country: company.address_country || 'Brasil',
        notes: company.notes || ''
      });
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
  }, [company, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload: CrmCompanyCreate = {
        name: formData.name.trim(),
        industry: formData.industry || undefined,
        website: formData.website || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address_street: formData.address_street || undefined,
        address_city: formData.address_city || undefined,
        address_state: formData.address_state || undefined,
        address_zip: formData.address_zip || undefined,
        address_country: formData.address_country || undefined,
        notes: formData.notes || undefined
      };

      if (isEditing && company) {
        await crmCompaniesApi.update(company.id, payload);
        toast.success('Empresa atualizada com sucesso');
      } else {
        await crmCompaniesApi.create(payload);
        toast.success('Empresa criada com sucesso');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Erro ao salvar empresa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações da empresa'
              : 'Preencha os dados da nova empresa'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nome e Setor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Setor</Label>
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Selecione...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.empresa.com"
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.address_street}
              onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
              placeholder="Rua, número, complemento"
              className="mb-2"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={formData.address_city}
                onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                placeholder="Cidade"
              />
              <Input
                value={formData.address_state}
                onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                placeholder="Estado"
              />
              <Input
                value={formData.address_zip}
                onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                placeholder="CEP"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre a empresa..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Criar empresa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// COMPANY DETAIL SHEET
// ============================================

interface CompanyDetailSheetProps {
  company: CrmCompany | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const CompanyDetailSheet: React.FC<CompanyDetailSheetProps> = ({
  company,
  open,
  onOpenChange,
  onEdit
}) => {
  if (!company) return null;

  const hasAddress = company.address_city || company.address_state;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{company.name}</SheetTitle>
              {company.industry && (
                <Badge variant="secondary" className="mt-1">
                  <Briefcase className="w-3 h-3 mr-1" />
                  {company.industry}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Informações de contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Informações de Contato
            </h4>
            
            {company.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{company.phone}</span>
              </div>
            )}
            
            {company.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                  {company.email}
                </a>
              </div>
            )}
            
            {company.website && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-gray-400" />
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}

            {hasAddress && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  {company.address_street && <div>{company.address_street}</div>}
                  <div>
                    {[company.address_city, company.address_state, company.address_zip]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          {company.notes && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Observações
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {company.notes}
              </p>
            </div>
          )}

          {/* TODO: Contatos vinculados */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contatos Vinculados
            </h4>
            <p className="text-sm text-gray-400 italic">
              Em breve: lista de contatos desta empresa
            </p>
          </div>

          {/* TODO: Deals vinculados */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Negócios Vinculados
            </h4>
            <p className="text-sm text-gray-400 italic">
              Em breve: lista de deals desta empresa
            </p>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t">
            <Button variant="outline" className="w-full" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar empresa
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============================================
// MAIN MODULE
// ============================================

export const CompaniesModule: React.FC = () => {
  // State
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 25;

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CrmCompany | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CrmCompany | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load companies
  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const result = await crmCompaniesApi.list({
        page: currentPage,
        limit: itemsPerPage
      });

      setCompanies(result.data || []);
      setTotalCount(result.total || 0);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Search companies
  useEffect(() => {
    const searchCompanies = async () => {
      if (searchTerm.length < 2) {
        loadCompanies();
        return;
      }

      setLoading(true);
      try {
        const result = await crmCompaniesApi.search(searchTerm, 50);
        setCompanies(result);
        setTotalCount(result.length);
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, loadCompanies]);

  // Pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Handlers
  const handleCreate = () => {
    setSelectedCompany(null);
    setFormModalOpen(true);
  };

  const handleEdit = (company: CrmCompany) => {
    setSelectedCompany(company);
    setFormModalOpen(true);
    setDetailSheetOpen(false);
  };

  const handleView = (company: CrmCompany) => {
    setSelectedCompany(company);
    setDetailSheetOpen(true);
  };

  const handleDeleteClick = (company: CrmCompany) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    setDeleting(true);
    try {
      await crmCompaniesApi.delete(companyToDelete.id);
      toast.success('Empresa excluída com sucesso');
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      loadCompanies();
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      toast.error('Erro ao excluir empresa');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none px-6 py-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Empresas
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gerencie empresas e clientes corporativos
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        {/* Search */}
        <div className="mt-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : companies.length === 0 ? (
          <EmptyState onAdd={handleCreate} />
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Empresa</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      onClick={() => handleView(company)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {company.name}
                            </div>
                            {company.website && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {company.website}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.industry && (
                          <Badge variant="secondary">
                            {company.industry}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {company.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                              <Phone className="w-3 h-3" />
                              {company.phone}
                            </div>
                          )}
                          {company.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 truncate max-w-[200px]">
                              <Mail className="w-3 h-3" />
                              {company.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(company.address_city || company.address_state) && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                            <MapPin className="w-3 h-3" />
                            {[company.address_city, company.address_state]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleView(company);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(company);
                            }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(company);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <p className="text-sm text-gray-500">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
                  {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} empresas
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CompanyFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        company={selectedCompany}
        onSuccess={loadCompanies}
      />

      <CompanyDetailSheet
        company={selectedCompany}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={() => handleEdit(selectedCompany!)}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir empresa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a empresa "{companyToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompaniesModule;
