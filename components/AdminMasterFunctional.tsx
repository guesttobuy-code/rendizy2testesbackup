import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Building2, 
  Users, 
  Settings,
  Database,
  BarChart3,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
  Activity,
  Package,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Trash2,
  Edit,
  UserPlus,
  Server,
  HardDrive,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { CreateUserModal } from './CreateUserModal';
import { ReservationsManagement } from './ReservationsManagement';
import { PropertyTypesSeedTool } from './PropertyTypesSeedTool';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AdminMasterProps {
  onNavigate?: (module: string) => void;
}

interface Organization {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  createdAt: string;
  settings: {
    maxUsers: number;
    maxProperties: number;
    maxReservations: number;
  };
  billing?: {
    mrr: number;
  };
}

interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  invitedAt?: string;
  joinedAt?: string;
}

export function AdminMasterFunctional({ onNavigate }: AdminMasterProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedOrgForUsers, setSelectedOrgForUsers] = useState<Organization | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedOrgForUser, setSelectedOrgForUser] = useState<string | undefined>(undefined);

  // Load data
  useEffect(() => {
    if (activeTab === 'organizations') {
      loadOrganizations();
    }
  }, [activeTab]);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') : null;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            ...(token ? { 'X-Auth-Token': token } : {})
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setOrganizations(result.data || []);
      } else {
        console.error('Organizations API returned error:', result?.error || result);
        toast.error('Erro ao carregar imobiliárias');
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Erro ao carregar imobiliárias');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (organizationId?: string) => {
    setLoading(true);
    setUsersError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') : null;
      const url = organizationId 
        ? `https://${projectId}.supabase.co/functions/v1/rendizy-server/users?organizationId=${organizationId}`
        : `https://${projectId}.supabase.co/functions/v1/rendizy-server/users`;

      const response = await fetch(url, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          ...(token ? { 'X-Auth-Token': token } : {})
        }
      });

      const result = await response.json();
      if (result.success) {
        setUsers(result.data || []);
      } else {
        setUsersError(result?.error || 'Erro ao carregar usuários');
        console.error('Users API returned error:', result?.error || result);
        toast.error('Erro ao carregar usuários');
      }
    } catch (error) {
      setUsersError('Erro ao carregar usuários');
      console.error('Error loading users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (org: Organization) => {
    if (!confirm(`Tem certeza que deseja deletar "${org.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') : null;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${org.id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            ...(token ? { 'X-Auth-Token': token } : {})
          }
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success('Imobiliária deletada com sucesso');
        loadOrganizations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Erro ao deletar imobiliária');
    }
  };

  const handleAddUser = (orgId: string) => {
    setSelectedOrgForUser(orgId);
    setShowCreateUserModal(true);
  };

  const handleViewUsers = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId) || null;
    setSelectedOrgForUsers(org);
    setUsers([]);
    setUsersError(null);
    setShowUsersModal(true);
    loadUsers(orgId);
  };

  const handleOpenChangePassword = (user: User) => {
    setSelectedUserForPassword(user);
    setNewPassword('');
    setShowChangePasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!selectedUserForPassword) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error('Senha inválida', { description: 'Use pelo menos 6 caracteres.' });
      return;
    }

    setChangingPassword(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') : null;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/users/${selectedUserForPassword.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            ...(token ? { 'X-Auth-Token': token } : {})
          },
          body: JSON.stringify({ password: newPassword })
        }
      );

      const result = await response.json();
      if (!result.success) {
        throw new Error(result?.error || 'Erro ao alterar senha');
      }

      toast.success('Senha atualizada com sucesso');
      setShowChangePasswordModal(false);
      setSelectedUserForPassword(null);
      setNewPassword('');

      if (selectedOrgForUsers?.id) {
        loadUsers(selectedOrgForUsers.id);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Erro ao alterar senha', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Stats calculados
  const stats = {
    totalOrganizations: organizations.length,
    activeOrganizations: organizations.filter(o => o.status === 'active').length,
    trialOrganizations: organizations.filter(o => o.status === 'trial').length,
    suspendedOrganizations: organizations.filter(o => o.status === 'suspended').length,
    totalMRR: organizations.reduce((sum, org) => sum + (org.billing?.mrr || 0), 0),
    planDistribution: {
      free: organizations.filter(o => o.plan === 'free').length,
      basic: organizations.filter(o => o.plan === 'basic').length,
      professional: organizations.filter(o => o.plan === 'professional').length,
      enterprise: organizations.filter(o => o.plan === 'enterprise').length,
    }
  };

  // Filtrar organizações por busca
  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      basic: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    };
    
    return (
      <Badge className={colors[plan] || colors.free} variant="secondary">
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    };
    
    return (
      <Badge className={colors[status] || colors.active} variant="secondary">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Crown className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Admin Master</h1>
                <p className="text-purple-100 mt-1">
                  Painel de Controle RENDIZY
                </p>
              </div>
            </div>
          </div>
          
          <Badge className="bg-white text-purple-700 text-sm px-4 py-2">
            Usuário Master
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-6">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="organizations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Imobiliárias
              </TabsTrigger>
              <TabsTrigger 
                value="reservations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reservas
              </TabsTrigger>
              <TabsTrigger 
                value="system"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Database className="h-4 w-4 mr-2" />
                Sistema
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none px-0 pb-3 bg-transparent data-[state=active]:shadow-none"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Overview Tab */}
          <TabsContent value="overview" className="m-0 p-8">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total de Imobiliárias</CardDescription>
                    <CardTitle className="text-3xl">{stats.totalOrganizations}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Building2 className="h-4 w-4 mr-1" />
                      {stats.activeOrganizations} ativas
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Trial (30 dias)</CardDescription>
                    <CardTitle className="text-3xl">{stats.trialOrganizations}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                      <Zap className="h-4 w-4 mr-1" />
                      Conversão ~68%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>MRR (Receita Mensal)</CardDescription>
                    <CardTitle className="text-3xl">
                      R$ {(stats.totalMRR / 1000).toFixed(1)}k
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {stats.activeOrganizations} pagantes
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Status do Sistema</CardDescription>
                    <CardTitle className="text-3xl">99.8%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                      <Activity className="h-4 w-4 mr-1" />
                      Uptime
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Plano</CardTitle>
                  <CardDescription>Imobiliárias por tipo de plano</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.planDistribution.free}</p>
                      <p className="text-sm text-gray-500">Free</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.planDistribution.basic}</p>
                      <p className="text-sm text-gray-500">Basic</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.planDistribution.professional}</p>
                      <p className="text-sm text-gray-500">Professional</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stats.planDistribution.enterprise}</p>
                      <p className="text-sm text-gray-500">Enterprise</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="m-0 p-8">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Imobiliárias</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Gerencie todas as organizações clientes
                  </p>
                </div>
                <Button onClick={() => setShowCreateOrgModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Imobiliária
                </Button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome, slug ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={loadOrganizations}>
                  Atualizar
                </Button>
              </div>

              {/* Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imobiliária</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Limites</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredOrganizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {searchQuery ? 'Nenhuma imobiliária encontrada' : 'Nenhuma imobiliária cadastrada'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrganizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-sm text-gray-500">{org.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {org.slug}
                            </code>
                          </TableCell>
                          <TableCell>{getPlanBadge(org.plan)}</TableCell>
                          <TableCell>{getStatusBadge(org.status)}</TableCell>
                          <TableCell>
                            <div className="text-xs text-gray-500">
                              <div>{org.settings.maxUsers === -1 ? '∞' : org.settings.maxUsers} users</div>
                              <div>{org.settings.maxProperties === -1 ? '∞' : org.settings.maxProperties} imóveis</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewUsers(org.id)}>
                                  <Users className="h-4 w-4 mr-2" />
                                  Ver Usuários
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddUser(org.id)}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Adicionar Usuário
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteOrganization(org)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="m-0 p-8">
            <ReservationsManagement />
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="m-0 p-8">
            <div className="space-y-6">
              {/* Property Types Seed Tool */}
              <PropertyTypesSeedTool />

              {/* System Monitoring */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Monitoramento do Sistema
                  </CardTitle>
                  <CardDescription>Em desenvolvimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Funcionalidades de monitoramento serão implementadas em breve.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="m-0 p-8">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Globais</CardTitle>
                  <CardDescription>Em desenvolvimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">
                    Configurações globais serão implementadas em breve.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateOrganizationModal
        open={showCreateOrgModal}
        onClose={() => setShowCreateOrgModal(false)}
        onSuccess={loadOrganizations}
      />

      <CreateUserModal
        open={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          setSelectedOrgForUser(undefined);
        }}
        onSuccess={() => {
          loadUsers(selectedOrgForUser);
          toast.success('Usuário criado com sucesso!');
        }}
        preselectedOrgId={selectedOrgForUser}
      />

      <Dialog
        open={showUsersModal}
        onOpenChange={(open) => {
          setShowUsersModal(open);
          if (!open) {
            setUsers([]);
            setUsersError(null);
            setSelectedOrgForUsers(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Usuários da Imobiliária</DialogTitle>
            <DialogDescription>
              {selectedOrgForUsers ? (
                <span>
                  {selectedOrgForUsers.name} ({selectedOrgForUsers.email})
                </span>
              ) : (
                'Visualize os usuários cadastrados'
              )}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-gray-500">Carregando...</div>
          ) : usersError ? (
            <Alert variant="destructive">
              <AlertDescription>{usersError}</AlertDescription>
            </Alert>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Nenhum usuário cadastrado para esta imobiliária.
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.role}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(u.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleOpenChangePassword(u)}>
                          Mudar Senha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <DialogFooter>
            {selectedOrgForUsers?.id ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedOrgForUser(selectedOrgForUsers.id);
                  setShowCreateUserModal(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setShowUsersModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showChangePasswordModal}
        onOpenChange={(open) => {
          setShowChangePasswordModal(open);
          if (!open) {
            setSelectedUserForPassword(null);
            setNewPassword('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mudar senha do usuário</DialogTitle>
            <DialogDescription>
              {selectedUserForPassword ? selectedUserForPassword.email : 'Selecione um usuário'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite a nova senha"
              disabled={changingPassword}
            />
            <p className="text-xs text-gray-500">Mínimo de 6 caracteres.</p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowChangePasswordModal(false)} disabled={changingPassword}>
              Cancelar
            </Button>
            <Button onClick={handleSavePassword} disabled={changingPassword}>
              {changingPassword ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
