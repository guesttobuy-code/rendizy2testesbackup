import { useState, useEffect } from 'react';
import { Plus, Globe, Code, Settings, Eye, Trash2, Upload, ExternalLink, Copy, Check, FileText, Sparkles, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useAutoSave } from '../hooks/useAutoSave';

// ============================================================
// TIPOS
// ============================================================

interface ClientSite {
  organizationId: string;
  siteName: string;
  template: 'custom' | 'moderno' | 'classico' | 'luxo';
  domain?: string;
  subdomain: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  logo?: string;
  favicon?: string;
  siteConfig: {
    title: string;
    description: string;
    slogan?: string;
    contactEmail: string;
    contactPhone: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
    };
  };
  features: {
    shortTerm: boolean;
    longTerm: boolean;
    sale: boolean;
  };
  siteCode?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function ClientSitesManager() {
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<ClientSite | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Carregar organizações
  useEffect(() => {
    loadOrganizations();
    
    // Verificar se há uma organização pré-selecionada do TenantManagement
    const preselectedOrg = localStorage.getItem('selectedOrgForSite');
    if (preselectedOrg) {
      setSelectedOrgId(preselectedOrg);
      localStorage.removeItem('selectedOrgForSite'); // Limpar após usar
      toast.success('Organização selecionada!');
    }
  }, []);

  // Carregar sites quando a organização mudar
  useEffect(() => {
    loadSites();
  }, [selectedOrgId]);

  const loadOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setOrganizations(data.data || []);
      } else {
        console.error('Erro ao carregar organizações:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar organizações:', error);
      toast.error('Erro ao carregar imobiliárias');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        const allSites = data.data || [];
        // Filtrar por organização se não for "all"
        const filteredSites = selectedOrgId === 'all' 
          ? allSites 
          : allSites.filter((site: ClientSite) => site.organizationId === selectedOrgId);
        setSites(filteredSites);
      } else {
        console.error('Erro ao carregar sites:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar sites:', error);
      toast.error('Erro ao carregar sites');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSite = () => {
    setSelectedSite(null);
    setShowCreateModal(true);
  };

  const handleEditSite = (site: ClientSite) => {
    setSelectedSite(site);
    setShowEditModal(true);
  };

  const handleUploadCode = (site: ClientSite) => {
    setSelectedSite(site);
    setShowCodeModal(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getSiteUrl = (site: ClientSite) => {
    return site.domain || `https://${site.subdomain}.rendizy.app`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Sites dos Clientes</h1>
          <p className="text-gray-600 mt-1">
            Gerencie sites customizados para cada cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDocsModal(true)} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentação IA
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Importar Site
          </Button>
          <Button onClick={handleCreateSite} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Novo Site
          </Button>
        </div>
      </div>

      {/* Seletor de Imobiliária */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="org-select" className="text-sm font-medium text-gray-700 mb-2 block">
                🏢 Selecione a Imobiliária
              </Label>
              <Select
                value={selectedOrgId}
                onValueChange={setSelectedOrgId}
                disabled={loadingOrgs}
              >
                <SelectTrigger id="org-select" className="bg-white">
                  <SelectValue placeholder="Selecione uma imobiliária..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    📋 Todas as Imobiliárias ({sites.length} sites)
                  </SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} - {org.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrgId !== 'all' && (
              <div className="text-sm text-gray-600 mt-6">
                <Badge variant="secondary" className="text-sm">
                  {sites.length} {sites.length === 1 ? 'site' : 'sites'}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Sites */}
      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum site criado ainda
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md">
              Crie sites customizados para seus clientes. Você pode importar designs
              de v0.dev, Bolt.ai, Figma ou criar do zero.
            </p>
            <Button onClick={handleCreateSite} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Site
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <Card key={site.organizationId} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">{site.siteName}</CardTitle>
                    <CardDescription>
                      {site.organizationId}
                    </CardDescription>
                  </div>
                  <Badge variant={site.isActive ? 'default' : 'secondary'}>
                    {site.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template */}
                <div className="flex items-center gap-2 text-sm">
                  <Code className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Template:</span>
                  <Badge variant="outline">{site.template}</Badge>
                </div>

                {/* URL */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">URL do Site:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border border-gray-200 truncate">
                      {getSiteUrl(site)}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(getSiteUrl(site), 'URL')}
                    >
                      {copiedUrl === 'URL' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Modalidades */}
                <div>
                  <span className="text-sm text-gray-600 mb-2 block">Modalidades:</span>
                  <div className="flex flex-wrap gap-2">
                    {site.features.shortTerm && (
                      <Badge variant="secondary">🏖️ Temporada</Badge>
                    )}
                    {site.features.longTerm && (
                      <Badge variant="secondary">🏠 Locação</Badge>
                    )}
                    {site.features.sale && (
                      <Badge variant="secondary">💰 Venda</Badge>
                    )}
                  </div>
                </div>

                {/* Status do Código */}
                {site.siteCode && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Código customizado enviado</span>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => window.open(getSiteUrl(site), '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                    Ver Site
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleUploadCode(site)}
                  >
                    <Upload className="h-4 w-4" />
                    Código
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleEditSite(site)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar Site */}
      <CreateSiteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadSites();
          setShowCreateModal(false);
        }}
        prefilledOrgId={selectedOrgId !== 'all' ? selectedOrgId : undefined}
      />

      {/* Modal Editar Site */}
      {selectedSite && (
        <EditSiteModal
          site={selectedSite}
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSite(null);
          }}
          onSuccess={() => {
            loadSites();
            setShowEditModal(false);
            setSelectedSite(null);
          }}
        />
      )}

      {/* Modal Upload Código */}
      {selectedSite && (
        <UploadCodeModal
          site={selectedSite}
          open={showCodeModal}
          onClose={() => {
            setShowCodeModal(false);
            setSelectedSite(null);
          }}
          onSuccess={() => {
            loadSites();
            setShowCodeModal(false);
            setSelectedSite(null);
          }}
        />
      )}

      {/* Modal Documentação IA */}
      <DocsAIModal
        open={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />

      {/* Modal Importar Site */}
      <ImportSiteModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          loadSites();
          setShowImportModal(false);
        }}
        organizations={organizations}
      />
    </div>
  );
}

// ============================================================
// MODAL: CRIAR SITE
// ============================================================

function CreateSiteModal({ open, onClose, onSuccess, prefilledOrgId }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledOrgId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationId: prefilledOrgId || '',
    siteName: '',
    template: 'moderno',
    contactEmail: '',
    contactPhone: '',
    shortTerm: true,
    longTerm: false,
    sale: false
  });

  // Atualizar organizationId quando prefilledOrgId mudar
  useEffect(() => {
    if (prefilledOrgId) {
      setFormData(prev => ({ ...prev, organizationId: prefilledOrgId }));
    }
  }, [prefilledOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organizationId || !formData.siteName) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organizationId: formData.organizationId,
            siteName: formData.siteName,
            template: formData.template,
            siteConfig: {
              title: formData.siteName,
              description: `Site oficial de ${formData.siteName}`,
              contactEmail: formData.contactEmail,
              contactPhone: formData.contactPhone
            },
            features: {
              shortTerm: formData.shortTerm,
              longTerm: formData.longTerm,
              sale: formData.sale
            }
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onSuccess();
      } else {
        toast.error(data.error || 'Erro ao criar site');
      }
    } catch (error) {
      console.error('Erro ao criar site:', error);
      toast.error('Erro ao criar site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Site</DialogTitle>
          <DialogDescription>
            Configure um novo site para um cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {prefilledOrgId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="text-2xl">🏢</div>
                <div>
                  <p className="text-sm font-medium">Criando site para:</p>
                  <p className="text-lg">{prefilledOrgId}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizationId">ID da Organização *</Label>
              <Input
                id="organizationId"
                value={formData.organizationId}
                onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                placeholder="org_123456"
                required
                disabled={!!prefilledOrgId}
                className={prefilledOrgId ? 'bg-gray-100' : ''}
              />
              {prefilledOrgId && (
                <p className="text-xs text-gray-500">
                  Organização selecionada automaticamente
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteName">Nome do Site *</Label>
              <Input
                id="siteName"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                placeholder="Imobiliária Sol"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select
              value={formData.template}
              onValueChange={(value) => setFormData({ ...formData, template: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moderno">Moderno</SelectItem>
                <SelectItem value="classico">Clássico</SelectItem>
                <SelectItem value="luxo">Luxo</SelectItem>
                <SelectItem value="custom">Customizado (você vai enviar o código)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de Contato</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contato@imobiliaria.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Modalidades do Site</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="shortTerm" className="font-normal">
                  🏖️ Aluguel de Temporada
                </Label>
                <Switch
                  id="shortTerm"
                  checked={formData.shortTerm}
                  onCheckedChange={(checked) => setFormData({ ...formData, shortTerm: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="longTerm" className="font-normal">
                  🏠 Locação Residencial
                </Label>
                <Switch
                  id="longTerm"
                  checked={formData.longTerm}
                  onCheckedChange={(checked) => setFormData({ ...formData, longTerm: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sale" className="font-normal">
                  💰 Venda
                </Label>
                <Switch
                  id="sale"
                  checked={formData.sale}
                  onCheckedChange={(checked) => setFormData({ ...formData, sale: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MODAL: EDITAR SITE
// ============================================================

function EditSiteModal({ site, open, onClose, onSuccess }: {
  site: ClientSite;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    siteName: site.siteName,
    template: site.template,
    title: site.siteConfig.title,
    description: site.siteConfig.description,
    slogan: site.siteConfig.slogan || '',
    contactEmail: site.siteConfig.contactEmail,
    contactPhone: site.siteConfig.contactPhone,
    facebook: site.siteConfig.socialMedia?.facebook || '',
    instagram: site.siteConfig.socialMedia?.instagram || '',
    whatsapp: site.siteConfig.socialMedia?.whatsapp || '',
    primaryColor: site.theme.primaryColor,
    secondaryColor: site.theme.secondaryColor,
    accentColor: site.theme.accentColor,
    fontFamily: site.theme.fontFamily,
    shortTerm: site.features.shortTerm,
    longTerm: site.features.longTerm,
    sale: site.features.sale,
    isActive: site.isActive
  });

  // Auto-save: salva automaticamente após 2 segundos de inatividade
  const saveData = async (data: typeof formData) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${site.organizationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            siteName: data.siteName,
            template: data.template,
            theme: {
              primaryColor: data.primaryColor,
              secondaryColor: data.secondaryColor,
              accentColor: data.accentColor,
              fontFamily: data.fontFamily
            },
            siteConfig: {
              title: data.title,
              description: data.description,
              slogan: data.slogan,
              contactEmail: data.contactEmail,
              contactPhone: data.contactPhone,
              socialMedia: {
                facebook: data.facebook,
                instagram: data.instagram,
                whatsapp: data.whatsapp
              }
            },
            features: {
              shortTerm: data.shortTerm,
              longTerm: data.longTerm,
              sale: data.sale
            },
            isActive: data.isActive
          })
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar');
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  };

  const { saveStatus } = useAutoSave(formData, saveData, {
    delay: 2000,
    enabled: open // Só salva quando modal está aberto
  });

  const handleSaveChanges = async () => {
    try {
      setLoading(true);
      
      const result = await saveData(formData);
      
      if (result.success) {
        toast.success('Alterações salvas com sucesso!');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Erro ao salvar alterações');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (saveStatus === 'saving') {
      toast.info('Aguarde, salvando alterações...');
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Editar Site: {site.siteName}</span>
            {saveStatus === 'saving' && (
              <span className="text-sm text-blue-600 font-normal">Salvando automaticamente...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-green-600 font-normal flex items-center gap-1">
                <Check className="w-4 h-4" /> Salvo
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Personalize seu site. As alterações são salvas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="contato">Contato</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="recursos">Recursos</TabsTrigger>
          </TabsList>

          {/* ABA: GERAL */}
          <TabsContent value="geral" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Nome do Site *</Label>
              <Input
                id="siteName"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                placeholder="Minha Imobiliária"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título (SEO) *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título que aparece no Google"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (SEO)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do site que aparece no Google"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slogan">Slogan</Label>
              <Input
                id="slogan"
                value={formData.slogan}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                placeholder="Seu refúgio perfeito"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={formData.template}
                onValueChange={(value: any) => setFormData({ ...formData, template: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderno">🎨 Moderno</SelectItem>
                  <SelectItem value="classico">🏛️ Clássico</SelectItem>
                  <SelectItem value="luxo">💎 Luxo</SelectItem>
                  <SelectItem value="custom">⚙️ Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ABA: CONTATO */}
          <TabsContent value="contato" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contato@imobiliaria.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefone *</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="5511999999999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </div>
          </TabsContent>

          {/* ABA: DESIGN */}
          <TabsContent value="design" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    placeholder="#F59E0B"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Fonte</Label>
              <Select
                value={formData.fontFamily}
                onValueChange={(value) => setFormData({ ...formData, fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter (Moderno)</SelectItem>
                  <SelectItem value="Poppins">Poppins (Clean)</SelectItem>
                  <SelectItem value="Playfair Display">Playfair Display (Elegante)</SelectItem>
                  <SelectItem value="Roboto">Roboto (Neutro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ABA: RECURSOS */}
          <TabsContent value="recursos" className="space-y-4">
            <div className="space-y-3">
              <Label>Modalidades Ativas no Site</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="shortTerm" className="font-normal">
                    🏖️ Aluguel de Temporada
                  </Label>
                  <Switch
                    id="shortTerm"
                    checked={formData.shortTerm}
                    onCheckedChange={(checked) => setFormData({ ...formData, shortTerm: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="longTerm" className="font-normal">
                    🏠 Locação Residencial
                  </Label>
                  <Switch
                    id="longTerm"
                    checked={formData.longTerm}
                    onCheckedChange={(checked) => setFormData({ ...formData, longTerm: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="sale" className="font-normal">
                    💰 Venda
                  </Label>
                  <Switch
                    id="sale"
                    checked={formData.sale}
                    onCheckedChange={(checked) => setFormData({ ...formData, sale: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <Label htmlFor="isActive" className="font-medium text-blue-900">
                    Site Ativo
                  </Label>
                  <p className="text-sm text-blue-700">
                    {formData.isActive ? 'Site visível publicamente' : 'Site em manutenção'}
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Salvando...' : 'Fechar'}
          </Button>
          <Button 
            onClick={handleSaveChanges}
            disabled={loading || saveStatus === 'saving'}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MODAL: UPLOAD CÓDIGO
// ============================================================

function UploadCodeModal({ site, open, onClose, onSuccess }: {
  site: ClientSite;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [siteCode, setSiteCode] = useState(site.siteCode || '');

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${site.organizationId}/upload-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ siteCode })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onSuccess();
      } else {
        toast.error(data.error || 'Erro ao enviar código');
      }
    } catch (error) {
      console.error('Erro ao enviar código:', error);
      toast.error('Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Upload Código do Site</DialogTitle>
          <DialogDescription>
            Cole aqui o código React/HTML gerado por v0.dev, Bolt.ai, Figma Make, etc
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={siteCode}
            onChange={(e) => setSiteCode(e.target.value)}
            placeholder="Cole o código do site aqui..."
            className="min-h-[400px] font-mono text-sm"
          />
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Dica:</h4>
            <p className="text-sm text-blue-800">
              O código será automaticamente integrado ao backend do RENDIZY.
              Dados de imóveis, reservas e calendário virão da API RENDIZY.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !siteCode}>
            {loading ? 'Enviando...' : 'Enviar Código'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MODAL: DOCUMENTAÇÃO IA (BOLT, V0, ETC)
// ============================================================

function DocsAIModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const aiPrompt = `# Criar Site de Imobiliária com RENDIZY

## Objetivo
Criar um site moderno e responsivo para imobiliária de aluguel de temporada, locação e vendas, integrado ao backend RENDIZY.

## Especificações Técnicas

### Stack
- React 18+ com TypeScript
- Tailwind CSS para estilização
- Lucide React para ícones
- ShadCN/UI para componentes (opcional)

### Estrutura de Dados do Backend RENDIZY

#### 1. Propriedades (GET /properties)
\`\`\`typescript
interface Property {
  id: string;
  name: string;
  description: string;
  type: 'apartment' | 'house' | 'condo';
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  area: number;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  amenities: string[];
  photos: string[];
  pricing: {
    dailyRate: number;
    weeklyRate: number;
    monthlyRate: number;
    salePrice?: number;
  };
  availability: 'available' | 'rented' | 'sold';
  features: {
    shortTerm: boolean;
    longTerm: boolean;
    sale: boolean;
  };
}
\`\`\`

#### 2. Calendário (GET /calendar)
\`\`\`typescript
interface CalendarAvailability {
  propertyId: string;
  date: string;
  status: 'available' | 'booked' | 'blocked';
  price?: number;
  minNights?: number;
}
\`\`\`

#### 3. Reservas (POST /reservations)
\`\`\`typescript
interface ReservationRequest {
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
}
\`\`\`

### Páginas Obrigatórias

1. **Home** - Hero + busca + destaques
2. **Propriedades** - Lista filtrada + busca avançada
3. **Detalhes da Propriedade** - Galeria, info, calendário, formulário reserva
4. **Sobre** - História da imobiliária
5. **Contato** - Formulário + mapa

### Funcionalidades Essenciais

- ✅ Busca por cidade, datas, número de hóspedes
- ✅ Filtros por tipo, preço, comodidades
- ✅ Calendário de disponibilidade integrado
- ✅ Formulário de reserva/cotação
- ✅ Galeria de fotos responsiva
- ✅ Mapa de localização (Google Maps ou Mapbox)
- ✅ WhatsApp flutuante para contato
- ✅ Sistema de favoritos (localStorage)
- ✅ Compartilhamento em redes sociais

### Configurações do Cliente (Variáveis)

\`\`\`typescript
const siteConfig = {
  organizationId: "{{ORG_ID}}", // Será substituído
  siteName: "{{SITE_NAME}}",
  logo: "{{LOGO_URL}}",
  primaryColor: "{{PRIMARY_COLOR}}",
  secondaryColor: "{{SECONDARY_COLOR}}",
  contactEmail: "{{CONTACT_EMAIL}}",
  contactPhone: "{{CONTACT_PHONE}}",
  whatsapp: "{{WHATSAPP}}",
  socialMedia: {
    facebook: "{{FACEBOOK}}",
    instagram: "{{INSTAGRAM}}"
  },
  features: {
    shortTerm: {{SHORT_TERM}},
    longTerm: {{LONG_TERM}},
    sale: {{SALE}}
  }
};
\`\`\`

### Integração com API RENDIZY

\`\`\`typescript
const API_BASE = "https://uknccixtubkdkofyieie.supabase.co/functions/v1/rendizy-server";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Buscar propriedades
const properties = await fetch(\`\${API_BASE}/properties?organizationId=\${organizationId}\`, {
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});

// Buscar disponibilidade
const availability = await fetch(\`\${API_BASE}/calendar?propertyId=\${propertyId}&start=\${startDate}&end=\${endDate}\`, {
  headers: { 'Authorization': \`Bearer \${API_KEY}\` }
});

// Criar reserva
const reservation = await fetch(\`\${API_BASE}/reservations\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reservationData)
});
\`\`\`

### Design Guidelines

- **Moderno**: Gradientes suaves, animações sutis, espaçamento generoso
- **Responsivo**: Mobile-first, breakpoints: 640px, 768px, 1024px, 1280px
- **Acessível**: Contraste adequado, alt texts, navegação por teclado
- **Performance**: Lazy loading de imagens, code splitting
- **SEO**: Meta tags, structured data, sitemap

### Componentes Reutilizáveis

- PropertyCard
- SearchBar
- DateRangePicker
- CalendarView
- PhotoGallery
- ContactForm
- FilterSidebar
- PropertyMap

Crie um site COMPLETO, FUNCIONAL e PROFISSIONAL seguindo essas especificações.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    toast.success('Prompt copiado! Cole no Bolt.new, v0.dev ou Figma Make');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Documentação para Criar Site com IA
          </DialogTitle>
          <DialogDescription>
            Use este prompt em Bolt.new, v0.dev, Claude, ChatGPT ou Figma Make para criar sites profissionais integrados ao RENDIZY
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plataformas Recomendadas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Bolt.new
                </CardTitle>
                <CardDescription>Recomendado - Mais Completo</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  onClick={() => window.open('https://bolt.new', '_blank')}
                  className="w-full gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Bolt.new
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  v0.dev
                </CardTitle>
                <CardDescription>Vercel - Componentes UI</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  onClick={() => window.open('https://v0.dev', '_blank')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir v0.dev
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Figma Make
                </CardTitle>
                <CardDescription>Design First</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  onClick={() => window.open('https://figma.com', '_blank')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Figma
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base">Prompt para IA:</Label>
              <Button
                size="sm"
                variant={copied ? 'default' : 'outline'}
                onClick={copyPrompt}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Prompt
                  </>
                )}
              </Button>
            </div>
            
            <Textarea
              value={aiPrompt}
              readOnly
              className="min-h-[400px] font-mono text-xs bg-gray-50"
            />
          </div>

          {/* Instruções */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Como Usar</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Clique em "Copiar Prompt"</li>
                <li>Abra Bolt.new, v0.dev ou sua IA preferida</li>
                <li>Cole o prompt completo</li>
                <li>Aguarde a IA gerar o código do site</li>
                <li>Copie o código gerado</li>
                <li>Volte aqui e clique em "Importar Site"</li>
                <li>Cole o código e configure a organização</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MODAL: IMPORTAR SITE DE IA/FIGMA
// ============================================================

function ImportSiteModal({ open, onClose, onSuccess, organizations }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizations: any[];
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    organizationId: '',
    siteName: '',
    siteCode: '',
    source: 'bolt', // bolt, v0, figma, custom
    contactEmail: '',
    contactPhone: '',
    shortTerm: true,
    longTerm: false,
    sale: false
  });

  const handleSubmit = async () => {
    if (step === 1) {
      if (!formData.organizationId || !formData.siteName) {
        toast.error('Preencha organização e nome do site');
        return;
      }
      setStep(2);
      return;
    }

    if (!formData.siteCode) {
      toast.error('Cole o código do site');
      return;
    }

    try {
      setLoading(true);

      // 1. Criar o site
      const createResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organizationId: formData.organizationId,
            siteName: formData.siteName,
            template: 'custom',
            siteConfig: {
              title: formData.siteName,
              description: `Site oficial de ${formData.siteName}`,
              contactEmail: formData.contactEmail,
              contactPhone: formData.contactPhone
            },
            features: {
              shortTerm: formData.shortTerm,
              longTerm: formData.longTerm,
              sale: formData.sale
            }
          })
        }
      );

      const createData = await createResponse.json();

      if (!createData.success) {
        toast.error(createData.error || 'Erro ao criar site');
        setLoading(false);
        return;
      }

      // 2. Fazer upload do código
      const uploadResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${formData.organizationId}/upload-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ siteCode: formData.siteCode })
        }
      );

      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        toast.success('✅ Site importado com sucesso!');
        onSuccess();
      } else {
        toast.error(uploadData.error || 'Erro ao importar código');
      }
    } catch (error) {
      console.error('Erro ao importar site:', error);
      toast.error('Erro ao importar site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Site de IA/Figma
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Configure os dados básicos do site' : 'Cole o código gerado pela IA'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            {/* Origem */}
            <div className="space-y-2">
              <Label>De onde está importando?</Label>
              <div className="grid grid-cols-4 gap-2">
                {['bolt', 'v0', 'figma', 'custom'].map((source) => (
                  <Button
                    key={source}
                    variant={formData.source === source ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, source })}
                    className="capitalize"
                  >
                    {source}
                  </Button>
                ))}
              </div>
            </div>

            {/* Organização */}
            <div className="space-y-2">
              <Label htmlFor="organizationId">Imobiliária *</Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a imobiliária..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} - {org.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome do Site */}
            <div className="space-y-2">
              <Label htmlFor="siteName">Nome do Site *</Label>
              <Input
                id="siteName"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                placeholder="Ex: Sua Casa Mobiliada"
              />
            </div>

            {/* Contatos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contato@imobiliaria.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* Modalidades */}
            <div className="space-y-3">
              <Label>Modalidades</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="shortTerm2" className="font-normal">🏖️ Temporada</Label>
                  <Switch
                    id="shortTerm2"
                    checked={formData.shortTerm}
                    onCheckedChange={(checked) => setFormData({ ...formData, shortTerm: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="longTerm2" className="font-normal">🏠 Locação</Label>
                  <Switch
                    id="longTerm2"
                    checked={formData.longTerm}
                    onCheckedChange={(checked) => setFormData({ ...formData, longTerm: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sale2" className="font-normal">💰 Venda</Label>
                  <Switch
                    id="sale2"
                    checked={formData.sale}
                    onCheckedChange={(checked) => setFormData({ ...formData, sale: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Cole o código gerado pela IA</AlertTitle>
              <AlertDescription>
                Copie todo o código React/TypeScript gerado e cole abaixo
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Código do Site</Label>
              <Textarea
                value={formData.siteCode}
                onChange={(e) => setFormData({ ...formData, siteCode: e.target.value })}
                placeholder="Cole o código completo aqui..."
                className="min-h-[400px] font-mono text-xs"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>✨ O sistema irá:</strong>
                <br />• Integrar automaticamente com a API RENDIZY
                <br />• Substituir variáveis de configuração
                <br />• Conectar ao banco de dados de imóveis
                <br />• Configurar calendário e reservas
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Importando...' : step === 1 ? 'Próximo' : 'Importar Site'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
