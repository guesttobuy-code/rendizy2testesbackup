import React, { useState, useEffect } from 'react';
import { 
  Organization, 
  OrganizationStats,
  isMasterOrganization,
  isClientOrganization,
  generateClientSlug,
  extractClientName,
  MASTER_ORG_SLUG
} from '../types/tenancy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  TrendingUp,
  Users,
  Home,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  Filter,
  Crown,
  Globe
} from 'lucide-react';
import { cn } from './ui/utils';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fetchWithRetry, diagnoseFetchError, testBackendHealth } from '../utils/fetchWithRetry';
import { setOfflineMode, isOffline, showOfflineBanner } from '../utils/offlineMode';

// Mock data para demonstração
const mockOrganizations: Organization[] = [
  // ORGANIZAÇÃO MASTER - RENDIZY
  {
    id: '0',
    name: 'RENDIZY',
    slug: 'rendizy',
    isMaster: true,
    status: 'active',
    plan: 'enterprise',
    email: 'admin@rendizy.com',
    phone: '(11) 99999-9999',
    legalName: 'Rendizy Software Ltda',
    taxId: '00.000.000/0001-00',
    settings: {
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      maxUsers: 999,
      maxProperties: 999
    },
    limits: {
      users: 999,
      properties: 999,
      reservations: 999999,
      storage: 999999
    },
    usage: {
      users: 5,
      properties: 0,
      reservations: 0,
      storage: 1000
    },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  
  // CLIENTES SAAS
  
  // SUA ORGANIZAÇÃO DE TESTE
  {
    id: '9090909',
    name: 'Sua Casa Mobiliada',
    slug: 'rendizy_sua-casa-mobiliada',
    status: 'active',
    plan: 'professional',
    email: 'contato@suacasamobiliada.com',
    phone: '(11) 99999-9999',
    legalName: 'Sua Casa Mobiliada Ltda',
    taxId: '45.678.901/0001-23',
    settings: {
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      maxUsers: 15,
      maxProperties: 100
    },
    limits: {
      users: 15,
      properties: 100,
      reservations: 5000,
      storage: 999999
    },
    usage: {
      users: 0,
      properties: 0,
      reservations: 0,
      storage: 0
    },
    createdAt: new Date('2025-10-31'),
    updatedAt: new Date(),
    billingCycle: 'monthly',
    nextBillingDate: new Date('2025-11-30')
  },
  
  {
    id: '1',
    name: 'GuestToBuy Imóveis',
    slug: 'rendizy_guesttobuy',
    status: 'active',
    plan: 'professional',
    email: 'contato@vistamar.com.br',
    phone: '(11) 98765-4321',
    legalName: 'Vista Mar Imóveis Ltda',
    taxId: '12.345.678/0001-90',
    settings: {
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      maxUsers: 10,
      maxProperties: 50
    },
    limits: {
      users: 10,
      properties: 50,
      reservations: 1000,
      storage: 5000
    },
    usage: {
      users: 7,
      properties: 32,
      reservations: 245,
      storage: 2340
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    billingCycle: 'monthly',
    nextBillingDate: new Date('2025-11-15')
  },
  {
    id: '2',
    name: 'Temporada Feliz',
    slug: 'rendizy_temporadafeliz',
    status: 'trial',
    plan: 'basic',
    email: 'contato@temporadafeliz.com',
    settings: {
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      maxUsers: 5,
      maxProperties: 20
    },
    limits: {
      users: 5,
      properties: 20,
      reservations: 200,
      storage: 2000
    },
    usage: {
      users: 2,
      properties: 8,
      reservations: 15,
      storage: 450
    },
    createdAt: new Date('2025-10-20'),
    updatedAt: new Date(),
    trialEndsAt: new Date('2025-11-20')
  },
  {
    id: '3',
    name: 'Costa Azul Imóveis',
    slug: 'rendizy_costaazul',
    status: 'suspended',
    plan: 'professional',
    email: 'admin@costaazul.com',
    settings: {
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      maxUsers: 15,
      maxProperties: 100
    },
    limits: {
      users: 15,
      properties: 100,
      reservations: 2000,
      storage: 10000
    },
    usage: {
      users: 12,
      properties: 67,
      reservations: 523,
      storage: 6780
    },
    createdAt: new Date('2023-08-10'),
    updatedAt: new Date(),
    suspendedAt: new Date('2025-10-01')
  }
];

const statusColors = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
};

const statusLabels = {
  active: 'Ativo',
  trial: 'Trial',
  suspended: 'Suspenso',
  cancelled: 'Cancelado'
};

const planColors = {
  free: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-orange-100 text-orange-700'
};

const planLabels = {
  free: 'Gratuito',
  basic: 'Básico',
  professional: 'Profissional',
  enterprise: 'Enterprise'
};

export function TenantManagement() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [showMaster, setShowMaster] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Carregar organizações do backend
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      // Se já está em modo offline, usar apenas mock (SEM organizações offline)
      if (isOffline()) {
        console.log('📱 Modo offline detectado - usando dados mock');
        
        setOrganizations(mockOrganizations);
        showOfflineBanner();
        
        toast.warning('⚠️ Modo Offline', {
          description: 'Carregando dados de exemplo. Backend não está disponível.',
          duration: 5000
        });
        
        setLoading(false);
        return;
      }
      
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server`;
      const url = `${baseUrl}/organizations`;
      
      console.log('🔍 Carregando organizações...');
      console.log('📍 URL:', url);
      console.log('🔑 Project ID:', projectId);
      
      // Tentar carregar organizações com retry automático (reduzido para 2 tentativas)
      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 8000,
        onRetry: (attempt, error) => {
          console.log(`🔄 Tentando novamente... (tentativa ${attempt})`);
        }
      });

      console.log('📥 Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 Dados recebidos:', data);
      
      if (data.success) {
        console.log('✅ Organizações carregadas:', data.data?.length || 0);
        // Converter createdAt de string para Date
        const orgsWithDates = (data.data || []).map((org: any) => ({
          ...org,
          createdAt: new Date(org.createdAt),
          updatedAt: org.updatedAt ? new Date(org.updatedAt) : new Date()
        }));
        setOrganizations(orgsWithDates);
        toast.success(`${orgsWithDates.length} organizações carregadas do servidor`);
      } else {
        console.error('❌ Erro na resposta:', data.error);
        throw new Error(data.error || 'Falha ao carregar organizações');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar organizações:', error);
      
      // Ativar modo offline
      setOfflineMode('Backend inacessível');
      showOfflineBanner();
      
      // Diagnosticar o tipo de erro
      const diagnosis = diagnoseFetchError(error);
      
      console.error('🔍 Diagnóstico do erro:', diagnosis);
      
      // Log das sugestões no console
      console.log('💡 Para resolver:');
      diagnosis.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`);
      });
      
      // Fallback para mock data (SEM organizações offline)
      console.log('📋 Usando dados mock (backend inacessível)');
      
      setOrganizations(mockOrganizations);
      
      toast.warning('Modo Offline Ativado', {
        description: 'Usando dados de exemplo. Backend não está disponível.',
        duration: 8000,
        action: {
          label: 'Ver Detalhes',
          onClick: () => {
            console.log('='.repeat(50));
            console.log('DIAGNÓSTICO COMPLETO:');
            console.log('='.repeat(50));
            console.log('Tipo:', diagnosis.type);
            console.log('Mensagem:', diagnosis.message);
            console.log('Sugestões:');
            diagnosis.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
            console.log('='.repeat(50));
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar organizações
  const filteredOrgs = organizations.filter(org => {
    // Filtro de master
    if (!showMaster && isMasterOrganization(org)) {
      return false;
    }
    
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || org.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || org.plan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Estatísticas gerais (apenas clientes, sem master)
  const clientOrgs = organizations.filter(o => !isMasterOrganization(o));
  const totalOrgs = clientOrgs.length;
  const activeOrgs = clientOrgs.filter(o => o.status === 'active').length;
  const trialOrgs = clientOrgs.filter(o => o.status === 'trial').length;
  const totalRevenue = clientOrgs
    .filter(o => o.status === 'active')
    .reduce((acc, org) => {
      const planPrices = { free: 0, basic: 99, professional: 299, enterprise: 999 };
      return acc + planPrices[org.plan];
    }, 0);

  const handleCreateOrganization = async () => {
    // Recarregar lista após criar
    console.log('🔄 Recarregando lista de organizações após criação...');
    setCreateDialogOpen(false);
    await loadOrganizations();
    toast.success('Lista atualizada com sucesso!', {
      duration: 3000
    });
  };

  const handleManageSite = (org: Organization) => {
    // Salvar organizationId selecionado no localStorage para o ClientSitesManager
    localStorage.setItem('selectedOrgForSite', org.id);
    // Navegar para a página de edição de sites
    window.location.href = '/sites-clientes';
    toast.success(`Abrindo gerenciamento de site para ${org.name}`);
  };
  
  const handleSuspendOrganization = (org: Organization) => {
    toast.success(`${org.name} foi suspensa`);
  };
  
  const handleActivateOrganization = (org: Organization) => {
    toast.success(`${org.name} foi ativada`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando imobiliárias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              Gerenciamento de Imobiliárias
            </h1>
            <p className="text-gray-500 mt-1">
              Gerencie todas as imobiliárias clientes do sistema
            </p>
          </div>
          
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Imobiliária
          </Button>
          
          {/* Modal de Criar Organização */}
          <CreateOrganizationModal
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onSuccess={handleCreateOrganization}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-8 py-6 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Imobiliárias</p>
                <p className="text-2xl mt-1 text-gray-900">{totalOrgs}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ativas</p>
                <p className="text-2xl mt-1 text-green-600">{activeOrgs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Em Trial</p>
                <p className="text-2xl mt-1 text-blue-600">{trialOrgs}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">MRR</p>
                <p className="text-2xl mt-1 text-gray-900">
                  R$ {totalRevenue.toLocaleString('pt-BR')}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="px-8 pb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Planos</SelectItem>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showMaster ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMaster(!showMaster)}
                className="gap-2"
              >
                <Crown className="h-4 w-4" />
                {showMaster ? 'Ocultando Master' : 'Mostrando Master'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <div className="flex-1 px-8 pb-8 overflow-auto">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imobiliária</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Imóveis</TableHead>
                  <TableHead>Reservas</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => {
                  const isMaster = isMasterOrganization(org);
                  
                  return (
                  <TableRow 
                    key={org.id}
                    className={isMaster ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''}
                  >
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-gray-900",
                            isMaster && "font-bold text-purple-900"
                          )}>
                            {org.name}
                          </p>
                          {isMaster && (
                            <Badge className="bg-purple-600 text-white text-xs">
                              MASTER
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{org.email}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{org.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={planColors[org.plan]}>
                        {planLabels[org.plan]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[org.status]}>
                        {statusLabels[org.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{org.usage.users}/{org.limits.users}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-gray-400" />
                        <span>{org.usage.properties}/{org.limits.properties}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{org.usage.reservations}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {org.createdAt.toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrg(org)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isMaster && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageSite(org)}
                              title="Gerenciar Site"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                            {org.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspendOrganization(org)}
                                title="Suspender"
                              >
                                <Ban className="h-4 w-4 text-red-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivateOrganization(org)}
                                title="Ativar"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
