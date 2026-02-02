import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { UserPlus, AlertCircle, Loader2, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Organization {
  id: string;
  slug: string;
  name: string;
  status: string;
}

// Estrutura de permissões de módulos
export interface ModulePermissions {
  // Grupo 1: Temporada, Aluguel e Vendas (toggle único para todo o grupo)
  temporadaAluguelVendas: boolean;
  
  // Grupo 2: Comunicação (toggle único para todo o grupo)
  comunicacao: boolean;
  
  // Grupo 3: Módulos Avançados (cada um individual)
  modulosAvancados: {
    financas: boolean;
    biRelatorios: boolean;
    edicaoSite: boolean;
    realEstateB2B: boolean;
  };
  
  // Grupo 4: Configurações (opções separadas)
  configuracoes: {
    integracoes: boolean;
    agentesIA: boolean;
  };
}

// Valores padrão para novos usuários
export const DEFAULT_MODULE_PERMISSIONS: ModulePermissions = {
  temporadaAluguelVendas: true,
  comunicacao: true,
  modulosAvancados: {
    financas: true,
    biRelatorios: true,
    edicaoSite: false,
    realEstateB2B: false,
  },
  configuracoes: {
    integracoes: true,
    agentesIA: false,
  },
};

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedOrgId?: string;
}

export function CreateUserModal({ open, onClose, onSuccess, preselectedOrgId }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    modulosAvancados: true,
    configuracoes: true,
  });
  
  const [formData, setFormData] = useState({
    organizationId: preselectedOrgId || '',
    name: '',
    email: '',
    role: 'staff'
  });

  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>(DEFAULT_MODULE_PERMISSIONS);

  // Carregar organizações
  useEffect(() => {
    if (open && !preselectedOrgId) {
      loadOrganizations();
    }
  }, [open, preselectedOrgId]);

  // Atualizar organizationId quando preselectedOrgId mudar
  useEffect(() => {
    if (preselectedOrgId) {
      setFormData(prev => ({ ...prev, organizationId: preselectedOrgId }));
    }
  }, [preselectedOrgId]);

  // Reset permissions quando modal abre
  useEffect(() => {
    if (open) {
      setModulePermissions(DEFAULT_MODULE_PERMISSIONS);
    }
  }, [open]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
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
        // Filtrar apenas organizações ativas
        const activeOrgs = result.data.filter((org: Organization) => 
          org.status === 'active' || org.status === 'trial'
        );
        setOrganizations(activeOrgs);
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.organizationId) {
        throw new Error('Selecione uma imobiliária');
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') : null;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`,
            ...(token ? { 'X-Auth-Token': token } : {})
          },
          body: JSON.stringify({
            ...formData,
            status: 'invited',
            createdBy: 'user_master_rendizy',
            modulePermissions: modulePermissions // Enviar permissões de módulos
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      toast.success('Usuário criado com sucesso!', {
        description: `Convite enviado para ${result.data.email}`
      });

      // Reset form
      setFormData({
        organizationId: preselectedOrgId || '',
        name: '',
        email: '',
        role: 'staff'
      });
      setModulePermissions(DEFAULT_MODULE_PERMISSIONS);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao criar usuário', {
        description: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        organizationId: preselectedOrgId || '',
        name: '',
        email: '',
        role: 'staff'
      });
      setModulePermissions(DEFAULT_MODULE_PERMISSIONS);
      setError(null);
      onClose();
    }
  };

  const selectedOrg = organizations.find(org => org.id === formData.organizationId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>
                Criar e convidar um novo usuário para uma imobiliária
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!preselectedOrgId && (
              <div className="space-y-2">
                <Label htmlFor="organization">
                  Imobiliária <span className="text-red-500">*</span>
                </Label>
                {loadingOrgs ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">Carregando...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.organizationId}
                    onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
                    disabled={loading}
                    required
                  >
                    <SelectTrigger id="organization">
                      <SelectValue placeholder="Selecione uma imobiliária" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{org.name}</span>
                              <span className="text-xs text-gray-500">{org.slug}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {preselectedOrgId && selectedOrg && (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex flex-col">
                    <span className="font-medium">{selectedOrg.name}</span>
                    <span className="text-xs text-gray-500">{selectedOrg.slug}</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Um convite será enviado para este email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Função <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={loading}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Owner</span>
                      <span className="text-xs text-gray-500">
                        Acesso total e gestão da conta
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-gray-500">
                        Gestão de imóveis, reservas e usuários
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Manager</span>
                      <span className="text-xs text-gray-500">
                        Gestão de imóveis e reservas
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Staff</span>
                      <span className="text-xs text-gray-500">
                        Operação básica de reservas
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="readonly">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Read-only</span>
                      <span className="text-xs text-gray-500">
                        Apenas visualização
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SEÇÃO DE MÓDULOS VISÍVEIS */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Módulos Visíveis
              </h4>
              <p className="text-xs text-gray-500 mb-4">
                Selecione quais módulos estarão disponíveis para este usuário
              </p>

              <div className="space-y-3">
                {/* Grupo 1: Temporada, Aluguel e Vendas */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="temporadaAluguelVendas"
                      checked={modulePermissions.temporadaAluguelVendas}
                      onCheckedChange={(checked) => 
                        setModulePermissions(prev => ({ ...prev, temporadaAluguelVendas: !!checked }))
                      }
                      disabled={loading}
                    />
                    <div>
                      <Label htmlFor="temporadaAluguelVendas" className="font-medium cursor-pointer">
                        Temporada, Aluguel e Vendas
                      </Label>
                      <p className="text-xs text-gray-500">
                        Calendário, Propriedades e Anúncios, Reservas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo 2: Comunicação */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="comunicacao"
                      checked={modulePermissions.comunicacao}
                      onCheckedChange={(checked) => 
                        setModulePermissions(prev => ({ ...prev, comunicacao: !!checked }))
                      }
                      disabled={loading}
                    />
                    <div>
                      <Label htmlFor="comunicacao" className="font-medium cursor-pointer">
                        Comunicação
                      </Label>
                      <p className="text-xs text-gray-500">
                        Chat, CRM & Tasks, Notificações
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo 3: Módulos Avançados (expansível) */}
                <div className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('modulosAvancados')}
                    className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="font-medium text-sm">Módulos Avançados</span>
                    {expandedSections.modulosAvancados ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {expandedSections.modulosAvancados && (
                    <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="financas"
                          checked={modulePermissions.modulosAvancados.financas}
                          onCheckedChange={(checked) => 
                            setModulePermissions(prev => ({
                              ...prev,
                              modulosAvancados: { ...prev.modulosAvancados, financas: !!checked }
                            }))
                          }
                          disabled={loading}
                        />
                        <Label htmlFor="financas" className="cursor-pointer text-sm">
                          Finanças
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="biRelatorios"
                          checked={modulePermissions.modulosAvancados.biRelatorios}
                          onCheckedChange={(checked) => 
                            setModulePermissions(prev => ({
                              ...prev,
                              modulosAvancados: { ...prev.modulosAvancados, biRelatorios: !!checked }
                            }))
                          }
                          disabled={loading}
                        />
                        <Label htmlFor="biRelatorios" className="cursor-pointer text-sm">
                          BI & Relatórios
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="edicaoSite"
                          checked={modulePermissions.modulosAvancados.edicaoSite}
                          onCheckedChange={(checked) => 
                            setModulePermissions(prev => ({
                              ...prev,
                              modulosAvancados: { ...prev.modulosAvancados, edicaoSite: !!checked }
                            }))
                          }
                          disabled={loading}
                        />
                        <Label htmlFor="edicaoSite" className="cursor-pointer text-sm">
                          Edição de Site
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="realEstateB2B"
                          checked={modulePermissions.modulosAvancados.realEstateB2B}
                          onCheckedChange={(checked) => 
                            setModulePermissions(prev => ({
                              ...prev,
                              modulosAvancados: { ...prev.modulosAvancados, realEstateB2B: !!checked }
                            }))
                          }
                          disabled={loading}
                        />
                        <Label htmlFor="realEstateB2B" className="cursor-pointer text-sm">
                          Real Estate B2B
                        </Label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grupo 4: Configurações (expansível) */}
                <div className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('configuracoes')}
                    className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="font-medium text-sm">Configurações</span>
                    {expandedSections.configuracoes ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {expandedSections.configuracoes && (
                    <div className="p-3 space-y-2 bg-white dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="integracoes"
                          checked={modulePermissions.configuracoes.integracoes}
                          onCheckedChange={(checked) => 
                            setModulePermissions(prev => ({
                              ...prev,
                              configuracoes: { ...prev.configuracoes, integracoes: !!checked }
                            }))
                          }
                          disabled={loading}
                        />
                        <Label htmlFor="integracoes" className="cursor-pointer text-sm">
                          Integrações
                        </Label>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="agentesIA"
                          checked={modulePermissions.configuracoes.agentesIA}
                          onCheckedChange={(checked) => 
                            setModulePermissions(prev => ({
                              ...prev,
                              configuracoes: { ...prev.configuracoes, agentesIA: !!checked }
                            }))
                          }
                          disabled={loading}
                        />
                        <Label htmlFor="agentesIA" className="cursor-pointer text-sm">
                          Agentes IA
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || (!formData.organizationId && !preselectedOrgId)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar e Convidar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
