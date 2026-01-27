/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CONTACTS MODULE - CRM RENDIZY                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Módulo de gestão de Contatos - Cadastro unificado de pessoas
 * Tipos: guest, lead, cliente, proprietario, parceiro, etc.
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Building2,
  Phone,
  Mail,
  MapPin,
  UserCircle,
  Home,
  Briefcase,
  UserCheck,
  Filter,
  Download,
  Upload,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserCog,
} from 'lucide-react';
import { cn } from '../../ui/utils';
import { crmContactsApi, CrmContact, ContactType } from '../../../src/utils/api-crm-contacts';
import { ContactFormModal } from './ContactFormModal';
import { ContactDetailSheet } from './ContactDetailSheet';
import { CreateUserFromContactModal } from './CreateUserFromContactModal';

// ============================================================================
// TYPES
// ============================================================================

interface ContactsModuleProps {
  initialTab?: ContactType | 'all';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTACT_TYPE_CONFIG: Record<ContactType | 'all', { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  all: { 
    label: 'Todos', 
    icon: Users, 
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  },
  guest: { 
    label: 'Hóspedes', 
    icon: Home, 
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  lead: { 
    label: 'Leads', 
    icon: UserCircle, 
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  cliente: { 
    label: 'Clientes', 
    icon: UserCheck, 
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  'ex-cliente': { 
    label: 'Ex-Clientes', 
    icon: UserCircle, 
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  },
  proprietario: { 
    label: 'Proprietários', 
    icon: Building2, 
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  parceiro: { 
    label: 'Parceiros', 
    icon: Briefcase, 
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30'
  },
  fornecedor: { 
    label: 'Fornecedores', 
    icon: Building2, 
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
  },
  outro: { 
    label: 'Outros', 
    icon: Users, 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  },
};

const PAGE_SIZE = 25;

// ============================================================================
// COMPONENT
// ============================================================================

export function ContactsModule({ initialTab = 'all' }: ContactsModuleProps) {
  // State
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ContactType | 'all'>(initialTab);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [detailContact, setDetailContact] = useState<CrmContact | null>(null);
  const [createUserContact, setCreateUserContact] = useState<CrmContact | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (activeTab !== 'all') {
        params.contact_type = activeTab;
      }

      if (searchQuery.trim()) {
        // Usar endpoint de search
        const result = await crmContactsApi.search(searchQuery, activeTab === 'all' ? undefined : activeTab, PAGE_SIZE);
        const contactsData = result.data || [];
        setContacts(contactsData);
        setTotalCount(contactsData.length);
      } else {
        const result = await crmContactsApi.list(params);
        setContacts(result.data?.data || []);
        setTotalCount(result.data?.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [activeTab, page]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchContacts();
      } else {
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = () => {
    setEditingContact(null);
    setFormModalOpen(true);
  };

  const handleEdit = (contact: CrmContact) => {
    setEditingContact(contact);
    setFormModalOpen(true);
  };

  const handleView = (contact: CrmContact) => {
    setDetailContact(contact);
  };

  const handleDelete = async (contact: CrmContact) => {
    if (!confirm(`Tem certeza que deseja excluir "${contact.full_name}"?`)) {
      return;
    }

    try {
      await crmContactsApi.delete(contact.id);
      toast.success('Contato excluído com sucesso');
      fetchContacts();
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      toast.error('Erro ao excluir contato');
    }
  };

  const handleCreateUser = (contact: CrmContact) => {
    setCreateUserContact(contact);
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setEditingContact(null);
    fetchContacts();
  };

  const handleUserCreated = () => {
    setCreateUserContact(null);
    fetchContacts();
    toast.success('Usuário criado com sucesso! Um email de convite será enviado.');
  };

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const tabCounts = useMemo(() => {
    // TODO: Buscar contagem real por tipo do backend
    return {
      all: totalCount,
      guest: 0,
      lead: 0,
      cliente: 0,
      'ex-cliente': 0,
      proprietario: 0,
      parceiro: 0,
      fornecedor: 0,
      outro: 0,
    };
  }, [totalCount]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 lg:p-6 border-b bg-white dark:bg-gray-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-7 w-7" />
              Contatos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gerencie todos os seus contatos em um só lugar
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchContacts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleCreate}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b bg-gray-50 dark:bg-gray-800/50">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ContactType | 'all'); setPage(1); }}>
          <TabsList className="w-full justify-start h-auto p-1 bg-transparent gap-1 overflow-x-auto">
            {Object.entries(CONTACT_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800",
                    "data-[state=active]:shadow-sm"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                  {type === 'all' && totalCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {totalCount}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Contato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">Carregando contatos...</p>
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Users className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={handleCreate} variant="link" className="mt-2">
                        Criar primeiro contato
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => {
                  const typeConfig = CONTACT_TYPE_CONFIG[contact.contact_type as ContactType] || CONTACT_TYPE_CONFIG.outro;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <TableRow key={contact.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell onClick={() => handleView(contact)}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            typeConfig.bgColor
                          )}>
                            <span className={cn("text-sm font-semibold", typeConfig.color)}>
                              {contact.first_name?.[0]?.toUpperCase() || '?'}
                              {contact.last_name?.[0]?.toUpperCase() || ''}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {contact.full_name || 'Sem nome'}
                            </p>
                            {contact.job_title && (
                              <p className="text-xs text-gray-500">{contact.job_title}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(typeConfig.bgColor, typeConfig.color, "border-0")}
                        >
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeConfig.label}
                          {contact.is_type_locked && (
                            <span className="ml-1 text-[10px] opacity-60">🔒</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-blue-600 hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.phone || contact.mobile ? (
                          <span className="text-sm">{contact.mobile || contact.phone}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.company_name ? (
                          <span className="text-sm">{contact.company_name}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.user_id ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-0">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Usuário
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(contact)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {!contact.user_id && contact.email && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCreateUser(contact)}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Criar acesso ao sistema
                                </DropdownMenuItem>
                              </>
                            )}
                            {contact.user_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ver usuário
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(contact)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <ContactFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        contact={editingContact}
        onSuccess={handleFormSuccess}
        defaultType={activeTab !== 'all' ? activeTab : undefined}
      />

      <ContactDetailSheet
        contact={detailContact}
        onClose={() => setDetailContact(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateUser={handleCreateUser}
      />

      <CreateUserFromContactModal
        contact={createUserContact}
        onClose={() => setCreateUserContact(null)}
        onSuccess={handleUserCreated}
      />
    </div>
  );
}

export default ContactsModule;
